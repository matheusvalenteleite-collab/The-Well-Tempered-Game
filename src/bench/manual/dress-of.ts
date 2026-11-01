/** D402: which of the screen's elements are on in a lesson, and which its first step introduces (dress.ts). */
import { MANUAL } from "./lessons.ts";
import { DRESS, type DressId, type DressLine } from "./dress.ts";

// D440: a PROGRESSION MODE stage lesson (P.n) is dressed as the full screen: after the last lesson of the tutorial.
const order = (id: string) => (/^P\.\d+$/.test(id) ? MANUAL.length : MANUAL.findIndex((l) => l.id === id));

/** The elements on in a lesson (every one whose lesson comes at or before it). */
export function dressOf(id: string): DressId[] {
  const k = order(id);
  if (k < 0) return [];
  return DRESS.filter((d) => order(d.at) >= 0 && order(d.at) <= k).map((d) => d.id);
}
export const dressOn = (id: string, d: DressId) => dressOf(id).includes(d);

/** The bubbles a lesson's first step opens with: the elements on in it not yet introduced to this player. */
export function introFor(id: string, dressed: readonly string[]): DressLine[] {
  const on = new Set(dressOf(id));
  return DRESS.filter((d) => on.has(d.id) && !dressed.includes(d.id)).map((d) => d.line);
}
export const introIds = (id: string, dressed: readonly string[]): DressId[] => dressOf(id).filter((d) => !dressed.includes(d));

