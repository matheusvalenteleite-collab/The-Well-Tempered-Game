/**
 * Tunings (D180): the temperament the instruments are tuned in, and the pitch of A. Each temperament
 * is given as each note's departure from equal temperament, in cents (C to B), as usually tabled with
 * C as the starting point; A keeps the pitch chosen.
 *   EQUAL: twelve equal semitones.
 *   WERCKMEISTER III (1691), KIRNBERGER III (1779), VALLOTTI (c. 1750): well temperaments: every key
 *   playable, each its own colour (the near keys purer, the far ones sharper).
 *   LEHMAN (2005): Bradley Lehman's reading of the scroll on the title page of the Well-Tempered
 *   Clavier as a tuning recipe; a reading much debated, offered as one possibility.
 *   MEANTONE (quarter-comma): pure thirds; the far keys (and their wolf, G sharp to E flat) sour.
 */
export interface Temperament {
  id: string;
  name: string;
  cents: number[];
}

export const TEMPERAMENTS: Temperament[] = [
  { id: "equal", name: "EQUAL", cents: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: "werckmeister", name: "WERCKMEISTER III", cents: [0, -9.8, -7.8, -5.9, -9.8, -2, -11.7, -3.9, -7.8, -11.7, -3.9, -7.8] },
  { id: "kirnberger", name: "KIRNBERGER III", cents: [0, -9.8, -6.8, -5.9, -13.7, -2, -9.8, -3.4, -7.8, -10.3, -3.9, -11.7] },
  { id: "vallotti", name: "VALLOTTI", cents: [0, -5.9, -3.9, -2, -7.8, 2, -7.8, -2, -3.9, -5.9, 0, -9.8] },
  { id: "lehman", name: "LEHMAN (BACH?)", cents: [5.9, 3.9, 2, 3.9, -2, 7.8, 2, 3.9, 3.9, 0, 3.9, 0] },
  { id: "meantone", name: "MEANTONE ¼", cents: [0, -24, -6.8, 10.3, -13.7, 3.4, -20.5, -3.4, -27.4, -10.3, 6.8, -17.1] },
];

export const PITCHES = [440, 415] as const;

let temperament = TEMPERAMENTS[0];
let a4 = 440;

export function setTuning(id: string, a: number) {
  temperament = TEMPERAMENTS.find((t) => t.id === id) ?? TEMPERAMENTS[0];
  a4 = PITCHES.includes(a as 440 | 415) ? a : 440;
}

/** A pitch's frequency in the tuning now (a fractional MIDI number stays in its key's tuning). */
export function hz(midi: number): number {
  const pc = ((Math.round(midi) % 12) + 12) % 12;
  const off = (temperament.cents[pc] - temperament.cents[9]) / 1200;
  return a4 * 2 ** ((midi - 69) / 12 + off);
}
