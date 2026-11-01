/**
 * D414 (WTC 2.02): LADDER's vertical rule, the one the music box shows. The box draws a note one row per
 * staff step (an altered note a third of a row off it, D332: a hint of its pitch, never a row); the judge
 * reads the same rows: what you see is what you must do.
 *  · the next note on the same row (a repeat, or C then C♯): staying is right (within REPEAT BAND);
 *  · one or two rows away: anything not clearly the wrong way (STEP LEEWAY, D289);
 *  · three rows or more: a clear move the way the rows go (LEAP NEEDS; over the line's travel TRAVEL_MIN).
 * A slide aims at the note's block as drawn (its shift included), the way the block lies from the thumb.
 * Pure, for the judge (proto-game.ts verdict, glennLead) and the tests alike.
 */
import { MECH } from "./mechanics.ts";

export type LadderRule = "repeat" | "step" | "leap" | "travel";

/**
 * From a touch on a note `rows` drawn rows (staff steps) below the next (negative: above), a thumb moved
 * `movedPx` up (negative: down): right or not by the row rule, with a row of `R` px (the judging row).
 */
export function ladderMove(rows: number, movedPx: number, R: number, travel = false): { ok: boolean; rule: LadderRule; needPx: number } {
  if (rows === 0) return { ok: Math.abs(movedPx) <= MECH.repeatRows * R, rule: "repeat", needPx: MECH.repeatRows * R };
  const way = movedPx * Math.sign(rows);
  if (Math.abs(rows) < 3) return { ok: way >= -MECH.stepLeewayRows * R, rule: "step", needPx: MECH.stepLeewayRows * R };
  const need = (travel ? MECH.travelMin : MECH.leapRows) * R;
  return { ok: way >= need, rule: travel ? "travel" : "leap", needPx: need };
}

/** The way a slide must go from a thumb at `ay` to a note drawn at `target` (CSS y, down positive): 1 up, −1 down. */
export const slideWay = (ay: number, target: number): 1 | -1 => (target < ay ? 1 : -1);
