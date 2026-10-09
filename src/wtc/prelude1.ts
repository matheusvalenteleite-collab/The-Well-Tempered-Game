/**
 * The WTC mode, level 1 (docs/wtc/CONCEPT.md): the harmonic plan of Prelude 1 in C (BWV 846/1).
 * The prelude is one figuration applied to a five-note chord per bar; the player chooses the chord
 * of each bar from four, all taken from Bach's own vocabulary in this prelude (the chord of a
 * neighbouring bar held or anticipated over this bar's bass, or a chord Bach puts on the same bass
 * elsewhere), hears it in Bach's figuration, and compares the plan with Bach's.
 *
 * Data: data/wtc/prelude1.json (tools/wtc/prelude1.py, from the public-domain Mutopia edition).
 */
import raw from "../../data/wtc/prelude1.json" with { type: "json" };
import type { PlayEvent } from "../counterpoint/layout.ts";

export interface Fundamental {
  root: string;
  chord: string;
}
export interface Choice {
  pitches: string[];
  figures: number[];
  fundamental: Fundamental;
  bach: boolean;
}
export interface Bar {
  bar: number;
  pitches: string[];
  figures: number[];
  fundamental: Fundamental;
  choices: Choice[];
}
interface Slot {
  voice: number;
  onset: string;
  duration: string;
}

const data = raw as unknown as { figuration: { half_bar: Slot[] }; bars: Bar[] };
export const BARS: Bar[] = data.bars;
const HALF: Slot[] = data.figuration.half_bar;

export function frac(s: string): number {
  const [a, b] = s.split("/").map(Number);
  return b ? a / b : a;
}

/** "6/4/2" for [6, 4, 2]; the root position triad as "5/3". */
export function figureLabel(f: number[]): string {
  const g = f.filter((x) => x !== 8);
  return g.length ? g.join("/") : "8";
}

/** The coda, bars 33-35 (the figuration breaks off over the tonic pedal), as Bach wrote it. */
const CODA: { at: number; length: number; pitch: string }[] = (() => {
  const out: { at: number; length: number; pitch: string }[] = [];
  const s = 1 / 16;
  const run = (bar: number, notes: string[]) => notes.forEach((p, k) => out.push({ at: bar + (2 + k) * s, length: s, pitch: p }));
  // bar 33: C2 held, C3 held, then F3 A3 C4 F4 C4 A3 C4 A3 F3 A3 F3 D3 F3 D3
  out.push({ at: 32, length: 1, pitch: "C2" }, { at: 32 + s, length: 1 - s, pitch: "C3" });
  run(32, ["F3", "A3", "C4", "F4", "C4", "A3", "C4", "A3", "F3", "A3", "F3", "D3", "F3", "D3"]);
  // bar 34: C2, B2 held, then G4 B4 D5 F5 D5 B4 D5 B4 G4 B4 D4 F4 E4 D4
  out.push({ at: 33, length: 1, pitch: "C2" }, { at: 33 + s, length: 1 - s, pitch: "B2" });
  run(33, ["G4", "B4", "D5", "F5", "D5", "B4", "D5", "B4", "G4", "B4", "D4", "F4", "E4", "D4"]);
  // bar 35: the final chord
  for (const p of ["C2", "C3", "E4", "G4", "C5"]) out.push({ at: 34, length: 1, pitch: p });
  return out;
})();

/** The notes of one bar in Bach's figuration (the half bar twice), from `at` (whole notes). */
export function barEvents(pitches: string[], at: number, slot0 = 0): PlayEvent[] {
  const ev: PlayEvent[] = [];
  for (const half of [0, 0.5]) {
    for (const s of HALF) {
      const pitch = pitches[s.voice];
      if (pitch) ev.push({ slot: slot0 + ev.length, at: at + half + frac(s.onset), length: frac(s.duration), cantus: null, counterpoint: pitch });
    }
  }
  return ev;
}

/** The whole prelude with the player's chords; a bar not yet chosen sounds its bass alone. */
export function pieceEvents(picks: (number | null)[], withCoda = true): PlayEvent[] {
  const ev: PlayEvent[] = [];
  BARS.forEach((b, i) => {
    const k = picks[i];
    const pitches = k === null || k === undefined ? [b.pitches[0]] : b.choices[k].pitches;
    ev.push(...barEvents(pitches, i, ev.length));
  });
  if (withCoda) CODA.forEach((n) => ev.push({ slot: ev.length, at: n.at, length: n.length, cantus: null, counterpoint: n.pitch }));
  return ev.sort((a, b) => a.at - b.at);
}

export interface BarVerdict {
  bar: number;
  chosen: Choice | null;
  bach: Choice;
  same: boolean;
  /** the same fundamental as Bach's, though not his voicing */
  sameRoot: boolean;
}

export function compare(picks: (number | null)[]): BarVerdict[] {
  return BARS.map((b, i) => {
    const k = picks[i];
    const chosen = k === null || k === undefined ? null : b.choices[k];
    const bach = b.choices.find((c) => c.bach)!;
    return { bar: b.bar, chosen, bach, same: !!chosen?.bach, sameRoot: !!chosen && chosen.fundamental.root === bach.fundamental.root && chosen.fundamental.chord === bach.fundamental.chord };
  });
}
