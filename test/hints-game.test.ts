import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { ALL_STEPS } from "../src/counterpoint/curriculum/index.ts";
import { exerciseView } from "../src/game/exercise-view.ts";
import { hintContext } from "../src/game/hints-context.ts";
import { hintAt, unitAt } from "../src/counterpoint/choices/hints.ts";
import { judgeLine } from "../src/counterpoint/choices/alternatives.ts";
import { REST } from "../src/counterpoint/layout.ts";
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

test("D152: a weak-beat note is judged with what can follow it (D5 C5 B♭4 over D F: the B♭ cannot pass on)", () => {
  const step = ALL_STEPS.find((s) => s.id === "fux-mode.s2.01")!;
  const ctx = hintContext(repo, exerciseView(repo, step))!;
  const line: (string | null)[] = ctx.layout.map(() => null);
  [line[0], line[1], line[2], line[3]] = ["r", "D5", "C5", "Bb4"];
  // B♭ is a fourth over the cantus's F, and A, where it would pass, a fourth over the next bar's E.
  assert.equal(hintAt(ctx, line, unitAt(ctx, line, 3))!.candidates.find((c) => c.pitch === "Bb4")?.legal, false);
});

test("D152: following the hint's best note from the opening reaches a finished line (no dead end at the cadence)", () => {
  for (const id of ["fux-mode.s2.01", "fux-mode.s2.02", "fux-mode.s4.01"]) {
    const view = exerciseView(repo, ALL_STEPS.find((s) => s.id === id)!);
    const ctx = hintContext(repo, view)!;
    const line: (string | null)[] = view.layout.map((sl) => (sl.restAllowed ? REST : null));
    const f0 = view.layout.findIndex((sl, j) => !(sl.restAllowed && j === 0));
    line[f0] = view.fux![f0];
    for (let k = 0; k < line.length; k++) {
      if (line[k] !== null) continue;
      const h = hintAt(ctx, line, unitAt(ctx, line, k));
      assert.ok(h?.best, `${id}: no legal note at slot ${k} after ${line.slice(0, k).join(" ")}`);
      line[k] = h.best;
    }
    assert.deepEqual(judgeLine(ctx, line).errors.map((v) => v.ruleId), [], id);
  }
});
