/**
 * D523: ABBEY ROAD, ONE OF THE GAME'S SOUNDS (the owner: "Beatles 1967-69, two guitars, electric bass, rock piano,
 * acoustic drums"): the Gretsch on top, the second electric guitar, the rock piano, the picked bass, one studio; and
 * THE DRUMS (rock-drums.ts): the fugue's own form (fills into the entries, quieter episodes, a break before the final
 * entry, a closing flourish), on the game's clock, never the score, never a tempo change, never another sound's; Bach's
 * notes untouched (one instrument a voice, no note added).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { installFakeAudio } from "./fake-audio.ts";
import { Chip, REVERBS, ROCK_DRUMS, type GrooveContext } from "../src/touch/chip.ts";
import { ABBEY_ROAD_CREDIT, DYNAMIC_SOUNDS, PATCHES, PRESETS, creditFor, grooveNow, offered, presetById, setDrums, setPreset } from "../src/touch/sound.ts";
import { ROCK_KIT_FILES, ROCK_KIT_MIDIS, ROCK_KIT_SET, SAMPLED, fileOf, folderOf, noteInfo, sampledMidis } from "../src/touch/sampled.ts";
import { formOf, rockBeat, SIXTEENTHS_FROM_S, momentsAsBars } from "../src/touch/rock-drums.ts";
import { FUGUES, fugueById } from "../src/touch/fugue.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { TOUCH_KINDS } from "../src/touch/touch-expr.ts";
import { COLOURS } from "../tools/touch/colour-plans/index.ts";

installFakeAudio(0, true);
const beatOf4 = (id: string) => {
  const f = fugueById(id);
  return { f, beat: f.barTicks / Number(f.meter.split("/")[0]) };
};

test("D523: ABBEY ROAD offered, its instruments one to a voice, recorded, credited", () => {
  const p = presetById("abbeyRoad");
  assert.equal(p.id, "abbeyRoad");
  assert.ok(offered("abbeyRoad"));
  assert.equal(p.groove, "abbeyRock");
  assert.equal(p.kit, "rock");
  assert.equal(p.fx, "studio");
  assert.ok(REVERBS.studio);
  for (const n of [1, 2, 3, 4, 5] as const) {
    const by = p.by?.[n];
    assert.equal(by?.length, n, `${n} voices: one instrument each`);
    for (const [, pan] of by ?? []) assert.ok(Math.abs(pan) <= 0.25);
  }
  assert.deepEqual(p.by?.[4]?.map(([id]) => id), ["abGuitar", "abGuitar2", "abPiano", "abBass"]);
  assert.equal(PATCHES.abGuitar.sample, "rockGuitar");
  assert.equal(PATCHES.abGuitar2.sample, "rockGuitar2");
  assert.equal(PATCHES.abPiano.sample, "piano");
  assert.equal(PATCHES.abBass.sample, "rockBass");
  assert.equal(SAMPLED.rockGuitar.set, "cleanGuitar");
  assert.equal(SAMPLED.rockBass.set, "rickBass");
  assert.ok(PATCHES.abBass.phoneLift, "the bass lifted on a phone");
  assert.ok(DYNAMIC_SOUNDS.has("abbeyRoad"), "Busoni's dynamics reach it");
  assert.equal(TOUCH_KINDS.abbeyRoad, "jazz");
  assert.equal(creditFor("abbeyRoad"), ABBEY_ROAD_CREDIT);
  assert.match(ABBEY_ROAD_CREDIT, /BIG RUSTY DRUMS/);
  // Every recording measured: its tuning and trim.
  for (const set of ["cleanGuitar", "eguitar", "rickBass"]) for (const m of sampledMidis(set)) assert.ok(noteInfo(set, m), `${set} ${m}`);
});

test("D523: the rock kit is Big Rusty Drums' files, already in public/samples", () => {
  assert.equal(folderOf(ROCK_KIT_SET), "drums/bigRusty");
  assert.equal(ROCK_KIT_MIDIS.length, 18);
  for (const m of ROCK_KIT_MIDIS) {
    assert.equal(fileOf(ROCK_KIT_SET, m), `${ROCK_KIT_FILES[m]}.mp3`);
    assert.ok(existsSync(new URL(`../public/samples/drums/bigRusty/${fileOf(ROCK_KIT_SET, m)}`, import.meta.url)), ROCK_KIT_FILES[m]);
  }
});

test("D523: the drums follow the form: fills into the entries, a break before the last, the flourish, then nothing", () => {
  const { f, beat } = beatOf4("wtc1f02");
  const form = formOf(f, beat, "abbey");
  const kinds = form.moments.map((m) => m.kind);
  assert.ok(kinds.filter((k) => k === "fill").length >= 4);
  assert.equal(kinds.filter((k) => k === "break").length, 1);
  assert.equal(kinds.at(-1), "final");
  assert.ok(form.episodes.length >= 3, "the episodes found");
  const last = [...f.entries].sort((a, b) => a.on - b.on).at(-1)!;
  const brk = form.moments.find((m) => m.kind === "break")!;
  assert.ok(brk.at <= last.on && last.on - brk.at < beat, "the break lands on the final entry");
  // In the break: nothing but the pick-up; on the final chord the crash; after it, nothing.
  for (let t = brk.from; t < brk.at - beat; t += beat) assert.deepEqual(rockBeat("abbey", 0, 4, false, t, beat, 0.85, form, 0), []);
  assert.ok(rockBeat("abbey", 0, 4, false, form.finalAt, beat, 0.85, form).some((h) => h.piece === "crash"));
  assert.deepEqual(rockBeat("abbey", 0, 4, false, form.finalAt + 2 * beat, beat, 0.85, form), []);
  // A fill's beat: the snare and the toms, no hi-hat; the landing: the crash and the kick.
  const fill = form.moments.find((m) => m.kind === "fill")!;
  const roll = rockBeat("abbey", 3, 4, false, fill.at - beat, beat, 0.85, form);
  assert.ok(roll.some((h) => h.piece.startsWith("tom")) && !roll.some((h) => h.piece === "hat"));
  const land = rockBeat("abbey", 0, 4, false, fill.at, beat, 0.85, form);
  assert.ok(land.some((h) => h.piece === "crash") && land.some((h) => h.piece === "kick"));
  // Before the second entry: the hat and the cross-stick only.
  const intro = rockBeat("abbey", 1, 4, false, 0 + beat, beat, 0.85, form);
  assert.ok(intro.every((h) => h.piece === "hat" || h.piece === "rim"));
  assert.ok(momentsAsBars(f, beat, "abbey").every((m) => m.why.length > 10));
});

test("D523: the groove: the backbeat, quieter in the episodes and in p, sixteenths under a slow beat", () => {
  const { f, beat } = beatOf4("wtc1f16");
  const form = formOf(f, beat, "abbey");
  const [a, b] = form.episodes[0];
  const midEp = Math.round((a + (b - a) / 2) / beat) * beat;
  const ep = rockBeat("abbey", 1, 4, false, midEp, beat, 0.8, form);
  assert.ok(ep.some((h) => h.piece === "rim") && !ep.some((h) => h.piece === "snare"), "the cross-stick in an episode");
  const tick = form.intro + 4 * f.barTicks;
  const inEntry = form.episodes.some(([x, y]) => tick >= x && tick < y) || form.moments.some((m) => Math.abs(m.at - tick) < 3 * beat);
  if (!inEntry) {
    const mf = rockBeat("abbey", 1, 4, false, tick, beat, 0.8, form, 0);
    const p = rockBeat("abbey", 1, 4, false, tick, beat, 0.8, form, -6);
    assert.ok(mf.some((h) => h.piece === "snare"));
    const sum = (hs: { vel: number }[]) => hs.reduce((s, h) => s + h.vel, 0);
    assert.ok(sum(p) < sum(mf), "Busoni's p quieter");
    assert.equal(rockBeat("abbey", 1, 4, false, tick, beat, SIXTEENTHS_FROM_S, form).filter((h) => h.piece === "hat").length, 4);
    assert.equal(rockBeat("abbey", 1, 4, false, tick, beat, 0.6, form).filter((h) => h.piece === "hat").length, 2);
  }
  // Every fugue's form computes, its strokes within the beat.
  for (const g of FUGUES) {
    const bt = g.barTicks / Number(g.meter.split("/")[0]);
    const fm = formOf(g, bt, "abbey");
    assert.ok(Number.isFinite(fm.finalAt), g.id);
    for (const h of rockBeat("abbey", 0, 4, false, fm.finalAt - 4 * bt, bt, 0.7, fm)) assert.ok(h.at >= 0 && h.at < 1 && h.vel > 0 && h.vel <= 1, g.id);
  }
});

test("D523: the chip plays the rock kit for ABBEY ROAD alone, on the clock it is given", () => {
  const chip = new Chip();
  setPreset("abbeyRoad");
  assert.equal(grooveNow()?.kit, "rock");
  const { f, beat } = beatOf4("wtc1f02");
  const tick = formOf(f, beat, "abbey").intro + 8 * f.barTicks + beat;
  const cx: GrooveContext = { tick, beat, fills: [], end: f.length, piece: f };
  const t0 = (chip as unknown as { ctx: { currentTime: number } }).ctx.currentTime + 1;
  const n0 = chip.rockLog.length;
  assert.equal(chip.groove(t0, 0.85, 1, 8, 4, false, cx), true);
  const log = chip.rockLog.slice(n0);
  assert.ok(log.length > 0 && log.every((l) => l.at >= t0 && l.at < t0 + 0.85));
  for (const id of ["jazzQuartet", "pianoSampled", "chip"]) {
    setPreset(id);
    setDrums(true);
    const n = chip.rockLog.length;
    chip.groove(t0 + 2, 0.6, 1, 1, 4, false, cx);
    assert.equal(chip.rockLog.length, n, id);
  }
  setDrums(false);
  setPreset("abbeyRoad");
  assert.equal(grooveNow()?.kit, "rock", "DRUMS off: still the band's drummer");
  setDrums(true);
  setPreset("chip");
  for (const p of PRESETS) assert.equal(p.groove === "abbeyRock", p.id === "abbeyRoad", p.id);
  assert.ok(ROCK_DRUMS.styles.abbey.level > 0);
});

test("D523: I/2 and I/16 open on ABBEY ROAD, with their reasons", () => {
  for (const id of ["wtc1f02", "wtc1f16"]) {
    assert.equal(PIECE_SOUND[id], "abbeyRoad", id);
    assert.equal(COLOURS[id].sound, "abbeyRoad", id);
    assert.match(COLOURS[id].soundWhy ?? "", /D523/);
  }
});
