/**
 * Progressive unlocking (D141, D142). In BETA everything is open. In the real setup a thing opens
 * once the one before it is done (a tutorial lesson finished, an exercise starred); what is done
 * stays open; the first is always open.
 */
import data from "../../data/fux/three-voice/fux-three-voice.json" with { type: "json" };
import { ALL_STEPS } from "../counterpoint/curriculum/index.ts";
import { TRIO_SPECIES, trioSteps } from "./trio.ts";

export function openInOrder(ids: readonly string[], done: readonly string[], k: number, beta: boolean): boolean {
  if (beta || k <= 0) return true;
  return done.includes(ids[k]) || done.includes(ids[k - 1]);
}

/**
 * Every exercise of the game in the book's order (D142): two voices, species one to five, then
 * three voices, species one to five. A star on an exercise opens the next, across species and voices.
 */
export const GAME_ORDER: readonly string[] = [...ALL_STEPS.map((s) => s.id), ...TRIO_SPECIES.flatMap((n) => trioSteps(data as never, n).map((s) => s.id))];

export function exerciseOpen(id: string, stars: readonly string[], beta: boolean): boolean {
  const k = GAME_ORDER.indexOf(id);
  return k >= 0 && openInOrder(GAME_ORDER, stars, k, beta);
}

/** Where a learner stands: the first open exercise without a star (or the last, all starred). */
export function furthestOpen(stars: readonly string[], beta: boolean): string {
  return GAME_ORDER.find((id) => exerciseOpen(id, stars, beta) && !stars.includes(id)) ?? GAME_ORDER[GAME_ORDER.length - 1];
}
