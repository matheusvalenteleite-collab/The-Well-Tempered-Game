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

/**
 * The key an inverted entry stands in: its notes measured against the twenty-four major and minor
 * scales (minor with both forms of the 6th and 7th), the best fit winning; ties go to the key
 * nearest the home key on the circle of fifths, then to the one whose tonic the entry ends on.
 */
function fittedKey(p: WtcPiece, notes: { pitch: string; dur: number }[]): EntryKey {
  const home = parsePitch(`${p.key}4`);
  const homePc = ((home.midi % 12) + 12) % 12;
  const fifths = (pc: number) => [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5].indexOf((pc - homePc + 12) % 12);
  const dist = (pc: number, minor: boolean) => {
    const rel = minor ? (pc + 3) % 12 : pc; // a minor key sits with its relative major
    const k = fifths(rel);
    const homeRel = p.mode === "minor" ? (homePc + 3) % 12 : homePc;
    const h = fifths(homeRel);
    const d = Math.abs(k - h);
    return Math.min(d, 12 - d);
  };
  const pcs = notes.map((n) => ({ pc: ((parsePitch(n.pitch).midi % 12) + 12) % 12, w: n.dur }));
  const last = pcs[pcs.length - 1]?.pc;
  let best: { pc: number; minor: boolean; score: number } | null = null;
  for (let pc = 0; pc < 12; pc++)
    for (const minor of [false, true]) {
      const scale = (minor ? [0, 2, 3, 5, 7, 8, 9, 10, 11] : [0, 2, 4, 5, 7, 9, 11]).map((x) => (x + pc) % 12);
      const fit = pcs.reduce((a, n) => a + (scale.includes(n.pc) ? n.w : -2 * n.w), 0);
      const score = fit * 1000 - dist(pc, minor) * 10 + (last === pc ? 5 : 0);
      if (!best || score > best.score) best = { pc, minor, score };
    }
  const NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const letterIndex = LETTERS.indexOf(home.step);
  // Spell the tonic by its letter distance from the home tonic.
  const offset = [...Array(7).keys()].find((o) => {
    const scale = p.mode === "major" ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
    return (homePc + scale[o]) % 12 === best!.pc || (homePc + scale[o] + 1) % 12 === best!.pc || (homePc + scale[o] + 11) % 12 === best!.pc;
  }) ?? 0;
  const letter = LETTERS[(letterIndex + offset) % 7];
  const alter = ((best!.pc - [0, 2, 4, 5, 7, 9, 11][LETTERS.indexOf(letter)] + 18) % 12) - 6;
  const name = Math.abs(alter) <= 1 ? `${letter}${alter > 0 ? "#" : alter < 0 ? "b" : ""}` : NAMES[best!.pc];
  const roman = ROMAN[offset];
  return { offset, roman: best!.minor ? roman.toLowerCase() : roman, name: best!.minor ? name.toLowerCase() : name };
}

/** The key of an entry. Its tonic: the home tonic moved up by the offset, spelled as the entry spells that letter (or the home scale's). */
export function entryKey(p: WtcPiece, e: Entry, subject: Note[]): EntryKey {
  if (e.form === "inversion") return fittedKey(p, line(p.voices[e.voice]).slice(e.at, e.at + e.length));
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
  // The mode heard: every note sounding while the entry lasts, in all the voices, against the major
  // and minor scales on that tonic (a chromatic subject's own thirds can mislead).
  {
    const on = l[0]?.on ?? e.on;
    const last = l[l.length - 1];
    const end = last ? last.on + last.dur : on;
    let maj = 0;
    let min = 0;
    for (const v of p.voices)
      for (const [o, d, pitch] of v) {
        const overlap = Math.min(o + d, end) - Math.max(o, on);
        if (overlap <= 0) continue;
        const pc = (((parsePitch(pitch).midi - tonicPc) % 12) + 12) % 12;
        if (pc === 4) maj += overlap;
        if (pc === 3) min += overlap;
        if (pc === 9) maj += overlap / 2;
        if (pc === 8) min += overlap / 2;
      }
    if (maj + min > 0 && Math.max(maj, min) >= 2 * Math.min(maj, min)) major = maj > min;
  }
  if (p.mode === "minor" && offset === 4) alter = 0; // the dominant of a minor key: its scale's fifth
  const name = `${letter}${alter > 0 ? "#" : alter < 0 ? "b" : ""}`;
  const roman = ROMAN[offset];
  return { offset, roman: major ? roman : roman.toLowerCase(), name: major ? name : name.toLowerCase() };
}
