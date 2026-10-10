/**
 * The Well-Tempered Clavier as data: Bach's 48 preludes and fugues (BWV 846-893), each voice a list
 * of notes [onset, duration, pitch, sub] in ticks (TPQ per quarter), top voice first. Built by
 * tools/wtc/import.ts from the Humdrum encoding (data/sources/bach-wtc/SOURCE.md).
 */
import { TPQ, type KernPiece } from "./kern.ts";

export { TPQ };

/** [onset, duration, spelled pitch, sub-spine] — compact, for the JSON. */
export type WtcNote = [number, number, string, number];

export interface WtcPiece {
  /** "wtc1f01" ... "wtc2p24"; "inven01" ... "sinfo15". */
  id: string;
  /** WTC book (1, 2); 0 for the inventions and sinfonias. */
  book: 0 | 1 | 2;
  number: number;
  kind: "fugue" | "prelude" | "invention" | "sinfonia";
  /** Tonic as spelled ("C", "C#", "Eb") and mode. */
  key: string;
  mode: "major" | "minor";
  bwv: string;
  meter: string;
  /** Voices, top first. */
  voices: WtcNote[][];
  bars: { n: number; on: number }[];
  length: number;
}

export function pieceFromKern(id: string, k: KernPiece): WtcPiece {
  const inv = /^(inven|sinfo)(\d+)$/.exec(id);
  const m = inv ? ["", "0", inv[1] === "inven" ? "i" : "s", inv[2]] : /^wtc(\d)([pf])(\d+)$/.exec(id)!;
  const kk = k.key ?? "C";
  const minor = kk[0] === kk[0].toLowerCase();
  const tonic = kk[0].toUpperCase() + (kk[1] === "-" ? "b" : kk[1] === "#" ? "#" : "");
  return {
    id,
    book: Number(m[1]) as 0 | 1 | 2,
    number: Number(m[3]),
    kind: m[2] === "f" ? "fugue" : m[2] === "p" ? "prelude" : m[2] === "i" ? "invention" : "sinfonia",
    key: tonic,
    mode: minor ? "minor" : "major",
    bwv: (k.refs.SCT ?? "").replace(/^BWV\s*/, ""),
    meter: k.meter ?? "4/4",
    voices: k.voices.map((v) => v.map((n) => [n.on, n.dur, n.pitch, n.sub] as WtcNote)),
    bars: k.bars,
    length: k.length,
  };
}

/** A human label: "Fugue 1 in C major (Book I, BWV 846)". */
export function label(p: WtcPiece): string {
  const key = `${p.key.replace("b", "♭").replace("#", "♯")} ${p.mode}`;
  const kind = { fugue: "Fugue", prelude: "Prelude", invention: "Invention", sinfonia: "Sinfonia" }[p.kind];
  const where = p.book ? `Book ${p.book === 1 ? "I" : "II"}${p.bwv ? `, BWV ${p.bwv}` : ""}` : p.bwv ? `BWV ${p.bwv}` : "";
  return `${kind} ${p.number} in ${key}${where ? ` (${where})` : ""}`;
}
