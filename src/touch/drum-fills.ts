/**
 * D535, THE ROLLS AND FILLS, HUMANISED (the owner: "rolls into entries, thinning in episodes, build to climax and
 * resolution" kept; but "some drum rolls sounded overly robotic or just ugly"). Pure numbers: drum-presets.ts kitBeat
 * (the written styles and D514's rock and chip kits) and rock-drums.ts (ABBEY ROAD's Ringo) play them; the orchestral
 * and period drummers (timpani, frame drums: S3's) keep their own.
 *
 *  - WHICH ENTRIES: not every one (fillPlan). The final entry and the climax always; of the others, after one filled
 *    the next is left to its landing alone more often than not, and never are all filled.
 *  - NEVER THE SAME FILL TWICE IN A ROW: each feel has its own few fills (FILL_VARIANTS), the next one drawn from the
 *    others.
 *  - PHRASED: a fill's length by the phrase it ends (the bars since the last landing, grouped in 1, 2 or 4) and by the
 *    tempo (FILL_TARGET_S: about 0.7 s, 1.4 s, 2.4 s), snapped to the metre (a beat, half a bar, the bar, two bars), so
 *    a quick fugue's fill is more beats than a slow one's; its strokes as close as the tempo allows (FILL_STROKE_S), in
 *    the metre's own subdivision (sixteenths or eighths in simple time, triplets in compound time and in swing).
 *  - HUMANISED: a crescendo contour (the strokes rising to the landing, the hands not equal, the group's first accented,
 *    a little seeded variety), a small seeded timing jitter (JITTER_S: none for the machines, which keep their grid),
 *    FLAMS and RUFFS (grace strokes FLAM_S and RUFF_S before a stroke, at GRACE_VEL of it, flagged `grace`).
 *  - BY FEEL: ROCK, tom descents (the snare, then down the toms, the kick under them), landing on the entry's downbeat
 *    with the crash and the kick (drum-presets.ts landHits); JAZZ, triplet comping, the bass drum's "bombs", the toms in
 *    triplets; LATIN, the bongó and congas tumbling down, the tresillo, the repique; the MACHINES, the snare roll
 *    doubling into the drop, the stutter, the 808's toms, the kick and snare alternating.
 *
 * Every number seeded from the fill's own tick: the same fill for the same piece every time (the tests deterministic).
 */
import type { KitPiece } from "./drum-presets.ts";

export type FillFeel = "rock" | "jazz" | "latin" | "machine" | "chip";
/** A stroke of a whole fill: `t` beats from the fill's start; `grace` a flam's or a ruff's grace note. */
export interface FillStroke {
  piece: KitPiece;
  t: number;
  vel: number;
  grace?: boolean;
}
export interface FillSpec {
  feel: FillFeel;
  variant: number;
  /** Its length (beats; it may begin off the beat: the slicer reads `t`). */
  beats: number;
  beatS: number;
  compound: boolean;
  /** The contour: the first strokes' level and the last's (0-1, before the hands and the seeded variety). */
  lo: number;
  hi: number;
  seed: number;
}

/** The fills of each feel (variants): the next fill is never the one before it. */
export const FILL_VARIANTS: Readonly<Record<FillFeel, number>> = { rock: 5, jazz: 4, latin: 3, machine: 4, chip: 3 };
/** One drum's strokes in a fill never closer than this (s): a roll's (drum-presets.ts ROLL_STROKE_S) with the jitter both ways. */
export const FILL_STROKE_S = 0.105;
/** The timing jitter (s, at most, either way), by feel: the machines keep their grid. */
export const JITTER_S: Readonly<Record<FillFeel, number>> = { rock: 0.006, jazz: 0.007, latin: 0.005, machine: 0, chip: 0 };
/** A flam's grace note this far ahead of its stroke (s); a ruff's two these; their level this share of the stroke's. */
export const FLAM_S = 0.03;
export const RUFF_S = [0.065, 0.034] as const;
export const GRACE_VEL = 0.38;
/** A fill's length (s) by the phrase it ends (bars grouped in 1, 2, 4), before the snap to the metre. */
export const FILL_TARGET_S: Readonly<Record<1 | 2 | 4, number>> = { 1: 0.7, 2: 1.4, 4: 2.4 };
/** No fill longer than this (s) but a single beat (a slow bar is left to its last beats). */
export const FILL_MAX_S = 3.4;
/** Into the climax, the final entry and the last bar a fill this much longer. */
export const FILL_BIG = 1.25;
/** After a filled entry the next is filled with this chance (seeded); after one left, always (if it has the room). */
export const FILL_AFTER_FILL = 0.4;

/** A seeded number in [0, 1) (an integer hash: the same for the same seed and index). */
export function rand(seed: number, i: number): number {
  let h = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul((i | 0) + 0x7f4a7c15, 0x85ebca6b)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39) >>> 0;
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
/** A seed from a tick (and a salt: the style). */
export const seedOf = (tick: number, salt = 0) => (Math.round(tick) * 2654435761 + salt * 40503) | 0;
const saltOf = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
export const styleSalt = saltOf;

/** A fill's strokes this far apart by preference (s): a quick fugue's fill in eighths, a slow one's in sixteenths or 32nds. */
export const FILL_SPACING_S = 0.15;
/**
 * The strokes to a beat: of the subdivisions `allowed` (the metre's: 1, 2, 4, 8 in simple time, 3, 6, 12 in triplets),
 * the one whose strokes lie nearest `target` s apart (a fill's own speed), never closer than FILL_STROKE_S.
 */
export function divFor(beatS: number, allowed: readonly number[], target = FILL_SPACING_S): number {
  let best = 0;
  for (const d of allowed) {
    if (beatS / d < FILL_STROKE_S - 1e-9) continue;
    if (!best || Math.abs(Math.log(beatS / d / target)) < Math.abs(Math.log(beatS / best / target))) best = d;
  }
  return best || 1;
}

/**
 * A fill's length in beats: the phrase it ends (`bars` since the last landing), the tempo, the metre (`per` beats a
 * bar), at most `room` beats (it never begins before the last landing). Snapped to a beat, half a bar, the bar or two.
 */
export function fillBeats(bars: number, beatS: number, per: number, room: number, big = false): number {
  const group: 1 | 2 | 4 = bars >= 4 ? 4 : bars >= 2 ? 2 : 1;
  const want = (FILL_TARGET_S[group] * (big ? FILL_BIG : 1)) / beatS;
  const cands = [...new Set([1, per % 2 === 0 ? per / 2 : 0, per, 2 * per].filter((b) => b >= 1))].filter((b) => b <= Math.max(1, room) && (b === 1 || b * beatS <= FILL_MAX_S));
  let best = cands[0] ?? 1;
  for (const c of cands) if (Math.abs(Math.log(c / want)) < Math.abs(Math.log(best / want))) best = c;
  return best;
}

/** The next fill: never the one before it (`prev`, -1 none). */
export function nextVariant(feel: FillFeel, prev: number, seed: number): number {
  const n = FILL_VARIANTS[feel];
  if (n <= 1) return 0;
  if (prev < 0) return Math.floor(rand(seed, 1) * n);
  const v = Math.floor(rand(seed, 1) * (n - 1));
  return v >= prev ? v + 1 : v;
}

/** One slot of a fill: a piece (or none), accented, a flam or a ruff before it, the kick under it. */
interface Slot {
  piece?: KitPiece;
  acc?: boolean;
  flam?: boolean;
  ruff?: boolean;
  kick?: boolean;
  /** The level's share (a ghost under 1). */
  k?: number;
}
type Builder = (n: number, div: number) => Slot[];
const third = <T>(x: number, a: T, b: T, c: T) => (x < 1 / 3 ? a : x < 2 / 3 ? b : c);

/** The fills, by feel: each a builder of its slots, and the subdivisions it prefers (simple, compound). */
const FILLS: Readonly<Record<FillFeel, readonly { simple: number[]; compound: number[]; build: Builder; curve?: number; spacing?: number }[]>> = {
  rock: [
    // The descent: the snare, the high tom, the floor tom, a third each; a flam on the first tom; the kick under the last.
    {
      simple: [1, 2, 4, 8], compound: [1, 3, 6, 12],
      build: (n) =>
        Array.from({ length: n }, (_, i) => {
          const x = i / n;
          const p = third<KitPiece>(x, "snare", "tomHigh", "tomLow");
          const first = i === 0 || third(x, 0, 1, 2) !== third((i - 1) / n, 0, 1, 2);
          return { piece: p, acc: first, flam: first && p === "tomHigh", kick: i === 0 || i === n - 1 };
        }),
    },
    // The snare's run then the toms in pairs (high, high, low, low), a flam into the toms, a ruff into the run's middle.
    {
      simple: [1, 2, 4, 8], compound: [1, 3, 6, 12],
      build: (n) =>
        Array.from({ length: n }, (_, i) => {
          const half = Math.max(1, Math.floor(n / 2));
          if (i < half) return { piece: "snare" as const, k: i % 2 ? 0.75 : 1, ruff: i === Math.floor(half / 2) && half >= 4, kick: i === 0 };
          const j = i - half;
          return { piece: (Math.floor(j / 2) % 2 === 0 && i < n - 2 ? "tomHigh" : "tomLow") as KitPiece, acc: j % 2 === 0, flam: j === 0 };
        }),
    },
    // Gapped (Ringo's lazy tumble): strokes and rests, the kick in the rests, down the toms.
    {
      simple: [1, 2, 4, 8], compound: [1, 3, 6, 12],
      build: (n, div) => {
        const mask = div === 4 ? "x.xx" : div === 3 ? "x.x" : div === 2 ? "xx" : "x";
        return Array.from({ length: n }, (_, i) => {
          const x = i / n;
          if (mask[i % mask.length] === "." && i < n - 1) return { piece: "kick" as const, k: 0.7 };
          return { piece: third<KitPiece>(x, "snare", "tomHigh", "tomLow"), acc: i % div === 0, ruff: i === div && n > div };
        });
      },
    },
    // Linear triplets: hand, hand, foot, down the kit (the snare's ghost first, then the toms).
    {
      simple: [1, 3, 6, 12], compound: [1, 3, 6, 12],
      build: (n) =>
        Array.from({ length: n }, (_, i) => {
          const x = i / n;
          if (i % 3 === 2) return { piece: "kick" as const, k: 0.8 };
          return { piece: x < 0.3 ? ("snare" as const) : i % 3 === 0 && x < 0.7 ? ("tomHigh" as const) : ("tomLow" as const), acc: i % 3 === 0, k: i % 3 === 1 ? 0.8 : 1 };
        }),
    },
    // The floor tom's answer: eighths (the beat's thirds), each beat's first a flam, the snare and the toms by turns.
    {
      simple: [1, 2, 4, 8], compound: [1, 3, 6, 12], spacing: 0.24,
      build: (n, div) =>
        Array.from({ length: n }, (_, i) => {
          const x = i / n;
          const p: KitPiece = x < 0.25 ? "snare" : i % 2 === 0 ? "tomHigh" : "tomLow";
          return { piece: i === n - 1 ? "tomLow" : p, acc: i % div === 0, flam: i % div === 0 && i > 0, kick: i === n - 1 };
        }),
    },
  ],
  jazz: [
    // The skip-beat: the triplet's last two on the snare, the bomb (the kick with the snare) closing it.
    {
      simple: [1, 3, 6, 12], compound: [1, 3, 6, 12], spacing: 0.18,
      curve: 0.6,
      build: (n, div) =>
        Array.from({ length: n }, (_, i) => {
          if (i % div === 0 && i < n - div) return {};
          return { piece: (i >= n - div && i % div === 1 ? "tomLow" : "snare") as KitPiece, k: i % div === 1 ? 0.7 : 1, acc: i === n - 1, kick: i === n - 1 };
        }),
    },
    // Triplets down the kit: the snare, the high tom, the floor tom; a flam on each beat.
    {
      simple: [1, 3, 6, 12], compound: [1, 3, 6, 12], spacing: 0.16,
      build: (n, div) =>
        Array.from({ length: n }, (_, i) => ({ piece: third<KitPiece>(i / n, "snare", "tomHigh", "tomLow"), acc: i % div === 0, flam: i % div === 0, k: i % div === 0 ? 1 : 0.78 })),
    },
    // Bombs: a ghost then the snare's accent with the kick on each beat's last triplet; a ruff into the last.
    {
      simple: [1, 3, 6, 12], compound: [1, 3, 6, 12], spacing: 0.2,
      curve: 0.7,
      build: (n, div) =>
        Array.from({ length: n }, (_, i) => {
          const pos = i % div;
          if (pos === div - 1) return { piece: "snare" as const, acc: true, kick: true, ruff: i === n - 1 && div >= 3 };
          if (pos === 1) return { piece: "snare" as const, k: 0.5 };
          return {};
        }),
    },
    // Comping then the tumble: the snare on the triplet's offbeats, then the toms in triplets.
    {
      simple: [1, 3, 6, 12], compound: [1, 3, 6, 12], spacing: 0.18,
      build: (n, div) =>
        Array.from({ length: n }, (_, i) => {
          if (i < n / 2) return i % div === div - 1 ? { piece: "snare" as const, acc: true } : i % div === 1 ? { piece: "snare" as const, k: 0.55 } : {};
          return { piece: (i < (3 * n) / 4 ? "tomHigh" : "tomLow") as KitPiece, acc: i % div === 0, flam: i === Math.ceil(n / 2) };
        }),
    },
  ],
  latin: [
    // The bongó, the high conga, the low conga, a third each, the tambourine on the beats.
    {
      simple: [1, 2, 4, 8], compound: [1, 3, 6, 12], spacing: 0.14,
      build: (n, div) =>
        Array.from({ length: n }, (_, i) => ({ piece: third<KitPiece>(i / n, "bongo", "congaHigh", "congaLow"), acc: i % div === 0, flam: i === Math.ceil(n / 3) })),
    },
    // The tresillo (3 + 3 + 2): the low conga's open tones, the high conga's ghosts between.
    {
      simple: [1, 2, 4, 8], compound: [1, 3, 6, 12], spacing: 0.14,
      build: (n) =>
        Array.from({ length: n }, (_, i) => {
          const pos = i % 8;
          if (pos === 0 || pos === 3 || pos === 6 || i === n - 1) return { piece: "congaLow" as const, acc: true };
          return pos % 2 ? { piece: "congaHigh" as const, k: 0.6 } : { piece: "bongo" as const, k: 0.7 };
        }),
    },
    // The repique: the high conga in strokes, a flam on each beat, the low conga closing with the tambourine.
    {
      simple: [1, 2, 4, 8], compound: [1, 3, 6, 12], spacing: 0.13,
      build: (n, div) =>
        Array.from({ length: n }, (_, i) => (i >= n - Math.max(1, Math.floor(div / 2)) ? { piece: "congaLow" as const, acc: true } : { piece: i % 2 ? ("bongo" as const) : ("congaHigh" as const), flam: i % div === 0 && i > 0, k: i % 2 ? 0.8 : 1 })),
    },
  ],
  machine: [
    // The build: the snare in eighths, then doubling into the drop, the kick on each beat.
    {
      simple: [1, 2, 4, 8], compound: [1, 3, 6, 12], spacing: 0.12,
      curve: 1.6,
      build: (n, div) =>
        Array.from({ length: n }, (_, i) => {
          const dense = i >= n / 2;
          const on = dense || i % 2 === 0 || div < 2;
          return on ? { piece: "snare" as const, acc: i % div === 0, kick: i % div === 0 } : {};
        }),
    },
    // The stutter: the snare in a broken sixteenth figure, the low tom at its end.
    {
      simple: [1, 2, 4, 8], compound: [1, 3, 6, 12], spacing: 0.12,
      build: (n) => {
        const mask = "x.xx.xx.xxxx";
        return Array.from({ length: n }, (_, i) => (i >= n - 2 ? { piece: "tomLow" as const, acc: i === n - 1 } : mask[i % mask.length] === "x" ? { piece: "snare" as const, acc: i % 4 === 0 } : {}));
      },
    },
    // The machine's toms in triplets, high, high, low; the kick on each beat.
    {
      simple: [1, 3, 6, 12], compound: [1, 3, 6, 12], spacing: 0.14,
      build: (n, div) => Array.from({ length: n }, (_, i) => ({ piece: (i / n < 2 / 3 ? (i % 3 === 2 ? "tomLow" : "tomHigh") : "tomLow") as KitPiece, acc: i % div === 0, kick: i % div === 0 })),
    },
    // The kick and the snare by turns, the snare alone at the end.
    {
      simple: [1, 2, 4, 8], compound: [1, 3, 6, 12], spacing: 0.12,
      curve: 1.3,
      build: (n, div) => Array.from({ length: n }, (_, i) => (i >= n - div || i % 2 ? { piece: "snare" as const, acc: i % div === 0 } : { piece: "kick" as const, k: 0.85 })),
    },
  ],
  chip: [
    // The noise channel's snare, every step, the kick on the beats.
    { simple: [1, 2, 4, 8], compound: [1, 3, 6, 12], curve: 1.3, build: (n, div) => Array.from({ length: n }, (_, i) => ({ piece: "snare" as const, acc: i % div === 0, kick: i % div === 0 })) },
    // A tracker's arpeggio of drums: the snare, the high tom, the low tom by turns.
    { simple: [1, 2, 4, 8], compound: [1, 3, 6, 12], build: (n) => Array.from({ length: n }, (_, i) => ({ piece: (["snare", "tomHigh", "tomLow"] as KitPiece[])[i % 3], acc: i % 3 === 0 })) },
    // Half on the snare, then the low tom alternating with the kick.
    { simple: [1, 2, 4, 8], compound: [1, 3, 6, 12], build: (n) => Array.from({ length: n }, (_, i) => (i < n / 2 ? { piece: "snare" as const } : i % 2 ? { piece: "kick" as const, k: 0.8 } : { piece: "tomLow" as const, acc: true })) },
  ],
};

const memo = new Map<string, FillStroke[]>();
/** A whole fill's strokes (memoised), in time order, its graces included; `t` in [0, beats). */
export function fillStrokes(s: FillSpec): FillStroke[] {
  const key = `${s.feel}:${s.variant}:${s.beats}:${s.beatS.toFixed(3)}:${s.compound}:${s.lo.toFixed(3)}:${s.hi.toFixed(3)}:${s.seed}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const pool = FILLS[s.feel];
  const f = pool[((s.variant % pool.length) + pool.length) % pool.length];
  const div = divFor(s.beatS, s.compound ? f.compound : f.simple, f.spacing ?? FILL_SPACING_S);
  const n = Math.max(2, Math.round(s.beats * div));
  const step = s.beats / n;
  const slots = f.build(n, div);
  const jit = JITTER_S[s.feel] / s.beatS;
  const out: FillStroke[] = [];
  const curve = f.curve ?? 0.85;
  let hand = 0;
  slots.forEach((sl, i) => {
    if (!sl.piece) return;
    const x = n > 1 ? i / (n - 1) : 1;
    const base = s.lo + (s.hi - s.lo) * x ** curve;
    // The hands not equal (the leading hand a little firmer), the group's first accented, a little seeded variety.
    const handK = sl.acc ? 1.15 : hand++ % 2 ? 0.9 : 1;
    const vel = Math.max(0.05, Math.min(1, base * handK * (sl.k ?? 1) * (1 + 0.14 * (rand(s.seed, 3 * i + 7) - 0.5))));
    // The jitter: a seeded triangle (two uniforms), never before the fill's start.
    const dt = jit ? jit * (rand(s.seed, 3 * i + 8) + rand(s.seed, 3 * i + 9) - 1) : 0;
    const t = Math.max(0, Math.min(s.beats - step * 0.5, i * step + dt));
    const gp: KitPiece = sl.piece === "tomHigh" || sl.piece === "tomLow" ? "snare" : sl.piece;
    if (sl.ruff) for (const g of RUFF_S) out.push({ piece: gp, t: t - g / s.beatS, vel: Math.max(0.04, vel * GRACE_VEL * (g === RUFF_S[0] ? 0.85 : 1)), grace: true });
    else if (sl.flam) out.push({ piece: gp, t: t - FLAM_S / s.beatS, vel: Math.max(0.04, vel * GRACE_VEL), grace: true });
    out.push({ piece: sl.piece, t, vel });
    if (sl.kick && sl.piece !== "kick") out.push({ piece: "kick", t, vel: Math.min(1, vel * 0.8) });
  });
  // Graces before the fill's start are left out (the beat before plays its own); then in time order.
  const res = out.filter((h) => h.t >= 0).sort((a, b) => a.t - b.t);
  memo.set(key, res);
  return res;
}

/**
 * The strokes of a fill (from `from` ticks, `spec.beats` beats of `beat` ticks) in the beat at `tick`: `at` beats from the
 * beat (0 to 1), before `stop` (ticks: the landing; the strokes of the landing's own drums FILL_STROKE_S clear of it).
 */
export function fillSlice(spec: FillSpec, from: number, beat: number, tick: number, stop: number, landing: readonly KitPiece[] = ["kick", "crash"]): FillStroke[] {
  const clear = (FILL_STROKE_S * beat) / spec.beatS;
  const out: FillStroke[] = [];
  for (const h of fillStrokes(spec)) {
    const tk = from + h.t * beat;
    if (tk < tick - 1e-6 || tk >= tick + beat - 1e-6) continue;
    if (tk >= stop - (landing.includes(h.piece) ? clear : 0) - 1e-6) continue;
    out.push({ ...h, t: Math.max(0, Math.min(0.999, (tk - tick) / beat)) });
  }
  return out;
}

/** A planned fill (fillPlan): the landing `at`, its start `from` (ticks), its beats, which fill, whether it is played. */
export interface PlannedFill {
  at: number;
  from: number;
  beats: number;
  variant: number;
  filled: boolean;
  /** "in": into an entry; "climax": into the climax or the final entry; "flourish": into the last bar. */
  kind: "in" | "climax" | "flourish";
}

/**
 * Which landings are filled, how long and with which fill. `into`: the landings in tick order (the entries after the
 * episodes, the final entry); `final`: the last bar (the flourish, always filled); `big(at)`: a climax's landing (always
 * filled, longer). The bars since the landing before give the phrase (1, 2 or 4 bars) and the room; `cap(at)` the most
 * beats a landing's fill may take (after a break: a short one).
 */
export function fillPlan(feel: FillFeel, into: readonly number[], final: number, big: (at: number) => boolean, beat: number, bar: number, beatS: number, per: number, salt = 0, cap?: (at: number) => number): PlannedFill[] {
  const out: PlannedFill[] = [];
  let prevAt = 0;
  let prevFilled = false;
  let prevVar = -1;
  const lands = [...into.map((at) => ({ at, fl: false })), ...(final > 0 ? [{ at: final, fl: true }] : [])].sort((a, b) => a.at - b.at);
  lands.forEach(({ at, fl }, i) => {
    const seed = seedOf(at, salt);
    const bars = Math.max(0, (at - prevAt) / bar);
    const room = Math.floor((at - prevAt) / beat + 1e-6) - 1;
    const isBig = fl || big(at);
    const beats = fillBeats(bars, beatS, per, Math.max(1, Math.min(room, cap?.(at) ?? Infinity)), isBig);
    let filled = isBig || i === 0 || !prevFilled || rand(seed, 2) < FILL_AFTER_FILL;
    if (room < 1 && !isBig) filled = false;
    const variant = filled ? nextVariant(feel, prevVar, seed) : -1;
    out.push({ at, from: at - beats * beat, beats, variant, filled, kind: fl ? "flourish" : isBig ? "climax" : "in" });
    if (filled) prevVar = variant;
    prevFilled = filled;
    prevAt = at;
  });
  // Never every entry: where two or more plain entries are all filled, the one with the shortest phrase is left.
  const plain = out.filter((p) => p.kind === "in");
  if (plain.length >= 2 && plain.every((p) => p.filled)) {
    const k = out.indexOf(plain.reduce((a, p) => (p.beats < a.beats ? p : a), plain[plain.length - 1]));
    out[k] = { ...out[k], filled: false, variant: -1 };
    // The fills after it: still never the same twice in a row.
    let pv = -1;
    for (let i = 0; i < out.length; i++) {
      if (!out[i].filled) continue;
      if (out[i].variant === pv) out[i] = { ...out[i], variant: nextVariant(feel, pv, seedOf(out[i].at, salt + 1)) };
      pv = out[i].variant;
    }
  }
  return out;
}

/**
 * The ear-proxy (D536): how machine-gun a run of strokes is. Of the consecutive strokes (graces left out), the share of
 * inter-onset intervals equal to the one before (within 1 ms) and of velocities equal to the one before (within 0.01).
 */
export function repetition(strokes: readonly { t: number; vel: number }[], beatS: number): { ioiSame: number; velSame: number; n: number } {
  const s = [...strokes].sort((a, b) => a.t - b.t);
  let ioi = 0;
  let vel = 0;
  let pairs = 0;
  for (let i = 2; i < s.length; i++) {
    const a = (s[i].t - s[i - 1].t) * beatS;
    const b = (s[i - 1].t - s[i - 2].t) * beatS;
    if (Math.abs(a - b) < 0.001) ioi++;
    pairs++;
  }
  for (let i = 1; i < s.length; i++) if (Math.abs(s[i].vel - s[i - 1].vel) < 0.01) vel++;
  return { ioiSame: pairs ? ioi / pairs : 0, velSame: s.length > 1 ? vel / (s.length - 1) : 0, n: s.length };
}
