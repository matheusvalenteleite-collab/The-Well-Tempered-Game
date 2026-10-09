/**
 * The audit over Fux's own solutions: at every choice, how many pitches the rules allow and where
 * Fux's own note ranks among them. Fux must be legal everywhere (D39); the counts show how much
 * room the rules leave, and the ranks how well the score vector predicts Fux.
 */
import { COURSES, rulesForStep } from "../curriculum/index.ts";
import type { FuxRepository } from "../../music/fux/index.ts";
import type { SpeciesId } from "../layout.ts";
import { choicesAt, type ChoiceContext, type UnitChoices } from "./alternatives.ts";
import { choiceUnits, fuxLines, type FuxLine } from "./corpus.ts";
import { buildHabits } from "./habits.ts";
import { TIER_NAMES, type TierName } from "./score.ts";
import { fuxAccidentals, pitchesBetween, registerWindow } from "./vocabulary.ts";

export interface AuditOptions {
  /** "step": the rules in force at the exercise's step (what the player faces); "species": all rules of the species. */
  rules?: "step" | "species";
  order?: TierName[];
  /** Build Fux's habits without the exercise being judged (default true). */
  leaveOneOut?: boolean;
}

export interface ExerciseAudit {
  line: FuxLine;
  units: UnitChoices[];
  summary: AuditSummary;
}

export interface AuditSummary {
  choices: number;
  meanLegal: number;
  /** Choices where Fux's note is the only legal one. */
  forced: number;
  /** Fux's note ranked first (ties allowed) / first alone. */
  fuxFirst: number;
  fuxFirstAlone: number;
  meanRank: number;
  /** Choices where Fux's note is illegal (must stay 0, D39). */
  fuxIllegal: number;
  /** Choices with more than one legal pitch, and Fux's note ranked first (alone) among them. */
  free: number;
  fuxFirstFree: number;
}

export const lastStepOf = (species: SpeciesId) => {
  const c = COURSES.find((x) => x.voices === 2 && x.steps[0]?.species === species);
  if (!c) throw new Error(`no two-voice course for ${species} species`);
  return c.steps[c.steps.length - 1].id;
};

export function contextFor(repo: FuxRepository, line: FuxLine, corpus: FuxLine[], opts: AuditOptions = {}): ChoiceContext {
  const acc = fuxAccidentals(repo)[line.modalFinal];
  const [lo, hi] = registerWindow(line.cantus, line.cantusVoice, line.line);
  return {
    species: line.species,
    modalFinal: line.modalFinal,
    cantusVoice: line.cantusVoice,
    cantus: line.cantus,
    layout: line.layout,
    rules: rulesForStep(opts.rules === "species" ? lastStepOf(line.species) : line.stepId),
    vocabulary: pitchesBetween(lo, hi, acc),
    habits: buildHabits(corpus, line.species, opts.leaveOneOut === false ? [] : [line.exerciseId]),
  };
}

export function summarise(units: UnitChoices[]): AuditSummary {
  const n = units.length || 1;
  return {
    choices: units.length,
    meanLegal: units.reduce((a, u) => a + u.legal, 0) / n,
    forced: units.filter((u) => u.legal === 1 && u.rank === 1).length,
    fuxFirst: units.filter((u) => u.rank === 1).length,
    fuxFirstAlone: units.filter((u) => u.rank === 1 && u.ties === 0).length,
    meanRank: units.filter((u) => u.rank > 0).reduce((a, u) => a + u.rank, 0) / n,
    fuxIllegal: units.filter((u) => u.rank === 0).length,
    free: units.filter((u) => u.legal > 1).length,
    fuxFirstFree: units.filter((u) => u.legal > 1 && u.rank === 1 && u.ties === 0).length,
  };
}

export function auditLine(repo: FuxRepository, line: FuxLine, corpus: FuxLine[], opts: AuditOptions = {}): ExerciseAudit {
  const ctx = contextFor(repo, line, corpus, opts);
  const units = choiceUnits(line.layout, line.line)
    .filter((u) => /^[A-G]/.test(line.line[u[0]]))
    .map((u) => choicesAt(ctx, line.line, u, opts.order ?? TIER_NAMES));
  return { line, units, summary: summarise(units) };
}

export function auditSpecies(repo: FuxRepository, species: SpeciesId, opts: AuditOptions = {}): ExerciseAudit[] {
  const corpus = fuxLines(repo, species);
  return corpus.map((l) => auditLine(repo, l, corpus, opts));
}

/** Totals over several exercises. */
export function pool(audits: ExerciseAudit[]): AuditSummary {
  return summarise(audits.flatMap((a) => a.units));
}
