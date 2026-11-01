/**
 * D486: the simulated slides' success rates by cause (test/slide-sim.ts), over the pieces, both phones
 * and the seeds. `node tools/touch/slide-rates.ts [bars] [--json]`.
 */
import { CAUSES, PHONES, slideRates } from "../../test/slide-sim.ts";

const bars = Number(process.argv[2]) || 16;
const json = process.argv.includes("--json");
const rates = slideRates({ bars, seeds: [1, 2, 3] });
if (json) console.log(JSON.stringify(rates));
else {
  console.log(`slides, ${bars} bars, ${PHONES.map((p) => p.name).join(" and ")}, seeds 1-3`);
  for (const c of CAUSES) {
    const r = rates[c];
    const why = Object.entries(r.why)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${v}`)
      .join(", ");
    console.log(`${c.padEnd(10)} ${String(r.ok).padStart(4)}/${String(r.attempts).padEnd(4)} ${((100 * r.ok) / Math.max(1, r.attempts)).toFixed(1).padStart(5)}%   struck right ${((100 * r.struckRight) / Math.max(1, r.struck)).toFixed(1)}%   orns ${r.orns}${why ? `   [${why}]` : ""}`);
  }
}
