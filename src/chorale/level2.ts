/**
 * Level 2 of the chorale mode (docs/chorales/CONCEPT.md): the harmony. The player chooses the
 * chord under every melody note; the comparison is the same as at level 1, note by note: Kittel's
 * basses, Bach's settings of the tune, Bach's habit at that melody degree (C4: nothing is wrong).
 *
 * Data: data/chorales/level2.json, written by tools/chorales/harmony_plans.py.
 */
import raw from "../../data/chorales/level2.json" with { type: "json" };
import type { Phrase } from "./level1.ts";
import { withHabit } from "./habits.ts";

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
  /** C33: the local key of this note (from Bach's settings of the tune), in which its chords are named. */
  key?: [string, "major" | "minor"];
}
export interface L2Chorale {
  number: number;
  title: string;
  tonic: string;
  mode: "major" | "minor";
  notes: L2Note[];
}

const DATA = raw as unknown as { chorales: L2Chorale[]; habits: Phrase["habit"][] };
export const LEVEL2: Record<number, L2Chorale> = Object.fromEntries(DATA.chorales.map((c) => [c.number, { ...c, notes: c.notes.map((n) => withHabit(n, DATA.habits)) }]));
