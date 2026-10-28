/**
 * D345: where to begin in a list of notes in time order (by onset) to find every note still sounding at
 * a tick, without walking the whole list from its first note each frame. The painters and the game
 * walked every note from the piece's start, every frame (BWV 1043 III's band: 3,592 notes, its player
 * 1,401), so the work of a frame grew with the time played: the longest pieces cost the most by their
 * end. The answer is the same note set: any note before the index ended more than `margin` ticks before
 * the tick (the longest note in the list is measured once).
 */
type Timed = { on: number; dur: number };

const longest = new WeakMap<readonly Timed[], { n: number; max: number }>();

function longestOf(list: readonly Timed[]): number {
  let m = longest.get(list);
  if (!m || m.n !== list.length) {
    let max = 0;
    for (const x of list) if (x.dur > max) max = x.dur;
    m = { n: list.length, max };
    longest.set(list, m);
  }
  return m.max;
}

const ordered = new WeakMap<readonly { on: number }[], { n: number; ok: boolean }>();

/** Whether the list is in time order (checked once per list and length); a list out of order is walked whole, as before. */
export function inOrder(list: readonly { on: number }[]): boolean {
  let m = ordered.get(list);
  if (!m || m.n !== list.length) {
    let ok = true;
    for (let i = 1; i < list.length && ok; i++) ok = list[i].on >= list[i - 1].on;
    m = { n: list.length, ok };
    ordered.set(list, m);
  }
  return m.ok;
}

/** The first index whose onset is at or after `tick` (0 where the list is not in time order). */
export function firstAtOrAfter(list: readonly { on: number }[], tick: number): number {
  if (!inOrder(list)) return 0;
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].on < tick) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The first index from which to look for notes sounding at `tick` or later: every note before it ends
 * before `tick - margin` (margin in ticks, ≥ 0: e.g. a screen's width of time, so that rounding at the
 * screen's edge is never in question).
 */
export function firstSounding(list: readonly Timed[], tick: number, margin = 0): number {
  return firstAtOrAfter(list, tick - margin - longestOf(list));
}
