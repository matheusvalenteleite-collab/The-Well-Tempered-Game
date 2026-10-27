/**
 * D314, FREE ORNAMENTS (the owner: "Possibility of doing trills and mordents freely would be fun"): on
 * LADDER a held note, struck right and without an ornament of its own, takes a mordent or a trill when
 * the thumb shakes on it, the same gesture as a written ornament (D278). It sounds (realised at the
 * tempo, ornament-play.ts freeOrnamentParts), never changes the note's judging, and earns nothing.
 *
 * The gesture must not be mistaken for D311's expression (sideways while holding shapes the sustain)
 * nor for a thumb's slow drift or a slide: a SHAKE is along the bar (each leg mostly up or down: its
 * travel along the bar at least SHAKE_STEEP times its travel across), fast (a leg's travel past the
 * reach, each turn following the last within SHAKE_WINDOW_MS) and back and forth:
 *   - two legs, the first down (down and back): a MORDENT;
 *   - two legs, the first up (up and back): a short trill (Bach's Explication: from the note above);
 *   - a third leg (two reversals) within the window: a TRILL, from the note above, to the note's end.
 * A slow drift, a single move, a sideways wobble, or a back-and-forth slower than the window: nothing.
 */

/** The longest time from the start of one leg to the end of the next for a shake (ms). */
export const SHAKE_WINDOW_MS = 300;
/** A leg is along the bar: its vertical travel at least this many times its horizontal. */
export const SHAKE_STEEP = 1.5;

export type FreeKind = "mordent" | "short" | "trill";

interface Leg {
  /** When it began (the turning point it left) and when it passed the reach (ms). */
  from: number;
  t: number;
  dir: 1 | -1;
}
interface Point {
  y: number;
  x: number;
  t: number;
}

/** The shake under way on one held note. */
export interface ShakeTracker {
  /** The turning point the current leg left from (y, x, time), and the leg's direction (1 up, -1 down, 0 none yet). */
  ey: number;
  ex: number;
  et: number;
  dir: 0 | 1 | -1;
  /** Before the first leg: the highest and the lowest points of the last moments (a shake may begin either way, from anywhere). */
  top: Point;
  bottom: Point;
  legs: Leg[];
  /** What it has become: nothing yet, the short ornament, then (a third leg) the trill. */
  kind: FreeKind | null;
}

export function shakeTracker(y: number, x: number, t: number): ShakeTracker {
  return { ey: y, ex: x, et: t, dir: 0, top: { y, x, t }, bottom: { y, x, t }, legs: [], kind: null };
}

/**
 * The thumb at (x, y) at time t (ms): returns the ornament the shake has just become (null when nothing
 * new). `reach` is the travel a leg needs (px; screen y grows downward, so up is a smaller y).
 */
export function feedShake(s: ShakeTracker, x: number, y: number, t: number, reach: number): FreeKind | null {
  if (s.kind === "trill") return null;
  if (s.dir === 0) {
    // Before the first leg: the extremes of the last moments (older than the window, forgotten: a slow wander is no start).
    if (t - s.top.t > SHAKE_WINDOW_MS || y <= s.top.y) s.top = { y, x, t };
    if (t - s.bottom.t > SHAKE_WINDOW_MS || y >= s.bottom.y) s.bottom = { y, x, t };
    const from = y - s.top.y >= reach ? s.top : s.bottom.y - y >= reach ? s.bottom : null;
    if (!from) return null;
    s.ey = from.y;
    s.ex = from.x;
    s.et = from.t;
  }
  const dy = s.ey - y; // up positive
  const d: 1 | -1 = dy > 0 ? 1 : -1;
  // Further the same way: the turning point moves with it (the leg is still going).
  if (s.dir !== 0 && d === s.dir) {
    s.ey = y;
    s.ex = x;
    s.et = t;
    return null;
  }
  // Back the other way, but not yet past the reach: wait (the turning point stays where it was).
  if (Math.abs(dy) < reach) return null;
  // A leg: along the bar, not across it (D311's sideways expression is not a shake).
  const steep = Math.abs(dy) >= SHAKE_STEEP * Math.abs(x - s.ex);
  const leg: Leg = { from: s.et, t, dir: d };
  s.ey = y;
  s.ex = x;
  s.et = t;
  s.dir = d;
  if (!steep) {
    s.legs = [];
    return null;
  }
  s.legs.push(leg);
  // Only legs that follow each other closely count: a leg slower than the window starts again.
  if (leg.t - leg.from > SHAKE_WINDOW_MS) s.legs = [];
  const n = s.legs.length;
  if (n >= 2 && leg.t - s.legs[n - 2].from > SHAKE_WINDOW_MS) s.legs = [leg];
  if (s.legs.length === 2 && !s.kind) return (s.kind = s.legs[0].dir < 0 ? "mordent" : "short");
  if (s.legs.length >= 3 && s.kind) return (s.kind = "trill");
  return null;
}
