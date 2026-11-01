/**
 * D445, THE SCORING REDESIGNED (the owner, 1 Nov 2026, on the scoring audit, docs/scoring/AUDIT.html: "go
 * with the full redesign"). Three numbers, each with one job:
 *
 *   THE PERFORMANCE, how well you played, 0–100: notes right 60, timing 15, touch and the reading's signs
 *     15, the subject's entries 10 (each entry by the share of its notes right: no all-or-nothing). The
 *     grade follows from it alone (S 95, A 90, B 80, C 70, D below), one rounding everywhere.
 *   THE SCORE, for bragging: each note's points (PERFECT 2, GOOD 1) and the touch, the held notes (once),
 *     the entries (by their share) and the cadences, each times the STREAK BONUS (+10% every 16 right notes
 *     in a row, up to +50%; a slip takes one step off); the final is the points times the performance.
 *   THE CROWD, how you are playing now: it listens to roughly the last dozen notes (a wrong note counts
 *     against you less than a note let go by), and leaves only when that stays poor.
 *
 * Pure numbers here; the engine (proto-game.ts) and the sheet (score-sheet.ts) use them.
 */

/** Right notes in a row for each step of the streak bonus. */
export const STREAK_STEP_NOTES = 16;
/** Each step's bonus on the points, and the steps at most (+50%). */
export const STREAK_STEP = 0.1;
export const STREAK_STEPS = 5;
/** The points' factor at a streak level (0..STREAK_STEPS). */
export const streakFactor = (level: number) => 1 + STREAK_STEP * Math.max(0, Math.min(STREAK_STEPS, level));

/** The performance's parts and their weights (out of 100; a part with nothing to judge is left out, the others scaled up). */
export const PERFORMANCE_WEIGHTS = { notes: 60, timing: 15, touch: 15, entries: 10 } as const;
/** A GOOD's worth in TIMING (a PERFECT is 1). */
export const GOOD_TIMING = 0.75;

/** The grade from the performance (rounded once, as shown). */
export function gradeFor(performance: number): string {
  const p = Math.round(performance);
  return p >= 95 ? "S" : p >= 90 ? "A" : p >= 80 ? "B" : p >= 70 ? "C" : "D";
}

/**
 * THE CROWD: a running average of the notes' outcomes over about CROWD_MEMORY notes (a right note 1, a
 * GOOD a little less, a wrong note WRONG_WORTH, a note let go by 0; a tap on no note half a note at
 * STRAY_WORTH). The meter shows it between LEAVE (empty: the crowd leaves) and FULL; it never empties in
 * the first GRACE_NOTES notes of a round. A prelude's crowd is more patient (D259).
 */
export const CROWD_MEMORY = 12;
export const CROWD_FULL = 0.92;
export const CROWD_LEAVE = 0.5;
export const CROWD_LEAVE_PRELUDE = 0.42;
export const CROWD_START_LEVEL = 0.8;
export const GOOD_WORTH = 0.9;
export const WRONG_WORTH = 0.2;
export const STRAY_WORTH = 0.3;
export const GRACE_NOTES = 8;

export class Crowd {
  /** The running average, 0..1. */
  level = CROWD_START_LEVEL;
  private seen = 0;
  private readonly leave: number;
  constructor(leave = CROWD_LEAVE) {
    this.leave = leave;
  }
  /** A note's outcome (0..1), weighted (a stray tap half a note). */
  hear(worth: number, weight = 1) {
    this.level += ((worth - this.level) * weight) / CROWD_MEMORY;
    this.seen += weight;
  }
  /** The meter, 0 (leaving) to 1 (full); in the round's first notes never quite empty. */
  meter(): number {
    const m = Math.max(0, Math.min(1, (this.level - this.leave) / (CROWD_FULL - this.leave)));
    return this.seen < GRACE_NOTES ? Math.max(0.05, m) : m;
  }
}
