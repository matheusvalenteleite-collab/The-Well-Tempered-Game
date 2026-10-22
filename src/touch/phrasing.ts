/**
 * Playing the other voices less like a machine (D179): each note gets a level, a length and a hair of
 * timing from its place in the music, as a player would give them.
 *   Weight: the bar's first beat a little stronger, the other beats a little, the notes between them
 *   lighter.
 *   The subject: its notes, wherever it enters, brought forward.
 *   Line: within a voice, the higher notes of a passage a shade louder (the arch of a phrase).
 *   Articulation: a note repeated is detached; a note before a leap is shortened a little; steps stay
 *   joined; a long note is let go just before the next.
 *   Time: a few milliseconds early or late, the same each time (no randomness from run to run).
 * Pure: notes in, shapes out.
 */
import type { OtherNote } from "./voice-mode.ts";

export interface Shape {
  level: number;
  /** The share of its written length the note is held. */
  hold: number;
  /** Seconds early (negative) or late. */
  nudge: number;
}

export function phrase(notes: readonly OtherNote[], beat: number, bar: number, subject: Set<string>): Shape[] {
  // Each voice's notes in order, to see the note after, and the voice's range around each note.
  const byVoice = new Map<number, number[]>();
  notes.forEach((n, i) => byVoice.set(n.voice, [...(byVoice.get(n.voice) ?? []), i]));
  const next = new Map<number, OtherNote | undefined>();
  const local = new Map<number, number>();
  for (const idx of byVoice.values())
    idx.forEach((i, k) => {
      next.set(i, notes[idx[k + 1]]);
      // Where the note stands between the lowest and highest of its neighbours (0 to 1).
      const near = idx.slice(Math.max(0, k - 6), k + 7).map((j) => notes[j].midi);
      const lo = Math.min(...near);
      const hi = Math.max(...near);
      local.set(i, hi > lo ? (notes[i].midi - lo) / (hi - lo) : 0.5);
    });
  return notes.map((n, i) => {
    const inBar = ((n.on % bar) + bar) % bar;
    const weight = inBar === 0 ? 1.12 : inBar % beat === 0 ? 1.04 : 0.94;
    const subj = subject.has(`${n.voice}:${n.on}`) ? 1.15 : 1;
    const arch = 0.92 + 0.16 * (local.get(i) ?? 0.5);
    const after = next.get(i);
    let hold = 1;
    if (after) {
      const gap = after.on - (n.on + n.dur);
      if (gap <= 0 && after.midi === n.midi) hold = 0.78;
      else if (gap <= 0 && Math.abs(after.step - n.step) >= 3) hold = 0.88;
      else if (n.dur >= beat) hold = 0.95;
    }
    // A fixed, small unevenness: a hash of the note.
    const h = Math.sin(n.on * 12.9898 + n.midi * 78.233 + n.voice * 37.719) * 43758.5453;
    const nudge = ((h - Math.floor(h)) * 2 - 1) * 0.006;
    return { level: weight * subj * arch, hold, nudge };
  });
}
