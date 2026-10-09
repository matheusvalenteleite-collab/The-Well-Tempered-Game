/**
 * Level 2 of the chorale mode (docs/chorales/CONCEPT.md): the harmony. The player chooses the
 * chord under every melody note; the comparison is the same as at level 1, note by note: Kittel's
 * basses, Bach's settings of the tune, Bach's habit at that melody degree (C4: nothing is wrong).
 *
 * Data: data/chorales/level2.json, written by tools/chorales/harmony_plans.py.
 */
import raw from "../../data/chorales/level2.json" with { type: "json" };
import type { Chorale, MelodyNote, Phrase } from "./level1.ts";

export interface L2Note {
  offset: string;
  measure: number;
  pitch: string;
  degree: string;
  fermata: boolean;
  options: string[];
  kittel: Phrase["kittel"];
  bach: Phrase["bach"];
  habit: Phrase["habit"];
  predicted: string | null;
}
export interface L2Chorale {
  number: number;
  title: string;
  tonic: string;
  mode: "major" | "minor";
  notes: L2Note[];
}

const DATA = raw as unknown as { chorales: L2Chorale[] };
export const LEVEL2: Record<number, L2Chorale> = Object.fromEntries(DATA.chorales.map((c) => [c.number, c]));

/** The index in the melody of each level-2 note (the written note at its offset, not a small note). */
export function noteIndices(ch: Chorale, l2: L2Chorale): number[] {
  return l2.notes.map((n) => ch.melody.findIndex((m: MelodyNote) => !m.grace && m.pitch !== null && m.offset === n.offset));
}
