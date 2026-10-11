/**
 * Step 4 of the generator: the alto and tenor (docs/chorales/CONCEPT.md, level 5), under the game's
 * own standard (src/chorale/level5.ts: the same slots, Bach's habit tables, judge() as the check).
 *
 * Under every slot (one chord over one bass note, the soprano given), every pair (alto, tenor) that
 * completes the chord in the voices' ranges (level5.ts RANGE), without crossing; the fifth may be left
 * out. Each pair and each move between pairs has a cost in bits, -log2 of how often Bach does it:
 *  - in a chord: the doubling (by chord kind and bass member), the spacing, a missing fifth;
 *  - between chords: each inner voice's move (its size, as Bach's alto and tenor move from chord to
 *    chord where nothing sounds between), the seventh's
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
  readonly counts: { pairsMoved: number; parallel: number; contrary: number; innerMoves: number; augSecond: number; triads: number; noFifth: number };

  constructor(train: BachChorale[]) {
    const mv = { alto: new Array(14).fill(0), tenor: new Array(14).fill(0) };
    let pairs = 0,
      cons = 0,
      contra = 0,
      inner = 0,
      aug = 0;
    for (const c of train) {
      for (let i = 1; i < c.notes.length; i++) {
        const p = c.notes[i - 1],
          n = c.notes[i];
        if (!n.direct || !p.a || !p.tn || !n.a || !n.tn) continue;
        const col0 = [p.sm, midiOf(p.a), midiOf(p.tn), p.bm],
          col1 = [n.sm, midiOf(n.a), midiOf(n.tn), n.bm];
        for (const [v, x, y] of [["alto", p.a, n.a], ["tenor", p.tn, n.tn]] as const) {
          mv[v][Math.min(13, Math.abs(midiOf(y) - midiOf(x)))]++;
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

/** How much Bach's habits count (1: as measured; 0: only the voices' moves and the two gravest
 *  warnings, a baseline of smooth voice-leading). */
export interface VoiceOptions {
  habits?: number;
}

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
  const w = o.habits ?? 1;
  const S = midiOf(s.soprano),
    B = midiOf(s.bass);
  // the bass's letter is a chord member unless the bass is an incidental note (a passing bass)
  const chordRole = ["root", "third", "fifth", "seventh"].includes(s.bassRole);
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
      cost += (a.midi > S ? vm.parallel : 0) + (t.midi < B ? vm.parallel : 0);
      cost += optional.filter((p) => !pcs.has(p)).length * vm.parallel;
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
        if (sev && col.filter((m) => m % 12 === pcOf(sev[0])).length > 1) cost += vm.parallel / 2;
      }
      const sp = (pair: string, over: boolean) => {
        const h = HABITS.spacing[pair];
        const k = h?.options.find((o) => o[0] === (over ? (pair === "tenor-bass" ? "over a twelfth" : "over an octave") : "within"))?.[1] ?? 0;
        return h ? bits(k, h.n) : 0;
      };
      cost += sp("soprano-alto", S - a.midi > 12) + sp("alto-tenor", a.midi - t.midi > 12) + sp("tenor-bass", t.midi - B > 19);
      if (a.midi === S) cost += 3;
      if (t.midi === a.midi) cost += 3;
      out.push({ alto: a.name, tenor: t.name, a: a.midi, t: t.midi, cost: w * cost });
    }
  return out;
}

const KEY = "|";
const keyOf = (p: Pair) => `${p.alto}${KEY}${p.tenor}`;

/** The cost of moving from one pair to the next (slots i-1 and i). */
function moveCost(vm: VoiceModel, s0: Slot, s1: Slot, p: Pair, q: Pair, o: VoiceOptions = {}): number {
  const w = o.habits ?? 1;
  let cost = vm.move.alto[Math.min(13, Math.abs(q.a - p.a))] + vm.move.tenor[Math.min(13, Math.abs(q.t - p.t))];
  // the game's own chord-to-chord check (level5.ts), each finding costed by its rarity in Bach
  for (const f of findingsBetween(1, [s0.soprano, p.alto, p.tenor, s0.bass], [s1.soprano, q.alto, q.tenor, s1.bass]))
    cost += f.key === "parallel" ? vm.parallel : f.key === "contrary" ? vm.contrary : f.key === "augSecond" ? vm.augSecond : 0;
  const changes = s1.root !== s0.root || s1.kind !== s0.kind;
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
