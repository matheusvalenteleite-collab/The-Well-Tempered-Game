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
const memo2 = new WeakMap<TouchFugue, (Syllable[] | null)[]>();
/**
 * A voice's words (null for an instrument or a piece without words), unpacked once. D679: `second`, the chorales'
 * second line under the notes (D728 lyricsSecond); the stanza the edition prints for the line ("1", "2") before
 * its first syllable ("1. AUS").
 */
export function lyricsOf(f: TouchFugue, voice: number, second = false): Syllable[] | null {
  const lines = second ? f.lyricsSecond : f.lyrics;
  if (!lines) return null;
  const m = second ? memo2 : memo;
  let all = m.get(f);
  if (!all) m.set(f, (all = []));
  if (all[voice] === undefined) {
    const p = lines[voice];
    const syls = p && p.length ? unpackLyrics(p) : null;
    const stanza = f.words?.stanzas?.[second ? 1 : 0];
    if (syls && stanza) syls[0] = { ...syls[0], shown: `${stanza}. ${syls[0].shown}` };
    all[voice] = syls;
  }
  return all[voice];
}

/**
 * D679 (design studio): the words drawn under the player's voice in a chorale: its own where the edition underlays
 * them, else the soprano's (the hymn's words; the edition underlays the lower voices in only 43 of the 370), marked
 * `borrowed` so the box draws them a shade fainter; the second line under the first.
 */
export function wordsFor(f: TouchFugue, voice: number): { first: Syllable[]; second: Syllable[] | null; borrowed: boolean } | null {
  const own = lyricsOf(f, voice);
  if (own) return { first: own, second: lyricsOf(f, voice, true), borrowed: false };
  if (voice === 0 || f.collection !== "chorale") return null;
  const sop = lyricsOf(f, 0);
  return sop ? { first: sop, second: lyricsOf(f, 0, true), borrowed: true } : null;
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
