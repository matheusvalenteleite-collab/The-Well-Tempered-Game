/**
 * M1 golden analyses over Fux's own material. Used by test/m1-golden.test.ts and by
 * tools/m1/report.ts. Nothing here changes the data or the rules; it measures and reports.
 */
import type { FuxRepository } from "../../src/music/fux/repository.ts";
import type { Exercise, Note, OriginalSolution } from "../../src/music/fux/types.ts";
import { applicableRules, evaluate, presetRules } from "../../src/counterpoint/engine.ts";
import { harmonic, interval } from "../../src/counterpoint/interval.ts";
import type { CounterpointInput, Violation } from "../../src/counterpoint/rules/types.ts";
import { profileCantus } from "../../src/counterpoint/analysis/cantus-profile.ts";
import { MELODIC_FORBIDDEN, melodicMajorSixth, melodicTritone } from "../../src/counterpoint/rules/first-species.ts";

export function inputFor(ex: Exercise, sol: OriginalSolution, counterpoint?: string[]): CounterpointInput {
  return {
    species: "first",
    modalFinal: ex.modal_final,
    cantusVoice: ex.cantus_voice,
    cantus: sol.cantus_firmus.notes.map((n) => ({ pitch: n.pitch, duration: n.duration })),
    counterpoint: (counterpoint ?? sol.counterpoint.notes.map((n) => n.pitch as string)).map((p) => ({ pitch: p, duration: "1/1" })),
  };
}

export interface GoldenResult {
  exercise_id: string;
  figure: string;
  modal_final: string;
  cantus_voice: string;
  rules_applied: string[];
  errors: Violation[];
  warnings: Violation[];
  /** Rules stated for cantus-below that were not applied (cantus above), with what they would report. */
  not_applied_cantus_below_rules: { ruleId: string; would_report: Violation[] }[];
}

/** 1. Every first-species original solution through fux-strict. */
export function goldenFirstSpecies(repo: FuxRepository): GoldenResult[] {
  const rules = presetRules();
  return repo.listExercises({ species: "first" }).map((ex) => {
    const sol = repo.getSolution(ex.id)!;
    const input = inputFor(ex, sol);
    const ev = evaluate(input, rules);
    const applied = new Set(ev.rulesApplied);
    const forced = { ...input, cantusVoice: "lower" as const };
    const notApplied = applicableRules(forced, rules)
      .filter((r) => !applied.has(r.id))
      .map((r) => ({ ruleId: r.id, would_report: evaluate(forced, [r]).violations }));
    return {
      exercise_id: ex.id,
      figure: ex.figure,
      modal_final: ex.modal_final,
      cantus_voice: ex.cantus_voice,
      rules_applied: ev.rulesApplied,
      errors: ev.errors,
      warnings: ev.warnings,
      not_applied_cantus_below_rules: notApplied,
    };
  });
}

/** 1b. The superseded published reading of Fig. 22 (kept in the dataset as an alternative reading). */
export function goldenFig22PublishedReading(repo: FuxRepository) {
  const ex = repo.getExercise("fux_2v_fig_022")!;
  const sol = repo.getSolution(ex.id)!;
  const alt = sol.source.alternative_readings["musicxml_published"]?.["counterpoint"];
  if (!alt) throw new Error("Fig. 22: published reading missing from the dataset");
  const pitches = alt.map((s) => /^@\S+ (\S+) dur=/.exec(s)![1]);
  return { counterpoint: pitches, evaluation: evaluate(inputFor(ex, sol, pitches)) };
}

/** 2. Engine intervals vs every source annotation (all species). */
export function crossCheckAnnotations(repo: FuxRepository) {
  let compared = 0;
  const mismatches: { exercise_id: string; measure: number; beat: string; source: string; engine: string; notes: string }[] = [];
  for (const set of repo.dataset.annotations) {
    for (const it of set.items) {
      if (!it.counterpoint_note || !it.cantus_note) throw new Error(`${set.exercise_id}: annotation without both notes`);
      compared++;
      const engine = harmonic(it.counterpoint_note, it.cantus_note).name;
      if (engine !== it.interval) {
        mismatches.push({ exercise_id: set.exercise_id, measure: it.measure, beat: it.beat, source: it.interval, engine, notes: `${it.counterpoint_note}/${it.cantus_note}` });
      }
    }
  }
  return { compared, mismatches };
}

/** 3. Widest distance between the voices in each first-species solution. */
export function widestDistances(repo: FuxRepository) {
  const rows = repo.listExercises({ species: "first" }).map((ex) => {
    const sol = repo.getSolution(ex.id)!;
    let best = { column: -1, interval: "", semitones: -1, number: 0, cantus: "", counterpoint: "" };
    sol.cantus_firmus.notes.forEach((cf, k) => {
      const cp = sol.counterpoint.notes[k];
      const i = harmonic(cf.pitch!, cp.pitch!);
      if (i.semitones > best.semitones) best = { column: k, interval: i.name, semitones: i.semitones, number: i.number, cantus: cf.pitch!, counterpoint: cp.pitch! };
    });
    return { exercise_id: ex.id, figure: ex.figure, cantus_voice: ex.cantus_voice, ...best, measure: best.column + 1 };
  });
  const max = Math.max(...rows.map((r) => r.semitones));
  return { rows, maximum: rows.filter((r) => r.semitones === max) };
}

/** Consecutive sounding notes of a voice (ties merged, rests skipped but recorded). */
function melodicPairs(notes: Note[]) {
  const out: { from: Note; to: Note; acrossRest: boolean }[] = [];
  let prev: Note | null = null;
  let rest = false;
  for (const n of notes) {
    if (n.rest) {
      rest = prev !== null;
      continue;
    }
    if (n.tie === "stop" || n.tie === "continue") continue;
    if (prev) out.push({ from: prev, to: n, acrossRest: rest });
    prev = n;
    rest = false;
  }
  return out;
}

/** 4. Every melodic leap in every Fux solution (all species) against the melodic rules. */
export function melodicLeapAudit(repo: FuxRepository) {
  const tests = [
    { rule: melodicTritone.id, bad: MELODIC_FORBIDDEN.tritone },
    { rule: melodicMajorSixth.id, bad: MELODIC_FORBIDDEN.majorSixth },
  ];
  const inventory: Record<string, number> = {};
  const offending: { exercise_id: string; species: string; voice: string; measure: number; beat: string; from: string; to: string; interval: string; direction: string; rule: string; acrossRest: boolean }[] = [];
  let leaps = 0;
  for (const ex of repo.listExercises()) {
    const sol = repo.getSolution(ex.id)!;
    for (const { from, to, acrossRest } of melodicPairs(sol.counterpoint.notes)) {
      const i = interval(from.pitch!, to.pitch!);
      const key = `${i.direction === "up" ? "+" : i.direction === "down" ? "-" : "="}${i.name}`;
      inventory[key] = (inventory[key] ?? 0) + 1;
      if (i.number >= 3) leaps++;
      for (const t of tests) {
        if (t.bad(i)) offending.push({ exercise_id: ex.id, species: ex.species, voice: "counterpoint", measure: to.measure, beat: to.beat, from: from.pitch!, to: to.pitch!, interval: i.name, direction: i.direction, rule: t.rule, acrossRest });
      }
    }
  }
  return { leaps, inventory, offending };
}

/** 5. Profiles of Fux's cantus firmi (the CFs used by the exercises, one per family). */
export function cantusReport(repo: FuxRepository) {
  return repo.listCantusFirmi().map((cf) => ({
    cf_id: cf.cf_id,
    modal_final: cf.modal_final,
    figures: cf.source_figures,
    variant: cf.cf_id.endsWith("_01") ? "principal" : "variant",
    profile: profileCantus(cf.pitch_sequence, cf.modal_final),
  }));
}
