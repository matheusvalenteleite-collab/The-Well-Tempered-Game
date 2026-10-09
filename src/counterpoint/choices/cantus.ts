/**
 * Cantus firmus: the checker and the generator, after the constraints accepted in D8
 * (docs/m1/M1-REPORT.md §4), measured on Fux's own cantus firmi. Fux states no precepts for a
 * cantus; he gives six. So every hard constraint below must accept all of Fux's cantus firmi
 * ("Fux is always the last word", D39); where a §4 band would reject one of them it is widened to
 * Fux's own value and the change is noted.
 *
 * Hard: 1 begin and end on the final; 2 approach the final by a step down from the second degree;
 * 3 length 9-14 (Fux's C variant has 9; the generator's default is 10-14); 4 range a fifth to an
 * octave; 5 in C, nothing below the final; 6 no repeated notes; 7-9 steps either way, rising
 * leaps of a third or fourth (a fifth or octave only when allowed), falling leaps of a third only;
 * 10 no sixth, seventh, tritone, augmented or diminished interval, leapt or outlined by two leaps
 * the same way; 12 at most two leaps the same way, and then outlining a triad; 13 a single
 * highest note, 40-65% of the way through; 14 leaps 20-62% of the intervals (§4 said 25-60%; Fux's A variant, Fig. 42, has 2 of 10;
 * G has 8 of 13); and Fux's antepenultimate degree, 1 or 3 (Ewing 2009; all of Fux's).
 * Soft (counted, not forbidden): 11 turning after a rising leap of a fourth or more (Fux's G does
 * not, once).
 */
import { interval } from "../interval.ts";
import { parsePitch } from "../../music/pitch.ts";
import type { ModalFinal } from "../../music/fux/index.ts";
import { pitchesBetween } from "./vocabulary.ts";

export interface CantusOptions {
  final: ModalFinal;
  /** Number of notes (default: random 10-14). */
  length?: number;
  /** Allow Fux's rare rising fifth and octave (§4.8). */
  wideLeaps?: boolean;
  seed?: number;
}

export interface CantusCheck {
  hard: string[];
  soft: string[];
}

/** Octave of the final in Fux's principal cantus firmi. */
export const FINAL_PITCH: Record<ModalFinal, string> = { D: "D4", E: "E4", F: "F3", G: "G3", A: "A3", C: "C4" };

const LETTERS = "CDEFGAB";
const degree = (p: string, final: ModalFinal) => ((LETTERS.indexOf(p[0]) - LETTERS.indexOf(final) + 7) % 7) + 1;
const midi = (p: string) => parsePitch(p).midi;

/** Is a melodic interval (signed semitones) allowed as a single move? */
function moveAllowed(from: string, to: string, wide: boolean): boolean {
  const i = interval(from, to);
  const up = midi(to) > midi(from);
  if (i.number === 2) return i.quality === "m" || i.quality === "M";
  if (i.number === 3) return i.quality === "m" || i.quality === "M";
  if (i.number === 4) return up && i.quality === "P";
  if (i.number === 5) return wide && up && i.quality === "P";
  if (i.number === 8) return wide && up && i.quality === "P";
  return false;
}

/** Notes of a triad (stacked thirds, any inversion)? */
function isTriad(ps: string[]): boolean {
  const pcs = [...new Set(ps.map((p) => LETTERS.indexOf(p[0])))];
  if (pcs.length !== 3) return false;
  return pcs.some((r) => pcs.every((x) => [0, 2, 4].includes((x - r + 7) % 7)));
}

/** Checks of everything decidable on a prefix (used while generating) and, with `complete`, the rest. */
export function checkCantus(ps: string[], final: ModalFinal, complete = true, wide = true): CantusCheck {
  const hard: string[] = [];
  const soft: string[] = [];
  const m = ps.map(midi);
  if (ps[0][0] !== final) hard.push("1 begins off the final");
  for (let i = 1; i < ps.length; i++) {
    if (m[i] === m[i - 1]) hard.push(`6 repeated note at ${i + 1}`);
    else if (!moveAllowed(ps[i - 1], ps[i], wide)) hard.push(`7-9 interval ${interval(ps[i - 1], ps[i]).name} ${m[i] > m[i - 1] ? "up" : "down"} at ${i}-${i + 1}`);
    if (i >= 2) {
      const d1 = m[i - 1] - m[i - 2];
      const d2 = m[i] - m[i - 1];
      const leaps = Math.abs(d1) > 2 && Math.abs(d2) > 2;
      if (leaps && Math.sign(d1) === Math.sign(d2)) {
        if (!isTriad(ps.slice(i - 2, i + 1))) hard.push(`12 two leaps not outlining a triad at ${i - 1}-${i + 1}`);
        const o = interval(ps[i - 2], ps[i]);
        if (o.quality === "A" || o.quality === "d" || o.number === 7) hard.push(`10 outlined ${o.name} at ${i - 1}-${i + 1}`);
      }
      if (i >= 3) {
        const d0 = m[i - 2] - m[i - 3];
        if ([d0, d1, d2].every((d) => Math.abs(d) > 2) && Math.sign(d0) === Math.sign(d1) && Math.sign(d1) === Math.sign(d2)) hard.push(`12 three leaps the same way at ${i - 2}-${i + 1}`);
      }
      if (d1 >= 5 && d2 > 0) soft.push(`11 no turn after the rising leap at ${i - 1}-${i}`);
    }
  }
  const lo = Math.min(...m);
  const hi = Math.max(...m);
  if (hi - lo > 12) hard.push("4 range beyond an octave");
  if (final === "C" && lo < m[0]) hard.push("5 below the final (C)");
  if (!complete) return { hard, soft };
  const n = ps.length;
  if (ps[n - 1][0] !== final) hard.push("1 ends off the final");
  if (!(degree(ps[n - 2], final) === 2 && m[n - 2] > m[n - 1] && m[n - 2] - m[n - 1] <= 2)) hard.push("2 final not approached by a step down from 2");
  if (n < 9 || n > 14) hard.push(`3 length ${n}`);
  if (hi - lo < 7) hard.push("4 range below a fifth");
  const tops = m.flatMap((x, i) => (x === hi ? [i] : []));
  if (tops.length !== 1) hard.push("13 more than one highest note");
  else if (tops[0] / (n - 1) < 0.4 || tops[0] / (n - 1) > 0.65) hard.push(`13 highest note at ${Math.round((100 * tops[0]) / (n - 1))}%`);
  const leaps = m.slice(1).filter((x, i) => Math.abs(x - m[i]) > 2).length / (n - 1);
  if (leaps < 0.2 || leaps > 0.62) hard.push(`14 leaps ${Math.round(100 * leaps)}% of the intervals`);
  if (![1, 3].includes(degree(ps[n - 3], final))) hard.push("antepenultimate not degree 1 or 3");
  return { hard, soft };
}

/** Seeded generator (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shuffle = <T>(xs: T[], r: () => number) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * A cantus firmus by randomised depth-first search: every hard constraint, and the fewest soft
 * ones (the search keeps the first solution with none, else the best of a bounded number).
 */
export function generateCantus(opts: CantusOptions): string[] {
  const r = rng(opts.seed ?? Date.now());
  const wide = opts.wideLeaps ?? false;
  const start = FINAL_PITCH[opts.final];
  const s = midi(start);
  const pool = pitchesBetween(s - 7, s + 12, []);
  for (let attempt = 0; attempt < 50; attempt++) {
    const n = opts.length ?? 10 + Math.floor(r() * 5);
    let best: string[] | null = null;
    let bestSoft = Infinity;
    let budget = 20000;
    const walk = (ps: string[]): boolean => {
      if (--budget < 0) return true;
      if (ps.length === n) {
        const c = checkCantus(ps, opts.final, true, wide);
        if (c.hard.length === 0 && c.soft.length < bestSoft) {
          best = [...ps];
          bestSoft = c.soft.length;
        }
        return bestSoft === 0;
      }
      // The last two notes are fixed: the second degree above the final, then the final.
      const fixed = ps.length === n - 1 ? [start] : ps.length === n - 2 ? pool.filter((p) => degree(p, opts.final) === 2 && midi(p) > s && midi(p) - s <= 2) : null;
      for (const p of fixed ?? shuffle(pool, r)) {
        const next = [...ps, p];
        if (checkCantus(next, opts.final, false, wide).hard.length) continue;
        if (walk(next)) return true;
      }
      return false;
    };
    walk([start]);
    if (best) return best;
  }
  throw new Error(`no cantus firmus found on ${opts.final}`);
}

/* ---------------------------------------------------------------- register and clef */

export type Register = "low" | "mid" | "high";
export type LabClef = "treble" | "bass";

/** The notes each clef shows without ledger lines: the five lines and the space just outside them. */
const ON_STAFF: Record<LabClef, [number, number]> = { treble: [parsePitch("D4").midi, parsePitch("G5").midi], bass: [parsePitch("F2").midi, parsePitch("B3").midi] };

/** Notes of a line that need ledger lines in a clef. */
export const offStaff = (line: string[], clef: LabClef) => line.filter((p) => midi(p) < ON_STAFF[clef][0] || midi(p) > ON_STAFF[clef][1]).length;

/** The clef that leaves fewer notes off the staff (G on a tie when the line averages middle C or above). */
export function clefFor(line: string[]): LabClef {
  const t = offStaff(line, "treble");
  const b = offStaff(line, "bass");
  if (t !== b) return t < b ? "treble" : "bass";
  return line.reduce((a, p) => a + midi(p), 0) / line.length >= 60 ? "treble" : "bass";
}

/** Move a line by whole octaves. */
export const transpose = (line: string[], octaves: number) => line.map((p) => p.replace(/(-?\d+)$/, (o) => String(Number(o) + octaves)));

/**
 * The cantus firmus in a register, by whole octaves (the melody is unchanged):
 * middle — the octave whose average lies nearest middle C, written in whichever clef leaves fewer
 * notes off the staff; low — an octave below, in the F clef; high — an octave above, in the G clef.
 */
export function placeCantus(line: string[], register: Register): { line: string[]; clef: LabClef } {
  const mean = (l: string[]) => l.reduce((a, p) => a + midi(p), 0) / l.length;
  let mid = line;
  for (const s of [-2, -1, 1, 2]) {
    const t = transpose(line, s);
    if (Math.abs(mean(t) - 60) < Math.abs(mean(mid) - 60)) mid = t;
  }
  if (register === "low") return { line: transpose(mid, -1), clef: "bass" };
  if (register === "high") return { line: transpose(mid, 1), clef: "treble" };
  return { line: mid, clef: clefFor(mid) };
}
