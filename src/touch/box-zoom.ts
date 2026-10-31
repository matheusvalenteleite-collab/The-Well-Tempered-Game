/**
 * D377, THE BOX'S ZOOM (WTC 1.83). The owner: "The zoom feature should not be restricted to excerpts in
 * the tutorial. It should be global, although not in an exaggerated way … only to avoid sad situations that
 * have no reason for existing … subtle (use fade movement instead of quick cuts) and used sparsely."
 *
 * D247 keeps the whole piece's range (the voices keep their places in the fugue); this only narrows it
 * where the box would otherwise be needlessly empty (a fugue's opening, one voice alone in a ladder for
 * four; long two-voice stretches in a narrow band), and never so that a note is clipped.
 *
 * - WIDTH (time), once per round: the bars shown so the player's typical note is about 1/18 of the box
 *   (`chooseBars`), 1.5 to 4 bars, 3 kept when already within 20%; never less than MIN_AHEAD_S of music
 *   ahead of the playhead at the round's tempo. Never changed during the round.
 * - HEIGHT (rows), rare and eased (`decide`, `BoxZoom`): the union of the notes shown in the next LOOK_BARS
 *   bars, a step of margin, at least 60% of the piece's range and 10 steps. In only when that is under 70%
 *   of the range shown, the range held HOLD_BARS bars and the player's thumbs still (no note of theirs
 *   within most of the ease); out as soon as a note ahead would fall outside (at a still moment, else at the
 *   last moment before it reaches the screen). Every change eased over EASE_S.
 * - The drawing and the touch rows come from one geometry (`ladderRows`), blended the same way.
 *
 * Cost: a plan of per-bar ranges made once per round; a decision at most every half beat; per frame only
 * the ease's number (no allocation).
 */

export const ZOOM = {
  /** WIDTH: the player's typical note is about 1/NOTES_ACROSS of the box. */
  notesAcross: 18,
  minBars: 1.5,
  maxBars: 4,
  /** WIDTH: the game's 3 bars kept when within this share of the target. */
  keepShare: 0.2,
  /** WIDTH: at least this much music (s) ahead of the playhead at the round's tempo. */
  minAheadS: 3,
  /** WIDTH: the typical note taken per stretch of this many bars, the longest stretch's (the safer width). */
  sectionBars: 8,
  /** HEIGHT: how far ahead (bars) the notes are gathered. */
  lookBars: 4,
  /** HEIGHT: never fewer than this share of the piece's range... */
  minShare: 0.6,
  /** ...nor fewer than this many steps. */
  minSteps: 10,
  /** HEIGHT: in only when the target is under this share of the range shown (and out to the whole piece above it). */
  inShare: 0.7,
  /** HEIGHT: a range held at least this many bars before zooming in again. */
  holdBars: 4,
  /** HEIGHT: each change eased over this long (s). */
  easeS: 1.3,
  /** HEIGHT: a change begins only when the player's next note is at least this share of the ease away. */
  quietShare: 0.75,
  /**
   * D395 (design studio; the owner: the zoom "occurred amidst a player's melody, giving the player the
   * impression that they ought to adjust their gameplay to the zoomings"): a change only at a SEAM of the
   * player's line: none of their notes sounding as it begins, and none struck from this long (s) before the
   * ease to this long after it.
   */
  seamS: 0.25,
};

/** The playhead's place across the box (MusicBox PLAYHEAD). */
export const BOX_PLAYHEAD = 0.25;

export type StepRange = { lo: number; hi: number };
/** A note as the pieces hold it: [onset, length, midi, step, ...] (ticks). */
type N = readonly number[];

const size = (r: StepRange) => r.hi - r.lo + 1;

/** The middle value (the lower middle of an even count); NaN when empty. */
function median(xs: number[]): number {
  if (!xs.length) return NaN;
  xs.sort((a, b) => a - b);
  return xs[(xs.length - 1) >> 1];
}

/**
 * WIDTH: the bars the box shows for a round of `notes` (the player's own, the round's only: rests never
 * count), at `tps` ticks a second. The typical note is the median of each stretch of SECTION_BARS bars,
 * the longest of those (a round of whole notes and semiquavers reads at the slower's width).
 */
/** WIDTH: the bars that show MIN_AHEAD_S of music ahead of the playhead at `tps`. */
export const aheadBars = (barTicks: number, tps: number) => (ZOOM.minAheadS * tps) / ((1 - BOX_PLAYHEAD) * barTicks);

export function chooseBars(notes: readonly N[], barTicks: number, tps: number): number {
  const ahead = aheadBars(barTicks, tps);
  if (!notes.length) return Math.max(3, ahead);
  const sec = ZOOM.sectionBars * barTicks;
  const by = new Map<number, number[]>();
  for (const n of notes) {
    const k = Math.floor(n[0] / sec);
    let a = by.get(k);
    if (!a) by.set(k, (a = []));
    a.push(n[1]);
  }
  let typical = 0;
  for (const a of by.values()) if (a.length >= 6) typical = Math.max(typical, median(a));
  if (!typical) typical = median(notes.map((n) => n[1]));
  const target = Math.min(ZOOM.maxBars, Math.max(ZOOM.minBars, (ZOOM.notesAcross * typical) / barTicks));
  const bars = Math.abs(3 - target) <= ZOOM.keepShare * target ? 3 : target;
  return Math.round(Math.max(bars, ahead) * 100) / 100;
}

/** HEIGHT: a round's notes by bar (made once per round). */
export interface ZoomPlan {
  barTicks: number;
  /** The first bar's index (bar k starts at k × barTicks). */
  bar0: number;
  /** Each bar's lowest and highest step sounding in it (lo > hi: none). */
  lo: Int16Array;
  hi: Int16Array;
  /** The player's onsets, in order. */
  onsets: Float64Array;
  /** D395: the player's notes' ends, in the onsets' order. */
  offs: Float64Array;
  /** The range the box would show without the zoom (the whole piece's). */
  full: StepRange;
}

/** HEIGHT: the plan of a round from `from` to `until`: `shown` the notes drawn (every voice's, or the voice's own alone), `own` the player's. */
export function planZoom(shown: Iterable<N>, own: readonly N[], full: StepRange, barTicks: number, from: number, until: number): ZoomPlan {
  const bar0 = Math.floor(from / barTicks);
  let end = from;
  const list: N[] = [];
  for (const n of shown) if (n[0] + n[1] > from && n[0] < until) list.push(n), (end = Math.max(end, n[0] + n[1]));
  const count = Math.max(1, Math.ceil(end / barTicks) - bar0 + 1);
  const lo = new Int16Array(count).fill(32767);
  const hi = new Int16Array(count).fill(-32768);
  for (const n of list) {
    const a = Math.max(0, Math.floor(n[0] / barTicks) - bar0);
    const b = Math.min(count - 1, Math.floor((n[0] + n[1] - 1) / barTicks) - bar0);
    for (let k = a; k <= b; k++) (lo[k] = Math.min(lo[k], n[3])), (hi[k] = Math.max(hi[k], n[3]));
  }
  const mine = own.filter((n) => n[0] >= from && n[0] < until).sort((x, y) => x[0] - y[0]);
  const onsets = Float64Array.from(mine.map((n) => n[0]));
  const offs = Float64Array.from(mine.map((n) => n[0] + n[1]));
  return { barTicks, bar0, lo, hi, onsets, full, offs };
}

/** The steps sounding in bars k..k+n (the next n bars from within bar k; LOOK_BARS); null: none. */
export function needAt(p: ZoomPlan, bar: number, n = ZOOM.lookBars): StepRange | null {
  let lo = 32767;
  let hi = -32768;
  for (let k = Math.max(0, bar - p.bar0), e = Math.min(p.lo.length - 1, bar - p.bar0 + n); k <= e; k++) (lo = Math.min(lo, p.lo[k])), (hi = Math.max(hi, p.hi[k]));
  return lo > hi ? null : { lo, hi };
}

/** The range to show for `need`: a step of margin, at least 60% of the whole and 10 steps, inside the whole. */
export function widen(need: StepRange, full: StepRange): StepRange {
  const fullN = size(full);
  const min = Math.min(fullN, Math.max(ZOOM.minSteps, Math.ceil(ZOOM.minShare * fullN)));
  let lo = need.lo - 1;
  let hi = need.hi + 1;
  const pad = min - (hi - lo + 1);
  if (pad > 0) (lo -= Math.ceil(pad / 2)), (hi += Math.floor(pad / 2));
  if (lo < full.lo) (hi += full.lo - lo), (lo = full.lo);
  if (hi > full.hi) (lo -= hi - full.hi), (hi = full.hi);
  return { lo: Math.max(full.lo, lo), hi: Math.min(full.hi, hi) };
}

/** The player's thumbs still at `now`: their next note at least QUIET_SHARE of the ease away. */
export function quietAt(p: ZoomPlan, now: number, easeTicks: number): boolean {
  const o = p.onsets;
  let a = 0;
  let b = o.length;
  while (a < b) {
    const m = (a + b) >> 1;
    if (o[m] < now) a = m + 1;
    else b = m;
  }
  return a >= o.length || o[a] - now >= ZOOM.quietShare * easeTicks;
}

/** The first index of an onset at or after `t` (binary search). */
function firstOnset(o: Float64Array, t: number): number {
  let a = 0;
  let b = o.length;
  while (a < b) {
    const m = (a + b) >> 1;
    if (o[m] < t) a = m + 1;
    else b = m;
  }
  return a;
}

/**
 * D395: a SEAM of the player's line at `t`: no note of theirs sounding at `t`, and none struck from `margin`
 * before `t` to `ease + margin` after it, so an ease begun at `t` runs entirely in a rest of theirs (or the
 * tail of nothing). Never mid-melody, never under a held thumb.
 */
export function seamAt(p: ZoomPlan, t: number, ease: number, margin: number): boolean {
  const o = p.onsets;
  const i = firstOnset(o, t - margin);
  if (i < o.length && o[i] <= t + ease + margin) return false;
  // A note struck before the window still sounding at t (its thumb down).
  for (let k = i - 1; k >= 0 && k >= i - 8; k--) if (p.offs[k] > t) return false;
  return true;
}

/** D395: the first seam in [a, b] (ticks), or -1: tried at `a` and at the end of each of the player's notes. */
export function seamIn(p: ZoomPlan, a: number, b: number, ease: number, margin: number): number {
  if (a > b) return -1;
  if (seamAt(p, a, ease, margin)) return a;
  for (let k = firstOnset(p.onsets, a - 8 * p.barTicks); k < p.offs.length; k++) {
    const t = p.offs[k];
    if (t <= a) continue;
    if (t > b) break;
    if (seamAt(p, t, ease, margin)) return t;
  }
  return -1;
}

/** D395: the first bar from `bar` on (the whole round ahead) with a note outside `r`, or -1. */
export function firstOutside(p: ZoomPlan, r: StepRange, bar: number): number {
  for (let i = Math.max(0, bar - p.bar0); i < p.lo.length; i++) if (p.lo[i] <= p.hi[i] && (p.lo[i] < r.lo || p.hi[i] > r.hi)) return i + p.bar0;
  return -1;
}

/** D395: the last tick a change to make room for bar `k` may begin: its notes reach the screen `aheadTicks` early, the ease done by then. */
const deadlineOf = (p: ZoomPlan, k: number, aheadTicks: number, ease: number) => k * p.barTicks - aheadTicks - ease;

/**
 * The range a round begins on (no ease: the count-in shows it): the opening's, when that is well under the
 * whole. D395: and only when a seam of the player's line comes, after the count-in's first ease, before the
 * way back out is needed (else the round begins on the whole piece: no forced zoom in the middle of a melody).
 * `tps`/`aheadTicks` unknown (0): the seam not asked (D377's rule).
 */
export function initialRange(p: ZoomPlan, start: number, tps = 0, aheadTicks = 0): StepRange {
  const need = needAt(p, Math.floor(start / p.barTicks));
  if (!need) return p.full;
  const to = widen(need, p.full);
  if (size(to) >= ZOOM.inShare * size(p.full)) return p.full;
  if (tps > 0) {
    const ease = ZOOM.easeS * tps;
    const k = firstOutside(p, to, Math.floor(start / p.barTicks));
    if (k >= 0 && seamIn(p, start, deadlineOf(p, k, aheadTicks, ease), ease, ZOOM.seamS * tps) < 0) return p.full;
  }
  return to;
}

/**
 * HEIGHT: the range to move to at `now` (ticks), or null to stay. `cur` the range shown, `held` the tick it
 * was reached, `aheadTicks` how far ahead of the playhead the box shows, `tps` the tempo.
 */
export function decide(p: ZoomPlan, cur: StepRange, held: number, now: number, tps: number, aheadTicks: number): StepRange | null {
  const bar = Math.floor(now / p.barTicks);
  const need = needAt(p, bar);
  if (!need) return null;
  const ease = ZOOM.easeS * tps;
  const margin = ZOOM.seamS * tps;
  const seam = seamAt(p, now, ease, margin);
  // OUT, to the whole piece (one step, not a staircase), before anything ahead would be clipped. D395: at a
  // seam of the player's line: the one now if the notes outside are near (within LOOK_BARS) or no later seam
  // comes before they are due; at the deadline only if no seam came at all (the in-rule below and the
  // opening's make that the exception: a round so busy it never rests).
  const k = firstOutside(p, cur, bar);
  if (k >= 0) {
    const due = deadlineOf(p, k, aheadTicks, ease);
    if (now >= due) return p.full;
    if (!seam) return null;
    if (k - bar <= ZOOM.lookBars) return p.full;
    return seamIn(p, now + p.barTicks / 4, due, ease, margin) < 0 ? p.full : null;
  }
  // IN: rarely; held long enough, at a seam, well narrower, and narrow for the hold to come too
  // (LOOK_BARS + HOLD_BARS ahead, the music lasting that long: no zoom in to go straight back out).
  // D395: and only if the way back out also falls at a seam (one after this ease, before it is due).
  const span = ZOOM.lookBars + ZOOM.holdBars;
  if (now - held < ZOOM.holdBars * p.barTicks || !seam || bar - p.bar0 + span >= p.lo.length) return null;
  const far = needAt(p, bar, span);
  if (!far) return null;
  const to = widen(far, p.full);
  if (size(to) >= ZOOM.inShare * size(cur)) return null;
  const k2 = firstOutside(p, to, bar);
  if (k2 >= 0 && seamIn(p, now + ease + margin, deadlineOf(p, k2, aheadTicks, ease), ease, margin) < 0) return null;
  return to;
}

/** The ease's curve (0 → 1, gentle at both ends). */
export const easeCurve = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * t));

/** What the box shows now: the range, and while easing, the range it comes from and how far (0..1). */
export interface ZoomView {
  lo: number;
  hi: number;
  from: StepRange | undefined;
  mix: number;
}

/** HEIGHT over a round: the range shown, its eased changes. `update` each frame (works at most every half beat), `view` each frame. */
export class BoxZoom {
  cur: StepRange;
  prev: StepRange | undefined;
  /** When the ease began (ms). */
  t0 = 0;
  held: number;
  /** The changes made (for the tests and the lab). */
  changes = 0;
  private slot = NaN;
  private readonly v: ZoomView;
  readonly plan: ZoomPlan;
  readonly beatTicks: number;
  readonly on: boolean;
  constructor(plan: ZoomPlan, start: number, beatTicks: number, on: boolean, tps = 0, aheadTicks = 0) {
    this.plan = plan;
    this.beatTicks = beatTicks;
    this.on = on;
    this.cur = on ? initialRange(plan, start, tps, aheadTicks) : plan.full;
    this.held = start;
    this.v = { lo: this.cur.lo, hi: this.cur.hi, from: undefined, mix: 1 };
  }
  update(now: number, nowMs: number, tps: number, aheadTicks: number) {
    if (!this.on) return;
    const slot = Math.floor((2 * now) / this.beatTicks);
    if (slot === this.slot) return;
    this.slot = slot;
    if (this.prev && nowMs - this.t0 < ZOOM.easeS * 1000) return;
    const to = decide(this.plan, this.cur, this.held, now, tps, aheadTicks);
    if (!to || (to.lo === this.cur.lo && to.hi === this.cur.hi)) return;
    this.prev = this.cur;
    this.cur = to;
    this.t0 = nowMs;
    this.held = now;
    this.changes++;
  }
  view(nowMs: number): ZoomView {
    const v = this.v;
    v.lo = this.cur.lo;
    v.hi = this.cur.hi;
    const mix = this.prev ? easeCurve((nowMs - this.t0) / (ZOOM.easeS * 1000)) : 1;
    if (mix >= 1) this.prev = undefined;
    v.from = this.prev;
    v.mix = mix;
    return v;
  }
}

/** The box's canvas pixel (MusicBox PX). */
export const BOX_PX = 2;

/**
 * The ladder's rows in a box `h` canvas px tall (one row per step from lo−1 to hi+1, whole px), and while
 * easing the blend of `from`'s and the range's: a step's row top is `a − step × rowH`. The drawing
 * (MusicBox paintClassic) and the touch rows (`touchRows`) both come from this.
 */
export function ladderRows(h: number, lo: number, hi: number, from?: StepRange, mix = 1): { a: number; rowH: number } {
  const one = (l: number, u: number) => {
    const rows = u - l + 3;
    const r = Math.max(2, Math.floor(h / rows));
    const top = Math.floor((h - r * rows) / 2);
    return { a: top + (u + 1) * r, r };
  };
  const B = one(lo, hi);
  if (!from || mix >= 1) return { a: B.a, rowH: B.r };
  const A = one(from.lo, from.hi);
  return { a: A.a + (B.a - A.a) * mix, rowH: A.r + (B.r - A.r) * mix };
}

/** The ladder's canvas height for a box `cssH` CSS px tall, `floor` of it kept free at its foot. */
export const ladderHeight = (cssH: number, floor = 0) => Math.round(Math.max(1, Math.floor(cssH / BOX_PX)) * (1 - floor));

/** The touch rows (CSS px) for a box `cssH` tall: each step's centre and a row's height, as drawn. */
export function touchRows(lo: number, hi: number, cssH: number, floor = 0, from?: StepRange, mix = 1): { yOf: (step: number) => number; rowH: number } {
  const L = ladderRows(ladderHeight(cssH, floor), lo, hi, from, mix);
  return { yOf: (step) => (L.a - step * L.rowH + L.rowH / 2) * BOX_PX, rowH: L.rowH * BOX_PX };
}
