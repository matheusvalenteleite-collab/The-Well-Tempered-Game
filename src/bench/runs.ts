/**
 * D332 (WTC 1.49), THE LAB's RUNS "lenient": fast stepwise runs on LADDER. A run is at least
 * MECH.runMinNotes struck notes in a row, each a step (one staff step) the same way as the one before,
 * each following the one before by less than MECH.runIoiMs. Inside a run (its second note on) a landing
 * is right when it goes the run's way, or is level within the step leeway, from EITHER thumb's last
 * touch, and the line's travel (TRAVEL_MIN) is not asked; instead the run as a whole is checked at its
 * last note: the thumbs' landings over it must trend the run's way (the least-squares slope of height
 * against time travelling at least MECH.runTravelRows drawn rows per step of the run's span). RUN ✓ / RUN ✗
 * in the lab's WHAT HAPPENED;
 * on RUN ✗ the notes right only by the run rule are re-judged wrong (their points taken back).
 */
import type { LaneNote } from "../touch/lanes.ts";

export interface Run {
  /** The run's index in its track (0, 1, …). */
  id: number;
  /** +1 up, −1 down. */
  dir: 1 | -1;
  /** The struck notes' indices (each the first of its onset), the run's first note first. */
  notes: number[];
  /** The last note's index. */
  last: number;
}

/**
 * The runs of a track: a map from each note index under the run rule (a run's second note on) to its run.
 * `msBetween(a, b)` is the time between two ticks (ms). Chords (two notes at one onset) and riding notes
 * break a run.
 */
export function findRuns(notes: readonly LaneNote[], msBetween: (a: number, b: number) => number, minNotes: number, ioiMs: number): Map<number, Run> {
  const out = new Map<number, Run>();
  // The struck notes in order: one per onset, single notes only (a chord: -1, a break).
  const seq: number[] = [];
  const count = new Map<number, number>();
  for (const n of notes) if (!n.ride) count.set(n.on, (count.get(n.on) ?? 0) + 1);
  const seen = new Set<number>();
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    if (n.ride || seen.has(n.on)) continue;
    seen.add(n.on);
    seq.push(count.get(n.on)! > 1 ? -1 : i);
  }
  let id = 0;
  let from = 0;
  const close = (to: number, dir: number) => {
    // seq[from..to] all one way by steps.
    if (to - from + 1 >= minNotes && dir !== 0) {
      const run: Run = { id: id++, dir: dir > 0 ? 1 : -1, notes: seq.slice(from, to + 1), last: seq[to] };
      for (let q = from + 1; q <= to; q++) out.set(seq[q], run);
    }
  };
  let dir = 0;
  for (let q = 1; q <= seq.length; q++) {
    const a = seq[q - 1];
    const b = seq[q];
    let d = 0;
    if (q < seq.length && a >= 0 && b >= 0) {
      const steps = notes[b].step - notes[a].step;
      if (Math.abs(steps) === 1 && msBetween(notes[a].on, notes[b].on) < ioiMs) d = steps;
    }
    if (d !== 0 && (dir === 0 || d === dir)) {
      dir = d;
      continue;
    }
    close(q - 1, dir);
    // The step that broke the run (the other way) may start the next one from the note before.
    if (d !== 0) (from = q - 1), (dir = d);
    else (from = q), (dir = 0);
  }
  return out;
}

/** The least-squares slope of y against t (NaN with fewer than two distinct times). */
export function slope(points: readonly { t: number; y: number }[]): number {
  const n = points.length;
  if (n < 2) return NaN;
  const mt = points.reduce((s, p) => s + p.t, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) (num += (p.t - mt) * (p.y - my)), (den += (p.t - mt) ** 2);
  return den > 0 ? num / den : NaN;
}

/**
 * The run's trend from the thumbs' landings (screen y, down positive; t in seconds): its fitted travel
 * (the slope times the landings' time span, px, + the run's way) at least `needPx`, from three landings
 * or more.
 */
export function runTrend(points: readonly { t: number; y: number }[], dir: 1 | -1, needPx = 0): { ok: boolean; slope: number; travelPx: number; n: number } {
  const s = slope(points);
  const span = points.length ? Math.max(...points.map((p) => p.t)) - Math.min(...points.map((p) => p.t)) : 0;
  const travelPx = Number.isFinite(s) ? -s * dir * span : 0;
  return { ok: points.length >= 3 && Number.isFinite(s) && travelPx > 0 && travelPx >= needPx, slope: s, travelPx, n: points.length };
}
