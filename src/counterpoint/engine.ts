/**
 * Rule engine: pure evaluation of (cantus, counterpoint) under a preset.
 * Malformed input throws; it is never silently repaired.
 */
import { DEFAULT_DEV_CONFIG, type DevConfig } from "../config.ts";
import { parsePitch } from "../music/pitch.ts";
import { FIRST_SPECIES_FUX_STRICT } from "./rules/first-species.ts";
import { SECOND_SPECIES_FUX_STRICT } from "./rules/second-species.ts";
import { THIRD_SPECIES_FUX_STRICT } from "./rules/third-species.ts";
import { FOURTH_SPECIES_FUX_STRICT } from "./rules/fourth-species.ts";
import { FIFTH_SPECIES_FUX_STRICT } from "./rules/fifth-species.ts";
import { HOLD, noteSpan, REST, slotLayout, slotLength, slotOffset } from "./layout.ts";
import { maxThreeParallelImperfect, noRepeatedClimax, voiceDistanceLimit } from "./rules/modern-additions.ts";
import type { Analysis, CounterpointInput, NoteEvent, Rule, Violation } from "./rules/types.ts";

export type PresetId = "fux-strict";

/** The only player-facing preset. */
export function presetRules(preset: PresetId = "fux-strict", config: DevConfig = DEFAULT_DEV_CONFIG): Rule[] {
  if (preset !== "fux-strict") throw new Error(`unknown preset ${preset}`);
  const rules: Rule[] = [...FIRST_SPECIES_FUX_STRICT, ...SECOND_SPECIES_FUX_STRICT, ...THIRD_SPECIES_FUX_STRICT, ...FOURTH_SPECIES_FUX_STRICT, ...FIFTH_SPECIES_FUX_STRICT];
  if (config.enableModernAdditions) {
    rules.push(maxThreeParallelImperfect, noRepeatedClimax);
    if (config.modernVoiceDistanceLimit !== null) rules.push(voiceDistanceLimit(config.modernVoiceDistanceLimit));
  }
  return rules;
}

export class MalformedInputError extends Error {}

export function analyse(input: CounterpointInput): Analysis {
  const { cantus, counterpoint } = input;
  if (!["first", "second", "third", "fourth", "fifth"].includes(input.species)) throw new MalformedInputError(`unsupported species ${input.species}`);
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
  if (input.species === "fifth") return analyseFifth(input, cf, layout);
  const events = counterpoint.flatMap((n, k) => {
    const slot = layout[k];
    if (n.duration !== slot.duration) throw new MalformedInputError(`counterpoint note ${k}: expected ${slot.duration}, got ${n.duration}`);
    if (n.pitch === null) {
      if (!slot.restAllowed) throw new MalformedInputError(`counterpoint note ${k}: a rest is not allowed here`);
      return [];
    }
    parsePitch(n.pitch);
    const prev = counterpoint[k - 1];
    const tied = input.species === "fourth" && slot.beat === 0 && k > 0 && layout[k - 1].beat === 1 && prev?.pitch === n.pitch;
    return [{ slot: k, bar: slot.bar, beat: slot.beat, cantus: cf[slot.bar], counterpoint: n.pitch, ...(tied ? { tied: true } : {}) }];
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

/**
 * Fifth species (D82): one event per note begun (its onset, position in the bar and whole length,
 * ties included), and one more at each bar line a note is held over (`tied`), so that the rules
 * of the downbeat see the suspensions.
 */
function analyseFifth(input: CounterpointInput, cf: string[], layout: ReturnType<typeof slotLayout>): Analysis {
  const line = input.counterpoint.map((n, k) => {
    const slot = layout[k];
    if (n.duration !== slot.duration) throw new MalformedInputError(`counterpoint slot ${k}: expected ${slot.duration}, got ${n.duration}`);
    if (n.pitch === null) {
      if (!slot.restAllowed) throw new MalformedInputError(`counterpoint slot ${k}: a rest is not allowed here`);
      return REST;
    }
    if (n.pitch !== HOLD) parsePitch(n.pitch);
    return n.pitch;
  });
  if (line[0] === HOLD) throw new MalformedInputError("the counterpoint cannot begin with a held note");
  const events: NoteEvent[] = [];
  let current: string | null = null;
  let end = 0;
  line.forEach((v, k) => {
    const slot = layout[k];
    const at = slotOffset(slot);
    if (v !== HOLD) {
      current = v === REST ? null : v;
      const span = noteSpan(line, k)!;
      const last = layout[Math.min(layout.length - 1, k + span.slots - 1)];
      end = slotOffset(last) + slotLength(last);
      if (current) events.push({ slot: k, bar: slot.bar, beat: slot.beat, pos: at - slot.bar, len: end - at, cantus: cf[slot.bar], counterpoint: current });
    } else if (slot.beat === 0 && current) {
      // Held over the bar line: the same note, sounding on this downbeat.
      events.push({ slot: k, bar: slot.bar, beat: 0, pos: 0, len: end - at, cantus: cf[slot.bar], counterpoint: current, tied: true });
    }
  });
  return { input, cantus: [], counterpoint: [], length: 0, events, bars: cf.length };
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
