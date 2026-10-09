import { test } from "node:test";
import { parsePitch } from "../src/music/pitch.ts";
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

import { readFileSync } from "node:fs";
import { trioSteps } from "../src/game/trio.ts";
import { auditTrios, buildTrioHabits, generateThirdVoice, judgeTrio, poolTrios, sonorityKey, trioAccidentals } from "../src/counterpoint/choices/trio.ts";
import { TRIO_FIRST_SPECIES } from "../src/counterpoint/three-voice.ts";
import { sharpAllowed } from "../src/counterpoint/choices/vocabulary.ts";

const trios = trioSteps(JSON.parse(readFileSync(new URL("../data/fux/three-voice/fux-three-voice.json", import.meta.url), "utf8")));

test("three voices: at every choice of Fux's sixteen first-species solutions, his note is legal (D39)", () => {
  const audits = auditTrios(trios);
  assert.equal(audits.length, 16);
  assert.equal(poolTrios(audits).fuxIllegal, 0);
  for (const a of audits) assert.equal(a.voices.length, 2);
  assert.equal(sonorityKey(["D4", "F4", "A4"]), "m3 5");
  assert.equal(sonorityKey(["A4", "F3", "D4"]), "M3 M6");
  // The weighted three-voice model, each exercise judged without itself: Fux's note first alone at
  // most choices the rules leave open (85% when measured; docs/fux/trio-habits-study.md).
  const byHabit = poolTrios(auditTrios(trios, { order: ["errors", "habit"] }));
  assert.ok(byHabit.fuxFirstFree / byHabit.free > 0.8, `${byHabit.fuxFirstFree}/${byHabit.free}`);
});

test("three voices: a third voice added to a generated exercise breaks no three-voice rule; sharps only at the cadence", () => {
  const habits3 = buildTrioHabits(trios);
  const acc3 = trioAccidentals(trios);
  const acc = fuxAccidentals(repo);
  const habits = buildHabits(fuxLines(repo, "first"), "first");
  let made = 0;
  for (const final of ["D", "G", "A", "C"] as ModalFinal[]) {
    const cantus = generateCantus({ final, seed: 4 });
    const [lo, hi] = registerWindow(cantus, "lower");
    const g = generateCounterpoint({ species: "first", modalFinal: final, cantusVoice: "lower", cantus, rules: rulesForStep(lastStepOf("first")), vocabulary: pitchesBetween(lo, hi, acc[final]), habits, seed: 2 });
    for (const placement of ["above", "below"] as const) {
      const r = generateThirdVoice({ modalFinal: final, given: [g.line, cantus], cantusOfGiven: 1, placement, habits: habits3, accidentals: acc3[final] ?? [], seed: 9 });
      const ev = judgeTrio({ modalFinal: final, cantusIndex: r.cantusIndex, rules: TRIO_FIRST_SPECIES }, r.voices);
      assert.deepEqual(ev.errors.map((x) => x.ruleId), [], `${final} ${placement}: ${r.voices[r.added].join(" ")}`);
      assert.equal(r.voices[r.cantusIndex].join(" "), cantus.join(" "));
      r.voices[r.added].forEach((p, k) => assert.ok(sharpAllowed(p, k, cantus.length), `${final} ${placement}: ${p} in bar ${k + 1}`));
      made++;
    }
  }
  assert.equal(made, 8);
});

test("two voices: the generators write sharps only in the last four bars, as Fux does", () => {
  const acc = fuxAccidentals(repo);
  for (const species of ["first", "second"] as const) {
    const habits = buildHabits(fuxLines(repo, species), species);
    for (const final of ["D", "G", "A"] as ModalFinal[]) {
      const cantus = generateCantus({ final, seed: 21 });
      const [lo, hi] = registerWindow(cantus, "upper");
      const g = generateCounterpoint({ species, modalFinal: final, cantusVoice: "upper", cantus, rules: rulesForStep(lastStepOf(species)), vocabulary: pitchesBetween(lo, hi, acc[final]), habits, seed: 5 });
      const layout = slotLayout(species, cantus.length);
      g.line.forEach((p, k) => assert.ok(sharpAllowed(p, layout[k].bar, cantus.length), `${species} ${final}: ${p} at slot ${k}`));
    }
  }
});

test("three voices: where no error-free voice exists, the one breaking the fewest rules is written, its errors named", () => {
  // Two lines a third or less apart: a middle voice can only double one of them.
  const cantus = "D4 F4 D4 E4 F4 G4 E4 A4 G4 E4 F4 D4 E4 D4".split(" ");
  const cp = "D4 D4 B3 C#4 A3 B3 C#4 A3 Bb3 C4 A3 B3 C#4 D4".split(" ");
  const r = generateThirdVoice({ modalFinal: "D", given: [cantus, cp], cantusOfGiven: 0, placement: "between", habits: buildTrioHabits(trios), accidentals: trioAccidentals(trios).D ?? [], seed: 3 });
  assert.equal(r.voices[r.added].length, cantus.length);
  assert.ok(r.errors.length > 0 && r.reason);
  const ev = judgeTrio({ modalFinal: "D", cantusIndex: r.cantusIndex, rules: TRIO_FIRST_SPECIES }, r.voices);
  assert.ok(ev.errors.length <= 4, `${ev.errors.length} errors: ${r.voices[r.added].join(" ")}`);
  assert.deepEqual([...new Set(ev.errors.map((x) => x.ruleId))].sort(), [...r.errors].sort());
});

import { offStaff, placeCantus } from "../src/counterpoint/choices/cantus.ts";

test("cantus register: low on the F staff, high an octave above the middle on the G staff, the melody unchanged", () => {
  const midi = (p: string) => parsePitch(p).midi;
  for (const final of ["D", "E", "F", "G", "A", "C"] as ModalFinal[]) {
    const c = generateCantus({ final, seed: 3 });
    const low = placeCantus(c, "low");
    const mid = placeCantus(c, "mid");
    const high = placeCantus(c, "high");
    assert.equal(low.clef, "bass");
    assert.equal(high.clef, "treble");
    for (const r of [low, mid, high]) assert.deepEqual(r.line.map((p, k) => midi(p) - midi(c[k])).filter((d, _, a) => d !== a[0]), []);
    assert.equal(midi(mid.line[0]) - midi(low.line[0]), 12);
    assert.equal(midi(high.line[0]) - midi(mid.line[0]), 12);
    assert.ok(offStaff(mid.line, mid.clef) <= offStaff(mid.line, mid.clef === "bass" ? "treble" : "bass"));
  }
});

import { arrival, MODEL_FEATURES, MODEL_WEIGHTS, modelBits, moveClass, movePairs } from "../src/counterpoint/choices/features.ts";

test("habit model: features name what a note does; every model feature has a weight; Fux's note costs less than the average legal one", () => {
  assert.equal(moveClass(2), "+s");
  assert.equal(moveClass(-5), "-5");
  assert.equal(moveClass(0), "0");
  for (const f of MODEL_FEATURES) assert.ok(MODEL_WEIGHTS[f.id] > 0, f.id);
  const [l] = fuxLines(repo, "first");
  const x = { layout: l.layout, cantus: l.cantus, line: l.line, cantusVoice: l.cantusVoice, unit: [3] };
  assert.ok(movePairs.keys(x).every((k) => /^[-+]?[0s35L]>[-+]?[0s35L]$/.test(k)));
  assert.ok(arrival.keys(x).every((k) => /^(contrary|oblique|similar|parallel|none)>(P|I|D)$/.test(k)));
  // Over Fux's second-species solutions (each judged by a model learnt without it), his notes are cheaper than the average legal candidate.
  const lines = fuxLines(repo, "second");
  let fuxCheaper = 0;
  let n = 0;
  for (const a of auditSpecies(repo, "second").slice(0, 6)) {
    const h = buildHabits(lines, "second", [a.line.exerciseId]);
    for (const u of a.units) {
      const legal = u.candidates.filter((c) => c.legal);
      if (legal.length < 2) continue;
      const cost = (p: string) => {
        const m = modelBits(h.features, { layout: a.line.layout, cantus: a.line.cantus, line: a.line.line.map((q, k) => (u.unit.includes(k) ? p : q)), cantusVoice: a.line.cantusVoice, unit: u.unit });
        return m.melodic + m.vertical;
      };
      const mean = legal.reduce((s, c) => s + cost(c.pitch), 0) / legal.length;
      n++;
      if (cost(u.written) < mean) fuxCheaper++;
    }
  }
  assert.ok(fuxCheaper / n > 0.7, `${fuxCheaper}/${n}`);
});

test("two voices: with no error-free line possible, the generator returns the least bad one (strict: it throws)", () => {
  const habits = buildHabits(fuxLines(repo, "first"), "first");
  const cantus = generateCantus({ final: "D", seed: 7 });
  // Only two pitches to choose from: parallels and repetitions cannot all be avoided.
  const o = { species: "first" as const, modalFinal: "D" as ModalFinal, cantusVoice: "lower" as Staff, cantus, rules: rulesForStep(lastStepOf("first")), vocabulary: ["D5", "A4"], habits, seed: 3 };
  const g = generateCounterpoint(o);
  assert.equal(g.line.length, cantus.length);
  assert.ok(g.errors.length > 0 && g.errorSlots.length > 0);
  assert.throws(() => generateCounterpoint({ ...o, strict: true }));
});

import { difficultyOf, spearman } from "../src/counterpoint/choices/difficulty.ts";
test("difficulty: freedom is the mean log2 of the legal pitches; Spearman on ranks", () => {
  const d = difficultyOf([{ legal: 1 }, { legal: 4 }]);
  assert.equal(d.freedom, 1);
  assert.equal(d.forced, 0.5);
  assert.equal(spearman([1, 2, 3], [10, 20, 30]), 1);
  assert.equal(spearman([1, 2, 3], [3, 2, 1]), -1);
});
