/**
 * D305: VOCAL SYNTH sung as singers sing (style "sung": no gaps, a new syllable on a leap of a fifth,
 * a repeated note and the bass's moving notes), its soprano a grown woman's; SOLO VOICES straight
 * (no vibrato added, every semitone recorded, a gentler release, a long note's messa di voce);
 * SWITCHED-ON's bass plucked and apart (style "switched"), its lead and alto moving (a filter sweep,
 * a clocked PWM); MODULAR remade as BLEEPS AND BLOOPS (vibraphone, combo organ, marimba, tube, bass;
 * a spring).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio } from "./fake-audio.ts";
import { Chip, REVERBS, voicing } from "../src/touch/chip.ts";
import { PATCHES, PRESETS, presetById, setPreset, playerSound } from "../src/touch/sound.ts";
import { phrase, joins, styleOf, SUNG, SWITCHED } from "../src/touch/phrasing.ts";
import type { OtherNote } from "../src/touch/voice-mode.ts";
import { SAMPLE_MANIFEST } from "../src/audio/sample-manifest.ts";

const ctxOf = installFakeAudio(0, true);

const BEAT = 480;
const n = (voice: number, on: number, dur: number, midi: number): OtherNote => ({ voice, on, dur, midi, step: midi });
// Two voices: the top a step, a third, a fourth, a fifth and a repeated note in crotchets (half a beat
// of 2/2), then a rest; the bass's crotchets moving by step.
const TOP = [60, 62, 65, 70, 77, 77, 72].map((m, k) => n(0, k * 240, 240, m));
const BASS = [48, 50, 52, 53, 55].map((m, k) => n(1, k * 240, 240, m));
const NOTES = [...TOP, ...BASS].sort((a, b) => a.on - b.on || a.voice - b.voice);
const shapes = (style: "plain" | "sung" | "switched") => {
  const sh = phrase(NOTES, BEAT, (t) => t % (2 * BEAT), new Set(), style, { bass: 1 });
  return (v: number) => NOTES.map((x, i) => [x, sh[i]] as const).filter(([x]) => x.voice === v).map(([, s]) => s);
};

test("D305: VOCAL SYNTH sung: steps to fourths joined, a fifth and a repeated note a new syllable, the bass's moving notes syllables, never a gap", () => {
  assert.equal(styleOf("vocalSynth"), "sung");
  // D309: SOLO VOICES the singers' legato (§6.5: "solo").
  assert.equal(styleOf("soloVoices"), "solo");
  const of = shapes("sung");
  const top = of(0);
  assert.deepEqual(top.map((s) => s.art), ["join", "join", "join", "syllable", "syllable", "join", "plain"]);
  assert.equal(SUNG.leap, 7);
  // No gap before any next note: held to its onset and over it.
  for (const s of top.slice(0, -1)) assert.ok(s.hold >= 1 - 1e-9 && s.over > 0, JSON.stringify(s));
  // A syllable's next note sung anew (its consonant), a joined one's not.
  assert.equal(top[4].legato, false, "after the fifth: a new syllable");
  assert.equal(top[5].legato, false, "the repeated note: a new syllable");
  assert.equal(top[3].legato, true, "after the fourth: joined");
  assert.equal(joins(top[3]).tie! > 0, true);
  // The bass's crotchets (half a beat): syllables, held to the next.
  const bass = of(1);
  assert.deepEqual(bass.slice(0, -1).map((s) => s.art), ["syllable", "syllable", "syllable", "syllable"]);
  for (const s of bass.slice(0, -1)) assert.ok(s.hold >= 1 - 1e-9);
  // D309: the plain synthesized sounds by their tables (CLASSIC CHIP's pulse: the harpsichord's): crotchets of 0.25 s, all a little apart.
  const plain = shapes("plain")(0);
  assert.deepEqual(plain.map((s) => s.art), ["nonlegato", "nonlegato", "nonlegato", "nonlegato", "nonlegato", "nonlegato", "plain"]);
});

test("D305: SWITCHED-ON's bass held 0.8 (apart), its upper voices as the plain sounds'", () => {
  assert.equal(SWITCHED.hold, 0.8);
  const sw = shapes("switched");
  const pl = shapes("plain");
  for (const s of sw(1).slice(0, -1)) {
    assert.equal(s.art, "nonlegato");
    assert.ok(Math.abs(s.hold - 0.8) < 1e-9, `${s.hold}`);
    assert.equal(s.over, 0);
  }
  assert.deepEqual(sw(0).map((s) => [s.art, s.hold]), pl(0).map((s) => [s.art, s.hold]));
  // A note longer than a beat in the bass is not set apart.
  const long = [n(0, 0, 960, 60), n(1, 0, 960, 48), n(1, 960, 960, 50)];
  const sh = phrase(long, BEAT, (t) => t % (2 * BEAT), new Set(), "switched", { bass: 1 });
  assert.ok(sh[1].art !== "nonlegato" || sh[1].hold > SWITCHED.hold);
});

test("D305: VOCAL SYNTH's soprano a grown woman's: lower formants, F1 tuned, small scoop, a narrow late vibrato, little 3 kHz lift", () => {
  const la = PATCHES.vocLa;
  assert.ok(la.sing!.size < 1, "a larger vocal tract than 1.29's 1.04");
  assert.ok(la.sing!.tune! > 1 && la.sing!.ring <= 2 && la.sing!.scoop <= 30 && la.sing!.over <= 5);
  assert.ok(la.vib!.depth <= 15 && la.vib!.rate <= 6 && la.vib!.delay >= 0.5);
  assert.equal(la.osc[0].wave, "glottalWarm");
  // F1 follows a high note: A5 (880 Hz) puts the first formant band-pass above it.
  setPreset("vocalSynth");
  const chip = new Chip();
  const ctx = ctxOf();
  const before = new Set(ctx.nodes);
  chip.note(81, 1, 1, voicing(0, 4));
  const bps = [...ctx.nodes].filter((x) => !before.has(x) && x.kind === "filter" && (x as unknown as { type: string }).type === "bandpass");
  assert.equal(bps.length, 5, "five formants");
  const f1 = Math.min(...bps.map((b) => (b.frequency as unknown as { valueAt: (t: number) => number }).valueAt(1.5)));
  assert.ok(f1 >= 880 * 1.05, `F1 ${f1}`);
  setPreset("chip");
});

test("D305: SOLO VOICES straight: no vibrato added, every semitone of each part recorded, a gentler release, a long note's messa di voce", () => {
  for (const s of ["singS", "singA", "singT", "singB"] as const) {
    const p = PATCHES[s];
    assert.equal(p.vib, undefined, s);
    assert.ok(p.rec!.r >= 0.12, s);
    assert.ok(p.syllable!.messa! > 0 && p.syllable!.messa! <= 2, s);
  }
  const NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"];
  const name = (m: number) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
  const range: Record<string, [number, number]> = { soloSoprano: [60, 81], soloAlto: [53, 74], soloTenor: [47, 69], soloBass: [38, 66] };
  for (const [set, [lo, hi]] of Object.entries(range)) {
    const have = new Set(SAMPLE_MANIFEST[set].notes);
    for (let m = lo; m <= hi; m++) assert.ok(have.has(name(m)), `${set} ${name(m)}`);
  }
});

test("D305: SWITCHED-ON moves (a swept lead, a clocked PWM, a chorused bloop) and its bass plucks to a lower sustain", () => {
  const p = presetById("analog");
  assert.equal(p.name, "SWITCHED-ON");
  const sw = PATCHES.solLead.filter!.sweep!;
  assert.ok(sw.rate >= 0.3 && sw.rate <= 0.7 && sw.octaves <= 0.5);
  const pwm = PATCHES.solNasal.pwm!;
  assert.ok(pwm.clock && pwm.rate >= 0.2 && pwm.rate <= 0.7 && pwm.width - pwm.depth > 0);
  assert.ok(PATCHES.solBloop.autopan!.depth <= 0.15);
  const b = PATCHES.solBass;
  assert.ok(b.amp.s < 0.65 && b.osc.length >= 3 && b.filter!.freq >= 1300, "plucked, layered, its edge kept for a phone (D291)");
  for (const [, pan] of p.by![5]!) assert.ok(Math.abs(pan) <= 0.35);
});

test("D305, D433: BLEEPS AND BLOOPS retired (the owner: \"bleeps and bloops is bad, retire\"): a stored choice opens on CLASSIC CHIP; its patches and spring kept", () => {
  assert.ok(!PRESETS.some((p) => p.id === "modular"));
  assert.equal(presetById("modular").id, "chip");
  assert.equal(playerSound("modular"), "chip", "a stored choice opens on CLASSIC CHIP");
  assert.ok(REVERBS.spring.rt60 <= 1.6);
  const v = PATCHES.modVibe;
  assert.ok(v.trem && v.trem.rate >= 4 && v.trem.rate <= 6 && v.trem.depth <= 0.5, "the vibraphone's tremolo");
  assert.equal(v.amp.s, 0, "struck: a mallet's note");
  assert.ok(PATCHES.modOrgan.amp.s === 1 && PATCHES.modOrgan.vib, "the organ sustains");
  assert.ok(PATCHES.modBass.filter!.freq >= 1300);
});
