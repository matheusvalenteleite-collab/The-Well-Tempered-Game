/**
 * Difficulty audit (D165-D172): a simulated player plays every part (a fugue's voice, a prelude's
 * hand) of all 96 pieces and Contrapunctus XIV through the game's own engine (with a fake clock), on
 * both instruments at both levels: on time within a jitter (normal, s.d. 40 ms); on the Synth with the
 * right thumb, at the band's height within a jitter (s.d. a quarter of a band); on the Piano on the
 * key, within a jitter across it (s.d. a sixth of a white key); holding long notes. It checks that
 * every passage is fair, not how hard it is for a hand. Writes docs/touch/AUDIT.md.
 * Run: node tools/touch/audit.ts
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Game, INSTRUMENTS, KEYS_SHARE, type Instrument } from "../../src/touch/engine.ts";
import { isBlack, keySpan } from "../../src/touch/piano.ts";
import { sideFor } from "../../src/touch/shape.ts";
import { PIECES, type TouchFugue } from "../../src/touch/fugue.ts";
import type { Chip } from "../../src/touch/chip.ts";
import { level, voicesFrom } from "../../src/touch/voice-mode.ts";
import { LEVELS, type Level as Difficulty } from "../../src/touch/lanes.ts";

// A seeded random, so the audit is the same every run.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());

function run(f: TouchFugue, voice: number, difficulty: Difficulty, instrument: Instrument, bpm: number): number {
  const clock = { t: 0 };
  const chip = {
    ctx: { get currentTime() { return clock.t; }, outputLatency: 0, baseLatency: 0 },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {} }),
    tick: () => {},
  } as unknown as Chip;
  const g = new Game(f, [level(f, voice, 0)], { difficulty, bpm, instrument }, chip);
  const at = (tick: number) => g.timeAt(tick);
  const notes = g.tracks[0].lv.notes;
  type Ev = { t: number; down: boolean; id: number; i: number };
  const evs: Ev[] = [];
  notes.forEach((n, i) => {
    if (n.ride || (i > 0 && notes[i - 1].on === n.on)) return;
    const t = at(n.on) + (gauss() * 40) / 1000;
    evs.push({ t, down: true, id: i + 1, i });
    evs.push({ t: n.long ? at(n.on + 0.8 * n.dur) : t + 0.05, down: false, id: i + 1, i });
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
    const n = notes[e.i];
    const [w, h] = [800, 400];
    if (instrument === "piano") {
      const [a, b] = keySpan(g.kb, n.midi);
      const x = ((a + b) / 2 + gauss() / (6 * g.kb.whites)) * w;
      g.down(e.id, { side: "left", x, y: isBlack(n.midi) ? h * (1 - KEYS_SHARE) + 10 : h - 10, w, h }, performance.now());
    } else {
      const band = Math.max(0, n.size ?? 0) + 0.5 + gauss() / 4;
      const side = sideFor(n) ?? (e.id % 2 ? "left" : "right");
      g.down(e.id, { side, x: side === "left" ? 100 : 600, y: h - band * (h / 4), w, h }, performance.now());
    }
  }
  runTo(at(g.end + 1));
  g.step();
  const [r] = g.results();
  return r.of ? Math.round((100 * r.got) / r.of) : 100;
}

const L: string[] = [];
L.push("# Touch game: difficulty audit (generated)\n");
L.push("By `tools/touch/audit.ts` (D165-D169). A simulated player plays every part (a fugue's voice, a prelude's");
L.push("hand) of the 96 preludes and fugues and Contrapunctus XIV, whole, through the game's own engine at MEDIUM (the beat 54): on time within a random jitter");
L.push("(normal, s.d. 40 ms); the Synth with the right thumb at the band's height within a quarter of a band; the");
L.push("Piano on the key within a sixth of a white key across it; long notes held. EASY counts the time (and on the");
L.push("Synth the thumb) and lets the short notes ride; NORMAL wants the band, or the key.");
L.push("80% earns a voice. This checks that each passage is fair, not how hard it is for a hand. Below: the");
L.push("passages under 80%, and each fugue's lowest score at each level.\n");
const low: string[] = [];
const MODES = INSTRUMENTS.flatMap((i) => LEVELS.map((d) => [i, d] as const));
L.push(`| piece | parts | bars | ${MODES.map(([i, d]) => `${i} ${d}`).join(" | ")} |`);
L.push(`|---|---|---|${MODES.map(() => "---").join("|")}|`);
let runs = 0;
for (const f of PIECES) {
  const lows: Record<string, number> = {};
  for (const v of voicesFrom(f, 0))
    for (const [i, d] of MODES) {
      const x = run(f, v, d, i, 54);
      runs++;
      const k = `${i} ${d}`;
      lows[k] = Math.min(lows[k] ?? 100, x);
      if (x < 80) low.push(`| ${f.id} | ${f.voiceNames[v]} | ${k} | ${x} |`);
    }
  L.push(`| ${f.title} (${f.book === 1 ? "I" : f.book === 2 ? "II" : "AoF"}) | ${f.voices.length} | ${f.bars.length} | ${MODES.map(([i, d]) => lows[`${i} ${d}`]).map((x) => (x < 80 ? `**${x}**` : x)).join(" | ")} |`);
}
L.push("");
L.push(`## Under 80% (${low.length} of ${runs} runs)\n`);
if (low.length) {
  L.push("| piece | part | mode | % |");
  L.push("|---|---|---|---|");
  L.push(...low);
} else L.push("None.");
const out = fileURLToPath(new URL("../../docs/touch/AUDIT.md", import.meta.url));
writeFileSync(out, L.join("\n") + "\n");
console.log(`${runs} runs, ${low.length} under 80%`);
console.log(low.slice(0, 20).join("\n"));
