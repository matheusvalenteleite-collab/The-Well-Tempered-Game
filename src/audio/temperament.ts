/**
 * Temperaments. Regular temperaments are computed from the spelled pitch on the line of fifths,
 * so G# and Ab differ in meantone, as they did on Fux's instruments. Every temperament is
 * anchored so that D (the centre of the naturals F C G D A E B) keeps its equal-tempered pitch.
 */
import { parsePitch, type Step } from "../music/pitch.ts";

export type TemperamentId = "equal" | "pythagorean" | "meantone" | "werckmeister3";
export const TEMPERAMENTS: TemperamentId[] = ["equal", "pythagorean", "meantone", "werckmeister3"];

/** Size of the fifth in cents for the regular temperaments. */
const FIFTH: Record<Exclude<TemperamentId, "werckmeister3">, number> = {
  equal: 700,
  pythagorean: 1200 * Math.log2(3 / 2), // 701.955: pure fifths
  meantone: 1200 * Math.log2(5 ** 0.25), // 696.578: quarter-comma, pure major thirds
};

/** Werckmeister III, deviations from equal temperament in cents by pitch class (C = 0). */
const WERCKMEISTER3 = [0, -9.775, -7.82, -5.865, -9.775, -1.955, -11.73, -3.91, -7.82, -11.73, -3.91, -7.82];

const LINE_OF_FIFTHS: Record<Step, number> = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 };
const STEP_SEMITONES: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Deviation from equal temperament, in cents, for a spelled pitch (before anchoring on D). */
function rawDeviation(step: Step, alter: number, t: TemperamentId): number {
  if (t === "werckmeister3") return WERCKMEISTER3[(((STEP_SEMITONES[step] + alter) % 12) + 12) % 12];
  const n = LINE_OF_FIFTHS[step] + 7 * alter;
  const equal = 100 * (STEP_SEMITONES[step] + alter);
  const tempered = n * FIFTH[t];
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
