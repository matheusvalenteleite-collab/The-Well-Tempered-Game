/**
 * Step 3 of the generator: the bass under every melody note, and its figure (docs/chorales/CONCEPT.md,
 * levels 3-4). Given the chords (step 2), the bass is a chain of (bass degree, position) pairs: which
 * chord member is in the bass and whether the chord has its seventh, drawn given the mode, the chord,
 * the melody's degree and the bass before. Only pairs Bach uses under that chord are offered.
 *
 * One boundary is enforced, not learnt: no parallel fifths or octaves (or unisons) between melody
 * and bass when both move (docs/chorales/CONCEPT.md, 4a). It is octave-independent, so it is decided
 * here on degrees.
 *
 * The degrees then become pitches by a second, deterministic pass (`line`): the octave of every note
 * chosen for the likeliest line in Bach's terms (the size of each move, the distance from the melody,
 * the register), the augmented second excluded. The figures follow from chord and position.
 */
import { Backoff, temper, type Ctx } from "./model.ts";
import { bestChain, chainLogProb, sampleChain } from "./chain.ts";
import { melodyOf, type BachChorale, type Melody } from "./corpus.ts";
import { degreePc, degreePitches, figure, parseDegree, type FigureRow, type Key } from "./theory.ts";

export interface Bass {
  /** Bass degree under every melody note. */
  degrees: string[];
  /** The chord's position over that bass (5/3, 6, 6/4, 7, 6/5, 4/3, 4/2). */
  positions: string[];
  /** Spelled pitches and MIDI numbers. */
  pitches: string[];
  midi: number[];
  /** Figures, rows top first. */
  figures: FigureRow[][];
}

export const LOW = 36;
export const HIGH = 62;

const split = (s: string) => {
  const k = s.indexOf(":");
  return { deg: s.slice(0, k), pos: s.slice(k + 1) };
};

/** Parallel fifths, octaves or unisons between melody and bass, both moving. */
export function parallel(m0: string, b0: string, m1: string, b1: string): boolean {
  const pm0 = degreePc(m0),
    pm1 = degreePc(m1),
    pb0 = degreePc(b0),
    pb1 = degreePc(b1);
  if (pm0 === pm1 || pb0 === pb1) return false;
  const i0 = (pm0 - pb0 + 12) % 12;
  return (i0 === 0 || i0 === 7) && i0 === (pm1 - pb1 + 12) % 12;
}

/** log probabilities of a bucketed quantity, add-one smoothed over 0..max. */
function logTable(values: number[], max: number): number[] {
  const c = new Array(max + 1).fill(1);
  for (const v of values) c[Math.min(max, v)]++;
  const z = c.reduce((a, b) => a + b, 0);
  return c.map((x) => Math.log(x / z));
}

/** Where a note stands in its phrase: the last note of the melody, a phrase end, the note before one, or inside. */
export function placeOf(m: Melody, i: number): string {
  if (i === m.notes.length - 1) return "last";
  if (m.notes[i].end) return "end";
  if (m.notes[i + 1].end || i + 1 === m.notes.length - 1) return "pre";
  return "mid";
}

/** The bass model's context, coarsest first (backoff order); measured in docs/chorales/GENERATOR.md. */
export const BASS_FIELDS = ["mode", "place", "chord", "deg", "prev"];

export class BassModel {
  readonly model: Backoff;
  private readonly leap: number[];
  private readonly spacing: number[];
  private readonly register: number[];

  constructor(train: BachChorale[], fields = BASS_FIELDS) {
    const rows: Ctx[] = [];
    const leaps: number[] = [],
      spacing: number[] = [],
      register: number[] = [];
    for (const c of train) {
      let prev = "start";
      const m: Melody = melodyOf(c);
      c.notes.forEach((n, i) => {
        if (n.pos) {
          rows.push({ mode: c.mode, modal: m.modal, place: placeOf(m, i), chord: n.chord, deg: n.deg, prev, target: `${n.bass}:${n.pos}` });
          const k = `${c.mode}|${n.chord}`;
          this.byChord.set(k, (this.byChord.get(k) ?? new Set()).add(`${n.bass}:${n.pos}`));
        }
        prev = n.bass;
        if (i) leaps.push(Math.abs(n.bm - c.notes[i - 1].bm));
        spacing.push(Math.max(0, n.sm - n.bm));
        register.push(Math.max(0, n.bm - LOW));
      });
    }
    this.model = new Backoff(rows, fields, "target");
    this.leap = logTable(leaps, 24);
    this.spacing = logTable(spacing, 48);
    this.register = logTable(register, HIGH - LOW);
  }

  /** The (bass degree, position) pairs Bach uses under this chord in this mode. */
  allowed(mode: string, chord: string): string[] {
    const s = this.byChord.get(`${mode}|${chord}`);
    return s ? [...s].sort() : this.model.vocab;
  }
  private readonly byChord = new Map<string, Set<string>>();

  /** The bass under chord `chord` at note i after the bass `prev` (a "degree:position" or "start"):
   *  the pairs Bach uses under that chord, without parallel fifths or octaves with the melody
   *  (unless every pair would make them). `lineWeight` > 0 favours moving by step (each step 2^w
   *  times as likely), which the chain alone underrates (GENERATOR.md). */
  row(m: Melody, i: number, chord: string, prev: string, T = 1, lineWeight = 0, f?: string | null): Map<string, number> {
    const prevDeg = prev === "start" ? "start" : split(prev).deg;
    let allowed = this.allowed(m.mode, chord);
    if (i > 0 && prev !== "start") {
      const ok = allowed.filter((s) => !parallel(m.notes[i - 1].deg, prevDeg, m.notes[i].deg, split(s).deg));
      if (ok.length) allowed = ok;
    }
    const p = temper(this.model.dist({ mode: m.mode, modal: m.modal, place: placeOf(m, i), chord, deg: m.notes[i].deg, prev: prevDeg }), f && !allowed.includes(f) ? [...allowed, f] : allowed, T);
    if (lineWeight && prevDeg !== "start") {
      const from = parseDegree(prevDeg).step;
      let z = 0;
      for (const [x, v] of p) {
        const d = split(x).deg;
        const st = Math.abs(parseDegree(d).step - from);
        const w = d !== prevDeg && (st === 1 || st === 6) ? v * 2 ** lineWeight : v;
        p.set(x, w);
        z += w;
      }
      for (const [x, v] of p) p.set(x, v / z);
    }
    return f ? new Map([[f, p.get(f) ?? 1e-9]]) : p;
  }

  /** The step of the bass chain at note i, the chords given. */
  stepper(m: Melody, chords: string[], T = 1, fixed?: (string | null)[]) {
    return (i: number, prev: string): Map<string, number> => this.row(m, i, chords[i], prev, T, 0, fixed?.[i]);
  }

  private states(m: Melody, chords: string[], fixed?: (string | null)[]) {
    return (i: number) => (fixed?.[i] ? [fixed[i]!] : this.allowed(m.mode, chords[i]));
  }

  /** A bass chain (degree:position per note) drawn at temperature T. */
  sample(m: Melody, chords: string[], r: () => number, T = 1, fixed?: (string | null)[]): string[] {
    return sampleChain(m.notes.length, this.stepper(m, chords, T, fixed), this.states(m, chords, fixed), r);
  }

  best(m: Melody, chords: string[], fixed?: (string | null)[]): string[] {
    return bestChain(m.notes.length, this.stepper(m, chords, 1, fixed));
  }

  logProb(m: Melody, chords: string[], chain: string[]): number {
    return chainLogProb(this.stepper(m, chords), chain);
  }

  /** The bass as pitches: the octave of every degree chosen for the likeliest line (Viterbi over
   *  octaves), below the melody, within LOW..HIGH. */
  line(m: Melody, k: Key, chain: string[], chords: string[]): Bass {
    const parts = chain.map(split);
    const cands = parts.map((p, i) => {
      const top = m.notes[i].midi !== undefined ? m.notes[i].midi! - 3 : HIGH;
      const all = degreePitches(p.deg, k, LOW, HIGH);
      const below = all.filter((x) => x.midi <= top);
      return below.length ? below : all.slice(0, 1);
    });
    const local = (i: number, x: number) => this.register[x - LOW] + (m.notes[i].midi !== undefined ? this.spacing[Math.min(48, Math.max(0, m.notes[i].midi! - x))] : 0);
    const move = (i: number, a: number, b: number) => {
      const d = Math.abs(b - a);
      const steps = Math.abs(parseDegree(parts[i].deg).step - parseDegree(parts[i - 1].deg).step);
      const aug2 = (steps === 1 || steps === 6) && d % 12 === 3;
      return this.leap[Math.min(24, d)] + (aug2 ? -20 : 0);
    };
    let score = cands[0].map((c) => local(0, c.midi));
    const back: number[][] = [];
    for (let i = 1; i < cands.length; i++) {
      const bp: number[] = [];
      score = cands[i].map((c) => {
        let best = -Infinity,
          arg = 0;
        cands[i - 1].forEach((p, j) => {
          const v = score[j] + move(i, p.midi, c.midi);
          if (v > best) [best, arg] = [v, j];
        });
        bp.push(arg);
        return best + local(i, c.midi);
      });
      back.push(bp);
    }
    let j = score.indexOf(Math.max(...score));
    const pick = [j];
    for (let i = cands.length - 2; i >= 0; i--) {
      j = back[i][j];
      pick.push(j);
    }
    pick.reverse();
    const chosen = pick.map((j, i) => cands[i][j]);
    return {
      degrees: parts.map((p) => p.deg),
      positions: parts.map((p) => p.pos),
      pitches: chosen.map((c) => c.name),
      midi: chosen.map((c) => c.midi),
      figures: parts.map((p, i) => figure(p.pos, p.deg, chords[i], k)),
    };
  }
}
