/**
 * D338, THE RUSH READOUT (the Lab, after each run, beside timingLine's average): the right notes' mean
 * timing over the first, middle and last third of the passage (by time), "early 15 → 38 → 72 ms
 * (rushing)": rushing when the last third is at least RUSH_MS earlier than the first, dragging when
 * that much later.
 */
import type { LabEvent } from "./events.ts";

/** The last third this much earlier (later) than the first: rushing (dragging), ms. */
export const RUSH_MS = 25;

/** The three thirds' mean offsets (ms, + late), or null under three right notes. */
export function timingThirds(verdicts: readonly LabEvent[]): [number, number, number] | null {
  const notes = verdicts.flatMap((v) => (v.kind === "note" && v.ok && typeof v.offMs === "number" ? [{ tick: v.tick, off: v.offMs }] : []));
  if (notes.length < 3) return null;
  const offs = notes.map((n, j) => ({ ...n, j })).sort((a, b) => a.tick - b.tick || a.j - b.j).map((n) => n.off);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const n = offs.length;
  const a = Math.round(n / 3);
  const b = Math.round((2 * n) / 3);
  return [mean(offs.slice(0, a)), mean(offs.slice(a, b)), mean(offs.slice(b))];
}

/** "rushing", "dragging" or "" (steady). */
export function rushWord(thirds: readonly [number, number, number]): "rushing" | "dragging" | "" {
  const d = thirds[2] - thirds[0];
  return d <= -RUSH_MS ? "rushing" : d >= RUSH_MS ? "dragging" : "";
}

/** "early 15 → 38 → 72 ms (rushing)"; short (the RUNS list): "early 15→38→72 rushing". "" under three right notes. */
export function rushLine(verdicts: readonly LabEvent[], short = false): string {
  const t = timingThirds(verdicts);
  if (!t) return "";
  const r = t.map(Math.round);
  const allEarly = r.every((x) => x <= 0);
  const allLate = r.every((x) => x >= 0);
  const head = allEarly ? "early" : allLate ? "late" : "thirds";
  const nums = allEarly || allLate ? r.map((x) => String(Math.abs(x))) : r.map((x) => (x > 0 ? `+${x}` : x < 0 ? `−${-x}` : "0"));
  const word = rushWord(t);
  return short ? `${head} ${nums.join("→")}${word ? ` ${word}` : ""}` : `${head} ${nums.join(" → ")} ms${word ? ` (${word})` : ""}`;
}
