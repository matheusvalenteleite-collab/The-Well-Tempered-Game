/**
 * D216, KIMIKO (first made for D215's WITH ISHIZAKA, withdrawn): the game on Kimiko Ishizaka's time.
 * Her recording of the 24 Book I fugues (CC0; D221) is timed tick by tick
 * (data/recordings/ishizaka-ticks.json, tools/align-ishizaka-ticks.py: every beat, and the notes where
 * they depart from it); KIMIKO's clock follows it instead of the steady tempo and the final ritard
 * (her own ritard is in it). Before the passage played (the count-in) the clock runs at her tempo over
 * its first bar. Only KIMIKO uses it.
 */
import ticks from "../../data/recordings/ishizaka-ticks.json" with { type: "json" };
import type { TouchFugue } from "../touch/fugue.ts";

interface Stored {
  a: number;
  unit: number;
  t0: number;
  s0: number;
  dt: number[];
  dms: number[];
}
const PIECES = (ticks as unknown as { pieces: Record<string, Stored> }).pieces;

/** Her timing of a piece: the anchors (ticks, seconds in the track, both rising) and her A (Hz). */
export interface HerMap {
  key: string;
  a: number;
  ticks: number[];
  secs: number[];
}

/** "wtc1f05" → "wtc1-05f" (the recordings' keys). */
export function herKey(fugueId: string): string | null {
  const m = /^wtc1f(\d\d)$/.exec(fugueId);
  return m ? `wtc1-${m[1]}f` : null;
}

const maps = new Map<string, HerMap | null>();
/** Her timing of a fugue, if she is timed in it (the 24 fugues of Book I, D221). */
export function herMap(fugueId: string): HerMap | null {
  if (maps.has(fugueId)) return maps.get(fugueId)!;
  const key = herKey(fugueId);
  const p = key ? PIECES[key] : undefined;
  let m: HerMap | null = null;
  if (key && p) {
    const t = [p.t0 * p.unit];
    const s = [p.s0 / 1000];
    let q = p.t0;
    let ms = p.s0;
    for (let i = 0; i < p.dt.length; i++) {
      q += p.dt[i];
      ms += p.dms[i];
      t.push(q * p.unit);
      s.push(ms / 1000);
    }
    m = { key, a: p.a, ticks: t, secs: s };
  }
  maps.set(fugueId, m);
  return m;
}

/** The segment of a rising array holding x (its first index; the first or last segment outside). */
function seg(xs: number[], x: number): number {
  let lo = 0;
  let hi = xs.length - 2;
  if (x <= xs[0]) return 0;
  if (x >= xs[hi + 1]) return hi;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** A tick → its time in her track (s), linear between anchors (and beyond them, on the end segments). */
export function secAt(m: HerMap, tick: number): number {
  const i = seg(m.ticks, tick);
  const t0 = m.ticks[i];
  const t1 = m.ticks[i + 1];
  return m.secs[i] + ((tick - t0) / (t1 - t0)) * (m.secs[i + 1] - m.secs[i]);
}

/** A time in her track (s) → the tick she plays then. */
export function tickAtSec(m: HerMap, s: number): number {
  const i = seg(m.secs, s);
  const s0 = m.secs[i];
  const s1 = m.secs[i + 1];
  return m.ticks[i] + ((s - s0) / (s1 - s0)) * (m.ticks[i + 1] - m.ticks[i]);
}

/** The game's clock on her time, in the shape of phrasing.ts ritard (warped ticks run at `tps`), and her tempo. */
export interface Clock {
  warp: (tick: number) => number;
  unwarp: (w: number) => number;
  /** Her mean tempo over the passage (quarters a minute; the last bar's held chord left out), and the ticks a second at it. */
  bpm: number;
  tps: number;
}

/**
 * The clock from `from` (the start slider's tick): warp(tick) = from + (her seconds from `from`) × tps,
 * so a span of ticks lasts as she plays it. Before `from` (the count-in), her tempo over the bar from
 * `from` on.
 */
export function herClock(m: HerMap, f: Pick<TouchFugue, "tpq" | "barTicks" | "length">, from: number, until = f.length): Clock {
  const s0 = secAt(m, from);
  const bar = f.barTicks;
  const lead = Math.max(1e-6, (secAt(m, from + bar) - s0) / bar);
  const endBody = Math.max(from + bar, Math.min(until, f.length - bar));
  const bpm = ((endBody - from) / f.tpq / Math.max(1e-6, secAt(m, endBody) - s0)) * 60;
  const tps = (f.tpq * bpm) / 60;
  const secOf = (tick: number) => (tick >= from ? secAt(m, tick) : s0 - (from - tick) * lead);
  return {
    bpm,
    tps,
    warp: (tick) => from + (secOf(tick) - s0) * tps,
    unwarp: (w) => {
      const s = s0 + (w - from) / tps;
      return s >= s0 ? tickAtSec(m, s) : from - (s0 - s) / lead;
    },
  };
}
