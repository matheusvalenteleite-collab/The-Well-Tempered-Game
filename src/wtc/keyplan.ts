/**
 * The key plan of a fugue: in which key each entry of the subject stands. An entry's key is read
 * from how far, by letter, its notes lie from the subject's (the commonest offset over the entry,
 * so that a tonal head does not mislead), and its quality from the third above that key's tonic as
 * the entry spells it, where the entry touches it.
 */
import { parsePitch } from "../music/pitch.ts";
import type { WtcPiece } from "./corpus.ts";
import { line, type Entry, type Note } from "./fugue.ts";

const LETTERS = "CDEFGAB";
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

export interface EntryKey {
  /** Degree of the entry's key over the home tonic, 0 = the tonic ... 6. */
  offset: number;
  /** Roman numeral relative to the home key, upper case major, lower case minor. */
  roman: string;
  /** The key spelled, e.g. "G", "e", "Bb". */
  name: string;
}

/** Letter offset of the entry from the subject: the commonest over its notes. */
export function entryOffset(p: WtcPiece, e: Entry, subject: Note[]): number {
  const l = line(p.voices[e.voice]).slice(e.at, e.at + e.length);
  const count = new Map<number, number>();
  l.forEach((n, i) => {
    if (!subject[i]) return;
    const d = (((parsePitch(n.pitch).diatonic - parsePitch(subject[i].pitch).diatonic) % 7) + 7) % 7;
    count.set(d, (count.get(d) ?? 0) + 1);
  });
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
}

/** The key of an entry. Its tonic: the home tonic moved up by the offset, spelled as the entry spells that letter (or the home scale's). */
export function entryKey(p: WtcPiece, e: Entry, subject: Note[]): EntryKey {
  const offset = entryOffset(p, e, subject);
  const home = parsePitch(`${p.key}4`);
  const letterIndex = (LETTERS.indexOf(home.step) + offset) % 7;
  const letter = LETTERS[letterIndex];
  const l = line(p.voices[e.voice]).slice(e.at, e.at + e.length);
  // The tonic's accidental: as the home scale has it (major or natural minor), unless the key is
  // the dominant of a minor home (then the home scale's degree is natural); the third's quality as
  // the entry spells it, else the home scale's.
  const scale = p.mode === "major" ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
  const tonicPc = (home.midi + scale[offset]) % 12;
  const naturalPc = [0, 2, 4, 5, 7, 9, 11][letterIndex];
  let alter = ((tonicPc - naturalPc + 18) % 12) - 6;
  const thirdLetter = LETTERS[(letterIndex + 2) % 7];
  const thirds = l.filter((n) => n.pitch[0] === thirdLetter).map((n) => parsePitch(n.pitch).midi % 12);
  const thirdPc = thirds.length ? thirds.sort((a, b) => thirds.filter((x) => x === b).length - thirds.filter((x) => x === a).length)[0] : (home.midi + scale[(offset + 2) % 7]) % 12;
  // The subject's own mode decides when the entry does not show the third.
  let major = ((thirdPc - tonicPc + 12) % 12) === 4;
  if (!thirds.length) major = p.mode === "major" ? [0, 3, 4].includes(offset) : [2, 5, 6].includes(offset);
  if (p.mode === "minor" && offset === 4) alter = 0; // the dominant of a minor key: its scale's fifth
  const name = `${letter}${alter > 0 ? "#" : alter < 0 ? "b" : ""}`;
  const roman = ROMAN[offset];
  return { offset, roman: major ? roman : roman.toLowerCase(), name: major ? name : name.toLowerCase() };
}
