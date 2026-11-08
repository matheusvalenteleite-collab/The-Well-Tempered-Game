/**
 * D521: BOSSA NOVA, ONE OF THE GAME'S SOUNDS: the flute on top, the grand, the nylon guitar (Iowa's Raimundo, mf and pp), the
 * double bass pizzicato; one studio; the player's touch each instrument's own; and ITS DRUMS: the bossa on the score's eighths
 * (the bass drum's "boom-ba", the cross-stick's clave, the brush's eighths, the hi-hat's foot), the fugue's form read from its
 * entries (a fill into each, the episodes quieter, a break before the last, a closing flourish); never the score, never a
 * tempo change, never with another sound.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { readdirSync, statSync } from "node:fs";
import { FakeAudioContext, installFakeAudio } from "./fake-audio.ts";
import { Chip, REVERBS, type GrooveContext } from "../src/touch/chip.ts";
import { BOSSA_CREDIT, BOSSA_SEND, DYNAMIC_SOUNDS, PATCHES, PRESETS, creditFor, grooveNow, offered, presetById, setDrums, setPreset } from "../src/touch/sound.ts";
import { BOSSA_KIT_MIDIS, BOSSA_KIT_SET, SAMPLED, sampledMidis } from "../src/touch/sampled.ts";
import { SAMPLE_MANIFEST } from "../src/audio/sample-manifest.ts";
import { TOUCH_KINDS, holdMode, landing } from "../src/touch/touch-expr.ts";
import { KICK_8THS, MIN_GAP_BARS, RIM_8THS, bossaBeat, bossaPlan, eighthsPerBeat } from "../src/touch/bossa-drums.ts";
import { beatOf, fugueById } from "../src/touch/fugue.ts";
import { entrySpans } from "../src/touch/voice-mode.ts";
import { formOf } from "../src/touch/form-points.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { slideFamily } from "../src/bench/slide-sound.ts";
import { exprFamily } from "../src/bench/glenn.ts";
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

const BOSSA = presetById("bossaNova");
const ctxOf = (c: Chip) => (c as unknown as { ctx: FakeAudioContext }).ctx;

test("D521: BOSSA NOVA offered: in the lists, an ensemble, named in three languages, credited, Busoni's dynamics reach it", () => {
  assert.ok(offered("bossaNova"));
  assert.equal(BOSSA.name, "BOSSA NOVA");
  assert.ok(POP_SOUNDS.some((r: readonly unknown[]) => r[0] === "bossaNova"));
  assert.ok(SOUND_GROUPS.find((r: readonly unknown[]) => r[0] === "ENSEMBLES")![1].includes("bossaNova"));
  assert.equal(PT["BOSSA NOVA"], "BOSSA NOVA");
  assert.equal(ES["BOSSA NOVA"], "BOSSA NOVA");
  assert.equal(creditFor("bossaNova"), BOSSA_CREDIT);
  assert.match(BOSSA_CREDIT, /IOWA/);
  assert.match(BOSSA_CREDIT, /CC BY 3\.0/);
  assert.ok(DYNAMIC_SOUNDS.has("bossaNova"));
});

test("D521: the band: the flute on top, the grand and the guitar inside, the bass on the bass; one studio at one send; within ±0.2", () => {
  const by = BOSSA.by!;
  assert.deepEqual(by[2]!.map(([p]) => p), ["bnFlute", "bnGuitar"]);
  assert.deepEqual(by[3]!.map(([p]) => p), ["bnFlute", "bnGuitar", "bnBass"]);
  assert.deepEqual(by[4]!.map(([p]) => p), ["bnFlute", "bnPiano", "bnGuitar", "bnBass"]);
  assert.deepEqual(by[5]!.map(([p]) => p), ["bnFlute", "bnPiano", "bnPiano", "bnGuitar", "bnBass"]);
  for (const vs of Object.values(by)) {
    for (const [, pan] of vs!) assert.ok(Math.abs(pan) <= 0.2);
    // Each instrument its own place: no two different instruments on one seat.
    const seats = new Map<number, string>();
    for (const [p, pan] of vs!) assert.ok(!seats.has(pan) || seats.get(pan) === p), seats.set(pan, p);
  }
  assert.equal(BOSSA.fx, "bossa");
  assert.ok(REVERBS.bossa.rt60 < 1.2);
  for (const id of ["bnFlute", "bnGuitar", "bnPiano", "bnBass"] as const) assert.equal(PATCHES[id].send, BOSSA_SEND, id);
  assert.equal(PATCHES.bnGuitar.sample, "bossaGuitar");
  assert.equal(PATCHES.bnBass.sample, "jazzBass");
  assert.equal(PATCHES.bnPiano.sample, "piano");
  // The bass on a phone: its upper partials lifted (JAZZ QUARTET's).
  assert.ok((PATCHES.bnBass.phoneLift?.db ?? 0) >= 10);
});

test("D521: the recordings: the guitar E2-B5 (mf every semitone but C5 and E3, pp every whole tone), the kit's four files; small", () => {
  const mf = sampledMidis("bossaGuitar");
  assert.equal(mf[0], 40);
  assert.equal(mf[mf.length - 1], 83);
  assert.ok(mf.length >= 42);
  assert.ok(sampledMidis("bossaGuitarSoft").length >= 20);
  assert.equal(SAMPLED.bossaGuitar.soft?.set, "bossaGuitarSoft");
  assert.ok(SAMPLED.bossaGuitar.plucked);
  assert.deepEqual(SAMPLE_MANIFEST[BOSSA_KIT_SET].notes.length, BOSSA_KIT_MIDIS.length);
  let bytes = 0;
  for (const d of ["bossaGuitar", "bossaGuitarSoft", "bossaKit"]) for (const f of readdirSync(`public/samples/${d}`)) if (f !== "pack.mp3") bytes += statSync(`public/samples/${d}/${f}`).size;
  assert.ok(bytes < 2.2e6, `${bytes} bytes`);
});

test("D521: the player's touch as JAZZ QUARTET's: the guitar's pluck by the zone (pp, mf), the flute's breath held", () => {
  assert.equal(TOUCH_KINDS.bossaNova, "jazz");
  assert.equal(landing("jazz", 0.05, 60, PATCHES.bnGuitar).layer, "soft");
  assert.equal(landing("jazz", 0.5, 60, PATCHES.bnGuitar).layer, "firm");
  assert.equal(holdMode("jazz", PATCHES.bnFlute, false), "breath");
  assert.equal(holdMode("jazz", PATCHES.bnGuitar, true), "none");
  assert.equal(slideFamily("bossaNova", PATCHES.bnFlute), "flute");
  assert.equal(slideFamily("bossaNova", PATCHES.bnGuitar), "plucked");
  assert.equal(slideFamily("bossaNova", PATCHES.bnBass), "bass");
  assert.equal(exprFamily("bossaNova"), "plucked");
});

/** Every hit of a fugue's beats over [from, to) (ticks), on its clock. */
function hitsOf(id: string, from = 0, to = Infinity, dynDb = 0) {
  const f = fugueById(id);
  const { ticks: beat, perBar: per } = beatOf(f);
  const compound = beat !== f.tpq * (4 / Number(f.meter.split("/")[1]));
  const plan = bossaPlan(f, beat, per);
  const out: { tick: number; piece: string; vel: number }[] = [];
  for (let t = f.bars[0].on; t < Math.min(to, f.length); t += beat) {
    if (t < from) continue;
    const b = Math.round((t - f.bars[0].on) / beat) % per;
    const bb = bossaBeat(b, per, compound, t, beat, f.tpq, plan, dynDb);
    for (const h of bb.hits) out.push({ tick: t + h.at * beat, piece: h.piece, vel: h.vel });
    for (const s of bb.sweeps) out.push({ tick: t + s.at * beat, piece: s.piece, vel: s.peak });
  }
  return { f, beat, per, plan, out };
}

test("D521: the pattern in 2/2: the bass drum's boom-ba, the cross-stick's clave over two bars, the brush's eighths, the foot on 2 and 4", () => {
  const { f, plan, out } = hitsOf("wtc2f07");
  const eighth = f.tpq / 2;
  // Two bars with no moment and outside any episode.
  const bar = f.bars.find((b, i) => i > 0 && i % 2 === 0 && !plan.moments.some((m) => m.from < b.on + 2 * f.barTicks && m.at >= b.on - f.barTicks) && !plan.quiet.some(([a, z]) => a < b.on + 2 * f.barTicks && z > b.on))!;
  const i0 = f.bars.indexOf(bar);
  const pos = (piece: string, n: number) =>
    out.filter((h) => h.piece === piece && h.tick >= f.bars[i0 + n].on && h.tick < f.bars[i0 + n].on + f.barTicks).map((h) => Math.round((h.tick - f.bars[i0 + n].on) / eighth));
  assert.deepEqual(pos("kick", 0), KICK_8THS.map(([p]) => p));
  const clave = i0 % 2;
  assert.deepEqual(pos("rim", 0), [...RIM_8THS[clave]]);
  assert.deepEqual(pos("rim", 1), [...RIM_8THS[1 - clave]]);
  assert.deepEqual(pos("tap", 0), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(pos("foot", 0), [2, 6]);
  assert.equal(eighthsPerBeat(f.tpq * 2, f.tpq, false), 4);
});

test("D521: the form: a fill into entries, spaced; the episodes quieter; a bar's break before the final entry; the flourish, then nothing", () => {
  for (const id of ["wtc2f07", "wtc2f13", "wtc1f17", "wtc2f12"]) {
    const { f, beat, plan, out } = hitsOf(id);
    const spans = entrySpans(f).filter((s) => s.form !== "counter").sort((a, b) => a.on - b.on);
    const fills = plan.moments.filter((m) => m.kind === "fill");
    assert.ok(fills.length >= 2, id);
    for (const m of fills) assert.ok(spans.some((s) => s.on >= m.at && s.on < m.at + beat), `${id}: a fill lands on an entry`);
    for (let i = 1; i < fills.length; i++) assert.ok(fills[i].at - fills[i - 1].at >= MIN_GAP_BARS * f.barTicks, id);
    // The break: nothing but one pick-up tap.
    const brk = plan.moments.find((m) => m.kind === "break");
    if (brk) {
      const inBreak = out.filter((h) => h.tick >= brk.from && h.tick < brk.at - 1);
      assert.ok(inBreak.length <= 1 && inBreak.every((h) => h.piece === "tap"), id);
      assert.ok(spans.some((x) => x.on - brk.at < beat && x.on >= brk.at), id);
    }
    // The flourish: the last downbeat struck, nothing after it.
    const fin = plan.moments.find((m) => m.kind === "final")!;
    assert.ok(fin.at <= formOf(f).last && formOf(f).last - fin.at < beat, id);
    assert.ok(out.some((h) => h.tick === fin.at && h.piece === "ride"));
    assert.ok(!out.some((h) => h.tick > fin.at + 1), id);
    // An episode's pattern: the stir, no brush eighths, quieter.
    for (const [a, z] of plan.quiet) {
      const q = out.filter((h) => h.tick >= a && h.tick < z && !plan.moments.some((m) => h.tick >= m.from - beat / 2 && h.tick <= m.at + beat / 2));
      assert.ok(!q.some((h) => h.piece === "tap"), id);
    }
  }
  assert.ok(bossaPlan(fugueById("wtc2f07"), fugueById("wtc2f07").tpq * 2, 2).moments.some((m) => m.kind === "break"));
});

test("D521: Busoni's level shades the drums (within ±4 dB); his p the quiet pattern; never the score or a switch", () => {
  const loud = hitsOf("wtc2f07", 0, 3000, 6).out.filter((h) => h.piece === "kick");
  const mid = hitsOf("wtc2f07", 0, 3000, 0).out.filter((h) => h.piece === "kick");
  const soft = hitsOf("wtc2f07", 0, 3000, -6).out;
  assert.ok(loud[0].vel > mid[0].vel && loud[0].vel / mid[0].vel <= 10 ** (4 / 20) + 1e-9);
  assert.ok(!soft.some((h) => h.piece === "tap") && soft.some((h) => h.piece === "stir"));
});

test("D521: the drums on the game's clock: only with BOSSA NOVA, always with it; each hit inside its beat", async () => {
  setPreset("bossaNova");
  const chip = new Chip();
  await chip.prepare([48, 60, 72], [72]);
  assert.equal(grooveNow()?.kit, "bossa");
  const f = fugueById("wtc2f07");
  const beat = f.tpq * 2;
  const cx: GrooveContext = { tick: f.bars[6].on, beat, fills: [], end: f.length, piece: f };
  const t0 = ctxOf(chip).currentTime + 1;
  const n0 = chip.brushLog.length;
  assert.equal(chip.groove(t0, 0.97, 0, 6, 2, false, cx), true);
  const log = chip.brushLog.slice(n0);
  assert.ok(log.length > 0);
  assert.ok(log.every((l) => l.at >= t0 && l.at < t0 + 0.97));
  for (const p of PRESETS) assert.equal(p.groove === "bossaNova", p.id === "bossaNova", p.id);
  setDrums(false);
  assert.equal(grooveNow()?.kit, "bossa", "DRUMS off: still the band's drummer");
  setDrums(true);
  setPreset("chip");
});

test("D521: the allocation: II/7 opens on BOSSA NOVA, with its reason; II/13 on SID 64 (the owner wanting it used more)", () => {
  assert.equal(PIECE_SOUND.wtc2f07, "bossaNova");
  assert.equal(COLOURS.wtc2f07.sound, "bossaNova");
  assert.match(COLOURS.wtc2f07.soundWhy, /bossa/);
  assert.equal(PIECE_SOUND.wtc2f13, "sid64");
  assert.equal(COLOURS.wtc2f13.sound, "sid64");
  assert.equal(PIECE_SOUND.wtc1f09, "baroqueBand", "I/9 stays BAROQUE BAND's (its bass enters last, with the continuo)");
});
