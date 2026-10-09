import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_STEPS } from "../src/counterpoint/curriculum/index.ts";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { exerciseView } from "../src/game/exercise-view.ts";
import { continuoInput, continuoOptions } from "../src/game/continuo-input.ts";
import { DEFAULT_CONTINUO_SETTINGS } from "../src/game/continuo-settings.ts";
import { realizeContinuo } from "../src/continuo/realize.ts";

const repo = loadFuxRepository();
const fMode = ALL_STEPS.map((s) => exerciseView(repo, s)).filter((v) => v.fux && v.modalFinal === "F");

const bNaturals = (accidentals: boolean) =>
  fMode.reduce((n, v) => {
    const input = continuoInput(v, v.fux!, "fux");
    const r = realizeContinuo(input, continuoOptions("fux", { ...DEFAULT_CONTINUO_SETTINGS, accidentals }));
    const sung = (bar: number) => v.layout.some((sl, k) => sl.bar === bar && /^B\d/.test(v.fux![k] ?? "")) || /^B\d/.test(v.cantus[bar]);
    return n + r.events.filter((e) => e.pitches.some((p) => /^B\d/.test(p)) && !sung(e.bar)).length;
  }, 0);

test("D93: in the F mode the continuo plays B♭ unless B♮ is sung in the bar; off, the old white-key B returns", () => {
  assert.ok(fMode.length >= 6);
  assert.equal(bNaturals(true), 0);
  assert.ok(bNaturals(false) > 0);
});
