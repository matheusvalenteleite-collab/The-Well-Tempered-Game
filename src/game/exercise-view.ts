/**
 * Everything the exercise screen needs for one curriculum step, read from the dataset
 * through FuxRepository (no parallel data model).
 */
import type { FuxRepository } from "../music/fux/repository.ts";
import type { ModalFinal, Staff } from "../music/fux/types.ts";
import type { CurriculumStep } from "../counterpoint/curriculum/fux-first-species.ts";
import { isClefId, type ClefId } from "../ui/notation/clefs.ts";

export interface ExerciseView {
  step: CurriculumStep;
  exerciseId: string | null;
  figure: string | null;
  modalFinal: ModalFinal;
  cantusVoice: Staff;
  cantus: string[];
  /** Clef per staff; the upper staff is index 0. */
  clefs: { modern: [ClefId, ClefId]; original: [ClefId, ClefId] };
  page: string;
  attribution: { license: string; repository: string; commit: string; urls: Record<string, string> };
}

const clef = (name: string): ClefId => {
  if (!isClefId(name)) throw new Error(`unsupported clef ${name}`);
  return name;
};

export function exerciseView(repo: FuxRepository, step: CurriculumStep): ExerciseView {
  const cf = repo.getCantusFirmus(step.cf_id);
  if (!cf) throw new Error(`${step.id}: unknown cantus firmus ${step.cf_id}`);
  const license = String((repo.dataset.license as { encodings: { spdx: string } }).encodings.spdx);
  const base = {
    step,
    modalFinal: step.modal_final,
    cantusVoice: step.cantus_voice,
    cantus: cf.pitch_sequence,
    page: step.page,
    // Default display (owner spec): treble over bass.
    attribution: { license, repository: repo.dataset.provenance.repository, commit: repo.dataset.provenance.commit, urls: {} as Record<string, string> },
  };
  if (step.exercise_id) {
    const ex = repo.getExercise(step.exercise_id);
    if (!ex) throw new Error(`${step.id}: unknown exercise ${step.exercise_id}`);
    const byStaff = (s: Staff) => (ex.cantus_voice === s ? ex.cantus_firmus.clef : ex.counterpoint.clef);
    return {
      ...base,
      exerciseId: ex.id,
      figure: ex.figure,
      clefs: { modern: ["treble", "bass"], original: [clef(byStaff("upper").original.name), clef(byStaff("lower").original.name)] },
      attribution: { ...base.attribution, urls: ex.source.urls },
    };
  }
  // A Fux cantus without a worked example: original clef of the cantus taken from Fux's own uses of it.
  const uses = repo.getExercisesForCantusFirmus(cf.cf_id);
  const cfClef = uses.find((e) => e.cantus_voice === step.cantus_voice) ?? uses[0];
  if (!cfClef) throw new Error(`${step.id}: cantus firmus ${cf.cf_id} has no source exercise for its clef`);
  const cfOriginal = clef(cfClef.cantus_firmus.clef.original.name);
  const cpOriginal = clef(cfClef.counterpoint.clef.original.name);
  return {
    ...base,
    exerciseId: null,
    figure: null,
    clefs: {
      modern: ["treble", "bass"],
      original: step.cantus_voice === "upper" ? [cfOriginal, cpOriginal] : [cpOriginal, cfOriginal],
    },
  };
}
