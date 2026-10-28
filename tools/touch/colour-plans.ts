/**
 * D355: packs the colour plans written in tools/touch/colour-plans/ (each moment with its reason) into
 * data/touch/colour-plans.json, the moments alone, which the game loads on demand (src/touch/colour.ts).
 * Run after changing a plan: node tools/touch/colour-plans.ts (test/d355-colour-plans.test.ts checks
 * that the data matches).
 */
import { writeFileSync } from "node:fs";
import type { ColourEvent } from "../../src/touch/colour.ts";
import { COLOURS } from "./colour-plans/index.ts";

/** The game's data: by piece, by sound, the moments in time ([bar, colour]). */
export function packColours(): Record<string, Record<string, ColourEvent[]>> {
  const out: Record<string, Record<string, ColourEvent[]>> = {};
  for (const [id, p] of Object.entries(COLOURS)) {
    const plans: Record<string, ColourEvent[]> = {};
    for (const [sound, ms] of Object.entries(p.plans)) if (ms.length) plans[sound] = [...ms].sort((a, b) => a.bar - b.bar).map((m) => [m.bar, m.c]);
    if (Object.keys(plans).length) out[id] = plans;
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = packColours();
  writeFileSync(new URL("../../data/touch/colour-plans.json", import.meta.url), JSON.stringify(out) + "\n");
  const n = Object.values(out).reduce((a, p) => a + Object.values(p).reduce((b, e) => b + e.length, 0), 0);
  console.log(`colour-plans.json: ${Object.keys(out).length} pieces, ${n} moments`);
}
