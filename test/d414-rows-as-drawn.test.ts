/**
 * D414 (WTC 2.02): what you see is what you must do. LADDER's vertical rule against the music box's
 * drawing, over every two consecutive notes of every voice of the 48 (tools/touch/half-steps.ts), and the
 * half steps themselves: a semitone on one row (C then C♯) is stayed on, or slid toward its drawn block;
 * a semitone a row apart (E then F) is a step.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mismatches, pairs48 } from "../tools/touch/half-steps.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { chromaLiftPx, signatureOf } from "../src/touch/chroma.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { ladderMove, slideWay } from "../src/bench/ladder-rule.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { fakeChip } from "./d342-sim.ts";

test("D414: over the 48, no two consecutive notes where the box and the judge disagree (strikes and slides)", () => {
  const ps = pairs48();
  assert.ok(ps.length > 50000, String(ps.length));
  const bad = ps.flatMap((p) => mismatches(p).map((m) => `${p.piece} v${p.voice} b${p.bar} ${p.from}→${p.to}: ${m}`));
  assert.deepEqual(bad.slice(0, 5), []);
  // Before D414 a slide aimed at the bare row: the semitones on one row asked the other way, and more.
  const before = ps.filter((p) => mismatches(p, true).length).length;
  assert.ok(before > 3000, String(before));
  assert.ok(ps.filter((p) => mismatches(p, true).some((m) => m.startsWith("same row"))).length > 100);
  // The rows never go against the pitch and no row move is a repeated pitch (the score's spelling).
  assert.equal(ps.filter((p) => p.steps * p.semis < 0 || (p.steps !== 0 && p.semis === 0)).length, 0);
});

const R = 18;
test("D414: the half steps by the row rule: one row, stay (or a little either way); a row apart, a step", () => {
  // C then C♯ (one row, the sharp drawn a third of a row up): staying is right, so is following the shift, so is a row's lift.
  for (const moved of [0, 4, -4, 10, -10, 18]) assert.ok(ladderMove(0, moved, R).ok, String(moved));
  assert.equal(ladderMove(0, 3 * R, R).ok, false, "three rows away is not the same row");
  // E then F (a row up): up is right, level is right (the step leeway), clearly down is not.
  for (const moved of [10, 20, 0]) assert.ok(ladderMove(1, moved, R).ok, String(moved));
  assert.equal(ladderMove(1, -2 * R, R).ok, false);
  // A fourth (three rows): a clear move up.
  assert.ok(ladderMove(3, 30, R).ok);
  assert.equal(ladderMove(3, 0, R).ok, false);
});

/** The game's CLASSIC rows with D332's shift (as BenchApp's boxRows gives them). */
function liftedRows(key: string, rh = 10): Rows {
  const sig = signatureOf(key);
  return { yOf: (s) => 900 - s * rh, stepAt: (y) => Math.round((900 - y) / rh), rowH: rh, xOf: () => 400, lift: (s, m) => chromaLiftPx(rh, s, m, sig) };
}

test("D414: a slide aims at the block as drawn: C♯ after C is up, B♭ after B is down", () => {
  const f = fugueById("wtc1f01");
  const g = new ProtoGame(f, 0, 0, protoById("ladder"), { bpm: tempoOf(f.id), legato: false, until: f.barTicks, wait: false, solo: false, fail: false }, fakeChip({ t: 0 }));
  g.rows = liftedRows(f.key);
  const C = { step: 35, midi: 72 };
  const Cs = { step: 35, midi: 73 };
  const B = { step: 34, midi: 71 };
  const Bb = { step: 34, midi: 70 };
  const E = { step: 37, midi: 76 };
  const F = { step: 38, midi: 77 };
  assert.equal(g.drawnY(C), g.rows.yOf(35), "a note of the key on its row");
  assert.equal(g.rows.yOf(35) - g.drawnY(Cs), 4, "C♯ drawn 4 px up at 10 px rows (D332)");
  assert.equal(g.drawnY(Bb) - g.rows.yOf(34), 4, "B♭ drawn 4 px down");
  assert.equal(slideWay(g.drawnY(C), g.drawnY(Cs)), 1);
  assert.equal(slideWay(g.drawnY(B), g.drawnY(Bb)), -1);
  assert.equal(slideWay(g.drawnY(E), g.drawnY(F)), 1);
  assert.equal(slideWay(g.drawnY(F), g.drawnY(E)), -1);
  // Without the box's shift (a layout that draws none) a note's drawn place is its row.
  g.rows = { ...g.rows, lift: undefined };
  assert.equal(g.drawnY(Cs), g.rows.yOf(35));
});

/** Herr Bach's demonstration (the careful player: his thumbs land on the blocks as drawn, his slides go to them). */
function demo(id: string, voice: number, rows: Rows, coach?: "slide") {
  const clock = { t: 0 };
  const f = fugueById(id);
  const until = f.sections[0]?.to ?? 8 * f.barTicks;
  const g = new ProtoGame(f, voice, 0, protoById("ladder"), { bpm: tempoOf(id), legato: false, until, wait: false, solo: false, fail: false, demo: true, ...(coach ? { coach } : {}) }, fakeChip(clock));
  g.rows = rows;
  let done = false;
  while (!done && clock.t < 900) (clock.t += 1 / 120), (done = g.step());
  return { r: g.results(), slides: g.slides };
}

test("D414: the chromatic subjects (I/12, I/24, II/22) played on the drawn blocks, struck and slid, every note right", () => {
  for (const [id, v] of [["wtc1f12", 0], ["wtc1f24", 0], ["wtc2f22", 0], ["wtc2f22", 1]] as const) {
    const key = fugueById(id).key;
    for (const coach of [undefined, "slide"] as const) {
      const { r, slides } = demo(id, v, liftedRows(key), coach);
      assert.equal(r.right, r.of, `${id}/${v} ${coach ?? "struck"}: ${r.right}/${r.of}`);
      if (coach) assert.ok(slides > 0, `${id}/${v}: slid`);
    }
  }
});
