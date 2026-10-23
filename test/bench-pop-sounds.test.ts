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

test("D246: every piece has its own sound, a real preset; the player's choice for a piece wins", async () => {
  const { PIECES } = await import("../src/touch/fugue.ts");
  const { PIECE_SOUND, soundFor } = await import("../src/touch/piece-sound.ts");
  const { presetById } = await import("../src/touch/sound.ts");
  for (const p of PIECES) {
    const id = PIECE_SOUND[p.id];
    assert.ok(id, `${p.id} has a sound`);
    assert.equal(presetById(id).id, id, `${p.id}: ${id} is a preset`);
  }
  assert.equal(soundFor("wtc1f22", {}, "harpsichordSampled"), "organSampled");
  assert.equal(soundFor("wtc1f22", { wtc1f22: "bossa" }, "harpsichordSampled"), "bossa");
  assert.equal(soundFor("nope", {}, "harpsichordSampled"), "harpsichordSampled");
});

test("D246: the pop-up's row holds the piece's own sound, marked", async () => {
  const { popSounds } = await import("../src/bench/PlayPop.tsx");
  const organ = popSounds("wtc1f22");
  assert.deepEqual(organ[0], ["organSampled", "ORGAN", true]);
  assert.equal(organ.length, 12);
  const harp = popSounds("wtc1p01");
  assert.equal(harp.length, 11);
  assert.deepEqual(harp.filter(([, , own]) => own).map(([id]) => id), ["harpsichordSampled"]);
});
