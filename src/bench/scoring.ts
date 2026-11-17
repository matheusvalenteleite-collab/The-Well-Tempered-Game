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
 *   THE CROWD, how you are playing now: it listens to roughly the last several seconds (D860: seconds,
 *     not notes; a wrong note counts against you less than a note let go by), and leaves only when that
 *     stays poor.
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
 * THE CROWD: a running average of the notes' outcomes (a right note 1, a GOOD a little less, a wrong note
 * WRONG_WORTH, a note let go by 0; a tap on no note STRAY_WORTH). The meter shows it between LEAVE (empty:
 * the crowd leaves) and FULL. A prelude's crowd is more patient (D259).
 *
 * D860, THE CROWD LISTENS IN SECONDS, NOT NOTES. D445's average was over the last 12 notes, so its patience
 * was a count of notes: about eight notes let go by emptied a full crowd, which in a concerto's solo line
 * (five to eight notes a second) is a slip of one or two seconds, and in a slow fugue six or more. Now each
 * outcome counts for the time it stands for (its span: the seconds since the last outcome heard, at most
 * SPAN_MAX_S, so a rest is neither praised nor blamed), and the average forgets with a time constant of
 * CROWD_MEMORY_S seconds, whatever the density: from a full crowd it leaves after about
 * six seconds of nothing right (about nine of nothing but wrong notes), never after a two- or three-second
 * slip. It never empties in the round's first GRACE_S seconds.
 */
export const CROWD_MEMORY_S = 10;
export const SPAN_MAX_S = 1;
/** D860: the seconds a tap on no note (or a rest held through) and a right note taken back stand for: they come between the notes' own spans. */
export const STRAY_SPAN_S = 0.15;
export const REVOKED_SPAN_S = 0.25;
export const CROWD_FULL = 0.92;
export const CROWD_LEAVE = 0.5;
export const CROWD_LEAVE_PRELUDE = 0.42;
export const CROWD_START_LEVEL = 0.8;
export const GOOD_WORTH = 0.9;
export const WRONG_WORTH = 0.2;
export const STRAY_WORTH = 0.3;
export const GRACE_S = 3;

export class Crowd {
  /** The running average, 0..1. */
  level = CROWD_START_LEVEL;
  /** The seconds heard so far (the spans' sum). */
  private seen = 0;
  private lastAt: number | null = null;
  private readonly leave: number;
  /** D862/D860: `hands` kept for TWO HANDS' callers; on D860's clock two hands' outcomes share the seconds, so it changes nothing. */
  constructor(leave = CROWD_LEAVE, _hands = 1) {
    this.leave = leave;
  }
  /**
   * D860: an outcome (0..1) heard at `at` (seconds, the music's clock). Without `span` it stands for the
   * time since the last outcome so heard (at most SPAN_MAX_S; the round's first, SPAN_MAX_S); with it, for
   * that many seconds, the clock left alone (a fault between the notes).
   */
  hear(worth: number, at: number, span?: number) {
    let s = span;
    if (s === undefined) {
      s = this.lastAt === null ? SPAN_MAX_S : Math.max(0, Math.min(SPAN_MAX_S, at - this.lastAt));
      this.lastAt = this.lastAt === null ? at : Math.max(this.lastAt, at);
    }
    this.level += (worth - this.level) * (1 - Math.exp(-s / CROWD_MEMORY_S));
    this.seen += s;
  }
  /** The meter, 0 (leaving) to 1 (full); in the round's first seconds never quite empty. */
  meter(): number {
    const m = Math.max(0, Math.min(1, (this.level - this.leave) / (CROWD_FULL - this.leave)));
    return this.seen < GRACE_S ? Math.max(0.05, m) : m;
  }
}
