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
import { ART_HOLD, SLUR_SHAPE } from "./phrasing.ts";
import { tr } from "../i18n/index.ts";
import { hardTapDevice } from "./motion.ts";
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
 * instructions on what the . is in articulation"): the dot is SHORT (staccato: judged SHORT ✓ (D419; was STACCATO ✓) when
 * the thumb lets go before three fifths of the note), the stroke DETACHED (D370: it was APART; judged
 * DETACHED ✓), the line JOINED (legato), the wedge an ACCENT (D387: weight on time: landed in the strong
 * zone, by the box, within PERFECT; D425: a hard tap, within GOOD, the strong zone where no sensor; src/bench/accent.ts. D338's lean after a silence only under CLASSIC). D370 (Glenn's notes §3): one vocabulary
 * everywhere, and ⌒ kept for a real slur (a group the reading slurs: one gesture, joined inside, let go at
 * its end); a plain legato join is JOINED's line. The box's legend at the start of a round with marks,
 * HEAR THE SUBJECT, HOW TO PLAY and the side bar.
 */
export type MarkKind = "short" | "apart" | "joined" | "slur" | "strong";
export function markLegend(_strongSide?: "outer" | "inner"): { kind: MarkKind; sym: string; text: string }[] {
  return [
    { kind: "short", sym: "·", text: tr("SHORT: LIFT BEFORE THREE FIFTHS OF THE NOTE") },
    { kind: "apart", sym: "|", text: tr("DETACHED: A SMALL SILENCE BEFORE THE NEXT NOTE") },
    { kind: "joined", sym: "‾", text: tr("LEGATO: NO GAP: THE NEXT THUMB LANDS AS THIS ONE LIFTS") },
    { kind: "slur", sym: "⌒", text: tr("SLUR: LEGATO UNDER IT, A SMALL SILENCE AFTER ITS LAST NOTE") },
    // D425: the accent a hard tap where the phone feels one (motion.ts hardTapDevice), else the strong zone (D387), whichever argument is given.
    { kind: "strong", sym: ">", text: hardTapDevice() ? tr("ACCENT: TAP HARD") : tr("ACCENT: STRONG ZONE") },
  ];
}
/** D370: which of the legend's marks a set of marks has (a join inside a slur is the slur's, not JOINED's). */
export function marksHas(marks: Iterable<MarkNote>): Record<MarkKind, boolean> {
  const ms = [...marks];
  return { short: ms.some((m) => !!m.short), apart: ms.some((m) => m.join === false), joined: ms.some((m) => !!m.join && !m.slur), slur: ms.some((m) => !!m.slur), strong: ms.some((m) => !!m.accent) };
}

/**
 * D385: on the piano a fugue with a whole-piece reading (BUSONI: every Book I fugue since D392, all 48 since D394) is played by it
 * unless the player chose another: its dynamics, accents, slurs and characters are the piano's (the
 * owner). Every other sound, and every other fugue, keeps D344's choice.
 */
export const WHOLE_DEFAULT = "busoni";
/** D871: a piece with no BUSONI reading is played by its print's marks where it has them (the Art of Fugue: "print"). */
export const WHOLE_FALLBACK = "print";
export const wholeReadingOf = (id: string): Reading | null =>
  readingsOf(id).find((r) => r.id === WHOLE_DEFAULT && r.whole) ?? readingsOf(id).find((r) => r.id === WHOLE_FALLBACK && r.whole) ?? null;
/**
 * D393 (WTC 1.90; the owner: "leave only Busoni's reading in the game for now. It's the default, and can be
 * turned off in settings"): play.html offers no reading but BUSONI's. D1050 (code audit A): the books' readings
 * (KELLER, BODKY, RIEMANN), their chooser and D344's choice for the friends deleted.
 */
const BUSONI_KEY = "tb-busoni-v1";
/** D393: Settings' BUSONI'S MARKINGS: on unless turned off (persisted). */
export function busoniOn(): boolean {
  try {
    return localStorage.getItem(BUSONI_KEY) !== "off";
  } catch {
    return true;
  }
}
export function setBusoniOn(on: boolean) {
  try {
    localStorage.setItem(BUSONI_KEY, on ? "on" : "off");
  } catch {
    /* private mode: on for this visit */
  }
}
/**
 * D393: the reading play.html plays a fugue by, on every instrument: BUSONI's whole-piece reading where the
 * fugue has one (all 48 fugues since D394, WTC 1.91) and the switch is on; else none (a fugue with no whole
 * reading; the switch off): the player's own articulation, the plain band, no marks in the box. The piano's own features (D385–D389)
 * stay the piano's; the others take what they already support (articulation, slurs, the box, the ending).
 */
export const playReading = (id: string): Reading | null => (busoniOn() ? wholeReadingOf(id) : null);
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
