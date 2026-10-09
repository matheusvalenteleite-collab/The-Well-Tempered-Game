/**
 * Three-voice exercises (Exercitium II, D90): Fux's sixteen first-species exercises in his order,
 * and (D114) his nine second-species ones, one voice in minims (second-species slots),
 * read from data/fux/three-voice/fux-three-voice.json. The player writes the two voices that are
 * not the cantus firmus; Fux's own two are his solution. Staves in Fux's order (top first).
 */
import type { ModalFinal } from "../music/fux/types.ts";
import { parsePitch } from "../music/pitch.ts";
import type { ClefId } from "../ui/notation/clefs.ts";
import { notesToSlots, REST, slotLayout } from "../counterpoint/layout.ts";

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
  /** 1 or 2 (D114). */
  species: 1 | 2;
  /** Second species: the staff of the voice in minims (its line has the second-species slots). */
  minimIndex: number | null;
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

export function trioSteps(data: { exercises: RawExercise[] }, species: 1 | 2 = 1): TrioStep[] {
  return data.exercises
    .filter((e) => e.species.length === 1 && e.species[0] === species)
    .map((e, k) => {
      const minimIndex = species === 2 ? e.voices.findIndex((v) => v.notes.some((n) => n.duration === "1/2")) : -1;
      const lines = e.voices.map((v, i) =>
        i === minimIndex
          ? notesToSlots(slotLayout("second", e.measures), v.notes as never)
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
        minimIndex: minimIndex >= 0 ? minimIndex : null,
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

/** Slots in a voice's line: one per bar, or the second-species slots for the minim voice. */
export const voiceSlots = (s: TrioStep, voice: number) => (voice === s.minimIndex ? 2 * s.cantus.length - 1 : s.cantus.length);
/** The bar of slot k in a voice's line. */
export const barOfSlot = (s: TrioStep, voice: number, k: number) => (voice === s.minimIndex ? Math.min(s.cantus.length - 1, Math.floor(k / 2)) : k);
/** The first slot of bar b in a voice's line. */
export const slotOfBar = (s: TrioStep, voice: number, b: number) => (voice === s.minimIndex ? 2 * b : b);

/** The staves the player writes (the two that are not the cantus). */
export const playerStaves = (s: TrioStep) => [0, 1, 2].filter((x) => x !== s.cantusIndex);
