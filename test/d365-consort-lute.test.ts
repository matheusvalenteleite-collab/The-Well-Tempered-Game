/**
 * D365: STRING CONSORT and LUTE finished and offered (D358's trials): a solo viola (TinySOL) in place of the
 * viola section, the cello's upper partials lifted on a phone, the lute's chords spread from the bass and its
 * octave strings heard; both in the sound list, named, credited and translated. And D358's proposals the owner
 * said yes to: CLASSIC CHIP within ±0.35 and its triangle 3 dB lighter on a computer, VOCAL SYNTH's soprano
 * 3 dB louder and one syllable for all, and the player's notes never lifted on any sound.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { FakeNode, FakeParam, installFakeAudio } from "./fake-audio.ts";
import { CHIP_PAN, CHIP_TRIANGLE, Chip, voicing, type Play } from "../src/touch/chip.ts";
import { CELLO_PHONE_LIFT, CONSORT_CREDIT, LUTE_CREDIT, LUTE_ONE, PATCHES, PRESETS, creditFor, offered, presetById, setPreset } from "../src/touch/sound.ts";
import { folderOf, PERIOD } from "../src/touch/sampled.ts";
import { SAMPLE_MANIFEST } from "../src/audio/sample-manifest.ts";
import { TOUCH, styleOf, phrase } from "../src/touch/phrasing.ts";
import { TOUCH_KINDS } from "../src/touch/touch-expr.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { POP_SOUNDS } = await import("../src/bench/PlayPop.tsx");
const { SOUND_GROUPS } = await import("../src/bench/SoundSelect.tsx");

const ctxOf = installFakeAudio(0, true);
const of = (made: FakeNode[], kind: string) => made.filter((n) => n.kind === kind);
const setPhone = (on: boolean) => Object.defineProperty(globalThis, "navigator", { value: { maxTouchPoints: on ? 5 : 0, userAgent: on ? "iPhone" : "node" }, configurable: true, writable: true });

function strike(id: string, voice: number, count: number, play: Play, midi = 64, chip = (setPreset(id), new Chip())) {
  const ctx = ctxOf();
  const before = new Set(ctx.nodes);
  chip.note(midi, 1, 1, voicing(voice, count, !!play.lead), play);
  return [...ctx.nodes].filter((x) => !before.has(x));
}

test("D365: STRING CONSORT and LUTE offered: in the sound list, grouped, named in three languages, credited, with a touch", () => {
  for (const [id, name] of [["stringConsort", "STRING CONSORT"], ["lute", "LUTE"]] as const) {
    assert.ok(offered(id), id);
    assert.equal(presetById(id).name, name);
    assert.ok(POP_SOUNDS.some(([s, n]) => s === id && n === name), id);
    assert.ok(TOUCH_KINDS[id], id);
    for (const dict of [PT, ES] as Record<string, string>[]) assert.ok(dict[name] && dict[name] !== name, `${name} translated`);
  }
  assert.ok(SOUND_GROUPS.find(([g]) => g === "INSTRUMENTS")![1].includes("lute"));
  assert.ok(SOUND_GROUPS.find(([g]) => g === "ENSEMBLES")![1].includes("stringConsort"));
  for (const dict of [PT, ES] as Record<string, string>[]) assert.ok(dict.ENSEMBLES);
  assert.equal(creditFor("stringConsort"), CONSORT_CREDIT);
  assert.match(CONSORT_CREDIT, /TINYSOL.*CC BY 4\.0/);
  assert.match(CONSORT_CREDIT, /FREESOUND 12408/);
  assert.equal(creditFor("lute"), LUTE_CREDIT);
  // Then the list's last: D430's BAROQUE BAND. (D435: I/4 and II/8 now open on STRING CONSORT, I/14 on LUTE.)
  assert.deepEqual(PRESETS.slice(-3).map((p) => p.id), ["stringConsort", "lute", "baroqueBand"]);
});

test("D365: the consort's viola a solo viola (TinySOL), every whole tone C3-D6, one player to a part", () => {
  assert.equal(folderOf("consortViola"), "violaSolo");
  const notes = SAMPLE_MANIFEST.violaSolo.notes;
  for (const n of ["C3", "D3", "E3", "Fs3", "Gs3", "As3", "C4", "D4", "E4", "Fs4", "Gs4", "As4", "C5", "D5", "E5", "Fs5", "Gs5", "As5", "C6", "D6"]) assert.ok(notes.includes(n), n);
  assert.ok(PERIOD.consortViola.loop, "held on a made loop of its steady stretch");
  // The section's recordings stay with the consoles (SUPER 16-BIT's and NOCTURNE 32-BIT's strings).
  assert.equal(folderOf("strings16"), "violaSus");
});

test("D365: the cello's upper partials lifted on a phone (a high shelf over its fundamentals), not on a computer; the same for the player", async () => {
  assert.ok(CELLO_PHONE_LIFT.hz >= 400 && CELLO_PHONE_LIFT.db > 0 && CELLO_PHONE_LIFT.db <= 6);
  assert.equal(PATCHES.consCello.phoneLift, CELLO_PHONE_LIFT);
  for (const id of ["consViolin", "consViola"] as const) assert.equal(PATCHES[id].phoneLift, undefined, id);
  const lifts = async (phone: boolean, lead: boolean) => {
    setPhone(phone);
    setPreset("stringConsort");
    const chip = new Chip();
    await chip.prepare([43, 48, 55]);
    const made = strike("stringConsort", 3, 4, lead ? { lead: true } : {}, 48, chip);
    return of(made, "filter").filter((f) => (f as unknown as { type: string }).type === "highshelf" && (f.frequency as FakeParam).value === CELLO_PHONE_LIFT.hz).map((f) => (f.gain as FakeParam).value);
  };
  try {
    assert.deepEqual(await lifts(true, false), [CELLO_PHONE_LIFT.db]);
    assert.deepEqual(await lifts(true, true), [CELLO_PHONE_LIFT.db]);
    assert.deepEqual(await lifts(false, false), []);
  } finally {
    setPhone(false);
    setPreset("chip");
  }
});

test("D365: the lute: its chords spread from the bass wider than the harpsichord's, within the band's 20 ms; its octave strings heard", () => {
  assert.equal(styleOf("lute"), "harpsichord");
  assert.ok(TOUCH.lute.spread > TOUCH.harpsichord.spread && TOUCH.lute.spread * 2 <= 0.02);
  assert.ok(LUTE_ONE.courses.octave.gain >= 0.35 && LUTE_ONE.courses.octave.gain < LUTE_ONE.courses.unison.gain);
  // A four-note chord: struck from the bass up, each later than the one below.
  setPreset("lute");
  const notes = [0, 1, 2, 3].map((v) => ({ on: 0, dur: 480, midi: 72 - v * 7, step: 0, voice: v }));
  const sh = phrase(notes, 480, () => 0.5, new Set());
  const at = sh.map((s) => s.nudge);
  assert.ok(at[3] < at[2] && at[2] < at[1] && at[1] < at[0], `${at}`);
  assert.ok(at[0] - at[3] >= 2 * TOUCH.lute.spread - 2 * TOUCH.lute.jitter - 1e-9);
  setPreset("chip");
});

test("D365: CLASSIC CHIP within ±0.35; its triangle 3 dB lighter on a computer, as before on a phone", () => {
  setPreset("chip");
  for (const n of [2, 3, 4, 5]) {
    const pans = Array.from({ length: n }, (_, v) => voicing(v, n).pan);
    assert.ok(Math.abs(Math.max(...pans) - CHIP_PAN) < 1e-9 && Math.abs(Math.min(...pans) + CHIP_PAN) < 1e-9, `${n}: ${pans}`);
  }
  // The other sounds' places untouched (GAME BOY's, by its own plan or the old spread).
  assert.ok(Math.abs(CHIP_TRIANGLE - 10 ** (-3 / 20)) < 1e-12);
  // The note's envelope (its gains under 1: not the bus's make-up).
  const peak = (made: FakeNode[]) => Math.max(...of(made, "gain").map((g) => Math.max(...(g.gain as FakeParam).events.map((e) => Math.abs(e.v ?? 0)), 0)).filter((x) => x < 1));
  const tri = (phone: boolean) => {
    setPhone(phone);
    const chip = new Chip();
    // One voice: the triangle on a computer and on a phone alike.
    return peak(strike("chip", 0, 1, {}, 48, chip));
  };
  try {
    const computer = tri(false);
    const phone = tri(true);
    // D436: the phone's own gain (Preset.phoneGain) taken out: the triangle's lightening alone compared.
    assert.ok(Math.abs(computer / (phone / (presetById("chip").phoneGain ?? 1)) - CHIP_TRIANGLE) < 1e-6, `${computer} ${phone}`);
  } finally {
    setPhone(false);
  }
});

test("D365: VOCAL SYNTH: the soprano 3 dB up (0.43 → 0.61), every singer on one syllable", () => {
  assert.equal(PATCHES.vocLa.level, 0.61);
  const sings = presetById("vocalSynth").slots!.map((s) => PATCHES[s].sing!);
  assert.deepEqual(new Set(sings.map((s) => s.cons + s.vowel)), new Set(["la"]));
});

test("D365: the player's note is the band's on every sound: never louder, never brighter", () => {
  const peak = (made: FakeNode[]) => Math.max(...of(made, "gain").map((g) => Math.max(...(g.gain as FakeParam).events.map((e) => Math.abs(e.v ?? 0)), 0)));
  const shelf = (made: FakeNode[]) => of(made, "filter").filter((f) => (f as unknown as { type: string }).type === "highshelf").map((f) => (f.gain as FakeParam).value);
  for (const pr of PRESETS) {
    for (const [v, n] of [[0, 3], [1, 4]] as const) {
      const band = strike(pr.id, v, n, {});
      const mine = strike(pr.id, v, n, { lead: true });
      assert.ok(peak(mine) <= peak(band) + 1e-9, `${pr.id} v${v}/${n}: ${peak(mine)} against ${peak(band)}`);
      assert.ok(Math.max(0, ...shelf(mine)) <= Math.max(0, ...shelf(band)) + 1e-9, `${pr.id} v${v}/${n}: ${shelf(mine)} against ${shelf(band)}`);
    }
  }
  setPreset("chip");
});
