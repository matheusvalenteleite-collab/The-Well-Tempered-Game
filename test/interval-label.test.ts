// P9 (revised): the simple interval first, a compound one's number small beside it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { compoundParts, figureLabel, harmonic, intervalLabel, intervalNumber, simpleName } from "../src/counterpoint/interval.ts";

test("compound intervals: m3₁₀, 5₁₂, 8₁₅, 5₁₉", () => {
  assert.deepEqual(compoundParts(10), [8, 3]);
  assert.deepEqual(compoundParts(15), [8, 8]);
  assert.deepEqual(compoundParts(17), [15, 3]);
  assert.equal(intervalLabel(harmonic("C4", "Eb5")), "m3₁₀");
  assert.equal(intervalLabel(harmonic("C4", "G5")), "5₁₂");
  assert.equal(intervalLabel(harmonic("C4", "C6")), "8₁₅");
  assert.equal(intervalLabel(harmonic("C3", "G5")), "5₁₉");
  assert.equal(intervalLabel(harmonic("C4", "E4")), "M3");
  assert.equal(intervalNumber(10), "3₁₀");
  assert.equal(intervalNumber(6), "6");
  // The reduced name the game reasons with is unchanged.
  assert.equal(simpleName(harmonic("C4", "Eb5")), "m3");
});

test("figured-bass figures stay as printed", () => {
  assert.equal(figureLabel("9"), "9");
  assert.equal(figureLabel("6/4"), "6/4");
});
