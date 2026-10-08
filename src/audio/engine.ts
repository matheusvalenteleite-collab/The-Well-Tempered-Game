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

interface Instrument {
  start(note: string, time: number, duration: number): void;
  stop(): void;
}

export type Waveform = "sine" | "triangle" | "square" | "sawtooth";
export const WAVEFORMS: Waveform[] = ["sine", "triangle", "square", "sawtooth"];

/** Synth settings (the "rack"). Times in seconds, sustain 0..1, tone = low-pass cutoff in Hz,
 *  detune = spread of two oscillators in cents, vibrato = depth in cents. */
export interface SynthSettings {
  waveform: Waveform;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  tone: number;
  detune: number;
  vibrato: number;
}

export const DEFAULT_SYNTH: SynthSettings = { waveform: "triangle", attack: 0.02, decay: 0.15, sustain: 0.6, release: 0.25, tone: 2500, detune: 0, vibrato: 0 };

/** Synthesized approximations, named by the sound they evoke (no samples involved). */
export const SYNTH_PRESETS: { id: string; settings: SynthSettings }[] = [
  { id: "soft", settings: DEFAULT_SYNTH },
  { id: "piano", settings: { waveform: "triangle", attack: 0.005, decay: 0.9, sustain: 0.12, release: 0.45, tone: 3200, detune: 5, vibrato: 0 } },
  { id: "harpsichord", settings: { waveform: "sawtooth", attack: 0.003, decay: 0.55, sustain: 0.04, release: 0.25, tone: 5200, detune: 7, vibrato: 0 } },
  { id: "organ", settings: { waveform: "square", attack: 0.015, decay: 0.05, sustain: 1, release: 0.08, tone: 1800, detune: 3, vibrato: 0 } },
  { id: "orchestra", settings: { waveform: "sawtooth", attack: 0.25, decay: 0.3, sustain: 0.85, release: 0.6, tone: 1600, detune: 14, vibrato: 12 } },
  { id: "flute", settings: { waveform: "sine", attack: 0.08, decay: 0.1, sustain: 0.9, release: 0.2, tone: 3000, detune: 0, vibrato: 10 } },
  { id: "bleep", settings: { waveform: "square", attack: 0.003, decay: 0.09, sustain: 0, release: 0.05, tone: 4500, detune: 0, vibrato: 0 } },
  { id: "peng", settings: { waveform: "sawtooth", attack: 0.003, decay: 0.28, sustain: 0, release: 0.12, tone: 2800, detune: 9, vibrato: 0 } },
];

/** Oscillator synthesizer: two detunable oscillators, vibrato, ADSR envelope, low-pass filter. */
class Synth implements Instrument {
  private live = new Set<OscillatorNode>();
  private ctx: AudioContext;
  private out: GainNode;
  settings: SynthSettings;
  constructor(ctx: AudioContext, destination: AudioNode, settings: SynthSettings) {
    this.ctx = ctx;
    this.settings = settings;
    this.out = ctx.createGain();
    this.out.gain.value = 0.18; // headroom for two voices
    this.out.connect(destination);
  }
  start(note: string, time: number, duration: number) {
    const { waveform, attack, decay, sustain, release, tone, detune, vibrato } = this.settings;
    const freq = 440 * 2 ** ((parsePitch(note).midi - 69) / 12);
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();
    filter.type = "lowpass";
    filter.frequency.value = tone;
    filter.connect(env).connect(this.out);
    const a = Math.max(0.003, attack);
    const off = time + Math.max(duration, a);
    const end = off + release + 0.1;
    // ADSR: attack to 1, decay to the sustain level, hold until the note ends, then release.
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(1, time + a);
    env.gain.setTargetAtTime(sustain, time + a, Math.max(0.001, decay) / 3);
    env.gain.cancelScheduledValues(off);
    env.gain.setTargetAtTime(0, off, Math.max(0.005, release) / 3);
    let lfoGain: GainNode | null = null;
    if (vibrato > 0) {
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 5.5;
      lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(0, time);
      lfoGain.gain.linearRampToValueAtTime(vibrato, time + 0.3); // vibrato fades in
      lfo.connect(lfoGain);
      lfo.start(time);
      lfo.stop(end);
    }
    const spread = detune > 0 ? [-detune / 2, detune / 2] : [0];
    for (const cents of spread) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      g.gain.value = 1 / spread.length;
      osc.type = waveform;
      osc.frequency.value = freq;
      osc.detune.value = cents;
      if (lfoGain) lfoGain.connect(osc.detune);
      osc.connect(g).connect(filter);
      osc.start(time);
      osc.stop(end);
      this.live.add(osc);
      osc.onended = () => this.live.delete(osc);
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
  private instruments = new Map<SoundId, Promise<Instrument | null>>();
  private current: Instrument | null = null;
  private timers: number[] = [];
  sound: SoundId = "piano";
  synth: SynthSettings = { ...DEFAULT_SYNTH };
  status: AudioStatus = "idle";
  /** Number of notes started (for tests and diagnostics). */
  notesStarted = 0;
  onStatus: (s: AudioStatus) => void = () => {};

  private setStatus(s: AudioStatus) {
    this.status = s;
    this.onStatus(s);
  }

  /** Change synth settings; applies to notes started from now on. */
  setSynth(settings: SynthSettings) {
    Object.assign(this.synth, settings);
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
  private async instrument(): Promise<Instrument | null> {
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
          ? Promise.resolve(new Synth(ctx, master, this.synth))
          : new Soundfont(ctx, { instrument: "acoustic_grand_piano", kit: "MusyngKite", destination: master }).load.then(
              (sf) => new SampledPiano(sf),
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

  private play(inst: Instrument, note: string, time: number, duration: number) {
    inst.start(note, time, duration);
    this.notesStarted++;
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
    for (const note of [col.cantus, col.counterpoint]) if (note) this.play(inst, note, t, seconds);
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
          for (const note of [c.cantus, c.counterpoint]) if (note) this.play(inst, note, t0 + k * barSeconds, barSeconds * 0.95);
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
        for (const note of [cols[k].cantus, cols[k].counterpoint]) if (note) this.play(inst, note, next, whole * 0.97);
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
    this.current?.stop();
  }
}
