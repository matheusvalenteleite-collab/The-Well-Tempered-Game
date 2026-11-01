/**
 * D425, THE HARD TAP: an accent is a note struck harder, felt by the phone's motion sensor (motion.ts).
 * The owner: "I don't like the current accent mechanics we have. It's very hard to get it consistently
 * right, because it requires perfect tempo"; on the team's proposal, "build ... the hard tap accent".
 *
 * D335's evidence (the owner's SENSOR logs, iPhone, two sessions): the motion peak separates soft taps from
 * hard (AUC 0.98 and 1.00); soft medians 0.23-0.27 m/s² (range 0.07-0.70), hard 0.95-1.18 (0.33-2.7),
 * available 3-36 ms after touchdown; the contact's size gives nothing.
 *
 *   STRENGTH: the peak on a LOG scale by the player's calibration (the soft median at 0.25, the hard's at
 *     0.75, clamped 0..1: the Lab's logStrength), DEFAULT_HARD_CAL (D335's medians) until the player
 *     calibrates (Settings › TAP STRENGTH; kept in localStorage, HARD_CAL_KEY).
 *   HARD: over the midpoint (0.5, the references' geometric mean: 0.51 m/s² by default) with a margin
 *     either side (HARD_MARGIN): an asked accent is credited from 0.5 − margin (0.44 m/s² by default, the
 *     hard taps' least, 0.33, is near it: a firm tap the owner meant hard is not refused), the piano's
 *     weight on an unmarked note from 0.5 + margin (0.59 m/s²: a soft tap's long tail, to 0.70, rarely
 *     louder than the player meant). Loudness and force are never tied to right or wrong.
 *   THE PIANO'S WEIGHT (hardDb): a hard strike on any note is the player's touch, as a pianist's: the
 *     reading's own accent where marked (whole-reading.ts PLAYER_ACCENT_DB: ">" +4, "^" +6 dB), +3 dB on an
 *     unmarked note; bowed strings and voices a small firmer onset (+1.5 dB); the harpsichord and the
 *     organ nothing (they have no touch: the accent is credited only).
 */
import { median } from "./motion.ts";

export interface HardCal {
  /** The soft taps' median peak (m/s²). */
  soft: number;
  /** The hard taps' median peak (m/s²). */
  hard: number;
  /** "default" (D335's medians) or "player" (calibrated on this device). */
  from: "default" | "player";
  at?: string;
}
/** D335's medians: soft 0.23-0.27, hard 0.95-1.18 m/s². */
export const DEFAULT_HARD_CAL: HardCal = { soft: 0.25, hard: 1.05, from: "default" };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * A peak as strength on a LOG scale (D335: the owner's peaks run 0.07-2.7 m/s², soft and hard about a
 * factor of four apart): the calibration's soft median at 0.25, the hard's at 0.75, clamped 0..1.
 */
export function logStrength(peak: number, cal: Pick<HardCal, "soft" | "hard">): number {
  if (!(peak > 0) || !(cal.soft > 0) || !(cal.hard > cal.soft)) return peak > 0 ? 0.5 : 0;
  return clamp01(0.25 + (0.5 * Math.log(peak / cal.soft)) / Math.log(cal.hard / cal.soft));
}
/** The peak at a strength (logStrength's inverse, unclamped): the thresholds in m/s² for a calibration. */
export function peakAt(strength: number, cal: Pick<HardCal, "soft" | "hard">): number {
  return cal.soft * Math.exp(((strength - 0.25) / 0.5) * Math.log(cal.hard / cal.soft));
}

/** The midpoint between soft and hard (strength). */
export const HARD_AT = 0.5;
/** The margin either side of it (strength; 0.05 is a factor of about 1.15 in the peak by default). */
export const HARD_MARGIN = 0.05;
/** An asked accent is credited from here (strength). */
export const HARD_ACCENT_FROM = HARD_AT - HARD_MARGIN;
/** The piano's weight on an unmarked note from here (strength). */
export const HARD_WEIGHT_FROM = HARD_AT + HARD_MARGIN;
/** A strike hard enough for an asked accent (null: not read). */
export const hardForAccent = (s: number | null): boolean => s !== null && s >= HARD_ACCENT_FROM;
/** A strike hard enough to weigh a note on the piano: an asked accent's own threshold where the note is marked, else the stricter. */
export const hardForWeight = (s: number | null, marked: boolean): boolean => s !== null && s >= (marked ? HARD_ACCENT_FROM : HARD_WEIGHT_FROM);

/** The piano's weight of a hard strike on an unmarked note (dB). */
export const HARD_UNMARKED_DB = 3;
/** Bowed strings and voices: a hard strike's firmer onset (dB, small). */
export const HARD_FIRM_DB = 1.5;
/** D335: the correction's ramp (ms) once the peak is read: no step, no click. */
export const HARD_RAMP_MS = 12;
/** The peak's window after the touchdown (ms) and how long a read may wait at most. */
export const HARD_WINDOW_MS = 35;
export const HARD_WAIT_MS = 80;

export type HardFamily = "piano" | "bowed" | "sung" | "plucked" | "organ" | "synth";
/**
 * The level a hard strike adds (dB) by the sound's family: the piano the reading's accent where marked
 * (`markDb`: PLAYER_ACCENT_DB's) or +3; bowed strings and voices +1.5; the harpsichord, lute, organ and
 * the synths nothing. 0 for a strike not hard (by hardForWeight).
 */
export function hardDb(family: HardFamily, strength: number | null, markDb?: number): number {
  if (!hardForWeight(strength, markDb !== undefined)) return 0;
  if (family === "piano") return markDb ?? HARD_UNMARKED_DB;
  if (family === "bowed" || family === "sung") return HARD_FIRM_DB;
  return 0;
}

/** A calibration from the taps' peaks (at least three of each; the hard median above the soft by a quarter at least), else null. */
export function hardCalibration(soft: readonly number[], hard: readonly number[]): HardCal | null {
  const s = soft.filter((x) => x > 0);
  const h = hard.filter((x) => x > 0);
  if (s.length < 3 || h.length < 3) return null;
  const ms = median(s);
  const mh = median(h);
  return mh > ms * 1.25 ? { soft: ms, hard: mh, from: "player" } : null;
}

/** D425: the calibration kept on this device. */
export const HARD_CAL_KEY = "wtc.hardTap.cal";
/** D425: the calibration was offered at a run's start (once). */
export const HARD_OFFER_KEY = "wtc.hardTap.offered";
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
function store(): Store | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}
const okCal = (c: unknown): c is HardCal => !!c && typeof c === "object" && (c as HardCal).soft > 0 && (c as HardCal).hard > (c as HardCal).soft && Number.isFinite((c as HardCal).hard);
export function loadHardCal(st: Store | null = store()): HardCal {
  try {
    const v = st?.getItem(HARD_CAL_KEY);
    const c = v ? (JSON.parse(v) as unknown) : null;
    if (okCal(c)) return { soft: c.soft, hard: c.hard, from: "player", ...(c.at ? { at: c.at } : {}) };
  } catch {
    /* the default */
  }
  return DEFAULT_HARD_CAL;
}
/** Kept (null: forgotten, back to the default); false where storage is blocked. */
export function saveHardCal(c: HardCal | null, st: Store | null = store()): boolean {
  try {
    if (!st) return false;
    if (c && okCal(c)) st.setItem(HARD_CAL_KEY, JSON.stringify({ soft: c.soft, hard: c.hard, at: c.at ?? new Date().toISOString() }));
    else st.removeItem(HARD_CAL_KEY);
    return true;
  } catch {
    return false;
  }
}
export function calOffered(st: Store | null = store()): boolean {
  try {
    return st?.getItem(HARD_OFFER_KEY) === "1";
  } catch {
    return true;
  }
}
export function markCalOffered(st: Store | null = store()) {
  try {
    st?.setItem(HARD_OFFER_KEY, "1");
  } catch {
    /* this visit only */
  }
}

/** A strike's strength once read (undefined: still being read; null: none to read). */
export class StrikeSlot {
  value: number | null | undefined;
  private fns: ((v: number | null) => void)[] = [];
  constructor(v?: number | null) {
    this.value = v;
  }
  set(v: number | null) {
    if (this.value !== undefined) return;
    this.value = v;
    const fns = this.fns;
    this.fns = [];
    for (const f of fns) f(v);
  }
  /** fn with the strength (at once if read). */
  on(fn: (v: number | null) => void) {
    if (this.value !== undefined) fn(this.value);
    else this.fns.push(fn);
  }
}

/** What the game reads a touchdown's strength from (ProtoGame.strikes): `done` with 0..1, or null (no samples). */
export interface StrikeSource {
  read(ts: number, done: (strength: number | null) => void): void;
}
/** D425: the game's strike source over a motion reader, by the calibration kept (read again each strike: a new calibration counts at once). */
export function motionStrikes(r: { peakAfter(t0: number, to: number, waitMs: number, done: (pk: { peak: number | null }) => void): void; live: boolean }, cal: () => HardCal = () => loadHardCal()): StrikeSource {
  return {
    read: (ts, done) => {
      if (!r.live) return done(null);
      const now = typeof performance !== "undefined" ? performance.now() : ts;
      const t = Number.isFinite(ts) && ts <= now + 50 && ts > now - 10000 ? ts : now;
      r.peakAfter(t, HARD_WINDOW_MS, HARD_WAIT_MS, (pk) => done(pk.peak === null ? null : logStrength(pk.peak, cal())));
    },
  };
}
