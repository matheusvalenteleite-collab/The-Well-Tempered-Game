/**
 * One-voice mode (D160): the player plays one voice through a section of the fugue and hears only
 * that voice, as they play it. The level is the voice's notes in the section on its own lanes.
 */
import { barStart, barAt, type TouchFugue } from "./fugue.ts";
import { lanePitches, laneNotes, type LaneNote } from "./lanes.ts";

/** Of the points, how many earn the voice. */
export const EARN = 0.8;

export interface Level {
  voice: number;
  /** The lanes' names, lowest first ("Eb4"). */
  lanes: string[];
  notes: LaneNote[];
  /** From the count-in (a bar before the voice's first note) to a beat past the section's end. */
  start: number;
  end: number;
  /** The tick of the voice's first note. */
  first: number;
}

export function level(f: TouchFugue, section: number, voice: number): Level {
  const s = f.sections[section];
  const raw = f.voices[voice].filter(([on]) => on >= s.from && on < s.to);
  const pitches = lanePitches(raw);
  const first = raw[0][0];
  return {
    voice,
    lanes: pitches.map((m) => f.spell[m] ?? String(m)),
    notes: laneNotes(raw, pitches, f.tpq),
    start: barStart(f, barAt(f, first)) - f.tpq * 4,
    end: s.to + f.tpq,
    first,
  };
}
