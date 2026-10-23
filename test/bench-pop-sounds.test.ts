import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { PRESETS } from "../src/touch/sound.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { POP_SOUNDS } = await import("../src/bench/PlayPop.tsx");

test("D240: the friends' pop-up offers the harpsichord, four ensembles and six console sounds, every one a preset", () => {
  assert.equal(POP_SOUNDS.length, 11);
  for (const [id] of POP_SOUNDS) assert.ok(PRESETS.some((p) => p.id === id), id);
  assert.equal(POP_SOUNDS.filter(([id]) => id.startsWith("chip")).length, 6);
});
