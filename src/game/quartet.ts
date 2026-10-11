/**
 * Four-voice exercises (Exercitium III, D148), in Fux's order: for each species, his own exercises
 * (Figs. 160-203, read from data/fux/four-voice/fux-four-voice-game.json), then the modes he leaves
 * to private study as tasks without his solution (as D61), and last the species combined (Fig. 204).
 *
 * The player writes the three parts that are not the cantus. First species: one note a bar in each.
 * Species 2-5 and the combined species: every written part in quaver slots, as the florid voice in
 * two voices (D82): a note, "r" a rest, HOLD its continuation (over the bar line too).
 *
 * Private study, as the print gives it: first species, "the examples of the three remaining modes
 * are to be made in the same way, with the cantus in its four places" (p. 121: G, A, C); second,
 * "the examples of the other modes I commit to your study at home" (p. 123); third, after E in his
 * presence, "the others to be worked at home" (pp. 128, 131: F, G, A, C); fourth, "the other five
 * modes to be treated in the same way, with the same changes" (p. 136); fifth, "the exercises of
 * the other five modes" (p. 138). Each mode four times, the parts placed as in Fux's own D set of
 * that species (D148, owner: four a mode). The cantus firmi are his (the two-voice ones), placed in
 * the octave of each part as he places D, E and F.
 */
import data from "../../data/fux/four-voice/fux-four-voice-game.json" with { type: "json" };
import trioData from "../../data/fux/three-voice/fux-three-voice.json" with { type: "json" };
import { notesToFifthSlots, slotLayout } from "../counterpoint/layout.ts";
import { trioCantus } from "./trio.ts";
import type { ModalFinal } from "../music/fux/types.ts";
import { parsePitch } from "../music/pitch.ts";
import { HOLD, REST } from "../counterpoint/layout.ts";
import type { PartKind, QuartetInput } from "../counterpoint/four-voice.ts";
import { modernClef } from "./trio.ts";
import type { ClefId } from "../ui/notation/clefs.ts";

/** 1-5, and 6: the species combined (p. 138). */
export type QuartetSpecies = 1 | 2 | 3 | 4 | 5 | 6;
export const QUARTET_SPECIES: QuartetSpecies[] = [1, 2, 3, 4, 5, 6];

export interface QuartetStep {
  id: string;
  ordinal: number;
  species: QuartetSpecies;
  /** Fux's exercise ("gap_160"), or a task of private study ("private.q2.G.1"). */
  exerciseId: string;
  /** Fux's figure; null for a task of private study. */
  figure: string | null;
  /** Where the print has it (or, for private study, where Fux leaves it to the student). */
  page: number;
  modalFinal: ModalFinal;
  cantusIndex: number;
  /** What each part sings (the cantus, semibreves, or a species). */
  kinds: PartKind[];
  /** The cantus firmus, one note a bar. */
  cantus: string[];
  /** Fux's four lines (the cantus among them): one note a bar in first species, else quaver slots. Null without his solution. */
  fux: string[][] | null;
  /** Fourth species: inner bars that may go without a ligature (Fux's own count; one where he gives none, D62). */
  untied: number;
  clefs: ClefId[];
  clefs1725: string[];
}

interface RawGame {
  id: string;
  figure: string;
  species: number[];
  modal_final: ModalFinal;
  cantus_index: number;
  measures: number;
  clefs_1725: string[];
  page: number;
  parts: string[];
}
const EXERCISES = (data as { exercises: RawGame[] }).exercises;

/** "D4+7 F4+3 ~+3 r+3 ..." -> quaver slots; "D4 F4 E4" (one a bar) -> as it is. */
export function decodePart(s: string): string[] {
  return s.split(" ").flatMap((tok) => {
    const [head, n] = tok.split("+");
    return [head === "~" ? HOLD : head, ...Array.from({ length: Number(n ?? 0) }, () => HOLD)];
  });
}

/** Quaver slots a bar (one in the last). */
export const quaverSlots = (bars: number) => 8 * (bars - 1) + 1;

/** The kind of a part in Fux's solution, from its rhythm. */
function kindOf(line: string[], species: number[], moving: boolean): PartKind {
  if (species.length > 1) {
    if (line.some((x, k) => x !== HOLD && k % 2 === 1)) return "florid";
    if (line.some((x, k) => x !== HOLD && k % 4 === 2)) return "crotchets";
    if (line.some((x, k) => x === HOLD && k % 8 === 0 && k > 0)) return "ligatures";
    return "minims";
  }
  const sp = species[0];
  if (sp === 1) return "whole";
  if (!moving) return sp >= 4 ? "divisible" : "whole";
  return (["whole", "whole", "minims", "crotchets", "ligatures", "florid"] as PartKind[])[sp];
}

/** Bars of a ligature part without a tie into the downbeat (the penultimate's excepted, D62). */
function untiedBars(line: string[], bars: number): number {
  let n = 0;
  for (let b = 1; b < bars - 1; b++) if (line[8 * b] !== HOLD) n++;
  return n;
}

function fuxStep(e: RawGame): Omit<QuartetStep, "id" | "ordinal"> {
  const species = (e.species.length > 1 ? 6 : e.species[0]) as QuartetSpecies;
  const lines = e.parts.map(decodePart);
  // The moving part: the most motion inside the bars and ties over the bar lines (a divided
  // semibreve moves now and then; the species part every bar).
  const motionIn = (l: string[]) => l.slice(0, -1).filter((x, k) => (k % 8 === 0 ? x === HOLD : x !== HOLD)).length;
  const moves = lines.map((l, i) => (i === e.cantus_index || species === 1 ? -1 : motionIn(l)));
  const mover = species === 1 ? -1 : moves.indexOf(Math.max(...moves));
  const kinds = lines.map((l, i) => (i === e.cantus_index ? "cantus" : species === 6 ? kindOf(l, e.species, true) : kindOf(l, e.species, i === mover))) as PartKind[];
  const lig = kinds.indexOf("ligatures");
  return {
    species,
    exerciseId: e.id,
    figure: e.figure,
    page: e.page,
    modalFinal: e.modal_final,
    cantusIndex: e.cantus_index,
    kinds,
    cantus: lines[e.cantus_index],
    fux: lines,
    untied: species === 4 && lig >= 0 ? untiedBars(lines[lig], e.measures) : species === 4 ? 1 : 0,
    clefs: e.clefs_1725.map(modernClef),
    clefs1725: e.clefs_1725,
  };
}

/** Fux's cantus firmi (the two-voice ones, D, E, F, G, A, C; the first of each family). */
export const CANTUS: Record<ModalFinal, string[]> = {
  D: ["D4", "F4", "E4", "D4", "G4", "F4", "A4", "G4", "F4", "E4", "D4"],
  E: ["E4", "C4", "D4", "C4", "A3", "A4", "G4", "E4", "F4", "E4"],
  F: ["F3", "G3", "A3", "F3", "D3", "E3", "F3", "C4", "A3", "F3", "G3", "F3"],
  G: ["G3", "C4", "B3", "G3", "C4", "E4", "D4", "G4", "E4", "C4", "D4", "B3", "A3", "G3"],
  A: ["A3", "C4", "B3", "D4", "C4", "E4", "F4", "E4", "D4", "C4", "B3", "A3"],
  C: ["C4", "E4", "F4", "G4", "E4", "A4", "G4", "E4", "F4", "E4", "D4", "C4"],
};
/**
 * The middle of each part's register (MIDI), top down: the cantus takes the octave nearest to it.
 * Chosen so that D, E and F fall where Fux puts them in Figs. 160-172 (D and F an octave lower in
 * the tenor and the bass, E in the same octave in the tenor; checked in test/four-voice.test.ts).
 */
export const PART_CENTRE = [67, 64, 58, 50];
const octaveShift = (p: string, n: number) => p.replace(/-?\d+$/, (o) => String(Number(o) + n));
export function cantusFor(final: ModalFinal, part: number): string[] {
  const cf = CANTUS[final];
  const mean = cf.reduce((a, p) => a + parsePitch(p).midi, 0) / cf.length;
  const shifts = [-2, -1, 0, 1];
  const best = shifts.reduce((b, k) => (Math.abs(mean + 12 * k - PART_CENTRE[part]) < Math.abs(mean + 12 * b - PART_CENTRE[part]) ? k : b), 0);
  return cf.map((p) => octaveShift(p, best));
}

/** The modes left to private study, and the page that leaves them (1725). */
const PRIVATE: Record<1 | 2 | 3 | 4 | 5, { modes: ModalFinal[]; page: number }> = {
  1: { modes: ["G", "A", "C"], page: 121 },
  2: { modes: ["E", "F", "G", "A", "C"], page: 123 },
  3: { modes: ["F", "G", "A", "C"], page: 131 },
  4: { modes: ["E", "F", "G", "A", "C"], page: 136 },
  5: { modes: ["E", "F", "G", "A", "C"], page: 138 },
};
const CLEFS_1725 = ["C1", "C3", "C4", "F4"];

function privateSteps(species: 1 | 2 | 3 | 4 | 5, fux: Omit<QuartetStep, "id" | "ordinal">[]): Omit<QuartetStep, "id" | "ordinal">[] {
  // Fux's own D set of this species: where he puts the cantus, and which part moves.
  const plan = fux.filter((s) => s.modalFinal === "D").map((s) => ({ cantusIndex: s.cantusIndex, kinds: s.kinds }));
  return PRIVATE[species].modes.flatMap((final) =>
    plan.map(({ cantusIndex, kinds }) => ({
      species,
      exerciseId: `private.q${species}.${final}.${cantusIndex}${kinds.findIndex((k) => k !== "cantus" && k !== "whole" && k !== "divisible")}`,
      figure: null,
      page: PRIVATE[species].page,
      modalFinal: final,
      cantusIndex,
      kinds,
      cantus: cantusFor(final, cantusIndex),
      fux: null,
      untied: species === 4 ? 1 : 0,
      clefs: CLEFS_1725.map(modernClef),
      clefs1725: CLEFS_1725,
    })),
  );
}

/** The exercises of one species in four voices, in the book's order. */
export function quartetSteps(species: QuartetSpecies): QuartetStep[] {
  const fux = EXERCISES.filter((e) => (species === 6 ? e.species.length > 1 : e.species.length === 1 && e.species[0] === species)).map(fuxStep);
  const all = species === 6 ? fux : [...fux, ...privateSteps(species, fux)];
  return all.map((s, k) => ({ ...s, id: `fux-mode.q${species}.${String(k + 1).padStart(2, "0")}`, ordinal: k + 1 }));
}

/**
 * Three voices, the species combined (D152): Fux's Fig. 134 (p. 102: crotchets above, minims in
 * the middle, the cantus in the bass), and the task he sets with it, "omnes sex tonorum Cantus
 * firmi denuò resumi ... ut in una partium Semiminimae, in altera Minimae, tertiâ Semibreves",
 * "with that triple change we have used so far": every mode, the cantus in each of the three parts
 * (the upper of the other two in crotchets, the lower in minims, as in Fig. 134), the clefs his.
 */
export function trioCombinedSteps(): QuartetStep[] {
  type Raw = { id: string; figure: string; species: number[]; modal_final: ModalFinal; cantus_index: number; measures: number; clefs_1725: string[]; page: number; voices: { notes: { pitch: string | null; duration: string; offset?: string; tie?: string | null }[] }[] };
  const fig = (trioData as { exercises: Raw[] }).exercises.find((e) => e.species.length > 1)!;
  const layout = slotLayout("fifth", fig.measures);
  const lines = fig.voices.map((v, i) => (i === fig.cantus_index ? v.notes.map((n) => n.pitch!) : notesToFifthSlots(layout, v.notes)));
  const kindsFor = (ci: number): PartKind[] => {
    const others = [0, 1, 2].filter((x) => x !== ci);
    return [0, 1, 2].map((x) => (x === ci ? "cantus" : x === others[0] ? "crotchets" : "minims"));
  };
  const base = { species: 6 as QuartetSpecies, untied: 0, clefs: fig.clefs_1725.map(modernClef), clefs1725: fig.clefs_1725 };
  const steps: Omit<QuartetStep, "id" | "ordinal">[] = [
    { ...base, exerciseId: fig.id, figure: fig.figure, page: fig.page, modalFinal: fig.modal_final, cantusIndex: fig.cantus_index, kinds: kindsFor(fig.cantus_index), cantus: lines[fig.cantus_index], fux: lines },
  ];
  for (const final of ["D", "E", "F", "G", "A", "C"] as ModalFinal[])
    for (const ci of [0, 1, 2]) {
      if (final === fig.modal_final && ci === fig.cantus_index) continue;
      steps.push({ ...base, exerciseId: `private.t6.${final}.${ci}`, figure: null, page: fig.page, modalFinal: final, cantusIndex: ci, kinds: kindsFor(ci), cantus: trioCantus(final, fig.clefs_1725[ci]), fux: null });
    }
  return steps.map((s, k) => ({ ...s, id: `fux-mode.t6.${String(k + 1).padStart(2, "0")}`, ordinal: k + 1 }));
}
export const TRIO_COMBINED: QuartetStep[] = trioCombinedSteps();

/** Every four-voice exercise, species by species. */
export const QUARTET_ALL: Record<QuartetSpecies, QuartetStep[]> = Object.fromEntries(QUARTET_SPECIES.map((n) => [n, quartetSteps(n)])) as Record<QuartetSpecies, QuartetStep[]>;

/** The parts the player writes (all but the cantus). */
export const quartetPlayer = (s: QuartetStep) => s.kinds.map((_, x) => x).filter((x) => x !== s.cantusIndex);
/** Slots in a written part: one a bar in first species, else quaver slots. */
export const partSlots = (s: QuartetStep) => (s.species === 1 ? s.cantus.length : quaverSlots(s.cantus.length));
/** The bar of slot k. */
export const barOfQuaver = (s: QuartetStep, k: number) => (s.species === 1 ? k : Math.min(s.cantus.length - 1, Math.floor(k / 8)));
/**
 * The value a tap or a letter writes in a part, in quaver slots: a semibreve (8), a minim (4: the
 * minims, the ligatures, a divided semibreve's half), a crotchet (2); florid parts choose.
 */
export function grainOf(kind: PartKind): number {
  return kind === "whole" || kind === "divisible" ? 8 : kind === "crotchets" ? 2 : kind === "florid" ? 0 : 4;
}

/** The judge's input for a step and the four lines (the cantus line is the step's own). */
export const quartetInput = (s: QuartetStep, lines: string[][]): QuartetInput => ({
  modalFinal: s.modalFinal,
  cantusIndex: s.cantusIndex,
  kinds: s.kinds,
  voices: lines.map((l, i) => (i === s.cantusIndex ? s.cantus : l)),
  ligatureAllowance: Math.max(1, s.untied),
});

const MOVING: PartKind[] = ["minims", "crotchets", "ligatures", "florid"];
export const isMovingPart = (k: PartKind) => MOVING.includes(k);

/** A part's empty line before anything is written: the slots it must fill are empty, the rest held. */
export function template(s: QuartetStep, part: number): (string | null)[] {
  const bars = s.cantus.length;
  if (s.species === 1) return Array(bars).fill(null);
  const kind = s.kinds[part];
  const g = kind === "florid" ? 1 : kind === "divisible" ? 8 : grainOf(kind);
  const out: (string | null)[] = [];
  for (let b = 0; b < bars - 1; b++) for (let q = 0; q < 8; q++) out.push(q % g === 0 ? null : HOLD);
  out.push(null);
  // Fux's half rest at the opening of the minims (second species), the ligatures and the florid part.
  if ((kind === "minims" && s.species === 2) || kind === "ligatures" || kind === "florid") {
    out[0] = REST;
    for (let q = 1; q < 4; q++) out[q] = HOLD;
  }
  return out;
}

/**
 * After an edit, a part of fixed values keeps its shape: the slots inside a value are held (an
 * undivided semibreve's second half too); in a ligature part the same note on the downbeat is the tie.
 */
export function normalise(s: QuartetStep, part: number, notes: (string | null)[]): (string | null)[] {
  if (s.species === 1) return notes;
  const kind = s.kinds[part];
  if (kind === "florid") return notes;
  const g = kind === "divisible" ? 4 : grainOf(kind);
  const out = notes.map((x, k) => (k < notes.length - 1 && x === null && (k % 8) % g !== 0 ? HOLD : x));
  if (kind === "divisible") for (let k = 4; k < out.length - 1; k += 8) if (out[k] === null) out[k] = HOLD;
  if (kind === "ligatures")
    for (let k = 8; k < out.length - 1; k += 8) {
      const before = out[k - 4] === HOLD ? null : out[k - 4];
      if (out[k] && out[k] !== HOLD && out[k] !== REST && out[k] === before) out[k] = HOLD;
    }
  return out;
}

/** The value written at slot k of a part, in quaver slots (`florid`: the value chosen). */
export function valueAt(s: QuartetStep, part: number, notes: (string | null)[], k: number, florid: number): number {
  const bars = s.cantus.length;
  if (s.species === 1 || k >= 8 * (bars - 1)) return 1;
  const kind = s.kinds[part];
  if (kind === "florid") return florid;
  if (kind === "divisible") {
    const half = k % 8 >= 4;
    const divided = notes[8 * Math.floor(k / 8) + 4] !== HOLD;
    return half || divided ? 4 : 8;
  }
  return grainOf(kind);
}

/** A tap at quaver `q` of a bar: the slot where the part's value there begins. */
export function snapSlot(s: QuartetStep, part: number, bar: number, q: number): number {
  const bars = s.cantus.length;
  if (s.species === 1) return bar;
  if (bar >= bars - 1) return 8 * (bars - 1);
  const kind = s.kinds[part];
  const g = kind === "florid" ? 1 : kind === "whole" ? 8 : kind === "crotchets" ? 2 : 4;
  return 8 * bar + Math.floor(q / g) * g;
}
