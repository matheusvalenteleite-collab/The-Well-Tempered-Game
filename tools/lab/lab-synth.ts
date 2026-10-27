/**
 * D317: a simulated player for THE LAB's tests and fixture: plays a passage on LADDER through the
 * lab's recorder (frames every 1/60 s, touches with a seeded scatter), so that its log can be
 * replayed and compared. `gap` is how long before the next note's strike each thumb lifts (negative:
 * after, an overlap); every `wrongEvery`-th touch lands two rows the wrong way; every `strayEvery`-th
 * note gets an extra touch between notes. D329: every `preplaceEvery`-th note's thumb is put down on
 * its note as the other thumb strikes the note before (5 ms after it: the owner's II/18 log, about a note
 * value early), resting there until its time.
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
  const notes = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
  type E = { t: number; k: number; fn: () => void };
  const evs: E[] = [];
  let before = 0;
  notes.forEach((n, i) => {
    const side = i % 2 ? "right" : "left";
    const x = side === "left" ? 40 : 804;
    const wrong = s.wrongEvery && i % s.wrongEvery === s.wrongEvery - 1 && i > 2;
    const prev = notes[i - 1];
    const dir = prev ? Math.sign(n.step - prev.step) || 1 : 1;
    const y = rows.yOf(n.step) + (wrong ? dir * 2.2 * 18 : rand() * 3);
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
