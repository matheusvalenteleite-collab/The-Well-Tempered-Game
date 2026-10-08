/**
 * Listening transforms of the player's line (the score and the evaluation keep the written line):
 * inversion, retrograde, or both. Pure.
 */
import { parsePitch } from "../music/pitch.ts";
import { sounding } from "../counterpoint/layout.ts";

export interface LineTransform {
  /** Diatonic mirror about the line's first note (accidentals dropped: the mirror is in the mode's white-key gamut). */
  inversion: boolean;
  /** The notes in reverse order, on the same rhythm (rests stay where they are). */
  retrograde: boolean;
}

export const NO_TRANSFORM: LineTransform = { inversion: false, retrograde: false };
const STEPS = ["C", "D", "E", "F", "G", "A", "B"];

/** The diatonic mirror of `pitch` about the diatonic position `axis`. */
export function invertAbout(pitch: string, axis: number): string {
  const d = 2 * axis - parsePitch(pitch).diatonic;
  const octave = Math.floor(d / 7);
  return `${STEPS[d - 7 * octave]}${octave}`;
}

export function transformLine(notes: (string | null)[], t: LineTransform): (string | null)[] {
  if (!t.inversion && !t.retrograde) return notes;
  const idx = notes.map((n, k) => (sounding(n) ? k : -1)).filter((k) => k >= 0);
  if (!idx.length) return notes;
  let pitches = idx.map((k) => notes[k] as string);
  // Both transforms take the original first note as their reference, so RI = IR.
  if (t.inversion) {
    const axis = parsePitch(pitches[0]).diatonic;
    pitches = pitches.map((p) => invertAbout(p, axis));
  }
  if (t.retrograde) pitches = [...pitches].reverse();
  const out = [...notes];
  idx.forEach((k, i) => (out[k] = pitches[i]));
  return out;
}
