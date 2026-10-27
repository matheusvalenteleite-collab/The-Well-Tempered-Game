import { test } from "node:test";
import assert from "node:assert/strict";
import { strike, strikeNext, type LaneNote, type LaneOptions } from "../src/touch/lanes.ts";

const notes = (): LaneNote[] =>
  [0, 100, 200].map((on, i) => ({ on, dur: 100, midi: 60 + i, state: "pending" }) as unknown as LaneNote);
const o = { early: 60, late: 60, hold: 0.5, split: true, floor: 10 } as LaneOptions;

test("D331: a touch on a struck note's side of the halfway line takes the next note", () => {
  const n = notes();
  assert.equal(strike(n, 102, o), 1);
  // 140: nearer note 1 (struck) than note 2, but within note 2's early window.
  assert.equal(strike(n, 140, o), -1);
  assert.equal(strikeNext(n, 140, o, 4), 2);
});

test("D331: a rolling thumb's second contact right after a strike is not given to the next note", () => {
  const n = notes();
  assert.equal(strike(n, 102, o), 1);
  assert.equal(strikeNext(n, 110, o, 4), -1);
});

test("D331: beyond the next note's early window nothing is taken", () => {
  const n = notes();
  assert.equal(strike(n, 102, o), 1);
  assert.equal(strikeNext(n, 135, o, 4), -1);
});
