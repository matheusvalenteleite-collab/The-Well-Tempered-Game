/**
 * Playing a voice (D160; D163; D167): the player plays one voice (or two, one per thumb) through a
 * section of a fugue. Alone, they hear only what they play; with the others (D167), the other voices
 * of the section play by themselves around them, and the count-in starts at the section's start, so a
 * voice that enters late enters into the music as it does in the fugue. Two voices alone open once both
 * are earned alone in the section at the level (D163).
 */
import { barAt, barStart, beatOf, type TouchFugue } from "./fugue.ts";
import { laneNotes, type LaneNote } from "./lanes.ts";
import { rowWindows, type RowWindow } from "./rows.ts";

/** Of the points, how many earn the voice. */
export const EARN = 0.8;

export interface Level {
  voice: number;
  notes: LaneNote[];
  /** The rows of the keys through the section (rows.ts). */
  windows: RowWindow[];
  /** From the count-in (four beats before the voice's first note's bar, or the section's) to a beat past the section's end. */
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

/** The voices that sing in a section. */
export function voicesIn(f: TouchFugue, section: number): number[] {
  return f.voices.map((_, v) => v).filter((v) => sectionNotes(f, section, v).length > 0);
}

export function level(f: TouchFugue, section: number, voice: number, withOthers = false): Level {
  const s = f.sections[section];
  const raw = sectionNotes(f, section, voice);
  if (!raw.length) throw new Error(`voice ${voice} is silent in section ${section} of ${f.id}`);
  const beat = beatOf(f).ticks;
  const notes = laneNotes(raw, beat, voice);
  const first = raw[0][0];
  const from = withOthers ? s.from : barStart(f, barAt(f, first));
  return {
    voice,
    notes,
    windows: rowWindows(notes, s.from, s.to + beat, f.barTicks),
    start: from - beat * 4,
    end: s.to + beat,
    first,
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

/** The other voices' notes in the section, to play by themselves (D167). */
export function accompaniment(f: TouchFugue, section: number, played: number[]): OtherNote[] {
  const out: OtherNote[] = [];
  f.voices.forEach((_, v) => {
    if (played.includes(v)) return;
    for (const [on, dur, midi, step] of sectionNotes(f, section, v)) out.push({ on, dur, midi, step, voice: v });
  });
  return out.sort((a, b) => a.on - b.on);
}

/** The record of a play: its fugue, section, voices and level ("wtc1f02-s0-1-easy"). */
export function recordKey(fugue: string, section: number, voices: number[], level: string): string {
  return `${fugue}-s${section}-${[...voices].sort().join("+")}-${level}`;
}

/** Two voices are open once each is earned alone in the section at the level. */
export function duoOpen(best: Record<string, number>, fugue: string, section: number, voices: number[], level: string): boolean {
  return voices.length < 2 || voices.every((v) => (best[recordKey(fugue, section, [v], level)] ?? 0) >= EARN * 100);
}
