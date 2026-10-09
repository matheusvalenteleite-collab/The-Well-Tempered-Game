/**
 * Fux's habits as features: each feature names what a note does in its context (a melodic move,
 * a pair of moves, the interval with the cantus near the cadence, ...) as one or more keys. A
 * feature's frequencies are counted on Fux's solutions; a candidate costs the surprisal (bits) of
 * its keys. Features are kept only when they predict Fux's own choices better, measured with each
 * exercise left out of its own model (tools/lab/habits-study.ts, docs/fux/habits-study.md).
 */
import { harmonic, isImperfectConsonance, isPerfectConsonance, motion, simpleName } from "../interval.ts";
import { parsePitch } from "../../music/pitch.ts";
import type { Staff } from "../../music/fux/index.ts";
import type { Slot } from "../layout.ts";
import { onsets, type FuxLine } from "./corpus.ts";
import { bits, roleOf, verticalKey } from "./keys.ts";

export interface FeatureInput {
  layout: Slot[];
  cantus: string[];
  line: (string | null)[];
  cantusVoice: Staff;
  /** The slots chosen together (one slot, or a fourth-species ligature). */
  unit: number[];
}

export interface Feature {
  id: string;
  /** What the feature measures, for the report. */
  label: string;
  keys(x: FeatureInput): string[];
}

const midi = (p: string) => parsePitch(p).midi;

/** The line's onsets and the position of the unit's first slot among them. */
function around(x: FeatureInput) {
  const on = onsets(x.layout, x.line);
  const i = on.findIndex(([s]) => s === x.unit[0]);
  return { on, i };
}

/** Signed melodic move in semitones from onset j to j + 1 (undefined at the edges). */
const move = (on: [number, string][], j: number) => (j >= 0 && j + 1 < on.length ? midi(on[j + 1][1]) - midi(on[j][1]) : undefined);

/** A move in coarse classes: repeat, step, third, fourth-fifth, larger; signed. */
export function moveClass(d: number): string {
  const a = Math.abs(d);
  const c = a === 0 ? "0" : a <= 2 ? "s" : a <= 4 ? "3" : a <= 7 ? "5" : "L";
  return a === 0 ? c : `${d > 0 ? "+" : "-"}${c}`;
}

const cf = (x: FeatureInput, s: number) => x.cantus[x.layout[s].bar];
const sounding = (p: string | null | undefined): p is string => !!p && /^[A-G]/.test(p);

/* ---------------------------------------------------------------- the features */

/** Melodic moves into and out of the note, in semitones, pooled over voice positions. */
export const melodicPooled: Feature = {
  id: "melodic",
  label: "melodic move into and out of the note (semitones)",
  keys(x) {
    const { on, i } = around(x);
    return [move(on, i - 1), move(on, i)].filter((d): d is number => d !== undefined).map((d) => String(Math.max(-12, Math.min(12, d))));
  },
};

/** The same, separately for a counterpoint above and below the cantus. */
export const melodicByRole: Feature = {
  id: "melodic-role",
  label: "melodic move, counterpoint above or below kept apart",
  keys(x) {
    return melodicPooled.keys(x).map((k) => `${roleOf(x.cantusVoice)}:${k}`);
  },
};

/** The interval with the cantus (with octaves and crossing), downbeats and other beats apart. */
export const vertical: Feature = {
  id: "vertical",
  label: "interval with the cantus, with register and crossing; downbeat or not",
  keys(x) {
    return x.unit.filter((s) => sounding(x.line[s])).map((s) => `${x.layout[s].beat === 0 ? "d" : "u"}:${verticalKey(cf(x, s), x.line[s]!, x.cantusVoice)}`);
  },
};

/** Pairs of successive moves touching the note: what follows a leap, what precedes it. */
export const movePairs: Feature = {
  id: "move-pairs",
  label: "pairs of successive moves (e.g. a leap of a fourth up, then a step down)",
  keys(x) {
    const { on, i } = around(x);
    const out: string[] = [];
    for (const j of [i - 2, i - 1, i]) {
      const a = move(on, j);
      const b = move(on, j + 1);
      if (a !== undefined && b !== undefined) out.push(`${moveClass(a)}>${moveClass(b)}`);
    }
    return out;
  },
};

/** The interval with the cantus in the last three bars, by bar: Fux's ways into the cadence. */
export const cadenceApproach: Feature = {
  id: "cadence",
  label: "interval with the cantus in each of the last three bars",
  keys(x) {
    const bars = x.cantus.length;
    return x.unit
      .filter((s) => sounding(x.line[s]) && x.layout[s].bar >= bars - 3)
      .map((s) => `${bars - 1 - x.layout[s].bar}:${x.layout[s].beat}:${simpleName(harmonic(cf(x, s), x.line[s]!))}`);
  },
};

/** How a downbeat is reached and left: motion with the cantus and the kind of consonance it arrives at. */
export const arrival: Feature = {
  id: "arrival",
  label: "motion into and out of a downbeat, with the consonance it arrives at",
  keys(x) {
    const { on, i } = around(x);
    const out: string[] = [];
    for (const [a, b] of [[i - 1, i], [i, i + 1]]) {
      if (a < 0 || b >= on.length) continue;
      const [sa, pa] = on[a];
      const [sb, pb] = on[b];
      if (x.layout[sb].beat !== 0) continue;
      const iv = harmonic(cf(x, sb), pb);
      const kind = isPerfectConsonance(iv) ? "P" : isImperfectConsonance(iv) ? "I" : "D";
      out.push(`${motion(cf(x, sa), pa, cf(x, sb), pb)}>${kind}`);
    }
    return out;
  },
};

/** Runs of the same imperfect interval on successive downbeats (parallel thirds or sixths). */
export const imperfectRuns: Feature = {
  id: "runs",
  label: "length of a run of the same third or sixth on successive downbeats",
  keys(x) {
    const s0 = x.unit.find((s) => x.layout[s].beat === 0);
    if (s0 === undefined || !sounding(x.line[s0])) return [];
    const downs = x.layout.flatMap((sl, k) => (sl.beat === 0 && sounding(x.line[k]) ? [k] : []));
    const name = (k: number) => simpleName(harmonic(cf(x, k), x.line[k]!));
    const at = downs.indexOf(s0);
    const here = name(s0);
    if (!/^[Mm](3|6)$/.test(here)) return ["none"];
    let lo = at;
    let hi = at;
    while (lo > 0 && name(downs[lo - 1]) === here) lo--;
    while (hi + 1 < downs.length && name(downs[hi + 1]) === here) hi++;
    return [`run${Math.min(4, hi - lo + 1)}`];
  },
};

/** The range of the whole line. */
export const ambitus: Feature = {
  id: "ambitus",
  label: "range of the whole line",
  keys(x) {
    const ps = x.line.filter(sounding).map(midi);
    const r = Math.max(...ps) - Math.min(...ps);
    return [r <= 7 ? "≤5th" : r <= 9 ? "6th" : r <= 12 ? "7th-8ve" : r <= 16 ? "9th-10th" : ">10th"];
  },
};

/** How many times the line's highest note is struck. */
export const peaks: Feature = {
  id: "peaks",
  label: "how many times the highest note is struck",
  keys(x) {
    const on = onsets(x.layout, x.line).map(([, p]) => midi(p));
    const top = Math.max(...on);
    const n = on.filter((m) => m === top).length;
    return [n >= 3 ? "3+" : String(n)];
  },
};

/** Melodic moves by the beat they land on: into a downbeat or an upbeat. */
export const melodicByBeat: Feature = {
  id: "melodic-beat",
  label: "melodic move by the beat it lands on (downbeat or not)",
  keys(x) {
    const { on, i } = around(x);
    const out: string[] = [];
    for (const j of [i - 1, i]) {
      const d = move(on, j);
      if (d === undefined) continue;
      out.push(`${x.layout[on[j + 1][0]].beat === 0 ? "d" : "u"}:${Math.max(-12, Math.min(12, d))}`);
    }
    return out;
  },
};

/** The same fifth or octave on two successive downbeats, broken by what lies between. */
export const successiveDownbeats: Feature = {
  id: "succession",
  label: "the same fifth or octave on successive downbeats (or not)",
  keys(x) {
    const s0 = x.unit.find((s) => x.layout[s].beat === 0);
    if (s0 === undefined || !sounding(x.line[s0])) return [];
    const downs = x.layout.flatMap((sl, k) => (sl.beat === 0 && sounding(x.line[k]) ? [k] : []));
    const at = downs.indexOf(s0);
    const name = (k: number) => simpleName(harmonic(cf(x, k), x.line[k]!)).replace(/^1$/, "8");
    const out: string[] = [];
    for (const [a, b] of [[at - 1, at], [at, at + 1]]) {
      if (a < 0 || b >= downs.length) continue;
      const same = name(downs[a]) === name(downs[b]) && /^(5|8)$/.test(name(downs[b]));
      out.push(same ? "same-perfect" : "other");
    }
    return out;
  },
};

export const ALL_FEATURES: Feature[] = [melodicPooled, melodicByRole, vertical, movePairs, cadenceApproach, arrival, imperfectRuns, ambitus, peaks, melodicByBeat, successiveDownbeats];

/* ---------------------------------------------------------------- tables */

export type FeatureTables = Map<string, { counts: Map<string, number>; total: number }>;

/** Count each feature's keys at every choice of the given lines. */
export function learnFeatures(lines: FuxLine[], features: Feature[], unitsOf: (l: FuxLine) => number[][]): FeatureTables {
  const t: FeatureTables = new Map(features.map((f) => [f.id, { counts: new Map(), total: 0 }]));
  for (const l of lines) {
    for (const unit of unitsOf(l)) {
      const x: FeatureInput = { layout: l.layout, cantus: l.cantus, line: l.line, cantusVoice: l.cantusVoice, unit };
      for (const f of features) {
        const tab = t.get(f.id)!;
        for (const k of f.keys(x)) {
          tab.counts.set(k, (tab.counts.get(k) ?? 0) + 1);
          tab.total++;
        }
      }
    }
  }
  return t;
}

/** Surprisal of a candidate (bits), summed over the features. */
export function featureBits(t: FeatureTables, features: Feature[], x: FeatureInput): number {
  let h = 0;
  for (const f of features) {
    const tab = t.get(f.id)!;
    const size = tab.counts.size + 1;
    for (const k of f.keys(x)) h += bits(((tab.counts.get(k) ?? 0) + 0.5) / (tab.total + 0.5 * size));
  }
  return h;
}

/**
 * The model in use: the habits that predict Fux's choices once the others are in, with weights
 * learnt from his solutions (tools/lab/habits-study.ts; docs/fux/habits-study.md). A candidate
 * costs Σ weight × surprisal; with these weights the model's odds are calibrated on Fux.
 */
export const MODEL_FEATURES: Feature[] = [melodicByRole, vertical, movePairs, arrival, successiveDownbeats];
export const MODEL_WEIGHTS: Record<string, number> = { "melodic-role": 0.56, vertical: 0.37, "move-pairs": 0.26, arrival: 0.58, succession: 0.21 };
/** Which part of the habit cost a feature belongs to, for display. */
export const MELODIC_FEATURES = new Set(["melodic-role", "move-pairs"]);

/** The model's cost of a candidate, split into its melodic and vertical parts (bits, weighted). */
export function modelBits(t: FeatureTables, x: FeatureInput): { melodic: number; vertical: number } {
  let melodic = 0;
  let vertical = 0;
  for (const f of MODEL_FEATURES) {
    const h = MODEL_WEIGHTS[f.id] * featureBits(t, [f], x);
    if (MELODIC_FEATURES.has(f.id)) melodic += h;
    else vertical += h;
  }
  return { melodic, vertical };
}
