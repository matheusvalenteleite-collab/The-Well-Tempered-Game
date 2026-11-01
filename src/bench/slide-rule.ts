/**
 * D486 (WTC 2.13+, no version bump): THE SLIDE, FORGIVING AND EXPLAINED. A held thumb moved on to the
 * next note plays it. The rule, in the player's words: "keep the thumb down and move it at least halfway
 * to the next note, the way the tune goes; arrive early and it waits for its time".
 *
 * Measured from the thumb's own frame, as a strike is (D296: where a note is drawn no longer bounds a
 * touch): the thumb's offset from the note it landed on (`off`, its landing minus that note's drawn
 * height) is kept while it slides, so the note slid from sits at `curY + off` and the next at
 * `nextY + off`. A slide has arrived once the thumb has travelled from `curY + off` toward the next note
 * at least `need` = max(SLIDE.minPx, SLIDE.share × the drawn interval). Before D486 (D376, Glenn's) a
 * slide had to come within 0.15 of a judging row (2.7 px at the 18 px floor) of the note's drawn height
 * itself: a thumb that had landed a few px off (right by the strike's rule) or stopped short slid nothing.
 *
 *  · or the block itself: within SLIDE.blockRows of the next note's drawn height, having moved half of minPx
 *    toward it (a thumb that landed a little off toward the next note, then slid onto its block);
 *  · the way: the drawn interval's (a same-row semitone, drawn a third of a row off, from the thumb);
 *  · too far: past the next note by more than max(SLIDE.farRows judging rows, the interval) at the moment it
 *    would sound (a fling, not a slide): it waits for the thumb to come back;
 *  · given up: an armed slide (waiting for its time, or for its confirmation) is dropped once the thumb comes
 *    back under SLIDE.backShare of `need` (a shake's return; an overshoot settling on the note keeps it);
 *  · tried: a move of SLIDE.tryShare of `need` toward the next note is a slide attempt: if it fails, the
 *    player is told why at the thumb (slideCue).
 * Pure, for the judge (proto-game.ts glennSlide) and the tests.
 */

export const SLIDE = {
  /** A slide arrives after this share of the drawn interval to the next note... */
  share: 0.5,
  /** ...and at least this many CSS px (a still thumb's jitter stays under about 2.3 px; D353). */
  minPx: 8,
  /** ...or on the next note's block as drawn (within this many judging rows), having moved at least half of minPx toward it. */
  blockRows: 0.25,
  /** Past the next note by more than this many judging rows (or the interval, if larger): too far. */
  farRows: 2,
  /** An armed slide is dropped once the thumb comes back under this share of `need`. */
  backShare: 0.6,
  /** A move toward the next note of this share of `need` is a slide attempt (its failure explained). */
  tryShare: 0.4,
  /** Arriving within this long (ms) after the note went by: TOO LATE. */
  lateMs: 450,
  /** Outside the slide phase, a slide sounds once the thumb has moved less than the shake's reach over this long (ms). */
  settleMs: 40,
  /** After a slide sounds, the thumb's follow-through (an overshoot settling) is read as no shake for this long (ms). */
  followMs: 160,
} as const;

/**
 * D488, THE SLIDE-IN: a thumb landing in a rest before the coming note (or before the first), away from its row,
 * may slide in to it: the same rule from where it landed (halfway there, or on its block), early waiting for the
 * note's time. A landing before the note's window opens (which would have been a STRAY), at least `minRows`
 * judging rows from its block, within `leadBeats` beats (at least `leadMs`) of it; or inside the early window, at
 * least `inWindowRows` from it, before the note's time: if that one does not slide in by the note's time (or
 * lifts first), it is struck from its landing, its time and place, exactly as before (the landing never costs a note).
 */
export const SLIDE_IN = {
  minRows: 0.75,
  /** Inside the note's early window a landing is a slide-in's only this far (judging rows) from its block; not slid in by the note's time, it is struck from its landing. */
  inWindowRows: 1.5,
  leadBeats: 2,
  leadMs: 1200,
} as const;

/** The cues a failed slide shows at the thumb (D486), in the game's words (tr: pt, es). */
export type SlideMiss = "short" | "far" | "early" | "late" | "lifted" | "oneway";
export const SLIDE_CUE: Record<SlideMiss, string> = {
  short: "FURTHER",
  far: "TOO FAR",
  early: "TOO EARLY",
  late: "TOO LATE",
  lifted: "LIFTED",
  oneway: "LIFT TO TURN",
};

export interface SlideReach {
  /** 1 up the screen (y falling), −1 down. */
  way: 1 | -1;
  /** The travel that arrives (px). */
  need: number;
  /** How far the thumb has come toward the next note from the note slid from, in its own frame (px; negative: the other way). */
  travel: number;
  arrived: boolean;
  /** Beyond the next note by more than the slack. */
  tooFar: boolean;
  /** Back under the armed slide's floor (backShare × need). */
  back: boolean;
  /** A slide attempt (tryShare × need, the right way). */
  tried: boolean;
}

/**
 * Where a held thumb at `y` stands for the slide from the note drawn at `curY` to the next drawn at
 * `nextY` (CSS y, down positive), its offset `off` (its landing minus the note it landed on), with a
 * judging row of `row` px.
 */
export function slideReach(o: { y: number; curY: number; nextY: number; off: number; row: number }): SlideReach {
  const from = o.curY + o.off;
  const interval = Math.abs(o.nextY - o.curY);
  // The way the drawn notes go; a same-row semitone (a third of a row's shift, or none) the way it lies from the thumb.
  const way: 1 | -1 = interval >= 1 ? (o.nextY < o.curY ? 1 : -1) : o.nextY + o.off < o.y ? 1 : -1;
  const need = Math.max(SLIDE.minPx, SLIDE.share * interval);
  const travel = way * (from - o.y);
  const slack = Math.max(SLIDE.farRows * o.row, interval);
  const onBlock = Math.abs(o.y - o.nextY) <= SLIDE.blockRows * o.row && travel >= SLIDE.minPx / 2;
  return { way, need, travel, arrived: travel >= need || onBlock, tooFar: travel > interval + slack, back: travel < SLIDE.backShare * need, tried: travel >= SLIDE.tryShare * need };
}
