/**
 * D445, THE SCORING REDESIGNED: the grade from the performance alone (rounded once); the streak bonus in
 * gentle steps (+10% every 16 right notes, up to +50%, a slip one step off); the crowd listening to the
 * last dozen notes (a wrong note less badly than one let go by; never empty in the first notes); and, on
 * real fugues with the simulated beginner, a better player never scores or grades lower, no cliff between
 * one slip in 7 and one in 8, the clean player reaches S, and a random tapper is turned away.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Crowd, CROWD_LEAVE, gradeFor, GRACE_NOTES, streakFactor, STREAK_STEPS } from "../src/bench/scoring.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { defaultVoice } from "../src/bench/flow.ts";
import { ex } from "../src/bench/manual/kit.ts";
import { playerRun } from "./d359-players.ts";

test("D445: the grade from the performance alone, rounded once", () => {
  assert.deepEqual([94.5, 94.4, 90, 89.6, 80, 70, 69.4].map(gradeFor), ["S", "A", "A", "A", "B", "C", "D"]);
  assert.deepEqual([0, 1, 5, 9].map(streakFactor), [1, 1.1, 1.5, 1.5]);
  assert.equal(STREAK_STEPS, 5);
});

test("D445: the crowd: a wrong note costs less than a note let go by; never empty in the round's first notes; a run of good notes fills it", () => {
  const wrong = new Crowd();
  const missed = new Crowd();
  for (let k = 0; k < 6; k++) wrong.hear(0.2), missed.hear(0);
  assert.ok(wrong.level > missed.level);
  const early = new Crowd();
  for (let k = 0; k < GRACE_NOTES - 1; k++) early.hear(0);
  assert.ok(early.meter() > 0, "grace");
  early.hear(0);
  assert.equal(early.meter(), 0);
  const back = new Crowd();
  for (let k = 0; k < 40; k++) back.hear(1);
  assert.ok(back.meter() > 0.95);
  assert.ok(CROWD_LEAVE > 0.4);
});

const LEVELS: [number, number, number][] = [
  [150, 75, 3],
  [130, 65, 4],
  [110, 55, 5],
  [90, 45, 6],
  [60, 30, 10],
  [25, 10, 1000],
];
const RANK = ["D", "C", "B", "A", "S"];

for (const id of ["wtc1f22", "wtc1f23"]) {
  test(`D445: ${id}: a better player never scores or grades lower; the clean player reaches S`, () => {
    const f = fugueById(id);
    const v = defaultVoice(f, f.voices.map((_, i) => i), { fresh: true });
    const m = ex(id, v, 1, f.bars[f.bars.length - 1].n, { pct: 100 }, "whole", { reading: "busoni" });
    let last: { final: number; grade: string } | null = null;
    for (const [j, o, w] of LEVELS) {
      const r = playerRun(m, { jitterMs: j, offsetMs: o, wrongEvery: w, hold: 0.7, fail: true, seed: 3 });
      if (r.failedBar !== null) continue;
      const now = { final: r.sheet.final, grade: r.grade };
      if (last) {
        assert.ok(now.final >= last.final, `${id}: ${now.final} after ${last.final}`);
        assert.ok(RANK.indexOf(now.grade) >= RANK.indexOf(last.grade), `${id}: ${now.grade} after ${last.grade}`);
      }
      last = now;
    }
    assert.equal(last?.grade, "S");
  });
}

test("D445: no cliff: one slip in 7 and one in 8 score within a tenth of each other (I/1)", () => {
  const f = fugueById("wtc1f01");
  const v = defaultVoice(f, f.voices.map((_, i) => i), { fresh: true });
  const m = ex("wtc1f01", v, 1, f.bars[f.bars.length - 1].n, { pct: 100 }, "whole", { reading: "busoni" });
  const [a, b] = [7, 8].map((w) => playerRun(m, { jitterMs: 20, offsetMs: 0, wrongEvery: w, hold: 0.7, fail: true, seed: 3 }).sheet.final);
  assert.ok(Math.abs(a - b) <= 0.1 * Math.max(a, b), `${a} vs ${b}`);
});

test("D445: a player getting one note in two wrong is turned away by the crowd (I/1)", () => {
  const f = fugueById("wtc1f01");
  const v = defaultVoice(f, f.voices.map((_, i) => i), { fresh: true });
  const m = ex("wtc1f01", v, 1, f.bars[f.bars.length - 1].n, { pct: 100 }, "whole", { reading: "busoni" });
  for (const seed of [3, 11]) assert.notEqual(playerRun(m, { jitterMs: 200, offsetMs: 100, wrongEvery: 2, hold: 0.7, fail: true, seed }).failedBar, null);
});
