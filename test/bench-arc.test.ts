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

test("D252: both hands: the left thumb's lanes and pedals, the right thumb's figure in its own lanes", () => {
  for (const mode of ["highway", "keys"] as const) {
    const { g } = game(mode);
    assert.ok(g.hands && g.tracks.length === 2 && g.tracks[1].voice === 1);
    const left = g.laneRegion(1);
    const right = g.laneRegion(0);
    assert.deepEqual(g.pedals.map((p) => p.name), ["G", "C"]);
    for (const p of g.pedals) assert.ok(p.lane >= left.from && p.lane < left.from + left.count, `${mode}: pedal ${p.name} in the left hand's lanes`);
    g.lanesOf(0).forEach((l, i) => assert.ok(g.notes[i].ride || (l >= right.from && l < right.from + right.count), `${mode}: right hand note ${i} in lane ${l}`));
    g.lanesOf(1).forEach((l, i) => assert.ok(g.tracks[1].notes[i].ride || (l >= left.from && l < left.from + left.count), `${mode}: left hand note ${i} in lane ${l}`));
    for (const n of g.tracks[1].notes) for (const p of g.pedals) assert.ok(n.on < p.on || n.on >= p.end, "under a pedal the left hand plays itself");
    assert.ok(!g.tracks[1].notes.some((n) => n.on < barStart(P1, 5)), "the left hand joins at b. 5");
  }
  assert.equal(game("highway", 1).g.bassPedal, null, "the left hand's game: no pedal challenge");
});

test("D252: the figure repeated within its bar asks for the lower row", () => {
  const { g } = game("highway");
  const b = barStart(P1, 15);
  const heads = g.notes.map((n, i) => i).filter((i) => !g.notes[i].ride && g.notes[i].on >= b && g.notes[i].on < b + P1.barTicks);
  const rows = heads.map((i) => g.rowOf(i, 0));
  assert.deepEqual(rows, [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
});

test("D250: held, the pedal sounds and scores; let go, the bass falls silent", () => {
  for (const hold of [true, false]) {
    const { g, clock, played } = game("keys");
    const p = g.bassPedal!;
    let n = 0;
    while (g.now < p.on - g.beat / 4 && n++ < 100000) (clock.t += 0.02), g.step();
    if (hold) g.keyDown(77, { code: "KeyS", side: "left" } as never, clock.t);
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

test("D254: under the pedal the right thumb a little over the line still plays the right hand (no stray ✕)", () => {
  const { g, clock } = game("highway");
  const W = 390, H = 844;
  const runTo = (t: number) => { while (clock.t < t - 0.02) (clock.t += 0.02), g.step(); };
  const p = g.pedals[0];
  runTo(g.timeAt(p.on) - 0.2);
  g.down(1, { side: "left", x: 1.5 * W / 5, y: H - 160, w: W, h: H }, performance.now());
  assert.equal(g.pedals[0].id, 1, "the pedal taken");
  const t = g.tracks[0];
  const heads = t.notes.map((n, i) => ({ n, i })).filter(({ n, i }) => !n.ride && !(i > 0 && t.notes[i - 1].on === n.on) && n.on >= p.on && n.on < p.on + 2 * P1.barTicks);
  const stray0 = g.stray;
  let id = 10, over = 0;
  for (const { n, i } of heads) {
    runTo(g.timeAt(n.on));
    const lane = g.lanesOf(0)[i];
    // lane 2's notes struck just left of the line, in the left hand's lane 1.
    const x = lane === 2 ? (2 * W) / 5 - 6 : ((lane + 0.5) / 5) * W;
    if (lane === 2) over++;
    g.down(++id, { side: "right", x, y: g.rowOf(i, 0) ? H - 60 : H - 160, w: W, h: H }, performance.now());
    g.step();
    assert.notEqual(g.grade?.text, "✕", `bar note at ${n.on}`);
    g.up(id, performance.now());
  }
  assert.ok(over > 0);
  assert.equal(g.stray, stray0);
  assert.equal(g.pedals[0].id, 1, "the pedal still held");
});
