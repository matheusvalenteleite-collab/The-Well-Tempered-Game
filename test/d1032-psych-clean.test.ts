/**
 * D1032, PSYCH'S CLEAN GUITAR HEARD: the five-voice line-up's middle voice (k2Clean, a seat any player may take) sat 15-16 dB
 * under the loudest voice raw on both paths and 10-12 after the balance's caps; its lane now up KRAUT2_CLEAN_DB, the
 * per-sound balance (player-lift-data.ts SOUND_LOUD.krautrock[5]) re-measured on it (scan.cjs, I/22 b. 26 and I/4 b. 70).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BAND_CHAINS, KRAUT2_CLEAN_DB } from "../src/touch/band-fx.ts";
import { SOUND_LOUD } from "../src/touch/player-lift-data.ts";
import { BAND_TRIM_MAX_DB } from "../src/touch/player-lift.ts";
import { PATCHES, presetById } from "../src/touch/sound.ts";

test("D1032: PSYCH's clean guitar lane lifted; the five-voice balance has it within reach of the band, under the trims' cap", () => {
  const lane = BAND_CHAINS.krautrock.lanes.clean as readonly { kind: string; db?: number }[];
  assert.ok(lane.some((b) => b.kind === "gain" && b.db === KRAUT2_CLEAN_DB) && KRAUT2_CLEAN_DB > 0);
  assert.equal(PATCHES.k2Clean.lane, "clean");
  // The clean guitar seats only in the five-voice line-up (its lane moves no other count).
  const by = presetById("krautrock").by!;
  for (const [n, slots] of Object.entries(by)) assert.equal((slots ?? []).some(([p]) => p === "k2Clean"), n === "5", n);
  const row = SOUND_LOUD.krautrock[5];
  const comb = (x: readonly number[]) => (x[0] + x[1]) / 2;
  // Its level under the loudest voice: was 13-15 dB (phone) and 12 (computer); now within 7 on each, its trim under the cap.
  assert.ok(comb(row.b[2]) > -7, `phone ${row.b[2]}`);
  assert.ok(row.d!.b[2] > -7, `computer ${row.d!.b[2]}`);
  assert.ok(row.t[2] < BAND_TRIM_MAX_DB && row.d!.t[2] < BAND_TRIM_MAX_DB);
});
