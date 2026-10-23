/**
 * Pitch placed on the screen (D176): the sideways PIANO's keys. Pure geometry: touches in, places out.
 *   PIANO (sideways): the keyboard of D172, the voice's whole range, the notes falling onto it.
 */
import type { LaneNote } from "../touch/lanes.ts";
import { keyAt, keyboard, WHITE_ONLY, type Keyboard } from "../touch/piano.ts";

/** The share of a sideways PIANO's play area the keyboard takes. */
export const KEYS_SHARE = 0.45;

/** The sideways PIANO's keyboard for the voice, and the key under a touch (fractions). */
export function pianoKeys(notes: LaneNote[]): Keyboard {
  // D219: a passage with no notes (SUBJECT started after the last entry) gets a keyboard round middle C (Math.min of none looped forever).
  return keyboard(notes.length ? notes.map((n) => n.midi) : [60]);
}
export function pianoKey(kb: Keyboard, x: number, y: number): number {
  const top = 1 - KEYS_SHARE;
  return keyAt(kb, x, y > top + KEYS_SHARE * (1 - WHITE_ONLY));
}
