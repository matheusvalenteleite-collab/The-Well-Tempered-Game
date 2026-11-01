/**
 * D485: the simulated players' runs replayed with OBBLIGATO on (the offers seen, a boost taken at each
 * offer when `take`), through a recording sound engine (every call into it, with its arguments).
 */
import type { Chip, Sounding } from "../src/touch/chip.ts";
import { PATCHES } from "../src/touch/sound.ts";
import { withMech, asRecorded } from "../src/bench/mechanics.ts";
import { labGame } from "../src/bench/lab/game.ts";
import { rowsOf } from "../src/bench/lab/replay.ts";
import { UNIT_S, type LabLog } from "../src/bench/lab/log.ts";
import type { ProtoGame } from "../src/bench/proto-game.ts";

export function recordingChip(clock: { t: number }, log: string[]): Chip {
  const ids = new Map<unknown, string>(Object.entries(PATCHES).map(([k, v]) => [v, k]));
  const enc = (a: unknown) => JSON.stringify(a, (_k, v) => (typeof v === "function" ? "fn" : typeof v === "number" ? Math.round(v * 1e6) / 1e6 : ids.has(v) ? `patch:${ids.get(v)}` : v));
  const sounding = (tag: string): Sounding => new Proxy({} as Sounding, { get: (_t, p) => (...args: unknown[]) => void log.push(`${tag}.${String(p)}(${enc(args)})`) });
  let n = 0;
  const base: Record<string, unknown> = { ctx: { get currentTime() { return clock.t; } }, lag: 0, visual: 0, smooth: false };
  return new Proxy(base, {
    get(t, p) {
      if (p in t) return t[p as string];
      if (p === "then") return undefined;
      return (...args: unknown[]) => {
        if (p === "heard") return clock.t;
        const tag = `s${n++}`;
        log.push(`${String(p)}(${enc(args)}) -> ${tag}`);
        return sounding(tag);
      };
    },
    set(t, p, v) {
      t[p as string] = v;
      return true;
    },
  }) as unknown as Chip;
}

export interface ObbRun {
  calls: string[];
  /** Each offer as first seen: the entry's onset, the tick it appeared, the instrument and its octave. */
  offers: { entryOn: number; at: number; id: string; octave: number; tier: number; spans: { voice: number; on: number; end: number }[] }[];
  /** The band's and riders' notes given a layer (voice, onset). */
  layered: { voice: number; on: number }[];
  g: ProtoGame;
}

/** Replays `log` with OBBLIGATO on (or off); `take` accepts each offer as soon as it stands. */
export function obbRun(log: LabLog, o: { on: boolean; take: boolean; rng?: () => number }): ObbRun {
  return withMech(asRecorded(log.mech), () => {
    const calls: string[] = [];
    const clock = { t: 0 };
    const g = labGame(log.passage, recordingChip(clock, calls));
    const opts = g.o as { obbligato?: boolean; obbRng?: () => number };
    opts.obbligato = o.on;
    if (o.rng) opts.obbRng = o.rng;
    g.wall = () => 0;
    const layered: ObbRun["layered"] = [];
    const gg = g as unknown as { layerOf: (voice: number, on: number, ...r: unknown[]) => void };
    const orig = gg.layerOf.bind(g);
    gg.layerOf = (voice, on, ...r) => (g.boostAt(voice, on) && layered.push({ voice, on }), orig(voice, on, ...r));
    const base = g.timeAt(g.start);
    let area = { ...log.area };
    if (log.rows) g.rows = rowsOf(log.rows.y0, log.rows.rowH);
    const offers: ObbRun["offers"] = [];
    let u = 0;
    let done = false;
    const look = () => {
      const f = g.offer;
      if (f && !offers.some((x) => x.entryOn === f.entryOn)) offers.push({ entryOn: f.entryOn, at: g.now, id: f.layer.id, octave: f.octave, tier: f.tier, spans: f.spans });
      if (f && o.take) g.acceptOffer();
    };
    for (const e of log.ev) {
      if (done) break;
      if (typeof e === "number") {
        u += e;
        clock.t = base + u * UNIT_S;
        done = g.step();
        look();
        continue;
      }
      u += e[1];
      clock.t = base + u * UNIT_S;
      if (e[0] === "d") g.down(e[2], { side: e[5] === "l" ? "left" : "right", x: e[3], y: e[4], w: area.w, h: area.h }, 0);
      else if (e[0] === "m") g.move(e[2], { side: "left", x: e[3], y: e[4], w: area.w, h: area.h }, 0);
      else if (e[0] === "u") g.up(e[2], 0);
      else if (e[0] === "c") g.up(e[2], 0, true);
      else if (e[0] === "r") g.rows = rowsOf(e[2], e[3]);
      else if (e[0] === "a") area = { w: e[2], h: e[3] };
    }
    for (let n = 0; !done && n < 60 * 120; n++) {
      clock.t += 1 / 60;
      done = g.step();
      look();
    }
    g.stopAll();
    return { calls, offers, layered, g };
  });
}
