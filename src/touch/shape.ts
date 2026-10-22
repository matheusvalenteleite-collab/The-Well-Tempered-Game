/**
 * The Synth as shape (D171): no pitch is placed under the thumbs. The thumb gives the melody's
 * direction, as a bow does: the right thumb for a note above the last, the left for a note below,
 * either for a repeat; alternating thumbs draw an arch, one thumb repeated a run. The height of the
 * tap gives the size of the move, in four bands from the bottom: SAME, STEP, THIRD, LEAP (a fourth or
 * more). EASY judges the direction and the time; NORMAL the size too. The game supplies Bach's pitch.
 * Pure: notes in, shapes out.
 */
import type { LaneNote } from "./lanes.ts";
import type { Side } from "./thumbs.ts";

export const BANDS = ["SAME", "STEP", "THIRD", "LEAP"] as const;
/** NORMAL: how far from the band's middle a tap still counts, in bands (0.5 is the band itself). */
export const BAND_REACH = 0.8;
/** A held thumb slid this far (px) up or down plays the next note, rising or falling, legato. */
export const SLIDE_PX = 26;

/** The size of a move of so many staff steps: a repeat 0, a second 1, a third 2, wider 3. */
export function bandOf(steps: number, semis: number): number {
  const s = Math.abs(steps);
  if (s === 0) return semis === 0 ? 0 : 1;
  return Math.min(3, s);
}

/**
 * Each note's move from the note before it that the player played (in EASY the notes that ride are
 * passed over: the shape is that of the notes tapped). A chord counts by its top note. The first note
 * is free: dir 0 and size -1.
 */
export function markShapes(notes: LaneNote[]) {
  let prev: LaneNote | null = null;
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    if (i > 0 && notes[i - 1].on === n.on) {
      Object.assign(n, { dir: notes[i - 1].dir, size: notes[i - 1].size });
      continue;
    }
    if (n.ride) continue;
    const top = topOf(notes, i);
    if (!prev) Object.assign(n, { dir: 0, size: -1 });
    else Object.assign(n, { dir: Math.sign(top.midi - prev.midi), size: bandOf(top.step - prev.step, top.midi - prev.midi) });
    prev = top;
  }
}

function topOf(notes: LaneNote[], i: number): LaneNote {
  let top = notes[i];
  for (let j = i + 1; j < notes.length && notes[j].on === notes[i].on; j++) if (notes[j].midi > top.midi) top = notes[j];
  return top;
}

/** The side a note wants: the right thumb rising, the left falling; null for either. */
export function sideFor(n: LaneNote): Side | null {
  return n.dir === 1 ? "right" : n.dir === -1 ? "left" : null;
}

/** The band a tap's height reaches, continuous (0 at the bottom to 4 at the top). */
export function bandAt(yFrac: number): number {
  return Math.max(0, Math.min(3.999, (1 - yFrac) * 4));
}

/** Whether a tap on a side at a height fits a note's move (NORMAL wants the size too). */
export function fits(n: LaneNote, side: Side | null, yFrac: number, sized: boolean): boolean {
  const want = sideFor(n);
  if (want && side && side !== want) return false;
  if (!sized || n.size === undefined || n.size < 0) return true;
  return Math.abs(bandAt(yFrac) - (n.size + 0.5)) <= BAND_REACH;
}
