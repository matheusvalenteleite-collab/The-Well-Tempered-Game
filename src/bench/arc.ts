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

/** A pedal the player holds: from bar, to bar (exclusive), its pitch, its name, its lane (0 the leftmost). */
export interface ArcPedal {
  from: number;
  to: number;
  midi: number;
  name: string;
  lane?: number;
}

export interface Arc {
  /** [bar, factor on the riding threshold] from that bar on (the right hand's, or the only hand's). */
  rides: [bar: number, factor: number][];
  /**
   * [bar, factor on the tempo]: straight lines between, the last held. D260: none in any arc (the owner:
   * "Eliminate the increasing tempo. This doesn't [work] for Bach at all ... Stable tempo").
   */
  tempo?: [bar: number, speed: number][];
  /** The bass's pedal the player holds (D250); D252: or several, one after the other. */
  pedal?: ArcPedal;
  pedals?: ArcPedal[];
  /** The last chord struck with two thumbs (keys) together. */
  finalChord?: true;
  /**
   * D252, BOTH HANDS (on a phone, two thumbs): the left hand the left thumb's, in the two leftmost lanes,
   * the right hand the right thumb's, in the other three; [bar, factor on the left hand's riding
   * threshold, or null: the left hand plays itself] from that bar on. Under a pedal the left hand's
   * notes play themselves (the pedal is the left thumb's).
   */
  hands?: [bar: number, factor: number | null][];
  /** D252: a figure repeated within its bar comes the second time on the lower row of pads. */
  rows?: true;
  /**
   * D252, LIFT: the music growing towards its climax: [bar, 0 to 1] (straight lines between): the upper
   * voices doubled an octave above (a 4′ coupled in) from a quarter, the bass an octave below (16′) from
   * two thirds.
   */
  lift?: [bar: number, level: number][];
  /**
   * D258, SWEEP: the right hand's chords spread upward (Ledbetter: spread "rhythmically and
   * expressively"): where the line begins a note of a beat or more with the inner voice under it, the
   * chord is one gem; a tap spreads it, the thumb sliding across the lanes spreads it (upward) at its
   * own pace (a bonus).
   */
  sweeps?: true;
  /** D258: the player's line handed to another voice for these bars (from, to exclusive), announced a bar ahead. */
  takeover?: { from: number; to: number; voice: number; cue: string };
}

/**
 * Prelude 1: learn the figure (bb. 1–4, the right hand's strong notes alone), take more of it (bb. 5–23,
 * three a half bar, and the left thumb takes the bass: D252; D259: never all of it), then the dominant pedal (bb. 24–31, G: the left thumb holds it, a big pedal
 * sounding under the figure), the tonic pedal (bb. 32–34, C: D255, the same lane, the thumb held on) and the final
 * chord with both thumbs. The repeated half of every bar on the lower row (the figure stated twice).
 * The tempo rises 2% by b. 5, 4% by b. 12, 6% by b. 20, and holds through the pedal; the doublings grow
 * from b. 12 to the pedals (D252: the owner missed "the music getting more intense as it progressed to
 * climax").
 */
const ARCS: Record<string, Arc> = {
  wtc1p01: {
    // D259: never the whole figure (bb. 12–23 asked for all twelve notes a bar, one every 260 ms for
    // fifty seconds: the owner: "Prelude 1 is unbeatable ... The six notes arpeggios with one finger are
    // horrible to do"); every other note from b. 5 to the pedals, the growth in the sound and the light.
    rides: [
      [1, 2.4],
      [5, 1.4],
      [32, 2.4],
    ],
    pedals: [
      // D255: both in the leftmost lane: a lane between the thumbs (the second lane, beside the right
      // hand's first, crowded the right thumb: the owner's errors there); G carries into C unmoved (D253).
      { from: 24, to: 32, midi: 43, name: "G", lane: 0 },
      { from: 32, to: 35, midi: 36, name: "C", lane: 0 },
    ],
    finalChord: true,
    hands: [
      [1, null],
      [5, 3],
    ],
    rows: true,
    lift: [
      [1, 0],
      [12, 0],
      [16, 0.3],
      [20, 0.5],
      [24, 0.8],
      [32, 1],
      [34, 0.7],
    ],
  },
};

/**
 * Prelude 4 (D258), a siciliano (Ledbetter: cantabile, sonata shape): the sung line, its long notes
 * held; THE SWEEP (one new mechanic, from b. 1): the chords under the line spread upward by the thumb;
 * more of the line as it goes (the dominant b. 14; the build-up from b. 19 to the top at b. 25); THE
 * CLIMAX (bb. 29–31): the bass takes the siciliano down to its lowest note, and the player goes with
 * it, then gives it back; the tempo leaning a little into the build-up and easing at the close; the
 * doublings from b. 19 to the climax; the last chord with both thumbs.
 */
ARCS.wtc1p04 = {
  // D259: at most every other quaver until the build-up (a long run of quavers a third of a second
  // apart was too much for a first piece), all of the line only from b. 19 to the top at b. 25.
  rides: [
    [1, 1.6],
    [19, 1.15],
    [26, 1.6],
  ],
  finalChord: true,
  sweeps: true,
  takeover: { from: 29, to: 32, voice: 3, cue: "THE BASS TAKES THE TUNE: GO DOWN WITH IT" },
  lift: [
    [1, 0],
    [18, 0],
    [21, 0.25],
    [25, 0.6],
    [29, 0.8],
    [31, 1],
    [33, 0.35],
    [39, 0.3],
  ],
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

/** The pedal's span in ticks, or null (the first, where there are several). */
export function pedalSpan(f: TouchFugue, arc: Arc | undefined): { on: number; end: number; midi: number; name: string } | null {
  return pedalSpans(f, arc)[0] ?? null;
}

/** D252: every pedal's span in ticks, in order, with its lane. */
export function pedalSpans(f: TouchFugue, arc: Arc | undefined): { on: number; end: number; midi: number; name: string; lane: number }[] {
  const list = arc?.pedals ?? (arc?.pedal ? [arc.pedal] : []);
  return list.map((p) => ({ on: barStart(f, p.from), end: barStart(f, p.to), midi: p.midi, name: p.name, lane: p.lane ?? 0 }));
}

/** D252: the left hand's riding factor at a tick, or null (it plays itself), where the arc has both hands. */
export function handsAt(f: TouchFugue, arc: Arc | undefined, tick: number): number | null {
  if (!arc?.hands) return null;
  let v: number | null = null;
  for (const [bar, x] of arc.hands) if (tickOfBar(f, bar) <= tick) v = x;
  return v;
}

/** D252: the lift at a tick (0 where the arc has none). */
export const liftAt = (f: TouchFugue, arc: Arc | undefined, tick: number): number => (arc?.lift ? lineAt(f, arc.lift, tick) : 0);
