/**
 * The ornaments played in the game (D205): the encodings' signs (data/wtc/ornaments.json: voice,
 * onset, pitch, kern signs, grace notes; 148 in the fugues) realised as the WTC study plays them
 * (src/music/ornaments.ts: Bach's Explication by default; P8, P23), at the tempo being played: the
 * other voices' trills and mordents sound as written; the player's ornamented note, once struck,
 * plays its ornament and holds its main note. The player strikes the main note only (the ornament's
 * notes are not judged: they ride, as the quick notes of D191).
 */
import ornamentsData from "../../data/wtc/ornaments.json" with { type: "json" };
import { keySteps, ornamentUnit, realise } from "../music/ornaments.ts";
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

const cache = new Map<string, Map<string, Ornament>>();
/** A piece's ornaments by "voice:onset". */
export function ornamentsOf(f: TouchFugue): Map<string, Ornament> {
  let m = cache.get(f.id);
  if (!m) {
    m = new Map();
    for (const [v, on, , signs, graces] of ROWS[f.id] ?? [])
      m.set(`${v}:${on}`, { signs, graces: (graces ?? []).map((g) => ({ kind: g[0] as "q" | "Q", midi: parsePitch(g.slice(1)).midi })) });
    cache.set(f.id, m);
  }
  return m;
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
  const steps = keySteps(signature(f.key));
  const parts = realise({ midi, at: on / q, dur: dur / q }, o.signs, o.graces, { unit: ornamentUnit(bpm / 2), prevMidi, ...steps });
  return parts.map((p) => [Math.round(p.at * q), Math.max(1, Math.round(p.dur * q)), p.midi]);
}
