/**
 * Hints for a line being written (complete or not): at one choice, which pitches the rules allow
 * given the rest of the line, where the written note ranks among them, and the one Fux would most
 * likely have written. A candidate is judged by the errors it *causes*: the line's errors with the
 * candidate in place, less those the line has with that choice left empty. So a mistake elsewhere,
 * or a rule about the ending that waits for the last bars, does not make every candidate illegal.
 *
 * The game's engine judges whole lines only; a choice in a line still being written is judged in
 * the stretch of written bars around it (windowFor), with the rules about the opening and the ending
 * waiting until the window reaches them.
 *
 * Meant to be adopted by the game as it is ("Fux had N choices here", docs/BACKLOG.md step 5).
 */
import type { Violation } from "../rules/types.ts";
import { judgeLine, scoreCandidate, type Candidate, type ChoiceContext } from "./alternatives.ts";
import { compareTiers, TIER_NAMES, type TierName } from "./score.ts";
import { choiceUnits } from "./corpus.ts";
import { slotLayout, sounding } from "../layout.ts";

export interface HintCandidate extends Candidate {
  /** Violations this pitch causes (absent with the choice left empty). */
  caused: Violation[];
  causedWarnings: Violation[];
}

export interface Hint {
  unit: number[];
  bar: number;
  beat: number;
  /** The note written there, or null. */
  written: string | null;
  /** Legal candidates best first (by the tiers), then the rest, fewest errors first. */
  candidates: HintCandidate[];
  legal: number;
  /** 1 + legal candidates strictly better than the written note (0: illegal or nothing written). */
  rank: number;
  /** The best legal candidate: what Fux would most likely write here. */
  best: string | null;
}

const key = (v: Violation) => `${v.ruleId}@${v.positions.join(",")}`;
/** Rules that judge the whole line, its opening or its ending: they wait while the window is not the whole line. */
const ENDING = /cadence|final|prefer-imperfect|ligature-where-possible/;
const OPENING = /opening/;

/** The choice containing slot k: a fourth-species ligature, or the slot alone. */
export function unitAt(ctx: ChoiceContext, line: (string | null)[], k: number): number[] {
  if (!sounding(line[k])) return [k];
  return choiceUnits(ctx.layout, line.map((p) => p ?? "")).find((u) => u.includes(k)) ?? [k];
}

const filled = (ctx: ChoiceContext, line: (string | null)[], k: number) => sounding(line[k]) || (k === 0 && ctx.layout[0].restAllowed && ctx.species === "fourth");

/**
 * The stretch of the line a choice can be judged in: whole written bars before it, and after it
 * up to the furthest written downbeat (the window's last bar is that downbeat alone, as in the
 * generator's prefixes). Null when a weak-beat note is followed by gaps in its bar: it is judged
 * once the bar and the next downbeat are written.
 */
export function windowFor(ctx: ChoiceContext, line: (string | null)[], unit: number[]): { from: number; to: number; whole: boolean } | null {
  const L = ctx.layout;
  const n = L.length;
  const ok = (k: number) => unit.includes(k) || filled(ctx, line, k);
  if (L.every((_, k) => ok(k))) return { from: 0, to: n - 1, whole: true };
  const u0 = unit[0];
  // Back: to the start of the unit's bar, then whole bars while they are written.
  let from = L.findIndex((s) => s.bar === L[u0].bar);
  for (let k = from; k < u0; k++) if (!ok(k)) return null;
  while (from > 0) {
    const b = L[from - 1].bar;
    const start = L.findIndex((s) => s.bar === b);
    let all = true;
    for (let k = start; k < from; k++) if (!ok(k)) all = false;
    if (!all) break;
    from = start;
  }
  // Forward: through written slots; the window ends on the last written downbeat reached.
  let to = -1;
  for (let k = u0; k < n && ok(k); k++) if (L[k].beat === 0) to = k;
  const lastOfUnit = unit[unit.length - 1];
  if (to < lastOfUnit && L[lastOfUnit].beat !== 0) return null;
  if (to < lastOfUnit) to = lastOfUnit;
  if (L[to].bar - L[from].bar < 1) {
    // One bar is too short for the engine: take the next downbeat if written, else wait.
    const next = L.findIndex((s, k) => k > to && s.beat === 0);
    if (next < 0 || !ok(next) || L.slice(to + 1, next).some((_, i) => !ok(to + 1 + i))) return null;
    to = next;
  }
  return { from, to, whole: from === 0 && to === n - 1 };
}

/** Judge the line in a window; positions are mapped back to the whole line's slots. */
export function judgeWindow(ctx: ChoiceContext, line: (string | null)[], w: { from: number; to: number; whole: boolean }): { errors: Violation[]; warnings: Violation[] } {
  if (w.whole) {
    const ev = judgeLine(ctx, line);
    return { errors: ev.errors, warnings: ev.warnings };
  }
  const b0 = ctx.layout[w.from].bar;
  const b1 = ctx.layout[w.to].bar;
  const slots = ctx.layout.map((_, k) => k).filter((k) => k >= w.from && k <= w.to && (ctx.layout[k].bar < b1 || k === w.to));
  const sub: ChoiceContext = { ...ctx, cantus: ctx.cantus.slice(b0, b1 + 1), layout: slotLayout(ctx.species, b1 - b0 + 1) };
  const ev = judgeLine(sub, slots.map((k) => line[k]));
  const back = (v: Violation): Violation => ({ ...v, positions: v.positions.map((p) => slots[p] ?? p) });
  const keep = (v: Violation) => !(b1 < ctx.cantus.length - 1 && ENDING.test(v.ruleId)) && !(b0 > 0 && OPENING.test(v.ruleId));
  return { errors: ev.errors.filter(keep).map(back), warnings: ev.warnings.filter(keep).map(back) };
}

export function hintAt(ctx: ChoiceContext, line: (string | null)[], unit: number[], order: TierName[] = TIER_NAMES): Hint | null {
  const w = windowFor(ctx, line, unit);
  const s = ctx.layout[unit[0]];
  const written = sounding(line[unit[0]]) ? line[unit[0]]! : null;
  if (!w) return null;
  const touches = (v: Violation) => v.positions.some((p) => unit.includes(p));
  const pool = written && !ctx.vocabulary.includes(written) ? [...ctx.vocabulary, written] : ctx.vocabulary;
  const judged = pool.map((p) => {
    const trial = line.map((q, k) => (unit.includes(k) ? p : q));
    return { p, trial, ev: judgeWindow(ctx, trial, w) };
  });
  // What the line breaks away from this choice whatever is written here is not the candidate's doing.
  const away = (vs: Violation[]) => new Set(vs.filter((v) => !touches(v)).map(key));
  const sets = judged.map((j) => away([...j.ev.errors, ...j.ev.warnings]));
  const had = new Set([...(sets[0] ?? [])].filter((k) => sets.every((x) => x.has(k))));
  const cands: HintCandidate[] = judged.map(({ p, trial, ev }) => {
    const caused = ev.errors.filter((v) => touches(v) || !had.has(key(v)));
    const causedWarnings = ev.warnings.filter((v) => touches(v) || !had.has(key(v)));
    const c = scoreCandidate(ctx, trial as string[], unit, p, p === written, ev);
    return {
      ...c,
      legal: caused.length === 0,
      errors: [...new Set(caused.map((v) => v.ruleId))],
      warnings: [...new Set(causedWarnings.map((v) => v.ruleId))],
      tiers: { ...c.tiers, errors: caused.length, warnings: causedWarnings.length },
      caused,
      causedWarnings,
    };
  });
  const legal = cands.filter((c) => c.legal).sort((a, b) => compareTiers(a.tiers, b.tiers, order));
  const illegal = cands.filter((c) => !c.legal).sort((a, b) => a.tiers.errors - b.tiers.errors);
  const wc = cands.find((c) => c.written);
  const rank = wc?.legal ? legal.filter((c) => compareTiers(c.tiers, wc.tiers, order) < 0).length + 1 : 0;
  return { unit, bar: s.bar, beat: s.beat, written, candidates: [...legal, ...illegal], legal: legal.length, rank, best: legal[0]?.pitch ?? null };
}

/** How many pitches the rules allow at every choice of the line (cheap view for a strip of cells). */
export function legalCounts(ctx: ChoiceContext, line: (string | null)[]): { unit: number[]; legal: number; written: string | null; rank: number }[] {
  const seen = new Set<number>();
  const out: { unit: number[]; legal: number; written: string | null; rank: number }[] = [];
  for (let k = 0; k < ctx.layout.length; k++) {
    if (seen.has(k)) continue;
    if (k === 0 && ctx.species === "fourth" && !sounding(line[0])) continue; // the opening half rest
    const unit = unitAt(ctx, line, k);
    unit.forEach((s) => seen.add(s));
    const h = hintAt(ctx, line, unit, ["errors"]);
    if (h) out.push({ unit, legal: h.legal, written: h.written, rank: h.rank });
  }
  return out;
}

/**
 * The line as far as it is written, judged: the whole line once complete; before that, the
 * written stretch from the opening to its last downbeat (rules about the ending waiting).
 */
export function judgeWritten(ctx: ChoiceContext, line: (string | null)[]): { errors: Violation[]; warnings: Violation[] } {
  const L = ctx.layout;
  let to = -1;
  for (let k = 0; k < L.length && filled(ctx, line, k); k++) if (L[k].beat === 0) to = k;
  if (to === L.length - 1 && line.every((_, k) => filled(ctx, line, k))) return judgeWindow(ctx, line, { from: 0, to, whole: true });
  if (to < 0 || L[to].bar < 1) return { errors: [], warnings: [] };
  return judgeWindow(ctx, line, { from: 0, to, whole: false });
}
