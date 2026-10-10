/**
 * The Well-Tempered Clavier (D119): fugue expositions read from the ASAP dataset's encodings
 * (tools/wtc-extract.py; data/bach/wtc/README.md). Each fugue gives the subject (dux), Bach's
 * answer (comes) with its mutations, and what the dux sings against the answer (the
 * countersubject, or Bach's free counterpoint where he keeps none). Times are in quarter notes:
 * the subject's from its first note, the answer's and the countersubject's from the answer's entry.
 */
import data from "../../data/bach/wtc/fugues.json" with { type: "json" };
import { parsePitch, type Step } from "../music/pitch.ts";

export interface WtcNote {
  pitch: string;
  /** Onset in quarters. */
  at: number;
  dur: number;
}

export interface WtcFugue {
  id: string;
  bwv: number;
  book: 1 | 2;
  number: number;
  /** "C", "c#", "Eb", "bb" ... (lower case: minor). */
  key: string;
  time: string;
  /** The bar in quarters, and where the subject starts within its bar. */
  barQuarters: number;
  phase: number;
  /** The answer's entry, in quarters after the subject's first note. */
  answerAt: number;
  answerAbove: boolean;
  /** Semitones from the subject to a real answer (7 a fifth up, -5 a fourth down ...). */
  answerShift: number;
  /** Notes of Bach's answer that leave the real transposition (the tonal answer). */
  mutations: number[];
  subject: WtcNote[];
  answer: WtcNote[];
  countersubject: WtcNote[];
}

const q = (r: string) => {
  const [n, d] = r.split("/").map(Number);
  return n / (d ?? 1);
};
const notes = (xs: { pitch: string; at: string; dur: string }[]): WtcNote[] => xs.map((x) => ({ pitch: x.pitch, at: q(x.at), dur: q(x.dur) }));

type Raw = (typeof data)["fugues"][number];
const fromRaw = (r: Raw): WtcFugue => ({
  id: r.id,
  bwv: r.bwv,
  book: r.book as 1 | 2,
  number: r.number,
  key: r.key,
  time: r.time ?? "4/4",
  barQuarters: q(r.barQuarters),
  phase: q(r.phase),
  answerAt: q(r.answerAt),
  answerAbove: r.answerAbove,
  answerShift: r.answerShift,
  mutations: r.mutations,
  subject: notes(r.subject),
  answer: notes(r.answer),
  countersubject: notes(r.countersubject),
});

/** Bach's order of the keys: C, c, C#, c#, D, d ... B, b. */
export const KEY_ORDER = ["C", "c", "C#", "c#", "D", "d", "Eb", "d#", "E", "e", "F", "f", "F#", "f#", "G", "g", "Ab", "g#", "A", "a", "Bb", "bb", "B", "b"];
/** Every fugue of the dataset, in Bach's order of keys, Book I before Book II within a key. */
export const FUGUES: WtcFugue[] = data.fugues.map(fromRaw).sort((a, b) => KEY_ORDER.indexOf(a.key) - KEY_ORDER.indexOf(b.key) || a.book - b.book);

export const isMinor = (key: string) => key[0] === key[0].toLowerCase();

const STEPS: Step[] = ["C", "D", "E", "F", "G", "A", "B"];
const STEP_PC: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ACC = (alter: number) => (alter > 0 ? "#".repeat(alter) : "b".repeat(-alter));

/** A pitch moved by a number of diatonic steps and semitones, spelled accordingly ("F#4" + P5 = "C#5"). */
export function transpose(pitch: string, steps: number, semitones: number): string {
  const p = parsePitch(pitch);
  const d = p.diatonic + steps;
  const step = STEPS[((d % 7) + 7) % 7];
  const octave = Math.floor(d / 7);
  const alter = p.midi + semitones - (12 * (octave + 1) + STEP_PC[step]);
  if (Math.abs(alter) > 2) throw new Error(`cannot spell ${pitch} moved by ${semitones}`);
  return `${step}${ACC(alter)}${octave}`;
}

/** Diatonic steps of a transposition by `semitones` (7 -> 4, a fifth; -5 -> -3, a fourth down; 19 -> 11). */
export const stepsOf = (semitones: number) => Math.round((semitones * 7) / 12);

/** The real answer: the subject moved by the answer's interval, spelled. */
export const realAnswer = (f: WtcFugue) => f.subject.map((n) => transpose(n.pitch, stepsOf(f.answerShift), f.answerShift));

/** The key's tonic as a pitch class name ("F#", "Bb") and its signature: the altered steps. */
export function keySignature(key: string): Record<Step, number> {
  const minor = isMinor(key);
  const tonic = key[0].toUpperCase() + key.slice(1);
  // Position on the line of fifths of the major key with the same signature.
  const LOF: Record<string, number> = { Cb: -7, Gb: -6, Db: -5, Ab: -4, Eb: -3, Bb: -2, F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7, "G#": 8, "D#": 9, "A#": 10 };
  let n = LOF[tonic];
  if (n === undefined) throw new Error(`unknown key ${key}`);
  if (minor) n -= 3;
  const sig: Record<Step, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  const sharps: Step[] = ["F", "C", "G", "D", "A", "E", "B"];
  const flats: Step[] = ["B", "E", "A", "D", "G", "C", "F"];
  for (let i = 0; i < Math.abs(n); i++) {
    const s = n > 0 ? sharps[i % 7] : flats[i % 7];
    sig[s] += n > 0 ? 1 : -1;
  }
  return sig;
}

/** "C major", "C♯ minor" ... */
export function keyName(key: string): string {
  const t = key[0].toUpperCase() + key.slice(1).replace("#", "♯").replace(/b$/, "♭");
  return `${t} ${isMinor(key) ? "minor" : "major"}`;
}
