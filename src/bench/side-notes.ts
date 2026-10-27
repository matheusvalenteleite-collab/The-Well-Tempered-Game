/** D327: the reading's marks a round has, as the side bar's legend lines (readings.ts markLegend, in its order). */
import { markLegend, type Reading } from "../touch/readings.ts";
import { STRONG_SIDE } from "../touch/touch-expr.ts";

export type Mark = Reading["notes"][number];

export function legendLines(marks: Iterable<Mark>) {
  const ms = [...marks];
  const has = { short: ms.some((m) => m.short), apart: ms.some((m) => m.join === false), joined: ms.some((m) => m.join), strong: ms.some((m) => m.accent) };
  return markLegend(STRONG_SIDE).filter((l) => has[l.kind]);
}
