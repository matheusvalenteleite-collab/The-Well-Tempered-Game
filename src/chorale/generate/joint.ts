/**
 * Steps 2 and 3 together: the chord and the bass under every melody note drawn as one chain of
 * pairs, so that a chord can be chosen for the bass it allows, as Kittel writes a bass first and
 * figures it after. A pair's probability is the chord's (harmony.ts: given the melody degree and the
 * chord before) times the bass's (bass.ts: given the chord, the melody, the phrase and the bass
 * before). The plan's cadence chords are fixed.
 *
 * A `Joint` serves many draws over one melody: the rows are cached across draws, and the backward
 * pass once per cadence plan.
 */
import { bestChain, type Step } from "./chain.ts";
import type { Melody } from "./corpus.ts";
import type { Fixed, HarmonyModel } from "./harmony.ts";
import type { BassModel } from "./bass.ts";
import { draw } from "./model.ts";

const SEP = "|";
const unzip = (xs: string[]) => ({ chords: xs.map((x) => x.split(SEP)[0]), chain: xs.map((x) => x.split(SEP)[1]) });

export class Joint {
  private readonly hRows = new Map<string, Map<string, number>>();
  private readonly bRows = new Map<string, Map<string, number>>();
  private readonly rows = new Map<string, Map<string, number>>();
  private readonly betas = new Map<string, Map<string, number>[]>();

  private readonly h: HarmonyModel;
  private readonly b: BassModel;
  private readonly m: Melody;
  private readonly T: number;
  private readonly lineWeight: number;

  constructor(h: HarmonyModel, b: BassModel, m: Melody, T = 1, lineWeight = 0) {
    this.h = h;
    this.b = b;
    this.m = m;
    this.T = T;
    this.lineWeight = lineWeight;
  }

  private hRow(i: number, prevChord: string, f: string | null) {
    const k = `${i}${SEP}${prevChord}${SEP}${f ?? ""}`;
    let r = this.hRows.get(k);
    if (!r) this.hRows.set(k, (r = this.h.step(this.m.mode, this.m.notes[i].deg, prevChord, this.T, f)));
    return r;
  }

  private bRow(i: number, chord: string, prevBass: string) {
    const k = `${i}${SEP}${chord}${SEP}${prevBass}`;
    let r = this.bRows.get(k);
    if (!r) this.bRows.set(k, (r = this.b.row(this.m, i, chord, prevBass, this.T, this.lineWeight)));
    return r;
  }

  private step(fixed: Fixed): Step {
    return (i, prev) => {
      const f = fixed[i];
      const k = `${i}${SEP}${f ?? ""}${SEP}${prev}`;
      let out = this.rows.get(k);
      if (out) return out;
      const [pc, pb] = prev === "start" ? ["start", "start"] : [prev.slice(0, prev.indexOf(SEP)), prev.slice(prev.indexOf(SEP) + 1)];
      out = new Map();
      for (const [c, p] of this.hRow(i, pc, f)) for (const [x, q] of this.bRow(i, c, pb)) out.set(`${c}${SEP}${x}`, p * q);
      this.rows.set(k, out);
      return out;
    };
  }

  private states(fixed: Fixed) {
    return (i: number) => {
      const cs = fixed[i] ? [fixed[i]!] : this.h.allowed(this.m.mode, this.m.notes[i].deg);
      return cs.flatMap((c) => this.b.allowed(this.m.mode, c).map((x) => `${c}${SEP}${x}`));
    };
  }

  private beta(fixed: Fixed): Map<string, number>[] {
    const key = fixed.map((f) => f ?? "").join(",");
    let beta = this.betas.get(key);
    if (beta) return beta;
    const n = this.m.notes.length;
    const step = this.step(fixed);
    const states = this.states(fixed);
    beta = new Array(n);
    beta[n - 1] = new Map(states(n - 1).map((c) => [c, 1]));
    for (let i = n - 2; i >= 0; i--) {
      const bt = new Map<string, number>();
      let z = 0;
      for (const c of states(i)) {
        let s = 0;
        for (const [c2, p] of step(i + 1, c)) s += p * (beta[i + 1].get(c2) ?? 0);
        bt.set(c, s);
        z += s;
      }
      if (z > 0) for (const [c, v] of bt) bt.set(c, v / z);
      beta[i] = bt;
    }
    this.betas.set(key, beta);
    return beta;
  }

  /** Chords and bass (degree:position) drawn together, exactly under the fixed chords. */
  sample(fixed: Fixed, r: () => number) {
    const beta = this.beta(fixed);
    const step = this.step(fixed);
    const out: string[] = [];
    let prev = "start";
    for (let i = 0; i < this.m.notes.length; i++) {
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
    return unzip(out);
  }

  /** The most likely chords and bass together under the fixed chords. */
  best(fixed: Fixed) {
    return unzip(bestChain(this.m.notes.length, this.step(fixed)));
  }
}

/** One draw of chords and bass together (for a single draw; use a `Joint` for many). */
export const sampleJoint = (h: HarmonyModel, b: BassModel, m: Melody, fixed: Fixed, r: () => number, T = 1, lineWeight = 0) =>
  new Joint(h, b, m, T, lineWeight).sample(fixed, r);

/** The most likely chords and bass together under the fixed chords. */
export const bestJoint = (h: HarmonyModel, b: BassModel, m: Melody, fixed: Fixed, lineWeight = 0) => new Joint(h, b, m, 1, lineWeight).best(fixed);
