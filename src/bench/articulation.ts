/**
 * D218, articulation scored: the testbench's notes last while held, so how they join, last and stop
 * is the player's, and is judged.
 *   LEGATO: a note joined in the score to the one before (no rest between), struck while that one
 *     still sounds, by a new touch or key (another thumb or key holding it, or let go no more than
 *     LEGATO_GAP_MS, and a tenth of its length, before), scores half its points again, and more along an unbroken chain
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
 * Pure: lengths in, verdicts out.
 */
import type { LaneNote } from "../touch/lanes.ts";

/** A strike this soon after the note before was let go (and within a tenth of that note's length) is still legato. */
export const LEGATO_GAP_MS = 60;
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
  const next = notes.find((n) => n.on > notes[i].on);
  return next ? Math.max(0, next.on - end) : 0;
}

/**
 * A note's end judged: `len` its written length, `held` how long it sounded from its written onset,
 * `rest` the rest after it (0: none to respect), all in ms. `deadline`: past it (from the onset),
 * the rest is held through.
 */
export function releaseVerdict(len: number, held: number, rest: number): { hold: "none" | "held" | "short" | "off"; rest: "none" | "clean" | "over"; deadline: number } {
  const deadline = len + Math.max(80, rest * 0.25);
  const restV = rest <= 0 ? "none" : held > deadline ? "over" : "clean";
  let hold: "none" | "held" | "short" | "off" = "none";
  if (len >= HELD_MIN_MS) {
    if (held < len * 0.5) hold = "short";
    else if (held >= len - Math.max(80, len * 0.25) && held <= len + Math.max(80, len * 0.1)) hold = "held";
    else hold = "off";
  }
  return { hold, rest: restV, deadline };
}

/** The result screen's line: legato, holds and rests respected, as shares (a part with nothing to judge left out). */
export function artLine(a: ArtStats): string {
  const pc = (x: number, of: number) => `${Math.round((100 * x) / Math.max(1, of))}%`;
  const parts: string[] = [];
  if (a.legatoOf) parts.push(`LEGATO ${pc(a.legato, a.legatoOf)}${a.chain > 1 ? ` (CHAIN ${a.chain})` : ""}`);
  if (a.heldOf) parts.push(`HELD ${pc(a.held, a.heldOf)}`);
  if (a.cleanOf) parts.push(`RESTS ${pc(a.clean, a.cleanOf)}`);
  return parts.join(" · ");
}
