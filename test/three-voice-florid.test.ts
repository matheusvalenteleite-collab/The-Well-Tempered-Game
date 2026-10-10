import { test } from "node:test";
import assert from "node:assert/strict";
import data from "../data/fux/three-voice/fux-three-voice.json" with { type: "json" };
import { movingSlots } from "../src/game/trio.ts";
import { evaluateTrioFlorid, type TrioFloridInput } from "../src/counterpoint/three-voice-florid.ts";

type Ex = { id: string; species: number[]; modal_final: string; cantus_index: number; measures: number; voices: { notes: { pitch: string | null; duration: string; offset?: string }[] }[] };
const all = (data as unknown as { exercises: Ex[] }).exercises;
const input = (e: Ex): TrioFloridInput => {
  const sp = e.species[0] as 3 | 4;
  let movingIndex = 0;
  const voices = e.voices.map((v, i) => {
    const moving = v.notes.length > e.measures + 1 || v.notes.some((q) => q.pitch === null);
    if (moving) movingIndex = i;
    return moving ? movingSlots(sp === 3 ? 4 : 2, e.measures, v.notes) : v.notes.map((q) => q.pitch!);
  });
  return { species: sp, modalFinal: e.modal_final as TrioFloridInput["modalFinal"], cantusIndex: e.cantus_index, movingIndex, voices, ligatureAllowance: 9 };
};
const errors = (x: TrioFloridInput) => evaluateTrioFlorid(x).errors.map((v) => v.ruleId);
const withLine = (x: TrioFloridInput, f: (l: string[]) => void) => {
  const l = [...x.voices[x.movingIndex]];
  f(l);
  return { ...x, voices: x.voices.map((v, i) => (i === x.movingIndex ? l : v)) };
};

test("D116: Fux's three-voice third- and fourth-species solutions pass (D39), with no warning but Fig. 148's triads", () => {
  const ex = all.filter((e) => e.species.length === 1 && (e.species[0] === 3 || e.species[0] === 4));
  assert.equal(ex.length, 13);
  for (const e of ex) assert.deepEqual(errors(input(e)), [], e.id);
});

test("D116: third species: a dissonant crotchet that does not pass is a fault", () => {
  const x = input(all.find((e) => e.id === "gap_130")!);
  // Bar 2 (cantus F4, bass D3; crotchets A4 F4 A4 B4): a leap into E4 on the second crotchet, a second against the cantus.
  const bad = withLine(x, (l) => (l[5] = "E4"));
  assert.ok(errors(bad).includes("t3.dissonance"), errors(bad).join(","));
});

test("D116: fourth species: a suspension must resolve down by step", () => {
  const x = input(all.find((e) => e.id === "gap_141")!);
  // Bar 3 (index 2): D5 tied, a seventh over the cantus E4, resolving to C5; make it rise to E5.
  const bad = withLine(x, (l) => (l[5] = "E5"));
  assert.ok(errors(bad).includes("t4.resolution"), errors(bad).join(","));
});
