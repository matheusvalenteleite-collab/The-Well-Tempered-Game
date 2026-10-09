import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { auditSpecies, lastStepOf, pool } from "../src/counterpoint/choices/audit.ts";
import { CHOICE_SPECIES, choiceUnits, fuxLines } from "../src/counterpoint/choices/corpus.ts";
import { buildHabits, verticalKey } from "../src/counterpoint/choices/habits.ts";
import { checkCantus, generateCantus } from "../src/counterpoint/choices/cantus.ts";
import { generateCounterpoint } from "../src/counterpoint/choices/counterpoint.ts";
import { compareTiers } from "../src/counterpoint/choices/score.ts";
import { fuxAccidentals, pitchesBetween, registerWindow } from "../src/counterpoint/choices/vocabulary.ts";
import { rulesForStep } from "../src/counterpoint/curriculum/index.ts";
import { judgeLine } from "../src/counterpoint/choices/alternatives.ts";
import { slotLayout } from "../src/counterpoint/layout.ts";
import type { ModalFinal, Staff } from "../src/music/fux/index.ts";

const repo = loadFuxRepository();

test("alternatives audit: at every choice of Fux's solutions (species 1-4), his own note is legal (D39, choice by choice)", () => {
  for (const species of CHOICE_SPECIES) {
    for (const rules of ["step", "species"] as const) {
      const audits = auditSpecies(repo, species, { rules });
      assert.ok(audits.length >= 6, species);
      const p = pool(audits);
      assert.equal(p.fuxIllegal, 0, `${species} (${rules})`);
      for (const a of audits) for (const u of a.units) assert.ok(u.legal >= 1 && u.rank >= 1, `${a.line.figure} bar ${u.bar + 1}`);
    }
  }
});

test("fourth species: a ligature is one choice (the tied pair moves together)", () => {
  const [l] = fuxLines(repo, "fourth");
  const units = choiceUnits(l.layout, l.line);
  assert.ok(units.some((u) => u.length === 2));
  for (const u of units.filter((x) => x.length === 2)) assert.equal(l.line[u[0]], l.line[u[1]]);
});

test("habits: leave-one-out drops the exercise judged; crossing is told apart", () => {
  const lines = fuxLines(repo, "first");
  const all = buildHabits(lines, "first");
  const loo = buildHabits(lines, "first", [lines[0].exerciseId]);
  assert.equal(all.from.length, lines.length);
  assert.equal(loo.from.length, lines.length - 1);
  assert.ok(!loo.from.includes(lines[0].exerciseId));
  assert.equal(verticalKey("D4", "F4", "lower"), "m3");
  assert.equal(verticalKey("D4", "F5", "lower"), "m3+1");
  assert.equal(verticalKey("D4", "B3", "lower"), "xm3"); // counterpoint meant to be above, crossed below the cantus
  assert.equal(verticalKey("D4", "D5", "lower"), "8");
});

test("score vector: tiers compare in order, never summed", () => {
  const a = { errors: 0, warnings: 0, counsel: 3, habit: 1 };
  const b = { errors: 0, warnings: 1, counsel: 0, habit: 0 };
  assert.ok(compareTiers(a, b) < 0); // fewer warnings wins whatever follows
  assert.ok(compareTiers(a, b, ["errors", "counsel", "habit"]) > 0);
});

test("cantus checker: every cantus firmus of Fux keeps every hard constraint (D8, widened where Fux's own needs it)", () => {
  for (const cf of repo.dataset.cantus_firmi) {
    const c = checkCantus(cf.pitch_sequence, cf.modal_final as ModalFinal);
    assert.deepEqual(c.hard, [], cf.cf_id);
  }
  // Fux's G turns once without changing direction after a rising fourth: soft, counted.
  assert.ok(checkCantus(repo.getCantusFirmus("fux_cf_g_01")!.pitch_sequence, "G").soft.length > 0);
});

test("cantus generator: every final, several seeds, all hard constraints", () => {
  for (const final of ["D", "E", "F", "G", "A", "C"] as ModalFinal[]) {
    for (const seed of [1, 2, 3]) {
      const c = generateCantus({ final, seed });
      assert.deepEqual(checkCantus(c, final).hard, [], `${final} ${seed}: ${c.join(" ")}`);
      assert.ok(c.length >= 10 && c.length <= 14);
    }
  }
  assert.equal(generateCantus({ final: "D", seed: 5, length: 11 }).length, 11);
});

test("counterpoint generator: what it writes breaks no rule of the species (judged by the game's engine)", () => {
  const acc = fuxAccidentals(repo);
  const cases: [(typeof CHOICE_SPECIES)[number], ModalFinal[]][] = [
    ["first", ["D", "E", "F"]],
    ["second", ["D", "E"]],
    ["third", ["D", "E"]],
    ["fourth", ["D", "E"]],
  ];
  for (const [species, finals] of cases) {
    const habits = buildHabits(fuxLines(repo, species), species);
    const rules = rulesForStep(lastStepOf(species));
    for (const final of finals) {
      for (const cantusVoice of ["lower", "upper"] as Staff[]) {
        const cantus = generateCantus({ final, seed: 7 });
        const [lo, hi] = registerWindow(cantus, cantusVoice);
        const g = generateCounterpoint({ species, modalFinal: final, cantusVoice, cantus, rules, vocabulary: pitchesBetween(lo, hi, acc[final]), habits, seed: 3 });
        const layout = slotLayout(species, cantus.length);
        const ev = judgeLine({ species, modalFinal: final, cantusVoice, cantus, layout, rules, vocabulary: [], habits }, g.line);
        assert.deepEqual(ev.errors.map((v) => v.ruleId), [], `${species} ${final} ${cantusVoice}: ${g.line.join(" ")}`);
      }
    }
  }
});
