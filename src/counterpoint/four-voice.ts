/**
 * Four-voice counterpoint (Exercitium III, "De Quatricinio", 1725 pp. 114-138; D148), read from the
 * print as two and three voices were.
 *
 * What Fux adds to the three-voice precepts:
 *  - Lectio I (pp. 114-121): the four parts hold the triad by doubling one of its notes, the octave
 *    first, the third more often where the octave would give faulty progressions, the sixth more
 *    rarely (p. 114); the rules of motion hold "not only of the parts against the bass, but of the
 *    parts among themselves", as far as can be: necessity, the line, imitation or the cantus may
 *    force "Quintarum, vel Octavarum cooperta consecutio" (p. 115); consonances are measured from
 *    the bass, so a fourth between inner parts stands (p. 117); the closer the parts, the fuller the
 *    harmony (p. 117). The unison and the octave have the same name (p. 114): so the unison, a
 *    warning in three voices, is not noted here (owner, D148).
 *  - Lectio II (pp. 121-123): the minims agree with three semibreves; the penultimate bar may be a
 *    semibreve where two minims cannot be had (Josephus could not, p. 123, and Aloysius accepts it).
 *  - Lectio III (pp. 123-131): four crotchets agree with three semibreves; faults the semibreves
 *    force are tolerated "ob Semibrevium necessitatem" (pp. 125, 127, 128, 131); the fullest
 *    harmony on the thesis (third and fifth, p. 126) is a counsel.
 *  - Lectio IV (pp. 131-136): the ligature takes the concords it would have without it; where a
 *    seventh with a fifth would resolve into a dissonance with another part, that part's semibreve
 *    is divided (pp. 132-133): "trium Semibrevium rigor hac in Specie non admodum strictè teneri
 *    potest". A fourth between inner parts counts as nothing or as an imperfect consonance (p. 134).
 *  - Lectio V (pp. 136-138): florid against three semibreves, nothing new; semibreves whole "de
 *    possibilitate" (p. 138), divided where needed.
 *  - The species combined (p. 138, Fig. 204): each part its own motion, the same cantus.
 *
 * The judgement reuses the three-voice evaluators, generalised to four parts (three-voice*.ts): a
 * divided semibreve is seen by the moving voice in the half where it sounds. Here: the note values
 * each part keeps, the second minim of a divided semibreve (consonant, or passing by step, as a
 * second-species upbeat; no perfect consonance in a row from it), and, in the combined species,
 * each moving part judged by its own species against the others as they sound.
 */
import { harmonic, interval, isConsonant, isPerfectConsonance, motion } from "./interval.ts";
import { parsePitch } from "../music/pitch.ts";
import type { ModalFinal } from "../music/fux/types.ts";
import { HOLD, REST } from "./layout.ts";
import { evaluateTrio, TRIO_FIRST_SPECIES, type TrioEvaluation, type TrioViolation } from "./three-voice.ts";
import { evaluateTrio2 } from "./three-voice-second.ts";
import { evaluateTrioFlorid } from "./three-voice-florid.ts";
import { evaluateTrioFifth } from "./three-voice-fifth.ts";

/**
 * What a part sings: the cantus; semibreves ("whole"; "divisible" in species 4 and 5, p. 133);
 * or the species: minims, crotchets, ligatures, florid.
 */
export type PartKind = "cantus" | "whole" | "divisible" | "minims" | "crotchets" | "ligatures" | "florid";

export interface QuartetInput {
  modalFinal: ModalFinal;
  cantusIndex: number;
  kinds: PartKind[];
  /**
   * One line per staff, top first. First species: one note a bar in every part. Otherwise the
   * cantus one note a bar and every other part in quaver slots (eight a bar, one in the last; HOLD
   * carries the note on, over the bar line too; REST a rest), as the florid voice in two voices.
   */
  voices: string[][];
  /** Fourth species: inner bars that may go without a ligature (as many as Fux's own solution has). */
  ligatureAllowance?: number;
}

const P = "Gradus (1725), Exercitii III";
const midi = (p: string) => parsePitch(p).midi;
const isNote = (x: string | null | undefined): x is string => !!x && x !== REST && x !== HOLD;
const viol = (ruleId: string, severity: "error" | "warning", messageKey: string, positions: number[], voices: number[], detail?: Record<string, string | number>): TrioViolation => ({
  ruleId,
  positions,
  voices,
  severity,
  messageKey,
  ...(detail ? { detail } : {}),
});

export const QUARTET_ATTRIBUTION = {
  values: { status: "verified", ref: `${P}, Lectiones II-V, pp. 121-138`, note: "Each part keeps its species: minims, crotchets, ligatures; the other parts semibreves, divided only in the fourth and fifth species, where necessity asks (pp. 132-133, 138); the penultimate bar of the minims (and crotchets) may be a semibreve (p. 123; Figs. 173-176, 181)." },
  half: { status: "verified", ref: `${P}, Lectio IV, pp. 132-133`, note: "A divided semibreve's second minim is treated as an upbeat minim of the second species: consonant, or passing by step; no perfect consonance in a row from it." },
} as const;

/** The pitch sounding at quaver slot k of a line (through held slots); null in a rest. */
export function soundingAt(line: string[], k: number): string | null {
  for (let j = Math.min(k, line.length - 1); j >= 0; j--) if (line[j] !== HOLD) return isNote(line[j]) ? line[j] : null;
  return null;
}
const slotOf = (bars: number, b: number, q: number) => (b >= bars - 1 ? 8 * (bars - 1) : 8 * b + q);

/** A part's values: which quaver positions of a bar may begin a note (or rest), and what may be held. */
function valueFaults(input: QuartetInput, x: number, bars: number): TrioViolation[] {
  const kind = input.kinds[x];
  const line = input.voices[x];
  if (kind === "cantus" || kind === "florid") return [];
  const out: number[] = [];
  for (let b = 0; b < bars - 1; b++) {
    for (let q = 0; q < 8; q++) {
      const v = line[8 * b + q];
      const onset = v !== HOLD;
      const pen = b === bars - 2;
      let ok: boolean;
      if (kind === "whole") ok = q === 0 ? onset && isNote(v) : !onset;
      else if (kind === "divisible") ok = q === 0 ? v === HOLD ? b > 0 : isNote(v) : q === 4 ? true : !onset;
      else if (kind === "minims") ok = q === 0 ? (b === 0 ? onset : true) : q === 4 ? onset || pen : !onset;
      else if (kind === "ligatures") ok = q === 4 ? onset : q === 0 ? true : !onset;
      else ok = q % 2 === 1 ? !onset : q === 0 ? onset : onset || (pen && line.slice(8 * b + 2, 8 * b + 8).every((s) => s === HOLD));
      if (!ok) out.push(b);
      if (!ok) break;
    }
  }
  const last = line[8 * (bars - 1)];
  if (!isNote(last)) out.push(bars - 1);
  return out.length ? [viol("q.values", "error", `rule.q.values.${kind}`, [...new Set(out)], [x])] : [];
}

/** A semibreve part's note at the downbeat (held over the bar line where tied), and its second minim. */
function semibreves(line: string[], bars: number): { whole: string[]; halves: (string | null)[] } {
  const whole = Array.from({ length: bars }, (_, b) => soundingAt(line, slotOf(bars, b, 0)) ?? "");
  const halves = Array.from({ length: bars }, (_, b) => (b < bars - 1 && isNote(line[8 * b + 4]) ? line[8 * b + 4] : null));
  return { whole, halves };
}

/** Minims or ligatures in two slots a bar (a tie: the same pitch on both sides of the bar line). */
function twoSlots(line: string[], bars: number): string[] {
  const out: string[] = [];
  for (let b = 0; b < bars - 1; b++) {
    const a = line[8 * b];
    out.push(a === HOLD ? (soundingAt(line, 8 * b) ?? REST) : a);
    const c = line[8 * b + 4];
    out.push(c === HOLD ? HOLD : c);
  }
  const f = line[8 * (bars - 1)];
  out.push(f === HOLD ? (soundingAt(line, 8 * (bars - 1)) ?? REST) : f);
  return out;
}
/** Crotchets in four slots a bar (HOLD where the penultimate bar is one semibreve). */
function fourSlots(line: string[], bars: number): string[] {
  const out: string[] = [];
  for (let b = 0; b < bars - 1; b++) for (let h = 0; h < 4; h++) out.push(line[8 * b + 2 * h]);
  out.push(line[8 * (bars - 1)]);
  return out;
}

/**
 * The other parts as a moving part hears them, one note a bar and a second where it changes at the
 * half (the combined species): the cantus and semibreves as they are; minims, their two; crotchets,
 * the first and third; ligatures, the downbeat as it sounds (held) and the second minim.
 */
function asSemibreves(input: QuartetInput, x: number, bars: number): { whole: string[]; halves: (string | null)[] } {
  const kind = input.kinds[x];
  const line = input.voices[x];
  if (kind === "cantus") return { whole: line, halves: line.map(() => null) };
  if (kind === "whole" || kind === "divisible") return semibreves(line, bars);
  const at = (b: number, q: number) => soundingAt(line, slotOf(bars, b, q));
  // A note dissonant with the part below it all (a suspension, a passing crotchet) is that part's own
  // affair, judged in its own run: the others hear the lowest note in its place.
  const lowest = (b: number, q: number) =>
    input.voices
      .map((l, y) => (y === x ? null : input.kinds[y] === "cantus" ? l[b] : soundingAt(l, slotOf(bars, b, q))))
      .filter(isNote)
      .reduce((lo, p) => (midi(p) < midi(lo) ? p : lo));
  const harmonicNote = (p: string | null, b: number, q: number) => {
    if (!p) return p;
    const lo = lowest(b, q);
    return midi(p) > midi(lo) && !isConsonant(harmonic(lo, p)) ? lo : p;
  };
  const whole: string[] = [];
  const halves: (string | null)[] = [];
  for (let b = 0; b < bars; b++) {
    const first = harmonicNote(at(b, 0), b, 0) ?? at(b, kind === "crotchets" ? 2 : 4) ?? at(b, 4) ?? "";
    const second = b < bars - 1 ? harmonicNote(at(b, 4), b, 4) : null;
    whole.push(first);
    halves.push(second && second !== first ? second : null);
  }
  return { whole, halves };
}

/** The second minim of a divided semibreve (pp. 132-133): an upbeat minim against what sounds with it. */
function halfFaults(input: QuartetInput, x: number, bars: number, others: { whole: string[]; halves: (string | null)[] }[], idx: number[]): TrioViolation[] {
  const out: TrioViolation[] = [];
  const own = semibreves(input.voices[x], bars);
  for (let b = 0; b < bars - 1; b++) {
    const q = own.halves[b];
    if (!q) continue;
    const with_ = others.map((o, j) => ({ y: idx[j], p: o.halves[b] ?? o.whole[b], next: o.whole[b + 1], before: o.whole[b] }));
    const low = with_.reduce((lo, o) => (midi(o.p) < midi(lo.p) ? o : lo));
    const bad = with_.filter((o) => {
      const i = harmonic(midi(q) < midi(o.p) ? q : o.p, midi(q) < midi(o.p) ? o.p : q);
      if (isConsonant(i)) return false;
      if (midi(q) > midi(low.p) && o.y !== low.y && (i.simple === 4 || (i.quality === "d" && i.simple === 5) || (i.quality === "A" && i.simple === 4))) return false;
      return true;
    });
    const prev = own.whole[b];
    const next = own.whole[b + 1];
    const passing = !!prev && !!next && interval(prev, q).number === 2 && interval(q, next).number === 2 && interval(prev, q).direction === interval(q, next).direction;
    if (bad.length && !passing) for (const o of bad) out.push(viol("q.half-dissonance", "error", "rule.ss.passing-dissonance", [b], [x, o.y], { interval: harmonic(q, o.p).name }));
    for (const o of with_) {
      const i0 = harmonic(q, o.p);
      const i1 = harmonic(next, o.next);
      if (!isPerfectConsonance(i0) || !isPerfectConsonance(i1) || i0.simple !== i1.simple) continue;
      const mv = motion(o.p, q, o.next, next);
      if (mv === "parallel" || mv === "similar") out.push(viol("q.half-parallel", "error", "rule.t1.parallel-perfect", [b, b + 1], [x, o.y], { from: i0.name, to: i1.name }));
    }
    const leap = (a: string, c: string) => {
      const i = interval(a, c);
      return i.number >= 3 && (i.quality === "A" || i.quality === "AA" || (i.quality === "M" && i.number === 6) || i.number === 7) ? i : null;
    };
    for (const [a, c, bb] of [[prev, q, b], [q, next, b + 1]] as [string, string, number][]) {
      const i = a && c ? leap(a, c) : null;
      if (i) out.push(viol("t1.melodic", "error", "rule.t1.melodic", [b, bb], [x], { interval: i.name }));
    }
  }
  return out;
}

const key = (v: TrioViolation) => `${v.ruleId}@${v.positions.join(",")}@${[...v.voices].sort().join(",")}`;
const finish = (vs: TrioViolation[]): TrioEvaluation => {
  const seen = new Set<string>();
  // The unison counts as the octave in four voices (p. 114): not noted (D148).
  const violations = vs.filter((v) => v.ruleId !== "t1.unison" && !seen.has(key(v)) && (seen.add(key(v)), true));
  const errors = violations.filter((v) => v.severity === "error");
  return { violations, errors, warnings: violations.filter((v) => v.severity === "warning"), passed: errors.length === 0 };
};

/** The first-species rules of four voices: the three-voice ones, every pair, without the unison note. */
export const QUARTET_FIRST_SPECIES = TRIO_FIRST_SPECIES.filter((r) => r.id !== "t1.unison");

export function evaluateQuartet(input: QuartetInput): TrioEvaluation {
  const parts = input.voices.map((_, x) => x);
  const bars = input.voices[input.cantusIndex].length;
  if (input.kinds.every((k) => k === "cantus" || k === "whole") && input.voices.every((l) => l.length === bars))
    return finish(evaluateTrio({ modalFinal: input.modalFinal, cantusIndex: input.cantusIndex, voices: input.voices }, QUARTET_FIRST_SPECIES).violations);

  const values = parts.flatMap((x) => valueFaults(input, x, bars));
  if (values.length) return finish(values);
  const moving = parts.filter((x) => !["cantus", "whole", "divisible"].includes(input.kinds[x]));
  const out: TrioViolation[] = [];
  for (const m of moving) {
    const others = parts.filter((x) => x !== m);
    const reduced = parts.map((x) => (x === m ? null : asSemibreves(input, x, bars)));
    const voices = parts.map((x) => (x === m ? [] : reduced[x]!.whole));
    const halves = parts.map((x) => (x === m ? [] : reduced[x]!.halves));
    const kind = input.kinds[m];
    const line = input.voices[m];
    let ev: TrioEvaluation;
    if (kind === "minims") {
      voices[m] = twoSlots(line, bars);
      ev = evaluateTrio2({ modalFinal: input.modalFinal, cantusIndex: input.cantusIndex, minimIndex: m, voices, halves });
    } else if (kind === "crotchets" || kind === "ligatures") {
      voices[m] = kind === "crotchets" ? fourSlots(line, bars) : twoSlots(line, bars);
      ev = evaluateTrioFlorid({ species: kind === "crotchets" ? 3 : 4, modalFinal: input.modalFinal, cantusIndex: input.cantusIndex, movingIndex: m, voices, halves, ligatureAllowance: input.ligatureAllowance });
    } else {
      voices[m] = line;
      ev = evaluateTrioFifth({ modalFinal: input.modalFinal, cantusIndex: input.cantusIndex, movingIndex: m, voices, halves });
    }
    // With several moving parts (the combined species), each run judges its own part; the rest is
    // judged in the other parts' runs. The cadence is the piece's: it holds if any run finds it.
    out.push(...ev.violations.filter((v) => moving.length === 1 || v.voices.includes(m) || v.ruleId === "t1.cadence"));
    for (const x of others) {
      if (input.kinds[x] !== "divisible") continue;
      const with_ = parts.filter((y) => y !== x);
      out.push(...halfFaults(input, x, bars, with_.map((y) => (y === m ? asSemibreves(input, m, bars) : reduced[y]!)), with_));
    }
  }
  // The close is the piece's (p. 90): with several moving parts, one run finding it is enough.
  const cadences = out.filter((v) => v.ruleId === "t1.cadence");
  const rest = out.filter((v) => v.ruleId !== "t1.cadence");
  const cadenceFound = moving.length > 1 ? cadences.length < moving.length : cadences.length === 0;
  return finish([...rest, ...(cadenceFound ? [] : cadences.slice(0, 1))]);
}
