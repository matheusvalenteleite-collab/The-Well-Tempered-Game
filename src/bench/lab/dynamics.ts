/**
 * D335, THE LAB's DYNAMICS (FREE PLAY, the sampled piano only): the note's loudness from where the
 * thumb lands across its bar and how hard it strikes (the motion sensor's peak, D321), in one of three
 * designs, beside OFF (today's: D311's across landing):
 *   A · PLACE × STRIKE: the across level (D311: the strong side, by STRONG_SIDE the inner, +4 dB; the
 *     soft side −4 dB) shifted by the strike (±4 dB).
 *   B · PEDAL + STRIKE: the across place averaged over the last MECH.dynPedalMs of landings (both
 *     thumbs) sets a running phrase level over 12 dB (±6), an expression pedal; the strike adds an
 *     accent of ±4 dB per note.
 *   C · STRIKE ONLY: the strike alone, ±8 dB round a fixed level.
 * Every total is held within ±DYN_MAX_DB (16 dB edge to edge: what a phone's speaker shows well).
 * Loudness is never scored: FREE PLAY judges nothing.
 *
 * The note starts at once at what is known at touchdown (the place or the pedal; the strike neutral);
 * when the peak is read (≤ ~40 ms) the note's level is corrected by a short linear ramp on its gain
 * (chip.ts rampTrim, MECH.dynRampMs). MECH.dynWait instead holds the attack up to MECH.dynWaitMs for
 * the peak and strikes it at the whole level (the piano's layer chosen by it too).
 *
 * D335 read the strike by the calibration of the tap's ZONE (the inner or outer half of the bar).
 * D336: the owner's zone test read both alike, so ONE calibration (LEARN or LEARN BY ZONE, kept in
 * localStorage), ADAPTIVE by default (AdaptiveCal: the references follow the recent strikes); the
 * strike's curve trusts a firm tap more than a soft one (strikeDb "firm"). DYNAMICS also plays in
 * PASSAGE (passage-dyn.ts). The zone report stays for the runs' logs; a stored zone calibration seeds loadDynCal.
 * The pure functions here are tested (test/d335-dynamics.test.ts, test/d336-passage-dynamics.test.ts).
 */
import type { Calibration } from "./sensor.ts";
import { separability, stats, type Separability, type Stats } from "./sensor.ts";
import { PIANO_DB, PIANO_ZONE_DB } from "../../touch/touch-expr.ts";

export type DynMode = "off" | "place" | "pedal" | "strike";
export const DYN_MODES: readonly (readonly [DynMode, string])[] = [
  ["off", "OFF"],
  ["place", "A · PLACE × STRIKE"],
  ["pedal", "B · PEDAL + STRIKE"],
  ["strike", "C · STRIKE ONLY"],
];
/** The total held within ±this (dB): 16 dB edge to edge. */
export const DYN_MAX_DB = 8;
/** A: the place's own range (D311's piano: ±4 dB). */
export const PLACE_DB = PIANO_DB;
/** B: the pedal's range, ±6 dB (12 dB). */
export const PEDAL_DB = 6;
/** A and B: the strike's accent, ±4 dB. */
export const STRIKE_DB = 4;
/** C: the strike alone, ±8 dB. */
export const STRIKE_ONLY_DB = 8;

export type Zone = "inner" | "outer";
/** A place across the bar (0 by the box, 1 the phone's edge: protos.ts barAcross) as its zone. */
export const zoneOf = (across: number): Zone => (across < 0.5 ? "inner" : "outer");

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const clamp01 = (x: number) => clamp(x, 0, 1);

/**
 * A peak as strength on a LOG scale (the owner's peaks run 0.07-2.7 m/s², soft and hard a factor of
 * about four apart): the calibration's soft median at 0.25, the hard's at 0.75, clamped 0..1 (so 0 at
 * soft ÷ √(hard/soft), 1 at hard × √(hard/soft)).
 */
export function logStrength(peak: number, cal: Pick<Calibration, "soft" | "hard">): number {
  if (!(peak > 0) || !(cal.soft > 0) || !(cal.hard > cal.soft)) return peak > 0 ? 0.5 : 0;
  return clamp01(0.25 + (0.5 * Math.log(peak / cal.soft)) / Math.log(cal.hard / cal.soft));
}
/** A strength's word for the feed. */
export function strikeWord(s: number): string {
  return s < 0.2 ? "soft" : s < 0.4 ? "light" : s < 0.6 ? "medium" : s < 0.8 ? "firm" : "hard";
}

/** The level's base at touchdown (dB), from `c` (0 the soft side .. 1 the strong: the place, or the pedal's average); C, none. */
export function baseDb(mode: DynMode, c: number): number {
  if (mode === "place") return PLACE_DB * (2 * clamp01(c) - 1);
  if (mode === "pedal") return PEDAL_DB * (2 * clamp01(c) - 1);
  return 0;
}
/**
 * D336: the strike's curve. "firm" (the default): trust a firm strike more than a soft one (the owner's
 * zone test: 3 of 18 hard taps by the box read as soft): at or below the soft reference (strength 0.25)
 * only a small cut, SOFT_CUT_DB (−2 dB in A and B; C's span is twice theirs, so −4 dB); from the
 * midpoint between the references (0.5, their geometric mean) the full accent (+4 dB; C +8); linear
 * between. "even": D335's symmetric line, (2s − 1) × span.
 */
export type StrikeCurve = "firm" | "even";
/** D336: the most a strike at or below the soft reference takes off in A and B (dB). */
export const SOFT_CUT_DB = 2;
/** The strike's dB for a strength (null: not read: 0). */
export function strikeDb(mode: DynMode, strength: number | null, curve: StrikeCurve = "firm"): number {
  if (strength === null || mode === "off") return 0;
  const span = mode === "strike" ? STRIKE_ONLY_DB : STRIKE_DB;
  const s = clamp01(strength);
  if (curve === "even") return span * (2 * s - 1);
  const cut = (SOFT_CUT_DB * span) / STRIKE_DB;
  if (s <= 0.25) return -cut;
  if (s >= 0.5) return span;
  return -cut + ((span + cut) * (s - 0.25)) / 0.25;
}
export interface DynLevel {
  base: number;
  strike: number;
  /** The sum held within ±DYN_MAX_DB. */
  total: number;
  clipped: boolean;
}
export function dynLevel(mode: DynMode, c: number, strength: number | null, curve: StrikeCurve = "firm"): DynLevel {
  const base = baseDb(mode, c);
  const strike = strikeDb(mode, strength, curve);
  const sum = base + strike;
  const total = clamp(sum, -DYN_MAX_DB, DYN_MAX_DB);
  return { base, strike, total, clipped: total !== sum };
}

/**
 * The piano's onset for a level (dB): Play.touch (D385: the zone, soft −3, normal 0, strong +3 dB)
 * and a factor on Play.level for the rest.
 */
export function pianoOnset(db: number): { touch: number; level: number } {
  // D385: the piano's landing is three zones (touch-expr.ts PIANO_ZONE_DB): the nearest zone's middle, the level the rest.
  const z = db <= -1.5 ? 0 : db >= 1.5 ? 2 : 1;
  const touch = z === 0 ? 1 / 6 : z === 2 ? 5 / 6 : 0.5;
  return { touch, level: 10 ** ((db - PIANO_ZONE_DB[z]) / 20) };
}

/** B: the expression pedal: the landings' places (0..1, strength) over the last `windowMs`, averaged. */
export class Pedal {
  private xs: { t: number; c: number }[] = [];
  windowMs: number;
  constructor(windowMs = 1000) {
    this.windowMs = windowMs;
  }
  /** A landing at `t` (ms) with strength `c`: the average with it. */
  add(t: number, c: number): number {
    this.xs.push({ t, c: clamp01(c) });
    return this.value(t);
  }
  /** The average of the landings within the window ending at `t` (0.5, the middle, with none). */
  value(t: number): number {
    this.xs = this.xs.filter((x) => x.t >= t - this.windowMs);
    const w = this.xs.filter((x) => x.t <= t);
    return w.length ? w.reduce((a, x) => a + x.c, 0) / w.length : 0.5;
  }
  get count(): number {
    return this.xs.length;
  }
}

/**
 * The late correction's ramp: the strike read at `now` (s, the audio clock) on a note struck at
 * `onset`: from the gain it has to `to`, starting now (never before the onset), over `rampMs`; read
 * before the note has begun (a note scheduled ahead), set at its onset with no ramp.
 */
export function correctionRamp(now: number, onset: number, rampMs: number): { at: number; until: number } {
  if (now <= onset) return { at: onset, until: onset };
  return { at: now, until: now + Math.max(0, rampMs) / 1000 };
}

// ---- Calibration by zone ----

export interface ZoneTap {
  label: string;
  peak: number | null;
  zone?: Zone;
}
export interface ZoneCal {
  inner: Calibration | null;
  outer: Calibration | null;
  /** Both zones' taps together (the plain LEARN's). */
  all: Calibration | null;
}
const peaksOf = (taps: readonly ZoneTap[], label: string, zone?: Zone) => taps.filter((x) => x.label === label && x.peak !== null && (!zone || x.zone === zone)).map((x) => x.peak!);
export interface ZoneSide {
  soft: Stats;
  hard: Stats;
  sep: Separability | null;
  /** The rotation's peaks (°/s), soft and hard together. */
  rot: Stats;
}
export interface ZoneReport {
  inner: ZoneSide;
  outer: ZoneSide;
  /** The outer zone's median over the inner's (soft, hard; NaN without both): 1 no difference. */
  ratioSoft: number;
  ratioHard: number;
  /** A plain verdict: "differ" (either ratio off by 25% or more), "alike", "too few". */
  verdict: "differ" | "alike" | "too few";
}
/** Do inner and outer taps differ? (the log's taps, each with its zone). */
export function zoneReport(taps: readonly (ZoneTap & { rotPeak?: number | null })[]): ZoneReport {
  const side = (z: Zone): ZoneSide => {
    const s = peaksOf(taps, "soft", z);
    const h = peaksOf(taps, "hard", z);
    const rot = taps.filter((x) => x.zone === z && (x.label === "soft" || x.label === "hard") && typeof x.rotPeak === "number").map((x) => x.rotPeak!);
    return { soft: stats(s), hard: stats(h), sep: s.length && h.length ? separability(s, h) : null, rot: stats(rot) };
  };
  const inner = side("inner");
  const outer = side("outer");
  const ratio = (a: Stats, b: Stats) => (a.n >= 3 && b.n >= 3 && a.median > 0 ? b.median / a.median : NaN);
  const ratioSoft = ratio(inner.soft, outer.soft);
  const ratioHard = ratio(inner.hard, outer.hard);
  const off = (r: number) => Number.isFinite(r) && (r >= 1.25 || r <= 0.8);
  const verdict = !Number.isFinite(ratioSoft) && !Number.isFinite(ratioHard) ? "too few" : off(ratioSoft) || off(ratioHard) ? "differ" : "alike";
  return { inner, outer, ratioSoft, ratioHard, verdict };
}

const ZONE_KEY = "wtc.lab.zoneCal";
/** The zone calibration kept on this device (localStorage; nothing if storage is blocked). */
export function loadZoneCal(): ZoneCal | null {
  try {
    const v = localStorage.getItem(ZONE_KEY);
    if (!v) return null;
    const o = JSON.parse(v) as Partial<ZoneCal>;
    const ok = (c: unknown): Calibration | null => (c && typeof c === "object" && (c as Calibration).hard > (c as Calibration).soft && (c as Calibration).soft > 0 ? (c as Calibration) : null);
    return { inner: ok(o.inner), outer: ok(o.outer), all: ok(o.all) };
  } catch {
    return null;
  }
}
export function saveZoneCal(zc: ZoneCal | null): boolean {
  try {
    if (zc) localStorage.setItem(ZONE_KEY, JSON.stringify(zc));
    else localStorage.removeItem(ZONE_KEY);
    return true;
  } catch {
    return false;
  }
}

// ---- D336: one calibration, adapting ----

/**
 * D336: the strike's references (the motion peak, m/s², a soft tap's and a hard tap's: strength 0.25 and
 * 0.75). One for the whole bar: the owner's zone test (WTC 1.49, 52 taps) read inner and outer alike
 * (soft 0.23 against 0.21, hard 0.62 against 0.66). `from`: LEARN in SENSOR, the adaptive references as
 * last kept, or the default (the owner's earlier sessions' soft median, and three times it).
 */
export interface DynCal {
  soft: number;
  hard: number;
  from: "learn" | "adaptive" | "default";
  /** The adaptive's strikes it was learned from (when from "adaptive"). */
  n?: number;
  at?: string;
}
export const DEFAULT_CAL: DynCal = { soft: 0.25, hard: 0.75, from: "default" };
/** D336, ADAPTIVE: the strikes it learns from (the latest), its quantiles, the stored calibration's weight (in strikes), the narrowest spread kept. */
export const ADAPT_N = 60;
export const ADAPT_LO = 0.2;
export const ADAPT_HI = 0.8;
export const ADAPT_SEED = 12;
export const ADAPT_MIN_RATIO = 2;
/** It starts to move after this many strikes. */
export const ADAPT_MIN_N = 4;

const quantile = (sorted: readonly number[], p: number) => {
  const x = p * (sorted.length - 1);
  const lo = Math.floor(x);
  const hi = Math.min(sorted.length - 1, lo + 1);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (x - lo);
};

/**
 * D336, ADAPTIVE calibration (on by default): the owner's levels drift between sessions (hard median
 * 0.95–1.18 in earlier sessions, 0.62–0.66 in the last, the phone turned the other way), so the soft and
 * hard references follow his recent strikes: the low and high quantiles (ADAPT_LO, ADAPT_HI) of the last
 * ADAPT_N peaks, blended on a log scale with the stored calibration as if it were ADAPT_SEED strikes
 * (so it moves from the first strikes and has mostly followed him after a few dozen), never closer than
 * ADAPT_MIN_RATIO apart (round their geometric mean: a run of even strikes does not make every
 * difference an accent). Off, the stored calibration alone.
 */
export class AdaptiveCal {
  peaks: number[] = [];
  seed: DynCal;
  on: boolean;
  constructor(seed: DynCal = DEFAULT_CAL, on = true) {
    this.seed = seed;
    this.on = on;
  }
  /** A strike's peak learned from (nothing for none). */
  add(peak: number | null) {
    if (peak === null || !(peak > 0) || !Number.isFinite(peak)) return;
    this.peaks.push(peak);
    if (this.peaks.length > ADAPT_N) this.peaks.splice(0, this.peaks.length - ADAPT_N);
  }
  /** A new stored calibration (LEARN): the strikes learned so far dropped. */
  reseed(c: DynCal) {
    this.seed = c;
    this.peaks = [];
  }
  get n(): number {
    return this.peaks.length;
  }
  /** The references now. */
  refs(): DynCal {
    const n = this.peaks.length;
    if (!this.on || n < ADAPT_MIN_N) return this.seed;
    const s = [...this.peaks].sort((a, b) => a - b);
    const w = n / (n + ADAPT_SEED);
    const mix = (q: number, seed: number) => Math.exp((1 - w) * Math.log(seed) + w * Math.log(q));
    let soft = mix(quantile(s, ADAPT_LO), this.seed.soft);
    let hard = mix(quantile(s, ADAPT_HI), this.seed.hard);
    if (!(hard >= soft * ADAPT_MIN_RATIO)) {
      const g = Math.sqrt(soft * Math.max(hard, soft));
      const r = Math.sqrt(ADAPT_MIN_RATIO);
      soft = g / r;
      hard = g * r;
    }
    return { soft, hard, from: "adaptive", n };
  }
}

const CAL_KEY = "wtc.lab.dynCal";
const okCal = (c: unknown): c is DynCal => !!c && typeof c === "object" && (c as DynCal).soft > 0 && (c as DynCal).hard > (c as DynCal).soft && Number.isFinite((c as DynCal).hard);
/**
 * D336: the calibration kept on this device (localStorage; guarded): LEARN's, or the adaptive references
 * as they stood at the end of the last run; before any, D335's zone calibration's "both zones"; else the default.
 */
export function loadDynCal(): DynCal {
  try {
    const v = localStorage.getItem(CAL_KEY);
    if (v) {
      const o = JSON.parse(v) as DynCal;
      if (okCal(o)) return { soft: o.soft, hard: o.hard, from: o.from === "learn" || o.from === "adaptive" ? o.from : "learn", ...(o.n ? { n: o.n } : {}), ...(o.at ? { at: o.at } : {}) };
    }
  } catch {
    /* blocked: the default */
  }
  const zc = loadZoneCal();
  if (zc?.all) return { soft: zc.all.soft, hard: zc.all.hard, from: "learn" };
  return DEFAULT_CAL;
}
export function saveDynCal(c: DynCal | null): boolean {
  try {
    if (c && okCal(c)) localStorage.setItem(CAL_KEY, JSON.stringify({ ...c, at: c.at ?? new Date().toISOString() }));
    else localStorage.removeItem(CAL_KEY);
    return true;
  } catch {
    return false;
  }
}
/** "soft 0.21 · hard 0.64 (adaptive, 40 strikes)": the references for a line. */
export function refsText(c: DynCal): string {
  const why = c.from === "adaptive" ? `adaptive, ${c.n ?? 0} strikes` : c.from === "learn" ? "learned" : "default: play to learn";
  return `soft ${c.soft.toFixed(2)} · hard ${c.hard.toFixed(2)} (${why})`;
}

const sdb = (db: number) => `${db >= 0 ? "+" : "−"}${Math.abs(db).toFixed(1)} dB`;
export { sdb as signedDb };
/** The note's line: "♩ C5 · pedal −3.0 dB · strike +2.5 dB (firm, peak 1.10, 31 ms) · total −0.5 dB". */
export function dynLine(name: string, mode: DynMode, l: DynLevel, s: { strength: number | null; peak: number | null; ms: number; cal?: string; none?: string }): string {
  const base = mode === "place" ? `place ${sdb(l.base)}` : mode === "pedal" ? `pedal ${sdb(l.base)}` : "fixed level";
  const strike = s.none
    ? `strike — (${s.none}: neutral)`
    : s.peak === null ? "strike — (no motion samples: neutral)" : s.strength === null ? `strike — (peak ${s.peak.toFixed(2)}, no calibration yet: neutral)` : `strike ${sdb(l.strike)} (${strikeWord(s.strength)}, peak ${s.peak.toFixed(2)}, ${Math.round(s.ms)} ms)`;
  return `♩ ${name} · ${base} · ${strike} · total ${sdb(l.total)}${l.clipped ? ` (held within ±${DYN_MAX_DB})` : ""}`;
}
