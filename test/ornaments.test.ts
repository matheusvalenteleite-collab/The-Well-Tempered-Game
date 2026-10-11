// P8: ornaments realised after Bach's Explication (and C. P. E. Bach where it is silent).
import { test } from "node:test";
import assert from "node:assert/strict";
import { keySteps, ornamentUnit, realise } from "../src/music/ornaments.ts";
import { kernOrnaments } from "../src/wtc/kern.ts";

const C = keySteps({});
const ctx = (unit: number, prevMidi?: number) => ({ unit, prevMidi, ...C });
const pitches = (xs: { midi: number }[]) => xs.map((x) => x.midi);
const total = (xs: { dur: number }[]) => xs.reduce((a, x) => a + x.dur, 0);

test("kern signs read from a token", () => {
  assert.equal(kernOrnaments("4cc#T"), "T");
  assert.equal(kernOrnaments("8dd#p"), "");
  assert.equal(kernOrnaments("[4.ee-tR"), "tR");
});

test("the trill starts above, alternates, and ends held on the note, filling it exactly", () => {
  const r = realise({ midi: 62, at: 0, dur: 1 }, "T", [], ctx(0.125));
  assert.deepEqual(pitches(r).slice(0, 4), [64, 62, 64, 62]);
  assert.equal(r[r.length - 1].midi, 62);
  assert.ok(Math.abs(total(r) - 1) < 1e-9);
  assert.ok(r[r.length - 1].dur > 0.125);
  // A semitone trill on B: C above.
  assert.equal(realise({ midi: 71, at: 0, dur: 1 }, "t", [], ctx(0.125))[0].midi, 72);
});

test("a trill with its closing turn ends below and back (Trillo und Mordant)", () => {
  const r = pitches(realise({ midi: 67, at: 0, dur: 1 }, "TR", [], ctx(0.125)));
  // … U N L N, the main note struck once at the end (P24: it was struck twice before).
  assert.deepEqual(r.slice(-4), [69, 67, 65, 67]);
});

test("mordent: the note, the step below, the note held", () => {
  const r = realise({ midi: 64, at: 2, dur: 1 }, "m", [], ctx(0.125));
  assert.deepEqual(pitches(r), [64, 63, 64]);
  assert.equal(r[0].at, 2);
  assert.ok(Math.abs(r[2].dur - 0.75) < 1e-9);
});

test("the short wavy sign: snapped from above after a falling step, else a short trill from above", () => {
  assert.deepEqual(pitches(realise({ midi: 64, at: 0, dur: 1 }, "W", [], ctx(0.125, 65))), [64, 66, 64]);
  assert.deepEqual(pitches(realise({ midi: 64, at: 0, dur: 1 }, "W", [], ctx(0.125, 60))), [66, 64, 66, 64]);
});

test("turn: above, the note, below, the note; on a short note four equal notes", () => {
  const r = realise({ midi: 64, at: 0, dur: 0.5 }, "S", [], ctx(0.125));
  assert.deepEqual(pitches(r), [65, 64, 62, 64]);
  assert.ok(r.every((x) => Math.abs(x.dur - 0.125) < 1e-9));
});

test("grace notes on the beat: a short one takes little, a long one half (two thirds of a dotted note)", () => {
  const short = realise({ midi: 64, at: 0, dur: 1 }, "", [{ kind: "q", midi: 66 }], ctx(0.125));
  assert.deepEqual(pitches(short), [66, 64]);
  assert.equal(short[0].dur, 0.125);
  const long = realise({ midi: 64, at: 0, dur: 1.5 }, "", [{ kind: "Q", midi: 66 }], ctx(0.125));
  assert.equal(long[0].dur, 1);
});

test("ornament speed: about eleven notes a second, within a 32nd and a 16th", () => {
  assert.ok(Math.abs(ornamentUnit(60) - 60 / 330) < 1e-9);
  assert.equal(ornamentUnit(400), 0.25);
  assert.equal(ornamentUnit(5), 1 / 32);
});

test("P24: C. P. E. Bach's trill lasts the whole note and closes with a Nachschlag on a long note (Versuch I.2.3 §§13, 21)", () => {
  const steps = { stepAbove: () => 2, stepBelow: () => 2 };
  const n = { midi: 72, at: 0, dur: 2 };
  const ex = realise(n, "T", [], { unit: 1 / 8, ...steps });
  const cpe = realise(n, "T", [], { unit: 1 / 8, ...steps, style: "cpe" });
  // The Explication holds the main note for the last fifth; C. P. E. Bach's alternation goes on to the end.
  assert.ok(ex[ex.length - 1].dur >= 0.3);
  assert.ok(cpe[cpe.length - 1].dur <= 1 / 8 + 1e-9);
  // The Nachschlag: the step below, then the note.
  assert.deepEqual(cpe.slice(-2).map((x) => x.midi), [70, 72]);
  // A short note: no Nachschlag.
  const short = realise({ midi: 72, at: 0, dur: 0.5 }, "T", [], { unit: 1 / 16, ...steps, style: "cpe" });
  assert.notEqual(short[short.length - 2].midi, 70);
  // Every onset inside the note, the last note ending with it.
  const last = cpe[cpe.length - 1];
  assert.ok(Math.abs(last.at + last.dur - 2) < 1e-9);
});
