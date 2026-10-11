/**
 * The level files keep each of Bach's habits once, in a table, and the notes refer to it by index
 * (tools/chorales/habits.py); level 4 also writes its notes as rows under one list of field names.
 * These put the notes back in their full shape on load.
 */
import type { Phrase } from "./level1.ts";

type Habit = Phrase["habit"];

/** The note with its habit looked up in the table. */
export const withHabit = <T extends { habit: unknown }>(n: T, habits: Habit[]): T & { habit: Habit } => ({ ...n, habit: habits[n.habit as number] });

/** A row under `fields` as an object. */
export function fromRow<T>(fields: string[], row: unknown[]): T {
  const o: Record<string, unknown> = {};
  fields.forEach((f, i) => (o[f] = row[i]));
  return o as T;
}
