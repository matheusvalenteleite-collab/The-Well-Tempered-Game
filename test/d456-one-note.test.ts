/**
 * D456: one note per onset in the player's line, in every playable piece and voice: the line's own note kept (nearest
 * to the notes around it; on a tie the top, the bass the bottom), the others the game's (they sound, never targets).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio } from "./fake-audio.ts";
import { Chip } from "../src/touch/chip.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { startTick, voicesFrom } from "../src/touch/voice-mode.ts";
import { protoById } from "../src/bench/protos.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { liteAll } from "../src/bench/lite.ts";
import { oneLine } from "../src/touch/one-line.ts";

installFakeAudio(5, true);

test("D456: the rule: the note nearest the line; ties to the top, the bass's to the bottom", () => {
  const n = (on: number, midi: number) => ({ on, midi });
  // A step up from 60 to an octave 62/74: 62 continues the line.
  assert.deepEqual(oneLine([n(0, 60), n(1, 62), n(1, 74), n(2, 64)], false).kept.map((x) => x.midi), [60, 62, 64]);
  // A final chord with nothing after it, equidistant: the top (upper voice), the bottom (bass).
  assert.deepEqual(oneLine([n(0, 64), n(1, 60), n(1, 68)], false).kept.map((x) => x.midi), [64, 68]);
  assert.deepEqual(oneLine([n(0, 64), n(1, 60), n(1, 68)], true).kept.map((x) => x.midi), [64, 60]);
  assert.deepEqual(oneLine([n(0, 64), n(1, 60), n(1, 68)], true).extra.map((x) => x.midi), [68]);
});

test("D456: no onset of the player's line offers two targets; every note the voice has still sounds (the player's or the game's)", () => {
  const chip = new Chip();
  const ladder = protoById("ladder");
  let chords = 0;
  for (const id of liteAll(false)) {
    const f = fugueById(id);
    for (const v of voicesFrom(f, 0)) {
      const g = new ProtoGame(f, [v], startTick(f, 0), ladder, { bpm: 80, legato: false }, chip);
      const t = g.tracks[0] as { notes: { on: number; midi: number }[]; sweeps?: Set<number> };
      const ons = t.notes.filter((n) => !t.sweeps?.has(n.on)).map((n) => n.on);
      assert.equal(new Set(ons).size, ons.length, `${id} voice ${v}: one target per onset`);
      const raw = new Map<number, number>();
      for (const [on] of f.voices[v]) raw.set(on, (raw.get(on) ?? 0) + 1);
      for (const [on, k] of raw) if (k > 1 && on >= startTick(f, 0)) {
        chords++;
        const sounding = f.voices[v].filter((x) => x[0] === on).every(([o, , m]) => t.notes.some((n) => n.on === o && n.midi === m) || g.others.some((n) => n.voice === v && n.on === o && n.midi === m));
        assert.ok(sounding, `${id} voice ${v} at ${on}: every note of the chord still sounds`);
      }
    }
  }
  assert.ok(chords > 0);
});
