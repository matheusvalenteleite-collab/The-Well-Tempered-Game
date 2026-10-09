import type { ClefId } from "./clefs.ts";

/**
 * Which staff each voice is drawn on (D113), by where its line lies: around middle C or above, the
 * treble staff; below, the bass staff (Fux's C clefs say little here: his tenor and alto lines
 * sit across middle C). If all three fall on one staff, the lowest voice takes the other.
 * `means`: the average MIDI pitch of each voice, ordered top down.
 */
export function trioStaves(means: number[]): { staff: (0 | 1)[]; clefs: [ClefId, ClefId] } {
  let staff = means.map((m) => (m >= 59 ? 0 : 1) as 0 | 1);
  if (staff.every((x) => x === staff[0])) staff = means.map((_, i) => (i === means.length - 1 ? 1 : 0));
  const on = (k: 0 | 1) => means.filter((_, i) => staff[i] === k);
  const upper: ClefId = on(0).every((m) => m < 52) ? "bass" : "treble";
  const lower: ClefId = on(1).every((m) => m >= 62) ? "treble" : "bass";
  return { staff, clefs: [upper, lower] };
}
