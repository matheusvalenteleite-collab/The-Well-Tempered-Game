/**
 * D408 (WTC 1.99): quick mordents. A mordent starts its note: main, the step below, main (the up-mordent: main,
 * above, main), the main back within about 60–100 ms at any tempo, never shared out over the note; the main then
 * sustains. The band's (realiseNote, realiseHeld) and the player's (freeOrnamentParts) alike; a quick flick reads.
 * Trills untouched.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, type TouchFugue } from "../src/touch/fugue.ts";
import { freeOrnamentParts, ornamentsOf, realiseHeld, realiseNote, type Ornament } from "../src/touch/ornament-play.ts";
import { keySteps, MORDENT_NOTE_S, mordentUnit, ornamentUnit, realise, trillUnit } from "../src/music/ornaments.ts";
import { ShakeReader, shakeThresholds, type Gesture } from "../src/touch/free-ornament.ts";

const IDS = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));
const ms = (f: TouchFugue, ticks: number, bpm: number) => (ticks / f.tpq) * (60000 / bpm);

/** Every written mordent of the 48: its fugue, ornament and note. */
function mordents(): { f: TouchFugue; o: Ornament; on: number; dur: number; midi: number }[] {
  const out: { f: TouchFugue; o: Ornament; on: number; dur: number; midi: number }[] = [];
  for (const id of IDS) {
    const f = fugueById(id)!;
    for (const [k, o] of ornamentsOf(f)) {
      if (!/[Mm]/.test(o.signs) || o.written?.length || o.graces.length) continue;
      const [v, on] = k.split(":").map(Number);
      const n = f.voices[v]?.find((x) => x[0] === on);
      if (n) out.push({ f, o, on, dur: n[1], midi: n[2] });
    }
  }
  return out;
}

test("D408: every written mordent of the 48, the band's: main, below, main back within 60–100 ms at any tempo, the main held to the end", () => {
  const all = mordents();
  assert.ok(all.length >= 5, `${all.length} mordents`);
  for (const bpm of [40, 60, 90, 120, 160]) {
    for (const { f, o, on, dur, midi } of all) {
      const parts = realiseNote(f, o, on, dur, midi, undefined, bpm);
      assert.equal(parts.length, 3, `${f.id} at ${on}`);
      assert.deepEqual([parts[0][2], parts[2][2]], [midi, midi]);
      assert.ok(parts[1][2] < midi && midi - parts[1][2] <= 2, "the step below");
      assert.equal(parts[0][0], on, "on the beat");
      const back = ms(f, parts[2][0] - on, bpm);
      const noteMs = ms(f, dur, bpm);
      // Within 60–100 ms (a note too short for it: its first half at most, never stretched).
      if (noteMs >= 200) assert.ok(back >= 60 && back <= 100, `${f.id} at ${on}, ${bpm} bpm: main back after ${back.toFixed(0)} ms`);
      else assert.ok(back <= noteMs / 2 + 1, `${f.id} short note: ${back.toFixed(0)} of ${noteMs.toFixed(0)} ms`);
      assert.equal(parts[2][0] + parts[2][1], on + dur, "the main sustains to the note's end");
      // The band's articulated note: the same quick start.
      const held = realiseHeld(f, o, on, dur, 0.8, midi, undefined, bpm);
      if (noteMs >= 200) assert.equal(held[2][0], parts[2][0]);
    }
  }
});

test("D408: the player's mordent (freeOrnamentParts): the step below at the gesture, the main back about 40 ms later", () => {
  const { f, on, dur, midi } = mordents()[0];
  for (const bpm of [50, 80, 140]) {
    const from = on + Math.round(dur / 10);
    const parts = freeOrnamentParts(f, "mordent", on, midi, from, on + dur, bpm);
    assert.equal(parts.length, 2);
    assert.equal(parts[0][0], from);
    assert.ok(parts[0][2] < midi && parts[1][2] === midi);
    const lower = ms(f, parts[1][0] - from, bpm);
    assert.ok(Math.abs(lower - MORDENT_NOTE_S * 1000) <= 6, `${bpm} bpm: the lower note ${lower.toFixed(0)} ms`);
    // The up-mordents: the Pralltriller and the Schneller (main, above, main) as quick.
    for (const kind of ["pralltriller", "schneller"] as const) {
      const up = freeOrnamentParts(f, kind, on, midi, from, on + dur, bpm);
      assert.ok(up[0][2] > midi && up.at(-1)![2] === midi, kind);
      assert.ok(ms(f, up.at(-1)![0] - from, bpm) <= 50, `${kind} at ${bpm}: ${ms(f, up.at(-1)![0] - from, bpm).toFixed(0)} ms`);
    }
  }
});

test("D408: realise: the mordent and the snapped trill quick; the trill, the short Trillo and the turn as before", () => {
  const steps = keySteps({});
  const q = 0.75; // a quarter, s (80 bpm)
  const ctx = { unit: ornamentUnit(30 / q * 1), quick: mordentUnit(q), trillUnit: trillUnit(q), ...steps };
  const n = { midi: 64, at: 0, dur: 2 };
  const m = realise(n, "M", [], ctx);
  assert.ok(Math.abs(m[2].at * q - 2 * MORDENT_NOTE_S) < 1e-9);
  const snapped = realise(n, "w", [], { ...ctx, prevMidi: 65 });
  assert.deepEqual(snapped.map((x) => x.midi), [64, 65, 64]);
  assert.ok(Math.abs(snapped[2].at * q - 2 * MORDENT_NOTE_S) < 1e-9);
  // Without `quick` (another caller): the old unit.
  const { quick: _q, ...old } = ctx;
  assert.ok(Math.abs(realise(n, "M", [], old)[1].at - ctx.unit) < 1e-9);
  // Unchanged by `quick`: the trill (its grid), Bach's short Trillo (U N U N), the turn.
  for (const s of ["T", "t", "TR", "S", "$"]) assert.deepEqual(realise(n, s, [], ctx), realise(n, s, [], old), s);
  assert.deepEqual(realise(n, "W", [], { ...ctx, prevMidi: 60 }), realise(n, "W", [], { ...old, prevMidi: 60 }));
});

/** A flick on a held thumb: down `amp` px and back, each leg `legMs` long (touches every 16 ms), then still. */
function flick(first: 1 | -1, amp: number, legMs: number, beatS: number): { g: Gesture | null; at: number } {
  const r = new ShakeReader({ x: 100, y: 200, t: 0 }, shakeThresholds(beatS, 18));
  let t = 0;
  let got: { g: Gesture | null; at: number } = { g: null, at: -1 };
  const put = (g: Gesture | null, at: number) => g && got.g === null && (got = { g, at });
  const steps = Math.max(1, Math.round(legMs / 16));
  for (const dir of [first, -first]) {
    for (let k = 1; k <= steps; k++) {
      t += legMs / steps;
      put(r.feed(100, 200 - first * amp * (dir === first ? k / steps : 1 - k / steps) * 1, t), t);
    }
  }
  for (let f = t + 16; f < t + 300; f += 16) put(r.tick(f), f);
  return got;
}

test("D408: a quick flick counts: two legs of 30–60 ms read as the mordent (down) or the up form at any tempo, soon after", () => {
  for (const beatS of [0.4, 0.75, 1.2]) {
    for (const legMs of [32, 48, 64]) {
      const d = flick(-1, 8, legMs, beatS);
      assert.equal(d.g, "down", `beat ${beatS}s, legs ${legMs} ms`);
      assert.ok(d.at <= 2 * legMs + 70, `read ${d.at} ms after the landing`);
      assert.equal(flick(1, 8, legMs, beatS).g, "up");
    }
  }
});
