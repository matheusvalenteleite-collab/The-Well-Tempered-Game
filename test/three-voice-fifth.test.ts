import { test } from "node:test";
import assert from "node:assert/strict";
import data from "../data/fux/three-voice/fux-three-voice.json" with { type: "json" };
import { trioSteps, type TrioStep } from "../src/game/trio.ts";
import { evaluateTrioFifth, type TrioFifthInput } from "../src/counterpoint/three-voice-fifth.ts";

const steps = trioSteps(data as never, 5);
const input = (s: TrioStep): TrioFifthInput => ({ modalFinal: s.modalFinal, cantusIndex: s.cantusIndex, movingIndex: s.movingIndex!, voices: s.fux });
const errors = (x: TrioFifthInput) => evaluateTrioFifth(x).errors.map((v) => v.ruleId);
const withLine = (x: TrioFifthInput, f: (l: string[]) => void) => {
  const l = [...x.voices[x.movingIndex]];
  f(l);
  return { ...x, voices: x.voices.map((v, i) => (i === x.movingIndex ? l : v)) };
};
const fig154 = () => input(steps.find((s) => s.exerciseId === "gap_154")!);

test("D117: Fux's six three-voice florid solutions pass (D39), the florid voice in quaver slots", () => {
  assert.equal(steps.length, 6);
  for (const s of steps) {
    assert.equal(s.per, 8);
    assert.equal(s.fux[s.movingIndex!].length, 8 * (s.cantus.length - 1) + 1);
    assert.deepEqual(errors(input(s)), [], s.exerciseId);
  }
});

test("D117: a dissonance struck on the downbeat is a fault", () => {
  // Fig. 154, bar 6: D5 over D3 and F4; E5 is a ninth above the bass.
  const bad = withLine(fig154(), (l) => (l[40] = "E5"));
  assert.ok(errors(bad).includes("fis.downbeat-consonance"), errors(bad).join(","));
});

test("D117: a dissonance off the beat reached by leap is a fault", () => {
  // Fig. 154, bar 3 (bass C4, cantus E4): C5 G4 C5; F4 for G4 is leapt into, a fourth above the bass.
  const bad = withLine(fig154(), (l) => (l[18] = "F4"));
  assert.ok(errors(bad).includes("fis.weak-dissonance"), errors(bad).join(","));
});

test("D117: a suspension must resolve down by step", () => {
  // Fig. 154, bar 10: D5 tied over A3 (an eleventh) resolves to C#5; up to E5 instead is a fault.
  const bad = withLine(fig154(), (l) => (l[76] = "E5"));
  assert.ok(errors(bad).includes("fis.suspension"), errors(bad).join(","));
});

test("D117: the semibreve voices keep the first-species rules among themselves", () => {
  // Fig. 154 with the bass opening G3 B♭3 under the cantus's D4 F4: fifths in a row, both rising.
  const x = fig154();
  const bass = [...x.voices[2]];
  bass[0] = "G3";
  bass[1] = "Bb3";
  const bad = { ...x, voices: x.voices.map((v, i) => (i === 2 ? bass : v)) };
  assert.ok(errors(bad).some((id) => id.includes("parallel")), errors(bad).join(","));
});
