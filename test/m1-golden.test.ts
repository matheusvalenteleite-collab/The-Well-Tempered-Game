/**
 * Golden tests over Fux's own material. Known discrepancies between the fux-strict rules and
 * Fux's solutions are listed here explicitly; they are reported, not "fixed" in data or rules.
 * Any change in engine behaviour on Fux's material makes these tests fail.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { crossCheckAnnotations, goldenFig22PublishedReading, goldenFirstSpecies, melodicLeapAudit, widestDistances } from "../tools/m1/golden.ts";

const repo = loadFuxRepository();

test("Level 1 filter (first species, final C, cantus below) matches no Fux exercise", () => {
  assert.deepEqual(repo.listExercises({ species: "first", modal_final: "C", cantus_voice: "lower" }), []);
});

test("fux-strict hard rules on Fux's 10 first-species solutions: only the Fig. 14 voice crossing fails", () => {
  const results = goldenFirstSpecies(repo);
  assert.equal(results.length, 10);
  const errors = results.flatMap((r) => r.errors.map((e) => `${r.figure}:${e.ruleId}:${e.positions.join(",")}`));
  // Fig. 14 crosses the cantus in notes 4-7; Fux approves it explicitly (1725, p. 52). Open question to the user.
  assert.deepEqual(errors, ["14:fs.no-voice-crossing:3,4,5,6"]);
});

test("cadence rule is cantus-below only: with the cantus above Fux cadences m3 -> P1 (1725, p. 49)", () => {
  for (const r of goldenFirstSpecies(repo).filter((x) => x.cantus_voice === "upper")) {
    const cad = r.not_applied_cantus_below_rules.find((x) => x.ruleId === "fs.cadence-major-sixth")!;
    assert.equal(cad.would_report[0].detail!.penultimate, "m3", r.figure);
  }
});

test("warnings on Fux's solutions (calibration evidence; provisional operationalizations)", () => {
  const w = goldenFirstSpecies(repo).flatMap((r) => r.warnings.map((x) => `${r.figure}:${x.ruleId}:${x.positions.join(",")}`));
  assert.deepEqual(w, [
    "6:fs.avoid-successive-leaps:1,2,3",
    "6:fs.avoid-successive-leaps:5,6,7",
    "12:fs.avoid-successive-leaps:0,1,2",
    "13:fs.avoid-successive-leaps:1,2,3",
    "13:fs.avoid-successive-leaps:7,8,9",
    "15:fs.avoid-successive-leaps:7,8,9",
    "15:fs.avoid-successive-leaps:8,9,10",
    "21:fs.avoid-successive-leaps:4,5,6",
    "21:fs.avoid-successive-leaps:5,6,7",
    "21:fs.avoid-successive-leaps:8,9,10",
    "22:fs.avoid-successive-leaps:0,1,2",
    "22:fs.avoid-successive-leaps:4,5,6",
  ]);
});

test("the superseded published reading of Fig. 22 fails fux-strict (supports the kern reading)", () => {
  const ids = goldenFig22PublishedReading(repo).evaluation.errors.map((e) => e.ruleId);
  assert.deepEqual(ids, ["fs.vertical-consonance", "fs.melodic-seventh", "fs.no-voice-crossing"]);
});

test("engine intervals agree with all 1,111 source annotations", () => {
  const c = crossCheckAnnotations(repo);
  assert.equal(c.compared, 1111);
  assert.deepEqual(c.mismatches, []);
});

test("widest vertical distance in Fux's first species is a major tenth", () => {
  const w = widestDistances(repo);
  assert.deepEqual(w.maximum.map((r) => `${r.figure}:${r.interval}:m${r.measure}`), ["6:M10:m7", "12:M10:m6", "13:M10:m7", "21:M10:m6", "23:M10:m8"]);
});

test("melodic audit of all 46 solutions: only descending minor sixths contradict the stated rules", () => {
  const off = melodicLeapAudit(repo).offending.map((o) => `${o.exercise_id}:m${o.measure}:${o.from}-${o.to}:${o.rule}`);
  assert.deepEqual(off, [
    "fux_2v_fig_041:m12:G3-B2:fs.melodic-sixth",
    "fux_2v_fig_042:m9:C5-E4:fs.melodic-sixth",
    "fux_2v_fig_057:m4:C5-E4:fs.melodic-sixth",
    "fux_2v_fig_075:m4:C5-E4:fs.melodic-sixth",
  ]);
});
