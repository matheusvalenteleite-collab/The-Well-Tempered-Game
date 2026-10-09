import { test } from "node:test";
import assert from "node:assert/strict";
import { audibleGain, DEFAULT_SOUND, editSynth, restoreSound, setMix, shiftOctave } from "../src/audio/sound.ts";

test("D95 defaults: the three voices alike (recorded grand, a little room, no delay, centred), versions on their own", () => {
  for (const c of ["cantus", "counterpoint", "fux"] as const) {
    assert.equal(DEFAULT_SOUND.synth[c].sampleSet, "grand");
    assert.equal(DEFAULT_SOUND.synth[c].reverbMode, "room");
    assert.equal(DEFAULT_SOUND.synth[c].delayMode, "off");
    assert.equal(DEFAULT_SOUND.mix[c].pan, 0);
  }
  assert.ok(Object.values(DEFAULT_SOUND.versionFollows).every((f) => f === false));
  assert.equal(DEFAULT_SOUND.master.reverbMode, "off");
});

test("D95: editing one voice never changes another (no links)", () => {
  const s = editSynth(DEFAULT_SOUND, "cantus", { ...DEFAULT_SOUND.synth.cantus, tone: 3000 });
  assert.equal(s.synth.cantus.tone, 3000);
  assert.notEqual(s.synth.counterpoint.tone, 3000);
  assert.notEqual(s.synth.fux.tone, 3000);
  // An old stored state with links restores without them, and keeps its master defaults.
  const r = restoreSound({ ...DEFAULT_SOUND, links: { cantusCounterpoint: true } });
  assert.equal("links" in r, false);
  assert.deepEqual(r.master, DEFAULT_SOUND.master);
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
  assert.equal(restoreSound(null).synth.cantus.sampleSet, "grand");
});

test("each version has its own playback octave, clamped, defaulting to 0 (D66)", () => {
  const r = restoreSound({ versionOctave: { inversion: -1, canon: 7 } });
  assert.deepEqual(r.versionOctave, { inversion: -1, retrograde: 0, retroInversion: 0, canon: 3 });
  assert.deepEqual(restoreSound({}).versionOctave, { inversion: 0, retrograde: 0, retroInversion: 0, canon: 0 });
});
