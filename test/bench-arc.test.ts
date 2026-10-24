// D250: Prelude 1's arc: more of the figure section by section, the tempo rising, the pedal held, the final chord.
import { test } from "node:test";
import assert from "node:assert/strict";
import { barStart, fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { arcOf, lineAt, stepAt } from "../src/bench/arc.ts";

const P1 = fugueById("wtc1p01");
function game(mode: "highway" | "keys", voice = 0) {
  const clock = { t: 0 };
  const played: { midi: number; at: number }[] = [];
  const chip = {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: (midi: number, at: number) => (played.push({ midi, at }), { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {} }),
    swoosh() {}, tick() {}, groove: () => false, chime() {},
  } as unknown as Chip;
  const g = new ProtoGame(P1, voice, 0, protoById(mode), { bpm: 55, legato: false, easy: "leaps" }, chip);
  return { g, clock, played };
}
const struckIn = (g: ProtoGame, b: number) => g.notes.filter((n) => !n.ride && n.on >= barStart(P1, b) && n.on < barStart(P1, b + 1)).length;

test("D250: the figure passes to the player section by section (sparse, more, all; fewer under the pedal)", () => {
  const { g } = game("highway");
  const [a, b, c, d] = [2, 7, 15, 26].map((x) => struckIn(g, x));
  assert.ok(a < b && b < c, `${a} ${b} ${c}`);
  assert.ok(d < c, "under the pedal one thumb plays fewer notes");
  assert.equal(stepAt(P1, arcOf(P1)!.rides, barStart(P1, 30)), 1.4);
});

test("D250: the tempo rises 6% by b. 20 and holds through the pedal", () => {
  const arc = arcOf(P1)!;
  assert.equal(lineAt(P1, arc.tempo, barStart(P1, 1)), 1);
  assert.ok(Math.abs(lineAt(P1, arc.tempo, barStart(P1, 26)) - 1.06) < 1e-9);
  const { g } = game("highway");
  const t = (b: number) => (g as unknown as { timeAt: (x: number) => number }).timeAt(barStart(P1, b));
  const ratio = (t(3) - t(2)) / (t(27) - t(26));
  assert.ok(ratio > 1.04 && ratio < 1.07, String(ratio));
});

test("D250: the pedal has its own lane; the figure keeps to the others", () => {
  for (const mode of ["highway", "keys"] as const) {
    const { g } = game(mode);
    assert.ok(g.bassPedal && g.bassPedal.lane === 0);
    const lanes = g.lanesOf(0);
    g.notes.forEach((n, i) => {
      if (!n.ride && n.on >= g.bassPedal!.on && n.on < g.bassPedal!.end) assert.notEqual(lanes[i], 0, `${mode} note at ${n.on}`);
    });
  }
  assert.equal(game("highway", 1).g.bassPedal, null, "the left hand plays its own pedal: no challenge");
});

test("D250: held, the pedal sounds and scores; let go, the bass falls silent", () => {
  for (const hold of [true, false]) {
    const { g, clock, played } = game("keys");
    const p = g.bassPedal!;
    let n = 0;
    while (g.now < p.on - g.beat / 4 && n++ < 100000) (clock.t += 0.02), g.step();
    if (hold) g.keyDown(77, { code: "KeyA", side: "left" } as never, clock.t);
    const before = g.score;
    while (g.now < p.end + g.beat && n++ < 200000) (clock.t += 0.02), g.step();
    const tm = (x: number) => (g as unknown as { timeAt: (t: number) => number }).timeAt(x);
    const bass = played.filter((x) => x.midi === p.midi && x.at >= tm(p.on) - 0.01 && x.at < tm(p.end)).length;
    if (hold) {
      assert.ok(p.share > 0.9, `share ${p.share}`);
      assert.ok(g.score > before, "the pedal's bonus");
      assert.ok(bass >= 14, `the bass G sounds (${bass})`);
    } else {
      assert.equal(p.share, 0);
      assert.equal(bass, 0, "the bass silent");
    }
  }
});
