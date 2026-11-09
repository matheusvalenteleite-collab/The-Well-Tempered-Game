/**
 * D543-D545: KRAUTROCK, ABBEY ROAD and PET SOUNDS rebuilt (scratchpad/bands2/STUDY.md; D560: promoted in their originals'
 * place): no piano, one instrument a voice from the top down, every lane a patch names is in the band's chain, the trims at
 * the end of the bus.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PATCHES, presetById, type PatchId } from "../src/touch/sound.ts";
import { BAND_CHAINS, buildChain } from "../src/touch/band-fx.ts";
import { homeStyleFor } from "../src/touch/drum-library.ts";
import { installFakeAudio } from "./fake-audio.ts";
import { Chip } from "../src/touch/chip.ts";

const ctxOf = installFakeAudio(0, false);
const BANDS = ["krautrock", "abbeyRoad", "petSounds"] as const;

test("D543-D545: the rebuilt rock bands: no piano, one instrument a voice, their lanes in the chain", () => {
  for (const band of BANDS) {
    const p = presetById(band);
    assert.equal(p.id, band);
    const lanes = new Set(Object.keys(BAND_CHAINS[band].lanes ?? {}));
    for (let n = 1; n <= 5; n++) {
      const row = p.by![n]!;
      assert.equal(row.length, n, `${band} ${n}`);
      if (n >= 2) assert.equal(new Set(row.map((r) => r[0])).size, n, `${band} ${n}: one instrument a voice`);
      for (const [id] of row) {
        const pt = PATCHES[id as PatchId];
        // D580: PET SOUNDS' tack piano back (the owner liked the piano); the other two none.
        if (band !== "petSounds") assert.notEqual(pt.sample, "piano", `${band}: ${id} is a piano`);
        const lane = p.lanes?.[id as PatchId] ?? pt.lane;
        if (lane) assert.ok(lanes.has(lane), `${band}: ${id}'s lane ${lane}`);
      }
    }
    if (band !== "petSounds") for (const id of p.slots ?? []) assert.notEqual(PATCHES[id as PatchId].sample, "piano");
    const last = BAND_CHAINS[band].bus.at(-1)!;
    assert.equal(last.kind, "gain", `${band}: the trim ends the bus`);
    // (D580: PET SOUNDS' -15.5: its hotter tape and louder chamber trimmed back to its level.)
    assert.ok(last.kind === "gain" && last.db < -9 && last.db > -16);
  }
  // The chains still build on one context.
  new Chip();
  const c = buildChain(ctxOf() as unknown as BaseAudioContext, BAND_CHAINS.abbeyRoad);
  assert.ok(c.lane("organ") && c.lane("guitar") && c.lane("bass"));
  c.dispose();
});

test("D543-D545: the bands' HOME drums kept", () => {
  assert.equal(homeStyleFor("krautrock"), "motorik");
  assert.equal(homeStyleFor("abbeyRoad"), "abbey");
  assert.equal(homeStyleFor("petSounds"), "pet");
});

test("D560: the v1 instruments gone from the bands (the rebuilt ones in their place)", () => {
  assert.ok(!presetById("krautrock").by![4]!.some((r) => r[0] === "krPiano"));
  assert.ok(!presetById("abbeyRoad").by![3]!.some((r) => r[0] === "abPiano"));
  assert.ok(!presetById("petSounds").by![4]!.some((r) => r[0] === "psPiano"));
});
