/**
 * The 8-bit sound: pulse- and triangle-wave notes and a ticking metronome on Web Audio, scheduled on
 * the audio clock so the beat stays steady whatever the screen does.
 * D167, a little warmer: each note has an attack, a short fall to its sustain and a release; long notes
 * take a gentle vibrato after a moment; the player can bend a held note (engine.ts); the voices stand
 * apart left to right; a soft filter takes the edge off and a small room (a generated reverb) carries
 * them; the metronome is a quiet tick.
 */
export type Timbre = "pulse12" | "pulse25" | "pulse50" | "triangle";

export interface Voicing {
  timbre: Timbre;
  /** -1 (left) to 1 (right). */
  pan: number;
  /** 1: the voice the player plays; less for the others. */
  gain: number;
}

export interface Sounding {
  stop: (at?: number) => void;
  /** Bend the note by some cents (the thumb's sideways wobble). */
  bend: (cents: number) => void;
}

export class Chip {
  readonly ctx: AudioContext;
  private master: GainNode;
  private bus: AudioNode;
  private waves = new Map<string, PeriodicWave>();
  private keepAlive: HTMLAudioElement | null = null;

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

  /** A pulse of the given duty (as on the NES), built once. */
  private wave(timbre: Timbre): PeriodicWave | "triangle" {
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
    return this.ctx.currentTime - (this.ctx.outputLatency || this.ctx.baseLatency || 0);
  }

  /** A note from `at` for `dur` seconds; stop() cuts it short (the thumb let go). */
  note(midi: number, at: number, dur: number, v: Voicing): Sounding {
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    const end = Math.max(t + 0.04, at + dur - 0.01);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const w = this.wave(v.timbre);
    if (w === "triangle") o.type = "triangle";
    else o.setPeriodicWave(w);
    o.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    // The triangle is quieter than the pulses at the same amplitude.
    const peak = (v.timbre === "triangle" ? 0.36 : v.timbre === "pulse50" ? 0.15 : 0.19) * v.gain;
    const sustain = peak * 0.72;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.006);
    g.gain.setTargetAtTime(sustain, t + 0.01, 0.06);
    g.gain.setValueAtTime(sustain, Math.max(t + 0.02, end - 0.04));
    g.gain.linearRampToValueAtTime(0, end);
    // A gentle vibrato on a long note, after a moment.
    if (end - t > 0.45) {
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
    if (pan) {
      pan.pan.value = Math.max(-1, Math.min(1, v.pan));
      o.connect(g).connect(pan).connect(this.bus);
    } else o.connect(g).connect(this.bus);
    o.start(t);
    o.stop(end + 0.05);
    let stopped = false;
    return {
      stop: (when = ctx.currentTime) => {
        if (stopped || when >= end) return;
        stopped = true;
        const s = Math.max(when, t + 0.02);
        g.gain.cancelScheduledValues(s);
        g.gain.setValueAtTime(sustain, s);
        g.gain.linearRampToValueAtTime(0, s + 0.04);
        o.stop(s + 0.06);
      },
      bend: (cents: number) => {
        if (!stopped) o.detune.setTargetAtTime(cents, ctx.currentTime, 0.02);
      },
    };
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
export function voicing(voice: number, count: number, played: boolean): Voicing {
  const fromTop = voice;
  const timbre: Timbre = fromTop === count - 1 ? "triangle" : fromTop === 0 ? "pulse12" : fromTop === 1 && count > 3 ? "pulse25" : count > 3 ? "pulse50" : "pulse25";
  const pan = count > 1 ? (0.5 - fromTop / (count - 1)) * 0.9 : 0;
  return { timbre, pan, gain: played ? 1 : 0.55 };
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
