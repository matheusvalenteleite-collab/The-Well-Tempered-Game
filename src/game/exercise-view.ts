/**
 * Everything the exercise screen needs for one curriculum step, read from the dataset
 * through FuxRepository (no parallel data model).
 */
import type { FuxRepository } from "../music/fux/repository.ts";
import type { ModalFinal, Staff } from "../music/fux/types.ts";
import type { CurriculumStep } from "../counterpoint/curriculum/fux-first-species.ts";
import { notesToSlots, slotLayout, type Slot, type SpeciesId } from "../counterpoint/layout.ts";
import { parsePitch } from "../music/pitch.ts";
import { isClefId, type ClefId } from "../ui/notation/clefs.ts";

export interface ExerciseView {
  step: CurriculumStep;
  exerciseId: string | null;
  figure: string | null;
  modalFinal: ModalFinal;
  cantusVoice: Staff;
  species: SpeciesId;
  cantus: string[];
  /** The slots the player fills (one per counterpoint note). */
  layout: Slot[];
  /** Fux's counterpoint mapped onto the layout, or null without an original solution. */
  fux: string[] | null;
  /** Clef per staff; the upper staff is index 0. */
  clefs: { modern: [ClefId, ClefId]; original: [ClefId, ClefId] };
  /**
   * Key signature as alterations by letter: one flat (B♭) in the F mode, where every B Fux writes
   * in these exercises is flat (decision D48); empty elsewhere.
   */
  signature: { B?: -1 };
  page: string;
  attribution: { license: string; repository: string; commit: string; urls: Record<string, string> };
}

const clef = (name: string): ClefId => {
  if (!isClefId(name)) throw new Error(`unsupported clef ${name}`);
  return name;
};

/**
 * Display clef per staff: G clef when the voice lies on average at or above middle C,
 * F clef otherwise (owner decision D30; no octave-transposing treble). The counterpoint's
 * register is estimated as the cantus an octave away on the counterpoint's side, so the
 * clef never depends on Fux's solution.
 */
export function displayClefs(cantus: string[], cantusVoice: Staff): [ClefId, ClefId] {
  const mean = cantus.reduce((a, p) => a + parsePitch(p).midi, 0) / cantus.length;
  const pick = (m: number): ClefId => (m >= 60 ? "treble" : "bass");
  const cf = pick(mean);
  const cp = pick(cantusVoice === "upper" ? mean - 12 : mean + 12);
  return cantusVoice === "upper" ? [cf, cp] : [cp, cf];
}

export function exerciseView(repo: FuxRepository, step: CurriculumStep): ExerciseView {
  const cf = repo.getCantusFirmus(step.cf_id);
  if (!cf) throw new Error(`${step.id}: unknown cantus firmus ${step.cf_id}`);
  const license = String((repo.dataset.license as { encodings: { spdx: string } }).encodings.spdx);
  const base = {
    step,
    modalFinal: step.modal_final,
    cantusVoice: step.cantus_voice,
    species: step.species,
    cantus: cf.pitch_sequence,
    layout: slotLayout(step.species, cf.pitch_sequence.length),
    signature: step.modal_final === "F" ? { B: -1 as const } : {},
    page: step.page,
    attribution: { license, repository: repo.dataset.provenance.repository, commit: repo.dataset.provenance.commit, urls: {} as Record<string, string> },
  };
  if (step.exercise_id) {
    const ex = repo.getExercise(step.exercise_id);
    if (!ex) throw new Error(`${step.id}: unknown exercise ${step.exercise_id}`);
    const byStaff = (s: Staff) => (ex.cantus_voice === s ? ex.cantus_firmus.clef : ex.counterpoint.clef);
    const sol = repo.getSolution(ex.id);
    return {
      ...base,
      fux: sol ? notesToSlots(base.layout, sol.counterpoint.notes) : null,
      exerciseId: ex.id,
      figure: ex.figure,
      clefs: {
        modern: displayClefs(cf.pitch_sequence, ex.cantus_voice),
        original: [clef(byStaff("upper").original.name), clef(byStaff("lower").original.name)],
      },
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
    fux: null,
    clefs: {
      modern: displayClefs(cf.pitch_sequence, step.cantus_voice),
      original: step.cantus_voice === "upper" ? [cfOriginal, cpOriginal] : [cpOriginal, cfOriginal],
    },
  };
}
