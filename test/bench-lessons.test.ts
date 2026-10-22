import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { KEY_ROWS, protoById } from "../src/bench/protos.ts";
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
  const g = new ProtoGame(fugueById(r.piece), r.voice, r.from, protoById("keys"), { bpm: r.bpm, legato: false, until: r.until, wait: r.wait, solo: r.solo, easy: r.easy }, fakeChip(clock));
  return { r, g };
}

test("the lessons: each finds its passage in a fugue, the first ones each their own, and each can be played right through", () => {
  const pieces = LESSONS.slice(0, 3).map((l) => l.run().piece);
  assert.equal(new Set(pieces).size, 3, pieces.join(" "));
  LESSONS.forEach((l, n) => {
    const clock = { t: 0 };
    const { r, g } = gameOf(n, clock);
    assert.equal(fugueById(r.piece).kind, "fugue", l.title);
    assert.ok(g.notes.length >= 6, `${l.title}: ${g.notes.length} notes`);
    // A player who follows the line along the home row (as the lessons teach).
    const row = KEY_ROWS[2].codes;
    let col = 5;
    let id = 0;
    for (let i = 0; i < g.notes.length; i++) {
      if (i > 0 && g.notes[i - 1].on === g.notes[i].on) continue;
      const m = g.moves[i];
      if (g.isFree(i)) col = 5;
      else if (m.dir !== 0 && m.steps !== 0) col = Math.max(0, Math.min(row.length - 1, col + m.dir * (r.easy === "leaps" && m.size >= 3 ? 2 : 1)));
      const until = g.timeAt(g.notes[i].on);
      while (clock.t < until - 0.05) (clock.t += 0.05), g.step();
      clock.t = Math.max(clock.t, until);
      g.step();
      g.keyDown(++id, { velocity: 0.5, code: m.dir === 0 && !g.isFree(i) ? "Space" : row[col] }, performance.now());
      g.keyUp(id, performance.now());
    }
    const res = g.results();
    assert.equal(res.right, res.of, `${l.title}: ${res.right}/${res.of}`);
  });
});

test("a waiting lesson holds the clock at each note: struck late, it is still right", () => {
  const n = LESSONS.findIndex((l) => l.run().wait);
  const clock = { t: 0 };
  const { g } = gameOf(n, clock);
  const heads = g.notes.map((x, i) => (i > 0 && g.notes[i - 1].on === x.on ? -1 : i)).filter((i) => i >= 0);
  const row = KEY_ROWS[2].codes;
  let col = 5;
  for (const i of heads) {
    // Two seconds after the note was due; the key the line asks for.
    const until = clock.t + 2;
    while (clock.t < until) (clock.t += 0.05), g.step();
    const m = g.moves[i];
    if (g.isFree(i)) col = 5;
    else if (m.dir !== 0 && m.steps !== 0) col = Math.max(0, Math.min(row.length - 1, col + m.dir));
    g.keyDown(10 + i, { velocity: 0.5, code: m.dir === 0 && !g.isFree(i) ? "Space" : row[col] }, performance.now());
    g.keyUp(10 + i, performance.now());
  }
  const r = g.results();
  assert.equal(r.right, r.of, `${r.right}/${r.of}`);
});
