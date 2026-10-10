import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMOS } from "../src/game/rule-demos.ts";
import { ALL_STEPS, rulesForStep } from "../src/counterpoint/curriculum/index.ts";
import { evaluate } from "../src/counterpoint/engine.ts";
import { slotLayout } from "../src/counterpoint/layout.ts";

const judge = (d: (typeof DEMOS)[string], line: string[]) => {
  const steps = ALL_STEPS.filter((s) => s.species === d.species);
  const layout = slotLayout(d.species, d.cantus.length);
  assert.equal(line.length, layout.length, "one note per slot");
  const ev = evaluate(
    { species: d.species, modalFinal: "D", cantusVoice: "lower", cantus: d.cantus.map((p) => ({ pitch: p, duration: "1/1" })), counterpoint: line.map((p, k) => ({ pitch: p, duration: layout[k].duration })) },
    rulesForStep(steps[steps.length - 1].id),
  );
  return ev.violations.map((v) => v.ruleId);
};

test("D103: every rule demonstration is checked by the engine: wrong breaks its rule, right does not", () => {
  for (const [idea, d] of Object.entries(DEMOS)) {
    assert.ok(judge(d, d.wrong).includes(d.ruleId), `${idea}: wrong should break ${d.ruleId} (got ${judge(d, d.wrong)})`);
    assert.ok(!judge(d, d.right).includes(d.ruleId), `${idea}: right should keep ${d.ruleId} (got ${judge(d, d.right)})`);
  }
});
