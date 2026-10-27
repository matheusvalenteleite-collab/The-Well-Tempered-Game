/**
 * The ornaments played in the game (D205): the encodings' signs (data/wtc/ornaments.json: voice,
 * onset, pitch, kern signs, grace notes; 148 in the fugues) realised as the WTC study plays them
 * (src/music/ornaments.ts: Bach's Explication by default; P8, P23), at the tempo being played: the
 * other voices' trills and mordents sound as written. D278: on a phone (LADDER, the road) the player
 * plays the ornament: the main note struck, the thumb shaken on it (proto-game.ts, ornamentShake); on a
 * computer's keys the ornamented note, once struck, plays its ornament and holds its main note.
 */
import ornamentsData from "../../data/wtc/ornaments.json" with { type: "json" };
import { keySteps, ornamentUnit, realise, trillUnit } from "../music/ornaments.ts";
import { MECH } from "../bench/mechanics.ts";
import { parsePitch } from "../music/pitch.ts";
import type { TouchFugue } from "./fugue.ts";

type Row = [number, number, string, string, string[]?];
const ROWS = ornamentsData as unknown as Record<string, Row[]>;

export interface Ornament {
  signs: string;
  graces: { kind: "q" | "Q"; midi: number }[];
}

const SHARPS = "FCGDAEB";
const MAJOR: Record<string, number> = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7 };
const MINOR: Record<string, number> = { A: 0, E: 1, B: 2, "F#": 3, "C#": 4, "G#": 5, "D#": 6, "A#": 7, D: -1, G: -2, C: -3, F: -4, Bb: -5, Eb: -6, Ab: -7 };

/** The piece's key signature ("c": C minor, "Eb": E flat major), as alterations by letter. */
function signature(key: string): Record<string, number> {
  const minor = key[0] === key[0].toLowerCase();
  const name = key[0].toUpperCase() + key.slice(1);
  const n = (minor ? MINOR : MAJOR)[name] ?? 0;
  const sig: Record<string, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  for (let i = 0; i < Math.abs(n); i++) sig[n > 0 ? SHARPS[i] : SHARPS[6 - i]] = n > 0 ? 1 : -1;
  return sig;
}

/**
 * D277: ornaments of the subject the books name and the encoding lacks on its first entry, by the note's
 * place in the subject (our first entry's index) and kern sign: I/12 the trill on the next-to-last note,
 * G (Bodky; half step above in F minor); I/14 the trill on the next-to-last note, G sharp, "always"
 * (Bodky; Riemann marks it); II/12 the mordent on the first F, E natural below (Keller: in several
 * manuscripts; Bodky advises it; Riemann marks an ornament there).
 */
export const SUBJECT_ORNAMENTS: Record<string, { at: number; signs: string }[]> = {
  wtc1f12: [{ at: 9, signs: "t" }],
  wtc1f14: [{ at: 16, signs: "t" }],
  wtc2f12: [{ at: 1, signs: "m" }],
};

const ALIAS: Record<string, string> = { inv01: "inven01" };
const cache = new Map<string, Map<string, Ornament>>();
/**
 * A piece's ornaments by "voice:onset". D277: a fugue's subject keeps its ornaments in every entry (the
 * owner: "trills on subjects ... absent"; the books: Bodky, I/14 "always", I/23 "goes on every entry";
 * Keller, I/23 and I/24 kept "throughout"): an ornament written on a note of the subject's first entry,
 * or on the same note of two entries or more, or named by the books (SUBJECT_ORNAMENTS), is carried to
 * that note of every entry of the subject (inverted and transposed entries alike; not the augmented or
 * diminished, nor a later subject), where the note is there, a quaver or longer, and has none of its own.
 */
export function ornamentsOf(f: TouchFugue): Map<string, Ornament> {
  let m = cache.get(f.id);
  if (!m) {
    m = new Map();
    // D278: the tutorial's invention under its corpus name.
    for (const [v, on, , signs, graces] of ROWS[f.id] ?? ROWS[ALIAS[f.id] ?? ""] ?? [])
      m.set(`${v}:${on}`, { signs, graces: (graces ?? []).map((g) => ({ kind: g[0] as "q" | "Q", midi: parsePitch(g.slice(1)).midi })) });
    if (f.kind === "fugue") carrySubjectOrnaments(f, m);
    cache.set(f.id, m);
  }
  return m;
}

/** D277: the subject's ornaments into every entry (see ornamentsOf). */
function carrySubjectOrnaments(f: TouchFugue, m: Map<string, Ornament>) {
  const entries = f.entries.filter((e) => !e.theme && !e.scale).sort((a, b) => a.on - b.on || a.voice - b.voice);
  if (!entries.length) return;
  const at = (e: (typeof entries)[number], j: number) => (e.notes[j] ? `${e.voice}:${e.notes[j][0]}` : null);
  const carried = new Map<number, string>();
  for (const { at: j, signs } of SUBJECT_ORNAMENTS[f.id] ?? []) carried.set(j, signs);
  const count = new Map<number, { n: number; signs: string }>();
  entries.forEach((e, k) =>
    e.notes.forEach((_, j) => {
      const o = m.get(at(e, j) ?? "");
      if (!o || !o.signs) return;
      if (k === 0 && !carried.has(j)) carried.set(j, o.signs);
      const c = count.get(j) ?? { n: 0, signs: o.signs };
      count.set(j, { n: c.n + 1, signs: c.signs });
    }),
  );
  for (const [j, c] of count) if (c.n >= 2 && !carried.has(j)) carried.set(j, c.signs);
  for (const e of entries)
    for (const [j, signs] of carried) {
      const key = at(e, j);
      const n = e.notes[j];
      if (!key || !n || m.has(key) || n[1] < f.tpq / 2) continue;
      m.set(key, { signs, graces: [] });
    }
}

/** The sign drawn over an ornamented note: "TR" a trill, "~" the short wavy sign, "~|" a mordent, "S" a turn. */
export function ornamentMark(o: Ornament): string {
  const s = o.signs;
  if (/[TtO]/.test(s)) return "TR";
  if (/[Mm]/.test(s)) return "~|";
  if (/[Ww]/.test(s)) return "~";
  if (/[S$]/.test(s)) return "S";
  return o.graces.length ? "·" : "";
}

/**
 * A note as it sounds with its ornament: [onset, length, MIDI] in ticks, at the tempo (quarter notes
 * a minute); the last part is the main note, held to the note's end.
 */
export function realiseNote(f: TouchFugue, o: Ornament, on: number, dur: number, midi: number, prevMidi: number | undefined, bpm: number): [number, number, number][] {
  const q = f.tpq;
  const steps = contextSteps(f, on, midi, o.signs);
  const parts = realise({ midi, at: on / q, dur: dur / q }, o.signs, o.graces, { unit: ornamentUnit(bpm / 2), trillUnit: trillUnit(60 / bpm, MECH.trillPerSecond), settle: MECH.trillSettle, prevMidi, ...steps, diatonic: true });
  return parts.map((p) => [Math.round(p.at * q), Math.max(1, Math.round(p.dur * q)), p.midi]);
}

/**
 * D319: a note of the band's as it sounds with its ornament, its articulation holding it for `hold` of
 * its length (D302's phrasing: a detached note stops early). A trill is realised over the note's whole
 * written length (it lasts the note: shortened first, the grid lost notes and the alternation ended
 * early: II/24's dotted quavers, held 0.87, trilled 3 notes of 6), the gap taken from its settling main
 * note (at most half of it); any other ornament over the held length, as before.
 */
export function realiseHeld(f: TouchFugue, o: Ornament, on: number, dur: number, hold: number, midi: number, prevMidi: number | undefined, bpm: number): [number, number, number][] {
  if (!/[TtO]/.test(o.signs) || hold >= 1) return realiseNote(f, o, on, dur * hold, midi, prevMidi, bpm);
  const parts = realiseNote(f, o, on, dur, midi, prevMidi, bpm);
  const last = parts[parts.length - 1];
  last[1] = Math.max(Math.round(last[1] / 2), Math.round(last[1] - dur * (1 - hold)));
  return parts;
}

/**
 * D278: how an ornament is played on a phone: the thumb shaken on the struck note, its first move up
 * (an upper note: the trill, the short trill, the turn) or down (the mordent), so many moves to finish
 * it; null for grace notes alone (they play themselves).
 */
export interface Shake {
  kind: "trill" | "short" | "mordent" | "turn";
  word: string;
  first: 1 | -1;
  need: number;
}
export function shakeOf(o: Ornament): Shake | null {
  const s = o.signs;
  if (/[TtO]/.test(s)) return { kind: "trill", word: "TRILL", first: 1, need: 4 };
  if (/[Mm]/.test(s)) return { kind: "mordent", word: "MORDENT", first: -1, need: 2 };
  if (/[Ww]/.test(s)) return { kind: "short", word: "TRILL", first: 1, need: 2 };
  if (/[S$]/.test(s)) return { kind: "turn", word: "TURN", first: 1, need: 4 };
  return null;
}

/**
 * D314, a FREE ORNAMENT (free-ornament.ts): the held note's mordent ("M": the step below, then the
 * note), short trill ("W": from the note above, Bach's short Trillo) or trill ("T": from the note above,
 * alternating, the note held at the end), from tick `from` to `until` (the note's written end), realised
 * as the written ones are (Bach's Explication, at the tempo, the neighbours as the bar reads them). The
 * main note already sounds, so a realisation that opens on it starts at its next note. [onset, length,
 * MIDI] in ticks; empty when too little of the note is left. D319: `written`, a written trill's signs (its
 * closing turn R kept), for the player's trill realised from the first shake to the note's end.
 */
export function freeOrnamentParts(f: TouchFugue, kind: "mordent" | "short" | "trill", noteOn: number, midi: number, from: number, until: number, bpm: number, written?: string): [number, number, number][] {
  const q = f.tpq;
  if (until - from < q / 8) return [];
  const signs = written ?? (kind === "mordent" ? "M" : kind === "short" ? "W" : "T");
  const steps = contextSteps(f, noteOn, midi, signs);
  let parts = realise({ midi, at: from / q, dur: (until - from) / q }, signs, [], { unit: ornamentUnit(bpm / 2), trillUnit: trillUnit(60 / bpm, MECH.trillPerSecond), settle: MECH.trillSettle, ...steps, diatonic: true });
  if (parts.length > 1 && parts[0].midi === midi) {
    const shift = parts[1].at - parts[0].at;
    parts = parts.slice(1).map((p, k, a) => ({ ...p, at: p.at - shift, dur: k === a.length - 1 ? p.dur + shift : p.dur }));
  }
  return parts.map((p) => [Math.round(p.at * q), Math.max(1, Math.round(p.dur * q)), p.midi]);
}

const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
/**
 * D281: an ornamented note's neighbours as a player reads them, the next letter up (down) with its
 * accidental: (1) as the bar shows it: the last note of that letter in any voice since the bar began
 * (up to the note itself); else (2) as the sign says where it says a half step (t, w, m: kern's
 * lower case, written deliberately: II/12's mordents on the tonic with the leading note below); else
 * (3) the key signature's. The encodings' upper case (T, W, M: a whole step) is not trusted: it is
 * their plain default (II/13: a whole-step trill on B sharp and on A sharp in F sharp major).
 */
export function contextSteps(f: TouchFugue, on: number, midi: number, signs = ""): { stepAbove(m: number): number; stepBelow(m: number): number } {
  const sig = keySteps(signature(f.key));
  let step: number | null = null;
  for (const v of f.voices) for (const n of v) if (n[0] === on && n[2] === midi) step = n[3];
  if (step === null) return sig;
  const barOn = [...f.bars].reverse().find((b) => b.on <= on)?.on ?? 0;
  const alter = signature(f.key);
  const pcOf = (m: number) => ((m % 12) + 12) % 12;
  const neighbour = (dir: 1 | -1): number | null => {
    const letter = ((((step as number) + dir) % 7) + 7) % 7;
    const dist = (pc: number) => (dir > 0 ? (pc - pcOf(midi) + 12) % 12 : (pcOf(midi) - pc + 12) % 12);
    let best: [number, number] | null = null;
    for (const v of f.voices) for (const n of v) if (n[0] >= barOn && n[0] <= on && (((n[3] % 7) + 7) % 7) === letter && !(n[0] === on && n[2] === midi) && (!best || n[0] >= best[0])) best = [n[0], pcOf(n[2])];
    if (best && (dist(best[1]) === 1 || dist(best[1]) === 2)) return dist(best[1]);
    if (dir > 0 ? /[tw]/.test(signs) : /m/.test(signs)) return 1;
    const fromSig = pcOf(LETTER_PC[letter] + (alter["CDEFGAB"[letter]] ?? 0));
    return dist(fromSig) === 1 || dist(fromSig) === 2 ? dist(fromSig) : null;
  };
  // Nothing fits (a letter the signature puts an augmented second away): a whole step.
  return { stepAbove: () => neighbour(1) ?? 2, stepBelow: () => neighbour(-1) ?? 2 };
}
