/**
 * D230, SCALE KEYS (an experiment for the computer's HIGHWAY, off by default): the home row is the
 * home key's scale, A S D F G H J K = degrees 1 2 3 4 5 6 7 8 (do … do; the tonic the piece's key),
 * the row above the raised degrees and the row below the lowered ones, as a piano's black keys:
 *   raised  1 W · 2 E · 3 R · 4 T · 5 Y · 6 U · 7 I   (the dominant side: the row above lights up)
 *   lowered 1 Z · 2 X · 3 C · 4 V · 5 B · 6 N · 7 M   (the subdominant side: the row below)
 * A degree and its alteration are read from the note's SPELLING (its staff step: the letter as the
 * score writes it, pieces.json) against the home key's scale, not from the key signature: in C minor
 * E♭ is degree 3 (home), E♮ raised 3 (R), A♮ raised 6 (U), B♭ lowered 7 (M); in C major F♯ raised 4 (T).
 * A minor home key's scale is the natural minor with the raised 7th (the leading tone stays home).
 * The tonic folds: A or K, whichever lies the line's way from the key before (rising into the tonic
 * K, falling A); a repeated note the key before (or SPACE). Pure: notes in, keys out.
 */

export interface ScaleHome {
  /** The tonic's letter, 0 = C … 6 = B. */
  letter: number;
  /** The tonic's pitch class. */
  pc: number;
  minor: boolean;
}

/** Each degree's distance from the tonic, in semitones: major, and minor (natural, the 7th raised). */
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 11];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

/** The home row (degrees 1 to 8), the raised (above) and the lowered (below), each by degree 1 to 7. */
export const SCALE_HOME = ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK"];
export const SCALE_UP = ["KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI"];
export const SCALE_DOWN = ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM"];
/** The road's lanes in this layout: the eight home keys. */
export const SCALE_LANES = 8;

/** A piece's key ("c", "Eb", "f#") as the home: its tonic and mode. */
export function homeOf(key: string): ScaleHome {
  const letter = "CDEFGAB".indexOf(key[0].toUpperCase());
  const acc = [...key.slice(1)].reduce((a, ch) => a + (ch === "#" ? 1 : ch === "b" ? -1 : 0), 0);
  return { letter, pc: (((LETTER_PC[letter] + acc) % 12) + 12) % 12, minor: key[0] === key[0].toLowerCase() };
}

/** "HOME: C MINOR". */
export function homeName(key: string): string {
  const minor = key[0] === key[0].toLowerCase();
  return `HOME: ${key[0].toUpperCase()}${key.slice(1).replace("b", "♭").replace("#", "♯")} ${minor ? "MINOR" : "MAJOR"}`;
}

/**
 * A note's degree (0 = 1st … 6 = 7th) by its letter (the staff step), and its alteration against the
 * home scale's degree: 1 raised, -1 lowered, 0 diatonic (a double alteration counts as one: same row).
 */
export function degreeOf(midi: number, step: number, home: ScaleHome): { deg: number; alter: -1 | 0 | 1 } {
  const letter = ((step % 7) + 7) % 7;
  const deg = (letter - home.letter + 7) % 7;
  const want = (home.pc + (home.minor ? MINOR : MAJOR)[deg]) % 12;
  const d = ((((midi - want) % 12) + 18) % 12) - 6;
  return { deg, alter: d > 0 ? 1 : d < 0 ? -1 : 0 };
}

/** A note's key in this layout: its code, its row (1 above, 0 home, -1 below), its place across the eight lanes (a black key between two). */
export interface ScaleKey {
  code: string;
  row: -1 | 0 | 1;
  pos: number;
  deg: number;
  /** The tonic at home: A or K both answer it. */
  tonic: boolean;
}

/** The key of a degree and alteration (the tonic at home: A, or K when `high`). */
export function keyOfDegree(deg: number, alter: -1 | 0 | 1, high = false): ScaleKey {
  if (alter > 0) return { code: SCALE_UP[deg], row: 1, pos: deg + 0.5, deg, tonic: false };
  if (alter < 0) return { code: SCALE_DOWN[deg], row: -1, pos: deg - 0.5, deg, tonic: false };
  const d = deg === 0 && high ? 7 : deg;
  return { code: SCALE_HOME[d], row: 0, pos: d, deg, tonic: deg === 0 };
}

/**
 * The keys of a line (notes in time, a chord's notes together, highest first): each note's degree by
 * its spelling; the tonic folded to A or K the line's way from the key before (rising K, falling A; at
 * the edge already, the same edge; the first note the way the line goes next leaves room: A when it
 * rises, K when it falls); a repeated pitch the key before.
 */
export function scaleKeys(notes: { on: number; midi: number; step: number }[], key: string): ScaleKey[] {
  const home = homeOf(key);
  const out: ScaleKey[] = [];
  // The top of the onset before (its index), and of the next.
  let prevTop = -1;
  let curTop = -1;
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    if (i === 0 || notes[i - 1].on !== n.on) (prevTop = curTop), (curTop = i);
    const { deg, alter } = degreeOf(n.midi, n.step, home);
    const p = prevTop >= 0 ? notes[prevTop] : null;
    if (p && p.midi === n.midi && out[prevTop]) {
      out.push(out[prevTop]);
      continue;
    }
    if (alter !== 0 || deg !== 0) {
      out.push(keyOfDegree(deg, alter));
      continue;
    }
    let dir: number;
    if (p) dir = Math.sign(n.midi - p.midi);
    else {
      let j = i + 1;
      while (j < notes.length && notes[j].on === n.on) j++;
      dir = j < notes.length ? -Math.sign(notes[j].midi - n.midi) : -1;
    }
    const was = p ? out[prevTop].pos : dir > 0 ? -1 : 8;
    // Rising: the tonic to the right of the key before (K), unless already at or past it; falling: A.
    out.push(keyOfDegree(0, 0, dir > 0 || (dir === 0 && was >= 3.5)));
  }
  return out;
}

/** Whether a key answers a note's key (the tonic at home: A or K). */
export const scaleFits = (k: ScaleKey, code: string) => code === k.code || (k.tonic && (code === "KeyA" || code === "KeyK"));

/** The pitch a key asks for, nearest a note (for a wrong key: what was struck, heard). */
export function keyPitch(code: string, near: number, key: string): number | undefined {
  const home = homeOf(key);
  let deg = SCALE_HOME.indexOf(code);
  let alter = 0;
  if (deg < 0) (deg = SCALE_UP.indexOf(code)), (alter = 1);
  if (deg < 0) (deg = SCALE_DOWN.indexOf(code)), (alter = -1);
  if (deg < 0) return undefined;
  const pc = (home.pc + (home.minor ? MINOR : MAJOR)[deg % 7] + alter + 12) % 12;
  const base = near - ((((near - pc) % 12) + 12) % 12);
  return near - base > 6 ? base + 12 : base;
}

/** Of a run of notes, the share on each row (home, above, below): how far the music has gone from home. */
export function rowShares(notes: { midi: number; step: number }[], key: string): { home: number; up: number; down: number } {
  const home = homeOf(key);
  let up = 0;
  let down = 0;
  for (const n of notes) {
    const a = degreeOf(n.midi, n.step, home).alter;
    if (a > 0) up++;
    else if (a < 0) down++;
  }
  const all = Math.max(1, notes.length);
  return { home: (notes.length - up - down) / all, up: up / all, down: down / all };
}
