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

import { easyOptions, judge, judgedNotes, score, thumbPitch } from "../src/touch/judge.ts";
import { shown, stages } from "../src/touch/subject-mode.ts";

const playThrough = (cursorAt: (tick: number) => number | null) => {
  const e = FUGUE.entries[0];
  const notes = judgedNotes(e.notes, FUGUE.tpq);
  const o = easyOptions(FUGUE.tpq, 60);
  const sounded: number[] = [];
  for (let t = e.on - 2 * FUGUE.tpq; t < e.end + FUGUE.tpq; t += 30) for (const s of judge(notes, t, cursorAt(t), o)) sounded.push(s.index);
  return { notes, sounded };
};
const lineAt = (tick: number) => {
  const ns = FUGUE.entries[0].notes;
  // The thumb arrives on each note a little early, as a player following the box would.
  const lead = 100;
  return [...ns].reverse().find((n) => n[0] - lead <= tick)?.[2] ?? ns[0][2];
};

test("the eight entries of the subject: alto, soprano, bass in the exposition", () => {
  assert.equal(FUGUE.entries.length, 8);
  assert.deepEqual(FUGUE.entries.slice(0, 3).map((e) => [e.voice, e.bar, e.form, e.key]), [
    [1, 1, "subject", "c"],
    [0, 3, "answer", "g"],
    [2, 7, "subject", "c"],
  ]);
  assert.equal(FUGUE.entries[3].key, "Eb");
});

test("a thumb that follows the subject sounds every note", () => {
  const { notes, sounded } = playThrough(lineAt);
  assert.equal(sounded.length, notes.length);
  const s = score(notes);
  assert.equal(s.hit, s.of);
  assert.ok(notes.some((n) => n.ride) && notes.some((n) => !n.ride));
});

test("no thumb, no sound: every note missed", () => {
  const { notes, sounded } = playThrough(() => null);
  assert.equal(sounded.length, 0);
  assert.ok(notes.every((n) => n.state === "miss"));
});

test("a thumb held still on the first note does not pass", () => {
  const first = FUGUE.entries[0].notes[0][2];
  const { notes } = playThrough(() => first);
  const s = score(notes);
  assert.ok(s.hit < 0.8 * s.of, `${s.hit} of ${s.of}`);
});

test("the thumb's height is the pitch: top high, bottom low", () => {
  assert.equal(thumbPitch(0, 400, 60, 72), 74);
  assert.equal(thumbPitch(400, 400, 60, 72), 58);
  assert.equal(thumbPitch(200, 400, 60, 72), 66);
});

test("learn, then from memory: hidden but the first note and Bach's variants", () => {
  assert.deepEqual(stages(FUGUE).map((s) => s.kind), ["learn", "learn", "memory"]);
  assert.equal(shown("learn", 5, 0), true);
  assert.equal(shown("memory", 0, 0), true);
  assert.equal(shown("memory", 5, 0), false);
  assert.equal(shown("memory", 5, 1), true);
});
