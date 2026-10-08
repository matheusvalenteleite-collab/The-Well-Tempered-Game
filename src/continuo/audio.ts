/**
 * Web Audio renderer of a continuo realization: synthesized organ, harpsichord and strings
 * (no samples), three presets, lookahead scheduling, a master compressor against clipping.
 * The sung voices are played with the game's own synth (src/audio/voice.ts), so they keep
 * their timbre; temperaments come from src/audio/temperament.ts.
 */
import { FxChain } from "../audio/effects.ts";
import { DEFAULT_SYNTH, type SynthSettings } from "../audio/synth-settings.ts";
import { frequency, type TemperamentId } from "../audio/temperament.ts";
import { Synth } from "../audio/voice.ts";
import { sungNotes } from "./input.ts";
import type { ContinuoEvent, ContinuoInput, ContinuoRealization, PresetId } from "./types.ts";

export interface PlayOptions {
  preset: PresetId;
  /** Half notes per minute (the game's alla-breve pulse). Default: defaultTempo(exercise). */
  tempoBpm?: number;
  /** AudioContext time of beat 0. Default: now + 0.1 s. */
  startTime?: number;
  /** Play the sung voices too (default true). */
  includeSungVoices?: boolean;
  /** 0..1 (default 0.8). */
  masterLevel?: number;
  /** Cembalo / Hofkapelle: delay the upbeat re-strike by 10% of a half note (a stylistic liberty). */
  inegal?: boolean;
  temperament?: TemperamentId;
  /** Synth settings of the sung voices (default: the game's default sound). */
  sungSynth?: SynthSettings;
  /** The game's context and master input, when there is one; otherwise a shared context is created. */
  audio?: { ctx: AudioContext; destination?: AudioNode };
  /** Called as each bar starts; -1 at the end. */
  onBar?: (bar: number) => void;
  /** Seed of the roll timings (deterministic playback). */
  seed?: number;
  /**
   * Live tempo (half notes per minute), read at every scheduling step, as the game's engine reads
   * its own: a change applies to the notes not yet scheduled. Without it, `tempoBpm` is fixed.
   */
  getTempo?: () => number;
}

export interface Playback {
  stop(): void;
  /** Resolves when the playback ends or is stopped. */
  done: Promise<void>;
}

/** Levels and timings of the presets, to be tuned by ear. */
export const PRESETS = {
  stileAntico: { organ: { rh: 0.03, bass: 0.045, ranks: { 8: 1, 4: 0.3 }, bassRanks: { 8: 1 }, flute: true }, reverb: { mode: "hall", mix: 0.25 } },
  cembalo: { harpsichord: { rh: 0.11, bass: 0.13, octave: 0.08, restrike: 0.5 }, reverb: { mode: "room", mix: 0.18 } },
  hofkapelle: {
    organ: { rh: 0.022, bass: 0.035, ranks: { 8: 1, 4: 0.45, 2: 0.15 }, bassRanks: { 8: 1, 4: 0.45, 2: 0.15 }, flute: false },
    harpsichord: { rh: 0.075, bass: 0.085, octave: 0.055, restrike: 0.5 },
    strings: 0.03,
    cello: 0.045,
    violone: 0.04,
    reverb: { mode: "hall", mix: 0.22 },
  },
  /** Roll: seconds between notes (min, max); final chord per note. */
  roll: { min: 0.025, max: 0.045, final: 0.09 },
  /** Fraction of a half note by which "inegal" delays the upbeat re-strike. */
  inegal: 0.1,
} as const;

/** Default tempo: half note = 60 in second species, whole note = 40 (half = 80) in first species. */
export function defaultTempo(exercise: ContinuoInput): number {
  return sungNotes(exercise).notes.some((n) => n.start % 2 !== 0) ? 60 : 80;
}

let shared: AudioContext | null = null;

/** Deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Instrument = "organ" | "bassOrgan" | "harpsichord" | "strings" | "violone";

/** One note to schedule, in seconds. */
interface Job {
  at: number;
  dur: number;
  pitch: string;
  /** Override of the frequency (octave doublings below the spelled pitch). */
  octave?: number;
  inst: Instrument;
  gain: number;
}

/** Note-level view of the realization: one entry per pitch per event. */
function notesOf(events: ContinuoEvent[], roles: ContinuoEvent["role"][]) {
  return events.filter((e) => roles.includes(e.role)).flatMap((e) => e.midi.map((m, i) => ({ start: e.startBeat, end: e.startBeat + e.durationBeats, midi: m, pitch: e.pitches[i], bar: e.bar, role: e.role })));
}

/** Organ legato: a note followed at once by the same note is tied, not re-attacked. */
function tie<T extends { start: number; end: number; midi: number }>(notes: T[]): T[] {
  const out: T[] = [];
  for (const n of [...notes].sort((a, b) => a.midi - b.midi || a.start - b.start)) {
    const last = out[out.length - 1];
    if (last && last.midi === n.midi && Math.abs(last.end - n.start) < 1e-9) last.end = n.end;
    else out.push({ ...n });
  }
  return out.sort((a, b) => a.start - b.start || a.midi - b.midi);
}

function buildJobs(exercise: ContinuoInput, r: ContinuoRealization, o: Required<Pick<PlayOptions, "preset" | "tempoBpm" | "inegal" | "seed">>): Job[] {
  const sec = 60 / o.tempoBpm;
  const jobs: Job[] = [];
  const random = rng(o.seed);
  const rh = notesOf(r.events, ["rh", "doubling"]);
  const bass = notesOf(r.events, ["bass"]);
  const lastBar = r.bars.length - 1;

  const organ = (p: { rh: number; bass: number }) => {
    for (const n of tie(rh)) jobs.push({ at: n.start * sec, dur: (n.end - n.start) * sec, pitch: n.pitch, inst: "organ", gain: p.rh });
    // The bass follows the sung bass: re-articulated, with a breath before each new note.
    for (const n of bass) jobs.push({ at: n.start * sec, dur: (n.end - n.start) * sec * 0.96, pitch: n.pitch, inst: "bassOrgan", gain: p.bass });
  };

  const harpsichord = (p: { rh: number; bass: number; octave: number; restrike: number }) => {
    const onsets = [...new Set([...rh, ...bass].map((n) => n.start))].sort((a, b) => a - b);
    for (const t of onsets) {
      const isFinal = t === 2 * lastBar;
      const chord = [
        ...bass.filter((n) => n.start === t).flatMap((n) => [
          ...(n.midi > 48 ? [{ ...n, octave: -1, gain: p.octave }] : []),
          { ...n, octave: 0, gain: p.bass },
        ]),
        ...rh.filter((n) => n.start === t).sort((a, b) => a.midi - b.midi).map((n) => ({ ...n, octave: 0, gain: p.rh })),
      ];
      const strike = (from: number, gainScale: number, endAt?: number) => {
        let at = from;
        for (const n of chord) {
          const end = endAt ?? n.end * sec;
          jobs.push({ at, dur: Math.max(0.05, end - at), pitch: n.pitch, octave: n.octave, inst: "harpsichord", gain: n.gain * gainScale });
          at += isFinal ? PRESETS.roll.final : PRESETS.roll.min + (PRESETS.roll.max - PRESETS.roll.min) * random();
        }
      };
      if (isFinal) {
        const half = ((chord[0]?.end ?? t + 2) - t) / 2;
        strike(t * sec, 1, (t + half) * sec);
        strike((t + half) * sec, 0.8);
      } else strike(t * sec, 1);
    }
    // Second species: the top two right-hand notes held through the upbeat are re-struck softly.
    for (const bar of r.bars) {
      if (!bar.upbeat || bar.bar === lastBar) continue;
      const up = 2 * bar.bar + 1;
      const held = rh.filter((n) => n.start < up && n.end > up).sort((a, b) => b.midi - a.midi).slice(0, 2);
      const at = (up + (o.inegal ? PRESETS.inegal : 0)) * sec;
      for (const n of held) jobs.push({ at, dur: n.end * sec - at, pitch: n.pitch, inst: "harpsichord", gain: p.rh * p.restrike });
    }
  };

  if (o.preset === "stileAntico") organ(PRESETS.stileAntico.organ);
  else if (o.preset === "cembalo") harpsichord(PRESETS.cembalo.harpsichord);
  else {
    const h = PRESETS.hofkapelle;
    organ(h.organ);
    harpsichord(h.harpsichord);
    for (const n of sungNotes(exercise).notes) jobs.push({ at: n.start * sec, dur: (n.end - n.start) * sec * 0.97, pitch: n.pitch.name, inst: "strings", gain: h.strings });
    for (const n of bass) {
      jobs.push({ at: n.start * sec, dur: (n.end - n.start) * sec * 0.97, pitch: n.pitch, inst: "strings", gain: h.cello });
      jobs.push({ at: n.start * sec, dur: (n.end - n.start) * sec * 0.97, pitch: n.pitch, octave: n.midi - 12 >= 28 ? -1 : 0, inst: "violone", gain: h.violone });
    }
  }
  return jobs.sort((a, b) => a.at - b.at);
}

/** The synthesized instruments. Every source is tracked so that stop() silences it at once. */
class Voices {
  private ctx: BaseAudioContext;
  private live = new Set<AudioScheduledSourceNode>();
  private noise: AudioBuffer;
  private plucks = new Map<number, AudioBuffer>();
  private principal: PeriodicWave;
  private stoppedFlute: PeriodicWave;
  private random: () => number;
  temperament: TemperamentId = "equal";

  constructor(ctx: BaseAudioContext, seed: number) {
    this.ctx = ctx;
    this.random = rng(seed ^ 0x9e3779b9);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = this.random() * 2 - 1;
    this.principal = this.wave([1, 0.55, 0.35, 0.22, 0.14, 0.09, 0.06, 0.04]);
    this.stoppedFlute = this.wave([1, 0.03, 0.12, 0.01, 0.03]);
  }

  private wave(amps: number[]): PeriodicWave {
    const real = new Float32Array(amps.length + 1);
    const imag = new Float32Array(amps.length + 1);
    amps.forEach((a, k) => (imag[k + 1] = a));
    return this.ctx.createPeriodicWave(real, imag);
  }

  private track<T extends AudioScheduledSourceNode>(n: T): T {
    this.live.add(n);
    n.onended = () => this.live.delete(n);
    return n;
  }

  private noiseBurst(out: AudioNode, at: number, length: number, freq: number, q: number, level: number) {
    const src = this.track(this.ctx.createBufferSource());
    src.buffer = this.noise;
    src.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = Math.min(12000, freq);
    bp.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(level, at);
    g.gain.setTargetAtTime(0, at, length / 3);
    src.connect(bp).connect(g).connect(out);
    src.start(at, this.random() * 0.5);
    src.stop(at + length * 2);
  }

  play(job: Job, start: number, out: AudioNode) {
    const f = frequency(job.pitch, this.temperament) * 2 ** (job.octave ?? 0);
    const at = start + job.at;
    const end = at + job.dur;
    switch (job.inst) {
      case "organ":
      case "bassOrgan":
        return this.organ(f, at, end, job, out);
      case "harpsichord":
        return this.harpsichord(f, at, end, job.gain, out);
      case "strings":
        return this.strings(f, at, end, job.gain, out, 2500);
      case "violone":
        return this.strings(f, at, end, job.gain, out, 1200); // the 16' octave is in job.octave
    }
  }

  /** Additive pipes: 8' fundamental, 4' (and 2', 16') ranks; ~15 ms speech with a small chiff. */
  private organ(f: number, at: number, end: number, job: Job, out: AudioNode) {
    const preset = this.organPreset;
    const ranks = job.inst === "bassOrgan" ? preset.bassRanks : preset.ranks;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(job.gain, at + 0.015);
    env.gain.setValueAtTime(job.gain, end);
    env.gain.setTargetAtTime(0, end, 0.025);
    env.connect(out);
    for (const [feet, level] of Object.entries(ranks) as [string, number][]) {
      const o = this.track(this.ctx.createOscillator());
      o.setPeriodicWave(preset.flute ? this.stoppedFlute : this.principal);
      o.frequency.value = f * (8 / Number(feet));
      o.detune.value = (this.random() - 0.5) * 3; // pipes are never exactly in tune with each other
      const g = this.ctx.createGain();
      g.gain.value = level;
      o.connect(g).connect(env);
      o.start(at);
      o.stop(end + 0.2);
    }
    this.noiseBurst(out, at, 0.025, f * 4, 3, job.gain * 0.5);
  }

  organPreset: { ranks: Record<number, number>; bassRanks: Record<number, number>; flute: boolean } = PRESETS.stileAntico.organ;

  /** Karplus-Strong pluck (seeded), ~1.2 s exponential decay, bright high-pass, quill noise. */
  private harpsichord(f: number, at: number, end: number, gain: number, out: AudioNode) {
    const key = Math.round(f * 100);
    let buf = this.plucks.get(key);
    if (!buf) {
      const sr = this.ctx.sampleRate;
      const len = Math.ceil(2.5 * sr);
      buf = this.ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      const period = Math.max(2, Math.round(sr / f));
      const line = new Float32Array(period);
      for (let i = 0; i < period; i++) line[i] = this.random() * 2 - 1;
      let idx = 0;
      for (let i = 0; i < len; i++) {
        const cur = line[idx];
        d[i] = cur;
        line[idx] = 0.998 * 0.5 * (cur + line[(idx + 1) % period]);
        idx = (idx + 1) % period;
      }
      this.plucks.set(key, buf);
    }
    const src = this.track(this.ctx.createBufferSource());
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = Math.max(80, f * 0.6);
    const bright = this.ctx.createBiquadFilter();
    bright.type = "highshelf";
    bright.frequency.value = 2500;
    bright.gain.value = 5;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, at);
    env.gain.setTargetAtTime(0, at, 1.2 / 3);
    env.gain.cancelScheduledValues(end);
    env.gain.setTargetAtTime(0, end, 0.04); // the damper
    src.connect(hp).connect(bright).connect(env).connect(out);
    src.start(at);
    src.stop(Math.min(at + 2.5, end + 0.3));
    this.noiseBurst(out, at, 0.006, 5000, 1, gain * 0.35);
  }

  /** Two detuned saws through a low-pass, slow attack, gentle delayed vibrato. */
  private strings(f: number, at: number, end: number, gain: number, out: AudioNode, cutoff: number) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = cutoff;
    lp.Q.value = 0.7;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(gain, at + 0.12);
    env.gain.setValueAtTime(gain, end);
    env.gain.setTargetAtTime(0, end, 0.06);
    lp.connect(env).connect(out);
    const lfo = this.track(this.ctx.createOscillator());
    lfo.frequency.value = 5;
    const depth = this.ctx.createGain();
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(7, at + 0.4);
    lfo.connect(depth);
    lfo.start(at);
    lfo.stop(end + 0.4);
    for (const cents of [-6, 6]) {
      const o = this.track(this.ctx.createOscillator());
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = cents;
      depth.connect(o.detune);
      const g = this.ctx.createGain();
      g.gain.value = 0.5;
      o.connect(g).connect(lp);
      o.start(at);
      o.stop(end + 0.4);
    }
  }

  stop() {
    for (const n of this.live) {
      try {
        n.stop();
      } catch {
        // not started yet
      }
    }
    this.live.clear();
  }
}

interface Graph {
  master: GainNode;
  continuoBus: GainNode;
  voices: Voices;
  synths: Map<string, Synth>;
  jobs: Job[];
  sungJobs: { at: number; dur: number; pitch: string; voice: string }[];
  sec: number;
}

/** The whole signal chain and the note lists, for real-time or offline rendering. */
function buildGraph(ctx: BaseAudioContext, destination: AudioNode, exercise: ContinuoInput, realization: ContinuoRealization, options: PlayOptions): Graph {
  const tempo = options.tempoBpm ?? defaultTempo(exercise);
  const seed = options.seed ?? 1725;
  const sec = 60 / tempo;
  // Master chain: everything -> compressor/limiter -> level -> the game's master (or the speakers).
  const master = ctx.createGain();
  master.gain.value = options.masterLevel ?? 0.8;
  master.connect(destination);
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;
  limiter.connect(master);
  const continuoBus = ctx.createGain();
  const preset = options.preset === "stileAntico" ? PRESETS.stileAntico : options.preset === "cembalo" ? PRESETS.cembalo : PRESETS.hofkapelle;
  // A little room for the instruments (the game's generated-impulse reverb).
  const fx = new FxChain(ctx, limiter, { ...DEFAULT_SYNTH, reverbMode: preset.reverb.mode, reverbMix: preset.reverb.mix, delayMode: "off" });
  continuoBus.connect(fx.input);

  const voices = new Voices(ctx, seed);
  voices.temperament = options.temperament ?? "equal";
  if (options.preset !== "cembalo") voices.organPreset = options.preset === "stileAntico" ? PRESETS.stileAntico.organ : PRESETS.hofkapelle.organ;
  const jobs = buildJobs(exercise, realization, { preset: options.preset, tempoBpm: tempo, inegal: options.inegal ?? false, seed });

  // The sung voices, with the game's synth (one per voice).
  const sung = options.includeSungVoices === false ? [] : sungNotes(exercise).notes;
  const synths = new Map<string, Synth>();
  const tuning = () => voices.temperament;
  for (const n of sung) if (!synths.has(n.voice)) synths.set(n.voice, new Synth(ctx, limiter, { ...(options.sungSynth ?? DEFAULT_SYNTH) }, tuning));
  const sungJobs = sung.map((n) => ({ at: n.start * sec, dur: (n.end - n.start) * sec * 0.97, pitch: n.pitch.name, voice: n.voice }));
  return { master, continuoBus, voices, synths, jobs, sungJobs, sec };
}

/** Play the exercise with its continuo, scheduling just ahead of time. */
export function playContinuo(exercise: ContinuoInput, realization: ContinuoRealization, options: PlayOptions): Playback {
  const ctx = options.audio?.ctx ?? (shared ??= new AudioContext());
  if (ctx.state === "suspended") void ctx.resume();
  const start = options.startTime ?? ctx.currentTime + 0.1;
  const { master, continuoBus, voices, synths, jobs, sungJobs, sec } = buildGraph(ctx, options.audio?.destination ?? ctx.destination, exercise, realization, options);

  const timers: ReturnType<typeof setTimeout>[] = [];
  const LOOKAHEAD = options.getTempo ? 0.15 : 0.3;
  // Jobs are built in seconds at the starting tempo; scheduling runs on a beat clock, so a live
  // tempo change re-anchors the clock at the scheduling horizon and later notes follow it.
  const secAt = () => (options.getTempo ? 60 / options.getTempo() : sec);
  let anchorTime = start;
  let anchorBeat = 0;
  let cur = secAt();
  const timeOf = (beat: number) => anchorTime + (beat - anchorBeat) * cur;
  let k = 0;
  let s = 0;
  let nextBar = 0;
  let ended = false;
  let stopped = false;
  let finish: () => void = () => {};
  const done = new Promise<void>((resolve) => (finish = resolve));
  const at = (time: number, fn: () => void) => timers.push(setTimeout(fn, Math.max(0, (time - ctx.currentTime) * 1000)));
  const tick = () => {
    if (stopped) return;
    const horizon = ctx.currentTime + LOOKAHEAD;
    const next = secAt();
    if (next !== cur) {
      const h = Math.max(horizon, anchorTime);
      anchorBeat += (h - anchorTime) / cur;
      anchorTime = h;
      cur = next;
    }
    const hb = anchorBeat + (horizon - anchorTime) / cur;
    while (k < jobs.length && jobs[k].at / sec < hb) {
      const j = jobs[k++];
      voices.play({ ...j, at: timeOf(j.at / sec), dur: (j.dur / sec) * cur }, 0, continuoBus);
    }
    while (s < sungJobs.length && sungJobs[s].at / sec < hb) {
      const j = sungJobs[s++];
      synths.get(j.voice)!.start(j.pitch, timeOf(j.at / sec), (j.dur / sec) * cur);
    }
    while (options.onBar && nextBar < realization.bars.length && 2 * nextBar < hb) {
      const b = nextBar++;
      at(timeOf(2 * b), () => options.onBar!(b));
    }
    if (!ended && realization.totalBeats <= hb) {
      ended = true;
      at(timeOf(realization.totalBeats) + 0.8, () => {
        options.onBar?.(-1);
        finish();
      });
    }
    if (!ended || k < jobs.length || s < sungJobs.length) timers.push(setTimeout(tick, options.getTempo ? 40 : 50));
  };
  tick();

  return {
    done,
    stop() {
      if (stopped) return;
      stopped = true;
      for (const t of timers) clearTimeout(t);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
      setTimeout(() => {
        voices.stop();
        for (const v of synths.values()) v.stop();
        master.disconnect();
      }, 120);
      options.onBar?.(-1);
      finish();
    },
  };
}

/** Render offline (diagnostics: levels, clipping). Returns the rendered buffer. */
export async function renderContinuoOffline(exercise: ContinuoInput, realization: ContinuoRealization, options: Omit<PlayOptions, "audio" | "startTime" | "onBar">, sampleRate = 22050): Promise<AudioBuffer> {
  const tempo = options.tempoBpm ?? defaultTempo(exercise);
  const seconds = (realization.totalBeats * 60) / tempo + 3;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const g = buildGraph(ctx, ctx.destination, exercise, realization, options);
  for (const j of g.jobs) g.voices.play(j, 0.05, g.continuoBus);
  for (const j of g.sungJobs) g.synths.get(j.voice)!.start(j.pitch, 0.05 + j.at, j.dur);
  return ctx.startRendering();
}
