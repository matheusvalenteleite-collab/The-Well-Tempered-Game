/**
 * D293: thumbs overlapping a moment is a legato as good as a handover, even as the thumb still down glides
 * toward its next note or the phone takes a touch back; and the player's notes sound at one level, right
 * or wrong (where the run does not ask for dynamics).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip, Play } from "../src/touch/chip.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { readingsOf, type Reading } from "../src/touch/readings.ts";

const RH = 9;
const ROWS: Rows = { yOf: (s) => 300 - s * RH, stepAt: (y) => Math.round((300 - y) / RH), rowH: RH, xOf: () => 400 };
type Heard = { midi: number; level: number };
function chip(clock: { t: number }, heard: Heard[]) {
  return { ctx: { get currentTime() { return clock.t; } }, heard: () => clock.t, note: (midi: number, _at: number, _d: number, _v: unknown, p: Play = {}) => (heard.push({ midi, level: p.level ?? 1 }), { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {} }), swoosh() {}, tick() {} } as unknown as Chip;
}
type Style = { reading?: Reading; overlap: number; glide?: boolean; long?: boolean; cancel?: boolean; xOf?: (i: number, side: "left" | "right") => number; yOff?: (i: number) => number };
/** The voice played on time, the thumbs alternating; each lifts `overlap` s after the next lands. */
function play(id: string, voice: number, s: Style) {
  const clock = { t: 0 };
  const heard: Heard[] = [];
  const f = fugueById(id);
  const g = new ProtoGame(f, voice, 0, protoById("ladder"), { bpm: tempoOf(id), legato: false, until: f.length, wait: false, solo: false, fail: false, ...(s.reading ? { reading: s.reading } : {}) }, chip(clock, heard));
  g.rows = ROWS;
  const notes = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
  type E = { t: number; k: number; fn: () => void };
  const evs: E[] = [];
  notes.forEach((n, i) => {
    const side = i % 2 ? "right" : "left";
    const x = s.xOf ? s.xOf(i, side) : side === "left" ? 40 : 800;
    const y = ROWS.yOf(n.step) + (s.yOff?.(i) ?? 0);
    const c = { side, x, y, w: 844, h: 390 } as const;
    const t0 = g.timeAt(n.on);
    const next = notes[i + 1];
    const own = notes[i + 2];
    // LONG: held on through the other thumb's note until just before its own next one.
    const t1 = s.long && own ? g.timeAt(own.on) - 0.03 : next ? g.timeAt(next.on) + s.overlap : g.timeAt(n.on + n.dur);
    evs.push({ t: t0, k: 1, fn: () => g.down(i + 1, c, performance.now()) });
    // Gliding toward its own next note (two notes on) while still down, after the other thumb has landed.
    if (s.glide && own && next) evs.push({ t: s.long ? g.timeAt(own.on) - 0.06 : g.timeAt(next.on) + s.overlap * 0.5, k: 2, fn: () => g.move(i + 1, { ...c, y: y + (ROWS.yOf(own.step) - y) * 0.8 }, performance.now()) });
    // CANCEL: iOS takes every third touch back just after it lands (the other thumb still down on it).
    if (s.cancel && i % 3 === 1) evs.push({ t: t0 + 0.04, k: 0, fn: () => g.up(i + 1, performance.now(), true) });
    else evs.push({ t: t1, k: 0, fn: () => g.up(i + 1, performance.now()) });
  });
  evs.sort((a, b) => a.t - b.t || a.k - b.k);
  for (const e of evs) {
    while (clock.t < e.t - 0.02) (clock.t += 0.02), g.step();
    clock.t = Math.max(clock.t, e.t);
    g.step();
    e.fn();
  }
  while (clock.t < g.timeAt(g.end + 1)) (clock.t += 0.05), g.step();
  return { r: g.results(), heard, g };
}

test("D293: overlapping thumbs score as a handover does, gliding or cancelled", () => {
  for (const [id, v] of [["wtc1f02", 0], ["inv01", 0]] as const) {
    const hand = play(id, v, { overlap: -0.03 });
    for (const s of [{ overlap: 0.12 }, { overlap: 0.12, glide: true }, { overlap: 0, long: true, glide: true }, { overlap: 0.12, cancel: true }]) {
      const o = play(id, v, s);
      assert.ok(o.r.right >= hand.r.right - 1, `${id} ${JSON.stringify(s)}: right ${o.r.right} vs handover ${hand.r.right}`);
      assert.ok(o.r.art.legato >= 0.85 * o.r.art.legatoOf, `${id} ${JSON.stringify(s)}: legato ${o.r.art.legato}/${o.r.art.legatoOf}`);
      assert.equal(o.r.slides, 0, `${id} ${JSON.stringify(s)}: a held thumb slid`);
    }
  }
});

test("D293: the player's notes sound at one level, wherever the thumb lands and right or wrong", () => {
  // Thumbs landing anywhere across the bars (the old dynamic axis), every fifth touch two rows the wrong way.
  const { heard } = play("wtc1f02", 0, { overlap: -0.03, xOf: (i, side) => (side === "left" ? 10 + ((i * 37) % 120) : 834 - ((i * 53) % 120)), yOff: (i) => (i % 5 === 4 ? 4 * RH : 0) });
  const lead = heard.filter((h) => h.level > 0);
  const levels = new Set(lead.map((h) => h.level.toFixed(3)));
  assert.ok(lead.length > 20);
  // The other voices keep their phrasing (a fixed shape), the player's own notes one level.
  const own = play("wtc1f02", 0, { overlap: -0.03, xOf: (i, side) => (side === "left" ? 10 + ((i * 37) % 120) : 834 - ((i * 53) % 120)) });
  const ownLevels = new Set(own.heard.map((h) => h.level.toFixed(3)));
  const base = play("wtc1f02", 0, { overlap: -0.03 });
  assert.deepEqual([...ownLevels].sort(), [...new Set(base.heard.map((h) => h.level.toFixed(3)))].sort(), "where the thumb lands changes no level");
  assert.ok(levels.size <= ownLevels.size + 1, `wrong touches add levels: ${levels.size} vs ${ownLevels.size}`);
});

test("D296: a reading without a level leaves the loudness the music's (play.html plays every fugue by a reading)", () => {
  const rd = readingsOf("wtc1f02")[0];
  assert.ok(rd, "a reading of I/2");
  const where = { xOf: (i: number, side: "left" | "right") => (side === "left" ? 10 + ((i * 37) % 120) : 834 - ((i * 53) % 120)) };
  const levels = (r?: Reading) => [...new Set(play("wtc1f02", 0, { overlap: -0.03, reading: r, ...where }).heard.map((h) => h.level.toFixed(3)))].sort();
  assert.deepEqual(levels({ ...rd, level: null }), levels(undefined), "where the thumb lands changes no level");
});
