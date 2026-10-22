/**
 * Difficulty audit (D165; D166; D167): a simulated player plays every voice of every section of all
 * 48 fugues through the game's own engine (with a fake clock), at both levels: on time within a jitter
 * (normal, s.d. 40 ms), landing on the right row within a jitter (normal, s.d. a third of a row), holding
 * long notes. It checks that every passage is fair, not how hard it is for a hand. Writes
 * docs/touch/AUDIT.md. Run: node tools/touch/audit.ts
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Game } from "../../src/touch/engine.ts";
import { FUGUES, type TouchFugue } from "../../src/touch/fugue.ts";
import type { Chip } from "../../src/touch/chip.ts";
import { level, voicesIn } from "../../src/touch/voice-mode.ts";
import { LEVELS, type Level as Difficulty } from "../../src/touch/lanes.ts";

// A seeded random, so the audit is the same every run.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());

function run(f: TouchFugue, section: number, voice: number, difficulty: Difficulty, bpm: number): number {
  const clock = { t: 0 };
  const chip = {
    ctx: { get currentTime() { return clock.t; }, outputLatency: 0, baseLatency: 0 },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {} }),
    tick: () => {},
  } as unknown as Chip;
  const g = new Game(f, [level(f, section, voice)], { difficulty, bpm, withOthers: false, wait: false, lagMs: 0, section }, chip);
  const at = (tick: number) => 0.15 + (tick - g.start) / g.tps;
  const notes = g.tracks[0].lv.notes;
  type Ev = { t: number; down: boolean; id: number; step: number };
  const evs: Ev[] = [];
  notes.forEach((n, i) => {
    if (n.ride || (i > 0 && notes[i - 1].on === n.on)) return;
    const t = at(n.on) + (gauss() * 40) / 1000;
    evs.push({ t, down: true, id: i + 1, step: n.step });
    evs.push({ t: n.long ? at(n.on + 0.8 * n.dur) : t + 0.05, down: false, id: i + 1, step: n.step });
  });
  evs.sort((a, b) => a.t - b.t || Number(a.down) - Number(b.down));
  const runTo = (t: number) => {
    while (clock.t < t - 0.05) (clock.t += 0.05), g.step();
    clock.t = Math.max(clock.t, t);
  };
  for (const e of evs) {
    runTo(e.t);
    g.step();
    if (!e.down) {
      g.up(e.id, performance.now());
      continue;
    }
    const win = g.keys(0);
    const row = Math.max(0, Math.min(win.rows - 1, e.step - win.lo)) + gauss() / 3;
    g.down(e.id, e.id % 2 ? "left" : "right", 100, 400 - (row + 0.5) * (400 / win.rows), 390, 400, performance.now());
  }
  runTo(at(g.end + 1));
  g.step();
  const [r] = g.results();
  return r.of ? Math.round((100 * r.got) / r.of) : 100;
}

const L: string[] = [];
L.push("# Touch game: difficulty audit (generated)\n");
L.push("By `tools/touch/audit.ts` (D165-D167). A simulated player plays every voice of every section of the 48");
L.push("fugues through the game's own engine at the beat 50 (♩=50 in 4/4): on time within a random jitter");
L.push("(normal, s.d. 40 ms), on the right row of the keys within a third of a row (normal), long notes held.");
L.push("EASY counts the time only and lets the short notes ride; NORMAL wants the row (one off still counts).");
L.push("80% earns a voice. This checks that each passage is fair, not how hard it is for a hand. Below: the");
L.push("passages under 80%, and each fugue's lowest score at each level.\n");
const low: string[] = [];
L.push(`| fugue | voices | sections | ${LEVELS.map((d) => `lowest ${d}`).join(" | ")} |`);
L.push(`|---|---|---|${LEVELS.map(() => "---").join("|")}|`);
let runs = 0;
for (const f of FUGUES) {
  const lows: Record<string, number> = {};
  f.sections.forEach((s, si) => {
    for (const v of voicesIn(f, si))
      for (const d of LEVELS) {
        const x = run(f, si, v, d, 50);
        runs++;
        lows[d] = Math.min(lows[d] ?? 100, x);
        if (x < 80) low.push(`| ${f.id} | bars ${s.fromBar}–${s.toBar} | ${f.voiceNames[v]} | ${d} | ${x} |`);
      }
  });
  L.push(`| ${f.title} (${f.book === 1 ? "I" : "II"}) | ${f.voices.length} | ${f.sections.length} | ${LEVELS.map((d) => (lows[d] < 80 ? `**${lows[d]}**` : lows[d])).join(" | ")} |`);
}
L.push("");
L.push(`## Under 80% (${low.length} of ${runs} runs)\n`);
if (low.length) {
  L.push("| fugue | section | voice | level | % |");
  L.push("|---|---|---|---|---|");
  L.push(...low);
} else L.push("None.");
const out = fileURLToPath(new URL("../../docs/touch/AUDIT.md", import.meta.url));
writeFileSync(out, L.join("\n") + "\n");
console.log(`${runs} runs, ${low.length} under 80%`);
console.log(low.slice(0, 20).join("\n"));
