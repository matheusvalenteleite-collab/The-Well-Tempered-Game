/**
 * D430-D437 (instruments build): BAROQUE BAND offered (its room, its seats, its continuo entering with the bass,
 * its strings' bows and its oboe's tongue); Busoni leads (EXPRESSIVE_ALL on; the colour plans a fallback);
 * CLASSIC CHIP's and GAME BOY's Busoni as a chip composer writes it (the 4-bit volume, the duty, a long note's
 * vibrato); BLEEPS AND BLOOPS retired; the allocation; the quiet sounds matched.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { FakeAudioContext, FakeNode, FakeParam, FakeSource, installFakeAudio } from "./fake-audio.ts";
import { Chip, REVERBS, voicing, type Play } from "../src/touch/chip.ts";
import { BAND_CELLO_PHONE_LIFT, BAND_SEND, BAROQUE_CREDIT, CONSORT_SEND, CONTINUO, PATCHES, PRESETS, STRING_BOW, WIND_TONGUE, busoniReaches, chipVolume, creditFor, dutyStep, offered, playerSound, presetById, setPreset, STEPPED_SOUNDS, VOLUME_MID } from "../src/touch/sound.ts";
import { BUSONI_LEADS_MIN, busoniLeads } from "../src/touch/colour.ts";
import { wholeReadingOf } from "../src/touch/readings.ts";
import { TOUCH_KINDS } from "../src/touch/touch-expr.ts";
import { exprFamily, touchFamily } from "../src/bench/glenn.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { POP_SOUNDS } = await import("../src/bench/PlayPop.tsx");
const { SOUND_GROUPS } = await import("../src/bench/SoundSelect.tsx");

const ctxOf = installFakeAudio(0, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 4 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;

test("D430: BAROQUE BAND offered: in the list, an ensemble, named in three languages, credited, touched as the consort", () => {
  assert.ok(offered("baroqueBand"));
  assert.equal(presetById("baroqueBand").name, "BAROQUE BAND");
  assert.ok(POP_SOUNDS.some(([s, n]) => s === "baroqueBand" && n === "BAROQUE BAND"));
  assert.ok(SOUND_GROUPS.find(([g]) => g === "ENSEMBLES")![1].includes("baroqueBand"));
  for (const dict of [PT, ES] as Record<string, string>[]) assert.equal(dict["BAROQUE BAND"], "BANDA BARROCA");
  assert.equal(creditFor("baroqueBand"), BAROQUE_CREDIT);
  assert.match(BAROQUE_CREDIT, /OBOE.*CC0/);
  assert.match(BAROQUE_CREDIT, /HARPSICHORD VCSL/);
  assert.equal(TOUCH_KINDS.baroqueBand, TOUCH_KINDS.stringConsort);
  assert.equal(touchFamily("baroqueBand"), touchFamily("stringConsort"));
  assert.equal(exprFamily("baroqueBand"), "bowed");
});

test("D430: one room for a chamber band (not wetter than the consort's, shorter on a phone), one send, seated within ±0.22", () => {
  const p = presetById("baroqueBand");
  assert.equal(p.fx, "band");
  const r = REVERBS.band;
  assert.ok(r.rt60 <= REVERBS.salon.rt60 && r.phoneSeconds < r.seconds && (r.phoneRt60 ?? r.rt60) < r.rt60);
  assert.ok(r.hp <= 180, "the reverb takes the cello's and the harpsichord's lines");
  assert.ok(BAND_SEND <= CONSORT_SEND);
  for (const [n, vs] of Object.entries(p.by ?? {})) {
    assert.equal(vs!.length, Number(n));
    for (const [id, pan] of vs!) {
      assert.equal(PATCHES[id].send, BAND_SEND, id);
      assert.ok(Math.abs(pan) <= 0.22, `${n} ${id} ${pan}`);
    }
  }
  assert.equal(PATCHES.bandCello.double!.patch.send, BAND_SEND, "the harpsichord in the same room");
});

test("D430: the strings bowed (D427, D429), the oboe tongued (WIND_TONGUE), the cello lifted on a phone; the player's line the band's", () => {
  for (const id of ["bandViolin", "bandViola", "bandCello"] as const) assert.equal(PATCHES[id].bow, STRING_BOW, id);
  assert.equal(PATCHES.bandOboe.bow, WIND_TONGUE);
  assert.equal(PATCHES.bandCello.phoneLift, BAND_CELLO_PHONE_LIFT);
  for (const id of ["bandViolin", "bandOboe", "bandViola", "bandCello"] as const) assert.ok(PATCHES[id].one, id);
});

test("D430: the continuo: the harpsichord on the bass's notes only, lighter (5-8 dB), centre-left, a moment after the bow", async () => {
  const d = PATCHES.bandCello.double!;
  assert.equal(d.patch.sample, "harpsichord");
  // Set by measurement (D430: 5-8 dB under the cello alone, a computer and a phone through the 600 Hz model).
  assert.ok(CONTINUO.db <= -4 && CONTINUO.db >= -10 && CONTINUO.phoneDb <= -4 && CONTINUO.phoneDb >= -10);
  assert.ok(Math.abs(20 * Math.log10(d.phoneLevel!) - CONTINUO.phoneDb) < 1e-9);
  assert.ok(Math.abs(20 * Math.log10(d.level) - CONTINUO.db) < 1e-9);
  assert.ok(d.pan! < 0 && d.pan! > -0.15, "centre-left");
  assert.ok(d.late! > 0.005 && d.late! <= 0.03);
  for (const id of ["bandViolin", "bandOboe", "bandViola"] as const) assert.equal(PATCHES[id].double, undefined, id);
  // Through the chip: a bass note sounds the cello at its onset and the harpsichord CONTINUO.late after it; an upper voice's none.
  setPreset("baroqueBand");
  const chip = new Chip();
  await chip.prepare([43, 48, 55, 64, 67, 72], [48]);
  const starts = (voice: number, play: Play = {}) => {
    const ctx = ctxOf();
    const before = new Set(ctx.nodes);
    chip.note(voice === 2 ? 48 : 72, 1, 1, voicing(voice, 3, false), play);
    return [...ctx.nodes].filter((x) => !before.has(x) && x instanceof FakeSource && (x as FakeSource).kind === "buffer" && (x as FakeSource).startAt !== null).map((x) => +((x as FakeSource).startAt! - 1).toFixed(4));
  };
  const bass = starts(2);
  assert.ok(bass.some((t) => Math.abs(t) < 0.005), `the cello at its onset: ${bass}`);
  assert.ok(bass.some((t) => Math.abs(t - CONTINUO.late) < 0.005), `the harpsichord late: ${bass}`);
  assert.ok(starts(2, { lead: true }).some((t) => Math.abs(t - CONTINUO.late) < 0.005), "the player's bass too");
  assert.ok(!starts(0).some((t) => Math.abs(t - CONTINUO.late) < 0.005), "no harpsichord on the violin");
  // Its seat: the harpsichord's panner left of the cello's.
  const ctx = ctxOf();
  const before = new Set(ctx.nodes);
  chip.note(48, 2, 1, voicing(2, 3, false));
  const pans = [...ctx.nodes].filter((x) => !before.has(x) && (x as FakeNode).kind === "panner").map((x) => ((x as unknown as { pan: FakeParam }).pan).value);
  assert.ok(pans.length >= 2 && Math.min(...pans) < Math.max(...pans), `${pans}`);
  setPreset("chip");
});

test("D435: the allocation: BAROQUE BAND where the bass enters last with the continuo, the consort, the lute, SID 64", () => {
  for (const id of ["wtc1f09", "wtc2f16", "wtc2f17", "wtc2f21"]) assert.equal(PIECE_SOUND[id], "baroqueBand", id);
  for (const [id, s] of [["wtc1f04", "stringConsort"], ["wtc2f08", "stringConsort"], ["wtc1f14", "lute"], ["wtc1f21", "sid64"], ["wtc1f11", "super16"], ["wtc2f12", "tracker"]] as const) assert.equal(PIECE_SOUND[id], s, id);
  for (const s of Object.values(PIECE_SOUND)) assert.ok(offered(s), s);
});

test("D433: BLEEPS AND BLOOPS retired: not offered, a stored choice opens on CLASSIC CHIP, no piece opens on it", () => {
  assert.ok(!PRESETS.some((p) => p.id === "modular"));
  assert.ok(!POP_SOUNDS.some(([s]) => s === "modular"));
  assert.ok(!SOUND_GROUPS.some(([, ids]) => ids.includes("modular")));
  assert.equal(playerSound("modular"), "chip");
  assert.equal(presetById("modular").id, "chip");
  assert.ok(!Object.values(PIECE_SOUND).includes("modular"));
});

test("D431: Busoni leads: the colour plans stand aside where his reading reaches the sound with 3 marks or more; a fallback under 3", () => {
  assert.equal(BUSONI_LEADS_MIN, 3);
  const w = (id: string) => wholeReadingOf(id)?.whole;
  assert.ok(busoniLeads(w("wtc1f16"), busoniReaches("harpsichordSampled")));
  assert.equal(w("wtc2f03")!.dyn.length, 2);
  assert.ok(!busoniLeads(w("wtc2f03"), busoniReaches("harpsichordSampled")), "II/3: Busoni 2, the plan's moments");
  assert.ok(!busoniLeads(null, true), "his reading off: the plan");
  assert.ok(!busoniLeads(w("wtc1f16"), busoniReaches("lute")), "the lute: no dynamics of his reach it");
  for (const id of ["harpsichordSampled", "chamberOrgan", "pianoSampled", "chip", "stringConsort", "baroqueBand"]) assert.ok(busoniReaches(id), id);
});

test("D432: CLASSIC CHIP's and GAME BOY's Busoni: the 4-bit volume stepped about the middle (about ±5 dB), the duty a step at f and p", () => {
  assert.deepEqual([...STEPPED_SOUNDS].sort(), ["chip", "gameboy"]);
  // p, mp, mf, f, ff (LEVEL_DB): the chip's own steps, each a whole step of the register.
  assert.deepEqual([-11, -6.5, -3, 0, 3.5, 6.5].map(chipVolume), [4, 5, 6, 8, 11, 14]);
  for (const db of [-30, -11, 11, 30]) {
    const v = chipVolume(db);
    assert.ok(Number.isInteger(v) && v >= 1 && v <= 15);
    // About ±5 dB about the middle, as the register quantises it (its ends 4 and 14: -6 and +4.9 dB).
    assert.ok(v >= 4 && v <= 14 && Math.abs(20 * Math.log10(v / VOLUME_MID)) <= 6.1, `${db}: ${v}`);
  }
  assert.equal(dutyStep(0.125, 3.5), 0.25);
  assert.equal(dutyStep(0.25, 3.5), 0.5);
  assert.equal(dutyStep(0.5, 6.5), 0.5);
  assert.equal(dutyStep(0.5, -6.5), 0.25);
  assert.equal(dutyStep(0.25, -6.5), 0.125);
  assert.equal(dutyStep(0.25, 0), 0.25);
});

test("D432: through the chip: a band note's level by the volume step, its pulse a step wider at f; the bass (the triangle) never stepped; no reverb or delay added", async () => {
  setPreset("chip");
  const chip = new Chip();
  const peak = (voice: number, count: number, vel: number, dur = 0.2) => {
    const ctx = ctxOf();
    const before = new Set(ctx.nodes);
    chip.note(64, 1, dur, voicing(voice, count, false), { vel });
    const made = [...ctx.nodes].filter((x) => !before.has(x));
    const g = made.filter((x) => (x as FakeNode).kind === "gain").map((x) => (x as unknown as { gain: FakeParam }).gain);
    const vals = g.flatMap((p) => (p as unknown as { events?: { v: number }[] }).events?.map((e) => e.v) ?? [p.value]);
    return { max: Math.max(...vals.filter((v) => Number.isFinite(v))), made };
  };
  const mf = peak(0, 3, 0).max;
  const f = peak(0, 3, 3.5).max;
  const p = peak(0, 3, -6.5).max;
  assert.ok(f > mf && p < mf, `${p} ${mf} ${f}`);
  assert.ok(Math.abs(peak(2, 3, 6.5).max - peak(2, 3, 0).max) < 1e-9, "the triangle has no volume register");
  setPreset("chip");
});
