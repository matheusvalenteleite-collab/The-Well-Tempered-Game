/**
 * Audio engine: the two voices (cantus firmus and counterpoint, each with its own synth and
 * effects), the drum machine, temperament, the playback scheduler and the feedback cues.
 *
 * Sound sources: "chip" = the built-in synthesizer (no downloads); "piano" = sampled acoustic grand
 * (smplr Soundfont, fetched over the network; hidden in the UI for now, decision D15).
 * The AudioContext is created on the first user gesture (browser autoplay policy).
 */
import { Soundfont } from "smplr";
import { DrumMachine } from "./drums.ts";
import { DEFAULT_SYNTH, type SynthSettings, type VoiceId, type VoiceSynths } from "./synth-settings.ts";
import type { TemperamentId } from "./temperament.ts";
import type { PlayEvent } from "../counterpoint/layout.ts";
import { Synth, type Instrument } from "./voice.ts";

export * from "./synth-settings.ts";

export type SoundId = "piano" | "chip";
export type AudioStatus = "idle" | "loading" | "ready" | "failed";

export interface PlaybackColumn {
  cantus: string;
  counterpoint: string | null;
}

export type { PlayEvent };

type Voices = Record<VoiceId, Instrument>;

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
  private drumMachine: DrumMachine | null = null;
  private timers: number[] = [];
  sound: SoundId = "piano";
  /** Independent settings for the cantus firmus and the counterpoint. */
  synth: VoiceSynths = { cantus: { ...DEFAULT_SYNTH }, counterpoint: { ...DEFAULT_SYNTH } };
  temperament: TemperamentId = "equal";
  /** Drum track during "play all"; read live, so toggling takes effect from the next bar. */
  drums = false;
  /** Alla-breve pulse (half notes per minute); read live by the scheduler. */
  tempo = 60;
  status: AudioStatus = "idle";
  /** Number of notes started (for tests and diagnostics). */
  notesStarted = 0;
  onStatus: (s: AudioStatus) => void = () => {};

  private setStatus(s: AudioStatus) {
    this.status = s;
    this.onStatus(s);
  }

  /** Change synth settings. Sound parameters apply to the next notes; effects change at once. */
  setSynth(settings: VoiceSynths) {
    Object.assign(this.synth.cantus, settings.cantus);
    Object.assign(this.synth.counterpoint, settings.counterpoint);
    for (const v of [this.current?.cantus, this.current?.counterpoint]) if (v instanceof Synth) v.update();
  }

  /** Master volume, 0..1. */
  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
  }

  setSound(sound: SoundId) {
    this.stop();
    this.sound = sound;
    if (this.ctx) void this.instrument();
  }

  /** Resolve the selected instruments; must first be called from a user gesture. */
  private async instrument(): Promise<Voices | null> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.drumMachine = new DrumMachine(this.ctx, this.master);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    const ctx = this.ctx;
    const master = this.master!;
    let p = this.instruments.get(this.sound);
    if (!p) {
      const tuning = () => this.temperament;
      p =
        this.sound === "chip"
          ? Promise.resolve({ cantus: new Synth(ctx, master, this.synth.cantus, tuning), counterpoint: new Synth(ctx, master, this.synth.counterpoint, tuning) })
          : new Soundfont(ctx, { instrument: "acoustic_grand_piano", kit: "MusyngKite", destination: master }).load.then(
              (sf) => {
                const piano = new SampledPiano(sf);
                return { cantus: piano, counterpoint: piano };
              },
              () => null,
            );
      this.instruments.set(this.sound, p);
      void p.then((i) => i === null && this.instruments.delete("piano")); // retry a failed load later
    }
    this.setStatus("loading");
    const inst = await p;
    this.setStatus(inst ? "ready" : "failed");
    this.current = inst;
    return inst;
  }

  private both(voices: Voices, col: PlaybackColumn, time: number, duration: number) {
    voices.cantus.start(col.cantus, time, duration);
    this.notesStarted++;
    if (col.counterpoint) {
      voices.counterpoint.start(col.counterpoint, time, duration);
      this.notesStarted++;
    }
  }

  /** Length of one bar (a whole note) at the current tempo, in seconds. */
  get barSeconds(): number {
    return 120 / this.tempo;
  }

  /** Sound one vertical sonority for a full bar (a note placed, or a bar auditioned). */
  async playColumn(col: PlaybackColumn, seconds = this.barSeconds): Promise<void> {
    const inst = await this.instrument();
    if (!inst || !this.ctx) return;
    this.both(inst, col, this.ctx.currentTime + 0.01, seconds);
  }

  /** Start the notes of one event; a cantus note always lasts the whole bar. */
  private soundEvent(voices: Voices, e: PlayEvent, time: number, whole: number) {
    if (e.cantus) {
      voices.cantus.start(e.cantus, time, whole * 0.97);
      this.notesStarted++;
    }
    if (e.counterpoint) {
      voices.counterpoint.start(e.counterpoint, time, e.length * whole * 0.95);
      this.notesStarted++;
    }
  }

  /** Play a short excerpt, then resolve. `wholeSeconds` defaults to half the bar length at the current tempo. */
  playSequence(events: PlayEvent[], wholeSeconds = this.barSeconds / 2): Promise<void> {
    return new Promise((resolve) => {
      void (async () => {
        this.stop();
        const inst = await this.instrument();
        const ctx = this.ctx;
        if (!inst || !ctx || events.length === 0) return resolve();
        const t0 = ctx.currentTime + 0.05 - events[0].at * wholeSeconds;
        for (const e of events) this.soundEvent(inst, e, t0 + e.at * wholeSeconds, wholeSeconds);
        const end = Math.max(...events.map((e) => e.at + e.length)) - events[0].at;
        this.timers.push(window.setTimeout(resolve, (0.05 + end * wholeSeconds) * 1000));
      })();
    });
  }

  /** Short feedback cues, independent of the synth settings. */
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

  /**
   * Play the whole exercise, with the drum track if it is on. Events are scheduled just ahead of
   * time, so tempo and drum changes take effect from the next note.
   * `onSlot(k)` fires as slot k sounds; -1 marks the end.
   */
  async playAll(events: PlayEvent[], onSlot: (k: number) => void): Promise<void> {
    this.stop();
    const inst = await this.instrument();
    const ctx = this.ctx;
    if (!inst || !ctx || events.length === 0) {
      onSlot(-1);
      return;
    }
    const bars = Math.ceil(Math.max(...events.map((e) => e.at + e.length)));
    let k = 0;
    let next = ctx.currentTime + 0.1;
    const LOOKAHEAD = 0.15;
    const tick = () => {
      while (k < events.length && next < ctx.currentTime + LOOKAHEAD) {
        const whole = this.barSeconds;
        const e = events[k];
        this.soundEvent(inst, e, next, whole);
        if (this.drums && e.cantus) this.drumMachine?.scheduleBar(next, whole, Math.floor(e.at), bars);
        const slot = e.slot;
        this.timers.push(window.setTimeout(() => onSlot(slot), Math.max(0, (next - ctx.currentTime) * 1000)));
        next += ((events[k + 1]?.at ?? e.at + e.length) - e.at) * whole;
        k++;
      }
      if (k >= events.length) {
        this.timers.push(window.setTimeout(() => onSlot(-1), Math.max(0, (next - ctx.currentTime) * 1000)));
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
    this.drumMachine?.stop();
  }
}

/** Render one note offline and return its RMS and peak level (diagnostics and tests). */
export async function renderLevel(settings: SynthSettings, note = "A4", seconds = 1): Promise<{ rms: number; peak: number }> {
  const sr = 22050;
  const ctx = new OfflineAudioContext(2, Math.ceil((seconds + settings.release + 2) * sr), sr);
  const synth = new Synth(ctx, ctx.destination, settings);
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
