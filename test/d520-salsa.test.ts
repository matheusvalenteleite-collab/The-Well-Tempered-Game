/**
 * D520: SALSA, ONE OF THE GAME'S SOUNDS: Bach's voices one instrument each (the trumpet on top, the grand on the middle
 * voices, the trombone in four and five, the baby bass), nothing added to his notes; the unpitched Afro-Cuban percussion
 * (VCSL, CC0) on the game's clock, read from the fugue's own writing and form (the pulse, the entries through
 * entrySpans, the scripted moments); never the score, never a tempo change, never with another sound.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { existsSync } from "node:fs";
import { FakeAudioContext, installFakeAudio } from "./fake-audio.ts";
import { Chip, LATIN_KIT, type GrooveContext } from "../src/touch/chip.ts";
import { DYNAMIC_SOUNDS, PATCHES, SALSA_CREDIT, creditFor, grooveNow, presetById, setBacking, setPreset } from "../src/touch/sound.ts";
import { LATIN_FILES, LATIN_SET, latinMidis, nameOfMidi } from "../src/touch/sampled.ts";
import { SAMPLE_MANIFEST } from "../src/audio/sample-manifest.ts";
import { TOUCH_KINDS, bandFamily, holdMode, landing } from "../src/touch/touch-expr.ts";
import { EPISODE_DB, GROOVES, LATIN_SCRIPTS, LATIN_SOUNDS, inEntry, latinBeat, latinMoments, latinPlan, pulseOf } from "../src/touch/latin-drums.ts";
import { FUGUES, beatOf, fugueById } from "../src/touch/fugue.ts";
import { setDrumStyle } from "../src/touch/drum-library.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { COLOURS } from "../tools/touch/colour-plans/index.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { POP_SOUNDS } = await import("../src/bench/PlayPop.tsx");
const { SOUND_GROUPS } = await import("../src/bench/SoundSelect.tsx");

installFakeAudio(0, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 1 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;

const SALSA = presetById("salsa");
const planOf = (id: string) => {
  const f = fugueById(id);
  const { ticks, perBar } = beatOf(f);
  return { f, beat: ticks, plan: latinPlan(f, ticks, perBar) };
};

test("D520: offered, one instrument a voice, Bach's notes only (the patches play the voices, nothing more)", () => {
  assert.equal(SALSA.name, "SALSA");
  assert.ok(POP_SOUNDS.some(([id]) => id === "salsa"));
  assert.ok(SOUND_GROUPS.some(([, ids]) => ids.includes("salsa")));
  assert.equal(SALSA.groove, "salsaBand");
  assert.equal(SALSA.kit, "latin");
  for (let n = 1; n <= 5; n++) assert.equal(SALSA.by?.[n]?.length, n, `${n} voices, ${n} instruments`);
  // D560: D546's band promoted (trombone-led, the tres, no piano).
  assert.deepEqual(SALSA.by?.[3]?.map(([p]) => p), ["s2Trumpet", "s2Trombone", "s2Bass"]);
  assert.deepEqual(SALSA.by?.[4]?.map(([p]) => PATCHES[p].sample), ["brassTrumpet", "brassTrombone", "choroGuitar", "jazzBass"]);
  for (const vs of Object.values(SALSA.by ?? {})) for (const [p, pan] of vs ?? []) assert.ok(Math.abs(pan) <= 0.3, `${p} seated within ±0.3`);
  assert.ok(DYNAMIC_SOUNDS.has("salsa"));
  assert.equal(creditFor("salsa"), SALSA_CREDIT);
  assert.equal(TOUCH_KINDS.salsa, "band");
  assert.equal(PT.SALSA, "SALSA");
  assert.equal(ES.SALSA, "SALSA");
});

test("D520: the touch each instrument's family's (the grand's zones, the brassiness, the bass's pluck)", () => {
  assert.equal(bandFamily(PATCHES.salPiano), "piano");
  assert.equal(bandFamily(PATCHES.salTrumpet), "brass");
  assert.equal(bandFamily(PATCHES.salTrombone), "brass");
  assert.equal(bandFamily(PATCHES.salBass), "jazz");
  assert.ok(landing("band", 1, 60, PATCHES.salTrumpet).brass! > landing("band", 0, 60, PATCHES.salTrumpet).brass!);
  assert.equal(landing("band", 0, 40, PATCHES.salBass).layer, "soft");
  assert.equal(holdMode("band", PATCHES.salTrumpet, false), "swell");
  assert.equal(holdMode("band", PATCHES.salBass, true), "none");
});

test("D520: the percussion's recordings in the manifest, every file there, salsa's pieces only loaded", () => {
  const notes = new Set(SAMPLE_MANIFEST[LATIN_SET]?.notes ?? []);
  for (const rows of Object.values(LATIN_FILES)) for (const m of rows.flat()) {
    assert.ok(notes.has(nameOfMidi(m)), nameOfMidi(m));
    assert.ok(existsSync(`public/samples/${LATIN_SET}/${nameOfMidi(m)}.mp3`));
  }
  assert.equal(latinMidis("salsa").length, 45);
  assert.equal(LATIN_SOUNDS.salsa, "salsa");
  for (const p of Object.keys(LATIN_FILES)) assert.ok(LATIN_KIT.pieces[p as keyof typeof LATIN_KIT.pieces], p);
});

test("D520: the pulse read from the writing: II/10's quaver triplets the 6/8 bell over 2/2; I/2's semiquavers the son clave", () => {
  const a = planOf("wtc2f10");
  assert.equal(a.plan.ternary, true);
  assert.equal(a.plan.pulse, a.f.tpq / 3);
  assert.equal(a.plan.cycle, 12);
  const b = planOf("wtc1f02");
  assert.equal(b.plan.ternary, false);
  assert.equal(b.plan.pulse, b.f.tpq / 4);
  assert.equal(b.plan.cycle, 16);
  assert.deepEqual(pulseOf(fugueById("wtc1f15"), beatOf(fugueById("wtc1f15")).ticks, true).ternary, true);
  // The son's 2-3 clave on its pulses; the bell over twelve.
  assert.deepEqual(GROOVES.salsa[16].full.find(([p]) => p === "clave")?.[1], [2, 4, 8, 11, 14]);
  assert.deepEqual(GROOVES.salsa[12].full.find(([p]) => p === "timbalBell")?.[1], [0, 2, 4, 5, 7, 9, 11]);
});

test("D520: II/10 opens on SALSA, with its script; every moment on an entry, the break before the last, the final", () => {
  assert.equal(PIECE_SOUND.wtc2f10, "salsa");
  assert.equal(COLOURS.wtc2f10.sound, "salsa");
  const { f, plan } = planOf("wtc2f10");
  const ents = f.entries.map((e) => e.on);
  const s = LATIN_SCRIPTS.wtc2f10;
  assert.equal(plan.fills.length, s.length);
  for (const m of plan.fills.filter((x) => x.kind !== "final")) assert.ok(ents.includes(m.at), `${m.why}: on an entry`);
  const brk = plan.fills.filter((x) => x.kind === "break");
  assert.equal(brk.length, 1);
  assert.equal(brk[0].at, Math.max(...ents));
  assert.equal(plan.fills.at(-1)?.kind, "final");
  assert.ok(s.every((m) => m.why.length > 10));
});

test("D520: the generic rule on any fugue: a fill or a lift into the entries, one break, the final; spaced", () => {
  for (const f of FUGUES) {
    const { ticks } = beatOf(f);
    const ms = latinMoments(f, ticks);
    assert.equal(ms.filter((m) => m.kind === "final").length, 1, f.id);
    assert.ok(ms.filter((m) => m.kind === "break").length <= 1, f.id);
  }
});

test("D520: full under an entry, quieter in an episode; a break silent; the final's landing, then nothing", () => {
  const { f, plan, beat } = planOf("wtc2f10");
  const sum = (t: number) => latinBeat("salsa", plan, t, beat).reduce((a, h) => a + h.vel, 0);
  // Bar 3 (the subject sounding) against bar 20 (the episode 19-23).
  const on3 = f.bars.find((b) => b.n === 3)!.on;
  const on20 = f.bars.find((b) => b.n === 20)!.on;
  assert.ok(inEntry(plan, on3) && !inEntry(plan, on20));
  assert.ok(latinBeat("salsa", plan, on3, beat).some((h) => h.piece === "timbalBell"));
  assert.ok(latinBeat("salsa", plan, on20, beat).some((h) => h.piece === "cascara"));
  assert.ok(sum(on20) < sum(on3));
  assert.ok(EPISODE_DB < 0);
  const brk = plan.fills.find((x) => x.kind === "break")!;
  const inBreak = latinBeat("salsa", plan, brk.from, beat).filter((h) => h.at * beat < brk.at - brk.from - 1);
  assert.equal(inBreak.length, 0, "silence before the last entry");
  const fin = plan.fills.find((x) => x.kind === "final")!;
  assert.ok(latinBeat("salsa", plan, fin.at, beat).some((h) => h.piece === "rimshot"));
  assert.equal(latinBeat("salsa", plan, fin.at + beat, beat).length, 0);
  // A fill rolls on the timbales into its entry.
  const fill = plan.fills.find((x) => x.kind === "fill")!;
  assert.ok(latinBeat("salsa", plan, fill.from + beat / 2, beat).some((h) => h.piece === "macho" || h.piece === "hembra"));
  // Busoni's f a little louder, his p a little softer: never the score.
  assert.ok(latinBeat("salsa", plan, on3, beat, 6)[0].vel > latinBeat("salsa", plan, on3, beat, -6)[0].vel);
});

test("D520: the chip plays it on the recordings with this sound only, given the plan", async () => {
  setPreset("salsa");
  assert.deepEqual(grooveNow(), { groove: "salsaBand", kit: "latin" });
  const chip = new Chip();
  await chip.prepare([48, 60, 72], [72]);
  await new Promise((r) => setTimeout(r, 20));
  const { f, plan, beat } = planOf("wtc2f10");
  const on3 = f.bars.find((b) => b.n === 3)!.on;
  const cx: GrooveContext = { tick: on3, beat, fills: [], end: f.length, latin: plan };
  const n0 = chip.latinLog.length;
  assert.equal(chip.groove(chip.ctx.currentTime + 0.1, 1.1, 0, 2, 2, false, cx), true);
  assert.ok(chip.latinLog.length > n0);
  // DRUMS on (D514): the chosen drummer in place of the band's own percussion, as for ABBEY ROAD; D526: by default the
  // sound's HOME, SALSA's own percussion (the library's style), and another style chosen, that one alone.
  setBacking(true);
  let nb = chip.latinLog.length;
  chip.groove(chip.ctx.currentTime + 1, 1.1, 0, 2, 2, false, { ...cx, piece: f });
  assert.ok(chip.latinLog.length > nb, "HOME: SALSA's own");
  setDrumStyle(f.id, "rock");
  nb = chip.latinLog.length;
  chip.groove(chip.ctx.currentTime + 1.5, 1.1, 0, 2, 2, false, { ...cx, piece: f });
  assert.equal(chip.latinLog.length, nb);
  setDrumStyle(f.id, "home");
  setBacking(false);
  setPreset("jazzQuartet");
  const n1 = chip.latinLog.length;
  chip.groove(chip.ctx.currentTime + 2, 1.1, 0, 2, 2, false, cx);
  assert.equal(chip.latinLog.length, n1);
  setPreset("chip");
});
