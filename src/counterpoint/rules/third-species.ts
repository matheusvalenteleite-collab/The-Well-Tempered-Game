/**
 * Third-species rules (four quarter notes against a whole note), two voices.
 *
 * Page references are to the 1725 print, Exercitii I, Lectio III (pp. 63-69), read from the page
 * scans (gap_p071.pdf ... gap_p077.pdf; printed page = file page - 8).
 *
 * What Fux states: of five quarters moving by step, the first must be consonant, the second may be
 * dissonant, the third must be consonant, the fourth may be dissonant if the fifth is consonant
 * (pp. 63-64). Exception 1: when the second and fourth are consonant, the third may be dissonant:
 * the diminution of a skip of a third (p. 64). Exception 2: the nota cambiata: from a dissonant
 * second note, a skip of a third down to a consonance, taken from the masters for the sake of the
 * melody (pp. 64-65). The penultimate bar has its own formulas (pp. 65-66). Everything said of the
 * other species still holds ("iis, quae de aliis Speciebus jam dicta sunt", p. 66).
 *
 * Reading (D61): with every note moving by step, these cases come to one condition, which the
 * rule checks: a dissonant quarter off the downbeat is a passing note (reached and left by step in
 * one direction), or the cambiata (the second quarter, reached by a step down and left by a skip of
 * a third down to a consonance).
 */
import { harmonic, interval, isConsonant, isLeap, isOctaveClass, isPerfectConsonance, isUnison, motion, type Interval } from "../interval.ts";
import { MELODIC_FORBIDDEN } from "./first-species.ts";
import type { Analysis, NoteEvent, Rule, Violation } from "./types.ts";
import type { SpeciesId } from "../layout.ts";

const P = "Gradus (1725), Exercitii I, Lectio III";

export const v = (rule: Rule, positions: number[], detail?: Violation["detail"]): Violation => ({
  ruleId: rule.id,
  positions,
  severity: rule.severity,
  messageKey: rule.messageKey,
  ...(detail ? { detail } : {}),
});
export const vert = (e: NoteEvent): Interval => harmonic(e.cantus, e.counterpoint);
export const pairs = (a: Analysis) => a.events.slice(1).map((e, i) => [a.events[i], e] as const);
export const moveOf = (x: NoteEvent, y: NoteEvent) => motion(x.cantus, x.counterpoint, y.cantus, y.counterpoint);

export const ruleBase = (species: SpeciesId, id: string, severity: Rule["severity"], attribution: Rule["attribution"], messageKey = `rule.${id}`): Omit<Rule, "check"> => ({
  id,
  source: "fux",
  severity,
  species: [species],
  voicing: "any",
  messageKey,
  attribution,
});
const base = (id: string, severity: Rule["severity"], attribution: Rule["attribution"], messageKey?: string) => ruleBase("third", id, severity, attribution, messageKey);

const step = (a: string, b: string) => interval(a, b).number === 2;
const sameWay = (a: string, b: string, c: string) => interval(a, b).direction === interval(b, c).direction;
const down = (a: string, b: string) => interval(a, b).direction === "down";

export const downbeatConsonance: Rule = {
  ...base("ts.downbeat-consonance", "error", { status: "verified", ref: `${P}, pp. 63-64`, note: "'prima Consonans esse debeat'." }),
  check(a) {
    return a.events.filter((e) => e.beat === 0 && !isConsonant(vert(e))).map((e) => v(this, [e.slot], { interval: vert(e).name }));
  },
};

export const dissonance: Rule = {
  ...base("ts.dissonance", "error", {
    status: "verified",
    ref: `${P}, pp. 63-65`,
    note: "A dissonant quarter off the downbeat must pass by step (the second and fourth; the third when it fills a skip of a third, p. 64), or be the cambiata: the second quarter, left by a skip of a third down to a consonance (pp. 64-65).",
  }),
  check(a) {
    const out: Violation[] = [];
    a.events.forEach((e, i) => {
      if (e.beat === 0 || isConsonant(vert(e))) return;
      const prev = a.events[i - 1];
      const next = a.events[i + 1];
      const passing = !!prev && !!next && step(prev.counterpoint, e.counterpoint) && step(e.counterpoint, next.counterpoint) && sameWay(prev.counterpoint, e.counterpoint, next.counterpoint);
      const cambiata =
        e.beat === 1 &&
        !!prev &&
        !!next &&
        prev.bar === e.bar &&
        step(prev.counterpoint, e.counterpoint) &&
        down(prev.counterpoint, e.counterpoint) &&
        interval(e.counterpoint, next.counterpoint).number === 3 &&
        down(e.counterpoint, next.counterpoint) &&
        isConsonant(vert(next));
      if (!passing && !cambiata) out.push(v(this, [e.slot], { interval: vert(e).name }));
    });
    return out;
  },
};

export const cadence: Rule = {
  ...base("ts.cadence", "error", {
    status: "verified",
    ref: `${P}, pp. 65-66`,
    note: "The penultimate bar ends on the note below the final (cantus below: a major sixth; cantus above: a minor third), which then rises to the octave or unison.",
  }),
  check(a) {
    const last = a.events.filter((e) => e.bar === a.bars - 2);
    const e = last[last.length - 1];
    if (!e) return [];
    const i = vert(e);
    const below = a.input.cantusVoice === "lower";
    const ok = below ? i.quality === "M" && i.simple === 6 : i.quality === "m" && i.simple === 3;
    return ok ? [] : [v(this, [e.slot], { interval: i.name, expected: below ? "M6" : "m3" })];
  },
};

/** The first-species precepts that every species keeps (p. 66: "iis, quae de aliis Speciebus jam dicta sunt"). */
export function carriedRules(species: SpeciesId, prefix: string, P: string, page: string): Rule[] {
  const b = (id: string, severity: Rule["severity"], attribution: Rule["attribution"], messageKey: string) => ruleBase(species, `${prefix}.${id}`, severity, attribution, messageKey);
  const recalled = `First-species precept, kept in this species (${P}, p. ${page}).`;
  const opening: Rule = {
    ...b("opening-perfect", "error", { status: "verified", ref: "Gradus (1725), Exercitii I, Lectio I, pp. 47-49", note: `${recalled} Applied to the first note sung (after the rest, if any).` }, "rule.fs.opening-perfect"),
    check(a) {
      const e = a.events[0];
      const i = vert(e);
      const ok = a.input.cantusVoice === "lower" ? isPerfectConsonance(i) : isOctaveClass(i);
      return ok ? [] : [v(this, [e.slot], { interval: i.name })];
    },
  };
  const final: Rule = {
    ...b("final-octave-or-unison", "error", { status: "verified", ref: "Gradus (1725), Exercitii I, Lectio I, p. 48", note: recalled }, "rule.fs.final-octave-or-unison"),
    check(a) {
      const e = a.events[a.events.length - 1];
      return isOctaveClass(vert(e)) ? [] : [v(this, [e.slot], { interval: vert(e).name })];
    },
  };
  const approach: Rule = {
    ...b("perfect-approach", "error", { status: "verified", ref: "Gradus (1725), Exercitii I, Lectio I, pp. 47-50", note: `${recalled} Checked between successive notes (both voices move only across the bar line).` }, "rule.fs.perfect-approach"),
    check(a) {
      return pairs(a).flatMap(([x, y]) => {
        if (!isPerfectConsonance(vert(y))) return [];
        const m = moveOf(x, y);
        return m === "similar" || m === "parallel" ? [v(this, [x.slot, y.slot], { motion: m, from: vert(x).name, to: vert(y).name })] : [];
      });
    },
  };
  const melodic = (id: string, fsId: string, ref: string, forbidden: (i: Interval) => boolean): Rule => ({
    ...b(id, "error", { status: "verified", ref, note: recalled }, `rule.${fsId}`),
    check(a) {
      return pairs(a).flatMap(([x, y]) => {
        const i = interval(x.counterpoint, y.counterpoint);
        return forbidden(i) ? [v(this, [x.slot, y.slot], { interval: i.name, direction: i.direction })] : [];
      });
    },
  });
  const converging: Rule = {
    ...b("converging-leap-into-octave", "error", { status: "verified", ref: "Gradus (1725), Exercitii I, Lectio I, p. 54", note: recalled }, "rule.fs.converging-leap-into-octave"),
    check(a) {
      return pairs(a).flatMap(([x, y]) => {
        const now = vert(y);
        if (!isOctaveClass(now) || moveOf(x, y) !== "contrary") return [];
        const leap = isLeap(interval(x.cantus, y.cantus)) || isLeap(interval(x.counterpoint, y.counterpoint));
        return leap && vert(x).semitones > now.semitones ? [v(this, [x.slot, y.slot], { from: vert(x).name, to: now.name })] : [];
      });
    },
  };
  const unison: Rule = {
    ...b("unison-only-at-ends", "error", { status: "verified", ref: "Gradus (1725), Exercitii I, Lectio I, pp. 53-54", note: `${recalled} Checked on interior downbeats only, as in second species (D35).` }, "rule.fs.unison-only-at-ends"),
    check(a) {
      return a.events.filter((e) => e.beat === 0 && !e.tied && e.bar > 0 && e.bar < a.bars - 1 && isUnison(vert(e))).map((e) => v(this, [e.slot]));
    },
  };
  return [
    opening,
    final,
    approach,
    melodic("melodic-tritone", "fs.melodic-tritone", "Gradus (1725), Exercitii I, Lectio I, pp. 51-52", MELODIC_FORBIDDEN.tritone),
    melodic("melodic-major-sixth", "fs.melodic-major-sixth", "Gradus (1725), Exercitii I, Lectio I, p. 53", MELODIC_FORBIDDEN.majorSixth),
    converging,
    unison,
  ];
}

export const THIRD_SPECIES_FUX_STRICT: readonly Rule[] = [downbeatConsonance, dissonance, cadence, ...carriedRules("third", "ts", P, "66")];
