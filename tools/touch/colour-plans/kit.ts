/**
 * D355: the vocabulary the colour plans are written in (src/touch/colour.ts Colour), each moment with its
 * reason (for the report; the game's data keeps only the moments: tools/touch/colour-plans.ts).
 */
import { readFileSync } from "node:fs";
import type { Colour } from "../../../src/touch/colour.ts";

type Piece = { id: string; meter: string; tpq: number; barTicks: number; bars: { n: number; on: number }[]; entries: { bar: number; on: number; voice: number }[] };
const read = (p: string) => JSON.parse(readFileSync(new URL(`../../../${p}`, import.meta.url), "utf8")) as Piece[];
let all: Map<string, Piece> | null = null;
/** A piece's notes' frame (bars, entries), the WTC's and MORE BACH's. */
export function piece(id: string): Piece {
  all ??= new Map([...read("data/touch/pieces.json"), ...read("data/touch/more-bach.json")].map((p) => [p.id, p]));
  const p = all.get(id);
  if (!p) throw new Error(`no piece ${id}`);
  return p;
}
const frac = (p: Piece, tick: number) => {
  const b = p.bars.filter((x) => x.on <= tick).at(-1)!;
  return Math.round((b.n + (tick - b.on) / p.barTicks) * 1000) / 1000;
};
/** Where the first entry of the subject beginning in a bar begins (a bar with a fraction): a colour that comes with the entry. */
export function entry(id: string, bar: number): number {
  const p = piece(id);
  const e = p.entries.filter((x) => x.bar === bar).sort((a, b) => a.on - b.on)[0];
  if (!e) throw new Error(`${id}: no entry in bar ${bar}`);
  return frac(p, e.on);
}
/** So many beats (the metre's: a quarter in 4/4, a dotted quarter in 6/8) into a bar: just past a cadence's arrival. */
export function beat(id: string, bar: number, k = 1): number {
  const p = piece(id);
  const [num, den] = p.meter.split("/").map(Number);
  const unit = (p.tpq * 4) / den;
  const b = num % 3 === 0 && num > 3 ? unit * 3 : unit;
  const on = p.bars.find((x) => x.n === bar)?.on;
  if (on === undefined) throw new Error(`${id}: no bar ${bar}`);
  return frac(p, on + k * b);
}

/** A moment: the bar (a fraction past its start where the music asks), the colour from there, why. */
export interface Moment {
  bar: number;
  c: Colour;
  why: string;
}
export interface PieceColours {
  /** The piece's own sound (src/touch/piece-sound.ts PIECE_SOUND) and why. */
  sound: string;
  soundWhy: string;
  /** The piece in a line (character, texture), as the plans read it. */
  character: string;
  /** By sound (sound.ts PRESETS ids): the moments, in time. */
  plans: Record<string, Moment[]>;
}

export const at = (bar: number, c: Colour, why: string): Moment => ({ bar, c, why });

// ---- HARPSICHORD (SAMPLED): the band's manuals and stops (registration.ts: unison the second 8′, four the 4′, lute the buff) ----
/** 8′ alone (the sound's own): the softer manual. */
export const H8: Colour = { reg: [] };
/** 8′ + 4′: the louder, brighter manual (Bodky's forte). */
export const H84: Colour = { reg: ["four"] };
/** The manuals coupled, 8′ + 8′ + 4′ (Bodky's "full work" without the 16′ the game has not got). */
export const HFULL: Colour = { reg: ["unison", "four"] };
/** 8′ + 8′: the coupled unison, fuller but no brighter. */
export const H88: Colour = { reg: ["unison"] };
/** The lute (buff) stop: the softest, a muted pluck (on a phone not on the bass: colour.ts). */
export const HLUTE: Colour = { reg: ["lute"] };

// ---- PIPE ORGAN: the band's registration (registration.ts stops; D349's one organ: the pedal follows the manual) ----
/** The flutes (Gedackt 8′, Rohrflöte 4′): a second manual, the echo. */
export const OFLUTE: Colour = { reg: ["flute"] };
/** The principals (8′ and 4′): the organ's own default. */
export const OPRIN: Colour = { reg: ["principal"] };
/** The plenum (D349: the recorded Principal-to-Mixture; before it, the principal with the mixture's ranks). */
export const OPLENO: Colour = { reg: ["principal", "mixture"] };
/** Principal with the flute: the foundation 8′ fuller (a "Fonds" without the mixture). */
export const OFONDS: Colour = { reg: ["principal", "flute"] };

/** Back to the sound's own colour (every field cleared). */
export const OWN: Colour = {};

/** The pulse voices' widths, voice by voice from the top (undefined: that voice as it is): a chip's duty cycles moved together. */
export function widths(bar: number, w: (number | undefined)[], why: string): Moment[] {
  return w.flatMap((x, v) => (x === undefined ? [] : [at(bar, { pw: x, voices: [v] }, why)]));
}
