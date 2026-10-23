/**
 * D219: the bench's settings as folded buttons, and the pictures that explain the modes (pure: the
 * labels, the panels' choices, the diagrams' data; BenchApp.tsx, LabSettings.tsx and ModeDiagram.tsx
 * draw them).
 *   TUNING: one button showing the choice ("TUNING · EQUAL · A440"); it opens a panel of the
 *   temperaments and the pitches of A; a choice applies and closes the panel.
 *   LAB: one button showing what is on; it opens a panel of the switches, each with a line saying what
 *   it does; a switch flips in place, ✕ DONE closes.
 */
import { PITCHES, TEMPERAMENTS } from "../touch/tuning.ts";
import type { Lab } from "../touch/subject-fx.ts";

/** A temperament's short name (its parenthesis dropped): "LEHMAN (BACH?)" → "LEHMAN". */
export const temperName = (id: string) => (TEMPERAMENTS.find((t) => t.id === id) ?? TEMPERAMENTS[0]).name.replace(/ \(.*\)$/, "");

/** The TUNING button's text. */
export const tuningLabel = (id: string, a: number) => `TUNING · ${temperName(id)} · A${a}`;

/** One choice in the tuning panel: a temperament (the A kept) or a pitch of A (the temperament kept). */
export type TuningChoice = { temper: string } | { a: number };

/** The tuning after a choice; the panel closes on any choice. */
export function chooseTuning(cur: { id: string; a: number }, c: TuningChoice): { id: string; a: number; open: false } {
  if ("temper" in c) return { id: TEMPERAMENTS.some((t) => t.id === c.temper) ? c.temper : cur.id, a: cur.a, open: false };
  return { id: cur.id, a: (PITCHES as readonly number[]).includes(c.a) ? c.a : cur.a, open: false };
}

/** The LAB's switches: name and one plain line on what each does. */
export const LAB_ROWS: [keyof Lab, string, string][] = [
  ["subject", "SUBJECT SOUND", "The subject a little brighter, the other voices a little duller while it plays."],
  ["effect", "EFFECT", "A soft sound effect on the subject, made for each fugue."],
  ["vibrato", "VIBRATO", "A slight vibrato on the subject's notes."],
  ["stereo", "STEREO", "The voice with the subject drawn towards the centre."],
];

/** The LAB button's text: what is on. */
export function labLabel(l: Lab): string {
  const on = LAB_ROWS.filter(([k]) => l[k]).map(([, name]) => name);
  return `LAB · ${on.length ? on.join(" + ") : "ALL OFF"}`;
}

/** A LAB switch flipped. */
export const toggleLab = (l: Lab, k: keyof Lab): Lab => ({ ...l, [k]: !l[k] });

/** The computer HIGHWAY's home row, as drawn: each key's hand (G both index fingers, marked), then the thumbs on SPACE. */
export const HOME_ROW: { key: string; hand: "left" | "right" | "both"; finger: string }[] = [
  { key: "A", hand: "left", finger: "little" },
  { key: "S", hand: "left", finger: "ring" },
  { key: "D", hand: "left", finger: "middle" },
  { key: "F", hand: "left", finger: "index" },
  { key: "G", hand: "both", finger: "index" },
  { key: "H", hand: "right", finger: "index" },
  { key: "J", hand: "right", finger: "middle" },
  { key: "K", hand: "right", finger: "ring" },
  { key: "L", hand: "right", finger: "little" },
];
