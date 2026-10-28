/**
 * D377, THE BOX'S ZOOM (box-zoom.ts): the width chosen once per round; the range narrowed rarely, eased,
 * never clipping, never under 60% of the piece's, held 4 bars, begun only while the thumbs are still; the
 * touch rows the drawing's at every moment of an ease.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, loadExtras, everyNote, type TouchFugue } from "../src/touch/fugue.ts";
import { stepRange } from "../src/touch/voice-mode.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { BOX_PX, BoxZoom, aheadBars, chooseBars, decide, easeCurve, initialRange, ladderHeight, ladderRows, planZoom, quietAt, touchRows, widen, ZOOM, type ZoomPlan } from "../src/touch/box-zoom.ts";

await loadExtras();

const tpsOf = (f: TouchFugue) => (f.tpq * tempoOf(f.id)) / 60;
const fullOf = (f: TouchFugue) => {
  const r = stepRange(f);
  return { lo: r.lo - 1, hi: r.hi + 1 };
};
const planOf = (f: TouchFugue, v: number) => planZoom(everyNote(f), f.voices[v], fullOf(f), f.barTicks, 0, Infinity);

/** A round played through: the zoom's ranges at every half beat (the eases taken as instant for the checks). */
function playThrough(f: TouchFugue, v: number) {
  const p = planOf(f, v);
  const tps = tpsOf(f);
  const bars = chooseBars(f.voices[v], f.barTicks, tps);
  const ahead = 0.75 * bars * f.barTicks;
  const half = f.barTicks / 8;
  const z = new BoxZoom(p, 0, half * 2, true);
  const log: { now: number; lo: number; hi: number }[] = [];
  const end = Math.max(...everyNote(f).map((n) => n[0] + n[1]));
  for (let now = 0, ms = 0; now < end; now += half, ms += (half / tps) * 1000) {
    z.update(now, ms, tps, ahead);
    log.push({ now, lo: z.cur.lo, hi: z.cur.hi });
  }
  return { p, z, log, bars, tps };
}

test("width: once per round, the typical note about 1/18 of the box, 1.5–4 bars, 3 s ahead", () => {
  const out: Record<string, number> = {};
  for (const id of ["wtc1f01", "wtc1f02", "wtc1f24", "bwv772", "wtc1f15", "wtc1f04"]) {
    const f = fugueById(id);
    assert.equal(f.id, id);
    const tps = tpsOf(f);
    const bars = chooseBars(f.voices[0], f.barTicks, tps);
    out[id] = bars;
    assert.ok(bars >= Math.min(ZOOM.minBars, 3) && bars <= Math.max(ZOOM.maxBars, aheadBars(f.barTicks, tps)) + 1e-9, `${id} ${bars}`);
    // At least 3 s of music ahead of the playhead.
    assert.ok((0.75 * bars * f.barTicks) / tps >= ZOOM.minAheadS - 0.01, `${id} ahead`);
  }
  // I/24's long notes (a slow 4/4 in quavers) and Invention 1's semiquavers read differently from I/1's.
  assert.notEqual(out.wtc1f24, out.bwv772);
  // Kept at 3 when already within 20% of the target.
  const notes = Array.from({ length: 40 }, (_, i) => [i * 80, 80, 60, 0]);
  assert.equal(chooseBars(notes, 480, 1), 3); // 18 × 80 / 480 = 3
  assert.equal(chooseBars(notes.map((n) => [n[0], 70, 60, 0]), 480, 1), 3); // 2.625: within 20%
  assert.equal(chooseBars(notes.map((n) => [n[0] * 2, 160, 60, 0]), 480, 1), 4); // 6 → 4
  assert.equal(chooseBars(notes.map((n) => [n[0] / 2, 40, 60, 0]), 480, 1), 1.5); // 1.5
  // Never under 3 s ahead: a fast tempo widens it.
  assert.ok(chooseBars(notes.map((n) => [n[0] / 2, 40, 60, 0]), 480, 1000) >= aheadBars(480, 1000) - 0.01);
  // The rests never count; a round of two note values takes the slower's width (the safer).
  const mixed = [...Array.from({ length: 30 }, (_, i) => [i * 40, 40, 60, 0]), ...Array.from({ length: 30 }, (_, i) => [8 * 480 * 2 + i * 160, 160, 60, 0])];
  assert.equal(chooseBars(mixed, 480, 1), 4);
  const rests = Array.from({ length: 20 }, (_, i) => [i * 4000, 80, 60, 0]);
  assert.equal(chooseBars(rests, 480, 1), chooseBars(notes, 480, 1));
});

test("height: the floor of 60% and 10 steps, the margin, inside the piece", () => {
  const full = { lo: 0, hi: 39 };
  assert.deepEqual(widen({ lo: 10, hi: 12 }, full), { lo: 0, hi: 23 }); // 24 steps = 60% of 40, kept inside
  assert.deepEqual(widen({ lo: 0, hi: 2 }, full), { lo: 0, hi: 23 });
  assert.deepEqual(widen({ lo: 37, hi: 39 }, full), { lo: 16, hi: 39 });
  assert.deepEqual(widen({ lo: 3, hi: 30 }, full), { lo: 2, hi: 31 });
  assert.equal(widen({ lo: 5, hi: 5 }, { lo: 0, hi: 12 }).hi - widen({ lo: 5, hi: 5 }, { lo: 0, hi: 12 }).lo + 1, 10);
});

/** A synthetic plan: one voice in a narrow band for 8 bars, then the whole range. */
function synth(): ZoomPlan {
  const bt = 100;
  const shown: number[][] = [];
  const own: number[][] = [];
  for (let t = 0; t < 8 * bt; t += 25) shown.push([t, 25, 60, 18 + ((t / 25) % 3)]), own.push([t, 25, 60, 18]);
  for (let t = 8 * bt; t < 16 * bt; t += 25) shown.push([t, 25, 60, (t / 25) % 2 ? 2 : 38]);
  return planZoom(shown, own, { lo: 0, hi: 40 }, bt, 0, Infinity);
}

test("height: the opening narrowed; out before anything is clipped, even while the voice is busy", () => {
  const p = synth();
  const start = initialRange(p, 0);
  assert.ok(start.hi - start.lo + 1 < 0.7 * 41 && start.hi - start.lo + 1 >= Math.ceil(0.6 * 41), JSON.stringify(start));
  // The voice busy every 25 ticks (never quiet at a tempo of 100 ticks/s): out only at the deadline.
  const tps = 100;
  assert.equal(quietAt(p, 300, ZOOM.easeS * tps), false);
  let out = -1;
  for (let now = 0; now < 8 * 100; now += 5) {
    const to = decide(p, start, 0, now, tps, 200);
    if (to) {
      out = now;
      assert.ok(to.lo <= 2 && to.hi >= 38, "the new range holds every note ahead");
      break;
    }
  }
  // Deferred (not at bar 4, when the notes entered the lookahead), but before they reach the screen.
  assert.ok(out > 4 * 100, `deferred: ${out}`);
  assert.ok(800 - out >= 200, `in time: ${out}`);
});

test("height: hysteresis, deferral while the voice is busy, never under the floor, never clipping (I/1, I/2, I/24, Invention 1)", () => {
  for (const [id, v] of [["wtc1f01", 0], ["wtc1f01", 3], ["wtc1f02", 1], ["wtc1f24", 2], ["bwv772", 1]] as const) {
    const f = fugueById(id);
    const { p, z, log, bars, tps } = playThrough(f, v);
    const fullN = p.full.hi - p.full.lo + 1;
    let last = log[0];
    let since = 0;
    const visible = 0.75 * bars * f.barTicks;
    for (const e of log) {
      const n = e.hi - e.lo + 1;
      assert.ok(n >= Math.min(fullN, Math.max(ZOOM.minSteps, Math.ceil(ZOOM.minShare * fullN))), `${id}: floor`);
      if (e.lo !== last.lo || e.hi !== last.hi) {
        // In (narrower) only after the range was held HOLD_BARS bars; any change at a still moment or a deadline.
        if (n < last.hi - last.lo + 1) assert.ok(e.now - since >= ZOOM.holdBars * f.barTicks, `${id}: held`);
        if (n < last.hi - last.lo + 1) assert.ok(quietAt(p, e.now - f.barTicks / 8, ZOOM.easeS * tps) || quietAt(p, e.now, ZOOM.easeS * tps), `${id}: in while busy`);
        since = e.now;
        last = e;
      }
    }
    // Every note on screen is inside the range shown (the notes reach the box's right edge `visible` ahead).
    for (const n of everyNote(f)) {
      const at = [...log].reverse().find((e) => e.now <= n[0] - visible - ZOOM.easeS * tps);
      if (!at) continue;
      const shown = log.filter((e) => e.now >= at.now && e.now <= n[0] + n[1]);
      const clipped = shown.filter((e) => n[3] < e.lo || n[3] > e.hi);
      assert.equal(clipped.length, 0, `${id}: note ${n[0]} step ${n[3]} clipped`);
    }
    // Sparse: a few changes over the piece, not every phrase.
    const piecesBars = log.at(-1)!.now / f.barTicks;
    assert.ok(z.changes <= Math.max(2, piecesBars / 6), `${id}: ${z.changes} changes in ${piecesBars.toFixed(0)} bars`);
  }
});

test("I/2's opening (one voice, then two in the treble) is narrowed from the start; I/1's (four voices in five bars) is not", () => {
  const f2 = fugueById("wtc1f02");
  const p2 = planOf(f2, 1);
  const r2 = initialRange(p2, 0);
  assert.ok(r2.hi - r2.lo + 1 < ZOOM.inShare * (p2.full.hi - p2.full.lo + 1), JSON.stringify(r2));
  const f = fugueById("wtc1f01");
  const p = planOf(f, 1);
  const r = initialRange(p, 0);
  assert.deepEqual(r, p.full);
});

test("touch rows = the drawing's rows at every moment of an ease", () => {
  for (const cssH of [212, 260, 301]) {
    for (const floor of [0, 0.3]) {
      const from = { lo: -4, hi: 30 };
      const to = { lo: 4, hi: 24 };
      for (let k = 0; k <= 20; k++) {
        const mix = easeCurve(k / 20);
        const touch = touchRows(to.lo, to.hi, cssH, floor, from, mix);
        // As MusicBox paintClassic draws: rows from ladderRows over the canvas (cssH / PX px), each row's top rounded.
        const L = ladderRows(ladderHeight(cssH, floor), to.lo, to.hi, from, mix);
        const bh = Math.max(2, Math.round(L.rowH));
        assert.equal(touch.rowH, L.rowH * BOX_PX);
        for (let s = from.lo; s <= from.hi; s++) {
          const drawn = (Math.round(L.a - s * L.rowH) + bh / 2) * BOX_PX;
          assert.ok(Math.abs(touch.yOf(s) - drawn) <= BOX_PX, `${cssH} ${floor} ${mix} ${s}`);
        }
        // LADDER_ROW_MIN still holds as before: the judging row is max(rowH, 18) (proto-game ladderRow); the rows never under 2 px.
        assert.ok(L.rowH >= 2);
      }
      // At rest: the old geometry exactly.
      const h = ladderHeight(cssH, floor);
      const rows = to.hi - to.lo + 3;
      const r = Math.max(2, Math.floor(h / rows));
      const top = Math.floor((h - r * rows) / 2);
      assert.equal(touchRows(to.lo, to.hi, cssH, floor).yOf(7), (top + (to.hi + 1 - 7) * r + r / 2) * BOX_PX);
    }
  }
});

test("the ease: gentle, 1.2–1.5 s, no allocation per frame", () => {
  assert.ok(ZOOM.easeS >= 1.2 && ZOOM.easeS <= 1.5);
  assert.equal(easeCurve(0), 0);
  assert.equal(easeCurve(1), 1);
  assert.ok(easeCurve(0.05) < 0.01 && easeCurve(0.95) > 0.99);
  const z = new BoxZoom(synth(), 0, 25, true);
  assert.equal(z.view(0), z.view(10));
});
