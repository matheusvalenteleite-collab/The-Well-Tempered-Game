import { test } from "node:test";
import assert from "node:assert/strict";
import { deviation, frequency } from "../src/audio/temperament.ts";

const cents = (a: string, b: string, t: Parameters<typeof frequency>[1]) => 1200 * Math.log2(frequency(b, t) / frequency(a, t));

test("equal temperament: A4 = 440, fifths 700 cents", () => {
  assert.ok(Math.abs(frequency("A4") - 440) < 1e-9);
  assert.ok(Math.abs(cents("D4", "A4", "equal") - 700) < 1e-9);
});

test("pythagorean: pure fifths (3:2)", () => {
  assert.ok(Math.abs(frequency("A4", "pythagorean") / frequency("D4", "pythagorean") - 1.5) < 1e-9);
});

test("quarter-comma meantone: pure major thirds (5:4), G# != Ab", () => {
  assert.ok(Math.abs(frequency("E4", "meantone") / frequency("C4", "meantone") - 1.25) < 1e-9);
  assert.ok(Math.abs(cents("G#4", "Ab4", "meantone") - 41.06) < 0.05); // the lesser diesis
  assert.equal(deviation("D4", "meantone"), 0);
});

test("Werckmeister III by pitch class, anchored on D", () => {
  assert.equal(deviation("D3", "werckmeister3"), 0);
  assert.ok(Math.abs(deviation("C4", "werckmeister3") - 7.82) < 1e-9);
  assert.equal(deviation("G#4", "werckmeister3"), deviation("Ab4", "werckmeister3"));
});
