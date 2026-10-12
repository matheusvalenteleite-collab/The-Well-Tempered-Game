/**
 * Level 6 of the chorale mode, diminution (docs/chorales/CONCEPT.md section 3; C16, C19): one of
 * Bach's chorales with its alto, tenor and bass reduced to chord tones (his incidental notes taken
 * out, as the library reads them), the soprano as he wrote it. The player embellishes the lower
 * voices again: on a note, a passing note, a neighbour, a suspension or an anticipation, where the
 * next note allows it; and compares with Bach's own diminution at the same places, and with his
 * habit by voice and kind.
 *
 * Data: the study's data (data/chorales/study.json, C15): voices [onset, length, pitch, fermata?]
 * in 32nds of a whole note, and at each onset the incidental notes struck [voice, kind].
 */
import { parsePitch } from "../music/pitch.ts";

export type Note = [number, number, string, 1?];
export interface StudyLike {
  n: number;
  voices: Note[][];
  harmony: [number, string, string, string, [number, number][]?][];
  sig: number;
}
/** The embellishments the player can add (Bach's kinds that a note can take towards the next). */
export type Embellishment = "passing" | "neighbourUp" | "neighbourDown" | "suspension" | "anticipation";
export const EMBELLISHMENTS: Embellishment[] = ["passing", "neighbourUp", "neighbourDown", "suspension", "anticipation"];
/** Accented kinds: the dissonance falls on the beat and the resolution is the chord tone. */
const ACCENTED = new Set(["suspension", "retardation", "appoggiatura"]);

/** Where Bach embellishes: on the reduced note `index` of `voice`, by `kind`, with the pitch he writes. */
export interface BachPoint {
  voice: number;
  index: number;
  kind: string;
  pitch: string | null;
}

/**
 * The reduction: in each lower voice (alto, tenor, bass) Bach's incidental notes taken out. An
 * unaccented one (passing, neighbour, anticipation, escape, free) is absorbed by the note before; an
 * accented one (suspension, retardation, appoggiatura) gives its time to its resolution, which then
 * falls on the beat (a tied suspension is cut where the dissonance begins). Returns the reduced
 * voices and Bach's points: which reduced note each incidental note embellished, and how.
 */
export function reduce(c: StudyLike, kinds: string[]): { voices: Note[][]; bach: BachPoint[] } {
  const voices: Note[][] = [c.voices[0].map((n) => [...n] as Note)];
  const bach: BachPoint[] = [];
  for (let v = 1; v < 4; v++) {
    const notes: Note[] = c.voices[v].map((n) => [...n] as Note);
    const marks: [number, string][] = [];
    for (const h of c.harmony) for (const [vv, k] of h[4] ?? []) if (vv === v) marks.push([h[0], kinds[k]]);
    // Each mark, in time order, on the line as it stands; `orig` remembers the pitch Bach wrote.
    const points: { at: number; kind: string; pitch: string | null }[] = [];
    for (const [at, kind] of marks) {
      const i = notes.findIndex((n) => n[0] === at);
      if (i >= 0) {
        const n = notes[i];
        if (ACCENTED.has(kind) && i + 1 < notes.length && notes[i + 1][0] === n[0] + n[1]) {
          // The resolution takes the beat.
          notes[i + 1] = [n[0], n[1] + notes[i + 1][1], notes[i + 1][2], notes[i + 1][3]];
          notes.splice(i, 1);
        } else if (!ACCENTED.has(kind) && i > 0 && notes[i - 1][0] + notes[i - 1][1] === n[0]) {
          notes[i - 1] = [notes[i - 1][0], notes[i - 1][1] + n[1], notes[i - 1][2], n[3] ?? notes[i - 1][3]];
          notes.splice(i, 1);
        } else continue;
        points.push({ at, kind, pitch: n[2] });
      } else if (ACCENTED.has(kind)) {
        // A tied suspension: the note held over the beat is cut there; its resolution takes the beat.
        const j = notes.findIndex((n) => n[0] < at && n[0] + n[1] > at);
        if (j < 0 || j + 1 >= notes.length || notes[j + 1][0] !== notes[j][0] + notes[j][1]) continue;
        const held = notes[j];
        const rest = held[0] + held[1] - at;
        notes[j] = [held[0], at - held[0], held[2]];
        notes[j + 1] = [at, rest + notes[j + 1][1], notes[j + 1][2], notes[j + 1][3]];
        points.push({ at, kind, pitch: held[2] });
      }
    }
    // Bach's point belongs to the reduced note before the incidental note's onset (the one it embellishes towards the next).
    for (const p of points) {
      const idx = notes.reduce((best, n, k) => (n[0] < p.at ? k : best), -1);
      if (idx >= 0) bach.push({ voice: v, index: idx, kind: p.kind, pitch: p.pitch });
    }
    voices.push(notes);
  }
  return { voices, bach };
}

const LETTERS = "CDEFGAB";
const diatonic = (p: string) => {
  const q = parsePitch(p);
  return LETTERS.indexOf(q.step) + 7 * q.octave;
};
const midi = (p: string) => parsePitch(p).midi;
const sigAlter = (sig: number, letter: string) => {
  const order = sig > 0 ? "FCGDAEB" : "BEADGCF";
  return order.slice(0, Math.abs(sig)).includes(letter) ? Math.sign(sig) : 0;
};
/** The pitch `steps` letters from `p`, altered as the signature says, unless that makes an augmented second with `p` or `next`. */
function stepFrom(p: string, steps: number, sig: number, next?: string): string {
  const d = diatonic(p) + steps;
  const letter = LETTERS[((d % 7) + 7) % 7];
  const octave = Math.floor(d / 7);
  const spell = (alter: number) => `${letter}${alter > 0 ? "#".repeat(alter) : "b".repeat(-alter)}${octave}`;
  let alter = sigAlter(sig, letter);
  // A step is a second of one or two semitones: an augmented second is respelled.
  for (const nb of [p, next]) {
    if (!nb) continue;
    const gap = Math.abs(midi(spell(alter)) - midi(nb));
    if (Math.abs(diatonic(spell(alter)) - diatonic(nb)) === 1 && gap === 3) alter += midi(spell(alter)) > midi(nb) ? -1 : 1;
  }
  return spell(alter);
}

/** The embellishments a note can take towards the next one in its voice. */
export function options(line: Note[], i: number): Embellishment[] {
  const a = line[i];
  const b = line[i + 1];
  if (!a || !b || a[0] + a[1] !== b[0] || a[1] < 8 || a[3]) return [];
  const d = diatonic(b[2]) - diatonic(a[2]);
  const out: Embellishment[] = [];
  if (Math.abs(d) === 2) out.push("passing");
  if (d === 0) out.push("neighbourUp", "neighbourDown");
  if (d === -1 && b[1] >= 8) out.push("suspension");
  if (d !== 0) out.push("anticipation");
  return out;
}

/**
 * A lower voice with the player's embellishments: a passing note, neighbour or anticipation takes
 * the last quaver of its note; a suspension holds the note over into the next one's first beat, the
 * resolution coming a beat later.
 */
export function realise(line: Note[], chosen: Record<number, Embellishment>, sig: number): Note[] {
  const out: Note[] = line.map((n) => [...n] as Note);
  // From the end, so that the indices of the notes before stay valid.
  for (let i = line.length - 2; i >= 0; i--) {
    const e = chosen[i];
    if (!e || !options(line, i).includes(e)) continue;
    const [at, dur, p] = out[i];
    const next = out[i + 1];
    if (e === "suspension") {
      const hold = Math.min(8, next[1] / 2);
      out[i] = [at, dur + hold, p];
      out[i + 1] = [next[0] + hold, next[1] - hold, next[2], next[3]];
      continue;
    }
    const q = e === "passing" ? stepFrom(p, Math.sign(diatonic(next[2]) - diatonic(p)), sig, next[2]) : e === "neighbourUp" ? stepFrom(p, 1, sig) : e === "neighbourDown" ? stepFrom(p, -1, sig) : next[2];
    out.splice(i, 1, [at, dur - 4, p], [at + dur - 4, 4, q]);
  }
  return out;
}

/** Augmented seconds in a realised line (the one boundary a diminution can cross, C16). */
export function augmentedSeconds(line: Note[]): number[] {
  const out: number[] = [];
  for (let k = 1; k < line.length; k++) {
    if (line[k - 1][0] + line[k - 1][1] !== line[k][0]) continue;
    if (Math.abs(diatonic(line[k][2]) - diatonic(line[k - 1][2])) === 1 && Math.abs(midi(line[k][2]) - midi(line[k - 1][2])) === 3) out.push(k);
  }
  return out;
}

/** Bach's kind as the player's embellishment names it (a neighbour by its direction). */
export function bachAs(p: BachPoint, line: Note[]): Embellishment | null {
  if (p.kind === "passing") return "passing";
  if (p.kind === "suspension") return "suspension";
  if (p.kind === "anticipation") return "anticipation";
  if (p.kind === "neighbour" && p.pitch) return midi(p.pitch) > midi(line[p.index][2]) ? "neighbourUp" : "neighbourDown";
  return null;
}
