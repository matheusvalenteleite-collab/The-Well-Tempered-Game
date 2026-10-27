/**
 * D333 (WTC 1.49), THE LAB's STUDY: the ten excerpts of the progress study, each played ten times in a
 * row, easier to harder. Each is one voice of a WTC fugue, about four bars (8–20 s at the game's own
 * tempo, the bars adjusted to it), beginning where a phrase or an entry begins, and testing one skill.
 * Chosen from the encoded scores (data/touch/pieces.json, the notes the game makes the player strike),
 * not from memory; test/study.test.ts holds each one to its length and to the feature it tests.
 *
 *   #  piece  voice      bars    skill            notes struck · seconds · shortest gap between strikes
 *   1  I/12   tenor      1–3     chromatic        10 · 14.4 s · 1200 ms (7 of its 9 moves a semitone)
 *   2  I/22   soprano I  1–4     slow legato      13 · 11.2 s · 349 ms (crotchets 698 ms)
 *   3  II/5   tenor      1–3     repeated notes   14 · 11.4 s · 476 ms (D D D, the subject's head)
 *   4  II/23  soprano    49–53   syncopation      23 · 11.5 s · 288 ms (B4, A♯4, G♯4 tied across the beat)
 *   5  II/18  soprano    1–5     alternating      27 · 10.8 s · 361 ms (24 running quavers, thumb to thumb)
 *   6  II/7   soprano    41–46   neighbour notes  26 · 11.6 s · 242 ms (X X Y X: A♭ A♭ G A♭, G G F G, E♭ E♭ D E♭)
 *   7  I/5    soprano    5–7     dotted rhythm    25 · 13.3 s · 139 ms (seven dotted pairs; the 32nds mostly ride)
 *   8  II/24  alto       1–8     leaps            35 ·  9.4 s · 195 ms (octaves G4–G3–G4, F♯4–F♯3–F♯4)
 *   9  II/10  soprano    1–6     fast notes       39 · 13.1 s · 182 ms (the triplet runs of bars 5–6)
 *  10  II/12  soprano    1–6     fast run         44 ·  9.1 s · 190 ms (34 semiquavers, bars 2–6)
 */

export interface StudyExcerpt {
  /** Stable id, kept in the study file ("ii7-neighbour"). */
  id: string;
  piece: string;
  voice: number;
  fromBar: number;
  toBar: number;
  /** The skill in two or three words. */
  skill: string;
  /** What this tests, one line (shown before the excerpt). */
  tests: string;
}

export const STUDY_EXCERPTS: readonly StudyExcerpt[] = [
  { id: "i12-chromatic", piece: "wtc1f12", voice: 2, fromBar: 1, toBar: 3, skill: "chromatic line", tests: "The chromatic subject in slow crotchets: semitone after semitone, the smallest moves on the bars, each one still the right way." },
  { id: "i22-legato", piece: "wtc1f22", voice: 0, fromBar: 1, toBar: 4, skill: "slow legato", tests: "A slow line of long notes and crotchet steps: hand each note to the next thumb without a gap, and hold the long ones their whole length." },
  { id: "ii5-repeats", piece: "wtc2f05", voice: 2, fromBar: 1, toBar: 3, skill: "repeated notes", tests: "The subject's three repeated Ds and the leaps after: strike the same note again with the thumb level, then move clearly." },
  { id: "ii23-syncopation", piece: "wtc2f23", voice: 0, fromBar: 49, toBar: 53, skill: "syncopation", tests: "Running quavers, then notes struck off the beat and held across it (bars 51–53): strike them on time and do not strike again on the beat." },
  { id: "ii18-alternating", piece: "wtc2f18", voice: 0, fromBar: 1, toBar: 5, skill: "alternating thumbs", tests: "The subject's running quavers, thumb after thumb: land each on time without leaning on the note before (over-legato), and its leaps (a fourth, a sixth, an octave)." },
  { id: "ii7-neighbour", piece: "wtc2f07", voice: 0, fromBar: 41, toBar: 46, skill: "neighbour notes", tests: "The figure X X Y X three times (A♭ A♭ G A♭, G G F G, E♭ E♭ D E♭): a repeat, a step down and back in quavers, then a leap." },
  { id: "i5-dotted", piece: "wtc1f05", voice: 0, fromBar: 5, toBar: 7, skill: "dotted rhythm", tests: "The subject's dotted pairs (long, short) after its quick run: the short note late and quick, often a repeat of the long one." },
  { id: "ii24-leaps", piece: "wtc2f24", voice: 1, fromBar: 1, toBar: 8, skill: "leaps", tests: "The subject's octave leaps (G4–G3–G4, F♯4–F♯3–F♯4) and falls of a third, with quick semiquavers between: big moves, clearly the right way." },
  { id: "ii10-fast", piece: "wtc2f10", voice: 0, fromBar: 1, toBar: 6, skill: "fast notes", tests: "The opening, then its triplet runs at 182 ms a note (bars 5–6): keeping up, the thumbs alternating quickly." },
  { id: "ii12-run", piece: "wtc2f12", voice: 0, fromBar: 1, toBar: 6, skill: "fast run", tests: "The subject's head (repeated Fs and Es), then 34 semiquavers stepwise at 190 ms a note: an even run, each step the right way." },
];

/** "II/7" for "wtc2f07". */
export function pieceShort(piece: string): string {
  const m = /^wtc(\d)[fp](\d+)$/.exec(piece);
  return m ? `${m[1] === "1" ? "I" : "II"}/${Number(m[2])}` : piece;
}
