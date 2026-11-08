/**
 * D514: THREE DRUM PRESETS PER FUGUE (electronic, acoustic, percussion), each customised to the fugue: its default sound
 * (the first), its metre and tempo (the pattern), its form (fugue-form.ts, D513: rolls into the subject zones, rolls
 * out into the episodes, sparser episodes, a stronger climax, a break before the final entry, a flourish); the API the
 * selection screen's DRUMS uses; the chosen drummer in place of JAZZ QUARTET's own brushes (never two).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeAudioContext, installFakeAudio } from "./fake-audio.ts";
import { Chip, KIT_DRUMS, KIT_RMS, kitFiles, kitSource, type GrooveContext } from "../src/touch/chip.ts";
import { setBacking, setDrums, setPreset } from "../src/touch/sound.ts";
import { FUGUES, beatOf, fugueById, keyAt } from "../src/touch/fugue.ts";
import { formOf } from "../src/touch/fugue-form.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { fileOf, folderOf, kitMidi, KIT_VOICES, TIMP_MIDIS, TIMP_SET } from "../src/touch/sampled.ts";
import { existsSync } from "node:fs";
import {
  CHARACTERS,
  PATTERN_STROKE_S,
  ROLL_STROKE_S,
  breaksBefore,
  brushDb,
  brushFills,
  kitBeat,
  legacyPresetsFor,
  stylesFor,
  timpaniPitches,
  timpaniTuned,
  type DrumStyle,
  type KitContext,
  type KitHit,
} from "../src/touch/drum-presets.ts";
// D526: the selection moved to the drum library (the three presets per fugue are D514's legacy, read for a stored choice).
import { STORED_PRESET_KEY, chosenStyle, drumPresetsFor, drumStyleFor, setDrumPreset, HOME_ID, homeStyleFor } from "../src/touch/drum-library.ts";

installFakeAudio(0, true);
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage ??= { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
const WTC = FUGUES.filter((f) => /^wtc/.test(f.id));

test("D514: three presets per fugue, one of each character, stable ids, short names; the first suits the default sound", () => {
  for (const f of FUGUES) {
    const ps = legacyPresetsFor(f.id);
    assert.equal(ps.length, 3);
    assert.deepEqual([...ps.map((p) => p.id)].sort(), [...CHARACTERS].sort(), f.id);
    for (const p of ps) assert.ok(p.name.length <= 10 && p.name === p.name.toUpperCase(), `${f.id} ${p.name}`);
    const s = PIECE_SOUND[f.id];
    if (s === "jazzQuartet" || s === "pianoSampled") assert.equal(ps[0].id, "acoustic", f.id);
    if (s === "chip" || s === "gameboy" || s === "super16") assert.equal(ps[0].id, "electronic", f.id);
    if (s === "chamberOrgan" || s === "harpsichordSampled" || s === "bachBrass") assert.equal(ps[0].id, "percussion", f.id);
  }
  // Customised: the acoustic kit by tempo (brushes at a largo, sticks on the ride at a walking beat, rock at a quick one).
  assert.equal(stylesFor("wtc1f24").acoustic, "brushes");
  assert.equal(stylesFor("wtc1f12").acoustic, "jazz");
  assert.equal(stylesFor("wtc1f03").acoustic, "rock");
  assert.equal(stylesFor("wtc1f19").acoustic, "brushes", "JAZZ QUARTET's own");
  // The percussion: frame drums for the dances, the timpani for the rest.
  assert.equal(stylesFor("wtc1f15").percussion, "frame");
  assert.equal(stylesFor("wtc1f24").percussion, "timpani");
  // The electronic: the console's kit under the chip sounds, the drum machine under the others.
  assert.equal(stylesFor("wtc2f11").electronic, "chip");
  assert.equal(stylesFor("wtc1f12").electronic, "machine", "VOCAL SYNTH's (D510)");
  assert.equal(stylesFor("wtc1f01").electronic, "machine");
  const styles = new Set(WTC.flatMap((f) => Object.values(stylesFor(f.id))));
  assert.equal(styles.size, 7);
});

test("D514 (D526): get/set per piece: the choice this visit, else the selection screen's stored one (D514's characters read as that piece's style), else the sound's HOME", () => {
  const id = "wtc1f12";
  assert.equal(chosenStyle("wtc2f20"), null);
  assert.equal(drumStyleFor("wtc2f20", "analog"), homeStyleFor("analog"));
  setDrumPreset(id, "percussion");
  assert.equal(chosenStyle(id), stylesFor(id).percussion);
  assert.equal(drumStyleFor(id), stylesFor(id).percussion);
  setDrumPreset(id, "nonsense");
  assert.equal(chosenStyle(id), null);
  localStorage.setItem(STORED_PRESET_KEY("wtc2f19"), "acoustic");
  assert.equal(chosenStyle("wtc2f19"), stylesFor("wtc2f19").acoustic);
  localStorage.removeItem(STORED_PRESET_KEY("wtc2f19"));
});

/** A whole piece's beats for a style (the game's beat, its tempo, Busoni's level 0). */
function play(id: string, style: Exclude<DrumStyle, "brushes">) {
  const f = fugueById(id);
  const b = beatOf(f);
  const beatS = (b.ticks / f.tpq) * (60 / tempoOf(id));
  const form = formOf(f);
  const compound = b.ticks !== f.tpq * (4 / Number(f.meter.split("/")[1]));
  const beats: { tick: number; hits: KitHit[] }[] = [];
  for (let tick = 0, n = 0; tick < f.length; tick += b.ticks, n++) {
    const cx: KitContext = { b: n % b.perBar, per: b.perBar, compound, beatS, tick, beat: b.ticks, form, keyAt: () => f.key };
    beats.push({ tick, hits: kitBeat(style, cx) });
  }
  return { f, form, beats, beat: b.ticks, beatS };
}
const STYLES: Exclude<DrumStyle, "brushes">[] = ["chip", "machine", "jazz", "rock", "timpani", "frame"];

test("D514: I/12 for every style: sparser and softer in the episodes, fuller in the subjects, the most in the climax", () => {
  for (const style of STYLES) {
    const { form, beats } = play("wtc1f12", style);
    const inZone = (kind: "subject" | "episode") => beats.filter((x) => form.zones.some((z) => z.kind === kind && x.tick >= z.from + 2 * form.beat && x.tick < z.to - 2 * form.beat && z.to <= form.climax));
    const sum = (bs: { hits: KitHit[] }[]) => bs.reduce((s, x) => s + x.hits.reduce((a, h) => a + h.vel, 0), 0) / Math.max(1, bs.length);
    const ep = inZone("episode");
    const sj = inZone("subject");
    const cl = beats.filter((x) => x.tick >= form.climax + 2 * form.beat && x.tick < form.lastBar - 4 * form.beat);
    assert.ok(ep.length && sj.length && cl.length, style);
    assert.ok(sum(ep) < 0.8 * sum(sj), `${style}: episode ${sum(ep).toFixed(2)} vs subject ${sum(sj).toFixed(2)}`);
    assert.ok(sum(cl) > sum(sj), `${style}: climax ${sum(cl).toFixed(2)} vs subject ${sum(sj).toFixed(2)}`);
  }
});

test("D514: a roll into each subject zone after an episode (rising, landing on the entry with a cymbal or the low drum), a roll out into each episode", () => {
  for (const style of STYLES) {
    const { form, beats, beat } = play("wtc1f12", style);
    const entries = form.zones.filter((z, i) => i > 0 && z.kind === "subject" && z.from < form.climax);
    for (const z of entries) {
      const before = beats.filter((x) => x.tick < z.from && x.tick >= z.from - 2 * beat).flatMap((x) => x.hits.map((h) => ({ ...h, t: x.tick + h.at * beat })));
      const roll = before.filter((h) => h.piece === "snare" || h.piece === "timp" || h.piece === "congaHigh" || h.piece === "bongo" || h.piece === "tomHigh" || h.piece === "tomLow");
      assert.ok(roll.length >= 2, `${style} roll before ${z.from}`);
      assert.ok(roll[roll.length - 1].vel > roll[0].vel, `${style} crescendo`);
      const land = beats.find((x) => z.from >= x.tick && z.from < x.tick + beat)!;
      const at = (z.from - land.tick) / beat;
      assert.ok(land.hits.some((h) => Math.abs(h.at - at) < 1e-6 && (h.piece === "crash" || h.piece === "congaLow" || h.piece === "timp")), `${style} lands at ${z.from}`);
    }
    for (const z of form.zones.filter((z, i) => i > 0 && z.kind === "episode" && z.from < form.climax)) {
      const fall = beats.find((x) => x.tick < z.from && x.tick >= z.from - 1.5 * beat);
      if (!fall) continue;
      assert.ok(fall.hits.length >= 2 && fall.hits.length <= 3 && fall.hits[0].vel > fall.hits[fall.hits.length - 1].vel, `${style} out at ${z.from}`);
    }
  }
});

test("D514: a break before the final entry (where an episode precedes it), a flourish into the final cadence; strokes never too close", () => {
  let breaks = 0;
  for (const f of WTC) {
    for (const style of STYLES) {
      const { form, beats, beat, beatS } = play(f.id, style);
      if (breaksBefore(form) && style === "rock") {
        breaks++;
        const silent = beats.filter((x) => x.hits.length === 0);
        assert.ok(silent.some((x) => x.tick < form.finalEntry && x.tick >= form.finalEntry - form.barTicks - 3 * beat), `${f.id} break`);
      }
      const last = beats.find((x) => Math.abs(x.tick - form.lastBar) < beat / 2);
      if (last) assert.ok(last.hits.some((h) => h.at === 0 && (h.piece === "crash" || h.piece === "timp" || h.piece === "congaLow")), `${f.id} ${style} final`);
      // Nothing after the final downbeat but the timpani's roll under the chord.
      for (const x of beats.filter((x) => x.tick > form.lastBar + beat / 2)) assert.ok(x.hits.every((h) => h.piece === "timp"), `${f.id} ${style} after the end`);
      // The strokes of one piece in a beat: never closer than a roll's.
      for (const x of beats) {
        const by = new Map<string, number[]>();
        for (const h of x.hits) by.set(h.piece, [...(by.get(h.piece) ?? []), h.at]);
        for (const ats of by.values()) {
          ats.sort((a, b) => a - b);
          for (let i = 1; i < ats.length; i++) assert.ok((ats[i] - ats[i - 1]) * beatS >= ROLL_STROKE_S - 1e-6 || ats[i] === ats[i - 1], `${f.id} ${style}`);
        }
      }
      for (const x of beats) for (const h of x.hits) assert.ok(h.vel > 0 && h.vel <= 1 && h.at >= 0 && h.at < 1);
    }
  }
  assert.ok(breaks >= 20, `${breaks}`);
  assert.ok(PATTERN_STROKE_S >= 2 * ROLL_STROKE_S);
});

test("D514: the timpani on the key's tonic and dominant, within the recorded drums' reach", () => {
  assert.deepEqual(timpaniPitches("b"), { tonic: 47, dominant: 54 });
  assert.deepEqual(timpaniPitches("c#"), { tonic: 49, dominant: 44 });
  assert.deepEqual(timpaniPitches("Eb"), { tonic: 51, dominant: 46 });
  for (const k of ["c", "d", "e", "f", "g", "a", "b", "F#", "Bb", "Ab", "g#"]) {
    const p = timpaniPitches(k);
    for (const m of [p.tonic, p.dominant]) {
      assert.ok(m >= 41 && m <= 55, k);
      assert.ok(Math.min(...TIMP_MIDIS.map((t) => Math.abs(t - m))) <= 3, `${k}: ${m} within 3 semitones of a recording`);
    }
    assert.equal(((p.dominant - p.tonic) % 12 + 12) % 12, 7);
  }
});

test("D514: the timpani tuned to the HOME key's tonic and dominant (rhythm only, never a line: the owner); away from its harmony the bass drum takes their strokes", () => {
  assert.ok(timpaniTuned("f", "f") && timpaniTuned("f", "c") && timpaniTuned("f", "Bb") && timpaniTuned("b", "e") && timpaniTuned("b", "f#"));
  assert.ok(!timpaniTuned("f", "Ab") && !timpaniTuned("f", "a") && !timpaniTuned("b", "A") && !timpaniTuned("f", "d"));
  for (const id of ["wtc1f12", "wtc1f24", "wtc2f09"]) {
    const f = fugueById(id);
    const b = beatOf(f);
    const beatS = (b.ticks / f.tpq) * (60 / tempoOf(id));
    const form = formOf(f);
    const home = timpaniPitches(f.key);
    let away = 0;
    for (let tick = 0, n = 0; tick < f.length; tick += b.ticks, n++) {
      const cx: KitContext = { b: n % b.perBar, per: b.perBar, compound: false, beatS, tick, beat: b.ticks, form, keyAt: (t) => keyAt(f, t), home: f.key };
      const hits = kitBeat("timpani", cx);
      for (const h of hits) if (h.piece === "timp") assert.ok(h.midi === home.tonic || h.midi === home.dominant, `${id} ${tick}: ${h.midi}`);
      if (!timpaniTuned(f.key, keyAt(f, tick))) (away += 1), assert.ok(hits.every((h) => h.piece !== "timp"), `${id} ${tick}`);
    }
    if (id === "wtc1f12") assert.ok(away > 0, "I/12's A flat and E flat: the bass drum alone");
  }
});

test("D514: on a phone the low drums' harmonics carry them (the timpani measured -50 LUFS on the phone model before)", () => {
  assert.ok(KIT_DRUMS.phoneLow.hp >= 300 && KIT_DRUMS.phoneLow.level > 0 && KIT_DRUMS.phoneLow.style.timpani > 2 && KIT_DRUMS.phoneLow.style.machine > 2 && KIT_DRUMS.phoneLow.style.brushes === 0);
});

test("D514: the recorded kits read in place (public/samples/drums), every file there, measured, evened", () => {
  for (const set of ["kitRock", "kitClub"] as const) {
    for (const v of KIT_VOICES[set]) for (const loud of [false, true]) {
      const m = kitMidi(set, v, loud)!;
      const path = `public/samples/${folderOf(set)}/${fileOf(set, m)}`;
      assert.ok(existsSync(path), path);
      assert.ok(KIT_RMS[`${set}/${fileOf(set, m).replace(/\.mp3$/, "")}`] !== undefined, path);
    }
  }
  for (const m of TIMP_MIDIS) assert.ok(existsSync(`public/samples/${folderOf(TIMP_SET)}/${fileOf(TIMP_SET, m)}`));
  for (const style of ["rock", "jazz", "frame", "timpani"] as const) {
    assert.ok(kitFiles(style).length > 0, style);
    assert.equal(kitSource(style, "timp"), null);
  }
  assert.deepEqual(kitFiles("chip"), []);
  assert.ok(KIT_DRUMS.hp > KIT_DRUMS.timpHp && KIT_DRUMS.hp >= 100, "the cut under the bass (the timpani's lower)");
});

const ctxOf = (c: Chip) => c.ctx as unknown as FakeAudioContext;
test("D514: with DRUMS on, the chosen drummer plays (JAZZ QUARTET's brushes give way: never two); off, the sound's own as before", async () => {
  const f = fugueById("wtc1f19");
  setPreset("jazzQuartet");
  const chip = new Chip();
  await chip.prepare([48, 60, 72], [72]);
  const cx: GrooveContext = { tick: 960 * 30, beat: f.tpq * 1.5, fills: [], end: f.length, piece: f };
  const t0 = ctxOf(chip).currentTime + 1;
  // Off: the quartet's own brushes.
  setBacking(false);
  let nb = chip.brushLog.length;
  let nk = chip.kitLog.length;
  chip.groove(t0, 0.9, 1, 1, 3, true, cx);
  assert.ok(chip.brushLog.length > nb && chip.kitLog.length === nk);
  // On, the timpani chosen: the timpani alone.
  setBacking(true);
  setDrumPreset(f.id, "percussion");
  nb = chip.brushLog.length;
  nk = chip.kitLog.length;
  assert.equal(chip.groove(t0 + 1, 0.9, 0, 2, 3, true, cx), true);
  assert.equal(chip.brushLog.length, nb, "no brushes under the chosen drummer");
  assert.ok(chip.kitLog.slice(nk).every((l) => l.style === stylesFor(f.id).percussion));
  // The acoustic preset here is the quartet's own brushes with D503's script.
  setDrumPreset(f.id, "acoustic");
  nb = chip.brushLog.length;
  chip.groove(t0 + 2, 0.9, 0, 2, 3, true, cx);
  assert.ok(chip.brushLog.length > nb);
  // Under another sound, the electronic kit for II/11 (the chip's).
  setPreset("chip");
  const g = fugueById("wtc2f11");
  setDrumPreset(g.id, "electronic");
  nk = chip.kitLog.length;
  chip.groove(t0 + 3, 1.2, 0, 2, 4, false, { tick: g.barTicks * 4, beat: g.tpq, fills: [], end: g.length, piece: g });
  assert.ok(chip.kitLog.slice(nk).length > 0 && chip.kitLog.slice(nk).every((l) => l.style === "chip"));
  setBacking(false);
  setDrums(false);
  setPreset("chip");
});

test("D514: JAZZ BRUSHES on a fugue not the quartet's: the form's fills (into each subject zone, the climax, the last bar), quieter episodes", () => {
  const f = fugueById("wtc1f24");
  const b = beatOf(f);
  const fills = brushFills(f, b.ticks, b.perBar);
  const form = formOf(f);
  assert.ok(fills.some((x) => x.kind === "final"));
  assert.ok(fills.some((x) => x.at === form.finalEntry && x.kind === "fill"), "into the final entry");
  assert.ok(fills.filter((x) => x.kind === "lift").length >= 3);
  const ep = form.zones.find((z) => z.kind === "episode")!;
  assert.ok(brushDb(f, ep.from + 1) < 0 && brushDb(f, form.climax + 1) > 0 && brushDb(f, form.climax + 1) < brushDb(f, form.peak + 1), "the climax builds");
  // D503's own fugues keep their script.
  assert.equal(brushDb(fugueById("wtc1f19"), 960 * 20), 0);
});

test("D514 (D526): the link registers the library with the selection's DRUMS (D450): STYLE n/N cycles through it (HOME first), the choice reaching the drummer", async () => {
  const { register } = await import("node:module");
  register("./tsx-hooks.mjs", import.meta.url);
  const lite = await import("../src/bench/LiteDrums.tsx");
  await import("../src/bench/drum-presets-link.ts");
  for (const id of ["wtc1f12", "wtc1f24"]) {
    localStorage.removeItem(STORED_PRESET_KEY(id));
    setDrumPreset(id, drumPresetsFor(id)[0].id);
    const ps = lite.drumPresets(id);
    assert.deepEqual(ps.map((p) => p.id), drumPresetsFor(id).map((p) => p.id), id);
    assert.equal(ps[0].id, HOME_ID);
    const seen: string[] = [];
    for (let k = 0; k < ps.length; k++) {
      const at = ps.findIndex((p) => p.id === lite.drumPresetOf(id)) + 1;
      seen.push(`${at}/${ps.length}`);
      lite.cycleDrumPreset(id);
      const row = drumPresetsFor(id).find((p) => p.id === lite.drumPresetOf(id))!;
      assert.equal(drumStyleFor(id), row.style, "the drummer follows the row");
    }
    assert.deepEqual(seen, ps.map((_, i) => `${i + 1}/${ps.length}`), id);
    assert.equal(lite.drumPresetOf(id), ps[0].id, "round to the first");
  }
  setBacking(false);
  setDrums(false);
});
