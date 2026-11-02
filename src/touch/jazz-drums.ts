/**
 * D503, JAZZ QUARTET'S BRUSHES. The owner: "some fugues have rhythm that can be nicely translated into jazz … add a
 * jazz drum accompaniment, which will also do rolls at scripted times in the assigned fugues, thus giving the backing
 * track more personality and fittingness to the piece." Pure numbers here (tested in test/d503-jazz.test.ts); chip.ts
 * `brushes` sounds them on Karoryfer's Swirly Drums (sampled.ts BRUSH_FILES).
 *
 * THE PATTERN, on the game's own beat (proto-game.ts: the metre's beats, a compound metre's in threes, the final
 * ritard followed; the drums never move Bach's notes, and no tempo of the piece changes for them): the brush STIRS on
 * every beat (the left hand circling the head, a swish swelling into each beat); the right hand's brush TAPS the
 * backbeat (4/4 and 12/16 beats 2 and 4, 2/2, 2/4 and 6/8 beat 2, 3/4, 3/8 and 9/8 beats 2 and 3, the third lighter);
 * the RIDE on every beat, its skip note before the backbeat swung a little (SWING of the beat in simple time; in a
 * compound metre the beat's last third, as written); the hi-hat's FOOT on the backbeat. Busoni's dynamics (the reading's
 * printed level, the voices' mean at the beat) make it quieter in p (no skip notes, the stir lighter) and a little busier
 * in f (the skip on every beat, ghost taps between, the firmer stir). Never the score, the streak or the verdicts (D482).
 *
 * THE FILLS, at the piece's structure (DRUM_SCRIPTS: the assigned fugues, a moment a row with its reason, like the colour
 * plans; GENERIC: any other fugue a player picks the sound for): a FILL, a flutter (the brush's buzz roll) rising over
 * the beats before a section's or a cadence's downbeat, two pick-up taps, and on the downbeat a tap and a fuller ride;
 * a LIFT, one beat of flutter into a subject's entry in the bass; the FINAL, a soft flutter over the last bar, fading.
 */
import type { TouchFugue } from "./fugue.ts";
import ledbetter from "../../data/wtc/ledbetter-sections.json" with { type: "json" };

export type MomentKind = "fill" | "lift" | "final";
/** A scripted moment: the bar (Bach's numbering) and beat it leads into, what the drummer plays, and why. */
export interface DrumMoment {
  bar: number;
  /** The beat of the bar it leads into (0, the downbeat, unless given). */
  beat?: number;
  kind: MomentKind;
  /** How many beats the roll takes before it (a fill FILL_BEATS, a lift 1). */
  beats?: number;
  why: string;
}

/**
 * D503: the scripts of the fugues that open on JAZZ QUARTET (piece-sound.ts): a few moments each, at the sections
 * (Ledbetter's, data/wtc/ledbetter-sections.json; the game's), the cadences (fugue.ts, tools/touch/analysis.ts) and the
 * bass's entries, spaced so the drummer speaks now and then, not every bar.
 */
export const DRUM_SCRIPTS: Readonly<Record<string, readonly DrumMoment[]>> = {
  // I/19 in A major, 9/8 (three dotted beats a bar): the delicate scherzo; Ledbetter's sections 1-20, 23-42, the reprise 42-54.
  wtc1f19: [
    { bar: 4, kind: "lift", why: "the bass's first entry (the subject, A): the drummer brings the bass in" },
    { bar: 9, kind: "fill", why: "the exposition closes on the A major cadence and the soprano takes the subject again" },
    { bar: 13, kind: "lift", why: "the bass's entry in F sharp minor, the first move to the minor" },
    { bar: 20, kind: "fill", beats: 3, why: "the perfect cadence in E that ends Ledbetter's first section: a whole bar's roll" },
    { bar: 23, kind: "lift", why: "the second section opens with the subject in the bass, back in A" },
    { bar: 33, kind: "lift", why: "the bass's D major entry, the subdominant's colour" },
    { bar: 36, kind: "fill", why: "the B minor cadence, the episode's turn" },
    { bar: 42, kind: "fill", beats: 3, why: "the reprise (Ledbetter, bar 42) on the F sharp minor cadence: a whole bar's roll" },
    { bar: 44, kind: "lift", why: "the bass answers in E, the reprise's last entry" },
    { bar: 49, kind: "fill", why: "the A major cadence before the coda" },
    { bar: 54, kind: "final", why: "the final cadence: a soft flutter, fading" },
  ],
  // II/12 in F minor, 2/4 (two beats a bar, the upbeat an eighth): caprice and humour. Ledbetter's episodes 15-24, 33-40,
  // 54-71, 78-85, the relative major 24-31, the dominant pedals 50-53 and 80-83 (the colour plan's character).
  wtc2f12: [
    { bar: 11, beat: 1, kind: "lift", why: "the bass enters last with the subject (on the second beat's half): the exposition complete" },
    { bar: 15, kind: "fill", why: "the first episode (15-24): Keller's softening to ease begins" },
    { bar: 24, kind: "fill", why: "the soprano's A flat major entry: the relative major (24-31)" },
    { bar: 33, kind: "fill", why: "the second episode (33-40)" },
    { bar: 40, kind: "fill", why: "the perfect cadence in C and the bass's subject in F minor together: the fugue's middle" },
    { bar: 50, kind: "lift", why: "the alto's F minor entry over the dominant pedal (50-53)" },
    { bar: 54, kind: "fill", why: "the long episode (54-71)" },
    { bar: 71, kind: "lift", why: "the soprano's B flat minor entry, the last key's turn" },
    { bar: 78, kind: "fill", why: "the last episode (78-85), over the dominant pedal (80-83) to the end" },
    { bar: 85, kind: "final", why: "the final cadence in F minor: a soft flutter, fading" },
  ],
};

/** A fill's beats when a moment does not say (a lift's is 1). */
export const FILL_BEATS = 2;
/** The generic rule's spacing: no two moments within this many bars (the higher kind kept). */
export const MIN_GAP_BARS = 3;
/** The ride's skip note in simple time, as a share of the beat (0.5 straight, 0.667 a triplet): the drums' own subtle swing. */
export const SWING = 0.6;
/** Busoni's level (dB, the voices' mean) from which the brushes are busier (f), and under which quieter (p). */
export const BUSY_DB = 3;
export const QUIET_DB = -3;
/** The brushes' level follows Busoni's at this share (dB per dB), within ±DYN_DB_MAX. */
export const DYN_SHARE = 0.5;
export const DYN_DB_MAX = 4;

const LED = (ledbetter as unknown as { pieces: Record<string, { from: number; to: number; label: string }[]> }).pieces;

/** The tick where bar `n` (Bach's numbering) begins. */
function barOn(f: TouchFugue, n: number): number {
  const b = f.bars.find((x) => x.n === n);
  if (b) return b.on;
  const last = f.bars[f.bars.length - 1];
  return last ? last.on + (n - last.n) * f.barTicks : 0;
}

/**
 * GENERIC: any fugue's moments, from its own structure: the final cadence; Ledbetter's sections and the game's; its
 * perfect cadences (not the last); the subject's entries in the bass (a lift into each). Thinned: no two within
 * MIN_GAP_BARS bars, the higher kind kept (the final, then the sections, the cadences, the bass's entries).
 */
export function genericMoments(f: TouchFugue, beat: number): DrumMoment[] {
  const last = f.bars[f.bars.length - 1]?.n ?? 1;
  const cands: (DrumMoment & { pri: number })[] = [{ bar: last, kind: "final", why: "the final cadence: a soft flutter, fading", pri: 0 }];
  for (const s of LED[f.id] ?? []) if (s.from > 1 && s.from < last) cands.push({ bar: s.from, kind: "fill", why: `Ledbetter's section${s.label ? ` (${s.label})` : ""} begins`, pri: 1 });
  for (const s of f.sections) if (s.fromBar > 1 && s.fromBar < last) cands.push({ bar: s.fromBar, kind: "fill", why: `the game's section: ${s.name}`, pri: 2 });
  for (const c of f.cadences) if (c.kind === "perfect" && c.bar > 1 && c.bar < last) cands.push({ bar: c.bar, kind: "fill", why: `a perfect cadence in ${c.key}`, pri: 2 });
  const bass = f.voices.length - 1;
  for (const e of f.entries) {
    if (e.voice !== bass || e.bar <= 1 || e.bar >= last) continue;
    const b = Math.max(0, Math.floor((e.on - barOn(f, e.bar)) / beat));
    cands.push({ bar: e.bar, ...(b ? { beat: b } : {}), kind: "lift", why: `the bass's entry (${e.form}, ${e.key})`, pri: 3 });
  }
  cands.sort((a, b) => a.pri - b.pri || a.bar - b.bar);
  const kept: (DrumMoment & { pri: number })[] = [];
  for (const c of cands) if (c.pri === 0 || kept.every((k) => Math.abs(k.bar - c.bar) >= MIN_GAP_BARS)) kept.push(c);
  return kept.sort((a, b) => a.bar - b.bar).map(({ pri: _p, ...m }) => m);
}

/** A moment placed on the clock: the roll from `from` (tick) to `at` (the downbeat or entry it leads into). */
export interface Fill {
  kind: MomentKind;
  from: number;
  at: number;
  why: string;
}

/** The moments of a fugue: its script, else the generic rule. */
export const momentsOf = (f: TouchFugue, beat: number): readonly DrumMoment[] => DRUM_SCRIPTS[f.id] ?? genericMoments(f, beat);

const memo = new Map<string, Fill[]>();
/** The fills of a fugue on its clock (ticks), its beat `beat` ticks and `per` beats a bar. */
export function fillsFor(f: TouchFugue, beat: number, per: number): Fill[] {
  const key = `${f.id}:${beat}:${per}`;
  let out = memo.get(key);
  if (out) return out;
  out = momentsOf(f, beat).map((m) => {
    const at = barOn(f, m.bar) + (m.beat ?? 0) * beat;
    const beats = m.kind === "final" ? 0 : (m.beats ?? (m.kind === "lift" ? 1 : Math.min(FILL_BEATS, per)));
    return { kind: m.kind, from: Math.max(0, at - beats * beat), at, why: m.why };
  });
  memo.set(key, out);
  return out;
}

/** The backbeat's beats of a bar of `per` beats (4: 2 and 4; 3: 2 and 3; 2: 2; 1: none). */
export function backbeats(per: number): number[] {
  if (per <= 1) return [];
  if (per === 3) return [1, 2];
  return Array.from({ length: per }, (_, b) => b).filter((b) => b % 2 === 1);
}

/** A struck piece: the brush's tap on the snare, the ride, the hi-hat's foot; `at` in beats from the beat, `vel` 0-1. */
export interface BrushHit {
  piece: "tap" | "ride" | "foot";
  at: number;
  vel: number;
}
/** A swept piece: the stir or the flutter, from `at` for `len` beats, its level from `from` to `peak` (at `peakAt` of it) to `to`. */
export interface BrushSweep {
  piece: "stir" | "flutter";
  at: number;
  len: number;
  from: number;
  peak: number;
  peakAt: number;
  to: number;
  /** The firmer recording (the f stir; a fill's last beat). */
  firm?: boolean;
}
export interface BrushBeat {
  hits: BrushHit[];
  sweeps: BrushSweep[];
}

/** The brushes' level (a factor) at Busoni's level `dynDb`. */
export const dynGain = (dynDb: number) => 10 ** ((Math.max(-DYN_DB_MAX, Math.min(DYN_DB_MAX, DYN_SHARE * dynDb))) / 20);

/**
 * One beat of the brushes: beat `b` of a bar of `per` (`compound`: the beat in threes), at tick `tick` (a beat of
 * `beat` ticks), the piece's fills, Busoni's level here (`dynDb`, 0 without a reading), the piece's end (tick).
 */
export function brushBeat(b: number, per: number, compound: boolean, tick: number, beat: number, fills: readonly Fill[], dynDb = 0, end = Infinity): BrushBeat {
  const hits: BrushHit[] = [];
  const sweeps: BrushSweep[] = [];
  const g = dynGain(dynDb);
  const half = beat / 2;
  // The final: a soft flutter over the last bar, fading to the end; nothing else.
  const fin = fills.find((x) => x.kind === "final" && tick >= x.at - half);
  if (fin) {
    const n = Math.max(1, Math.round((end - fin.at) / beat));
    const k = Math.max(0, Math.round((tick - fin.at) / beat));
    if (k === 0) hits.push({ piece: "ride", at: 0, vel: 0.4 * g });
    const lv = (j: number) => 0.05 + 0.4 * Math.max(0, 1 - j / n);
    sweeps.push({ piece: "flutter", at: 0, len: 1, from: lv(k) * g, peak: lv(k + 0.3) * g, peakAt: 0.3, to: lv(k + 1) * g });
    return { hits, sweeps };
  }
  const roll = fills.find((x) => x.kind !== "final" && tick >= x.from - half && tick < x.at - half);
  const land = fills.find((x) => x.kind !== "final" && Math.abs(tick - x.at) < half);
  const back = backbeats(per).includes(b);
  const busy = dynDb >= BUSY_DB;
  const quiet = dynDb <= QUIET_DB;
  const off = compound ? 2 / 3 : SWING;
  if (roll) {
    // The fill: the flutter rising over the beats into the downbeat (or the entry), the foot kept; two pick-up taps at its end.
    const n = Math.max(1, Math.round((roll.at - roll.from) / beat));
    const k = Math.max(0, Math.min(n - 1, Math.round((tick - roll.from) / beat)));
    const lv = (x: number) => (roll.kind === "lift" ? 0.22 + 0.3 * x : 0.25 + 0.5 * x);
    const lastBeat = k === n - 1;
    sweeps.push({ piece: "flutter", at: 0, len: 1, from: lv(k / n) * g, peak: lv((k + 0.6) / n) * g, peakAt: 0.6, to: lv((k + 1) / n) * g, firm: lastBeat && roll.kind === "fill" });
    if (back) hits.push({ piece: "foot", at: 0, vel: 0.4 * g });
    if (lastBeat) {
      if (roll.kind === "fill") hits.push({ piece: "tap", at: compound ? 1 / 3 : 0.5, vel: 0.38 * g }, { piece: "tap", at: compound ? 2 / 3 : 0.75, vel: 0.5 * g });
      else hits.push({ piece: "tap", at: off, vel: 0.36 * g });
    }
    return { hits, sweeps };
  }
  // The stir: a swish swelling into each beat (its peak a third in), firmer in f.
  const stir = quiet ? 0.42 : busy ? 0.62 : 0.52;
  sweeps.push({ piece: "stir", at: 0, len: 1, from: stir * 0.55 * g, peak: stir * g, peakAt: 0.3, to: stir * 0.5 * g, firm: busy });
  if (land) {
    // The downbeat a fill leads into: a tap and a fuller ride.
    hits.push({ piece: "tap", at: 0, vel: (land.kind === "fill" ? 0.8 : 0.6) * g }, { piece: "ride", at: 0, vel: (land.kind === "fill" ? 0.75 : 0.6) * g });
  } else hits.push({ piece: "ride", at: 0, vel: (b === 0 ? 0.5 : 0.42) * (quiet ? 0.8 : 1) * g });
  if (back && !land) {
    hits.push({ piece: "tap", at: 0, vel: (per === 3 && b === 2 ? 0.42 : 0.52) * (quiet ? 0.8 : 1) * g });
    hits.push({ piece: "foot", at: 0, vel: (quiet ? 0.35 : 0.45) * g });
  } else if (back) hits.push({ piece: "foot", at: 0, vel: (quiet ? 0.35 : 0.45) * g });
  else if (busy) hits.push({ piece: "tap", at: off, vel: 0.18 * g });
  // The ride's skip note: before the backbeat's next beat (spang-spang-a-lang), on every beat in f, none in p.
  if (!quiet && (back || busy) && !land) hits.push({ piece: "ride", at: off, vel: 0.3 * g });
  return { hits, sweeps };
}
