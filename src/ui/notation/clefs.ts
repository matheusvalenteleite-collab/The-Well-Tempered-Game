/**
 * Clef geometry: which pitch sits on the bottom line of each clef, and the inverse
 * mapping from a vertical staff position to a natural (unaltered) pitch.
 */
import { parsePitch, type Step } from "../../music/pitch.ts";

export type ClefId = "treble" | "treble_8vb" | "bass" | "soprano" | "mezzo_soprano" | "alto" | "tenor" | "baritone_c" | "baritone_f";

const BOTTOM_LINE: Record<ClefId, string> = {
  treble: "E4",
  treble_8vb: "E3",
  bass: "G2",
  soprano: "C4",
  mezzo_soprano: "A3",
  alto: "F3",
  tenor: "D3",
  baritone_c: "B2",
  baritone_f: "B2",
};

/** VexFlow clef name and annotation for each clef. */
export const VEXFLOW_CLEF: Record<ClefId, { clef: string; annotation?: string }> = {
  treble: { clef: "treble" },
  treble_8vb: { clef: "treble", annotation: "8vb" },
  bass: { clef: "bass" },
  soprano: { clef: "soprano" },
  mezzo_soprano: { clef: "mezzo-soprano" },
  alto: { clef: "alto" },
  tenor: { clef: "tenor" },
  baritone_c: { clef: "baritone-c" },
  baritone_f: { clef: "baritone-f" },
};

const STEPS: Step[] = ["C", "D", "E", "F", "G", "A", "B"];

export function isClefId(x: string): x is ClefId {
  return x in BOTTOM_LINE;
}

/** Natural pitch at `position` half-spaces above the bottom line (0 = bottom line, 1 = first space ...). */
export function pitchAtPosition(clef: ClefId, position: number): string {
  const d = parsePitch(BOTTOM_LINE[clef]).diatonic + position;
  return `${STEPS[((d % 7) + 7) % 7]}${Math.floor(d / 7)}`;
}

/** Half-spaces above the bottom line for a pitch (accidentals ignored). */
export function positionOfPitch(clef: ClefId, pitch: string): number {
  return parsePitch(pitch).diatonic - parsePitch(BOTTOM_LINE[clef]).diatonic;
}
