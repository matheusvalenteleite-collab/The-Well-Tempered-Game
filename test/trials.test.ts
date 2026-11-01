/**
 * instruments-trials: listening prototypes (not offered) and the audit's EXPRESSIVE_ALL switch. D430: BAROQUE BAND
 * offered (test/d430-baroque-band.test.ts); D437: ORGAN TRIO dropped; D431: EXPRESSIVE_ALL on by default.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DYNAMIC_SOUNDS, EXPRESSIVE_ALL, PATCHES, PRESETS, TRIALS, creditFor, expressiveAll, offered, presetById, registerAll, setExpressiveAll, setPreset, sampledNow, toneAll } from "../src/touch/sound.ts";
import { folderOf, PERIOD, SAMPLED } from "../src/touch/sampled.ts";
import { SAMPLE_MANIFEST } from "../src/audio/sample-manifest.ts";
import { terraceStops } from "../src/touch/registration.ts";

const IDS = ["trialWinds", "trialBrass", "trialJazz", "trialClavichord"];

test("the trials are found by id, never offered", () => {
  for (const id of IDS) {
    assert.equal(presetById(id).id, id);
    assert.ok(!offered(id));
    assert.ok(!PRESETS.some((p) => p.id === id));
  }
  assert.equal(TRIALS.length, IDS.length);
  // D437: the organ trio gone (a stored id opens on the organ); D430: the trial band under its offered id.
  assert.equal(presetById("trialOrganTrio").id, "chamberOrgan");
  assert.equal(presetById("trialBaroque").id, "baroqueBand");
});

test("seated narrowly, every layout's patches real", () => {
  for (const p of TRIALS)
    for (const [n, vs] of Object.entries(p.by ?? {})) {
      assert.equal(vs!.length, Number(n));
      for (const [id, pan] of vs!) {
        assert.ok(PATCHES[id], id);
        assert.ok(Math.abs(pan) <= 0.25, `${p.id} ${id} ${pan}`);
      }
    }
});

test("one send per trial", () => {
  for (const p of TRIALS) {
    const sends = new Set(Object.values(p.by ?? {}).flatMap((vs) => vs!.map(([id]) => PATCHES[id].send)));
    assert.equal(sends.size, 1, `${p.id} ${[...sends]}`);
  }
});

test("their recordings exist and are credited (CC0 / CC BY)", () => {
  for (const id of IDS) {
    setPreset(id);
    for (const s of sampledNow()) {
      const set = SAMPLED[s].set;
      assert.ok(SAMPLE_MANIFEST[folderOf(set)]?.notes.length, `${id} ${s}`);
      assert.ok(!/choirUpper|choirLower/.test(folderOf(set)));
    }
  }
  setPreset("baroqueBand");
  assert.ok(sampledNow().includes("harpsichord"), "the continuo's harpsichord loads");
  for (const id of ["baroqueBand", "trialWinds", "trialBrass", "trialJazz"]) assert.ok(creditFor(id));
  for (const s of ["trialOboe", "trialTrombone", "trialBassPizz"]) assert.equal(PERIOD[s].bits, 16);
  setPreset("chip");
});

test("EXPRESSIVE_ALL (D431: on by default): the sustaining sounds, the tone sounds, the harpsichord's and organ's registration; off, none", () => {
  assert.equal(EXPRESSIVE_ALL, true);
  for (const id of DYNAMIC_SOUNDS) assert.ok(expressiveAll(id));
  for (const id of ["harpsichordSampled", "chamberOrgan", "lute", "pianoSampled"]) assert.ok(!expressiveAll(id), id);
  assert.ok(toneAll("sid64") && !toneAll("lute"));
  assert.ok(registerAll("harpsichordSampled") && !registerAll("lute"));
  setExpressiveAll(false);
  try {
    assert.ok(!expressiveAll("stringConsort") && !toneAll("chip") && !registerAll("chamberOrgan"));
  } finally {
    setExpressiveAll(true);
  }
});

test("terraces: printed levels to stops", () => {
  assert.deepEqual(terraceStops("harpsichordSampled", -11), ["lute"]);
  assert.deepEqual(terraceStops("harpsichordSampled", -6.5), []);
  assert.deepEqual(terraceStops("harpsichordSampled", 0), ["unison"]);
  assert.deepEqual(terraceStops("harpsichordSampled", 6.5), ["unison", "four"]);
  assert.deepEqual(terraceStops("chamberOrgan", -6.5), ["flute", "sub16"]);
  assert.deepEqual(terraceStops("chamberOrgan", 0), ["principal", "sub16"]);
  assert.deepEqual(terraceStops("chamberOrgan", 6.5), ["principal", "mixture", "sub16"]);
});
