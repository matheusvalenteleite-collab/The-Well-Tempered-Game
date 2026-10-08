/** Melodic profile of a cantus firmus (used for the generator report and, later, the generator). */
import { interval, isLeap } from "../interval.ts";
import { parsePitch } from "../../music/pitch.ts";

export interface LeapContinuation {
  at: number;
  leap: string;
  /** What the melody does next. */
  next: "step-contrary" | "step-same" | "leap-contrary" | "leap-same" | "repeat" | "end";
  nextInterval: string | null;
}

export interface CantusProfile {
  pitches: string[];
  length: number;
  range: { lowest: string; highest: string; interval: string; semitones: number };
  /** Melodic intervals in order, with direction: "+M2", "-m3" ... */
  intervals: string[];
  intervalCounts: Record<string, number>;
  steps: number;
  leaps: number;
  repeats: number;
  leapFrequency: number;
  leapContinuations: LeapContinuation[];
  highPoint: { pitch: string; positions: number[] };
  lowPoint: { pitch: string; positions: number[] };
  finalApproach: string;
  startsOnFinal: boolean;
  endsOnFinal: boolean;
}

const signed = (from: string, to: string) => {
  const i = interval(from, to);
  return (i.direction === "up" ? "+" : i.direction === "down" ? "-" : "=") + i.name;
};

export function profileCantus(pitches: string[], final: string): CantusProfile {
  const midis = pitches.map((p) => parsePitch(p).midi);
  const hi = Math.max(...midis);
  const lo = Math.min(...midis);
  const ivs = pitches.slice(1).map((p, k) => interval(pitches[k], p));
  const intervals = pitches.slice(1).map((p, k) => signed(pitches[k], p));
  const counts: Record<string, number> = {};
  for (const s of intervals) counts[s] = (counts[s] ?? 0) + 1;
  const continuations: LeapContinuation[] = [];
  ivs.forEach((i, k) => {
    if (!isLeap(i)) return;
    const n = ivs[k + 1];
    let next: LeapContinuation["next"] = "end";
    if (n) {
      if (n.direction === "none") next = "repeat";
      else {
        const same = n.direction === i.direction;
        next = `${isLeap(n) ? "leap" : "step"}-${same ? "same" : "contrary"}` as LeapContinuation["next"];
      }
    }
    continuations.push({ at: k, leap: intervals[k], next, nextInterval: n ? intervals[k + 1] : null });
  });
  const lowest = pitches[midis.indexOf(lo)];
  const highest = pitches[midis.indexOf(hi)];
  const step = (p: string) => parsePitch(p).step;
  return {
    pitches,
    length: pitches.length,
    range: { lowest, highest, interval: interval(lowest, highest).name, semitones: hi - lo },
    intervals,
    intervalCounts: counts,
    steps: ivs.filter((i) => i.number === 2).length,
    leaps: ivs.filter(isLeap).length,
    repeats: ivs.filter((i) => i.number === 1).length,
    leapFrequency: ivs.filter(isLeap).length / ivs.length,
    leapContinuations: continuations,
    highPoint: { pitch: highest, positions: midis.flatMap((m, k) => (m === hi ? [k] : [])) },
    lowPoint: { pitch: lowest, positions: midis.flatMap((m, k) => (m === lo ? [k] : [])) },
    finalApproach: intervals[intervals.length - 1],
    startsOnFinal: step(pitches[0]) === final,
    endsOnFinal: step(pitches[pitches.length - 1]) === final,
  };
}
