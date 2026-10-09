/**
 * A modern harmonic reading of a three-voice sonority: figured-bass figures (intervals above the
 * bass, simple) and a Roman numeral for the triad it belongs to, relative to the mode's final.
 * This is a later lens (Rameau's fundamental bass, Weber's numerals), not Fux's: he figures
 * intervals above the bass and speaks of the "harmonic triad" (trias harmonica), not of chord
 * roots or degrees. Never graded (docs/BACKLOG.md, plan step 8).
 *
 * Root finding, by the letters above the bass (thirds and fifths stacked):
 *   3 5 (and doublings) — root position, the bass is the root;
 *   3 6 — first inversion (6/3), the root a sixth above the bass;
 *   4 6 — second inversion (6/4), the root a fourth above;
 *   3 alone, 5 alone, 8 — incomplete: the bass is taken as the root (marked so);
 *   6 alone — taken as a 6/3 without its third.
 * Quality from the third above the root when present (major: upper case; minor: lower case),
 * and a diminished fifth (°).
 */
import { parsePitch } from "../../music/pitch.ts";
import type { ModalFinal } from "../../music/fux/index.ts";

const LETTERS = "CDEFGAB";
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const midi = (p: string) => parsePitch(p).midi;
const letter = (p: string) => LETTERS.indexOf(p[0]);
const accidental = (p: string) => (/^[A-G](#|b)/.exec(p)?.[1] ?? "");

export interface HarmonyLabel {
  /** Figures above the bass, largest first, as figured bass stacks them ("5 3", "6 3", "8 3"). */
  figures: string[];
  /** Roman numeral, e.g. "i", "V", "vii°", "♭VI"; with "6" or "6/4" for inversions. */
  roman: string;
  /** The root was guessed (an incomplete chord). */
  guessed: boolean;
}

export function harmonyOf(chord: string[], final: ModalFinal): HarmonyLabel {
  const ps = [...chord].sort((a, b) => midi(a) - midi(b));
  const bass = ps[0];
  // Diatonic distances above the bass, 0-6 (0 = unison or octave).
  const steps = [...new Set(ps.slice(1).map((p) => (letter(p) - letter(bass) + 7) % 7))];
  const has = (d: number) => steps.includes(d);
  const figures = ps
    .slice(1)
    .map((p) => {
      const n = ((letter(p) - letter(bass) + 7) % 7) + 1;
      return n === 1 ? (midi(p) === midi(bass) ? "1" : "8") : String(n);
    })
    .sort((a, b) => Number(b) - Number(a));
  let rootStep = 0;
  let inversion = "";
  let guessed = false;
  if (has(2) && has(5) && !has(4)) (rootStep = 5), (inversion = "6");
  else if (has(3) && has(5)) (rootStep = 3), (inversion = "6/4");
  else if (has(5) && !has(2) && !has(4)) (rootStep = 5), (inversion = "6"), (guessed = true);
  else if (has(2) && has(4)) rootStep = 0;
  else guessed = true;
  const rootLetter = (letter(bass) + rootStep) % 7;
  const rootPitch = rootStep === 0 ? bass : ps.find((p) => letter(p) === rootLetter)!;
  // The third and fifth above the root, where they sound.
  const third = ps.find((p) => letter(p) === (rootLetter + 2) % 7);
  const fifth = ps.find((p) => letter(p) === (rootLetter + 4) % 7);
  const pc = (p: string) => ((midi(p) % 12) + 12) % 12;
  const iv = (p: string) => (pc(p) - pc(rootPitch) + 12) % 12;
  const major = third ? iv(third) === 4 : null;
  const diminished = fifth ? iv(fifth) === 6 : false;
  const degree = (rootLetter - LETTERS.indexOf(final) + 7) % 7;
  // A root altered against the natural letters (B♭ in D, say) is marked as such.
  const alter = accidental(rootPitch) === "b" ? "♭" : accidental(rootPitch) === "#" ? "♯" : "";
  let numeral = ROMAN[degree];
  if (major === false || diminished) numeral = numeral.toLowerCase();
  return { figures, roman: `${alter}${numeral}${diminished ? "°" : ""}${inversion ? inversion : ""}`, guessed: guessed || major === null };
}
