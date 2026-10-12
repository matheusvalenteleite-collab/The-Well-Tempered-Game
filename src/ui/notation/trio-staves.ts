import type { ClefId } from "./clefs.ts";

/**
 * Which staff each voice is drawn on (D113), by where its line lies: around middle C or above, the
 * treble staff; below, the bass staff (Fux's C clefs say little here: his tenor and alto lines
 * sit across middle C). If all three fall on one staff, the lowest voice takes the other.
 * `means`: the average MIDI pitch of each voice, ordered top down.
 */
export function trioStaves(means: number[]): { staff: (0 | 1)[]; clefs: [ClefId, ClefId] } {
  let staff = means.map((m) => (m >= 60 ? 0 : 1) as 0 | 1);
  if (staff.every((x) => x === staff[0])) staff = means.map((_, i) => (i === means.length - 1 ? 1 : 0));
  const on = (k: 0 | 1) => means.filter((_, i) => staff[i] === k);
  const upper: ClefId = on(0).every((m) => m < 52) ? "bass" : "treble";
  const lower: ClefId = on(1).every((m) => m >= 62) ? "treble" : "bass";
  return { staff, clefs: [upper, lower] };
}

/**
 * Four voices (D148): two parts on each staff, as a keyboard reduction of SATB: the two highest
 * lines (by their average) on the upper staff, the two lowest on the lower; each staff takes the
 * clef its lines read in, as in three voices.
 */
export function quartetStaves(means: number[]): { staff: (0 | 1)[]; clefs: [ClefId, ClefId] } {
  const order = means.map((m, i) => ({ m, i })).sort((a, b) => b.m - a.m || a.i - b.i);
  const staff = means.map(() => 1 as 0 | 1);
  for (const { i } of order.slice(0, 2)) staff[i] = 0;
  const on = (k: 0 | 1) => means.filter((_, i) => staff[i] === k);
  const upper: ClefId = on(0).every((m) => m < 52) ? "bass" : "treble";
  const lower: ClefId = on(1).every((m) => m >= 62) ? "treble" : "bass";
  return { staff, clefs: [upper, lower] };
}

/**
 * P12: each voice's name by its register (owner: three voices named like four): the nearest of
 * soprano, alto, tenor, bass to its average pitch (centres G4, E4, A#3, D3: PART_CENTRE), kept in
 * order from the top, each name once. `means` top down; returns 0 (soprano) to 3 (bass) per voice.
 */
export function satbOf(means: number[]): number[] {
  const CENTRE = [67, 64, 58, 50];
  const n = means.length;
  const out: number[] = [];
  let next = 0;
  means.forEach((m, i) => {
    // Leave room below for the voices still to name.
    const last = 3 - (n - 1 - i);
    let best = next;
    for (let k = next; k <= last; k++) if (Math.abs(CENTRE[k] - m) < Math.abs(CENTRE[best] - m)) best = k;
    out.push(best);
    next = best + 1;
  });
  return out;
}
