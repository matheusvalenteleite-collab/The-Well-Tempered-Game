/**
 * How your line fits Fux's (D98): first how close it is to his (the same note in the same place),
 * then — if it is your own — how it sounds as three-voice counterpoint with his line and the
 * cantus (the places free of the faults that trioReading finds). Graded, for the evaluation's
 * "With Fux" section. Pure.
 */
import { sounding, type Slot } from "../counterpoint/layout.ts";
import { trioReading, type TrioFinding } from "./trio-eval.ts";

/**
 * trioReading without the faults that lie wholly where the two lines sing the same notes: there
 * they double each other (parallel unisons), which is closeness, counted as such, not a fault of
 * the trio.
 */
export function trioFindings(cantus: string[], player: (string | null)[], fux: (string | null)[], layout: Slot[]): TrioFinding[] {
  return trioReading(cantus, player, fux, layout).filter((f) => f.tone !== "fault" || !f.slots.every((k) => player[k] === fux[k]));
}

export type TrioGrade = "identical" | "close" | "remarkable" | "good" | "uneven" | "clash";

export interface TrioVerdict {
  grade: TrioGrade;
  /** Places where both lines sound. */
  places: number;
  /** Of those, where your note is Fux's. */
  same: number;
  /** Of those, where the three voices make no fault together. */
  clean: number;
}

export function trioVerdict(cantus: string[], player: (string | null)[], fux: (string | null)[], layout: Slot[]): TrioVerdict {
  const both = layout.map((_, k) => k).filter((k) => sounding(player[k] ?? null) && sounding(fux[k] ?? null));
  const places = both.length;
  const same = both.filter((k) => player[k] === fux[k]).length;
  const faulty = new Set(trioFindings(cantus, player, fux, layout).filter((f) => f.tone === "fault").flatMap((f) => f.slots));
  const clean = both.filter((k) => !faulty.has(k)).length;
  const share = places ? same / places : 0;
  const cleanShare = places ? clean / places : 0;
  const grade: TrioGrade =
    places > 0 && same === places ? "identical"
    : share >= 0.75 ? "close"
    : faulty.size === 0 ? "remarkable"
    : cleanShare >= 0.8 ? "good"
    : cleanShare >= 0.55 ? "uneven"
    : "clash";
  return { grade, places, same, clean };
}
