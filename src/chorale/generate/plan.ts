/**
 * Step 1 of the generator: the cadence plan, a chord at every phrase end (docs/chorales/CONCEPT.md,
 * level 1). The context is the one the level-1 study found best (docs/chorales-lab/cadence-study.md):
 * the mode, how the melody closes (its last two degrees) and where the phrase stands (first, inner,
 * last). Only chords Bach puts at a phrase end over the same last melody degree are offered, so
 * that every chord of a plan holds the melody's note.
 */
import { Backoff, draw, temper, type Ctx } from "./model.ts";
import type { BachChorale, Melody } from "./corpus.ts";

export interface PhraseEnd {
  /** The note's index in the melody. */
  index: number;
  close: string;
  position: "first" | "inner" | "last";
  deg: string;
}

/** The phrase ends of a melody: its fermatas, and its last note in any case. */
export function phraseEnds(m: Melody): PhraseEnd[] {
  const idx = m.notes.flatMap((n, i) => (n.end ? [i] : []));
  const last = m.notes.length - 1;
  if (idx[idx.length - 1] !== last) idx.push(last);
  return idx.map((i, k) => ({
    index: i,
    close: m.notes[i].close ?? (i > 0 ? `${m.notes[i - 1].deg}-${m.notes[i].deg}` : "?"),
    position: k === idx.length - 1 ? "last" : k === 0 ? "first" : "inner",
    deg: m.notes[i].deg,
  }));
}

export class PlanModel {
  readonly model: Backoff;
  /** Cadence chords attested over each (mode, last melody degree). */
  private readonly attested = new Map<string, Set<string>>();

  constructor(train: BachChorale[]) {
    const rows: Ctx[] = [];
    for (const c of train) {
      for (const e of phraseEnds({ mode: c.mode, notes: c.notes.map((n) => ({ deg: n.deg, end: !!n.end, close: n.close })) })) {
        const chord = c.notes[e.index].chord;
        rows.push({ mode: c.mode, close: e.close, position: e.position, chord });
        const k = `${c.mode}|${e.deg}`;
        const s = this.attested.get(k) ?? new Set<string>();
        s.add(chord);
        this.attested.set(k, s);
      }
    }
    this.model = new Backoff(rows, ["mode", "close", "position"], "chord");
  }

  /** The chords to choose from at a phrase end, most likely first, with their probabilities. */
  options(m: Melody, e: PhraseEnd, T = 1): { chord: string; p: number }[] {
    const allowed = this.attested.get(`${m.mode}|${e.deg}`) ?? new Set(this.model.vocab);
    const p = temper(this.model.dist({ mode: m.mode, close: e.close, position: e.position }), allowed, T);
    return [...p].map(([chord, q]) => ({ chord, p: q })).sort((a, b) => b.p - a.p || (a.chord < b.chord ? -1 : 1));
  }

  /** The most likely chord at every phrase end. */
  best(m: Melody): string[] {
    return phraseEnds(m).map((e) => this.options(m, e)[0].chord);
  }

  /** A plan drawn chord by chord at temperature T. */
  sample(m: Melody, r: () => number, T = 1): string[] {
    return phraseEnds(m).map((e) => draw(new Map(this.options(m, e, T).map((o) => [o.chord, o.p])), r()));
  }

  /** log2 probability of a plan (at T = 1). */
  logProb(m: Melody, plan: string[]): number {
    return phraseEnds(m).reduce((s, e, k) => s + Math.log2(this.options(m, e).find((o) => o.chord === plan[k])?.p ?? 1e-9), 0);
  }
}
