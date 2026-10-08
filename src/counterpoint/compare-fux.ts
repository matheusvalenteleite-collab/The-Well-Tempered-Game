/**
 * Bar-by-bar comparison of the player's counterpoint with Fux's, judged only by criteria Fux states:
 * imperfect rather than perfect consonances (1725 p. 46), contrary or oblique motion (p. 45) and
 * ease of singing, i.e. smaller leaps (p. 53: in counterpoint "omnia cantu facillima esse debent").
 * Fux's choice is not presumed better: each criterion is reported for whichever side it favours.
 */
import { harmonic, interval, isImperfectConsonance, isPerfectConsonance, motion, simpleName } from "./interval.ts";
import { parsePitch } from "../music/pitch.ts";

export type Criterion = "imperfect" | "motion" | "singable";

export interface BarDifference {
  /** 0-based column. */
  column: number;
  player: string;
  fux: string;
  playerInterval: string;
  fuxInterval: string;
  /** Criteria on which Fux's note is better here. */
  fuxBetter: Criterion[];
  /** Criteria on which the player's note is better here. */
  playerBetter: Criterion[];
}

const leapAround = (line: string[], k: number) => {
  let total = 0;
  for (const j of [k - 1, k + 1]) if (j >= 0 && j < line.length) total += Math.abs(parsePitch(line[k]).midi - parsePitch(line[j]).midi);
  return total;
};

const goodMotion = (cantus: string[], line: string[], k: number) => {
  if (k === 0) return null;
  const m = motion(cantus[k - 1], line[k - 1], cantus[k], line[k]);
  return m === "contrary" || m === "oblique";
};

export function compareWithFux(cantus: string[], player: string[], fux: string[]): BarDifference[] {
  if (player.length !== cantus.length || fux.length !== cantus.length) throw new Error("lines must match the cantus in length");
  const out: BarDifference[] = [];
  cantus.forEach((cf, k) => {
    if (player[k] === fux[k]) return;
    const pi = harmonic(cf, player[k]);
    const fi = harmonic(cf, fux[k]);
    const fuxBetter: Criterion[] = [];
    const playerBetter: Criterion[] = [];
    const interior = k > 0 && k < cantus.length - 1;
    if (interior && isImperfectConsonance(fi) && isPerfectConsonance(pi)) fuxBetter.push("imperfect");
    if (interior && isImperfectConsonance(pi) && isPerfectConsonance(fi)) playerBetter.push("imperfect");
    const pm = goodMotion(cantus, player, k);
    const fm = goodMotion(cantus, fux, k);
    if (fm === true && pm === false) fuxBetter.push("motion");
    if (pm === true && fm === false) playerBetter.push("motion");
    const pl = leapAround(player, k);
    const fl = leapAround(fux, k);
    if (fl + 2 < pl) fuxBetter.push("singable"); // a margin of more than a whole tone in total
    if (pl + 2 < fl) playerBetter.push("singable");
    out.push({ column: k, player: player[k], fux: fux[k], playerInterval: simpleName(pi), fuxInterval: simpleName(fi), fuxBetter, playerBetter });
  });
  return out;
}

/** Melodic interval helper for display. */
export const melodic = (a: string, b: string) => interval(a, b);
