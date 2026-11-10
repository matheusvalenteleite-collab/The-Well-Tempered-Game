/**
 * D571-D573, THE PER-FUGUE TAILORING of the looped drummers (the written grids, drum-grids.ts, and JAZZ QUARTET's
 * brushes, jazz-drums.ts): keyed by fugue, then by the style it is written for, each with its reason read from the
 * fugue's score. (The score-driven styles' tailoring is score-drums.ts TWEAKS.) Pure numbers: drum-presets.ts kitBeat
 * reads `tailoredGrid` (the pattern) and `tailorHits` (the strokes, by the fugue's form); chip.ts Chip.brushes reads
 * `tailorBrushes`. A fugue or a style without an entry plays as written.
 *
 *   I/6 (BRUSHES, its JAZZ QUARTET default): "not enough synergy with the fugue and its subject": the brush's taps take
 *       the subject's own rhythm in each entry's head (its quavers and the semiquaver run), the pattern's taps giving way
 *       there; the ride out in the episodes, the hi-hat's foot on each entry's first note.
 *   I/7 (808, SWITCHED-ON's HOME): "bland … room for adding complex layers to make the rhythm more infectiously groovy":
 *       the 808's variations kept and layered: a shaker's swung sixteenths with an accent contour, the snare's ghosts, a
 *       rim on the tresillo (3-3-2) across the bar, the kick's push varied over four bars, a light swing on the off
 *       sixteenths.
 *   I/8 (SWING, the grand's HOME): "quitting the ride cymbal during episodes, so that it comes back only in the important
 *       parts": the ride only in the augmentation's entries (bars 62-73, the subject in long notes) and the final group
 *       and climax; elsewhere a stick on the closed hats in the entries and, in the episodes, the hi-hat's foot, the
 *       feathered kick and a cross-stick alone.
 *   I/20 (LIEBEZEIT): the loop's variations each six bars, a high tom's call on each entry's first note (rhythm only).
 *   II/22 (LIEBEZEIT, D595): the same, on its 3/2's minims at FAST.
 */
import { fugueById, type TouchFugue } from "./fugue.ts";
import { formOf, phaseAt } from "./form-points.ts";
import type { GridStyle } from "./drum-grids.ts";
import type { KitHit, KitContext } from "./drum-presets.ts";
import type { BrushBeat } from "./jazz-drums.ts";

export interface GridTailor {
  why: string;
  /** The style's pattern for this fugue (from the written one). */
  grid?: (st: GridStyle) => GridStyle;
  /** The beat's strokes for this fugue (after the form's machinery). */
  hits?: (hits: KitHit[], cx: KitContext, f: TouchFugue) => KitHit[];
}
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** I/8's important parts: the augmentation's entries (an entry half again as long as the first) and the final group and climax. */
function important(f: TouchFugue, tick: number): boolean {
  const ph = phaseAt(formOf(f), tick);
  if (ph.kind === "final" || ph.climax > 0) return true;
  const first = f.entries[0];
  const len0 = first ? first.end - first.on : Infinity;
  return f.entries.some((e) => e.end - e.on > 1.5 * len0 && tick >= e.on - f.barTicks / 4 && tick < e.end);
}

/** An entry's first note within this beat (the tick), or null. */
function entryIn(f: TouchFugue, tick: number, beat: number): number | null {
  for (const e of f.entries) if (e.on >= tick && e.on < tick + beat) return e.on;
  return null;
}

export const GRID_TAILORS: Readonly<Record<string, Readonly<Record<string, GridTailor>>>> = {
  wtc1f07: {
    machine: {
      why: "I/7 E flat, 4/4 at a crotchet of 0.76 s, its subject's running semiquavers light and steady: the 808 kept (its two-bar kick) and layered: a shaker in swung sixteenths (accent contour: the beat, the and, the e and a ghosted), the snare's ghosts on the e's and a's around the backbeat, a rim on the tresillo across the bar (3-3-2), the kick's push varied over four bars, the off sixteenths a little late.",
      grid: (st) => ({
        ...st,
        swing16: 0.14,
        duple: {
          ...st.duple,
          rows: {
            ...st.duple.rows,
            kick: "#... ...x ..x. ....|#... ...x ..x. .x..|#... ...x ..x. ....|#..x ...x .... ..x.",
            snare: "..-. X..- .-.. X.-.|.-.. X..- ..-. X..-|..-. X..- .-.. X.-.|.-.. X.-- .-.- X..-",
            shaker: "x-o- x-oo x-o- x-ox",
            rim: "o..o ..o. o..o ..o.|o..o ..o. o..o ..o.|o..o ..o. o..o ..o.|o..o ..o. .o.. o...",
          },
        },
      }),
    },
  },
  wtc1f08: {
    jazz: {
      why: "I/8 d sharp, 87 bars of a slow 4/4 (1.02 s): the ride kept for the important parts, the augmentation (the subject in long notes, bars 62-73) and the final group with the climax; in the other entries a stick on the closed hats in the ride's rhythm; in the episodes the ride gone, the hi-hat's foot, the feathered kick and the cross-stick alone; a crash only where the ride plays.",
      hits: (hits, cx, f) => {
        if (important(f, cx.tick)) return hits;
        const ep = phaseAt(formOf(f), cx.tick).phase === "episode";
        const out: KitHit[] = [];
        for (const h of hits) {
          if (h.piece === "crash") continue;
          if (h.piece === "ride") {
            if (ep) continue;
            out.push({ ...h, piece: "hat", vel: clamp(h.vel * 0.85, 0.02, 1) });
          } else out.push(h);
        }
        return out;
      },
    },
  },
  wtc1f20: {
    liebezeit: {
      why: "I/20 a, 87 bars of a long, constant 4/4 (0.86 s): the trance's six variations each held six bars (some fourteen changes in the fugue, none a fill), the high tom's call on each entry's first note answered by the loop's own toms.",
      grid: (st) => ({ ...st, hold: 6 }),
      hits: (hits, cx, f) => {
        const on = entryIn(f, cx.tick, cx.beat);
        if (on === null || cx.tick >= formOf(f).last - cx.beat) return hits;
        const at = (on - cx.tick) / cx.beat;
        const near = hits.some((h) => h.piece === "tomHigh" && Math.abs(h.at - at) * cx.beatS < 0.11);
        return near ? hits : [...hits, { piece: "tomHigh", at, vel: 0.36, role: "accent" }];
      },
    },
  },
  // D595: II/22 on KRAUTROCK (the owner: "sounds much cooler as Krautrock and fast tempo as default").
  wtc2f22: {
    liebezeit: {
      why: "II/22 b flat, 101 bars of 3/2 at FAST (a minim of 0.73 s, inside the loop's 62-104 a beat; DEFAULT's 59 under it): the trance's triple loop on the minims, each variation held six bars (about 13 s), the high tom's call on each entry's first note (24 entries, the subject and its inversion in stretto), none a fill.",
      grid: (st) => ({ ...st, hold: 6 }),
      hits: (hits, cx, f) => {
        const on = entryIn(f, cx.tick, cx.beat);
        if (on === null || cx.tick >= formOf(f).last - cx.beat) return hits;
        const at = (on - cx.tick) / cx.beat;
        const near = hits.some((h) => h.piece === "tomHigh" && Math.abs(h.at - at) * cx.beatS < 0.11);
        return near ? hits : [...hits, { piece: "tomHigh", at, vel: 0.36, role: "accent" }];
      },
    },
  },
};

const gridMemo = new Map<string, GridStyle>();
/** A style's pattern tailored for a fugue (undefined: as written). */
export function tailoredGrid(pieceId: string | undefined, style: string, st: GridStyle | undefined): GridStyle | undefined {
  if (!pieceId || !st) return st;
  const t = GRID_TAILORS[pieceId]?.[style]?.grid;
  if (!t) return st;
  const key = `${pieceId}:${style}`;
  let g = gridMemo.get(key);
  if (!g) gridMemo.set(key, (g = t(st)));
  return g;
}
/** A beat's strokes tailored for a fugue (as given where it has no tailoring for the style). */
export function tailorHits(pieceId: string | undefined, style: string, hits: KitHit[], cx: KitContext): KitHit[] {
  const t = pieceId ? GRID_TAILORS[pieceId]?.[style]?.hits : undefined;
  if (!t) return hits;
  const f = fugueById(pieceId!);
  return f.id === pieceId ? t(hits, cx, f) : hits;
}

// ---------------------------------------------------------------------------------------------------------------
// JAZZ QUARTET's brushes, tailored.

export interface BrushTailor {
  why: string;
  /** The subject's head taken by the taps: this many beats of each entry (from its first note). */
  headBeats: number;
  /** The taps' levels: an entry's first note, its other notes on a beat, off it. */
  tap: readonly [first: number, onBeat: number, off: number];
  /** No two taps closer (s). */
  gapS: number;
  /** The ride out in the episodes. */
  episodeRide: boolean;
}
export const BRUSH_TAILORS: Readonly<Record<string, BrushTailor>> = {
  wtc1f06: {
    why: "I/6 d, 3/4 at a crotchet of 1.05 s: the subject's quavers (D E F G E F) then its semiquaver run with the trill; the brush's taps take that rhythm in each entry's first four beats (the run, at 0.26 s, all of it), the pattern's own taps out there and the stir kept under; the hi-hat's foot on each entry's first note; in the episodes (bars 11-13, 26, 32-34, 37-39) the ride out, the stir and the foot alone.",
    headBeats: 4,
    tap: [0.44, 0.3, 0.22],
    gapS: 0.16,
    episodeRide: false,
  },
};
/**
 * One beat of the brushes tailored for a fugue: the subject's attacks in each entry's head as taps (rhythm only, the
 * newest entry's where they overlap), the pattern's taps out there; the ride out in the episodes where the tailoring says.
 */
export function tailorBrushes(f: TouchFugue | null | undefined, tick: number, beat: number, beatS: number, bb: BrushBeat): BrushBeat {
  const t = f ? BRUSH_TAILORS[f.id] : undefined;
  if (!f || !t) return bb;
  const fp = formOf(f);
  if (tick >= fp.last - beat / 2) return bb;
  const ep = phaseAt(fp, tick).phase === "episode";
  const end = tick + beat;
  const ents = [...f.entries].sort((a, b) => a.on - b.on);
  const taps: { at: number; vel: number }[] = [];
  let inHead = false;
  ents.forEach((e, i) => {
    const next = ents[i + 1];
    const to = Math.min(e.on + t.headBeats * beat, e.end, next ? next.on : Infinity);
    if (to <= tick || e.on >= end) return;
    inHead = true;
    let last = -Infinity;
    for (const n of f.voices[e.voice] ?? []) {
      if (n[0] < e.on || n[0] >= to) continue;
      if (((n[0] - last) / beat) * beatS < t.gapS) continue;
      last = n[0];
      if (n[0] < tick || n[0] >= end) continue;
      const first = n[0] === e.on;
      taps.push({ at: (n[0] - tick) / beat, vel: first ? t.tap[0] : (n[0] - tick) % beat === 0 ? t.tap[1] : t.tap[2] });
    }
  });
  let hits = bb.hits;
  if (inHead) hits = hits.filter((h) => h.piece !== "tap" || h.role !== undefined);
  if (ep && !t.episodeRide) hits = hits.filter((h) => h.piece !== "ride");
  const add = taps.filter((x) => !hits.some((h) => h.piece === "tap" && Math.abs(h.at - x.at) * beatS < t.gapS));
  const foot = taps.filter((x) => x.vel === t.tap[0] && !hits.some((h) => h.piece === "foot" && Math.abs(h.at - x.at) * beatS < 0.1));
  return {
    hits: [...hits, ...add.map((x) => ({ piece: "tap" as const, at: x.at, vel: x.vel })), ...foot.map((x) => ({ piece: "foot" as const, at: x.at, vel: 0.3 }))].sort((a, b) => a.at - b.at),
    sweeps: bb.sweeps,
  };
}
