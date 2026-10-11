/**
 * Bach as the last word, laxly (D132, the owner: Bach "broke some of the rules in his writing …
 * so, Bach is the last word should mean something laxer"). The countersubject checker stays strict;
 * but a fault of a kind Bach himself commits in his two-voice writing in the 48 (data/wtc/licences.json,
 * tools/wtc/licences.ts) is shown as a licence: a warning naming where Bach takes it, not an error.
 */
import data from "../../data/wtc/licences.json" with { type: "json" };
import type { CpEvaluation, CpViolation } from "./counterpoint.ts";
import { keyName } from "./fugues.ts";
import { LIBRARY } from "./library.ts";

interface Licence {
  count: number;
  fugues: string[];
  places: { id: string; bar: number; voice: number }[];
}
const LICENCES = data as unknown as Record<string, Licence>;

/** The rule and the interval reduced to within an octave (a ninth is a second, a twelfth a fifth). */
export function licenceKey(ruleId: string, interval?: string): string {
  const m = /^([A-Za-z]+)(\d+)$/.exec(interval ?? "");
  return `${ruleId}|${m ? `${m[1]}${((Number(m[2]) - 1) % 7) + 1}` : interval ?? ""}`;
}

/** Where Bach takes this licence, if he does: "Book I, Fugue 6 in D minor, bar 27". */
export function bachPlace(v: CpViolation): { where: string; count: number } | null {
  const l = LICENCES[licenceKey(v.ruleId, v.detail?.interval)];
  if (!l) return null;
  const p = l.places[0];
  const e = LIBRARY.find((x) => x.id === p.id);
  if (!e) return null;
  return { where: `Book ${e.book === 1 ? "I" : "II"}, Fugue ${e.number} in ${keyName(e.key)}, bar ${p.bar}`, count: l.count };
}

/** The evaluation with Bach's licences as warnings: it passes if only licences remain. */
export function withLicences(ev: CpEvaluation): CpEvaluation {
  const violations = ev.violations.map((v) => {
    if (v.severity !== "error") return v;
    const b = bachPlace(v);
    return b ? { ...v, severity: "warning" as const, detail: { ...v.detail, bach: b.where, bachCount: String(b.count) } } : v;
  });
  const errors = violations.filter((v) => v.severity === "error");
  return { violations, errors, warnings: violations.filter((v) => v.severity === "warning"), passed: errors.length === 0 };
}
