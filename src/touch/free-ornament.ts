/**
 * D314, FREE ORNAMENTS (the owner: "Possibility of doing trills and mordents freely would be fun"), read
 * since D353 by THE CONTOUR READER (the owner's design, 28 October 2026: "a mordent is a quick
 * tap-down-up, a trill an even quicker tap-down-up-down-up; the movement may be very small; its speed is
 * relative to the tempo"). On LADDER a held note, struck right, takes an ornament when the thumb mirrors
 * its contour along the bar; a written sign (D278) is read by the same reader, the sign deciding what
 * sounds. It sounds (ornament-play.ts freeOrnamentParts), never changes the note's judging, and earns
 * nothing (D338).
 *
 * A LEG is a run of motion one way along the bar between two turning points (hysteresis: the reach). It
 * ends at a reversal by the reach, or when the thumb stops (no 0.75 px of progress for STALL_MS: a
 * mordent's return ends at rest). It counts when it travelled at least the reach, is STEEP over its whole
 * length (along at least MECH.shakeSteep times across, the across floored at 1.5 px for the jitter: D311's
 * sideways shaping is not a shake) and is QUICK. The thresholds scale with the beat b (s) at the tempo
 * played (ShakeThresholds, MECH's ORNAMENTS group):
 *   reach  r  = max(MECH.shakeReachMinPx, MECH.shakeReachRows rows)        (3 px, 0.15 row: tiny allowed,
 *                                                                           because every leg must be fast)
 *   Lm(b) = clamp(0.30 b, 90, 220) ms   each leg of a two-leg form (and of any form) at most this
 *   Lt(b) = clamp(0.20 b, 70, 160) ms   a trill's legs on average at most this ("even quicker")
 *   S(b)  = clamp(0.60 b, 180, 500) ms  the first leg begun this soon after the landing (on the beat);
 *                                       later, the two-leg form is LATE (the turn after the note).
 * A leg slower than Lm is dropped (a slow sink before the quick alternation is not counted). Then:
 *   - two legs, down first: "down" (the mordent, N L N); up first: "up" (N U N: the Pralltriller or the
 *     Schneller by context); a first leg under a third of the second: "blur" (named by context); begun
 *     late: "late";
 *   - a third leg of at least half the first two's size, the legs' mean within Lt: "trill" (either way
 *     first: the realisation starts on the upper note, whatever the thumb did first).
 * A slow drift, a single move, a sideways wobble, a still thumb's jitter (under 2.3 px at the 90th
 * percentile in the owner's logs), a settling roll: nothing. The S-turn (U N L N through the landing) is
 * Phase 1's, for the Lab; not read here.
 */
import { MECH, type Mech } from "../bench/mechanics.ts";

/** A leg ends when the thumb has made no progress for this long (ms). */
export const STALL_MS = 50;
/** Progress (px) that keeps a leg going. */
const PROGRESS_PX = 0.75;
/** The across travel's floor in the steepness test (px: the jitter). */
const ACROSS_FLOOR_PX = 1.5;

/** What the reader reads: the gesture's form (the game names the ornament from it and the music). */
export type Gesture = "down" | "up" | "blur" | "late" | "trill";
/**
 * The ornaments a free shake can become (named by the game: proto-game.ts freeKind), counted on the
 * score sheet (D327): the mordent; the up-down form as C. P. E. Bach's Pralltriller, the Schneller or
 * Bach's short Trillo ("short"); the trill; the turn (a trill with no room, I.2.4 §9; or late in a long
 * note, the turn after the note, I.2.4 §21).
 */
export type FreeKind = "mordent" | "short" | "pralltriller" | "schneller" | "trill" | "turn";

export interface ShakeThresholds {
  /** The least leg (px). */
  reach: number;
  /** A two-leg form's legs at most this long each (ms). */
  Lm: number;
  /** A trill's legs at most this long on average (ms). */
  Lt: number;
  /** The first leg begun within this of the landing (ms), or the two-leg form is late. */
  S: number;
  /** Along at least this many times across. */
  steep: number;
  /** D353: steepness over the whole leg (off: where the reach is first passed, D314's). */
  wholeLeg: boolean;
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
/** The reader's thresholds at a beat of `beatS` seconds and rows `rowPx` high (MECH's ORNAMENTS group). */
export function shakeThresholds(beatS: number, rowPx: number, m: Mech = MECH): ShakeThresholds {
  const ms = beatS * 1000;
  return {
    reach: Math.max(m.shakeReachMinPx, m.shakeReachRows * rowPx),
    Lm: clamp(m.ornLegBeats * ms, m.ornLegMinMs, Math.max(m.ornLegMinMs, m.ornLegMaxMs)),
    Lt: clamp(m.trillLegBeats * ms, m.trillLegMinMs, Math.max(m.trillLegMinMs, m.trillLegMaxMs)),
    S: clamp(m.ornStartBeats * ms, m.ornStartMinMs, Math.max(m.ornStartMinMs, m.ornStartMaxMs)),
    steep: m.shakeSteep,
    wholeLeg: m.shakeWholeLeg,
  };
}

interface P {
  x: number;
  y: number;
  t: number;
}
interface Leg {
  a: P;
  b: P;
  /** 1 up (y decreasing), -1 down. */
  dir: 1 | -1;
}

/**
 * The shake under way on one held thumb. feed() each move, tick() each frame (a leg that stopped ends
 * at rest: touches stop arriving when a thumb is still, so the end is read on the game's clock).
 */
export class ShakeReader {
  /** What it has read (the latest: a two-leg form, then perhaps a trill). */
  kind: Gesture | null = null;
  /** D319: the steep, quick legs so far (a trill goes on while they keep coming). */
  count = 0;
  /** When the last counted leg ended (ms). */
  lastLeg = -Infinity;
  /** Counted legs the thumb turned back from (a written sign's ornament begins at the first). */
  turns = 0;
  /** The latest counted leg's travel along the bar (px). */
  lastAmp = 0;
  /** The two-leg form read (its direction, even when late), and when its first leg began (ms). */
  form: "down" | "up" | "blur" | null = null;
  formAt = 0;
  /** The landing (the note's strike). */
  readonly start: P;
  /** The latest point (for the reference's reset, D353). */
  last: P;
  /** Whether a leg is under way now faster than reach / Lm (no slide meanwhile, D353). */
  fast = false;
  private th: ShakeThresholds;
  /** The leg under way: its direction (0 before the first), its start, its extreme so far. */
  private dir: 0 | 1 | -1 = 0;
  private legStart: P;
  private ext: P;
  /** Before the first leg: the last point within the reach of the landing. */
  private still: P;
  /** D314's steepness: where the leg first passed the reach. */
  private passAt: P | null = null;
  private legs: Leg[] = [];

  constructor(start: P, th: ShakeThresholds) {
    this.start = start;
    this.last = start;
    this.legStart = start;
    this.ext = start;
    this.still = start;
    this.th = th;
  }

  /** The thumb at (x, y) at time t (ms): the gesture just read, or null. */
  feed(x: number, y: number, t: number): Gesture | null {
    const p = { x, y, t };
    const prev = this.last;
    this.last = p;
    const th = this.th;
    if (this.dir === 0) {
      const dy = this.start.y - y;
      if (Math.abs(dy) < th.reach) {
        this.still = p;
        return null;
      }
      this.dir = dy > 0 ? 1 : -1;
      // The first leg from the landing's place, timed from the last moment the thumb was still there.
      this.legStart = { x: this.start.x, y: this.start.y, t: this.still.t };
      this.ext = p;
      this.passAt = p;
      this.fast = this.speedy(this.legStart, p);
      return null;
    }
    const goingOn = this.dir === 1 ? y <= this.ext.y - PROGRESS_PX : y >= this.ext.y + PROGRESS_PX;
    if (goingOn) {
      this.ext = p;
      if (!this.passAt && Math.abs(y - this.legStart.y) >= th.reach) this.passAt = p;
      this.fast = this.speedy(prev, p) || this.speedy(this.legStart, p);
      return null;
    }
    const back = Math.abs(y - this.ext.y);
    if (back < th.reach) {
      this.fast = false;
      return t - this.ext.t >= STALL_MS ? this.closeAtRest(t) : null;
    }
    // The leg from legStart to ext is complete (unless counted already where it stopped); the next begins at ext.
    const leg: Leg = { a: this.legStart, b: this.ext, dir: this.dir };
    const fresh = this.ext !== this.legStart;
    const ok = fresh && this.steepLeg(leg, this.passAt);
    this.legStart = this.ext;
    this.ext = p;
    this.dir = this.dir === 1 ? -1 : 1;
    this.passAt = Math.abs(p.y - this.legStart.y) >= th.reach ? p : null;
    this.fast = this.speedy(this.legStart, p);
    if (!fresh) return null;
    if (!ok) {
      this.legs = [];
      return null;
    }
    const was = this.count;
    const g = this.counted(leg);
    if (this.count > was) this.turns++;
    return g;
  }

  /** Each frame (and at the lift, `final`): a leg that has stopped ends at rest. */
  tick(t: number, final = false): Gesture | null {
    if (this.dir === 0) return null;
    if (t - this.last.t >= STALL_MS) this.fast = false;
    if (!final) return t - this.ext.t >= STALL_MS ? this.closeAtRest(t) : null;
    return this.closeAtRest(t);
  }

  /** Steep over the whole leg (along ≥ steep × across, across floored at the jitter), or D314's at the reach. */
  private steepLeg(l: Leg, passAt: P | null): boolean {
    const end = this.th.wholeLeg ? l.b : (passAt ?? l.b);
    const along = Math.abs(end.y - l.a.y);
    const across = Math.max(ACROSS_FLOOR_PX, Math.abs(end.x - l.a.x));
    return along >= this.th.reach && along >= this.th.steep * across;
  }
  private speedy(a: P, b: P): boolean {
    const dt = Math.max(1, b.t - a.t);
    return Math.abs(b.y - a.y) / dt > this.th.reach / this.th.Lm;
  }

  /** A leg that stopped at its extreme: counted there, as if the thumb had turned (going on, a new leg begins). */
  private closeAtRest(_t: number): Gesture | null {
    const a = this.legStart;
    const b = this.ext;
    if (a === b) return null;
    const leg: Leg = { a, b, dir: this.dir as 1 | -1 };
    if (!this.steepLeg(leg, this.passAt)) return null;
    this.legStart = b;
    this.passAt = null;
    return this.counted(leg);
  }

  /** A complete steep leg: kept if quick (a slow one is dropped), then the gesture judged. */
  private counted(leg: Leg): Gesture | null {
    const th = this.th;
    const dur = (l: Leg) => l.b.t - l.a.t;
    if (dur(leg) > th.Lm) {
      // A slow leg (a sink, a drift) is no part of the ornament: what came before it is forgotten.
      this.legs = [];
      return null;
    }
    this.legs.push(leg);
    this.lastAmp = Math.abs(leg.b.y - leg.a.y);
    this.count++;
    this.lastLeg = leg.b.t;
    const L = this.legs;
    if (L.length === 2 && !this.kind) {
      const amp = (l: Leg) => Math.abs(l.b.y - l.a.y);
      const late = L[0].a.t - this.start.t > th.S;
      this.form = amp(L[0]) < amp(L[1]) / 3 ? "blur" : L[0].dir < 0 ? "down" : "up";
      this.formAt = L[0].a.t;
      return (this.kind = late ? "late" : this.form);
    }
    if (L.length >= 3 && this.kind !== "trill") {
      const amp = (l: Leg) => Math.abs(l.b.y - l.a.y);
      const mean = L.reduce((s, l) => s + dur(l), 0) / L.length;
      // The legs keep their size (a follow-through or a settling wiggle after a mordent is smaller).
      const first2 = (amp(L[0]) + amp(L[1])) / 2;
      if (mean <= th.Lt && L.slice(2).every((l) => amp(l) >= 0.5 * first2)) return (this.kind = "trill");
    }
    return null;
  }
}
