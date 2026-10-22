/**
 * Pitch placed on the screen (D176; D178): the sideways PIANO's keys, and SIDEWAYS's columns. Pure
 * geometry: touches in, places out.
 *   PIANO (sideways): the keyboard of D172, the voice's whole range, the notes falling onto it.
 *   SIDEWAYS (upright, the whole screen): the tune across the width, a column per staff step, higher to
 *   the right; only COLUMNS of them at a time (a thumb's width each), the window following the
 *   passage smoothly; notes fall to a line near the bottom and are touched in their column.
 */
import type { LaneNote } from "../touch/lanes.ts";
import { keyAt, keyboard, WHITE_ONLY, type Keyboard } from "../touch/piano.ts";

/** The share of a sideways PIANO's play area the keyboard takes. */
export const KEYS_SHARE = 0.45;

/** The sideways PIANO's keyboard for the voice, and the key under a touch (fractions). */
export function pianoKeys(notes: LaneNote[]): Keyboard {
  return keyboard(notes.map((n) => n.midi));
}
export function pianoKey(kb: Keyboard, x: number, y: number): number {
  const top = 1 - KEYS_SHARE;
  return keyAt(kb, x, y > top + KEYS_SHARE * (1 - WHITE_ONLY));
}

/** SIDEWAYS: how many columns (staff steps) show at once; the line (share of the height); touches count below TOUCH_FROM. */
export const COLUMNS = 9;
export const LINE = 0.8;
export const TOUCH_FROM = 0.35;

/** SIDEWAYS: where the window is aimed: the middle of the voice's next bar (or its next note). */
export function aim(notes: LaneNote[], now: number, barTicks: number): number | null {
  const ahead = notes.filter((n) => n.on >= now - barTicks / 8 && n.on < now + barTicks);
  const use = ahead.length ? ahead : notes.filter((n) => n.on >= now).slice(0, 1);
  if (!use.length) return null;
  const steps = use.map((n) => n.step);
  return (Math.min(...steps) + Math.max(...steps)) / 2;
}

/** SIDEWAYS: a step's column middle (px), the window centred on `pan`. */
export const columnX = (step: number, pan: number, w: number) => (step - pan + COLUMNS / 2) * (w / COLUMNS);
/** SIDEWAYS: the step under x (px). */
export const columnAt = (x: number, pan: number, w: number) => Math.round(x / (w / COLUMNS) - COLUMNS / 2 + pan);
