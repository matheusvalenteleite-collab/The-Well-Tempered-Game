/**
 * Judging one thumb against one line (easy mode). The thumb's height is a pitch (a float); a note
 * is hit when the thumb is down within TOL semitones of it around its onset, and only a hit note
 * sounds. Short notes (under an eighth) ride along: the neighbour notes of the subject's head need
 * no gesture of their own, only a thumb held nearby. Pure: ticks in, events out.
 */
export type NoteState = "pending" | "hit" | "miss";

export interface JudgedNote {
  on: number;
  dur: number;
  midi: number;
  /** A short note that rides along in easy mode: it sounds if the thumb is nearby, and does not score. */
  ride: boolean;
  state: NoteState;
  /** When the hit was judged (ticks), for the shine; or the miss, for the shake. */
  at?: number;
}

export interface JudgeOptions {
  /** How far around the onset a hit counts, in ticks. */
  early: number;
  late: number;
  /** Semitones of tolerance for a scoring note, and for a riding one. */
  tol: number;
  rideTol: number;
}

/** Easy mode at a tempo: the windows in milliseconds turned into ticks. */
export function easyOptions(tpq: number, bpm: number): JudgeOptions {
  const perMs = (tpq * bpm) / 60000;
  return { early: 160 * perMs, late: 160 * perMs, tol: 1.5, rideTol: 3 };
}

export function judgedNotes(notes: readonly (readonly [number, number, number, ...unknown[]])[], tpq: number): JudgedNote[] {
  return notes.map(([on, dur, midi]) => ({ on, dur, midi, ride: dur < tpq / 2, state: "pending" }));
}

/** A note to sound: its index and the tick it starts at (its onset, or now if the thumb was late). */
export interface Sounding {
  index: number;
  start: number;
}

/**
 * One step of the judge at tick `now`, the thumb at pitch `cursor` (null: no thumb down). Mutates the
 * notes' states and returns the notes that start sounding.
 */
export function judge(notes: JudgedNote[], now: number, cursor: number | null, o: JudgeOptions): Sounding[] {
  const out: Sounding[] = [];
  notes.forEach((n, index) => {
    if (n.state !== "pending" || now < n.on - (n.ride ? 0 : o.early)) return;
    const near = cursor !== null && Math.abs(cursor - n.midi) <= (n.ride ? o.rideTol : o.tol);
    if (near) {
      n.state = "hit";
      n.at = now;
      out.push({ index, start: Math.max(n.on, now) });
    } else if (n.ride || now > n.on + o.late) {
      n.state = "miss";
      n.at = now;
    }
  });
  return out;
}

/** The scoring notes hit, of all the scoring notes. */
export function score(notes: readonly JudgedNote[]): { hit: number; of: number } {
  const scoring = notes.filter((n) => !n.ride);
  return { hit: scoring.filter((n) => n.state === "hit").length, of: scoring.length };
}

/** Semitones of room above and below a line's range, for the thumb and the box alike. */
export const MARGIN = 2;

/** The thumb's height in the play area (0 at the top, h at the bottom) as a pitch, over the range lo..hi with a margin. */
export function thumbPitch(y: number, h: number, lo: number, hi: number, margin = MARGIN): number {
  const top = hi + margin;
  const bottom = lo - margin;
  const f = Math.min(1, Math.max(0, y / Math.max(1, h)));
  return top - f * (top - bottom);
}
