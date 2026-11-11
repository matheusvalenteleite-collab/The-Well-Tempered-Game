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

test("D593: the levels are the three fugues' own, on their own sounds, about 3 dB; I/6 and II/24 on a phone only", () => {
  // D645: and five rebalances on a phone (a fugue's bass brought up there, the rest a little under it: its phone mix where it was), each under 0 dB, phone only.
  const D645 = ["wtc1f04@stringConsort", "wtc1f20@krautrock", "wtc2f07@bossaNova", "wtc2f08@stringConsort", "wtc2f22@krautrock"];
  const all = PRESETS.flatMap((p) => Object.keys(p.levels ?? {}).map((id) => `${id}@${p.id}`)).filter((k) => !D645.includes(k)).sort();
  assert.deepEqual(all, ["wtc1f06@jazzQuartet", "wtc1f19@vaudeville", "wtc2f24@analog"]);
  for (const k of D645) {
    const [id, snd] = k.split("@");
    assert.equal(PIECE_SOUND[id], snd, `${id}: its own sound`);
    const down = db(pieceLevel(snd, id, true));
    assert.ok(down < 0 && down >= -1.5, `${k}: ${down.toFixed(1)} dB on a phone`);
    assert.equal(pieceLevel(snd, id, false), 1, `${k}: the computer path as it was`);
  }
  for (const k of all) {
    const [id, snd] = k.split("@");
    assert.equal(PIECE_SOUND[id], snd, `${id}: its own sound`);
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
