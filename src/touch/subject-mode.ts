/**
 * Subject mode (D159): the player plays only the subject, wherever it enters, and hears only what
 * they play. First they learn the subject (the alto, bar 1) and the answer (the soprano, bar 3) with
 * the notes in view; then they play all eight entries from memory, the notes hidden in the box but
 * for the first of each entry and the notes where Bach varies the form. A hit note hidden in the box
 * shows a gold outline.
 */
import type { TouchEntry, TouchFugue } from "./fugue.ts";

export interface Stage {
  kind: "learn" | "memory";
  title: string;
  entries: number[];
}

/** Of the scoring notes, how many a stage needs to be passed. */
export const PASS = 0.8;

export function stages(f: TouchFugue): Stage[] {
  const first = (form: TouchEntry["form"]) => f.entries.findIndex((e) => e.form === form);
  return [
    { kind: "learn", title: "THE SUBJECT", entries: [first("subject")] },
    { kind: "learn", title: "THE ANSWER", entries: [first("answer")] },
    { kind: "memory", title: "FROM MEMORY", entries: f.entries.map((_, i) => i) },
  ];
}

/** Whether a note of an entry shows in the box before it is played. */
export function shown(kind: Stage["kind"], index: number, varied: 0 | 1): boolean {
  return kind === "learn" || index === 0 || varied === 1;
}
