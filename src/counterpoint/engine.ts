/**
 * Rule engine: pure evaluation of (cantus, counterpoint) under a preset.
 * Malformed input throws; it is never silently repaired.
 */
import { DEFAULT_DEV_CONFIG, type DevConfig } from "../config.ts";
import { parsePitch } from "../music/pitch.ts";
import { FIRST_SPECIES_FUX_STRICT } from "./rules/first-species.ts";
import { SECOND_SPECIES_FUX_STRICT } from "./rules/second-species.ts";
import { slotLayout } from "./layout.ts";
import { maxThreeParallelImperfect, noRepeatedClimax, voiceDistanceLimit } from "./rules/modern-additions.ts";
import type { Analysis, CounterpointInput, Rule, Violation } from "./rules/types.ts";

export type PresetId = "fux-strict";

/** The only player-facing preset. */
export function presetRules(preset: PresetId = "fux-strict", config: DevConfig = DEFAULT_DEV_CONFIG): Rule[] {
  if (preset !== "fux-strict") throw new Error(`unknown preset ${preset}`);
  const rules: Rule[] = [...FIRST_SPECIES_FUX_STRICT, ...SECOND_SPECIES_FUX_STRICT];
  if (config.enableModernAdditions) {
    rules.push(maxThreeParallelImperfect, noRepeatedClimax);
    if (config.modernVoiceDistanceLimit !== null) rules.push(voiceDistanceLimit(config.modernVoiceDistanceLimit));
  }
  return rules;
}

export class MalformedInputError extends Error {}

export function analyse(input: CounterpointInput): Analysis {
  const { cantus, counterpoint } = input;
  if (input.species !== "first" && input.species !== "second") throw new MalformedInputError(`unsupported species ${input.species}`);
  if (cantus.length < 2) throw new MalformedInputError("cantus firmus needs at least two notes");
  const cf = cantus.map((n, k) => {
    if (n.pitch === null) throw new MalformedInputError(`cantus bar ${k}: rest`);
    if (n.duration !== "1/1") throw new MalformedInputError(`cantus bar ${k}: whole notes expected, got ${n.duration}`);
    parsePitch(n.pitch); // throws on malformed spelling
    return n.pitch;
  });
  const layout = slotLayout(input.species, cf.length);
  if (counterpoint.length !== layout.length) {
    throw new MalformedInputError(`${input.species} species needs ${layout.length} counterpoint notes against ${cf.length} cantus notes, got ${counterpoint.length}`);
  }
  const events = counterpoint.flatMap((n, k) => {
    const slot = layout[k];
    if (n.duration !== slot.duration) throw new MalformedInputError(`counterpoint note ${k}: expected ${slot.duration}, got ${n.duration}`);
    if (n.pitch === null) {
      if (!slot.restAllowed) throw new MalformedInputError(`counterpoint note ${k}: a rest is not allowed here`);
      return [];
    }
    parsePitch(n.pitch);
    return [{ slot: k, bar: slot.bar, beat: slot.beat, cantus: cf[slot.bar], counterpoint: n.pitch }];
  });
  const first = input.species === "first";
  return {
    input,
    cantus: first ? cf : [],
    counterpoint: first ? events.map((e) => e.counterpoint) : [],
    length: first ? cf.length : 0,
    events,
    bars: cf.length,
  };
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
