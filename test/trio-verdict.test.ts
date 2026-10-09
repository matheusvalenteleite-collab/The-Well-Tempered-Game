import { test } from "node:test";
import assert from "node:assert/strict";
import { trioVerdict } from "../src/game/trio-verdict.ts";
import { slotLayout } from "../src/counterpoint/layout.ts";

const cantus = ["D4", "F4", "E4", "D4", "G4", "F4", "A4", "G4", "F4", "E4", "D4"];
const fux = ["A4", "A4", "G4", "A4", "B4", "D5", "C#5", "D5", "D5", "C#5", "D5"];
const layout = slotLayout("first", cantus.length);

test("D98: Fux's own line is 'identical'; one note changed is 'close'", () => {
  assert.equal(trioVerdict(cantus, fux, fux, layout).grade, "identical");
  const one = [...fux];
  one[4] = "C5";
  const v = trioVerdict(cantus, one, fux, layout);
  assert.equal(v.grade, "close");
  assert.equal(v.same, 10);
});

test("D98: a line far from Fux's is graded by how the three voices sound together", () => {
  // Fux's line a fifth lower throughout: parallel fifths with his, everywhere — a clash.
  const fifthBelow = ["D4", "D4", "C4", "D4", "E4", "G4", "F#4", "G4", "G4", "F#4", "G4"];
  const v = trioVerdict(cantus, fifthBelow, fux, layout);
  assert.notEqual(v.grade, "identical");
  assert.notEqual(v.grade, "close");
  assert.ok(v.clean < v.places);
});

test("D98: where the two lines double each other, the parallel unisons are closeness, not a fault", () => {
  const one = [...fux];
  one[4] = "C5";
  const v = trioVerdict(cantus, one, fux, layout);
  assert.ok(v.clean >= v.places - 2, `clean ${v.clean} of ${v.places}`);
});
