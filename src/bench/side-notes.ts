/** D327: the reading's marks a round has, as the side bar's legend lines (readings.ts markLegend, in its order). */
import { markLegend, marksHas, type MarkNote } from "../touch/readings.ts";
import { STRONG_SIDE } from "../touch/touch-expr.ts";

/** D370: a reading's mark with its place in a slur (readings.ts markOf). */
export type Mark = MarkNote;

export function legendLines(marks: Iterable<Mark>) {
  const has = marksHas(marks);
  return markLegend(STRONG_SIDE).filter((l) => has[l.kind]);
}
