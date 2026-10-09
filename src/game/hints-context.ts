/**
 * Hints in the game (D115): the Choices lab's hint engine (src/counterpoint/choices, from the
 * "Fux counterpoint thesis analysis" session) applied to the exercise being written. The context
 * is the exercise's own: its rules (the step's), its cantus, the pitches Fux's lines use in this
 * mode within the register of the exercise, and Fux's habits learnt from his other solutions of
 * the species (never from this exercise, so the most Fux-like note is not his own copied).
 * Species 1-4 (the lab's checked range: at every step of every solution Fux's note is legal).
 */
import type { ChoiceContext } from "../counterpoint/choices/alternatives.ts";
import { CHOICE_SPECIES, fuxLines, type FuxLine } from "../counterpoint/choices/corpus.ts";
import { buildHabits, type HabitTables } from "../counterpoint/choices/habits.ts";
import { fuxAccidentals, pitchesBetween, registerWindow } from "../counterpoint/choices/vocabulary.ts";
import { rulesForStep } from "../counterpoint/curriculum/index.ts";
import type { SpeciesId } from "../counterpoint/layout.ts";
import type { FuxRepository } from "../music/fux/index.ts";
import type { ExerciseView } from "./exercise-view.ts";

const corpora = new Map<SpeciesId, FuxLine[]>();
const habits = new Map<string, HabitTables>();

export const hintsAvailable = (species: SpeciesId) => CHOICE_SPECIES.includes(species);

export function hintContext(repo: FuxRepository, view: ExerciseView): ChoiceContext | null {
  if (!hintsAvailable(view.species)) return null;
  let corpus = corpora.get(view.species);
  if (!corpus) corpora.set(view.species, (corpus = fuxLines(repo, view.species)));
  const key = `${view.species}|${view.exerciseId ?? ""}`;
  let h = habits.get(key);
  if (!h) habits.set(key, (h = buildHabits(corpus, view.species, view.exerciseId ? [view.exerciseId] : [])));
  const [lo, hi] = registerWindow(view.cantus, view.cantusVoice, view.fux ?? []);
  return {
    species: view.species,
    modalFinal: view.modalFinal,
    cantusVoice: view.cantusVoice,
    cantus: view.cantus,
    layout: view.layout,
    rules: rulesForStep(view.step.id),
    vocabulary: pitchesBetween(lo, hi, fuxAccidentals(repo)[view.modalFinal]),
    habits: h,
  };
}
