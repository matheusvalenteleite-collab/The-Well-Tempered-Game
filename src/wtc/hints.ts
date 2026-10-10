/**
 * The hint for the countersubject (D119, after D115): which notes the rules allow at a place, given
 * the notes already written around it. Candidates: every step within a seventh of the note before,
 * with the key signature's alteration or one more sharp or flat; each is tried in the written line
 * (unwritten places are left as rests) and kept if no rule faults it or the note after it.
 */
import { parsePitch, type Step } from "../music/pitch.ts";
import { beatOf, evaluateCounterpoint, type CpViolation } from "./counterpoint.ts";
import { isMinor, keySignature, type WtcFugue, type WtcNote } from "./fugues.ts";
import { degree } from "./answer.ts";

/**
 * The degrees a line in the key uses: the scale, and the leading tones of its other degrees (in
 * major ♯1 ♯2 ♯4 ♯5 and ♭7, towards ii, iii, V, vi and IV; in minor the raised 6th and 7th, ♯3 and
 * ♯4 towards iv and v, and the Neapolitan ♭2).
 */
const DEGREES = { major: new Set(["1", "2", "3", "4", "5", "6", "7", "♯1", "♯2", "♯4", "♯5", "♭7"]), minor: new Set(["1", "2", "3", "4", "5", "6", "7", "♯6", "♯7", "♯3", "♯4", "♭2"]) };

const STEPS: Step[] = ["C", "D", "E", "F", "G", "A", "B"];

export interface CpHint {
  allowed: string[];
  /** The written note's faults, if it is not allowed. */
  faults: CpViolation[];
  written: string | null;
}

/** Judge the line with `pitch` at place i; returns the faults that fall on it (or on the next note, for parallels). */
function faultsWith(f: WtcFugue, line: (string | null)[], i: number, pitch: string): CpViolation[] {
  const tail: WtcNote[] = f.subject.map((n) => ({ ...n, at: n.at - f.answerAt }));
  const mine: { n: WtcNote; k: number }[] = [];
  f.countersubject.forEach((n, k) => {
    const p = k === i ? pitch : line[k];
    if (p) mine.push({ n: { ...n, pitch: p }, k });
  });
  const all = [...tail, ...mine.map((x) => x.n)];
  const at = tail.length + mine.findIndex((x) => x.k === i);
  const ev = evaluateCounterpoint({ line: all, given: f.answer, bar: f.barQuarters, beat: beatOf(f.time), phase: (f.phase + f.answerAt) % f.barQuarters, judged: new Set([at, at + 1]) });
  return ev.errors.filter((v) => v.note === at || (v.ruleId === "wtc.cp.parallel" && v.note === at + 1));
}

export function counterHint(f: WtcFugue, line: (string | null)[], i: number): CpHint {
  const sig = keySignature(f.key);
  let ref = f.subject[f.subject.length - 1].pitch;
  for (let k = i - 1; k >= 0; k--) if (line[k]) {
    ref = line[k]!;
    break;
  }
  const r = parsePitch(ref);
  const seen = new Set<number>();
  const allowed: string[] = [];
  for (let d = r.diatonic - 6; d <= r.diatonic + 6; d++) {
    const step = STEPS[((d % 7) + 7) % 7];
    const octave = Math.floor(d / 7);
    for (const alter of [sig[step], sig[step] + 1, sig[step] - 1]) {
      if (Math.abs(alter) > 2) continue;
      const pitch = `${step}${alter > 0 ? "#".repeat(alter) : "b".repeat(-alter)}${octave}`;
      const midi = parsePitch(pitch).midi;
      if (seen.has(midi)) continue;
      if (!DEGREES[isMinor(f.key) ? "minor" : "major"].has(degree(pitch, f.key))) continue;
      if (faultsWith(f, line, i, pitch).length === 0) {
        seen.add(midi);
        allowed.push(pitch);
      }
    }
  }
  allowed.sort((a, b) => parsePitch(a).midi - parsePitch(b).midi);
  const written = line[i];
  return { allowed, written, faults: written ? faultsWith(f, line, i, written) : [] };
}
