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
  // D249: the organ withdrawn: no piece opens on it, and a stored choice of it opens on the harpsichord.
  assert.ok(!Object.values(PIECE_SOUND).includes("organSampled"), "no piece on the organ");
  assert.equal(soundFor("wtc1f22", {}, "bossa"), "harpsichordSampled");
  assert.equal(soundFor("wtc1f22", { wtc1f22: "organSampled" }, "bossa"), "harpsichordSampled");
  assert.equal(soundFor("wtc1f22", { wtc1f22: "bossa" }, "harpsichordSampled"), "bossa");
  assert.equal(soundFor("nope", {}, "harpsichordSampled"), "harpsichordSampled");
});

test("D246: the pop-up's row holds the piece's own sound, marked", async () => {
  const { popSounds } = await import("../src/bench/PlayPop.tsx");
  // A piece whose own sound is not among the eleven: first, marked (D249: no longer the organ).
  const strings = popSounds("wtc1p04");
  assert.deepEqual(strings[0], ["strings", "STRINGS", true]);
  assert.equal(strings.length, 12);
  // D249: the stile antico fugues open on the harpsichord, among the eleven.
  const antico = popSounds("wtc1f22");
  assert.equal(antico.length, 11);
  assert.deepEqual(antico.filter(([, , own]) => own).map(([id]) => id), ["harpsichordSampled"]);
  assert.ok(antico.every(([id]) => id !== "organSampled"));
  const harp = popSounds("wtc1p01");
  assert.equal(harp.length, 11);
  assert.deepEqual(harp.filter(([, , own]) => own).map(([id]) => id), ["harpsichordSampled"]);
});
