/**
 * D359: THE MANUAL's simulated players beyond D342's two (Herr Bach's demonstration, the random tapper):
 * a player who plays every note in its place and time, with chosen faults, so a lesson's pass rule can be
 * held to "a careful player passes, a near miss is told exactly what to fix, a random tapper fails".
 *   offsetMs   every strike early (−) or late (+) by so much
 *   jitterMs   each strike's scatter (uniform ±)
 *   hold       how long each note sounds, as a share of the time to the next strike (1 joined; over 1 an
 *              overlap of the other thumb); "written" holds each note to its written end
 *   oneThumb   every note with the right thumb
 *   wrongEvery every so many notes landed the wrong way
 *   lean       strong-beat notes struck so many ms late (an agogic lean), the next back on time
 */
import { gameFor, ROWS } from "./d342-sim.ts";
import type { DemoStyle, Material } from "../src/bench/manual/lessons.ts";

export interface PlayerStyle {
  offsetMs?: number;
  jitterMs?: number;
  hold?: number | "written";
  oneThumb?: boolean;
  wrongEvery?: number;
  /** ms late on the notes `leanAt` picks (default: none). */
  lean?: { ms: number; at: (tick: number) => boolean };
  /** Holds by note: a share for note k (overrides `hold`). */
  holdOf?: (k: number) => number | "written";
  /** D379: where across its strip note k lands (0..1, 0 the inner edge by the box; default the outer quarter). */
  acrossOf?: (k: number) => number;
  /** D425: how hard note k is struck (0 soft .. 1 hard: the hard tap), as a phone's sensor would read it; default none read. */
  strikeOf?: (k: number) => number;
  /** D379: note k reached by sliding the thumb that holds the note before (no new touch). */
  slideAt?: (k: number) => boolean;
  seed?: number;
}

export function playerRun(m: Material, s: PlayerStyle = {}, demo?: DemoStyle) {
  const clock = { t: 0 };
  const { g } = gameFor(m, clock, demo);
  g.o.demo = false;
  g.wall = () => 0;
  let seed = s.seed ?? 5;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const heads = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
  type E = { t: number; k: number; fn: () => void };
  const evs: E[] = [];
  // D379: a slide moves the held thumb (its touch id kept) to the next note's height over the last 60 ms, and lets go at that note's end.
  let held: { id: number; side: "left" | "right"; x: number; up: E } | null = null;
  heads.forEach((n, k) => {
    const side = s.oneThumb ? "right" : k % 2 ? "right" : "left";
    const across = s.acrossOf ? s.acrossOf(k) : 0.75;
    const x = side === "left" ? 160 * (1 - across) : 640 + 160 * across;
    const prev = heads[k - 1];
    const dir = prev ? Math.sign(n.step - prev.step) || 1 : 1;
    const wrong = !!s.wrongEvery && k > 2 && k % s.wrongEvery === s.wrongEvery - 1;
    const y = ROWS.yOf(n.step) + (wrong ? dir * 3 * ROWS.rowH : 0);
    const lean = s.lean && s.lean.at(n.on) ? s.lean.ms : 0;
    const t0 = g.timeAt(n.on) + ((s.offsetMs ?? 0) + lean + rand() * (s.jitterMs ?? 0)) / 1000;
    const next = heads[k + 1];
    const h = s.holdOf ? s.holdOf(k) : (s.hold ?? 0.75);
    const tNext = next ? g.timeAt(next.on) + (s.offsetMs ?? 0) / 1000 : g.timeAt(n.on + n.dur);
    let t1 = h === "written" ? g.timeAt(n.on + n.dur) - 0.01 : g.timeAt(n.on) + (tNext - g.timeAt(n.on)) * h;
    if (s.oneThumb && next) t1 = Math.min(t1, tNext - 0.03);
    t1 = Math.max(t0 + 0.04, t1);
    if (held && s.slideAt?.(k) && prev) {
      const hh = held;
      const y0 = ROWS.yOf(prev.step);
      for (let j = 1; j <= 4; j++) {
        const yy = y0 + ((y - y0) * j) / 4;
        evs.push({ t: t0 - 0.06 + 0.015 * j, k: 2, fn: () => g.move(hh.id, { side: hh.side, x: hh.x, y: yy, w: 800, h: 1000 }, 0) });
      }
      hh.up.t = t1;
      return;
    }
    const id = k + 1;
    const up: E = { t: t1, k: 0, fn: () => g.up(id, 0) };
    const strike = s.strikeOf?.(k);
    evs.push({ t: t0, k: 1, fn: () => g.down(id, { side, x, y, w: 800, h: 1000, ...(strike !== undefined ? { strike } : {}) }, 0) });
    evs.push(up);
    held = { id, side, x, up };
  });
  evs.sort((a, b) => a.t - b.t || a.k - b.k);
  let done = false;
  for (const e of evs) {
    while (!done && clock.t + 1 / 240 < e.t) (clock.t += 1 / 240), (done = g.step());
    if (done) break;
    clock.t = Math.max(clock.t, e.t);
    e.fn();
  }
  while (!done && clock.t < 900) (clock.t += 1 / 240), (done = g.step());
  return g.results();
}
