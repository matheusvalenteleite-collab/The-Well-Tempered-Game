import { test } from "node:test";
import assert from "node:assert/strict";
import { invertAbout, transformLine } from "../src/game/transform.ts";
import { restoreSound } from "../src/audio/sound.ts";
import { REST } from "../src/counterpoint/layout.ts";

const line = [REST, "D4", "F4", "E4", null, "C#4", "D4"];

test("inversion mirrors diatonically about the first note, dropping accidentals", () => {
  assert.equal(invertAbout("F4", 29), "B3"); // D4 is diatonic 29: a third up becomes a third down
  assert.deepEqual(transformLine(line, { inversion: true, retrograde: false }), [REST, "D4", "B3", "C4", null, "E4", "D4"]);
});

test("retrograde reverses the notes on the same rhythm; rests and gaps stay", () => {
  assert.deepEqual(transformLine(line, { inversion: false, retrograde: true }), [REST, "D4", "C#4", "E4", null, "F4", "D4"]);
});

test("both: retrograde of the inversion (same axis, so the order does not matter); off returns the original", () => {
  assert.deepEqual(transformLine(line, { inversion: true, retrograde: true }), [REST, "D4", "E4", "C4", null, "B3", "D4"]);
  assert.equal(transformLine(line, { inversion: false, retrograde: false }), line);
  assert.deepEqual(transformLine([null, REST], { inversion: true, retrograde: true }), [null, REST]);
});

test("the transform is restored from storage, defaulting to off", () => {
  assert.deepEqual(restoreSound({}).cpTransform, { inversion: false, retrograde: false });
  assert.deepEqual(restoreSound({ cpTransform: { inversion: true, retrograde: "x" } }).cpTransform, { inversion: true, retrograde: false });
});
