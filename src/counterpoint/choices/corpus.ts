/**
 * Fux's worked solutions as lines on the game's slot layout, and the units a choice is made in:
 * one slot, or in fourth species a ligature (an upbeat tied into the next downbeat, written as the
 * same pitch twice, D61).
 */
import { ALL_STEPS, type CurriculumStep } from "../curriculum/index.ts";
import { exerciseView } from "../../game/exercise-view.ts";
import type { FuxRepository, ModalFinal, Staff } from "../../music/fux/index.ts";
import { sounding, tiedToNext, type Slot, type SpeciesId } from "../layout.ts";

export interface FuxLine {
  stepId: string;
  exerciseId: string;
  figure: string;
  species: SpeciesId;
  modalFinal: ModalFinal;
  cantusVoice: Staff;
  cantus: string[];
  layout: Slot[];
  /** Fux's counterpoint, one entry per slot ("r" for a rest). */
  line: string[];
}

/** Species of the habit studies and the write-your-own tab (fifth species has its rhythm too: florid.ts). */
export const CHOICE_SPECIES: SpeciesId[] = ["first", "second", "third", "fourth"];
/** Species the audit and the generators cover. */
export const AUDIT_SPECIES: SpeciesId[] = ["first", "second", "third", "fourth", "fifth"];

export function fuxLines(repo: FuxRepository, species?: SpeciesId): FuxLine[] {
  // Fifth species only when asked for by name (its held notes need the florid tools, florid.ts).
  return ALL_STEPS.filter((s) => s.voices === 2 && s.kind === "canonical" && (species ? s.species === species : CHOICE_SPECIES.includes(s.species))).flatMap((s: CurriculumStep) => {
    const v = exerciseView(repo, s);
    if (!v.fux || !v.exerciseId) return [];
    return [{ stepId: s.id, exerciseId: v.exerciseId, figure: String(v.figure), species: s.species, modalFinal: s.modal_final, cantusVoice: s.cantus_voice, cantus: v.cantus, layout: v.layout, line: v.fux as string[] }];
  });
}

/** Groups of slots chosen together: a fourth-species ligature is one unit. */
export function choiceUnits(layout: Slot[], line: (string | null)[]): number[][] {
  const units: number[][] = [];
  for (let k = 0; k < layout.length; k++) {
    if (k > 0 && tiedToNext(layout, line, k - 1)) {
      units[units.length - 1].push(k);
      continue;
    }
    units.push([k]);
  }
  return units;
}

/** Sounding notes of a line in order, a tied note counted once: [slot, pitch]. */
export function onsets(layout: Slot[], line: (string | null)[]): [number, string][] {
  const out: [number, string][] = [];
  line.forEach((p, k) => {
    if (!sounding(p)) return;
    if (k > 0 && tiedToNext(layout, line, k - 1)) return;
    out.push([k, p]);
  });
  return out;
}
