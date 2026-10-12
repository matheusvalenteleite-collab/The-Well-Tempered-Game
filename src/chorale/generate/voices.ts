/**
 * Step 4 of the generator: the alto and tenor (docs/chorales/CONCEPT.md, level 5), under the game's
 * own standard (src/chorale/level5.ts: the same slots, Bach's habit tables, judge() as the check).
 *
 * Under every slot (one chord over one bass note, the soprano given), every pair (alto, tenor) that
 * completes the chord in the voices' ranges (level5.ts RANGE), without crossing; the fifth may be left
 * out. Each pair and each move between pairs has a cost in bits, -log2 of how often Bach does it:
 *  - in a chord: the doubling (by chord kind and bass member), the spacing, a missing fifth;
 *  - between chords: each inner voice's move (its size, as Bach's alto and tenor move from beat to
 *    beat), the seventh's
 *    and the leading tone's continuation (by voice), and what the game's own chord-to-chord check
 *    (level5.ts findingsBetween) finds: parallel fifths or octaves in a pair with an inner voice (grave), fifths
 *    or octaves by contrary motion (a warning) and the augmented second in an inner line.
 * None of these is an error (C21: in the chorales Bach is the last word, and there are only warnings
 * of three gravities): their cost is their rarity in Bach's own chorales, counted the same way
 * between chords that follow each other directly.
 *
 * The voices are then the cheapest path through the chorale (Viterbi), or a path drawn with
 * probabilities 2^-cost (raised to 1/T) for variety, by the chain of chain.ts.
 */
import { parsePitch } from "../../music/pitch.ts";
import { HABITS, findingsBetween, share, type Slot } from "../level5.ts";
import { bestChain, sampleChain, type Step } from "./chain.ts";
import type { BachChorale } from "./corpus.ts";
import { midiOf } from "./theory.ts";

const RANGE = { alto: [55, 74], tenor: [48, 67] } as const; // as level5.ts (G3-D5, C3-G4)
const LETTERS = "CDEFGAB";

const letterOf = (p: string) => p.replace(/-?\d+$/, "");
const pcOf = (name: string) => ((parsePitch(`${name}4`).midi % 12) + 12) % 12;
const diatonic = (p: string) => LETTERS.indexOf(p[0]) + 7 * parsePitch(p).octave;
const bits = (k: number, n: number) => -Math.log2((k + 0.5) / (n + 1));

/** Parallel fifths or octaves (unisons): similar motion, as level5.ts judges them. */
export function parallelMotion(a0: number, b0: number, a1: number, b1: number): boolean {
  if (a0 === a1 || b0 === b1) return false;
  const i0 = Math.abs(a0 - b0) % 12;
  return (i0 === 0 || i0 === 7) && i0 === Math.abs(a1 - b1) % 12 && Math.sign(a1 - a0) === Math.sign(b1 - b0);
}

/** Fifths or octaves (unisons) by contrary motion (a warning in level5.ts, C21). */
export function contrary(a0: number, b0: number, a1: number, b1: number): boolean {
  if (a0 === a1 || b0 === b1) return false;
  const i0 = Math.abs(a0 - b0) % 12;
  return (i0 === 0 || i0 === 7) && i0 === Math.abs(a1 - b1) % 12 && Math.sign(a1 - a0) !== Math.sign(b1 - b0);
}

/** An augmented second between two spelled pitches. */
export const augmentedSecond = (p: string, q: string) => Math.abs(diatonic(q) - diatonic(p)) === 1 && Math.abs(midiOf(q) - midiOf(p)) === 3;

const motionOf = (a: number, b: number) => (a === b ? "held" : `${Math.abs(b - a) <= 2 ? "step" : "leap"} ${b > a ? "up" : "down"}`);

/** What the voice search learns from Bach's chorales beyond level 5's tables. */
export class VoiceModel {
  /** Cost of an inner voice's move by its size in semitones (0..12, 13 = beyond an octave). */
  readonly move: Record<"alto" | "tenor", number[]>;
  /** Cost of one pair of parallel fifths or octaves, of fifths or octaves by contrary motion, and of one augmented
   *  second: their rarity in Bach. */
  readonly parallel: number;
  readonly contrary: number;
  readonly augSecond: number;
  /** Cost of leaving out the fifth of a triad. */
  readonly noFifth: number;
  /** The counts behind these, for the report. */
  /** The line's shape, two moves at a time: for each inner voice, the surplus cost (bits) of a move given
   *  the move before it, over its cost alone: -log2 P(move | move before) + log2 P(move), moves bucketed by
   *  direction and size (SHAPE_BUCKETS). Learnt from every beat-to-beat succession. */
  readonly shape: Record<"alto" | "tenor", number[][]>;
  readonly counts: { pairsMoved: number; parallel: number; contrary: number; innerMoves: number; augSecond: number; triads: number; noFifth: number };

  constructor(train: BachChorale[]) {
    const mv = { alto: new Array(14).fill(0), tenor: new Array(14).fill(0) };
    const two = { alto: [...Array(9)].map(() => new Array(9).fill(0)), tenor: [...Array(9)].map(() => new Array(9).fill(0)) };
    for (const c of train)
      for (let i = 2; i < c.notes.length; i++) {
        const [a, b, d] = [c.notes[i - 2], c.notes[i - 1], c.notes[i]];
        for (const [v, x, y, z] of [["alto", a.a, b.a, d.a], ["tenor", a.tn, b.tn, d.tn]] as const)
          if (x && y && z) two[v][shapeBucket(midiOf(y) - midiOf(x))][shapeBucket(midiOf(z) - midiOf(y))]++;
      }
    let pairs = 0,
      cons = 0,
      contra = 0,
      inner = 0,
      aug = 0;
    for (const c of train) {
      for (let i = 1; i < c.notes.length; i++) {
        const p = c.notes[i - 1],
          n = c.notes[i];
        if (!p.a || !p.tn || !n.a || !n.tn) continue;
        // each inner voice's move from beat to beat, whatever sounds between: a third Bach fills with a
        // passing note is a third on the beats, which step 5 fills again (counted only where nothing
        // sounds between, the moves leaned to the held note and against the third)
        for (const [v, x, y] of [["alto", p.a, n.a], ["tenor", p.tn, n.tn]] as const) mv[v][Math.min(13, Math.abs(midiOf(y) - midiOf(x)))]++;
        if (!n.direct) continue;
        const col0 = [p.sm, midiOf(p.a), midiOf(p.tn), p.bm],
          col1 = [n.sm, midiOf(n.a), midiOf(n.tn), n.bm];
        for (const [x, y] of [[p.a, n.a], [p.tn, n.tn]] as const) {
          inner++;
          if (augmentedSecond(x, y)) aug++;
        }
        for (let x = 0; x < 4; x++)
          for (let y = x + 1; y < 4; y++) {
            if (!(x === 1 || x === 2 || y === 1 || y === 2)) continue;
            if (col0[x] === col1[x] || col0[y] === col1[y]) continue;
            pairs++;
            if (parallelMotion(col0[x], col0[y], col1[x], col1[y])) cons++;
            if (contrary(col0[x], col0[y], col1[x], col1[y])) contra++;
          }
      }
    }
    const table = (c: number[]) => {
      const z = c.reduce((a, b) => a + b, 0);
      return c.map((k) => bits(k, z));
    };
    this.move = { alto: table(mv.alto), tenor: table(mv.tenor) };
    const surplus = (t: number[][]) => {
      const col = t[0].map((_, j) => t.reduce((a, r) => a + r[j], 0));
      const all = col.reduce((a, b) => a + b, 0);
      return t.map((r) => {
        const n = r.reduce((a, b) => a + b, 0);
        return r.map((k, j) => bits(k, n) - bits(col[j], all));
      });
    };
    this.shape = { alto: surplus(two.alto), tenor: surplus(two.tenor) };
    this.parallel = bits(cons, pairs);
    this.contrary = bits(contra, pairs);
    this.augSecond = bits(aug, inner);
    // The fifth of a root-position or first-inversion triad, present or not, in Bach's four voices.
    let triads = 0,
      missing = 0;
    for (const c of train)
      for (const n of c.notes) {
        if ((n.pos !== "5/3" && n.pos !== "6") || !n.a || !n.tn) continue;
        const pcs = new Set([n.sm, midiOf(n.a), midiOf(n.tn), n.bm].map((m) => m % 12));
        triads++;
        if (pcs.size < 3) missing++;
      }
    this.noFifth = bits(missing, triads);
    this.counts = { pairsMoved: pairs, parallel: cons, contrary: contra, innerMoves: inner, augSecond: aug, triads, noFifth: missing };
  }
}

interface Pair {
  alto: string;
  tenor: string;
  a: number;
  t: number;
  cost: number;
}

/** The weights of the three groups of costs: Bach's habits in a chord and at a chord's change (doubling,
 *  spacing, a missing fifth, the seventh, the leading tone), the size of each voice's move, and the
 *  warnings (parallel fifths/octaves, fifths/octaves by contrary motion, the augmented second, and the
 *  relaxations where no strict voicing exists). WEIGHTS holds the values fitted so that the search's
 *  probabilities match how often Bach writes each voicing (GENERATOR-VOICES.md); `habits: 0` leaves
 *  only smooth voice-leading and the warnings, a baseline. */
export interface VoiceOptions {
  habits?: number;
  moves?: number;
  warnings?: number;
  /** The line (bits): the cost of an inner voice holding its note, [alto, tenor], where the chord changes
   *  and where it repeats. The cheapest path over-chooses the single commonest move, holding, since
   *  Bach's moving options are spread over many sizes and directions: unchecked, the generated alto holds
   *  on 46% of chord changes and 84% of repeated chords against Bach's 30% and 46%, with runs of 22
   *  beats (docs/chorales/LISTENING-RATINGS.md). LINE is calibrated on Bach; absent, no cost. */
  line?: { change: [number, number]; same: [number, number] };
}
export const WEIGHTS: Required<Omit<VoiceOptions, "line">> = { habits: 1, moves: 1, warnings: 1 };
/** The weights that make the search's probabilities match how often Bach writes each voicing, fitted on
 *  a sixth of the chorales and tested on another (mean surprise at Bach's voicings 1.70 -> 1.31 bits,
 *  11 October 2026): for measuring surprise (X1). Read beat by beat, Bach's inner voices hold more
 *  parallel fifths and octaves than the warnings assume (a passing note between the beats hides them),
 *  so the fitted warnings weigh little; for writing, the generator keeps WEIGHTS. */
export const CALIBRATED: Required<Omit<VoiceOptions, "line">> = { habits: 0.65, moves: 0.5, warnings: 0.25 };
/** The line (12 October 2026): with drawn harmony, held-out melodies, these bring the generated inner
 *  voices to Bach's on the beats: alto held on 30% of chord changes and 50% of repeated chords (Bach 30%,
 *  49%), steps 36% (37%), leaps 31% (30%); tenor 22%, 50%, 38%, 35% (Bach 24%, 45%, 37%, 37%). */
export const LINE: NonNullable<VoiceOptions["line"]> = { change: [1, 0], same: [2.5, 1.5] };

/** Every (alto, tenor) under a slot, with its cost in the chord. Where there is none (a melody note
 *  too low to leave room under it, a note the figure adds that cannot be placed), the constraints are
 *  relaxed one at a time, each relaxation costed: `relax` 1 lets the alto rise above the soprano and the
 *  tenor fall below the bass (crossing); 2 also lets the figure's sevenths and added notes ("other")
 *  be left out; 3 asks only for chord tones. */
export function pairs(vm: VoiceModel, s: Slot, o: VoiceOptions = {}): Pair[] {
  for (let relax = 0; relax <= 3; relax++) {
    const ps = pairsAt(vm, s, o, relax);
    if (ps.length) return ps;
  }
  return [];
}

function pairsAt(vm: VoiceModel, s: Slot, o: VoiceOptions, relax: number): Pair[] {
  const w = o.habits ?? WEIGHTS.habits;
  const ww = o.warnings ?? WEIGHTS.warnings;
  const S = midiOf(s.soprano),
    B = midiOf(s.bass);
  // the bass's letter is a chord member unless the bass is an incidental note (a passing bass)
  const chordRole = ["root", "third", "fifth", "seventh", "ninth"].includes(s.bassRole);
  const members: [string, string][] = chordRole ? [[letterOf(s.bass), s.bassRole], ...s.above] : s.above;
  const notes = (lo: number, hi: number) =>
    members.flatMap(([l, role]) => [2, 3, 4, 5].map((o) => ({ name: `${l}${o}`, midi: midiOf(`${l}${o}`), role })).filter((x) => x.midi >= lo && x.midi <= hi));
  const out: Pair[] = [];
  const roleOf = (p: number) => members.find(([l]) => pcOf(l) === p % 12)?.[1] ?? "other";
  const required = (r: string) => (relax >= 3 ? false : relax >= 2 ? r === "third" || r === "root" : r !== "fifth");
  const needed = s.above.filter(([, r]) => required(r)).map(([l]) => pcOf(l));
  const optional = s.above.filter(([, r]) => r !== "fifth" && !required(r)).map(([l]) => pcOf(l));
  const fifth = s.above.find(([, r]) => r === "fifth");
  const crossing = relax >= 1;
  for (const a of notes(RANGE.alto[0], crossing ? RANGE.alto[1] : Math.min(RANGE.alto[1], S)))
    for (const t of notes(crossing ? RANGE.tenor[0] : Math.max(RANGE.tenor[0], B), Math.min(RANGE.tenor[1], a.midi))) {
      const col = [S, a.midi, t.midi, B];
      const pcs = new Set(col.map((m) => m % 12));
      if (needed.some((p) => !pcs.has(p))) continue;
      let cost = 0;
      // the relaxations: as grave as the rarest warnings
      let warn = (a.midi > S ? vm.parallel : 0) + (t.midi < B ? vm.parallel : 0);
      warn += optional.filter((p) => !pcs.has(p)).length * vm.parallel;
      if (fifth && !pcs.has(pcOf(fifth[0]))) cost += vm.noFifth;
      // doubling, in a triad whose every voice is a chord member (as level5.ts reads it)
      if (["major", "minor", "diminished", "augmented"].includes(s.kind)) {
        const roles = col.map(roleOf);
        const count = new Map<string, number>();
        roles.forEach((r) => count.set(r, (count.get(r) ?? 0) + 1));
        const doubled = [...count].filter(([, k]) => k >= 2);
        if (doubled.length === 1) {
          const sh = share("doubling", `${s.kind}|${s.bassRole}`, doubled[0][0] + (doubled[0][1] === 2 ? "" : "×3"));
          if (sh) cost += bits(sh.k, sh.n);
        }
      } else if (s.kind.includes("seventh")) {
        // a doubled seventh is not a habit of Bach's
        const sev = s.above.find(([, r]) => r === "seventh") ?? (s.bassRole === "seventh" ? [letterOf(s.bass), "seventh"] : null);
        if (sev && col.filter((m) => m % 12 === pcOf(sev[0])).length > 1) warn += vm.parallel / 2;
      }
      const sp = (pair: string, over: boolean) => {
        const h = HABITS.spacing[pair];
        const k = h?.options.find((o) => o[0] === (over ? (pair === "tenor-bass" ? "over a twelfth" : "over an octave") : "within"))?.[1] ?? 0;
        return h ? bits(k, h.n) : 0;
      };
      cost += sp("soprano-alto", S - a.midi > 12) + sp("alto-tenor", a.midi - t.midi > 12) + sp("tenor-bass", t.midi - B > 19);
      if (a.midi === S) cost += 3;
      if (t.midi === a.midi) cost += 3;
      out.push({ alto: a.name, tenor: t.name, a: a.midi, t: t.midi, cost: w * cost + ww * warn });
    }
  return out;
}

/** Moves by direction and size: held; step up, down (1-2 semitones); third up, down (3-4); fourth or fifth
 *  up, down (5-7); larger up, down. */
export function shapeBucket(d: number): number {
  const a = Math.abs(d);
  if (!a) return 0;
  const size = a <= 2 ? 1 : a <= 4 ? 3 : a <= 7 ? 5 : 7;
  return size + (d > 0 ? 0 : 1);
}

const KEY = "|";
const keyOf = (p: Pair) => `${p.alto}${KEY}${p.tenor}`;

/** The cost of moving from one pair to the next (slots i-1 and i). */
function moveCost(vm: VoiceModel, s0: Slot, s1: Slot, p: Pair, q: Pair, o: VoiceOptions = {}): number {
  const w = o.habits ?? WEIGHTS.habits;
  const wm = o.moves ?? WEIGHTS.moves;
  const ww = o.warnings ?? WEIGHTS.warnings;
  let cost = wm * (vm.move.alto[Math.min(13, Math.abs(q.a - p.a))] + vm.move.tenor[Math.min(13, Math.abs(q.t - p.t))]);
  // the game's own chord-to-chord check (level5.ts), each finding costed by its rarity in Bach
  for (const f of findingsBetween(1, [s0.soprano, p.alto, p.tenor, s0.bass], [s1.soprano, q.alto, q.tenor, s1.bass]))
    cost += ww * (f.key === "parallel" ? vm.parallel : f.key === "contrary" ? vm.contrary : f.key === "augSecond" ? vm.augSecond : 0);
  const changes = s1.root !== s0.root || s1.kind !== s0.kind;
  if (o.line) {
    const l = changes ? o.line.change : o.line.same;
    if (q.a === p.a) cost += l[0];
    if (q.t === p.t) cost += l[1];
  }
  if (changes) {
    for (const [v, x, y] of [["alto", p.alto, q.alto], ["tenor", p.tenor, q.tenor]] as const) {
      const role = s0.above.find(([l]) => pcOf(l) === pcOf(letterOf(x)))?.[1];
      if (role === "seventh") {
        // prepared: the note was there before (not known at the first slot: taken as prepared)
        const ctx = `${v}|prepared|${s1.bass !== s0.bass ? "bass moves" : "bass holds"}`;
        const sh = share("seventh", ctx, motionOf(midiOf(x), midiOf(y)));
        if (sh) cost += w * bits(sh.k, sh.n);
      }
      const dominant = (s0.kind === "major" || s0.kind === "dominant seventh") && (pcOf(s0.root) - pcOf(s1.root) + 12) % 12 === 7;
      if (dominant && role === "third") {
        const d = midiOf(y) - midiOf(x);
        const sh = share("leading", v, d === 1 ? "rises a semitone" : d === -3 || d === -4 ? "falls a third" : d === 0 ? "held" : "other");
        if (sh) cost += w * bits(sh.k, sh.n);
      }
    }
  }
  return cost;
}

/** The chain over pairs: each row's probabilities 2^-(cost), raised to 1/T. */
function stepper(vm: VoiceModel, slots: Slot[], T: number, o: VoiceOptions): { step: Step; states: (i: number) => string[]; layers: Map<string, Pair>[] } {
  const layers = slots.map((s) => new Map(pairs(vm, s, o).map((p) => [keyOf(p), p])));
  const memo = new Map<string, Map<string, number>>();
  const step: Step = (i, prev) => {
    const k = `${i}${KEY}${KEY}${prev}`;
    const hit = memo.get(k);
    if (hit) return hit;
    const out = new Map<string, number>();
    let z = 0;
    const p0 = i > 0 ? layers[i - 1].get(prev) : undefined;
    for (const [key, q] of layers[i]) {
      const c = q.cost + (p0 ? moveCost(vm, slots[i - 1], slots[i], p0, q, o) : 0);
      const w = Math.pow(2, -c / T);
      out.set(key, w);
      z += w;
    }
    if (z > 0) for (const [key, w] of out) out.set(key, w / z);
    memo.set(k, out);
    return out;
  };
  return { step, states: (i) => [...layers[i].keys()], layers };
}

export interface InnerVoices {
  alto: string[];
  tenor: string[];
  /** Mean cost per slot in bits (lower: more usual in Bach). */
  cost: number;
}

/** The alto and tenor under a list of slots: the cheapest (no `r`), or drawn at temperature T. */
export function innerVoices(vm: VoiceModel, slots: Slot[], r?: () => number, T = 1, o: VoiceOptions = {}): InnerVoices | null {
  const { step, states, layers } = stepper(vm, slots, T, o);
  if (layers.some((l) => !l.size)) return null;
  const path = r ? sampleChain(slots.length, step, states, r) : bestChain(slots.length, step);
  const ps = path.map((k, i) => layers[i].get(k)!);
  let cost = ps[0].cost;
  for (let i = 1; i < ps.length; i++) cost += ps[i].cost + moveCost(vm, slots[i - 1], slots[i], ps[i - 1], ps[i], o);
  return { alto: ps.map((p) => p.alto), tenor: ps.map((p) => p.tenor), cost: cost / slots.length };
}

/** How surprising Bach's alto and tenor at slot i are, given his at slot i-1 (X1): -log2 of their
 *  probability among every pair the search would consider there, and the pair it would have chosen.
 *  Null where his pair is not among them (an incidental note on the beat, a voice out of range or
 *  crossing) or where the slot before has no pair of his. */
export function voiceSurprise(vm: VoiceModel, slots: Slot[], i: number, alto: (string | null)[], tenor: (string | null)[], o: VoiceOptions = {}): { bits: number; expected: { alto: string; tenor: string; p: number } } | null {
  if (i < 1 || !alto[i] || !tenor[i] || !alto[i - 1] || !tenor[i - 1]) return null;
  const prev: Pair = { alto: alto[i - 1]!, tenor: tenor[i - 1]!, a: midiOf(alto[i - 1]!), t: midiOf(tenor[i - 1]!), cost: 0 };
  const layer = pairs(vm, slots[i], o);
  const same = (p: Pair) => midiOf(p.alto) === midiOf(alto[i]!) && midiOf(p.tenor) === midiOf(tenor[i]!) && letterOf(p.alto) === letterOf(alto[i]!) && letterOf(p.tenor) === letterOf(tenor[i]!);
  const w = layer.map((q) => Math.pow(2, -(q.cost + moveCost(vm, slots[i - 1], slots[i], prev, q, o))));
  const z = w.reduce((a, b) => a + b, 0);
  const k = layer.findIndex(same);
  if (k < 0 || z <= 0) return null;
  const best = w.indexOf(Math.max(...w));
  return { bits: -Math.log2(w[k] / z), expected: { alto: layer[best].alto, tenor: layer[best].tenor, p: w[best] / z } };
}

/**
 * The lines re-written one at a time (the owner's "none of the voices sound artificial"): the alto as a
 * whole melody against the soprano, tenor and bass held fixed, then the tenor against the rest, `rounds`
 * times. Each voice is the cheapest path under the pair's costs (in the chord, its moves, the warnings, the
 * line) plus its shape two moves at a time (VoiceModel.shape, weight `w`), which the joint search over
 * both voices cannot afford to see. Each re-writing keeps the other voice, so the total cost never rises.
 */
export function refineLines(vm: VoiceModel, slots: Slot[], start: InnerVoices, o: VoiceOptions = {}, rounds = 2, w = 1): InnerVoices {
  let alto = [...start.alto],
    tenor = [...start.tenor];
  const layers = slots.map((s) => pairs(vm, s, o));
  const same = (x: string, y: string) => midiOf(x) === midiOf(y) && letterOf(x) === letterOf(y);
  for (let r = 0; r < rounds; r++)
    for (const v of ["alto", "tenor"] as const) {
      const other = v === "alto" ? tenor : alto;
      const cands = layers.map((l, i) => {
        const c = l.filter((p) => same(v === "alto" ? p.tenor : p.alto, other[i]));
        return c.length ? c : l.filter((p) => same(p.alto, alto[i]) && same(p.tenor, tenor[i]));
      });
      if (cands.some((c) => !c.length)) continue;
      const pitch = (p: Pair) => (v === "alto" ? p.a : p.t);
      const n = slots.length;
      // dp over (candidate at i-1, candidate at i)
      let dp: number[][] = cands[0].map(() => cands[0].map(() => Infinity));
      cands[0].forEach((p, k) => (dp[0][k] = p.cost));
      const back: number[][][] = [];
      let prevSize = 1; // at i = 0 the "previous" index is a dummy 0
      for (let i = 1; i < n; i++) {
        const nd = cands[i - 1].map(() => cands[i].map(() => Infinity));
        const bk = cands[i - 1].map(() => cands[i].map(() => 0));
        for (let j = 0; j < cands[i - 1].length; j++)
          for (let k = 0; k < cands[i].length; k++) {
            const step = cands[i][k].cost + moveCost(vm, slots[i - 1], slots[i], cands[i - 1][j], cands[i][k], o);
            const b1 = shapeBucket(pitch(cands[i][k]) - pitch(cands[i - 1][j]));
            let best = Infinity,
              arg = 0;
            for (let h = 0; h < prevSize; h++) {
              const base = dp[h]?.[j];
              if (base === undefined || base === Infinity) continue;
              const sh = i >= 2 ? w * vm.shape[v][shapeBucket(pitch(cands[i - 1][j]) - pitch(cands[i - 2][h]))][b1] : 0;
              if (base + sh < best) [best, arg] = [base + sh, h];
            }
            nd[j][k] = best + step;
            bk[j][k] = arg;
          }
        back.push(bk);
        dp = nd;
        prevSize = cands[i - 1].length;
      }
      // the best final (j, k), then back
      let bj = 0,
        bkk = 0,
        bv = Infinity;
      dp.forEach((row, j) => row.forEach((x, k) => x < bv && ([bv, bj, bkk] = [x, j, k])));
      if (bv === Infinity) continue;
      const pick = new Array<number>(n);
      pick[n - 1] = bkk;
      pick[n - 2] = bj;
      for (let i = n - 1; i >= 2; i--) pick[i - 2] = back[i - 1][pick[i - 1]][pick[i]];
      const line = pick.map((k, i) => (v === "alto" ? cands[i][k].alto : cands[i][k].tenor));
      if (v === "alto") alto = line;
      else tenor = line;
    }
  return { alto, tenor, cost: start.cost };
}

/** The generator's inner voices: the joint search over both, then each line re-written against the rest
 *  (refineLines). Null where a slot has no voicing. */
export function writeVoices(vm: VoiceModel, slots: Slot[], o: VoiceOptions = { habits: 1, line: LINE }): InnerVoices | null {
  const iv = innerVoices(vm, slots, undefined, 1, o);
  return iv && refineLines(vm, slots, iv, o);
}
