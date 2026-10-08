/**
 * Audio with two switchable sounds:
 * - "piano": sampled acoustic grand piano (smplr Soundfont, MusyngKite kit, fetched over the network);
 * - "chip": an oscillator synthesizer (waveform, ADSR, low-pass tone) built from Web Audio (no download).
 * The AudioContext is created on the first user gesture (browser autoplay policy). If the piano
 * samples cannot be loaded, the failure is reported; nothing is substituted silently.
 */
import { Soundfont } from "smplr";
import { parsePitch } from "../music/pitch.ts";

export type SoundId = "piano" | "chip";
export type AudioStatus = "idle" | "loading" | "ready" | "failed";

export interface PlaybackColumn {
  cantus: string;
  counterpoint: string | null;
}

type Voices = Record<"cantus" | "counterpoint", Instrument>;

interface Instrument {
  start(note: string, time: number, duration: number): void;
  stop(): void;
}

export type Waveform = "sine" | "triangle" | "square" | "sawtooth";
export const WAVEFORMS: Waveform[] = ["sine", "triangle", "square", "sawtooth"];

export type SynthModel = "subtractive" | "pluck" | "fm" | "additive";
export const SYNTH_MODELS: SynthModel[] = ["subtractive", "pluck", "fm", "additive"];

/**
 * Synth settings (the "rack"). Shared: envelope (seconds; sustain 0..1), tone (low-pass Hz), vibrato (cents).
 * Per model: subtractive (waveform, detune in cents), pluck (damping 0..1, brightness 0..1),
 * FM (ratio of modulator to carrier, index = modulation depth), additive (brightness 0..1, even-harmonic level 0..1).
 */
export interface SynthSettings {
  model: SynthModel;
  waveform: Waveform;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  tone: number;
  vibrato: number;
  detune: number;
  pluckDamping: number;
  pluckBrightness: number;
  fmRatio: number;
  fmIndex: number;
  addBrightness: number;
  addEven: number;
}

const BASE: SynthSettings = {
  model: "subtractive", waveform: "triangle", attack: 0.02, decay: 0.15, sustain: 0.6, release: 0.25, tone: 2500, vibrato: 0, detune: 0,
  pluckDamping: 0.6, pluckBrightness: 0.6, fmRatio: 2, fmIndex: 2, addBrightness: 0.5, addEven: 0.7,
};
export const DEFAULT_SYNTH: SynthSettings = BASE;

const preset = (o: Partial<SynthSettings>): SynthSettings => ({ ...BASE, ...o });
/** Synthesized imitations, named by the sound they evoke (no samples involved). */
export const SYNTH_PRESETS: { id: string; settings: SynthSettings }[] = [
  { id: "soft", settings: BASE },
  { id: "harpsichord", settings: preset({ model: "pluck", attack: 0.003, decay: 0.05, sustain: 1, release: 0.15, tone: 7000, pluckDamping: 0.55, pluckBrightness: 0.95 }) },
  { id: "lute", settings: preset({ model: "pluck", attack: 0.003, decay: 0.05, sustain: 1, release: 0.3, tone: 3000, pluckDamping: 0.75, pluckBrightness: 0.45 }) },
  { id: "organ", settings: preset({ model: "additive", attack: 0.03, decay: 0.05, sustain: 1, release: 0.12, tone: 6000, addBrightness: 0.55, addEven: 0.8 }) },
  { id: "flute", settings: preset({ model: "additive", attack: 0.09, decay: 0.1, sustain: 0.9, release: 0.2, tone: 4000, vibrato: 10, addBrightness: 0.1, addEven: 0.3 }) },
  { id: "clarinet", settings: preset({ model: "additive", attack: 0.05, decay: 0.1, sustain: 0.85, release: 0.15, tone: 3500, vibrato: 4, addBrightness: 0.6, addEven: 0.05 }) },
  { id: "epiano", settings: preset({ model: "fm", attack: 0.004, decay: 1.2, sustain: 0.15, release: 0.5, tone: 6000, fmRatio: 1, fmIndex: 3 }) },
  { id: "bells", settings: preset({ model: "fm", attack: 0.003, decay: 1.8, sustain: 0, release: 1.2, tone: 9000, fmRatio: 3.5, fmIndex: 4 }) },
  { id: "brass", settings: preset({ model: "fm", attack: 0.06, decay: 0.2, sustain: 0.8, release: 0.15, tone: 4000, vibrato: 6, fmRatio: 1, fmIndex: 5 }) },
  { id: "orchestra", settings: preset({ waveform: "sawtooth", attack: 0.25, decay: 0.3, sustain: 0.85, release: 0.6, tone: 1600, detune: 14, vibrato: 12 }) },
  { id: "bleep", settings: preset({ waveform: "square", attack: 0.003, decay: 0.09, sustain: 0, release: 0.05, tone: 4500 }) },
  { id: "peng", settings: preset({ waveform: "sawtooth", attack: 0.003, decay: 0.28, sustain: 0, release: 0.12, tone: 2800, detune: 9 }) },
];

export type VoiceId = "cantus" | "counterpoint";
export type VoiceSynths = Record<VoiceId, SynthSettings>;

/** One synthesizer voice with four models, an ADSR envelope, a low-pass filter and vibrato. */
class Synth implements Instrument {
  private live = new Set<AudioScheduledSourceNode>();
  private ctx: AudioContext;
  private out: GainNode;
  private waves = new Map<string, PeriodicWave>();
  settings: SynthSettings;
  constructor(ctx: AudioContext, destination: AudioNode, settings: SynthSettings) {
    this.ctx = ctx;
    this.settings = settings;
    this.out = ctx.createGain();
    this.out.gain.value = 0.18; // headroom for two voices
    this.out.connect(destination);
  }

  private track(n: AudioScheduledSourceNode) {
    this.live.add(n);
    n.onended = () => this.live.delete(n);
  }

  /** Additive spectrum: 24 partials, rolloff set by brightness, even partials scaled. */
  private additive(brightness: number, even: number): PeriodicWave {
    const key = `${brightness.toFixed(2)}:${even.toFixed(2)}`;
    let w = this.waves.get(key);
    if (!w) {
      const n = 24;
      const real = new Float32Array(n + 1);
      const imag = new Float32Array(n + 1);
      const exponent = 2.6 - 2.1 * brightness;
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
    // Excitation: noise, low-passed more for a darker pluck.
    let prev = 0;
    const smooth = 1 - 0.9 * brightness;
    for (let i = 0; i < period; i++) {
      const x = Math.random() * 2 - 1;
      prev = prev * smooth + x * (1 - smooth);
      line[i] = prev;
    }
    const loss = 0.9935 + 0.0062 * damping; // per-sample averaging loss: higher = longer ring
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const cur = line[idx];
      const next = line[(idx + 1) % period];
      out[i] = cur;
      line[idx] = loss * 0.5 * (cur + next);
      idx = (idx + 1) % period;
    }
    return buf;
  }

  start(note: string, time: number, duration: number) {
    const st = this.settings;
    const freq = 440 * 2 ** ((parsePitch(note).midi - 69) / 12);
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();
    filter.type = "lowpass";
    filter.frequency.value = st.tone;
    filter.connect(env).connect(this.out);
    const a = Math.max(0.003, st.attack);
    const off = time + Math.max(duration, a);
    const end = off + st.release + 0.1;
    // ADSR: attack to 1, decay to the sustain level, hold until the note ends, then release.
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(1, time + a);
    env.gain.setTargetAtTime(st.sustain, time + a, Math.max(0.001, st.decay) / 3);
    env.gain.cancelScheduledValues(off);
    env.gain.setTargetAtTime(0, off, Math.max(0.005, st.release) / 3);

    let vib: GainNode | null = null;
    if (st.vibrato > 0 && st.model !== "pluck") {
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 5.5;
      vib = this.ctx.createGain();
      vib.gain.setValueAtTime(0, time);
      vib.gain.linearRampToValueAtTime(st.vibrato, time + 0.3); // vibrato fades in
      lfo.connect(vib);
      lfo.start(time);
      lfo.stop(end);
    }

    if (st.model === "pluck") {
      const src = this.ctx.createBufferSource();
      src.buffer = this.pluckBuffer(freq, end - time, st.pluckDamping, st.pluckBrightness);
      const boost = this.ctx.createGain();
      boost.gain.value = 1.4; // a plucked string loses energy fast; match the other models' loudness
      src.connect(boost).connect(filter);
      src.start(time);
      src.stop(end);
      this.track(src);
      return;
    }
    if (st.model === "fm") {
      const carrier = this.ctx.createOscillator();
      const mod = this.ctx.createOscillator();
      const depth = this.ctx.createGain();
      carrier.frequency.value = freq;
      mod.frequency.value = freq * st.fmRatio;
      // Modulation depth follows the envelope shape, so bright attacks mellow as they decay.
      const peak = st.fmIndex * freq * st.fmRatio;
      depth.gain.setValueAtTime(peak, time);
      depth.gain.setTargetAtTime(peak * Math.max(0.15, st.sustain), time + a, Math.max(0.001, st.decay) / 3);
      mod.connect(depth).connect(carrier.frequency);
      if (vib) vib.connect(carrier.detune);
      carrier.connect(filter);
      for (const o of [carrier, mod]) {
        o.start(time);
        o.stop(end);
        this.track(o);
      }
      return;
    }
    const spread = st.model === "subtractive" && st.detune > 0 ? [-st.detune / 2, st.detune / 2] : [0];
    for (const cents of spread) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      g.gain.value = 1 / spread.length;
      if (st.model === "additive") osc.setPeriodicWave(this.additive(st.addBrightness, st.addEven));
      else osc.type = st.waveform;
      osc.frequency.value = freq;
      osc.detune.value = cents;
      if (vib) vib.connect(osc.detune);
      osc.connect(g).connect(filter);
      osc.start(time);
      osc.stop(end);
      this.track(osc);
    }
  }

  stop() {
    for (const o of this.live) o.stop();
    this.live.clear();
  }
}

class SampledPiano implements Instrument {
  private sf: Soundfont;
  constructor(sf: Soundfont) {
    this.sf = sf;
  }
  start(note: string, time: number, duration: number) {
    this.sf.start({ note, time, duration, velocity: 80 });
  }
  stop() {
    this.sf.stop();
  }
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume = 0.7;
  private instruments = new Map<SoundId, Promise<Voices | null>>();
  private current: Voices | null = null;
  private timers: number[] = [];
  sound: SoundId = "piano";
  /** Independent settings for the cantus firmus and the counterpoint. */
  synth: VoiceSynths = { cantus: { ...DEFAULT_SYNTH }, counterpoint: { ...DEFAULT_SYNTH } };
  status: AudioStatus = "idle";
  /** Number of notes started (for tests and diagnostics). */
  notesStarted = 0;
  onStatus: (s: AudioStatus) => void = () => {};

  private setStatus(s: AudioStatus) {
    this.status = s;
    this.onStatus(s);
  }

  /** Change synth settings; applies to notes started from now on. */
  setSynth(settings: VoiceSynths) {
    Object.assign(this.synth.cantus, settings.cantus);
    Object.assign(this.synth.counterpoint, settings.counterpoint);
  }

  /** Master volume, 0..1. */
  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
  }

  setSound(sound: SoundId) {
    this.stop();
    this.sound = sound;
    if (this.ctx) void this.instrument(); // preload/refresh status if audio is already running
  }

  /** Resolve the selected instrument; must first be called from a user gesture. */
  private async instrument(): Promise<Voices | null> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    const ctx = this.ctx;
    const master = this.master!;
    let p = this.instruments.get(this.sound);
    if (!p) {
      p =
        this.sound === "chip"
          ? Promise.resolve({ cantus: new Synth(ctx, master, this.synth.cantus), counterpoint: new Synth(ctx, master, this.synth.counterpoint) })
          : new Soundfont(ctx, { instrument: "acoustic_grand_piano", kit: "MusyngKite", destination: master }).load.then(
              (sf) => {
                const piano = new SampledPiano(sf);
                return { cantus: piano, counterpoint: piano };
              },
              () => null,
            );
      this.instruments.set(this.sound, p);
      // A failed piano load is retried on the next request.
      void p.then((i) => i === null && this.instruments.delete("piano"));
    }
    this.setStatus("loading");
    const inst = await p;
    this.setStatus(inst ? "ready" : "failed");
    this.current = inst;
    return inst;
  }

  private play(voices: Voices, voice: VoiceId, note: string, time: number, duration: number) {
    voices[voice].start(note, time, duration);
    this.notesStarted++;
  }

  private both(voices: Voices, col: PlaybackColumn, time: number, duration: number) {
    this.play(voices, "cantus", col.cantus, time, duration);
    if (col.counterpoint) this.play(voices, "counterpoint", col.counterpoint, time, duration);
  }

  /** Length of one bar (a whole note) at the current tempo, in seconds. */
  get barSeconds(): number {
    return 120 / this.tempo;
  }

  /** Sound one vertical sonority for a full bar (used when a note is placed or a bar is auditioned). */
  async playColumn(col: PlaybackColumn, seconds = this.barSeconds): Promise<void> {
    const inst = await this.instrument();
    if (!inst || !this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    this.both(inst, col, t, seconds);
  }

  /** Play a short run of columns, then resolve. `barSeconds` defaults to half a bar at the current tempo. */
  playSequence(cols: PlaybackColumn[], barSeconds = this.barSeconds / 2): Promise<void> {
    return new Promise((resolve) => {
      void (async () => {
        this.stop();
        const inst = await this.instrument();
        const ctx = this.ctx;
        if (!inst || !ctx) return resolve();
        const t0 = ctx.currentTime + 0.05;
        cols.forEach((c, k) => {
          this.both(inst, c, t0 + k * barSeconds, barSeconds * 0.95);
        });
        this.timers.push(window.setTimeout(resolve, (0.05 + cols.length * barSeconds) * 1000));
      })();
    });
  }

  /**
   * Short feedback cues, independent of the synth settings:
   * "wrong" (a low falling buzz), "correct" (a bright rising pair), "meh" (a flat, sagging tone).
   */
  cue(kind: "wrong" | "correct" | "meh"): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || !this.master) return Promise.resolve();
    const t0 = ctx.currentTime + 0.02;
    const tone = (f0: number, f1: number, start: number, dur: number, type: OscillatorType, level: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f0, t0 + start);
      osc.frequency.exponentialRampToValueAtTime(f1, t0 + start + dur);
      g.gain.setValueAtTime(0, t0 + start);
      g.gain.linearRampToValueAtTime(level, t0 + start + 0.01);
      g.gain.setTargetAtTime(0, t0 + start + dur * 0.6, dur / 6);
      osc.connect(g).connect(this.master!);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.2);
    };
    let length = 0.4;
    if (kind === "wrong") {
      tone(220, 140, 0, 0.18, "sawtooth", 0.18);
      tone(165, 100, 0.16, 0.28, "sawtooth", 0.18);
      length = 0.5;
    } else if (kind === "correct") {
      tone(880, 880, 0, 0.12, "triangle", 0.25);
      tone(1320, 1320, 0.11, 0.25, "triangle", 0.25);
    } else {
      tone(330, 290, 0, 0.45, "triangle", 0.2);
      length = 0.5;
    }
    return new Promise((r) => this.timers.push(window.setTimeout(r, length * 1000)));
  }

  /** Alla-breve pulse (half notes per minute); read live by the scheduler, so changes affect playback in progress. */
  tempo = 60;

  /**
   * Play all columns, one whole note each. Columns are scheduled just ahead of time, so a tempo
   * change takes effect from the next column. `onColumn(k)` fires as column k sounds; -1 marks the end.
   */
  async playAll(cols: PlaybackColumn[], onColumn: (k: number) => void): Promise<void> {
    this.stop();
    const inst = await this.instrument();
    const ctx = this.ctx;
    if (!inst || !ctx) {
      onColumn(-1);
      return;
    }
    let k = 0;
    let next = ctx.currentTime + 0.1;
    const LOOKAHEAD = 0.15;
    const tick = () => {
      while (k < cols.length && next < ctx.currentTime + LOOKAHEAD) {
        const whole = 120 / this.tempo;
        this.both(inst, cols[k], next, whole * 0.97);
        const col = k;
        this.timers.push(window.setTimeout(() => onColumn(col), Math.max(0, (next - ctx.currentTime) * 1000)));
        next += whole;
        k++;
      }
      if (k >= cols.length) {
        this.timers.push(window.setTimeout(() => onColumn(-1), Math.max(0, (next - ctx.currentTime) * 1000)));
        return;
      }
      this.timers.push(window.setTimeout(tick, 40));
    };
    tick();
  }

  stop(): void {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    this.current?.cantus.stop();
    this.current?.counterpoint.stop();
  }
}

/** Render one note offline and return its RMS and peak level (diagnostics and tests). */
export async function renderLevel(settings: SynthSettings, note = "A4", seconds = 1): Promise<{ rms: number; peak: number }> {
  const sr = 22050;
  const ctx = new OfflineAudioContext(1, Math.ceil((seconds + settings.release + 0.3) * sr), sr);
  const synth = new Synth(ctx as unknown as AudioContext, ctx.destination, settings);
  synth.start(note, 0, seconds);
  const data = (await ctx.startRendering()).getChannelData(0);
  let sum = 0;
  let peak = 0;
  for (const x of data) {
    if (!Number.isFinite(x)) return { rms: NaN, peak: NaN };
    sum += x * x;
    peak = Math.max(peak, Math.abs(x));
  }
  return { rms: Math.sqrt(sum / data.length), peak };
}
