/**
 * Three-voice exercises (Exercitium II, D90): Fux's sixteen first-species exercises in his order,
 * read from data/fux/three-voice/fux-three-voice.json. The player writes the two voices that are
 * not the cantus firmus; Fux's own two are his solution. Staves in Fux's order (top first).
 */
import type { ModalFinal } from "../music/fux/types.ts";
import { parsePitch } from "../music/pitch.ts";
import type { ClefId } from "../ui/notation/clefs.ts";

interface RawExercise {
  id: string;
  figure: string;
  species: number[];
  modal_final: ModalFinal;
  cantus_index: number;
  measures: number;
  clefs_1725: string[];
  page: number;
  voices: { notes: { pitch: string | null }[] }[];
}

export interface TrioStep {
  id: string;
  ordinal: number;
  exerciseId: string;
  figure: string;
  page: number;
  modalFinal: ModalFinal;
  cantusIndex: number;
  /** The cantus firmus, one whole note per bar. */
  cantus: string[];
  /** Fux's three lines, top staff first (the cantus among them). */
  fux: string[][];
  /** Display clef per staff (G or F, D30), from the register of the 1725 clef. */
  clefs: ClefId[];
  /** The 1725 clef codes ("C3", "F4" ...). */
  clefs1725: string[];
}

/** Middle-line pitch of a 1725 clef code: G when it lies at or above middle C, F otherwise. */
export function modernClef(code: string): ClefId {
  const m = /^([CFG])(\d)$/.exec(code);
  if (!m) throw new Error(`unknown clef ${code}`);
  const anchor = { C: "C4", F: "F3", G: "G4" }[m[1] as "C" | "F" | "G"];
  // The clef's line is `line` (1 = bottom); the middle line is 3.
  const middle = parsePitch(anchor).diatonic + (3 - Number(m[2])) * 2;
  return middle >= parsePitch("C4").diatonic ? "treble" : "bass";
}

export function trioSteps(data: { exercises: RawExercise[] }): TrioStep[] {
  return data.exercises
    .filter((e) => e.species.length === 1 && e.species[0] === 1)
    .map((e, k) => {
      const lines = e.voices.map((v) => v.notes.map((n) => {
        if (!n.pitch) throw new Error(`${e.id}: rest in a first-species line`);
        return n.pitch;
      }));
      return {
        id: `fux-mode.t1.${String(k + 1).padStart(2, "0")}`,
        ordinal: k + 1,
        exerciseId: e.id,
        figure: e.figure,
        page: e.page,
        modalFinal: e.modal_final,
        cantusIndex: e.cantus_index,
        cantus: lines[e.cantus_index],
        fux: lines,
        clefs: e.clefs_1725.map(modernClef),
        clefs1725: e.clefs_1725,
      };
    });
}

/** The staves the player writes (the two that are not the cantus). */
export const playerStaves = (s: TrioStep) => [0, 1, 2].filter((x) => x !== s.cantusIndex);
