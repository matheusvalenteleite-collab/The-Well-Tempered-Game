/**
 * Judging one voice (D160; D166; D167). A note is played by a tap within a window around its onset
 * that fits it (EASY: any tap; NORMAL: a tap on its row or the next: rows.ts); a long note (a quarter or more) wants the thumb
 * held: let go early and it stops sounding and scores half. Two levels (D166): EASY, the time only
 * (a tap anywhere) on the main notes, the short notes riding along after a hit; NORMAL, every note,
 * each on its row. A chord within a voice is struck whole. Pure: ticks in, states out.
 */
export type NoteState = "pending" | "hit" | "miss";

export type Level = "easy" | "normal";
export const LEVELS: Level[] = ["easy", "normal"];

export interface LaneNote {
  on: number;
  dur: number;
  midi: number;
  /** The note's staff step (letter and octave, 7 to the octave). */
  step: number;
  long: boolean;
  state: NoteState;
  /** Tick of the hit or the miss (for the shine and the shake). */
  at?: number;
  /** Tick the thumb let go of a hit note, if before its end. */
  off?: number;
  /** The voice. */
  voice?: number;
  /** EASY: a short note that plays by itself after a hit, and does not score (D166). */
  ride?: boolean;
}

export interface LaneOptions {
  /** How far around the onset a tap counts, in ticks. */
  early: number;
  late: number;
  /** Of a long note, the part that must be held for a full point. */
  hold: number;
}

export function options(tpq: number, bpm: number, level: Level): LaneOptions {
  const perMs = (tpq * bpm) / 60000;
  const ms = level === "easy" ? 250 : 200;
  return { early: ms * perMs, late: ms * perMs, hold: 0.6 };
}

export function laneNotes(notes: readonly (readonly [number, number, number, number])[], beat: number, voice: number): LaneNote[] {
  return notes.map(([on, dur, midi, step]) => ({ on, dur, midi, step, long: dur >= beat, state: "pending", voice }));
}

/**
 * EASY: a note shorter than half a beat rides along (D166) when a note the player taps comes no more
 * than a beat before it; a short note with none before it (the subject's head) is tapped. Notes struck
 * together ride or are tapped together (D168: a prelude's hand strikes a quick note with a long one).
 */
export function markRides(notes: LaneNote[], beat: number) {
  let last: number | null = null;
  const onsets = [...new Set(notes.map((n) => n.on))].sort((a, b) => a - b);
  for (const on of onsets) {
    const chord = notes.filter((n) => n.on === on);
    const ride = chord.every((n) => n.dur < beat / 2) && last !== null && on - last <= beat;
    for (const n of chord) n.ride = ride;
    if (!ride) last = on;
  }
}

/** The notes struck together with note i (D165: the final chords put two notes in one voice). */
export function chordOf(notes: readonly LaneNote[], i: number): number[] {
  const out: number[] = [];
  notes.forEach((n, j) => n.on === notes[i].on && out.push(j));
  return out;
}

/**
 * A tap at tick t. Returns the index of the note it plays, or -1: the pending scoring note nearest in
 * time within the window that `ok` accepts. A chord is struck whole.
 */
export function strike(notes: LaneNote[], t: number, o: LaneOptions, ok: (i: number) => boolean = () => true): number {
  let best = -1;
  let bestCost = Infinity;
  notes.forEach((n, i) => {
    if (n.state !== "pending" || n.ride || t < n.on - o.early || t > n.on + o.late || !ok(i)) return;
    const cost = Math.abs(t - n.on);
    if (cost < bestCost) (best = i), (bestCost = cost);
  });
  if (best >= 0) for (const j of chordOf(notes, best)) if (notes[j].state === "pending") Object.assign(notes[j], { state: "hit", at: t });
  return best;
}

/** The thumb leaves a note it was playing at tick t. */
export function release(notes: LaneNote[], i: number, t: number) {
  const n = notes[i];
  if (n && n.state === "hit" && t < n.on + n.dur && n.off === undefined) n.off = t;
}

/** Scoring notes whose window has passed unplayed become misses. Returns how many. */
export function sweep(notes: LaneNote[], now: number, o: LaneOptions): number {
  let missed = 0;
  for (const n of notes)
    if (n.state === "pending" && !n.ride && now > n.on + o.late) {
      Object.assign(n, { state: "miss", at: now });
      missed++;
    }
  return missed;
}

/** A long note held long enough. */
export function heldEnough(n: LaneNote, o: LaneOptions): boolean {
  return !n.long || n.off === undefined || n.off - n.on >= o.hold * n.dur;
}

/** Points: a note hit is one, a long note let go too early a half; riding notes do not count. */
export function points(notes: readonly LaneNote[], o: LaneOptions): { got: number; of: number } {
  let got = 0;
  let of = 0;
  for (const n of notes) {
    if (n.ride) continue;
    of++;
    if (n.state === "hit") got += heldEnough(n, o) ? 1 : 0.5;
  }
  return { got, of };
}
