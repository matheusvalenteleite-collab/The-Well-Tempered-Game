/**
 * D250: a prelude's arc (the owner: "the gameplay itself ought to have a bit more variation in the
 * preludes ... increasing complexity and at least one special challenge by the end or by the
 * climax"; a prototype on Prelude 1 of Book I). Read by hand from the score and Ledbetter
 * (docs/touch/LEDBETTER-PRELUDES.md), section by section at the harmonic map's cadences:
 *   RIDES: how much of the figure passes to the player: a factor on the prelude's riding threshold
 *     (tiers.ts preludeRideMs; above 1 fewer notes struck, never more than its tier allows at 1);
 *   TEMPO: a subtle rise, as a factor on the tempo (straight lines between the bars given), the
 *     last cadence's ritard after it (phrasing.ts);
 *   THE PEDAL: the challenge: the bass's long note held by the player (its own lane: the leftmost on
 *     a phone, A on a computer) while the figure goes on in the other lanes; while it is held the
 *     bass sounds, let go it falls silent; scored at its end by the share held;
 *   THE FINAL CHORD: struck with both thumbs (or two keys) together, a bonus.
 * No percussion (the owner: none unless the piece calls for it). Pure: the piece in, numbers out.
 */
import { barStart, type TouchFugue } from "../touch/fugue.ts";

export interface Arc {
  /** [bar, factor on the riding threshold] from that bar on. */
  rides: [bar: number, factor: number][];
  /** [bar, factor on the tempo]: straight lines between, the last held. */
  tempo: [bar: number, speed: number][];
  /** The bass's pedal the player holds: from bar, to bar (exclusive), its pitch and name. */
  pedal?: { from: number; to: number; midi: number; name: string };
  /** The last chord struck with two thumbs (keys) together. */
  finalChord?: true;
}

/**
 * Prelude 1: learn the figure (bb. 1–4, only its strong notes), take more of it (bb. 5–11, three a
 * half bar), all of it (bb. 12–23, through the diminished sevenths), then the dominant pedal (bb. 24–31,
 * G: one thumb holds it, the other plays three notes a half bar), the release on the tonic pedal
 * (bb. 32–35) and the final chord with both thumbs. The tempo rises 2% by b. 5, 4% by b. 12, 6% by
 * b. 20, and holds through the pedal.
 */
const ARCS: Record<string, Arc> = {
  wtc1p01: {
    rides: [
      [1, 2.4],
      [5, 1.4],
      [12, 1],
      [24, 1.4],
      [32, 2.4],
    ],
    tempo: [
      [1, 1],
      [5, 1.02],
      [12, 1.04],
      [20, 1.06],
    ],
    pedal: { from: 24, to: 32, midi: 43, name: "G" },
    finalChord: true,
  },
};

export const arcOf = (f: TouchFugue): Arc | undefined => ARCS[f.id];

const tickOfBar = (f: TouchFugue, bar: number) => barStart(f, Math.floor(bar)) + (bar % 1) * f.barTicks;

/** The value in force at a tick: the last given at or before it (the first before them all). */
export function stepAt(f: TouchFugue, pts: readonly [number, number][], tick: number): number {
  let v = pts[0]?.[1] ?? 1;
  for (const [bar, x] of pts) if (tickOfBar(f, bar) <= tick) v = x;
  return v;
}

/** The value at a tick along straight lines between the bars given (held before the first, after the last). */
export function lineAt(f: TouchFugue, pts: readonly [number, number][], tick: number): number {
  if (!pts.length) return 1;
  let prev = pts[0];
  if (tick <= tickOfBar(f, prev[0])) return prev[1];
  for (const p of pts.slice(1)) {
    const a = tickOfBar(f, prev[0]);
    const b = tickOfBar(f, p[0]);
    if (tick < b) return prev[1] + ((p[1] - prev[1]) * (tick - a)) / Math.max(1, b - a);
    prev = p;
  }
  return prev[1];
}

/** The pedal's span in ticks, or null. */
export function pedalSpan(f: TouchFugue, arc: Arc | undefined): { on: number; end: number; midi: number; name: string } | null {
  if (!arc?.pedal) return null;
  return { on: barStart(f, arc.pedal.from), end: barStart(f, arc.pedal.to), midi: arc.pedal.midi, name: arc.pedal.name };
}
