/**
 * D708, D712: THE ART OF FUGUE'S OWN SOUNDS AND DRUMS. Each piece's sound chosen by the voices' distinctness (the voice
 * probe, tools/touch/voice-probe: the closest pair of voices on each candidate) and its character, varied (no sound for
 * more than two pieces, a mirror fugue's two forms on one); its HOME drums by the brass research's drum-fit criteria:
 * idiomatic in the metre (FITS), a grid's pulse in its band (within 10 %), most strokes on the score's own onsets
 * (tools/touch/drum-fit/score.ts's measure). D710: Contrapunctus 14's drums close nothing where the text breaks off.
 */
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { strokesOf } from "./drum-strokes.ts";
import { beatOf, fugueById, loadExtras } from "../src/touch/fugue.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { fits, FUGUE_STYLES, homeFor } from "../src/touch/drum-library.ts";
import { GRIDS, layoutOf } from "../src/touch/drum-grids.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { COLOURS } from "../tools/touch/colour-plans/index.ts";

const AOF = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12r", "12i", "13r", "13i", "c14", "c15", "c16", "c17", "14"].map((k) => `bwv1080-${k}`);
before(async () => {
  await loadExtras();
});

/** The sounds chosen (D708) and the HOME drums (D712). */
const SOUNDS: Record<string, [string, string]> = {
  "bwv1080-01": ["berlinSchool", "swell"], "bwv1080-02": ["jazzQuartet", "jazz"], "bwv1080-03": ["tomita", "triphop"], "bwv1080-04": ["krautrock", "motorik"],
  "bwv1080-05": ["bossaNova", "bossa"], "bwv1080-06": ["petSounds", "pet"], "bwv1080-07": ["abbeyRoad", "abbey"], "bwv1080-08": ["sid64", "chip"],
  "bwv1080-09": ["krautrock", "liebezeit"], "bwv1080-10": ["tracker", "triphop"], "bwv1080-11": ["tomita", "fieldDrums"], "bwv1080-12r": ["megaFm", "scoreSynth"],
  "bwv1080-12i": ["megaFm", "scoreSynth"], "bwv1080-13r": ["chip", "chip"], "bwv1080-13i": ["chip", "chip"], "bwv1080-c14": ["vocalSynth", "triphop"],
  "bwv1080-c15": ["gameboy", "chip"], "bwv1080-c16": ["tracker", "tabor"], "bwv1080-c17": ["berlinSchool", "scoreSynth"], "bwv1080-14": ["petSounds", "timpani"],
};

test("D708: each piece on its own sound, varied (at most two pieces a sound, a mirror fugue's forms together), with its reason", () => {
  const uses = new Map<string, Set<string>>();
  for (const id of AOF) {
    const [s] = SOUNDS[id];
    assert.equal(PIECE_SOUND[id], s, id);
    assert.equal(COLOURS[id].sound, s, id);
    assert.ok(/D708/.test(COLOURS[id].soundWhy) || s === "sid64" || s === "gameboy" || id === "bwv1080-10", `${id}: why`);
    const piece = id.replace(/(1[23])[ri]$/, "$1");
    (uses.get(s) ?? uses.set(s, new Set()).get(s)!).add(piece);
  }
  for (const [s, ps] of uses) assert.ok(ps.size <= 2, `${s}: ${[...ps].join(", ")}`);
  assert.ok(uses.size >= 12, `${uses.size} sounds`);
});

test("D712: each HOME fits the metre, a grid's pulse in its band, at least 65 % of the strokes on the score's onsets", async () => {
  for (const id of AOF) {
    const f = fugueById(id);
    const [s, st] = SOUNDS[id];
    assert.equal(FUGUE_STYLES[id], st, id);
    assert.equal(homeFor(id, s), st, id);
    assert.ok(fits(st, f), `${id}: ${st} in ${f.meter}`);
    const b = beatOf(f);
    const tps = (f.tpq * tempoOf(id)) / 60;
    const g = GRIDS[st];
    if (g) {
      const lay = layoutOf(g, b.perBar, b.ticks !== f.tpq * (4 / Number(f.meter.split("/")[1])), b.ticks / tps);
      const pulse = 60 / lay.pulseS;
      assert.ok(pulse >= g.bpm[0] * 0.9 && pulse <= g.bpm[1] * 1.1, `${id}: ${st}'s pulse ${pulse.toFixed(0)} outside ${g.bpm}`);
    }
    const ons = new Set(f.voices.flatMap((v) => v.map((n) => n[0])));
    const sorted = [...ons].sort((a, c) => a - c);
    const near = (t: number) => sorted.some((o) => Math.abs(o - t) <= f.tpq / 8);
    const strokes = await strokesOf(f, s, st);
    const share = strokes.filter((x) => near(x.tick)).length / strokes.length;
    assert.ok(share >= 0.65, `${id}: ${(share * 100).toFixed(0)} % on the onsets`);
  }
});

test("D710: Contrapunctus 14's drums close nothing where the text breaks off (no roll, accent or landing in its last bar, nothing past its last attack)", async () => {
  const f = fugueById("bwv1080-14");
  const last = Math.max(...f.voices.flat().map((n) => n[0]));
  const lastBar = f.bars.at(-1)!.on;
  const s = await strokesOf(f, PIECE_SOUND[f.id], homeFor(f.id, PIECE_SOUND[f.id]));
  assert.ok(s.length > 100);
  for (const x of s) {
    assert.ok(x.tick <= last + f.tpq / 4, `a stroke past the last attack (${x.tick})`);
    if (x.tick >= lastBar) assert.ok(!["roll", "fill", "accent", "land"].includes(x.role ?? ""), `${x.role} in the last bar`);
  }
});
