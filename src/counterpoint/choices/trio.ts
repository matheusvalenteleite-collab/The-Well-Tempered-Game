/**
 * Three voices, first species (Exercitium II, Lectio I): the choices audit of Fux's sixteen
 * solutions, his habits in three voices, and a generator that adds a third voice to two given
 * lines. Judged by the game's own three-voice rules (`evaluateTrio`, D90); the voices are staves
 * in Fux's order, top first, and "the bass" of a bar is its lowest note, as there.
 *
 * Only first species: the game has no three-voice rules for the other species yet.
 */
import { evaluateTrio, TRIO_FIRST_SPECIES, type TrioRule } from "../three-voice.ts";
import { harmonic, isImperfectConsonance, isPerfectConsonance, motion, simpleName } from "../interval.ts";
import { parsePitch } from "../../music/pitch.ts";
import type { ModalFinal } from "../../music/fux/index.ts";
import type { TrioStep } from "../../game/trio.ts";
import { rng } from "./cantus.ts";
import { compareTiers, TIER_NAMES, type TierName, type Tiers } from "./score.ts";
import { bits } from "./habits.ts";
import type { AuditSummary } from "./audit.ts";
import { summarise } from "./audit.ts";
import { DEFAULT_COUNSEL_WEIGHT, DEFAULT_TEMPERATURE } from "./counterpoint.ts";
import { pitchesBetween, sharpAllowed } from "./vocabulary.ts";

const midi = (p: string) => parsePitch(p).midi;
/** Position of a voice: 0 top, 1 middle, 2 bottom, by staff. */
export type Position = 0 | 1 | 2;

/* ---------------------------------------------------------------- habits */

type Counts = Map<string, number>;
const add = (m: Counts, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const total = (m: Counts) => [...m.values()].reduce((a, b) => a + b, 0);
const prob = (m: Counts, k: string, size: number) => ((m.get(k) ?? 0) + 0.5) / (total(m) + 0.5 * size);

export interface TrioHabits {
  from: string[];
  /** Melodic moves (signed semitones) of Fux's added voices, by staff position, and pooled. */
  melodic: [Counts, Counts, Counts];
  pooled: Counts;
  /** Sonorities: the figures above the bass, e.g. "3 5", "3 6", "5 8". */
  sonority: Counts;
  /** Spacing of neighbouring staves: [top-middle, middle-bottom], as compound intervals ("M3+1" = a tenth; "x" crossed). */
  spacing: [Counts, Counts];
  /** Lowest and highest MIDI pitch Fux writes on each staff (top, middle, bottom). */
  range: [number, number][];
}

const melodicKey = (a: string, b: string) => String(Math.max(-12, Math.min(12, midi(b) - midi(a))));

/** The sonority of a bar as Fux would figure it: simple intervals above the lowest note, sorted. */
export function sonorityKey(chord: string[]): string {
  const sorted = [...chord].sort((a, b) => midi(a) - midi(b));
  return sorted
    .slice(1)
    .map((p) => simpleName(harmonic(sorted[0], p)).replace(/^1$/, "8"))
    .sort((a, b) => parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, "")))
    .join(" ");
}

/** Distance between two neighbouring staves in a bar, upper staff first. */
export function spacingKey(upper: string, lower: string): string {
  const h = harmonic(lower, upper);
  const octaves = Math.floor((h.number - 1) / 7) - (h.number > 1 && (h.number - 1) % 7 === 0 ? 1 : 0);
  return `${midi(upper) < midi(lower) ? "x" : ""}${simpleName(h)}${octaves > 0 ? `+${octaves}` : ""}`;
}

export function buildTrioHabits(steps: TrioStep[], exclude: string[] = []): TrioHabits {
  const t: TrioHabits = { from: [], melodic: [new Map(), new Map(), new Map()], pooled: new Map(), sonority: new Map(), spacing: [new Map(), new Map()], range: [[127, 0], [127, 0], [127, 0]] };
  for (const s of steps) {
    if (exclude.includes(s.exerciseId)) continue;
    t.from.push(s.exerciseId);
    for (const v of [0, 1, 2] as Position[]) {
      if (v === s.cantusIndex) continue;
      const line = s.fux[v];
      for (let k = 1; k < line.length; k++) {
        add(t.melodic[v], melodicKey(line[k - 1], line[k]));
        add(t.pooled, melodicKey(line[k - 1], line[k]));
      }
    }
    s.fux.forEach((l, v) => {
      for (const p of l) t.range[v] = [Math.min(t.range[v][0], midi(p)), Math.max(t.range[v][1], midi(p))];
    });
    for (let k = 0; k < s.cantus.length; k++) {
      add(t.sonority, sonorityKey(s.fux.map((l) => l[k])));
      add(t.spacing[0], spacingKey(s.fux[0][k], s.fux[1][k]));
      add(t.spacing[1], spacingKey(s.fux[1][k], s.fux[2][k]));
    }
  }
  return t;
}

const melodicP = (t: TrioHabits, pos: Position, key: string) => {
  const pooled = prob(t.pooled, key, 25);
  return ((t.melodic[pos].get(key) ?? 0) + 5 * pooled) / (total(t.melodic[pos]) + 5);
};

/* ---------------------------------------------------------------- scoring */

export interface TrioCounsel {
  motion: number;
  perfect: number;
  repeat: number;
  leap: number;
}

/**
 * Fux's counsel for one note of voice `v` in bar k: similar or parallel motion into a perfect
 * consonance with another voice (p. 86: avoided where it can be), a bar of perfect consonances only
 * (the triad, p. 82), a repeated note (variety), leaps (singability), into and out of the bar.
 */
export function trioCounsel(voices: string[][], v: number, k: number): TrioCounsel {
  const c: TrioCounsel = { motion: 0, perfect: 0, repeat: 0, leap: 0 };
  const line = voices[v];
  const n = line.length;
  for (const [a, b] of [[k - 1, k], [k, k + 1]]) {
    if (a < 0 || b >= n) continue;
    for (let y = 0; y < 3; y++) {
      if (y === v) continue;
      const m = motion(voices[y][a], line[a], voices[y][b], line[b]);
      if ((m === "similar" || m === "parallel") && isPerfectConsonance(harmonic(voices[y][b], line[b]))) c.motion++;
    }
    const d = Math.abs(midi(line[b]) - midi(line[a]));
    if (d === 0) c.repeat++;
    if (d > 2) c.leap++;
    if (d > 5) c.leap++;
  }
  if (k > 0 && k < n - 1) {
    const chord = voices.map((l) => l[k]);
    const low = chord.reduce((x, y) => (midi(y) < midi(x) ? y : x));
    if (!chord.some((p) => p !== low && isImperfectConsonance(harmonic(low, p)))) c.perfect++;
  }
  return c;
}

/** Surprisal of the spacing around voice v in bar k (its neighbouring staves). */
const spacingBits = (t: TrioHabits, voices: string[][], v: Position, k: number) => {
  let h = 0;
  if (v <= 1) h += bits(prob(t.spacing[0], spacingKey(voices[0][k], voices[1][k]), 50));
  if (v >= 1) h += bits(prob(t.spacing[1], spacingKey(voices[1][k], voices[2][k]), 50));
  return h;
};

export function trioHabit(t: TrioHabits, voices: string[][], v: Position, k: number): number {
  const line = voices[v];
  let h = bits(prob(t.sonority, sonorityKey(voices.map((l) => l[k])), 40)) + spacingBits(t, voices, v, k);
  if (k > 0) h += bits(melodicP(t, v, melodicKey(line[k - 1], line[k])));
  if (k + 1 < line.length) h += bits(melodicP(t, v, melodicKey(line[k], line[k + 1])));
  return h;
}

const counselTotal = (c: TrioCounsel) => c.motion + c.perfect + c.repeat + c.leap;

/* ---------------------------------------------------------------- choices */

export interface TrioCandidate {
  pitch: string;
  legal: boolean;
  errors: string[];
  warnings: string[];
  tiers: Tiers;
  counsel: TrioCounsel;
  written: boolean;
}

export interface TrioChoice {
  voice: Position;
  bar: number;
  written: string;
  candidates: TrioCandidate[];
  legal: number;
  rank: number;
  ties: number;
  /** For summarise(): the unit is the bar. */
  unit: number[];
  beat: number;
}

export interface TrioContext {
  modalFinal: ModalFinal;
  cantusIndex: number;
  rules: readonly TrioRule[];
  habits: TrioHabits;
}

export function judgeTrio(ctx: Pick<TrioContext, "modalFinal" | "cantusIndex" | "rules">, voices: string[][]) {
  return evaluateTrio({ modalFinal: ctx.modalFinal, voices, cantusIndex: ctx.cantusIndex }, ctx.rules);
}

/** Candidate pitches for voice v: naturals plus the accidentals in use on this final, within reach of the written line. */
export function trioVocabulary(line: string[], accidentals: string[]): string[] {
  const m = line.map(midi);
  return pitchesBetween(Math.min(...m) - 5, Math.max(...m) + 5, accidentals);
}

export function trioChoicesAt(ctx: TrioContext, voices: string[][], v: Position, k: number, vocabulary: string[], order: TierName[] = TIER_NAMES): TrioChoice {
  const written = voices[v][k];
  const pool = vocabulary.includes(written) ? vocabulary : [...vocabulary, written];
  const cands = pool.map((p) => {
    const trial = voices.map((l, x) => (x === v ? l.map((q, j) => (j === k ? p : q)) : l));
    const ev = judgeTrio(ctx, trial);
    const counsel = trioCounsel(trial, v, k);
    return {
      pitch: p,
      legal: ev.errors.length === 0,
      errors: [...new Set(ev.errors.map((x) => x.ruleId))],
      warnings: [...new Set(ev.warnings.map((x) => x.ruleId))],
      tiers: { errors: ev.errors.length, warnings: ev.warnings.length, counsel: counselTotal(counsel), habit: trioHabit(ctx.habits, trial, v, k) },
      counsel,
      written: p === written,
    };
  });
  const legal = cands.filter((c) => c.legal).sort((a, b) => compareTiers(a.tiers, b.tiers, order));
  const illegal = cands.filter((c) => !c.legal).sort((a, b) => a.tiers.errors - b.tiers.errors);
  const w = cands.find((c) => c.written)!;
  const better = w.legal ? legal.filter((c) => compareTiers(c.tiers, w.tiers, order) < 0).length : 0;
  const ties = w.legal ? legal.filter((c) => !c.written && compareTiers(c.tiers, w.tiers, order) === 0).length : 0;
  return { voice: v, bar: k, written, candidates: [...legal, ...illegal], legal: legal.length, rank: w.legal ? better + 1 : 0, ties, unit: [k], beat: 0 };
}

export interface TrioAudit {
  step: TrioStep;
  /** The added voices (not the cantus), in staff order. */
  voices: Position[];
  /** choices[i][k]: voice voices[i], bar k. */
  choices: TrioChoice[][];
  summary: AuditSummary;
}

/** Accidentals Fux writes in his three-voice lines, by final. */
export function trioAccidentals(steps: TrioStep[]): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  for (const s of steps) for (const l of s.fux) for (const p of l) if (/[#b]/.test(p)) (out[s.modalFinal] ??= new Set()).add(p.replace(/-?\d+$/, ""));
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v]]));
}

export function auditTrio(steps: TrioStep[], step: TrioStep, opts: { order?: TierName[]; leaveOneOut?: boolean; accidentals?: Record<string, string[]> } = {}): TrioAudit {
  const ctx: TrioContext = { modalFinal: step.modalFinal, cantusIndex: step.cantusIndex, rules: TRIO_FIRST_SPECIES, habits: buildTrioHabits(steps, opts.leaveOneOut === false ? [] : [step.exerciseId]) };
  const acc = (opts.accidentals ?? trioAccidentals(steps))[step.modalFinal] ?? [];
  const voices = ([0, 1, 2] as Position[]).filter((v) => v !== step.cantusIndex);
  const choices = voices.map((v) => {
    const vocab = trioVocabulary(step.fux[v], acc);
    return step.fux[v].map((_, k) => trioChoicesAt(ctx, step.fux, v, k, vocab, opts.order ?? TIER_NAMES));
  });
  return { step, voices, choices, summary: summarise(choices.flat()) };
}

export const poolTrios = (audits: TrioAudit[]) => summarise(audits.flatMap((a) => a.choices.flat()));

export function auditTrios(steps: TrioStep[], opts: { order?: TierName[]; leaveOneOut?: boolean } = {}): TrioAudit[] {
  const accidentals = trioAccidentals(steps);
  return steps.map((s) => auditTrio(steps, s, { ...opts, accidentals }));
}

/* ---------------------------------------------------------------- generator */

export type Placement = "above" | "between" | "below";

export interface ThirdVoiceOptions {
  modalFinal: ModalFinal;
  /** The two given lines, top first (one of them the cantus firmus). */
  given: [string[], string[]];
  /** Which of the two given lines is the cantus (0 = the upper one). */
  cantusOfGiven: 0 | 1;
  placement: Placement;
  habits: TrioHabits;
  accidentals: string[];
  counselWeight?: number;
  temperature?: number;
  width?: number;
  seed?: number;
}

export interface ThirdVoice {
  /** The three lines, top first. */
  voices: string[][];
  cantusIndex: number;
  /** Staff of the new voice. */
  added: Position;
  warnings: string[];
}

const DEFERRED = new Set(["t1.final-chord", "t1.cadence"]);

/**
 * A third voice added to two lines, by the same beam search as in two voices: bar by bar, each
 * partial trio judged by the game's three-voice rules (the final chord and the cadence wait for
 * the end), ranked by Fux's three-voice habits and, if weighted, his counsel.
 */
export function generateThirdVoice(o: ThirdVoiceOptions): ThirdVoice {
  const [hi, lo] = o.given;
  const n = hi.length;
  const added: Position = o.placement === "above" ? 0 : o.placement === "between" ? 1 : 2;
  const cantusIndex = o.placement === "above" ? 1 + o.cantusOfGiven : o.placement === "between" ? (o.cantusOfGiven === 0 ? 0 : 2) : o.cantusOfGiven;
  const assemble = (line: string[]) => (added === 0 ? [line, hi, lo] : added === 1 ? [hi, line, lo] : [hi, lo, line]);
  // Register: above or below the pair by up to a tenth, or between them; a step of crossing allowed (Fux crosses).
  const top = Math.max(...hi.map(midi), ...lo.map(midi));
  const bottom = Math.min(...hi.map(midi), ...lo.map(midi));
  const [wlo, whi] = o.placement === "above" ? [Math.min(...hi.map(midi)) - 2, top + 16] : o.placement === "below" ? [bottom - 16, Math.max(...lo.map(midi)) + 2] : [Math.min(...lo.map(midi)) - 2, Math.max(...hi.map(midi)) + 2];
  // Within the compass of Fux's three voices (his sixteen solutions), a tone either side. Not per
  // staff: Fux moves the cantus by octaves from staff to staff, and the lab keeps it in its own octave.
  const rlo = Math.min(...o.habits.range.map((r) => r[0])) - 2;
  const rhi = Math.max(...o.habits.range.map((r) => r[1])) + 2;
  const vocab = pitchesBetween(Math.max(wlo, rlo), Math.min(whi, rhi), o.accidentals);
  const fits = (p: string, k: number) => {
    if (!sharpAllowed(p, k, n)) return false;
    const m = midi(p);
    if (o.placement === "above") return m >= midi(hi[k]) - 2;
    if (o.placement === "below") return m <= midi(lo[k]) + 2;
    const [a, b] = [midi(hi[k]), midi(lo[k])];
    return m <= Math.max(a, b) + 2 && m >= Math.min(a, b) - 2;
  };
  const r = rng(o.seed ?? Date.now());
  const T = o.temperature ?? DEFAULT_TEMPERATURE;
  const noise = () => -(T / Math.LN2) * -Math.log(-Math.log(Math.max(1e-12, r())));
  const w = o.counselWeight ?? DEFAULT_COUNSEL_WEIGHT;
  const prefixRules = TRIO_FIRST_SPECIES.filter((x) => !DEFERRED.has(x.id));
  const stepCost = (line: string[], k: number) => {
    const vs = assemble(line).map((l) => l.slice(0, k + 1));
    let habit = bits(prob(o.habits.sonority, sonorityKey(vs.map((l) => l[k])), 40)) + spacingBits(o.habits, vs, added, k);
    if (k > 0) habit += bits(melodicP(o.habits, added, melodicKey(line[k - 1], line[k])));
    let counsel = 0;
    if (k > 0) {
      const d = Math.abs(midi(line[k]) - midi(line[k - 1]));
      counsel += (d === 0 ? 1 : 0) + (d > 2 ? 1 : 0) + (d > 5 ? 1 : 0);
      for (const other of [hi, lo]) {
        const m = motion(other[k - 1], line[k - 1], other[k], line[k]);
        if ((m === "similar" || m === "parallel") && isPerfectConsonance(harmonic(other[k], line[k]))) counsel++;
      }
    }
    return w * counsel + habit;
  };
  const judgePrefix = (line: string[], rules: readonly TrioRule[]) => {
    const k = line.length;
    return evaluateTrio({ modalFinal: o.modalFinal, voices: assemble(line).map((l) => l.slice(0, k)), cantusIndex }, rules);
  };
  let reached = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    const width = (o.width ?? 40) * 2 ** attempt;
    let beam: { line: string[]; cost: number }[] = [{ line: [], cost: 0 }];
    let snapshot: typeof beam = [];
    for (let k = 0; k < n && beam.length; k++) {
      if (k === n - 2) snapshot = beam;
      const next: { line: string[]; cost: number }[] = [];
      for (const st of beam) {
        for (const p of vocab) {
          if (!fits(p, k)) continue;
          const line = [...st.line, p];
          if (k > 0 && Math.abs(midi(p) - midi(st.line[k - 1])) > 12) continue;
          next.push({ line, cost: st.cost + stepCost(line, k) + noise() });
        }
      }
      next.sort((a, b) => a.cost - b.cost);
      const kept: typeof beam = [];
      for (const st of next) {
        if (k < n - 1 && kept.length >= width) break;
        // The judge needs two bars; the opening is judged with the second.
        if (k > 0 && judgePrefix(st.line, k === n - 1 ? TRIO_FIRST_SPECIES : prefixRules).errors.length) continue;
        kept.push(st);
        if (k === n - 1) break;
      }
      beam = kept;
      if (beam.length) reached = Math.max(reached, k + 1);
    }
    if (beam.length) {
      const ev = judgePrefix(beam[0].line, TRIO_FIRST_SPECIES);
      return { voices: assemble(beam[0].line), cantusIndex, added, warnings: [...new Set(ev.warnings.map((x) => x.ruleId))] };
    }
    // The cadence: try every completion of the last two bars from the best states before it.
    let budget = 1500;
    const near = (x: string, y: string) => Math.abs(midi(x) - midi(y)) <= 12;
    for (const st of snapshot) {
      if (budget < 0 || st.line.length !== n - 2) break;
      for (const a of vocab) {
        if (!fits(a, n - 2) || (st.line.length && !near(st.line[n - 3], a))) continue;
        for (const b of vocab) {
          if (!fits(b, n - 1) || !near(a, b) || --budget < 0) continue;
          const line = [...st.line, a, b];
          const ev = judgePrefix(line, TRIO_FIRST_SPECIES);
          if (ev.passed) return { voices: assemble(line), cantusIndex, added, warnings: [...new Set(ev.warnings.map((x) => x.ruleId))] };
        }
      }
    }
  }
  const close = hi.filter((p, k) => Math.abs(midi(p) - midi(lo[k])) <= 4).length;
  const why =
    o.placement === "between" && close > n / 3
      ? ` The two lines are a third or less apart in ${close} of ${n} bars, so a middle voice could only double one of them, and doubling twice in a row makes parallel unisons. Fux spaces his three voices widely; try a voice above or below, or a new counterpoint further from the cantus.`
      : reached < n
        ? ` Every candidate breaks a three-voice rule by bar ${reached + 1} of ${n}${reached + 1 >= n - 1 ? " (the cadence: the two lines leave no note for this voice that makes Fux's ending)" : ""}. Try another placement, or a new counterpoint.`
        : " Try another placement, or a new counterpoint.";
  throw new Error(`No ${o.placement === "between" ? "middle" : o.placement === "above" ? "upper" : "lower"} voice fits these two lines under the three-voice rules.${why}`);
}
