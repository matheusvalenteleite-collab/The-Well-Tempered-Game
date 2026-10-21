/**
 * Difficulty audit (D165): a simulated player, on time within a jitter and moving the thumb roughly
 * the right way, plays every voice of every section at each level and tempo through the game's own
 * engine (with a fake clock). Writes docs/touch/AUDIT.md. Run: node tools/touch/audit.ts
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Game } from "../../src/touch/engine.ts";
import { FUGUE } from "../../src/touch/fugue.ts";
import type { Chip } from "../../src/touch/chip.ts";
import { level } from "../../src/touch/voice-mode.ts";
import { stepInto, type Level as Difficulty } from "../../src/touch/lanes.ts";

// A seeded random, so the audit is the same every run.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());

function run(section: number, voice: number, diff: Difficulty, bpm: number, jitterMs: number): number {
  const clock = { t: 0 };
  const chip = {
    ctx: { get currentTime() { return clock.t; }, outputLatency: 0, baseLatency: 0 },
    heard: () => clock.t,
    note: () => ({ stop: () => {} }),
    tick: () => {},
  } as unknown as Chip;
  const lv = level(FUGUE, section, voice);
  const g = new Game(FUGUE, [lv], diff, bpm, chip);
  const at = (tick: number) => 0.15 + (tick - g.start) / g.tps;
  // performance.now() stands still in this script: events are stamped "now" at the clock's time.
  const stamp = () => performance.now();
  let y = 0.5;
  let id = 0;
  const n = lv.lanes.length;
  lv.notes.forEach((note, i) => {
    // A chord is one tap.
    if (i > 0 && lv.notes[i - 1].on === note.on) return;
    const dir = stepInto(lv.notes, i) ?? 0;
    if (diff === "notes") y = 1 - (note.lane + 0.5 + gauss() * 0.25) / n;
    else y += dir * -(0.06 + rnd() * 0.08) + (dir === 0 ? gauss() * 0.02 : 0);
    y = Math.max(0.02, Math.min(0.98, y));
    clock.t = at(note.on) + (gauss() * jitterMs) / 1000;
    g.step();
    g.down(++id, id % 2 ? "left" : "right", y, stamp());
    clock.t += note.long ? (0.8 * note.dur) / g.tps : Math.min(0.08, (0.5 * note.dur) / g.tps);
    g.step();
    g.up(id, stamp());
  });
  clock.t = at(g.end + 1);
  g.step();
  const [r] = g.results();
  return Math.round((100 * r.got) / r.of);
}

const L: string[] = [];
L.push("# Touch game: difficulty audit (generated)\n");
L.push("By `tools/touch/audit.ts` (D165). A simulated player plays each voice of each section through the");
L.push("game's own engine: on time within a random jitter (normal, standard deviation 40 ms or 80 ms), and in");
L.push("SHAPE moving the thumb 6-14% of the play area's height the right way for each step (repeats within 2%);");
L.push("in NOTES aiming at the middle of the right lane with a quarter of a lane's wobble. Each figure is the");
L.push("score in %; 80% earns the voice; under 80 in bold. The densest passage is the most notes in any one");
L.push("second at ♩=60. A chord within a voice (the final cadence) is one tap.\n");
const DIFFS: Difficulty[] = ["rhythm", "shape", "notes"];
for (const bpm of [60, 72]) {
  for (const jitter of [40, 80]) {
    L.push(`## ♩=${bpm}, timing jitter ${jitter} ms\n`);
    L.push(`| section | voice | notes | densest (notes/s at ♩=60) | ${DIFFS.join(" | ")} |`);
    L.push(`|---|---|---|---|${DIFFS.map(() => "---").join("|")}|`);
    FUGUE.sections.forEach((s, si) => {
      for (let v = 0; v < 3; v++) {
        const lv = level(FUGUE, si, v);
        const perSec = FUGUE.tpq; // ticks per second at ♩=60
        let densest = 0;
        for (const a of lv.notes) densest = Math.max(densest, lv.notes.filter((b) => b.on >= a.on && b.on < a.on + perSec).length);
        const scores = DIFFS.map((d) => run(si, v, d, bpm, jitter));
        L.push(`| ${s.fromBar}–${s.toBar} ${s.name} | ${FUGUE.voiceNames[v]} | ${lv.notes.length} | ${densest} | ${scores.map((x) => (x >= 80 ? `${x}` : `**${x}**`)).join(" | ")} |`);
      }
    });
    L.push("");
  }
}
const out = fileURLToPath(new URL("../../docs/touch/AUDIT.md", import.meta.url));
writeFileSync(out, L.join("\n") + "\n");
console.log(L.slice(7, 28).join("\n"));
