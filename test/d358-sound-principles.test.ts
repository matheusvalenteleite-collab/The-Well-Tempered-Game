/**
 * D358: D349's way for the other presets (docs/playback/SOUND-PRINCIPLES.md): one harpsichord and one piano
 * (one patch, the voices in the middle, each note placed by its key, the player's note the band's), SOLO
 * VOICES as one vocal ensemble (one send, one syllable, a row), the concertos' band seated and its continuo a
 * cello, bowed strings changing bow, and two trial presets (STRING CONSORT, LUTE) found but not offered.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeNode, FakeParam, installFakeAudio } from "./fake-audio.ts";
import { Chip, oneInstrument, voicing, type Play } from "../src/touch/chip.ts";
import { HARPSI_ONE, PATCHES, PRESETS, TRIALS, VOICE_SEND, creditFor, offered, playerSound, presetById, sampledNow, setPreset } from "../src/touch/sound.ts";
import { styleOf } from "../src/touch/phrasing.ts";

const ctxOf = installFakeAudio(0, false);
const of = (made: FakeNode[], kind: string) => made.filter((n) => n.kind === kind);

/** One note of a preset (its recordings not loaded: the patch's stand-in, through the same path). */
function strike(id: string, voice: number, count: number, play: Play, midi = 64) {
  setPreset(id);
  const chip = new Chip();
  const ctx = ctxOf();
  const before = new Set(ctx.nodes);
  chip.note(midi, 1, 1, voicing(voice, count, !!play.lead), play);
  return [...ctx.nodes].filter((x) => !before.has(x));
}

test("D358: one harpsichord, one piano: every voice the one patch, in the middle, nothing per voice", () => {
  for (const [id, patch] of [["harpsichordSampled", "harpsiSampled"], ["pianoSampled", "pianoSampled"]] as const) {
    const pr = presetById(id);
    assert.ok(pr.slots!.every((s) => s === patch), id);
    for (let n = 1; n <= 13; n++) {
      const by = pr.by![n]!;
      assert.equal(by.length, n);
      assert.ok(by.every(([p, pan, level]) => p === patch && pan === 0 && level === undefined), `${id} ${n}`);
    }
    assert.ok(PATCHES[patch].one?.span, id);
  }
});

test("D358: a keyboard's note placed by its key (bass left), its key's own fraction of a cent, whoever plays it", () => {
  setPreset("harpsichordSampled");
  const v = voicing(0, 3);
  const [low] = oneInstrument(36, v, HARPSI_ONE, {}, true);
  const [high] = oneInstrument(84, v, HARPSI_ONE, {}, true);
  assert.ok(low.pan < 0 && high.pan > 0 && Math.abs(low.pan) <= HARPSI_ONE.span / 2 && high.pan <= HARPSI_ONE.span / 2, `${low.pan} ${high.pan}`);
  const [, a] = oneInstrument(64, voicing(0, 3), HARPSI_ONE, {}, true);
  const [, b] = oneInstrument(64, voicing(2, 3), HARPSI_ONE, {}, true);
  assert.equal(a.detune, b.detune);
  assert.ok(Math.abs(a.detune!) <= HARPSI_ONE.cents);
  // The voice does not move the note: the same key, the same place.
  const pans = [0, 1, 2].map((vo) => (of(strike("harpsichordSampled", vo, 3, {}, 60), "panner")[0].pan as FakeParam).value);
  assert.ok(pans.every((p) => p === pans[0]), `${pans}`);
});

test("D358: the player's note on one instrument or ensemble is the band's: neither louder nor brighter", () => {
  for (const id of ["harpsichordSampled", "pianoSampled", "soloVoices", "stringConsort", "lute"]) {
    const peak = (made: FakeNode[]) => Math.max(...of(made, "gain").map((g) => Math.max(...(g.gain as FakeParam).events.map((e) => Math.abs(e.v ?? 0)), 0)));
    const shelf = (made: FakeNode[]) => of(made, "filter").filter((f) => (f as unknown as { type: string }).type === "highshelf").map((f) => (f.gain as FakeParam).value);
    const band = strike(id, 1, 3, {});
    const mine = strike(id, 1, 3, { lead: true });
    assert.ok(Math.abs(peak(mine) - peak(band)) < 1e-9, `${id}: ${peak(mine)} against ${peak(band)}`);
    assert.deepEqual(shelf(mine), shelf(band), id);
  }
  setPreset("chip");
});

test("D358: SOLO VOICES one ensemble: one send, one syllable, one envelope, a row within ±0.2, a soprano for the second soprano", () => {
  const pr = presetById("soloVoices");
  const ids = new Set([...pr.slots!, ...Object.values(pr.by!).flatMap((vs) => vs!.map(([p]) => p))]);
  assert.ok(!ids.has("singChoir"));
  for (const id of ids) {
    const p = PATCHES[id];
    assert.equal(p.send, VOICE_SEND, id);
    assert.equal(p.syllable!.cons, "l", id);
    assert.equal(p.rec!.a, 0.03, id);
    assert.equal(p.rec!.r, 0.15, id);
    assert.ok(p.one, id);
  }
  for (const n of [2, 3, 4, 5, 6]) assert.ok(pr.by![n]!.every(([, pan]) => Math.abs(pan) <= 0.2), `${n}`);
  // Soprano to bass, left to right.
  const four = pr.by![4]!.map(([, pan]) => pan);
  assert.deepEqual([...four].sort((a, b) => a - b), four);
  assert.doesNotMatch(creditFor("soloVoices")!, /FLUIDR3/);
});

test("D358: the concertos' band seated (first violins left, seconds right), the continuo a cello; bowed strings change bow", () => {
  const by = presetById("super16").by!;
  const band = by[7]!.slice(3);
  assert.deepEqual(band.map(([p]) => p), ["s16Strings", "s16Strings", "s16Strings", "s16Cello"]);
  assert.ok(band[0][1] < 0 && band[1][1] > 0, "antiphonal violins");
  assert.ok(by[7]!.slice(0, 3).every(([, pan]) => pan === 0), "the soloist in the middle");
  setPreset("super16");
  assert.ok(sampledNow().includes("cello16"));
  setPreset("chip");
  for (const id of ["s16Violin", "s16Strings", "s16Cello", "consViolin", "consViola", "consCello"] as const) assert.ok(PATCHES[id].bow, id);
  assert.equal(PATCHES.s16Bassoon.bow, undefined);
});

test("D358: the trial presets: found by id, not offered; the lute's courses and the harpsichord's touch", () => {
  for (const pr of TRIALS) {
    assert.equal(presetById(pr.id), pr);
    assert.ok(!offered(pr.id) && !PRESETS.includes(pr));
    assert.equal(playerSound(pr.id), "chip");
    assert.ok(creditFor(pr.id));
  }
  assert.equal(styleOf("lute"), "harpsichord");
  const [, low] = oneInstrument(45, voicing(0, 2), PATCHES.lute2.one!, {}, true);
  const [, high] = oneInstrument(67, voicing(0, 2), PATCHES.lute2.one!, {}, true);
  assert.ok(low.choirs?.four && !low.choirs.unison, "an octave string in the bass");
  assert.ok(high.choirs?.unison && !high.choirs.four, "a unison course above");
  // Not on a synthesized stand-in (no second string to pluck).
  const [, synth] = oneInstrument(45, voicing(0, 2), PATCHES.lute2.one!, {}, false);
  assert.equal(synth.choirs, undefined);
  const consort = presetById("stringConsort");
  for (const n of [2, 3, 4, 5, 6]) assert.ok(consort.by![n]!.every(([, pan]) => Math.abs(pan) <= 0.25), `${n}`);
});
