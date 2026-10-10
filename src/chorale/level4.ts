/**
 * Level 4 of the chorale mode (docs/chorales/CONCEPT.md): the figures. One of Kittel's basses is
 * given unfigured, with the melody above it (heard); the player figures every bass note with the
 * chord's position over it (5/3, 6, 6/4; 7, 6/5, 4/3, 4/2). Compared with Kittel's own chord there
 * (his printed figure shown beside it) and Bach's habit over that bass degree under that melody
 * degree.
 *
 * Data: data/chorales/level4.json, written by tools/chorales/figure_plans.py.
 */
import raw from "../../data/chorales/level4.json" with { type: "json" };
import type { Chorale, MelodyNote, Phrase } from "./level1.ts";

export interface L4Note {
  offset: string;
  measure: number;
  pitch: string;
  degree: string;
  melody: string | null;
  melodyDegree: string | null;
  printed: string;
  kittel: string | null;
  habit: Phrase["habit"];
}
interface L4Chorale {
  number: number;
  title: string;
  tonic: string;
  mode: "major" | "minor";
  basses: { label: string; notes: L4Note[] }[];
}
const DATA = raw as unknown as { positions: string[]; chorales: L4Chorale[] };
export const POSITIONS = DATA.positions;
export const LEVEL4: Record<number, L4Chorale> = Object.fromEntries(DATA.chorales.map((c) => [c.number, c]));

/** The bass as a chorale for the score (its notes in place of the melody). */
export function bassChorale(ch: Chorale, notes: L4Note[]): Chorale {
  const melody: MelodyNote[] = notes.map((n, i) => {
    const next = notes[i + 1];
    const end = next ? next.offset : ch.length;
    const [a, b] = n.offset.split("/").map(Number);
    const [c, d] = end.split("/").map(Number);
    const dur = (c / (d || 1)) - (a / (b || 1));
    return { pitch: n.pitch, offset: n.offset, duration: toFrac(dur), measure: n.measure };
  });
  return { ...ch, melody };
}

const toFrac = (x: number): string => {
  for (const den of [1, 2, 4, 8, 16, 32]) if (Math.abs(x * den - Math.round(x * den)) < 1e-9) return `${Math.round(x * den)}/${den}`;
  return `${Math.round(x * 64)}/64`;
};

/** The points of the comparison, in level 1's shape: Kittel's chord (with his printed figure), no
 * Bach setting of this bass, Bach's habit. */
export function points(notes: L4Note[], label: string): Pick<Phrase, "kittel" | "bach" | "habit">[] {
  return notes.map((n) => ({
    kittel: n.kittel ? [{ bass: `${label}${n.printed ? ` (${n.printed})` : ""}`, chord: n.kittel }] : [],
    bach: [],
    habit: n.habit,
  }));
}

const STEPS = "CDEFGAB";
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 11]; // the leading tone raised, as in a figured bass it is by an accidental
const GENERIC: Record<string, number[]> = { "5/3": [3, 5], "6": [3, 6], "6/4": [4, 6], "7": [3, 5, 7], "6/5": [3, 5, 6], "4/3": [3, 4, 6], "4/2": [2, 4, 6] };

/** The upper notes of a figured chord over `bass`, in the key, an octave up: for listening. */
export function realise(position: string, bass: string, tonic: string, mode: "major" | "minor"): string[] {
  const m = /^([A-G])(#*|b*)(\d)$/.exec(bass);
  if (!m) return [];
  const tAlter = [...tonic.slice(1)].reduce((a, c) => a + (c === "#" ? 1 : c === "b" ? -1 : 0), 0);
  const scale = (mode === "major" ? MAJOR : MINOR).map((x) => (PC[tonic[0]] + tAlter + x + 12) % 12);
  const tonicIdx = STEPS.indexOf(tonic[0]);
  const bassMidi = 12 * (Number(m[3]) + 1) + PC[m[1]] + (m[2].startsWith("#") ? m[2].length : -m[2].length);
  return (GENERIC[position] ?? []).map((g) => {
    const li = (STEPS.indexOf(m[1]) + g - 1) % 7;
    const letter = STEPS[li];
    const pc = scale[(li - tonicIdx + 7) % 7];
    let midi = bassMidi + 12;
    while (midi % 12 !== pc) midi++;
    const acc = (((pc - PC[letter]) % 12) + 18) % 12 - 6;
    return letter + (acc > 0 ? "#".repeat(acc) : "b".repeat(-acc)) + (Math.floor((midi - acc - PC[letter]) / 12) - 1);
  });
}
