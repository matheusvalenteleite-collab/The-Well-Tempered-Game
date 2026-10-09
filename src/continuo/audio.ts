/**
 * Web Audio renderer of a continuo realization: synthesized organ, harpsichord, theorbo and analog
 * pads; since D109 ensembles of recorded instruments (string quartet, the orchestras of Bach, Mozart,
 * Beethoven and Wagner, strings in four articulations, a brass choir, a rock band) played on the
 * game's sampler; lookahead scheduling, a master compressor against clipping.
 * The sung voices are played with the game's own synth (src/audio/voice.ts), so they keep
 * their timbre; temperaments come from src/audio/temperament.ts.
 */
import { FxChain } from "../audio/effects.ts";
import { DEFAULT_SYNTH, type SampleSet, type SynthSettings } from "../audio/synth-settings.ts";
import { SAMPLE_MANIFEST } from "../audio/sample-manifest.ts";
import { frequency, type TemperamentId } from "../audio/temperament.ts";
import { loadSamples, Synth } from "../audio/voice.ts";
import { figure, type FigurationId } from "./figuration.ts";
import { sungNotes } from "./input.ts";
import type { ContinuoEvent, ContinuoInput, ContinuoRealization, PresetId } from "./types.ts";

export interface PlayOptions {
  preset: PresetId;
  /** Half notes per minute (the game's alla-breve pulse). Default: defaultTempo(exercise). */
  tempoBpm?: number;
  /** AudioContext time of beat 0 (or of `fromBeat`). Default: now + 0.1 s. */
  startTime?: number;
  /** Start part-way through, at this half-note beat (a live restart); default 0. */
  fromBeat?: number;
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
  /** D110: the right hand broken into an arpeggio or repeated in a rhythm; none: as realized. */
  figuration?: FigurationId | null;
}

export interface Playback {
  stop(): void;
  /** Resolves when the playback ends or is stopped. */
  done: Promise<void>;
}

/** Levels and timings of the presets, to be tuned by ear. */
export const PRESETS = {
  // A chamber organ for continuo (D56): Gedackt 8' alone in the right hand, kept soft and under the
  // voices; the bass a little firmer, Gedackt 8' with a quiet 4' flute for definition; less room.
  stileAntico: { organ: { rh: 0.017, bass: 0.04, ranks: { 8: 1 }, bassRanks: { 8: 1, 4: 0.22 }, flute: true }, reverb: { mode: "hall", mix: 0.15 } },
  cembalo: { harpsichord: { rh: 0.11, bass: 0.13, octave: 0.08, restrike: 0.5 }, reverb: { mode: "room", mix: 0.18 } },
  hofkapelle: {
    organ: { rh: 0.022, bass: 0.035, ranks: { 8: 1, 4: 0.45, 2: 0.15 }, bassRanks: { 8: 1, 4: 0.45, 2: 0.15 }, flute: false },
    harpsichord: { rh: 0.075, bass: 0.085, octave: 0.055, restrike: 0.5 },
    reverb: { mode: "hall", mix: 0.22 },
  },
  // D73: further ensembles. Levels matched by offline rendering to about -28 dB RMS (the old
  // presets lie between -25 and -32), not by ear.
  theorbo: { lute: { rh: 0.16, bass: 0.19 }, viol: 0.056, reverb: { mode: "room", mix: 0.2 } },
  pizzicato: { reverb: { mode: "hall", mix: 0.25 } },
  sostenuto: { reverb: { mode: "hall", mix: 0.28 } },
  brass: { reverb: { mode: "hall", mix: 0.24 } },
  // D109: the pad swells in (no attack) and sits louder.
  analogPads: { rh: 0.06, bass: 0.07, reverb: { mode: "hall", mix: 0.32 } },
  // D109: recorded guitars and bass; the lead is a clean guitar through a tape delay, kept back.
  rockBand: { lead: 0.6, rhythm: 1, bass: 1.25, reverb: { mode: "room", mix: 0.14 } },
  // D109: ensembles of recorded instruments. Levels are per part, relative (1 = a part at full voice).
  quartet: { reverb: { mode: "room", mix: 0.2 } },
  bach: { harpsichord: { rh: 0.05, bass: 0.06, octave: 0.04, restrike: 0.5 }, reverb: { mode: "hall", mix: 0.22 } },
  mozart: { reverb: { mode: "hall", mix: 0.24 } },
  beethoven: { reverb: { mode: "hall", mix: 0.26 } },
  wagner: { reverb: { mode: "cathedral", mix: 0.24 } },
  staccato: { reverb: { mode: "hall", mix: 0.24 } },
  sforzando: { reverb: { mode: "hall", mix: 0.26 } },
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

/** The organ's right hand is released a little before the next chord (D56). */
const ORGAN_RH_LEGATO = 0.9;

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

type Instrument =
  | "organ" | "bassOrgan" | "harpsichord"
  // D73
  | "lute" | "theorboBass" | "bowed" | "pad" | "synthBass"
  // D109: a recorded instrument (see `rec`).
  | "rec";

/**
 * How a recorded instrument is played (D109): held with the bow or breath; short (staccato);
 * an accent that falls away at once (sforzando-piano); plucked; a guitar lead through a delay;
 * a picked bass.
 */
export type Articulation = "legato" | "stac" | "sfz" | "pizz" | "lead" | "pick" | "strum";

/** One note to schedule, in seconds. */
interface Job {
  at: number;
  dur: number;
  pitch: string;
  /** Override of the frequency (octave doublings below the spelled pitch). */
  octave?: number;
  inst: Instrument;
  gain: number;
  /** A recorded instrument: its sample set, articulation and part level; `gain` is then the velocity. */
  rec?: { set: string; art: Articulation; level: number };
}

/** Note-level view of the realization: one entry per pitch per event. */
function notesOf(events: ContinuoEvent[], roles: ContinuoEvent["role"][]) {
  return events.filter((e) => roles.includes(e.role)).flatMap((e) => e.midi.map((m, i) => ({ start: e.startBeat, end: e.startBeat + e.durationBeats, midi: m, pitch: e.pitches[i], bar: e.bar, role: e.role, ornament: e.ornament })));
}

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NAT = [0, 2, 4, 5, 7, 9, 11];
/** The diatonic note above `pitch` at `semis` semitones (1 or 2), spelled. */
function upperNeighbour(pitch: string, midi: number, semis: number): string {
  const m = /^([A-G])(#{1,2}|b{1,2})?(-?\d+)$/.exec(pitch)!;
  const i = LETTERS.indexOf(m[1]);
  const letter = LETTERS[(i + 1) % 7];
  const octave = Number(m[3]) + (i === 6 ? 1 : 0);
  const alter = midi + semis - (12 * (octave + 1) + NAT[(i + 1) % 7]);
  return `${letter}${alter > 0 ? "#".repeat(alter) : "b".repeat(-alter)}${octave}`;
}

/**
 * A cadential trill (A6): from the upper note, on the beat, about seven alternations a second,
 * slowing a little, then the main note held to the end (the "tremblement appuyé" shape).
 */
function trillJobs(n: { start: number; end: number; midi: number; pitch: string }, sec: number, inst: Instrument, gain: number): Job[] {
  const jobs: Job[] = [];
  const upper = upperNeighbour(n.pitch, n.midi, 1);
  const start = n.start * sec;
  const end = n.end * sec;
  const shake = Math.min(end - start, Math.max(0.6, (end - start) * 0.7));
  let t = start;
  let step = 0.065;
  let k = 0;
  while (t + step < start + shake) {
    jobs.push({ at: t, dur: step * 0.95, pitch: k % 2 === 0 ? upper : n.pitch, inst, gain: gain * (k === 0 ? 1 : 0.85) });
    t += step;
    step *= 1.015;
    k++;
  }
  if (k % 2 === 1) {
    jobs.push({ at: t, dur: step * 0.95, pitch: upper, inst, gain: gain * 0.85 });
    t += step;
  }
  jobs.push({ at: t, dur: Math.max(0.05, end - t), pitch: n.pitch, inst, gain });
  return jobs;
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

/** The recorded instruments the ensembles are made of (D109). */
type RecInst = "violin" | "viola" | "cello" | "contrabass" | "flute" | "oboe" | "clarinet" | "bassoon" | "horn" | "trumpet" | "trombone" | "timpani" | "harp" | "leadGuitar" | "rhythmGuitar" | "bassGuitar";
/** Playable range (MIDI) of each; a part outside it moves by octaves. */
const RANGE: Record<RecInst, [number, number]> = {
  violin: [55, 93], viola: [48, 84], cello: [36, 76], contrabass: [28, 60], flute: [60, 96], oboe: [58, 89], clarinet: [50, 89], bassoon: [34, 72],
  horn: [41, 77], trumpet: [54, 82], trombone: [40, 72], timpani: [40, 55], harp: [24, 100], leadGuitar: [52, 88], rhythmGuitar: [40, 76], bassGuitar: [28, 55],
};
/**
 * The sample set for an instrument and articulation: the first of its candidates that exists, so
 * that a dedicated recording (a viola, a pizzicato) is used where there is one and a near relative
 * stands in where there is not.
 */
const SETS: Record<RecInst, Partial<Record<Articulation, string[]>> & { legato: string[] }> = {
  violin: { legato: ["violinSus", "violin"], stac: ["violinStac", "violinSus", "violin"], pizz: ["violinPizz", "harp"] },
  viola: { legato: ["violaSus", "cello"], stac: ["violaStac", "violaSus", "cello"], pizz: ["violaPizz", "violinPizz", "harp"] },
  cello: { legato: ["cello"], stac: ["celloStac", "cello"], pizz: ["celloPizz", "bassPizz", "harp"] },
  contrabass: { legato: ["contrabass"], stac: ["bassStac", "contrabass"], pizz: ["bassPizz", "celloPizz", "harp"] },
  flute: { legato: ["flute"] },
  oboe: { legato: ["oboe", "flute"] },
  clarinet: { legato: ["clarinet", "flute"] },
  bassoon: { legato: ["bassoon"] },
  horn: { legato: ["horn"] },
  trumpet: { legato: ["trumpet"] },
  trombone: { legato: ["sackbut"] },
  timpani: { legato: ["timpani"] },
  harp: { legato: ["harp"] },
  leadGuitar: { legato: ["cleanGuitar", "eguitar"] },
  rhythmGuitar: { legato: ["rhythmGuitar", "eguitar"] },
  bassGuitar: { legato: ["rickBass", "ebass"] },
};
export function recSet(inst: RecInst, art: Articulation): string | null {
  const list = SETS[inst][art] ?? SETS[inst].legato;
  return list.find((x) => x in SAMPLE_MANIFEST) ?? null;
}

/** Envelope and effects of each articulation, on the game's sampler (D109). */
const ARTICULATION: Record<Articulation, Partial<SynthSettings>> = {
  legato: { attack: 0.07, decay: 0.1, sustain: 1, release: 0.4, tone: 9000 },
  sfz: { attack: 0.004, decay: 0.28, sustain: 0.3, release: 0.35, tone: 9000 },
  stac: { attack: 0.004, decay: 0.1, sustain: 0.7, release: 0.07, tone: 9000 },
  pizz: { attack: 0.002, decay: 0.05, sustain: 1, release: 0.2, tone: 9000 },
  pick: { attack: 0.003, decay: 0.05, sustain: 1, release: 0.07, tone: 7000 },
  strum: { attack: 0.003, decay: 0.05, sustain: 1, release: 0.12, tone: 6000 },
  lead: { attack: 0.004, decay: 0.05, sustain: 1, release: 0.3, tone: 5500, delayMode: "tape", delayTime: 0.36, delayFeedback: 0.38, delayMix: 0.3, reverbMode: "spring", reverbMix: 0.18 },
};
/** Overall level of the recorded parts against the synthesized instruments. */
const REC_LEVEL = 0.32;

/** The recorded parts: one sampler per sample set, articulation and level. */
class Recorded {
  private players = new Map<string, Synth>();
  private ctx: BaseAudioContext;
  private out: AudioNode;
  private tuning: () => TemperamentId;
  constructor(ctx: BaseAudioContext, out: AudioNode, tuning: () => TemperamentId) {
    this.ctx = ctx;
    this.out = out;
    this.tuning = tuning;
  }
  /** Create the samplers of these jobs (which starts loading their recordings). */
  prepare(jobs: Job[]) {
    for (const j of jobs) if (j.rec) this.player(j.rec);
  }
  private player(r: NonNullable<Job["rec"]>): Synth {
    const key = `${r.set}|${r.art}|${r.level}`;
    let s = this.players.get(key);
    if (!s) {
      const level = this.ctx.createGain();
      level.gain.value = r.level * REC_LEVEL;
      level.connect(this.out);
      s = new Synth(this.ctx, level, { ...DEFAULT_SYNTH, model: "sampled", sampleSet: r.set as SampleSet, vibrato: 0, reverbMode: "off", delayMode: "off", ...ARTICULATION[r.art] }, this.tuning);
      this.players.set(key, s);
    }
    return s;
  }
  play(j: Job, at: number, dur: number) {
    if (!j.rec) return;
    const k = j.octave ?? 0;
    const pitch = k ? j.pitch.replace(/(-?\d+)$/, (o) => String(Number(o) + k)) : j.pitch;
    this.player(j.rec).start(pitch, at, dur, j.gain);
  }
  stop() {
    for (const s of this.players.values()) s.stop();
  }
}

/** Start loading the recordings a preset uses, so that its first notes are heard. */
export function preloadContinuo(ctx: BaseAudioContext, preset: PresetId) {
  const sets = new Set<string>();
  for (const inst of Object.keys(SETS) as RecInst[]) if (PRESET_INSTRUMENTS[preset]?.includes(inst)) for (const a of Object.keys(SETS[inst]) as Articulation[]) { const x = recSet(inst, a); if (x) sets.add(x); }
  for (const x of sets) void loadSamples(ctx, x as SampleSet).catch(() => {});
}
const STRINGS: RecInst[] = ["violin", "viola", "cello", "contrabass"];
const PRESET_INSTRUMENTS: Partial<Record<PresetId, RecInst[]>> = {
  hofkapelle: [...STRINGS, "bassoon"], pizzicato: STRINGS, sostenuto: STRINGS, staccato: STRINGS, sforzando: STRINGS, brass: ["trumpet", "horn", "trombone"],
  quartet: STRINGS, bach: [...STRINGS, "oboe", "bassoon"], mozart: [...STRINGS, "oboe", "horn", "bassoon"],
  beethoven: [...STRINGS, "flute", "oboe", "clarinet", "bassoon", "horn", "trumpet", "timpani"],
  wagner: [...STRINGS, "flute", "oboe", "clarinet", "bassoon", "horn", "trombone", "harp", "timpani"],
  rockBand: ["leadGuitar", "rhythmGuitar", "bassGuitar"],
};

function buildJobs(exercise: ContinuoInput, r: ContinuoRealization, o: Required<Pick<PlayOptions, "preset" | "tempoBpm" | "inegal" | "seed">> & { figuration?: FigurationId | null }): Job[] {
  const sec = 60 / o.tempoBpm;
  const jobs: Job[] = [];
  const random = rng(o.seed);
  const lastBar = r.bars.length - 1;
  const written = notesOf(r.events, ["rh", "doubling"]);
  const rh = o.figuration ? figure(written, o.figuration, lastBar) : written.map((n) => ({ ...n, rank: undefined as number | undefined, low: undefined as boolean | undefined }));
  const bass = notesOf(r.events, ["bass"]);

  const organ = (p: { rh: number; bass: number }) => {
    for (const n of tie(rh)) {
      if (n.ornament === "trill") jobs.push(...trillJobs(n, sec, "organ", p.rh));
      // The right hand speaks slightly detached, behind the singers (D56).
      else jobs.push({ at: n.start * sec, dur: (n.end - n.start) * sec * ORGAN_RH_LEGATO, pitch: n.pitch, inst: "organ", gain: p.rh });
    }
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
        ...rh.filter((n) => n.start === t && n.ornament !== "trill").sort((a, b) => a.midi - b.midi).map((n) => ({ ...n, octave: 0, gain: p.rh })),
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
    for (const n of rh) if (n.ornament === "trill") jobs.push(...trillJobs(n, sec, "harpsichord", p.rh * 0.9));
    // Second species: the top two right-hand notes held through the upbeat are re-struck softly.
    for (const bar of r.bars) {
      if (!bar.upbeat || bar.bar === lastBar) continue;
      const up = 2 * bar.bar + 1;
      const held = rh.filter((n) => n.start < up && n.end > up && n.ornament !== "trill").sort((a, b) => b.midi - a.midi).slice(0, 2);
      const at = (up + (o.inegal ? PRESETS.inegal : 0)) * sec;
      for (const n of held) jobs.push({ at, dur: n.end * sec - at, pitch: n.pitch, inst: "harpsichord", gain: p.rh * p.restrike });
    }
  };

  /** Every note held as written (legato instruments: bows, brass, pads, a sustained lead). */
  const held = (notes: typeof rh, inst: Instrument, gain: number, legato = 0.97, octave = 0) => {
    for (const n of tie(notes)) jobs.push({ at: n.start * sec, dur: (n.end - n.start) * sec * legato, pitch: n.pitch, octave, inst, gain });
  };
  /**
   * Struck instruments (plucked, hammered): each onset of a note sounds it; the chord spreads a
   * little (a strum or a roll); notes held across the upbeat of a moving bar are struck again.
   */
  const struck = (notes: typeof rh, inst: Instrument, gain: number, spread: number, restrike = 0) => {
    const onsets = [...new Set(notes.map((n) => n.start))].sort((a, b) => a - b);
    for (const t of onsets) {
      let at = t * sec;
      for (const n of notes.filter((x) => x.start === t).sort((a, b) => a.midi - b.midi)) {
        jobs.push({ at, dur: Math.max(0.05, n.end * sec - at), pitch: n.pitch, inst, gain });
        at += spread * (0.6 + 0.8 * random());
      }
    }
    if (!restrike) return;
    for (const bar of r.bars) {
      if (!bar.upbeat || bar.bar === lastBar) continue;
      const up = 2 * bar.bar + 1;
      for (const n of notes.filter((x) => x.start < up && x.end > up)) jobs.push({ at: up * sec, dur: n.end * sec - up * sec, pitch: n.pitch, inst, gain: gain * restrike });
    }
  };
  const top = (t: number) => Math.max(...rh.filter((n) => n.start <= t && n.end > t).map((n) => n.midi));

  // D109: parts of an ensemble. Each right-hand note has a rank at its onset (0 = the top note);
  // the parts take ranks, the bass line, or doublings at the octave, each in its instrument's range.
  type Note = (typeof rh)[number];
  const soundingAt = (t: number) => rh.filter((n) => n.start <= t + 1e-9 && n.end > t + 1e-9);
  const rankOf = (n: Note) => n.rank ?? soundingAt(n.start).filter((x) => x.midi > n.midi).length;
  const lowest = (n: Note) => n.low ?? soundingAt(n.start).every((x) => x.midi >= n.midi);
  const ranks = (...k: number[]) => rh.filter((n) => k.includes(rankOf(n)));
  const middle = rh.filter((n) => rankOf(n) >= 1 && !lowest(n));
  const low = rh.filter((n) => rankOf(n) >= 1 && lowest(n));
  /** Each recorded part: notes, instrument, articulation, level; octave shifts keep it in range. */
  const part = (notes: Note[], inst: RecInst, art: Articulation, level: number, o: { octave?: number; vel?: number; pulse?: number; legato?: number } = {}) => {
    const [lo, hi] = RANGE[inst];
    const set = recSet(inst, art);
    if (!set) return;
    const fit = (midi: number) => {
      let k = o.octave ?? 0;
      while (midi + 12 * k < lo && k < 3) k++;
      while (midi + 12 * k > hi && k > -3) k--;
      return k;
    };
    const vel = o.vel ?? 0.75;
    const add = (n: Note, from: number, to: number, v: number) => {
      const at = from * sec;
      const dur = art === "stac" ? Math.min(0.24, (to - from) * sec * 0.5) : art === "pizz" || art === "strum" ? (to - from) * sec : (to - from) * sec * (o.legato ?? 0.97);
      jobs.push({ at, dur: Math.max(0.05, dur), pitch: n.pitch, octave: fit(n.midi), inst: "rec", gain: v, rec: { set, art, level } });
    };
    const list = art === "legato" || art === "sfz" || art === "lead" ? tie(notes) : notes;
    for (const n of list) {
      if (!o.pulse) {
        add(n, n.start, n.end, art === "sfz" ? 0.95 : vel);
        continue;
      }
      // Repeated on a pulse through the note (staccato, pizzicato, strumming, a driven bass),
      // the first stroke of each bar a little stronger.
      for (let t = n.start, i = 0; t < n.end - 1e-9; t += o.pulse, i++) add(n, t, Math.min(n.end, t + o.pulse), Math.min(1, vel * (t % 2 === 0 ? 1.12 : i % 2 ? 0.86 : 1)));
    }
  };
  const bassOct = bass.map((n) => ({ ...n }));
  /** The timpani on the bass's tonic and dominant downbeats at the start and the close. */
  const timpani = (level: number) => {
    const finalPc = bass.length ? bass[bass.length - 1].midi % 12 : 0;
    for (const n of bass) {
      const pc = n.midi % 12;
      const near = n.bar <= 0 || n.bar >= lastBar - 1;
      if (near && n.start % 2 === 0 && (pc === finalPc || pc === (finalPc + 7) % 12)) part([n], "timpani", "pizz", level, { vel: n.bar === lastBar ? 0.95 : 0.8 });
    }
  };
  const strings = (art: Articulation, level: number, o: { pulse?: number; double?: boolean } = {}) => {
    part(ranks(0), "violin", art, level, o);
    part(middle, "violin", art, level * 0.85, o);
    part(low, "viola", art, level * 0.85, o);
    part(bass, "cello", art, level, o);
    if (o.double !== false) part(bassOct, "contrabass", art, level * 0.8, { ...o, octave: -1 });
  };

  if (o.preset === "theorbo") {
    const p = PRESETS.theorbo;
    struck(rh, "lute", p.lute.rh, PRESETS.roll.max, 0.55);
    struck(bass, "theorboBass", p.lute.bass, 0);
    held(bass, "bowed", p.viol);
  } else if (o.preset === "pizzicato") strings("pizz", 1, { pulse: 1 });
  else if (o.preset === "sostenuto") strings("legato", 0.9);
  else if (o.preset === "staccato") strings("stac", 2.8, { pulse: 0.5 });
  else if (o.preset === "sforzando") strings("sfz", 2.5);
  else if (o.preset === "brass") {
    // A brass choir: trumpet on top, horns inside, trombones below and on the bass.
    part(ranks(0), "trumpet", "legato", 1.1);
    part(middle, "horn", "legato", 1.25);
    part(low, "trombone", "legato", 1.1);
    part(bass, "trombone", "legato", 1.4);
  } else if (o.preset === "quartet") {
    // Two violins, viola and cello, one to a part (the right hand's top three notes and the bass).
    part(ranks(0), "violin", "legato", 1);
    part(ranks(1), "violin", "legato", 0.85);
    part(rh.filter((n) => rankOf(n) >= 2), "viola", "legato", 0.85);
    part(bass, "cello", "legato", 1);
  } else if (o.preset === "bach") {
    // Leipzig, about 1730: strings, oboes with the violins, bassoon with the bass, harpsichord continuo.
    strings("legato", 0.85);
    part(ranks(0), "oboe", "legato", 0.45);
    part(bass, "bassoon", "legato", 0.45);
    harpsichord(PRESETS.bach.harpsichord);
  } else if (o.preset === "mozart") {
    // Vienna, about 1785: strings, a pair of oboes and of horns, bassoons on the bass; no continuo.
    strings("legato", 0.85);
    part(ranks(0), "oboe", "legato", 0.4);
    part(low, "horn", "legato", 0.45);
    part(bass, "bassoon", "legato", 0.4);
  } else if (o.preset === "beethoven") {
    // About 1808: strings, flutes, oboes, clarinets, bassoons in pairs, horns, trumpets and timpani.
    strings("legato", 0.85);
    part(ranks(0), "flute", "legato", 0.35, { octave: 1 });
    part(ranks(0), "oboe", "legato", 0.35);
    part(middle, "clarinet", "legato", 0.45);
    part(low, "horn", "legato", 0.5);
    part(bass, "bassoon", "legato", 0.45);
    part(rh.filter((n) => rankOf(n) === 0 && n.bar >= lastBar - 1), "trumpet", "legato", 0.35);
    timpani(0.7);
  } else if (o.preset === "wagner") {
    // About 1870: a large string body in octaves, woodwinds in threes, four horns, trombones and
    // tuba under the harmony, a harp arpeggiating each chord.
    strings("legato", 1);
    part(ranks(0), "violin", "legato", 0.6, { octave: 1 });
    part(ranks(0), "flute", "legato", 0.3, { octave: 1 });
    part(ranks(0), "oboe", "legato", 0.3);
    part(middle, "clarinet", "legato", 0.4);
    part(middle, "horn", "legato", 0.5);
    part(low, "horn", "legato", 0.5);
    part(low, "trombone", "legato", 0.35);
    part(bassOct, "trombone", "legato", 0.4, { octave: -1 });
    part(bass, "bassoon", "legato", 0.35);
    for (const t of [...new Set(rh.map((n) => n.start))]) {
      const chord = [...bass.filter((n) => n.start <= t && n.end > t), ...soundingAt(t)].sort((a, b) => a.midi - b.midi);
      chord.forEach((n, i) => jobs.push({ at: t * sec + i * 0.07, dur: 2.5, pitch: n.pitch, octave: n.midi < 48 ? 1 : 0, inst: "rec", gain: 0.6, rec: { set: recSet("harp", "pizz")!, art: "pizz", level: 0.35 } }));
    }
    timpani(0.6);
  } else if (o.preset === "analogPads") {
    const p = PRESETS.analogPads;
    held(rh, "pad", p.rh, 1);
    for (const n of bass) jobs.push({ at: n.start * sec, dur: (n.end - n.start) * sec * 0.9, pitch: n.pitch, octave: n.midi >= 48 ? -1 : 0, inst: "synthBass", gain: p.bass });
  } else if (o.preset === "rockBand") {
    // The right hand is split between two guitars (owner): a clean lead on the top note through a
    // tape delay, 1960s-70s style and kept back, and a rhythm guitar strumming the notes below it in
    // quarters; a bright picked bass (a Rickenbacker kind of sound) drives the bass line in quarters.
    const p = PRESETS.rockBand;
    part(ranks(0), "leadGuitar", "lead", p.lead, { vel: 0.7 });
    part(rh.filter((n) => rankOf(n) >= 1), "rhythmGuitar", "strum", p.rhythm, { pulse: 0.5, vel: 0.7 });
    part(bass, "bassGuitar", "pick", p.bass, { pulse: 0.5, vel: 0.8 });
  } else if (o.preset === "stileAntico") organ(PRESETS.stileAntico.organ);
  else if (o.preset === "cembalo") harpsichord(PRESETS.cembalo.harpsichord);
  else {
    // The Vienna court chapel: organ and harpsichord, recorded strings doubling the sung voices
    // colla parte, cello, violone and bassoon on the bass.
    const h = PRESETS.hofkapelle;
    organ(h.organ);
    harpsichord(h.harpsichord);
    const sung = sungNotes(exercise).notes.map((n) => ({ start: n.start, end: n.end, midi: n.pitch.midi, pitch: n.pitch.name, bar: 0, role: "rh" as const, ornament: undefined }));
    part(sung.filter((n) => n.midi >= 55) as Note[], "violin", "legato", 0.5);
    part(sung.filter((n) => n.midi < 55) as Note[], "viola", "legato", 0.5);
    part(bass, "cello", "legato", 0.6);
    part(bassOct, "contrabass", "legato", 0.5, { octave: -1 });
    part(bass, "bassoon", "legato", 0.3);
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
      // D73
      case "lute":
        return this.pluck(f, at, end, job.gain, out, { damping: 0.996, decay: 1.6, lowpass: 3200, highpass: f * 0.5, release: 0.25 });
      case "theorboBass":
        return this.pluck(f, at, end, job.gain, out, { damping: 0.997, decay: 2.2, lowpass: 1800, highpass: 40, release: 0.3 });
      case "bowed":
        return this.strings(f, at, end, job.gain, out, 2200, 0.35);
      case "pad":
        return this.pad(f, at, end, job.gain, out);
      case "synthBass":
        return this.synthBass(f, at, end, job.gain, out);
    }
  }

  /** Additive pipes: 8' fundamental, 4' (and 2', 16') ranks; ~15 ms speech with a small chiff. */
  private organ(f: number, at: number, end: number, job: Job, out: AudioNode) {
    const preset = this.organPreset;
    const ranks = job.inst === "bassOrgan" ? preset.bassRanks : preset.ranks;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, at);
    // Stopped pipes speak gently (about 30 ms) and stop quickly.
    const speech = preset.flute ? 0.03 : 0.015;
    env.gain.linearRampToValueAtTime(job.gain, at + speech);
    env.gain.setValueAtTime(job.gain, Math.max(at + speech, end));
    env.gain.setTargetAtTime(0, Math.max(at + speech, end), 0.03);
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
    // The chiff: small for stopped flutes, lower in pitch.
    this.noiseBurst(out, at, 0.025, preset.flute ? f * 3 : f * 4, 3, job.gain * (preset.flute ? 0.22 : 0.5));
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
  private strings(f: number, at: number, end: number, gain: number, out: AudioNode, cutoff: number, attack = 0.12) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = cutoff;
    lp.Q.value = 0.7;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(gain, at + attack);
    env.gain.setValueAtTime(gain, Math.max(end, at + attack));
    env.gain.setTargetAtTime(0, Math.max(end, at + attack), 0.06);
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

  // ---- D73: the further ensembles' instruments (all synthesized).

  private strands = new Map<string, AudioBuffer>();
  /** A Karplus-Strong string (seeded, cached per pitch and damping). */
  private string(f: number, damping: number): AudioBuffer {
    const key = `${Math.round(f * 100)}:${damping}`;
    let buf = this.strands.get(key);
    if (buf) return buf;
    const sr = this.ctx.sampleRate;
    const len = Math.ceil(3 * sr);
    buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const period = Math.max(2, Math.round(sr / f));
    const line = new Float32Array(period);
    for (let i = 0; i < period; i++) line[i] = this.random() * 2 - 1;
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const cur = line[idx];
      d[i] = cur;
      line[idx] = damping * 0.5 * (cur + line[(idx + 1) % period]);
      idx = (idx + 1) % period;
    }
    this.strands.set(key, buf);
    return buf;
  }

  /** A plucked string: lute, theorbo, pizzicato, upright bass, clean guitar. */
  private pluck(f: number, at: number, end: number, gain: number, out: AudioNode, o: { damping: number; decay: number; lowpass: number; highpass: number; release: number; thump?: number }) {
    const src = this.track(this.ctx.createBufferSource());
    src.buffer = this.string(f, o.damping);
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = o.lowpass;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = o.highpass;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, at);
    env.gain.setTargetAtTime(0, at, o.decay / 3);
    env.gain.cancelScheduledValues(end);
    env.gain.setTargetAtTime(0, end, o.release / 3);
    src.connect(lp).connect(hp).connect(env).connect(out);
    src.start(at);
    src.stop(Math.min(at + 3, end + o.release * 2));
    if (o.thump) this.noiseBurst(out, at, 0.01, Math.min(1500, f * 3), 1, gain * o.thump);
  }

  private curves = new Map<number, Float32Array<ArrayBuffer>>();

  /** Oscillators at f (times `ratio`), detuned by `cents`, into `dest`, between at and stop. */
  private oscs(dest: AudioNode, f: number, at: number, stop: number, spec: [OscillatorType, number, number, number][]) {
    const made: OscillatorNode[] = [];
    for (const [type, ratio, cents, level] of spec) {
      const o = this.track(this.ctx.createOscillator());
      o.type = type;
      o.frequency.value = f * ratio;
      o.detune.value = cents;
      const g = this.ctx.createGain();
      g.gain.value = level;
      o.connect(g).connect(dest);
      o.start(at);
      o.stop(stop);
      made.push(o);
    }
    return made;
  }

  /** A sustain envelope: attack, hold to `end`, release. */
  private sustain(at: number, end: number, gain: number, attack: number, release: number) {
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(gain, at + attack);
    env.gain.setValueAtTime(gain, Math.max(end, at + attack));
    env.gain.setTargetAtTime(0, Math.max(end, at + attack), release / 3);
    return env;
  }

  /** Delayed vibrato on the given oscillators. */
  private vibrato(oscs: OscillatorNode[], at: number, stop: number, rate: number, cents: number, delay: number) {
    const lfo = this.track(this.ctx.createOscillator());
    lfo.frequency.value = rate;
    const depth = this.ctx.createGain();
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(cents, at + delay);
    lfo.connect(depth);
    for (const o of oscs) depth.connect(o.detune);
    lfo.start(at);
    lfo.stop(stop);
  }


  /** An analog string-machine pad: detuned saws and a sub, a slow low-pass sweep. */
  private pad(f: number, at: number, end: number, gain: number, out: AudioNode) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 0.8;
    lp.frequency.value = Math.min(4000, f * 2.5);
    const lfo = this.track(this.ctx.createOscillator());
    lfo.frequency.value = 0.18;
    const sweep = this.ctx.createGain();
    sweep.gain.value = Math.min(1500, f * 1.5);
    lfo.connect(sweep).connect(lp.frequency);
    // D109: no attack — the chord swells in over about a second and lets go as slowly.
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.setTargetAtTime(gain, at, 0.35);
    env.gain.cancelScheduledValues(Math.max(end, at + 0.05));
    env.gain.setTargetAtTime(0, Math.max(end, at + 0.05), 0.4);
    lp.connect(env).connect(out);
    const stop = Math.max(end, at + 0.6) + 2;
    lfo.start(at);
    lfo.stop(stop);
    this.oscs(lp, f, at, stop, [["sawtooth", 1, -12, 0.4], ["sawtooth", 1, 0, 0.4], ["sawtooth", 1, 12, 0.4], ["square", 0.5, 0, 0.18]]);
  }

  /** A monophonic analog bass: saw and a square an octave down, a resonant filter that closes. */
  private synthBass(f: number, at: number, end: number, gain: number, out: AudioNode) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 3;
    lp.frequency.setValueAtTime(Math.min(2500, f * 8), at);
    lp.frequency.setTargetAtTime(Math.max(120, f * 2.5), at, 0.08);
    const env = this.sustain(at, end, gain, 0.005, 0.06);
    lp.connect(env).connect(out);
    this.oscs(lp, f, at, Math.max(end, at + 0.01) + 0.2, [["sawtooth", 1, 0, 0.6], ["square", 0.5, 0, 0.4]]);
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
  recorded: Recorded;
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
  const preset = PRESETS[options.preset] ?? PRESETS.cembalo;
  // A little room for the instruments (the game's generated-impulse reverb).
  const fx = new FxChain(ctx, limiter, { ...DEFAULT_SYNTH, reverbMode: preset.reverb.mode, reverbMix: preset.reverb.mix, delayMode: "off" });
  continuoBus.connect(fx.input);

  const voices = new Voices(ctx, seed);
  voices.temperament = options.temperament ?? "equal";
  if (options.preset === "stileAntico" || options.preset === "hofkapelle") voices.organPreset = PRESETS[options.preset].organ;
  const jobs = buildJobs(exercise, realization, { preset: options.preset, tempoBpm: tempo, inegal: options.inegal ?? false, seed, figuration: options.figuration });

  // The sung voices, with the game's synth (one per voice).
  const sung = options.includeSungVoices === false ? [] : sungNotes(exercise).notes;
  const synths = new Map<string, Synth>();
  const tuning = () => voices.temperament;
  for (const n of sung) if (!synths.has(n.voice)) synths.set(n.voice, new Synth(ctx, limiter, { ...(options.sungSynth ?? DEFAULT_SYNTH) }, tuning));
  const sungJobs = sung.map((n) => ({ at: n.start * sec, dur: (n.end - n.start) * sec * 0.97, pitch: n.pitch.name, voice: n.voice }));
  const recorded = new Recorded(ctx, continuoBus, tuning);
  recorded.prepare(jobs);
  return { master, continuoBus, voices, recorded, synths, jobs, sungJobs, sec };
}

/** Play the exercise with its continuo, scheduling just ahead of time. */
export function playContinuo(exercise: ContinuoInput, realization: ContinuoRealization, options: PlayOptions): Playback {
  const ctx = options.audio?.ctx ?? (shared ??= new AudioContext());
  if (ctx.state === "suspended") void ctx.resume();
  const start = options.startTime ?? ctx.currentTime + 0.1;
  const { master, continuoBus, voices, recorded, synths, jobs, sungJobs, sec } = buildGraph(ctx, options.audio?.destination ?? ctx.destination, exercise, realization, options);

  const timers: ReturnType<typeof setTimeout>[] = [];
  const LOOKAHEAD = options.getTempo ? 0.15 : 0.3;
  // Jobs are built in seconds at the starting tempo; scheduling runs on a beat clock, so a live
  // tempo change re-anchors the clock at the scheduling horizon and later notes follow it.
  const secAt = () => (options.getTempo ? 60 / options.getTempo() : sec);
  const fromBeat = options.fromBeat ?? 0;
  let anchorTime = start;
  let anchorBeat = fromBeat;
  let cur = secAt();
  const timeOf = (beat: number) => anchorTime + (beat - anchorBeat) * cur;
  let k = 0;
  while (k < jobs.length && jobs[k].at / sec < fromBeat - 1e-9) k++;
  let s = 0;
  while (s < sungJobs.length && sungJobs[s].at / sec < fromBeat - 1e-9) s++;
  let nextBar = Math.ceil(fromBeat / 2 - 1e-9);
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
      if (j.rec) recorded.play(j, timeOf(j.at / sec), (j.dur / sec) * cur);
      else voices.play({ ...j, at: timeOf(j.at / sec), dur: (j.dur / sec) * cur }, 0, continuoBus);
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
        recorded.stop();
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
  await Promise.all([...new Set(g.jobs.flatMap((j) => (j.rec ? [j.rec.set] : [])))].map((x) => loadSamples(ctx, x as SampleSet).catch(() => {})));
  for (const j of g.jobs) {
    if (j.rec) g.recorded.play(j, 0.05 + j.at, j.dur);
    else g.voices.play(j, 0.05, g.continuoBus);
  }
  for (const j of g.sungJobs) g.synths.get(j.voice)!.start(j.pitch, 0.05 + j.at, j.dur);
  return ctx.startRendering();
}
