import { test } from "node:test";
import assert from "node:assert/strict";
import { compareWithFux } from "../src/counterpoint/compare-fux.ts";

test("comparison with Fux: criteria are reported for whichever side they favour", () => {
  const cf = ["D4", "F4", "E4", "D4", "G4", "F4", "A4", "G4", "F4", "E4", "D4"];
  const fux = ["A4", "A4", "G4", "A4", "B4", "C5", "C5", "B4", "D5", "C#5", "D5"];
  const player = ["D5", "D5", "C5", "F5", "E5", "D5", "C5", "D5", "F5", "C#5", "D5"];
  const diff = compareWithFux(cf, player, fux);
  assert.deepEqual(diff.map((d) => d.column), [0, 1, 2, 3, 4, 5, 7, 8]);
  const bar8 = diff.find((d) => d.column === 7)!; // player P5 vs Fux M3
  assert.equal(bar8.playerInterval, "P5");
  assert.equal(bar8.fuxInterval, "M3");
  assert.ok(bar8.fuxBetter.includes("imperfect"));
  const bar9 = diff.find((d) => d.column === 8)!; // player F5 = P8 over F4; Fux D5 = M6
  assert.ok(bar9.fuxBetter.includes("imperfect"));
  const bar4 = diff.find((d) => d.column === 3)!; // player F5 = m3 (m10) over D4; Fux A4 = P5
  assert.ok(bar4.playerBetter.includes("imperfect"));
});

test("repeated notes are not credited: no motion or singability bonus, and variety goes to the other side", () => {
  const cf = ["D4", "F4", "E4", "D4", "G4", "F4", "A4", "G4", "F4", "E4", "D4"];
  const fux = ["A4", "A4", "G4", "A4", "B4", "C5", "C5", "B4", "D5", "C#5", "D5"];
  const lazy = ["A4", "A4", "A4", "A4", "B4", "C5", "C5", "B4", "D5", "C#5", "D5"];
  const bar3 = compareWithFux(cf, lazy, fux).find((d) => d.column === 2)!;
  assert.ok(bar3.fuxBetter.includes("variety"));
  assert.ok(!bar3.playerBetter.includes("motion") && !bar3.playerBetter.includes("singable"));
});
