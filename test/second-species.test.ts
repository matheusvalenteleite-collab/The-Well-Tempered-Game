import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { evaluate } from "../src/counterpoint/engine.ts";
import { FUX_SECOND_SPECIES_CURRICULUM as C } from "../src/counterpoint/curriculum/fux-second-species.ts";
import { rulesForStep, validateCurriculum } from "../src/counterpoint/curriculum/index.ts";
import { fifthIsDiminished } from "../src/counterpoint/rules/second-species.ts";
import { notesToSlots, REST, slotLayout } from "../src/counterpoint/layout.ts";
import type { CounterpointInput } from "../src/counterpoint/rules/types.ts";

const repo = loadFuxRepository();
const D_CF = ["D4", "F4", "E4", "D4", "G4", "F4", "A4", "G4", "F4", "E4", "D4"];

const input = (cf: string[], cp: string[], cantusVoice: "upper" | "lower" = "lower"): CounterpointInput => {
  const layout = slotLayout("second", cf.length);
  return {
    species: "second",
    modalFinal: "D",
    cantusVoice,
    cantus: cf.map((p) => ({ pitch: p, duration: "1/1" })),
    counterpoint: cp.map((p, k) => ({ pitch: p === REST ? null : p, duration: layout[k].duration })),
  };
};
const all = () => rulesForStep(C[C.length - 1].id);

test("second-species curriculum: Figs. 33-45 in book order, all rules placed", () => {
  validateCurriculum(repo);
  assert.deepEqual(C.map((s) => s.exercise_id!.slice(-2)), ["33", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"]);
});

test("every Fux second-species solution clears the rules of its step; no warnings either (D39)", () => {
  const warnings: string[] = [];
  for (const s of C) {
    const ex = repo.getExercise(s.exercise_id!)!;
    const sol = repo.getSolution(ex.id)!;
    const layout = slotLayout("second", ex.measures);
    notesToSlots(layout, sol.counterpoint.notes); // fails loudly if Fux's rhythm does not fit the layout
    const ev = evaluate(
      {
        species: "second",
        modalFinal: ex.modal_final,
        cantusVoice: ex.cantus_voice,
        cantus: sol.cantus_firmus.notes.map((n) => ({ pitch: n.pitch, duration: n.duration })),
        counterpoint: sol.counterpoint.notes.map((n) => ({ pitch: n.pitch, duration: n.duration })),
      },
      rulesForStep(s.id),
    );
    assert.deepEqual(ev.errors, [], ex.figure);
    warnings.push(...ev.warnings.map((w) => `${ex.figure}:${w.ruleId}`));
  }
  assert.deepEqual(warnings, []);
});

test("Josephus's first attempt (Fig. 26, 1725 p. 57): exactly the two faults Aloysius marks", () => {
  // Figures 5 8 | 3 4 | 6 3 | 5 8 | 3 1 | 3 4 | 3 1 | 5 3 | 5 3 | 5 6 | 8
  const cp = ["A4", "D5", "A4", "B4", "C5", "G4", "A4", "D5", "B4", "G4", "A4", "B4", "C5", "A4", "D5", "B4", "C5", "A4", "B4", "C#5", "D5"];
  const ev = evaluate(input(D_CF, cp), all());
  assert.deepEqual(
    ev.errors.map((e) => `${e.ruleId}@${e.positions.join(",")}`),
    ["ss.downbeat-succession@14,16", "ss.downbeat-succession@16,18"], // into bars 9 and 10
  );
});

test("a skip of a fourth saves the downbeats (p. 58-59), a step does not", () => {
  // bar 3 -> 4 of Fig. 26: C5 (6th) skips a fourth to G4, then A4 (5th): free
  const saved = ["A4", "D5", "A4", "B4", "C5", "G4", "A4", "D5", "B4", "G4", "A4", "B4", "C5", "A4", "D5", "C5", "D5", "E5", "B4", "C#5", "D5"];
  assert.ok(!evaluate(input(D_CF, saved), all()).errors.some((e) => e.positions[1] === 6));
  const stepped = [...saved];
  stepped[5] = "B4"; // C5 -> B4 -> A4: the B4 counts as absent, 6 -> 5 by similar motion
  assert.ok(evaluate(input(D_CF, stepped), all()).errors.some((e) => e.ruleId === "ss.downbeat-succession" && e.positions.join() === "4,6"));
});

test("dissonance on the upbeat only as a stepwise passing note; never on the downbeat", () => {
  const ok = ["A4", "D5", "A4", "B4", "C5", "G4", "A4", "D5", "B4", "C5", "D5", "A4", "C5", "D5", "E5", "B4", "D5", "A4", "B4", "C#5", "D5"]; // Fig. 33
  const ids = (cp: string[]) => evaluate(input(D_CF, cp), all()).errors.map((e) => `${e.ruleId}@${e.positions.join(",")}`);
  assert.ok(!ids(ok).some((x) => x.startsWith("ss.passing") || x.startsWith("ss.downbeat-consonance")));
  const leapt = [...ok];
  leapt[3] = "E5"; // A4 -> E5 (a seventh over F4) -> C5: dissonance reached by a leap
  assert.ok(ids(leapt).includes("ss.passing-dissonance@3"));
  const down = [...ok];
  down[2] = "G4"; // a second over F4 on the downbeat
  assert.ok(ids(down).includes("ss.downbeat-consonance@2"));
});

test("cadence: fifth then major sixth below; the E-mode sixth only where the fifth is mi contra fa", () => {
  assert.equal(fifthIsDiminished("F4", "upper"), true); // B below F
  assert.equal(fifthIsDiminished("B3", "lower"), true); // F above B
  assert.equal(fifthIsDiminished("E4", "upper"), false);
  const cp = ["A4", "D5", "A4", "B4", "C5", "G4", "A4", "D5", "B4", "G4", "A4", "B4", "C5", "A4", "D5", "C5", "D5", "E5", "G4", "C#5", "D5"];
  const ev = evaluate(input(D_CF, cp), all());
  assert.ok(ev.errors.some((e) => e.ruleId === "ss.cadence" && e.positions.join() === "18")); // G4 is a third, not a fifth
});

test("opening on the first sung note after a half rest", () => {
  const cp = [REST, "D5", "A4", "B4", "C5", "G4", "A4", "D5", "B4", "G4", "A4", "B4", "C5", "A4", "D5", "C5", "D5", "E5", "B4", "C#5", "D5"];
  assert.ok(!evaluate(input(D_CF, cp), all()).errors.some((e) => e.ruleId === "ss.opening-perfect"));
  cp[1] = "F5";
  assert.ok(evaluate(input(D_CF, cp), all()).errors.some((e) => e.ruleId === "ss.opening-perfect" && e.positions.join() === "1"));
});
