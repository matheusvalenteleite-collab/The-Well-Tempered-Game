/**
 * D488: the slide-in. A thumb landing in a rest before the coming note, away from its row, slides in to it:
 * simulated from above and below, early, on time and late, after short and long rests, on both phones
 * (test/slide-sim.ts simulateSlideIns), and the landing never costs a note.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SLIDE_IN } from "../src/bench/slide-rule.ts";
import { RULE_LEVELS } from "../src/bench/lite.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";
import { PHONES, simulateSlideIns, sumSlideIns, type InFrom, type InTiming } from "./slide-sim.ts";

const PIECES: readonly [string, number][] = [
  ["wtc1f02", 0],
  ["wtc1f01", 1],
  ["wtc1f22", 2],
];
const run = (from: InFrom, timing: InTiming) => sumSlideIns(PHONES.flatMap((ph) => PIECES.map(([id, v]) => simulateSlideIns(id, v, from, timing, ph, 1, { bars: 16 }))));

test("D488: the slide-in's thresholds", () => {
  assert.equal(SLIDE_IN.minRows, 0.75);
  assert.equal(SLIDE_IN.inWindowRows, 1.5);
  assert.ok(SLIDE_IN.leadMs >= 1000 && SLIDE_IN.leadBeats >= 2);
  const line = RULE_LEVELS.ladder.intermediate.find((l) => l.startsWith("SLIDE IN:"));
  assert.ok(line && line.includes("halfway") && line.includes("never counts as a mistake"), "HOW TO PLAY says it in plain words");
  assert.ok(PT[line!] && ES[line!], "in pt and es");
});

test("D488: slide-ins succeed from above and below, early, on time and late, after short and long rests; the landing never costs a note", () => {
  for (const from of ["below", "above"] as const)
    for (const timing of ["early", "ontime", "late"] as const) {
      const r = run(from, timing);
      const tag = `${from} ${timing}`;
      assert.ok(r.attempts >= 20, `${tag}: ${r.attempts} tried`);
      assert.ok(r.ok / r.attempts >= (timing === "late" ? 0.8 : 0.9), `${tag}: ${r.ok}/${r.attempts} slid in`);
      assert.ok(r.short.attempts >= 5 && r.long.attempts >= 5, `${tag}: short ${r.short.attempts}, long ${r.long.attempts}`);
      // The landing is no stray and no wrong note; every slid-to note is right however it was played but the late ones past their window.
      assert.equal(r.strays, 0, `${tag}: strays`);
      assert.equal(r.wrong, 0, `${tag}: wrong`);
      assert.ok(r.right / r.attempts >= (timing === "late" ? 0.8 : 0.97), `${tag}: ${r.right}/${r.attempts} right`);
      assert.ok(r.struckRight / r.struck >= 0.99, `${tag}: the other notes ${r.struckRight}/${r.struck}`);
    }
});

test("D488: a landing that never slides costs no stray: inside the window it is struck from its landing, before it FURTHER is told", () => {
  for (const from of ["below", "above"] as const) {
    const r = run(from, "still");
    assert.equal(r.ok, 0, `${from}: no slide-in without a slide`);
    assert.equal(r.strays, 0, `${from}: no stray`);
    assert.ok((r.why.short ?? 0) + r.right >= 0.9 * r.attempts, `${from}: told FURTHER (${r.why.short}) or struck from the landing (${r.right}) of ${r.attempts}`);
  }
});
