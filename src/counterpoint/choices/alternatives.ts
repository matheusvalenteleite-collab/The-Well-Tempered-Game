/**
 * The alternatives audit (after Ewing 2009, "mode 2"): at each choice of a line, put every
 * candidate pitch in place of the written one, keep the rest of the line as it is, judge the whole
 * line again, and rank the candidates that break no precept. Judging the whole line checks the
 * motion out of the choice as well as into it.
 */
import { evaluate } from "../engine.ts";
import type { ModalFinal, Staff } from "../../music/fux/index.ts";
import { sounding, type Slot, type SpeciesId } from "../layout.ts";
import type { Rule } from "../rules/types.ts";
import type { HabitTables } from "./habits.ts";
import { compareTiers, counselOf, counselTotal, habitOf, TIER_NAMES, type CounselParts, type HabitParts, type TierName, type Tiers } from "./score.ts";

export interface ChoiceContext {
  species: SpeciesId;
  modalFinal: ModalFinal;
  cantusVoice: Staff;
  cantus: string[];
  layout: Slot[];
  rules: Rule[];
  /** Candidate pitches (vocabulary.ts). */
  vocabulary: string[];
  habits: HabitTables;
}

export interface Candidate {
  pitch: string;
  legal: boolean;
  /** Rule ids broken (errors) and recommendations not followed (warnings). */
  errors: string[];
  warnings: string[];
  tiers: Tiers;
  counsel: CounselParts;
  habit: HabitParts;
  /** The pitch already written at this choice (Fux's, in the audit). */
  written: boolean;
}

export interface UnitChoices {
  unit: number[];
  bar: number;
  beat: number;
  written: string;
  /** Legal candidates best first, then the illegal ones. */
  candidates: Candidate[];
  legal: number;
  /** 1 + legal candidates strictly better than the written pitch (0 if the written pitch is illegal). */
  rank: number;
  /** Legal candidates scoring exactly as the written pitch. */
  ties: number;
}

export function judgeLine(ctx: ChoiceContext, line: (string | null)[]) {
  return evaluate(
    {
      species: ctx.species,
      modalFinal: ctx.modalFinal,
      cantusVoice: ctx.cantusVoice,
      cantus: ctx.cantus.map((p) => ({ pitch: p, duration: "1/1" })),
      counterpoint: line.map((p, k) => ({ pitch: sounding(p) ? p : null, duration: ctx.layout[k].duration })),
    },
    ctx.rules,
  );
}

export function scoreCandidate(ctx: ChoiceContext, line: (string | null)[], unit: number[], pitch: string, written: boolean, judged?: { errors: { ruleId: string }[]; warnings: { ruleId: string }[] }): Candidate {
  const trial = [...line];
  for (const s of unit) trial[s] = pitch;
  const ev = judged ?? judgeLine(ctx, trial);
  const counsel = counselOf(ctx.layout, ctx.cantus, trial, unit);
  const habit = habitOf(ctx.habits, ctx.cantusVoice, ctx.layout, ctx.cantus, trial, unit);
  return {
    pitch,
    legal: ev.errors.length === 0,
    errors: [...new Set(ev.errors.map((v) => v.ruleId))],
    warnings: [...new Set(ev.warnings.map((v) => v.ruleId))],
    tiers: { errors: ev.errors.length, warnings: ev.warnings.length, counsel: counselTotal(counsel), habit: habit.melodic + habit.vertical },
    counsel,
    habit,
    written,
  };
}

/** Every candidate at one unit of a complete line, ranked. */
export function choicesAt(ctx: ChoiceContext, line: string[], unit: number[], order: TierName[] = TIER_NAMES): UnitChoices {
  const written = line[unit[0]];
  const pool = ctx.vocabulary.includes(written) ? ctx.vocabulary : [...ctx.vocabulary, written];
  const cands = pool.map((p) => scoreCandidate(ctx, line, unit, p, p === written));
  const legal = cands.filter((c) => c.legal).sort((a, b) => compareTiers(a.tiers, b.tiers, order));
  const illegal = cands.filter((c) => !c.legal).sort((a, b) => a.tiers.errors - b.tiers.errors);
  const w = cands.find((c) => c.written)!;
  const better = w.legal ? legal.filter((c) => compareTiers(c.tiers, w.tiers, order) < 0).length : 0;
  const ties = w.legal ? legal.filter((c) => !c.written && compareTiers(c.tiers, w.tiers, order) === 0).length : 0;
  const s = ctx.layout[unit[0]];
  return { unit, bar: s.bar, beat: s.beat, written, candidates: [...legal, ...illegal], legal: legal.length, rank: w.legal ? better + 1 : 0, ties };
}
