/**
 * "modern-additions": rules from modern pedagogy, not from the Gradus.
 * Never part of fux-strict, never exposed to the player; enabled only by a developer flag
 * (see src/config.ts). Severities and the voice-distance limit are provisional.
 */
import { harmonic, interval, isImperfectConsonance, motion } from "../interval.ts";
import { parsePitch } from "../../music/pitch.ts";
import type { Rule, Violation } from "./types.ts";

const base = {
  source: "modern" as const,
  severity: "warning" as const,
  species: ["first" as const],
  voicing: "any" as const,
  attribution: { status: "unverified" as const, note: "Modern pedagogical addition; not in the Gradus." },
};

export const maxThreeParallelImperfect: Rule = {
  ...base,
  id: "modern.max-three-parallel-imperfect",
  messageKey: "rule.modern.max-three-parallel-imperfect",
  check(a) {
    const out: Violation[] = [];
    let run: number[] = [0];
    const flush = () => {
      if (run.length > 3) out.push({ ruleId: this.id, positions: run, severity: this.severity, messageKey: this.messageKey });
    };
    for (let k = 1; k < a.length; k++) {
      const prev = harmonic(a.cantus[k - 1], a.counterpoint[k - 1]);
      const cur = harmonic(a.cantus[k], a.counterpoint[k]);
      const m = motion(a.cantus[k - 1], a.counterpoint[k - 1], a.cantus[k], a.counterpoint[k]);
      const continues = isImperfectConsonance(prev) && isImperfectConsonance(cur) && prev.simple === cur.simple && (m === "parallel" || m === "similar");
      if (continues) run.push(k);
      else {
        flush();
        run = [k];
      }
    }
    flush();
    return out;
  },
};

export const noRepeatedClimax: Rule = {
  ...base,
  id: "modern.no-repeated-climax",
  messageKey: "rule.modern.no-repeated-climax",
  check(a) {
    const midis = a.counterpoint.map((p) => parsePitch(p).midi);
    const top = Math.max(...midis);
    const at = midis.flatMap((m, k) => (m === top ? [k] : []));
    return at.length > 1 ? [{ ruleId: this.id, positions: at, severity: this.severity, messageKey: this.messageKey }] : [];
  },
};

/** The limit (a tenth or a twelfth) is still to be decided; `maxNumber` is the generic size allowed. */
export function voiceDistanceLimit(maxNumber: number): Rule {
  return {
    ...base,
    id: "modern.voice-distance-limit",
    messageKey: "rule.modern.voice-distance-limit",
    pending: "Limit (tenth or twelfth) to be decided.",
    check(a) {
      const out: number[] = [];
      for (let k = 0; k < a.length; k++) if (interval(a.cantus[k], a.counterpoint[k]).number > maxNumber) out.push(k);
      return out.length ? [{ ruleId: this.id, positions: out, severity: this.severity, messageKey: this.messageKey, detail: { maxNumber } }] : [];
    },
  };
}
