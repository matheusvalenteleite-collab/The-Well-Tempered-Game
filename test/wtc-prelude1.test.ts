import { test } from "node:test";
import assert from "node:assert/strict";
import { BARS, barEvents, compare, figureLabel, pieceEvents } from "../src/wtc/prelude1.ts";

test("Prelude 1: 32 bars, five pitches each, Bach's chord among the choices", () => {
  assert.equal(BARS.length, 32);
  for (const b of BARS) {
    assert.equal(b.pitches.length, 5);
    assert.ok(b.choices.length >= 3 && b.choices.length <= 4, `bar ${b.bar}: ${b.choices.length} choices`);
    assert.equal(b.choices.filter((c) => c.bach).length, 1);
    assert.deepEqual(b.choices.find((c) => c.bach)!.pitches, b.pitches);
    const keys = new Set(b.choices.map((c) => c.pitches.join(" ")));
    assert.equal(keys.size, b.choices.length, "no duplicate choices");
    for (const c of b.choices) assert.equal(c.pitches[0], b.pitches[0], "the bass is Bach's");
  }
});

test("Prelude 1: the opening bars are the familiar ones", () => {
  assert.deepEqual(BARS[0].pitches, ["C4", "E4", "G4", "C5", "E5"]);
  assert.deepEqual(BARS[1].pitches, ["C4", "D4", "A4", "D5", "F5"]);
  assert.equal(figureLabel(BARS[1].figures), "6/4/2");
  assert.equal(figureLabel(BARS[0].figures), "5/3");
});

test("Prelude 1: one bar of figuration is 16 notes after the bass and tenor, twice", () => {
  const ev = barEvents(BARS[0].pitches, 0);
  assert.equal(ev.length, 16);
  assert.equal(ev.filter((e) => e.counterpoint === "C4").length, 2);
  assert.ok(ev.every((e) => e.at >= 0 && e.at < 1));
});

test("Prelude 1: Bach's plan agrees with Bach everywhere; an empty plan sounds the basses", () => {
  const bach = BARS.map((b) => b.choices.findIndex((c) => c.bach));
  assert.ok(compare(bach).every((v) => v.same && v.sameRoot));
  const empty = pieceEvents(BARS.map(() => null), false);
  assert.equal(empty.length, 64);
  const full = pieceEvents(bach);
  assert.ok(full.at(-1)!.at >= 34);
});
