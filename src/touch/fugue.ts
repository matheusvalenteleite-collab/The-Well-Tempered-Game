/**
 * The touch game's pieces (D167: the 48 fugues; D168: and the 48 preludes), in the book's order, as
 * tools/touch/extract.ts cuts them from the study's corpus: each part (a fugue's voices, a prelude's
 * hands) a list of [onset, duration, MIDI, staff step] in ticks (tpq per quarter), the highest first; a
 * fugue's entries of the subject, each in its voice, as the subject or as the answer, with its key; the
 * keys the music reaches (entries, or a prelude's cadences); the sections the game plays one at a time.
 */
import data from "../../data/touch/pieces.json" with { type: "json" };

export type TouchNote = [on: number, dur: number, midi: number, step: number];

export interface TouchEntry {
  voice: number;
  form: "subject" | "answer";
  /** "c", "g", "Eb", "f#": minor in lower case. */
  key: string;
  bar: number;
  on: number;
  end: number;
  /** [onset, duration, MIDI, 1 where Bach varies the form] */
  notes: [on: number, dur: number, midi: number, varied: 0 | 1][];
}

export interface TouchFugue {
  id: string;
  kind: "prelude" | "fugue";
  book: number;
  number: number;
  title: string;
  /** The fugue's key, minor in lower case. */
  key: string;
  bwv: string;
  meter: string;
  tpq: number;
  length: number;
  barTicks: number;
  bars: { n: number; on: number }[];
  voiceNames: string[];
  voices: TouchNote[][];
  entries: TouchEntry[];
  /** The keys the music reaches, in time: a fugue's entries, a prelude's cadences. */
  keys: { on: number; key: string }[];
  /** Each MIDI pitch as the score spells it ("Eb4"). */
  spell: Record<string, string>;
  /** The passages the game plays one at a time, in ticks [from, to). */
  sections: { name: string; fromBar: number; toBar: number; from: number; to: number }[];
}

/** All 96, each prelude before its fugue, Book I then Book II. */
export const PIECES = data as unknown as TouchFugue[];
export const FUGUES = PIECES.filter((p) => p.kind === "fugue");
export const PRELUDES = PIECES.filter((p) => p.kind === "prelude");

export function fugueById(id: string): TouchFugue {
  return PIECES.find((f) => f.id === id) ?? PIECES[0];
}

/** "I·2 P", "I·2 F". */
export function shortName(f: TouchFugue): string {
  return `${f.book === 1 ? "I" : "II"}·${f.number} ${f.kind === "prelude" ? "P" : "F"}`;
}

/**
 * The beat the music is counted in (D167): a quarter in 4/4, a half in 2/2, a dotted quarter in 6/8,
 * a dotted eighth in 12/16. Its length in ticks and how many there are in a bar.
 */
export function beatOf(f: TouchFugue): { ticks: number; perBar: number } {
  const [num, den] = f.meter.split("/").map(Number);
  const unit = (f.tpq * 4) / den;
  return num % 3 === 0 && num > 3 ? { ticks: unit * 3, perBar: num / 3 } : { ticks: unit, perBar: num };
}

/** The tick where bar n starts (the end of the piece past the last bar). */
export function barStart(f: TouchFugue, n: number): number {
  return f.bars.find((b) => b.n === n)?.on ?? f.length;
}

/** The key the music is in at a tick: the last reached (an entry begun, a cadence), the piece's own before the first. */
export function keyAt(f: TouchFugue, tick: number): string {
  return f.keys.filter((k) => k.on <= tick).at(-1)?.key ?? f.key;
}

/** The bar a tick falls in. */
export function barAt(f: TouchFugue, tick: number): number {
  return f.bars.filter((b) => b.on <= tick).at(-1)?.n ?? 1;
}

/** "C MINOR", "E♭ MAJOR". */
export function keyName(key: string): string {
  const minor = key[0] === key[0].toLowerCase();
  const tonic = key[0].toUpperCase() + key.slice(1).replace("b", "♭").replace("#", "♯");
  return `${tonic} ${minor ? "MINOR" : "MAJOR"}`;
}

/** A staff step's letter and octave ("C5"). */
export function stepName(step: number): string {
  return `${"CDEFGAB"[((step % 7) + 7) % 7]}${Math.floor(step / 7)}`;
}
