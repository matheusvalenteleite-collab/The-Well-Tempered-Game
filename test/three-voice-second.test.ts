import { test } from "node:test";
import assert from "node:assert/strict";
import data from "../data/fux/three-voice/fux-three-voice.json" with { type: "json" };
import { notesToSlots, slotLayout } from "../src/counterpoint/layout.ts";
import { evaluateTrio2, type Trio2Input } from "../src/counterpoint/three-voice-second.ts";

type Ex = { id: string; species: number[]; modal_final: string; cantus_index: number; measures: number; voices: { notes: { pitch: string; duration: string }[] }[] };
const exercises = (data as unknown as { exercises: Ex[] }).exercises.filter((e) => e.species.length === 1 && e.species[0] === 2);
const input = (e: Ex): Trio2Input => {
  let minimIndex = 0;
  const voices = e.voices.map((v, i) => {
    const minim = v.notes.some((q) => q.duration === "1/2");
    if (minim) minimIndex = i;
    return minim ? notesToSlots(slotLayout("second", e.measures), v.notes as never) : v.notes.map((q) => q.pitch);
  });
  return { modalFinal: e.modal_final as Trio2Input["modalFinal"], cantusIndex: e.cantus_index, minimIndex, voices };
};
const ids = (r: ReturnType<typeof evaluateTrio2>) => r.errors.map((v) => v.ruleId);

test("D114: Fux's nine three-voice second-species solutions pass (D39)", () => {
  assert.equal(exercises.length, 9);
  for (const e of exercises) assert.deepEqual(ids(evaluateTrio2(input(e))), [], e.id);
});

test("D114: a repeated minim is a fault, except the cadence tie", () => {
  const e = input(exercises.find((x) => x.id === "gap_121")!);
  const line = [...e.voices[e.minimIndex]];
  line[4] = line[3]; // bar 2 downbeat repeats bar 1's upbeat
  const r = evaluateTrio2({ ...e, voices: e.voices.map((v, i) => (i === e.minimIndex ? line : v)) });
  assert.ok(ids(r).includes("t2.repeated"));
});

test("D114: an upbeat dissonance reached by leap is a fault", () => {
  const e = input(exercises.find((x) => x.id === "gap_121")!);
  // gap_121, bar 1 (bass D3, cantus F4, minims A3 B3): an upbeat E3, a second above the bass, leapt into from A3.
  const line = [...e.voices[e.minimIndex]];
  line[3] = "E3";
  line[4] = "C4";
  const r = evaluateTrio2({ ...e, voices: e.voices.map((v, i) => (i === e.minimIndex ? line : v)) });
  assert.ok(ids(r).includes("t2.passing-dissonance"), ids(r).join(","));
});
