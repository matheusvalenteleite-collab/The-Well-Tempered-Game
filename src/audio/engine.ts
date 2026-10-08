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
import { audibleGain, CHANNELS, DEFAULT_SOUND, shiftOctave, STRIPS, versionSettings, type Channel, type SoundState, type Strip } from "./sound.ts";
import type { TemperamentId } from "./temperament.ts";
import type { PlayEvent } from "../counterpoint/layout.ts";
import { VERSION_IDS, type VersionId } from "../game/versions.ts";
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

/** Mix mode (D77): the events and accompaniment of pass i, set up on the engine when it is called. */
export interface PassPlan {
  prepare(pass: number): { events: PlayEvent[]; onCycle?: (startTime: number, fromBeat: number) => void };
}

/** The capture processor (D74): batches the input and posts it with the frame it started at. */
const RECORDER_WORKLET = `
class WtgRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.l = []; this.r = []; this.n = 0; this.frame = -1;
    this.port.onmessage = () => { this.send(); this.port.postMessage("flushed"); };
  }
  send() {
    if (!this.n) return;
    const cat = (parts) => { const o = new Float32Array(this.n); let k = 0; for (const p of parts) { o.set(p, k); k += p.length; } return o; };
    this.port.postMessage({ frame: this.frame, l: cat(this.l), r: cat(this.r) });
    this.l = []; this.r = []; this.n = 0; this.frame = -1;
  }
  process(inputs) {
    const i = inputs[0];
    const n = i && i[0] ? i[0].length : 128;
    if (this.frame < 0) this.frame = currentFrame;
    const l = i && i[0] ? i[0].slice() : new Float32Array(n);
    const r = i && i[1] ? i[1].slice() : l;
    this.l.push(l); this.r.push(r); this.n += n;
    if (this.n >= 16384) this.send();
    return true;
  }
}
registerProcessor("wtg-recorder", WtgRecorder);
`;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /** The last node before the speakers: what an export captures (D74). */
  private limiter: DynamicsCompressorNode | null = null;
  /** AudioContext times at which the passes of the current "play all" start, and where it ends. */
  cycleStarts: number[] = [];
  playEnd: number | null = null;
  /** Pass starts since the capture began (D75): kept across live restarts, which reset cycleStarts. */
  captureCycles: number[] = [];
  private volume = 0.7;
  private instruments = new Map<SoundId, Promise<Voices | null>>();
  private current: Voices | null = null;
  private drumMachine: DrumMachine | null = null;
  private timers: number[] = [];
  sound: SoundId = "piano";
  /** Synth settings of the three voices (stable objects: the synths read them at each note). */
  private synth: Record<Channel, SynthSettings> = structuredClone(DEFAULT_SOUND.synth);
  private mix: SoundState = structuredClone(DEFAULT_SOUND);
  /** Each version's synth settings (stable objects, D69): a copy of the Contrapunctus's or its own. */
  private versionSynth: Record<VersionId, SynthSettings> = structuredClone(DEFAULT_SOUND.versionSynth);
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
    for (const id of VERSION_IDS) Object.assign(this.versionSynth[id], versionSettings(state, id));
    for (const v of [this.current?.cantus, this.current?.counterpoint, this.current?.fux, ...this.versionVoices.values()]) if (v instanceof Synth) v.update();
    this.mix = structuredClone(state);
    this.applyMix();
  }

  /** Channel gates (D78): a line switched off is silenced by its channel, never by a restart. */
  private gates: Partial<Record<Strip, boolean>> = {};
  setGates(g: Partial<Record<Strip, boolean>>) {
    this.gates = { ...g };
    this.applyMix();
  }

  private applyMix() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const x of STRIPS) {
      const ch = this.channels.get(x);
      if (!ch) continue;
      // A short glide (about 20 ms) so that a switch never clicks.
      ch.gain.gain.setTargetAtTime(this.gates[x] === false ? 0 : audibleGain(this.mix, x), t, 0.02);
      ch.pan.pan.setTargetAtTime(this.mix.mix[x].pan, t, 0.02);
    }
  }

  /** The input node of a channel strip (gain, then balance, then the master). */
  private channel(x: Strip): AudioNode {
    let ch = this.channels.get(x);
    if (!ch) {
      const gain = this.ctx!.createGain();
      const pan = this.ctx!.createStereoPanner();
      gain.gain.value = this.gates[x] === false ? 0 : audibleGain(this.mix, x); // no blip on creation
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
      this.limiter = limiter;
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
    voices.cantus.start(shiftOctave(col.cantus, this.mix.cantusOctave ?? 0), time, duration);
    this.notesStarted++;
    if (col.counterpoint) {
      voices.counterpoint.start(shiftOctave(col.counterpoint, this.mix.counterpointOctave ?? 0), time, duration);
      this.notesStarted++;
    }
  }

  /** Length of one bar (a whole note) at the current tempo, in seconds. */
  /** The audio clock (seconds), or 0 before the first gesture. */
  get now(): number {
    return this.ctx?.currentTime ?? 0;
  }

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
      voices.cantus.start(shiftOctave(e.cantus, this.mix.cantusOctave ?? 0), time, whole * 0.97 * len("cantus"), v("cantus"));
      this.notesStarted++;
    }
    if (e.counterpoint) {
      voices.counterpoint.start(shiftOctave(e.counterpoint, this.mix.counterpointOctave ?? 0), time, (e.lengths?.counterpoint ?? e.length) * whole * 0.95 * len("counterpoint"), v("counterpoint"));
      this.notesStarted++;
    }
    for (const [id, pitch] of Object.entries(e.versions ?? {})) {
      if (!pitch) continue;
      // Each version may sound in another octave too (D66).
      this.versionVoice(id as VersionId)?.start(shiftOctave(pitch, this.mix.versionOctave?.[id as VersionId] ?? 0), time, (e.lengths?.[id] ?? e.length) * whole * 0.95 * len(id), v(id));
      this.notesStarted++;
    }
    if (e.fux) {
      // Fux's line may sound in another octave (listening only; the score is unchanged).
      voices.fux.start(shiftOctave(e.fux, this.mix.fuxOctave), time, (e.lengths?.fux ?? e.length) * whole * 0.95 * len("fux"), v("fux"));
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
   * `from`: index of the event to start at (a live restart mid-piece); later passes start at 0.
   * `onCycle(t, fromBeat)` is called with the AudioContext time of the first event of every pass
   * and the half-note beat it stands for (0 on full passes),
   * when that pass is scheduled, so that an accompaniment can start sample-aligned.
   */
  async playAll(events: PlayEvent[], onSlot: (k: number) => void, onCycle?: (startTime: number, fromBeat: number) => void, from = 0, passes?: PassPlan): Promise<void> {
    this.stop();
    const inst = await this.instrument();
    const ctx = this.ctx;
    // Mix mode (D77): each pass brings its own events and accompaniment, and sets the engine up.
    let pass = 0;
    if (passes) ({ events, onCycle } = passes.prepare(0));
    if (!inst || !ctx || events.length === 0) {
      onSlot(-1);
      return;
    }
    let bars = Math.ceil(Math.max(...events.map((e) => e.at + e.length)));
    this.cycleStarts = [];
    this.playEnd = null;
    let k = Math.max(0, Math.min(events.length - 1, from));
    let next = ctx.currentTime + 0.1;
    const LOOKAHEAD = 0.15;
    let announced = false;
    let shapes = this.humanise ? humanisePlan(events) : null;
    const tick = () => {
      if (k === 0 && !announced) {
        announced = true;
        this.cycleStarts.push(next);
        if (this.capture) this.captureCycles.push(next);
        onCycle?.(next, k === 0 ? 0 : (events[k].at - events[0].at) * 2);
      }
      while (k < events.length && next < ctx.currentTime + LOOKAHEAD) {
        const whole = this.barSeconds;
        const e = events[k];
        const shape = shapes?.[k];
        this.stretch = shape?.stretch ?? 1;
        this.soundEvent(inst, e, next + (shape?.delay ?? 0), whole, shape);
        if (this.drums && e.cantus) this.drumMachine?.scheduleBar(next, whole, Math.floor(e.at), bars, this.loop);
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
          // The drums do not stop: the roll fills the breath and lands on bar 1 (D72).
          if (this.drums) this.drumMachine?.scheduleBreath(next, this.barSeconds, 0.5);
          next += 0.5 * this.barSeconds;
          this.timers = this.timers.slice(-64);
          if (passes) {
            pass++;
            ({ events, onCycle } = passes.prepare(pass));
            bars = Math.ceil(Math.max(...events.map((e) => e.at + e.length)));
            shapes = this.humanise ? humanisePlan(events) : null;
          }
        } else {
          this.playEnd = next;
          this.timers.push(window.setTimeout(() => onSlot(-1), Math.max(0, (next - ctx.currentTime) * 1000)));
          return;
        }
      }
      this.timers.push(window.setTimeout(tick, 40));
    };
    tick();
  }

  // ---- Export (D74): capture the output while it plays.

  private capture: { node: AudioNode; sink: GainNode; left: Float32Array[]; right: Float32Array[]; firstFrame: number | null; flush(): Promise<void> } | null = null;
  private workletReady: Promise<boolean> | null = null;

  /** Start capturing everything that reaches the speakers (needs a user gesture, like playing). */
  async startCapture(): Promise<void> {
    await this.instrument();
    const ctx = this.ctx;
    if (!ctx || !this.limiter) throw new Error("audio is not available");
    this.capture?.node.disconnect();
    this.captureCycles = [];
    const left: Float32Array[] = [];
    const right: Float32Array[] = [];
    const sink = ctx.createGain();
    sink.gain.value = 0;
    sink.connect(ctx.destination);
    this.workletReady ??= (async () => {
      try {
        const url = URL.createObjectURL(new Blob([RECORDER_WORKLET], { type: "application/javascript" }));
        await ctx.audioWorklet.addModule(url);
        return true;
      } catch {
        return false; // e.g. a page that forbids blob: modules: fall back on a script processor
      }
    })();
    const state = { firstFrame: null as number | null };
    let node: AudioNode;
    let flush: () => Promise<void>;
    if (await this.workletReady) {
      const w = new AudioWorkletNode(ctx, "wtg-recorder", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: "explicit" });
      let flushed: () => void = () => {};
      w.port.onmessage = (e) => {
        if (e.data === "flushed") return flushed();
        const { frame, l, r } = e.data as { frame: number; l: Float32Array; r: Float32Array };
        state.firstFrame ??= frame;
        left.push(l);
        right.push(r);
      };
      flush = () => new Promise<void>((resolve) => {
        flushed = resolve;
        w.port.postMessage("flush");
      });
      node = w;
    } else {
      const sp = ctx.createScriptProcessor(4096, 2, 2);
      sp.onaudioprocess = (e) => {
        state.firstFrame ??= Math.round(e.playbackTime * ctx.sampleRate);
        left.push(e.inputBuffer.getChannelData(0).slice());
        right.push(e.inputBuffer.getChannelData(1).slice());
      };
      flush = async () => {};
      node = sp;
    }
    this.limiter.connect(node);
    node.connect(sink);
    this.capture = { node, sink, left, right, get firstFrame() { return state.firstFrame; }, flush };
  }

  /**
   * Stop capturing and return the audio between two AudioContext times (or all of it).
   * The samples are stereo, at the context's rate.
   */
  async stopCapture(from?: number, to?: number): Promise<{ channels: Float32Array[]; sampleRate: number } | null> {
    const c = this.capture;
    const ctx = this.ctx;
    if (!c || !ctx) return null;
    await c.flush();
    this.limiter?.disconnect(c.node);
    c.node.disconnect();
    c.sink.disconnect();
    this.capture = null;
    const join = (parts: Float32Array[]) => {
      const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
      let at = 0;
      for (const p of parts) (out.set(p, at), (at += p.length));
      return out;
    };
    const sr = ctx.sampleRate;
    const first = c.firstFrame ?? 0;
    const a = Math.max(0, from === undefined ? 0 : Math.round(from * sr) - first);
    const l = join(c.left);
    const b = Math.min(l.length, to === undefined ? l.length : Math.round(to * sr) - first);
    return { channels: [l.slice(a, b), join(c.right).slice(a, b)], sampleRate: sr };
  }

  /** A voice per derived version of the player's line, on its own strip, with its own settings (D69). */
  private versionVoices = new Map<VersionId, Synth>();
  private versionVoice(id: VersionId): Synth | null {
    if (!this.ctx) return null;
    let v = this.versionVoices.get(id);
    if (!v) {
      v = new Synth(this.ctx, this.channel(id), this.versionSynth[id], () => this.temperament);
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
