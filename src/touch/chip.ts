/**
 * The 8-bit sound: pulse- and triangle-wave notes and a ticking metronome on Web Audio, scheduled on
 * the audio clock so the beat stays steady whatever the screen does.
 * D167, a little warmer: each note has an attack, a short fall to its sustain and a release; long notes
 * take a gentle vibrato after a moment; the player can bend a held note (engine.ts); the voices stand
 * apart left to right; a soft filter takes the edge off and a small room (a generated reverb) carries
 * them; the metronome is a quiet tick.
 */
export type Timbre = "pulse12" | "pulse25" | "pulse50" | "triangle";

import { hz } from "./tuning.ts";
import { grooveHits, preset, patchFor, PATCHES, type Drum, type Patch, type Wave } from "./sound.ts";

/**
 * D179, the player's voice: whatever the ensemble gives it, it holds while the thumb is down (a plucked
 * sound keeps half its strength and fades slowly), a little forward of the others, with a second
 * oscillator a few cents off (chorus) and a vibrato that comes in after a moment.
 */
export function leadOf(pt: Patch): Patch {
  const pluck = pt.amp.s === 0;
  return {
    ...pt,
    osc: [...pt.osc, { ...pt.osc[0], detune: (pt.osc[0].detune ?? 0) + 7, gain: (pt.osc[0].gain ?? 1) * 0.35 }],
    amp: pluck ? { a: pt.amp.a, d: Math.max(0.6, pt.amp.d), s: 0.55, r: 0.18 } : { ...pt.amp, r: Math.max(0.12, pt.amp.r) },
    vib: pt.vib ?? { depth: 8, rate: 5.2, delay: 0.35 },
    level: pt.level * 1.12,
  };
}

export interface Voicing {
  timbre: Timbre;
  /** D177: the voice's instrument in the ensemble chosen (none: the classic chip sound). */
  patch?: Patch | null;
  /** -1 (left) to 1 (right). */
  pan: number;
  /** The voice's level (1 for every voice since D169). */
  gain: number;
}

/** How the player's own note sounds (D171): the Synth holds steady while the thumb stays down; the Piano dies away as it is held and is damped when let go. */
export type Envelope = "synth" | "piano" | "dulcimer";

export interface Play {
  envelope?: Envelope;
  /** Joined to the note before without a new attack (that note is still held). */
  legato?: boolean;
  /** A level for this note alone (1: as the voice). */
  level?: number;
  /** The note can be muffled after it starts (the testbench, D175: a gesture judged wrong). */
  muffleable?: boolean;
  /** D177, the touch's expression: brightness (-1 dark to 1 bright), softness of the attack (0 to 1), an accent (0 to 1). */
  bright?: number;
  soft?: number;
  accent?: number;
  /** D179: the player's own voice: it never dies away quickly, stands a little forward, has a touch of chorus and vibrato. */
  lead?: boolean;
}

export interface Sounding {
  stop: (at?: number) => void;
  /** Bend the note by some cents (the thumb's sideways wobble). */
  bend: (cents: number) => void;
  /** Glide to another pitch without a new attack (a held thumb slid on: glissando). */
  glide?: (midi: number) => void;
  /** Darken and soften it (a wrong gesture: Bach's note, but muffled). */
  muffle?: () => void;
  /** D179: the note's dynamic now (1 as struck), changed smoothly while it sounds (a swell, a diminuendo). */
  dyn?: (level: number) => void;
}

export class Chip {
  readonly ctx: AudioContext;
  private master: GainNode;
  private bus: AudioNode;
  private waves = new Map<string, PeriodicWave>();
  private keepAlive: HTMLAudioElement | null = null;
  /**
   * The delay between the audio clock and what the player hears and does, in seconds, measured by
   * tapping along (D173: Bluetooth headphones add a fifth of a second or more, which the system often
   * does not report). Null: the system's own figure.
   */
  lag: number | null = null;

  constructor() {
    // iOS: play through the silent switch (Safari 16.4+), as a game should.
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    try {
      if (nav.audioSession) nav.audioSession.type = "playback";
    } catch {
      /* not supported */
    }
    this.ctx = new AudioContext({ latencyHint: "interactive" });
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.55;
    const soften = ctx.createBiquadFilter();
    soften.type = "lowpass";
    soften.frequency.value = 6500;
    soften.Q.value = 0.5;
    const squeeze = ctx.createDynamicsCompressor();
    squeeze.threshold.value = -14;
    squeeze.ratio.value = 3;
    this.master.connect(soften).connect(squeeze).connect(ctx.destination);
    // The room: a second of decaying noise, a little of it under everything.
    const room = ctx.createConvolver();
    room.buffer = impulse(ctx, 1.3);
    const wet = ctx.createGain();
    wet.gain.value = 0.16;
    this.master.connect(room).connect(wet).connect(squeeze);
    this.bus = this.master;
  }

  /** Where a voice of one's own joins the sound (the testbench's instruments, D170). */
  get input(): AudioNode {
    return this.bus;
  }

  /** A pulse of the given duty (as on the NES), built once. */
  wave(timbre: Timbre): PeriodicWave | "triangle" {
    if (timbre === "triangle") return "triangle";
    let w = this.waves.get(timbre);
    if (!w) {
      const duty = timbre === "pulse12" ? 0.125 : timbre === "pulse25" ? 0.25 : 0.5;
      const N = 48;
      const real = new Float32Array(N);
      const imag = new Float32Array(N);
      for (let n = 1; n < N; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
      w = this.ctx.createPeriodicWave(real, imag);
      this.waves.set(timbre, w);
    }
    return w;
  }

  /**
   * Call from a finished tap, a click or a key: browsers start audio only then. On an iPhone it also
   * starts a silent looping <audio>, which moves the page's sound to the media channel, so the ring/
   * silent switch does not mute the game (older iOS, without audioSession).
   */
  resume(): Promise<void> {
    if (!this.keepAlive && typeof Audio !== "undefined" && navigator.maxTouchPoints > 0) {
      try {
        const a = new Audio(silentWav());
        a.loop = true;
        a.setAttribute("playsinline", "");
        void a.play().catch(() => {});
        this.keepAlive = a;
      } catch {
        /* no <audio>: the switch may mute the game */
      }
    }
    return this.ctx.state === "running" ? Promise.resolve() : this.ctx.resume();
  }

  /** The audio clock as the ear hears it (the output's latency taken off), for drawing in sync. */
  heard(): number {
    return this.ctx.currentTime - (this.lag ?? (this.ctx.outputLatency || this.ctx.baseLatency || 0));
  }

  /** A note from `at` for `dur` seconds; stop() cuts it short (the thumb let go). */
  note(midi: number, at: number, dur: number, v: Voicing, p: Play = {}): Sounding {
    if (p.lead) return this.patchNote(midi, at, dur, v, leadOf(v.patch ?? PATCHES.nesMid), p);
    if (v.patch) return this.patchNote(midi, at, dur, v, v.patch, p);
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    const end = Math.max(t + 0.04, at + dur - 0.01);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const w = this.wave(v.timbre);
    if (w === "triangle") o.type = "triangle";
    else o.setPeriodicWave(w);
    o.frequency.value = hz(midi);
    // The triangle is quieter than the pulses at the same amplitude.
    const peak = (v.timbre === "triangle" ? 0.36 : v.timbre === "pulse50" ? 0.15 : 0.19) * v.gain * (p.level ?? 1);
    const sustain = peak * 0.72;
    const piano = p.envelope === "piano" || p.envelope === "dulcimer";
    g.gain.setValueAtTime(0, t);
    if (piano) {
      // Struck: at once loud, then dying away, the low notes slower.
      g.gain.linearRampToValueAtTime(peak * 1.15, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.01, (p.envelope === "dulcimer" ? 0.45 : 1.4) * 2 ** (-(midi - 60) / 24));
    } else if (p.legato) {
      // Joined: no new attack, the level of the note before.
      g.gain.linearRampToValueAtTime(sustain, t + 0.015);
    } else {
      g.gain.linearRampToValueAtTime(peak, t + 0.006);
      g.gain.setTargetAtTime(sustain, t + 0.01, 0.06);
    }
    if (!piano) {
      g.gain.setValueAtTime(sustain, Math.max(t + 0.02, end - 0.04));
      g.gain.linearRampToValueAtTime(0, end);
    }
    // A gentle vibrato on a long note, after a moment (not on a piano).
    if (!piano && end - t > 0.45) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 5.4;
      depth.gain.setValueAtTime(0, t);
      depth.gain.setValueAtTime(0, t + 0.28);
      depth.gain.linearRampToValueAtTime(9, t + 0.55);
      lfo.connect(depth).connect(o.detune);
      lfo.start(t);
      lfo.stop(end + 0.05);
    }
    let src: AudioNode = o;
    const dull = p.muffleable ? ctx.createBiquadFilter() : null;
    if (dull) {
      dull.type = "lowpass";
      dull.frequency.value = 12000;
      src = o.connect(dull);
    }
    if (pan) {
      pan.pan.value = Math.max(-1, Math.min(1, v.pan));
      src.connect(g).connect(pan).connect(this.bus);
    } else src.connect(g).connect(this.bus);
    o.start(t);
    o.stop(end + 0.05);
    let stopped = false;
    return {
      stop: (when = ctx.currentTime) => {
        if (stopped || when >= end) return;
        stopped = true;
        const s = Math.max(when, t + 0.02);
        // Held at its level, then let go (a piano's damper takes a little longer).
        if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(s);
        else {
          g.gain.cancelScheduledValues(s);
          g.gain.setValueAtTime(piano ? peak * 0.3 : sustain, s);
        }
        g.gain.linearRampToValueAtTime(0, s + (piano ? 0.07 : p.legato ? 0.02 : 0.04));
        o.stop(s + 0.1);
      },
      bend: (cents: number) => {
        if (!stopped) o.detune.setTargetAtTime(cents, ctx.currentTime, 0.02);
      },
      glide: (to: number) => {
        if (!stopped) o.frequency.setTargetAtTime(hz(to), ctx.currentTime, 0.025);
      },
      muffle: () => {
        if (stopped || !dull) return;
        dull.frequency.setTargetAtTime(600, ctx.currentTime, 0.01);
        o.detune.setTargetAtTime(-35, ctx.currentTime, 0.02);
      },
    };
  }

  /** An oscillator of a wave (D177): the native shapes, the NES pulses, and three of our own. */
  private osc(w: Wave): OscillatorNode {
    const o = this.ctx.createOscillator();
    if (w === "saw") o.type = "sawtooth";
    else if (w === "square" || w === "triangle" || w === "sine") o.type = w;
    else if (w === "pulse12" || w === "pulse25" || w === "pulse50") o.setPeriodicWave(this.wave(w) as PeriodicWave);
    else o.setPeriodicWave(this.custom(w));
    return o;
  }

  /** The organ (drawbars 8', 4', 2 2/3', 2'), the reed (strong odd and some even partials, nasal), the bell (inharmonic-ish upper partials). */
  private custom(w: "organ" | "reed" | "bell"): PeriodicWave {
    let pw = this.waves.get(w);
    if (pw) return pw;
    const amps: Record<string, number[]> = {
      organ: [0, 1, 0.8, 0.6, 0.5, 0, 0.3, 0, 0.25],
      reed: [0, 1, 0.35, 0.8, 0.3, 0.6, 0.25, 0.45, 0.2, 0.3, 0.15, 0.2],
      bell: [0, 1, 0, 0, 0.5, 0, 0, 0.35, 0, 0, 0.2, 0, 0.15],
    };
    const a = amps[w];
    const real = new Float32Array(a.length);
    const imag = new Float32Array(a);
    pw = this.ctx.createPeriodicWave(real, imag);
    this.waves.set(w, pw);
    return pw;
  }

  private noiseBuf: AudioBuffer | null = null;
  private noise(): AudioBufferSourceNode {
    if (!this.noiseBuf) {
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      let seed = 99;
      for (let i = 0; i < len; i++) d[i] = (((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1);
    }
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    n.loop = true;
    return n;
  }

  /**
   * A note on an instrument of the ensemble (D177): its oscillators, breath, drive, filter (or vowel),
   * envelope, vibrato and tremolo; shaped by the touch (brightness, a soft or accented attack, level).
   */
  private patchNote(midi: number, at: number, dur: number, v: Voicing, pt: Patch, p: Play): Sounding {
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    const pluck = pt.amp.s === 0;
    const tail = pluck || p.envelope === "piano" || p.envelope === "dulcimer";
    const end = Math.max(t + 0.05, at + dur - 0.01);
    const f0 = hz(midi);
    const bright = 2 ** ((p.bright ?? 0) * 1.3);
    const peak = pt.level * v.gain * (p.level ?? 1) * 0.5;
    const mix = ctx.createGain();
    const oscs: OscillatorNode[] = [];
    for (const o of pt.osc) {
      const n = this.osc(o.wave);
      n.frequency.value = f0 * 2 ** (o.octave ?? 0);
      n.detune.value = o.detune ?? 0;
      const g = ctx.createGain();
      g.gain.value = o.gain ?? 1;
      n.connect(g).connect(mix);
      oscs.push(n);
    }
    let breath: AudioBufferSourceNode | null = null;
    if (pt.breath) {
      breath = this.noise();
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = Math.min(9000, f0 * 2);
      bp.Q.value = 2;
      const bg = ctx.createGain();
      bg.gain.value = pt.breath * 2;
      breath.connect(bp).connect(bg).connect(mix);
    }
    let src: AudioNode = mix;
    if (pt.drive) {
      const sh = ctx.createWaveShaper();
      const k = pt.drive * 6;
      const curve = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        const x = (i / 511) * 2 - 1;
        curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
      }
      sh.curve = curve;
      src = src.connect(sh);
    }
    if (pt.vowel) {
      // Two formants in parallel: a sung vowel.
      const out = ctx.createGain();
      for (const [i, f] of pt.vowel.entries()) {
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = f * (1 + ((p.bright ?? 0) * 0.15));
        bp.Q.value = 6;
        const g = ctx.createGain();
        g.gain.value = i ? 0.7 : 1.4;
        src.connect(bp).connect(g).connect(out);
      }
      src = out;
    }
    const fl = pt.filter ? ctx.createBiquadFilter() : null;
    if (fl && pt.filter) {
      fl.type = pt.filter.type ?? "lowpass";
      fl.Q.value = pt.filter.q ?? 0.7;
      const base = Math.min(16000, (pt.filter.hz ? pt.filter.freq : f0 * pt.filter.freq) * bright);
      const top = Math.min(18000, base * (pt.filter.env ?? 1) * (1 + (p.accent ?? 0) * 0.8));
      fl.frequency.setValueAtTime(top, t);
      fl.frequency.setTargetAtTime(base, t + 0.005, pt.filter.envDecay ?? 0.1);
      src = src.connect(fl);
    } else if (bright !== 1) {
      const tone = ctx.createBiquadFilter();
      tone.type = "lowpass";
      tone.frequency.value = Math.min(16000, f0 * 8 * bright);
      src = src.connect(tone);
    }
    const dull = p.muffleable ? ctx.createBiquadFilter() : null;
    if (dull) {
      dull.type = "lowpass";
      dull.frequency.value = 16000;
      src = src.connect(dull);
    }
    const g = ctx.createGain();
    const a = Math.max(0.002, pt.amp.a * (1 + (p.soft ?? 0) * 4));
    const sus = peak * pt.amp.s;
    g.gain.setValueAtTime(0, t);
    if (p.legato && !pluck) g.gain.linearRampToValueAtTime(sus || peak * 0.7, t + 0.02);
    else {
      g.gain.linearRampToValueAtTime(peak * (1 + (p.accent ?? 0) * 0.7), t + a);
      if (pluck) g.gain.setTargetAtTime(0, t + a, pt.amp.d * 2 ** (-(midi - 60) / 30));
      else g.gain.setTargetAtTime(sus, t + a, pt.amp.d / 3);
    }
    if (!tail) {
      g.gain.setValueAtTime(sus, Math.max(t + a + 0.02, end - pt.amp.r));
      g.gain.linearRampToValueAtTime(0, end);
    }
    if (pt.trem) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      const tg = ctx.createGain();
      lfo.frequency.value = pt.trem.rate;
      depth.gain.value = pt.trem.depth * 0.5;
      tg.gain.value = 1 - pt.trem.depth * 0.5;
      lfo.connect(depth).connect(tg.gain);
      src = src.connect(tg);
      lfo.start(t);
      lfo.stop(end + 2);
    }
    if (pt.vib && end - t > pt.vib.delay + 0.1) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = pt.vib.rate;
      depth.gain.setValueAtTime(0, t);
      depth.gain.setValueAtTime(0, t + pt.vib.delay);
      depth.gain.linearRampToValueAtTime(pt.vib.depth, t + pt.vib.delay + 0.25);
      lfo.connect(depth);
      for (const o of oscs) depth.connect(o.detune);
      lfo.start(t);
      lfo.stop(end + 2);
    }
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const dyn = ctx.createGain();
    if (pan) {
      pan.pan.value = Math.max(-1, Math.min(1, v.pan));
      src.connect(g).connect(dyn).connect(pan).connect(this.bus);
    } else src.connect(g).connect(dyn).connect(this.bus);
    const last = tail ? t + 6 : end + 0.05;
    for (const o of oscs) (o.start(t), o.stop(last));
    if (breath) (breath.start(t), breath.stop(last));
    let stopped = false;
    return {
      stop: (when = ctx.currentTime) => {
        if (stopped) return;
        stopped = true;
        const s = Math.max(when, t + 0.02);
        if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(s);
        else (g.gain.cancelScheduledValues(s), g.gain.setValueAtTime(sus || peak * 0.3, s));
        g.gain.linearRampToValueAtTime(0, s + Math.max(0.02, p.legato ? 0.02 : pt.amp.r));
        for (const o of oscs) o.stop(s + pt.amp.r + 0.1);
        if (breath) breath.stop(s + pt.amp.r + 0.1);
      },
      bend: (cents: number) => {
        if (!stopped) for (const [i, o] of oscs.entries()) o.detune.setTargetAtTime((pt.osc[i].detune ?? 0) + cents, ctx.currentTime, 0.02);
      },
      glide: (to: number) => {
        if (stopped) return;
        const f = hz(to);
        for (const [i, o] of oscs.entries()) o.frequency.setTargetAtTime(f * 2 ** (pt.osc[i].octave ?? 0), ctx.currentTime, 0.025);
      },
      muffle: () => {
        if (stopped || !dull) return;
        dull.frequency.setTargetAtTime(500, ctx.currentTime, 0.01);
      },
      dyn: (level: number) => {
        if (!stopped) dyn.gain.setTargetAtTime(Math.max(0.05, level), ctx.currentTime, 0.06);
      },
    };
  }

  /**
   * D179, the swoosh: a note flicked upwards as it is let go flies up (its pitch an octave higher, a
   * filter opening, a breath of air) and comes down bouncing, quicker and quicker, softer and softer,
   * like a ping-pong ball settling, but faster.
   */
  swoosh(midi: number, v: Voicing, level = 1) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const f0 = hz(midi);
    const out = ctx.createGain();
    out.gain.value = 0.22 * level;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) (pan.pan.value = Math.max(-1, Math.min(1, v.pan)), out.connect(pan).connect(this.bus));
    else out.connect(this.bus);
    // The flight: a sawtooth gliding up an octave through an opening filter, and a whoosh of air.
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 2, t + 0.18);
    const fl = ctx.createBiquadFilter();
    fl.type = "lowpass";
    fl.Q.value = 6;
    fl.frequency.setValueAtTime(400, t);
    fl.frequency.exponentialRampToValueAtTime(7000, t + 0.18);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.9, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.connect(fl).connect(og).connect(out);
    o.start(t);
    o.stop(t + 0.26);
    const n = this.noise();
    const nf = ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.Q.value = 3;
    nf.frequency.setValueAtTime(800, t);
    nf.frequency.exponentialRampToValueAtTime(6000, t + 0.2);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.5, t + 0.06);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    n.connect(nf).connect(ng).connect(out);
    n.start(t);
    n.stop(t + 0.26);
    // The bounces: ever shorter gaps, ever softer.
    let at = t + 0.24;
    let gap = 0.11;
    let gain = 0.7;
    for (let k = 0; k < 9; k++) {
      const b = ctx.createOscillator();
      b.type = "triangle";
      b.frequency.value = f0 * 2 * (1 + k * 0.01);
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(gain, at);
      bg.gain.exponentialRampToValueAtTime(0.001, at + 0.03);
      b.connect(bg).connect(out);
      b.start(at);
      b.stop(at + 0.035);
      at += gap;
      gap *= 0.72;
      gain *= 0.7;
    }
  }

  /** The rhythm section (D177): a synthesized kit, quiet under the music. */
  drum(d: Drum, at: number, vel: number) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.connect(this.master);
    const lvl = 0.22 * vel;
    const noise = (type: BiquadFilterType, f: number, q: number, len: number, attack = 0.001) => {
      const n = this.noise();
      const fl = ctx.createBiquadFilter();
      fl.type = type;
      fl.frequency.value = f;
      fl.Q.value = q;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0, at);
      ng.gain.linearRampToValueAtTime(lvl, at + attack);
      ng.gain.exponentialRampToValueAtTime(0.0001, at + len);
      n.connect(fl).connect(ng).connect(g);
      n.start(at, Math.random() * 0.5);
      n.stop(at + len + 0.02);
    };
    const tone = (type: OscillatorType, f0: number, f1: number, len: number, level = lvl) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, at);
      o.frequency.exponentialRampToValueAtTime(f1, at + len * 0.6);
      const og = ctx.createGain();
      og.gain.setValueAtTime(level, at);
      og.gain.exponentialRampToValueAtTime(0.0001, at + len);
      o.connect(og).connect(g);
      o.start(at);
      o.stop(at + len + 0.02);
    };
    switch (d) {
      case "kick":
        return tone("sine", 140, 45, 0.3, lvl * 2.2);
      case "snare":
        noise("bandpass", 1900, 0.8, 0.16);
        return tone("triangle", 220, 160, 0.08, lvl * 0.8);
      case "hat":
        return noise("highpass", 7500, 0.7, 0.05);
      case "ride":
        noise("bandpass", 6000, 1.5, 0.45);
        return tone("square", 820, 800, 0.3, lvl * 0.12);
      case "rim":
        return tone("square", 1700, 1600, 0.03, lvl * 0.7);
      case "brush":
        return noise("lowpass", 3500, 0.5, 0.22, 0.05);
      case "shaker":
        return noise("highpass", 6000, 0.8, 0.07, 0.01);
    }
  }

  /** The rhythm section's hits for one beat (the ensemble's groove), scheduled at `at`, a beat lasting `beatS` seconds. */
  groove(at: number, beatS: number, b: number, bar: number, per: number, compound: boolean) {
    const gr = preset().groove;
    if (!gr) return false;
    for (const h of grooveHits(gr, b, bar, per, compound)) this.drum(h.drum, at + h.at * beatS, h.vel);
    return true;
  }

  /** A metronome tick: a short, soft click, brighter on the bar's first beat. */
  tick(at: number, accent: boolean, gain = 0.1) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = accent ? 2093 : 1568;
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
    o.connect(g).connect(this.master);
    o.start(at);
    o.stop(at + 0.04);
  }
}

/** The voices' timbres and places (D167): the bass a triangle, the top voice the thinnest pulse, the inner ones fuller; spread left (low) to right (high). */
export function voicing(voice: number, count: number, _played = true): Voicing {
  const fromTop = voice;
  const timbre: Timbre = fromTop === count - 1 ? "triangle" : fromTop === 0 ? "pulse12" : fromTop === 1 && count > 3 ? "pulse25" : count > 3 ? "pulse50" : "pulse25";
  const pan = count > 1 ? (0.5 - fromTop / (count - 1)) * 0.9 : 0;
  // D169: the voice played is no louder than the others; it stands out by its colour in the box.
  return { timbre, pan, gain: 1, patch: patchFor(voice, count) };
}

/** A decaying stereo noise, for the room. */
function impulse(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let seed = 1234 + c * 77;
    for (let i = 0; i < len; i++) {
      seed = (seed * 16807) % 2147483647;
      d[i] = ((seed / 2147483647) * 2 - 1) * Math.pow(1 - i / len, 3);
    }
  }
  return b;
}

/** A tenth of a second of silence as a WAV (16-bit mono, 8 kHz), as a blob URL. */
function silentWav(): string {
  const samples = 800;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const str = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true);
  v.setUint32(28, 16000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
