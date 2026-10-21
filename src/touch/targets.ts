/**
 * Where the notes are tapped (D166). Each note to tap (a chord as one) is a square in the play area
 * that a frame closes in on, meeting it at the note's onset. With one voice the squares alternate
 * between the halves, left thumb, right thumb, as drummers do; with two, the lower voice's are in the left half and
 * the higher's in the right. A square's height follows the melody: the voice's pitch mapped over the
 * range of the bar it is in and the next, so a phrase's shape is drawn under the thumbs and the
 * squares keep apart. Positions are shares of the play area's width and height.
 */
import type { LaneNote } from "./lanes.ts";

/** The square's side and the reach of a tap that hits it (NORMAL), in CSS pixels. */
export const TARGET = 54;
export const REACH = 70;
/** How long before its onset a square appears, in ms. */
export const APPROACH_MS = 1100;

/**
 * Places the targets of one voice in the given halves ("both": alternating between them, square by
 * square). Notes that ride along (EASY) are not tapped: they sit on the path between the squares
 * around them, by time. Call after the rides are marked.
 */
export function place(notes: LaneNote[], halves: "both" | "left" | "right", barTicks: number) {
  const taps = [...new Set(notes.filter((n) => !n.ride).map((n) => n.on))].sort((a, b) => a - b);
  taps.forEach((on, k) => {
    const chord = notes.filter((n) => n.on === on);
    const top = Math.max(...chord.map((n) => n.midi));
    const bar = Math.floor(on / barTicks) * barTicks;
    const near = notes.filter((n) => n.on >= bar && n.on < bar + 2 * barTicks).map((n) => n.midi);
    const lo = Math.min(...near);
    const hi = Math.max(...near);
    const span = Math.max(hi - lo, 7);
    const mid = (lo + hi) / 2;
    const y = Math.min(0.86, Math.max(0.14, 0.5 - ((top - mid) / (span + 3)) * 0.8));
    const side = halves === "both" ? (k % 2 ? "right" : "left") : halves;
    // A small sideways step, so squares at one height in a row do not cover each other.
    const drift = (((halves === "both" ? k >> 1 : k) % 3) - 1) * 0.07;
    const x = (side === "left" ? 0.25 : 0.75) + drift;
    for (const n of chord) (n.x = x), (n.y = y);
  });
  for (const n of notes) {
    if (!n.ride) continue;
    const prev = notes.filter((m) => !m.ride && m.on < n.on).at(-1);
    const next = notes.find((m) => !m.ride && m.on > n.on);
    if (!prev) continue;
    const f = next ? (n.on - prev.on) / (next.on - prev.on) : 0.5;
    n.x = prev.x! + ((next?.x ?? prev.x!) - prev.x!) * f;
    n.y = prev.y! + ((next?.y ?? prev.y!) - prev.y!) * f;
  }
}

/** Whether a tap at (x, y) px reaches the target of note n in an area w by h px. */
export function reaches(n: LaneNote, x: number, y: number, w: number, h: number): boolean {
  return Math.hypot((n.x ?? 0.5) * w - x, (n.y ?? 0.5) * h - y) <= REACH;
}
