/**
 * One-voice mode (D160): the player plays one voice through a section of the fugue and hears only
 * that voice, as they play it. The level is the voice's notes in the section on its own lanes.
 * D163: two voices, one per thumb, once both are earned in the section at the level.
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

/** The voice's notes in the section. */
export function sectionNotes(f: TouchFugue, section: number, voice: number) {
  const s = f.sections[section];
  return f.voices[voice].filter(([on]) => on >= s.from && on < s.to);
}

export function level(f: TouchFugue, section: number, voice: number): Level {
  const s = f.sections[section];
  const raw = sectionNotes(f, section, voice);
  if (!raw.length) throw new Error(`voice ${voice} is silent in section ${section}`);
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

/** The record of a play: its section, voices and level ("s0-1-rhythm", "s0-0+1-shape"). */
export function recordKey(section: number, voices: number[], level: string): string {
  return `s${section}-${[...voices].sort().join("+")}-${level}`;
}

/** Two voices are open once each is earned alone in the section at the level. */
export function duoOpen(best: Record<string, number>, section: number, voices: number[], level: string): boolean {
  return voices.length < 2 || voices.every((v) => (best[recordKey(section, [v], level)] ?? 0) >= EARN * 100);
}
