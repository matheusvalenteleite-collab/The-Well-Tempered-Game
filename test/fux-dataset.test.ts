import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { compareWithOriginal, createPlayerSolution, isComplete, playerNote, structuralProblems } from "../src/music/fux/player.ts";

const repo = loadFuxRepository();

test("46 exercises, each with a CF, an original solution and annotations", () => {
  const all = repo.listExercises();
  assert.equal(all.length, 46);
  for (const ex of all) {
    assert.ok(ex.cantus_firmus.notes.length > 0);
    assert.deepEqual(ex.counterpoint.notes, []);
    const sol = repo.getSolution(ex.id)!;
    assert.equal(sol.role, "original_solution");
    assert.deepEqual(sol.cantus_firmus.pitch_sequence, ex.cantus_firmus.notes.map((n) => n.pitch));
    assert.ok(repo.getAnnotations(ex.id)!.items.length > 0);
  }
});

test("getExercise / getCantusFirmus / getExercisesForCantusFirmus", () => {
  const ex = repo.getExercise("fux_2v_fig_005")!;
  assert.equal(ex.species, "first");
  assert.equal(ex.modal_final, "D");
  assert.equal(ex.cantus_voice, "lower");
  const cf = repo.getCantusFirmus(ex.cantus_firmus.cf_id)!;
  assert.equal(cf.cf_id, "fux_cf_d_01");
  assert.deepEqual(cf.pitch_sequence, ["D4", "F4", "E4", "D4", "G4", "F4", "A4", "G4", "F4", "E4", "D4"]);
  const users = repo.getExercisesForCantusFirmus(cf.cf_id).map((e) => e.figure);
  assert.deepEqual(users, ["5", "6", "33", "35", "55", "56", "73", "74", "82", "83"]);
  assert.equal(repo.getExercise("nope"), undefined);
});

test("stable CF ids and the distinct-CF catalogue", () => {
  const ids = repo.listCantusFirmi().map((c) => c.cf_id);
  assert.deepEqual(ids, ["fux_cf_d_01", "fux_cf_e_01", "fux_cf_f_01", "fux_cf_g_01", "fux_cf_a_01", "fux_cf_a_02", "fux_cf_c_01", "fux_cf_c_02"]);
  assert.equal(repo.listCantusFirmi({ includeDistinctOnly: true }).length, 14);
});

test("source accidentals are preserved (B-flat in Fig. 85a)", () => {
  const sol = repo.getSolution("fux_2v_fig_085a")!;
  const flats = sol.counterpoint.notes.filter((n) => n.pitch === "Bb3");
  assert.ok(flats.length > 0 && flats.every((n) => n.accidental_shown && n.midi === 58));
});

test("annotations keep the source interval and agree with the computed one", () => {
  const ann = repo.getAnnotations("fux_2v_fig_005")!;
  assert.deepEqual(ann.items[0], { ...ann.items[0], counterpoint_note: "A4", cantus_note: "D4", interval: "P5", interval_computed: "P5", agrees: true });
  for (const a of repo.dataset.annotations) for (const it of a.items) assert.equal(it.interval, it.interval_computed);
});

test("getRandomExercise honours filters and is deterministic with an injected RNG", () => {
  for (let k = 0; k < 50; k++) {
    const ex = repo.getRandomExercise({ species: ["fourth", "fifth"], modal_final: "E", cantus_voice: "upper" })!;
    assert.ok(["fourth", "fifth"].includes(ex.species) && ex.modal_final === "E" && ex.cantus_voice === "upper");
  }
  assert.equal(repo.getRandomExercise({ species: "first" }, () => 0)!.id, "fux_2v_fig_005");
  assert.equal(repo.getRandomExercise({ difficulty: { min: 6 } }), undefined);
  assert.equal(repo.listExercises({ modal_final: "C", species: "fifth" }).length, 2);
});

test("player solution is separate from Fux's and need not match it", () => {
  const ex = repo.getExercise("fux_2v_fig_005")!;
  const player = createPlayerSolution(ex, new Date(0));
  assert.equal(player.kind, "player_solution");
  assert.equal(isComplete(player, ex), false);
  const pitches = ["D5", "C5", "B4", "A4", "B4", "D5", "C5", "D5", "D5", "C#5", "D5"];
  player.notes = pitches.map((p, k) => playerNote(p, `${k}/1`, "1/1"));
  assert.deepEqual(structuralProblems(player, ex), []);
  assert.ok(isComplete(player, ex));
  const cmp = compareWithOriginal(player, repo.getSolution(ex.id)!);
  assert.equal(cmp.informational, true);
  assert.equal(cmp.identical, false);
  assert.equal(cmp.points.length, 11);
  // Fux's original is untouched by player edits.
  assert.equal(repo.getSolution(ex.id)!.counterpoint.notes[0].pitch, "A4");
});
