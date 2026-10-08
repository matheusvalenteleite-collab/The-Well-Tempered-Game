/**
 * Rule engine: pure evaluation of (cantus, counterpoint) under a preset.
 * Malformed input throws; it is never silently repaired.
 */
import { DEFAULT_DEV_CONFIG, type DevConfig } from "../config.ts";
import { parsePitch } from "../music/pitch.ts";
import { FIRST_SPECIES_FUX_STRICT } from "./rules/first-species.ts";
import { maxThreeParallelImperfect, noRepeatedClimax, voiceDistanceLimit } from "./rules/modern-additions.ts";
import type { Analysis, CounterpointInput, Rule, Violation } from "./rules/types.ts";

export type PresetId = "fux-strict";

/** The only player-facing preset. */
export function presetRules(preset: PresetId = "fux-strict", config: DevConfig = DEFAULT_DEV_CONFIG): Rule[] {
  if (preset !== "fux-strict") throw new Error(`unknown preset ${preset}`);
  const rules: Rule[] = [...FIRST_SPECIES_FUX_STRICT];
  if (config.enableModernAdditions) {
    rules.push(maxThreeParallelImperfect, noRepeatedClimax);
    if (config.modernVoiceDistanceLimit !== null) rules.push(voiceDistanceLimit(config.modernVoiceDistanceLimit));
  }
  return rules;
}

export class MalformedInputError extends Error {}

export function analyse(input: CounterpointInput): Analysis {
  const { cantus, counterpoint } = input;
  if (input.species !== "first") throw new MalformedInputError(`unsupported species ${input.species}`);
  if (cantus.length < 2) throw new MalformedInputError("cantus firmus needs at least two notes");
  if (counterpoint.length !== cantus.length) {
    throw new MalformedInputError(`first species needs one counterpoint note per cantus note (${counterpoint.length} vs ${cantus.length})`);
  }
  const pitches = (voice: typeof cantus, label: string) =>
    voice.map((n, k) => {
      if (n.pitch === null) throw new MalformedInputError(`${label} column ${k}: rests are not allowed in first species`);
      if (n.duration !== "1/1") throw new MalformedInputError(`${label} column ${k}: first species uses whole notes, got ${n.duration}`);
      parsePitch(n.pitch); // throws on malformed spelling
      return n.pitch;
    });
  return { input, cantus: pitches(cantus, "cantus"), counterpoint: pitches(counterpoint, "counterpoint"), length: cantus.length };
}

/** Rules of `rules` that apply to this input (species, voicing, final). */
export function applicableRules(input: CounterpointInput, rules: Rule[]): Rule[] {
  return rules.filter(
    (r) =>
      r.species.includes(input.species) &&
      (r.voicing === "any" || (r.voicing === "cantus-below" && input.cantusVoice === "lower")) &&
      (!r.finals || r.finals.includes(input.modalFinal)),
  );
}

export interface Evaluation {
  violations: Violation[];
  errors: Violation[];
  warnings: Violation[];
  /** True when no error-severity rule is violated. */
  passed: boolean;
  rulesApplied: string[];
}

export function evaluate(input: CounterpointInput, rules: Rule[] = presetRules()): Evaluation {
  const a = analyse(input);
  const applied = applicableRules(input, rules);
  const violations = applied.flatMap((r) => r.check(a));
  const errors = violations.filter((x) => x.severity === "error");
  return { violations, errors, warnings: violations.filter((x) => x.severity === "warning"), passed: errors.length === 0, rulesApplied: applied.map((r) => r.id) };
}
