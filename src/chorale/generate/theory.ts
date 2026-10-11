/**
 * Degrees, chords and figures for the generator. A degree is a scale step by its letter and its
 * alteration against the major scale of the tonic ("1", "#4", "b7"), as in tools/chorales; a chord
 * is a Roman numeral whose root is a pitch class over the tonic ("bVI", "II", "vii°" is not used:
 * diminished chords are upper case with °, minor chords lower case), as tools/chorales/cadence_plans.py
 * writes them.
 */
const LETTERS = "CDEFGAB";
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const MAJOR = NATURAL;
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const ROMAN: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };

const mod = (x: number, m: number) => ((x % m) + m) % m;
const alterOf = (s: string) => [...s].reduce((a, c) => a + (c === "#" ? 1 : c === "b" ? -1 : 0), 0);

export interface Key {
  tonic: string;
  mode: "major" | "minor";
}

const tonicLetter = (k: Key) => LETTERS.indexOf(k.tonic[0]);
const tonicPc = (k: Key) => mod(NATURAL[tonicLetter(k)] + alterOf(k.tonic.slice(1)), 12);

/** A degree's step (0 = the tonic's letter) and its pitch class over the tonic. */
export function parseDegree(deg: string): { step: number; pc: number } {
  const m = /^([#b]*)(\d)$/.exec(deg);
  if (!m) throw new Error(`degree ${deg}`);
  const step = Number(m[2]) - 1;
  return { step, pc: mod(MAJOR[step] + alterOf(m[1]), 12) };
}

export const degreePc = (deg: string) => parseDegree(deg).pc;

/** The key signature's pitch class for a step (the major scale, or the natural minor). */
const signaturePc = (k: Key, step: number) => (k.mode === "major" ? MAJOR : MINOR)[mod(step, 7)];

export interface ChordMembers {
  /** Steps over the tonic of root, third, fifth, seventh, ninth. */
  steps: number[];
  /** Pitch classes over the tonic of root, third, fifth, seventh (the seventh as the key signature
   *  gives it), and the minor ninth (the diminished seventh chord's top, read on its dominant). */
  pcs: number[];
}

export function chordMembers(label: string, k: Key): ChordMembers {
  const m = /^([#b]?)([IViv]+)(°?)$/.exec(label);
  if (!m) throw new Error(`chord ${label}`);
  const step = ROMAN[m[2].toUpperCase()];
  const root = mod(MAJOR[step] + alterOf(m[1]), 12);
  const minor = m[2] === m[2].toLowerCase();
  const dim = m[3] === "°";
  const third = root + (minor || dim ? 3 : 4);
  const fifth = root + (dim ? 6 : 7);
  const seventh = signaturePc(k, step + 6);
  return { steps: [step, step + 2, step + 4, step + 6, step + 1].map((s) => mod(s, 7)), pcs: [root, third, fifth, seventh, root + 1].map((p) => mod(p, 12)) };
}

/** Intervals over the bass in each position, the numbers the period's abbreviation shows, and how
 *  many steps the root lies below the bass (0 root position, 2 the third in the bass, ...). */
const POSITION: Record<string, { all: number[]; shown: number[]; root: number }> = {
  "5/3": { all: [5, 3], shown: [], root: 0 },
  "6": { all: [6, 3], shown: [6], root: 2 },
  "6/4": { all: [6, 4], shown: [6, 4], root: 4 },
  "7": { all: [7, 5, 3], shown: [7], root: 0 },
  "6/5": { all: [6, 5, 3], shown: [6, 5], root: 2 },
  "4/3": { all: [6, 4, 3], shown: [4, 3], root: 4 },
  "4/2": { all: [6, 4, 2], shown: [4, 2], root: 6 },
  // the diminished seventh chord, read as a dominant seventh with a minor ninth, its root unsounded
  // (Kirnberger; tools/chorales/kirnberger.py): named by the dominant's member in the bass, figured as
  // the diminished seventh chord's own positions (7 over the leading tone, 6/5, 4/3, 4/2)
  "6/5°": { all: [7, 5, 3], shown: [7], root: 2 },
  "4/3°": { all: [6, 5, 3], shown: [6, 5], root: 4 },
  "4/2°": { all: [6, 4, 3], shown: [4, 3], root: 6 },
  "9°": { all: [6, 4, 2], shown: [4, 2], root: 1 },
};
/** The positions of the diminished seventh chord (rootless: the root of their reading does not sound). */
export const ROOTLESS_POSITIONS = new Set(["6/5°", "4/3°", "4/2°", "9°"]);
export const POSITIONS = Object.keys(POSITION);

export interface FigureRow {
  interval?: number;
  accidental?: "sharp" | "flat" | "natural";
}

/** The figure over a bass note: the position's abbreviation, with an accidental wherever a chord
 *  tone departs from the key signature (a bare accidental for the third, as the period writes it).
 *  Rows top first. The chord's letters are counted from the bass as spelled (the label names its
 *  root by pitch class only: "bVI°" in C is G#-B-D-F when the bass is G#). */
export function figure(pos: string, bassDeg: string, chord: string, k: Key): FigureRow[] {
  const P = POSITION[pos];
  if (!P) return [];
  const bass = parseDegree(bassDeg).step;
  const rootStep = mod(bass - P.root, 7);
  const ch = { pcs: chordMembers(chord, k).pcs, steps: [0, 2, 4, 6, 1].map((x) => mod(rootStep + x, 7)) };
  const rows: FigureRow[] = [];
  for (const iv of P.all) {
    const step = mod(bass + iv - 1, 7);
    const j = ch.steps.indexOf(step);
    let acc: FigureRow["accidental"];
    if (j >= 0 && ch.pcs[j] !== signaturePc(k, step)) acc = absoluteAccidental(ch.pcs[j], step, k);
    if (P.shown.includes(iv)) rows.push(acc ? { interval: iv, accidental: acc } : { interval: iv });
    else if (acc && iv === 3) rows.push({ accidental: acc });
    else if (acc) rows.push({ interval: iv, accidental: acc });
  }
  return rows.sort((a, b) => (b.interval ?? 3) - (a.interval ?? 3));
}

/** The accidental a note needs when written: its alteration against the natural letter. */
function absoluteAccidental(pcOverTonic: number, step: number, k: Key): FigureRow["accidental"] {
  const letter = mod(tonicLetter(k) + step, 7);
  const a = mod(tonicPc(k) + pcOverTonic - NATURAL[letter] + 6, 12) - 6;
  return a > 0 ? "sharp" : a < 0 ? "flat" : "natural";
}

const SIGN = { sharp: "#", flat: "b", natural: "n" } as const;

/** A figure as text, top row first ("7/#", "6", "#6", "" for 5/3). */
export const figureText = (rows: FigureRow[]) => rows.map((r) => (r.accidental ? SIGN[r.accidental] : "") + (r.interval ?? "")).join("/");

/** MIDI number of a spelled pitch (C4 = 60). */
export function midiOf(name: string): number {
  const m = /^([A-G])([#b]*)(-?\d+)$/.exec(name);
  if (!m) throw new Error(`pitch ${name}`);
  return 12 * (Number(m[3]) + 1) + NATURAL[LETTERS.indexOf(m[1])] + alterOf(m[2]);
}

/** Every spelled pitch of a degree between two MIDI numbers (inclusive), lowest first. */
export function degreePitches(deg: string, k: Key, lo: number, hi: number): { name: string; midi: number }[] {
  const { step, pc } = parseDegree(deg);
  const letter = mod(tonicLetter(k) + step, 7);
  const a = mod(tonicPc(k) + pc - NATURAL[letter] + 6, 12) - 6;
  const acc = a > 0 ? "#".repeat(a) : "b".repeat(-a);
  const out: { name: string; midi: number }[] = [];
  for (let oct = 0; oct <= 8; oct++) {
    const midi = 12 * (oct + 1) + NATURAL[letter] + a;
    if (midi >= lo && midi <= hi) out.push({ name: `${LETTERS[letter]}${acc}${oct}`, midi });
  }
  return out;
}

const ROLES = ["root", "third", "fifth", "seventh", "ninth"] as const;
const SEVENTH_POSITIONS = new Set(["7", "6/5", "4/3", "4/2"]);

/** Spell a pitch class over the tonic on a step of the key ("F#", "Bb"). */
function spell(k: Key, step: number, pcOverTonic: number): string {
  const letter = mod(tonicLetter(k) + step, 7);
  const a = mod(tonicPc(k) + pcOverTonic - NATURAL[letter] + 6, 12) - 6;
  return LETTERS[letter] + (a > 0 ? "#".repeat(a) : "b".repeat(-a));
}

export interface ChordTones {
  /** The root's letter name ("F#"). */
  root: string;
  /** The chord as tools/chorales/kirnberger.py names it ("major", "dominant seventh", ...). */
  kind: string;
  /** The bass's member ("root", "third", "fifth", "seventh"). */
  bassRole: string;
  /** The other members, by letter name, with their roles. */
  above: [string, string][];
}

/** The chord over a bass in a position: its members spelled from the bass (as `figure` does). */
export function chordTones(pos: string, bassDeg: string, chord: string, k: Key): ChordTones {
  const P = POSITION[pos] ?? POSITION["5/3"];
  const rootStep = mod(parseDegree(bassDeg).step - P.root, 7);
  const pcs = chordMembers(chord, k).pcs;
  if (ROOTLESS_POSITIONS.has(pos)) {
    // the diminished seventh: third, fifth, seventh and minor ninth of the unsounded root
    const members = [1, 2, 3, 4].map((j) => [spell(k, rootStep + [0, 2, 4, 6, 1][j], pcs[j]), ROLES[j]] as [string, string]);
    const bassRole = ROLES[[0, 2, 4, 6, 1].indexOf(P.root)];
    return { root: spell(k, rootStep, pcs[0]), kind: "dominant seventh, minor ninth for the root", bassRole, above: members.filter(([, r]) => r !== bassRole) };
  }
  const seventh = SEVENTH_POSITIONS.has(pos);
  const n = seventh ? 4 : 3;
  const names = [0, 1, 2, 3].slice(0, n).map((j) => spell(k, rootStep + 2 * j, pcs[j]));
  const bassIndex = [0, 2, 4, 6].indexOf(P.root);
  const triad = mod(pcs[1] - pcs[0], 12) === 4 ? "major" : mod(pcs[2] - pcs[0], 12) === 6 ? "diminished" : "minor";
  let kind: string = triad;
  if (seventh) {
    const s = mod(pcs[3] - pcs[0], 12);
    kind =
      triad === "major"
        ? s === 11 ? "major seventh" : "dominant seventh"
        : triad === "minor"
          ? s === 11 ? "minor-major seventh" : "minor seventh"
          : s === 9 ? "diminished seventh" : "half-diminished seventh";
  }
  return {
    root: names[0],
    kind,
    bassRole: ROLES[bassIndex],
    above: names.flatMap((nm, j) => (j === bassIndex ? [] : [[nm, ROLES[j]] as [string, string]])),
  };
}
