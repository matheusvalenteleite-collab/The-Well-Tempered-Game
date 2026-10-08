/**
 * Bar-by-bar comparison of the player's counterpoint with Fux's, judged only by criteria Fux states:
 * imperfect rather than perfect consonances (1725 p. 46), contrary or oblique motion (p. 45) and
 * ease of singing, i.e. smaller leaps (p. 53: in counterpoint "omnia cantu facillima esse debent").
 * Fux's choice is not presumed better: each criterion is reported for whichever side it favours.
 */
import { harmonic, interval, isImperfectConsonance, isPerfectConsonance, motion, simpleName } from "./interval.ts";
import { parsePitch } from "../music/pitch.ts";
import { REST, slotLayout, sounding, type Slot } from "./layout.ts";

export type Criterion = "imperfect" | "motion" | "singable";

export interface BarDifference {
  /** 0-based slot. */
  column: number;
  /** 0-based bar of that slot; beat 0 = downbeat, 1 = upbeat. */
  bar: number;
  beat: 0 | 1;
  player: string;
  fux: string;
  playerInterval: string;
  fuxInterval: string;
  /** Criteria on which Fux's note is better here. */
  fuxBetter: Criterion[];
  /** Criteria on which the player's note is better here. */
  playerBetter: Criterion[];
}

/** Total leap (semitones) into and out of slot k, over the sounding notes of the line. */
const leapAround = (line: (string | null)[], k: number) => {
  let total = 0;
  for (const dir of [-1, 1]) {
    let j = k + dir;
    while (j >= 0 && j < line.length && !sounding(line[j])) j += dir;
    if (j >= 0 && j < line.length) total += Math.abs(parsePitch(line[k]!).midi - parsePitch(line[j]!).midi);
  }
  return total;
};

/** Motion into slot k from the previous sounding slot, judged good (contrary/oblique) or not; null when not applicable. */
const goodMotion = (cf: (k: number) => string, line: (string | null)[], k: number) => {
  let j = k - 1;
  while (j >= 0 && !sounding(line[j])) j--;
  if (j < 0) return null;
  const m = motion(cf(j), line[j]!, cf(k), line[k]!);
  return m === "contrary" || m === "oblique";
};

/**
 * Slot-by-slot differences. In second species the "imperfect" and "motion" criteria are judged on
 * downbeats only (an upbeat moves against a held cantus, always obliquely).
 */
export function compareWithFux(cantus: string[], player: (string | null)[], fux: (string | null)[], layout: Slot[] = slotLayout("first", cantus.length)): BarDifference[] {
  if (player.length !== layout.length || fux.length !== layout.length) throw new Error("lines must match the layout in length");
  const cf = (k: number) => cantus[layout[k].bar];
  const out: BarDifference[] = [];
  layout.forEach((slot, k) => {
    if (player[k] === fux[k] || player[k] === null || fux[k] === null) return;
    const base = { column: k, bar: slot.bar, beat: slot.beat, player: player[k]!, fux: fux[k]! };
    if (player[k] === REST || fux[k] === REST) {
      const iv = (x: string) => (x === REST ? "–" : simpleName(harmonic(cf(k), x)));
      out.push({ ...base, playerInterval: iv(player[k]!), fuxInterval: iv(fux[k]!), fuxBetter: [], playerBetter: [] });
      return;
    }
    const pi = harmonic(cf(k), player[k]!);
    const fi = harmonic(cf(k), fux[k]!);
    const fuxBetter: Criterion[] = [];
    const playerBetter: Criterion[] = [];
    const interior = slot.bar > 0 && slot.bar < cantus.length - 1 && slot.beat === 0;
    if (interior && isImperfectConsonance(fi) && isPerfectConsonance(pi)) fuxBetter.push("imperfect");
    if (interior && isImperfectConsonance(pi) && isPerfectConsonance(fi)) playerBetter.push("imperfect");
    if (slot.beat === 0) {
      const pm = goodMotion(cf, player, k);
      const fm = goodMotion(cf, fux, k);
      if (fm === true && pm === false) fuxBetter.push("motion");
      if (pm === true && fm === false) playerBetter.push("motion");
    }
    const pl = leapAround(player, k);
    const fl = leapAround(fux, k);
    if (fl + 2 < pl) fuxBetter.push("singable"); // a margin of more than a whole tone in total
    if (pl + 2 < fl) playerBetter.push("singable");
    out.push({ ...base, playerInterval: simpleName(pi), fuxInterval: simpleName(fi), fuxBetter, playerBetter });
  });
  return out;
}

/** Melodic interval helper for display. */
export const melodic = (a: string, b: string) => interval(a, b);
