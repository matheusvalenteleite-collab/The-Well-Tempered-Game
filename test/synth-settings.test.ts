import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEdit, DEFAULT_SYNTH, firstPreset, joinVoices, sameSettings, SYNTH_MODELS, SYNTH_PRESETS, type VoiceSynths } from "../src/audio/synth-settings.ts";

const pair = (): VoiceSynths => ({
  cantus: { ...DEFAULT_SYNTH, model: "additive", attack: 0.1, sustain: 0.9, tone: 2000 },
  counterpoint: { ...DEFAULT_SYNTH, model: "pluck", attack: 0.01, sustain: 0.5, tone: 6000 },
});

test("editing one voice leaves the other untouched", () => {
  const v = pair();
  const out = applyEdit(v, "cantus", { ...v.cantus, sustain: 0.4 });
  assert.equal(out.cantus.sustain, 0.4);
  assert.deepEqual(out.counterpoint, v.counterpoint);
});

test("'Both voices' is one shared configuration; joining takes the Contrapunctus settings", () => {
  const v = pair();
  const joined = joinVoices(v);
  assert.ok(sameSettings(joined));
  assert.equal(joined.cantus.model, "pluck");
  const out = applyEdit(joined, "all", { ...joined.counterpoint, tone: 3000 });
  assert.equal(out.cantus.tone, 3000);
  assert.ok(sameSettings(out));
});

test("the default sound is the Gould piano, clean; every model's first preset is clean", () => {
  assert.equal(SYNTH_MODELS[0], "piano");
  assert.equal(DEFAULT_SYNTH.model, "piano");
  assert.equal(SYNTH_PRESETS[0].id, "gould");
  for (const m of SYNTH_MODELS) {
    const f = firstPreset(m).settings;
    assert.equal(f.reverbMode, "off", m);
    assert.equal(f.delayMode, "off", m);
  }
});

test("every model has at least two presets", () => {
  for (const m of SYNTH_MODELS) assert.ok(SYNTH_PRESETS.filter((p) => p.settings.model === m).length >= 2, m);
});

test("every preset and model has a display name", async () => {
  const { t } = await import("../src/ui/i18n.ts");
  for (const p of SYNTH_PRESETS) assert.doesNotThrow(() => t(`ui.synth.preset.${p.id}`), p.id);
  for (const m of SYNTH_MODELS) assert.doesNotThrow(() => t(`ui.synth.model.${m}`), m);
});
