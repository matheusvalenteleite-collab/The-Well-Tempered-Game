/**
 * X5, the generator's "daring": how far a setting takes Bach's licences (docs/chorales/LICENCES.md).
 * Rarity alone is not the measure (a parallel fifth is rare too), and the owner's ratings found the
 * licences chromatic and tied to their occasions. So daring raises a choice in proportion to how often
 * Bach's own use of that choice, in that context, is a licence of the catalogue: a chord after the
 * chord before over the melody's degree, a bass and its position under that chord (the diminished
 * seventh is a position: theory.ts), a move of the bass, a cadence chord for the melody's close. A
 * choice Bach never takes as a licence is not raised, however rare.
 *
 * The licences come in groups (below), each with its weight λ (bits): a setting's probability is
 * multiplied by 2^(Σ λ × share), share summed over its choices: an exponential tilt of the whole
 * chain, which the joint sampler draws exactly (joint.ts). The weights are calibrated so that daring
 * level 1 writes each group at Bach's own rate on melodies the models have not seen, level 2 at twice
 * it, level 3 at three times (tools/chorales/daring_report.ts, data/chorales/generator/daring-weights.json;
 * docs/chorales/DARING.md). A negative weight lowers a group the plain models overdo.
 */
import type { BachChorale } from "./corpus.ts";
import { melodyOf } from "./corpus.ts";
import { licencesOf } from "./licences.ts";
import { phraseEnds } from "./plan.ts";
import { positionOf } from "./bass.ts";
import weightsRaw from "../../../data/chorales/generator/daring-weights.json" with { type: "json" };

/** The groups of licences daring weighs, with the catalogue's categories in each. */
export const GROUPS: Record<string, string[]> = {
  "chromatic-bass": ["chromatic-bass"],
  mixture: ["mixture", "neapolitan"],
  "diminished-seventh": ["diminished-seventh"],
  "evaded-dominant": ["evaded-dominant"],
  "distant-close": ["distant-close"],
  "open-close": ["open-close"],
};
export const GROUP_NAMES = Object.keys(GROUPS);
const groupOf = new Map(Object.entries(GROUPS).flatMap(([g, cs]) => cs.map((c) => [c, g] as [string, string])));

/** Counts of uses and of licences, by context, finest first. */
class Shares {
  private readonly n = new Map<string, number>();
  private readonly l = new Map<string, number>();
  private readonly alpha: number;
  constructor(alpha = 2) {
    this.alpha = alpha;
  }
  add(keys: string[], lic: boolean) {
    for (const k of keys) {
      this.n.set(k, (this.n.get(k) ?? 0) + 1);
      if (lic) this.l.set(k, (this.l.get(k) ?? 0) + 1);
    }
  }
  /** The share of licences, each context's counts smoothed towards the coarser one's share. */
  share(keys: string[]): number {
    let s = 0;
    for (let j = keys.length - 1; j >= 0; j--) s = ((this.l.get(keys[j]) ?? 0) + this.alpha * s) / ((this.n.get(keys[j]) ?? 0) + this.alpha);
    return s;
  }
}

/** Where each group is decided, and its contexts (finest first). */
const chordKeys = (mode: string, deg: string, prev: string, chord: string) => [`${mode}|${deg}|${prev}|${chord}`, `${mode}|${prev}|${chord}`, `${mode}|${chord}`];
const pairKeys = (mode: string, deg: string, chord: string, bass: string) => [`${mode}|${deg}|${chord}|${bass}`, `${mode}|${chord}|${bass}`];
const moveKeys = (mode: string, prev: string, deg: string) => [`${mode}|${prev}|${deg}`, `${mode}|${deg}`];
const planKeys = (mode: string, close: string, chord: string) => [`${mode}|${close}|${chord}`, `${mode}|${chord}`];

/** The share of each group among Bach's uses of the choices of one step of the chain. */
export type GroupShares = Record<string, number>;

export class Daring {
  private readonly shares = new Map<string, Shares>(GROUP_NAMES.map((g) => [g, new Shares()]));

  constructor(train: BachChorale[]) {
    for (const c of train) {
      const lic = licencesOf(c).map((l) => new Set(l.map((x) => groupOf.get(x)!)));
      const m = melodyOf(c);
      c.notes.forEach((n, i) => {
        const prev = i ? c.notes[i - 1].chord : "start";
        for (const g of ["mixture", "evaded-dominant"]) this.shares.get(g)!.add(chordKeys(c.mode, n.deg, prev, n.chord), lic[i].has(g));
        const pos = positionOf(n);
        if (pos) this.shares.get("diminished-seventh")!.add(pairKeys(c.mode, n.deg, n.chord, `${n.bass}:${pos}`), lic[i].has("diminished-seventh"));
        if (i) this.shares.get("chromatic-bass")!.add(moveKeys(c.mode, c.notes[i - 1].bass, n.bass), lic[i].has("chromatic-bass") && lic[i - 1].has("chromatic-bass"));
      });
      for (const e of phraseEnds(m)) for (const g of ["distant-close", "open-close"]) this.shares.get(g)!.add(planKeys(c.mode, e.close, c.notes[e.index].chord), lic[e.index].has(g));
    }
  }

  /** A step of the joint chain: the chord (after `prev`, over melody degree `deg`) with its bass
   *  ("degree:position"), after the bass `prevBass` (a degree, or "start"). */
  step(mode: string, deg: string, prev: string, chord: string, bass: string, prevBass: string): GroupShares {
    const d = bass.slice(0, bass.indexOf(":"));
    return {
      mixture: this.shares.get("mixture")!.share(chordKeys(mode, deg, prev, chord)),
      "evaded-dominant": this.shares.get("evaded-dominant")!.share(chordKeys(mode, deg, prev, chord)),
      "diminished-seventh": bass.endsWith("°") ? this.shares.get("diminished-seventh")!.share(pairKeys(mode, deg, chord, bass)) : 0,
      "chromatic-bass": prevBass === "start" ? 0 : this.shares.get("chromatic-bass")!.share(moveKeys(mode, prevBass, d)),
    };
  }

  /** A cadence chord for the melody's close. */
  plan(mode: string, close: string, chord: string): GroupShares {
    return { "distant-close": this.shares.get("distant-close")!.share(planKeys(mode, close, chord)), "open-close": this.shares.get("open-close")!.share(planKeys(mode, close, chord)) };
  }
}

/** The weights (bits) of each group. */
export type Weights = Record<string, number>;

/** The tilt of a choice in bits: Σ λ × share. */
export const bits = (w: Weights, s: GroupShares) => Object.entries(s).reduce((a, [g, v]) => a + (w[g] ?? 0) * v, 0);

/** The daring a generation runs with: the weights of the groups and the lexicon. */
export interface DaringOption {
  weights: Weights;
  lex: Daring;
}

/** The calibrated weights of each daring level ("1": Bach's rates; "2", "3": twice, three times). */
export const LEVELS: Record<string, Weights> = (weightsRaw as unknown as { levels: Record<string, Weights> }).levels;
