/**
 * Three-voice counterpoint, second species (Exercitium II, Lectio II, 1725 pp. 94-98): one voice in
 * minims throughout, the other two (the cantus among them) in semibreves.
 *
 * Fux's text is short. "Here recall and observe what we prescribed for this species in two voices,
 * and what we said of the harmonic triad for semibreve against semibreve in three; with this
 * relaxation, that for the sake of the triad a minim may sometimes save two fifths by the leap of
 * a third" (p. 94; the example p. 95: 'Quae Hypothesis in Bicinio prohibita, in Tricinio in gratiam
 * Triadis harmonicae ... toleratur'). Then (p. 96): two minims on one line are forbidden in two
 * voices, but at the close of all three examples there is a ligature, and the third ends on a
 * major third; Aloysius: where two separate minims would make a faulty unison or an octave empty of
 * harmony, the tie is allowed, and the major third is excused by necessity (a fifth there would
 * make two fifths in a row). "The minims must always agree with the two semibreves, as to motion
 * and the rules, as far as can be."
 *
 * So the judgement has two layers:
 *  - the downbeats (the minim voice's thesis notes with the two semibreves) are a three-voice
 *    first-species texture and take its rules (three-voice.ts), the cadence tie excepted;
 *  - the minim voice against each semibreve takes the two-voice second-species precepts: a
 *    dissonant upbeat only as a passing note; no perfect consonance reached in parallel from the
 *    upbeat; two downbeat fifths or octaves "saved" only by a leap (from a third on, here);
 *    no repeated minim except the cadence tie; the melodic prohibitions.
 * Every one of Fux's nine solutions (Figs. 121-129) passes (D114).
 */
import { harmonic, interval, isConsonant, isPerfectConsonance, motion } from "./interval.ts";
import { parsePitch } from "../music/pitch.ts";
import type { ModalFinal } from "../music/fux/types.ts";
import { HOLD, REST } from "./layout.ts";
import {
  analyseTrio,
  consonanceWithBass,
  directPerfect,
  falseFifth,
  finalChord,
  imperfectInEachBar,
  innerUnison,
  melodicLeaps,
  openingOnFinal,
  parallelPerfect,
  upperDissonance,
  type TrioEvaluation,
  type TrioRule,
  type TrioViolation,
} from "./three-voice.ts";

const P = "Gradus (1725), Exercitii II, Lectio II";

export interface Trio2Input {
  modalFinal: ModalFinal;
  cantusIndex: number;
  /** The staff of the voice in minims. */
  minimIndex: number;
  /**
   * One line per staff, top first. The semibreve voices have one note per bar; the minim voice
   * has the second-species slots (two per bar, one in the last; the first may be a rest, "r").
   */
  voices: string[][];
  /** Four voices, the species combined (D148): another part's note on the second half of a bar, where it changes. */
  halves?: (string | null)[][];
}

const midi = (p: string) => parsePitch(p).midi;
const pc = (p: string) => parsePitch(p).step;

interface Trio2Analysis {
  input: Trio2Input;
  bars: number;
  m: number;
  /** The minim voice's notes per bar: [thesis, arsis] (the last bar: [final]). */
  down: (string | null)[];
  up: (string | null)[];
  /** The penultimate downbeat is tied from the bar before (the cadence ligature). */
  tie: boolean;
  /** The downbeat "skeleton": the three voices in one note per bar, for the first-species rules. */
  skeleton: string[][];
}

const viol = (id: string, severity: "error" | "warning", messageKey: string, positions: number[], voices: number[], detail?: Record<string, string | number>): TrioViolation => ({
  ruleId: id,
  positions,
  voices,
  severity,
  messageKey,
  ...(detail ? { detail } : {}),
});

function analyse(input: Trio2Input): Trio2Analysis {
  const m = input.minimIndex;
  const all = input.voices.map((_, x) => x);
  const other = all.find((x) => x !== m)!;
  const bars = input.voices[other].length;
  const line = input.voices[m];
  if (line.length !== 2 * bars - 1) throw new Error("the minim voice needs two notes a bar and one in the last");
  const down = Array.from({ length: bars }, (_, b) => (line[2 * b] === REST ? null : line[2 * b]));
  // A held second half (four voices, the penultimate semibreve, D148) sounds no new upbeat.
  const up = Array.from({ length: bars }, (_, b) => (b < bars - 1 && line[2 * b + 1] !== HOLD ? line[2 * b + 1] : null));
  const pen = bars - 2;
  const tie = pen >= 1 && down[pen] !== null && up[pen - 1] === down[pen];
  // The skeleton takes the downbeat; in the first bar (a rest) the first note sung; at a cadence
  // tie that does not agree with the bass, the note it resolves to (a suspension).
  const skel = down.map((d, b) => d ?? up[b] ?? "");
  const skeleton = all.map((x) => (x === m ? skel : input.voices[x]));
  if (tie) {
    const probe = analyseTrio({ modalFinal: input.modalFinal, cantusIndex: input.cantusIndex, voices: skeleton });
    const bass = probe.bass[pen];
    const dissonant = bass !== m ? !isConsonant(harmonic(skeleton[bass][pen], down[pen]!)) : all.some((x) => x !== m && !isConsonant(harmonic(down[pen]!, skeleton[x][pen])));
    if (dissonant && up[pen]) skel[pen] = up[pen]!;
  }
  return { input, bars, m, down, up, tie, skeleton };
}

/**
 * At the close, a diminished fifth over the bass that resolves inward by step (the lower note up a
 * semitone, the upper down a step: C#-G to D-F#) stands: Fux's Fig. 123, where the bass carries the
 * cadence suspension (penultimate bar). Not in the text; admitted because it is his (D39, D114).
 */
function cadentialFalseFifth(a: Trio2Analysis, bar: number, lowNote: string, highNote: string, lowVoice: number, highVoice: number): boolean {
  if (bar !== a.bars - 2) return false;
  const i = harmonic(lowNote, highNote);
  if (!(i.quality === "d" && i.simple === 5)) return false;
  const next = (x: number) => (x === a.m ? a.input.voices[x][2 * (a.bars - 1)] : a.input.voices[x][a.bars - 1]);
  const lo = interval(lowNote, next(lowVoice));
  const hi = interval(highNote, next(highVoice));
  return lo.direction === "up" && lo.semitones === 1 && hi.direction === "down" && hi.number === 2;
}

/** The first-species rules on the downbeats (the minim voice's own melody is judged below). */
const SKELETON_RULES: readonly TrioRule[] = [consonanceWithBass, upperDissonance, openingOnFinal, finalChord, directPerfect, falseFifth, imperfectInEachBar, innerUnison];

/** Upbeat minims: consonant with both semibreves, or passing by step (two-voice precept, p. 56). */
function upbeats(a: Trio2Analysis): TrioViolation[] {
  const out: TrioViolation[] = [];
  const { m } = a;
  for (let b = 0; b < a.bars - 1; b++) {
    const u = a.up[b];
    if (!u) continue;
    const others = a.input.voices.map((_, x) => x).filter((x) => x !== m).map((x) => ({ x, p: a.input.halves?.[x]?.[b] ?? a.input.voices[x][b] }));
    const lowest = others.reduce((lo, o) => (midi(o.p) < midi(lo.p) ? o : lo));
    const minimIsBass = midi(u) < midi(lowest.p);
    const bad = others.filter(({ x, p }) => {
      const i = harmonic(minimIsBass ? u : p, minimIsBass ? p : u);
      if (isConsonant(i)) return false;
      // Above the bass, a fourth or a false fifth with the other upper voice stands, as on the downbeat.
      if (!minimIsBass && x !== lowest.x && (i.simple === 4 || (i.quality === "d" && i.simple === 5))) return false;
      return true;
    });
    if (!bad.length) continue;
    if (bad.every(({ x, p }) => (minimIsBass ? cadentialFalseFifth(a, b, u, p, m, x) : cadentialFalseFifth(a, b, p, u, x, m)))) continue;
    const prev = a.down[b];
    const next = a.down[b + 1] ?? (b + 1 === a.bars - 1 ? a.input.voices[m][2 * (b + 1)] : null);
    const passing =
      prev !== null && next !== null && interval(prev, u).number === 2 && interval(u, next).number === 2 && interval(prev, u).direction === interval(u, next).direction;
    if (!passing) for (const { x } of bad) out.push(viol("t2.passing-dissonance", "error", "rule.ss.passing-dissonance", [b], [m, x], { interval: harmonic(u, a.input.halves?.[x]?.[b] ?? a.input.voices[x][b]).name }));
  }
  return out;
}

/**
 * Perfect consonances in a row between the minim voice and another: from the upbeat into the next
 * downbeat (parallel or similar), and downbeat to downbeat unless the upbeat leaps (in three voices
 * a third is enough, p. 94; in two it took a fourth, p. 58). Between the two semibreves, the
 * first-species rule.
 */
function successions(a: Trio2Analysis): TrioViolation[] {
  const out: TrioViolation[] = [];
  const { m } = a;
  const s = a.skeleton;
  // The two semibreves (and the cantus) between themselves.
  out.push(...parallelPerfect.check(analyseTrio({ modalFinal: a.input.modalFinal, cantusIndex: a.input.cantusIndex, voices: s })).filter((v) => !v.voices.includes(m)));
  for (const x of a.input.voices.map((_, y) => y).filter((y) => y !== m)) {
    for (let b = 0; b < a.bars - 1; b++) {
      const u = a.up[b];
      const d1 = a.down[b + 1] ?? null;
      const o0 = a.input.halves?.[x]?.[b] ?? a.input.voices[x][b];
      const o1 = a.input.voices[x][b + 1];
      if (!d1) continue;
      const tiedHere = a.tie && b + 1 === a.bars - 2;
      // Upbeat into downbeat.
      if (u && !tiedHere) {
        const i0 = harmonic(u, o0);
        const i1 = harmonic(d1, o1);
        if (isPerfectConsonance(i0) && isPerfectConsonance(i1) && i0.simple === i1.simple) {
          const mv = motion(o0, u, o1, d1);
          if (mv === "parallel" || mv === "similar") out.push(viol("t2.parallel-perfect", "error", "rule.t1.parallel-perfect", [b, b + 1], [m, x], { from: i0.name, to: i1.name }));
        }
      }
      // Direct motion into a perfect consonance from the upbeat, the upper voice leaping (a warning,
      // as in first species: t1.direct-perfect).
      if (u && !tiedHere) {
        const i0 = harmonic(u, o0);
        const i1 = harmonic(d1, o1);
        if (isPerfectConsonance(i1) && !(isPerfectConsonance(i0) && i0.simple === i1.simple) && motion(o0, u, o1, d1) === "similar") {
          const upperIsMinim = midi(d1) >= midi(o1);
          const leap = upperIsMinim ? interval(u, d1).number >= 3 : interval(o0, o1).number >= 3;
          if (leap) out.push(viol("t1.direct-perfect", "warning", "rule.t1.direct-perfect", [b, b + 1], [m, x], { from: i0.name, to: i1.name }));
        }
      }
      // Downbeat to downbeat.
      const d0 = a.down[b];
      if (!d0 || !u) continue;
      const i0 = harmonic(d0, a.input.voices[x][b]);
      const i1 = harmonic(d1, o1);
      if (!isPerfectConsonance(i0) || !isPerfectConsonance(i1) || i0.simple !== i1.simple) continue;
      if (interval(d0, u).number >= 3) continue; // saved by the leap (p. 94)
      const mv = motion(a.input.voices[x][b], d0, o1, d1);
      if (mv === "parallel" || mv === "similar") out.push(viol("t2.downbeat-succession", "error", "rule.t2.downbeat-succession", [b, b + 1], [m, x], { from: i0.name, to: i1.name }));
    }
  }
  return out;
}

/** The minim voice's melody: no repeated minim but the cadence tie (p. 96); the forbidden leaps. */
function minimMelody(a: Trio2Analysis): TrioViolation[] {
  const out: TrioViolation[] = [];
  const { m } = a;
  const seq: { p: string; bar: number; slot: number }[] = [];
  a.input.voices[m].forEach((p, k) => p !== REST && p !== HOLD && seq.push({ p, bar: Math.floor(k / 2), slot: k }));
  for (let k = 1; k < seq.length; k++) {
    const x = seq[k - 1];
    const y = seq[k];
    const i = interval(x.p, y.p);
    if (i.semitones === 0 && x.p === y.p) {
      // Four voices (D148): a penultimate semibreve (p. 123) is a semibreve: it may repeat into the final, as Fig. 173.
      const wholePenultimate = x.bar === a.bars - 2 && a.input.voices[m][x.slot + 1] === HOLD;
      if (wholePenultimate) continue;
      const cadenceTie = a.tie && y.bar === a.bars - 2 && y.slot % 2 === 0;
      if (!cadenceTie) out.push(viol("t2.repeated", "error", "rule.t2.repeated", [x.bar, y.bar], [m]));
      continue;
    }
    if (i.number < 3) continue;
    if (i.quality === "A" || i.quality === "AA" || (i.quality === "M" && i.number === 6) || i.number === 7)
      out.push(viol("t1.melodic", "error", "rule.t1.melodic", [x.bar, y.bar], [m], { interval: i.name }));
  }
  return out;
}

/** The close: one voice reaches the final by a semitone (p. 90); the minim voice from its last upbeat. */
function cadence(a: Trio2Analysis): TrioViolation[] {
  const k = a.bars - 1;
  const all = a.input.voices.map((_, x) => x);
  const ok = all.some((x) => {
    const last = x === a.m ? a.input.voices[x][2 * k] : a.input.voices[x][k];
    const before = x === a.m ? (a.up[k - 1] ?? a.down[k - 1]) : a.input.voices[x][k - 1];
    return !!before && pc(last) === a.input.modalFinal && interval(before, last).semitones === 1;
  });
  return ok ? [] : [viol("t1.cadence", "error", "rule.t1.cadence", [k - 1, k], all)];
}

export const TRIO2_ATTRIBUTION = {
  tie: { status: "verified", ref: `${P}, p. 96`, note: "'non solùm Ligaturam ... sed etiam ... Notam finalem Tertiâ majore' — the tie into the penultimate bar, as a suspension resolving down by step." },
  third: { status: "verified", ref: `${P}, pp. 94-95`, note: "'Minima per saltum Tertiae nonnunquam duas Quintas salvare queat'." },
} as const;

export function evaluateTrio2(input: Trio2Input): TrioEvaluation {
  const a = analyse(input);
  const sk = analyseTrio({ modalFinal: input.modalFinal, cantusIndex: input.cantusIndex, voices: a.skeleton });
  const melodicOthers = melodicLeaps.check(sk).filter((v) => !v.voices.includes(a.m));
  const skeletonFaults = SKELETON_RULES.flatMap((r) => r.check(sk)).filter((v) => {
    // The minim voice reaches a downbeat from its upbeat: direct motion is judged there (below).
    if (v.ruleId === "t1.direct-perfect" && v.voices.includes(a.m)) return false;
    if (v.ruleId !== "t1.consonance-bass") return true;
    const [lo, hi] = v.voices;
    const k = v.positions[0];
    return !cadentialFalseFifth(a, k, a.skeleton[lo][k], a.skeleton[hi][k], lo, hi);
  });
  const violations = [...skeletonFaults, ...melodicOthers, ...upbeats(a), ...successions(a), ...minimMelody(a), ...cadence(a)];
  const errors = violations.filter((x) => x.severity === "error");
  return { violations, errors, warnings: violations.filter((x) => x.severity === "warning"), passed: errors.length === 0 };
}
