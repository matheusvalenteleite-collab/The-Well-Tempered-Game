/**
 * Three-voice counterpoint, third and fourth species (Exercitium II, Lectiones III-IV, 1725
 * pp. 99-111): one voice in crotchets (third) or in tied minims, the ligature (fourth), the other
 * two (the cantus among them) in semibreves. Read from the scans.
 *
 * Third species (pp. 99-100): the crotchets must agree with the semibreves of both other parts;
 * what was said of the species in two voices and the three-voice precepts hold; the notes in
 * thesis count most; "if the first crotchet cannot make the harmonic triad, see that the second or
 * the third does" (a recommendation here).
 * Fourth species (pp. 103-111): the two-voice rules of the ligature hold unchanged; the third part
 * takes the concord it would have had without the ligature (the ligature is only the retardation
 * of the following note); ligatures may lie in the bass; a ligature saves neither two octaves nor,
 * in an upper part, two fifths, but in the bass a dissonance resolving into the fifth is tolerated
 * (pp. 104-106); the preparation must be a consonance only where the bass moves every bar — over a
 * held bass, ligatures of dissonances alone are elegant (p. 107); a seventh may take an octave
 * instead of its third by necessity (p. 107); where no ligature is possible a rest may stand
 * (pp. 108, 111), and "a ligature in every bar" means where possible (p. 111).
 *
 * Every one of Fux's solutions passes (D116). Positions are bars.
 */
import { harmonic, interval, isConsonant, isPerfectConsonance, motion, type Interval } from "./interval.ts";
import { parsePitch } from "../music/pitch.ts";
import type { ModalFinal } from "../music/fux/types.ts";
import { HOLD, REST } from "./layout.ts";
import { analyseTrio, consonanceWithBass, falseFifth, finalChord, imperfectInEachBar, innerUnison, melodicLeaps, openingOnFinal, parallelPerfect, upperDissonance, type TrioEvaluation, type TrioRule, type TrioViolation } from "./three-voice.ts";

export interface TrioFloridInput {
  species: 3 | 4;
  modalFinal: ModalFinal;
  cantusIndex: number;
  /** The staff of the moving voice. */
  movingIndex: number;
  /**
   * One line per staff, top first. The semibreve voices: one note a bar. The moving voice: its
   * slots (third: four a bar; fourth: two a bar; one in the last), REST where it rests.
   */
  voices: string[][];
  /** Fourth species: inner bars that may go without a ligature (as many as Fux's own solution has). */
  ligatureAllowance?: number;
  /**
   * Four voices (D148): a semibreve voice divided into two minims, by necessity (1725 pp. 132-133,
   * 138): per voice, per bar, the note of its second half (null where the semibreve is whole). The
   * line in `voices` holds the note sounding at the downbeat.
   */
  halves?: (string | null)[][];
}

const midi = (p: string) => parsePitch(p).midi;
const pc = (p: string) => parsePitch(p).step;
const sounds = (x: string | null | undefined): x is string => !!x && x !== REST && x !== HOLD;
const viol = (id: string, severity: "error" | "warning", messageKey: string, positions: number[], voices: number[], detail?: Record<string, string | number>): TrioViolation => ({
  ruleId: id,
  positions,
  voices,
  severity,
  messageKey,
  ...(detail ? { detail } : {}),
});
const step = (a: string, b: string) => interval(a, b).number === 2;
const isFalseFifth = (i: Interval) => (i.quality === "d" && i.simple === 5) || (i.quality === "A" && i.simple === 4);

interface Note {
  p: string;
  bar: number;
  beat: number;
  slot: number;
}

export function evaluateTrioFlorid(input: TrioFloridInput): TrioEvaluation {
  const m = input.movingIndex;
  const all = input.voices.map((_, x) => x);
  const others = all.filter((x) => x !== m);
  const bars = input.voices[others[0]].length;
  const per = input.species === 3 ? 4 : 2;
  const line = input.voices[m];
  if (line.length !== per * (bars - 1) + 1) throw new Error(`the moving voice needs ${per} notes a bar and one in the last`);
  const slotBar = (k: number) => Math.min(bars - 1, Math.floor(k / per));
  const notes: Note[] = line.flatMap((p, k) => (sounds(p) ? [{ p, bar: slotBar(k), beat: k === line.length - 1 ? 0 : k % per, slot: k }] : []));
  /** A semibreve voice's note in bar b, in its first half (h = 0) or its second (h = 1, if divided). */
  const sem = (x: number, b: number, h: 0 | 1 = 0) => (h === 1 && input.halves?.[x]?.[b]) || input.voices[x][b];
  /** The half of the bar a moving-voice slot falls in. */
  const halfOf = (k: number): 0 | 1 => (k < per * (bars - 1) && k % per >= per / 2 ? 1 : 0);
  /** Is the moving note dissonant against the semibreves of its bar (the bass; seconds and sevenths elsewhere)? */
  const dissonant = (p: string, b: number, h: 0 | 1 = 0) => {
    const os = others.map((x) => sem(x, b, h));
    const low = os.reduce((a, c) => (midi(c) < midi(a) ? c : a));
    if (midi(p) <= midi(low)) return os.some((o) => !isConsonant(harmonic(p, o)));
    if (!isConsonant(harmonic(low, p))) return true;
    return os.some((up, j) => {
      if (j === os.indexOf(low)) return false;
      const i = harmonic(midi(up) < midi(p) ? up : p, midi(up) < midi(p) ? p : up);
      return !isConsonant(i) && i.simple !== 4 && !isFalseFifth(i);
    });
  };
  const dissonantNote = (n: Note) => dissonant(n.p, n.bar, halfOf(n.slot));
  const tiedInto = (k: number) => k > 0 && sounds(line[k]) && line[k - 1] === line[k] && input.species === 4 && k % per === 0;
  const tiedOut = (k: number) => k + 1 < line.length && tiedInto(k + 1);
  const out: TrioViolation[] = [];
  const lowestOther = (b: number, h: 0 | 1 = 0) => others.map((x) => sem(x, b, h)).reduce((a, c) => (midi(c) < midi(a) ? c : a));
  /** The bass is held from bar b into the next, and the moving voice lies above it (p. 107). */
  const heldBass = (b: number) => b + 1 < bars && lowestOther(b, 1) === lowestOther(b + 1);
  const nextNote = (n: Note) => notes[notes.indexOf(n) + 1];
  /**
   * At the close, a note whose only dissonance is a diminished fifth (augmented fourth) that
   * resolves inward into the final bar (the lower note up a semitone, the upper down a step): Fux's
   * Figs. 144 and 151 (and Fig. 123 in second species, D114).
   */
  const cadentialFalseFifth = (n: Note) => {
    if (n.bar !== bars - 2) return false;
    const after = notes.find((x) => x.bar === bars - 1)?.p;
    if (!after) return false;
    const os = others.map((x) => ({ now: sem(x, n.bar, halfOf(n.slot)), then: sem(x, bars - 1) }));
    const low = Math.min(midi(n.p), ...os.map((o) => midi(o.now)));
    return os.every((o) => {
      const i = harmonic(midi(n.p) < midi(o.now) ? n.p : o.now, midi(n.p) < midi(o.now) ? o.now : n.p);
      if (isConsonant(i) || (i.simple === 4 && Math.min(midi(n.p), midi(o.now)) > low)) return true;
      if (!isFalseFifth(i)) return false;
      const [lo, loNext, hi, hiNext] = midi(n.p) < midi(o.now) ? [n.p, after, o.now, o.then] : [o.now, o.then, n.p, after];
      const up = interval(lo, loNext);
      const down = interval(hi, hiNext);
      return up.direction === "up" && up.semitones === 1 && down.direction === "down" && down.number === 2;
    });
  };

  // The structural note of each bar (for the first-species rules): third species, the first note
  // sung in the bar; fourth, a dissonant downbeat stands for the note it delays ('Ligaturam nempe
  // aliud non esse, quàm retardationem Notae sequentis', p. 103), the consonance it resolves to.
  /** Bars whose structural note is a resolution on the half bar (it sounds with the semibreves' second halves). */
  const resolvedLate = new Set<number>();
  const struct = Array.from({ length: bars }, (_, b) => {
    const inBar = notes.filter((n) => n.bar === b);
    if (!inBar.length) return null;
    const d = inBar[0];
    if (input.species === 4 && d.beat === 0 && tiedInto(d.slot) && dissonantNote(d) && inBar[1]) {
      if (halfOf(inBar[1].slot) === 1) resolvedLate.add(b);
      return inBar[1].p;
    }
    return d.p;
  });
  // A bar where the moving voice rests throughout: it is left out of the skeleton by repeating the
  // previous structural note (it then forms no new progression).
  for (let b = 0; b < bars; b++) if (!struct[b]) struct[b] = struct[b - 1] ?? struct.find(Boolean)!;
  const skeleton = all.map((x) => (x === m ? (struct as string[]) : input.voices[x]));
  const sk = analyseTrio({ modalFinal: input.modalFinal, cantusIndex: input.cantusIndex, voices: skeleton });
  // Four voices (D148): with the moving voice, a resolution on the half bar meets a divided
  // semibreve's second minim; among the semibreves, their downbeats.
  const skM = analyseTrio({ modalFinal: input.modalFinal, cantusIndex: input.cantusIndex, voices: all.map((x) => (x === m ? (struct as string[]) : input.voices[x].map((p, b) => (resolvedLate.has(b) ? sem(x, b, 1) : p)))) });
  const SKELETON: readonly TrioRule[] = [consonanceWithBass, upperDissonance, openingOnFinal, finalChord, falseFifth, innerUnison, ...(input.species === 4 ? [imperfectInEachBar] : [])];
  const structNote = (b: number) => notes.find((n) => n.p === struct[b] && n.bar === b);
  out.push(
    ...SKELETON.flatMap((r) => [...r.check(sk).filter((v) => !v.voices.includes(m)), ...r.check(skM).filter((v) => v.voices.includes(m))]).filter((v) => {
      if (v.voices.includes(m) && v.ruleId === "t1.false-fifth") return false;
      // Unisons with the moving voice arise from the ligatures themselves (Fig. 147).
      if (input.species === 4 && v.voices.includes(m) && v.ruleId === "t1.unison") return false;
      if (v.ruleId !== "t1.consonance-bass" || !v.voices.includes(m)) return true;
      const b = v.positions[0];
      const n = structNote(b);
      // A chain of ligatures over a held bass (p. 107), or the cadential false fifth.
      if (n && input.species === 4 && tiedOut(n.slot) && heldBass(b)) return false;
      return !(n && cadentialFalseFifth(n));
    }),
  );
  out.push(...melodicLeaps.check(sk).filter((v) => !v.voices.includes(m)));
  out.push(...parallelPerfect.check(sk).filter((v) => !v.voices.includes(m)));

  // Dissonance treatment of the moving voice.
  notes.forEach((n, i) => {
    if (!dissonantNote(n)) return;
    const prev = notes[i - 1];
    const next = notes[i + 1];
    if (cadentialFalseFifth(n)) return;
    if (input.species === 3) {
      if (n.beat === 0) return void out.push(viol("t3.downbeat", "error", "rule.ts.downbeat-consonance", [n.bar], [m]));
      // At the close, a neighbour note whose only dissonance is a tritone (Fig. 132, bar 10: A-G-A in
      // the bass under C#): not in the text, admitted because it is Fux's (D116).
      const tritoneOnly = others.every((x) => {
        const o = sem(x, n.bar, halfOf(n.slot));
        const i = harmonic(midi(n.p) < midi(o) ? n.p : o, midi(n.p) < midi(o) ? o : n.p);
        return isConsonant(i) || isFalseFifth(i);
      });
      // Four voices (D148): Fux's Fig. 182, bar 10, the same neighbour A-G-A in the bass, a second
      // under the tenor's A: the neighbour at the close is admitted whatever it meets.
      if (n.bar === bars - 2 && (tritoneOnly || all.length === 4) && !!prev && !!next && prev.p === next.p && step(prev.p, n.p)) return;
      const passing = !!prev && !!next && step(prev.p, n.p) && step(n.p, next.p) && interval(prev.p, n.p).direction === interval(n.p, next.p).direction;
      const cambiata = n.beat === 1 && !!prev && !!next && prev.bar === n.bar && step(prev.p, n.p) && interval(prev.p, n.p).direction === "down" && interval(n.p, next.p).number === 3 && interval(n.p, next.p).direction === "down" && !dissonantNote(next);
      if (!passing && !cambiata) out.push(viol("t3.dissonance", "error", "rule.ts.dissonance", [n.bar], [m]));
      return;
    }
    // Fourth species.
    if (n.beat === 0) {
      const resolves = !!next && (!dissonantNote(next) || cadentialFalseFifth(next) || (tiedOut(next.slot) && heldBass(n.bar)));
      const ok = tiedInto(n.slot) && !!next && next.bar === n.bar && step(n.p, next.p) && interval(n.p, next.p).direction === "down" && resolves;
      if (!ok) out.push(viol("t4.resolution", "error", "rule.fos.resolution", [n.bar], [m]));
      return;
    }
    // A dissonant upbeat: tied over only above a held bass (p. 107); untied, only passing.
    if (tiedOut(n.slot)) {
      if (!heldBass(n.bar)) out.push(viol("t4.preparation", "error", "rule.fos.arsis-consonant", [n.bar], [m]));
      return;
    }
    const passing = !!prev && !!next && step(prev.p, n.p) && step(n.p, next.p) && interval(prev.p, n.p).direction === interval(n.p, next.p).direction;
    if (!passing) out.push(viol("t4.preparation", "error", "rule.fos.arsis-consonant", [n.bar], [m]));
  });

  // Ligature kinds (fourth species), against the bass: no octave to ninth or unison to second
  // above it (they hide two octaves); in the bass, no seventh resolving to the octave.
  if (input.species === 4)
    notes.forEach((n, i) => {
      if (n.beat !== 0 || !tiedInto(n.slot) || !dissonantNote(n)) return;
      const os = others.map((x) => sem(x, n.bar));
      const lowX = others.reduce((a, c) => (midi(sem(c, n.bar)) < midi(sem(a, n.bar)) ? c : a));
      const low = sem(lowX, n.bar);
      if (midi(n.p) > midi(low)) {
        const prep = harmonic(sem(lowX, n.bar - 1, 1), notes[i - 1].p);
        const now = harmonic(low, n.p);
        if ((prep.simple === 8 || prep.number === 1) && now.simple === 2) out.push(viol("t4.ligature-kinds", "error", "rule.fos.ligature-kinds", [n.bar - 1, n.bar], [m]));
      } else if (others.some((x) => harmonic(n.p, sem(x, n.bar)).simple === 7 && notes[i + 1] && harmonic(notes[i + 1].p, sem(x, n.bar, halfOf(notes[i + 1].slot))).simple === 8))
        out.push(viol("t4.ligature-kinds", "error", "rule.fos.ligature-kinds", [n.bar], [m]));
    });

  // Successions of perfect consonances between the moving voice and each semibreve.
  for (const x of others) {
    for (let b = 0; b < bars - 1; b++) {
      const last = [...notes].reverse().find((n) => n.bar === b);
      const first = notes.find((n) => n.bar === b + 1);
      if (!last || !first) continue;
      const o0 = sem(x, b, halfOf(last.slot));
      const o1 = sem(x, b + 1);
      // Across the bar line, where both voices move (not into a tied note: that is the ligature).
      if (!tiedInto(first.slot)) {
        const i0 = harmonic(last.p, o0);
        const i1 = harmonic(first.p, o1);
        if (isPerfectConsonance(i0) && isPerfectConsonance(i1) && i0.simple === i1.simple) {
          const mv = motion(o0, last.p, o1, first.p);
          if ((mv === "parallel" || mv === "similar") && !(input.species === 4 && midi(first.p) < midi(o1))) out.push(viol("t3.parallel-perfect", "error", "rule.t1.parallel-perfect", [b, b + 1], [m, x], { from: i0.name, to: i1.name }));
        }
      }
    }
  }

  // Fourth species: a dissonant ligature hides, and does not save, two fifths or two octaves
  // (pp. 104-105): its preparation and its resolution make the same perfect consonance with another
  // voice, the moving voice above it (8-9-8, 5-x-5). In the lower part this is tolerated (p. 105).
  if (input.species === 4)
    notes.forEach((n, i) => {
      if (n.beat !== 0 || !tiedInto(n.slot) || !dissonantNote(n)) return;
      const prep = notes[i - 1];
      const res = notes[i + 1];
      if (!prep || !res || res.bar !== n.bar) return;
      for (const x of others) {
        const before = sem(x, n.bar - 1, halfOf(prep.slot));
        const after = sem(x, n.bar, halfOf(res.slot));
        const i0 = harmonic(before, prep.p);
        const i1 = harmonic(after, res.p);
        if (isPerfectConsonance(i0) && isPerfectConsonance(i1) && i0.simple === i1.simple && midi(res.p) > midi(after) && before !== after)
          out.push(viol("t4.hidden-perfect", "error", "rule.t4.hidden-perfect", [n.bar - 1, n.bar], [m, x], { from: i0.name, to: i1.name }));
      }
    });

  // Third species: a bar whose crotchets never make the triad with the semibreves (p. 100).
  if (input.species === 3)
    for (let b = 1; b < bars - 1; b++) {
      const triad = notes
        .filter((n) => n.bar === b && !dissonantNote(n))
        .some((n) => {
          const ps = [n.p, ...others.map((x) => sem(x, b, halfOf(n.slot)))];
          const bass = ps.reduce((a, c) => (midi(c) < midi(a) ? c : a));
          return ps.some((q) => q !== bass && [3, 6].includes(harmonic(bass, q).simple));
        });
      if (!triad) out.push(viol("t3.triad", "warning", "rule.t3.triad", [b], all));
    }

  // The moving voice's melody: the forbidden leaps.
  for (let i = 1; i < notes.length; i++) {
    const it = interval(notes[i - 1].p, notes[i].p);
    if (it.number >= 3 && (it.quality === "A" || it.quality === "AA" || (it.quality === "M" && it.number === 6) || it.number === 7))
      out.push(viol("t1.melodic", "error", "rule.t1.melodic", [notes[i - 1].bar, notes[i].bar], [m], { interval: it.name }));
  }

  // Fourth species: a ligature in every bar, where possible (p. 111) — as many omissions as Fux's own.
  if (input.species === 4) {
    const untied = Array.from({ length: bars - 2 }, (_, j) => j + 1).filter((b) => !tiedInto(per * b));
    if (untied.length > (input.ligatureAllowance ?? 1)) out.push(viol("t4.ligature-where-possible", "warning", "rule.fos.ligature-where-possible", untied, [m]));
  }

  // The close: one voice reaches the final by a semitone (p. 90).
  {
    const k = bars - 1;
    const ok = all.some((x) => {
      if (x === m) {
        const lastTwo = notes.slice(-2);
        return lastTwo.length === 2 && pc(lastTwo[1].p) === input.modalFinal && interval(lastTwo[0].p, lastTwo[1].p).semitones === 1;
      }
      return pc(sem(x, k)) === input.modalFinal && interval(sem(x, k - 1, 1), sem(x, k)).semitones === 1;
    });
    if (!ok) out.push(viol("t1.cadence", "error", "rule.t1.cadence", [k - 1, k], all));
  }

  const errors = out.filter((x) => x.severity === "error");
  return { violations: out, errors, warnings: out.filter((x) => x.severity === "warning"), passed: errors.length === 0 };
}
