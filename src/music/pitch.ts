/**
 * Spelled pitches in scientific pitch notation ("Bb3", "C#5"; C4 = MIDI 60).
 * The spelling is primary: MIDI is derived from it, never the other way round.
 */
export type Step = "C" | "D" | "E" | "F" | "G" | "A" | "B";

export interface SpelledPitch {
  name: string;
  step: Step;
  alter: number;
  octave: number;
  midi: number;
  /** Diatonic position (C0 = 0, D0 = 1, ...): the basis of generic interval size. */
  diatonic: number;
}

const STEPS: Step[] = ["C", "D", "E", "F", "G", "A", "B"];
const STEP_PC: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function parsePitch(name: string): SpelledPitch {
  const m = /^([A-G])(#{1,2}|b{1,2})?(-?\d+)$/.exec(name);
  if (!m) throw new Error(`invalid pitch ${JSON.stringify(name)}`);
  const step = m[1] as Step;
  const alter = m[2] ? (m[2][0] === "#" ? m[2].length : -m[2].length) : 0;
  const octave = Number(m[3]);
  return { name, step, alter, octave, midi: 12 * (octave + 1) + STEP_PC[step] + alter, diatonic: 7 * octave + STEPS.indexOf(step) };
}
