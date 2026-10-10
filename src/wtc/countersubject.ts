/**
 * Countersubjects and invertible counterpoint in the WTC fugues.
 *
 * The countersubject candidate: what the subject's voice plays while the second voice answers. It
 * is regular when it comes back against later entries (transposed, by its intervals and rhythm),
 * and it is used invertibly when it comes back both above and below the subject. Invertible
 * counterpoint at the octave forbids what the inversion would spoil: a fifth between the two lines
 * becomes a fourth (a dissonance against the bass), so it may stand only where a fourth would be
 * acceptable (passing, off the beat).
 */
import { parsePitch } from "../music/pitch.ts";
import { TPQ, type WtcPiece } from "./corpus.ts";
import { line, type Entry, type Note } from "./fugue.ts";

const diatonic = (p: string) => parsePitch(p).diatonic;
const midi = (p: string) => parsePitch(p).midi;

/** The notes of a line sounding within [from, to): clipped to the window. */
export function within(l: Note[], from: number, to: number): Note[] {
  return l.filter((n) => n.on < to && n.on + n.dur > from).map((n) => ({ ...n }));
}

/** The countersubject candidate: the subject's voice during the answer. */
export function countersubjectCandidate(p: WtcPiece, first: number, answer: Note[]): Note[] {
  const from = answer[0].on;
  const last = answer[answer.length - 1];
  return within(line(p.voices[first]), from, last.on + last.dur).filter((n) => n.on >= from);
}

/** How far a passage follows a model: the share of the model's intervals (by letter) and onsets (relative) it keeps. */
export function likeness(model: Note[], other: Note[]): number {
  if (model.length < 3 || other.length < 2) return 0;
  const t0 = model[0].on;
  const u0 = other[0].on;
  const at = new Map(other.map((n) => [n.on - u0, n.pitch]));
  let ok = 0;
  let total = 0;
  for (let i = 1; i < model.length; i++) {
    total++;
    const a = at.get(model[i].on - t0);
    const b = at.get(model[i - 1].on - t0);
    if (a && b && diatonic(a) - diatonic(b) === diatonic(model[i].pitch) - diatonic(model[i - 1].pitch)) ok++;
  }
  return ok / total;
}

export interface CsUse {
  entry: Entry;
  /** The voice carrying the countersubject against this entry, and whether it lies above the entry's voice. */
  voice: number;
  above: boolean;
  likeness: number;
}

/** The later entries accompanied by the countersubject (likeness at least `min`), and where. */
export function countersubjectUses(p: WtcPiece, cs: Note[], entries: Entry[], min = 0.6): CsUse[] {
  if (cs.length < 3) return [];
  const span = cs[cs.length - 1].on + cs[cs.length - 1].dur - cs[0].on;
  const out: CsUse[] = [];
  for (const e of entries.slice(1)) {
    // The countersubject starts where it started against the answer: at the entry's onset, plus
    // its own offset from the answer's start (usually 0).
    let best: CsUse | null = null;
    p.voices.forEach((v, voice) => {
      if (voice === e.voice) return;
      const seg = within(line(v), e.on, e.on + span).filter((n) => n.on >= e.on);
      const lk = likeness(cs, seg);
      if (!best || lk > best.likeness) {
        const mean = (ns: Note[]) => ns.reduce((a, n) => a + midi(n.pitch), 0) / (ns.length || 1);
        const ent = line(p.voices[e.voice]).slice(e.at, e.at + e.length);
        best = { entry: e, voice, above: mean(seg) > mean(ent), likeness: lk };
      }
    });
    if (best && (best as CsUse).likeness >= min) out.push(best);
  }
  return out;
}

export interface Verticals {
  /** Simultaneities sampled at every onset of either line: [simple interval number 1-7, on a strong beat?]. */
  pairs: { simple: number; strong: boolean; quality: number }[];
}

/** The intervals between two lines at every onset of either (simple, by letter: 1 unison/octave ... 7). */
export function verticals(a: Note[], b: Note[], beat = TPQ): Verticals {
  const onsets = [...new Set([...a, ...b].map((n) => n.on))].sort((x, y) => x - y);
  const at = (l: Note[], t: number) => l.find((n) => n.on <= t && n.on + n.dur > t);
  const pairs: Verticals["pairs"] = [];
  for (const t of onsets) {
    const x = at(a, t);
    const y = at(b, t);
    if (!x || !y) continue;
    const d = Math.abs(diatonic(x.pitch) - diatonic(y.pitch));
    pairs.push({ simple: (d % 7) + 1, strong: t % beat === 0, quality: Math.abs(midi(x.pitch) - midi(y.pitch)) % 12 });
  }
  return { pairs };
}
