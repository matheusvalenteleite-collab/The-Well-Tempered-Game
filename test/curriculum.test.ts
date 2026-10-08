import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { FUX_FIRST_SPECIES_CURRICULUM as C, rulesForStep, validateCurriculum } from "../src/counterpoint/curriculum/fux-first-species.ts";
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
