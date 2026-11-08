/**
 * D524: PET SOUNDS, ONE OF THE GAME'S SOUNDS ("orchestral plus electric, 1960s"): the string section on top, the horn, the
 * harpsichord (five voices), the grand, the picked electric bass; one echo chamber; and ITS DRUMS: a 1966 ballad's kit
 * with the tambourine, the timpani's rhythm tuned to the bass's own note (never a pitch of their own), the fugue's form read
 * from its entries (a fill into each, the episodes quieter, a break before the final group, a closing flourish); no bells;
 * never the score, never a tempo change, never with another sound.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { FakeAudioContext, installFakeAudio } from "./fake-audio.ts";
import { Chip, REVERBS, type GrooveContext } from "../src/touch/chip.ts";
import { DYNAMIC_SOUNDS, PATCHES, PET_CREDIT, PET_SEND, PRESETS, creditFor, grooveNow, offered, presetById, setDrums, setPreset } from "../src/touch/sound.ts";
import { SAMPLED, TIMP_MIDIS as D514_TIMP, TIMP_SET, kitMidi, sampledMidis } from "../src/touch/sampled.ts";
import { TOUCH_KINDS, holdMode } from "../src/touch/touch-expr.ts";
import { MIN_GAP_BARS, TIMP_MIDIS, bassAt, petBeat, petPlan, timpPitch } from "../src/touch/pet-drums.ts";
import { beatOf, fugueById } from "../src/touch/fugue.ts";
import { entrySpans } from "../src/touch/voice-mode.ts";
import { formOf } from "../src/touch/form-points.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { slideFamily } from "../src/bench/slide-sound.ts";
import { COLOURS } from "../tools/touch/colour-plans/index.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { POP_SOUNDS } = await import("../src/bench/PlayPop.tsx");
const { SOUND_GROUPS } = await import("../src/bench/SoundSelect.tsx");

installFakeAudio(0, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 4 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;

const PET = presetById("petSounds");
const ctxOf = (c: Chip) => (c as unknown as { ctx: FakeAudioContext }).ctx;

test("D524: PET SOUNDS offered: in the lists, an ensemble, named in three languages, credited, Busoni's dynamics reach it", () => {
  assert.ok(offered("petSounds"));
  assert.equal(PET.name, "PET SOUNDS");
  assert.ok(POP_SOUNDS.some((r: readonly unknown[]) => r[0] === "petSounds"));
  assert.ok(SOUND_GROUPS.find((r: readonly unknown[]) => r[0] === "ENSEMBLES")![1].includes("petSounds"));
  assert.equal(PT["PET SOUNDS"], "PET SOUNDS");
  assert.equal(ES["PET SOUNDS"], "PET SOUNDS");
  assert.equal(creditFor("petSounds"), PET_CREDIT);
  assert.match(PET_CREDIT, /IOWA/);
  assert.ok(DYNAMIC_SOUNDS.has("petSounds"));
});

test("D524: the band: one instrument a voice (strings, horn, harpsichord, piano, electric bass); one echo chamber; within ±0.2; no bells", () => {
  const by = PET.by!;
  assert.deepEqual(by[3]!.map(([p]) => p), ["psStrings", "psPiano", "psBass"]);
  assert.deepEqual(by[4]!.map(([p]) => p), ["psStrings", "psHorn", "psPiano", "psBass"]);
  assert.deepEqual(by[5]!.map(([p]) => p), ["psStrings", "psHarpsi", "psHorn", "psPiano", "psBass"]);
  for (const [n, vs] of Object.entries(by)) {
    assert.equal(vs!.length, Number(n), "one instrument a voice, nothing added");
    for (const [, pan] of vs!) assert.ok(Math.abs(pan) <= 0.2);
  }
  assert.equal(PET.fx, "goldStar");
  assert.ok(REVERBS.goldStar.rt60 <= 1.6);
  for (const id of ["psStrings", "psHorn", "psHarpsi", "psPiano"] as const) assert.equal(PATCHES[id].send, PET_SEND, id);
  // No mallet, bell or glockenspiel anywhere in the band (the owner hates stray glockenspiel).
  for (const id of PET.slots!) assert.ok(!PATCHES[id].motor && !/vib|bell|glock|celesta/i.test(String(PATCHES[id].sample)), id);
  assert.equal(PATCHES.psBass.sample, "rockBass");
  assert.ok((PATCHES.psBass.phoneLift?.db ?? 0) >= 5);
});

test("D524: the recordings reused (no new pitched set): the strings, the horn, the harpsichord, the bass E1-G3, the rock kit, the tambourine, the timpani", () => {
  assert.equal(SAMPLED.petStrings.set, "petStrings");
  assert.equal(sampledMidis("rickBass")[0], 28);
  // The kit the rock kit's, the tambourine the club kit's, the timpani D514's: no new files.
  assert.ok(kitMidi("kitClub", "tambourine", true) !== null);
  assert.deepEqual([...D514_TIMP], [...TIMP_MIDIS]);
  assert.equal(TIMP_SET, "timpLoud");
});

test("D524: the touch as JAZZ QUARTET's; a held string or horn note's sway its breath; the slide each instrument's own", () => {
  assert.equal(TOUCH_KINDS.petSounds, "jazz");
  assert.equal(holdMode("jazz", PATCHES.psStrings, false), "breath");
  assert.equal(holdMode("jazz", PATCHES.psPiano, true), "none");
  assert.equal(slideFamily("petSounds", PATCHES.psStrings), "bowed");
  assert.equal(slideFamily("petSounds", PATCHES.psHorn), "brass");
  assert.equal(slideFamily("petSounds", PATCHES.psBass), "bass");
});

function hitsOf(id: string, dynDb = 0) {
  const f = fugueById(id);
  const { ticks: beat, perBar: per } = beatOf(f);
  const compound = beat !== f.tpq * (4 / Number(f.meter.split("/")[1]));
  const plan = petPlan(f, beat, per);
  const out: { tick: number; piece: string; vel: number; midi?: number; beatOn: number }[] = [];
  for (let t = f.bars[0].on; t < f.length; t += beat) {
    const b = Math.round((t - f.bars[0].on) / beat) % per;
    for (const h of petBeat(b, per, compound, t, beat, plan, dynDb)) out.push({ tick: t + h.at * beat, piece: h.piece, vel: h.vel, midi: h.midi, beatOn: t });
  }
  return { f, beat, per, plan, out };
}

test("D524: the timpani give rhythm only: every stroke the pitch class of the bass's own note there, within F2-E3", () => {
  for (const id of ["wtc1f17", "wtc1f21", "wtc2f17"]) {
    const { plan, out } = hitsOf(id);
    const timp = out.filter((h) => h.piece === "timp");
    assert.ok(timp.length > 10, id);
    for (const h of timp) {
      const bass = bassAt(plan, h.beatOn + 1);
      // (a fill's strokes fall inside the beat: the bass sounding at the beat's start or at the stroke)
      assert.ok(bass !== null, id);
      assert.equal(h.midi, timpPitch(bass!));
      assert.equal(((h.midi! - bass!) % 12 + 12) % 12, 0, `${id}: no pitch of its own`);
      assert.ok(h.midi! >= 41 && h.midi! <= 52);
    }
  }
});

test("D524: the pattern in 4/4: the bass drum on 1 and 3, the snare on 2 and 4, the tambourine's eighths, the timpani on 1", () => {
  const { f, plan, out } = hitsOf("wtc1f17");
  const bar = f.bars.find((b) => bassAt(plan, b.on + 1) !== null && !plan.moments.some((m) => m.from < b.on + f.barTicks && m.at >= b.on - f.barTicks / 2) && !plan.quiet.some(([a, z]) => a < b.on + f.barTicks && z > b.on))!;
  const q = f.tpq;
  const at = (piece: string) => out.filter((h) => h.piece === piece && h.tick >= bar.on && h.tick < bar.on + f.barTicks).map((h) => (h.tick - bar.on) / q);
  assert.deepEqual(at("kick"), [0, 1.5, 2]);
  assert.deepEqual(at("snare"), [1, 3]);
  assert.deepEqual(at("tamb"), [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
  assert.deepEqual(at("timp"), [0]);
});

test("D524: the form: fills into entries, spaced; the episodes quieter; a break before the final group; the flourish, then nothing", () => {
  for (const id of ["wtc1f17", "wtc1f21", "wtc2f07"]) {
    const { f, beat, plan, out } = hitsOf(id);
    const spans = entrySpans(f).filter((s) => s.form !== "counter");
    const fills = plan.moments.filter((m) => m.kind === "fill");
    assert.ok(fills.length >= 2, id);
    for (const m of fills) assert.ok(spans.some((s) => s.on >= m.at && s.on < m.at + beat), id);
    for (let i = 1; i < fills.length; i++) assert.ok(fills[i].at - fills[i - 1].at >= MIN_GAP_BARS * f.barTicks, id);
    const brk = plan.moments.find((m) => m.kind === "break");
    if (brk) {
      const inBreak = out.filter((h) => h.tick >= brk.from && h.tick < brk.at - 1);
      assert.ok(inBreak.length <= 1 && inBreak.every((h) => h.piece === "snare"), id);
    }
    const fin = plan.moments.find((m) => m.kind === "final")!;
    assert.ok(fin.at <= formOf(f).last && formOf(f).last - fin.at < beat, id);
    assert.ok(out.some((h) => h.tick === fin.at && h.piece === "crash"));
    assert.ok(!out.some((h) => h.tick > fin.at + 1), id);
    for (const [a, z] of plan.quiet) {
      const q = out.filter((h) => h.tick >= a && h.tick < z && !plan.moments.some((m) => h.tick >= m.from - beat / 2 && h.tick <= m.at + beat / 2));
      assert.ok(!q.some((h) => h.piece === "tamb" || h.piece === "timp"), id);
    }
  }
});

test("D524: Busoni's level shades the drums (within ±4 dB); his p the quiet pattern", () => {
  const loud = hitsOf("wtc1f17", 6).out.find((h) => h.piece === "kick")!;
  const mid = hitsOf("wtc1f17", 0).out.find((h) => h.piece === "kick")!;
  assert.ok(loud.vel > mid.vel && loud.vel / mid.vel <= 10 ** (4 / 20) + 1e-9);
  assert.ok(!hitsOf("wtc1f17", -6).out.some((h) => h.piece === "tamb"));
});

test("D524: the drums on the game's clock: only with PET SOUNDS, always with it; each hit inside its beat", async () => {
  setPreset("petSounds");
  const chip = new Chip();
  await chip.prepare([48, 60, 72], [72]);
  assert.equal(grooveNow()?.kit, "pet");
  const f = fugueById("wtc1f17");
  const beat = f.tpq;
  const cx: GrooveContext = { tick: f.bars[3].on, beat, fills: [], end: f.length, piece: f };
  const t0 = ctxOf(chip).currentTime + 1;
  const n0 = chip.brushLog.length;
  assert.equal(chip.groove(t0, 1.1, 0, 3, 4, false, cx), true);
  const log = chip.brushLog.slice(n0);
  assert.ok(log.length > 0);
  assert.ok(log.every((l) => l.at >= t0 && l.at < t0 + 1.1));
  for (const p of PRESETS) assert.equal(p.groove === "petSounds", p.id === "petSounds", p.id);
  setDrums(false);
  assert.equal(grooveNow()?.kit, "pet");
  setDrums(true);
  setPreset("chip");
});

test("D524: the allocation: I/17 opens on PET SOUNDS, with its reason", () => {
  assert.equal(PIECE_SOUND.wtc1f17, "petSounds");
  assert.equal(COLOURS.wtc1f17.sound, "petSounds");
  assert.match(COLOURS.wtc1f17.soundWhy, /Pet Sounds/);
});

test("D524: the harpsichord, an honoured core sound, opens at least three fugues (I/24, II/2, II/9); SID 64 keeps four", () => {
  const count = (s: string) => Object.entries(PIECE_SOUND).filter(([id]) => /^wtc[12]f\d+$/.test(id) && PIECE_SOUND[id] === s).length;
  assert.ok(count("harpsichordSampled") >= 3, `${count("harpsichordSampled")}`);
  for (const id of ["wtc1f24", "wtc2f02", "wtc2f09"]) {
    assert.equal(PIECE_SOUND[id], "harpsichordSampled", id);
    assert.equal(COLOURS[id].sound, "harpsichordSampled", id);
    assert.ok(COLOURS[id].plans.harpsichordSampled?.length, `${id}: its colour plan`);
  }
  assert.ok(count("sid64") >= 4);
});
