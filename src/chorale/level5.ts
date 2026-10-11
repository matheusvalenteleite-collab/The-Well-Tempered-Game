/**
 * Level 5 of the chorale mode, the voices (docs/chorales/CONCEPT.md section 3; C16, C17): the
 * alto and tenor over one of Kittel's figured basses, under the melody, one note to each of his
 * harmonies. Judged in three ways (C16):
 *  - errors, the two boundaries only: consecutive fifths or octaves (unisons) from one chord to the
 *    next in a pair of voices that includes the alto or the tenor; an augmented second in their line;
 *  - the figure: the notes above the bass must be the chord the figure asks for (a missing fifth is
 *    only noted, as Bach often leaves it out);
 *  - idiom: what Bach does in the same context, never a verdict (doubling, the seventh, the leading
 *    tone, spacing; voices out of their range or crossing are noted).
 *
 * Data: data/chorales/level5.json, written by tools/chorales/voice_plans.py.
 */
import raw from "../../data/chorales/level5.json" with { type: "json" };
import { parsePitch } from "../music/pitch.ts";

export interface Slot {
  /** Onset and length in 32nds of a whole note. */
  at: number;
  dur: number;
  soprano: string;
  bass: string;
  root: string;
  kind: string;
  bassRole: string;
  /** Kittel's figure as printed ("" for the common chord). */
  printed: string;
  /** The letters the chord has above the bass, with their roles ("third", "fifth", "seventh", "root"). */
  above: [string, string][];
}
export interface L5Chorale {
  number: number;
  title: string;
  tonic: string;
  mode: string;
  sig: number;
  meter: string;
  pickup: number;
  length: number;
  melody: [number, number, string, 1?][];
  basses: { label: string; bass: [number, number, string][]; slots: Slot[] }[];
}
/** Counts by context: [outcome, count, examples [chorale, bar]]. */
export interface HabitTable {
  [ctx: string]: { n: number; options: [string, number, [number, number][]][] };
}
const DATA = raw as unknown as { slotFields: string[]; habits: Record<"doubling" | "seventh" | "leading" | "spacing", HabitTable>; chorales: (Omit<L5Chorale, "basses"> & { basses: { label: string; bass: [number, number, string][]; slots: unknown[][] }[] })[] };
const asSlot = (r: unknown[]): Slot => Object.fromEntries(DATA.slotFields.map((f, i) => [f, r[i]])) as unknown as Slot;
export const LEVEL5: Record<number, L5Chorale> = Object.fromEntries(DATA.chorales.map((c) => [c.number, { ...c, basses: c.basses.map((b) => ({ ...b, slots: b.slots.map(asSlot) })) }]));
export const HABITS = DATA.habits;

export type Tone = "error" | "figure" | "note" | "good";
export interface Finding {
  tone: Tone;
  /** Slots concerned (indices). */
  slots: number[];
  /** Key in the content (chorale.l5.*) and its variables. */
  key: string;
  vars: Record<string, string | number>;
  /** Bach's habit in this context, where there is one. */
  habit?: { ctx: string; table: keyof typeof HABITS; outcome: string };
}

const midi = (p: string) => parsePitch(p).midi;
const pc = (name: string) => {
  const p = parsePitch(`${name.replace(/\d+$/, "")}4`);
  return ((p.midi % 12) + 12) % 12;
};
const letter = (p: string) => p.replace(/-?\d+$/, "");
/** The share of an outcome in a context of Bach's habit (null where the context is unknown). */
export function share(table: keyof typeof HABITS, ctx: string, outcome: string): { n: number; k: number; examples: [number, number][] } | null {
  const h = HABITS[table][ctx];
  if (!h) return null;
  const o = h.options.find((x) => x[0] === outcome);
  return { n: h.n, k: o?.[1] ?? 0, examples: o?.[2] ?? [] };
}
const RARE = 0.05;
const motionOf = (a: string, b: string) => {
  const d = midi(b) - midi(a);
  return d === 0 ? "held" : `${Math.abs(d) <= 2 ? "step" : "leap"} ${d > 0 ? "up" : "down"}`;
};
const VOICE = ["soprano", "alto", "tenor", "bass"] as const;
const RANGE: Record<"alto" | "tenor", [number, number]> = { alto: [55, 74], tenor: [48, 67] }; // G3-D5, C3-G4

/** The judgement of the inner voices written so far (unwritten slots are skipped). */
export function judge(slots: Slot[], alto: (string | null)[], tenor: (string | null)[]): Finding[] {
  const out: Finding[] = [];
  const col = (i: number) => [slots[i].soprano, alto[i], tenor[i], slots[i].bass] as (string | null)[];
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const c = col(i);
    // The figure: the chord's letters above the bass, by pitch class.
    if (alto[i] && tenor[i]) {
      const have = new Set([s.soprano, alto[i]!, tenor[i]!].map((p) => pc(letter(p))));
      const allowed = new Set([pc(letter(s.bass)), ...s.above.map(([l]) => pc(l))]);
      for (const [l, role] of s.above) if (!have.has(pc(l))) out.push({ tone: role === "fifth" ? "note" : "figure", slots: [i], key: role === "fifth" ? "noFifth" : "missing", vars: { letter: l, role, figure: s.printed || "5/3" } });
      for (const [v, p] of [["alto", alto[i]!], ["tenor", tenor[i]!]] as const) if (!allowed.has(pc(letter(p)))) out.push({ tone: "figure", slots: [i], key: "foreign", vars: { voice: v, pitch: letter(p), figure: s.printed || "5/3" } });
      // Doubling, in a triad whose every voice is a chord member.
      if (["major", "minor", "diminished", "augmented"].includes(s.kind)) {
        const role = (p: string) => (pc(letter(p)) === pc(s.root) ? "root" : s.above.find(([l]) => pc(l) === pc(letter(p)))?.[1] ?? (pc(letter(p)) === pc(letter(s.bass)) ? s.bassRole : "other"));
        const roles = c.map((p) => role(p!));
        if (roles.every((r) => r === "root" || r === "third" || r === "fifth")) {
          const count = new Map<string, number>();
          roles.forEach((r) => count.set(r, (count.get(r) ?? 0) + 1));
          const doubled = [...count].filter(([, k]) => k >= 2);
          if (doubled.length === 1) {
            const outcome = doubled[0][0] + (doubled[0][1] === 2 ? "" : "×3");
            const ctx = `${s.kind}|${s.bassRole}`;
            const sh = share("doubling", ctx, outcome);
            if (sh && sh.n >= 20 && sh.k / sh.n < RARE) out.push({ tone: "note", slots: [i], key: "doubling", vars: { member: outcome, kind: s.kind, bassRole: s.bassRole, k: sh.k, n: sh.n }, habit: { ctx, table: "doubling", outcome } });
          }
        }
      }
      // Spacing, crossing and range.
      const [S, A, T, B] = c.map((p) => midi(p!));
      if (S - A > 12) out.push({ tone: "note", slots: [i], key: "spacing", vars: { pair: "soprano-alto", gap: "an octave" }, habit: { ctx: "soprano-alto", table: "spacing", outcome: "over an octave" } });
      if (A - T > 12) out.push({ tone: "note", slots: [i], key: "spacing", vars: { pair: "alto-tenor", gap: "an octave" }, habit: { ctx: "alto-tenor", table: "spacing", outcome: "over an octave" } });
      if (T - B > 19) out.push({ tone: "note", slots: [i], key: "spacing", vars: { pair: "tenor-bass", gap: "a twelfth" }, habit: { ctx: "tenor-bass", table: "spacing", outcome: "over a twelfth" } });
      if (A > S || T > A || B > T) out.push({ tone: "note", slots: [i], key: "crossing", vars: {} });
    }
    for (const [v, p] of [["alto", alto[i]], ["tenor", tenor[i]]] as const) {
      if (p && (midi(p) < RANGE[v][0] || midi(p) > RANGE[v][1])) out.push({ tone: "note", slots: [i], key: "range", vars: { voice: v, pitch: p } });
    }
    if (i === 0) continue;
    const prev = col(i - 1);
    // Consecutive fifths and octaves, in any pair with an inner voice (C16).
    for (let x = 0; x < 4; x++)
      for (let y = x + 1; y < 4; y++) {
        if (x !== 1 && x !== 2 && y !== 1 && y !== 2) continue;
        const [a0, b0, a1, b1] = [prev[x], prev[y], c[x], c[y]];
        if (!a0 || !b0 || !a1 || !b1 || a0 === a1 || b0 === b1) continue;
        const i0 = Math.abs(midi(a0) - midi(b0)) % 12;
        const i1 = Math.abs(midi(a1) - midi(b1)) % 12;
        if (i0 === i1 && (i0 === 7 || i0 === 0) && Math.sign(midi(a1) - midi(a0)) === Math.sign(midi(b1) - midi(b0)))
          out.push({ tone: "error", slots: [i - 1, i], key: "parallel", vars: { kind: i0 === 7 ? "fifths" : "octaves", a: VOICE[x], b: VOICE[y] } });
      }
    // The augmented second in an inner line.
    for (const [v, line] of [["alto", alto], ["tenor", tenor]] as const) {
      const p0 = line[i - 1];
      const p1 = line[i];
      if (!p0 || !p1) continue;
      const steps = Math.abs("CDEFGAB".indexOf(p1[0]) + 7 * parsePitch(p1).octave - ("CDEFGAB".indexOf(p0[0]) + 7 * parsePitch(p0).octave));
      if (steps === 1 && Math.abs(midi(p1) - midi(p0)) === 3) out.push({ tone: "error", slots: [i - 1, i], key: "augSecond", vars: { voice: v, from: p0, to: p1 } });
    }
  }
  // The seventh in an inner voice, and the leading tone: how they go on at the next change of chord.
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const j = slots.findIndex((x, k) => k > i && (x.root !== s.root || x.kind !== s.kind));
    if (j < 0) continue;
    for (const [v, line] of [["alto", alto], ["tenor", tenor]] as const) {
      const p = line[i];
      const q = line[j];
      if (!p || !q) continue;
      const role = s.above.find(([l]) => pc(l) === pc(letter(p)))?.[1];
      if (role === "seventh") {
        const prepared = i > 0 && line[i - 1] === p ? "prepared" : "free";
        const bass = slots[j].bass !== s.bass ? "bass moves" : "bass holds";
        const ctx = `${v}|${prepared}|${bass}`;
        const outcome = motionOf(p, q);
        const sh = share("seventh", ctx, outcome);
        if (sh && sh.k / sh.n < RARE) out.push({ tone: "note", slots: [i, j], key: "seventh", vars: { voice: v, prepared, how: outcome, k: sh.k, n: sh.n }, habit: { ctx, table: "seventh", outcome } });
      }
      const dominant = (s.kind === "major" || s.kind === "dominant seventh") && ((pc(s.root) - pc(slots[j].root) + 12) % 12) === 7;
      if (dominant && role === "third") {
        const d = midi(q) - midi(p);
        const outcome = d === 1 ? "rises a semitone" : d === -3 || d === -4 ? "falls a third" : d === 0 ? "held" : "other";
        const sh = share("leading", v, outcome);
        if (sh && sh.k / sh.n < RARE) out.push({ tone: "note", slots: [i, j], key: "leading", vars: { voice: v, how: outcome, k: sh.k, n: sh.n }, habit: { ctx: v, table: "leading", outcome } });
      }
    }
  }
  return out;
}
