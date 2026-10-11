/**
 * The chorale generator, steps 1-2 of Phase A: given a melody, several settings that are each
 * likely in Bach's practice and as different from one another as possible, the way Kittel gives
 * eight basses to one melody. A setting is, for now, a cadence plan and a chord under every note.
 *
 * Settings are drawn (plan, then chords under it) from the models of plan.ts and harmony.ts; the
 * less likely half of the draws is set aside; from the rest, the first setting is the most likely
 * one, and each next one is the draw farthest (fewest chords in common) from those already chosen.
 */
import type { BachChorale, Melody } from "./corpus.ts";
import { PlanModel, phraseEnds } from "./plan.ts";
import { HarmonyModel, bestHarmony, fixedFromPlan, harmonyLogProb, sampleHarmony } from "./harmony.ts";

export { PlanModel, phraseEnds } from "./plan.ts";
export { HarmonyModel, bestHarmony, sampleHarmony, fixedFromPlan, harmonyLogProb } from "./harmony.ts";

export interface Setting {
  /** The cadence chord at every phrase end. */
  plan: string[];
  /** The chord under every melody note. */
  chords: string[];
  /** log2 probability per note (plan and chords together): higher is more usual in Bach. */
  score: number;
}

export interface Models {
  plan: PlanModel;
  harmony: HarmonyModel;
}

export const trainModels = (train: BachChorale[]): Models => ({ plan: new PlanModel(train), harmony: new HarmonyModel(train) });

export interface DiverseOptions {
  /** How many draws to choose from (default 200). */
  pool?: number;
  /** Temperature of the draws (1: each choice as often as Bach makes it; default 0.8, which gives
   *  Kittel's variety, 2.5 different chords under a melody note across eight settings: GENERATOR.md). */
  T?: number;
  /** The share of the draws kept, the most likely first (default 0.5). */
  keep?: number;
  /** How many chords a different cadence counts for in the distance between settings (default 3). */
  cadenceWeight?: number;
}

/** Chords that differ, a differing cadence chord counting `w` (it is a different plan). */
const distance = (a: Setting, b: Setting, w: number) =>
  a.chords.reduce((d, c, i) => d + (c !== b.chords[i] ? 1 : 0), 0) + (w - 1) * a.plan.reduce((d, c, k) => d + (c !== b.plan[k] ? 1 : 0), 0);

function setting(models: Models, m: Melody, plan: string[], chords: string[]): Setting {
  const score = (models.plan.logProb(m, plan) + harmonyLogProb(models.harmony, m, chords)) / m.notes.length;
  return { plan, chords, score };
}

/** The single most likely setting: the best plan, and the best chords under it. */
export function bestSetting(models: Models, m: Melody): Setting {
  const plan = models.plan.best(m);
  return setting(models, m, plan, bestHarmony(models.harmony, m, fixedFromPlan(m, phraseEnds(m), plan)));
}

/** `n` settings of one melody, each likely and as unlike the others as possible. */
export function diverseSettings(models: Models, m: Melody, n: number, r: () => number, o: DiverseOptions = {}): Setting[] {
  const { pool = 200, T = 0.8, keep = 0.5, cadenceWeight = 3 } = o;
  const ends = phraseEnds(m);
  const draws: Setting[] = [];
  const seen = new Set<string>();
  for (let k = 0; k < pool; k++) {
    const plan = models.plan.sample(m, r, T);
    const chords = sampleHarmony(models.harmony, m, fixedFromPlan(m, ends, plan), r, T);
    const key = chords.join(" ");
    if (seen.has(key)) continue;
    seen.add(key);
    draws.push(setting(models, m, plan, chords));
  }
  draws.sort((a, b) => b.score - a.score);
  const kept = draws.slice(0, Math.max(n, Math.ceil(draws.length * keep)));
  const best = bestSetting(models, m);
  const out: Setting[] = [best];
  const rest = kept.filter((s) => s.chords.join(" ") !== best.chords.join(" "));
  while (out.length < n && rest.length) {
    let pick = 0;
    let far = -1;
    rest.forEach((s, i) => {
      const d = Math.min(...out.map((x) => distance(x, s, cadenceWeight)));
      if (d > far) [pick, far] = [i, d];
    });
    out.push(rest.splice(pick, 1)[0]);
  }
  return out;
}
