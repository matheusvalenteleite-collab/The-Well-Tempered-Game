/**
 * D333: a synthetic STUDY (src/bench/lab/study.ts) for checking tools/lab/study-report.ts: every take
 * played by lab-synth's simulated player under the study's parameters, its timing scatter shrinking
 * from take to take (a player learning), its wrong-way touches and strays thinning out, and one habit
 * that stays (every `stuckEvery`-th note of an excerpt landed the wrong way in every take).
 *
 *   node tools/lab/study-synth.ts <out.json> [--excerpts N] [--takes N]
 */
import { writeFileSync } from "node:fs";
import { withMech } from "../../src/bench/mechanics.ts";
import { addTake, newStudy, type StudyFile } from "../../src/bench/lab/study.ts";
import type { LabPassage } from "../../src/bench/lab/log.ts";
import { tempoOf } from "../../src/touch/tempi.ts";
import { synthRun } from "./lab-synth.ts";

export function synthStudy(o: { excerpts?: number; takes?: number } = {}): StudyFile {
  let s = newStudy("synth", tempoOf, new Date("2026-10-27T09:00:00.000Z"));
  const n = Math.min(o.excerpts ?? s.excerpts.length, s.excerpts.length);
  s = { ...s, takesPer: o.takes ?? s.takesPer, excerpts: s.excerpts.slice(0, n) };
  for (let e = 0; e < n; e++) {
    const it = s.excerpts[e];
    for (let t = 0; t < s.takesPer; t++) {
      const learnt = t / Math.max(1, s.takesPer - 1);
      const p: LabPassage = { piece: it.piece, voice: it.voice, fromBar: it.fromBar, toBar: it.toBar, bpm: it.bpm, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null, sound: s.sound, loop: false };
      // The scatter from ±90 ms down to ±20 ms; wrong-way touches every 6th note at first, every 40th at the end.
      const log = withMech(s.mech, () =>
        synthRun(p, { gap: 0.03, jitter: 0.09 - 0.07 * learnt, wrongEvery: Math.round(6 + 34 * learnt), strayEvery: t < s.takesPer / 2 ? 9 : 0, stuckEvery: e % 3 === 0 ? 11 : 0, seed: 11 + 97 * e + t }),
      );
      s = addTake(s, { ...log, at: new Date(Date.parse("2026-10-27T09:00:00.000Z") + (e * s.takesPer + t) * 20000).toISOString() }, "synth", new Date("2026-10-27T10:00:00.000Z"));
    }
  }
  return s;
}

if (import.meta.main ?? process.argv[1]?.endsWith("study-synth.ts")) {
  const args = process.argv.slice(2);
  const out = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
  if (!out) {
    console.error("usage: node tools/lab/study-synth.ts <out.json> [--excerpts N] [--takes N]");
    process.exit(2);
  }
  const num = (k: string) => (args.includes(k) ? Number(args[args.indexOf(k) + 1]) : undefined);
  const s = synthStudy({ excerpts: num("--excerpts"), takes: num("--takes") });
  writeFileSync(out, JSON.stringify(s));
  console.log(`${out}: ${s.excerpts.length} excerpts × ${s.takesPer} takes, ${Math.round(JSON.stringify(s).length / 1024)} KB`);
}
