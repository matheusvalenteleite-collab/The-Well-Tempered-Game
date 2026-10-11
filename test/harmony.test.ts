import { test } from "node:test";
import assert from "node:assert/strict";
import { cadenceOf, chordOf, degreeOf, figuresOf } from "../src/tutorial/harmony.ts";

test("harmony (D150): degrees in major and minor keys", () => {
  assert.deepEqual(
    [["C4", "E4", "G4"], ["D4", "F4", "A4"], ["E4", "G4", "B4"], ["F4", "A4", "C5"], ["G4", "B4", "D5"], ["A4", "C5", "E5"], ["B4", "D5", "F5"]].map((c) => degreeOf(c, "C")),
    ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
  );
  assert.equal(degreeOf(["A3", "C4", "E4"], "a"), "i");
  assert.equal(degreeOf(["E4", "G#4", "B4"], "a"), "V");
  assert.equal(degreeOf(["E4", "G4", "B4"], "a"), "v");
  assert.equal(degreeOf(["G3", "B3", "D4", "F4"], "C"), "V7");
  assert.equal(degreeOf(["B3", "D4", "F4", "A4"], "C"), "viiø7");
  assert.equal(degreeOf(["D3", "F#3", "A3"], "G"), "V");
});

test("harmony (D150): figures over the bass, triads and sevenths, octave doublings and compounds", () => {
  assert.deepEqual([["C4", "E4", "G4"], ["E4", "G4", "C5"], ["G4", "C5", "E5"], ["C3", "G3", "E4", "C5"]].map(figuresOf), ["53", "63", "64", "53"]);
  assert.deepEqual([["G3", "B3", "D4", "F4"], ["B3", "D4", "F4", "G4"], ["D4", "F4", "G4", "B4"], ["F3", "G3", "B3", "D4"]].map(figuresOf), ["7", "65", "43", "42"]);
  assert.equal(chordOf(["C4", "D4", "E4"]), null);
});

test("harmony (D150): cadences", () => {
  assert.equal(cadenceOf(["G2", "D4", "G4", "B4"], ["C3", "C4", "E4", "C5"], "C"), "authentic");
  assert.equal(cadenceOf(["F2", "C4", "F4", "A4"], ["C3", "C4", "E4", "G4"], "C"), "plagal");
  assert.equal(cadenceOf(["G2", "D4", "G4", "B4"], ["A2", "C4", "E4", "C5"], "C"), "deceptive");
  assert.equal(cadenceOf(["D3", "A3", "D4", "F4"], ["E3", "B3", "E4", "G#4"], "a"), "half");
  assert.equal(cadenceOf(["E3", "B3", "E4", "G#4"], ["A2", "C4", "E4", "A4"], "a"), "authentic");
});

