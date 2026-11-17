/**
 * D860: the crowd's patience is counted in seconds, not notes. A good player's few seconds of slips never
 * end a piece, however dense its line (the harpsichord concertos' solo parts above all); sustained failure
 * still does; and the same seconds lost cost the same in a quick line and a slow one.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { easyOf, protoById } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { defaultVoice } from "../src/bench/flow.ts";
import { Crowd, CROWD_LEAVE } from "../src/bench/scoring.ts";
import { fakeChip, ROWS } from "./d342-sim.ts";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };

/**
 * A whole piece as the game plays it on a phone (LADDER, its default voice, its own tempo, failure on): every
 * note struck in its place within ±jitter ms, except every `missEvery`th note let go by and every note in a
 * blackout of `blackS` seconds every `blackEvery` seconds (from the fifth second).
 */
function perform(id: string, o: { missEvery: number; blackEvery: number; blackS: number; jitterMs?: number }) {
  const f = fugueById(id);
  assert.equal(f.id, id);
  const v = defaultVoice(f, f.voices.map((_, i) => i), { fresh: true });
  const clock = { t: 0 };
  const g = new ProtoGame(f, [v], 0, protoById("ladder"), { bpm: tempoOf(id), legato: false, easy: easyOf("ladder"), fail: true }, fakeChip(clock));
  g.rows = ROWS;
  g.wall = () => 0;
  let seed = 3;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const heads = g.tracks
    .flatMap((t) => t.notes.filter((n, i) => !n.ride && !(i > 0 && t.notes[i - 1].on === n.on)))
    .sort((a, b) => a.on - b.on);
  const t00 = g.timeAt(heads[0].on);
  type E = { t: number; k: number; fn: () => void };
  const evs: E[] = [];
  heads.forEach((n, j) => {
    const tn = g.timeAt(n.on);
    const rel = tn - t00;
    if (rel > 5 && rel % o.blackEvery < o.blackS) return;
    if (j % o.missEvery === 3) return;
    const side = j % 2 ? "right" : "left";
    const t0 = tn + (rand() * (o.jitterMs ?? 40)) / 1000;
    const next = heads[j + 1];
    const t1 = Math.max(t0 + 0.04, next ? tn + (g.timeAt(next.on) - tn) * 0.7 : g.timeAt(n.on + n.dur));
    const id2 = j + 1;
    evs.push({ t: t0, k: 1, fn: () => g.down(id2, { side, x: side === "left" ? 40 : 760, y: ROWS.yOf(n.step), w: 800, h: 1000 }, 0) });
    evs.push({ t: t1, k: 0, fn: () => g.up(id2, 0) });
  });
  evs.sort((a, b) => a.t - b.t || a.k - b.k);
  let done = false;
  for (const e of evs) {
    while (!done && clock.t + 1 / 120 < e.t) (clock.t += 1 / 120), (done = g.step());
    if (done) break;
    clock.t = Math.max(clock.t, e.t);
    e.fn();
  }
  while (!done && clock.t < 1500) (clock.t += 1 / 120), (done = g.step());
  return g.results();
}

test("D860: a player at 90% with a 3 s blackout every 30 s finishes the concertos and the fugues", async () => {
  await loadExtras();
  for (const id of ["bwv1061-1", "bwv1061-3", "bwv1052-1", "wtc1f02", "wtc1f15"]) {
    const r = perform(id, { missEvery: 10, blackEvery: 30, blackS: 3 });
    assert.equal(r.failedBar, null, `${id}: the crowd left at bar ${r.failedBar} of ${r.lastBar} (${r.right}/${r.of} right)`);
    assert.ok(r.right / r.of < 0.92, `${id}: the slips were played (${r.right}/${r.of})`);
  }
});

test("D860: sustained failure still empties the hall: 8 s of nothing every 20 s", async () => {
  await loadExtras();
  for (const id of ["bwv1061-1", "wtc1f02"]) {
    const r = perform(id, { missEvery: 1000, blackEvery: 20, blackS: 8 });
    assert.notEqual(r.failedBar, null, `${id}: the crowd stayed`);
  }
});

test("D860: the same seconds cost the same, at two notes a second or ten", () => {
  const after = (perS: number) => {
    const c = new Crowd();
    let t = 0;
    for (; t < 30; t += 1 / perS) c.hear(1, t);
    for (const end = t + 3; t < end; t += 1 / perS) c.hear(0, t);
    return c.level;
  };
  const [slow, quick] = [after(2), after(10)];
  assert.ok(Math.abs(slow - quick) < 0.03, `${slow} vs ${quick}`);
  assert.ok(quick > CROWD_LEAVE + 0.1, `three seconds lost leave the crowd (${quick})`);
  // A rest is neither praised nor blamed: a miss after a long silence counts for at most a second.
  const c = new Crowd();
  for (let t = 0; t < 30; t += 0.25) c.hear(1, t);
  const before = c.level;
  c.hear(0, 60);
  assert.ok(c.level > before * 0.88, `${c.level} after ${before}`);
});
