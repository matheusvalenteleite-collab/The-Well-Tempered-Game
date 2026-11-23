/**
 * D1045-D1047: the Musical Offering's canons and Fuga canonica voiced by the voice probe (none on the sampled strings, none on
 * PSYCH or BOSSA NOVA), no drums (all calm); the trio sonata on SUPER 16-BIT as a stopgap; every piece's balance measured on
 * its sound (D593's rows on both paths, D645's bass) and its level on a phone.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { homeFor, NO_DRUMS } from "../src/touch/drum-library.ts";
import { OWN_LOUD } from "../src/touch/player-lift-data.ts";
import { BASS_PHONE_1079 } from "../src/touch/bass-phone-1079.ts";
import { pieceLevel } from "../src/touch/sound.ts";

const CANONS: Readonly<Record<string, string>> = {
  "bwv1079-2": "bachBrass",
  "bwv1079-3a": "gameboy",
  "bwv1079-3b": "vaudeville",
  "bwv1079-3c": "salsa",
  "bwv1079-3d": "berlinSchool",
  "bwv1079-3e": "abbeyRoad",
  "bwv1079-4": "vaudeville",
  "bwv1079-6": "bachBrass",
  "bwv1079-7": "vocalSynth",
  "bwv1079-9": "chorinho",
};
const TRIO = ["8a", "8b", "8c", "8d"].map((n) => `bwv1079-${n}`);

test("D1045: the canons on their sounds, none on the strings, PSYCH or BOSSA NOVA; no drums", () => {
  const STRINGS = new Set(["super16", "baroqueBand", "stringConsort", "orchestraOrgan"]);
  for (const [id, s] of Object.entries(CANONS)) {
    assert.equal(PIECE_SOUND[id], s, id);
    assert.ok(!STRINGS.has(s) && s !== "krautrock" && s !== "bossaNova", id);
    assert.equal(homeFor(id, s), NO_DRUMS, `${id}: calm, no drums`);
  }
  const uses = new Map<string, number>();
  for (const s of Object.values(CANONS)) uses.set(s, (uses.get(s) ?? 0) + 1);
  for (const [s, n] of uses) assert.ok(n <= 2, `${s}: ${n} canons`);
  for (const id of TRIO) assert.equal(PIECE_SOUND[id], "super16", id);
});

test("D1046: each measured on its own sound: the balance on both paths and the bass on a phone", () => {
  for (const id of [...Object.keys(CANONS), ...TRIO]) {
    assert.equal(OWN_LOUD[id]?.s, PIECE_SOUND[id], `${id}: its lift row`);
    assert.ok(OWN_LOUD[id].d, `${id}: a computer's balance too`);
    assert.equal(BASS_PHONE_1079[id]?.s, PIECE_SOUND[id], `${id}: its bass measured`);
  }
});

test("D1047: the levels a phone's only, within D593's 4 dB up and D715's 1.5 dB down", () => {
  for (const id of [...Object.keys(CANONS), ...TRIO]) {
    const s = PIECE_SOUND[id];
    const db = 20 * Math.log10(pieceLevel(s, id, true));
    assert.ok(db <= 4 && db >= -1.5, `${id}: ${db.toFixed(1)} dB`);
    assert.equal(pieceLevel(s, id, false), 1, id);
  }
});
