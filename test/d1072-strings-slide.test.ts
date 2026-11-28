/**
 * D1072, THE BOWED STRINGS' SLIDE: the switch off by default (today's sound until the owner has listened), the glide timed by the
 * thumb (a fast drag quick, a slow one gradual, never over a quarter of the note), the bowed strings' recordings named.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MECH_DEFAULTS, MECH_SPEC } from "../src/bench/mechanics.ts";
import { BOWED_SAMPLES, GLISS, glissMs } from "../src/bench/slide-sound.ts";
import { PATCHES } from "../src/touch/sound.ts";

test("D1073: the strings' slide is the glissando timed by the thumb (the owner approved after listening)", () => {
  assert.equal(MECH_DEFAULTS.slideGlide, "speed");
  assert.ok(MECH_SPEC.some((r) => r.key === "slideGlide"));
});

test("D1072: the glide timed by the thumb's speed, capped by a quarter of the note", () => {
  const long = 2000;
  assert.equal(glissMs(GLISS.fast * 2, long), GLISS.fastMs);
  assert.equal(glissMs(GLISS.slow / 2, long), GLISS.slowMs);
  let last = Infinity;
  for (const v of [2, 4, 6, 10, 15, 20, 30, 60]) {
    const ms = glissMs(v, long);
    assert.ok(ms <= last, `slower at ${v} rows/s`);
    last = ms;
  }
  assert.ok(glissMs(1, 400) <= 100, "a quarter of a 400 ms note");
  assert.ok(glissMs(100, 20) >= GLISS.floorMs);
  assert.ok(glissMs(Number.NaN, long) > 0);
});

test("D1072: the bowed strings are the consort's recordings, every band that bows them", () => {
  for (const id of ["consViolin", "consViola", "consCello", "bandViolin", "bandViola", "bandCello", "orViolin1", "orViola", "orCello"]) {
    const pt = (PATCHES as Record<string, { sample?: string; bow?: unknown }>)[id];
    assert.ok(pt?.bow && BOWED_SAMPLES.has(pt.sample ?? ""), id);
  }
});
