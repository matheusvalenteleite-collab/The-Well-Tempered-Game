/**
 * Two-voice tonal counterpoint against a given line (D119): the countersubject against Bach's
 * answer. The species' doctrine carried into free rhythm and the major and minor keys: a
 * dissonance (a second, fourth, seventh, an augmented or diminished interval, their compounds)
 * stands only as a passing note or a neighbour (entered and left by step), as a suspension (held
 * or repeated from a consonance and resolved down by step), as the cambiata (left by a third the
 * other way, Fux's nota cambiata), or against the given voice's own passing note; no two fifths or
 * octaves (unisons) in a row between successive sonorities. The rules were tried on all of Bach's
 * countersubjects in the dataset, which must pass (as Fux's solutions must, D39): what they needed
 * is recorded with each rule.
 */
import { harmonic, interval, isConsonant, isPerfectConsonance, type Interval } from "../counterpoint/interval.ts";
import { parsePitch } from "../music/pitch.ts";
import type { WtcNote } from "./fugues.ts";

export interface CpViolation {
  ruleId: string;
  /** Onset in quarters (from the answer's entry) of the player's note at fault. */
  at: number;
  /** Index of the player's note in its line. */
  note: number;
  severity: "error" | "warning";
  messageKey: string;
  detail?: Record<string, string>;
}

export interface CpEvaluation {
  violations: CpViolation[];
  errors: CpViolation[];
  warnings: CpViolation[];
  passed: boolean;
}

export interface CpInput {
  /** The player's line (with the notes before the answer's entry, for how they are approached). */
  line: WtcNote[];
  /** The given line (Bach's answer). */
  given: WtcNote[];
  /** Metre: the bar in quarters, the beat in quarters, and the metric position of time 0 within its bar. */
  bar: number;
  beat: number;
  phase: number;
  /** The player's notes to judge: their indices in `line` (the others are given). */
  judged: Set<number>;
}

const EPS = 1e-6;
/**
 * Chords by intervals above the root: major, minor and diminished triads; dominant, minor,
 * major, half-diminished and diminished sevenths (the harmony two voices may imply).
 */
const CHORDS = [[0, 4, 7], [0, 3, 7], [0, 3, 6], [0, 4, 7, 10], [0, 3, 7, 10], [0, 4, 7, 11], [0, 3, 6, 10], [0, 3, 6, 9]];
const pc = (p: string) => ((parsePitch(p).midi % 12) + 12) % 12;
/** Do these pitch classes all belong to one chord? */
const oneChord = (pcs: number[]) => Array.from({ length: 12 }, (_, r) => r).some((r) => CHORDS.some((c) => pcs.every((x) => c.some((y) => (y + r) % 12 === x))));
const at = (xs: WtcNote[], t: number) => xs.findIndex((n) => n.at <= t + EPS && t < n.at + n.dur - EPS);
/** A step, also displaced by an octave (a ninth) as Bach's lines sometimes are. */
const step = (a: string, b: string) => interval(a, b).simple === 2 && interval(a, b).number <= 9;
const isStepDown = (a: string, b: string) => {
  const i = interval(a, b);
  return i.number === 2 && i.direction === "down";
};

/** The beat in quarters for a time signature: the denominator's value, or three of them in compound time. */
export function beatOf(time: string): number {
  const [n, d] = time.split("/").map(Number);
  const unit = 4 / d;
  return n % 3 === 0 && n > 3 ? 3 * unit : unit;
}

export function evaluateCounterpoint(inp: CpInput, trace?: number[]): CpEvaluation {
  const { line, given } = inp;
  const out: CpViolation[] = [];
  const end = Math.min(line[line.length - 1].at + line[line.length - 1].dur, given[given.length - 1].at + given[given.length - 1].dur);
  const times = [...new Set([...line, ...given].map((n) => n.at).filter((t) => t >= -EPS && t < end - EPS))].sort((a, b) => a - b);
  const onBeat = (t: number) => {
    const m = (((t + inp.phase) % inp.beat) + inp.beat) % inp.beat;
    return m < EPS || inp.beat - m < EPS;
  };
  /** The neighbouring notes of a line, across a rest of up to a beat. */
  const prevOf = (xs: WtcNote[], i: number) => (i > 0 && xs[i].at - (xs[i - 1].at + xs[i - 1].dur) <= inp.beat + EPS ? xs[i - 1] : null);
  const nextOf = (xs: WtcNote[], i: number) => (i < xs.length - 1 && xs[i + 1].at - (xs[i].at + xs[i].dur) <= inp.beat + EPS ? xs[i + 1] : null);
  type Point = { t: number; li: number; gi: number; iv: Interval };
  const points: Point[] = [];
  for (const t of times) {
    const li = at(line, t);
    const gi = at(given, t);
    if (li < 0 || gi < 0) continue;
    points.push({ t, li, gi, iv: harmonic(line[li].pitch, given[gi].pitch) });
  }
  const moves = (xs: WtcNote[], i: number) => {
    const p = prevOf(xs, i);
    const n = nextOf(xs, i);
    return { p, n, inStep: !!p && step(p.pitch, xs[i].pitch), outStep: !!n && step(xs[i].pitch, n.pitch) };
  };
  /** Passing note or neighbour: entered and left by step. */
  const passing = (xs: WtcNote[], i: number) => {
    const m = moves(xs, i);
    return m.inStep && m.outStep;
  };
  /** Changing notes: the two neighbours of a note in turn (E F D E, E D F E). */
  const doubleNeighbour = (xs: WtcNote[], i: number) => {
    const a = i >= 2 ? xs[i - 2] : null;
    const b = i >= 1 ? xs[i - 1] : null;
    const c = nextOf(xs, i);
    if (!a || !b || !c) return false;
    if (a.pitch === c.pitch && step(a.pitch, b.pitch) && step(xs[i].pitch, c.pitch)) return true;
    // or the first of the pair: X, this (a neighbour), the other neighbour, X
    const d = c ? nextOf(xs, xs.indexOf(c)) : null;
    return !!b && !!d && b.pitch === d.pitch && step(b.pitch, xs[i].pitch) && step(c.pitch, d.pitch);
  };
  /** A note of a chord the context implies: the two sounding notes and one neighbouring note of either voice (only the notes before, if `before`). */
  const chordal = (li: number, gi: number, before = false) => {
    const here = [pc(line[li].pitch), pc(given[gi].pitch)];
    const ctx = (before ? [prevOf(line, li), prevOf(given, gi)] : [prevOf(line, li), nextOf(line, li), prevOf(given, gi), nextOf(given, gi)]).filter((n): n is WtcNote => !!n).map((n) => pc(n.pitch));
    return ctx.some((x) => oneChord([...here, x]));
  };
  /** Against the given voice's passing note: consonant with the note it leaves or the note it reaches. */
  const againstGivenFigure = (li: number, gi: number) => {
    const m = moves(given, gi);
    return [m.p, m.n].some((x) => !!x && isConsonant(harmonic(line[li].pitch, x.pitch)));
  };
  /** A tritone that resolves: to a third or sixth at the next sonority, or the line's step after one skip. */
  const resolvedTritone = (k: number) => {
    const { iv, li } = points[k];
    const tritone = (iv.simple === 5 && iv.quality === "d") || (iv.simple === 4 && iv.quality === "A");
    if (!tritone) return false;
    const nx = points.slice(k + 1).find((q) => q.li !== points[k].li || q.gi !== points[k].gi);
    if (nx && (nx.iv.quality === "M" || nx.iv.quality === "m") && (nx.iv.simple === 3 || nx.iv.simple === 6)) return true;
    const after = line[li + 2];
    return !!after && step(line[li].pitch, after.pitch);
  };
  for (let k = 0; k < points.length; k++) {
    const p = points[k];
    if (isConsonant(p.iv)) continue;
    if (!inp.judged.has(p.li)) continue;
    const l = line[p.li];
    const g = given[p.gi];
    const lineMoves = Math.abs(l.at - p.t) < EPS;
    const givenMoves = Math.abs(g.at - p.t) < EPS;
    const strong = onBeat(p.t);
    const lm = moves(line, p.li);
    if (resolvedTritone(k)) { trace?.push(1); continue; }
    // The given voice's passing note or neighbour, on the beat or off it.
    if (givenMoves && passing(given, p.gi) && againstGivenFigure(p.li, p.gi)) { trace?.push(2); continue; }
    // A note struck again (repercussion) is judged as held.
    const repeated = lineMoves && !!lm.p && lm.p.pitch === l.pitch && Math.abs(lm.p.at + lm.p.dur - l.at) < EPS;
    if (!lineMoves || repeated) {
      // Held while the given voice moves: off the beat its figure; on the beat a suspension
      // (resolved down by step), or a note of the chord the given voice's new note implies.
      if (!strong && !repeated) { trace?.push(3); continue; }
      if (!lm.n || isStepDown(l.pitch, lm.n.pitch)) { trace?.push(4); continue; } // its resolution lies beyond the exercise, or comes
      if (chordal(p.li, p.gi, p.iv.simple !== 4)) { trace?.push(5); continue; }
      out.push({ ruleId: "wtc.cp.unresolved", at: l.at, note: p.li, severity: "error", messageKey: "wtc.rule.unresolved", detail: { interval: p.iv.name } });
      continue;
    }
    if (passing(line, p.li)) { trace?.push(6); continue; }
    // The suspension struck again: repeated from the note before, resolved down by step.
    if (lm.p && lm.p.pitch === l.pitch && lm.n && isStepDown(l.pitch, lm.n.pitch)) { trace?.push(7); continue; }
    // Against the given voice's suspension: its note held from before, resolving down by step.
    const gm = moves(given, p.gi);
    if (!givenMoves && gm.n && isStepDown(g.pitch, gm.n.pitch) && isConsonant(harmonic(l.pitch, gm.n.pitch))) { trace?.push(8); continue; }
    // A new bass under a held note: the note above becomes the seventh of the chord.
    if (!givenMoves && p.iv.simple === 7 && parsePitch(l.pitch).midi < parsePitch(g.pitch).midi) { trace?.push(9); continue; }
    if (!strong) {
      // Off the beat a dissonance is entered or left by step (incomplete neighbour, échappée,
      // cambiata), anticipates its resolution, belongs to changing notes or to the chord implied.
      if (lm.inStep || lm.outStep) { trace?.push(10); continue; }
      if (lm.n && lm.n.pitch === l.pitch) { trace?.push(11); continue; }
      if (doubleNeighbour(line, p.li)) { trace?.push(12); continue; }
      if (chordal(p.li, p.gi)) { trace?.push(14); continue; }
      out.push({ ruleId: "wtc.cp.dissonance", at: l.at, note: p.li, severity: "error", messageKey: "wtc.rule.dissonance", detail: { interval: p.iv.name } });
      continue;
    }
    // On the beat, leapt into: the appoggiatura (resolved down by step), which Bach's
    // countersubjects here never use, or a dissonance left unprepared.
    if (lm.n && isStepDown(l.pitch, lm.n.pitch)) {
      out.push({ ruleId: "wtc.cp.appoggiatura", at: l.at, note: p.li, severity: "error", messageKey: "wtc.rule.appoggiatura", detail: { interval: p.iv.name } });
      continue;
    }
    out.push({ ruleId: "wtc.cp.dissonance", at: l.at, note: p.li, severity: "error", messageKey: "wtc.rule.dissonanceBeat", detail: { interval: p.iv.name } });
  }
  // Two perfect consonances of one kind in a row between successive sonorities, both voices moving.
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1];
    const b = points[k];
    if (a.li === b.li || a.gi === b.gi) continue;
    if (!inp.judged.has(b.li) && !inp.judged.has(a.li)) continue;
    if (!isPerfectConsonance(a.iv) || !isPerfectConsonance(b.iv) || a.iv.simple !== b.iv.simple) continue;
    const dl = interval(line[a.li].pitch, line[b.li].pitch).direction;
    const dg = interval(given[a.gi].pitch, given[b.gi].pitch).direction;
    if (dl === dg && dl !== "none") out.push({ ruleId: "wtc.cp.parallel", at: line[b.li].at, note: b.li, severity: "error", messageKey: "wtc.rule.parallel", detail: { interval: b.iv.simple === 5 ? "fifths" : "octaves" } });
  }
  const errors = out.filter((v) => v.severity === "error");
  return { violations: out, errors, warnings: out.filter((v) => v.severity === "warning"), passed: errors.length === 0 };
}
