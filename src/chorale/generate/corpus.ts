/**
 * The generator's material (Phase A, steps 1-2): Bach's chorales as events, one per on-beat
 * soprano attack (data/chorales/generator/bach-events.json, from tools/chorales/generator_data.py),
 * and Kittel's 24 melodies with the chords of his basses and of Bach's settings under each note
 * (data/chorales/level2.json). Chords are degrees of the chorale's key: upper case major, lower
 * case minor, ° diminished (Kirnberger's fundamentals as tools/chorales/kirnberger.py reads them).
 */
import bachRaw from "../../../data/chorales/generator/bach-events.json" with { type: "json" };
import l2Raw from "../../../data/chorales/level2.json" with { type: "json" };
import concRaw from "../../../data/chorales/concordance.json" with { type: "json" };

export type Mode = "major" | "minor";

export interface BachEvent {
  t: string;
  m: number;
  /** The melody's scale degree, by spelling ("1", "#4", "b7"). */
  deg: string;
  chord: string;
  bass: string;
  fig: string;
  /** A soprano fermata: the end of a phrase. */
  end?: 1;
  /** At a phrase end: the melody's last two degrees ("2-1"). */
  close?: string;
}

export interface BachChorale {
  no: number;
  /** The tune, whatever the text and key (the first eight intervals of the soprano). */
  tune: string;
  tonic: string;
  mode: Mode;
  notes: BachEvent[];
}

/** What the generator is given: a melody as scale degrees, with its phrase ends. */
export interface Melody {
  mode: Mode;
  /** `close`: the melody's last two degrees at a phrase end, where notes between the beats count. */
  notes: { deg: string; end: boolean; close?: string }[];
}

export const BACH: BachChorale[] = (bachRaw as unknown as { chorales: BachChorale[] }).chorales;

export const melodyOf = (c: BachChorale): Melody => ({ mode: c.mode, notes: c.notes.map((n) => ({ deg: n.deg, end: !!n.end, close: n.close })) });

export interface KittelNote {
  offset: string;
  measure: number;
  pitch: string;
  degree: string;
  fermata: boolean;
  kittel: { bass: string; chord: string }[];
  bach: { no: number; chord: string; bar: number }[];
}

export interface KittelChorale {
  number: number;
  title: string;
  tonic: string;
  mode: Mode;
  notes: KittelNote[];
  /** The numbers of Bach's settings of the same tune (the concordance). */
  bachSettings: number[];
}

const conc = (concRaw as unknown as { rows: { kittel: number; same_tune: { bach: number }[] }[] }).rows;

export const KITTEL: KittelChorale[] = (l2Raw as unknown as { chorales: Omit<KittelChorale, "bachSettings">[] }).chorales.map((c) => ({
  ...c,
  bachSettings: (conc.find((r) => r.kittel === c.number)?.same_tune ?? []).map((s) => s.bach),
}));

export const kittelMelody = (c: KittelChorale): Melody => ({ mode: c.mode, notes: c.notes.map((n) => ({ deg: n.degree, end: n.fermata })) });

/** The number of Kittel's basses for a chorale (8, or 9 in Nos. 23-24). */
export const kittelBasses = (c: KittelChorale) => c.notes[0].kittel.length;
