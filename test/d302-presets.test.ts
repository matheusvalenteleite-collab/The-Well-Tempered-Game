/**
 * D302: the two singing presets (VOCAL SYNTH: formant synthesis; SOLO VOICES: recorded singers with
 * syllables), and what a note of the new presets costs a phone.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeNode, type FakeParam, installFakeAudio } from "./fake-audio.ts";
import { Chip, SING_GAIN, voicing } from "../src/touch/chip.ts";
import { CONSONANTS, creditFor, PATCHES, presetById, setPreset, VOWELS } from "../src/touch/sound.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { SAMPLED } from "../src/touch/sampled.ts";

const ctxOf = installFakeAudio(0, true);

test("D302: VOCAL SYNTH: five singers, each its own voice type, vowel and consonant; formants where a phone's speaker hears; a bass without vibrato", () => {
  const pr = presetById("vocalSynth");
  const sings = pr.slots!.map((s) => PATCHES[s].sing!);
  assert.equal(new Set(sings.map((s) => `${s.type}/${s.vowel}/${s.cons}/${s.size}`)).size, 5);
  assert.equal(new Set(sings.map((s) => s.cons)).size, 5, "five syllables: la, mi, ra, na, da");
  // D304: the mezzo and the tenor on "a" ("o" was tried: 9-12 dB weaker through a phone's speaker than on a full-range one).
  assert.deepEqual(sings.map((s) => s.cons + s.vowel), ["la", "mi", "ra", "na", "da"]);
  for (const s of sings) {
    for (const [f, db, bw] of VOWELS[s.type][s.vowel]) assert.ok(f >= 250 && f <= 5000 && db <= 0 && bw >= 40 && bw <= 200);
    assert.ok(s.scoop >= 15 && s.scoop <= 100 && s.over > 0 && s.over <= 20 && s.fall >= 40, `${s.cons}${s.vowel}`);
    // D304: nothing glitters above the formants.
    assert.ok(s.top && s.top <= 7000, `${s.cons}${s.vowel}: a lowpass over the voice`);
  }
  // D304: the low voices less trumpet-like: a softer glottis, smaller scoops, wider formants, a quieter singer's formant.
  const waves = pr.slots!.map((s) => PATCHES[s].osc[0].wave);
  // D305: the top a softer glottis too (a grown woman's voice, not the "idol").
  assert.deepEqual(waves, ["glottalWarm", "glottalWarm", "glottalWarm", "glottalLow", "glottalLow"]);
  for (const s of sings.slice(3)) assert.ok(s.scoop <= 25 && (s.bw ?? 1) > 1 && (s.upper ?? 0) < 0 && s.breath >= 0.2 && s.ring === 0);
  assert.equal(PATCHES.vocDa.vib, undefined);
  assert.equal(sings[4].type, "bass");
  assert.equal(sings[0].type, "soprano");
  assert.ok(sings[0].ring >= sings[4].ring, "the top the brightest (the idol timbre)");
  assert.ok(SING_GAIN > 1);
  // No product or character names.
  for (const id of ["vocalSynth", "soloVoices"]) assert.ok(!/VOCALOID|MIKU|UTAU|SYNTHESIZER V|CEVIO|KAITO|LUKA|TETO/.test(presetById(id).name));
});

/** The nodes one note makes (the effect built by a note before). */
function noteNodes(presetId: string, voice: number, count: number, play = {}) {
  setPreset(presetId);
  const chip = new Chip();
  const ctx = ctxOf();
  chip.note(60, 0, 0.05, voicing(voice, count));
  const before = new Set(ctx.nodes);
  const sources = ctx.sources.size;
  chip.note(64, 1, 0.8, voicing(voice, count), play);
  return { made: [...ctx.nodes].filter((n) => !before.has(n)), sources: ctx.sources.size - sources };
}

test("D302: a sung note: a new syllable comes from its consonant into the vowel, the pitch scooped; joined, the vowel goes on and the pitch glides", () => {
  const fresh = noteNodes("vocalSynth", 0, 4).made;
  const bps = fresh.filter((n) => n.kind === "filter" && (n.type as string) === "bandpass");
  assert.equal(bps.length, 5, "five formants");
  const f1 = bps[0].frequency as FakeParam;
  const sing = PATCHES.vocLa.sing!;
  assert.ok(Math.abs(f1.valueAt(1) - CONSONANTS.l.f[0] * 1.12 * sing.size) < 1, "F1 from the l's");
  assert.ok(Math.abs(f1.valueAt(1.3) - VOWELS.soprano.a[0][0] * sing.size) < 5, "into the a's");
  const osc = fresh.find((n) => n.kind === "oscillator" && (n.detune as FakeParam).events.length > 2)!;
  assert.ok((osc.detune as FakeParam).valueAt(1) <= -sing.scoop + 1, "scooped from below");
  assert.ok((osc.detune as FakeParam).valueAt(1.07) > 0, "over the note");
  const joined = noteNodes("vocalSynth", 0, 4, { legato: true, from: 62 }).made;
  const jb = joined.filter((n) => n.kind === "filter" && (n.type as string) === "bandpass");
  assert.equal((jb[0].frequency as FakeParam).events.length, 0, "no consonant: the formants at the vowel");
  const jo = joined.find((n) => n.kind === "oscillator" && (n.frequency as FakeParam).events.length)!;
  const fr = jo.frequency as FakeParam;
  assert.ok(fr.valueAt(1) < fr.valueAt(1.2) * 0.9, "gliding up from D to E");
  // A phrase's end falls.
  const last = noteNodes("vocalSynth", 0, 4, { final: true }).made;
  const lo = last.find((n) => n.kind === "oscillator" && (n.detune as FakeParam).events.length > 3)!;
  assert.ok((lo.detune as FakeParam).valueAt(1.78) < -sing.fall * 0.8, "falling off the end");
});

test("D302: SOLO VOICES: the four singers recorded, a syllable at each new note and none when joined; credited", () => {
  const pr = presetById("soloVoices");
  // D358: the second soprano a soprano (no synth choir among the soloists); one text: every singer the same syllable.
  assert.deepEqual(pr.slots!.map((s) => PATCHES[s].sample), ["voiceS", "voiceS", "voiceA", "voiceT", "voiceB"]);
  assert.equal(new Set(pr.slots!.map((s) => PATCHES[s].syllable!.cons)).size, 1);
  for (const id of ["voiceS", "voiceA", "voiceT", "voiceB", "choirAah"] as const) assert.equal(SAMPLED[id].plucked, false);
  assert.match(creditFor("soloVoices")!, /VOCALSET.*CC BY 4\.0/);
  assert.match(creditFor("tracker")!, /FLUIDR3/);
  assert.equal(creditFor("chamberOrgan"), null);
});

test("D302: SOLO VOICES from the recordings: a new syllable opens from a lowpass (D304: no synthesized burst, the clicks); joined, none", async () => {
  setPreset("soloVoices");
  await new Chip().prepare(fugueById("wtc1f02").voices.flat().map((n) => n[2]));
  const fresh = noteNodes("soloVoices", 3, 4).made; // the bass of four: "da"
  const lp = fresh.find((n) => n.kind === "filter" && (n.type as string) === "lowpass" && (n.frequency as FakeParam).events.length);
  assert.ok(lp && (lp.frequency as FakeParam).valueAt(1) === CONSONANTS.d.open, "the d's opening");
  assert.ok(!fresh.some((n) => n.kind === "filter" && (n.type as string) === "bandpass"), "no burst of noise (D304: it clicked)");
  const joined = noteNodes("soloVoices", 3, 4, { legato: true, from: 62 }).made;
  assert.ok(!joined.some((n) => n.kind === "filter" && (n.type as string) === "lowpass" && (n.frequency as FakeParam).events.length), "no consonant when joined");
});

test("D302: what a note costs a phone: VOCAL SYNTH about 23 nodes (two sources and an LFO), PIPE ORGAN's synthesized registrations 13-22", async () => {
  const sung = noteNodes("vocalSynth", 0, 4);
  assert.ok(sung.made.length <= 24, `${sung.made.length} nodes`);
  setPreset("chamberOrgan");
  await new Chip().prepare(fugueById("wtc1f02").voices.flat().map((n) => n[2]));
  const counts = [0, 1, 2, 3].map((v) => noteNodes("chamberOrgan", v, 4).made.length);
  // D349: one organ, its pedal synthesized as its manuals are (the plenum's recordings cheaper still).
  for (const c of counts) assert.ok(c <= 22, `${counts}`);
  void FakeNode;
});

test("D304: a singer's subject not belled (the tinkling): I/2's glass spark on the harpsichord, not on VOCAL SYNTH or SOLO VOICES", async () => {
  const { playFx, TAILORED } = await import("../src/touch/subject-fx.ts");
  const fx = TAILORED.wtc1f02[1];
  const sn = { voice: 0, on: 0, dur: 480, midi: 72, theme: 1, inverted: false, scale: 1, head: true, leap: true, long: true, cue: 1 } as unknown as Parameters<typeof playFx>[2];
  const count = (id: string) => {
    setPreset(id);
    let notes = 0;
    const chip = { note: () => (notes++, { stop() {}, bend() {} }) } as unknown as Chip;
    playFx(chip, fx, sn, 72, 0, 0.5, voicing(0, 3));
    return notes;
  };
  assert.ok(count("harpsichordSampled") > 0);
  assert.equal(count("vocalSynth"), 0);
  assert.equal(count("soloVoices"), 0);
});
