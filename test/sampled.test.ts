import { test } from "node:test";
import assert from "node:assert/strict";
import { SAMPLE_MANIFEST } from "../src/audio/sample-manifest.ts";
import { BUDGET, decodedBytes, midiOfName, monoFor, nameOfMidi, nearestSample, noteInfo, notesFor, onsetOf, planFor, rateFor, SAMPLED, sampledMidis, sampleHz } from "../src/touch/sampled.ts";
import { FAMILIES, PATCHES, presetById, sampledNow, setPreset } from "../src/touch/sound.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { hz, setTuning } from "../src/touch/tuning.ts";

const range = (a: number, b: number, step = 1) => Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step);

test("D190: note names as the files have them (C4 = middle C)", () => {
  assert.equal(midiOfName("C4"), 60);
  assert.equal(midiOfName("Cs4"), 61);
  assert.equal(midiOfName("A1"), 33);
  assert.equal(midiOfName("F6"), 89);
  for (let m = 20; m < 100; m++) assert.equal(midiOfName(nameOfMidi(m)), m);
  assert.throws(() => midiOfName("H4"));
});

test("D190: the manifest has every recording, and each its measured length (and the organ its loop)", () => {
  assert.deepEqual(sampledMidis("harpsichord"), range(33, 89));
  assert.deepEqual(sampledMidis("harpsichordRel"), range(33, 89));
  assert.deepEqual(sampledMidis("pipeOrgan"), range(24, 84, 3));
  assert.deepEqual(sampledMidis("pipePedal"), range(24, 54, 3));
  for (const set of ["harpsichord", "harpsichordRel", "pipeOrgan", "pipePedal"]) {
    for (const n of SAMPLE_MANIFEST[set].notes) assert.ok(SAMPLE_MANIFEST[set].pack[`${n}.mp3`][1] > 1000, `${set}/${n}`);
  }
  for (const set of ["harpsichord", "pipeOrgan", "pipePedal"]) {
    for (const m of sampledMidis(set)) {
      const info = noteInfo(set, m);
      assert.ok(info && info.len > 2.5 && info.len <= 7, `${set} ${m}`);
      assert.ok(Math.abs(info.cents) < 10, `${set} ${m} tuned within 10 cents`);
      if (set !== "harpsichord") {
        const [a, b] = info.loop!;
        assert.ok(a >= 0.9 && b - a >= 1.5 && b + 0.1 <= info.len, `${set} ${m} loop ${a}-${b} in ${info.len}`);
      } else assert.equal(info.loop, undefined);
    }
  }
  // The bass rings longer than the treble (6.5 s down to 3 s).
  assert.ok(noteInfo("harpsichord", 33)!.len > noteInfo("harpsichord", 89)!.len + 3);
});

test("D190: the nearest recording, clamped at the compass's ends", () => {
  assert.equal(nearestSample("harpsichord", 60), 60);
  assert.equal(nearestSample("harpsichord", 20), 33);
  assert.equal(nearestSample("harpsichord", 100), 89);
  assert.equal(nearestSample("pipeOrgan", 61), 60);
  assert.equal(nearestSample("pipeOrgan", 62), 63);
  assert.equal(nearestSample("pipeOrgan", 90), 84);
  // Only among those allowed (the loaded ones).
  assert.equal(nearestSample("pipeOrgan", 61, (m) => m !== 60), 63);
  assert.equal(nearestSample("pipeOrgan", 61, () => false), null);
});

test("D190: the rate retunes the recording to the tuning's pitch (temperaments, A = 415)", () => {
  try {
    for (const [t, a] of [["equal", 440], ["werckmeister", 440], ["meantone", 415], ["kirnberger", 415]] as const) {
      setTuning(t, a);
      for (const midi of [36, 49, 60, 61, 68, 75, 85]) {
        for (const set of ["harpsichord", "pipeOrgan"]) {
          const s = nearestSample(set, midi)!;
          const rate = rateFor(set, s, hz(midi));
          assert.ok(Math.abs(rate * sampleHz(set, s) - hz(midi)) < 1e-9);
          assert.ok(rate > 0.8 && rate < 1.25, `${t} ${set} ${midi}: ${rate}`);
        }
      }
    }
    // The harpsichord is chromatic: in equal temperament at 440 the rate only undoes what was measured.
    setTuning("equal", 440);
    const c = noteInfo("harpsichord", 40)!.cents;
    assert.ok(Math.abs(1200 * Math.log2(rateFor("harpsichord", 40, hz(40))) + c) < 1e-9);
    // Meantone's G sharp is 27 cents flat of equal: the recording follows it.
    const eq = rateFor("harpsichord", 68, hz(68));
    setTuning("meantone", 440);
    const mt = rateFor("harpsichord", 68, hz(68));
    assert.ok(Math.abs(1200 * Math.log2(mt / eq) - (-27.4 - -10.3)) < 1e-6);
    // A = 415 a semitone down.
    setTuning("equal", 415);
    assert.ok(Math.abs(1200 * Math.log2(rateFor("pipeOrgan", 69, hz(69))) + 1200 * Math.log2(440 / 415) + noteInfo("pipeOrgan", 69)!.cents) < 1e-6);
  } finally {
    setTuning("equal", 440);
  }
});

test("D190: a piece loads only the recordings of its range (and two semitones round it)", () => {
  assert.deepEqual(notesFor("harpsichord", [60, 64, 67]), range(58, 69));
  assert.deepEqual(notesFor("pipeOrgan", [60]), [57, 60, 63]);
  assert.deepEqual(notesFor("harpsichord", [33], 2), [33, 34, 35]);
  // The player's own voice also an octave either side (ORGANO PLENO), the pedal below where it reaches.
  const plan = planFor(SAMPLED.organ, [60, 62], [48]);
  const sets = Object.fromEntries(plan.map((p) => [p.set, p.notes]));
  assert.ok(sets.pipeOrgan.includes(36) && sets.pipeOrgan.includes(60) && sets.pipeOrgan.includes(63));
  assert.deepEqual(sets.pipePedal, [33, 36, 39]);
  const h = planFor(SAMPLED.harpsichord, [60, 61]);
  assert.deepEqual(h.map((p) => p.set), ["harpsichord", "harpsichordRel"]);
  assert.deepEqual(h[0].notes, h[1].notes);
});

test("D190: the memory a piece's recordings take, and the phone's budget", () => {
  // One stereo harpsichord note at 48 kHz: its length x 48000 x 2 channels x 4 bytes.
  const one = [{ set: "harpsichord", notes: [60] }];
  assert.equal(decodedBytes(one), Math.ceil(noteInfo("harpsichord", 60)!.len * 48000) * 8);
  assert.equal(decodedBytes(one, 48000, true) * 2, decodedBytes(one));
  // The organ is mono.
  assert.equal(decodedBytes([{ set: "pipeOrgan", notes: [60] }]), Math.ceil(noteInfo("pipeOrgan", 60)!.len * 48000) * 4);
  // The whole harpsichord would be over 100 MB in stereo: too much for a phone.
  const all = [{ set: "harpsichord", notes: sampledMidis("harpsichord") }];
  assert.ok(decodedBytes(all) > 100e6 && decodedBytes(all) < 130e6);
  // Book I's C minor fugue, the alto played: a phone folds it to mono, a computer keeps it in stereo.
  const f = fugueById("wtc1f02");
  const plan = planFor(SAMPLED.harpsichord, f.voices.flat().map((n) => n[2]), f.voices[1].map((n) => n[2]));
  const mb = decodedBytes(plan) / 1e6;
  assert.ok(mb > 40 && mb < 110, `${mb} MB`);
  assert.ok(decodedBytes(plan, 48000, true) < BUDGET.phone);
  assert.equal(monoFor(plan, 48000, BUDGET.computer), false);
  // The organ's whole plan is small.
  const organ = planFor(SAMPLED.organ, f.voices.flat().map((n) => n[2]), f.voices[1].map((n) => n[2]));
  assert.ok(decodedBytes(organ) < 30e6);
});

test("D190: where a decoded recording begins (the decoder's delay measured)", () => {
  const sr = 48000;
  const d = new Float32Array(sr);
  for (let i = 1200; i < d.length; i++) d[i] = Math.sin(i / 10) * Math.exp(-(i - 1200) / 20000) * 0.5;
  assert.ok(Math.abs(onsetOf(d, sr) - (1200 / sr - 0.001)) < 0.0005);
  assert.equal(onsetOf(new Float32Array(100), sr), 0);
});

test("D190: the sampled presets play every voice on their instrument", () => {
  const acoustic = FAMILIES.find((f) => f.name === "ACOUSTIC")!.presets;
  for (const [id, inst] of [["harpsichordSampled", "harpsichord"], ["organSampled", "organ"]] as const) {
    const p = presetById(id);
    assert.equal(p.id, id);
    assert.ok(acoustic.includes(p));
    for (const s of p.slots!) assert.equal(PATCHES[s].sample, inst);
    setPreset(id);
    assert.deepEqual(sampledNow(), [inst]);
  }
  setPreset("bossa");
  assert.deepEqual(sampledNow(), []);
});
