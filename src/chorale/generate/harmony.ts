/**
 * Step 2 of the generator: a chord under every melody note (docs/chorales/CONCEPT.md, level 2).
 * The chords form a chain: each is drawn given the mode, the melody's degree and the chord before,
 * the context the level-2 study found best (docs/chorales/LEVEL2.md). Only chords Bach puts over
 * that melody degree are offered. A cadence plan fixes the chords at the phrase ends; the chain is
 * then sampled exactly under that constraint (backward filtering, forward sampling), so the chords
 * before a cadence lead to it as Bach's do, rather than being forced at the last moment.
 */
import { Backoff, draw, temper, type Ctx } from "./model.ts";
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

function backward(h: HarmonyModel, m: Melody, fixed: Fixed, T: number): Map<string, number>[] {
  const n = m.notes.length;
  const beta: Map<string, number>[] = new Array(n);
  const cand = (i: number) => (fixed[i] ? [fixed[i]!] : h.allowed(m.mode, m.notes[i].deg));
  beta[n - 1] = new Map(cand(n - 1).map((c) => [c, 1]));
  for (let i = n - 2; i >= 0; i--) {
    const b = new Map<string, number>();
    let z = 0;
    for (const c of cand(i)) {
      const row = h.step(m.mode, m.notes[i + 1].deg, c, T, fixed[i + 1]);
      let s = 0;
      for (const [c2, p] of row) s += p * (beta[i + 1].get(c2) ?? 0);
      b.set(c, s);
      z += s;
    }
    if (z > 0) for (const [c, v] of b) b.set(c, v / z);
    beta[i] = b;
  }
  return beta;
}

/** A chord sequence drawn from the chain at temperature T, exactly under the fixed chords. */
export function sampleHarmony(h: HarmonyModel, m: Melody, fixed: Fixed, r: () => number, T = 1): string[] {
  const beta = backward(h, m, fixed, T);
  const out: string[] = [];
  let prev = "start";
  for (let i = 0; i < m.notes.length; i++) {
    const row = h.step(m.mode, m.notes[i].deg, prev, T, fixed[i]);
    const w = new Map<string, number>();
    for (const [c, p] of row) w.set(c, p * (beta[i].get(c) ?? 0));
    prev = draw(w, r());
    out.push(prev);
  }
  return out;
}

/** The most likely chord sequence under the fixed chords (Viterbi). */
export function bestHarmony(h: HarmonyModel, m: Melody, fixed: Fixed): string[] {
  const n = m.notes.length;
  let score = new Map<string, number>();
  const back: Map<string, string>[] = [];
  for (const [c, p] of h.step(m.mode, m.notes[0].deg, "start", 1, fixed[0])) score.set(c, Math.log(p));
  for (let i = 1; i < n; i++) {
    const next = new Map<string, number>();
    const bp = new Map<string, string>();
    for (const [prev, s] of score) {
      for (const [c, p] of h.step(m.mode, m.notes[i].deg, prev, 1, fixed[i])) {
        const v = s + Math.log(p);
        if (v > (next.get(c) ?? -Infinity)) {
          next.set(c, v);
          bp.set(c, prev);
        }
      }
    }
    score = next;
    back.push(bp);
  }
  let c = [...score].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
  const out = [c];
  for (let i = n - 2; i >= 0; i--) {
    c = back[i].get(c)!;
    out.push(c);
  }
  return out.reverse();
}

/** log2 probability of a chord sequence under the chain (T = 1, no constraint). */
export function harmonyLogProb(h: HarmonyModel, m: Melody, chords: string[]): number {
  let s = 0;
  let prev = "start";
  m.notes.forEach((n, i) => {
    s += Math.log2(h.step(m.mode, n.deg, prev).get(chords[i]) ?? 1e-9);
    prev = chords[i];
  });
  return s;
}
