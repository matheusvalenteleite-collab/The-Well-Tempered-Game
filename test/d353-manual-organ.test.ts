/**
 * D353: THE MANUAL's organ (I.4, I.5, II.3: "On the organ a note lasts exactly as long as your thumb")
 * is PIPE ORGAN, not the sampled organ D249 withdrew (presetById opened that on the harpsichord, whose
 * notes decay). Every voice an organ lesson sounds holds its level, and its recordings (the pedal, the
 * plenum above it) load. On the fake context of fake-audio.ts, with recordings.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio } from "./fake-audio.ts";
import { Chip } from "../src/touch/chip.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { loadedMidis, SAMPLED } from "../src/touch/sampled.ts";
import { offered, patchFor, presetById, RETIRED, sampledNow, setPreset } from "../src/touch/sound.ts";
import { PLAYED, SOUND_PRESET, soundOf } from "../src/bench/manual/lessons.ts";

installFakeAudio(5, true);

test("D353: every manual sound is one the game offers, none withdrawn (D249's RETIRED)", () => {
  for (const [name, id] of Object.entries(SOUND_PRESET)) {
    assert.ok(!(id in RETIRED), `${name}: ${id} withdrawn`);
    assert.equal(presetById(id).id, id, name);
    assert.ok(offered(id), name);
  }
  assert.equal(SOUND_PRESET.organ, "chamberOrgan");
});

test("D353: the organ lessons sound on PIPE ORGAN, every voice held (no decay), its recordings loaded", async () => {
  const stages = PLAYED.flatMap((l) => l.stages.filter((s) => soundOf(l, s.m) === "organ").map((s) => ({ l, m: s.m })));
  assert.deepEqual([...new Set(stages.map((s) => s.l.id))], ["I.4", "I.5", "II.3"]);
  for (const { l, m } of stages) {
    setPreset(SOUND_PRESET[soundOf(l, m)]);
    assert.equal(presetById(SOUND_PRESET[soundOf(l, m)]).name, "PIPE ORGAN");
    const f = fugueById(m.piece);
    for (let v = 0; v < f.voices.length; v++) {
      const pt = patchFor(v, f.voices.length);
      assert.ok(pt, `${l.id} voice ${v}`);
      assert.equal(pt!.amp.s, 1, `${l.id} voice ${v}: held at its level`);
      if (pt!.sample) assert.equal(SAMPLED[pt!.sample].plucked, false, `${l.id} voice ${v}: not plucked`);
    }
    // The recorded pedal (PIPE ORGAN's only recording) and the plenum above it (sampled.ts organPedal.above).
    assert.deepEqual(sampledNow(), ["organPedal"]);
    const chip = new Chip();
    await chip.prepare(
      f.voices.flat().map((n) => n[2]),
      (f.voices[m.voice] ?? []).map((n) => n[2]),
    );
    const { set, above } = SAMPLED.organPedal;
    assert.ok(loadedMidis(set).length > 0, `${l.id}: the pedal's recordings`);
    assert.ok(loadedMidis(above!.set).length > 0, `${l.id}: the plenum's recordings`);
  }
});
