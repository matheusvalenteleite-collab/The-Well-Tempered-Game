/**
 * Motives and imitation, measured: how far one line repeats another's melodic intervals at a
 * displacement (imitation, straight or inverted, at any transposition), and how often a line
 * repeats its own short figures (motivic repetition). Intervals are diatonic (steps, signed), so a
 * figure transposed within the mode counts as the same figure.
 */
import { parsePitch } from "../../music/pitch.ts";
import { onsets } from "./corpus.ts";
import type { Slot } from "../layout.ts";

/** Diatonic melodic intervals of a line, in steps (signed). */
export const steps = (ps: string[]) => ps.slice(1).map((p, i) => parsePitch(p).diatonic - parsePitch(ps[i]).diatonic);

/** The downbeat note of every bar (the line's skeleton at the cantus's pace); a held note counts. */
export function skeleton(layout: Slot[], line: (string | null)[]): string[] {
  const out: string[] = [];
  let held: string | null = null;
  layout.forEach((s, k) => {
    const p = line[k];
    if (p && /^[A-G]/.test(p)) held = p;
    if (s.beat === 0 && held && (!out.length || out.length === s.bar)) out[s.bar] = held;
  });
  return out.filter(Boolean);
}

/** The notes as struck (ties counted once). */
export const struck = (layout: Slot[], line: (string | null)[]) => onsets(layout, line).map(([, p]) => p);

export interface Imitation {
  /** Consecutive intervals the follower repeats (0 = none). */
  run: number;
  /** Bars (or notes) by which the follower comes after the leader; negative: it comes first. */
  lag: number;
  inverted: boolean;
  /** Index (in the follower's intervals) where the run starts. */
  at: number;
}

/**
 * The longest stretch where `line` repeats `model`'s intervals, displaced by 1..maxLag positions
 * either way, straight or inverted. Repeated notes do not count as matching intervals.
 */
export function imitation(line: string[], model: string[], maxLag = 4): Imitation {
  const a = steps(line);
  const b = steps(model);
  let best: Imitation = { run: 0, lag: 0, inverted: false, at: 0 };
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    if (lag === 0) continue;
    for (const inverted of [false, true]) {
      let run = 0;
      for (let i = 0; i < a.length; i++) {
        const j = i - lag;
        const ok = j >= 0 && j < b.length && a[i] !== 0 && a[i] === (inverted ? -b[j] : b[j]);
        run = ok ? run + 1 : 0;
        if (run > best.run) best = { run, lag, inverted, at: i - run + 1 };
      }
    }
  }
  return best;
}

export interface SelfRepetition {
  /** Distinct three-interval figures heard twice or more (not overlapping). */
  figures: number;
  /** The longest figure (in intervals) heard twice, not overlapping. */
  longest: number;
}

/** How a line repeats its own figures (transposed or not). */
export function selfRepetition(line: string[]): SelfRepetition {
  const s = steps(line);
  const twice = (len: number) => {
    const seen = new Map<string, number[]>();
    for (let i = 0; i + len <= s.length; i++) {
      const key = s.slice(i, i + len).join(",");
      if (s.slice(i, i + len).every((x) => x === 0)) continue;
      const at = seen.get(key) ?? [];
      at.push(i);
      seen.set(key, at);
    }
    return [...seen.values()].filter((at) => at.some((x) => at.some((y) => y >= x + len))).length;
  };
  let longest = 0;
  for (let len = 2; len <= s.length / 2; len++) if (twice(len) > 0) longest = len;
  return { figures: twice(3), longest };
}
