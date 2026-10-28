/**
 * D347: the words of a sung voice (BWV 228, BWV 54: tools/touch/more-bach.ts packLyrics, from the
 * editions' MusicXML), unpacked once a piece and voice: each syllable on the tick of the note it starts
 * on, carried to the end of its melisma's last note, as written (the edition's spelling), with whether
 * a hyphen follows it (the word goes on). The music box draws them (MusicBox.tsx paintLyrics).
 */
import type { TouchFugue } from "./fugue.ts";

export interface Syllable {
  /** The tick of the note it starts on. */
  on: number;
  /** The end of its last note (the melisma's), in ticks. */
  end: number;
  /** As the edition writes it ("Teu", "fel,"). */
  text: string;
  /** A hyphen follows it: the next syllable is the same word's. */
  joined: boolean;
  /** As the box's pixel font draws it (upper case: "TEU", "FEL,"). */
  shown: string;
}

/** A packed voice ([onset after the last onset, length, text (a trailing "-": joined)] a syllable) unpacked. */
export function unpackLyrics(packed: readonly (number | string)[]): Syllable[] {
  const out: Syllable[] = [];
  let on = 0;
  for (let i = 0; i + 2 < packed.length; i += 3) {
    on += Number(packed[i]);
    const raw = String(packed[i + 2]);
    const joined = raw.endsWith("-");
    const text = joined ? raw.slice(0, -1) : raw;
    out.push({ on, end: on + Number(packed[i + 1]), text, joined, shown: text.toUpperCase() });
  }
  return out;
}

const memo = new WeakMap<TouchFugue, (Syllable[] | null)[]>();
/** A voice's words (null for an instrument or a piece without words), unpacked once. */
export function lyricsOf(f: TouchFugue, voice: number): Syllable[] | null {
  if (!f.lyrics) return null;
  let all = memo.get(f);
  if (!all) memo.set(f, (all = []));
  if (all[voice] === undefined) {
    const p = f.lyrics[voice];
    all[voice] = p && p.length ? unpackLyrics(p) : null;
  }
  return all[voice];
}

/** The first syllable still sounding at or after `tick` (its melisma ends after it): where drawing starts. */
export function firstFrom(syls: readonly Syllable[], tick: number): number {
  let lo = 0;
  let hi = syls.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (syls[mid].end <= tick) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
