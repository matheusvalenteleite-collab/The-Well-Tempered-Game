/**
 * From the game's exercise representations to sung notes on the half-note beat grid.
 * No parallel data model: the two-voice form is the rule engine's CounterpointInput.
 */
import { parsePitch } from "../music/pitch.ts";
import { parseRational, type PlayerSolution } from "../music/fux/player.ts";
import type { Exercise, OriginalSolution } from "../music/fux/types.ts";
import type { CounterpointInput, VoiceNote } from "../counterpoint/rules/types.ts";
import type { ContinuoInput, MultiVoiceInput, SungNote } from "./types.ts";
import type { SpeciesId } from "../counterpoint/layout.ts";

export function toMultiVoice(input: ContinuoInput): MultiVoiceInput {
  if ("voices" in input) return input;
  return {
    modalFinal: input.modalFinal,
    voices: [
      { id: "cantus", notes: input.cantus },
      { id: "counterpoint", notes: input.counterpoint },
    ],
  };
}

/** Rational duration ("1/2" of a whole note) in half-note beats. */
const beats = (r: string) => {
  const [n, d] = parseRational(r);
  return (2 * n) / d;
};

/** All sounding sung notes (rests dropped), sorted by onset, then pitch, then voice. */
export function sungNotes(input: ContinuoInput): { notes: SungNote[]; bars: number; modalFinal: MultiVoiceInput["modalFinal"] } {
  const mv = toMultiVoice(input);
  const notes: SungNote[] = [];
  let end = 0;
  for (const v of mv.voices) {
    let t = 0;
    for (const n of v.notes) {
      const d = beats(n.duration);
      if (n.pitch !== null) notes.push({ voice: v.id, pitch: parsePitch(n.pitch), start: t, end: t + d });
      t += d;
    }
    end = Math.max(end, t);
  }
  notes.sort((a, b) => a.start - b.start || a.pitch.midi - b.pitch.midi || (a.voice < b.voice ? -1 : a.voice > b.voice ? 1 : 0));
  return { notes, bars: Math.ceil(end / 2), modalFinal: mv.modalFinal };
}

const voiceNotes = (notes: { pitch: string | null; duration: string }[]): VoiceNote[] => notes.map((n) => ({ pitch: n.pitch, duration: n.duration }));

/** Fux's own solution of an exercise of the first four species. */
export function inputFromSolution(sol: OriginalSolution): CounterpointInput {
  if (!["first", "second", "third", "fourth"].includes(sol.species)) throw new Error(`${sol.id}: continuo inputs cover species one to four, got ${sol.species}`);
  return {
    species: sol.species as SpeciesId,
    modalFinal: sol.modal_final,
    cantusVoice: sol.cantus_voice,
    cantus: voiceNotes(sol.cantus_firmus.notes),
    counterpoint: voiceNotes(sol.counterpoint.notes),
  };
}

/** A player's solved exercise. */
export function inputFromPlayer(exercise: Exercise, sol: PlayerSolution): CounterpointInput {
  if (!["first", "second", "third", "fourth"].includes(exercise.species)) throw new Error(`${exercise.id}: unsupported species ${exercise.species}`);
  return {
    species: exercise.species as SpeciesId,
    modalFinal: exercise.modal_final,
    cantusVoice: exercise.cantus_voice,
    cantus: voiceNotes(exercise.cantus_firmus.notes),
    counterpoint: voiceNotes(sol.notes),
  };
}
