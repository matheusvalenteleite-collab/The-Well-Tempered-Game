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
 *   II/6 (BREAKBEAT, D621; a candidate, not its HOME): the break on the score's semiquavers, swung to the triplets where
 *       the music runs in them, the hats on the subject's winding run, the backbeat and an open hat on its leap.
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
      why: "II/22 b flat, 101 bars of 3/2 at FAST (a minim of 0.73 s, inside the loop's 62-104 a beat; DEFAULT's 59 under it): the trance's triple loop on the minims, each variation held six bars (about 13 s), the high tom's call on each entry's first note (24 entries, the subject and its inversion in stretto), none a fill. D607: the loop grows into the final group (the climax's ramp, form-points.ts phaseAt): the toms interlocking in the steps the loop leaves open, the snare's ghosts between, the hats doubled, past the climax's half an open hat on each minim's last sixteenth; no fill, nothing pitched.",
      grid: (st) => ({ ...st, hold: 6 }),
      hits: (hits0, cx, f) => {
        const fp = formOf(f);
        let hits = hits0;
        const on = entryIn(f, cx.tick, cx.beat);
        if (on !== null && cx.tick < fp.last - cx.beat) {
          const at = (on - cx.tick) / cx.beat;
          const near = hits.some((h) => h.piece === "tomHigh" && Math.abs(h.at - at) * cx.beatS < 0.11);
          if (!near) hits = [...hits, { piece: "tomHigh", at, vel: 0.36, role: "accent" }];
        }
        return trance22(hits, cx, f);
      },
    },
  },
  // D620: II/6 (THE CATAPULT, SID 64; the owner on HOUSE 909: "That didn't fit. Try another drum."). A candidate, not
  // its HOME (FUGUE_STYLES.wtc2f06 unchanged): BREAKBEAT as chosen on the DRUMS row or in the Sound Lab.
  wtc2f06: {
    breakbeat: {
      why: "II/6 d, 4/4 at a crotchet of 1.13 s (the break's pulse the quaver, 106): its subject two beats of triplet semiquavers winding up (D-E-F-G ... A-B flat-A-G), then the leap up a fourth on the and of beat 3 and the quavers falling; its countersubject and episodes in straight semiquavers. The break re-written on the score's grid (the drummer's eighths the score's semiquavers: none of the as-written sixteenths' 32nds, which missed every onset); in a beat whose music runs in triplets the hats take the score's triplet attacks (a crescendo through an entry's run) and the off-semiquaver kicks and snares swing to the triplet's last; the leap of each entry (the catapult's release) the backbeat accented with an open hat; the episodes the break's own softer groove.",
      grid: (st) => ({
        ...st,
        swing16: 0,
        duple: {
          pulses: 4,
          steps: 6,
          rows: {
            kick: "#..x.. ...... X..... ...o..|#..#.. ...... ...#.. ......|#..x.. ...... X..x.. ......|#..#.. ...... X..... ......",
            snare: "...-.. #..... ...-.. #.....|...... #..-.. ...... #..-..|...-.. #..... ...... #..-..|...-.. #..... ...-.. ...#..",
            hat: "X..o.. x..o.. X..o.. x.....|X..o.. x..o.. X..o.. x..o..|X..o.. x..o.. X..o.. x.....|X..o.. x..o.. X..o.. x..o..",
            openhat: "...... ...... ...... ...o..|...... ...... ...... ......|...... ...... ...... ...o..|...... ...... ...... ......",
          },
        },
      }),
      hits: (hits, cx, f) => catapult(hits, cx, f),
    },
  },
};

/**
 * D620: II/6's break by its score. CATAPULT.contour: the hats' levels in a triplet beat (its first attack, the quaver's,
 * the others) against the beat's own written hats; run: the crescendo through an entry's winding run (its first two
 * beats); launch: the release (the snare and the open hat against the beat's strongest written hat or snare); leap: the
 * semitones up that make the release.
 */
export const CATAPULT = { contour: [1, 0.78, 0.55], run: [0.8, 1.1], launch: { openhat: 0.75, snare: 1.05 }, leap: 5 } as const;
/** The places (twelfths of the beat) a II/6 pattern stroke may fall: the semiquavers and the triplet semiquavers. */
const ON_GRID = new Set([0, 2, 3, 4, 6, 8, 9, 10]);
function catapult(hits: KitHit[], cx: KitContext, f: TouchFugue): KitHit[] {
  const fp = formOf(f);
  if (cx.tick >= fp.last - cx.beat / 2) return hits;
  const end = cx.tick + cx.beat;
  const twelfth = (t: number) => Math.round(((t - cx.tick) / cx.beat) * 12 * 1000) / 1000;
  // the beat's attacks (every voice), and whether it runs in triplets
  const att = new Set<number>();
  for (const v of f.voices) for (const n of v) if (n[0] >= cx.tick && n[0] < end) att.add(twelfth(n[0]));
  const trip = [...att].some((x) => x === 2 || x === 4 || x === 8 || x === 10);
  const out: KitHit[] = [];
  let ref = 0;
  let base = 0;
  for (const h of hits) {
    if (h.role !== undefined) {
      out.push(h); // the rolls, fills and landings as the form gives them
      continue;
    }
    const r = Math.round(h.at * 12);
    if (Math.abs(h.at * 12 - r) > 0.05 || !ON_GRID.has(r)) continue; // off the score's grid (the climax's added steps)
    if (h.piece === "hat" || h.piece === "snare") base = Math.max(base, h.vel);
    if (trip && (h.piece === "hat" || h.piece === "ride")) {
      ref = Math.max(ref, h.vel);
      continue;
    }
    // in a triplet beat the off semiquavers swing to the triplet's last
    out.push({ ...h, at: (trip && (r === 3 || r === 9) ? r + 1 : r) / 12 });
  }
  if (trip && ref > 0) {
    // the entry whose winding run is in this beat (the newest): the crescendo through it
    const e = f.entries.filter((x) => x.on <= cx.tick && x.on + 2 * cx.beat > cx.tick).sort((a, b) => b.on - a.on)[0];
    for (const x of [...att].sort((a, b) => a - b)) {
      if (x % 2 !== 0) continue;
      const c = x % 6 === 0 ? CATAPULT.contour[x === 0 ? 0 : 1] : CATAPULT.contour[2];
      const p = e ? clamp((cx.tick + (x / 12) * cx.beat - e.on) / (2 * cx.beat), 0, 1) : 0;
      const run = e ? CATAPULT.run[0] + (CATAPULT.run[1] - CATAPULT.run[0]) * p : 1;
      out.push({ piece: "hat", at: x / 12, vel: clamp(ref * c * run, 0.02, 1) });
    }
  }
  // the release: each entry's first upward leap (a fourth or more) in its first bar, on the backbeat with an open hat
  if (base > 0)
    for (const e of f.entries) {
      const ns = e.notes;
      for (let i = 1; i < ns.length && ns[i][0] < e.on + f.barTicks; i++) {
        if (ns[i][2] - ns[i - 1][2] < CATAPULT.leap) continue;
        const t = ns[i][0];
        if (t >= cx.tick && t < end) {
          const at = (t - cx.tick) / cx.beat;
          const v = clamp(base * CATAPULT.launch.snare, 0.02, 0.62);
          const sn = out.find((h) => h.piece === "snare" && Math.abs(h.at - at) < 0.02);
          if (sn) sn.vel = Math.max(sn.vel, v);
          else out.push({ piece: "snare", at, vel: v });
          if (!out.some((h) => h.piece === "openhat" && Math.abs(h.at - at) < 0.02)) out.push({ piece: "openhat", at, vel: clamp(base * CATAPULT.launch.openhat, 0.02, 0.5) });
        }
        break;
      }
    }
  return out.sort((a, b) => a.at - b.at);
}

/** D607: II/22's trance grown by the climax's ramp: the interlocking toms, the snare's ghosts, the open hat past its half. */
export const TRANCE_GROW = { tom: [0.16, 0.3], ghost: 0.12, hat: [0.12, 0.2], hatFrom: 0.25, openhat: 0.3, openFrom: 0.5 } as const;
function trance22(hits: KitHit[], cx: KitContext, f: TouchFugue): KitHit[] {
  const fp = formOf(f);
  const ph = phaseAt(fp, cx.tick);
  const r = ph.climax;
  if (r <= 0 || cx.tick >= fp.last - cx.beat / 2 || ph.phase === "episode") return hits;
  const steps = Math.max(1, Math.min(4, Math.floor(cx.beatS / 0.15)));
  const out = [...hits];
  const at = (j: number) => j / steps;
  const has = (j: number, ps: string[]) => out.some((h) => Math.abs(h.at - at(j)) * cx.beatS < 0.06 && ps.includes(h.piece));
  const beatN = Math.round(cx.tick / cx.beat);
  for (let j = 0; j < steps; j++) {
    if (j % 2 === 1 && !has(j, ["tomHigh", "tomLow"])) out.push({ piece: (beatN + j) % 3 === 0 ? "tomHigh" : "tomLow", at: at(j), vel: TRANCE_GROW.tom[0] + (TRANCE_GROW.tom[1] - TRANCE_GROW.tom[0]) * r });
    else if (j > 0 && !has(j, ["snare", "tomHigh", "tomLow"])) out.push({ piece: "snare", at: at(j), vel: TRANCE_GROW.ghost * (0.6 + 0.4 * r) });
  }
  // the hats doubled between the loop's sixteenths (the drummer's hand opening up), never closer than 0.085 s
  if (r >= TRANCE_GROW.hatFrom && cx.beatS / steps / 2 >= 0.085) for (let j = 0; j < steps; j++) out.push({ piece: "hat", at: (j + 0.5) / steps, vel: TRANCE_GROW.hat[0] + (TRANCE_GROW.hat[1] - TRANCE_GROW.hat[0]) * r });
  if (r >= TRANCE_GROW.openFrom && steps > 1 && !has(steps - 1, ["openhat"])) out.push({ piece: "openhat", at: at(steps - 1), vel: TRANCE_GROW.openhat });
  return out;
}

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
