/**
 * D218, articulation scored: the testbench's notes last while held, so how they join, last and stop
 * is the player's, and is judged.
 *   LEGATO: a note joined in the score to the one before (no rest between), struck while that one
 *     still sounds, by a new touch or key (another thumb or key holding it, or let go no more than
 *     legatoGapMs before: D289, the larger of LEGATO_GAP_MS and LEGATO_GAP_SHARE of its length), scores half its points again, and more along an unbroken chain
 *     (×1.5, ×2, ×2.5, at most ×3). Struck detached it scores as it is (the articulation is open),
 *     and the chain is broken; so is it by a slide (it sounds joined, but a slide is cheap: no
 *     bonus), a slip or a rest held through.
 *   HELD: a note of HELD_MIN_MS or more, let go within 75%–110% of its length (or ±80 ms, whichever
 *     is wider) of its written end, scores a bonus by its length; let go before half of it, SHORT:
 *     the crowd a little cooler, nothing more.
 *   THE REST: a note with a rest of a quarter of a beat or more after it, held on past its end by
 *     more than max(80 ms, a quarter of the rest): REST!, the crowd cooler, the chain broken; let go
 *     in time: CLEAN, a point at the multiplier.
 * The notes followed by riders (D191) are not judged at their end: the riders take over the sound.
 * D325: LEGATO no longer scores more (intention.ts): a join is judged by the player's own touch, and
 * HELD's bounds follow that touch. The legato counts stay (the lessons, the LEGATO CHAIN feat, the lab).
 * Pure: lengths in, verdicts out.
 */
import type { LaneNote } from "../touch/lanes.ts";
import { inOrder } from "../touch/visible.ts";
import { MECH, relMs } from "./mechanics.ts";

/**
 * D289: a strike this soon after the note before was let go is still legato: the larger of LEGATO_GAP_MS
 * and LEGATO_GAP_SHARE of that note's length (D218 had the smaller of 60 ms and a tenth: 31 ms for a
 * semiquaver, finer than a human lift). The owner: "Legato is about smoothness of movement, not
 * simultaneity … the player ought not to be required to have two thumbs simultaneously down."
 */
export const LEGATO_GAP_MS = 90;
export const LEGATO_GAP_SHARE = 0.35;
/** D317: by the lab's parameters (mechanics.ts MECH: by default LEGATO_GAP_MS and LEGATO_GAP_SHARE); D329: RELATIVE, the gap in ms scaled by the note's length. */
export const legatoGapMs = (noteMs: number) => Math.max(relMs(MECH.legatoGapMs, noteMs), MECH.legatoGapShare * noteMs);
/** The shortest note judged for its length (about an eighth at a moderate tempo). */
export const HELD_MIN_MS = 250;
/** The words' colours: legato violet, held and clean greens. */
export const LEGATO_INK = "#c9a6ff";
export const HELD_INK = "#8fe3b0";
export const CLEAN_INK = "#7fd6e8";

/** What the run's articulation came to (the result screen). */
export interface ArtStats {
  /** Joined notes struck legato, of the joined notes struck right; the longest chain. */
  legato: number;
  legatoOf: number;
  chain: number;
  /** Notes held their length, of those judged for it. */
  held: number;
  heldOf: number;
  /** Rests respected, of the rests after notes struck right. */
  clean: number;
  cleanOf: number;
  /**
   * D325: the joins judged by intention (intention.ts): consistent with the player's own touch, or as
   * the reading marks them; and the touch the player was found to use (absent: before D325).
   */
  touchOk?: number;
  touchOf?: number;
  touch?: "LEGATO" | "ORDINARY" | "DETACHED" | null;
}

/** A word called under the verdict. */
export interface ArtFlash {
  text: string;
  at: number;
  good: boolean;
  kind: "legato" | "held" | "short" | "clean" | "rest";
}

/** The legato bonus on a note's points along a chain of `chain` legato strikes (1 the first): half again, a half more each, at most twice. */
export function legatoBonus(pts: number, chain: number): number {
  return Math.max(1, Math.round(pts * Math.min(0.5 * chain, 2)));
}

/** HELD's bonus (before the multiplier): two points a beat, at least one, at most eight. */
export function holdBonus(beats: number): number {
  return Math.max(1, Math.min(8, Math.round(2 * beats)));
}

/** The rest written after note i (ticks; 0 when the next note follows at once, or none follows). */
export function restAfter(notes: readonly LaneNote[], i: number): number {
  let end = -Infinity;
  for (let j = i; j >= 0 && notes[j].on === notes[i].on; j--) end = Math.max(end, notes[j].on + notes[j].dur);
  for (let j = i + 1; j < notes.length && notes[j].on === notes[i].on; j++) end = Math.max(end, notes[j].on + notes[j].dur);
  // D345: the notes are in time order: the next onset is found from i on (it was looked for from the
  // piece's first note, for every held note, every frame).
  let next: LaneNote | undefined;
  for (let j = inOrder(notes) ? i + 1 : 0; j < notes.length && !next; j++) if (notes[j].on > notes[i].on) next = notes[j];
  return next ? Math.max(0, next.on - end) : 0;
}

/**
 * A note's end judged: `len` its written length, `held` how long it sounded from its written onset,
 * `rest` the rest after it (0: none to respect), all in ms. `deadline`: past it (from the onset),
 * the rest is held through.
 */
export function releaseVerdict(len: number, held: number, rest: number, bounds: { low: number; short: number } = { low: 0.75, short: 0.5 }): { hold: "none" | "held" | "short" | "off"; rest: "none" | "clean" | "over"; deadline: number } {
  const deadline = len + Math.max(80, rest * 0.25);
  const restV = rest <= 0 ? "none" : held > deadline ? "over" : "clean";
  let hold: "none" | "held" | "short" | "off" = "none";
  if (len >= HELD_MIN_MS) {
    // D325: the bounds by the player's touch (intention.ts heldBounds): 75% and 50% for a legato one.
    if (held < len * bounds.short) hold = "short";
    else if (held >= len - Math.max(80, len * (1 - bounds.low)) && held <= len + Math.max(80, len * 0.1)) hold = "held";
    else hold = "off";
  }
  return { hold, rest: restV, deadline };
}

/** The result screen's line: legato, holds and rests respected, as shares (a part with nothing to judge left out). */
export function artLine(a: ArtStats): string {
  const pc = (x: number, of: number) => `${Math.round((100 * x) / Math.max(1, of))}%`;
  const parts: string[] = [];
  // D325: the touch judged by intention, where it was.
  if (a.touchOf) parts.push(`${a.touch ?? "TOUCH"} ${pc(a.touchOk ?? 0, a.touchOf)}`);
  else if (a.legatoOf) parts.push(`LEGATO ${pc(a.legato, a.legatoOf)}${a.chain > 1 ? ` (CHAIN ${a.chain})` : ""}`);
  if (a.heldOf) parts.push(`HELD ${pc(a.held, a.heldOf)}`);
  if (a.cleanOf) parts.push(`RESTS ${pc(a.clean, a.cleanOf)}`);
  return parts.join(" · ");
}
