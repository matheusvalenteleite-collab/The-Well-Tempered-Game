/**
 * D342: THE MANUAL's simulated players for its tests: Herr Bach's demonstration (the careful player, in a
 * lesson's manner) and a random tapper, each played through the engine without sound with the lesson's
 * lens watching.
 */
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { LensTally } from "../src/bench/manual/lens.ts";
import { runOf, type DemoStyle, type Material } from "../src/bench/manual/lessons.ts";
import { readingsOf } from "../src/touch/readings.ts";

export function fakeChip(clock: { t: number }) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
}

/** The box's rows as the demonstration's own coordinates expect (rows 16 px apart). */
export const ROWS: Rows = { yOf: (s) => 900 - s * 16, stepAt: (y) => Math.round((900 - y) / 16), rowH: 16, xOf: () => 400 };

export function gameFor(m: Material, clock: { t: number }, demo?: DemoStyle, ornaments = false) {
  const r = runOf(m, demo, undefined, ornaments);
  const g = new ProtoGame(fugueById(r.piece), r.voice, r.from, protoById("ladder"), { bpm: r.bpm, legato: false, until: r.until, wait: r.wait, solo: r.solo, easy: r.easy, fail: false, ...(demo ? { demo: true } : {}), ...(r.demoStyle ? { demoStyle: r.demoStyle } : {}), ...(r.click ? { click: r.click } : {}), ...(r.reading ? { reading: readingsOf(r.piece).find((x) => x.id === r.reading) ?? null } : {}), ...(r.quiet ? { quiet: r.quiet } : {}), ...(r.coach ? { coach: r.coach } : {}), ...(r.tut ?? {}) }, fakeChip(clock));
  g.rows = ROWS;
  const lens = new LensTally(g, () => clock.t * 1000);
  g.tap = lens.feed;
  g.lens = lens;
  return { g, lens, r };
}

/** Herr Bach plays the material himself (the careful player). */
export function demoRun(m: Material, style: DemoStyle = "plain") {
  const clock = { t: 0 };
  const { g } = gameFor(m, clock, style);
  let done = false;
  while (!done && clock.t < 900) (clock.t += 1 / 120), (done = g.step());
  return g.results();
}

/** A random tapper: touches at random moments about a note apart, at random heights, either thumb. */
export function tapperRun(m: Material, seed = 7) {
  const clock = { t: 0 };
  const { g } = gameFor(m, clock);
  // Touches stamped 0 on a wall clock that reads 0: judged at the audio clock as is.
  g.wall = () => 0;
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const heads = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
  const iois = heads.slice(1).map((n, i) => g.timeAt(n.on) - g.timeAt(heads[i].on)).sort((a, b) => a - b);
  const ioi = iois[iois.length >> 1] ?? 0.4;
  const steps = heads.map((n) => n.step);
  const lo = Math.min(...steps) - 3;
  const hi = Math.max(...steps) + 3;
  type E = { t: number; k: number; fn: () => void };
  const evs: E[] = [];
  const end = g.timeAt(g.end);
  let id = 1;
  for (let at = g.timeAt(heads[0].on) - ioi / 2; at < end; at += ioi * (1 + 0.6 * rand())) {
    const side = rand() > 0 ? "right" : "left";
    const x = side === "left" ? 40 : 760;
    const y = ROWS.yOf(lo + (hi - lo) * (0.5 + 0.5 * rand()));
    const me = id++;
    const hold = ioi * (0.3 + 0.6 * (0.5 + 0.5 * rand()));
    evs.push({ t: at, k: 1, fn: () => g.down(me, { side, x, y, w: 800, h: 400 }, 0) });
    evs.push({ t: at + hold, k: 0, fn: () => g.up(me, 0) });
  }
  evs.sort((a, b) => a.t - b.t || a.k - b.k);
  let done = false;
  for (const e of evs) {
    while (!done && clock.t + 1 / 120 < e.t) (clock.t += 1 / 120), (done = g.step());
    if (done) break;
    clock.t = Math.max(clock.t, e.t);
    e.fn();
  }
  while (!done && clock.t < 900) (clock.t += 1 / 120), (done = g.step());
  return g.results();
}
