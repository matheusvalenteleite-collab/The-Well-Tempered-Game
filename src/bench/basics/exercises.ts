/**
 * D686 (design studio; BASICS v2, the owner's plan): the first four acts' own small pieces, written here and
 * registered with the game (fugue.ts registerPieces) so they play as any piece does: one voice, in C major, 4/4,
 * each note a beat or more, rests where a passage breathes. Made so that the game's real rule and the music
 * agree: a note's direction is judged against the same thumb's last touch, and here that is always the note
 * before (one thumb in Act II; a rest before each pair, so its first note is free).
 */
import { registerPieces, type TouchFugue, type TouchNote } from "../../touch/fugue.ts";

export const TPQ = 480;
const LETTERS = "CDEFGAB";
const PC = [0, 2, 4, 5, 7, 9, 11];

/** "E4" → its MIDI pitch and its staff step (letter + 7 × octave). */
export function pitch(name: string): { midi: number; step: number } {
  const i = LETTERS.indexOf(name[0]);
  const oct = Number(name.slice(1));
  return { midi: 12 * (oct + 1) + PC[i], step: 7 * oct + i };
}

/** A line as [note or "-" (a rest), beats]: one voice, from the downbeat of bar 1. */
export type Line = readonly (readonly [string, number])[];

export function exercise(id: string, title: string, line: Line): TouchFugue {
  const notes: TouchNote[] = [];
  const spell: Record<string, string> = {};
  let t = 0;
  for (const [name, beats] of line) {
    const dur = Math.round(beats * TPQ);
    if (name !== "-") {
      const p = pitch(name);
      notes.push([t, dur, p.midi, p.step]);
      spell[String(p.midi)] = name;
    }
    t += dur;
  }
  const barTicks = 4 * TPQ;
  const nBars = Math.max(1, Math.ceil(t / barTicks));
  const length = nBars * barTicks;
  return {
    id,
    kind: "fugue",
    book: 0,
    number: 0,
    title,
    key: "C",
    bwv: "",
    meter: "4/4",
    tpq: TPQ,
    length,
    barTicks,
    bars: Array.from({ length: nBars }, (_, k) => ({ n: k + 1, on: k * barTicks })),
    // No name: the legend says YOU alone (D691).
    voiceNames: [""],
    voices: [notes],
    entries: [],
    keys: [{ on: 0, key: "C" }],
    spell,
    sections: [{ name: "ALL", fromBar: 1, toBar: nBars, from: 0, to: length }],
    cadences: [],
    countersubject: [],
    short: title,
  } as unknown as TouchFugue;
}

const r = (b = 1): readonly [string, number] => ["-", b];
const n = (name: string, b = 1): readonly [string, number] => [name, b];
const pairs = (ps: [string, string][]): Line => ps.flatMap(([a, b]) => [n(a), n(b), r(2)]);

/** The exercises, by id (basics-*). */
export const EXERCISES: TouchFugue[] = [
  // I TIMING: one repeated note, each two beats apart; then a slow pulse, a note a beat.
  exercise("basics-1-1", "ONE NOTE", [n("G4"), r(), n("G4"), r(), n("G4"), r(), n("G4"), r(), n("G4"), r()]),
  exercise("basics-1-2", "A PULSE", [n("G4"), n("G4"), n("G4"), n("G4"), n("G4"), n("G4"), r(2)]),
  // II DIRECTION, one thumb: pairs up, pairs down, a repeat, mixed; then short climbs and descents with one big leap.
  exercise("basics-2-1", "UP", pairs([["C4", "D4"], ["E4", "F4"], ["G4", "A4"], ["D4", "E4"]])),
  exercise("basics-2-2", "DOWN", pairs([["D5", "C5"], ["B4", "A4"], ["G4", "F4"], ["A4", "G4"]])),
  exercise("basics-2-3", "THE SAME", pairs([["E4", "E4"], ["G4", "G4"], ["C5", "C5"], ["A4", "A4"]])),
  exercise("basics-2-4", "MIXED", pairs([["C4", "D4"], ["G4", "F4"], ["E4", "E4"], ["A4", "B4"], ["D5", "C5"], ["F4", "F4"], ["E4", "G4"], ["B4", "A4"]])),
  exercise("basics-2-5", "CLIMBS", [n("C4"), n("D4"), n("E4"), n("F4"), n("G4", 2), r(2), n("G4"), n("F4"), n("E4"), n("D4"), n("C4", 2), r(2), n("C4"), n("C5", 2), r(2)]),
  // III TWO THUMBS: a slow scale up and down (the same notes at twice the pace for 3.2: the stage's tempo).
  exercise("basics-3-1", "SCALE", [n("C4"), n("D4"), n("E4"), n("F4"), n("G4"), n("A4"), n("B4"), n("C5"), n("B4"), n("A4"), n("G4"), n("F4"), n("E4"), n("D4"), n("C4", 2), r(2)]),
  // IV HOLDING: long notes; then notes with rests between them (lift).
  exercise("basics-4-1", "LONG NOTES", [n("E4", 2), n("G4", 2), n("C5", 4), n("A4", 2), n("F4", 2), n("E4", 4)]),
  exercise("basics-4-2", "RESTS", [n("C5", 2), r(2), n("A4", 2), r(2), n("G4", 1), r(1), n("E4", 1), r(1), n("C4", 2), r(2)]),
];

registerPieces(EXERCISES);
