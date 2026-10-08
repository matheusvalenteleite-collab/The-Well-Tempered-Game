/**
 * Bar-by-bar comparison of the player's counterpoint with Fux's, judged only by criteria Fux states:
 * imperfect rather than perfect consonances (1725 p. 46), contrary or oblique motion (p. 45) and
 * ease of singing, i.e. smaller leaps (p. 53: in counterpoint "omnia cantu facillima esse debent").
 * Fux's choice is not presumed better: each criterion is reported for whichever side it favours.
 */
import { harmonic, interval, isImperfectConsonance, isPerfectConsonance, motion, simpleName } from "./interval.ts";
import { parsePitch } from "../music/pitch.ts";
import { REST, slotLayout, sounding, type Slot } from "./layout.ts";

export type Criterion = "imperfect" | "motion" | "singable" | "variety";
/**
 * A second layer (D55): Alfred Mann's melodic advice in his translation's footnotes, which is his,
 * not Fux's (The Study of Counterpoint, 1965, p. 27 n. 1 and p. 29 n. 3): no leap larger than a
 * fifth except the octave and the rising minor sixth; no two leaps in the same direction; a leap
 * compensated by motion the other way; a tone not repeated more than once.
 */
export type MannCriterion = "largeLeap" | "leapsSameWay" | "uncompensated" | "repeatedTwice";
export const MANN_CRITERIA: MannCriterion[] = ["largeLeap", "leapsSameWay", "uncompensated", "repeatedTwice"];

export interface BarDifference {
  /** 0-based slot. */
  column: number;
  /** 0-based bar of that slot; beat 0 = downbeat, 1 = upbeat. */
  bar: number;
  beat: Slot["beat"];
  player: string;
  fux: string;
  playerInterval: string;
  fuxInterval: string;
  /** Criteria on which Fux's note is better here. */
  fuxBetter: Criterion[];
  /** Criteria on which the player's note is better here. */
  playerBetter: Criterion[];
  /** Mann's criteria (a second layer): on which Fux's note, or the player's, is better here. */
  mannFuxBetter: MannCriterion[];
  mannPlayerBetter: MannCriterion[];
}

const nextIdx = (line: (string | null)[], k: number) => {
  let j = k + 1;
  while (j < line.length && !sounding(line[j])) j++;
  return j < line.length ? j : -1;
};

/** Mann's faults that the note at slot k takes part in (its moves in and out, and their neighbours). */
export function mannFaults(line: (string | null)[], k: number): Set<MannCriterion> {
  const out = new Set<MannCriterion>();
  if (!sounding(line[k])) return out;
  const idx = [previous(line, previous(line, k)), previous(line, k), k, nextIdx(line, k), nextIdx(line, nextIdx(line, k))];
  const d = (a: number, b: number) => (a < 0 || b < 0 || a === b ? null : parsePitch(line[b]!).diatonic - parsePitch(line[a]!).diatonic);
  const st = (a: number, b: number) => parsePitch(line[b]!).midi - parsePitch(line[a]!).midi;
  // The moves touching k: (prev -> k) and (k -> next); with their neighbours for pairs.
  const moves: [number, number][] = [[idx[0], idx[1]], [idx[1], idx[2]], [idx[2], idx[3]], [idx[3], idx[4]]];
  const steps = moves.map(([a, b]) => d(a, b));
  for (const i of [1, 2]) {
    const g = steps[i];
    if (g === null) continue;
    const [a, b] = moves[i];
    const size = Math.abs(g);
    const semis = st(a, b);
    if (size > 4 && !(size === 7) && !(size === 5 && semis === 8)) out.add("largeLeap");
  }
  // Two leaps (a third or more) in the same direction, one of them touching k.
  for (const [i, j] of [[0, 1], [1, 2], [2, 3]]) {
    const x = steps[i];
    const y = steps[j];
    if (x !== null && y !== null && Math.abs(x) >= 2 && Math.abs(y) >= 2 && Math.sign(x) === Math.sign(y)) out.add("leapsSameWay");
  }
  // A leap of a fourth or more not followed by motion the other way.
  for (const [i, j] of [[1, 2], [2, 3]]) {
    const x = steps[i];
    const y = steps[j];
    if (x !== null && Math.abs(x) >= 3 && y !== null && Math.sign(y) === Math.sign(x)) out.add("uncompensated");
  }
  // The same tone three times in a row, k among them.
  const same = (a: number, b: number) => a >= 0 && b >= 0 && line[a] === line[b];
  if ((same(idx[0], idx[1]) && same(idx[1], idx[2])) || (same(idx[1], idx[2]) && same(idx[2], idx[3])) || (same(idx[2], idx[3]) && same(idx[3], idx[4]))) out.add("repeatedTwice");
  return out;
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

const previous = (line: (string | null)[], k: number) => {
  let j = k - 1;
  while (j >= 0 && !sounding(line[j])) j--;
  return j;
};

/** Does the line merely repeat its previous note at slot k? */
const repeats = (line: (string | null)[], k: number) => {
  const j = previous(line, k);
  return j >= 0 && line[j] === line[k];
};

/**
 * Motion into slot k from the previous sounding slot, judged good (contrary/oblique) or not; null when
 * not applicable. Oblique motion obtained by repeating a note is not credited: it is the cheapest way
 * to avoid a bad motion, and Fux treats needless repetition as a fault (variety, below).
 */
const goodMotion = (cf: (k: number) => string, line: (string | null)[], k: number) => {
  const j = previous(line, k);
  if (j < 0 || line[j] === line[k]) return null;
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
      out.push({ ...base, playerInterval: iv(player[k]!), fuxInterval: iv(fux[k]!), fuxBetter: [], playerBetter: [], mannFuxBetter: [], mannPlayerBetter: [] });
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
    // Variety: Aloysius approves avoiding "hateful repetition" (1725 p. 74) and asks for variety in
    // the use of notes (Exercitium II; Mann p. 75). A repeated note is never credited as "singable".
    const pr = repeats(player, k);
    const fr = repeats(fux, k);
    if (pr && !fr) fuxBetter.push("variety");
    if (fr && !pr) playerBetter.push("variety");
    if (!pr && !fr) {
      const pl = leapAround(player, k);
      const fl = leapAround(fux, k);
      if (fl + 2 < pl) fuxBetter.push("singable"); // a margin of more than a whole tone in total
      if (pl + 2 < fl) playerBetter.push("singable");
    }
    const mp = mannFaults(player, k);
    const mf = mannFaults(fux, k);
    const mannFuxBetter = MANN_CRITERIA.filter((c) => mp.has(c) && !mf.has(c));
    const mannPlayerBetter = MANN_CRITERIA.filter((c) => mf.has(c) && !mp.has(c));
    out.push({ ...base, playerInterval: simpleName(pi), fuxInterval: simpleName(fi), fuxBetter, playerBetter, mannFuxBetter, mannPlayerBetter });
  });
  return out;
}

/** Melodic interval helper for display. */
export const melodic = (a: string, b: string) => interval(a, b);
