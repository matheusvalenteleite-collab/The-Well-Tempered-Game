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
  earned: { notes: 700, articulation: 100, held: 60, subjects: 120, cadences: 20, bonus: 0, reading: 0 },
  perfects: 60,
  goods: 30,
  failed: false,
  progress: 1,
};

test("D445: the performance's four parts, weighed 60/15/15/10 (timing a GOOD 0.75, touch the joins, holds, rests and signs together, entries by share); the grade from it; the final the points times it", () => {
  const s = scoreSheet({ ...base, entryShares: [1, 1, 1, 0.5] });
  const by = Object.fromEntries(s.qualities.map((q) => [q.key, q.share]));
  assert.equal(by.notes, 0.9);
  assert.ok(Math.abs((by.timing as number) - (60 + 0.75 * 30) / 90) < 1e-9);
  assert.ok(Math.abs((by.touch as number) - 14 / 20) < 1e-9, "legato 8/10 and held 6/10, counted together; no rests, no signs");
  assert.equal(by.entries, 0.875, "three whole, one half: partial credit");
  const perf = Math.round((60 * 0.9 + 15 * ((60 + 0.75 * 30) / 90) + 15 * 0.7 + 10 * 0.875) / 100 * 100);
  assert.equal(s.performance, perf);
  assert.equal(s.grade, perf >= 95 ? "S" : perf >= 90 ? "A" : perf >= 80 ? "B" : perf >= 70 ? "C" : "D");
  assert.equal(s.final, Math.round((1000 * s.performance) / 100));
  assert.deepEqual(s.points.map((p) => p.source), ["notes", "subjects", "articulation", "held", "cadences"], "largest first, the empty left out");
  assert.equal(s.signs, null, "no reading");
  assert.equal(s.advice, "");
});

test("D445: a part with nothing to judge is left out of the weighing", () => {
  const s = scoreSheet({ ...base, entryShares: [] });
  assert.equal(s.qualities.find((q) => q.key === "entries")!.share, null);
  assert.equal(s.performance, Math.round((100 * (60 * 0.9 + 15 * ((60 + 0.75 * 30) / 90) + 15 * 0.7)) / 90));
});

test("D445: a failed run: the performance scaled by how far it went, the final by it, what cost it most", () => {
  const s = scoreSheet({ ...base, failed: true, progress: 0.5, missed: 30, wrong: 4 });
  assert.equal(s.performance, Math.round(scoreSheet(base).performance * 0.5));
  assert.equal(s.final, Math.round((1000 * s.performance) / 100));
  assert.match(s.advice, /^30 NOTES WENT BY UNPLAYED/);
  assert.match(scoreSheet({ ...base, failed: true, missed: 0, wrong: 0, stray: 12 }).advice, /^12 TAPS ON NO NOTE/);
});
