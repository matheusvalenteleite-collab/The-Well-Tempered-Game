/**
 * A chain of choices, one per melody note, each drawn given the one before: the shape of steps 2
 * (chords) and 3 (bass). `step(i, prev)` gives the choices at note i after `prev` ("start" at the
 * first note) with their probabilities; a choice fixed in advance is a step with one entry, its
 * probability kept (not renormalized), so that what comes before is judged by how well it leads there.
 *
 * Sampling is exact under the fixed choices (backward filtering, forward sampling); Viterbi gives the
 * most likely chain. A dead end (no choice can continue) is passed over rather than allowed to stop
 * the chain: the step is then taken as if nothing followed.
 */
import { draw } from "./model.ts";

export type Step = (i: number, prev: string) => Map<string, number>;

function backward(n: number, step: Step, states: (i: number) => string[]): Map<string, number>[] {
  const beta: Map<string, number>[] = new Array(n);
  beta[n - 1] = new Map(states(n - 1).map((c) => [c, 1]));
  for (let i = n - 2; i >= 0; i--) {
    const b = new Map<string, number>();
    let z = 0;
    for (const c of states(i)) {
      let s = 0;
      for (const [c2, p] of step(i + 1, c)) s += p * (beta[i + 1].get(c2) ?? 0);
      b.set(c, s);
      z += s;
    }
    if (z > 0) for (const [c, v] of b) b.set(c, v / z);
    beta[i] = b;
  }
  return beta;
}

/** A chain drawn exactly under the steps' constraints. `states(i)`: every choice possible at note i. */
export function sampleChain(n: number, step: Step, states: (i: number) => string[], r: () => number): string[] {
  const beta = backward(n, step, states);
  const out: string[] = [];
  let prev = "start";
  for (let i = 0; i < n; i++) {
    const row = step(i, prev);
    const w = new Map<string, number>();
    let z = 0;
    for (const [c, p] of row) {
      const v = p * (beta[i].get(c) ?? 0);
      w.set(c, v);
      z += v;
    }
    prev = draw(z > 0 ? w : row, r());
    out.push(prev);
  }
  return out;
}

/** The most likely chain (Viterbi). */
export function bestChain(n: number, step: Step): string[] {
  let score = new Map<string, number>();
  const back: Map<string, string>[] = [];
  for (const [c, p] of step(0, "start")) score.set(c, Math.log(p));
  for (let i = 1; i < n; i++) {
    const next = new Map<string, number>();
    const bp = new Map<string, string>();
    for (const [prev, s] of score) {
      for (const [c, p] of step(i, prev)) {
        const v = s + Math.log(p);
        if (v > (next.get(c) ?? -Infinity)) {
          next.set(c, v);
          bp.set(c, prev);
        }
      }
    }
    if (!next.size) throw new Error(`no choice can follow note ${i - 1}`);
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

/** log2 probability of a chain. */
export const chainLogProb = (step: Step, xs: string[]) => xs.reduce((s, x, i) => s + Math.log2(step(i, i ? xs[i - 1] : "start").get(x) ?? 1e-9), 0);
