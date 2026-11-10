/** D499 (design studio): how a 64 × 40 fugue picture fits a slot whole (FitEmblem.tsx). Pure, for the tests. */
import { EMBLEM_H, EMBLEM_W } from "./emblem.ts";

/** The share of the slot an integer scale must fill to be chosen over an exact fit. */
export const INTEGER_MIN = 0.8;
/** The scale of the source used for an exact (non-integer) fit. */
export const FINE_SCALE = 4;

/** The picture's size in CSS px in a slot `w` × `h` (CSS px) at device-pixel ratio `dpr`, and whether it is a whole multiple. */
export function fitOf(w: number, h: number, dpr: number): { w: number; h: number; whole: boolean } {
  const exact = Math.min((w * dpr) / EMBLEM_W, (h * dpr) / EMBLEM_H);
  const n = Math.floor(exact + 1e-6);
  if (n >= 1 && n >= INTEGER_MIN * exact) return { w: (EMBLEM_W * n) / dpr, h: (EMBLEM_H * n) / dpr, whole: true };
  return { w: (EMBLEM_W * exact) / dpr, h: (EMBLEM_H * exact) / dpr, whole: false };
}
