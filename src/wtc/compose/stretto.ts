/**
 * The subject's strettos (docs/wtc/COMPOSE.md L2): the subject against itself, the second entry
 * coming in a beat, two beats ... later, at the octave, the fifth or the fourth above or below, or
 * the unison, each judged where the two overlap by the two-voice rules (with Bach's licences,
 * isolated). A subject's strettos are fixed by its notes; Bach finds them before he writes (32 of
 * the 48 have one, docs/wtc/structure-study.md). The table shows which a subject allows, and the
 * plan can end on one.
 */
import { beatOf } from "../counterpoint.ts";
import { transpose, type WtcNote } from "../fugues.ts";
import { judgePair } from "./invertible.ts";
import { EPS, lengthOf, toNotes, type FugueDraft } from "./model.ts";

export interface StrettoInterval {
  id: string;
  steps: number;
  semis: number;
}

/** The intervals of the second entry from the first, as Bach's strettos take them. */
export const STRETTO_INTERVALS: StrettoInterval[] = [
  { id: "8up", steps: 7, semis: 12 },
  { id: "8down", steps: -7, semis: -12 },
  { id: "5up", steps: 4, semis: 7 },
  { id: "4down", steps: -3, semis: -5 },
  { id: "4up", steps: 3, semis: 5 },
  { id: "5down", steps: -4, semis: -7 },
  { id: "1", steps: 0, semis: 0 },
];

export interface StrettoRow {
  /** The second entry's delay, in quarters. */
  delay: number;
  interval: StrettoInterval;
  /** Faults (errors) where the entries overlap, and licences (warnings). */
  faults: number;
  licences: number;
  /** The second entry's notes (from the subject's first note). */
  follower: WtcNote[];
}

export function follower(subject: WtcNote[], delay: number, iv: StrettoInterval): WtcNote[] | null {
  try {
    return subject.map((n) => ({ ...n, at: n.at + delay, pitch: transpose(n.pitch, iv.steps, iv.semis) }));
  } catch {
    return null;
  }
}

export function strettoTable(d: FugueDraft): StrettoRow[] {
  const subject = toNotes(d.subject);
  if (subject.length < 3) return [];
  const beat = beatOf(d.time);
  const span = lengthOf(d.subject);
  const rows: StrettoRow[] = [];
  for (let delay = beat; delay <= span - beat + EPS; delay += beat) {
    for (const iv of STRETTO_INTERVALS) {
      const f = follower(subject, delay, iv);
      if (!f) continue;
      const end = span;
      const fIn = f.filter((n) => n.at < end - EPS);
      const lIn = subject.filter((n) => n.at + n.dur > delay + EPS);
      const vs = [...judgePair(fIn, subject, d), ...judgePair(lIn, f, d)];
      // A fault heard from both lines is one fault.
      const seen = new Set<string>();
      let faults = 0;
      let licences = 0;
      for (const v of vs) {
        const k = `${v.ruleId}:${v.at.toFixed(3)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        if (v.severity === "error") faults++;
        else licences++;
      }
      rows.push({ delay, interval: iv, faults, licences, follower: f });
    }
  }
  return rows.sort((a, b) => a.faults - b.faults || a.licences - b.licences || a.delay - b.delay);
}

/** The intervals the plan's last entry can take: the second entry (in the first voice) above the first if the first voice is the upper one. */
export const fitsPlan = (d: FugueDraft, iv: StrettoInterval) => iv.semis === 0 || (d.first === 0 ? iv.semis > 0 : iv.semis < 0);
