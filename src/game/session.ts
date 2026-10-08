/**
 * Editing state for one exercise: the player's (Josephus's) counterpoint, one optional entry per
 * slot of the layout (counterpoint/layout.ts): a spelled pitch, REST where a rest is allowed, or
 * null when empty. Pure functions; the UI holds the state.
 */
import { parsePitch, type Step } from "../music/pitch.ts";
import { createPlayerSolution, playerNote, type PlayerSolution } from "../music/fux/player.ts";
import type { Exercise } from "../music/fux/types.ts";
import { REST, slotOffset, sounding, type Slot } from "../counterpoint/layout.ts";

export type Accidental = -1 | 0 | 1;

export interface SessionState {
  /** Spelled pitch (or REST) per slot, or null when empty. */
  notes: (string | null)[];
  selected: number;
  /** Accidental applied to the next placement (the accidental control); null = as the key signature has it. */
  accidental: Accidental | null;
  /** Key signature: the alteration a plain letter takes (F-mode exercises: B♭, decision D48). */
  signature: Partial<Record<Step, Accidental>>;
  /** The note the player wrote most recently (any bar), or null. */
  lastWritten: string | null;
}

const STEPS: Step[] = ["C", "D", "E", "F", "G", "A", "B"];
const SUFFIX: Record<Accidental, string> = { [-1]: "b", 0: "", 1: "#" };

export function initialState(columns: number, signature: Partial<Record<Step, Accidental>> = {}): SessionState {
  if (columns < 2) throw new Error("exercise needs at least two slots");
  return { notes: Array(columns).fill(null), selected: 0, accidental: null, lastWritten: null, signature };
}

/** The letter of `natural` with the accidental given, or (null) with the key signature's. */
const withAlter = (natural: string, acc: Accidental | null, signature: SessionState["signature"] = {}) => {
  const p = parsePitch(natural);
  return `${p.step}${SUFFIX[acc ?? signature[p.step] ?? 0]}${p.octave}`;
};

const naturalOf = (pitch: string) => {
  const p = parsePitch(pitch);
  return `${p.step}${p.octave}`;
};

/** Place or replace the note in `column` with a natural pitch, applying the pending accidental. */
export function place(s: SessionState, column: number, natural: string): SessionState {
  if (column < 0 || column >= s.notes.length) throw new Error(`column ${column} out of range`);
  const notes = [...s.notes];
  notes[column] = withAlter(natural, s.accidental, s.signature);
  return { ...s, notes, selected: column, accidental: null, lastWritten: notes[column] };
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
  if (!sounding(cur)) {
    const notes = [...s.notes];
    notes[s.selected] = s.lastWritten ?? start;
    return { ...s, notes, accidental: null, lastWritten: notes[s.selected] };
  }
  const d = parsePitch(cur).diatonic + delta;
  const natural = `${STEPS[((d % 7) + 7) % 7]}${Math.floor(d / 7)}`;
  return place({ ...s, accidental: null }, s.selected, natural);
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
 * Repeat the previous slot's note in the selected slot, accidental included: in fourth species this
 * writes the tie (the same note on both sides of the bar line). Nothing happens after a rest or an empty slot.
 */
export function repeatPrevious(s: SessionState): SessionState {
  const prev = s.notes[s.selected - 1];
  if (!sounding(prev)) return s;
  const notes = [...s.notes];
  notes[s.selected] = prev;
  return { ...s, notes, accidental: null, lastWritten: prev };
}

/**
 * The accidental control: with a note in the selected column, alter that note
 * (pressing the same accidental again restores the key's default); otherwise arm it for the next placement.
 */
export function applyAccidental(s: SessionState, acc: Accidental): SessionState {
  const cur = s.notes[s.selected];
  if (!sounding(cur)) return { ...s, accidental: s.accidental === acc ? null : acc };
  const p = parsePitch(cur);
  const notes = [...s.notes];
  notes[s.selected] = withAlter(naturalOf(cur), p.alter === acc ? null : acc, s.signature);
  return { ...s, notes, lastWritten: notes[s.selected] };
}

export function isComplete(s: SessionState): boolean {
  return s.notes.every((n) => n !== null);
}

/** A rest in the selected slot, where the layout allows one; elsewhere nothing changes. */
export function setRest(s: SessionState, layout: Slot[]): SessionState {
  if (!layout[s.selected]?.restAllowed) return s;
  const notes = [...s.notes];
  notes[s.selected] = REST;
  return { ...s, notes };
}

/** The player's counterpoint in the shared player_solution representation. */
export function toPlayerSolution(s: SessionState, exercise: Exercise, layout: Slot[], now = new Date()): PlayerSolution {
  const sol = createPlayerSolution(exercise, now);
  const offset = (k: number) => {
    const x = slotOffset(layout[k]);
    return Number.isInteger(x) ? `${x}/1` : `${Math.round(x * 2)}/2`;
  };
  sol.notes = s.notes.flatMap((p, k) => (p === null ? [] : [playerNote(p === REST ? null : p, offset(k), layout[k].duration)]));
  return sol;
}

/**
 * Move the note of column `from` to column `to` at `natural` (computed from the drag start state).
 * A note dragged only sideways keeps its accidental; a change of staff position drops it.
 */
export function moveNote(base: SessionState, from: number, to: number, natural: string): SessionState {
  const orig = base.notes[from];
  if (!sounding(orig)) throw new Error(`no note to move in slot ${from}`);
  const notes = [...base.notes];
  notes[from] = null;
  notes[to] = naturalOf(orig) === natural ? orig : withAlter(natural, null, base.signature);
  return { ...base, notes, selected: to, accidental: null, lastWritten: notes[to] };
}
