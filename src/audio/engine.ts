/**
 * Audio with two switchable sounds:
 * - "piano": sampled acoustic grand piano (smplr Soundfont, MusyngKite kit, fetched over the network);
 * - "chip": an 8-bit style square-wave synthesizer built from Web Audio oscillators (no download).
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

/** Square-wave voice with a short attack and release, like an old sound chip. */
class ChipSynth implements Instrument {
  private live = new Set<OscillatorNode>();
  private ctx: AudioContext;
  private out: GainNode;
  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.15; // square waves are loud; headroom for two voices
    this.out.connect(destination);
  }
  start(note: string, time: number, duration: number) {
    const freq = 440 * 2 ** ((parsePitch(note).midi - 69) / 12);
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(1, time + 0.01);
    env.gain.setValueAtTime(1, time + Math.max(0.02, duration - 0.06));
    env.gain.linearRampToValueAtTime(0, time + duration);
    osc.connect(env).connect(this.out);
    osc.start(time);
    osc.stop(time + duration + 0.02);
    this.live.add(osc);
    osc.onended = () => this.live.delete(osc);
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
  status: AudioStatus = "idle";
  /** Number of notes started (for tests and diagnostics). */
  notesStarted = 0;
  onStatus: (s: AudioStatus) => void = () => {};

  private setStatus(s: AudioStatus) {
    this.status = s;
    this.onStatus(s);
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
          ? Promise.resolve(new ChipSynth(ctx, master))
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

  /** Sound one vertical sonority briefly (used when a note is placed or a bar is auditioned). */
  async playColumn(col: PlaybackColumn, seconds = 0.45): Promise<void> {
    const inst = await this.instrument();
    if (!inst || !this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    for (const note of [col.cantus, col.counterpoint]) if (note) this.play(inst, note, t, seconds);
  }

  /** Play all columns; `halfNoteBpm` is the alla-breve pulse, one whole note per column. `onColumn(-1)` marks the end. */
  async playAll(cols: PlaybackColumn[], halfNoteBpm: number, onColumn: (k: number) => void): Promise<void> {
    this.stop();
    const inst = await this.instrument();
    if (!inst || !this.ctx) {
      onColumn(-1);
      return;
    }
    const whole = (2 * 60) / halfNoteBpm;
    const t0 = this.ctx.currentTime + 0.1;
    cols.forEach((c, k) => {
      for (const note of [c.cantus, c.counterpoint]) if (note) this.play(inst, note, t0 + k * whole, whole * 0.97);
      this.timers.push(window.setTimeout(() => onColumn(k), (0.1 + k * whole) * 1000));
    });
    this.timers.push(window.setTimeout(() => onColumn(-1), (0.1 + cols.length * whole) * 1000));
  }

  stop(): void {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    this.current?.stop();
  }
}
