/**
 * D800-D803: BERLIN SCHOOL reworked, three versions for the owner's ear (sound.ts TRIALS: WARM, MODULAR, CLEAR). Trials
 * only: presetById finds them, nothing offers them, no piece's default moves (its six keep BERLIN SCHOOL until the owner
 * picks); each keeps BERLIN SCHOOL's line-ups (the same voices on the same seats, CLEAR wider) and its space, and is
 * synthesized (no recordings: nothing read past STRETCH_MAX, no octave moved).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PATCHES, PRESETS, TRIALS, presetById } from "../src/touch/sound.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { readFileSync } from "node:fs";

const VERSIONS = ["berlinWarm", "berlinModular", "berlinClear"] as const;

test("D800-D803: the three BERLIN SCHOOL versions are trials, synthesized, on BERLIN SCHOOL's seats; no piece moved", () => {
  const base = presetById("berlinSchool");
  for (const id of VERSIONS) {
    const p = presetById(id);
    assert.equal(p.id, id);
    assert.ok(TRIALS.some((t) => t.id === id) && !PRESETS.some((t) => t.id === id) && !readFileSync(new URL("../src/bench/PlayPop.tsx", import.meta.url), "utf8").includes(`"${id}"`), id);
    assert.equal(p.fx, base.fx);
    for (const n of [1, 2, 3, 4, 5]) {
      assert.equal(p.by![n]!.length, base.by![n]!.length, `${id} ${n}`);
      for (const [pid] of p.by![n]!) assert.ok(PATCHES[pid] && !PATCHES[pid].sample, `${id}: ${pid} synthesized`);
    }
  }
  const six = Object.entries(PIECE_SOUND).filter(([, s]) => s === "berlinSchool").map(([id]) => id).sort();
  assert.deepEqual(six, ["bwv1080-01", "bwv1080-c17", "bwv773", "bwv780", "bwv802", "wtc1f02"]);
  assert.ok(!Object.values(PIECE_SOUND).some((s) => (VERSIONS as readonly string[]).includes(s)));
});
