/**
 * The composer (docs/wtc/COMPOSE.md): a fugue written from the player's own subject, step by
 * step. This module holds the draft: the key, the metre, the subject, the answer, the
 * countersubject, the plan's free passages, and the helpers every step shares.
 *
 * Notes are `WtcNote` ({pitch, at, dur}, quarters), the model of the exposition exercises and of
 * the two-voice judge (src/wtc/counterpoint.ts); `toTicks` converts for the analysis of the 48
 * (src/wtc/fugue.ts, TPQ ticks), which reads the finished fugue back.
 */
import { parsePitch, type Step } from "../../music/pitch.ts";
import { TPQ } from "../corpus.ts";
import type { Note } from "../fugue.ts";
import { isMinor, keySignature, transpose, type WtcNote } from "../fugues.ts";

/** A written event: a pitch or a rest (null), and its length in quarters. */
export interface Ev {
  pitch: string | null;
  dur: number;
}

/** The answer as the player settled it: its pitches in the subject's rhythm, and where it enters. */
export interface AnswerChoice {
  pitches: string[];
  /** Onset in quarters after the subject's first note. */
  at: number;
}

export interface FugueDraft {
  version: 1;
  /** "C", "c#", "Eb", "bb" ... (lower case: minor), as in fugues.ts. */
  key: string;
  /** "4/4", "3/4", "6/8", "2/2", "3/8", "12/8" ... */
  time: string;
  /** Where the subject starts within its bar, in quarters (0: on the downbeat). */
  phase: number;
  subject: Ev[];
  /** Which voice states the subject first: 0 the upper, 1 the lower. */
  first: 0 | 1;
  answer: AnswerChoice | null;
  /** The countersubject, from the answer's entry to its end (rests allowed). */
  countersubject: Ev[];
  /** The free passages, by "section:voice" (codetta, episodes, the rest of an entry, the close). */
  free: Record<string, Ev[]>;
  /** Pitches changed in a planned entry (its rhythm stays the subject's), by section id. */
  touched: Record<string, (string | null)[]>;
  /** Bars of each episode and of the close. */
  lengths: { episode1: number; episode2: number; close: number };
}

export const EPS = 1e-6;

export function emptyDraft(key = "c", time = "4/4"): FugueDraft {
  return { version: 1, key, time, phase: 0, subject: [], first: 1, answer: null, countersubject: [], free: {}, touched: {}, lengths: { episode1: 2, episode2: 2, close: 2 } };
}

/** The bar in quarters ("6/8" = 3). */
export function barQuarters(time: string): number {
  const [n, d] = time.split("/").map(Number);
  return (n * 4) / d;
}

export const tonicOf = (key: string) => key[0].toUpperCase() + key.slice(1);
export const modeOf = (key: string): "major" | "minor" => (isMinor(key) ? "minor" : "major");

/** The dominant key: V in major, v in minor (the key of the answer). */
export function dominantOf(key: string): string {
  const d = transpose(`${tonicOf(key)}4`, 4, 7).replace(/-?\d+$/, "");
  return isMinor(key) ? d[0].toLowerCase() + d.slice(1) : d;
}

/** The relative key: the minor a third below a major key, the major a third above a minor one. */
export function relativeOf(key: string): string {
  if (isMinor(key)) return transpose(`${tonicOf(key)}4`, 2, 3).replace(/-?\d+$/, "");
  const r = transpose(`${tonicOf(key)}4`, -2, -3).replace(/-?\d+$/, "");
  return r[0].toLowerCase() + r.slice(1);
}

/** Events laid end to end from `start`: the notes (rests dropped). */
export function toNotes(evs: Ev[], start = 0): WtcNote[] {
  const out: WtcNote[] = [];
  let t = start;
  for (const e of evs) {
    if (e.pitch) out.push({ pitch: e.pitch, at: t, dur: e.dur });
    t += e.dur;
  }
  return out;
}

export const lengthOf = (evs: Ev[]) => evs.reduce((a, e) => a + e.dur, 0);

/** Notes in quarters to the analysis's ticks. */
export const toTicks = (ns: WtcNote[]): Note[] => ns.map((n) => ({ on: Math.round(n.at * TPQ), dur: Math.round(n.dur * TPQ), pitch: n.pitch }));

/** A pitch moved by octaves. */
export function octave(p: string, k: number): string {
  const x = parsePitch(p);
  return `${p.replace(/-?\d+$/, "")}${x.octave + k}`;
}

/** The key signature's accidental for a letter, as text. */
export function withSignature(step: Step, key: string, oct: number): string {
  const a = keySignature(key)[step];
  return `${step}${a > 0 ? "#".repeat(a) : "b".repeat(-a)}${oct}`;
}

const LETTERS = "CDEFGAB";
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10];

/**
 * A pitch's place in a key: its degree (0-6) and alteration against the key's scale. In minor the
 * sixth and seventh are read against the melodic minor's raised forms when raised, so that the
 * leading note is a degree of the key (alteration 0, `raised` true), not a chromatic note.
 */
export function place(p: string, key: string): { deg: number; alter: number; octave: number; raised: boolean } {
  const tonic = parsePitch(`${tonicOf(key)}4`);
  const x = parsePitch(p);
  const rel = x.diatonic - tonic.diatonic;
  const deg = ((rel % 7) + 7) % 7;
  const scale = modeOf(key) === "major" ? MAJOR : NATURAL_MINOR;
  let alter = ((((x.midi - tonic.midi) % 12) + 12) % 12) - scale[deg];
  if (alter > 6) alter -= 12;
  if (alter < -6) alter += 12;
  let raised = false;
  if (modeOf(key) === "minor" && (deg === 5 || deg === 6) && alter === 1) {
    alter = 0;
    raised = true;
  }
  return { deg, alter, octave: Math.floor(rel / 7), raised };
}

/** The pitch at a place in a key (the inverse of `place`), the octave counted from the tonic's in octave 4. */
export function atPlace(pl: { deg: number; alter: number; octave: number; raised: boolean }, key: string): string {
  const tonic = parsePitch(`${tonicOf(key)}4`);
  const d = tonic.diatonic + pl.octave * 7 + pl.deg;
  const letter = LETTERS[((d % 7) + 7) % 7];
  const oct = Math.floor(d / 7);
  const scale = modeOf(key) === "major" ? MAJOR : NATURAL_MINOR;
  const semis = tonic.midi + pl.octave * 12 + scale[pl.deg] + pl.alter + (pl.raised ? 1 : 0);
  const natural = 12 * (oct + 1) + [0, 2, 4, 5, 7, 9, 11][LETTERS.indexOf(letter)];
  const alter = semis - natural;
  if (Math.abs(alter) > 2) throw new Error(`cannot spell degree ${pl.deg} in ${key}`);
  return `${letter}${alter > 0 ? "#".repeat(alter) : "b".repeat(-alter)}${oct}`;
}

/**
 * A line carried into another key degree by degree, as Bach carries a subject into a related key:
 * each note keeps its degree, and its chromatic alteration against the scale. Between modes the
 * sixth and seventh follow the new key: a minor subject's raised leading note becomes the major
 * key's leading note, and a major subject's leading note the minor key's raised seventh.
 * `octaves` moves the result, and the tonics are taken in the same octave (relative keys: the
 * major's tonic a third above the minor's).
 */
export function toKey(ns: WtcNote[], from: string, to: string, octaves = 0): WtcNote[] {
  // The target tonic nearest the source's: the relative major a third up, the relative minor a third down.
  const diff = parsePitch(`${tonicOf(to)}4`).diatonic - parsePitch(`${tonicOf(from)}4`).diatonic;
  const correction = diff > 3 ? -1 : diff < -3 ? 1 : 0;
  return ns.map((n) => {
    const pl = place(n.pitch, from);
    let raised = pl.raised;
    if (modeOf(from) === "major" && modeOf(to) === "minor" && pl.deg === 6 && pl.alter === 0) raised = true;
    if (modeOf(from) === "minor" && modeOf(to) === "major" && (pl.deg === 5 || pl.deg === 6)) raised = false;
    return { ...n, pitch: atPlace({ ...pl, raised, octave: pl.octave + octaves + correction }, to) };
  });
}

/** Spelled transposition by a number of letters and semitones (re-exported for the steps). */
export { transpose };
