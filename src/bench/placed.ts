/**
 * The testbench's prototypes, batch 2 (D176): pitch placed on the screen. Each lays the voice's notes
 * out somewhere under the thumbs, and a touch counts where it lands: on the note's string, key, row or
 * column. The time still picks the note. A thumb held and slid onto the place of the next note plays
 * it (a run is a slide). Pure geometry: touches in, places out.
 *   DULCIMER (upright): strings across the play area, one per staff step, a window of them following
 *   the passage; one string off still counts; struck notes ring a little, whatever the thumb does.
 *   UPRIGHT PIANO: a keyboard stood on its end, low at the bottom: the white keys bars across the whole
 *   width, the black keys shorter bars in the middle; a window following the passage; the key exactly,
 *   a wrong key heard as it is.
 *   PIANO (sideways): the keyboard of D172, the voice's whole range, notes falling onto it.
 *   SNES (sideways): the whole screen a roll of every voice, scrolling right to left past a line in
 *   the middle; a note is touched on its block as it crosses the line.
 *   TETRIS (upright): the whole screen a waterfall of every voice, the notes across the width as on a
 *   keyboard (by staff step), falling to a line near the bottom; a note is touched in its column.
 */
import type { LaneNote } from "../touch/lanes.ts";
import { isBlack, keyAt, keyboard, WHITE_ONLY, type Keyboard } from "../touch/piano.ts";

export type PlacedId = "dulcimer" | "upright" | "piano" | "snes" | "tetris";

/** A stretch of the piece and the strings or keys that serve it: lowest, and how many. */
export interface Window {
  from: number;
  to: number;
  lo: number;
  n: number;
}

/** DULCIMER: at least this many strings; UPRIGHT PIANO: at least this many semitones. */
export const MIN_STRINGS = 9;
export const MIN_SEMIS = 13;
/** The share of a sideways PIANO's play area the keyboard takes. */
export const KEYS_SHARE = 0.45;
/** SNES: where the line stands (share of the width) and how near it a touch counts. TETRIS: where the line stands (share of the height). */
export const SNES_LINE = 0.5;
export const TETRIS_LINE = 0.82;
/** How near (px) to a note's place a touch counts, at least, in SNES and TETRIS. */
export const NEAR_PX = 30;

/**
 * Windows over the voice: two bars at a time (one where two range too wide for the minimum), each just
 * wide enough for its notes and a unit of room either side, at least `min` units. `unit` says what is
 * counted: staff steps (strings) or semitones (keys).
 */
export function windows(notes: LaneNote[], unit: "step" | "midi", min: number, barTicks: number, from: number, end: number): Window[] {
  const val = (n: LaneNote) => (unit === "step" ? n.step : n.midi);
  const out: Window[] = [];
  for (let t = from; t < end; ) {
    let span = 2 * barTicks;
    let vs = notes.filter((n) => n.on >= t && n.on < t + span).map(val);
    if (vs.length && Math.max(...vs) - Math.min(...vs) + 3 > min) {
      span = barTicks;
      vs = notes.filter((n) => n.on >= t && n.on < t + span).map(val);
    }
    if (!vs.length) vs = out.length ? [out[out.length - 1].lo + 1] : [val(notes[0])];
    let lo = Math.min(...vs) - 1;
    let n = Math.max(...vs) + 1 - lo + 1;
    if (n < min) {
      lo -= Math.floor((min - n) / 2);
      n = min;
    }
    if (unit === "midi") {
      while (isBlack(lo)) (lo--, n++);
      while (isBlack(lo + n - 1)) n++;
    }
    out.push({ from: t, to: t + span, lo, n });
    t += span;
  }
  return out;
}

export function windowAt(ws: Window[], tick: number): Window {
  return ws.find((w) => tick >= w.from && tick < w.to) ?? ws[ws.length - 1];
}

/** UPRIGHT PIANO: the white keys of a window, bottom up. */
export function whites(w: Window): number[] {
  const out: number[] = [];
  for (let m = w.lo; m < w.lo + w.n; m++) if (!isBlack(m)) out.push(m);
  return out;
}

/** UPRIGHT PIANO: a black key's bar spans the middle of the width. */
export const BLACK_SPAN: [number, number] = [0.2, 0.8];

/** UPRIGHT PIANO: a key's bar as [y0, y1) from the top, fractions of the height. */
export function uprightSpan(w: Window, midi: number): [number, number] {
  const ws = whites(w);
  const kh = 1 / ws.length;
  if (!isBlack(midi)) {
    const i = ws.indexOf(midi);
    return [1 - (i + 1) * kh, 1 - i * kh];
  }
  // Astride the line between the white keys below and above.
  const i = ws.indexOf(midi - 1);
  const mid = 1 - (i + 1) * kh;
  return [mid - kh * 0.3, mid + kh * 0.3];
}

/** UPRIGHT PIANO: the key under a touch (x, y as fractions). */
export function uprightKey(w: Window, x: number, y: number): number {
  const ws = whites(w);
  const kh = 1 / ws.length;
  if (x >= BLACK_SPAN[0] && x <= BLACK_SPAN[1])
    for (let m = w.lo; m < w.lo + w.n; m++) {
      if (!isBlack(m)) continue;
      const [a, b] = uprightSpan(w, m);
      if (y >= a && y < b) return m;
    }
  const i = Math.max(0, Math.min(ws.length - 1, Math.floor((1 - y) / kh)));
  return ws[i];
}

/** DULCIMER: the string under a height (fraction from the top), as a staff step. */
export function stringAt(w: Window, y: number): number {
  return w.lo + Math.max(0, Math.min(w.n - 1, Math.floor((1 - y) * w.n)));
}

/** The sideways PIANO's keyboard for the voice, and the key under a touch. */
export function pianoKeys(notes: LaneNote[]): Keyboard {
  return keyboard(notes.map((n) => n.midi));
}
export function pianoKey(kb: Keyboard, x: number, y: number): number {
  const top = 1 - KEYS_SHARE;
  return keyAt(kb, x, y > top + KEYS_SHARE * (1 - WHITE_ONLY));
}

/** SNES: a staff step's height (px, the middle of its row) on the piece's ladder. */
export function snesY(step: number, lo: number, hi: number, h: number): number {
  const rows = hi - lo + 3;
  return ((hi + 1 - step + 0.5) / rows) * h;
}

/** TETRIS: a staff step's column middle (px) across the voice's range. */
export function tetrisX(step: number, lo: number, hi: number, w: number): number {
  const cols = hi - lo + 3;
  return ((step - lo + 1 + 0.5) / cols) * w;
}
