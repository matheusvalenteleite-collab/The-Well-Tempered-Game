import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { arrowOf, moveOf, protoById } from "../src/bench/protos.ts";
import { LESSONS } from "../src/bench/lessons.ts";

function fakeChip(clock: { t: number }) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
}

function gameOf(n: number, clock: { t: number }) {
  const r = LESSONS[n].run();
  const g = new ProtoGame(fugueById(r.piece), r.voice, r.from, protoById("arrows"), { bpm: r.bpm, legato: false, until: r.until, wait: r.wait, solo: r.solo, keys: r.keys }, fakeChip(clock));
  return { r, g };
}

test("the lessons: each finds its passage, uses only the keys taught, and has its own music", () => {
  const pieces = LESSONS.slice(0, 4).map((l) => l.run().piece);
  assert.equal(new Set(pieces).size, 4, pieces.join(" "));
  LESSONS.forEach((l, n) => {
    const clock = { t: 0 };
    const { r, g } = gameOf(n, clock);
    assert.ok(g.notes.length >= 6, `${l.title}: ${g.notes.length} notes`);
    for (const [i, m] of g.moves.entries()) {
      const a = arrowOf(m);
      if (i > 0 && a && !(i > 0 && g.notes[i - 1].on === g.notes[i].on)) assert.ok(r.keys.includes(a), `${l.title}: ${a} not taught`);
    }
  });
});

test("a waiting lesson holds the clock at each note: struck late, it is still right", () => {
  const n = LESSONS.findIndex((l) => l.run().wait);
  const clock = { t: 0 };
  const { g } = gameOf(n, clock);
  const heads = g.notes.map((x, i) => (i > 0 && g.notes[i - 1].on === x.on ? -1 : i)).filter((i) => i >= 0);
  for (const i of heads) {
    // Two seconds after the note was due.
    const until = clock.t + 2;
    while (clock.t < until) (clock.t += 0.05), g.step();
    const a = arrowOf(g.moves[i]) ?? "same";
    g.keyDown(10 + i, { move: moveOf(a === "rise" ? "right" : a === "fall" ? "left" : a) }, performance.now());
    g.keyUp(10 + i, performance.now());
  }
  const r = g.results();
  assert.equal(r.right, r.of, `${r.right}/${r.of}`);
});
