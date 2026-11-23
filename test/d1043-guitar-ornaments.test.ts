/**
 * D1043, THE GUITARS' ORNAMENTS AT THE LINE'S LEVEL (D508): each note of the player's ornament on a guitar plucked
 * GUITAR_ORNAMENT_DB softer (ornament-level.ts), its notes and times as before; every other sound's ornament untouched.
 * The rendered measure (tools/touch/gesture render.cjs's shake, shake.py: the ornaments' spans against the same notes held
 * with the thumb still, the phone model): fixtures/d1043-guitar-ornaments.json.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GUITAR_ORNAMENT_DB, ornamentPlay } from "../src/touch/ornament-level.ts";
import { GUITAR_SAMPLES } from "../src/touch/touch-expr.ts";
import { PATCHES } from "../src/touch/sound.ts";
import type { Voicing } from "../src/touch/chip.ts";

const M: Record<string, { gesture_lu: { before: number; after: number }; same_notes_and_times: boolean; ornaments: number }> = JSON.parse(readFileSync(new URL("./fixtures/d1043-guitar-ornaments.json", import.meta.url), "utf8"));
const v = (patch: unknown) => ({ patch } as unknown as Voicing);

test("D1043: a guitar's ornament within ±1 LU of the plain note (rendered), its notes and times as before", () => {
  assert.ok(Object.keys(M).length >= 3);
  for (const [k, m] of Object.entries(M)) {
    assert.ok(m.ornaments >= 5 && m.same_notes_and_times, k);
    assert.ok(m.gesture_lu.before > 3, `${k}: before ${m.gesture_lu.before} (the fault)`);
    assert.ok(Math.abs(m.gesture_lu.after) <= 1, `${k}: after ${m.gesture_lu.after} LU`);
  }
});

test("D1043: only the guitars' ornament notes softer; every other patch's Play the very same object", () => {
  for (const s of GUITAR_SAMPLES) assert.ok(GUITAR_ORNAMENT_DB[s] < 0, s);
  const play = { level: 0.8, legato: true };
  const g = ornamentPlay(v(PATCHES.k2Fuzz), play);
  assert.ok(Math.abs(g.level! - 0.8 * 10 ** (GUITAR_ORNAMENT_DB.rockGuitar2 / 20)) < 1e-12 && g.legato === true);
  for (const [id, pt] of Object.entries(PATCHES)) if (!(pt.sample && GUITAR_SAMPLES.has(pt.sample))) assert.equal(ornamentPlay(v(pt), play), play, id);
  assert.equal(ornamentPlay(v(undefined), play), play);
});
