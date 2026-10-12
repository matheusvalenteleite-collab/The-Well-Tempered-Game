/**
 * The key of the middle entry, from Bach's practice in the 48 (docs/wtc/keyplan-study.md: the first
 * key away from tonic and dominant, over the entries `findEntriesByHead` finds; 24 major and 22
 * minor fugues, counts approximate as the study says). Roman numerals from the home key, upper case
 * major.
 */
import { atPlace, modeOf } from "./model.ts";

export interface KeyChoice {
  roman: string;
  /** Share of Bach's fugues (of that mode) whose first key away it is, in per cent. */
  share: number;
}

export const FIRST_AWAY: Record<"major" | "minor", KeyChoice[]> = {
  major: [
    { roman: "vi", share: 54 },
    { roman: "ii", share: 17 },
    { roman: "IV", share: 13 },
    { roman: "iii", share: 8 },
  ],
  minor: [
    { roman: "III", share: 50 },
    { roman: "iv", share: 32 },
    { roman: "VI", share: 5 },
    { roman: "VII", share: 5 },
  ],
};

const DEGREES = ["i", "ii", "iii", "iv", "v", "vi", "vii"];

/** The key a Roman numeral names from a home key ("vi" of C: "a"; "III" of c: "Eb"). */
export function keyOfRoman(home: string, roman: string): string {
  const deg = DEGREES.indexOf(roman.toLowerCase());
  if (deg < 0) throw new Error(`unknown degree ${roman}`);
  const tonic = atPlace({ deg, alter: 0, octave: 0, raised: false }, home).replace(/-?\d+$/, "");
  const major = roman !== roman.toLowerCase();
  return major ? tonic : tonic[0].toLowerCase() + tonic.slice(1);
}

/** The choices for a home key, the relative first. */
export const choicesFor = (home: string) => FIRST_AWAY[modeOf(home)];
