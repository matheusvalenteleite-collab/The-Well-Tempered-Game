/**
 * D524: PET SOUNDS, ONE OF THE GAME'S SOUNDS ("orchestral plus electric, 1960s"): the string section on top, the horn, the
 * harpsichord (five voices), the grand, the picked electric bass; one echo chamber; and ITS DRUMS: a 1966 ballad's kit
 * with the tambourine, the timpani's rhythm tuned to the bass's own note (never a pitch of their own), the fugue's form read
 * from its entries (a fill into each, the episodes quieter, a break before the final group, a closing flourish); no bells;
 * never the score, never a tempo change, never with another sound.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeAudioContext, installFakeAudio } from "./fake-audio.ts";
import { MIN_GAP_BARS, bassAt, petBeat, petPlan } from "../src/touch/pet-drums.ts";
import { arrivals, homeTimpani } from "../src/touch/score-drums.ts";
import { beatOf, fugueById } from "../src/touch/fugue.ts";
import { entrySpans } from "../src/touch/voice-mode.ts";
import { formOf } from "../src/touch/form-points.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { COLOURS } from "../tools/touch/colour-plans/index.ts";


installFakeAudio(0, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 4 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;


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

test("D532: PET SOUNDS' timpani under the timpani rule: the home tonic and dominant only, only at structural arrivals (and the rolls into them)", () => {
  for (const id of ["wtc1f17", "wtc1f21", "wtc2f17"]) {
    const { f, beat, plan, out } = hitsOf(id);
    const timp = out.filter((h) => h.piece === "timp");
    const home = homeTimpani(f.key);
    const arr = arrivals(f).filter((a) => a.midi !== null && a.kind !== "pedal");
    assert.ok(timp.length > 0 && timp.length < 60, `${id}: ${timp.length}`);
    for (const h of timp) {
      assert.ok(h.midi === home.tonic || h.midi === home.dominant, `${id}: ${h.midi} not the home tonic or dominant`);
      // On an arrival, or in the fill (or the flourish) that lands on one.
      const m = plan.moments.find((x) => h.tick >= x.from - beat / 2 && h.tick <= x.at + beat / 2);
      assert.ok(arr.some((a) => Math.abs(a.tick - h.beatOn) < beat || (m && Math.abs(a.tick - m.at) < beat)), `${id} ${h.tick}: no arrival`);
    }
    // The final chord is one: struck on the tonic.
    const fin = plan.moments.find((x) => x.kind === "final")!;
    assert.ok(timp.some((h) => Math.abs(h.tick - fin.at) < 1 && h.midi === home.tonic), id);
  }
});

test("D524: the pattern in 4/4: the bass drum on 1 and 3, the snare on 2 and 4, the tambourine's eighths (D532: no timpani between the arrivals)", () => {
  const { f, plan, out } = hitsOf("wtc1f17");
  const bar = f.bars.find((b) => bassAt(plan, b.on + 1) !== null && !plan.moments.some((m) => m.from < b.on + f.barTicks && m.at >= b.on - f.barTicks / 2) && !plan.quiet.some(([a, z]) => a < b.on + f.barTicks && z > b.on))!;
  const q = f.tpq;
  const at = (piece: string) => out.filter((h) => h.piece === piece && h.tick >= bar.on && h.tick < bar.on + f.barTicks).map((h) => (h.tick - bar.on) / q);
  assert.deepEqual(at("kick"), [0, 1.5, 2]);
  assert.deepEqual(at("snare"), [1, 3]);
  assert.deepEqual(at("tamb"), [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
  assert.deepEqual(at("timp"), []);
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

test("D524: the harpsichord, an honoured core sound, opens at least two fugues (II/2, II/9; D590: I/24 to ORCHESTRA & ORGAN, the owner: \"definitely not harpsichord\"); SID 64 keeps four", () => {
  const count = (s: string) => Object.entries(PIECE_SOUND).filter(([id]) => /^wtc[12]f\d+$/.test(id) && PIECE_SOUND[id] === s).length;
  assert.ok(count("harpsichordSampled") >= 2, `${count("harpsichordSampled")}`);
  for (const id of ["wtc2f02", "wtc2f09"]) {
    assert.equal(PIECE_SOUND[id], "harpsichordSampled", id);
    assert.equal(COLOURS[id].sound, "harpsichordSampled", id);
    assert.ok(COLOURS[id].plans.harpsichordSampled?.length, `${id}: its colour plan`);
  }
  assert.ok(count("sid64") >= 4);
});
