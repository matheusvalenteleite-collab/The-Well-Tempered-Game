/**
 * D222: each fugue's difficulty at its standard tempo (D208: the only one played), measured, not
 * guessed: how many notes a second the busiest voice and the average voice play (90th percentile over
 * 4 s windows), how quick the quick notes are (the 25th percentile between onsets), how often the line
 * leaps (a fourth or more), and how many voices there are. Stars from fixed cut-offs on the score.
 */
import { beatOf, type TouchFugue } from "../touch/fugue.ts";
import { laneNotes } from "../touch/lanes.ts";
import { tempoOf } from "../touch/tempi.ts";
import { moves } from "./protos.ts";

export interface Difficulty {
  /** Notes a second: the busiest voice, the voices on average. */
  busiest: number;
  average: number;
  /** Seconds between onsets, 25th percentile (the quick notes). */
  quick: number;
  /** Share of moves that leap (a fourth or more). */
  leaps: number;
  score: number;
  stars: number;
}

export const STAR_CUTS = [4.0, 5.0, 6.2, 7.4];

export function difficultyOf(f: TouchFugue): Difficulty {
  const sPerTick = 60 / (tempoOf(f.id) * f.tpq);
  const beat = beatOf(f).ticks;
  const iois: number[] = [];
  const loads: number[] = [];
  let leaps = 0;
  let mv = 0;
  for (let v = 0; v < f.voices.length; v++) {
    const ns = laneNotes(f.voices[v], beat, v).filter((n, i, a) => !(i > 0 && a[i - 1].on === n.on));
    const ms = moves(ns, beat);
    for (let i = 1; i < ns.length; i++) {
      iois.push((ns[i].on - ns[i - 1].on) * sPerTick);
      if (ms[i].size >= 0) (mv++, ms[i].size >= 3 && leaps++);
    }
    // Onsets a second over 4 s windows, a window a second; two pointers.
    const ons = ns.map((n) => n.on * sPerTick);
    const w: number[] = [];
    let a = 0;
    let b = 0;
    for (let s = 0; s < (ons.at(-1) ?? 0); s += 1) {
      while (a < ons.length && ons[a] < s) a++;
      while (b < ons.length && ons[b] < s + 4) b++;
      w.push((b - a) / 4);
    }
    w.sort((x, y) => x - y);
    loads.push(w[Math.floor(w.length * 0.9)] ?? 0);
  }
  iois.sort((x, y) => x - y);
  const quick = iois[Math.floor(iois.length * 0.25)] ?? 1;
  const busiest = Math.max(...loads);
  const average = loads.reduce((x, y) => x + y, 0) / Math.max(1, loads.length);
  const leapShare = leaps / Math.max(1, mv);
  const score = busiest * 0.5 + average * 0.5 + 0.15 / quick + leapShare * 6 + (f.voices.length - 3) * 0.3;
  const stars = 1 + STAR_CUTS.filter((c) => score > c).length;
  return { busiest, average, quick, leaps: leapShare, score, stars };
}
