/**
 * The chorale generator, steps 1-3 of Phase A: given a melody, several settings that are each
 * likely in Bach's practice and as different from one another as possible, the way Kittel gives
 * eight basses to one melody. A setting is a cadence plan, a chord under every note, and a figured
 * bass (one bass note under every melody note; inner voices and diminution are steps 4-5).
 *
 * Settings are drawn (plan, then chords under it, then the bass under them) from the models of
 * plan.ts, harmony.ts and bass.ts; the less likely half of the draws is set aside; from the rest,
 * the first setting is the most likely one, and each next one is the draw farthest (fewest chords
 * and bass notes in common, a different cadence counting more) from those already chosen.
 */
import type { BachChorale, Melody } from "./corpus.ts";
import { PlanModel, phraseEnds } from "./plan.ts";
import { HarmonyModel, fixedFromPlan, harmonyLogProb } from "./harmony.ts";
import { BassModel, type Bass } from "./bass.ts";
import { Joint, bestJoint } from "./joint.ts";
import type { Key } from "./theory.ts";
import { draw } from "./model.ts";
import type { DaringOption } from "./daring.ts";
import { bits } from "./daring.ts";

export { PlanModel, phraseEnds } from "./plan.ts";
export { HarmonyModel, bestHarmony, sampleHarmony, fixedFromPlan, harmonyLogProb } from "./harmony.ts";
export { BassModel, parallel, type Bass } from "./bass.ts";
export { figureText } from "./theory.ts";
export { Joint, bestJoint, sampleJoint } from "./joint.ts";
export { Daring, LEVELS as DARING_LEVELS, type DaringOption } from "./daring.ts";

export interface Setting {
  /** The cadence chord at every phrase end. */
  plan: string[];
  /** The chord under every melody note. */
  chords: string[];
  /** The bass chain (degree:position under every note) and the bass as pitches with figures. */
  chain: string[];
  bass: Bass;
  /** log2 probability per note (plan, chords and bass together): higher is more usual in Bach. */
  score: number;
  /** With daring: the setting's tilt in bits, summed over its choices (daring.ts): how far it takes
   *  Bach's licences, as weighted. */
  bold: number;
}

export interface Models {
  plan: PlanModel;
  harmony: HarmonyModel;
  bass: BassModel;
}

export const trainModels = (train: BachChorale[]): Models => ({ plan: new PlanModel(train), harmony: new HarmonyModel(train), bass: new BassModel(train) });

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
  /** Preference for a bass moving by step (each step 2^w as likely; default LINE_WEIGHT). */
  lineWeight?: number;
  /** Daring (X5): Bach's licences raised where he takes them (daring.ts); the draws are then ranked by
   *  their likelihood plus their tilt, per note. */
  daring?: DaringOption;
}

/** The default preference for stepwise bass motion: 2 brings the generated basses under Kittel's
 *  melodies to Bach's rate of steps (37% of moves; 31% without it), at no measurable cost in
 *  attestation (GENERATOR.md). Kittel's own 49% needs passing notes in the bass (step 5). */
export const LINE_WEIGHT = 2;

/** Chords and bass notes that differ, a differing cadence chord counting `w` (it is a different plan). */
const distance = (a: Setting, b: Setting, w: number) =>
  a.chords.reduce((d, c, i) => d + (c !== b.chords[i] ? 1 : 0) + (a.bass.degrees[i] !== b.bass.degrees[i] ? 1 : 0), 0) +
  (w - 1) * a.plan.reduce((d, c, k) => d + (c !== b.plan[k] ? 1 : 0), 0);

function setting(models: Models, m: Melody, k: Key, plan: string[], chords: string[], chain: string[], daring?: DaringOption): Setting {
  const score = (models.plan.logProb(m, plan) + harmonyLogProb(models.harmony, m, chords) + models.bass.logProb(m, chords, chain)) / m.notes.length;
  let bold = 0;
  if (daring) {
    const { lex, weights } = daring;
    const deg = (x: string) => x.slice(0, x.indexOf(":"));
    phraseEnds(m).forEach((e, j) => (bold += bits(weights, lex.plan(m.mode, e.close, plan[j]))));
    chords.forEach((c, i) => (bold += bits(weights, lex.step(m.mode, m.notes[i].deg, i ? chords[i - 1] : "start", c, chain[i], i ? deg(chain[i - 1]) : "start"))));
  }
  return { plan, chords, chain, bass: models.bass.line(m, k, chain, chords), score, bold };
}

/** The cadence chords drawn (or the best taken, r absent) with daring's tilt towards Bach's licences. */
function daringPlan(models: Models, m: Melody, daring: DaringOption, r?: () => number, T = 1): string[] {
  return phraseEnds(m).map((e) => {
    const row = new Map(models.plan.options(m, e, T).map((o) => [o.chord, o.p * 2 ** bits(daring.weights, daring.lex.plan(m.mode, e.close, o.chord))]));
    const z = [...row.values()].reduce((a, b) => a + b, 0);
    for (const [c, v] of row) row.set(c, v / z);
    return r ? draw(row, r()) : [...row].sort((a, b) => b[1] - a[1])[0][0];
  });
}

/** The single most likely setting: the best plan, and the best chords and bass under it together
 *  (with daring, under the tilted models). */
export function bestSetting(models: Models, m: Melody, k: Key, lineWeight = LINE_WEIGHT, daring?: DaringOption): Setting {
  const plan = daring ? daringPlan(models, m, daring) : models.plan.best(m);
  const { chords, chain } = bestJoint(models.harmony, models.bass, m, fixedFromPlan(m, phraseEnds(m), plan), lineWeight, daring);
  return setting(models, m, k, plan, chords, chain, daring);
}

/** `n` settings of one melody, each likely and as unlike the others as possible. */
export function diverseSettings(models: Models, m: Melody, k: Key, n: number, r: () => number, o: DiverseOptions = {}): Setting[] {
  const { pool = 200, T = 0.8, keep = 0.5, cadenceWeight = 3, lineWeight = LINE_WEIGHT, daring } = o;
  const ends = phraseEnds(m);
  const draws: Setting[] = [];
  const seen = new Set<string>();
  const joint = new Joint(models.harmony, models.bass, m, T, lineWeight, daring);
  for (let d = 0; d < pool; d++) {
    const plan = daring ? daringPlan(models, m, daring, r, T) : models.plan.sample(m, r, T);
    const { chords, chain } = joint.sample(fixedFromPlan(m, ends, plan), r);
    const key = chords.join(" ") + "|" + chain.join(" ");
    if (seen.has(key)) continue;
    seen.add(key);
    draws.push(setting(models, m, k, plan, chords, chain, daring));
  }
  const rank = (s: Setting) => s.score + s.bold / m.notes.length;
  draws.sort((a, b) => rank(b) - rank(a));
  const kept = draws.slice(0, Math.max(n, Math.ceil(draws.length * keep)));
  const best = bestSetting(models, m, k, lineWeight, daring);
  const out: Setting[] = [best];
  const same = (a: Setting, b: Setting) => a.chords.join(" ") === b.chords.join(" ") && a.chain.join(" ") === b.chain.join(" ");
  const rest = kept.filter((s) => !same(s, best));
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
