/**
 * Rule demonstrations (D103): for each idea behind the rules, a short excerpt done wrong and the
 * same excerpt done right, shown in turn as a looping stop-motion (RuleDemo). Every excerpt is
 * checked by the engine (test/rule-demos.test.ts): the wrong one breaks the rule it shows, the
 * right one does not. Cantus below, counterpoint above, in the D mode unless stated.
 */
import type { SpeciesId } from "../counterpoint/layout.ts";

export interface RuleDemo {
  species: SpeciesId;
  cantus: string[];
  wrong: string[];
  right: string[];
  /** The rule the wrong version breaks (as the engine names it). */
  ruleId: string;
}

const first = (cantus: string[], wrong: string[], right: string[], ruleId: string): RuleDemo => ({ species: "first", cantus, wrong, right, ruleId });

/** Demonstrations by idea; rule ids of every species point to them through demoFor. */
export const DEMOS: Record<string, RuleDemo> = {
  consonance: first(["D4", "F4", "E4"], ["A4", "G4", "G4"], ["A4", "A4", "G4"], "fs.vertical-consonance"),
  "perfect-approach": first(["D4", "E4", "F4"], ["A4", "B4", "C5"], ["A4", "G4", "A4"], "fs.perfect-approach"),
  "opening-perfect": first(["D4", "E4", "F4"], ["F4", "G4", "A4"], ["A4", "G4", "A4"], "fs.opening-perfect"),
  "final-octave-or-unison": first(["F4", "E4", "D4"], ["A4", "C#5", "A4"], ["A4", "C#5", "D5"], "fs.final-octave-or-unison"),
  cadence: first(["F4", "E4", "D4"], ["A4", "C5", "D5"], ["A4", "C#5", "D5"], "fs.cadence"),
  "melodic-tritone": first(["D4", "G4", "F4"], ["F4", "B4", "A4"], ["F4", "E4", "A4"], "fs.melodic-tritone"),
  "melodic-major-sixth": first(["D4", "B3", "C4"], ["F4", "D5", "E4"], ["F4", "G4", "E4"], "fs.melodic-major-sixth"),
  "unison-only-at-ends": first(["D4", "F4", "E4"], ["A4", "F4", "G4"], ["A4", "A4", "G4"], "fs.unison-only-at-ends"),
  "converging-leap-into-octave": first(["A3", "B3", "C4"], ["E5", "B4", "A4"], ["E5", "D5", "E5"], "fs.converging-leap-into-octave"),
  "passing-dissonance": { species: "second", cantus: ["D4", "F4", "E4"], wrong: ["F4", "G4", "D5", "A4", "C5"], right: ["F4", "G4", "A4", "B4", "C5"], ruleId: "ss.passing-dissonance" },
  "no-repetition": { species: "second", cantus: ["D4", "F4", "E4"], wrong: ["A4", "A4", "A4", "A4", "C5"], right: ["A4", "F4", "A4", "B4", "C5"], ruleId: "ss.no-repetition" },
};

/** The demonstration of a rule (by the idea it shares with the other species), if there is one. */
export function demoFor(ruleId: string): RuleDemo | null {
  const idea = ruleId.replace(/^[a-z0-9]+\./, "");
  if (idea === "vertical-consonance" || idea === "downbeat-consonance") return DEMOS.consonance;
  if (idea === "cadence") return ruleId === "fs.cadence" ? DEMOS.cadence : null;
  return DEMOS[idea] ?? null;
}
