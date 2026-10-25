/** D268: the score sheet: the points by source, the four qualities weighed, the final score, the failed run's line. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreSheet, type SheetInput } from "../src/bench/score-sheet.ts";

const base: SheetInput = {
  right: 90,
  wrong: 5,
  missed: 5,
  stray: 0,
  of: 100,
  score: 1000,
  captured: 3,
  entries: 4,
  maxStreak: 40,
  art: { legato: 8, legatoOf: 10, chain: 4, held: 6, heldOf: 10, clean: 0, cleanOf: 0 },
  earned: { notes: 700, legato: 100, held: 60, subjects: 120, cadences: 20, bonus: 0 },
  perfects: 60,
  goods: 30,
  failed: false,
  progress: 1,
};

test("D268: the qualities, weighed 40/20/20/20, give the performance; a finished run's bonus is points × performance / 200", () => {
  const s = scoreSheet(base);
  const by = Object.fromEntries(s.qualities.map((q) => [q.key, q.share]));
  assert.equal(by.accuracy, 0.9);
  assert.ok(Math.abs((by.timing as number) - 2 / 3) < 1e-9);
  assert.ok(Math.abs((by.articulation as number) - 0.7) < 1e-9, "legato 80%, held 60%; no rests to judge");
  assert.equal(by.subjects, 0.75);
  assert.equal(s.performance, Math.round(100 * (40 * 0.9 + 20 * (2 / 3) + 20 * 0.7 + 20 * 0.75) / 100));
  assert.equal(s.bonus, Math.round((1000 * s.performance) / 200));
  assert.equal(s.final, 1000 + s.bonus);
  assert.deepEqual(s.points.map((p) => p.source), ["notes", "subjects", "legato", "held", "cadences"], "largest first, the empty left out");
  assert.equal(s.advice, "");
});

test("D268: a quality with nothing to judge is left out of the weighing", () => {
  const s = scoreSheet({ ...base, captured: 0, entries: 0 });
  assert.equal(s.qualities.find((q) => q.key === "subjects")!.share, null);
  assert.equal(s.performance, Math.round((100 * (40 * 0.9 + 20 * (2 / 3) + 20 * 0.7)) / 80));
});

test("D268: a failed run: no bonus, the performance scaled by how far it went, what cost it most", () => {
  const s = scoreSheet({ ...base, failed: true, progress: 0.5, missed: 30, wrong: 4 });
  assert.equal(s.bonus, 0);
  assert.equal(s.final, 1000);
  assert.equal(s.performance, Math.round(scoreSheet(base).performance * 0.5));
  assert.match(s.advice, /^30 NOTES WENT BY UNPLAYED/);
  assert.match(scoreSheet({ ...base, failed: true, missed: 0, wrong: 0, stray: 12 }).advice, /^12 TAPS ON NO NOTE/);
});
