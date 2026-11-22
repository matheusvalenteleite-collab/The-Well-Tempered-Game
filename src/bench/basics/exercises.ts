/**
 * D686 (design studio; BASICS v2, the owner's plan): the first four acts' own small pieces, written here and
 * registered with the game (fugue.ts registerPieces) so they play as any piece does: one voice, in C major, 4/4,
 * each note a beat or more, rests where a passage breathes. Made so that the game's real rule and the music
 * agree: a note's direction is judged against the same thumb's last touch, and here that is always the note
 * before (one thumb in Act II; a rest before each pair, so its first note is free).
 */
import { fugueById, registerPieces, type TouchFugue, type TouchNote } from "../../touch/fugue.ts";

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

/**
 * D941 (design studio; the owner's first BASICS playtest: "Repetition of those brainless exercises is a bad idea. We need
 * at least minimal modifications instead of exact repetition"): each later take of a stage plays a version of its line,
 * made from a seed (the stage and the take's number): transposed, its pairs reordered, a rhythm changed, up and down
 * swapped where the stage allows it. The idea stays; the notes differ. Version 0 is the line as written (the clip's).
 */
const DIA = (i: number) => `${LETTERS[((i % 7) + 7) % 7]}${4 + Math.floor(i / 7)}`;
/** A generator a stage's line, by the line's piece: the version for a random source. Notes C4 (0) to E5 (9). */
const MAKERS: Record<string, (rnd: () => number) => Line> = {
  "basics-1-1": (rnd) => {
    const p = DIA(2 + Math.floor(rnd() * 6));
    return Array.from({ length: 5 }, () => [n(p), r(rnd() < 0.5 ? 1 : 2)]).flat();
  },
  "basics-1-2": (rnd) => {
    const p = DIA(2 + Math.floor(rnd() * 6));
    const long = Math.floor(rnd() * 6);
    return [...Array.from({ length: 6 }, (_, i) => n(p, i === long ? 2 : 1)), r(2)];
  },
  "basics-2-1": (rnd) => pairs(pairsOf(rnd, ["up", "up", "up", "up"])),
  "basics-2-2": (rnd) => pairs(pairsOf(rnd, ["down", "down", "down", "down"])),
  "basics-2-3": (rnd) => pairs(pairsOf(rnd, ["same", "same", "same", "same"])),
  "basics-2-4": (rnd) => pairs(pairsOf(rnd, shuffle(rnd, ["up", "up", "up", "down", "down", "down", "same", "same"]))),
  "basics-2-5": (rnd) => {
    const a = Math.floor(rnd() * 3);
    const b = 4 + Math.floor(rnd() * 3);
    const up: Line = [0, 1, 2, 3].map((k) => n(DIA(a + k))).concat([n(DIA(a + 4), 2), r(2)]);
    const down: Line = [0, 1, 2, 3].map((k) => n(DIA(b - k))).concat([n(DIA(b - 4), 2), r(2)]);
    const lo = Math.floor(rnd() * 3);
    const leap: Line = rnd() < 0.5 ? [n(DIA(lo)), n(DIA(lo + 7), 2), r(2)] : [n(DIA(lo + 7)), n(DIA(lo), 2), r(2)];
    return [...(rnd() < 0.5 ? [...up, ...down] : [...down, ...up]), ...leap];
  },
  "basics-3-1": (rnd) => {
    // A scale over five to eight notes, up then down or down then up, from a step chosen; a note or two held longer.
    const span = 4 + Math.floor(rnd() * 4);
    const a = Math.floor(rnd() * (10 - span));
    const up = Array.from({ length: span + 1 }, (_, k) => k);
    const ks = rnd() < 0.5 ? [...up, ...up.slice(0, -1).reverse()] : [...up.slice().reverse(), ...up.slice(1)];
    return [...ks.map((k, i) => n(DIA(a + k), i === ks.length - 1 || (i > 0 && i % 4 === 0 && rnd() < 0.35) ? 2 : 1)), r(2)];
  },
  "basics-4-1": (rnd) => {
    const ds = shuffle(rnd, [2, 2, 2, 2, 4, 4]);
    let p = 2 + Math.floor(rnd() * 4);
    return ds.map((d) => {
      const at = p;
      p = Math.max(1, Math.min(8, p + (rnd() < 0.5 ? -1 : 1) * (1 + Math.floor(rnd() * 3))));
      return n(DIA(at), d);
    });
  },
  "basics-4-2": (rnd) => {
    const ds = shuffle(rnd, [2, 2, 1, 1, 2]);
    return ds.flatMap((d) => [n(DIA(1 + Math.floor(rnd() * 8)), d), r(d)]);
  },
};
type Way = "up" | "down" | "same";
function shuffle<T>(rnd: () => number, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** Pairs moving each its way (a step, a third or a fourth; never the same pair twice running). */
function pairsOf(rnd: () => number, ways: readonly Way[]): [string, string][] {
  let last = -1;
  return ways.map((w) => {
    const s = w === "same" ? 0 : 1 + Math.floor(rnd() * 3);
    let a = 0;
    for (let k = 0; k < 8; k++) {
      a = w === "down" ? s + Math.floor(rnd() * (9 - s)) : Math.floor(rnd() * (9 - s));
      if (a !== last) break;
    }
    last = a;
    return [DIA(a), DIA(w === "up" ? a + s : w === "down" ? a - s : a)];
  });
}
/** A seeded source (mulberry32) for a stage's take. */
export function seeded(key: string, k: number): () => number {
  let h = 2166136261 ^ k;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let s = h >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/**
 * A stage's take `k` as a piece: version 0 the exercise as written; a later one made from (stage, k), registered with the
 * game once (its id "basics-2-1~2.1~3"). A piece that is not one of these exercises: itself.
 */
export function versionOf(piece: string, stage: string, k: number): string {
  const make = MAKERS[piece];
  if (!make || k <= 0) return piece;
  const id = `${piece}~${stage}~${k}`;
  if (fugueById(id).id !== id) registerPieces([exercise(id, `${fugueById(piece).title} ${k + 1}`, lineAt(piece, stage, k))]);
  return id;
}
const LINE_AT = new Map<string, Line>();
/** Version k's line: never the same notes as the take before (drawn again, deterministically, until it differs). */
function lineAt(piece: string, stage: string, k: number): Line {
  const key = `${piece}~${stage}~${k}`;
  const kept = LINE_AT.get(key);
  if (kept) return kept;
  const before = k <= 1 ? EXERCISES.find((e) => e.id === piece)?.voices[0] : fugueById(versionOf(piece, stage, k - 1)).voices[0];
  let line: Line = MAKERS[piece](seeded(stage, k));
  for (let salt = 1; salt < 12 && JSON.stringify(exercise("x", "", line).voices[0]) === JSON.stringify(before); salt++) line = MAKERS[piece](seeded(`${stage}#${salt}`, k));
  LINE_AT.set(key, line);
  return line;
}
