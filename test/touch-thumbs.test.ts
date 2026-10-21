import { test } from "node:test";
import assert from "node:assert/strict";
import { onSide, sideOf, touchDown, touchMove, touchUp, type Touches } from "../src/touch/thumbs.ts";
import { FUGUE, pitchRange } from "../src/touch/fugue.ts";

test("a touch takes the half where it lands", () => {
  assert.equal(sideOf(10, 390), "left");
  assert.equal(sideOf(194, 390), "left");
  assert.equal(sideOf(195, 390), "right");
});

test("a thumb keeps its half when it slides across the midline", () => {
  let s: Touches = new Map();
  s = touchDown(s, 1, 100, 50, 390, 0);
  s = touchMove(s, 1, 300, 60);
  assert.equal(s.get(1)!.side, "left");
  assert.deepEqual([s.get(1)!.x, s.get(1)!.y], [300, 60]);
});

test("two thumbs at once, one per half", () => {
  let s: Touches = new Map();
  s = touchDown(s, 1, 60, 200, 390, 0);
  s = touchDown(s, 2, 330, 210, 390, 5);
  assert.equal(onSide(s, "left").length, 1);
  assert.equal(onSide(s, "right").length, 1);
  s = touchUp(s, 1);
  assert.equal(onSide(s, "left").length, 0);
  assert.equal(onSide(s, "right").length, 1);
});

test("the C minor fugue is in three voices, 31 bars", () => {
  assert.equal(FUGUE.voices.length, 3);
  assert.equal(FUGUE.bars.length, 31);
  const { lo, hi } = pitchRange(FUGUE);
  assert.ok(lo >= 36 && hi <= 84, `range ${lo}-${hi}`);
});

import { easyLanes, fits, laneAt, points, release, shapeFits, stepInto, strike, sweep } from "../src/touch/lanes.ts";
import { level } from "../src/touch/voice-mode.ts";

const opt = easyLanes(FUGUE.tpq, 60);

test("the eight entries of the subject: alto, soprano, bass in the exposition", () => {
  assert.equal(FUGUE.entries.length, 8);
  assert.deepEqual(FUGUE.entries.slice(0, 3).map((e) => [e.voice, e.bar, e.form, e.key]), [
    [1, 1, "subject", "c"],
    [0, 3, "answer", "g"],
    [2, 7, "subject", "c"],
  ]);
  assert.equal(FUGUE.entries[3].key, "Eb");
});

test("the exposition, voice by voice: the alto from bar 1, the soprano from 3, the bass from 7", () => {
  const [s, a, b] = [0, 1, 2].map((v) => level(FUGUE, 0, v));
  assert.equal(a.notes[0].midi, 72); // C5, the subject's first note
  assert.equal(a.lanes[a.notes[0].lane], "C5");
  assert.ok(s.first === FUGUE.bars[2].on + FUGUE.tpq / 2);
  assert.ok(b.first === FUGUE.bars[6].on + FUGUE.tpq / 2);
  for (const l of [s, a, b]) assert.ok(l.lanes.length <= 14 && l.notes.every((n) => n.lane >= 0));
});

test("lanes run from the bottom of the play area up", () => {
  assert.equal(laneAt(0, 400, 10), 9);
  assert.equal(laneAt(399, 400, 10), 0);
  assert.equal(laneAt(200, 400, 10), 4);
});

test("a tap on time in the right lane plays the note; in the wrong lane, nothing", () => {
  const lv = level(FUGUE, 0, 1);
  const n0 = lv.notes[0];
  assert.equal(strike(lv.notes, n0.lane + 3, n0.on, opt), -1);
  assert.equal(strike(lv.notes, n0.lane, n0.on + 10, opt), 0);
  assert.equal(lv.notes[0].state, "hit");
  // The note already played cannot be played twice.
  assert.equal(strike(lv.notes, n0.lane, n0.on + 20, opt), -1);
});

test("a perfect player: every note on time, long notes held", () => {
  const lv = level(FUGUE, 0, 1);
  lv.notes.forEach((n, i) => assert.equal(strike(lv.notes, n.lane, n.on, opt), i));
  sweep(lv.notes, lv.end, opt);
  const p = points(lv.notes, opt);
  assert.equal(p.got, p.of);
});

test("no thumb, no sound: every note missed; a long note let go at once scores half", () => {
  const lv = level(FUGUE, 0, 1);
  sweep(lv.notes, lv.end, opt);
  assert.ok(lv.notes.every((n) => n.state === "miss"));
  const lv2 = level(FUGUE, 0, 1);
  const i = lv2.notes.findIndex((n) => n.long);
  strike(lv2.notes, lv2.notes[i].lane, lv2.notes[i].on, opt);
  release(lv2.notes, i, lv2.notes[i].on + 50);
  assert.equal(points(lv2.notes, opt).got, 0.5);
});

test("the levels: rhythm takes any lane, shape the movement from the last touch, notes the lane", () => {
  const lv = level(FUGUE, 0, 1);
  const ns = lv.notes;
  // The subject: C5 B4 C5 G4: down, up, down.
  assert.deepEqual([1, 2, 3].map((i) => stepInto(ns, i)), [-1, 1, -1]);
  assert.equal(fits("rhythm", ns, 1, 0, 0.5, opt), true);
  assert.equal(fits("shape", ns, 1, 0, -0.05, opt), true);
  assert.equal(fits("shape", ns, 1, 0, 0.05, opt), false);
  assert.equal(fits("shape", ns, 0, 0, 0.5, opt), true);
  assert.equal(fits("notes", ns, 0, ns[0].lane + 1, null, opt), true);
  assert.equal(fits("notes", ns, 0, ns[0].lane + 2, null, opt), false);
});

test("shape is forgiving: a small move either way can be a repeat, a little movement a step", () => {
  assert.equal(shapeFits(0, 0.06), true);
  assert.equal(shapeFits(0, -0.06), true);
  assert.equal(shapeFits(0, 0.2), false);
  assert.equal(shapeFits(1, 0.03), true);
  assert.equal(shapeFits(1, 0.01), false);
  assert.equal(shapeFits(-1, 0.04), false);
  assert.equal(shapeFits(null, 0.9), true);
  // At the top edge, a step up needs only not to go clearly down.
  assert.equal(shapeFits(1, -0.05, 0.05), true);
  assert.equal(shapeFits(1, -0.05, 0.5), false);
});

test("rhythm: a tap anywhere on time plays the next note", () => {
  const lv = level(FUGUE, 0, 1);
  lv.notes.forEach((n, i) => assert.equal(strike(lv.notes, 0, n.on + 20, opt, (k) => fits("rhythm", lv.notes, k, 0, 0, opt)), i));
});

import { Game } from "../src/touch/engine.ts";
import { duoOpen, recordKey, sectionNotes } from "../src/touch/voice-mode.ts";
import { lagFrom } from "../src/touch/sync.ts";
import type { Chip } from "../src/touch/chip.ts";

/** A chip with a clock the test moves by hand, and a log of the notes it sounds. */
function fakeChip() {
  const clock = { t: 0 };
  const sounded: { midi: number; voice: number }[] = [];
  const chip = {
    ctx: { get currentTime() { return clock.t; }, outputLatency: 0, baseLatency: 0 },
    heard: () => clock.t,
    note: (midi: number, _at: number, _dur: number, voice = 1) => (sounded.push({ midi, voice }), { stop: () => {} }),
    tick: () => {},
  } as unknown as Chip;
  return { chip, clock, sounded };
}

test("six sections cover the fugue, every voice sounding in each", () => {
  assert.equal(FUGUE.sections.length, 6);
  assert.equal(FUGUE.sections[0].toBar, 9);
  assert.equal(FUGUE.sections.at(-1)!.to, FUGUE.length);
  for (let s = 0; s < 6; s++) for (let v = 0; v < 3; v++) assert.ok(sectionNotes(FUGUE, s, v).length > 0, `section ${s} voice ${v}`);
});

test("two voices open once each is earned alone, at that level, in that section", () => {
  const best = { [recordKey(0, [1], "rhythm")]: 85, [recordKey(0, [0], "rhythm")]: 79 };
  assert.equal(duoOpen(best, 0, [0, 1], "rhythm"), false);
  best[recordKey(0, [0], "rhythm")] = 80;
  assert.equal(duoOpen(best, 0, [1, 0], "rhythm"), true);
  assert.equal(duoOpen(best, 0, [0, 1], "shape"), false);
  assert.equal(duoOpen(best, 1, [0, 1], "rhythm"), false);
  assert.equal(recordKey(0, [1, 0], "shape"), "s0-0+1-shape");
});

test("the sync: the median lag of the taps, outliers left out", () => {
  const clicks = [0, 0.667, 1.333, 2, 2.667, 3.333, 4];
  assert.equal(lagFrom(clicks, clicks.map((c) => c + 0.04)), 40);
  assert.equal(lagFrom(clicks, [...clicks.slice(1).map((c) => c - 0.02), 1.0]), -20);
  assert.equal(lagFrom(clicks, [0.01, 0.7]), null);
});

test("two voices: the left thumb plays the lower voice, the right the higher, each sounding its own", () => {
  const { chip, clock, sounded } = fakeChip();
  const lvA = level(FUGUE, 0, 1);
  const lvS = level(FUGUE, 0, 0);
  const g = new Game(FUGUE, [lvS, lvA], "rhythm", 60, chip);
  assert.deepEqual(g.tracks.map((t) => [t.lv.voice, t.sides.join()]), [
    [1, "left"],
    [0, "right"],
  ]);
  const at = (tick: number) => 0.15 + (tick - g.start) / g.tps;
  // The alto's first note, by the left thumb; the soprano's first, by the right.
  const a0 = lvA.notes[0];
  clock.t = at(a0.on);
  g.step();
  g.down(1, "left", 0.5, performance.now());
  g.up(1, performance.now());
  const s0 = lvS.notes[0];
  clock.t = at(s0.on);
  g.step();
  g.down(2, "right", 0.5, performance.now());
  assert.deepEqual(sounded, [
    { midi: a0.midi, voice: 1 },
    { midi: s0.midi, voice: 0 },
  ]);
  assert.equal(g.combo, 1);
  assert.equal(g.grade?.text, "PERFECT");
});

test("the engine: a full run in rhythm, every note tapped on time, scores everything", () => {
  const { chip, clock } = fakeChip();
  const lv = level(FUGUE, 2, 2);
  const g = new Game(FUGUE, [lv], "rhythm", 72, chip);
  const at = (tick: number) => 0.15 + (tick - g.start) / g.tps;
  let id = 0;
  for (const n of lv.notes) {
    clock.t = at(n.on);
    g.step();
    g.down(++id, "right", 0.5, performance.now());
    if (n.long) clock.t = at(n.on + n.dur * 0.9);
    g.up(id, performance.now());
  }
  clock.t = at(g.end + 1);
  assert.equal(g.step(), true);
  const [r] = g.results();
  assert.equal(r.got, r.of);
  assert.equal(g.maxCombo, lv.notes.length);
});
