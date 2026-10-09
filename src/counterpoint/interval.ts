/**
 * Interval arithmetic. Quality is derived from diatonic (generic) size plus semitone count,
 * never from semitones alone: C4-E4 is a M3, C4-Fb4 a d4, B#3-E4 a d4, C4-D#4 an A2.
 */
import { parsePitch, type SpelledPitch } from "../music/pitch.ts";

export type Quality = "P" | "M" | "m" | "A" | "d" | "AA" | "dd";

export interface Interval {
  /** Source-style name, compound kept compound: "P5", "M10", "P12". */
  name: string;
  quality: Quality;
  /** Generic size, 1-based, compound (unison = 1, octave = 8, tenth = 10). */
  number: number;
  /** Generic size reduced to 1..7 (octaves and unisons both reduce to 1). */
  simple: number;
  /** Absolute semitone distance. */
  semitones: number;
  /** For melodic intervals: direction of the second pitch relative to the first. */
  direction: "up" | "down" | "none";
}

const PERFECT_CLASSES = new Set([1, 4, 5]); // unison/octave, fourth, fifth (simple sizes)
const MAJOR_SEMITONES: Record<number, number> = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };

const asPitch = (p: SpelledPitch | string): SpelledPitch => (typeof p === "string" ? parsePitch(p) : p);

/** Interval from `from` to `to` (melodic order). Size and quality are direction-independent. */
export function interval(fromP: SpelledPitch | string, toP: SpelledPitch | string): Interval {
  const a = asPitch(fromP);
  const b = asPitch(toP);
  // Lower and upper by diatonic position; for equal positions, by semitones (e.g. F4 -> F#4).
  const aLower = a.diatonic < b.diatonic || (a.diatonic === b.diatonic && a.midi <= b.midi);
  const [lo, hi] = aLower ? [a, b] : [b, a];
  const steps = hi.diatonic - lo.diatonic;
  const semitones = hi.midi - lo.midi;
  const octaves = Math.floor(steps / 7);
  const simple = (steps % 7) + 1;
  const deviation = semitones - 12 * octaves - MAJOR_SEMITONES[simple];
  let quality: Quality | undefined;
  if (PERFECT_CLASSES.has(simple)) {
    quality = ({ 0: "P", 1: "A", 2: "AA", [-1]: "d", [-2]: "dd" } as Record<number, Quality>)[deviation];
  } else {
    quality = ({ 0: "M", [-1]: "m", 1: "A", 2: "AA", [-2]: "d", [-3]: "dd" } as Record<number, Quality>)[deviation];
  }
  if (quality === undefined) throw new Error(`cannot name the interval ${a.name} -> ${b.name}`);
  const direction = a.diatonic === b.diatonic && a.midi === b.midi ? "none" : b.diatonic > a.diatonic || (b.diatonic === a.diatonic && b.midi > a.midi) ? "up" : "down";
  return { name: `${quality}${steps + 1}`, quality, number: steps + 1, simple, semitones: Math.abs(semitones), direction };
}

/** Harmonic interval between two simultaneous pitches (order irrelevant). */
export function harmonic(a: SpelledPitch | string, b: SpelledPitch | string): Interval {
  return { ...interval(a, b), direction: "none" };
}

/** Is `a` sounding above `b`? (diatonic position first, then semitones) */
export function isAbove(a: SpelledPitch | string, b: SpelledPitch | string): boolean {
  const x = asPitch(a);
  const y = asPitch(b);
  return x.diatonic > y.diatonic || (x.diatonic === y.diatonic && x.midi > y.midi);
}

/** Perfect consonances: unison, fifth, octave and their compounds. */
export function isPerfectConsonance(i: Interval): boolean {
  return i.quality === "P" && (i.simple === 1 || i.simple === 5);
}

/** Imperfect consonances: major and minor thirds and sixths and their compounds. */
export function isImperfectConsonance(i: Interval): boolean {
  return (i.quality === "M" || i.quality === "m") && (i.simple === 3 || i.simple === 6);
}

/** Consonance in two-voice counterpoint; the fourth (P4, P11 ...) is a dissonance. */
export function isConsonant(i: Interval): boolean {
  return isPerfectConsonance(i) || isImperfectConsonance(i);
}

/** Exact unison (not an octave). */
export function isUnison(i: Interval): boolean {
  return i.number === 1 && i.quality === "P";
}

/** Unison or octave (any compound). */
export function isOctaveClass(i: Interval): boolean {
  return i.quality === "P" && i.simple === 1;
}

export type Motion = "contrary" | "similar" | "parallel" | "oblique" | "none";

/**
 * Relative motion of two voices (a, b) between two successive sonorities (0 -> 1).
 * "parallel" is similar motion that keeps the same harmonic interval name (P5 -> P5, M3 -> M3);
 * a compound-equivalent pair (P5 -> P12) is reported as "similar".
 */
export function motion(a0: string, b0: string, a1: string, b1: string): Motion {
  const d = (x: string, y: string) => {
    const i = interval(x, y);
    return i.direction === "up" ? 1 : i.direction === "down" ? -1 : 0;
  };
  const dl = d(a0, a1);
  const du = d(b0, b1);
  if (dl === 0 && du === 0) return "none";
  if (dl === 0 || du === 0) return "oblique";
  if (dl !== du) return "contrary";
  return harmonic(a0, b0).name === harmonic(a1, b1).name ? "parallel" : "similar";
}

/** A leap is any melodic interval larger than a second. */
export function isLeap(i: Interval): boolean {
  return i.number >= 3;
}

/**
 * Display name with compound intervals reduced to their simple forms (m10 -> m3, 12 -> 5),
 * keeping the octave as 8 (15 -> 8) and the unison as 1. Perfect intervals carry no "P" (owner):
 * a quality is written only where it tells something (M, m, A, d).
 */
export function simpleName(i: Interval): string {
  const reduced = i.number <= 8 ? i.number : ((i.number - 1) % 7) + 1 === 1 ? 8 : ((i.number - 1) % 7) + 1;
  return `${i.quality === "P" ? "" : i.quality}${reduced}`;
}
