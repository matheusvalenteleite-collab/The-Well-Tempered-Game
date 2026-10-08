/**
 * All Fux-mode curricula, grouped by number of voices and species, with the generic
 * step functions (rules in force at a step, validation against the dataset).
 */
import type { FuxRepository } from "../../music/fux/repository.ts";
import { FIRST_SPECIES_FUX_STRICT } from "../rules/first-species.ts";
import { SECOND_SPECIES_FUX_STRICT } from "../rules/second-species.ts";
import { THIRD_SPECIES_FUX_STRICT } from "../rules/third-species.ts";
import { FOURTH_SPECIES_FUX_STRICT, ligatureWherePossibleWith } from "../rules/fourth-species.ts";
import { FUX_FOURTH_SPECIES_CURRICULUM, FUX_THIRD_SPECIES_CURRICULUM } from "./fux-third-fourth-species.ts";
import type { Rule } from "../rules/types.ts";
import type { SpeciesId } from "../layout.ts";
import { FUX_FIRST_SPECIES_CURRICULUM, type CurriculumStep } from "./fux-first-species.ts";
import { FUX_SECOND_SPECIES_CURRICULUM } from "./fux-second-species.ts";

export type { CurriculumStep, RuleIntroduction } from "./fux-first-species.ts";

export interface Course {
  voices: 2 | 3 | 4;
  species: 1 | 2 | 3 | 4 | 5;
  /** Empty for courses not implemented yet (shown, but disabled). */
  steps: readonly CurriculumStep[];
}

export const COURSES: readonly Course[] = [
  { voices: 2, species: 1, steps: FUX_FIRST_SPECIES_CURRICULUM },
  { voices: 2, species: 2, steps: FUX_SECOND_SPECIES_CURRICULUM },
  { voices: 2, species: 3, steps: FUX_THIRD_SPECIES_CURRICULUM },
  { voices: 2, species: 4, steps: FUX_FOURTH_SPECIES_CURRICULUM },
  { voices: 2, species: 5, steps: [] },
  ...([3, 4] as const).flatMap((voices) => ([1, 2, 3, 4, 5] as const).map((species) => ({ voices, species, steps: [] }))),
];

export const ALL_STEPS: readonly CurriculumStep[] = COURSES.flatMap((c) => c.steps);

const RULES: Record<SpeciesId, readonly Rule[]> = { first: FIRST_SPECIES_FUX_STRICT, second: SECOND_SPECIES_FUX_STRICT, third: THIRD_SPECIES_FUX_STRICT, fourth: FOURTH_SPECIES_FUX_STRICT };
const RULES_BY_ID = new Map(Object.values(RULES).flat().map((r) => [r.id, r]));

export const courseOf = (stepId: string) => {
  const c = COURSES.find((x) => x.steps.some((s) => s.id === stepId));
  if (!c) throw new Error(`unknown curriculum step ${stepId}`);
  return c;
};

/** Introductions in force at a step: everything introduced at or before it in its course, in book order. */
export function introductionsUpTo(stepId: string) {
  const c = courseOf(stepId);
  const target = c.steps.find((s) => s.id === stepId)!;
  return c.steps.filter((s) => s.ordinal <= target.ordinal).flatMap((s) => s.introduces);
}

/** Rules active at a step. */
export function rulesForStep(stepId: string): Rule[] {
  const free = courseOf(stepId).steps.find((s) => s.id === stepId)!.free_minims;
  return introductionsUpTo(stepId).map((x) => (x.ruleId === "fos.ligature-where-possible" && free !== undefined ? ligatureWherePossibleWith(free) : RULES_BY_ID.get(x.ruleId)!));
}

export const ruleById = (id: string) => RULES_BY_ID.get(id);

/** Fails loudly if a curriculum and the dataset or rule set disagree. */
export function validateCurriculum(repo: FuxRepository): void {
  for (const c of COURSES) {
    if (c.steps.length === 0) continue;
    const species = c.steps[0].species;
    const introduced = new Set<string>();
    c.steps.forEach((s, k) => {
      if (s.ordinal !== k + 1 || s.species !== species || s.voices !== c.voices) throw new Error(`${s.id}: out of place in its course`);
      for (const x of s.introduces) {
        const r = RULES_BY_ID.get(x.ruleId);
        if (!r) throw new Error(`${s.id}: unknown rule ${x.ruleId}`);
        if (!r.species.includes(species)) throw new Error(`${s.id}: rule ${x.ruleId} is not a ${species}-species rule`);
        if (introduced.has(x.ruleId)) throw new Error(`${s.id}: rule ${x.ruleId} introduced twice`);
        introduced.add(x.ruleId);
      }
      if (!repo.getCantusFirmus(s.cf_id)) throw new Error(`${s.id}: unknown cf ${s.cf_id}`);
      if (s.exercise_id) {
        const ex = repo.getExercise(s.exercise_id);
        if (!ex) throw new Error(`${s.id}: unknown exercise ${s.exercise_id}`);
        if (ex.species !== species || ex.cantus_firmus.cf_id !== s.cf_id || ex.cantus_voice !== s.cantus_voice || ex.modal_final !== s.modal_final) {
          throw new Error(`${s.id}: does not match exercise ${s.exercise_id}`);
        }
      }
    });
    const unplaced = RULES[species].filter((r) => !introduced.has(r.id)).map((r) => r.id);
    if (unplaced.length) throw new Error(`${species} species: rules without an introduction point: ${unplaced.join(", ")}`);
  }
}
