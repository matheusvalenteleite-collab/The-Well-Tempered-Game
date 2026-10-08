import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { FUX_FIRST_SPECIES_CURRICULUM as C } from "../src/counterpoint/curriculum/fux-first-species.ts";
import { rulesForStep, validateCurriculum } from "../src/counterpoint/curriculum/index.ts";
import { evaluate } from "../src/counterpoint/engine.ts";
import { inputFor } from "../tools/m1/golden.ts";

const repo = loadFuxRepository();

test("curriculum matches the dataset and places every fux-strict rule exactly once", () => {
  validateCurriculum(repo);
  assert.deepEqual(C.map((s) => s.exercise_id?.replace("fux_2v_fig_0", "") ?? `${s.cf_id}/${s.cantus_voice}`), [
    "05", "06", "11", "12", "13", "14", "15", "21", "22", "23", "fux_cf_c_01/lower", "fux_cf_c_01/upper",
  ]);
  assert.ok(C.slice(10).every((s) => s.kind === "fux-cantus" && s.exercise_id === null));
});

test("rules become active in book order", () => {
  const ids = (n: number) => rulesForStep(C[n - 1].id).map((r) => r.id);
  assert.ok(!ids(3).includes("fs.melodic-tritone") && ids(4).includes("fs.melodic-tritone"));
  assert.ok(!ids(6).includes("fs.melodic-major-sixth") && ids(7).includes("fs.melodic-major-sixth"));
  assert.ok(!ids(7).includes("fs.unison-leap") && ids(8).includes("fs.unison-leap"));
  assert.equal(ids(12).length, 13);
  assert.ok(ids(1).includes("fs.prefer-imperfect-consonances"));
});

test("each Fux solution clears the rules active at its own step", () => {
  for (const s of C.filter((x) => x.exercise_id)) {
    const ex = repo.getExercise(s.exercise_id!)!;
    const ev = evaluate(inputFor(ex, repo.getSolution(ex.id)!), rulesForStep(s.id));
    assert.deepEqual(ev.errors, [], ex.figure);
  }
});

test("content: every step has a tutor intro; every introduced rule has a hint and a tutor message", async () => {
  const { t } = await import("../src/ui/i18n.ts");
  const { ALL_STEPS, ruleById } = await import("../src/counterpoint/curriculum/index.ts");
  for (const s of ALL_STEPS) {
    assert.doesNotThrow(() => t(`tutor.step.${s.id}.intro`), s.id);
    for (const x of s.introduces) {
      assert.doesNotThrow(() => t(`hints.rule.${x.ruleId}`), x.ruleId);
      assert.doesNotThrow(() => t(`tutor.${ruleById(x.ruleId)!.messageKey}`), x.ruleId);
    }
  }
});

test("study content: every step has a name, specific precepts and study text; every mode is described", async () => {
  const { stepStudy, modeStudy } = await import("../src/ui/study.ts");
  const { ALL_STEPS } = await import("../src/counterpoint/curriculum/index.ts");
  const names = new Set<string>();
  for (const s of ALL_STEPS) {
    const x = stepStudy(s.id);
    assert.ok(x.name && x.specific.length > 0 && x.study.length > 0, s.id);
    assert.ok(!/Fig\./.test(x.name), s.id);
    names.add(`${s.species}:${x.name}`);
    modeStudy(s.modal_final);
  }
  assert.equal(names.size, ALL_STEPS.length); // names are unique within a species
});
