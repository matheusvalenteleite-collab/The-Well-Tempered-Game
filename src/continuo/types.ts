/**
 * Public types of the basso continuo module.
 *
 * Time is counted in beats of a half note (the alla-breve pulse of the game's 2/2 bars):
 * bar b spans beats [2b, 2b + 2). Pitches are spelled, as everywhere in the game
 * ("C#5"; C4 = MIDI 60), so that temperaments can tell C# from Db.
 */
import type { ModalFinal } from "../music/fux/types.ts";
import type { SpelledPitch, Step } from "../music/pitch.ts";
import type { CounterpointInput, VoiceNote } from "../counterpoint/rules/types.ts";
import type { Costs } from "./costs.ts";

export type FinalsMode = "organist" | "strict";
export type PresetId = "stileAntico" | "cembalo" | "hofkapelle";

/** One sung voice for the multi-voice form of the input (3- and 4-voice exercises later). */
export interface SungVoiceInput {
  id: string;
  notes: VoiceNote[];
}

/** N sung voices; every voice starts at beat 0 (rests as `pitch: null`). */
export interface MultiVoiceInput {
  modalFinal: ModalFinal;
  voices: SungVoiceInput[];
}

/** The two-voice exercise form the rule engine already uses, or the N-voice form. */
export type ContinuoInput = CounterpointInput | MultiVoiceInput;

export interface ContinuoOptions {
  /** "organist": complete final triad with a major (Picardy) third. "strict": octave and fifth (Fux, three voices). */
  finals: FinalsMode;
  /** Informational only: the realization is the same for every preset (the renderer differs). */
  preset?: PresetId;
  /** Right-hand window, inclusive, spelled ("G3".."D5"). */
  window: { low: string; high: string };
  /**
   * Octaves by which the continuo bass sits below the lowest sung voice. "auto" keeps it
   * in DEFAULTS.bassRange (Fux's lowest voice is often a tenor or an alto; the organist plays it
   * an octave lower, as with any basso seguente). 0 doubles it at pitch.
   */
  bassOctaves: "auto" | number;
  /** Second species: stepwise passing notes in the right hand into leaps of a third or more. */
  passingFill: boolean;
  /** Overrides of the tuning constants. */
  costs?: Partial<Costs>;
}

/** A pitch class with its spelling: a letter and an alteration. */
export interface SpelledPc {
  step: Step;
  alter: number;
}

/** A sung note on the beat grid. */
export interface SungNote {
  voice: string;
  pitch: SpelledPitch;
  start: number;
  end: number;
}

export type EventRole = "bass" | "rh" | "doubling";

export interface ContinuoEvent {
  startBeat: number;
  durationBeats: number;
  midi: number[];
  /** Spellings of `midi`, same order. */
  pitches: string[];
  /** "bass": left hand; "rh": right-hand chord tones; "doubling": right hand colla parte. */
  role: EventRole;
  /** 0-based bar. */
  bar: number;
  /** Figure for a bass or chord event; "pass", "5 6", "c.p." ... for the others. */
  label: string;
}

/** What happens on the upbeat of a second-species bar (A5). */
export type UpbeatKind = "chordTone" | "innerChange" | "refigured" | "transitus";

export interface BarInfo {
  bar: number;
  /** Figure as shown under the bar: "5/3", "6/3", "5/♯3", "5 6", "6/3–5/3", "c.p." ... */
  figure: string;
  /** Pitch classes (0..11) of the downbeat chord, ascending. */
  chordPcs: number[];
  /** Spelled chord, bass first ("E", "G", "C#"). */
  chord: string[];
  /** True when the right hand plays colla parte in this bar (A4). */
  fallback: boolean;
  /** Diagnostics: why a rule fired, why a fallback was used. */
  notes: string[];
  /** Continuo bass at the downbeat (after the octave shift). */
  bass: string;
  /** Right hand at the downbeat, low to high. */
  rh: string[];
  /** Cost of this bar on the chosen path (transition into it plus its own cost). */
  cost: number;
  upbeat?: { kind: UpbeatKind; figure?: string; chord?: string[] };
}

export interface ParallelCount {
  /** Parallel or consecutive 5ths/8ves between a right-hand voice and the bass. */
  withBass: number;
  /** Parallel 5ths between a right-hand voice and a sung upper voice (8ves there are doublings). */
  withSung: number;
}

export interface ContinuoRealization {
  events: ContinuoEvent[];
  bars: BarInfo[];
  beatsPerBar: 2;
  totalBeats: number;
  /** Octaves the continuo bass sits below the lowest sung voice. */
  bassOctaves: number;
  modalFinal: ModalFinal;
  options: ContinuoOptions;
  stats: { fallbackBars: number; parallels: ParallelCount };
}
