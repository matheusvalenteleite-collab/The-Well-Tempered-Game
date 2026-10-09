/**
 * Temperaments. Regular temperaments are computed from the spelled pitch on the line of fifths,
 * so G# and Ab differ in meantone, as they did on Fux's instruments. Every temperament is
 * anchored so that D (the centre of the naturals F C G D A E B) keeps its equal-tempered pitch.
 */
import { parsePitch, type Step } from "../music/pitch.ts";

export type TemperamentId = "equal" | "pythagorean" | "meantone" | "werckmeister3" | "kirnberger3" | "vallotti";
export const TEMPERAMENTS: TemperamentId[] = ["equal", "pythagorean", "meantone", "werckmeister3", "kirnberger3", "vallotti"];
/** The circulating ("well") temperaments, in which every key can be played (D119). */
export const WELL: TemperamentId[] = ["werckmeister3", "kirnberger3", "vallotti", "equal"];

/** Size of the fifth in cents for the regular temperaments. */
const FIFTH: Record<"equal" | "pythagorean" | "meantone", number> = {
  equal: 700,
  pythagorean: 1200 * Math.log2(3 / 2), // 701.955: pure fifths
  meantone: 1200 * Math.log2(5 ** 0.25), // 696.578: quarter-comma, pure major thirds
};

/** Werckmeister III, deviations from equal temperament in cents by pitch class (C = 0). */
const WERCKMEISTER3 = [0, -9.775, -7.82, -5.865, -9.775, -1.955, -11.73, -3.91, -7.82, -11.73, -3.91, -7.82];

const PURE = 1200 * Math.log2(3 / 2);
const PC_COMMA = 12 * PURE - 8400; // Pythagorean comma, 23.46 cents
const SYN_COMMA = 1200 * Math.log2(81 / 80); // syntonic comma, 21.51 cents
const SCHISMA = PC_COMMA - SYN_COMMA;
/**
 * A circulating temperament from the sizes of its twelve fifths, C-G-D-A-E-B-F#-C#-G#-D#-A#-F-C:
 * deviations from equal temperament by pitch class (C = 0). The fifths must close the circle.
 */
export function circulating(fifths: number[]): number[] {
  const dev = new Array<number>(12).fill(0);
  let d = 0;
  let p = 0;
  for (let i = 0; i < 11; i++) {
    d += fifths[i] - 700;
    p = (p + 7) % 12;
    dev[p] = d;
  }
  return dev;
}
/** Kirnberger III (1779): C-G-D-A-E tempered by a quarter of the syntonic comma, F#-C# by the schisma, the rest pure. */
const KIRNBERGER3 = circulating([...Array(4).fill(PURE - SYN_COMMA / 4), PURE, PURE, PURE - SCHISMA, ...Array(5).fill(PURE)]);
/** Vallotti: the six fifths F-C-G-D-A-E-B tempered by a sixth of the Pythagorean comma, the other six pure. */
const VALLOTTI = circulating([...Array(5).fill(PURE - PC_COMMA / 6), ...Array(6).fill(PURE), PURE - PC_COMMA / 6]);
const TABLES: Partial<Record<TemperamentId, number[]>> = { werckmeister3: WERCKMEISTER3, kirnberger3: KIRNBERGER3, vallotti: VALLOTTI };

const LINE_OF_FIFTHS: Record<Step, number> = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 };
const STEP_SEMITONES: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Deviation from equal temperament, in cents, for a spelled pitch (before anchoring on D). */
function rawDeviation(step: Step, alter: number, t: TemperamentId): number {
  const table = TABLES[t];
  if (table) return table[(((STEP_SEMITONES[step] + alter) % 12) + 12) % 12];
  const n = LINE_OF_FIFTHS[step] + 7 * alter;
  const equal = 100 * (STEP_SEMITONES[step] + alter);
  const tempered = n * FIFTH[t as keyof typeof FIFTH];
  return tempered - equal - 1200 * Math.round((tempered - equal) / 1200);
}

/** Deviation from equal temperament in cents, anchored so that D is unchanged. */
export function deviation(pitch: string, t: TemperamentId): number {
  const p = parsePitch(pitch);
  return rawDeviation(p.step, p.alter, t) - rawDeviation("D", 0, t);
}

/** Frequency in Hz (A4 = 440 in equal temperament). */
export function frequency(pitch: string, t: TemperamentId = "equal"): number {
  return 440 * 2 ** ((parsePitch(pitch).midi - 69 + deviation(pitch, t) / 100) / 12);
}
