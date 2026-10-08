import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { ALL_STEPS, rulesForStep } from "../src/counterpoint/curriculum/index.ts";
import { exerciseView } from "../src/game/exercise-view.ts";
import { evaluate } from "../src/counterpoint/engine.ts";
import { HOLD, sounding } from "../src/counterpoint/layout.ts";

const repo = loadFuxRepository();
const steps = ALL_STEPS.filter((s) => s.species === "fifth");
export const judge = (stepId: string, notes: (string | null)[]) => {
  const s = ALL_STEPS.find((x) => x.id === stepId)!;
  const v = exerciseView(repo, s);
  return evaluate({ species: v.species, modalFinal: v.modalFinal, cantusVoice: v.cantusVoice, cantus: v.cantus.map((p) => ({ pitch: p, duration: "1/1" })), counterpoint: notes.map((p, k) => ({ pitch: p === HOLD ? HOLD : sounding(p) ? p : null, duration: v.layout[k].duration })) }, rulesForStep(s.id));
};
const ids = (ev: ReturnType<typeof judge>) => ev.violations.map((x) => `${x.ruleId}@${x.positions.join(",")}`);

test("fifth species (D82): twelve steps; Fux's twelve solutions clear every rule (D39), but for the limping crotchets he marks NB himself (Fig. 88a, bar 5)", () => {
  assert.equal(steps.length, 12);
  for (const s of steps) {
    const v = exerciseView(repo, s);
    assert.ok(v.fux, s.id);
    const got = ids(judge(s.id, v.fux!));
    if (s.exercise_id === "fux_2v_fig_088a") {
      assert.equal(got.length, 1, `${s.id}: ${got}`);
      assert.match(got[0], /^fis\.limping@/);
      // Bar 5 (index 4) of the eighth-note grid: slots 32..39.
      const slot = Number(got[0].split("@")[1].split(",")[0]);
      assert.equal(Math.floor(slot / 8), 4, got[0]);
    } else assert.deepEqual(got, [], s.id);
  }
});
