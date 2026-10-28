/**
 * D237, the streamlined flow (pure): the voice a pop-up offers first, and the piece ▶ NEXT plays.
 */
import type { TouchFugue } from "../touch/fugue.ts";
import { preludePart } from "./stages.ts";

/**
 * The voice preselected: a prelude's own part (D251: never chosen); a fugue's voice of the first entry
 * (the subject alone at the start: the clearest line to learn the piece by). Among the voices still
 * singing from the start chosen.
 */
export function defaultVoice(f: TouchFugue, singing: readonly number[], o: { fresh?: boolean } = {}): number {
  if (!singing.length) return 0;
  // D369 (the owner: "players' first plays of fugues ought to have them playing the second voice to enter,
  // so that they can hear the subject played by the game before they need to repeat it as the answer"):
  // a fugue not yet finished (`fresh`) offers the second voice to enter, the answer's.
  if (o.fresh && f.kind === "fugue" && f.defaultVoice === undefined) {
    const order = [...new Set([...f.entries].sort((a, b) => a.on - b.on).map((e) => e.voice))].filter((v) => singing.includes(v));
    if (order.length >= 2) return order[1];
  }
  // D251: a prelude's own part (stages.ts `preludePart`: the right hand unless named), never chosen.
  if (f.kind === "prelude") return singing.includes(preludePart(f.id)) ? preludePart(f.id) : singing[0];
  // D340: a piece's own first voice (a chorale's soprano).
  if (f.defaultVoice !== undefined && singing.includes(f.defaultVoice)) return f.defaultVoice;
  const first = [...f.entries].sort((a, b) => a.on - b.on).find((e) => singing.includes(e.voice));
  return first ? first.voice : singing[Math.min(1, singing.length - 1)];
}

/** The piece after `current` in a list of cards (wrapping), skipping those not open; null when none. */
export function nextIn(order: readonly string[], current: string, open: (id: string) => boolean = () => true): string | null {
  const at = order.indexOf(current);
  if (at < 0) return null;
  for (let k = 1; k < order.length; k++) {
    const id = order[(at + k) % order.length];
    if (open(id)) return id;
  }
  return null;
}
