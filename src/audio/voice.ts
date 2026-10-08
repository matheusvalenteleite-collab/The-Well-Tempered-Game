/**
 * One synthesizer voice (the cantus firmus or the counterpoint each have their own):
 * nine synthesis models, an ADSR envelope, a low-pass "tone" filter, vibrato and an effects chain.
 */
import { FxChain } from "./effects.ts";
import { frequency, type TemperamentId } from "./temperament.ts";
import { isSampled, type SampleSet, type SynthSettings } from "./synth-settings.ts";
import { SAMPLE_MANIFEST } from "./sample-manifest.ts";
import { parsePitch } from "../music/pitch.ts";

/** A recorded note: its MIDI pitch, velocity layer (0 if one layer) and audio. */
interface Sample {
  midi: number;
  layer: number;
  buffer: AudioBuffer;
}
const banks = new Map<SampleSet, Sample[]>();
const loading = new Map<SampleSet, Promise<void>>();
/** Relative loudness correction per instrument (measured), so the sets sit at similar levels. */
/** Levels of the recorded sets, matched by ear and by mean level against the cello (D42, D54). */
const SET_GAIN: Record<SampleSet, number> = {
  grand: 2.6, organ: 1.7, sackbut: 1.9, cello: 1.6, violin: 2.0, flute: 1.35, bassoon: 1.65, horn: 1.15, trumpet: 1.8, harp: 1.8, contrabass: 1.65,
  harmonium: 1.7, guitar: 1.65, eguitar: 3.8, ebass: 2.1, sax: 1.15, xylophone: 3.2,
};

/** Fetch and decode an instrument's samples (once); notes before it arrives are skipped. */
export function loadSamples(ctx: BaseAudioContext, set: SampleSet): Promise<void> {
  let p = loading.get(set);
  if (!p) {
    const m = SAMPLE_MANIFEST[set];
    const files = m.layers.length ? m.notes.flatMap((n) => m.layers.map((l) => ({ n, l, f: `${n}-v${l}.mp3` }))) : m.notes.map((n) => ({ n, l: 0, f: `${n}.mp3` }));
    p = Promise.all(
      files.map(async ({ n, l, f }) => {
        const res = await fetch(new URL(`samples/${set}/${f}`, document.baseURI));
        if (!res.ok) throw new Error(`sample ${set}/${f}: ${res.status}`);
        const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
        return { midi: parsePitch(n.replace("s", "#")).midi, layer: l, buffer };
      }),
    ).then((list) => {
      banks.set(set, list);
    });
    p.catch(() => loading.delete(set)); // a failed load is retried at the next note
    loading.set(set, p);
  }
  return p;
}

export const samplesReady = (set: SampleSet) => banks.has(set);

/** Vowel formants (F1, F2, F3 in Hz) for a, e, i, o, u. */
const VOWELS: [number, number, number][] = [
  [800, 1150, 2900],
  [400, 1600, 2700],
  [280, 2250, 2950],
  [450, 800, 2830],
  [325, 700, 2530],
];

export interface Instrument {
  /** `velocity` 0..1 (0.75 is the neutral loudness). */
  start(note: string, time: number, duration: number, velocity?: number): void;
  stop(): void;
}

export class Synth implements Instrument {
  private live = new Set<AudioScheduledSourceNode>();
  private ctx: BaseAudioContext;
  private out: GainNode;
  private fx: FxChain;
  private waves = new Map<string, PeriodicWave>();
  private curves = new Map<string, Float32Array<ArrayBuffer>>();
  private noise: AudioBuffer | null = null;
  settings: SynthSettings;
  tuning: () => TemperamentId;

  constructor(ctx: BaseAudioContext, destination: AudioNode, settings: SynthSettings, tuning: () => TemperamentId = () => "equal") {
    this.ctx = ctx;
    this.settings = settings;
    this.tuning = tuning;
    this.fx = new FxChain(ctx, destination, settings);
    this.out = ctx.createGain();
    this.out.gain.value = 0.18; // headroom for two voices
    this.out.connect(this.fx.input);
    this.preload();
  }

  /** Apply changed settings to the effects (sound parameters are read at each note start). */
  update() {
    this.preload();
    this.fx.update(this.settings);
  }

  private track<T extends AudioScheduledSourceNode>(n: T): T {
    this.live.add(n);
    n.onended = () => this.live.delete(n);
    return n;
  }

  private osc(type: OscillatorType | PeriodicWave, freq: number, time: number, end: number, vib: GainNode | null): OscillatorNode {
    const o = this.track(this.ctx.createOscillator());
    if (type instanceof PeriodicWave) o.setPeriodicWave(type);
    else o.type = type;
    o.frequency.value = freq;
    if (vib) vib.connect(o.detune);
    o.start(time);
    o.stop(end);
    return o;
  }

  private noiseSource(time: number, end: number): AudioBufferSourceNode {
    if (!this.noise) {
      this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const n = this.track(this.ctx.createBufferSource());
    n.buffer = this.noise;
    n.loop = true;
    n.start(time);
    n.stop(end);
    return n;
  }

  /** Harmonic spectrum with `n` partials: amplitude 1/k^exponent, even partials scaled by `even`. */
  private spectrum(exponent: number, even: number, n = 24): PeriodicWave {
    const key = `${exponent.toFixed(2)}:${even.toFixed(2)}:${n}`;
    let w = this.waves.get(key);
    if (!w) {
      const real = new Float32Array(n + 1);
      const imag = new Float32Array(n + 1);
      for (let k = 1; k <= n; k++) imag[k] = (k % 2 === 0 ? even : 1) / k ** exponent;
      w = this.ctx.createPeriodicWave(real, imag);
      this.waves.set(key, w);
    }
    return w;
  }

  /** Karplus-Strong plucked string, rendered into a buffer. */
  private pluckBuffer(freq: number, seconds: number, damping: number, brightness: number): AudioBuffer {
    const sr = this.ctx.sampleRate;
    const len = Math.min(Math.ceil(seconds * sr), sr * 8);
    const buf = this.ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    const period = Math.max(2, Math.round(sr / freq));
    const line = new Float32Array(period);
    let prev = 0;
    const smooth = 1 - 0.9 * brightness; // a darker pluck low-passes the excitation noise
    for (let i = 0; i < period; i++) {
      prev = prev * smooth + (Math.random() * 2 - 1) * (1 - smooth);
      line[i] = prev;
    }
    const loss = 0.9935 + 0.0062 * damping;
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const cur = line[idx];
      out[i] = cur;
      line[idx] = loss * 0.5 * (cur + line[(idx + 1) % period]);
      idx = (idx + 1) % period;
    }
    return buf;
  }

  /** Wavefolding curve: the signal folds back on itself as it is driven harder. */
  private foldCurve(drive: number): Float32Array<ArrayBuffer> {
    const key = drive.toFixed(2);
    let c = this.curves.get(key);
    if (!c) {
      c = new Float32Array(2048);
      const k = 1 + drive * 6;
      for (let i = 0; i < c.length; i++) c[i] = Math.sin(((i / (c.length - 1)) * 2 - 1) * k * (Math.PI / 2));
      this.curves.set(key, c);
    }
    return c;
  }

  /**
   * Hammered strings: inharmonic partials (string stiffness), each dying away faster the higher it
   * is; two slightly mistuned strings for the lower partials (their beating gives the piano's
   * two-stage decay); a felt "thump" whose weight follows the hammer hardness.
   */
  private piano(freq: number, time: number, end: number, out: AudioNode) {
    const st = this.settings;
    const ctx = this.ctx;
    const hard = st.pianoHammer;
    const B = 0.0004 * Math.min(1.5, Math.max(0.5, freq / 260)); // inharmonicity grows up the keyboard
    const count = Math.max(4, Math.min(16, Math.floor(10000 / freq)));
    const sustainTime = 7 * Math.min(2, Math.sqrt(260 / freq)); // low notes ring longer
    const parts: { f: number; a: number; tau: number }[] = [];
    let total = 0;
    for (let k = 1; k <= count; k++) {
      const strike = Math.abs(Math.sin((Math.PI * k) / 8.3)) * 0.7 + 0.3; // struck near 1/8 of the string
      const a = (strike / k ** (1.9 - 1.1 * hard)) * (freq * k > 6000 ? 0.4 : 1);
      parts.push({ f: k * freq * Math.sqrt(1 + B * k * k), a, tau: sustainTime / (1 + 0.6 * (k - 1) * (0.6 + hard)) });
      total += a;
    }
    const level = 1.6 / total;
    parts.forEach(({ f, a, tau }, i) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(a * level, time + 0.002);
      g.gain.setTargetAtTime(0, time + 0.002, tau / 3);
      g.connect(out);
      const strings = i < 6 ? [-0.6, 0.6] : [0];
      for (const cents of strings) {
        const o = this.osc("sine", f, time, end, null);
        o.detune.value = cents * (0.5 + hard);
        if (strings.length > 1) {
          const half = ctx.createGain();
          half.gain.value = 0.5;
          o.connect(half).connect(g);
        } else o.connect(g);
      }
    });
    // The hammer's felt: a short low-passed noise burst.
    const thump = ctx.createGain();
    thump.gain.setValueAtTime(0.12 + 0.25 * hard, time);
    thump.gain.setTargetAtTime(0, time, 0.008);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = Math.min(6000, freq * (2 + 4 * hard));
    this.noiseSource(time, time + 0.08).connect(lp).connect(thump).connect(out);
  }

  /** Begin loading the recorded instrument if the settings use one. */
  preload() {
    if (isSampled(this.settings.model)) void loadSamples(this.ctx, this.settings.sampleSet);
  }

  /** A recorded note: the nearest sample (in the layer for this velocity), retuned by playback rate. */
  private sampled(freq: number, time: number, end: number, velocity: number, out: AudioNode) {
    const set = this.settings.sampleSet;
    const bank = banks.get(set);
    if (!bank) {
      this.preload();
      return;
    }
    const layers = [...new Set(bank.map((x) => x.layer))].sort((a, b) => a - b);
    const layer = layers.length > 1 ? (velocity < 0.62 ? layers[0] : layers[layers.length - 1]) : layers[0];
    const midi = 69 + 12 * Math.log2(freq / 440);
    let best = bank[0];
    for (const x of bank) if (x.layer === layer && (best.layer !== layer || Math.abs(x.midi - midi) < Math.abs(best.midi - midi))) best = x;
    const src = this.track(this.ctx.createBufferSource());
    src.buffer = best.buffer;
    src.playbackRate.value = freq / (440 * 2 ** ((best.midi - 69) / 12));
    const g = this.ctx.createGain();
    // Within a layer, velocity still shades the level (about ±6 dB around the neutral 0.75).
    g.gain.value = SET_GAIN[set] * (0.5 + 0.67 * velocity) * (layers.length > 1 && layer === layers[0] ? 1.35 : 1);
    src.connect(g).connect(out);
    src.start(time);
    src.stop(Math.min(end, time + best.buffer.duration / src.playbackRate.value));
  }

  start(note: string, time: number, duration: number, velocity = 0.75) {
    const st = this.settings;
    const ctx = this.ctx;
    const freq = frequency(note, this.tuning());
    // A detached touch lets the key up before the written length (Gould's articulation).
    if (st.model === "piano") duration *= 1 - 0.5 * st.pianoDetach;
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    filter.type = "lowpass";
    filter.frequency.value = st.tone;
    filter.connect(env).connect(this.out);
    const a = Math.max(0.003, st.attack);
    const off = time + Math.max(duration, a);
    const end = off + st.release + 0.1;
    // ADSR: attack to 1, decay to the sustain level, hold until the note ends, then release.
    // Velocity shades the loudness of the synthesized models (about ±6 dB around 0.75); the
    // recorded ones choose a layer and shade it themselves.
    const peak = isSampled(st.model) ? 1 : 0.5 + 0.67 * velocity;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(peak, time + a);
    env.gain.setTargetAtTime(st.sustain * peak, time + a, Math.max(0.001, st.decay) / 3);
    env.gain.cancelScheduledValues(off);
    env.gain.setTargetAtTime(0, off, Math.max(0.005, st.release) / 3);

    let vib: GainNode | null = null;
    if (st.vibrato > 0 && st.model !== "pluck") {
      const lfo = this.track(ctx.createOscillator());
      lfo.frequency.value = 5.5;
      vib = ctx.createGain();
      vib.gain.setValueAtTime(0, time);
      vib.gain.linearRampToValueAtTime(st.vibrato, time + 0.3); // vibrato fades in
      lfo.connect(vib);
      lfo.start(time);
      lfo.stop(end);
    }

    switch (st.model) {
      case "sampled":
      case "sampledModern":
        this.sampled(freq, time, end, velocity, filter);
        return;
      case "piano":
        this.piano(freq, time, end, filter);
        return;
      case "pluck": {
        const src = this.track(ctx.createBufferSource());
        src.buffer = this.pluckBuffer(freq, end - time, st.pluckDamping, st.pluckBrightness);
        const boost = ctx.createGain();
        boost.gain.value = 1.4; // a plucked string loses energy fast; match the other models' loudness
        src.connect(boost).connect(filter);
        src.start(time);
        src.stop(end);
        return;
      }
      case "fm": {
        const carrier = this.osc("sine", freq, time, end, vib);
        const mod = this.osc("sine", freq * st.fmRatio, time, end, null);
        const depth = ctx.createGain();
        // Modulation depth follows the envelope shape, so bright attacks mellow as they decay.
        const peak = st.fmIndex * freq * st.fmRatio;
        depth.gain.setValueAtTime(peak, time);
        depth.gain.setTargetAtTime(peak * Math.max(0.15, st.sustain), time + a, Math.max(0.001, st.decay) / 3);
        mod.connect(depth).connect(carrier.frequency);
        carrier.connect(filter);
        return;
      }
      case "additive":
        this.osc(this.spectrum(2.6 - 2.1 * st.addBrightness, st.addEven), freq, time, end, vib).connect(filter);
        return;
      case "formant": {
        // A buzzing glottal source (bright spectrum) and breath noise through three vowel formants.
        const src = ctx.createGain();
        this.osc(this.spectrum(1, 1, 40), freq, time, end, vib).connect(src);
        const breath = ctx.createGain();
        breath.gain.value = st.formantBreath * 0.4;
        this.noiseSource(time, end).connect(breath).connect(src);
        const v = Math.max(0, Math.min(4, st.formantVowel));
        const lo = Math.floor(v);
        const hi = Math.min(4, lo + 1);
        const f = v - lo;
        [1, 0.5, 0.25].forEach((gain, i) => {
          const bp = ctx.createBiquadFilter();
          bp.type = "bandpass";
          bp.frequency.value = VOWELS[lo][i] * (1 - f) + VOWELS[hi][i] * f;
          bp.Q.value = bp.frequency.value / [80, 90, 120][i];
          const g = ctx.createGain();
          g.gain.value = gain * 3.8;
          src.connect(bp).connect(g).connect(filter);
        });
        return;
      }
      case "bowed": {
        // Sawtooth string plus bow noise, coloured by fixed body resonances (a violin-family body).
        const string = ctx.createGain();
        this.osc("sawtooth", freq, time, end, vib).connect(string);
        const o2 = this.osc("sawtooth", freq, time, end, vib);
        o2.detune.value = 4;
        o2.connect(string);
        const rosin = ctx.createGain();
        rosin.gain.value = st.bowPressure * 0.25;
        const rosinBp = ctx.createBiquadFilter();
        rosinBp.type = "bandpass";
        rosinBp.frequency.value = freq * 3;
        rosinBp.Q.value = 1.5;
        this.noiseSource(time, end).connect(rosinBp).connect(rosin).connect(string);
        const dry = ctx.createGain();
        dry.gain.value = 0.35 * (1 - st.bowBody) + 0.1;
        string.connect(dry).connect(filter);
        [280, 460, 1100, 2600, 3900].forEach((fr, i) => {
          const bp = ctx.createBiquadFilter();
          bp.type = "bandpass";
          bp.frequency.value = fr;
          bp.Q.value = 4 + i;
          const g = ctx.createGain();
          g.gain.value = st.bowBody * 1.1;
          string.connect(bp).connect(g).connect(filter);
        });
        return;
      }
      case "wavetable": {
        // Four tables from mellow to bright; an LFO scans between the two around the position.
        const tables = [this.spectrum(3, 0.3, 8), this.spectrum(1.6, 0.9), this.spectrum(1, 1, 32), this.spectrum(1, 0, 32)];
        const pos = Math.max(0, Math.min(0.999, st.wtPosition)) * (tables.length - 1);
        const i = Math.floor(pos);
        const ga = ctx.createGain();
        const gb = ctx.createGain();
        ga.gain.value = 1 - (pos - i);
        gb.gain.value = pos - i;
        this.osc(tables[i], freq, time, end, vib).connect(ga).connect(filter);
        this.osc(tables[i + 1], freq, time, end, vib).connect(gb).connect(filter);
        if (st.wtScan > 0) {
          const lfo = this.track(ctx.createOscillator());
          lfo.frequency.value = st.wtScan;
          const depth = ctx.createGain();
          depth.gain.value = 0.45;
          const inv = ctx.createGain();
          inv.gain.value = -0.45;
          lfo.connect(depth).connect(gb.gain);
          lfo.connect(inv).connect(ga.gain);
          lfo.start(time);
          lfo.stop(end);
        }
        return;
      }
      case "ringmod": {
        const carrier = this.osc("triangle", freq, time, end, vib);
        const mod = this.osc("sine", freq * st.ringRatio, time, end, null);
        const ring = ctx.createGain();
        ring.gain.value = 0; // the modulator drives the gain: carrier x modulator
        mod.connect(ring.gain);
        const wet = ctx.createGain();
        wet.gain.value = st.ringMix * 1.4;
        const dry = ctx.createGain();
        dry.gain.value = 1 - st.ringMix;
        carrier.connect(ring).connect(wet).connect(filter);
        carrier.connect(dry).connect(filter);
        return;
      }
      case "wavefold": {
        const src = this.osc("sine", freq, time, end, vib);
        const sum = ctx.createGain();
        sum.gain.value = 0.9;
        src.connect(sum);
        const bias = this.track(ctx.createConstantSource());
        bias.offset.value = (st.foldSymmetry - 0.5) * 0.8;
        bias.connect(sum);
        bias.start(time);
        bias.stop(end);
        const shaper = ctx.createWaveShaper();
        shaper.curve = this.foldCurve(st.foldDrive);
        const hp = ctx.createBiquadFilter(); // remove the DC offset that the bias introduces
        hp.type = "highpass";
        hp.frequency.value = 20;
        sum.connect(shaper).connect(hp).connect(filter);
        return;
      }
      case "subtractive":
      default: {
        const spread = st.detune > 0 ? [-st.detune / 2, st.detune / 2] : [0];
        for (const cents of spread) {
          const g = ctx.createGain();
          g.gain.value = 1 / spread.length;
          const o = this.osc(st.waveform, freq, time, end, vib);
          o.detune.value = cents;
          o.connect(g).connect(filter);
        }
      }
    }
  }

  stop() {
    for (const o of this.live) o.stop();
    this.live.clear();
  }
}
