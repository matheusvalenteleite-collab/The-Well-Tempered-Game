/**
 * D442, THE REVEAL (the owner, 1 Nov 2026, of the preludes researcher's four ways to play Prelude I/1: "I
 * like the reveal … The Reveal is the one we should work on for now"; docs/learn/preludes.md §3). The
 * whole prelude is drawn and sounds; what the player strikes grows bar by bar, one new thing at a time,
 * from one bass note a bar to the pedals and the free line at the end. On a phone (LADDER) both hands'
 * chosen notes make one line for the two thumbs; everything else is the game's.
 *
 * Pure: the prelude and its plan in; the player's notes (each with its voice), the notes the game must
 * leave out (a pedal's repeated bass: the held note sounds instead), and the slid notes after each struck
 * one (D262's trace) out.
 */
import { barStart, type TouchFugue } from "../touch/fugue.ts";

/** What one half bar asks: the left hand's bass, its tenor or a pedal (held to the pedal's end); the right hand's top note, or the figure's rising notes slid (the first struck, the rest slid), or the free line slid. */
export interface RevealHalf {
  lh?: "bass" | "tenor" | "pedal";
  rh?: "top" | "slide" | "line";
}
/** From `bar` on: each half bar's ask (the second half's alone, or the first's again). */
export interface RevealStep {
  bar: number;
  first: RevealHalf;
  second: RevealHalf;
  /** What Glenn's hint says as it begins (the box's hint card). */
  cue?: string;
}
export interface RevealPlan {
  steps: RevealStep[];
  /** The pedals: from bar to bar (exclusive): the bass struck at the start and held to the end. */
  pedals: [from: number, to: number][];
}

/** Prelude I/1 (docs/learn/preludes.md §3, the researcher's table, every bar read from data/touch/). */
export const REVEAL_I1: RevealPlan = {
  steps: [
    { bar: 1, first: { lh: "bass" }, second: {}, cue: "One note a bar: the bass. Hold it." },
    { bar: 5, first: { lh: "bass", rh: "top" }, second: {}, cue: "Now the top of the figure too, with the other thumb." },
    { bar: 9, first: { lh: "bass", rh: "top" }, second: { lh: "bass", rh: "top" }, cue: "Every beat now: bass, top, bass, top. Thumbs in turn." },
    { bar: 12, first: { lh: "tenor", rh: "top" }, second: { rh: "top" }, cue: "The left thumb takes the tenor: one long note a bar, sliding down." },
    { bar: 20, first: { lh: "bass", rh: "slide" }, second: { lh: "bass", rh: "slide" }, cue: "Slide up the three rising notes." },
    { bar: 24, first: { lh: "pedal", rh: "top" }, second: { rh: "top" }, cue: "The G in the bass: hold it, eight bars. The top goes on." },
    { bar: 32, first: { lh: "pedal", rh: "top" }, second: { rh: "top" }, cue: "Home: the low C. Hold it to the end." },
    { bar: 33, first: { rh: "line" }, second: { rh: "line" }, cue: "The figure breaks free: slide along it." },
    { bar: 35, first: { lh: "bass", rh: "top" }, second: {}, cue: "The last chord: both thumbs." },
  ],
  pedals: [
    [24, 32],
    [32, 35],
  ],
};

export type RNote = [on: number, dur: number, midi: number, step: number];
export interface Revealed {
  /** The player's notes by voice (0 the right hand, 1 the left), in time. */
  mine: Map<number, RNote[]>;
  /** Notes of the game's left out ("voice:on:midi"): a pedal's repeated bass. */
  drop: Set<string>;
  /** The slid notes after each struck note (keyed by its tick): D262's trace. */
  traces: Map<number, { on: number; dur: number; midi: number }[]>;
}

export const keyOf = (v: number, on: number, midi: number) => `${v}:${on}:${midi}`;

export function stepAtBar(plan: RevealPlan, bar: number): RevealStep {
  let s = plan.steps[0];
  for (const x of plan.steps) if (x.bar <= bar) s = x;
  return s;
}

export function reveal(f: TouchFugue, plan: RevealPlan): Revealed {
  const mine = new Map<number, RNote[]>([
    [0, []],
    [1, []],
  ]);
  const drop = new Set<string>();
  const traces = new Map<number, { on: number; dur: number; midi: number }[]>();
  const half = f.barTicks / 2;
  const pedalOf = (bar: number) => plan.pedals.find(([a, b]) => bar >= a && bar < b);
  for (const b of f.bars) {
    const s = stepAtBar(plan, b.n);
    for (const h of [0, 1] as const) {
      const ask = h === 0 ? s.first : s.second;
      const from = b.on + h * half;
      const to = from + half;
      const rh = f.voices[0].filter((n) => n[0] >= from && n[0] < to);
      const lh = (f.voices[1] ?? []).filter((n) => n[0] >= from && n[0] < to);
      const ped = pedalOf(b.n);
      // The pedal: its bass struck once, at its first bar's start, held to its end; the bass struck again under it left out.
      if (ped && lh.length) {
        const low = Math.min(...lh.map((n) => n[2]));
        const firstOn = Math.min(...lh.map((n) => n[0]));
        for (const n of lh) if (n[2] === low && n[0] === firstOn) {
          if (b.n === ped[0] && h === 0 && ask.lh === "pedal") mine.get(1)!.push([n[0], barStart(f, ped[1]) - n[0], n[2], n[3]]);
          else drop.add(keyOf(1, n[0], n[2]));
        }
      } else if (ask.lh && lh.length) {
        const firstOn = Math.min(...lh.map((n) => n[0]));
        const pick = ask.lh === "bass" ? lh.filter((n) => n[0] === firstOn).reduce((a, n) => (n[2] < a[2] ? n : a)) : lh.filter((n) => n[0] > firstOn).sort((a, c) => a[0] - c[0])[0];
        if (pick) mine.get(1)!.push([pick[0], pick[1], pick[2], pick[3]]);
      }
      if (ask.rh && rh.length) {
        const sorted = [...rh].sort((a, c) => a[0] - c[0]);
        if (ask.rh === "top") {
          const top = sorted.reduce((a, n) => (n[2] > a[2] ? n : a));
          mine.get(0)!.push([top[0], top[1], top[2], top[3]]);
        } else {
          // "slide": the figure's first three (rising) notes, the first struck and the rest slid; "line": the whole half bar.
          const run = ask.rh === "slide" ? sorted.slice(0, 3) : sorted;
          const [head, ...rest] = run;
          mine.get(0)!.push([head[0], head[1], head[2], head[3]]);
          traces.set(head[0], rest.map((n) => ({ on: n[0], dur: n[1], midi: n[2] })));
        }
      }
    }
  }
  for (const v of mine.values()) v.sort((a, c) => a[0] - c[0] || c[2] - a[2]);
  return { mine, drop, traces };
}
