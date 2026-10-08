/**
 * Evaluation overlay: the interval of every bar (drawn between the staves) and the lines that
 * connect the bars involved in a motion or melodic problem. Pure; the score only draws it.
 */
import { harmonic, interval, motion, simpleName } from "../../counterpoint/interval.ts";
import type { Severity, Violation } from "../../counterpoint/rules/types.ts";
import { slotLayout, slotsOfBars, sounding, type Slot } from "../../counterpoint/layout.ts";

export type Status = "ok" | "neutral" | Severity;

export interface IntervalLabel {
  /** Slot index relative to the first slot drawn. */
  column: number;
  text: string;
  status: Status;
}

export interface Link {
  from: number;
  to: number;
  /** Stacking row, so links sharing a bar do not overlap. */
  row: number;
  severity: Severity;
  /** "motion": between the interval labels; "melodic": between the counterpoint notes. */
  kind: "motion" | "melodic";
  text: string;
}

export interface Overlay {
  intervals: IntervalLabel[];
  links: Link[];
}

/** Rules about the vertical interval of a bar (colour the label). */
const VERTICAL = new Set([
  "fs.prefer-imperfect-consonances", "fs.vertical-consonance", "fs.opening-perfect", "fs.final-octave-or-unison", "fs.unison-only-at-ends", "fs.cadence",
  "ss.downbeat-consonance", "ss.passing-dissonance", "ss.opening-perfect", "ss.final-octave-or-unison", "ss.cadence", "ss.unison-only-at-ends", "ss.prefer-imperfect-consonances",
  "ts.downbeat-consonance", "ts.dissonance", "ts.cadence", "ts.opening-perfect", "ts.final-octave-or-unison", "ts.unison-only-at-ends",
  "fos.arsis-consonant", "fos.resolution", "fos.ligature-kinds", "fos.cadence", "fos.ligature-where-possible", "fos.opening-perfect", "fos.final-octave-or-unison", "fos.unison-only-at-ends",
]);
/** Rules about the motion from one note to another (connect the labels). */
const MOTION = new Set([
  "fs.perfect-approach", "fs.converging-leap-into-octave", "fs.prefer-contrary-motion",
  "ss.perfect-approach", "ss.downbeat-succession", "ss.converging-leap-into-octave", "ss.prefer-contrary-motion",
  "ts.perfect-approach", "ts.converging-leap-into-octave",
  "fos.perfect-approach", "fos.converging-leap-into-octave",
]);
/** Rules about a leap in the counterpoint (connect the notes). */
const MELODIC = new Set(["fs.melodic-tritone", "fs.melodic-major-sixth", "fs.unison-leap", "ss.melodic-tritone", "ss.melodic-major-sixth", "ts.melodic-tritone", "ts.melodic-major-sixth", "fos.melodic-tritone", "fos.melodic-major-sixth"]);
/** Rules whose positions are each, separately, a wrong interval (not a pair). */
const EACH = new Set(["fs.cadence"]);

const ARROW: Record<string, string> = { up: "↑", down: "↓", none: "" };

/**
 * Build the overlay for bars lo..hi (inclusive); slot indices in the result are relative to the
 * first slot of bar lo. Every violation must belong to one of the three groups, so no finding is
 * ever left undrawn.
 */
export function buildOverlay(
  violations: Violation[],
  cantus: string[],
  counterpoint: (string | null)[],
  layout: Slot[] = slotLayout("first", cantus.length),
  lo = 0,
  hi = cantus.length - 1,
): Overlay {
  const slots = slotsOfBars(layout, lo, hi);
  const first = slots[0];
  const inRange = (k: number) => slots.includes(k);
  const cf = (k: number) => cantus[layout[k].bar];
  const cp = (k: number) => counterpoint[k]!;
  const status = new Map<number, Status>();
  const links: Link[] = [];
  const previousSounding = (k: number) => {
    for (let j = k - 1; j >= 0; j--) if (sounding(counterpoint[j])) return j;
    return -1;
  };
  for (const v of violations) {
    const mark = (k: number) => {
      if (status.get(k) !== "error") status.set(k, v.severity);
    };
    if (VERTICAL.has(v.ruleId)) {
      // The first-species cadence rule lists [penultimate, final]; only the penultimate interval is wrong.
      for (const k of EACH.has(v.ruleId) ? [v.positions[0]] : v.positions) mark(k);
    } else if (MOTION.has(v.ruleId)) {
      // Pair rules list [from, to]; prefer-contrary-motion lists every arrival.
      const pairs = v.ruleId.endsWith("prefer-contrary-motion") ? v.positions.map((k) => [previousSounding(k), k]) : [[Math.min(...v.positions), Math.max(...v.positions)]];
      for (const [a, b] of pairs) {
        if (!inRange(a) || !inRange(b)) continue;
        mark(b); // the interval arrived at by the faulty motion
        const m = motion(cf(a), cp(a), cf(b), cp(b));
        const from = simpleName(harmonic(cf(a), cp(a)));
        const to = simpleName(harmonic(cf(b), cp(b)));
        const text = v.ruleId.endsWith("converging-leap-into-octave") ? `leap ${from}→${to}` : `${m} ${from}→${to}`;
        links.push({ from: a - first, to: b - first, row: 0, severity: v.severity, kind: "motion", text });
      }
    } else if (MELODIC.has(v.ruleId)) {
      const [a, b] = [Math.min(...v.positions), Math.max(...v.positions)];
      if (!inRange(a) || !inRange(b)) continue;
      const i = interval(cp(a), cp(b));
      links.push({ from: a - first, to: b - first, row: 0, severity: v.severity, kind: "melodic", text: `${simpleName(i)}${ARROW[i.direction]}` });
    } else {
      throw new Error(`no overlay drawing defined for rule ${v.ruleId}`);
    }
  }
  // Stagger links of the same kind that touch a common slot onto alternating rows.
  links.sort((x, y) => x.from - y.from || x.to - y.to);
  links.forEach((l, i) => {
    const prev = links.slice(0, i).reverse().find((o) => o.kind === l.kind && o.to >= l.from);
    if (prev) l.row = prev.row === 0 ? 1 : 0;
  });
  const intervals: IntervalLabel[] = [];
  for (const k of slots) {
    if (!sounding(counterpoint[k])) continue;
    intervals.push({ column: k - first, text: simpleName(harmonic(cf(k), cp(k))), status: status.get(k) ?? "ok" });
  }
  return { intervals, links };
}

/** Intervals of the written notes only, with no judgement (the "intervals" view before evaluation). */
export function neutralOverlay(cantus: string[], counterpoint: (string | null)[], layout: Slot[]): Overlay {
  const intervals: IntervalLabel[] = [];
  layout.forEach((sl, k) => {
    const cp = counterpoint[k];
    if (sounding(cp)) intervals.push({ column: k, text: simpleName(harmonic(cantus[sl.bar], cp)), status: "neutral" });
  });
  return { intervals, links: [] };
}
