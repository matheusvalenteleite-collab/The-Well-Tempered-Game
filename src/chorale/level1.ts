/**
 * Level 1 of the chorale mode (docs/chorales/CONCEPT.md): the cadence plan. At each fermata of a
 * melody the player chooses the chord the phrase cadences on; the choice is then laid beside the
 * masters' (Kittel's 8-9 basses, Bach's settings of the tune) and beside Bach's habit in the same
 * context, with examples. No choice is an error here: the comparison is the feedback (C4).
 *
 * Data: data/chorales/level1.json, written by tools/chorales/cadence_plans.py.
 */
import raw from "../../data/chorales/level1.json" with { type: "json" };
import { parsePitch } from "../music/pitch.ts";

export interface MelodyNote {
  /** null for a rest */
  pitch: string | null;
  offset: string;
  duration: string;
  measure: number;
  fermata?: boolean;
  grace?: boolean;
  tie?: string;
  accidental_shown?: boolean;
}

export interface Phrase {
  offset: string;
  measure: number;
  position: "first" | "inner" | "last";
  melodyClose: string;
  kittel: { bass: string; chord: string }[];
  bach: { no: number; chord: string; bar: number }[];
  habit: { n: number; options: { chord: string; count: number; examples: { no: number; bar: string }[] }[] };
  choices: string[];
}

export interface Chorale {
  number: number;
  title: string;
  keySignature: number;
  meterSign: string;
  tonic: string;
  mode: "major" | "minor";
  length: string;
  measures: { number: number; offset: string; length: string; barline: string | null }[];
  melody: MelodyNote[];
  phrases: Phrase[];
}

interface Level1Data {
  bach: Record<string, { bwv: string; title: string; scan: string | null }>;
  chorales: Chorale[];
}

const DATA = raw as unknown as Level1Data;
export const CHORALES: Chorale[] = DATA.chorales;
export const BACH_REFS = DATA.bach;

/** "3/4" -> 0.75 (whole notes). */
export const frac = (s: string): number => {
  const [a, b] = s.split("/").map(Number);
  return b ? a / b : a;
};

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

export const pcOf = (name: string): number => (PC[name[0]] + [...name.slice(1)].reduce((a, ch) => a + (ch === "#" ? 1 : ch === "b" ? -1 : 0), 0) + 120) % 12;

/** A Roman numeral of the chorale's key ("V", "vi", "bVII", "vii°") as root pitch class and quality. */
export function parseChord(label: string, tonic: string): { root: number; quality: "major" | "minor" | "diminished" } | null {
  const m = /^([b#]*)([ivIV]+)(°)?$/.exec(label);
  if (!m) return null;
  const deg = NUMERALS.indexOf(m[2].toUpperCase());
  if (deg < 0) return null;
  const shift = [...m[1]].reduce((a, ch) => a + (ch === "#" ? 1 : -1), 0);
  const root = (pcOf(tonic) + MAJOR[deg] + shift + 12) % 12;
  const quality = m[3] ? "diminished" : m[2] === m[2].toUpperCase() ? "major" : "minor";
  return { root, quality };
}

const SHARP_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const nameOf = (midi: number) => `${SHARP_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

/** A plain four-part chord for listening: the root in the bass, two chord tones under the melody. */
export function voiceChord(label: string, tonic: string, melodyPitch: string): string[] {
  const c = parseChord(label, tonic);
  if (!c) return [];
  const third = c.quality === "major" ? 4 : 3;
  const fifth = c.quality === "diminished" ? 6 : 7;
  const pcs = [c.root, (c.root + third) % 12, (c.root + fifth) % 12];
  const top = parsePitch(melodyPitch).midi;
  let bass = 40 + ((c.root - 40 % 12 + 12) % 12); // in E2..D#3
  if (bass < 40) bass += 12;
  const inner: number[] = [];
  for (let m = top - 1; m > top - 13 && inner.length < 2; m--) if (pcs.includes(m % 12) && m - bass > 7) inner.push(m);
  return [nameOf(bass), ...inner.map(nameOf)];
}

/**
 * The melody as it sounds: a small note is a passing note in the time of the note before it (it
 * takes the second half), as Kittel's figures show (data/chorales/README.md).
 */
export function soundingMelody(notes: MelodyNote[]): { pitch: string; at: number; length: number; fermata: boolean }[] {
  const out: { pitch: string; at: number; length: number; fermata: boolean }[] = [];
  let pending: MelodyNote[] = [];
  for (const n of notes) {
    if (!n.pitch) {
      pending = [];
      continue; // a rest
    }
    if (n.grace) {
      pending.push(n);
      continue;
    }
    if (pending.length && out.length) {
      const prev = out[out.length - 1];
      const half = prev.length / 2;
      prev.length = half;
      pending.forEach((g, k) => out.push({ pitch: g.pitch as string, at: prev.at + half + (k * half) / pending.length, length: half / pending.length, fermata: false }));
    }
    pending = [];
    const last = out[out.length - 1];
    if (n.tie === "stop" || n.tie === "continue") {
      if (last) {
        last.length += frac(n.duration);
        if (n.fermata) last.fermata = true; // a fermata on the tied half belongs to the note
      }
      continue;
    }
    out.push({ pitch: n.pitch, at: frac(n.offset), length: frac(n.duration), fermata: Boolean(n.fermata) });
  }
  return out;
}

export interface PhraseVerdict {
  chosen: string | null;
  kittel: string[]; // labels of Kittel's basses that cadence on the chosen chord
  kittelOptions: [string, string[]][]; // chord -> his basses
  bach: { no: number; chord: string; bar: number; same: boolean }[];
  habitShare: number | null; // share of Bach's phrase ends in this context on the chosen chord
  habitRank: number | null;
}

export function compare(ch: Chorale, picks: (string | null)[]): PhraseVerdict[] {
  return comparePoints(ch.phrases, picks);
}

/** The comparison at any set of points (phrase ends at level 1, melody notes at level 2). */
export function comparePoints(points: Pick<Phrase, "kittel" | "bach" | "habit">[], picks: (string | null)[]): PhraseVerdict[] {
  return points.map((p, i) => {
    const chosen = picks[i] ?? null;
    const byChord = new Map<string, string[]>();
    for (const k of p.kittel) byChord.set(k.chord, [...(byChord.get(k.chord) ?? []), k.bass]);
    const opts = [...byChord.entries()].sort((a, b) => b[1].length - a[1].length);
    const h = p.habit.options.findIndex((o) => o.chord === chosen);
    return {
      chosen,
      kittel: chosen ? byChord.get(chosen) ?? [] : [],
      kittelOptions: opts,
      bach: p.bach.map((b) => ({ ...b, same: b.chord === chosen })),
      habitShare: chosen && p.habit.n ? (h >= 0 ? p.habit.options[h].count / p.habit.n : 0) : null,
      habitRank: h >= 0 ? h + 1 : null,
    };
  });
}
