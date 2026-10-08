/**
 * Evaluation overlay: the interval of every bar (drawn between the staves) and the lines that
 * connect the bars involved in a motion or melodic problem. Pure; the score only draws it.
 */
import { harmonic, interval, motion, simpleName } from "../../counterpoint/interval.ts";
import type { Severity, Violation } from "../../counterpoint/rules/types.ts";

export type Status = "ok" | Severity;

export interface IntervalLabel {
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
const VERTICAL = new Set(["fs.vertical-consonance", "fs.opening-perfect", "fs.final-octave-or-unison", "fs.unison-only-at-ends", "fs.cadence", "fs.no-voice-crossing"]);
/** Rules about the motion from one bar to the next (connect the labels). */
const MOTION = new Set(["fs.perfect-approach", "fs.converging-leap-into-octave", "fs.prefer-contrary-motion"]);
/** Rules about a leap in the counterpoint (connect the notes). */
const MELODIC = new Set(["fs.melodic-tritone", "fs.melodic-major-sixth", "fs.unison-leap"]);

const ARROW: Record<string, string> = { up: "↑", down: "↓", none: "" };

/**
 * Build the overlay for columns lo..hi (inclusive); columns in the result are relative to lo.
 * Every violation must belong to one of the three groups, so no finding is ever left undrawn.
 */
export function buildOverlay(violations: Violation[], cantus: string[], counterpoint: (string | null)[], lo = 0, hi = cantus.length - 1): Overlay {
  const status = new Map<number, Status>();
  const links: Link[] = [];
  const inRange = (k: number) => k >= lo && k <= hi;
  for (const v of violations) {
    const mark = (k: number) => {
      if (status.get(k) !== "error") status.set(k, v.severity);
    };
    if (VERTICAL.has(v.ruleId)) {
      // The cadence rule lists [penultimate, final]; only the penultimate interval is wrong.
      for (const k of v.ruleId === "fs.cadence" ? [v.positions[0]] : v.positions) mark(k);
    } else if (MOTION.has(v.ruleId)) {
      // perfect-approach and converging leaps list [k-1, k]; prefer-contrary-motion lists every arrival bar.
      const arrivals = v.ruleId === "fs.prefer-contrary-motion" ? v.positions : [Math.max(...v.positions)];
      for (const k of arrivals) {
        if (!inRange(k - 1) || !inRange(k)) continue;
        mark(k); // the interval arrived at by the faulty motion
        const m = motion(cantus[k - 1], counterpoint[k - 1]!, cantus[k], counterpoint[k]!);
        const from = simpleName(harmonic(cantus[k - 1], counterpoint[k - 1]!));
        const to = simpleName(harmonic(cantus[k], counterpoint[k]!));
        const text = v.ruleId === "fs.converging-leap-into-octave" ? `leap ${from}→${to}` : `${m} ${from}→${to}`;
        links.push({ from: k - 1 - lo, to: k - lo, row: 0, severity: v.severity, kind: "motion", text });
      }
    } else if (MELODIC.has(v.ruleId)) {
      const [a, b] = [Math.min(...v.positions), Math.max(...v.positions)];
      if (!inRange(a) || !inRange(b)) continue;
      const i = interval(counterpoint[a]!, counterpoint[b]!);
      links.push({ from: a - lo, to: b - lo, row: 0, severity: v.severity, kind: "melodic", text: `${simpleName(i)}${ARROW[i.direction]}` });
    } else {
      throw new Error(`no overlay drawing defined for rule ${v.ruleId}`);
    }
  }
  // Stagger links of the same kind that touch a common bar onto alternating rows.
  links.sort((x, y) => x.from - y.from || x.to - y.to);
  links.forEach((l, i) => {
    const prev = links.slice(0, i).reverse().find((o) => o.kind === l.kind && o.to >= l.from);
    if (prev) l.row = prev.row === 0 ? 1 : 0;
  });
  const intervals: IntervalLabel[] = [];
  for (let k = lo; k <= hi; k++) {
    const cp = counterpoint[k];
    if (cp === null) continue;
    intervals.push({ column: k - lo, text: simpleName(harmonic(cantus[k], cp)), status: status.get(k) ?? "ok" });
  }
  return { intervals, links };
}
