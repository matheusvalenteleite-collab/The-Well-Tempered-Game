/** D244: THE ECHO (journey.ts): a figure stated twice in a prelude's bar keeps its lanes. */
import type { TouchFugue } from "../touch/fugue.ts";
import type { LaneNote } from "../touch/lanes.ts";
import { laneOk, type Move } from "./protos.ts";

/**
 * THE ECHO: in a prelude, a half bar whose struck notes repeat the first half's (the same pitches at
 * the same places in the half) is laid in the same lanes as the first: the first half's pattern, or
 * else the second's, or else (a figure of up to five notes) the pattern nearest the two that the moves
 * into each half, within it and out of the bar allow (laneOk, leaps strict: the second statement is
 * often approached by a leap, the first by a step). Not where
 * the second half holds a free note or a repeat's SPACE (`plain` false). Returns the notes of the
 * second halves (the lanes rewritten in place).
 */
export function echoHalves(f: TouchFugue, notes: LaneNote[], moves: Move[], heads: boolean[], plain: boolean[], lanes: number[], count: number): Set<number> {
  const echo = new Set<number>();
  if (f.kind !== "prelude") return echo;
  const half = f.barTicks / 2;
  const struck = (from: number, to: number) => notes.map((_, i) => i).filter((i) => heads[i] && notes[i].on >= from && notes[i].on < to);
  const before = (i: number) => [...notes.keys()].filter((j) => heads[j] && j < i).at(-1);
  for (const b of f.bars) {
    const one = struck(b.on, b.on + half);
    const two = struck(b.on + half, b.on + 2 * half);
    if (!one.length || one.length !== two.length || !two.every((i) => plain[i])) continue;
    if (!one.every((i, k) => notes[i].midi === notes[two[k]].midi && notes[i].on - b.on === notes[two[k]].on - b.on - half)) continue;
    const p0 = before(one[0]);
    const next = [...notes.keys()].find((i) => heads[i] && i > two[two.length - 1]);
    const fits = (want: number[]) => {
      // Into the first half (a free first note: any lane), within each, from the first into the second, out.
      const into = p0 === undefined || plain[one[0]] === false || laneOk(moves[one[0]], lanes[p0], want[0], true, count);
      const within = (idx: number[]) => idx.every((i, k) => k === 0 || laneOk(moves[i], want[k - 1], want[k], true, count));
      const mid = laneOk(moves[two[0]], want[want.length - 1], want[0], true, count);
      const out = next === undefined || laneOk(moves[next], want[want.length - 1], lanes[next], true, count);
      return into && within(one) && within(two) && mid && out;
    };
    const a = one.map((i) => lanes[i]);
    const z = two.map((i) => lanes[i]);
    let want: number[] | undefined = [a, z].find(fits);
    if (!want && one.length <= 5) {
      let best = Infinity;
      const cand = new Array<number>(one.length).fill(0);
      const walk = (k: number) => {
        if (k === cand.length) {
          const cost = cand.reduce((t, l, i) => t + Math.abs(l - a[i]) + Math.abs(l - z[i]), 0);
          if (cost < best && fits(cand)) (best = cost), (want = [...cand]);
          return;
        }
        for (let l = 0; l < count; l++) (cand[k] = l), walk(k + 1);
      };
      walk(0);
    }
    const w: number[] | undefined = want;
    if (!w) continue;
    one.forEach((i, k) => (lanes[i] = w[k]));
    two.forEach((i, k) => {
      lanes[i] = w[k];
      echo.add(i);
    });
  }
  return echo;
}
