/**
 * D1033, PSYCH'S MOOG LIFTED ON A COMPUTER: its own lane (band-fx.ts krautrock `moog`), KRAUT2_MOOG_DESK_DB on a computer,
 * nothing on a phone (the phone's KRAUT2_MOOG_PHONE_LIFT already there; a phone's render identical, measured).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BAND_CHAINS, KRAUT2_MOOG_DESK_DB } from "../src/touch/band-fx.ts";
import { PATCHES } from "../src/touch/sound.ts";

test("D1033: PSYCH's Moog has its own lane, a computer's lift and none on a phone; no other PSYCH patch joins it", () => {
  assert.equal(PATCHES.k2Moog.lane, "moog");
  const lane = BAND_CHAINS.krautrock.lanes.moog as readonly { kind: string; db?: number; phoneDb?: number }[];
  assert.deepEqual(lane, [{ kind: "gain", db: KRAUT2_MOOG_DESK_DB, phoneDb: 0 }]);
  assert.ok(KRAUT2_MOOG_DESK_DB > 0 && KRAUT2_MOOG_DESK_DB <= 4, "about +3 dB");
  for (const [id, pt] of Object.entries(PATCHES)) if (id !== "k2Moog") assert.notEqual(pt.lane === "moog" && id.startsWith("k2"), true, id);
});
