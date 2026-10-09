/**
 * The answer (D119): the player writes the comes under or over Bach's subject, in the subject's
 * rhythm. Bach's answer is the solution (Bach is the last word here, as Fux is in D39). A real
 * answer copies the subject a fifth higher (or a fourth lower); a tonal answer changes a note or
 * two at the head (the mutation), so that the dominant is answered by the tonic and the answer
 * stays in the key, as Fux teaches for the modes: the fifth of the mode is answered by its fourth,
 * the octave being divided into a fifth and a fourth. Each note is judged against Bach's: right;
 * the same sound spelled otherwise; the real transposition where Bach mutates (with the degrees
 * named); a mutation where Bach's answer is real; or not the subject at all (with the interval the
 * subject makes there).
 */
import { interval } from "../counterpoint/interval.ts";
import { parsePitch, type Step } from "../music/pitch.ts";
import { isMinor, realAnswer, type WtcFugue } from "./fugues.ts";

export interface AnswerVerdict {
  index: number;
  verdict: "bach" | "enharmonic" | "real-not-tonal" | "tonal-not-real" | "wrong" | "missing";
  /** For the messages: the subject's degree here, Bach's, the real transposition's, the subject's interval into this note. */
  detail: { bach: string; real: string; subjectDegree?: string; bachDegree?: string; realDegree?: string; interval?: string };
}

export interface AnswerEvaluation {
  notes: AnswerVerdict[];
  passed: boolean;
  /** Notes right (or right but spelled otherwise). */
  right: number;
}

const STEPS: Step[] = ["C", "D", "E", "F", "G", "A", "B"];

/** The scale degree of a pitch in a key, with its alteration against the key's own scale ("5", "♯4", "♭7"). */
export function degree(pitch: string, key: string): string {
  const tonic = parsePitch(`${key[0].toUpperCase()}${key.slice(1)}4`);
  const p = parsePitch(pitch);
  const steps = (((STEPS.indexOf(p.step) - STEPS.indexOf(tonic.step)) % 7) + 7) % 7;
  const scale = isMinor(key) ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const semis = (((p.midi - tonic.midi) % 12) + 12) % 12;
  let alter = semis - scale[steps];
  if (alter > 6) alter -= 12;
  if (alter < -6) alter += 12;
  // In minor the raised sixth and seventh are the scale's own (melodic minor), named as such.
  return `${alter > 0 ? "♯".repeat(alter) : "♭".repeat(-alter)}${steps + 1}`;
}

/** Same pitch class and octave register as Bach's (the whole line may sit an octave away). */
export function evaluateAnswer(f: WtcFugue, written: (string | null)[]): AnswerEvaluation {
  const real = realAnswer(f);
  const bach = f.answer.map((n) => n.pitch);
  // An octave displacement of the whole answer is not a fault: measure it at the first written note.
  const first = written.findIndex((w) => !!w);
  const octave = first >= 0 ? Math.round((parsePitch(written[first]!).midi - parsePitch(bach[first]).midi) / 12) : 0;
  const shift = (p: string) => {
    const x = parsePitch(p);
    return `${p.replace(/-?\d+$/, "")}${x.octave + octave}`;
  };
  const notes: AnswerVerdict[] = bach.map((b, i) => {
    const w = written[i];
    const detail: AnswerVerdict["detail"] = {
      bach: b,
      real: real[i],
      subjectDegree: degree(f.subject[i].pitch, f.key),
      bachDegree: degree(b, f.key),
      realDegree: degree(real[i], f.key),
      ...(i > 0 ? { interval: describe(f.subject[i - 1].pitch, f.subject[i].pitch) } : {}),
    };
    if (!w) return { index: i, verdict: "missing", detail };
    const target = shift(b);
    if (w === target) return { index: i, verdict: "bach", detail };
    if (parsePitch(w).midi === parsePitch(target).midi) return { index: i, verdict: "enharmonic", detail };
    const mutated = real[i] !== b;
    if (mutated && parsePitch(w).midi === parsePitch(shift(real[i])).midi) return { index: i, verdict: "real-not-tonal", detail };
    if (!mutated && f.mutations.length && i <= 4 && Math.abs(parsePitch(w).midi - parsePitch(target).midi) <= 2 && isTonalChange(f, i, w, octave)) return { index: i, verdict: "tonal-not-real", detail };
    return { index: i, verdict: "wrong", detail };
  });
  const right = notes.filter((n) => n.verdict === "bach" || n.verdict === "enharmonic").length;
  return { notes, passed: right === bach.length, right };
}

/** Where Bach's answer is real, a written note that answers the subject's dominant by the tonic (or the reverse). */
function isTonalChange(f: WtcFugue, i: number, w: string, octave: number): boolean {
  const s = degree(f.subject[i].pitch, f.key);
  const d = degree(w, f.key);
  void octave;
  return (s === "5" && d === "1") || (s === "1" && d === "5");
}

/** "a third up", "a step down", "the same note". */
export function describe(a: string, b: string): string {
  const i = interval(a, b);
  if (i.direction === "none") return "same";
  const size = i.number === 2 ? "step" : `${i.number}`;
  return `${size}-${i.direction}`;
}
