/**
 * D731, D735: THE INVENTIONS' AND SINFONIAS' OWN SOUNDS AND DRUMS (D708 and D712's way). Each piece's sound chosen by the
 * voices' distinctness (the voice probe, tools/touch/voice-probe: the closest pair of voices on every offered sound) and
 * its character, varied (no sound on more than two of the 30, not all chips), with its bass audible on a phone (D734); its
 * HOME drums by the drum-fit criteria: idiomatic in the metre (FITS), a grid's pulse in its band (within 10 %), most strokes
 * on the score's own onsets (tools/touch/drum-fit/score.ts's measure).
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

before(async () => {
  await loadExtras();
});

/** The sounds chosen (D731) and the HOME drums (D735). */
const SOUNDS: Record<string, [string, string]> = {
  bwv772: ["gameboy", "chip"],
  bwv773: ["berlinSchool", "scoreSynth"],
  bwv774: ["chorinho", "castanets"],
  bwv775: ["sid64", "chip"],
  bwv776: ["jazzQuartet", "brushes"],
  bwv777: ["bossaNova", "brushes"],
  bwv778: ["bossaNova", "brushes"],
  bwv779: ["analog", "chip"],
  bwv780: ["berlinSchool", "swell"],
  bwv781: ["gameboy", "chip"],
  bwv782: ["oboeTrio", "swell"],
  bwv783: ["jazzQuartet", "brushes"],
  bwv784: ["harpsichordSampled", "brushes"],
  bwv785: ["analog", "chip"],
  bwv786: ["oboeTrio", "triphop"],
  bwv787: ["super16", "lofi"],
  bwv788: ["tomita", "brushes"],
  bwv789: ["krautrock", "motorik"],
  bwv790: ["abbeyRoad", "abbey"],
  bwv791: ["baroqueBand", "none"],
  bwv792: ["chorinho", "none"],
  bwv793: ["tomita", "swell"],
  bwv794: ["abbeyRoad", "abbey"],
  bwv795: ["pianoSampled", "swell"],
  bwv796: ["sid64", "chip"],
  bwv797: ["chip", "none"],
  bwv798: ["super16", "lofi"],
  bwv799: ["chip", "none"],
  bwv800: ["salsa", "bossa"],
  bwv801: ["krautrock", "liebezeit"],
};
const CHIPS = new Set(["chip", "gameboy", "sid64", "super16"]);

test("D731: each Invention and Sinfonia on its own sound, varied (at most two pieces a sound, chips on at most a third), with its reason", () => {
  const uses = new Map<string, string[]>();
  for (const [id, [s]] of Object.entries(SOUNDS)) {
    assert.equal(PIECE_SOUND[id], s, id);
    assert.equal(COLOURS[id].sound, s, id);
    assert.ok(/^D(731|893): .+closest pair \d\.\d\d/.test(COLOURS[id].soundWhy), `${id}: why`);
    assert.ok(COLOURS[id].plans[s]?.length, `${id}: a colour plan on its sound`);
    (uses.get(s) ?? uses.set(s, []).get(s)!).push(id);
  }
  for (const [s, ps] of uses) assert.ok(ps.length <= 2, `${s}: ${ps.join(", ")}`);
  assert.ok(uses.size >= 15, `${uses.size} sounds`);
  const chips = Object.values(SOUNDS).filter(([s]) => CHIPS.has(s)).length;
  assert.ok(chips <= 10, `${chips} on chips`);
  assert.ok(Object.values(SOUNDS).some(([s]) => s === "krautrock"));
});

test("D735: each HOME fits the metre, a grid's pulse in its band, at least 65 % of the strokes on the score's onsets", async () => {
  for (const [id, [s, st]] of Object.entries(SOUNDS)) {
    const f = fugueById(id);
    assert.equal(FUGUE_STYLES[id], st, id);
    assert.equal(homeFor(id, s), st, id);
    if (st === "none") continue; // D892-D894
    assert.ok(fits(st, f), `${id}: ${st} in ${f.meter}`);
    const b = beatOf(f);
    const tps = (f.tpq * tempoOf(id)) / 60;
    const g = GRIDS[st];
    if (g) {
      const lay = layoutOf(g, b.perBar, b.ticks !== f.tpq * (4 / Number(f.meter.split("/")[1])), b.ticks / tps);
      const pulse = 60 / lay.pulseS;
      assert.ok(pulse >= g.bpm[0] * 0.9 && pulse <= g.bpm[1] * 1.1, `${id}: ${st}'s pulse ${pulse.toFixed(0)} outside ${g.bpm}`);
    }
    const ons = [...new Set(f.voices.flatMap((v) => v.map((n) => n[0])))].sort((a, c) => a - c);
    const near = (t: number) => ons.some((o) => Math.abs(o - t) <= f.tpq / 8);
    const strokes = await strokesOf(f, s, st);
    const share = strokes.filter((x) => near(x.tick)).length / strokes.length;
    assert.ok(share >= 0.65, `${id}: ${(share * 100).toFixed(0)} % on the onsets`);
  }
});

/** D741, D744: the Four Duets, each on its own sound, no two alike, with its HOME. */
const DUETS: Record<string, [string, string]> = { bwv802: ["berlinSchool", "scoreSynth"], bwv803: ["gameboy", "chip"], bwv804: ["jazzQuartet", "brushes"], bwv805: ["krautrock", "motorik"] };
test("D741, D744: the Four Duets on four sounds (none shared within the group), each with its reason and plan; each HOME fits, its strokes on the score's onsets", async () => {
  assert.equal(new Set(Object.values(DUETS).map(([s]) => s)).size, 4);
  for (const [id, [s, st]] of Object.entries(DUETS)) {
    assert.equal(PIECE_SOUND[id], s, id);
    assert.equal(COLOURS[id].sound, s, id);
    assert.ok(/^D741: .+closest pair \d\.\d\d/.test(COLOURS[id].soundWhy), `${id}: why`);
    assert.ok(COLOURS[id].plans[s]?.length, `${id}: a plan`);
    const f = fugueById(id);
    assert.equal(FUGUE_STYLES[id], st, id);
    assert.equal(homeFor(id, s), st, id);
    assert.ok(fits(st, f), `${id}: ${st} in ${f.meter}`);
    const ons = [...new Set(f.voices.flatMap((v) => v.map((n) => n[0])))];
    const strokes = await strokesOf(f, s, st);
    const share = strokes.filter((x) => ons.some((o) => Math.abs(o - x.tick) <= f.tpq / 8)).length / strokes.length;
    assert.ok(share >= 0.65, `${id}: ${(share * 100).toFixed(0)} %`);
  }
});

test("D771, D774: the Chromatic Fugue on FLUTE & HARP (a sound then serving fewer than three pieces), its reason and plan; its drums (D894: none)", async () => {
  const id = "bwv903-2";
  assert.equal(PIECE_SOUND[id], "fluteHarp");
  assert.equal(COLOURS[id].sound, "fluteHarp");
  assert.ok(/^D771: .+closest pair \d\.\d\d/.test(COLOURS[id].soundWhy));
  assert.ok(COLOURS[id].plans.fluteHarp?.length);
  // D891, D894: the timpani withdrawn; calm (2.5 notes a second): no drums.
  assert.equal(FUGUE_STYLES[id], "none");
  assert.equal(homeFor(id, "fluteHarp"), "none");
});

test("D779: the Albinoni Fugue on STRING CONSORT (fewer than three pieces then), its reason and plan; its drums (D894: none)", async () => {
  const id = "bwv951";
  assert.equal(PIECE_SOUND[id], "stringConsort");
  assert.equal(COLOURS[id].sound, "stringConsort");
  assert.ok(/^D779: .+closest pair \d\.\d\d/.test(COLOURS[id].soundWhy));
  assert.ok(COLOURS[id].plans.stringConsort?.length);
  // D891, D894: the field drum withdrawn; calm: no drums.
  assert.equal(FUGUE_STYLES[id], "none");
  assert.equal(homeFor(id, "stringConsort"), "none");
});
