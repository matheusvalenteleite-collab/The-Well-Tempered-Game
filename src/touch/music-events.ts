/**
 * Design studio (D476; the owner: "think about how to implement visually the things we've been doing musically (the
 * moments, events, climaxes, etc), so that things are both visually and aurally presented"): ONE STREAM of the run's
 * musical events, read by the sound and the picture alike, so a drum roll and what is seen of it land on one tick.
 *
 * Two layers:
 *  - SCORE EVENTS (`scoreEvents`): fixed by the data, one list per piece: the form (form-points.ts, D474: entries,
 *    episodes, the break before the final entry, the climax and its peak, the last chord, the cadences) and Busoni's
 *    dynamics as the reading's plan plays them (whole-reading.ts wholePlan: the voices' printed level by tick, its
 *    sudden changes, the fp and sf, the hairpins).
 *  - LIVE EVENTS (`emitMusic`): what the sound actually plays, reported by it as it schedules (Instruments: the drums'
 *    strokes, rolls and fills, the timpani, the registration's changes), with the level it plays them at, so a fill
 *    that varies or is left out is seen exactly as heard. A ring buffer; the picture reads `liveEvents`.
 *
 * Nothing here is judged: no event reads the player's notes, right or wrong.
 */
import type { TouchFugue } from "./fugue.ts";
import { formOf } from "./form-points.ts";
import { wholeReadingOf } from "./readings.ts";
import { RAMP_UP, SFZ, wholePlan } from "./whole-reading.ts";

export type ScoreKind = "entry" | "episode" | "break" | "climax" | "peak" | "resolve" | "cadence" | "subito-p" | "subito-f" | "fp" | "sf" | "cresc" | "dim" | "level";
export type LiveKind = "roll" | "fill" | "crash" | "kick" | "snare" | "accent" | "timp" | "registration";
export type MusicKind = ScoreKind | LiveKind;
export interface MusicEvent {
  /** The tick it lands on (a roll's or a ramp's start). */
  tick: number;
  kind: MusicKind;
  /** How strong, 0..1 (a printed level on 0 pp … 1 ff; a stroke's velocity as played). */
  level: number;
  /** Ticks it lasts (a roll, a hairpin, the climax's rise, an episode). */
  dur?: number;
  /** The voice (an entry's), where there is one. */
  voice?: number;
  /** What sounded (a kit piece, a stop's name). */
  piece?: string;
}

/** A printed level (dB, whole-reading.ts LEVEL_DB: pp about −12 … ff about +9) on 0..1. */
export const levelOf = (db: number) => Math.max(0, Math.min(1, (db + 14) / 26));
/** The jump (dB, the voices' mean, within a beat) that reads as sudden: a subito, a p after f. */
export const SUDDEN_DB = 4;

const memo = new Map<string, MusicEvent[]>();

/** The piece's score events, by tick (memoised). */
export function scoreEvents(f: TouchFugue): readonly MusicEvent[] {
  const hit = memo.get(f.id);
  if (hit) return hit;
  const out: MusicEvent[] = [];
  const F = formOf(f);
  const bar = f.barTicks;
  const plan = wholePlan(f, wholeReadingOf(f.id));
  const nv = f.voices.length;
  const mean = (t: number) => {
    if (!plan) return 0;
    let s = 0;
    for (let v = 0; v < nv; v++) s += plan.dynAt(v, t);
    return s / nv;
  };
  // The form.
  F.seams.forEach((s, i) => {
    const lv = levelOf(mean(s.on));
    if (s.kind === "episode") out.push({ tick: s.on, kind: "episode", level: lv, dur: s.end - s.on });
    else if (s.kind !== "coda") {
      const e = f.entries.find((x) => x.on >= s.on) ?? f.entries[0];
      out.push({ tick: s.on, kind: "entry", level: lv, voice: e?.voice });
      if (s.kind === "final" && F.seams[i - 1]?.kind === "episode") out.push({ tick: Math.max(0, s.on - bar), kind: "break", level: lv, dur: bar });
    }
  });
  out.push({ tick: F.climax.rise, kind: "climax", level: levelOf(mean(F.climax.peak)), dur: Math.max(0, F.climax.peak - F.climax.rise) });
  out.push({ tick: F.climax.peak, kind: "peak", level: levelOf(mean(F.climax.peak)) });
  out.push({ tick: F.last, kind: "resolve", level: levelOf(mean(F.last)), dur: F.end - F.last });
  for (const c of f.cadences) out.push({ tick: c.on, kind: "cadence", level: levelOf(mean(c.on)) });
  // Busoni's dynamics, as the plan plays them.
  const W = wholeReadingOf(f.id)?.whole;
  if (plan && W) {
    const beat = f.tpq;
    let prev = mean(0);
    for (let t = beat; t < f.length; t += beat) {
      const now = mean(t);
      if (now - prev >= SUDDEN_DB) out.push({ tick: t, kind: "subito-f", level: levelOf(now) });
      else if (prev - now >= SUDDEN_DB) out.push({ tick: t, kind: "subito-p", level: levelOf(now) });
      prev = now;
    }
    const seen = new Set<number>();
    for (const d of W.dyn) {
      if (seen.has(d.on)) continue;
      seen.add(d.on);
      const m = d.mark.toLowerCase();
      if (/\bfp\b/.test(m)) out.push({ tick: d.on, kind: "fp", level: levelOf(mean(d.on) + 3) });
      else if (SFZ.test(m)) out.push({ tick: d.on, kind: "sf", level: levelOf(mean(d.on) + 3) });
      else out.push({ tick: d.on, kind: "level", level: levelOf(mean(d.on + 1)) });
    }
    const pins = new Set<string>();
    for (const h of W.hairpins ?? []) {
      const k = `${h.from}:${h.to}:${h.dir}`;
      if (pins.has(k) || !(h.to > h.from)) continue;
      pins.add(k);
      out.push({ tick: h.from, kind: RAMP_UP.test(String(h.dir)) ? "cresc" : "dim", level: levelOf(mean(h.to)), dur: h.to - h.from });
    }
  }
  out.sort((a, b) => a.tick - b.tick);
  memo.set(f.id, out);
  return out;
}

/** The score events from `from` (inclusive) to `to` (exclusive), by tick. */
export function scoreBetween(f: TouchFugue, from: number, to: number): MusicEvent[] {
  const ev = scoreEvents(f);
  let lo = 0;
  let hi = ev.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (ev[m].tick < from) lo = m + 1;
    else hi = m;
  }
  const out: MusicEvent[] = [];
  for (let i = lo; i < ev.length && ev[i].tick < to; i++) out.push(ev[i]);
  return out;
}

// --- The live layer: what the sound plays, as it schedules it.
const RING = 256;
const ring: (MusicEvent | undefined)[] = new Array(RING);
let head = 0;
let listeners = 0;
/** The sound reports an event it has scheduled (cheap: one slot of a ring; nothing kept beyond the last 256). */
export function emitMusic(e: MusicEvent) {
  ring[head] = e;
  head = (head + 1) % RING;
}
/** The live events whose tick lies in [from, to), oldest first. */
export function liveEvents(from: number, to: number): MusicEvent[] {
  const out: MusicEvent[] = [];
  for (let i = 0; i < RING; i++) {
    const e = ring[(head + i) % RING];
    if (e && e.tick >= from && e.tick < to) out.push(e);
  }
  return out;
}
/** A new run: the live layer emptied (the ticks start again). */
export function resetLive() {
  ring.fill(undefined);
  head = 0;
  listeners++;
}
/** For the tests: how many runs began. */
export const runsBegun = () => listeners;

// --- The sound's real level (Instruments' Chip master meter, post-limiter, 0..1 smoothed): loud reads loud.
let levelSource: (() => number) | null = null;
/** The sound gives its meter (sound.ts outputLevel); null takes it away. */
export function setOutputLevel(fn: (() => number) | null) {
  levelSource = fn;
}
/** The output's level now (0..1), or null where no meter is given (the picture then goes by the events' own levels). */
export function outputLevelNow(): number | null {
  if (!levelSource) return null;
  const v = levelSource();
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : null;
}
