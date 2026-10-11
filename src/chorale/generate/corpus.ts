/**
 * The generator's material (Phase A, steps 1-2): Bach's chorales as events, one per on-beat
 * soprano attack (data/chorales/generator/bach-events.json, from tools/chorales/generator_data.py),
 * and Kittel's 24 melodies with the chords of his basses and of Bach's settings under each note
 * (data/chorales/level2.json). Chords are degrees of the chorale's key: upper case major, lower
 * case minor, ° diminished (Kirnberger's fundamentals as tools/chorales/kirnberger.py reads them).
 */
import bachRaw from "../../../data/chorales/generator/bach-events.json" with { type: "json" };
import l2Raw from "../../../data/chorales/level2.json" with { type: "json" };
import l3Raw from "../../../data/chorales/level3.json" with { type: "json" };
import concRaw from "../../../data/chorales/concordance.json" with { type: "json" };
import { midiOf } from "./theory.ts";

export type Mode = "major" | "minor";

export interface BachEvent {
  t: string;
  m: number;
  /** The melody's scale degree, by spelling ("1", "#4", "b7"). */
  deg: string;
  chord: string;
  bass: string;
  fig: string;
  /** Bass and soprano MIDI numbers. */
  bm: number;
  sm: number;
  /** Soprano and bass, spelled. */
  sp: string;
  bp: string;
  /** Kirnberger's reading of the chord: its root, kind ("major", "dominant seventh", ...), and the
   *  bass's member ("root", "third", "fifth", "seventh", or "passing" where it is not a chord tone). */
  root: string;
  kind: string;
  role: string | null;
  /** Alto and tenor, spelled (null where they rest). */
  a: string | null;
  tn: string | null;
  /** The chord's position over the bass (absent where the bass is not a chord tone). */
  pos?: string;
  /** No onset in any voice since the event before (the two chords follow each other directly). */
  direct?: 1;
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
  notes: { deg: string; end: boolean; close?: string; midi?: number }[];
}

export const BACH: BachChorale[] = (bachRaw as unknown as { chorales: BachChorale[] }).chorales;

export const melodyOf = (c: BachChorale): Melody => ({ mode: c.mode, notes: c.notes.map((n) => ({ deg: n.deg, end: !!n.end, close: n.close, midi: n.sm })) });

export interface KittelNote {
  offset: string;
  measure: number;
  pitch: string;
  degree: string;
  fermata: boolean;
  kittel: { bass: string; chord: string }[];
  bach: { no: number; chord: string; bar: number }[];
  /** The bass under the note in each of Kittel's basses (degree, pitch) and in Bach's settings (degree). */
  kittelBass: { degree: string; pitch: string | null }[];
  bachBass: string[];
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

type L3 = { number: number; notes: { offset: string; kittel: { chord: string; pitch: string | null }[]; bach: { chord: string }[] }[] };
const l3 = new Map((l3Raw as unknown as { chorales: L3[] }).chorales.map((c) => [c.number, c]));

export const KITTEL: KittelChorale[] = (l2Raw as unknown as { chorales: Omit<KittelChorale, "bachSettings">[] }).chorales.map((c) => {
  const b = l3.get(c.number)!;
  return {
    ...c,
    notes: c.notes.map((n, i) => {
      const x = b.notes[i];
      if (x.offset !== n.offset) throw new Error(`Kittel ${c.number}: levels 2 and 3 disagree at note ${i}`);
      return { ...n, kittelBass: x.kittel.map((k) => ({ degree: k.chord, pitch: k.pitch })), bachBass: x.bach.map((y) => y.chord) };
    }),
    bachSettings: (conc.find((r) => r.kittel === c.number)?.same_tune ?? []).map((s) => s.bach),
  };
});

export const kittelMelody = (c: KittelChorale): Melody => ({ mode: c.mode, notes: c.notes.map((n) => ({ deg: n.degree, end: n.fermata, midi: midiOf(n.pitch) })) });

/** The number of Kittel's basses for a chorale (8, or 9 in Nos. 23-24). */
export const kittelBasses = (c: KittelChorale) => c.notes[0].kittel.length;
