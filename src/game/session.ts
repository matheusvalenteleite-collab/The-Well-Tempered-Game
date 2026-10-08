/**
 * Editing state for one first-species exercise: the player's (Josephus's) counterpoint,
 * one optional note per cantus column. Pure functions; the UI holds the state.
 */
import { parsePitch, type Step } from "../music/pitch.ts";
import { createPlayerSolution, playerNote, type PlayerSolution } from "../music/fux/player.ts";
import type { Exercise } from "../music/fux/types.ts";

export type Accidental = -1 | 0 | 1;

export interface SessionState {
  /** Spelled pitch per column, or null when empty. */
  notes: (string | null)[];
  selected: number;
  /** Accidental applied to the next placement (the accidental control). */
  accidental: Accidental;
  /** The note the player wrote most recently (any bar), or null. */
  lastWritten: string | null;
}

const STEPS: Step[] = ["C", "D", "E", "F", "G", "A", "B"];
const SUFFIX: Record<Accidental, string> = { [-1]: "b", 0: "", 1: "#" };

export function initialState(columns: number): SessionState {
  if (columns < 2) throw new Error("exercise needs at least two columns");
  return { notes: Array(columns).fill(null), selected: 0, accidental: 0, lastWritten: null };
}

const withAlter = (natural: string, acc: Accidental) => {
  const p = parsePitch(natural);
  return `${p.step}${SUFFIX[acc]}${p.octave}`;
};

const naturalOf = (pitch: string) => {
  const p = parsePitch(pitch);
  return `${p.step}${p.octave}`;
};

/** Place or replace the note in `column` with a natural pitch, applying the pending accidental. */
export function place(s: SessionState, column: number, natural: string): SessionState {
  if (column < 0 || column >= s.notes.length) throw new Error(`column ${column} out of range`);
  const notes = [...s.notes];
  notes[column] = withAlter(natural, s.accidental);
  return { ...s, notes, selected: column, accidental: 0, lastWritten: notes[column] };
}

export function clear(s: SessionState, column = s.selected): SessionState {
  const notes = [...s.notes];
  notes[column] = null;
  return { ...s, notes };
}

export function select(s: SessionState, column: number): SessionState {
  return { ...s, selected: Math.max(0, Math.min(s.notes.length - 1, column)) };
}

/**
 * Move the selected note by diatonic steps (accidental dropped). An empty column first receives
 * the note the player wrote last (with its accidental), or `start` if nothing has been written yet.
 */
export function stepNote(s: SessionState, delta: number, start: string): SessionState {
  const cur = s.notes[s.selected];
  if (cur === null) {
    const notes = [...s.notes];
    notes[s.selected] = s.lastWritten ?? start;
    return { ...s, notes, accidental: 0, lastWritten: notes[s.selected] };
  }
  const d = parsePitch(cur).diatonic + delta;
  const natural = `${STEPS[((d % 7) + 7) % 7]}${Math.floor(d / 7)}`;
  return place({ ...s, accidental: 0 }, s.selected, natural);
}

/** Set the note to the given letter, in the octave nearest to the reference pitch. */
export function letterNote(s: SessionState, letter: Step, reference: string): SessionState {
  const ref = parsePitch(reference).diatonic;
  let best = "";
  let dist = Infinity;
  for (const oct of [-1, 0, 1].map((k) => Math.floor(ref / 7) + k)) {
    const d = 7 * oct + STEPS.indexOf(letter);
    if (Math.abs(d - ref) < dist) {
      dist = Math.abs(d - ref);
      best = `${letter}${oct}`;
    }
  }
  return place(s, s.selected, best);
}

/**
 * The accidental control: with a note in the selected column, alter that note
 * (pressing the same accidental again restores the natural); otherwise arm it for the next placement.
 */
export function applyAccidental(s: SessionState, acc: Accidental): SessionState {
  const cur = s.notes[s.selected];
  if (cur === null) return { ...s, accidental: s.accidental === acc ? 0 : acc };
  const alter = parsePitch(cur).alter;
  const notes = [...s.notes];
  notes[s.selected] = withAlter(naturalOf(cur), alter === acc ? 0 : acc);
  return { ...s, notes, lastWritten: notes[s.selected] };
}

export function isComplete(s: SessionState): boolean {
  return s.notes.every((n) => n !== null);
}

/** The player's counterpoint in the shared player_solution representation. */
export function toPlayerSolution(s: SessionState, exercise: Exercise, now = new Date()): PlayerSolution {
  const sol = createPlayerSolution(exercise, now);
  sol.notes = s.notes.flatMap((p, k) => (p === null ? [] : [playerNote(p, `${k}/1`, "1/1")]));
  return sol;
}
