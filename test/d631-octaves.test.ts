/**
 * D631-D633: THE WRITTEN OCTAVE. The owner, on II/10 with SALSA: "the high notes of ALTO were actually sounding quite low … I
 * don't want an instrument sounding low in high notes like this"; the rule: no note may sound in a different octave from the
 * one written, the band's voices and the player's own, on every sound. Found: D505's fold (a pitch more than 3 semitones over
 * a set's top recording played an octave lower) and D405's (`maxShift`: past the compass an octave nearer), with D540's sparse
 * zones dropping a set's top recording (SALSA's trombone C5: its reach A#4 + 3), and D504's compass fold. Now: no fold in the
 * pitch path (chip.ts soundingPitch: the written pitch; the folds gone from sampled.ts), each voice an instrument whose
 * compass covers its line in that fugue (octave-seats.ts, Preset.pieces), and a set read past its compass only as far as it
 * declares (SampledInstrument.extend). Every note of every voice of the 48 fugues, on every sound, held here through the
 * engine's own decision (tools/touch/octaves/audit.ts) and, at the buffer, through Chip.note.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FakeAudioContext, FakeParam, FakeSource, installFakeAudio } from "./fake-audio.ts";
import { Chip, soundingPitch, voicing } from "../src/touch/chip.ts";
import { fugueById } from "../src/touch/fugue.ts";
import * as sampled from "../src/touch/sampled.ts";
import { nearestSample, rateFor, reachOf, SAMPLED, sampledMidis, zonesOf } from "../src/touch/sampled.ts";
import { PATCHES, patchIdFor, pieceLineUp, presetById, setPieceLayout, setPreset } from "../src/touch/sound.ts";
import { hz } from "../src/touch/tuning.ts";
import { AUDIT_SOUNDS, WTC_FUGUES, auditSound } from "../tools/touch/octaves/audit.ts";
import { allExtensions } from "../tools/touch/stretch/collections.ts";

const ctxOf = installFakeAudio(0, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 5 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D631: no octave fold left in the pitch path: every patch plays the written pitch; the folds are gone", () => {
  for (const [id, pt] of Object.entries(PATCHES)) for (let m = 12; m <= 120; m++) assert.equal(soundingPitch(pt, m), m, `${id} ${m}`);
  for (const name of ["foldInto", "foldDown", "guardedPitch"]) assert.equal((sampled as Record<string, unknown>)[name], undefined, `sampled.ts ${name} withdrawn`);
  const chip = src("src/touch/chip.ts");
  assert.doesNotMatch(chip, /inCompass\(/, "no compass fold in the engine (D504's)");
  assert.doesNotMatch(chip, /foldInto|guardedPitch|foldDown/);
});

test("D631: a slimmed set's sparse zones keep its top recording (SALSA's trombone C5 had been thinned away)", () => {
  assert.deepEqual(zonesOf([40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70, 72], 3), [40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70, 72]);
  assert.deepEqual(zonesOf([60, 61, 62, 63, 64], 3), [60, 63, 64]);
  setPreset("salsa");
  setPieceLayout(null);
});

test("D631: every note of every voice of the 48 fugues, on every sound, sounds in its written octave (the player's voice is the same patch); none read past its set's declared reach", () => {
  assert.equal(WTC_FUGUES.length, 48);
  let notes = 0;
  for (const id of AUDIT_SOUNDS) {
    const a = auditSound(id);
    notes += a.notes;
    assert.equal(a.moves.length, 0, `${id}: ${a.moves.slice(0, 3).map((m) => `${m.piece} v${m.voice} ${m.patch} ${m.written}→${m.sounding}`).join(", ")}`);
    assert.equal(a.undeclared.length, 0, `${id}: ${a.undeclared.slice(0, 3).map((o) => `${o.piece} v${o.voice} ${o.patch} ${o.written} (${o.beyond} past ${o.inst})`).join(", ")}`);
  }
  assert.ok(notes > 1_500_000, `${notes} notes checked`);
});

test("D633: an extension is a retuning, never an octave's worth: every declared reach at most 12 semitones past the compass (the course twins aside, every rate within 10 cents of the written pitch)", () => {
  let most = 0;
  for (const [id, inst] of Object.entries(SAMPLED)) {
    if (!inst.extend) continue;
    for (const x of [inst.extend.up ?? 0, inst.extend.down ?? 0]) assert.ok(x >= 0 && x <= 12, `${id}: ${JSON.stringify(inst.extend)}`);
    most = Math.max(most, inst.extend.up ?? 0, inst.extend.down ?? 0);
  }
  assert.ok(most <= 12, `the largest extension ${most}`);
  // Each declared as far as the 48 need it on some sound, and every other playable piece within STRETCH_MAX (D640), and no
  // further (measured: the audits' extensions).
  const need = allExtensions();
  for (const [id, inst] of Object.entries(SAMPLED)) {
    if (!inst.extend) continue;
    const n = need[id] ?? { up: 0, down: 0 };
    assert.equal(inst.extend.up ?? 0, n.up, `${id} up (needed ${n.up})`);
    assert.equal(inst.extend.down ?? 0, n.down, `${id} down (needed ${n.down})`);
  }
  for (const [id, n] of Object.entries(need)) assert.ok(SAMPLED[id as keyof typeof SAMPLED].extend, `${id}: read ${n.up} over, ${n.down} under, undeclared`);
  // ABBEY ROAD's and PET SOUNDS' bass over A#3 on the electric bass's own recordings (D633), not the picked bass read up to 18 fast.
  assert.deepEqual(SAMPLED.rockBass.above, { set: "ebass", from: 59 });
  assert.ok(sampledMidis("ebass").includes(73), "ebass/ to C#5");
});

/**
 * Whether a buffer's rate sounds `m` from one of the set's recordings near it (the nearest, or a neighbour within 3 more
 * semitones: a course's twin, D322's second string), within 10 cents (the twin's detune): an octave fold reads a recording
 * 12 semitones off, outside that window.
 */
function sounds(set: string, m: number, x: number): boolean {
  const near = nearestSample(set, m)!;
  return sampledMidis(set).some((r) => Math.abs(r - m) <= Math.abs(near - m) + 3 && Math.abs(1200 * Math.log2(x / rateFor(set, r, hz(m)))) < 10);
}

/** The playback rates Chip.note starts for one note on a voicing. */
async function rates(sound: string, piece: string, voice: number, midi: number, patch?: keyof typeof PATCHES) {
  setPreset(sound);
  const f = fugueById(piece);
  // (`patch`: the sound's own line-up, no piece's, so that patch's recordings are the ones loaded.)
  setPieceLayout(patch ? null : pieceLineUp(sound, f));
  const chip = new Chip();
  await chip.prepare([midi], [midi], patch ? undefined : { piece, count: f.voices.length, notes: [] });
  const ctx = ctxOf();
  const before = new Set(ctx.nodes);
  const v = voicing(voice, f.voices.length);
  chip.note(midi, 1, 0.4, patch ? { ...v, patch: PATCHES[patch] } : v, {});
  const made = [...ctx.nodes].filter((x) => !before.has(x));
  return made.filter((x): x is FakeSource => x instanceof FakeSource && x.kind === "buffer").map((s) => (s.playbackRate as FakeParam).value);
}

test("D631, II/10 on SALSA: the alto's high notes at their written pitch at the buffer (the trombone's C5 read up, never an octave down); the alto now on the second trumpet (its E3 read down to C3)", async () => {
  const f = fugueById("wtc2f10");
  assert.equal(presetById("salsa").pieces?.wtc2f10?.[3]?.[1]?.[0], "s2Trumpet");
  setPreset("salsa");
  setPieceLayout(pieceLineUp("salsa", f));
  assert.equal(patchIdFor(1, 3), "s2Trumpet");
  const alto = f.voices[1].map((n) => n[2]);
  const tpt = SAMPLED[PATCHES.s2Trumpet.sample!];
  const r = reachOf(tpt, tpt.set);
  assert.ok(Math.min(...alto) >= r.lo && Math.max(...alto) <= r.hi, "the trumpet (extended to C3) covers the alto's C3-F#5");
  for (const m of [74, 76, 78]) {
    const xs = await rates("salsa", "wtc2f10", 1, m);
    assert.ok(xs.length > 0, `${m}: a recording`);
    for (const x of xs) assert.ok(sounds(tpt.set, m, x), `${m}: rate ${x.toFixed(4)}`);
    // The trombone itself (the old seat): F#5 read up from its C5, not down from F#4.
    const tb = await rates("salsa", "wtc2f10", 1, m, "s2Trombone");
    const set = SAMPLED.brassTrombone.set;
    const up = rateFor(set, nearestSample(set, m)!, hz(m));
    assert.ok(up > 1, `${m}: the trombone read fast (${up.toFixed(3)})`);
    assert.ok(tb.length > 0);
    for (const x of tb) assert.ok(sounds(set, m, x) && x > 1, `${m}: trombone rate ${x.toFixed(4)} against ${up.toFixed(4)}`);
  }
  setPieceLayout(null);
  setPreset("chip");
});
