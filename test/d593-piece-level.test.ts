/**
 * D593: the three defaults that sat about 3 LU under the others on the phone model (I/6 on JAZZ QUARTET, I/19 on
 * VAUDEVILLE, II/24 on SWITCHED-ON) brought up by a level of the fugue's own on its sound (Preset.levels), the whole mix
 * at the master (the band, the player, the rooms and the drums alike), set as the piece starts: a constant of the piece
 * and the sound, never of the play (right or wrong alike). Another fugue on the sound, or the fugue on another sound,
 * is not moved.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio } from "./fake-audio.ts";
import { Chip } from "../src/touch/chip.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { pieceLevel, presetById, PRESETS, setPreset } from "../src/touch/sound.ts";
import { startTick } from "../src/touch/voice-mode.ts";
import { protoById } from "../src/bench/protos.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";

const db = (g: number) => 20 * Math.log10(g);

test("D593, D645, D703: the levels are fugues' own, on their own sounds: D593's three up about 3 dB on a phone (I/6 and II/24 there only), D645's phone rebalances, D703's re-matching", () => {
  // D645: five rebalances on a phone (a fugue's bass brought up there, the rest a little under it); D703: the fugues whose
  // overall loudness the rebuilt balance moved over 0.5 LU on a path, re-matched to the base there (renders, both paths).
  const D645 = ["wtc1f04@stringConsort", "wtc1f20@krautrock", "wtc2f07@bossaNova", "wtc2f08@stringConsort", "wtc2f22@krautrock"];
  const D593 = ["wtc1f06@jazzQuartet", "wtc1f19@vaudeville", "wtc2f24@analog"];
  const all = PRESETS.flatMap((p) => Object.keys(p.levels ?? {}).map((id) => `${id}@${p.id}`)).sort();
  for (const k of [...D593, ...D645]) assert.ok(all.includes(k), k);
  for (const k of all) {
    const [id, snd] = k.split("@");
    assert.equal(PIECE_SOUND[id], snd, `${id}: its own sound`);
    // each a fugue's own level, within 4 dB on either path
    for (const phone of [true, false]) assert.ok(Math.abs(db(pieceLevel(snd, id, phone))) <= 4, `${k}: ${db(pieceLevel(snd, id, phone)).toFixed(1)} dB (${phone ? "phone" : "computer"})`);
  }
  // D645's: the phone a little under the computer (the rest under the bass there)
  for (const k of D645) {
    const [id, snd] = k.split("@");
    assert.ok(pieceLevel(snd, id, true) < pieceLevel(snd, id, false), `${k}: under on a phone`);
  }
  // D593's three: brought up 2-4 dB on a phone
  for (const k of D593) {
    const [id, snd] = k.split("@");
    const up = db(pieceLevel(snd, id, true));
    assert.ok(up >= 2 && up <= 4, `${k}: ${up.toFixed(1)} dB on a phone`);
  }
  assert.equal(pieceLevel("jazzQuartet", "wtc1f06", false), 1, "I/6: the computer path as it was");
  assert.equal(pieceLevel("analog", "wtc2f24", false), 1, "II/24: the computer path as it was");
  assert.ok(pieceLevel("vaudeville", "wtc1f19", false) > 1, "I/19: under on a computer too");
  // Another fugue on the sound, the fugue on another sound: not moved.
  assert.equal(pieceLevel("jazzQuartet", "wtc2f12", true), 1);
  assert.equal(pieceLevel("analog", "wtc1f07", true), 1);
  assert.equal(pieceLevel("pianoSampled", "wtc1f19", true), 1);
  // The sounds' own levels (D436's, on its passages) untouched.
  assert.equal(presetById("jazzQuartet").phoneGain, 1.72);
  assert.equal(presetById("vaudeville").gain, 1.1);
  assert.equal(presetById("analog").gain, undefined);
});

function masterOf(chip: Chip): number {
  return (chip as unknown as { master: { gain: { value: number } } }).master.gain.value;
}

test("D593: the level at the master, set as the piece starts, constant through the play (right or wrong alike)", () => {
  for (const [touch, piece, want] of [
    [5, "wtc1f06", pieceLevel("jazzQuartet", "wtc1f06", true)],
    [0, "wtc1f06", 1],
    [5, "wtc1f19", pieceLevel("vaudeville", "wtc1f19", true)],
    [0, "wtc1f19", pieceLevel("vaudeville", "wtc1f19", false)],
    [5, "wtc2f24", pieceLevel("analog", "wtc2f24", true)],
    [5, "wtc2f12", 1],
  ] as const) {
    const ctxOf = installFakeAudio(touch);
    const chip = new Chip();
    const ctx = ctxOf();
    const f = fugueById(piece);
    setPreset(PIECE_SOUND[piece]);
    assert.ok(Math.abs(masterOf(chip) - 0.4) < 1e-9, "the master's own level before a piece");
    // fail: true and the player's voice never played: every note of it missed; the level the same.
    const g = new ProtoGame(f, [0], startTick(f, 0), protoById("ladder"), { bpm: 80, legato: false, fail: true }, chip);
    const seen = new Set<number>();
    for (let t = ctx.currentTime; t < 8; t += 1 / 30) {
      ctx.advance(t);
      g.step();
      seen.add(+masterOf(chip).toFixed(9));
    }
    assert.deepEqual([...seen], [+(0.4 * want).toFixed(9)], `${piece} (${touch ? "phone" : "computer"})`);
  }
  // Another sound chosen for I/19 afterwards: its level goes with the sound.
  const ctxOf = installFakeAudio(5);
  const chip = new Chip();
  ctxOf();
  setPreset("vaudeville");
  chip.pieceLevel({ id: "wtc1f19" });
  assert.ok(masterOf(chip) > 0.41);
  setPreset("pianoSampled");
  chip.pieceLevel({ id: "wtc1f19" });
  assert.ok(Math.abs(masterOf(chip) - 0.4) < 1e-9);
});

test("D715, D718: the Art of Fugue's levels: on their own sounds, a phone's only, about the defaults' median (raised up to 4 dB; C7 lowered 1 dB after the lift)", () => {
  const all = PRESETS.flatMap((p) => Object.keys(p.levels ?? {}).filter((id) => id.startsWith("bwv1080-")).map((id) => [id, p.id] as const));
  // D890, D896: six moved to new sounds; Contrapunctus 12 inversus and Canon 16 levelled on theirs.
  assert.equal(all.length, 9);
  for (const [id, snd] of all) {
    assert.equal(PIECE_SOUND[id], snd, `${id}: its own sound`);
    const up = 20 * Math.log10(pieceLevel(snd, id, true));
    assert.ok(Math.abs(up) >= 0.5 && up >= -1.5 && up <= 4, `${id}: ${up.toFixed(1)} dB on a phone`);
    assert.equal(pieceLevel(snd, id, false), 1, `${id}: the computer path as it was`);
  }
});

test("D738: the Inventions' and Sinfonias' levels: on their own sounds, a phone's only, about the defaults' median (raised 1-4 dB)", () => {
  const inv = (id: string) => /^bwv(7[789]\d|80[01])$/.test(id) && +id.slice(3) >= 772;
  const all = PRESETS.flatMap((p) => Object.keys(p.levels ?? {}).filter(inv).map((id) => [id, p.id] as const));
  // D890, D896: four moved to new sounds; Invention 15 raised, Invention 13 and Sinfonia 5 lowered on theirs.
  assert.equal(all.length, 15);
  for (const [id, snd] of all) {
    assert.equal(PIECE_SOUND[id], snd, `${id}: its own sound`);
    const up = 20 * Math.log10(pieceLevel(snd, id, true));
    const lowered = id === "bwv784" || id === "bwv791";
    assert.ok(lowered ? up <= -1 && up >= -1.5 : up >= 0.9 && up <= 4, `${id}: ${up.toFixed(1)} dB on a phone`);
    assert.equal(pieceLevel(snd, id, false), 1, `${id}: the computer path as it was`);
  }
});

test("D747: the Four Duets' levels: on their own sounds, a phone's only, 1-4 dB", () => {
  const all = PRESETS.flatMap((p) => Object.keys(p.levels ?? {}).filter((id) => /^bwv80[2-5]$/.test(id)).map((id) => [id, p.id] as const));
  assert.deepEqual(all.map(([id]) => id).sort(), ["bwv803", "bwv804"]);
  for (const [id, snd] of all) {
    assert.equal(PIECE_SOUND[id], snd, id);
    const up = 20 * Math.log10(pieceLevel(snd, id, true));
    assert.ok(up >= 1 && up <= 4, `${id}: ${up.toFixed(1)} dB`);
    assert.equal(pieceLevel(snd, id, false), 1);
  }
});

test("D777: the Chromatic Fugue's level: FLUTE & HARP, a phone's only, about 1.2 dB", () => {
  const up = 20 * Math.log10(pieceLevel("fluteHarp", "bwv903-2", true));
  assert.equal(PIECE_SOUND["bwv903-2"], "fluteHarp");
  assert.ok(up >= 1 && up <= 4, `${up.toFixed(1)} dB`);
  assert.equal(pieceLevel("fluteHarp", "bwv903-2", false), 1);
});
