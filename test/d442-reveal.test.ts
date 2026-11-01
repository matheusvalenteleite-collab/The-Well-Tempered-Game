/**
 * D442, THE REVEAL (Prelude I/1, the Glenn pilot): the plan read from data/touch/ (one bass note a bar
 * first, the top joining at bar 5, every beat from bar 9, the tenor from 12, the slides from 20, the G and
 * C pedals held, the free line slid, the last chord); the whole prelude still sounds (the player's notes
 * taken out of the game's, the pedals' repeats left out); a beginner finishes it, a random tapper does not
 * keep the crowd.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { APP } from "../src/bench/config.ts";
import { barStart, fugueById } from "../src/touch/fugue.ts";
import { reveal, REVEAL_I1, stepAtBar } from "../src/bench/reveal.ts";
import { arcOf } from "../src/bench/arc.ts";
import { stageMode } from "../src/bench/stages.ts";
import { ex } from "../src/bench/manual/kit.ts";
import { playerRun } from "./d359-players.ts";
import { tapperRun } from "./d342-sim.ts";

const f = fugueById("wtc1p01");
const inBar = (n: number, on: number) => on >= barStart(f, n) && on < barStart(f, n + 1);

test("D442: the plan, bar by bar, from the prelude's own notes", () => {
  const rv = reveal(f, REVEAL_I1);
  const rh = rv.mine.get(0)!;
  const lh = rv.mine.get(1)!;
  for (let b = 1; b <= 4; b++) {
    assert.equal(rh.filter((n) => inBar(b, n[0])).length, 0, `bar ${b}: no right-hand note`);
    assert.equal(lh.filter((n) => inBar(b, n[0])).length, 1, `bar ${b}: one bass`);
  }
  assert.deepEqual(lh.filter((n) => n[0] < barStart(f, 5)).map((n) => n[2]), [60, 60, 59, 60], "C, C, B, C (as the data has them)");
  assert.equal(rh.filter((n) => inBar(5, n[0])).length, 1, "bar 5: the top joins");
  assert.equal(rh.filter((n) => inBar(9, n[0])).length + lh.filter((n) => inBar(9, n[0])).length, 4, "bar 9: one a beat");
  // The tenor from bar 12: one held note a bar, B♭ first (bar 12's tenor).
  const t12 = lh.find((n) => inBar(12, n[0]))!;
  assert.equal(t12[2], 58);
  // The pedals: G held from bar 24 to 32, C from 32 to 35.
  const g = lh.find((n) => inBar(24, n[0]))!;
  assert.equal(g[2], 43);
  assert.equal(g[0] + g[1], barStart(f, 32));
  const c = lh.find((n) => inBar(32, n[0]))!;
  assert.equal(c[2], 36);
  assert.equal(c[0] + c[1], barStart(f, 35));
  assert.ok(rv.drop.size > 0, "the pedals' repeated basses left out");
  // The slides (bars 20–23) and the free line (33–34): a struck note and its slid ones.
  assert.ok([...rv.traces.keys()].some((on) => inBar(20, on)) && [...rv.traces.keys()].some((on) => inBar(33, on)));
  assert.equal(stepAtBar(REVEAL_I1, 35).first.lh, "bass", "the last chord with both thumbs");
});

test("D442: only in the Glenn pilot, on LADDER; a beginner finishes, a random tapper does not", () => {
  assert.equal(arcOf(f)?.reveal, undefined, "play.html keeps D261's Prelude 1");
  assert.equal(stageMode(f, "mobile", "ladder"), "highway");
  APP.glennPilot = true;
  try {
    assert.equal(arcOf(f)?.reveal, REVEAL_I1);
    assert.equal(stageMode(f, "mobile", "ladder"), "ladder");
    const m = ex("wtc1p01", 0, 1, 35, { pct: 100 }, "Prelude I/1, whole");
    const weak = playerRun(m, { jitterMs: 150, offsetMs: 75, wrongEvery: 3, hold: "written", fail: true, seed: 3 });
    assert.equal(weak.failedBar, null, "the weakest João finishes");
    for (const seed of [1, 2, 3]) {
      const t = tapperRun(m, seed);
      assert.ok(t.right / Math.max(1, t.of) < 0.6, `tapper ${seed}: ${t.right}/${t.of}`);
    }
  } finally {
    APP.glennPilot = false;
  }
});
