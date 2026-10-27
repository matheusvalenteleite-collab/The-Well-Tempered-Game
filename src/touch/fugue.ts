/**
 * The touch game's pieces (D167: the 48 fugues; D168: and the 48 preludes), in the book's order, as
 * tools/touch/extract.ts cuts them from the study's corpus: each part (a fugue's voices, a prelude's
 * hands) a list of [onset, duration, MIDI, staff step] in ticks (tpq per quarter), the highest first; a
 * fugue's entries of the subject, each in its voice, as the subject or as the answer, with its key; the
 * keys the music reaches (entries, or a prelude's cadences); the sections the game plays one at a time.
 * D189: the entries' keys read again from the music, augmentations, diminutions and inversions marked,
 * Contrapunctus XIV's three subjects; each fugue's cadences and, where it has a regular one, its
 * countersubject against each entry (tools/touch/analysis.ts).
 */
import data from "../../data/touch/pieces.json" with { type: "json" };
import tutorialData from "../../data/touch/tutorial.json" with { type: "json" };
import moreData from "../../data/touch/more-bach.json" with { type: "json" };
import choraleData from "../../data/touch/chorales.json" with { type: "json" };

export type TouchNote = [on: number, dur: number, midi: number, step: number];

export interface TouchEntry {
  voice: number;
  /**
   * D189: "answer" where the entry's key is the dominant's (the answer's level), else "subject":
   * told by key, not by shape (a real answer has the subject's shape).
   */
  form: "subject" | "answer";
  /**
   * "c", "g", "Eb", "f#": minor in lower case. D189: read from the entry's own notes and the music
   * sounding with it (tools/touch/analysis.ts, entryKey), spelled as the score spells it ("e#").
   */
  key: string;
  bar: number;
  on: number;
  end: number;
  /** [onset, duration, MIDI, 1 where Bach varies the form] */
  notes: [on: number, dur: number, midi: number, varied: 0 | 1][];
  /** D189: the theme upside down (intervals mirrored). */
  inverted?: true;
  /** D189: in augmentation (2, every value doubled) or diminution (0.5); end is the scaled length. */
  scale?: 2 | 0.5;
  /** D189: a later subject of a triple fugue (Contrapunctus XIV: 2 the running subject, 3 B-A-C-H). */
  theme?: 2 | 3;
}

/** D189: a cadence, as tools/touch/analysis.ts reads it (findCadences). */
export interface TouchCadence {
  /** The tick where the arrival chord begins: a strong beat. */
  on: number;
  bar: number;
  /** The key it closes in ("g", "Eb"). */
  key: string;
  /**
   * perfect: V–I, both in root position (the bass ^5 to ^1), the top voice on ^1; imperfect: the
   * same, the top voice on ^3; deceptive: V–vi (VI in minor); half: arriving on V; phrygian: iv⁶–V
   * in minor.
   */
  kind: "perfect" | "imperfect" | "deceptive" | "half" | "phrygian";
}

/** D189: the countersubject against an entry: in which voice, from when to when (ticks). */
export interface TouchCountersubject {
  /** The entry it accompanies: an index into the piece's entries. */
  entry: number;
  voice: number;
  on: number;
  end: number;
}

export interface TouchFugue {
  id: string;
  kind: "prelude" | "fugue";
  book: number;
  number: number;
  title: string;
  /** The fugue's key, minor in lower case. */
  key: string;
  bwv: string;
  meter: string;
  tpq: number;
  length: number;
  barTicks: number;
  bars: { n: number; on: number }[];
  voiceNames: string[];
  voices: TouchNote[][];
  entries: TouchEntry[];
  /** The keys the music reaches, in time: a fugue's entries, a prelude's cadences. */
  keys: { on: number; key: string }[];
  /** Each MIDI pitch as the score spells it ("Eb4"). */
  spell: Record<string, string>;
  /** The passages the game plays one at a time, in ticks [from, to). */
  sections: { name: string; fromBar: number; toBar: number; from: number; to: number }[];
  /** D189: a fugue's cadences, in time (a prelude's: none yet). */
  cadences: TouchCadence[];
  /**
   * D189: the countersubject against each entry it accompanies, where the fugue has a regular one
   * (returning against two later entries at least and a third of them); empty where it has none.
   */
  countersubject: TouchCountersubject[];
  /**
   * D340: the MORE BACH and CHORALES tabs' pieces (tools/touch/more-bach.ts, chorales.ts): which
   * collection, the card's short name ("CONTRAPUNCTUS 5", "INVENTION 1"), the edition's credit line and
   * its page.
   */
  collection?: Collection;
  short?: string;
  credit?: string;
  source?: string;
  /** D340: the voices the player may take (the concerto's two solo violins); all where unset. */
  playable?: number[];
  /** D340: the voice offered first (a chorale's soprano). */
  defaultVoice?: number;
  /** D340: a chorale's fermatas: the ticks where the music goes on after each pause (held a beat longer than written). */
  fermatas?: number[];
  /** D340: the band's time in this piece (BAND TIME, D328): a chorale's band waits for the player after each fermata. */
  bandTime?: "waits";
}

/** D340: the collections beyond the WTC. */
export type Collection = "aof" | "mo" | "inv" | "sin" | "concerto" | "motet" | "cantata" | "chorale";

/** All 96, each prelude before its fugue, Book I then Book II. */
export const PIECES = data as unknown as TouchFugue[];
export const FUGUES = PIECES.filter((p) => p.kind === "fugue");
export const PRELUDES = PIECES.filter((p) => p.kind === "prelude");

/** D270: the pieces the TUTORIAL teaches with (Invention No. 1, tools/touch/tutorial.ts): found by id, in no list. */
export const TUTORIAL_PIECES = tutorialData as unknown as TouchFugue[];

/** D340: the MORE BACH tab's pieces (the Art of Fugue, the Musical Offering's ricercars, the Inventions and Sinfonias, BWV 1043), and the CHORALES tab's. */
export const MORE_BACH = moreData as unknown as TouchFugue[];
export const CHORALES = choraleData as unknown as TouchFugue[];
const BY_ID = new Map<string, TouchFugue>([...TUTORIAL_PIECES, ...CHORALES, ...MORE_BACH, ...PIECES].map((f) => [f.id, f]));

export function fugueById(id: string): TouchFugue {
  return BY_ID.get(id) ?? PIECES[0];
}

/** "I·2 P", "I·2 F"; the Art of Fugue's "AoF·XIV". */
export function shortName(f: TouchFugue): string {
  if (f.short) return f.short;
  if (!f.book) return "AoF·XIV";
  return `${f.book === 1 ? "I" : "II"}·${f.number} ${f.kind === "prelude" ? "P" : "F"}`;
}

/**
 * The beat the music is counted in (D167): a quarter in 4/4, a half in 2/2, a dotted quarter in 6/8,
 * a dotted eighth in 12/16. Its length in ticks and how many there are in a bar.
 */
export function beatOf(f: TouchFugue): { ticks: number; perBar: number } {
  const [num, den] = f.meter.split("/").map(Number);
  const unit = (f.tpq * 4) / den;
  return num % 3 === 0 && num > 3 ? { ticks: unit * 3, perBar: num / 3 } : { ticks: unit, perBar: num };
}

/** D188: fugues only for now; a prelude asked for gives its fugue. */
export function fugueOnly(id: string): string {
  const f = fugueById(id);
  if (f.kind !== "prelude") return f.id;
  return FUGUES.find((x) => x.book === f.book && x.number === f.number)?.id ?? FUGUES[0].id;
}

/** The tick where bar n starts (the end of the piece past the last bar). */
export function barStart(f: TouchFugue, n: number): number {
  return f.bars.find((b) => b.n === n)?.on ?? f.length;
}

/** The key the music is in at a tick: the last reached (an entry begun, a cadence), the piece's own before the first. */
export function keyAt(f: TouchFugue, tick: number): string {
  return f.keys.filter((k) => k.on <= tick).at(-1)?.key ?? f.key;
}

/**
 * Where a tick falls in its bar (D184): the ticks since the bar began, by the bars as encoded (an
 * irregular bar keeps the bars after it right); before bar 1 (an upbeat, the count-in), counted back
 * from bar 1 in bars of the metre.
 */
export function inBar(f: TouchFugue, tick: number): number {
  const bars = f.bars;
  if (!bars.length || tick < bars[0].on) {
    const first = bars[0]?.on ?? 0;
    return (((tick - first) % f.barTicks) + f.barTicks) % f.barTicks;
  }
  let lo = 0;
  let hi = bars.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (bars[mid].on <= tick) lo = mid;
    else hi = mid - 1;
  }
  return tick - bars[lo].on;
}

/**
 * The count-in and the beat's grid (D184): beats laid from bar 1 (so that an upbeat falls between
 * them, as written), the count-in whole bars of at least four beats before the first beat at or
 * before `from`; given the tempo (ticks a second), D338's count by time (countInBeats).
 */
export function countInStart(f: TouchFugue, from: number, tps?: number): number {
  const { ticks, perBar } = beatOf(f);
  const first = f.bars[0]?.on ?? 0;
  const onGrid = first + Math.floor((from - first) / ticks) * ticks;
  return onGrid - (tps ? countInBeats(f, tps) : perBar * Math.ceil(4 / perBar)) * ticks;
}

/** D338: the count-in aims at this long (s)... */
export const COUNT_IN_AIM_S = 2.5;
/** ...and lasts at most this long (s), unless two beats are longer. */
export const COUNT_IN_MAX_S = 4;

/**
 * D338, THE COUNT-IN BY TIME (the owner: whole bars took very long in slow pieces): the fewest whole
 * beats of the metre (beatOf: minims in 2/2, dotted crotchets in 12/8), at least two, lasting at least
 * COUNT_IN_AIM_S, at most one bar and COUNT_IN_MAX_S (two beats however long). Where a bar is shorter
 * than the aim (a quick 3/8 or 2/4) it counts whole bars instead, up to COUNT_IN_MAX_S and never more
 * than the old count (whole bars of at least four beats). `tps`: ticks a second at the start.
 */
export function countInBeats(f: TouchFugue, tps: number): number {
  const { ticks, perBar } = beatOf(f);
  const old = perBar * Math.ceil(4 / perBar);
  const beatS = ticks / tps;
  if (!(beatS > 0) || !Number.isFinite(beatS)) return old;
  const barS = perBar * beatS;
  if (barS >= COUNT_IN_AIM_S - 1e-9) {
    const want = Math.ceil(COUNT_IN_AIM_S / beatS - 1e-9);
    return Math.max(2, Math.min(want, perBar, Math.floor(COUNT_IN_MAX_S / beatS + 1e-9)));
  }
  const bars = Math.max(1, Math.min(Math.ceil(COUNT_IN_AIM_S / barS - 1e-9), Math.floor(COUNT_IN_MAX_S / barS + 1e-9)));
  return Math.max(2, Math.min(old, perBar * bars));
}

/** The bar a tick falls in. */
export function barAt(f: TouchFugue, tick: number): number {
  return f.bars.filter((b) => b.on <= tick).at(-1)?.n ?? 1;
}

/** "C MINOR", "E♭ MAJOR". */
export function keyName(key: string): string {
  const minor = key[0] === key[0].toLowerCase();
  const tonic = key[0].toUpperCase() + key.slice(1).replace("b", "♭").replace("#", "♯");
  return `${tonic} ${minor ? "MINOR" : "MAJOR"}`;
}

const CADENCE_WORDS: Record<TouchCadence["kind"], string> = {
  perfect: "PERFECT CADENCE",
  imperfect: "IMPERFECT CADENCE",
  deceptive: "DECEPTIVE CADENCE",
  half: "HALF CADENCE",
  phrygian: "PHRYGIAN CADENCE",
};

/** D189: "PERFECT CADENCE · G MINOR". */
export function cadenceName(c: TouchCadence): string {
  return `${CADENCE_WORDS[c.kind]} · ${keyName(c.key)}`;
}

/** D189: the cadences arriving in [from, to). */
export function cadencesIn(f: TouchFugue, from: number, to: number): TouchCadence[] {
  return (f.cadences ?? []).filter((c) => c.on >= from && c.on < to);
}

/** D189: what an entry is beyond subject or answer: "INVERSION", "AUGMENTATION", "DIMINUTION", "AUGMENTED INVERSION"…; "" for a plain one. */
export function entryShape(e: TouchEntry): string {
  const scale = e.scale === 2 ? "AUGMENTATION" : e.scale === 0.5 ? "DIMINUTION" : "";
  if (e.inverted) return scale ? `${scale === "AUGMENTATION" ? "AUGMENTED" : "DIMINISHED"} INVERSION` : "INVERSION";
  return scale;
}

/** D189: the countersubject sounding against an entry (by its index in f.entries), if the fugue has one there. */
export function countersubjectOf(f: TouchFugue, entry: number): TouchCountersubject | undefined {
  return (f.countersubject ?? []).find((c) => c.entry === entry);
}

/** A staff step's letter and octave ("C5"). */
export function stepName(step: number): string {
  return `${"CDEFGAB"[((step % 7) + 7) % 7]}${Math.floor(step / 7)}`;
}
