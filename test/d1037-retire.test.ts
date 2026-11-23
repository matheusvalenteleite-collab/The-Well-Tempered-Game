/**
 * D1037: FLUTE & HARP and ZELENKA TRIO withdrawn (the owner's decision, the instruments audit), as D890's three: gone from
 * every list and table; a stored choice of either falls back to the piece's own sound; their eleven pieces (seven own
 * entries, four preludes by world) on new sounds by the voice probe; the recordings another sound plays kept.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { PIECE_SOUND, soundFor } from "../src/touch/piece-sound.ts";
import { PATCHES, PRESETS, WITHDRAWN_D890, playerSound } from "../src/touch/sound.ts";
import { SAMPLED } from "../src/touch/sampled.ts";
import { SOUND_STYLES, homeFor, NO_DRUMS } from "../src/touch/drum-library.ts";
import { OCTAVE_SEATS } from "../src/touch/octave-seats.ts";
import { OWN_LOUD, SOUND_LOUD } from "../src/touch/player-lift-data.ts";
import { BAND_CHAINS } from "../src/touch/band-fx.ts";
import { COLOURS } from "../tools/touch/colour-plans/index.ts";
import { loadExtras } from "../src/touch/fugue.ts";
import { SAMPLE_MANIFEST } from "../src/audio/sample-manifest.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { POP_SOUNDS } = await import("../src/bench/PlayPop.tsx");
const { SOUND_GROUPS } = await import("../src/bench/SoundSelect.tsx");

const GONE = ["fluteHarp", "oboeTrio"];
/** The eleven pieces and their sounds now (the preludes by world, prelude-plan.ts worldOf). */
const MOVED: Readonly<Record<string, string>> = {
  wtc1f13: "abbeyRoad", wtc1p13: "abbeyRoad",
  wtc2f23: "berlinSchool", wtc2p23: "berlinSchool",
  wtc2f18: "tomita", wtc2p18: "tomita",
  wtc1f17: "super16", wtc1p17: "super16",
  "bwv903-2": "abbeyRoad",
  bwv782: "harpsichordSampled",
  bwv786: "vocalSynth",
};

test("D1037: the two sounds in no list, no table, no piece's default", async () => {
  await loadExtras();
  for (const id of GONE) {
    assert.ok(WITHDRAWN_D890.has(id));
    assert.ok(!PRESETS.some((p) => p.id === id), id);
    assert.ok(!POP_SOUNDS.some(([s]) => s === id), `${id}: POP_SOUNDS`);
    assert.ok(!SOUND_GROUPS.some(([, ids]) => ids.includes(id)), `${id}: the menu`);
    assert.ok(!Object.values(PIECE_SOUND).includes(id), `${id}: a default`);
    assert.ok(!(id in OCTAVE_SEATS) && !(id in SOUND_LOUD) && !(id in SOUND_STYLES) && !(id in BAND_CHAINS), `${id}: seats, lift, drums, chain`);
    assert.ok(!Object.values(OWN_LOUD).some((r) => r.s === id), `${id}: a lift row`);
    for (const [p, c] of Object.entries(COLOURS)) assert.ok(c.sound !== id && !(id in c.plans), `${p}: ${id} in its colour plan`);
    assert.equal(playerSound(id), "chip");
  }
  assert.equal(playerSound("oboeTrioV2"), "chip");
});

test("D1037: the eleven pieces on their new sounds, with their colour plans, lift rows and drums", async () => {
  await loadExtras();
  for (const [id, s] of Object.entries(MOVED)) {
    assert.equal(PIECE_SOUND[id], s, id);
    if (!/p\d\d$/.test(id)) {
      assert.equal(COLOURS[id].sound, s, `${id}: its colour plan's sound`);
      if (s !== "harpsichordSampled") assert.ok(COLOURS[id].plans[s]?.length, `${id}: a plan on ${s}`);
    }
    assert.equal(OWN_LOUD[id]?.s, s, `${id}: its lift row on ${s}`);
  }
  // the calm ones play no drums (D894's rule); II/18 and its prelude keep the sea's swell; the two Inventions their kits
  for (const id of ["wtc1f13", "wtc1p13", "wtc2f23", "wtc2p23", "wtc1f17", "wtc1p17", "bwv903-2"]) assert.equal(homeFor(id, MOVED[id]), NO_DRUMS, id);
  for (const id of ["wtc2f18", "wtc2p18", "bwv782"]) assert.equal(homeFor(id, MOVED[id]), "swell", id);
  assert.equal(homeFor("bwv786", "vocalSynth"), "triphop");
});

test("D1037: a stored choice of a withdrawn sound opens the piece on its own sound", () => {
  for (const id of [...Object.keys(MOVED), "wtc1f01", "bwv951"]) {
    for (const gone of [...GONE, "oboeTrioV2"]) assert.equal(soundFor(id, { [id]: gone }, "chip"), PIECE_SOUND[id], `${id} chose ${gone}`);
    assert.equal(soundFor(id, { [id]: "gameboy" }, "chip"), "gameboy", "a kept choice kept");
  }
});

test("D1037: the recordings another sound plays kept; the second oboe's soft and short layers gone", () => {
  // BWV 54's layered alto (SUPER 16-BIT): the Iowa oboe; VAUDEVILLE's and SUPER 16-BIT's bassoon: the Iowa bassoon.
  assert.equal(PATCHES.altoM3.sample, "trioOboe1");
  assert.ok(SAMPLED.trioOboe1 && SAMPLE_MANIFEST.trioOboe && SAMPLE_MANIFEST.trioOboeMf && SAMPLE_MANIFEST.trioOboeShort);
  assert.equal(PATCHES.vdBassoon.sample, "trioBassoon");
  assert.ok(SAMPLED.trioBassoon && SAMPLE_MANIFEST.trioBassoon && SAMPLE_MANIFEST.trioBassoonShort);
  // the harp stays (the bench's sampled harp and the continuo's pizzicato stand-in read harp/); its touch-game set goes
  assert.ok(SAMPLE_MANIFEST.harp);
  assert.ok(!("seaHarp" in SAMPLED) && !("trioOboe2" in SAMPLED));
  assert.ok(!SAMPLE_MANIFEST.oboeSoft && !SAMPLE_MANIFEST.oboeStac);
  for (const p of ["seaFlute", "seaHarp", "seaViola", "seaCello", "trioOboe1", "trioOboe2", "trioBassoon", "trioCello", "trioHarpsi"]) assert.ok(!(p in PATCHES), p);
});
