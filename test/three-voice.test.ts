import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateTrio, type TrioInput } from "../src/counterpoint/three-voice.ts";

const data = JSON.parse(readFileSync(new URL("../data/fux/three-voice/fux-three-voice.json", import.meta.url), "utf8"));
const first = data.exercises.filter((e: { species: number[] }) => e.species.length === 1 && e.species[0] === 1);
const inputOf = (e: { modal_final: TrioInput["modalFinal"]; cantus_index: number; voices: { notes: { pitch: string }[] }[] }): TrioInput => ({
  modalFinal: e.modal_final,
  cantusIndex: e.cantus_index,
  voices: e.voices.map((v) => v.notes.map((n) => n.pitch)),
});

test("three voices: the dataset has Fux's sixteen first-species exercises", () => {
  assert.equal(first.length, 16);
  for (const e of first) for (const v of e.voices) assert.equal(v.notes.length, e.measures, `Fig. ${e.figure}`);
});

test("three voices: every one of Fux's first-species solutions passes", () => {
  for (const e of first) {
    const ev = evaluateTrio(inputOf(e));
    assert.deepEqual(ev.errors.map((x) => `${x.ruleId}@${x.positions}`), [], `Fig. ${e.figure}`);
  }
});

test("three voices: the only warning on Fux's solutions is the leap into a twelfth in Fig. 116", () => {
  const warned = first.flatMap((e: { figure: string }) => evaluateTrio(inputOf(e as never)).warnings.map((w) => `${e.figure}:${w.ruleId}@${w.positions.map((p) => p + 1)}`));
  assert.deepEqual(warned, ["116:t1.direct-perfect@6,7"]);
});

const D = (voices: string[][]): TrioInput => ({ modalFinal: "D", cantusIndex: 1, voices });
const ids = (i: TrioInput) => evaluateTrio(i).violations.map((v) => v.ruleId);

test("three voices: parallel fifths between the upper voices are an error", () => {
  // Top and middle a fifth apart twice, moving together.
  const i = D([["A4", "B4", "D5"], ["D4", "E4", "D4"], ["D3", "G3", "D3"]]);
  assert.ok(ids(i).includes("t1.parallel-perfect"));
});

test("three voices: a minor third in the last chord, and no semitone into the final, are errors", () => {
  const i = D([["F4", "E4", "F4"], ["D4", "C4", "D4"], ["D3", "A2", "D3"]]);
  assert.ok(ids(i).includes("t1.final-chord"));
  assert.ok(ids(i).includes("t1.cadence"));
});

test("three voices: a fourth against the bass is a dissonance, a fourth between the upper voices is not", () => {
  assert.ok(ids(D([["G4", "C#5", "D5"], ["D4", "E4", "D4"], ["D3", "A3", "D3"]])).includes("t1.consonance-bass"));
  // F4 over A3 over D3: the upper fourth (A3-D4? no: D4-G4) — a 6/3 on B: B2, D4, G4.
  const six = evaluateTrio(D([["F4", "G4", "F4"], ["D4", "D4", "D4"], ["D3", "B2", "D3"]]));
  assert.ok(!six.violations.some((v) => v.ruleId === "t1.upper-dissonance"));
});

test("three voices: a leap of a seventh in an added voice is an error; the cantus is not judged", () => {
  assert.ok(ids(D([["D4", "C5", "D5"], ["D4", "E4", "D4"], ["D3", "C3", "D3"]])).includes("t1.melodic"));
});
