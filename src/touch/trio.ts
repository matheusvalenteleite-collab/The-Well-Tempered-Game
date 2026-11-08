/**
 * D504, ZELENKA TRIO (sound.ts `oboeTrio`): which voice each instrument takes, how often a note has to be played an
 * octave nearer to stay in its instrument's compass (Patch.compass, chip.ts Chip.note), and THE CONTINUO SCRIPT:
 * where the basso continuo (the cello and the harpsichord) joins the bass line.
 *
 * The owner: "the basso continuo would not enter as frequently as being a voice of the fugue. it would come only in
 * certain subjects and episodes, depending on the mood of the fugue, climax points, key moments, tension building,
 * etc. like in a Zelenka trio sonata." So the continuo is a colour of the band by the music's structure, as the
 * colour plans are (D355): written per fugue in trio-continuo.ts (the bars, each with its reason), and for any other
 * fugue a player picks the sound for, derived from the fugue's structure (`continuoRule`): the subject's entries in
 * the bass, Ledbetter's stretti, pedal points and climaxes, the approach to each perfect cadence after the
 * exposition, and the last four bars; silent in the light episodes between.
 *
 * The rules (test/d504-oboe-trio.test.ts):
 *   - by the music only: the script reads the piece (its bars, entries, cadences, sections), never the player's
 *     score, streak or accuracy (D482's rule); the player's own bass notes take the continuo where the band's would;
 *   - at phrase boundaries, never mid-note: a span begins and ends at a bass note that begins a phrase (after a
 *     rest, on a bar's first beat, or an entry's first note), and each note reads the script where it starts, so a
 *     sounding note keeps what it began with;
 *   - no level of its own: the continuo's instruments are the band's, at the levels sound.ts TRIO_CONTINUO sets.
 */
import type { TouchFugue } from "./fugue.ts";
import { tickOfBar } from "./colour.ts";
import { PATCHES, PRESETS, inCompass, type PatchId } from "./sound.ts";
import { baseSound } from "./band-fx.ts";
import sectionsData from "../../data/wtc/ledbetter-sections.json" with { type: "json" };
import { TRIO_CONTINUO_SCRIPTS, type ContinuoMoment } from "./trio-continuo.ts";

type Slot = readonly [patch: PatchId, pan: number, level?: number];
type Fugue = Pick<TouchFugue, "id" | "voices" | "bars" | "barTicks" | "length" | "meter" | "tpq" | "entries" | "cadences">;

/** The trio's id (sound.ts PRESETS). */
export const TRIO_ID = "oboeTrio";

/** A layout's notes out of compass, voice by voice (each such note is played an octave nearer: a fold). */
export function foldsOf(f: Pick<TouchFugue, "voices">, slots: readonly Slot[]): number[] {
  return f.voices.map((v, i) => {
    const c = PATCHES[slots[Math.min(i, slots.length - 1)][0]].compass;
    return c ? v.filter((n) => inCompass(n[2], c) !== n[2]).length : 0;
  });
}
const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * The trio's own layout (`by`'s: in three voices the two oboes and the bassoon) is kept while it folds no more than
 * this share of the piece's notes (one in a hundred: a rare low note of the alto, an octave nearer); past it, the
 * layout among `by`'s and `alts`' with the fewest folds (in three voices oboe I, the bassoon on the middle voice and
 * the cello on the bass, where the middle voice lies under the oboe's Bb3).
 */
export const TRIO_FOLD_SHARE = 0.01;

/** The trio's layout for a piece (its number of voices), its folds voice by voice, and whether it is an alternative. */
export function trioLayout(f: Pick<TouchFugue, "voices">): { count: number; slots: readonly Slot[]; folds: number[]; alt: boolean } {
  const p = PRESETS.find((x) => x.id === TRIO_ID)!;
  const count = f.voices.length;
  const own = p.by?.[count] ?? p.by?.[5] ?? [];
  const notes = f.voices.reduce((a, v) => a + v.length, 0);
  let best = { count, slots: own, folds: foldsOf(f, own), alt: false };
  if (total(best.folds) <= TRIO_FOLD_SHARE * notes) return best;
  for (const s of p.alts?.[count] ?? []) {
    const folds = foldsOf(f, s);
    if (total(folds) < total(best.folds)) best = { count, slots: s, folds, alt: true };
  }
  return best;
}

/** The bass line's notes that begin a phrase: after a rest, on a bar's first beat, or an entry's first note in the bass. */
export function phraseStarts(f: Fugue): number[] {
  const bass = f.voices[f.voices.length - 1] ?? [];
  const bv = f.voices.length - 1;
  const downbeats = new Set(f.bars.map((b) => b.on));
  const entries = new Set(f.entries.filter((e) => e.voice === bv).map((e) => e.on));
  const out: number[] = [];
  for (let i = 0; i < bass.length; i++) {
    const [on] = bass[i];
    const prev = bass[i - 1];
    if (i === 0 || on > prev[0] + prev[1] || downbeats.has(on) || entries.has(on)) out.push(on);
  }
  return out;
}

/** A span of the continuo, in ticks [from, to), and why it plays there. */
export interface ContinuoSpan {
  from: number;
  to: number;
  why: string;
}

/** The first phrase start at or after `tick` (the piece's end if none). */
function snap(starts: readonly number[], tick: number, end: number): number {
  for (const s of starts) if (s >= tick) return s;
  return end;
}

/** Moments ([bar, in or out, why]) made spans, each end at a phrase start of the bass. */
export function spansOf(f: Fugue, moments: readonly ContinuoMoment[]): ContinuoSpan[] {
  const starts = phraseStarts(f);
  const bass = f.voices[f.voices.length - 1] ?? [];
  const ms = [...moments].sort((a, b) => a[0] - b[0]);
  const out: ContinuoSpan[] = [];
  let open: { from: number; why: string } | null = null;
  // A span ends at a phrase start; where the bass rests before it, at the end of the last note it began.
  const close = (from: number, at: number, why: string) => {
    const last = bass.filter((n) => n[0] >= from && n[0] < at).at(-1);
    const to = last ? Math.min(at, Math.max(last[0] + last[1], from + 1)) : at;
    if (!last || to <= from) return;
    // (A span that begins where the one before ends goes on from it: one entrance, not two.)
    const prev = out[out.length - 1];
    if (prev && prev.to >= from) prev.to = Math.max(prev.to, to);
    else out.push({ from, to, why });
  };
  for (const [bar, inOut, why] of ms) {
    const t = snap(starts, tickOfBar(f, bar), f.length);
    if (inOut === "in" && !open) open = { from: t, why };
    else if (inOut === "out" && open) {
      close(open.from, t, open.why);
      open = null;
    }
  }
  if (open) close(open.from, f.length, open.why);
  return out;
}

const SECTIONS = (sectionsData as { pieces: Record<string, { from: number; to: number; label: string }[]> }).pieces;
/** The sections whose music asks for the continuo: Ledbetter's stretti, pedal points and climaxes. */
const CLIMAX = /strett|pedal|climax/i;

/**
 * The fallback for a fugue without a script of its own, from its structure: the subject's entries in the bass (from
 * the entry to its end), Ledbetter's stretti, pedals and climaxes, the bar before each perfect cadence after the
 * exposition through its arrival, the last four bars; spans a bar apart or less joined, none shorter than two bars.
 */
export function continuoRule(f: Fugue): ContinuoMoment[] {
  const bv = f.voices.length - 1;
  const lastBar = f.bars[f.bars.length - 1]?.n ?? 1;
  const barOf = (tick: number) => {
    let n = f.bars[0]?.n ?? 1;
    for (const b of f.bars) if (b.on <= tick) n = b.n;
    return n;
  };
  const raw: [number, number, string][] = [];
  if (f.voices.length > 1) for (const e of f.entries) if (e.voice === bv) raw.push([e.bar, Math.max(e.bar + 1, barOf(e.end)), `the subject's entry in the bass (${e.bar})`]);
  // A stretto, pedal or climax section: its last four bars (the tension gathering to its end; its bass entries have their own).
  for (const s of SECTIONS[f.id] ?? []) if (CLIMAX.test(s.label)) raw.push([Math.max(s.from, s.to - 4), s.to, `the close of Ledbetter's ${s.label} (${s.from}-${s.to})`]);
  const exposed = Math.max(...f.entries.slice(0, f.voices.length).map((e) => e.bar), 1);
  for (const c of f.cadences) if (c.kind === "perfect" && c.bar > exposed && c.bar < lastBar - 3) raw.push([c.bar - 1, c.bar + 1, `toward the perfect cadence in ${c.key} (${c.bar})`]);
  raw.push([Math.max(1, lastBar - 3), lastBar + 1, "the last bars: the final pedal and cadence"]);
  raw.sort((a, b) => a[0] - b[0]);
  const merged: [number, number, string][] = [];
  for (const r of raw) {
    const m = merged[merged.length - 1];
    if (m && r[0] <= m[1] + 1) m[1] = Math.max(m[1], r[1]);
    else merged.push([...r]);
  }
  return merged.filter(([a, b]) => b - a >= 2).flatMap(([a, b, why]): ContinuoMoment[] => [[a, "in", why], ...(b <= lastBar ? [[b, "out", "the bass alone again"] as ContinuoMoment] : [])]);
}

/** The continuo's moments for a piece: its script (trio-continuo.ts), else the rule. */
export const continuoMoments = (f: Fugue): readonly ContinuoMoment[] => TRIO_CONTINUO_SCRIPTS[f.id] ?? continuoRule(f);

/** The piece's continuo made ready: which of the bass's notes it joins (by where they start). */
export class ContinuoScript {
  readonly spans: ContinuoSpan[];
  private readonly bass: number;
  private readonly strongs: Set<number>;
  constructor(f: Fugue) {
    this.spans = spansOf(f, continuoMoments(f));
    this.bass = f.voices.length - 1;
    // The strong beats: each bar's first; in 4/4 and 2/2 also its middle (the harpsichordist's spread chords there).
    const half = f.meter === "4/4" || f.meter === "2/2" || f.meter === "C" || f.meter === "4/2";
    this.strongs = new Set(f.bars.flatMap((b) => (half ? [b.on, b.on + f.barTicks / 2] : [b.on])));
  }
  /** The continuo on a note of `voice` starting at `tick`: "strong" on a strong beat, "on", or null (the bass alone). */
  at(tick: number, voice: number): "on" | "strong" | null {
    if (voice !== this.bass) return null;
    if (!this.spans.some((s) => tick >= s.from && tick < s.to)) return null;
    return this.strongs.has(tick) ? "strong" : "on";
  }
}

/** For a piece on a sound: the continuo script (null on any sound but the trio, or with one voice). */
export function continuoFor(f: Fugue, presetId: string): ContinuoScript | null {
  return baseSound(presetId) === TRIO_ID && f.voices.length > 1 ? new ContinuoScript(f) : null;
}
