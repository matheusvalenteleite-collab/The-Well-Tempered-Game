/**
 * How hard an exercise is, from its audit: at each choice, how much freedom the rules leave (log2
 * of the number of legal pitches: 0 bits when one pitch alone is legal, 1 bit for two, 2 for four),
 * averaged over the choices; and the share of choices where one pitch alone is legal. Less freedom,
 * a harder exercise. (Counting legal pitches, not their share of the candidates, keeps the measure
 * independent of how wide a register the audit tries.) The
 * measure is taken with the rest of a written line in place (Fux's, or a generated one), so it says
 * how tight the exercise is around a good solution, not how many solutions it has.
 */
import type { UnitChoices } from "./alternatives.ts";

export interface Difficulty {
  /** Mean freedom per choice, in bits (lower = harder). */
  freedom: number;
  /** Share of choices with a single legal pitch. */
  forced: number;
  meanLegal: number;
  choices: number;
}

export function difficultyOf(units: Pick<UnitChoices, "legal">[]): Difficulty {
  const n = units.length || 1;
  return {
    freedom: units.reduce((a, u) => a + Math.log2(Math.max(1, u.legal)), 0) / n,
    forced: units.filter((u) => u.legal === 1).length / n,
    meanLegal: units.reduce((a, u) => a + u.legal, 0) / n,
    choices: units.length,
  };
}

/** Spearman's rank correlation (ties given their mean rank). */
export function spearman(xs: number[], ys: number[]): number {
  const rank = (v: number[]) => {
    const idx = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
    const r = Array(v.length).fill(0);
    for (let i = 0; i < idx.length; ) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
      i = j + 1;
    }
    return r;
  };
  const a = rank(xs);
  const b = rank(ys);
  const m = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
  const ma = m(a);
  const mb = m(b);
  const cov = a.reduce((s, x, i) => s + (x - ma) * (b[i] - mb), 0);
  const sd = (v: number[], mv: number) => Math.sqrt(v.reduce((s, x) => s + (x - mv) ** 2, 0));
  return cov / (sd(a, ma) * sd(b, mb) || 1);
}
