import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "../src/counterpoint/engine.ts";
import { ALL_STEPS, rulesForStep } from "../src/counterpoint/curriculum/index.ts";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { exerciseView } from "../src/game/exercise-view.ts";
import { HOLD } from "../src/counterpoint/layout.ts";

const repo = loadFuxRepository();
const views = ALL_STEPS.map((s) => [s, exerciseView(repo, s)] as const);
const RULE = { second: "ss.no-repetition", third: "ts.no-repetition", fourth: "fos.no-repetition", fifth: "fis.florid" } as const;

test("D92: a good first-species line written as whole notes clears none of the later species", () => {
  for (const sp of ["second", "third", "fourth", "fifth"] as const) {
    let checked = 0;
    for (const [st, v] of views.filter(([s]) => s.species === sp)) {
      const first = views.find(([s, w]) => s.species === "first" && w.fux && w.cantus.join() === v.cantus.join() && w.cantusVoice === v.cantusVoice);
      if (!first) continue;
      const line = first[1].fux!;
      const seen = new Set<number>();
      const notes = v.layout.map((sl) => {
        const opening = !seen.has(sl.bar);
        seen.add(sl.bar);
        return sp === "fifth" && !opening ? HOLD : line[sl.bar];
      });
      const ev = evaluate(
        { species: sp, modalFinal: v.modalFinal, cantusVoice: v.cantusVoice, cantus: v.cantus.map((p) => ({ pitch: p, duration: "1/1" })), counterpoint: notes.map((p, i) => ({ pitch: p, duration: v.layout[i].duration })) },
        rulesForStep(st.id),
      );
      assert.ok(!ev.passed, `${st.id} cleared with whole notes`);
      assert.ok(ev.errors.some((e) => e.ruleId === RULE[sp]), `${st.id}: ${RULE[sp]} not raised`);
      checked++;
    }
    assert.ok(checked > 0, sp);
  }
});
