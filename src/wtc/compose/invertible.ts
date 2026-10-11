/**
 * The countersubject in both places: written against the answer in the first voice, it must also
 * serve when the voices exchange it (inverted at the octave: the upper line moved below, or the
 * lower above), and against the subject in the tonic, where later entries bring it. Each placing is
 * judged by the two-voice tonal rules (src/wtc/counterpoint.ts, Bach's licences with it).
 *
 * At the octave every interval turns into its complement to nine: thirds into sixths, which is why
 * they are safe, and the fifth into a fourth, which against the bass is a dissonance. So a fifth
 * that stands as a consonance in one placing must be passing (or prepared and resolved) to stand
 * in the other.
 */
import { parsePitch } from "../../music/pitch.ts";
import { beatOf, evaluateCounterpoint, type CpViolation } from "../counterpoint.ts";
import { withLicences } from "../licences.ts";
import type { WtcNote } from "../fugues.ts";
import { answerNotes } from "./answer.ts";
import { barQuarters, dominantOf, lengthOf, octave, toKey, toNotes, type FugueDraft } from "./model.ts";

const lengthOfSubject = (d: FugueDraft) => lengthOf(d.subject);

export type Placing = "written" | "inverted" | "subject";

export interface PlacingResult {
  placing: Placing;
  /** The countersubject as placed (from the answer's entry, quarters). */
  line: WtcNote[];
  /** The line it is set against. */
  given: WtcNote[];
  violations: CpViolation[];
  /** Whether the countersubject lies above the given line. */
  above: boolean;
}

const mean = (ns: WtcNote[]) => ns.reduce((a, n) => a + parsePitch(n.pitch).midi, 0) / Math.max(1, ns.length);

/** A line moved by octaves until its mean lies at least a third above (or below) another's. */
export function across(line: WtcNote[], other: WtcNote[], above: boolean): WtcNote[] {
  let out = line;
  for (let i = 0; i < 4; i++) {
    const d = mean(out) - mean(other);
    if (above ? d >= 3 : d <= -3) break;
    out = out.map((n) => ({ ...n, pitch: octave(n.pitch, above ? 1 : -1) }));
  }
  return out;
}

/**
 * One line against another, every note of `line` judged; `before`, the notes the line comes from
 * (how its first note is approached), are not. `phase`: where time 0 lies in its bar (the subject's
 * place for lines timed from an entry; 0 for the realised fugue, timed from its first bar line).
 */
export function judgePair(line: WtcNote[], given: WtcNote[], d: FugueDraft, before: WtcNote[] = [], phase = d.phase): CpViolation[] {
  if (!line.length || !given.length) return [];
  const bar = barQuarters(d.time);
  const all = [...before.filter((n) => n.at + n.dur <= line[0].at + 1e-6), ...line];
  const k = all.length - line.length;
  const ev = withLicences(evaluateCounterpoint({ line: all, given, bar, beat: beatOf(d.time), phase: phase % bar, judged: new Set(line.map((_, i) => i + k)) }));
  return ev.violations.map((v) => ({ ...v, note: v.note - k }));
}

/** The countersubject (from the answer's entry) in its three placings. */
export function placings(d: FugueDraft): PlacingResult[] {
  if (!d.answer) return [];
  const answer = answerNotes(d).map((n) => ({ ...n, at: n.at - d.answer!.at }));
  const cs = toNotes(d.countersubject);
  if (!cs.length || !answer.length) return [];
  const csAbove = d.first === 0;
  const written = cs;
  const inverted = across(written, answer, !csAbove);
  // Against the subject in the tonic: the countersubject carried from the answer's key.
  const subject = toNotes(d.subject);
  const home = across(toKey(written, dominantOf(d.key), d.key), subject, csAbove);
  // Where it was written, the countersubject continues the subject (or the codetta): judged from there.
  const lead = [...subject, ...toNotes(d.free["expo:" + d.first + ":0"] ?? [], lengthOfSubject(d))].map((n) => ({ ...n, at: n.at - d.answer!.at }));
  const r = (placing: Placing, line: WtcNote[], given: WtcNote[], above: boolean, before: WtcNote[] = []): PlacingResult => ({ placing, line, given, above, violations: judgePair(line, given, d, before) });
  return [r("written", written, answer, csAbove, lead), r("inverted", inverted, answer, !csAbove), r("subject", home, subject, csAbove)];
}
