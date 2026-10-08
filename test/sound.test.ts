import { test } from "node:test";
import assert from "node:assert/strict";
import { audibleGain, DEFAULT_SOUND, editSynth, linkedGroup, linkNeedsConfirm, restoreSound, setLink, setMix, shiftOctave } from "../src/audio/sound.ts";

test("defaults: cantus and contrapunctus share the Gould piano; Fux has his own harpsichord", () => {
  assert.equal(DEFAULT_SOUND.synth.counterpoint.model, "piano");
  assert.equal(DEFAULT_SOUND.synth.fux.model, "pluck");
  assert.deepEqual(linkedGroup(DEFAULT_SOUND, "cantus"), ["cantus", "counterpoint"]);
  assert.deepEqual(linkedGroup(DEFAULT_SOUND, "fux"), ["fux"]);
});

test("editing a linked voice edits its group; unlinked voices stay", () => {
  const s = editSynth(DEFAULT_SOUND, "cantus", { ...DEFAULT_SOUND.synth.cantus, tone: 3000 });
  assert.equal(s.synth.counterpoint.tone, 3000);
  assert.notEqual(s.synth.fux.tone, 3000);
  const u = setLink(s, "cantusCounterpoint", false);
  const e = editSynth(u, "cantus", { ...u.synth.cantus, tone: 1000 });
  assert.equal(e.synth.counterpoint.tone, 3000);
});

test("linking voices that differ asks first, then takes the Contrapunctus settings", () => {
  assert.equal(linkNeedsConfirm(DEFAULT_SOUND, "counterpointFux"), true);
  const s = setLink(DEFAULT_SOUND, "counterpointFux", true);
  assert.equal(s.synth.fux.model, "piano");
  assert.deepEqual(linkedGroup(s, "fux"), ["cantus", "counterpoint", "fux"]);
});

test("mute and solo", () => {
  let s = setMix(DEFAULT_SOUND, "fux", { solo: true });
  assert.equal(audibleGain(s, "cantus"), 0);
  assert.equal(audibleGain(s, "fux"), 1);
  s = setMix(s, "fux", { mute: true });
  assert.equal(audibleGain(s, "fux"), 0);
});

test("octave shift and restore", () => {
  assert.equal(shiftOctave("C#4", 2), "C#6");
  assert.equal(shiftOctave("Bb2", -3), "Bb-1");
  assert.equal(restoreSound({ fuxOctave: 9 }).fuxOctave, 3);
  assert.equal(restoreSound(null).synth.cantus.model, "piano");
});
