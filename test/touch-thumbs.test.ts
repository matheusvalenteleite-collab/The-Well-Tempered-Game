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

import { easyLanes, laneAt, points, release, strike, sweep } from "../src/touch/lanes.ts";
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
