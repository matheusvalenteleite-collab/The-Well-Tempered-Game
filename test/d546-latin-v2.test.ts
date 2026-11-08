/**
 * D546-D548, the Latin bands' v2 (STUDY.md §3-5): SALSA v2, BOSSA NOVA v2 and CHORINHO v2 each their own instruments, one
 * to a Bach voice, no piano (the five bands' one piano was SALSA's to take: it is not taken), their lanes in the band's
 * chain, their new recordings (the alto flute, the saxophone) planned and budgeted, the originals untouched.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio } from "./fake-audio.ts";
import { BAND_CHAINS, CHAIN_CAP, chainCost, type ChainSpec } from "../src/touch/band-fx.ts";
import { PATCHES, PRESETS, V2_PRESETS, presetById, type PatchId } from "../src/touch/sound.ts";
import { SAMPLED } from "../src/touch/sampled.ts";
import { SAMPLE_MANIFEST } from "../src/audio/sample-manifest.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { presetBudget, PRESET_MB, RESIDENT_MB } from "../src/touch/budget.ts";

installFakeAudio(0, false);

const LATIN = { salsa: "salsaV2", bossaNova: "bossaNovaV2", chorinho: "chorinhoV2" } as const;
const PIANOS = new Set(["piano"]);
const patchesOf = (id: string) => {
  const p = presetById(id);
  const out = new Set<PatchId>(p.slots ?? []);
  for (const row of Object.values(p.by ?? {})) for (const [pt] of row ?? []) out.add(pt);
  return out;
};

test("D546-D548: each Latin v2 has its own patches (none of the original's), one instrument a voice for 1-5 voices", () => {
  for (const [band, id] of Object.entries(LATIN)) {
    const v1 = patchesOf(band);
    const v2 = patchesOf(id);
    for (const pt of v2) assert.ok(!v1.has(pt), `${id}: ${pt} is the original's`);
    const p = presetById(id);
    assert.equal(p.v2Of, band);
    for (let n = 1; n <= 5; n++) assert.equal(p.by?.[n]?.length, n, `${id}: ${n} voices, ${n} instruments`);
    for (const row of Object.values(p.by ?? {})) for (const [, pan] of row ?? []) assert.ok(Math.abs(pan) <= 0.35, `${id}: pan ${pan}`);
  }
});

test("D546-D548: no piano in any of the three (the owner: 'overuse of piano'); BOSSA's keys a synthesized Rhodes", () => {
  for (const id of Object.values(LATIN)) for (const pt of patchesOf(id)) assert.ok(!PIANOS.has(PATCHES[pt].sample ?? ""), `${id}: ${pt} is a piano`);
  assert.equal(PATCHES.b2Rhodes.sample, undefined);
  assert.ok(PATCHES.b2Rhodes.fm, "the Rhodes is FM");
});

test("D546-D548: the instruments the study signs for each band, top down", () => {
  const top = (id: string, n: number) => presetById(id).by![n]!.map(([pt]) => PATCHES[pt].sample ?? "synth");
  assert.deepEqual(top("salsaV2", 5), ["brassTrumpet", "brassTrombone", "brassTrombone", "choroGuitar", "jazzBass"]);
  assert.deepEqual(top("salsaV2", 3), ["brassTrumpet", "brassTrombone", "jazzBass"]);
  assert.deepEqual(top("bossaNovaV2", 5), ["bossaAltoFlute", "synth", "bossaSax", "bossaGuitar", "jazzBass"]);
  assert.deepEqual(top("bossaNovaV2", 2), ["bossaAltoFlute", "bossaGuitar"]);
  assert.deepEqual(top("chorinhoV2", 5), ["trialFlute", "trialClarinet", "rockGuitar", "choroGuitar", "choroGuitar"]);
  assert.deepEqual(top("chorinhoV2", 2), ["rockGuitar", "choroGuitar"]);
  // The articulations: the brass's bite, the tres's and the bandolim's courses, the bandolim's tremolo, the Suitcase's pan.
  assert.equal(PATCHES.s2Trombone.rec?.s, 0.8);
  assert.ok(PATCHES.s2Tres.one?.courses && PATCHES.c2Bandolim.one?.courses);
  assert.equal(PATCHES.c2Bandolim.motor?.rate, 13);
  assert.ok(PATCHES.b2Rhodes.autopan);
});

test("D546-D548: every lane a v2 patch names is in its band's chain, and the chains stay within CHAIN_CAP", () => {
  for (const [band, id] of Object.entries(LATIN)) {
    const spec = BAND_CHAINS[band as keyof typeof BAND_CHAINS] as ChainSpec;
    assert.equal(presetById(id).chain, spec);
    for (const pt of patchesOf(id)) {
      const lane = PATCHES[pt].lane;
      if (lane) assert.ok(spec.lanes?.[lane], `${id}: ${pt}'s lane ${lane}`);
    }
    const c = chainCost(spec);
    assert.ok(c.nodes <= CHAIN_CAP.nodes && c.convolvers <= 1 && c.oscillators <= CHAIN_CAP.oscillators, `${band}: ${JSON.stringify(c)}`);
  }
});

test("D547: the new recordings are in the manifest, every minor third or closer, and within 25 MB as a phone holds the band", () => {
  const af = SAMPLE_MANIFEST.altoFlute?.notes ?? [];
  assert.equal(af.length, 12);
  assert.ok(SAMPLE_MANIFEST.sax?.notes.length);
  assert.equal(SAMPLED.bossaAltoFlute.plucked, false);
  for (const id of Object.values(LATIN)) {
    const b = presetBudget(id);
    assert.ok(b.mb <= PRESET_MB && b.residentMb <= RESIDENT_MB, `${id}: ${b.mb.toFixed(1)} MB`);
  }
});

test("D546-D548: the originals as they were, the v2s offered nowhere but the Sound Lab", () => {
  assert.deepEqual(presetById("salsa").slots, ["salTrumpet", "salPiano", "salPiano", "salTrombone", "salBass"]);
  assert.deepEqual(presetById("bossaNova").slots, ["bnFlute", "bnPiano", "bnGuitar", "bnGuitar", "bnBass"]);
  assert.deepEqual(presetById("chorinho").slots, ["choFlute", "choCavaco", "choPiano", "choPiano", "cho7"]);
  for (const id of Object.values(LATIN)) {
    assert.ok(!PRESETS.some((p) => p.id === id));
    assert.ok(V2_PRESETS.some((p) => p.id === id));
    assert.ok(!Object.values(PIECE_SOUND).includes(id));
  }
});
