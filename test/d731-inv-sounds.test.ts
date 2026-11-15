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
  bwv774: ["chorinho", "tabor"],
  bwv775: ["sid64", "chip"],
  bwv776: ["jazzQuartet", "brushes"],
  bwv777: ["bossaNova", "brushes"],
  bwv778: ["bossaNova", "brushes"],
  bwv779: ["analog", "chip"],
  bwv780: ["berlinSchool", "swell"],
  bwv781: ["gameboy", "chip"],
  bwv782: ["tracker", "swell"],
  bwv783: ["jazzQuartet", "brushes"],
  bwv784: ["petSounds", "pet"],
  bwv785: ["analog", "chip"],
  bwv786: ["tracker", "triphop"],
  bwv787: ["super16", "lofi"],
  bwv788: ["tomita", "brushes"],
  bwv789: ["krautrock", "motorik"],
  bwv790: ["abbeyRoad", "abbey"],
  bwv791: ["petSounds", "ballad"],
  bwv792: ["chorinho", "tabor"],
  bwv793: ["tomita", "swell"],
  bwv794: ["abbeyRoad", "abbey"],
  bwv795: ["pianoSampled", "swell"],
  bwv796: ["sid64", "chip"],
  bwv797: ["chip", "chip"],
  bwv798: ["super16", "lofi"],
  bwv799: ["chip", "chip"],
  bwv800: ["salsa", "bossa"],
  bwv801: ["krautrock", "liebezeit"],
};
const CHIPS = new Set(["chip", "gameboy", "sid64", "super16", "tracker", "megaFm"]);

test("D731: each Invention and Sinfonia on its own sound, varied (at most two pieces a sound, chips on at most a third), with its reason", () => {
  const uses = new Map<string, string[]>();
  for (const [id, [s]] of Object.entries(SOUNDS)) {
    assert.equal(PIECE_SOUND[id], s, id);
    assert.equal(COLOURS[id].sound, s, id);
    assert.ok(/^D731: .+closest pair \d\.\d\d/.test(COLOURS[id].soundWhy), `${id}: why`);
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
