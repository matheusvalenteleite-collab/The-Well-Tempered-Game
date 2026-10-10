/**
 * Three-voice exercises (Exercitium II, D90): Fux's sixteen first-species exercises in his order,
 * and (D114) his nine second-species ones, one voice in minims (second-species slots), and (D116)
 * his four third-species (crotchets) and nine fourth-species (ligatures) ones, and (D117) his six
 * florid ones, the florid voice in quaver slots with held slots (HOLD) as in two voices (D82),
 * read from data/fux/three-voice/fux-three-voice.json. The player writes the two voices that are
 * not the cantus firmus; Fux's own two are his solution. Staves in Fux's order (top first).
 */
import type { ModalFinal } from "../music/fux/types.ts";
import { parsePitch } from "../music/pitch.ts";
import type { ClefId } from "../ui/notation/clefs.ts";
import { notesToFifthSlots, REST, slotLayout } from "../counterpoint/layout.ts";

interface RawExercise {
  id: string;
  figure: string;
  species: number[];
  modal_final: ModalFinal;
  cantus_index: number;
  measures: number;
  clefs_1725: string[];
  page: number;
  voices: { notes: { pitch: string | null; duration: string; offset?: string; tie?: string | null }[] }[];
}

export interface TrioStep {
  id: string;
  ordinal: number;
  exerciseId: string;
  figure: string;
  page: number;
  modalFinal: ModalFinal;
  cantusIndex: number;
  species: TrioSpecies;
  /** Species 2-5: the staff of the moving voice (its line has `per` slots a bar, one in the last). */
  movingIndex: number | null;
  /** Slots a bar of the moving voice: 2 (minims, ligatures), 4 (crotchets) or 8 (florid, quavers); 1 in first species. */
  per: 1 | 2 | 4 | 8;
  /** Fourth species: inner bars Fux himself leaves without a ligature (the player's allowance). */
  untied: number;
  /** The cantus firmus, one whole note per bar. */
  cantus: string[];
  /** Fux's three lines, top staff first (the cantus among them); the minim voice by slots. */
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

/**
 * Readings that differ from the dataset (open question 7, docs/fux/open-questions.md): an unmarked
 * note repeating a flatted one in the same voice is read flat, by the period's convention that an
 * accidental holds for an immediately repeated note. Owner's decision (D116): B flat, flagged as
 * open until checked further. [exercise, voice (top = 0), bar (0-based), dataset pitch, reading].
 */
export const READINGS: [string, number, number, string, string][] = [["gap_110", 1, 5, "B3", "Bb3"]];

export type TrioSpecies = 1 | 2 | 3 | 4 | 5;
export const TRIO_SPECIES: TrioSpecies[] = [1, 2, 3, 4, 5];

export function trioSteps(data: { exercises: RawExercise[] }, species: TrioSpecies = 1): TrioStep[] {
  const per: 1 | 2 | 4 | 8 = species === 1 ? 1 : species === 3 ? 4 : species === 5 ? 8 : 2;
  return data.exercises
    .filter((e) => e.species.length === 1 && e.species[0] === species)
    .map((e, k) => {
      const movingIndex = species === 1 ? -1 : e.voices.findIndex((v) => v.notes.length > e.measures || v.notes.some((n) => n.pitch === null));
      const lines = e.voices.map((v, i) =>
        i === movingIndex
          ? per === 8
            ? notesToFifthSlots(floridLayout(e.measures), v.notes)
            : movingSlots(per as 2 | 4, e.measures, v.notes)
          : v.notes.map((n) => {
              if (!n.pitch) throw new Error(`${e.id}: rest in a semibreve line`);
              return n.pitch;
            }),
      );
      for (const [ex, voice, bar, was, now] of READINGS) {
        if (ex !== e.id || species !== 1) continue;
        if (lines[voice][bar] !== was) throw new Error(`${ex}: reading expects ${was} at bar ${bar + 1}`);
        lines[voice][bar] = now;
      }
      return {
        id: `fux-mode.t${species}.${String(k + 1).padStart(2, "0")}`,
        ordinal: k + 1,
        species,
        movingIndex: movingIndex >= 0 ? movingIndex : null,
        per,
        untied:
          species === 4 && movingIndex >= 0
            ? Array.from({ length: e.measures - 2 }, (_, j) => j + 1).filter((b) => lines[movingIndex][2 * b] !== lines[movingIndex][2 * b - 1]).length
            : 0,
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

/**
 * The moving voice's notes onto its slots (D116): two a bar (second and fourth species) or four
 * (third), one in the last bar. Unlike the two-voice layouts, a rest may stand anywhere, as Fux
 * writes it in three voices (a crotchet rest to open Fig. 132, a whole bar to open Fig. 144, a
 * minim in Fig. 151): each slot it covers is a rest. A tie is the same pitch in both slots.
 */
export function movingSlots(per: 2 | 4, bars: number, notes: { pitch: string | null; duration: string; offset?: string }[]): string[] {
  const frac = (r: string) => {
    const [n, d] = r.split("/").map(Number);
    return n / (d ?? 1);
  };
  const out: string[] = Array.from({ length: per * (bars - 1) + 1 }, () => "");
  let t = 0;
  for (const n of notes) {
    const start = n.offset !== undefined ? frac(n.offset) : t;
    const len = frac(n.duration);
    const first = Math.round(start * per);
    const count = start >= bars - 1 - 1e-9 ? 1 : Math.round(len * per);
    for (let j = 0; j < count; j++) {
      const k = first + j;
      if (k >= out.length) throw new Error("note beyond the last bar");
      if (n.pitch !== null && j > 0) throw new Error(`a ${n.duration} note in a line of ${per} notes a bar`);
      out[k] = n.pitch ?? REST;
    }
    t = start + len;
  }
  if (out.some((x) => x === "")) throw new Error("the notes leave slots empty");
  return out;
}

/** Fifth species (D117): the two-voice florid layout (D82), a rest allowed anywhere. */
export const floridLayout = (bars: number) => slotLayout("fifth", bars).map((s) => ({ ...s, restAllowed: true }));

/** Slots in a voice's line: one per bar, or `per` a bar (one in the last) for the moving voice. */
export const voiceSlots = (s: TrioStep, voice: number) => (voice === s.movingIndex ? s.per * (s.cantus.length - 1) + 1 : s.cantus.length);
/** The bar of slot k in a voice's line. */
export const barOfSlot = (s: TrioStep, voice: number, k: number) => (voice === s.movingIndex ? Math.min(s.cantus.length - 1, Math.floor(k / s.per)) : k);
/** The first slot of bar b in a voice's line. */
export const slotOfBar = (s: TrioStep, voice: number, b: number) => (voice === s.movingIndex ? s.per * b : b);

/** The staves the player writes (the two that are not the cantus). */
export const playerStaves = (s: TrioStep) => [0, 1, 2].filter((x) => x !== s.cantusIndex);
