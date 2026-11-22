/**
 * D1010: the bright synthesized sounds' gentle top: SWITCHED-ON, CLASSIC CHIP and GAME BOY rolled from 9 kHz (Preset.top, a
 * Butterworth: chip.ts TOP_Q); the other three bright ones (SID 64, BERLIN SCHOOL, the sampled harpsichord) and every band
 * with a chain (its own bus EQ) without one; GAME BOY's duties as they were (pulse25 lead: a square lead cost the Goldberg's
 * separation).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PATCHES, PRESETS, presetById } from "../src/touch/sound.ts";
import { TOP_Q } from "../src/touch/chip.ts";

test("D1010: the three brightest synth sounds roll their top from 9 kHz; the rest do not", () => {
  for (const id of ["analog", "chip", "gameboy"]) assert.equal(presetById(id).top, 9000, id);
  for (const id of ["sid64", "berlinSchool", "harpsichordSampled"]) assert.equal(presetById(id).top, undefined, id);
  for (const p of PRESETS) if (p.chain) assert.equal(p.top, undefined, `${p.id}: a chain's top is its own bus EQ`);
});

test("D1010: the top is a Butterworth (no peak under the corner, the Web Audio API's Q in dB)", () => {
  assert.ok(Math.abs(10 ** (TOP_Q / 20) - Math.SQRT1_2) < 1e-9);
});

test("D1010: GAME BOY's lead keeps its 25% duty and level", () => {
  assert.equal(PATCHES.gbLead.osc[0].wave, "pulse25");
  assert.equal(PATCHES.gbLead.level, 0.63);
});
