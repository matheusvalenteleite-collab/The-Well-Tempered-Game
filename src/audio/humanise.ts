/**
 * Humanised playback (decision D53): a small set of performance rules in the manner of the KTH
 * rule system (Friberg, Bresin & Sundberg, "Overview of the KTH rule system for musical
 * performance", Advances in Cognitive Psychology 2, 2006), reduced to what suits two- and
 * three-voice counterpoint in whole and half notes. Each rule is small; together they give
 * shape without mannerism. Deterministic (the same piece always plays the same way). Pure.
 *
 * 1. Metric accent: downbeats a little louder than upbeats.
 * 2. Phrase arch: louder towards the middle of the piece, softer at its ends.
 * 3. High loud: within a voice, higher notes a little louder.
 * 4. Repeated notes are detached (the second attack is heard as such).
 * 5. A short breath before a leap of a fourth or more.
 * 6. Final ritardando over the last bars, and a longer final note.
 * 7. A few milliseconds of irregularity in onset and loudness.
 */
import type { PlayEvent } from "../counterpoint/layout.ts";
import { parsePitch } from "../music/pitch.ts";

export interface NoteShape {
  /** 0..1, 0.75 neutral. */
  velocity: number;
  /** Multiplies the written duration. */
  length: number;
}

export interface EventShape {
  /** Onset delay in seconds (may be slightly negative). */
  delay: number;
  /** Multiplies the time to the next onset (the ritardando). */
  stretch: number;
  /** Per voice: "cantus", "counterpoint", "fux" or a version id. */
  notes: Record<string, NoteShape>;
}

const NEUTRAL = 0.75;
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
/** Deterministic noise in -1..1. */
const noise = (k: number, salt: number) => {
  const x = Math.sin((k + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return 2 * (x - Math.floor(x)) - 1;
};

/** The notes of an event, by voice. */
export function voicesOf(e: PlayEvent): Record<string, string> {
  const out: Record<string, string> = {};
  if (e.cantus) out.cantus = e.cantus;
  if (e.counterpoint) out.counterpoint = e.counterpoint;
  if (e.fux) out.fux = e.fux;
  for (const [id, p] of Object.entries(e.versions ?? {})) if (p) out[id] = p;
  return out;
}

export function humanisePlan(events: PlayEvent[]): EventShape[] {
  if (!events.length) return [];
  const total = Math.max(...events.map((e) => e.at + e.length));
  // Mean pitch per voice (for "high loud") and each voice's note sequence (for repetition and leaps).
  const seq = new Map<string, { k: number; midi: number; diatonic: number }[]>();
  events.forEach((e, k) => {
    for (const [v, p] of Object.entries(voicesOf(e))) {
      const x = parsePitch(p);
      if (!seq.has(v)) seq.set(v, []);
      seq.get(v)!.push({ k, midi: x.midi, diatonic: x.diatonic });
    }
  });
  const mean = new Map([...seq].map(([v, xs]) => [v, xs.reduce((s, x) => s + x.midi, 0) / xs.length]));
  const nextOf = new Map<string, Map<number, { midi: number; diatonic: number }>>();
  for (const [v, xs] of seq) nextOf.set(v, new Map(xs.slice(0, -1).map((x, i) => [x.k, xs[i + 1]])));

  return events.map((e, k) => {
    const pos = (e.at + e.length / 2) / total;
    const downbeat = Number.isInteger(e.at);
    // 6. Final ritardando: the last ~15% slows progressively, up to about 40% slower; and the
    // phrase arch in time (2): a little broader at the start, moving on in the middle.
    const tail = clamp(((e.at + e.length) / total - 0.85) / 0.15, 0, 1);
    const stretch = (1 + 0.4 * tail * tail) * (1 + 0.06 * (1 - Math.sin(Math.PI * clamp(pos, 0, 1))));
    const notes: Record<string, NoteShape> = {};
    for (const [v, p] of Object.entries(voicesOf(e))) {
      const x = parsePitch(p);
      let vel = NEUTRAL;
      vel += downbeat ? 0.1 : -0.08; // 1
      vel += 0.16 * Math.sin(Math.PI * clamp(pos, 0, 1)) - 0.08; // 2
      vel += clamp(0.012 * (x.midi - (mean.get(v) ?? x.midi)), -0.1, 0.1); // 3
      vel += 0.04 * noise(k, v.length); // 7
      let length = 1;
      const next = nextOf.get(v)?.get(k);
      if (next && next.midi === x.midi) length *= 0.72; // 4
      else if (next && Math.abs(next.diatonic - x.diatonic) >= 3) length *= 0.85; // 5
      if (k === events.length - 1 || (pos > 0.97 && v === "cantus")) length *= 1.15; // 6
      notes[v] = { velocity: clamp(vel, 0.4, 1), length };
    }
    return { delay: 0.015 * noise(k, 7), stretch, notes }; // 7
  });
}
