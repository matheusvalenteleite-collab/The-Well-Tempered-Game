/**
 * Editing state for one exercise: the player's (Josephus's) counterpoint, one optional entry per
 * slot of the layout (counterpoint/layout.ts): a spelled pitch, REST where a rest is allowed, or
 * null when empty. Pure functions; the UI holds the state.
 */
import { parsePitch, type Step } from "../music/pitch.ts";
import { createPlayerSolution, playerNote, type PlayerSolution } from "../music/fux/player.ts";
import type { Exercise } from "../music/fux/types.ts";
import { HOLD, REST, slotOffset, sounding, type Slot } from "../counterpoint/layout.ts";

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

/** A multiple of 1/8 as a reduced fraction ("1/2", "3/8"). */
const reduced = (x: number) => {
  let n = Math.round(x * 8);
  let d = 8;
  while (n % 2 === 0 && d > 1) {
    n /= 2;
    d /= 2;
  }
  return `${n}/${d}`;
};

/** The player's counterpoint in the shared player_solution representation. */
export function toPlayerSolution(s: SessionState, exercise: Exercise, layout: Slot[], now = new Date()): PlayerSolution {
  const sol = createPlayerSolution(exercise, now);
  const offset = (k: number) => {
    const x = slotOffset(layout[k]);
    return Number.isInteger(x) ? `${x}/1` : reduced(x);
  };
  // Fifth species: a HOLD lengthens the note before it (D82).
  const len = (d: string) => {
    const [a, b] = d.split("/").map(Number);
    return a / (b ?? 1);
  };
  const merged: { k: number; p: string; len: number }[] = [];
  s.notes.forEach((p, k) => {
    if (p === null) return;
    if (p === HOLD) {
      if (merged.length) merged[merged.length - 1].len += len(layout[k].duration);
      return;
    }
    merged.push({ k, p, len: len(layout[k].duration) });
  });
  const frac = (x: number) => (Number.isInteger(x) ? `${x}/1` : reduced(x));
  sol.notes = merged.map((m) => playerNote(m.p === REST ? null : m.p, offset(m.k), layout[m.k].duration === "1/8" ? frac(m.len) : layout[m.k].duration));
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

/**
 * Fifth species (D82): the note written at the selected slot lasts `n` slots (clipped at the end of
 * its bar): the following slots become HOLD, and what was left of the old note after them is
 * emptied (not silently lengthened).
 */
export function spanFromSelected(s: SessionState, layout: Slot[], n: number): SessionState {
  const k = s.selected;
  const notes = [...s.notes];
  let j = k + 1;
  while (j < k + n && j < layout.length && layout[j].bar === layout[k].bar && layout[k].duration === "1/8") notes[j++] = HOLD;
  while (j < notes.length && notes[j] === HOLD) notes[j++] = null;
  return { ...s, notes };
}

/** Fifth species: hold the note before the selected slot on, for `n` slots (over a bar line, the tie). */
export function holdSelected(s: SessionState, layout: Slot[], n: number): SessionState {
  const k = s.selected;
  if (k === 0 || s.notes[k - 1] === null) return s;
  return spanFromSelected({ ...s, notes: s.notes.map((x, i) => (i === k ? HOLD : x)) }, layout, n);
}

/** Fifth species: clear the note at the selected slot with its held continuation. */
export function clearSpan(s: SessionState): SessionState {
  const notes = [...s.notes];
  let k = s.selected;
  while (k > 0 && notes[k] === HOLD) k--;
  notes[k] = null;
  for (let j = k + 1; notes[j] === HOLD; j++) notes[j] = null;
  return { ...s, notes, selected: k };
}

/** Fifth species: the slot where the note covering slot k begins. */
export function onsetOf(notes: (string | null)[], k: number): number {
  let j = k;
  while (j > 0 && notes[j] === HOLD) j--;
  return j;
}
