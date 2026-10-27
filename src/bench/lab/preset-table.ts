/**
 * D329: one row of the preset comparison: a log re-judged with a set of parameters (replay.ts), its notes
 * right, wrong and missed (those the run reached: a run stopped early leaves the rest out), the strays,
 * the joins, the thumbs that waited, the double contacts ignored and the PERFECTs.
 */
import type { Mech } from "../mechanics.ts";
import type { LabLog } from "./log.ts";
import { replay, tally, type Tally } from "./replay.ts";

export interface PresetRow extends Tally {
  waits: number;
  doubles: number;
  perfect: number;
}

export function presetRow(log: LabLog, mech?: Mech): PresetRow {
  const r = replay(log, mech);
  const t = tally(r.events);
  let waits = 0;
  let doubles = 0;
  let perfect = 0;
  for (const e of r.events) {
    if (e.kind === "wait") waits++;
    else if (e.kind === "double") doubles++;
    else if (e.kind === "note" && e.ok && e.perfect) perfect++;
  }
  return { ...t, waits, doubles, perfect };
}
