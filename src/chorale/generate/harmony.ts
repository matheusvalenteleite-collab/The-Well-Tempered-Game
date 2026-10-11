/**
 * Step 2 of the generator: a chord under every melody note (docs/chorales/CONCEPT.md, level 2).
 * The chords form a chain: each is drawn given the mode, the melody's degree and the chord before,
 * the context the level-2 study found best (docs/chorales/LEVEL2.md). Only chords Bach puts over
 * that melody degree are offered. A cadence plan fixes the chords at the phrase ends; the chain is
 * then sampled exactly under that constraint (backward filtering, forward sampling), so the chords
 * before a cadence lead to it as Bach's do, rather than being forced at the last moment.
 */
import { Backoff, temper, type Ctx } from "./model.ts";
import { bestChain, chainLogProb, sampleChain } from "./chain.ts";
import type { BachChorale, Melody } from "./corpus.ts";

export class HarmonyModel {
  readonly model: Backoff;

  constructor(train: BachChorale[]) {
    const rows: Ctx[] = [];
    for (const c of train) {
      let prev = "start";
      for (const n of c.notes) {
        rows.push({ mode: c.mode, deg: n.deg, prev, chord: n.chord });
        prev = n.chord;
      }
    }
    this.model = new Backoff(rows, ["mode", "deg", "prev"], "chord");
  }

  /** The chords Bach puts over this melody degree in this mode (all chords if the degree is unseen). */
  allowed(mode: string, deg: string): string[] {
    const cnt = this.model.counts({ mode, deg }, 1);
    return cnt ? [...cnt.keys()].sort() : this.model.vocab;
  }

  /** The next chord's distribution over the allowed chords, at temperature T. With `only` (a chord
   *  fixed by the plan), that chord alone, keeping its probability: not renormalized, so that the
   *  chord before is judged by how well it leads to the fixed one. */
  step(mode: string, deg: string, prev: string, T = 1, only?: string | null): Map<string, number> {
    const allowed = this.allowed(mode, deg);
    const p = temper(this.model.dist({ mode, deg, prev }), only && !allowed.includes(only) ? [...allowed, only] : allowed, T);
    return only ? new Map([[only, p.get(only)!]]) : p;
  }
}

/** Chords fixed at some notes (a plan), null elsewhere. */
export type Fixed = (string | null)[];

/** The fixed chords of a cadence plan, one per phrase end, placed at the phrase ends' notes. */
export function fixedFromPlan(m: Melody, ends: { index: number }[], plan: string[]): Fixed {
  const f: Fixed = m.notes.map(() => null);
  ends.forEach((e, k) => (f[e.index] = plan[k]));
  return f;
}

const stepper = (h: HarmonyModel, m: Melody, fixed: Fixed, T: number) => (i: number, prev: string) => h.step(m.mode, m.notes[i].deg, prev, T, fixed[i]);
const statesOf = (h: HarmonyModel, m: Melody, fixed: Fixed) => (i: number) => (fixed[i] ? [fixed[i]!] : h.allowed(m.mode, m.notes[i].deg));

/** A chord sequence drawn from the chain at temperature T, exactly under the fixed chords. */
export const sampleHarmony = (h: HarmonyModel, m: Melody, fixed: Fixed, r: () => number, T = 1): string[] =>
  sampleChain(m.notes.length, stepper(h, m, fixed, T), statesOf(h, m, fixed), r);

/** The most likely chord sequence under the fixed chords (Viterbi). */
export const bestHarmony = (h: HarmonyModel, m: Melody, fixed: Fixed): string[] => bestChain(m.notes.length, stepper(h, m, fixed, 1));

/** log2 probability of a chord sequence under the chain (T = 1, no constraint). */
export const harmonyLogProb = (h: HarmonyModel, m: Melody, chords: string[]): number =>
  chainLogProb(stepper(h, m, m.notes.map(() => null), 1), chords);
