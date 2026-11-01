/** D327: the reading's marks a round has, as the side bar's legend lines (readings.ts markLegend, in its order). */
import { markLegend, marksHas, type MarkNote } from "../touch/readings.ts";
import { STRONG_SIDE } from "../touch/touch-expr.ts";
import { hardTapDevice } from "../touch/motion.ts";

/** D370: a reading's mark with its place in a slur (readings.ts markOf). */
export type Mark = MarkNote;

export function legendLines(marks: Iterable<Mark>) {
  const has = marksHas(marks);
  return markLegend(STRONG_SIDE).filter((l) => has[l.kind]);
}

/**
 * D483: the side legend's short lines, with a whole-piece reading (BUSONI): its eleven or more signs fit
 * the right bar between the crowd and the organ's stops at 375 px (the long lines ran under the stops).
 * The same meanings as the play screen's glossary (D419), shortened; the box's own legend keeps the long ones.
 */
export const SHORT_LEGEND: Record<string, string> = {
  short: "SHORT: LIFT BEFORE 3/5",
  apart: "DETACHED: A SMALL SILENCE",
  joined: "LEGATO: NO GAP",
  slur: "SLUR: LEGATO, THEN A SILENCE",
  strong: "ACCENT: STRONG ZONE, ON TIME",
  marcato: "MARCATO: ACCENT, LET GO SHORT",
  wedge: "WEDGE: JUDGED AS SHORT",
  tenuto: "TENUTO (NOT SCORED)",
  portato: "PORTATO: A LITTLE APART",
  phrase: "PHRASE (A GUIDE)",
  fermata: "FERMATA (NOT SCORED)",
  dynamics: "LEVELS: THE LINE PLAYS THEM",
  hairpin: "HAIRPINS: THE LINE FOLLOWS",
  words: "WORDS: TRANSLATED BELOW",
};

/** D425 over D483: the accent's short line a hard tap where the phone feels one (motion.ts hardTapDevice), else the strong zone. */
export function shortLegend(kind: string): string | undefined {
  return kind === "strong" && hardTapDevice() ? "ACCENT: TAP HARD, ON TIME" : SHORT_LEGEND[kind];
}
