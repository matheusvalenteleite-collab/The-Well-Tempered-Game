/**
 * D317: a simulated player for THE LAB's tests and fixture: plays a passage on LADDER through the
 * lab's recorder (frames every 1/60 s, touches with a seeded scatter), so that its log can be
 * replayed and compared. `gap` is how long before the next note's strike each thumb lifts (negative:
 * after, an overlap); every `wrongEvery`-th touch lands two rows the wrong way; every `strayEvery`-th
 * note gets an extra touch between notes. D329: every `preplaceEvery`-th note's thumb is put down on
 * its note as the other thumb strikes the note before (5 ms after it: the owner's II/18 log, about a note
 * value early), resting there until its time. D332: `scatterPx` (a landing's height, normally spread)
 * and `randomY` (a random tapper: any height on the bar).
 */
import { silentChip } from "../../src/bench/lab/replay.ts";
import { labGame } from "../../src/bench/lab/game.ts";
import { LabRecorder, type LabLog, type LabPassage } from "../../src/bench/lab/log.ts";
import type { Rows } from "../../src/bench/proto-game.ts";

export interface SynthStyle {
  /** Seconds each thumb lifts before the next strike (negative: an overlap). */
  gap: number;
  /** Timing scatter (s, uniform ±). */
  jitter?: number;
  wrongEvery?: number;
  strayEvery?: number;
  /** D329: every this-many-th note landed with the note before's strike (a thumb resting early on its note). */
  preplaceEvery?: number;
  /** D333: every this-many-th note (counted from 5) landed the wrong way, whatever the seed: a habit that stays. */
  stuckEvery?: number;
  /** D332: the landing's height scatter (px, a normal spread's standard deviation; default ±3 px uniform). */
  scatterPx?: number;
  /** D332: a random tapper: every landing at a random height on the bar (the timing as the others'). */
  randomY?: boolean;
  seed?: number;
}

export function synthRun(p: LabPassage, s: SynthStyle): LabLog {
  const clock = { t: 0 };
  const chip = silentChip(clock);
  const g = labGame(p, chip);
  g.wall = () => 0;
  const area = { w: 844, h: 390 };
  const y0 = 330;
  const rowH = 9;
  const rows: Rows = { yOf: (st) => y0 - st * rowH, stepAt: (y) => Math.round((y0 - y) / rowH), rowH, xOf: () => 0 };
  g.rows = rows;
  const rec = new LabRecorder(g, () => clock.t, { app: "synth", at: "2026-10-27T00:00:00.000Z", passage: p, device: { w: 844, h: 390, dpr: 3, ua: "synth", lag: null }, area, rows: { y0, rowH } });
  let seed = s.seed ?? 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const gauss = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, (rand() + 1) / 2))) * Math.cos(Math.PI * (rand() + 1));
  const notes = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
  type E = { t: number; k: number; fn: () => void };
  const evs: E[] = [];
  let before = 0;
  notes.forEach((n, i) => {
    const side = i % 2 ? "right" : "left";
    const x = side === "left" ? 40 : 804;
    const wrong = (s.wrongEvery && i % s.wrongEvery === s.wrongEvery - 1 && i > 2) || (s.stuckEvery && i > 4 && (i - 5) % s.stuckEvery === 0);
    const prev = notes[i - 1];
    const dir = prev ? Math.sign(n.step - prev.step) || 1 : 1;
    const y = s.randomY ? 20 + ((rand() + 1) / 2) * (area.h - 40) : rows.yOf(n.step) + (wrong ? dir * 2.2 * 18 : s.scatterPx !== undefined ? gauss() * s.scatterPx : rand() * 3);
    const pre = !!s.preplaceEvery && i > 0 && i % s.preplaceEvery === 0;
    const t0 = pre ? before + 0.005 : g.timeAt(n.on) + rand() * (s.jitter ?? 0.02);
    before = t0;
    const next = notes[i + 1];
    const t1 = next ? Math.max(t0 + 0.04, g.timeAt(next.on) - s.gap) : g.timeAt(n.on + n.dur) - 0.02;
    const id = i + 1;
    evs.push({ t: t0, k: 1, fn: () => rec.down(id, side, x, y, area.w, area.h, 0) });
    evs.push({ t: (t0 + t1) / 2, k: 2, fn: () => rec.move(id, x + 1, y + 1, area.w, area.h, 0) });
    evs.push({ t: t1, k: 0, fn: () => rec.up(id, 0) });
    if (s.strayEvery && i % s.strayEvery === s.strayEvery - 1 && next) {
      const ts = (g.timeAt(n.on) + g.timeAt(next.on)) / 2 + 0.002;
      evs.push({ t: ts, k: 1, fn: () => rec.down(1000 + id, side === "left" ? "right" : "left", 800, y, area.w, area.h, 0) });
      evs.push({ t: ts + 0.03, k: 0, fn: () => rec.up(1000 + id, 0) });
    }
  });
  evs.sort((a, b) => a.t - b.t || a.k - b.k);
  const frame = () => {
    rec.frame();
    return g.step();
  };
  let done = false;
  for (const e of evs) {
    while (!done && clock.t + 1 / 60 < e.t) (clock.t += 1 / 60), (done = frame());
    if (done) break;
    clock.t = Math.max(clock.t, e.t);
    e.fn();
  }
  for (let n = 0; !done && n < 60 * 600; n++) (clock.t += 1 / 60), (done = frame());
  return rec.finish();
}

/**
 * D334: the owner's hands in II/18 (a guitarist's hammer-on and pull-off): as one thumb's note sounds,
 * the other thumb leaves the note before and comes down on the next-next note 0–9 ms later, resting there
 * about a note early; the note it rests on is meant to sound when the other thumb lifts, at its time
 * (± `jitter`). With `press`, the resting thumb first presses (moves 6 px down) 0–80 ms before the other
 * lifts; with `holdOn` (s) the other thumb lifts that much late. The first two notes are struck (the second a
 * hammer-on, the first still held).
 */
export function synthPreparer(p: LabPassage, s: { jitter?: number; press?: boolean; holdOn?: number; seed?: number }): LabLog {
  return synthEvents(p, s.seed, (notes, t, rand, rows) => {
    const evs: SynthEvent[] = [];
    const j = () => rand() * (s.jitter ?? 0.02);
    const sound: number[] = [];
    const land: number[] = [];
    const lift: number[] = [];
    notes.forEach((n, i) => {
      if (i < 2) land[i] = t(n.on) + j();
      else land[i] = sound[i - 1] + 0.0055 + rand() * 0.0035;
      if (i < 2) sound[i] = land[i];
      // Note i sounds as the thumb on i−1 lifts (a pull-off).
      const next = notes[i + 1];
      if (next && i + 1 >= 2) sound[i + 1] = Math.max(t(next.on) + j() + (s.holdOn ?? 0), land[i] + 0.05);
    });
    notes.forEach((n, i) => {
      const next = notes[i + 1];
      lift[i] = i === 0 ? land[1] + 0.001 : next ? sound[i + 1] : t(n.on + n.dur) - 0.02;
    });
    notes.forEach((n, i) => {
      const side = i % 2 ? "right" : "left";
      const x = side === "left" ? 40 : 804;
      const y = rows.yOf(n.step) + rand() * 3;
      evs.push({ t: land[i], k: 1, kind: "d", id: i + 1, side, x, y });
      if (s.press && i >= 2) {
        const tp = Math.max(land[i] + 0.1, lift[i - 1] - 0.08 * (0.5 + 0.5 * rand()));
        if (tp < lift[i - 1]) evs.push({ t: tp, k: 2, kind: "m", id: i + 1, x, y: y + 6 });
      }
      evs.push({ t: Math.max(lift[i], land[i] + 0.03), k: 0, kind: "u", id: i + 1 });
    });
    return evs;
  });
}

/**
 * D334: a random tapper: touches at random moments (0.4–1.6 of the passage's usual time between notes
 * apart), at random heights over the voice's range, either thumb, each held 60–600 ms (so it overlaps the
 * other thumb now and then). For checking that B+ lets no more through than B.
 */
export function synthTapper(p: LabPassage, s: { seed?: number }): LabLog {
  return synthEvents(p, s.seed, (notes, t, rand, rows) => {
    const evs: SynthEvent[] = [];
    const steps = notes.map((n) => n.step);
    const lo = Math.min(...steps);
    const hi = Math.max(...steps);
    const iois = notes.slice(1).map((n, i) => t(n.on) - t(notes[i].on)).sort((a, b) => a - b);
    const ioi = iois[iois.length >> 1] ?? 0.36;
    const end = t(notes[notes.length - 1].on + notes[notes.length - 1].dur);
    let id = 1;
    for (let at = t(notes[0].on) - ioi / 2; at < end; at += ioi * (1 + 0.6 * rand())) {
      const side = rand() > 0 ? "right" : "left";
      const x = side === "left" ? 40 + 20 * rand() : 804 + 20 * rand();
      const y = rows.yOf(lo + (hi - lo) * (0.5 + 0.5 * rand()));
      evs.push({ t: at, k: 1, kind: "d", id, side, x, y });
      evs.push({ t: at + 0.33 + 0.27 * rand(), k: 0, kind: "u", id });
      id++;
    }
    return evs;
  });
}

export type SynthEvent = { t: number; k: number; kind: "d" | "m" | "u"; id: number; side?: "left" | "right"; x?: number; y?: number };
export type SynthNote = { on: number; dur: number; step: number };

/** D334: a synthetic run from a list of touches (the setup synthRun uses). */
export function synthEvents(p: LabPassage, seed0: number | undefined, plan: (notes: SynthNote[], t: (tick: number) => number, rand: () => number, rows: Rows) => SynthEvent[]): LabLog {
  const clock = { t: 0 };
  const chip = silentChip(clock);
  const g = labGame(p, chip);
  g.wall = () => 0;
  const area = { w: 844, h: 390 };
  const y0 = 330;
  const rowH = 9;
  const rows: Rows = { yOf: (st) => y0 - st * rowH, stepAt: (y) => Math.round((y0 - y) / rowH), rowH, xOf: () => 0 };
  g.rows = rows;
  const rec = new LabRecorder(g, () => clock.t, { app: "synth", at: "2026-10-27T00:00:00.000Z", passage: p, device: { w: 844, h: 390, dpr: 3, ua: "synth", lag: null }, area, rows: { y0, rowH } });
  let seed = seed0 ?? 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const notes = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
  const evs = plan(notes, (tick) => g.timeAt(tick), rand, rows).sort((a, b) => a.t - b.t || a.k - b.k);
  const pos = new Map<number, { x: number; y: number }>();
  let done = false;
  for (const e of evs) {
    while (!done && clock.t + 1 / 60 < e.t) (clock.t += 1 / 60), rec.frame(), (done = g.step());
    if (done) break;
    clock.t = Math.max(clock.t, e.t);
    if (e.kind === "d") pos.set(e.id, { x: e.x!, y: e.y! }), rec.down(e.id, e.side!, e.x!, e.y!, area.w, area.h, 0);
    else if (e.kind === "m") rec.move(e.id, e.x ?? pos.get(e.id)?.x ?? 0, e.y!, area.w, area.h, 0);
    else rec.up(e.id, 0);
  }
  for (let n = 0; !done && n < 60 * 600; n++) (clock.t += 1 / 60), rec.frame(), (done = g.step());
  return rec.finish();
}
