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
import { ART_HOLD } from "./phrasing.ts";
import { tr } from "../i18n/index.ts";
import { decide, type Kind } from "./practice.ts";
import type { Character } from "./character.ts";

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

/**
 * D314: what each of the reading's marks asks of the thumbs, in plain words (the owner: "clearer
 * instructions on what the . is in articulation"): the dot is SHORT (staccato: judged STACCATO ✓ when
 * the thumb lets go before three fifths of the note), the stroke APART (detached), the slur JOINED
 * (legato), the wedge STRONG (an accent: judged ACCENT ✓ on the bar's strong side, touch-expr.ts
 * STRONG_SIDE). The box's legend at the start of a round with marks, HEAR THE SUBJECT and HOW TO PLAY.
 */
export type MarkKind = "short" | "apart" | "joined" | "strong";
export function markLegend(strongSide: "outer" | "inner"): { kind: MarkKind; sym: string; text: string }[] {
  return [
    { kind: "short", sym: "·", text: tr("SHORT: LIFT QUICKLY") },
    { kind: "apart", sym: "|", text: tr("APART: LIFT BEFORE THE NEXT") },
    { kind: "joined", sym: "⌒", text: tr("JOINED: NEXT THUMB DOWN BEFORE LIFTING") },
    { kind: "strong", sym: ">", text: strongSide === "outer" ? tr("STRONG: TOUCH TOWARD THE OUTER EDGE") : tr("STRONG: TOUCH TOWARD THE INNER EDGE, BY THE BOX") },
  ];
}

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
 * D302: a reading's marks on every entry of the subject, in every voice (each note by its place in the
 * subject, as the player's are judged), for the others' articulation (phrasing.ts ARTICULATION).
 */
export function readingMarks(entries: readonly { voice: number; notes: readonly (readonly [number, ...unknown[]])[]; theme?: number }[], r: Reading | null): Map<string, ReadingNote> {
  const m = new Map<string, ReadingNote>();
  if (!r) return m;
  for (const e of entries) {
    if (e.theme) continue;
    e.notes.forEach(([on], j) => {
      const n = r.notes[j];
      if (n && (n.join !== null || n.short)) m.set(`${e.voice}:${on}`, n);
    });
  }
  return m;
}

/** D302: a joined note's overlap into the next (s): its crossfade (phrasing.ts OVERLAP_S). */
export const JOIN_OVER_S = 0.03;

/**
 * The subject as the reading plays it (HEAR THE SUBJECT): each note's start and length in seconds and
 * its dynamic (0..1), from the entry's notes [onset, duration, MIDI] in ticks. D302: `tie`, joined to
 * the next (held to its onset and JOIN_OVER_S over, then crossfaded: no gap); `legato`, joined from the
 * one before (no fresh attack; `from` its pitch, a singing voice's glide); `final`, the last. A joined note was held 4% over its written length and still let go
 * before the next (a 120 ms release) and the next attacked anew: no join was heard.
 */
export function performSubject(r: Reading | null, notes: [number, number, number, ...unknown[]][], tpq: number, bpm: number, rules?: { kind: Kind; character?: Character }): { at: number; len: number; midi: number; d: number; legato?: boolean; from?: number; tie?: number; final?: boolean; apart?: boolean }[] {
  // D274: at the game's tempo (D285: on the slow side of the recordings), not the book's.
  const tps = (tpq * bpm) / 60;
  const on0 = notes[0]?.[0] ?? 0;
  const base = r?.level ? LEVEL_D[r.level] : 0.55;
  // D309: a note the reading leaves unmarked, followed at once by the next, as the others play it (the
  // instrument's table, practice.ts decide; the singers joined); without `rules`, held 0.92 as before.
  const adjacent = (i: number) => i + 1 < notes.length && notes[i + 1][0] === notes[i][0] + notes[i][1];
  const rule = (i: number) => {
    const n = r?.notes[i];
    if (!rules || !adjacent(i) || n?.short || (n?.join !== null && n?.join !== undefined)) return null;
    if (rules.kind === "sung" || rules.kind === "solo") return notes[i + 1][2] === notes[i][2] ? { gap: 0 } : { join: JOIN_OVER_S };
    return decide(rules.kind, { interval: notes[i + 1][2] - notes[i][2], ioi: notes[i][1] / tps, bass: false, character: rules.character, quaver: notes[i][1] >= tpq / 2 });
  };
  const joined = (i: number) => (!!r?.notes[i]?.join && !r?.notes[i]?.short && i + 1 < notes.length && notes[i + 1][0] <= notes[i][0] + notes[i][1]) || "join" in (rule(i) ?? {});
  return notes.map(([on, dur, midi], i) => {
    const n = r?.notes[i];
    const apart = !!n?.short || n?.join === false;
    const gapTo = i + 1 < notes.length ? notes[i + 1][0] - on : dur;
    const ru = rule(i);
    // Joined: to the next note's start and a little over; detached: three quarters, short: half (D304: as the others play them, phrasing.ts ART_HOLD).
    const len = n?.short ? (dur * ART_HOLD.short) / tps : n?.join === false ? (Math.min(dur, gapTo) * ART_HOLD.detach) / tps : joined(i) ? gapTo / tps + JOIN_OVER_S : ru && "gap" in ru ? dur / tps - ru.gap : (dur * 0.92) / tps;
    const u = notes.length > 1 ? i / (notes.length - 1) : 0;
    const shaped = r?.shape === "crescendo" ? base - 0.12 + 0.24 * u : r?.shape === "diminuendo" ? base + 0.12 - 0.24 * u : r?.shape === "arch" ? base - 0.1 + 0.2 * Math.sin(Math.PI * u) : base;
    const d = Math.max(0.05, Math.min(1, shaped + (n?.accent ? 0.15 : 0)));
    return { at: (on - on0) / tps, len, midi, d, ...(i > 0 && joined(i - 1) ? { legato: true, from: notes[i - 1][2] } : {}), ...(joined(i) ? { tie: JOIN_OVER_S } : {}), ...(i === notes.length - 1 ? { final: true } : {}), ...(apart ? { apart: true } : {}) };
  });
}
