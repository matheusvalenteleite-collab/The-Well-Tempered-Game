import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { PRESETS } from "../src/touch/sound.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { POP_SOUNDS } = await import("../src/bench/PlayPop.tsx");

test("D292, D297, D302, D304: the friends' pop-up offers the players' sounds (the five, then the ten new presets), in their order", () => {
  assert.deepEqual(POP_SOUNDS.map(([id]) => id), PRESETS.map((p) => p.id));
  assert.deepEqual(POP_SOUNDS.map(([, name]) => name), ["CLASSIC CHIP", "GAME BOY", "HARPSICHORD", "PIANO", "SWITCHED-ON", "SUPER 16-BIT", "NOCTURNE 32-BIT", "MEGA FM", "SID 64", "TRACKER", "PIPE ORGAN", "VOCAL SYNTH", "SOLO VOICES", "TOMITA", "STRING CONSORT", "LUTE", "BAROQUE BAND", "CLAVICHORD"]);
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
  // D355: each fugue its own sound again (tools/touch/colour-plans): I/22 sung.
  assert.equal(soundFor("wtc1f22", {}, "bossa"), "soloVoices", "D355");
  assert.equal(soundFor("wtc1f07", { wtc1f07: "clarinetTrio" }, "bossa"), "chip", "D288: a stored ensemble plays chip");
  assert.equal(soundFor("wtc2f22", { wtc2f22: "organSampled" }, "bossa"), "harpsichordSampled");
  assert.equal(soundFor("wtc1f22", { wtc1f22: "analog" }, "harpsichordSampled"), "analog");
  // D294: a stored choice of the two sounds replaced opens on their successors.
  assert.equal(soundFor("wtc1f22", { wtc1f22: "pianoFm" }, "chip"), "analog");
  assert.equal(soundFor("wtc1f22", { wtc1f22: "chipRound" }, "chip"), "gameboy");
  // D292: a stored choice of a withdrawn sound opens as one of the five.
  assert.equal(soundFor("wtc1f22", { wtc1f22: "bossa" }, "harpsichordSampled"), "chip");
  assert.equal(soundFor("nope", {}, "harpsichordSampled"), "harpsichordSampled");
});

test("D246: the pop-up's row holds the piece's own sound, marked", async () => {
  const { popSounds } = await import("../src/bench/PlayPop.tsx");
  // D292: every piece's own sound is among the five: the row is always the five, the piece's own marked.
  const p4 = popSounds("wtc1p04");
  assert.equal(p4.length, 18, "D304: the five and the ten; D365: and STRING CONSORT and LUTE; D430: BAROQUE BAND; D501: CLAVICHORD");
  assert.deepEqual(p4.filter(([, , own]) => own).map(([id]) => id), ["chip"]);
  // D355: a fugue's own sound (I/22: SOLO VOICES) marked.
  const antico = popSounds("wtc1f22");
  assert.equal(antico.length, 18);
  assert.equal(antico[0][0], "chip", "the row in its order");
  assert.deepEqual(antico.filter(([, , own]) => own).map(([id]) => id), ["soloVoices"]);
  assert.ok(antico.every(([id]) => id !== "organSampled"));
  const harp = popSounds("wtc1p01");
  assert.equal(harp.length, 18);
  assert.deepEqual(harp.filter(([, , own]) => own).map(([id]) => id), ["harpsichordSampled"]);
});
