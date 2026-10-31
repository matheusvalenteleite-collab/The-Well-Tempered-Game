/**
 * D272, THE READINGS: how authors of the standard books on the Well-Tempered Clavier say each Book I
 * fugue should be played: its subject's articulation (each note joined to the next or detached, short,
 * accented), its level and shape, the tempo, and what they say of the rest (a dynamic plan by bar).
 * Taken from their words only (the owner: textual descriptions, no listening to recordings), by
 * tools/touch/readings.ts from the extractions (docs/wtc/readings/), into data/touch/readings.json.
 * Up to three a fugue. D325 (the musicians' panel, #4): no longer the rule of every run: NONE ("my own
 * articulation") is an equal choice and the default, and every reading is open from the start; a
 * reading chosen still scores its marks. (Before: the first the default, the others opened once the
 * fugue was finished.) The game
 * (D274: at the recordings' tempo; the book's mark only shown) rewards the subject played as the reading says and the rest at
 * its dynamics, and HEAR THE SUBJECT plays and draws the subject so.
 */
import data from "../../data/touch/readings.json" with { type: "json" };
import { ART_HOLD, SLUR_SHAPE, styleOf } from "./phrasing.ts";
import { tr } from "../i18n/index.ts";
import { decide, type Kind } from "./practice.ts";
import type { Character } from "./character.ts";

export type Level = "pp" | "p" | "mp" | "mf" | "f" | "ff";
export interface ReadingNote {
  /**
   * How the note goes to the next: joined, detached, or not said. D370: the derived view, as judged: joined
   * inside one of the reading's slurs (Reading.slurs) or by its legato (Reading.legato).
   */
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
  /**
   * D370 (Glenn's notes §1: a slur is not legato): the author asks the joins not inside a slur as a manner
   * or a rule ("linked", "legato"): an even line.
   */
  legato: boolean;
  /**
   * D370: the groups slurred as one gesture (leaned into, joined over inside, the last let go early): the
   * notes `from`..`to` (both in) of the subject, read against the first entry in voice `v`; every entry
   * takes them by place. Why each: docs/wtc/readings/slurs.json.
   */
  slurs: Slur[];
  level: Level | null;
  shape: "crescendo" | "diminuendo" | "arch" | null;
  /** The dynamics he names by bar. */
  plan: { bar: number; level: Level | "cresc" | "dim" }[];
  restQuote: string | null;
  restSummary: string | null;
  /**
   * D385: a whole-piece reading (an edition transcribed for every voice and bar: BUSONI): what it prints,
   * played by the band and set as the player's line (whole-reading.ts). `notes` and `slurs` above are its
   * first entry's, so the judge and HEAR THE SUBJECT read it as any other reading.
   */
  whole?: WholeReading;
}

/** D385: a whole-piece edition's marks (docs/wtc/readings/<edition>/, format wtc-reading/2), as tools/touch/readings.ts keeps them. */
export interface WholeReading {
  /** The heading's words ("Allegretto, vivacemente."): the fugue's character (its palette). */
  heading: string | null;
  /** Changes of pace as printed (kind slow, broaden, resume): only a slowing that runs to the end is played (whole-reading.ts endingOf). */
  tempo: { on: number; text: string; kind: string }[];
  /** One note's articulation: staccato, wedge, tenuto, portato, accent, marcato, fermata ("wedge+tenuto": two). */
  marks: { v: number; on: number; art: string }[];
  /** Spans in one voice, both ends in: a slur (one gesture), portato (dots under a slur), a phrase (a long arc). */
  slurs: { v: number; from: number; to: number; kind: "slur" | "portato" | "phrase"; lastShort?: boolean }[];
  /** A printed level ("p", "mf", "p subito", "dim.") at a tick, for the voices it was printed for. */
  dyn: { on: number; voices: number[]; mark: string }[];
  hairpins: { voices: number[]; from: number; to: number; dir: "cresc" | "dim" }[];
  /** Words in the score (character words, "cresc.", "quasi stacc."). */
  text: { on: number; voices?: number[]; text: string; span?: string }[];
  /** A caesura before the note. */
  breaths: { v: number; on: number; kind?: string }[];
  /** Instructions for the unmarked notes (a footnote's "always staccato", the subject's template on every entry). */
  rules: { scope: { voices?: number[]; from?: number; to?: number; entries?: boolean; bars?: unknown; labels?: boolean }; art: string }[];
  /** The edition's double bars (a new terrace). */
  sections: { beforeBar?: number; at?: number }[];
  ornaments: { v: number; on: number; sign: string; optional?: boolean; realisation?: unknown }[];
}

export const READINGS = data as unknown as Record<string, Reading[]>;

/** D370: a slur: the notes from..to (indices of the subject, both in) of voice v's entry, one gesture. */
export interface Slur {
  v: number;
  from: number;
  to: number;
}
/** D370: a note's place in a slur: its first (leaned on), inside, or its last (let go early, lighter). */
export type SlurRole = "first" | "mid" | "last";
/** D370: note i's place in one of the reading's slurs, else null. */
export function slurRole(r: Reading | null | undefined, i: number): SlurRole | null {
  for (const s of r?.slurs ?? []) if (i >= s.from && i <= s.to) return i === s.from ? "first" : i === s.to ? "last" : "mid";
  return null;
}
/** D370: the join from note i to the next is inside a slur (not the reading's plain legato). */
export const slurredJoin = (r: Reading | null | undefined, i: number) => (r?.slurs ?? []).some((s) => i >= s.from && i < s.to);
/** D370: a reading's mark on a note with its place in a slur (the band's shaping, the drawing). */
export type MarkNote = ReadingNote & { slur?: SlurRole };
/** D370: the reading's note i as marked, with its slur place (none outside a slur). */
export function markOf(r: Reading, i: number): MarkNote | undefined {
  const n = r.notes[i];
  if (!n) return undefined;
  const s = slurRole(r, i);
  return s ? { ...n, slur: s } : n;
}

/** A level as a dynamic on the bars (0 pp on the soft side, 1 ff on the strong: STRONG_SIDE). */
export const LEVEL_D: Record<Level, number> = { pp: 0.1, p: 0.28, mp: 0.45, mf: 0.6, f: 0.78, ff: 0.92 };

export const readingsOf = (id: string): Reading[] => READINGS[id] ?? [];

/**
 * D314: what each of the reading's marks asks of the thumbs, in plain words (the owner: "clearer
 * instructions on what the . is in articulation"): the dot is SHORT (staccato: judged STACCATO ✓ when
 * the thumb lets go before three fifths of the note), the stroke DETACHED (D370: it was APART; judged
 * DETACHED ✓), the line JOINED (legato), the wedge an ACCENT (D338: judged ACCENT ✓ by time, never
 * loudness: the note before lifted, the accent on time or a hair late and held; src/bench/accent.ts. It
 * was the bar's strong side, touch-expr.ts STRONG_SIDE). D370 (Glenn's notes §3): one vocabulary
 * everywhere, and ⌒ kept for a real slur (a group the reading slurs: one gesture, joined inside, let go at
 * its end); a plain legato join is JOINED's line. The box's legend at the start of a round with marks,
 * HEAR THE SUBJECT, HOW TO PLAY and the side bar.
 */
export type MarkKind = "short" | "apart" | "joined" | "slur" | "strong";
export function markLegend(_strongSide?: "outer" | "inner"): { kind: MarkKind; sym: string; text: string }[] {
  return [
    { kind: "short", sym: "·", text: tr("SHORT: LIFT BEFORE THREE FIFTHS OF THE NOTE") },
    { kind: "apart", sym: "|", text: tr("DETACHED: LIFT BEFORE THE NEXT") },
    { kind: "joined", sym: "‾", text: tr("JOINED: NEXT THUMB DOWN BEFORE LIFTING") },
    { kind: "slur", sym: "⌒", text: tr("SLUR: ONE GESTURE, JOINED INSIDE, LIFT AT ITS END") },
    // D338: the accent by time, whichever side is strong (strongSide no longer asked of it).
    { kind: "strong", sym: ">", text: tr("ACCENT: LIFT THE NOTE BEFORE A LITTLE EARLY, LEAN IN A HAIR LATE") },
  ];
}
/** D370: which of the legend's marks a set of marks has (a join inside a slur is the slur's, not JOINED's). */
export function marksHas(marks: Iterable<MarkNote>): Record<MarkKind, boolean> {
  const ms = [...marks];
  return { short: ms.some((m) => !!m.short), apart: ms.some((m) => m.join === false), joined: ms.some((m) => !!m.join && !m.slur), slur: ms.some((m) => !!m.slur), strong: ms.some((m) => !!m.accent) };
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
/** D325: NONE, the player's own articulation: no reading's marks shown, asked or scored. */
export const NO_READING = "none";
/**
 * D325: the reading the player chose for a fugue (any it has, all open; NONE chosen: none). D369 (the
 * owner: "I want the return of all 'HEAR THE SUBJECT' readings to the game"): every reading open to
 * everyone again; nothing chosen yet, D344's chosen reading for the fugue (bestReading) is the default.
 */
export function chosenReading(id: string, soundId?: string): Reading | null {
  const want = store()[id];
  if (want === undefined) return bestReading(id, soundId);
  return readingsOf(id).find((r) => r.id === want) ?? null;
}
/** D325: a reading's id, or NO_READING. */
export function chooseReading(id: string, reading: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...store(), [id]: reading }));
  } catch {
    /* this visit only */
  }
}

/**
 * D344 (WTC 1.57): play.html for the friends (not unlocked) shows one reading a fugue, and plays it: the
 * best of those the data hold for it on musical grounds (fidelity to the subject's character and to
 * Baroque articulation, playable with two thumbs, few marks for a newcomer), or NO_READING where none
 * convinces. The reasons: docs/wtc/READINGS-CHOSEN.md. The unlocked page keeps every reading to choose.
 */
export const BEST_READING: Readonly<Record<string, string>> = {
  wtc1f01: "keller",
  wtc1f02: "bodky",
  wtc1f03: "bodky",
  wtc1f04: "bodky",
  wtc1f05: "bodky",
  wtc1f06: "bodky",
  wtc1f07: "keller",
  wtc1f08: "keller",
  wtc1f09: "riemann",
  wtc1f10: "bodky",
  wtc1f11: "bodky",
  wtc1f12: "keller",
  wtc1f13: "bodky",
  wtc1f14: "bodky",
  wtc1f15: "keller",
  wtc1f16: "bodky",
  wtc1f17: "keller",
  wtc1f18: "keller",
  wtc1f19: "bodky",
  wtc1f20: NO_READING,
  wtc1f21: "keller",
  wtc1f22: "bodky",
  wtc1f23: "bodky",
  wtc1f24: "keller",
};
/**
 * D385: on the piano a fugue with a whole-piece reading (BUSONI: I/1, I/2, I/8, I/16, I/24) is played by it
 * unless the player chose another: its dynamics, accents, slurs and characters are the piano's (the
 * owner). Every other sound, and every other fugue, keeps D344's choice.
 */
export const WHOLE_DEFAULT = "busoni";
export const wholeReadingOf = (id: string): Reading | null => readingsOf(id).find((r) => r.id === WHOLE_DEFAULT && r.whole) ?? null;
/** D344: the one reading the friends' page gives a fugue (null: none, the player's own articulation); D385: on the piano a whole-piece reading first. */
export function bestReading(id: string, soundId?: string): Reading | null {
  if (soundId && styleOf(soundId) === "piano") {
    const w = wholeReadingOf(id);
    if (w) return w;
  }
  const want = BEST_READING[id];
  return want ? (readingsOf(id).find((r) => r.id === want) ?? null) : null;
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
export function readingMarks(entries: readonly { voice: number; notes: readonly (readonly [number, ...unknown[]])[]; theme?: number }[], r: Reading | null): Map<string, MarkNote> {
  const m = new Map<string, MarkNote>();
  if (!r) return m;
  for (const e of entries) {
    if (e.theme) continue;
    e.notes.forEach(([on], j) => {
      const n = markOf(r, j);
      // D370: a slur's notes too (its last's way to the next may be unsaid: the rules decide it, the slur shapes it).
      if (n && (n.join !== null || n.short || n.slur)) m.set(`${e.voice}:${on}`, n);
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
  // D370: a reading's slur shaped as the band shapes it (phrasing.ts SLUR_SHAPE): its first leaned on after a
  // lift, the plucked or struck string held over inside it, its last let go early.
  const struck = rules?.kind === "harpsichord" || rules?.kind === "piano";
  return notes.map(([on, dur, midi], i) => {
    const n = r?.notes[i];
    const apart = !!n?.short || n?.join === false;
    const gapTo = i + 1 < notes.length ? notes[i + 1][0] - on : dur;
    const ru = rule(i);
    const role = slurRole(r, i);
    const over = struck && joined(i) && (role === "first" || role === "mid") ? (rules!.kind === "piano" ? SLUR_SHAPE.over.piano : SLUR_SHAPE.over.harpsichord) : JOIN_OVER_S;
    const lean = role === "first" && i > 0 && !joined(i - 1) ? (rules?.kind === "piano" ? SLUR_SHAPE.lean.piano : SLUR_SHAPE.lean.other) : 0;
    // Joined: to the next note's start and a little over; detached: three quarters, short: half (D304: as the others play them, phrasing.ts ART_HOLD); D370: a slur's last detached 0.55.
    const len = n?.short ? (dur * ART_HOLD.short) / tps : n?.join === false ? (Math.min(dur, gapTo) * (role === "last" ? SLUR_SHAPE.lastHold : ART_HOLD.detach)) / tps - lean : joined(i) ? gapTo / tps + over - lean : ru && "gap" in ru ? dur / tps - ru.gap : (dur * 0.92) / tps;
    const u = notes.length > 1 ? i / (notes.length - 1) : 0;
    const shaped = r?.shape === "crescendo" ? base - 0.12 + 0.24 * u : r?.shape === "diminuendo" ? base + 0.12 - 0.24 * u : r?.shape === "arch" ? base - 0.1 + 0.2 * Math.sin(Math.PI * u) : base;
    const d = Math.max(0.05, Math.min(1, shaped + (n?.accent ? 0.15 : 0)));
    return { at: (on - on0) / tps + lean, len, midi, d, ...(i > 0 && joined(i - 1) ? { legato: true, from: notes[i - 1][2] } : {}), ...(joined(i) ? { tie: over } : {}), ...(i === notes.length - 1 ? { final: true } : {}), ...(apart ? { apart: true } : {}) };
  });
}
