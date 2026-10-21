/**
 * Difficulty audit (D165; D166): a simulated player, on time within a jitter and landing near each
 * square, plays every voice of every section at each level and tempo through the game's own
 * engine (with a fake clock). Writes docs/touch/AUDIT.md. Run: node tools/touch/audit.ts
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Game } from "../../src/touch/engine.ts";
import { FUGUE } from "../../src/touch/fugue.ts";
import type { Chip } from "../../src/touch/chip.ts";
import { level } from "../../src/touch/voice-mode.ts";
import { LEVELS, type Level as Difficulty } from "../../src/touch/lanes.ts";

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
  // A phone's play area, and a thumb that lands within about 20 px of the square's centre.
  const [w, h] = [390, 400];
  let id = 0;
  lv.notes.forEach((note, i) => {
    if (note.ride || (i > 0 && lv.notes[i - 1].on === note.on)) return;
    clock.t = at(note.on) + (gauss() * jitterMs) / 1000;
    g.step();
    const x = note.x! * w + gauss() * 20;
    const y = note.y! * h + gauss() * 20;
    g.down(++id, x < w / 2 ? "left" : "right", x, y, w, h, performance.now());
    clock.t += note.long ? (0.8 * note.dur) / g.tps : Math.min(0.08, (0.5 * note.dur) / g.tps);
    g.step();
    g.up(id, performance.now());
  });
  clock.t = at(g.end + 1);
  g.step();
  const [r] = g.results();
  return Math.round((100 * r.got) / r.of);
}

const L: string[] = [];
L.push("# Touch game: difficulty audit (generated)\n");
L.push("By `tools/touch/audit.ts` (D165). A simulated player plays each voice of each section through the");
L.push("game's own engine (D166: squares to tap): on time within a random jitter (normal, standard deviation 40 ms");
L.push("or 80 ms), landing within about 20 px of each square's centre (normal, s.d. 20 px each way) in a 390 by 400 px");
L.push("play area. EASY counts the time only and lets the short notes ride. Each figure is the");
L.push("score in %; 80% earns the voice; under 80 in bold. The densest passage is the most notes in any one");
L.push("second at ♩=60. A chord within a voice (the final cadence) is one tap.\n");
const DIFFS: Difficulty[] = LEVELS;
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
