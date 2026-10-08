/**
 * The player's counterpoint, kept strictly separate from Fux's `original_solution`.
 *
 * A player solution is judged later by counterpoint rules on its own terms; matching Fux is
 * never required. `compareWithOriginal` exists only for informational feedback ("Fux chose
 * a different note here"), not for grading.
 */
import { parsePitch } from "../pitch.ts";
import type { Exercise, Note, OriginalSolution, Rational, Species, Staff, TieState } from "./types.ts";

export interface PlayerNote {
  /** Spelled pitch in scientific pitch notation (e.g. "Bb3"), or null for a rest. */
  pitch: string | null;
  midi: number | null;
  rest: boolean;
  duration: Rational;
  offset: Rational;
  measure: number;
  beat: Rational;
  tie: TieState;
}

export interface PlayerSolution {
  kind: "player_solution";
  exercise_id: string;
  cf_id: string;
  species: Species;
  counterpoint_voice: Staff;
  /** Ordered, non-overlapping notes of the player's voice. */
  notes: PlayerNote[];
  status: "draft" | "submitted";
  created_at: string;
  updated_at: string;
}

export interface ComparisonPoint {
  offset: Rational;
  measure: number;
  player: string | null;
  original: string | null;
  same_onset: boolean;
  same_pitch: boolean;
}

/** Informational only; never a pass/fail criterion. */
export interface OriginalComparison {
  informational: true;
  exercise_id: string;
  points: ComparisonPoint[];
  identical: boolean;
}

export { parsePitch } from "../pitch.ts";

export function parseRational(r: Rational): [number, number] {
  const [n, d] = r.split("/").map(Number);
  if (!Number.isInteger(n) || !Number.isInteger(d) || d <= 0) throw new Error(`invalid rational ${r}`);
  return [n, d];
}

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

export function addRational(a: Rational, b: Rational): Rational {
  const [an, ad] = parseRational(a);
  const [bn, bd] = parseRational(b);
  const n = an * bd + bn * ad;
  const d = ad * bd;
  const g = gcd(n, d) || 1;
  return `${n / g}/${d / g}`;
}

export function compareRational(a: Rational, b: Rational): number {
  const [an, ad] = parseRational(a);
  const [bn, bd] = parseRational(b);
  return an * bd - bn * ad;
}

export function createPlayerSolution(exercise: Exercise, now: Date = new Date()): PlayerSolution {
  const ts = now.toISOString();
  return {
    kind: "player_solution",
    exercise_id: exercise.id,
    cf_id: exercise.cantus_firmus.cf_id,
    species: exercise.species,
    counterpoint_voice: exercise.counterpoint_voice,
    notes: [],
    status: "draft",
    created_at: ts,
    updated_at: ts,
  };
}

/** Build a player note from a spelled pitch (or null for a rest) at a given onset. */
export function playerNote(pitch: string | null, offset: Rational, duration: Rational, tie: TieState = null): PlayerNote {
  const [n, d] = parseRational(offset);
  const measure = Math.floor(n / d) + 1;
  const beat = addRational(offset, `${-(measure - 1)}/1`);
  return {
    pitch,
    midi: pitch === null ? null : parsePitch(pitch).midi,
    rest: pitch === null,
    duration,
    offset,
    measure,
    beat,
    tie,
  };
}

/** Structural problems only (not counterpoint rules): overlaps, gaps, overflow, bad pitches. */
export function structuralProblems(solution: PlayerSolution, exercise: Exercise): string[] {
  const problems: string[] = [];
  let cursor: Rational = "0/1";
  const end: Rational = `${exercise.measures}/1`;
  for (const [k, n] of solution.notes.entries()) {
    if (compareRational(n.offset, cursor) < 0) problems.push(`note ${k} overlaps the previous note`);
    if (compareRational(n.offset, cursor) > 0) problems.push(`gap before note ${k} at ${n.offset}`);
    if (!n.rest && n.pitch !== null && parsePitch(n.pitch).midi !== n.midi) problems.push(`note ${k}: midi does not match ${n.pitch}`);
    cursor = addRational(n.offset, n.duration);
  }
  if (compareRational(cursor, end) > 0) problems.push(`voice runs past the final bar (${cursor} > ${end})`);
  return problems;
}

export function isComplete(solution: PlayerSolution, exercise: Exercise): boolean {
  if (solution.notes.length === 0) return false;
  const last = solution.notes[solution.notes.length - 1];
  return structuralProblems(solution, exercise).length === 0 && compareRational(addRational(last.offset, last.duration), `${exercise.measures}/1`) === 0;
}

/** Onset-by-onset comparison with Fux's solution — for feedback only, never for grading. */
export function compareWithOriginal(player: PlayerSolution, original: OriginalSolution): OriginalComparison {
  if (player.exercise_id !== original.exercise_id) throw new Error("solutions belong to different exercises");
  const byOnset = (notes: (PlayerNote | Note)[]) => new Map(notes.filter((n) => n.tie !== "stop" && n.tie !== "continue").map((n) => [n.offset, n]));
  const p = byOnset(player.notes);
  const o = byOnset(original.counterpoint.notes);
  const onsets = [...new Set([...p.keys(), ...o.keys()])].sort(compareRational);
  const points = onsets.map((offset) => {
    const pn = p.get(offset);
    const on = o.get(offset);
    return {
      offset,
      measure: (pn ?? on)!.measure,
      player: pn ? pn.pitch : null,
      original: on ? on.pitch : null,
      same_onset: pn !== undefined && on !== undefined,
      same_pitch: pn !== undefined && on !== undefined && pn.pitch === on.pitch,
    };
  });
  return { informational: true, exercise_id: player.exercise_id, points, identical: points.every((x) => x.same_pitch) };
}
