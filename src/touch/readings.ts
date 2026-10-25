/**
 * D272, THE READINGS: how authors of the standard books on the Well-Tempered Clavier say each Book I
 * fugue should be played: its subject's articulation (each note joined to the next or detached, short,
 * accented), its level and shape, the tempo, and what they say of the rest (a dynamic plan by bar).
 * Taken from their words only (the owner: textual descriptions, no listening to recordings), by
 * tools/touch/readings.ts from the extractions (docs/wtc/readings/), into data/touch/readings.json.
 * Up to three a fugue, the first its default; the others open once the fugue is finished. The game
 * (D274: at the recordings' tempo; the book's mark only shown) rewards the subject played as the reading says and the rest at
 * its dynamics, and HEAR THE SUBJECT plays and draws the subject so.
 */
import data from "../../data/touch/readings.json" with { type: "json" };

export type Level = "pp" | "p" | "mp" | "mf" | "f" | "ff";
export interface ReadingNote {
  /** How the note goes to the next: joined (legato), detached, or not said. */
  join: boolean | null;
  short: boolean | null;
  accent: boolean | null;
}
export interface Reading {
  id: string;
  /** "KELLER", as the buttons name it; the work and its year; the pages. */
  author: string;
  work: string;
  year: number;
  pages: string | null;
  /** Quarter notes a minute, and the author's words. */
  tempo: number | null;
  tempoText: string | null;
  character: string | null;
  /** explicit: the author marks the notes; rule: a rule of his applied to them. */
  basis: "explicit" | "rule" | "none";
  quote: string | null;
  /** One per note of the fugue's first entry. */
  notes: ReadingNote[];
  level: Level | null;
  shape: "crescendo" | "diminuendo" | "arch" | null;
  /** The dynamics he names by bar. */
  plan: { bar: number; level: Level | "cresc" | "dim" }[];
  restQuote: string | null;
  restSummary: string | null;
}

export const READINGS = data as unknown as Record<string, Reading[]>;

/** A level as a dynamic on the bars (0 pp at the box, 1 ff at the edge). */
export const LEVEL_D: Record<Level, number> = { pp: 0.1, p: 0.28, mp: 0.45, mf: 0.6, f: 0.78, ff: 0.92 };

export const readingsOf = (id: string): Reading[] => READINGS[id] ?? [];

const KEY = "tb-reading-v1";
function store(): Record<string, string> {
  try {
    const v = localStorage.getItem(KEY);
    const o = v ? JSON.parse(v) : {};
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}
/** The reading chosen for a fugue (one it has; once open), else its first. */
export function chosenReading(id: string, open: boolean): Reading | null {
  const rs = readingsOf(id);
  const want = store()[id];
  const i = rs.findIndex((r) => r.id === want);
  return i > 0 && !open ? (rs[0] ?? null) : (rs[i] ?? rs[0] ?? null);
}
export function chooseReading(id: string, reading: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...store(), [id]: reading }));
  } catch {
    /* this visit only */
  }
}

/** The level a reading asks for at a bar (the last named at or before it; cresc and dim pass). */
export function planLevel(r: Reading, bar: number): Level | null {
  let lv: Level | null = null;
  for (const p of r.plan) if (p.bar <= bar && p.level !== "cresc" && p.level !== "dim") lv = p.level;
  return lv;
}

/**
 * The subject as the reading plays it (HEAR THE SUBJECT): each note's start and length in seconds and
 * its dynamic (0..1), from the entry's notes [onset, duration, MIDI] in ticks.
 */
export function performSubject(r: Reading | null, notes: [number, number, number, ...unknown[]][], tpq: number, bpm: number): { at: number; len: number; midi: number; d: number }[] {
  // D274: at the game's tempo (the recordings'), not the book's.
  const tps = (tpq * bpm) / 60;
  const on0 = notes[0]?.[0] ?? 0;
  const base = r?.level ? LEVEL_D[r.level] : 0.55;
  return notes.map(([on, dur, midi], i) => {
    const n = r?.notes[i];
    const gapTo = i + 1 < notes.length ? notes[i + 1][0] - on : dur;
    // Joined: to the next note's start and a little over; detached: two thirds; short: a third.
    const len = n?.short ? dur * 0.35 : n?.join === false ? Math.min(dur, gapTo) * 0.62 : n?.join ? Math.max(dur, gapTo) * 1.04 : dur * 0.92;
    const u = notes.length > 1 ? i / (notes.length - 1) : 0;
    const shaped = r?.shape === "crescendo" ? base - 0.12 + 0.24 * u : r?.shape === "diminuendo" ? base + 0.12 - 0.24 * u : r?.shape === "arch" ? base - 0.1 + 0.2 * Math.sin(Math.PI * u) : base;
    const d = Math.max(0.05, Math.min(1, shaped + (n?.accent ? 0.15 : 0)));
    return { at: (on - on0) / tps, len: len / tps, midi, d };
  });
}
