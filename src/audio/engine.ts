/**
 * Audio engine: the two voices (cantus firmus and counterpoint, each with its own synth and
 * effects), the drum machine, temperament, the playback scheduler and the feedback cues.
 *
 * Sound sources: "chip" = the built-in synthesizer (no downloads); "piano" = sampled acoustic grand
 * (smplr Soundfont, fetched over the network; hidden in the UI for now, decision D15).
 * The AudioContext is created on the first user gesture (browser autoplay policy).
 */
import { Soundfont } from "smplr";
import { DEFAULT_DRUMS, DrumMachine, type DrumSettings } from "./drums.ts";
import type { SynthSettings } from "./synth-settings.ts";
import { audibleGain, CHANNELS, DEFAULT_SOUND, shiftOctave, STRIPS, type Channel, type SoundState, type Strip } from "./sound.ts";
import type { TemperamentId } from "./temperament.ts";
import type { PlayEvent } from "../counterpoint/layout.ts";
import type { VersionId } from "../game/versions.ts";
import { Synth, type Instrument } from "./voice.ts";
import { humanisePlan, type EventShape } from "./humanise.ts";

export * from "./synth-settings.ts";

export type SoundId = "piano" | "chip";
export type AudioStatus = "idle" | "loading" | "ready" | "failed";

export interface PlaybackColumn {
  cantus: string;
  counterpoint: string | null;
}

export type { PlayEvent };

type Voices = Record<Channel, Instrument>;

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
  /** Synth settings of the three voices (stable objects: the synths read them at each note). */
  private synth: Record<Channel, SynthSettings> = structuredClone(DEFAULT_SOUND.synth);
  private mix: SoundState = structuredClone(DEFAULT_SOUND);
  private channels = new Map<Strip, { gain: GainNode; pan: StereoPannerNode }>();
  temperament: TemperamentId = "equal";
  /** Drum track during "play all"; read live, so toggling takes effect from the next bar. */
  drums = false;
  private drumSettings: DrumSettings = { ...DEFAULT_DRUMS };
  /** The final of the exercise's mode (tunes the timpani). */
  private final = "D";
  /** Repeat "play all" indefinitely; read live by the scheduler. */
  loop = true;
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

  /**
   * Apply the mixing desk: synth settings (sound parameters apply to the next notes, effects at
   * once), channel volume and balance after mute/solo, and Fux's octave.
   */
  setSoundState(state: SoundState) {
    for (const c of CHANNELS) Object.assign(this.synth[c], state.synth[c]);
    for (const v of [this.current?.cantus, this.current?.counterpoint, this.current?.fux, ...this.versionVoices.values()]) if (v instanceof Synth) v.update();
    this.mix = structuredClone(state);
    this.applyMix();
  }

  private applyMix() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const x of STRIPS) {
      const ch = this.channels.get(x);
      if (!ch) continue;
      ch.gain.gain.setTargetAtTime(audibleGain(this.mix, x), t, 0.02);
      ch.pan.pan.setTargetAtTime(this.mix.mix[x].pan, t, 0.02);
    }
  }

  /** The input node of a channel strip (gain, then balance, then the master). */
  private channel(x: Strip): AudioNode {
    let ch = this.channels.get(x);
    if (!ch) {
      const gain = this.ctx!.createGain();
      const pan = this.ctx!.createStereoPanner();
      gain.connect(pan).connect(this.master!);
      ch = { gain, pan };
      this.channels.set(x, ch);
      this.applyMix();
    }
    return ch.gain;
  }

  /** Pattern, loop length and level of the drum track; read live by the scheduler. */
  setDrums(settings: DrumSettings, final = this.final) {
    this.drumSettings = { ...settings };
    this.final = final;
    if (this.drumMachine) {
      this.drumMachine.settings = this.drumSettings;
      this.drumMachine.final = final;
    }
  }

  /** Audition one bar of the drum pattern on its own. */
  async previewDrums(): Promise<void> {
    await this.instrument();
    if (!this.ctx || !this.drumMachine) return;
    this.drumMachine.stop();
    this.drumMachine.scheduleBar(this.ctx.currentTime + 0.05, this.barSeconds, 1, 8);
  }

  /** Master volume, 0..1. */
  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
  }

  setSource(sound: SoundId) {
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
      // A safety limiter before the speakers: voices, drums and continuo together never clip.
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.knee.value = 2;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.2;
      this.master.connect(limiter).connect(this.ctx.destination);
      this.drumMachine = new DrumMachine(this.ctx, this.channel("drums"));
      this.setDrums(this.drumSettings, this.final);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    const ctx = this.ctx;
    const master = this.master!;
    let p = this.instruments.get(this.sound);
    if (!p) {
      const tuning = () => this.temperament;
      p =
        this.sound === "chip"
          ? Promise.resolve({
              cantus: new Synth(ctx, this.channel("cantus"), this.synth.cantus, tuning),
              counterpoint: new Synth(ctx, this.channel("counterpoint"), this.synth.counterpoint, tuning),
              fux: new Synth(ctx, this.channel("fux"), this.synth.fux, tuning),
            })
          : new Soundfont(ctx, { instrument: "acoustic_grand_piano", kit: "MusyngKite", destination: master }).load.then(
              (sf) => {
                const piano = new SampledPiano(sf);
                return { cantus: piano, counterpoint: piano, fux: piano };
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

  /** Humanised playback (D53): read when "play all" starts. */
  humanise = false;
  /** The ritardando factor of the event being scheduled (1 = none); the continuo's clock follows it. */
  stretch = 1;

  /** Start the notes of one event; a cantus note always lasts the whole bar. `shape` humanises it. */
  private soundEvent(voices: Voices, e: PlayEvent, time: number, whole: number, shape?: EventShape) {
    const v = (id: string) => shape?.notes[id]?.velocity;
    const len = (id: string) => shape?.notes[id]?.length ?? 1;
    if (e.cantus) {
      voices.cantus.start(e.cantus, time, whole * 0.97 * len("cantus"), v("cantus"));
      this.notesStarted++;
    }
    if (e.counterpoint) {
      voices.counterpoint.start(e.counterpoint, time, e.length * whole * 0.95 * len("counterpoint"), v("counterpoint"));
      this.notesStarted++;
    }
    for (const [id, pitch] of Object.entries(e.versions ?? {})) {
      if (!pitch) continue;
      this.versionVoice(id as VersionId)?.start(pitch, time, e.length * whole * 0.95 * len(id), v(id));
      this.notesStarted++;
    }
    if (e.fux) {
      // Fux's line may sound in another octave (listening only; the score is unchanged).
      voices.fux.start(shiftOctave(e.fux, this.mix.fuxOctave), time, e.length * whole * 0.95 * len("fux"), v("fux"));
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

  /**
   * Play the whole exercise, with the drum track if it is on. Events are scheduled just ahead of
   * time, so tempo and drum changes take effect from the next note.
   * `onSlot(k)` fires as slot k sounds; -1 marks the end.
   */
  /** Things to stop with the playback (the continuo); `stop()` stops and forgets them. */
  private attached = new Set<{ stop(): void }>();
  attach(x: { stop(): void }) {
    this.attached.add(x);
  }

  /** The context and master input, once the first gesture has created them (for the continuo). */
  get graph(): { ctx: AudioContext; master: GainNode } | null {
    return this.ctx && this.master ? { ctx: this.ctx, master: this.master } : null;
  }

  /** The continuo's input: its own mixer strip (level, balance, mute, solo) before the master. */
  continuoInput(): AudioNode | null {
    if (!this.ctx || !this.master) return null;
    return this.channel("continuo");
  }

  /**
   * `onCycle(t)` is called with the AudioContext time of beat 0 of every pass (every loop),
   * when that pass is scheduled, so that an accompaniment can start sample-aligned.
   */
  async playAll(events: PlayEvent[], onSlot: (k: number) => void, onCycle?: (startTime: number) => void): Promise<void> {
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
    let announced = false;
    const shapes = this.humanise ? humanisePlan(events) : null;
    const tick = () => {
      if (k === 0 && !announced) {
        announced = true;
        onCycle?.(next);
      }
      while (k < events.length && next < ctx.currentTime + LOOKAHEAD) {
        const whole = this.barSeconds;
        const e = events[k];
        const shape = shapes?.[k];
        this.stretch = shape?.stretch ?? 1;
        this.soundEvent(inst, e, next + (shape?.delay ?? 0), whole, shape);
        if (this.drums && e.cantus) this.drumMachine?.scheduleBar(next, whole, Math.floor(e.at), bars);
        const slot = e.slot;
        this.timers.push(window.setTimeout(() => onSlot(slot), Math.max(0, (next - ctx.currentTime) * 1000)));
        next += ((events[k + 1]?.at ?? e.at + e.length) - e.at) * whole * (shape?.stretch ?? 1);
        k++;
      }
      if (k >= events.length) {
        if (this.loop) {
          // Loop: start again after half a bar's breath (read live, so the toggle works mid-play).
          k = 0;
          announced = false;
          next += 0.5 * this.barSeconds;
          this.timers = this.timers.slice(-64);
        } else {
          this.timers.push(window.setTimeout(() => onSlot(-1), Math.max(0, (next - ctx.currentTime) * 1000)));
          return;
        }
      }
      this.timers.push(window.setTimeout(tick, 40));
    };
    tick();
  }

  /** A voice per derived version of the player's line: the Contrapunctus sound, on its own strip. */
  private versionVoices = new Map<VersionId, Synth>();
  private versionVoice(id: VersionId): Synth | null {
    if (!this.ctx) return null;
    let v = this.versionVoices.get(id);
    if (!v) {
      v = new Synth(this.ctx, this.channel(id), this.synth.counterpoint, () => this.temperament);
      this.versionVoices.set(id, v);
    }
    return v;
  }

  stop(): void {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    for (const v of this.versionVoices.values()) v.stop();
    this.stretch = 1;
    this.current?.cantus.stop();
    this.current?.counterpoint.stop();
    this.current?.fux.stop();
    this.drumMachine?.stop();
    for (const x of this.attached) x.stop();
    this.attached.clear();
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
