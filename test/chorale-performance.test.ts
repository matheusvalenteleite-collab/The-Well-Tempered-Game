// P14: the chorale performed: fermatas by context, holds, breaths, the final cadence.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fermataWordsOf, performChorale, planFermatas, type Chorale } from "../src/audio/chorale-performance.ts";

// Two phrases in 4/4 (32 units a bar): a half cadence at bar 2, a perfect close at bar 4.
const q = 8;
const line = (pitches: string[], fermatas: number[]) => pitches.map((p, i) => [i * q, q, p, fermatas.includes(i) ? 1 : 0] as const);
const S = line(["G4", "A4", "B4", "A4", "G4", "F#4", "E4", "D4", "D4", "E4", "F#4", "G4", "A4", "B4", "A4", "G4"], [7, 15]);
const B = line(["G3", "F#3", "G3", "C3", "B2", "D3", "C3", "D3", "B2", "C3", "A2", "B2", "C3", "G2", "D3", "G2"], []);
const chorale = (words?: (string | null)[][]): Chorale => ({ voices: [S, B], barUnits: 32, cadences: [[56, "half", "V"], [120, "authentic, perfect", "I"]], fermataWords: words });

test("strict: no plans, the notes in time", () => {
  assert.equal(planFermatas(chorale(), "strict").length, 0);
  const ev = performChorale(chorale(), "strict");
  assert.equal(ev.find((e) => e.extra![0].pitch === "D4")!.at, 56 / 32);
});

test("by context: a half cadence breathes, the final cadence slows and holds about a bar", () => {
  const [half, final] = planFermatas(chorale(), "context");
  assert.equal(half.kind, "breath");
  assert.equal(final.kind, "final");
  const ev = performChorale(chorale(), "context");
  const last = ev[ev.length - 1];
  assert.ok(last.length > (q + 32) / 32 - 1e-9, "the last chord held about a bar more");
  // The breath is taken out of the note: the next phrase starts on time (only the slowing delays it a little).
  const nextOnset = ev.find((e) => Math.abs(e.at - 64 / 32) < 0.2);
  assert.ok(nextOnset, "the next phrase starts near its written place");
});

test("traditional: internal fermatas held about twice their value, then a breath", () => {
  const [first] = planFermatas(chorale(), "traditional");
  assert.equal(first.kind, "hold");
  assert.equal(first.hold, 2);
  assert.ok(first.gap > 0);
});

test("historical: a breath in time", () => {
  const [first] = planFermatas(chorale(), "historical");
  assert.equal(first.kind, "breath");
  assert.equal(first.hold, 1);
});

test("the words decide by context: running on goes through, a comma breathes", () => {
  assert.equal(planFermatas(chorale([[""], ["."]]), "context")[0].kind, "through");
  assert.equal(planFermatas(chorale([[","], ["."]]), "context")[0].kind, "breath");
});

test("a voice moving under the fermata keeps it moving", () => {
  const moving: Chorale = { ...chorale(), voices: [S, [...B.slice(0, 7), [56, 4, "D3", 0], [60, 4, "C3", 0], ...B.slice(8)]] };
  assert.equal(planFermatas(moving, "traditional")[0].kind, "through");
});

test("the chorales' words are there: no. 1 ends its first line without punctuation, its last with a full stop", () => {
  const w = fermataWordsOf(1)!;
  assert.equal(w.length, 6);
  assert.deepEqual(w[0], ["", ","]);
  assert.equal(w[5][1], ".");
});
