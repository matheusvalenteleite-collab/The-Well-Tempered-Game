/**
 * Three-voice counterpoint (Exercitium II), first species: the cantus firmus and two added voices,
 * all in whole notes, judged as Fux judges the "Tricinium" in Lectio I (1725, pp. 81-94).
 *
 * The bass of a bar is its lowest sounding note, whichever staff it is on: Fux's staves are in the
 * order of the parts, and the parts cross (Figs. 111, 113). Intervals "against the bass" are taken
 * from that note; "upper" pairs are the two voices above it.
 *
 * Readings that go beyond the text are marked in each rule's attribution and listed in
 * docs/DECISIONS.md (D90). Every one of Fux's sixteen first-species solutions passes; one warning
 * falls on Fux's own Fig. 116 (see t1.direct-perfect).
 */
import { harmonic, interval, isConsonant, isImperfectConsonance, isPerfectConsonance, motion, type Interval } from "./interval.ts";
import { parsePitch } from "../music/pitch.ts";
import type { ModalFinal } from "../music/fux/types.ts";
import type { Attribution, Severity, Violation } from "./rules/types.ts";

const P = "Gradus (1725), Exercitii II, Lectio I";

export interface TrioInput {
  modalFinal: ModalFinal;
  /** One line per staff, top staff first; one whole note per bar. */
  voices: string[][];
  /** The staff of the cantus firmus (0 top, 2 bottom). */
  cantusIndex: number;
}

/** A violation in three voices: `positions` are bars, `voices` the staves concerned. */
export interface TrioViolation extends Violation {
  voices: number[];
}

export interface TrioAnalysis {
  input: TrioInput;
  bars: number;
  /** Staff index of the lowest sounding note in each bar. */
  bass: number[];
}

export interface TrioRule {
  id: string;
  severity: Severity;
  messageKey: string;
  attribution: Attribution;
  check(a: TrioAnalysis): TrioViolation[];
}

/** Staff indices 0..n-1 of the analysed texture. */
const range = (a: TrioAnalysis) => a.input.voices.map((_, x) => x);
/** Every pair of staves (x < y). */
const pairs = (a: TrioAnalysis): [number, number][] => range(a).flatMap((x) => range(a).filter((y) => y > x).map((y): [number, number] => [x, y]));

const midi = (p: string) => parsePitch(p).midi;
const pc = (p: string) => parsePitch(p).step;
const at = (a: TrioAnalysis, voice: number, bar: number) => a.input.voices[voice][bar];
/** The pair ordered (lower, upper) in a bar. */
const ordered = (a: TrioAnalysis, x: number, y: number, bar: number): [number, number] => (midi(at(a, x, bar)) <= midi(at(a, y, bar)) ? [x, y] : [y, x]);
const v = (r: TrioRule, positions: number[], voices: number[], detail?: Violation["detail"]): TrioViolation => ({
  ruleId: r.id,
  positions,
  voices,
  severity: r.severity,
  messageKey: r.messageKey,
  ...(detail ? { detail } : {}),
});
const isFourthClass = (i: Interval) => i.simple === 4;
const isFalseFifth = (i: Interval) => (i.quality === "d" && i.simple === 5) || (i.quality === "A" && i.simple === 4);

export function analyseTrio(input: TrioInput): TrioAnalysis {
  if (input.voices.length !== 3 && input.voices.length !== 4) throw new Error("three or four voices expected");
  const bars = input.voices[0].length;
  if (bars < 2 || input.voices.some((l) => l.length !== bars)) throw new Error("every voice must have one note per bar");
  for (const l of input.voices) for (const p of l) parsePitch(p);
  const last = input.voices.length - 1;
  const bass = Array.from({ length: bars }, (_, k) => input.voices.reduce((lo, _l, x) => (midi(input.voices[x][k]) < midi(input.voices[lo][k]) ? x : lo), last));
  return { input, bars, bass };
}

export const consonanceWithBass: TrioRule = {
  id: "t1.consonance-bass",
  severity: "error",
  messageKey: "rule.t1.consonance-bass",
  attribution: { status: "verified", ref: `${P}, pp. 81-82`, note: "'Notis aequalibus ... merisque Consonantiis constans'. Against the bass the fourth is a dissonance, as in two voices." },
  check(a) {
    const out: TrioViolation[] = [];
    for (let k = 0; k < a.bars; k++) {
      const b = a.bass[k];
      for (const x of range(a)) {
        if (x === b) continue;
        const i = harmonic(at(a, b, k), at(a, x, k));
        if (!isConsonant(i)) out.push(v(this, [k], [b, x], { interval: i.name }));
      }
    }
    return out;
  },
};

export const upperDissonance: TrioRule = {
  id: "t1.upper-dissonance",
  severity: "error",
  messageKey: "rule.t1.upper-dissonance",
  attribution: {
    status: "verified",
    ref: `${P}, pp. 82 and 86`,
    note: "Between the two upper voices a fourth is the inside of a 6/3 and stands (Fux's six-three sonorities, pp. 82-83); so do the tritone and diminished fifth, which Fux writes between the upper voices (Figs. 105, 111, 112, 117, 118). Seconds and sevenths are dissonances anywhere.",
  },
  check(a) {
    const out: TrioViolation[] = [];
    for (let k = 0; k < a.bars; k++) {
      for (const [x, y] of pairs(a)) {
        if (x === a.bass[k] || y === a.bass[k]) continue;
        const i = harmonic(at(a, x, k), at(a, y, k));
        if (!isConsonant(i) && !isFourthClass(i) && !isFalseFifth(i)) out.push(v(this, [k], [x, y], { interval: i.name }));
      }
    }
    return out;
  },
};

export const parallelPerfect: TrioRule = {
  id: "t1.parallel-perfect",
  severity: "error",
  messageKey: "rule.t1.parallel-perfect",
  attribution: {
    status: "verified",
    ref: `${P}, p. 86`,
    note: "'Regularum ratio non solùm respectu Bassi, verùm etiam aliarum partium inter se' — the rules of motion hold for every pair. Two fifths or two octaves (unisons) in a row by parallel or similar motion; contrary motion (5 to 12) is not checked, as in two voices.",
  },
  check(a) {
    const out: TrioViolation[] = [];
    for (let k = 1; k < a.bars; k++) {
      for (const [x, y] of pairs(a)) {
        const i0 = harmonic(at(a, x, k - 1), at(a, y, k - 1));
        const i1 = harmonic(at(a, x, k), at(a, y, k));
        if (!isPerfectConsonance(i0) || !isPerfectConsonance(i1) || i0.simple !== i1.simple) continue;
        const m = motion(at(a, x, k - 1), at(a, y, k - 1), at(a, x, k), at(a, y, k));
        if (m === "parallel" || m === "similar") out.push(v(this, [k - 1, k], [x, y], { from: i0.name, to: i1.name }));
      }
    }
    return out;
  },
};

export const directPerfect: TrioRule = {
  id: "t1.direct-perfect",
  severity: "warning",
  messageKey: "rule.t1.direct-perfect",
  attribution: {
    status: "unverified",
    ref: `${P}, pp. 86-87`,
    note:
      "In two voices a perfect consonance is reached only by contrary or oblique motion; in three Fux relaxes it 'ob rationes ponderosas' where it cannot be done otherwise (p. 86, the penultimate bar; p. 87, bar 7 of his own example). His solutions reach fifths and octaves by similar motion often, and in all but one the upper voice of the pair moves by step. Our reading: by similar motion into a perfect consonance is noted (a warning) only when the upper voice leaps — the exception for the stepwise upper voice is the one Schottstaedt's species manual states for the outer voices. Fux's Fig. 116, bars 6-7 (top voice C5-A4 over the bass A3-D3), is the one place his own solutions meet it.",
  },
  check(a) {
    const out: TrioViolation[] = [];
    for (let k = 1; k < a.bars; k++) {
      for (const [x, y] of pairs(a)) {
        const i0 = harmonic(at(a, x, k - 1), at(a, y, k - 1));
        const i1 = harmonic(at(a, x, k), at(a, y, k));
        if (!isPerfectConsonance(i1) || (isPerfectConsonance(i0) && i0.simple === i1.simple)) continue;
        if (motion(at(a, x, k - 1), at(a, y, k - 1), at(a, x, k), at(a, y, k)) !== "similar") continue;
        const [, upper] = ordered(a, x, y, k);
        if (interval(at(a, upper, k - 1), at(a, upper, k)).number >= 3) out.push(v(this, [k - 1, k], [x, y], { from: i0.name, to: i1.name }));
      }
    }
    return out;
  },
};

export const falseFifth: TrioRule = {
  id: "t1.false-fifth",
  severity: "warning",
  messageKey: "rule.t1.false-fifth",
  attribution: {
    status: "verified",
    ref: `${P}, pp. 85-86`,
    note: "Fux faults the Tenor rising with the Alto into a 'Quinta falsa' (similar motion, from an imperfect consonance). A diminished fifth reached by contrary or oblique motion stands in his solutions (Figs. 111, 112, 117, 118).",
  },
  check(a) {
    const out: TrioViolation[] = [];
    for (let k = 1; k < a.bars; k++) {
      for (const [x, y] of pairs(a)) {
        const i = harmonic(at(a, x, k), at(a, y, k));
        if (!(i.quality === "d" && i.simple === 5)) continue;
        if (motion(at(a, x, k - 1), at(a, y, k - 1), at(a, x, k), at(a, y, k)) === "similar") out.push(v(this, [k - 1, k], [x, y]));
      }
    }
    return out;
  },
};

export const imperfectInEachBar: TrioRule = {
  id: "t1.triad",
  severity: "warning",
  messageKey: "rule.t1.triad",
  attribution: {
    status: "verified",
    ref: `${P}, p. 82`,
    note: "'In omni Hypothesi ... nisi alia ratio impediat, Triadem harmonicam adhibendam esse'; a sixth, or an octave, may stand in its place for the line's sake or to avoid perfect consonances in a row. Checked as: an inner bar with no third or sixth above the bass (only perfect consonances) is noted. The beginning and the end are free.",
  },
  check(a) {
    const out: TrioViolation[] = [];
    for (let k = 1; k < a.bars - 1; k++) {
      const b = a.bass[k];
      const figs = range(a).filter((x) => x !== b).map((x) => harmonic(at(a, b, k), at(a, x, k)));
      if (!figs.some(isImperfectConsonance)) out.push(v(this, [k], range(a), { figures: figs.map((f) => f.name).join(" ") }));
    }
    return out;
  },
};

export const innerUnison: TrioRule = {
  id: "t1.unison",
  severity: "warning",
  messageKey: "rule.t1.unison",
  attribution: { status: "verified", ref: `${P}, p. 88`, note: "'faceret unisonum, qui minùs confert harmoniae, quàm Octava'. Unisons at the beginning and the end are free." },
  check(a) {
    const out: TrioViolation[] = [];
    for (let k = 1; k < a.bars - 1; k++) for (const [x, y] of pairs(a)) if (harmonic(at(a, x, k), at(a, y, k)).name === "P1") out.push(v(this, [k], [x, y]));
    return out;
  },
};

export const openingOnFinal: TrioRule = {
  id: "t1.opening",
  severity: "error",
  messageKey: "rule.t1.opening",
  attribution: {
    status: "verified",
    ref: `Exercitii I, Lectio I, pp. 48-49; ${P}, pp. 87-93`,
    note: "Not restated in the three-voice lesson; carried over from Fux's reason in two voices: a counterpoint below the cantus may not open a fifth below it, because the lowest note would then lie outside the mode (pp. 48-49) — the first lowest note must be the final. All sixteen of his three-voice solutions open so (the upper voices may take its third). Kept an error (D90).",
  },
  check(a) {
    const b = at(a, a.bass[0], 0);
    return pc(b) === a.input.modalFinal && parsePitch(b).alter === 0 ? [] : [v(this, [0], [a.bass[0]], { bass: b })];
  },
};

export const finalChord: TrioRule = {
  id: "t1.final-chord",
  severity: "error",
  messageKey: "rule.t1.final-chord",
  attribution: {
    status: "verified",
    ref: `${P}, pp. 89-90`,
    note: "The last sonority: the final in the bass; above it the octave (unison), the fifth, or the major third. A minor third 'ad concludendum finem non valere' (p. 89); the major third stands where the fifth cannot (p. 90).",
  },
  check(a) {
    const k = a.bars - 1;
    const b = a.bass[k];
    const bp = at(a, b, k);
    const out: TrioViolation[] = [];
    if (pc(bp) !== a.input.modalFinal || parsePitch(bp).alter !== 0) out.push(v(this, [k], [b], { bass: bp }));
    for (const x of range(a)) {
      if (x === b) continue;
      const i = harmonic(bp, at(a, x, k));
      const ok = (i.quality === "P" && (i.simple === 1 || i.simple === 5)) || (i.quality === "M" && i.simple === 3);
      if (!ok) out.push(v(this, [k], [b, x], { interval: i.name }));
    }
    return out;
  },
};

export const cadence: TrioRule = {
  id: "t1.cadence",
  severity: "error",
  messageKey: "rule.t1.cadence",
  attribution: {
    status: "verified",
    ref: `${P}, p. 90`,
    note: "The 'clausula formalis': one voice reaches the final by a semitone (the raised seventh below it, or in E the F above it). Every one of Fux's endings has it.",
  },
  check(a) {
    const k = a.bars - 1;
    const ok = range(a).some((x) => pc(at(a, x, k)) === a.input.modalFinal && interval(at(a, x, k - 1), at(a, x, k)).semitones === 1);
    return ok ? [] : [v(this, [k - 1, k], range(a))];
  },
};

/** Melodic leaps of the added voices (not the cantus). */
export const melodicLeaps: TrioRule = {
  id: "t1.melodic",
  severity: "error",
  messageKey: "rule.t1.melodic",
  attribution: {
    status: "verified",
    ref: `${P}, p. 88; Exercitii I, Lectio I, pp. 51-53`,
    note: "As in two voices, no tritone and no major sixth ('saltum Sextae majoris prohibitum', p. 88, repeated here); and no seventh ('Quid judicandum de saltu Septimae?', p. 88). Other augmented leaps are excluded with the tritone; the diminished fifth is not named and not checked.",
  },
  check(a) {
    const out: TrioViolation[] = [];
    for (const x of range(a)) {
      if (x === a.input.cantusIndex) continue;
      for (let k = 1; k < a.bars; k++) {
        const i = interval(at(a, x, k - 1), at(a, x, k));
        if (i.number < 3) continue;
        const bad = i.quality === "A" || i.quality === "AA" || (i.quality === "M" && i.number === 6) || i.number === 7;
        if (bad) out.push(v(this, [k - 1, k], [x], { interval: i.name }));
      }
    }
    return out;
  },
};

export const TRIO_FIRST_SPECIES: readonly TrioRule[] = [
  consonanceWithBass,
  upperDissonance,
  parallelPerfect,
  openingOnFinal,
  finalChord,
  cadence,
  melodicLeaps,
  directPerfect,
  falseFifth,
  imperfectInEachBar,
  innerUnison,
];

export interface TrioEvaluation {
  violations: TrioViolation[];
  errors: TrioViolation[];
  warnings: TrioViolation[];
  passed: boolean;
}

export function evaluateTrio(input: TrioInput, rules: readonly TrioRule[] = TRIO_FIRST_SPECIES): TrioEvaluation {
  const a = analyseTrio(input);
  const violations = rules.flatMap((r) => r.check(a));
  const errors = violations.filter((x) => x.severity === "error");
  return { violations, errors, warnings: violations.filter((x) => x.severity === "warning"), passed: errors.length === 0 };
}
