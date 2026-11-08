/**
 * D543-D545: KRAUTROCK v2, ABBEY ROAD v2 and PET SOUNDS v2 rebuilt (scratchpad/bands2/STUDY.md): no piano, one instrument a
 * voice from the top down, every lane a patch names is in the band's chain, the trims at the end of the bus.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PATCHES, presetById, V2_OWN, type PatchId } from "../src/touch/sound.ts";
import { BAND_CHAINS, buildChain } from "../src/touch/band-fx.ts";
import { installFakeAudio } from "./fake-audio.ts";
import { Chip } from "../src/touch/chip.ts";

const ctxOf = installFakeAudio(0, false);
const BANDS = ["krautrock", "abbeyRoad", "petSounds"] as const;

test("D543-D545: the rebuilt rock v2s: no piano, one instrument a voice, their lanes in the chain", () => {
  for (const band of BANDS) {
    const p = presetById(`${band}V2`);
    assert.ok(V2_OWN[band], band);
    const lanes = new Set(Object.keys(BAND_CHAINS[band].lanes ?? {}));
    for (let n = 1; n <= 5; n++) {
      const row = p.by![n]!;
      assert.equal(row.length, n, `${band} ${n}`);
      if (n >= 2) assert.equal(new Set(row.map((r) => r[0])).size, n, `${band} ${n}: one instrument a voice`);
      for (const [id] of row) {
        const pt = PATCHES[id as PatchId];
        assert.notEqual(pt.sample, "piano", `${band}: ${id} is a piano`);
        const lane = p.lanes?.[id as PatchId] ?? pt.lane;
        if (lane) assert.ok(lanes.has(lane), `${band}: ${id}'s lane ${lane}`);
      }
    }
    for (const id of p.slots ?? []) assert.notEqual(PATCHES[id as PatchId].sample, "piano");
    const last = BAND_CHAINS[band].bus.at(-1)!;
    assert.equal(last.kind, "gain", `${band}: the trim ends the bus`);
    assert.ok(last.kind === "gain" && last.db < -9 && last.db > -15);
  }
  // The chains still build on one context.
  new Chip();
  const c = buildChain(ctxOf() as unknown as BaseAudioContext, BAND_CHAINS.abbeyRoad);
  assert.ok(c.lane("organ") && c.lane("guitar") && c.lane("bass"));
  c.dispose();
});

test("D543-D545: the originals keep their instruments (defaults unchanged)", () => {
  assert.ok(presetById("krautrock").by![4]!.some((r) => r[0] === "krPiano"));
  assert.ok(presetById("abbeyRoad").by![3]!.some((r) => r[0] === "abPiano"));
  assert.ok(presetById("petSounds").by![4]!.some((r) => r[0] === "psPiano"));
});
