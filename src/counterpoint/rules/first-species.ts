/**
 * First-species rules (note against note), two voices.
 *
 * Page references are to the 1725 print, Exercitii I, Lectio I (pp. 45-55), read from the
 * page scans in the upstream dataset repository (source_pdf/gap_p053.pdf ... gap_p063.pdf).
 * Printed p. 46 is not among those scans, and Liber I (where Fux states the rules of motion
 * he refers back to) is not either. Rules not found in this text are not part of Fux mode
 * (owner decision); see docs/DECISIONS.md.
 */
import {
  harmonic,
  interval,
  isAbove,
  isConsonant,
  isImperfectConsonance,
  isLeap,
  isOctaveClass,
  isPerfectConsonance,
  isUnison,
  motion,
  type Interval,
} from "../interval.ts";
import type { Analysis, Rule, Violation } from "./types.ts";

const P = "Gradus (1725), Exercitii I, Lectio I";

const v = (rule: Rule, positions: number[], detail?: Violation["detail"]): Violation => ({
  ruleId: rule.id,
  positions,
  severity: rule.severity,
  messageKey: rule.messageKey,
  ...(detail ? { detail } : {}),
});

const vertical = (a: Analysis, k: number): Interval => harmonic(a.cantus[k], a.counterpoint[k]);
const columns = (a: Analysis) => Array.from({ length: a.length }, (_, k) => k);

export const verticalConsonance: Rule = {
  id: "fs.vertical-consonance",
  source: "fux",
  severity: "error",
  species: ["first"],
  voicing: "any",
  messageKey: "rule.fs.vertical-consonance",
  attribution: { status: "verified", ref: `${P}, p. 45`, note: "First species consists of consonances only ('meris Consonantiis constans')." },
  check(a) {
    return columns(a).flatMap((k) => {
      const i = vertical(a, k);
      return isConsonant(i) ? [] : [v(this, [k], { interval: i.name })];
    });
  },
};

export const openingPerfect: Rule = {
  id: "fs.opening-perfect",
  source: "fux",
  severity: "error",
  species: ["first"],
  voicing: "any",
  messageKey: "rule.fs.opening-perfect",
  attribution: {
    status: "verified",
    ref: `${P}, pp. 47-49`,
    note: "Begin on a perfect consonance (p. 47). With the counterpoint below, only the octave or unison: an opening fifth below lies outside the mode of the cantus (pp. 48-49). Compound forms are accepted as their simple equivalents.",
  },
  check(a) {
    const i = vertical(a, 0);
    const ok = a.input.cantusVoice === "lower" ? isPerfectConsonance(i) : isOctaveClass(i);
    return ok ? [] : [v(this, [0], { interval: i.name })];
  },
};

export const finalOctaveOrUnison: Rule = {
  id: "fs.final-octave-or-unison",
  source: "fux",
  severity: "error",
  species: ["first"],
  voicing: "any",
  messageKey: "rule.fs.final-octave-or-unison",
  attribution: { status: "verified", ref: `${P}, p. 48`, note: "The final note is a perfect consonance; all of Fux's endings are unisons or octaves." },
  check(a) {
    const k = a.length - 1;
    const i = vertical(a, k);
    return isOctaveClass(i) ? [] : [v(this, [k], { interval: i.name })];
  },
};

export const cadence: Rule = {
  id: "fs.cadence",
  source: "fux",
  severity: "error",
  species: ["first"],
  voicing: "any",
  messageKey: "rule.fs.cadence",
  attribution: {
    status: "verified",
    ref: `${P}, pp. 47 and 49; Lectio II, p. 56`,
    note: "Penultimate major sixth when the cantus is below (p. 47); minor third when the cantus is above (p. 49); then the octave or unison.",
  },
  check(a) {
    const k = a.length - 2;
    const pen = vertical(a, k);
    const fin = vertical(a, k + 1);
    const want = a.input.cantusVoice === "lower" ? { quality: "M", simple: 6 } : { quality: "m", simple: 3 };
    const ok = pen.quality === want.quality && pen.simple === want.simple && isOctaveClass(fin);
    return ok ? [] : [v(this, [k, k + 1], { penultimate: pen.name, final: fin.name, expected: `${want.quality}${want.simple}` })];
  },
};

export const perfectApproach: Rule = {
  id: "fs.perfect-approach",
  source: "fux",
  severity: "error",
  species: ["first"],
  voicing: "any",
  messageKey: "rule.fs.perfect-approach",
  attribution: {
    status: "verified",
    ref: `${P}, pp. 47-50`,
    note: "The rules of motion: to a perfect consonance only by contrary or oblique motion; the hidden fifths/octaves argument on pp. 49-50. (The rules are formally stated at the end of Liber I, which is not among the scans.)",
  },
  check(a) {
    const out: Violation[] = [];
    for (let k = 1; k < a.length; k++) {
      if (!isPerfectConsonance(vertical(a, k))) continue;
      const m = motion(a.cantus[k - 1], a.counterpoint[k - 1], a.cantus[k], a.counterpoint[k]);
      if (m !== "contrary" && m !== "oblique") out.push(v(this, [k - 1, k], { motion: m, from: vertical(a, k - 1).name, to: vertical(a, k).name }));
    }
    return out;
  },
};

export const unisonOnlyAtEnds: Rule = {
  id: "fs.unison-only-at-ends",
  source: "fux",
  severity: "error",
  species: ["first"],
  voicing: "any",
  messageKey: "rule.fs.unison-only-at-ends",
  attribution: { status: "verified", ref: `${P}, pp. 53-54`, note: "'excepto principio, & fine nunquam ponendus est'." },
  check(a) {
    const out: Violation[] = [];
    for (let k = 1; k < a.length - 1; k++) if (isUnison(vertical(a, k))) out.push(v(this, [k]));
    return out;
  },
};

/** Melodic rules for the counterpoint voice; positions are the two notes of the interval. */
function melodicRule(id: string, attribution: Rule["attribution"], forbidden: (i: Interval) => boolean, pending?: string): Rule {
  return {
    id,
    source: "fux",
    severity: "error",
    species: ["first"],
    voicing: "any",
    messageKey: `rule.${id}`,
    attribution,
    ...(pending ? { pending } : {}),
    check(a) {
      const out: Violation[] = [];
      for (let k = 1; k < a.length; k++) {
        const i = interval(a.counterpoint[k - 1], a.counterpoint[k]);
        if (forbidden(i)) out.push(v(this, [k - 1, k], { interval: i.name, direction: i.direction }));
      }
      return out;
    },
  };
}

/** Forbidden-melodic-interval predicates, shared with the golden audits. */
export const MELODIC_FORBIDDEN = {
  /** "saltum Quartae majoris, sive Tritoni" (p. 51-52). The diminished fifth is not named there. */
  tritone: (i: Interval) => i.quality === "A" && i.simple === 4,
  /** "saltum Sextae majoris ... prohibitus est" (p. 53); no direction is specified. */
  majorSixth: (i: Interval) => i.quality === "M" && i.number === 6,
};

export const melodicTritone = melodicRule(
  "fs.melodic-tritone",
  { status: "verified", ref: `${P}, pp. 51-52`, note: "Introduced at Fig. 12 ('mi contra fa, est diabolus in Musica'). Only the augmented fourth is named; the diminished fifth is not checked." },
  MELODIC_FORBIDDEN.tritone,
);

export const melodicMajorSixth = melodicRule(
  "fs.melodic-major-sixth",
  { status: "verified", ref: `${P}, p. 53`, note: "Introduced at Fig. 15 (first version, notes 9-10)." },
  MELODIC_FORBIDDEN.majorSixth,
);

export const convergingLeapIntoOctave: Rule = {
  id: "fs.converging-leap-into-octave",
  source: "fux",
  severity: "error",
  species: ["first"],
  voicing: "any",
  messageKey: "rule.fs.converging-leap-into-octave",
  attribution: {
    status: "verified",
    ref: `${P}, p. 54`,
    note: "'Quòd si autem de remotiore quadam Consonantiâ per saltum lapsus conjunctim in Octavam fiat, nec in Compositione plurium vocum tolerandum puto'; and a fortiori into the unison. The examples ('malè') show the voices converging by contrary motion, one of them leaping. The octava battuta (both voices by step) is left free (pp. 53-54).",
  },
  check(a) {
    const out: Violation[] = [];
    for (let k = 1; k < a.length; k++) {
      const now = vertical(a, k);
      if (!isOctaveClass(now)) continue;
      const before = vertical(a, k - 1);
      const m = motion(a.cantus[k - 1], a.counterpoint[k - 1], a.cantus[k], a.counterpoint[k]);
      const leap = isLeap(interval(a.cantus[k - 1], a.cantus[k])) || isLeap(interval(a.counterpoint[k - 1], a.counterpoint[k]));
      if (m === "contrary" && before.semitones > now.semitones && leap) out.push(v(this, [k - 1, k], { from: before.name, to: now.name }));
    }
    return out;
  },
};

export const unisonLeap: Rule = {
  id: "fs.unison-leap",
  source: "fux",
  severity: "error",
  species: ["first"],
  voicing: "any",
  messageKey: "rule.fs.unison-leap",
  attribution: {
    status: "verified",
    ref: `${P}, pp. 54-55`,
    note: "Introduced at Fig. 21 (NB on the first note): moving from the unison to another consonance by leap, or into the unison by leap, is bad; tolerated there only because the leap is in the cantus, which cannot be changed. Hence only counterpoint leaps are checked.",
  },
  check(a) {
    const out: Violation[] = [];
    for (let k = 1; k < a.length; k++) {
      const leap = isLeap(interval(a.counterpoint[k - 1], a.counterpoint[k]));
      if (leap && (isUnison(vertical(a, k - 1)) || isUnison(vertical(a, k)))) out.push(v(this, [k - 1, k]));
    }
    return out;
  },
};

export const noVoiceCrossing: Rule = {
  id: "fs.no-voice-crossing",
  source: "fux",
  severity: "warning",
  species: ["first"],
  voicing: "any",
  messageKey: "rule.fs.no-voice-crossing",
  attribution: {
    status: "contradicted",
    ref: `${P}, p. 52`,
    note: "Severity set to warning by decision D2. The source approves crossing: in Fig. 14, Fux has the counterpoint cross the cantus (notes 4-7), and Aloysius approves it ('Optimâ observantiâ id fecisti').",
  },
  check(a) {
    const out: number[] = [];
    for (let k = 0; k < a.length; k++) {
      const cf = a.cantus[k];
      const cp = a.counterpoint[k];
      const crossed = a.input.cantusVoice === "lower" ? isAbove(cf, cp) : isAbove(cp, cf);
      if (crossed) out.push(k);
    }
    return out.length ? [v(this, out)] : [];
  },
};

// ---------------------------------------------------------------------------- warnings (fux-strict)

export const preferContraryMotion: Rule = {
  id: "fs.prefer-contrary-motion",
  source: "fux",
  severity: "warning",
  species: ["first"],
  voicing: "any",
  messageKey: "rule.fs.prefer-contrary-motion",
  attribution: { status: "verified", ref: `${P}, p. 45`, note: "'adhibendo ut plurimum, motum contrarium, vel obliquum'." },
  pending: "Operationalization: warn when similar+parallel motions outnumber contrary+oblique ones. Provisional.",
  check(a) {
    let good = 0;
    const bad: number[] = [];
    for (let k = 1; k < a.length; k++) {
      const m = motion(a.cantus[k - 1], a.counterpoint[k - 1], a.cantus[k], a.counterpoint[k]);
      if (m === "contrary" || m === "oblique") good++;
      else if (m === "similar" || m === "parallel") bad.push(k);
    }
    return bad.length > good ? [v(this, bad, { contraryOrOblique: good, similarOrParallel: bad.length })] : [];
  },
};

export const preferImperfectConsonances: Rule = {
  id: "fs.prefer-imperfect-consonances",
  source: "fux",
  severity: "warning",
  species: ["first"],
  voicing: "any",
  messageKey: "rule.fs.prefer-imperfect-consonances",
  attribution: {
    status: "verified",
    ref: `${P}, p. 46`,
    note:
      "Aloysius: perfect and imperfect consonances may be used freely save for the motions and for the rule that more imperfect than perfect consonances be employed, the beginning and end excepted (they must be perfect); a composition of this species full of perfect consonances would lack harmony. Read in Mann's translation (Norton 1965, p. 28), since the 1725 page is not among the scans. Checked as 'perfect must not outnumber imperfect' in the interior, because Fux's own Fig. 11, which Aloysius approves (p. 51), has 4 of each.",
  },
  check(a) {
    const perfect: number[] = [];
    let imperfect = 0;
    for (let k = 1; k < a.length - 1; k++) {
      const i = vertical(a, k);
      if (isPerfectConsonance(i)) perfect.push(k);
      else if (isImperfectConsonance(i)) imperfect++;
    }
    return perfect.length > imperfect ? [v(this, perfect, { perfect: perfect.length, imperfect })] : [];
  },
};

export const FIRST_SPECIES_FUX_STRICT: readonly Rule[] = [
  verticalConsonance,
  openingPerfect,
  finalOctaveOrUnison,
  cadence,
  perfectApproach,
  unisonOnlyAtEnds,
  melodicTritone,
  melodicMajorSixth,
  convergingLeapIntoOctave,
  unisonLeap,
  noVoiceCrossing,
  preferContraryMotion,
  preferImperfectConsonances,
];
