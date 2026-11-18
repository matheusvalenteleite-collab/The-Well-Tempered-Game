/**
 * D678 (design studio; the owner approved the pilot, THE ECHO LANE, on the Goldberg Variations 3 and 12; "the animations
 * rotate and move in a way that display the canonic features"): a canon's architecture drawn in the box. Each note of the
 * leader (dux) is joined by a faint arc to the note of the follower (comes) that answers it, later by the canon's delay
 * and at its interval; while the answer is on its way a small token of the note travels along the arc (in a canon in
 * contrary motion it turns over as it goes: the inversion drawn as a turn); as the follower sounds it, its note is lit
 * in the follower's colour. Drawing only: nothing judged reads it.
 *
 * The canons, tagged by the studio from the score (the game's own notes; tools: matching each dux note's onset + the
 * delay against the comes' voices): Variation 3, Canone all'Unisono, the soprano led, the alto one bar (of 12/8) later
 * at the same pitch (40 of the first 40 notes match); Variation 12, Canone alla Quarta, in contrary motion, the soprano
 * led, the comes one bar (of 3/4) later a fourth below, turned upside down about the axis where the two pitches sum to
 * 129 or 130 (the edition writes the comes partly in the alto, partly in the tenor).
 */
import type { TouchFugue } from "./fugue.ts";

export interface CanonSpec {
  /** The leader's voice, and the voices the follower is written in. */
  dux: number;
  comes: readonly number[];
  /** How much later the follower answers, in ticks. */
  delay: number;
  /** In contrary motion: the pitches mirrored about this axis (dux + comes = 2 x axis); else at `interval` semitones. */
  contrary: boolean;
  axis?: number;
  interval?: number;
  /** What the box says the first bars (the canon's interval, its delay, its motion). */
  label: string;
}

export const CANONS: Readonly<Record<string, CanonSpec>> = {
  "bwv988-03": { dux: 0, comes: [1], delay: 11520, contrary: false, interval: 0, label: "CANON AT THE UNISON · ONE BAR LATER" },
  "bwv988-12": { dux: 0, comes: [1, 2], delay: 5760, contrary: true, axis: 64.75, label: "CANON AT THE FOURTH · IN CONTRARY MOTION" },
};

type N = { on: number; dur: number; midi: number; step: number; voice: number };
export interface EchoPair {
  a: N;
  b: N;
}

const memo = new WeakMap<TouchFugue, EchoPair[]>();
/** Each dux note and the comes note that answers it (its onset + the delay, its pitch the canon's), for a tagged canon. */
export function echoPairs(f: TouchFugue): EchoPair[] {
  const spec = CANONS[f.id];
  if (!spec) return [];
  const had = memo.get(f);
  if (had) return had;
  const at = new Map<number, N[]>();
  for (const v of spec.comes)
    for (const [on, dur, midi, step] of f.voices[v] ?? []) {
      const list = at.get(on) ?? [];
      list.push({ on, dur, midi, step, voice: v });
      at.set(on, list);
    }
  const out: EchoPair[] = [];
  for (const [on, dur, midi, step] of f.voices[spec.dux] ?? []) {
    const want = spec.contrary ? 2 * (spec.axis ?? 0) - midi : midi + (spec.interval ?? 0);
    const b = (at.get(on + spec.delay) ?? []).find((n) => Math.abs(n.midi - want) <= (spec.contrary ? 1 : 0));
    if (b) out.push({ a: { on, dur, midi, step, voice: spec.dux }, b });
  }
  memo.set(f, out);
  return out;
}

export interface EchoGeo {
  xOf: (tick: number) => number;
  yOf: (step: number) => number;
  bh: number;
  w: number;
  h: number;
  t0: number;
  t1: number;
  now: number;
  barTicks: number;
  ink: (voice: number) => string;
  /** The box's pixel text (box-fx pixText), for the canon's label. */
  text: (g: CanvasRenderingContext2D, s: string, x: number, y: number, ink: string) => void;
  fg: string;
  /** Where the box's clear part begins (past the left bar), for the label. */
  left: number;
}

/** Draws the echo lane under the notes: the arcs, the tokens in flight, the answers lit, the label at first. */
export function paintEcho(g: CanvasRenderingContext2D, f: TouchFugue, k: EchoGeo) {
  const spec = CANONS[f.id];
  const pairs = echoPairs(f);
  if (!spec || !pairs.length) return;
  const cx = (n: N) => k.xOf(n.on) + Math.max(2, (k.xOf(n.on + n.dur) - k.xOf(n.on)) / 2);
  const cy = (n: N) => k.yOf(n.step) + k.bh / 2;
  g.save();
  g.lineWidth = 1;
  for (const { a, b } of pairs) {
    if (b.on + b.dur < k.t0) continue;
    if (a.on > k.t1) break;
    const ax = cx(a), ay = cy(a), bx = cx(b), by = cy(b);
    if (Math.max(ax, bx) < 0 || Math.min(ax, bx) > k.w) continue;
    // The arc: over the notes for a canon at the same pitch, bowed through the middle for one that turns over.
    const mx = (ax + bx) / 2;
    const my = spec.contrary ? (ay + by) / 2 : Math.min(ay, by) - Math.max(10, k.bh * 2.2);
    g.globalAlpha = 0.22;
    g.strokeStyle = k.ink(b.voice);
    g.setLineDash([2, 2]);
    g.beginPath();
    g.moveTo(ax, ay);
    g.quadraticCurveTo(mx, my, bx, by);
    g.stroke();
    g.setLineDash([]);
    // In flight: a token of the note along the arc (turning over in contrary motion).
    if (k.now >= a.on && k.now < b.on) {
      const t = (k.now - a.on) / Math.max(1, b.on - a.on);
      const x = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * mx + t * t * bx;
      const y = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * my + t * t * by;
      const tw = Math.max(3, Math.min(10, (k.xOf(a.on + a.dur) - k.xOf(a.on)) * 0.5));
      const th = Math.max(2, k.bh * 0.6);
      g.save();
      g.translate(x, y);
      if (spec.contrary) g.rotate(Math.PI * t);
      g.globalAlpha = 0.75;
      g.fillStyle = k.ink(a.voice);
      g.fillRect(-tw / 2, -th / 2, tw, th);
      // Its top edge lit, so the turn shows: the light ends underneath.
      g.fillStyle = "rgba(255,255,255,0.8)";
      g.fillRect(-tw / 2, -th / 2, tw, 1);
      g.restore();
    }
    // Answered: the follower's note lit in its colour while it sounds.
    if (k.now >= b.on && k.now < b.on + b.dur) {
      const x1 = k.xOf(b.on), x2 = k.xOf(b.on + b.dur);
      g.globalAlpha = 0.5;
      g.strokeStyle = k.ink(b.voice);
      g.strokeRect(x1 - 2.5, k.yOf(b.step) - 2.5, Math.max(2, x2 - x1) + 4, k.bh + 4);
    }
  }
  // The canon named over the first bars of the follower, fading.
  const first = pairs[0].b.on;
  const fade = 1 - Math.max(0, Math.min(1, (k.now - first - 3 * k.barTicks) / (2 * k.barTicks)));
  if (k.now >= pairs[0].a.on && fade > 0) {
    g.globalAlpha = 0.85 * fade;
    k.text(g, spec.label, k.left + 6, 6, k.fg);
  }
  g.restore();
}
