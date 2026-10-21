/**
 * The touch game's fugue (Book I, C minor, BWV 847), as tools/touch/extract.ts cuts it from the
 * study's corpus: each voice a list of [onset, duration, MIDI] in ticks (tpq per quarter), top first,
 * and the entries of the subject, each in its voice, as the subject or as the tonal answer.
 */
import data from "../../data/touch/wtc1f02.json" with { type: "json" };

export type TouchNote = [on: number, dur: number, midi: number];

export interface TouchEntry {
  voice: number;
  form: "subject" | "answer";
  /** "c", "g", "Eb": minor in lower case. */
  key: string;
  bar: number;
  on: number;
  end: number;
  /** [onset, duration, MIDI, 1 where Bach varies the form] */
  notes: [on: number, dur: number, midi: number, varied: 0 | 1][];
}

export interface TouchFugue {
  id: string;
  title: string;
  book: number;
  bwv: string;
  meter: string;
  tpq: number;
  length: number;
  bars: { n: number; on: number }[];
  voiceNames: string[];
  voices: TouchNote[][];
  entries: TouchEntry[];
  /** Each MIDI pitch as the score spells it ("Eb4"). */
  spell: Record<string, string>;
  /** The passages the game plays one at a time, in ticks [from, to). */
  sections: { name: string; fromBar: number; toBar: number; from: number; to: number }[];
}

export const FUGUE = data as unknown as TouchFugue;

/** The lowest and highest MIDI pitch of the whole piece, so the box's pitch axis never moves. */
export function pitchRange(f: TouchFugue): { lo: number; hi: number } {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of f.voices) for (const [, , m] of v) (lo = Math.min(lo, m)), (hi = Math.max(hi, m));
  return { lo, hi };
}

/** The tick where bar n starts (the end of the piece past the last bar). */
export function barStart(f: TouchFugue, n: number): number {
  return f.bars.find((b) => b.n === n)?.on ?? f.length;
}

/** The key the music is in at a tick: that of the latest entry begun (c before the first). */
export function keyAt(f: TouchFugue, tick: number): string {
  return f.entries.filter((e) => e.on <= tick).at(-1)?.key ?? f.entries[0]?.key ?? "c";
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
