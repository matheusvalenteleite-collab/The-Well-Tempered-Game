/**
 * D328: BAND TIME tried on simulated players. The panel's players (scratchpad panel/run/sim.ts) land
 * on a schedule fixed in advance; a band that waits or follows needs a player who listens, so this one
 * decides each landing as the note before lands, from where the band is then (a linear phase
 * correction, as in the ensemble-timing literature: the next onset one inter-onset interval on, at
 * the player's own tempo, less a share of the last asynchrony). It can breathe (land late after a rest
 * or a cadence), drag or rush (its own tempo), sit behind the band (a bias), or scatter. LADDER, the
 * thumbs alternating, each lifted at 55% of its note (or just before it is needed again).
 *
 *   node tools/lab/band-sim.ts            the table the D328 report quotes
 */
import type { Chip } from "../../src/touch/chip.ts";
import { fugueById } from "../../src/touch/fugue.ts";
import { tempoOf } from "../../src/touch/tempi.ts";
import { labGame } from "../../src/bench/lab/game.ts";
import type { LabEvent } from "../../src/bench/lab/events.ts";
import type { LabPassage } from "../../src/bench/lab/log.ts";
import type { Rows } from "../../src/bench/proto-game.ts";
import { waitPoints } from "../../src/bench/band-time.ts";
import { withMech } from "../../src/bench/mechanics.ts";

export interface TimePlayer {
  name: string;
  /** The player's own tempo against the band's (0.96: 4% slower: drags). */
  tempo: number;
  /** Where the player sits against the band (ms, + behind). */
  bias: number;
  /** Timing scatter (ms, sd). */
  sd: number;
  /** The share of the last asynchrony corrected at the next note (0: deaf to the band). */
  correct: number;
  /** Extra time taken before a note after a rest or a cadence (ms, uniform between). */
  breath: [number, number];
}

export const PLAYERS: TimePlayer[] = [
  { name: "steady", tempo: 1, bias: 0, sd: 20, correct: 0.5, breath: [0, 0] },
  { name: "breather", tempo: 1, bias: 0, sd: 25, correct: 0.4, breath: [120, 320] },
  { name: "behind", tempo: 1, bias: 45, sd: 25, correct: 0.4, breath: [0, 0] },
  { name: "dragger", tempo: 0.95, bias: 0, sd: 25, correct: 0.25, breath: [0, 0] },
  { name: "rusher", tempo: 1.04, bias: 0, sd: 25, correct: 0.25, breath: [0, 0] },
];

export interface BandRun {
  right: number;
  of: number;
  missed: number;
  wrong: number;
  perfect: number;
  /** Mean |offset| as judged (ms). */
  meanOff: number;
  waits: { kind: string; ms: number; expired: boolean; tick: number }[];
  /** FOLLOWS: the tempo range set (pct) and the largest drift by tempo (ms). */
  minPct: number;
  maxPct: number;
  maxDriftMs: number;
  endDriftMs: number;
  /** Where the band ended against the written time (ms, all told: waits and tempo). */
  lateAtEndMs: number;
  /** The wait points the passage has (by kind). */
  points: Record<string, number>;
  events: LabEvent[];
  /** Held sounds: those scheduled longer over a wait point, and how many were stopped. */
  held: { scheduled: number; stopped: number };
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

/** Plays passage `p` as `pl` would with the parameters `mech` (bandTime and the rest). */
export function bandRun(p: LabPassage, pl: TimePlayer, mech: Record<string, unknown>, seed = 1): BandRun {
  return withMech(mech, () => {
    const R = rng(seed);
    const U = (a: number, b: number) => a + (b - a) * R();
    const N = (m: number, s: number) => m + s * Math.sqrt(-2 * Math.log(R() || 1e-9)) * Math.cos(2 * Math.PI * R());
    const clock = { t: 0 };
    const held = { scheduled: 0, stopped: 0 };
    const chip = {
      ctx: { get currentTime() { return clock.t; } },
      heard: () => clock.t,
      note: () => ({ stop() {}, bend() {} }),
      swoosh() {},
      tick() {},
      chime() {},
      lag: 0,
      visual: 0,
      smooth: false,
    } as unknown as Chip;
    const g = labGame(p, chip);
    g.wall = () => clock.t * 1000;
    const bt = g.bandT;
    if (bt) {
      const hold = bt.hold.bind(bt);
      bt.hold = (i, sd, end, extra) => (held.scheduled++, hold(i, { stop: (at) => (held.stopped++, sd.stop(at)) }, end, extra));
    }
    const events: LabEvent[] = [];
    g.tap = (e) => events.push(e);
    const f = g.f;
    const notes = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
    const steps = notes.map((n) => n.step);
    const lo = Math.min(...steps);
    const hi = Math.max(...steps);
    const RH = 8;
    const y0 = 195 + ((lo + hi) / 2) * RH;
    const rows: Rows = { yOf: (s) => y0 - s * RH, stepAt: (y) => Math.round((y0 - y) / RH), rowH: RH, xOf: () => 422 };
    g.rows = rows;
    // Where the player breathes: after a rest or a cadence (the same points in every mode).
    const until = g.end - g.beat;
    const pts = waitPoints(g.tracks[0].notes, f.cadences ?? [], { from: g.entry, until, beat: g.beat, barTicks: f.barTicks, endsPiece: until >= f.length });
    const breathAt = new Set(pts.filter((x) => x.kind !== "final").map((x) => x.tick));
    const points: Record<string, number> = {};
    for (const x of pts) points[x.kind] = (points[x.kind] ?? 0) + 1;
    // The written time (FIXED's clock), for how far the band ended from it.
    const t0 = g.timeAt(g.start);
    const tps = g.tps;
    type Ev = { t: number; k: number; fn: () => void };
    const evs: Ev[] = [];
    const add = (e: Ev) => evs.push(e);
    const down: (number | null)[] = [null, null];
    const land = (j: number, t: number) => {
      const n = notes[j];
      const th = j % 2;
      const x = th === 0 ? 60 : 784;
      const y = Math.max(6, Math.min(384, rows.yOf(n.step) + N(0, 2)));
      add({
        t,
        k: 1,
        fn: () => {
          if (down[th] !== null) g.up(down[th]!, clock.t * 1000);
          const id = j + 1;
          down[th] = id;
          g.down(id, { side: th === 0 ? "left" : "right", x, y, w: 844, h: 390 }, clock.t * 1000);
          // The lift: at 55% of the note as the band plays it now.
          const len = g.timeAt(n.on + n.dur) - g.timeAt(n.on);
          add({ t: clock.t + Math.max(0.04, 0.55 * len), k: 0, fn: () => down[th] === id && (g.up(id, clock.t * 1000), (down[th] = null)) });
          // The next note: one interval on at the player's tempo, less a share of this asynchrony.
          const nx = notes[j + 1];
          if (!nx) return;
          const asyncS = clock.t - g.timeAt(n.on) - pl.bias / 1000;
          const ioi = (g.timeAt(nx.on) - g.timeAt(n.on)) / pl.tempo;
          let tn = clock.t + ioi - pl.correct * asyncS + N(0, pl.sd) / 1000;
          if (breathAt.has(nx.on)) tn += U(...pl.breath) / 1000;
          land(j + 1, Math.max(clock.t + 0.04, tn));
        },
      });
    };
    if (notes.length) land(0, g.timeAt(notes[0].on) + (pl.bias + N(0, pl.sd) + (breathAt.has(notes[0].on) ? U(...pl.breath) : 0)) / 1000);
    let done = false;
    for (let guard = 0; !done && guard < 60 * 900; guard++) {
      evs.sort((a, b) => a.t - b.t || a.k - b.k);
      const next = evs[0];
      if (next && next.t <= clock.t + 1 / 60) {
        evs.shift();
        clock.t = Math.max(clock.t, next.t);
        next.fn();
        continue;
      }
      clock.t += 1 / 60;
      done = g.step();
    }
    const r = g.results();
    const judged = events.filter((e): e is Extract<LabEvent, { kind: "note" }> => e.kind === "note" && e.ok && !e.slide);
    const tempi = bt?.stats.tempi ?? [];
    const rit = (g as unknown as { rit: { warp(t: number): number } }).rit;
    const written = t0 + (rit.warp(g.end) - rit.warp(g.start)) / tps;
    return {
      right: r.right,
      of: r.of,
      missed: r.missed,
      wrong: r.wrong,
      perfect: judged.filter((e) => e.perfect).length,
      meanOff: judged.reduce((a, e) => a + Math.abs(e.offMs), 0) / Math.max(1, judged.length),
      waits: bt?.stats.waits ?? [],
      minPct: tempi.length ? Math.min(...tempi.map((x) => x.pct)) : 100,
      maxPct: tempi.length ? Math.max(...tempi.map((x) => x.pct)) : 100,
      maxDriftMs: bt?.stats.maxDriftMs ?? 0,
      endDriftMs: bt?.drift ?? 0,
      lateAtEndMs: (g.timeAt(g.end) - written) * 1000,
      points,
      events,
      held,
    };
  });
}

const r1 = (x: number) => Math.round(x * 10) / 10;

/** The report's table: each player, each mode, a few passages and seeds. */
export function bandTable(passages: LabPassage[], seeds = [1, 2, 3]): string[] {
  const out: string[] = [];
  out.push("player     mode     right%  perfect%  |off| ms  waits (cad/fin/br)  mean wait  expired  tempo %        max drift  band vs written at end");
  for (const pl of PLAYERS)
    for (const mode of ["fixed", "waits", "follows"] as const) {
      let right = 0, of = 0, perfect = 0, off = 0, offN = 0, maxDrift = 0, lateEnd = 0, expired = 0;
      let minPct = 100, maxPct = 100;
      const w: Record<string, number> = { cadence: 0, final: 0, breath: 0 };
      const ms: number[] = [];
      for (const p of passages)
        for (const s of seeds) {
          const r = bandRun(p, pl, { bandTime: mode }, s);
          right += r.right;
          of += r.of;
          perfect += r.perfect;
          off += r.meanOff * r.right;
          offN += r.right;
          for (const x of r.waits) (w[x.kind]++, ms.push(x.ms), (expired += x.expired ? 1 : 0));
          minPct = Math.min(minPct, r.minPct);
          maxPct = Math.max(maxPct, r.maxPct);
          maxDrift = Math.max(maxDrift, r.maxDriftMs);
          lateEnd += r.lateAtEndMs / (passages.length * seeds.length);
        }
      out.push(
        `${pl.name.padEnd(10)} ${mode.padEnd(8)} ${String(r1((100 * right) / of)).padStart(6)}  ${String(r1((100 * perfect) / Math.max(1, right))).padStart(8)}  ${String(Math.round(off / Math.max(1, offN))).padStart(8)}  ${`${w.cadence}/${w.final}/${w.breath}`.padStart(18)}  ${String(ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : 0).padStart(6)} ms  ${String(expired).padStart(7)}  ${`${r1(minPct)}–${r1(maxPct)}`.padEnd(13)}  ${String(Math.round(maxDrift)).padStart(6)} ms  ${String(Math.round(lateEnd)).padStart(6)} ms`,
      );
    }
  return out;
}

const PASSAGES: LabPassage[] = [
  { piece: "wtc1f02", voice: 0, fromBar: 1, toBar: 999, bpm: tempoOf("wtc1f02"), tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null },
  { piece: "wtc2f12", voice: 0, fromBar: 1, toBar: 999, bpm: tempoOf("wtc2f12"), tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null },
  { piece: "wtc1f22", voice: 1, fromBar: 1, toBar: 999, bpm: tempoOf("wtc1f22"), tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null },
];

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const p of PASSAGES) {
    const f = fugueById(p.piece);
    console.log(`${p.piece} voice ${p.voice} bars ${p.fromBar}-${p.toBar} ♩${p.bpm} cadences ${(f.cadences ?? []).length}`);
  }
  for (const l of bandTable(PASSAGES)) console.log(l);
}
