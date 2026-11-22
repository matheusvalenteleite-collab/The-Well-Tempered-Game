/**
 * D862, TWO HANDS (the prototype, play.html?proto=hands): the left thumb plays the left hand's line, the right thumb
 * the right hand's, each judged on its own; a hand's chord gives the player its outer note (the right hand's top,
 * the left's bottom), and a line quicker than HANDS_MAX_RATE a second gives the game the quick notes between the
 * beat-carrying ones. Nothing added: the player's notes and the game's are exactly the written notes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, inBar, loadExtras, type TouchNote } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { handsFugue, handPart, handsFlag, HANDS_MAX_RATE, meterOf, skyline, thin, TWO_HANDS, TWO_HANDS_IDS } from "../src/touch/two-hands.ts";

// Invention 1 is MORE BACH's (loaded on demand).
await loadExtras();
const key = (n: TouchNote) => `${n[0]}:${n[2]}`;
const meterFor = (id: string) => {
  const f = fugueById(id);
  return { f, m: meterOf(f, tempoOf(id), (t) => inBar(f, t)) };
};

test("D862: the flag is play.html?proto=hands, nothing else", () => {
  assert.equal(handsFlag("?proto=hands"), true);
  assert.equal(handsFlag("?lang=de&proto=hands"), true);
  assert.equal(handsFlag(""), false);
  assert.equal(handsFlag("?proto=other"), false);
});

test("D862: a chord gives the right hand its top note, the left hand its bottom; a note under a held top note is the inner voice's", () => {
  const chord: TouchNote[] = [
    [0, 480, 60, 35],
    [0, 480, 64, 37],
    [0, 480, 67, 39],
    [480, 240, 62, 36],
  ];
  assert.deepEqual(skyline(chord, "right").line.map((n) => n[2]), [67, 62]);
  assert.deepEqual(skyline(chord, "left").line.map((n) => n[2]), [60, 62]);
  // A melody note held over an inner voice's quavers: the quavers are the game's.
  const held: TouchNote[] = [
    [0, 960, 72, 42],
    [0, 240, 64, 37],
    [240, 240, 65, 38],
    [480, 240, 67, 39],
    [960, 480, 71, 41],
  ];
  const s = skyline(held, "right");
  assert.deepEqual(s.line.map((n) => n[2]), [72, 71]);
  assert.deepEqual(s.inner.map((n) => n[2]).sort(), [64, 65, 67]);
});

test("D862: a quick run keeps its beat-carrying notes (the downbeat first), never two closer than 1/5.5 s", () => {
  // Sixteen 32nds over a 4/4 bar's first two beats at 60 a quarter: 8 a second.
  const run: TouchNote[] = Array.from({ length: 16 }, (_, i) => [i * 60, 60, 60 + (i % 8), 35 + (i % 8)] as TouchNote);
  run.push([960, 480, 72, 42]);
  const m = { beat: 480, barTicks: 1920, inBar: (t: number) => t % 1920, tps: 480 };
  const { kept, given } = thin(run, m);
  assert.equal(kept[0][0], 0, "the downbeat kept");
  assert.ok(kept.some((n) => n[0] === 480), "the second beat kept");
  assert.equal(kept.at(-1)![0], 960, "the long note after the run kept");
  for (let i = 1; i < kept.length; i++) assert.ok((kept[i][0] - kept[i - 1][0]) / m.tps >= 1 / HANDS_MAX_RATE - 1e-9);
  assert.equal(kept.length + given.length, run.length);
  // A line at or under the rate is left whole.
  const slow: TouchNote[] = Array.from({ length: 8 }, (_, i) => [i * 240, 240, 60 + i, 35 + i] as TouchNote);
  assert.equal(thin(slow, m).given.length, 0);
});

test("D862: on the prototype's pieces each hand is one note at a time, at most 5.5 a second, and every written note is played (the player's or the game's)", () => {
  for (const id of TWO_HANDS_IDS) {
    const { f, m } = meterFor(id);
    const spec = TWO_HANDS[id];
    for (const [hand, v] of [["left", spec.lh], ["right", spec.rh]] as const) {
      const written = f.voices[v];
      const { mine, game } = handPart(written, hand, m);
      // Nothing added, nothing lost.
      assert.deepEqual([...mine, ...game].map(key).sort(), written.map(key).sort(), `${id} ${hand}`);
      for (let i = 1; i < mine.length; i++) {
        assert.ok(mine[i][0] > mine[i - 1][0], `${id} ${hand}: one note per onset`);
        assert.ok(mine[i - 1][0] + mine[i - 1][1] <= mine[i][0], `${id} ${hand}: one note held at a time`);
        assert.ok((mine[i][0] - mine[i - 1][0]) / m.tps >= 1 / HANDS_MAX_RATE - 1e-6, `${id} ${hand}: ${mine[i - 1][0]}→${mine[i][0]} quicker than the rate`);
      }
      // Most of each hand is the player's (the game a helper, not the soloist): I/24's right hand's alto excepted.
      assert.ok(mine.length / written.length >= (id === "wtc1p24" && hand === "right" ? 0.45 : 0.85), `${id} ${hand}: ${mine.length}/${written.length}`);
    }
  }
});

const fakeChip = (clock: { t: number }) => ({ ctx: { get currentTime() { return clock.t; } }, heard: () => clock.t, note: () => ({ stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {} }), swoosh() {}, tick() {} }) as unknown as Chip;
const RH = 9;
const ROWS: Rows = { yOf: (s) => 300 - s * RH, stepAt: (y) => Math.round((300 - y) / RH), rowH: RH, xOf: () => 400 };

/** Plays a piece in TWO HANDS; `sideOf` says which thumb strikes each track's notes (0 the left hand's, 1 the right's). */
function playHands(id: string, sideOf: (k: number) => "left" | "right", only?: number) {
  const clock = { t: 0 };
  const f = fugueById(id);
  const spec = TWO_HANDS[id];
  const g = new ProtoGame(f, [spec.lh, spec.rh], 0, protoById("ladder"), { bpm: tempoOf(id), legato: false, fail: false, twoHands: true }, fakeChip(clock));
  g.rows = ROWS;
  const run = (t: number) => {
    while (clock.t < t - 0.05) (clock.t += 0.05), g.step();
    clock.t = Math.max(clock.t, t);
    g.step();
  };
  const all = g.tracks.flatMap((t, k) => t.notes.map((n) => ({ n, k }))).filter(({ k }) => only === undefined || k === only).sort((a, b) => a.n.on - b.n.on);
  let id2 = 0;
  for (const { n, k } of all) {
    run(g.timeAt(n.on));
    const side = sideOf(k);
    g.down(++id2, { side, x: side === "left" ? 40 : 800, y: ROWS.yOf(n.step), w: 844, h: 390 }, performance.now());
    g.up(id2, performance.now());
  }
  run(g.timeAt(g.end + 1));
  return { g, r: g.results() };
}

test("D862: the engine: the left thumb the left hand (track 0), the right thumb the right (track 1); the game's notes marked to be drawn faint", () => {
  // D888: I/24 now holds three voices; TWO HANDS reads it as its two hands.
  const f = handsFugue(fugueById("wtc1p24"));
  assert.equal(fugueById("wtc1p24").voices.length, 3);
  assert.equal(f.voices.length, 2);
  const clock = { t: 0 };
  const g = new ProtoGame(f, [1, 0], 0, protoById("ladder"), { bpm: tempoOf(f.id), legato: false, twoHands: true }, fakeChip(clock));
  assert.equal(g.twoHands, true);
  assert.deepEqual(g.tracks.map((t) => t.voice), [1, 0]);
  const aid = g.others.filter((n) => n.aid);
  assert.ok(aid.length > 100 && aid.every((n) => n.voice === 0 || n.voice === 1), `${aid.length} notes the game plays for the hands`);
  // Without the option a prelude's two voices are not TWO HANDS.
  const plain = new ProtoGame(f, [1, 0], 0, protoById("ladder"), { bpm: tempoOf(f.id), legato: false }, fakeChip({ t: 0 }));
  assert.equal(plain.twoHands, false);
  assert.equal(plain.others.filter((n) => n.aid).length, 0);
});

test("D862: both hands played, each thumb its own hand, scores; the right hand alone does not", () => {
  for (const id of ["wtc1p13", "bwv772"]) {
    const both = playHands(id, (k) => (k === 0 ? "left" : "right")).r;
    assert.ok(both.right / both.of >= 0.97, `${id} both hands: ${both.right}/${both.of}`);
    // Judged per hand: the result's NOTES line gives each hand's tally.
    assert.match(both.sheet.qualities[0].detail, /LEFT HAND \d+\/\d+ · RIGHT HAND \d+\/\d+/);
    const rightOnly = playHands(id, () => "right", 1).r;
    assert.ok(rightOnly.right / rightOnly.of <= 0.7, `${id} the right hand alone: ${rightOnly.right}/${rightOnly.of}`);
  }
});

test("D950: TWO HANDS retired: the flag and the developer view no longer show it; the code dormant", async () => {
  const { TWO_HANDS_RETIRED } = await import("../src/touch/two-hands.ts");
  assert.equal(TWO_HANDS_RETIRED, true);
  const app = (await import("node:fs")).readFileSync(new URL("../src/bench/BenchApp.tsx", import.meta.url), "utf8");
  assert.match(app, /useState\(\(\) => !TWO_HANDS_RETIRED && APP\.lite && handsFlag\(\)\)/);
  assert.match(app, /\{!TWO_HANDS_RETIRED && \(handsProto \|\| \(APP\.lite && unlocked\(\)\)\) && phase\.kind === "home" && !intro && <HandsList/);
});
