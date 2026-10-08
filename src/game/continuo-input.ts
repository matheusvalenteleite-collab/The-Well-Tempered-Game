/**
 * The continuo's view of the exercise on screen: which sung voices it accompanies in each play
 * mode, the realization options, and the key on which a realization is memoized. Pure.
 */
import type { ModalFinal, Staff } from "../music/fux/types.ts";
import type { SpeciesId, Slot } from "../counterpoint/layout.ts";
import { sounding } from "../counterpoint/layout.ts";
import type { VoiceNote } from "../counterpoint/rules/types.ts";
import type { ContinuoInput, ContinuoOptions } from "../continuo/types.ts";
import type { ContinuoSettings } from "./continuo-settings.ts";

export type PlayMode = "player" | "fux" | "trio";

export interface ContinuoView {
  species: SpeciesId;
  modalFinal: ModalFinal;
  cantusVoice: Staff;
  cantus: string[];
  layout: Slot[];
  fux: string[] | null;
}

/** A voice on the slot layout; empty slots and rests are rests (the continuo then follows the other voices). */
const line = (layout: Slot[], notes: (string | null)[]): VoiceNote[] => layout.map((sl, k) => ({ pitch: sounding(notes[k] ?? null) ? notes[k] : null, duration: sl.duration }));

/**
 * "player": cantus and the player's line(s), realized. "fux": cantus and Fux's line, realized.
 * "trio": cantus, the player's line(s) and Fux's, doubled (no harmony added).
 * `notes` is the player's line, or several (the versions heard, decision D47).
 */
export function continuoInput(view: ContinuoView, notes: (string | null)[] | (string | null)[][], mode: PlayMode): ContinuoInput {
  const cantus: VoiceNote[] = view.cantus.map((p) => ({ pitch: p, duration: "1/1" }));
  const lines: (string | null)[][] = Array.isArray(notes[0]) ? (notes as (string | null)[][]) : [notes as (string | null)[]];
  const mine = lines.map((l, i) => ({ id: i === 0 ? "counterpoint" : `counterpoint${i + 1}`, notes: line(view.layout, l) }));
  if (mode === "trio") {
    if (!view.fux) throw new Error("trio playback needs Fux's solution");
    return { modalFinal: view.modalFinal, voices: [{ id: "cantus", notes: cantus }, ...mine, { id: "fux", notes: line(view.layout, view.fux) }] };
  }
  if (mode === "player" && lines.length > 1) return { modalFinal: view.modalFinal, voices: [{ id: "cantus", notes: cantus }, ...mine] };
  const cp = mode === "fux" ? view.fux : lines[0];
  if (!cp) throw new Error("Fux's solution is not available for this exercise");
  return { species: view.species, modalFinal: view.modalFinal, cantusVoice: view.cantusVoice, cantus, counterpoint: line(view.layout, cp) };
}

/** Realization options for a play mode and the panel's settings (presets only change the sound). */
export function continuoOptions(mode: PlayMode, s: Pick<ContinuoSettings, "finals" | "passingFill" | "preset">): Partial<ContinuoOptions> {
  return { finals: s.finals, passingFill: s.passingFill, preset: s.preset, texture: mode === "trio" ? "doubling" : "realized" };
}

/** Memoization key: the notes that sound, the play mode and the options that shape the realization. */
export function continuoKey(stepId: string, notes: (string | null)[] | (string | null)[][], mode: PlayMode, opts: Partial<ContinuoOptions>): string {
  const lines: (string | null)[][] = Array.isArray(notes[0]) ? (notes as (string | null)[][]) : [notes as (string | null)[]];
  const norm = lines.map((l) => l.map((n) => (sounding(n ?? null) ? n : null)));
  return JSON.stringify([stepId, mode, norm.length === 1 ? norm[0] : norm, opts.finals, opts.passingFill, opts.texture]);
}
