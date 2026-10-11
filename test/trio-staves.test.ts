import { test } from "node:test";
import assert from "node:assert/strict";
import { trioStaves } from "../src/ui/notation/trio-staves.ts";

test("three voices on two staves: by where each line lies", () => {
  // soprano, alto, bass
  assert.deepEqual(trioStaves([69, 62, 50]), { staff: [0, 0, 1], clefs: ["treble", "bass"] });
  // soprano, tenor, bass
  assert.deepEqual(trioStaves([69, 55, 48]).staff, [0, 1, 1]);
  // three high voices: the lowest takes the lower staff, in the treble clef
  assert.deepEqual(trioStaves([74, 69, 64]), { staff: [0, 0, 1], clefs: ["treble", "treble"] });
  // three low voices: the upper staff in the bass clef
  assert.deepEqual(trioStaves([50, 45, 40]), { staff: [0, 0, 1], clefs: ["bass", "bass"] });
});

test("four voices: two parts on each staff, the highest two above (D148)", async () => {
  const { quartetStaves } = await import("../src/ui/notation/trio-staves.ts");
  const r = quartetStaves([72, 66, 61, 50]);
  assert.deepEqual(r.staff, [0, 0, 1, 1]);
  assert.deepEqual(r.clefs, ["treble", "bass"]);
});
