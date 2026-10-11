/**
 * The harmony chapter's answers (D150), computed from the notes, never typed: the root of a chord
 * stacked in thirds, its degree in a key as a Roman numeral (upper case major, lower case minor,
 * ° diminished, ø half-diminished), its figures over the bass (5/3, 6/3, 6/4; 7, 6/5, 4/3, 4/2),
 * and the cadence two chords make.
 */
import { parsePitch } from "../music/pitch.ts";

const LETTERS = "CDEFGAB";
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const pc = (p: string) => ((parsePitch(p).midi % 12) + 12) % 12;
const letter = (p: string) => LETTERS.indexOf(parsePitch(p).step);
const low = (ps: string[]) => [...ps].sort((a, b) => parsePitch(a).midi - parsePitch(b).midi);

export interface Chord {
  /** The root's letter index (C = 0). */
  root: number;
  rootPitch: string;
  /** Members present above the root: 3, 5, 7. */
  seventh: boolean;
  /** "major" | "minor" | "diminished" | "augmented" (the triad), and for sevenths the seventh's size. */
  quality: "major" | "minor" | "diminished" | "augmented";
  seventhSize: "minor" | "major" | null;
  /** Which member is in the bass: 0 root, 2 third, 4 fifth, 6 seventh (letter steps above the root). */
  bassMember: 0 | 2 | 4 | 6;
}

/** The chord a column of notes makes, stacked in thirds (null if it is not a triad or seventh chord). */
export function chordOf(column: string[]): Chord | null {
  const ps = low(column);
  const letters = [...new Set(ps.map(letter))];
  for (const r of letters) {
    const rel = letters.map((l) => (l - r + 7) % 7);
    if (!rel.every((x) => [0, 2, 4, 6].includes(x)) || !rel.includes(2)) continue;
    const of = (step: number) => ps.find((p) => (letter(p) - r + 7) % 7 === step);
    const root = of(0)!;
    const third = (pc(of(2)!) - pc(root) + 12) % 12;
    const fifthNote = of(4);
    const fifth = fifthNote ? (pc(fifthNote) - pc(root) + 12) % 12 : 7;
    const quality = third === 4 ? (fifth === 8 ? "augmented" : "major") : fifth === 6 ? "diminished" : "minor";
    const sev = of(6);
    const seventhSize = sev ? ((pc(sev) - pc(root) + 12) % 12 === 11 ? "major" : "minor") : null;
    return { root: r, rootPitch: root, seventh: !!sev, quality, seventhSize, bassMember: ((letter(ps[0]) - r + 7) % 7) as 0 | 2 | 4 | 6 };
  }
  return null;
}

/** The Roman numeral of a column in a key ("C", "A" ...): V, ii, vii°, V7, viiø7 ... */
export function degreeOf(column: string[], tonic: string): string {
  const c = chordOf(column);
  if (!c) return "?";
  const n = ROMAN[(c.root - LETTERS.indexOf(tonic[0].toUpperCase()) + 7) % 7];
  const upper = c.quality === "major" || c.quality === "augmented";
  let s = upper ? n : n.toLowerCase();
  if (c.quality === "diminished") s += c.seventh && c.seventhSize === "minor" ? "ø" : "°";
  if (c.quality === "augmented") s += "+";
  return c.seventh ? `${s}7` : s;
}

/** The figures over the bass: "53", "63", "64" for a triad; "7", "65", "43", "42" for a seventh chord. */
export function figuresOf(column: string[]): string {
  const c = chordOf(column);
  if (!c) return "?";
  if (!c.seventh) return c.bassMember === 0 ? "53" : c.bassMember === 2 ? "63" : "64";
  return c.bassMember === 0 ? "7" : c.bassMember === 2 ? "65" : c.bassMember === 4 ? "43" : "42";
}

/** The cadence two chords make in a key: authentic (V-I), plagal (IV-I), deceptive (V-vi), half (ending on V). */
export function cadenceOf(a: string[], b: string[], tonic: string): "authentic" | "plagal" | "deceptive" | "half" | "none" {
  const x = degreeOf(a, tonic).replace("7", "");
  const y = degreeOf(b, tonic).replace("7", "");
  if (x === "V" && (y === "I" || y === "i")) return "authentic";
  if ((x === "IV" || x === "iv") && (y === "I" || y === "i")) return "plagal";
  if (x === "V" && (y === "vi" || y === "VI")) return "deceptive";
  if (y === "V") return "half";
  return "none";
}
