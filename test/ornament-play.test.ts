import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, PIECES } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { ornamentMark, ornamentsOf, realiseNote } from "../src/touch/ornament-play.ts";

function logChip(clock: { t: number }, log: { midi: number; at: number }[]) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: (midi: number, at: number) => (log.push({ midi, at }), { stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
}

test("D205: every encoded ornament of the fugues lands on a note of the game, and is realised", () => {
  let n = 0;
  for (const f of PIECES.filter((p) => p.kind === "fugue")) {
    for (const [key, o] of ornamentsOf(f)) {
      const [v, on] = key.split(":").map(Number);
      const note = f.voices[v].find((x) => x[0] === on);
      assert.ok(note, `${f.id} ${key}`);
      const parts = realiseNote(f, o, note![0], note![1], note![2], undefined, 60);
      assert.ok(parts.length >= (o.signs.match(/[TtOMmWwS$]/) ? 3 : 1), `${f.id} ${key} ${o.signs}: ${parts.length} parts`);
      assert.equal(parts.at(-1)![2], note![2], "ends on the main note");
      assert.ok(ornamentMark(o).length > 0);
      n++;
    }
  }
  assert.ok(n >= 148, `${n} ornaments`);
});

test("D205: the other voices' trills sound; the player's ornamented note plays its ornament when struck", () => {
  const f = fugueById("wtc1f06");
  const orn = ornamentsOf(f);
  const [key] = [...orn.keys()];
  const [v, on] = key.split(":").map(Number);
  // Another voice plays the ornamented note: more sounds than notes around it.
  {
    const clock = { t: 0 };
    const log: { midi: number; at: number }[] = [];
    const player = (v + 1) % f.voices.length;
    const g = new ProtoGame(f, player, 0, protoById("keys"), { bpm: 50, legato: false, easy: "timing" }, logChip(clock, log));
    const end = g.timeAt(on) + 0.5;
    while (clock.t < end) (clock.t += 0.05), g.step();
    const t0 = g.timeAt(on);
    const near = log.filter((x) => x.at >= t0 - 0.01 && x.at < t0 + 0.4);
    assert.ok(near.length >= 3, `the trill's notes around its onset: ${near.length}`);
  }
  // The player strikes it: the ornament's notes and the main note.
  {
    const clock = { t: 0 };
    const log: { midi: number; at: number }[] = [];
    const g = new ProtoGame(f, v, 0, protoById("keys"), { bpm: 50, legato: false, easy: "timing" }, logChip(clock, log));
    const i = g.notes.findIndex((x) => x.on === on);
    const at = g.timeAt(on);
    while (clock.t < at - 0.05) (clock.t += 0.05), g.step();
    clock.t = at;
    g.step();
    const before = log.length;
    g.keyDown(1, { velocity: 0.5 }, performance.now());
    assert.equal(g.notes[i].state, "hit");
    assert.ok(log.length - before >= 3, `struck: ${log.length - before} sounds`);
  }
});
