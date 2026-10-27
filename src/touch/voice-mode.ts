/**
 * Playing a voice (D160; D167; D169): the player plays one voice of a piece (a fugue's voice, a
 * prelude's hand) while the others play by themselves around it, from a chosen point in the piece to
 * its end. The point is a share of the piece (0 to 99%), taken back to the start of its bar; the
 * count-in is the four beats before it.
 */
import { barAt, barStart, countInStart, beatOf, type TouchFugue, entryShape } from "./fugue.ts";
import { laneNotes, type LaneNote } from "./lanes.ts";
import type { Span } from "./box-fx.ts";

export interface Level {
  voice: number;
  notes: LaneNote[];
  /** From the count-in (four beats before the starting bar) to a beat past the end. */
  start: number;
  end: number;
  /** The tick play starts at (a bar's start), and of the voice's first note from there. */
  from: number;
  first: number;
}

/** The start of the bar at a share of the piece (0 to 0.99). */
export function startTick(f: TouchFugue, share: number): number {
  // From the beginning: the very first note (an upbeat before bar 1 included; D184).
  if (share <= 0) return 0;
  return barStart(f, barAt(f, Math.max(0, Math.min(0.99, share)) * f.length));
}

/** The voices that still sing from a tick on. */
export function voicesFrom(f: TouchFugue, from: number): number[] {
  // D340: only the voices the piece offers (the concerto's two solo violins).
  return f.voices.map((_, v) => v).filter((v) => (!f.playable || f.playable.includes(v)) && f.voices[v].some(([on]) => on >= from));
}

export function level(f: TouchFugue, voice: number, from: number): Level {
  const raw = f.voices[voice].filter(([on]) => on >= from);
  if (!raw.length) throw new Error(`voice ${voice} of ${f.id} is silent from ${from}`);
  const beat = beatOf(f).ticks;
  const notes = laneNotes(raw, beat, voice);
  return {
    voice,
    notes,
    start: countInStart(f, from),
    end: f.length + beat,
    from,
    first: raw[0][0],
  };
}

/** A note of a voice the player does not play. */
export interface OtherNote {
  on: number;
  dur: number;
  midi: number;
  step: number;
  voice: number;
}

/** The other voices' notes from a tick on, to play by themselves (D167). */
export function accompaniment(f: TouchFugue, from: number, played: number): OtherNote[] {
  const out: OtherNote[] = [];
  f.voices.forEach((notes, v) => {
    if (v === played) return;
    for (const [on, dur, midi, step] of notes) if (on >= from) out.push({ on, dur, midi, step, voice: v });
  });
  return out.sort((a, b) => a.on - b.on);
}

/** Every note of the piece, as the music box draws it: the steps' range, for one fixed ladder. */
export function stepRange(f: TouchFugue): { lo: number; hi: number } {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of f.voices) for (const n of v) (lo = Math.min(lo, n[3])), (hi = Math.max(hi, n[3]));
  return { lo, hi };
}

/** The subject's notes, as "voice:onset", and each entry's first note (D174: the music box marks them). */
export function subjectMarks(f: TouchFugue): { subject: Set<string>; entries: { voice: number; on: number; step: number }[] } {
  const subject = new Set<string>();
  const entries: { voice: number; on: number; step: number }[] = [];
  for (const e of f.entries) {
    for (const [on] of e.notes) subject.add(`${e.voice}:${on}`);
    const first = f.voices[e.voice].find((n) => n[0] === e.on);
    if (first) entries.push({ voice: e.voice, on: e.on, step: first[3] });
  }
  return { subject, entries };
}

/** D186: each entry whole, for the box to draw (its notes as staff steps, the top of a chord). */
export function entrySpans(f: TouchFugue): Span[] {
  const stepsOf = (voice: number) => {
    const steps = new Map<number, number>();
    for (const [on, , , step] of f.voices[voice]) steps.set(on, Math.max(step, steps.get(on) ?? -Infinity));
    return steps;
  };
  const entries: Span[] = f.entries.map((e) => {
    const steps = stepsOf(e.voice);
    const seen = new Set<number>();
    const path = e.notes.filter(([on]) => steps.has(on) && !seen.has(on) && (seen.add(on), true)).map(([on, dur]) => ({ on, dur, step: steps.get(on)! }));
    return { voice: e.voice, on: e.on, end: e.end, form: e.form, key: e.key, path, shape: entryShape(e), theme: e.theme };
  });
  // D194: the countersubjects, drawn beside their entries (silver).
  const counters: Span[] = (f.countersubject ?? []).map((c) => {
    const path = f.voices[c.voice]
      .filter(([on]) => on >= c.on && on < c.end)
      .filter(([on], i, a) => !(i > 0 && a[i - 1][0] === on))
      .map(([on, dur, , step]) => ({ on, dur, step }));
    return { voice: c.voice, on: c.on, end: c.end, form: "counter", key: f.entries[c.entry]?.key ?? f.key, path };
  });
  return [...entries, ...counters.filter((c) => c.path.length)];
}
