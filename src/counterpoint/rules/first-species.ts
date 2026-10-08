/**
 * First-species rules (note against note), two voices.
 *
 * Page references are to the 1725 print, Exercitii I, Lectio I (pp. 45-55), read from the
 * page scans in the upstream dataset repository (source_pdf/gap_p053.pdf ... gap_p063.pdf).
 * Printed p. 46 is not among those scans, and Liber I (where Fux states the rules of motion
 * he refers back to) is not either; claims that could only rest on them are "unverified".
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
import { parsePitch } from "../../music/pitch.ts";
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
  voicing: "cantus-below",
  messageKey: "rule.fs.opening-perfect",
  attribution: {
    status: "verified",
    ref: `${P}, pp. 47-49`,
    note: "Begin on a perfect consonance (p. 47). With the cantus above, an opening fifth below is an error because it is outside the mode (pp. 48-49); hence this rule's P1/P5/P8 form is stated for the cantus below only.",
  },
  pending: "Compound forms (P12, P15) are currently accepted as perfect consonances; confirm.",
  check(a) {
    const i = vertical(a, 0);
    return isPerfectConsonance(i) ? [] : [v(this, [0], { interval: i.name })];
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

export const cadenceMajorSixth: Rule = {
  id: "fs.cadence-major-sixth",
  source: "fux",
  severity: "error",
  species: ["first"],
  voicing: "cantus-below",
  messageKey: "rule.fs.cadence-major-sixth",
  attribution: {
    status: "verified",
    ref: `${P}, pp. 47 and 49; Lectio II, p. 56`,
    note: "Penultimate major sixth because the cantus is below (p. 47); with the cantus above, a minor third instead (p. 49).",
  },
  check(a) {
    const k = a.length - 2;
    const pen = vertical(a, k);
    const fin = vertical(a, k + 1);
    const ok = pen.quality === "M" && pen.simple === 6 && isOctaveClass(fin);
    return ok ? [] : [v(this, [k, k + 1], { penultimate: pen.name, final: fin.name })];
  },
};

export const ionianNoAccidentals: Rule = {
  id: "fs.ionian-no-accidentals",
  source: "fux",
  severity: "error",
  species: ["first"],
  voicing: "any",
  finals: ["C"],
  messageKey: "rule.fs.ionian-no-accidentals",
  attribution: {
    status: "verified",
    ref: `${P}, p. 55`,
    note: "Fux adds the sharp at the cadence only where the mode lacks a semitone below the final; in C the leading note is already B. That no other accidental is wanted in Ionian first species is inferred, not stated.",
  },
  pending: "Severity (error vs warning) not yet decided.",
  check(a) {
    return a.counterpoint.flatMap((p, k) => (parsePitch(p).alter !== 0 ? [v(this, [k], { pitch: p })] : []));
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
  augmentedDiminished: (i: Interval) => i.quality === "A" || i.quality === "d" || i.quality === "AA" || i.quality === "dd",
  sixth: (i: Interval) => i.number === 6 && (i.quality === "M" || (i.quality === "m" && i.direction === "down")),
  seventh: (i: Interval) => i.number === 7,
  beyondOctave: (i: Interval) => i.number > 8,
};

export const melodicAugmentedDiminished = melodicRule(
  "fs.melodic-augmented-diminished",
  {
    status: "verified",
    ref: `${P}, pp. 51-52`,
    note: "Only the tritone leap is explicitly forbidden there ('mi contra fa'); other augmented and diminished intervals are covered by the general ban only by inference.",
  },
  MELODIC_FORBIDDEN.augmentedDiminished,
);

export const melodicSixth = melodicRule(
  "fs.melodic-sixth",
  {
    status: "unverified",
    ref: `${P}, p. 53`,
    note: "The major-sixth leap is verified as forbidden (p. 53). The ban on the descending minor sixth, and the permission of the ascending one, are not stated on pp. 45, 47-55; p. 46 and Liber I are not available.",
  },
  MELODIC_FORBIDDEN.sixth,
);

export const melodicSeventh = melodicRule(
  "fs.melodic-seventh",
  { status: "unverified", note: "Not stated on pp. 45, 47-55 (p. 46 and Liber I not available)." },
  MELODIC_FORBIDDEN.seventh,
);

export const melodicBeyondOctave = melodicRule(
  "fs.melodic-beyond-octave",
  { status: "unverified", note: "Not stated on pp. 45, 47-55 (p. 46 and Liber I not available)." },
  MELODIC_FORBIDDEN.beyondOctave,
);

export const noVoiceCrossing: Rule = {
  id: "fs.no-voice-crossing",
  source: "fux",
  severity: "error",
  species: ["first"],
  voicing: "any",
  messageKey: "rule.fs.no-voice-crossing",
  attribution: {
    status: "contradicted",
    ref: `${P}, p. 52`,
    note: "CONTRADICTED by the source: in Fig. 14, Fux has the counterpoint cross the cantus (notes 4-7), and Aloysius approves it ('Optimâ observantiâ id fecisti').",
  },
  pending: "Fux approves voice crossing (p. 52). Decide whether Level 1 keeps this as a hard rule.",
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
  attribution: { status: "unverified", note: "Not found on pp. 45, 47-55; possibly on p. 46 (not available)." },
  pending: "Operationalization: warn when interior perfect consonances outnumber imperfect ones. Provisional.",
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

export const avoidSuccessiveLeaps: Rule = {
  id: "fs.avoid-successive-leaps",
  source: "fux",
  severity: "warning",
  species: ["first"],
  voicing: "any",
  messageKey: "rule.fs.avoid-successive-leaps",
  attribution: { status: "unverified", note: "Not found on pp. 45, 47-55." },
  pending: "Operationalization: warn at every pair of consecutive leaps (> second) in the counterpoint, either direction. Provisional.",
  check(a) {
    const out: Violation[] = [];
    for (let k = 2; k < a.length; k++) {
      const i1 = interval(a.counterpoint[k - 2], a.counterpoint[k - 1]);
      const i2 = interval(a.counterpoint[k - 1], a.counterpoint[k]);
      if (isLeap(i1) && isLeap(i2)) out.push(v(this, [k - 2, k - 1, k], { first: `${i1.name} ${i1.direction}`, second: `${i2.name} ${i2.direction}` }));
    }
    return out;
  },
};

export const FIRST_SPECIES_FUX_STRICT: readonly Rule[] = [
  verticalConsonance,
  openingPerfect,
  finalOctaveOrUnison,
  cadenceMajorSixth,
  ionianNoAccidentals,
  perfectApproach,
  unisonOnlyAtEnds,
  melodicAugmentedDiminished,
  melodicSixth,
  melodicSeventh,
  melodicBeyondOctave,
  noVoiceCrossing,
  preferContraryMotion,
  preferImperfectConsonances,
  avoidSuccessiveLeaps,
];
