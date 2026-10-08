import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEdit, DEFAULT_SYNTH, SYNTH_PRESETS, SYNTH_MODELS, type VoiceSynths } from "../src/audio/synth-settings.ts";

const pair = (): VoiceSynths => ({
  cantus: { ...DEFAULT_SYNTH, model: "additive", attack: 0.1, sustain: 0.9, tone: 2000 },
  counterpoint: { ...DEFAULT_SYNTH, model: "pluck", attack: 0.01, sustain: 0.5, tone: 6000 },
});

test("editing one voice leaves the other untouched", () => {
  const v = pair();
  const out = applyEdit(v, "cantus", v.cantus, { ...v.cantus, sustain: 0.4 });
  assert.equal(out.cantus.sustain, 0.4);
  assert.deepEqual(out.counterpoint, v.counterpoint);
});

test("'Both voices' keeps the voices distinct: knobs move both relatively", () => {
  const v = pair();
  // the rack shows the counterpoint's settings in "all" mode
  const out = applyEdit(v, "all", v.counterpoint, { ...v.counterpoint, attack: 0.02, sustain: 0.6, tone: 3000 });
  assert.ok(Math.abs(out.counterpoint.attack - 0.02) < 1e-9);
  assert.ok(Math.abs(out.cantus.attack - 0.2) < 1e-9); // same ratio (x2)
  assert.ok(Math.abs(out.cantus.sustain - 1) < 1e-9); // same offset (+0.1), clamped at 1
  assert.ok(Math.abs(out.cantus.tone - 1000) < 1e-9); // ratio 0.5
  assert.equal(out.cantus.model, "additive"); // models untouched
  assert.equal(out.counterpoint.model, "pluck");
});

test("'Both voices' never overwrites a choice on which the voices differ", () => {
  const v = pair();
  const out = applyEdit(v, "all", v.counterpoint, { ...v.counterpoint, model: "fm" });
  assert.equal(out.counterpoint.model, "pluck");
  assert.equal(out.cantus.model, "additive");
  const same = applyEdit(v, "all", v.counterpoint, { ...v.counterpoint, reverbMode: "cathedral" });
  assert.equal(same.cantus.reverbMode, "cathedral"); // both were "room"
  assert.equal(same.counterpoint.reverbMode, "cathedral");
});

test("every model has at least two presets", () => {
  for (const m of SYNTH_MODELS) assert.ok(SYNTH_PRESETS.filter((p) => p.settings.model === m).length >= 2, m);
});
