import { test } from "node:test";
import assert from "node:assert/strict";
import { onSide, sideOf, touchDown, touchMove, touchUp, type Touches } from "../src/touch/thumbs.ts";
import { FUGUE, pitchRange } from "../src/touch/fugue.ts";

test("a touch takes the half where it lands", () => {
  assert.equal(sideOf(10, 390), "left");
  assert.equal(sideOf(194, 390), "left");
  assert.equal(sideOf(195, 390), "right");
});

test("a thumb keeps its half when it slides across the midline", () => {
  let s: Touches = new Map();
  s = touchDown(s, 1, 100, 50, 390, 0);
  s = touchMove(s, 1, 300, 60);
  assert.equal(s.get(1)!.side, "left");
  assert.deepEqual([s.get(1)!.x, s.get(1)!.y], [300, 60]);
});

test("two thumbs at once, one per half", () => {
  let s: Touches = new Map();
  s = touchDown(s, 1, 60, 200, 390, 0);
  s = touchDown(s, 2, 330, 210, 390, 5);
  assert.equal(onSide(s, "left").length, 1);
  assert.equal(onSide(s, "right").length, 1);
  s = touchUp(s, 1);
  assert.equal(onSide(s, "left").length, 0);
  assert.equal(onSide(s, "right").length, 1);
});

test("the C minor fugue is in three voices, 31 bars", () => {
  assert.equal(FUGUE.voices.length, 3);
  assert.equal(FUGUE.bars.length, 31);
  const { lo, hi } = pitchRange(FUGUE);
  assert.ok(lo >= 36 && hi <= 84, `range ${lo}-${hi}`);
});
