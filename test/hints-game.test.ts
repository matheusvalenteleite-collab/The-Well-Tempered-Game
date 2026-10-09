import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { ALL_STEPS } from "../src/counterpoint/curriculum/index.ts";
import { exerciseView } from "../src/game/exercise-view.ts";
import { hintContext } from "../src/game/hints-context.ts";
import { hintAt, unitAt } from "../src/counterpoint/choices/hints.ts";
import { harmonyOf } from "../src/counterpoint/choices/harmony.ts";

const repo = loadFuxRepository();

test("D115: hints in the game: writing Fux's line, his note is legal at each step, and a hint is quick", () => {
  for (const species of ["first", "second", "third", "fourth"] as const) {
    const step = ALL_STEPS.find((s) => s.species === species && s.kind === "canonical")!;
    const view = exerciseView(repo, step);
    const ctx = hintContext(repo, view)!;
    assert.ok(ctx, species);
    const line = view.fux!;
    const t0 = performance.now();
    let n = 0;
    for (let k = 1; k < line.length; k += Math.max(1, Math.floor(line.length / 6))) {
      const partial = line.map((p, j) => (j < k ? p : null));
      const h = hintAt(ctx, partial, unitAt(ctx, partial, k));
      n++;
      if (!h) continue;
      assert.ok(h.candidates.find((c) => c.pitch === line[k])?.legal !== false || h.candidates.every((c) => c.pitch !== line[k]), `${species} slot ${k}`);
    }
    assert.ok((performance.now() - t0) / n < 1500, `${species}: too slow`);
  }
});

test("D115: the harmonic view's labels (a modern lens)", () => {
  assert.equal(harmonyOf(["A3", "C#4", "E4"], "D").roman, "V");
  assert.equal(harmonyOf(["F3", "A3", "D4"], "D").roman, "i6");
});
