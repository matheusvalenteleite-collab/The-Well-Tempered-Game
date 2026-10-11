// P9: compound intervals shown with their octave and the simple interval they add.
import { test } from "node:test";
import assert from "node:assert/strict";
import { compoundParts, figureLabel, harmonic, intervalLabel, simpleName } from "../src/counterpoint/interval.ts";

test("compound intervals: 10 [8+3], 12 [8+5], 15 [8+8], 17 [15+3]", () => {
  assert.deepEqual(compoundParts(10), [8, 3]);
  assert.deepEqual(compoundParts(15), [8, 8]);
  assert.deepEqual(compoundParts(17), [15, 3]);
  assert.equal(intervalLabel(harmonic("C4", "Eb5")), "m10 [8+m3]");
  assert.equal(intervalLabel(harmonic("C4", "G5")), "12 [8+5]");
  assert.equal(intervalLabel(harmonic("C4", "C6")), "15 [8+8]");
  assert.equal(intervalLabel(harmonic("C4", "D5")), "M9 [8+M2]");
  assert.equal(intervalLabel(harmonic("C4", "E4")), "M3");
  // The reduced name the game reasons with is unchanged.
  assert.equal(simpleName(harmonic("C4", "Eb5")), "m3");
});

test("figures: compound numbers written out, the rest untouched", () => {
  assert.equal(figureLabel("9"), "9 [8+2]");
  assert.equal(figureLabel("#10"), "#10 [8+3]");
  assert.equal(figureLabel("6"), "6");
  assert.equal(figureLabel("c.p."), "c.p.");
});
