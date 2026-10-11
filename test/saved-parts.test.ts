import { test } from "node:test";
import assert from "node:assert/strict";
import { makePartsPiece, restorePartsPieces } from "../src/game/saved.ts";
import { DEFAULT_DRUMS } from "../src/audio/drums.ts";

// D155: pieces in three and four voices survive a round trip through storage; malformed ones are dropped.
test("saved pieces in three and four voices: kept, repaired, or dropped", () => {
  const p = makePartsPiece(
    { stepId: "fux-mode.q1.01", parts: [["F4", null], [], ["A3", "F3"], ["D3", "D3"]], sound: undefined as never, drums: true, drumKit: DEFAULT_DRUMS, continuo: false, continuoSettings: undefined as never, tuning: "equal", tempo: 72, volume: 60 },
    "mine",
  );
  const back = restorePartsPieces(JSON.parse(JSON.stringify([p, { id: "x", stepId: "y", parts: [[1, 2]] }, null])), () => DEFAULT_DRUMS);
  assert.equal(back.length, 1);
  assert.deepEqual(back[0].parts, p.parts);
  assert.equal(back[0].tempo, 72);
  assert.equal(back[0].drums, true);
  assert.equal(back[0].name, "mine");
});
