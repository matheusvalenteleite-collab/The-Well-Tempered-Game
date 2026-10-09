/**
 * Fux's three-voice habits as features, as features.ts does for two voices: each feature names
 * what a note of an added voice does in its bar and its line as keys; its frequencies are counted
 * on Fux's sixteen solutions, and a candidate costs the surprisal (bits) of its keys. Which features
 * predict his choices, and their weights, are measured with each exercise left out of its own model
 * (tools/lab/trio-habits-study.ts, docs/fux/trio-habits-study.md).
 *
 * The voices may be prefixes (the generator's partial lines): a feature then reads only what is
 * written, and moves out of the bar are counted when the next bar is chosen.
 */
import { harmonic, isImperfectConsonance, isPerfectConsonance, motion, simpleName } from "../interval.ts";
import { parsePitch } from "../../music/pitch.ts";
import { bits } from "./keys.ts";
import { moveClass } from "./features.ts";

const midi = (p: string) => parsePitch(p).midi;

/** The sonority of a bar as Fux would figure it: simple intervals above the lowest note, sorted. */
export function sonorityKey(chord: string[]): string {
  const sorted = [...chord].sort((a, b) => midi(a) - midi(b));
  return sorted
    .slice(1)
    .map((p) => simpleName(harmonic(sorted[0], p)).replace(/^1$/, "8"))
    .sort((a, b) => parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, "")))
    .join(" ");
}

/** Distance between two neighbouring staves in a bar, upper staff first. */
export function spacingKey(upper: string, lower: string): string {
  const h = harmonic(lower, upper);
  const octaves = Math.floor((h.number - 1) / 7) - (h.number > 1 && (h.number - 1) % 7 === 0 ? 1 : 0);
  return `${midi(upper) < midi(lower) ? "x" : ""}${simpleName(h)}${octaves > 0 ? `+${octaves}` : ""}`;
}

/** The highest note of a chord as a simple interval above its lowest ("8" for the final doubled on top). */
export function finalTopKey(chord: string[]): string {
  const sorted = [...chord].sort((a, b) => midi(a) - midi(b));
  return simpleName(harmonic(sorted[0], sorted[sorted.length - 1])).replace(/^1$/, "8");
}

export interface TrioInput {
  /** The three lines, top staff first (whole, or prefixes of the same length). */
  voices: string[][];
  /** The voice chosen (staff 0 top, 1 middle, 2 bottom) and its bar. */
  v: number;
  k: number;
  /** Bars in the exercise (the prefixes may be shorter). */
  bars: number;
}

export interface TrioFeature {
  id: string;
  label: string;
  keys(x: TrioInput): string[];
}

const chordAt = (x: TrioInput, k: number) => x.voices.map((l) => l[k]);
const has = (x: TrioInput, k: number) => k >= 0 && k < x.voices[x.v].length;
/** Index of the lowest voice in bar k. */
const lowestAt = (x: TrioInput, k: number) => {
  const c = chordAt(x, k).map(midi);
  return c.indexOf(Math.min(...c));
};
const moveAt = (x: TrioInput, j: number) => (has(x, j) && has(x, j + 1) ? midi(x.voices[x.v][j + 1]) - midi(x.voices[x.v][j]) : undefined);
const clamp = (d: number) => String(Math.max(-12, Math.min(12, d)));

/* ---------------------------------------------------------------- the features */

export const tMelodicPooled: TrioFeature = {
  id: "t-melodic",
  label: "melodic move into and out of the note, all voices pooled",
  keys: (x) => [moveAt(x, x.k - 1), moveAt(x, x.k)].filter((d): d is number => d !== undefined).map(clamp),
};

/** By staff (top, middle, bottom): the bass leaps more. */
export const tMelodicByStaff: TrioFeature = {
  id: "t-melodic-staff",
  label: "melodic move by staff (top, middle, bottom)",
  keys: (x) => tMelodicPooled.keys(x).map((k) => `${x.v}:${k}`),
};

/** By whether the voice sounds lowest where the move lands (crossing makes the bass change staff). */
export const tMelodicByBass: TrioFeature = {
  id: "t-melodic-bass",
  label: "melodic move by whether the voice is the sounding bass where it lands",
  keys: (x) =>
    [x.k - 1, x.k].flatMap((j) => {
      const d = moveAt(x, j);
      return d === undefined ? [] : [`${lowestAt(x, j + 1) === x.v ? "b" : "u"}:${clamp(d)}`];
    }),
};

export const tMovePairs: TrioFeature = {
  id: "t-move-pairs",
  label: "pairs of successive moves (what follows a leap), by staff",
  keys: (x) =>
    [x.k - 2, x.k - 1, x.k].flatMap((j) => {
      const a = moveAt(x, j);
      const b = moveAt(x, j + 1);
      return a === undefined || b === undefined ? [] : [`${x.v === 2 ? "b" : "u"}:${moveClass(a)}>${moveClass(b)}`];
    }),
};

export const tSonority: TrioFeature = {
  id: "t-sonority",
  label: "the sonority (figures above the bass)",
  keys: (x) => [sonorityKey(chordAt(x, x.k))],
};

export const tSpacing: TrioFeature = {
  id: "t-spacing",
  label: "spacing of the voice from its neighbouring staves",
  keys: (x) => {
    const c = chordAt(x, x.k);
    const out: string[] = [];
    if (x.v <= 1) out.push(`0:${spacingKey(c[0], c[1])}`);
    if (x.v >= 1) out.push(`1:${spacingKey(c[1], c[2])}`);
    return out;
  },
};

/** Which member of the sonority the voice takes: the bass, or its interval above the bass. */
export const tMember: TrioFeature = {
  id: "t-member",
  label: "the chord member the voice takes (bass, third, fifth, sixth, octave), by staff",
  keys: (x) => {
    const c = chordAt(x, x.k);
    const low = lowestAt(x, x.k);
    return [`${x.v}:${low === x.v ? "bass" : simpleName(harmonic(c[low], c[x.v])).replace(/^1$/, "8")}`];
  },
};

/** Motion into and out of the bar with each other voice, by the consonance reached, with or against the bass. */
export const tArrival: TrioFeature = {
  id: "t-arrival",
  label: "motion with each other voice into and out of the bar, by the consonance reached",
  keys: (x) => {
    const out: string[] = [];
    for (const [a, b] of [[x.k - 1, x.k], [x.k, x.k + 1]]) {
      if (!has(x, a) || !has(x, b)) continue;
      const low = lowestAt(x, b);
      for (let y = 0; y < 3; y++) {
        if (y === x.v) continue;
        const iv = harmonic(x.voices[y][b], x.voices[x.v][b]);
        const kind = isPerfectConsonance(iv) ? "P" : isImperfectConsonance(iv) ? "I" : "D";
        out.push(`${low === x.v || low === y ? "b" : "u"}:${motion(x.voices[y][a], x.voices[x.v][a], x.voices[y][b], x.voices[x.v][b])}>${kind}`);
      }
    }
    return out;
  },
};

/** The sonority in each of the last three bars: Fux's ways into the cadence. */
export const tCadence: TrioFeature = {
  id: "t-cadence",
  label: "the sonority in each of the last three bars",
  keys: (x) => (x.k >= x.bars - 3 ? [`${x.bars - 1 - x.k}:${sonorityKey(chordAt(x, x.k))}`] : []),
};

/** The opening sonority (Fux opens on the final in the bass, with octaves, a fifth or a third above). */
export const tOpening: TrioFeature = {
  id: "t-opening",
  label: "the opening sonority",
  keys: (x) => (x.k === 0 ? [sonorityKey(chordAt(x, 0))] : []),
};

/** The top note of the final chord over the bass (pp. 89-90: octave, fifth or major third). */
export const tFinalTop: TrioFeature = {
  id: "t-final-top",
  label: "the top note of the final chord",
  keys: (x) => (x.k === x.bars - 1 ? [finalTopKey(chordAt(x, x.k))] : []),
};

/** The same sonority (as figures) in successive bars. */
export const tSameSonority: TrioFeature = {
  id: "t-same-sonority",
  label: "the same sonority in successive bars (or not)",
  keys: (x) =>
    [[x.k - 1, x.k], [x.k, x.k + 1]].flatMap(([a, b]) => (has(x, a) && has(x, b) ? [sonorityKey(chordAt(x, a)) === sonorityKey(chordAt(x, b)) ? "same" : "other"] : [])),
};

export const ALL_TRIO_FEATURES: TrioFeature[] = [tMelodicPooled, tMelodicByStaff, tMelodicByBass, tMovePairs, tSonority, tSpacing, tMember, tArrival, tCadence, tOpening, tFinalTop, tSameSonority];

/* ---------------------------------------------------------------- tables */

export type TrioFeatureTables = Map<string, { counts: Map<string, number>; total: number }>;

/** Count each feature's keys at every note of Fux's added voices. */
export function learnTrioFeatures(steps: { fux: string[][]; cantusIndex: number }[], features: TrioFeature[]): TrioFeatureTables {
  const t: TrioFeatureTables = new Map(features.map((f) => [f.id, { counts: new Map(), total: 0 }]));
  for (const s of steps) {
    const bars = s.fux[0].length;
    for (let v = 0; v < 3; v++) {
      if (v === s.cantusIndex) continue;
      for (let k = 0; k < bars; k++) {
        for (const f of features) {
          const tab = t.get(f.id)!;
          for (const key of f.keys({ voices: s.fux, v, k, bars })) {
            tab.counts.set(key, (tab.counts.get(key) ?? 0) + 1);
            tab.total++;
          }
        }
      }
    }
  }
  return t;
}

export function trioFeatureBits(t: TrioFeatureTables, features: TrioFeature[], x: TrioInput): number {
  let h = 0;
  for (const f of features) {
    const tab = t.get(f.id);
    if (!tab) continue;
    const size = tab.counts.size + 1;
    for (const k of f.keys(x)) h += bits(((tab.counts.get(k) ?? 0) + 0.5) / (tab.total + 0.5 * size));
  }
  return h;
}

/**
 * The three-voice model in use: the features that predict Fux's choices once the others are in,
 * with weights learnt on his sixteen solutions (docs/fux/trio-habits-study.md).
 */
export const TRIO_MODEL_FEATURES: TrioFeature[] = [tMelodicPooled, tMovePairs, tSonority, tMember, tArrival, tOpening];
export const TRIO_MODEL_WEIGHTS: Record<string, number> = { "t-melodic": 0.74, "t-move-pairs": 0.2, "t-sonority": 0.88, "t-member": 0.48, "t-arrival": 0.22, "t-opening": 0.59 };

/** Features of the whole chord, not of one voice: counted once when two voices are chosen together. */
export const CHORD_FEATURES = new Set(["t-sonority", "t-opening", "t-cadence", "t-final-top", "t-same-sonority"]);

export const trioModelBits = (t: TrioFeatureTables, x: TrioInput, skip?: Set<string>) =>
  TRIO_MODEL_FEATURES.reduce((h, f) => (skip?.has(f.id) ? h : h + (TRIO_MODEL_WEIGHTS[f.id] ?? 0) * trioFeatureBits(t, [f], x)), 0);
