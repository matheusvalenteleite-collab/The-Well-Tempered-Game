/**
 * The large structure of a fugue from its entries: strettos (an entry beginning before the one
 * before it has ended), episodes (stretches where no entry sounds), and, within an episode, whether
 * it is a sequence (a figure repeated at successive transpositions) and whether that figure comes
 * from the subject (a run of the subject's intervals).
 */
import { parsePitch } from "../music/pitch.ts";
import { TPQ, type WtcPiece } from "./corpus.ts";
import { line, type Entry, type Note } from "./fugue.ts";

const diatonic = (p: string) => parsePitch(p).diatonic;

export interface Span {
  on: number;
  end: number;
}

/**
 * An entry's span: as long as the subject lasts (`length`, in ticks, when given: an entry found by
 * the subject's head is taken to carry the whole subject), else to the end of its matched notes.
 */
export function entrySpan(p: WtcPiece, e: Entry, length?: number): Span {
  const l = line(p.voices[e.voice]);
  const last = l[Math.min(l.length - 1, e.at + e.length - 1)];
  return { on: e.on, end: Math.max(last.on + last.dur, length ? e.on + length : 0) };
}

/** The subject's length in ticks. */
export const subjectLength = (subject: Note[]) => subject[subject.length - 1].on + subject[subject.length - 1].dur - subject[0].on;

/** Entries that begin while an earlier one (in another voice) still sounds: [earlier, later]. */
export function strettos(p: WtcPiece, entries: Entry[], subject?: Note[]): [Entry, Entry][] {
  const len = subject ? subjectLength(subject) : undefined;
  const out: [Entry, Entry][] = [];
  for (let i = 0; i < entries.length; i++)
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (a.voice === b.voice) continue;
      const sa = entrySpan(p, a, len);
      // Overlapping by more than a beat (an answer that enters on the subject's last note is no stretto).
      if (b.on > a.on && b.on < sa.end - TPQ) out.push([a, b]);
    }
  return out;
}

export interface Episode extends Span {
  /** The figure repeated at successive transpositions, if any: its length in notes and how many times. */
  sequence: { voice: number; notes: number; times: number; step: number } | null;
  /** The sequence's figure follows a run of the subject's intervals (by letter) of at least three. */
  fromSubject: boolean;
}

/** Stretches of at least half a bar, after the first entry, where no entry sounds. */
export function episodes(p: WtcPiece, entries: Entry[], subject: Note[]): Episode[] {
  const spans = entries.map((e) => entrySpan(p, e, subjectLength(subject))).sort((a, b) => a.on - b.on);
  const [num, den] = p.meter.split("/").map(Number);
  const bar = (num * 4 * TPQ) / den;
  const out: Episode[] = [];
  let covered = spans[0]?.end ?? 0;
  const gaps: Span[] = [];
  for (const s of spans.slice(1)) {
    if (s.on - covered >= bar / 2) gaps.push({ on: covered, end: s.on });
    covered = Math.max(covered, s.end);
  }
  if (p.length - covered >= bar / 2) gaps.push({ on: covered, end: p.length });
  const sInt = subject.slice(1).map((n, i) => diatonic(n.pitch) - diatonic(subject[i].pitch));
  for (const g of gaps) {
    let sequence: Episode["sequence"] = null;
    let fromSubject = false;
    p.voices.forEach((v, voice) => {
      const l = line(v).filter((n) => n.on >= g.on && n.on < g.end);
      const ints = l.slice(1).map((n, i) => diatonic(n.pitch) - diatonic(l[i].pitch));
      const iois = l.slice(1).map((n, i) => n.on - l[i].on);
      // A figure of k notes repeated at least twice more, each time moved by the same step.
      for (let k = 3; k <= 8 && !sequence; k++) {
        for (let s = 0; s + 3 * k <= l.length && !sequence; s++) {
          let times = 1;
          const step = diatonic(l[s + k].pitch) - diatonic(l[s].pitch);
          if (step === 0) continue;
          while (s + (times + 1) * k <= l.length) {
            const o = s + times * k;
            const same = ints.slice(s, s + k - 1).every((x, i) => x === ints[o + i]) && iois.slice(s, s + k - 1).every((x, i) => x === iois[o + i]);
            const moved = diatonic(l[o].pitch) - diatonic(l[o - k].pitch) === step;
            if (!same || !moved) break;
            times++;
          }
          if (times >= 3) {
            sequence = { voice, notes: k, times, step };
            const fig = ints.slice(s, s + k - 1);
            for (let i = 0; i + 3 <= sInt.length && !fromSubject; i++) {
              for (let j = 0; j + 3 <= fig.length && !fromSubject; j++) if (sInt.slice(i, i + 3).every((x, m) => x === fig[j + m])) fromSubject = true;
            }
          }
        }
      }
    });
    out.push({ ...g, sequence, fromSubject });
  }
  return out;
}
