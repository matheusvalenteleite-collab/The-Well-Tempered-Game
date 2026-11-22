/**
 * D970 (canons session; the owner, on the third prototype, the rolling ribbon: "better now with all segments … the best we
 * have for now"; the board: build it for the nine Goldberg canons and Inventions 2 and 8): THE ROLLING RIBBON, replacing
 * the dotted echo lane (D678, D930). The leader's line, every answered note of it, is carried in segments of about a
 * bar's breath (about 2¼ s: half a bar, a bar or two bars, whichever is nearest), each segment one rigid shape: a glowing
 * copy of those notes lifts out of the leader's line and, in one quick eased flight, slides by the canon's delay and
 * interval, turns over in contrary motion (the lit edge ends underneath) and changes from the leader's colour to the
 * follower's, leaving a short fading trail; it lands on the follower's real notes a moment before the first of them
 * sounds, and they flare in their own colour. The segments go back to back, so the line seems to peel off the leader and
 * pour into the follower. At the first entry and at each change of leader the first shape is bigger (two segments: the
 * "big morph", named by the leg's label). Adaptive density (the board): every segment for 8 bars after a big morph, then
 * every second one, until the next big morph.
 *
 * Drawing only, over the world and the other voices (which dim a little while a shape flies) and under the player's notes
 * (they never move and stay on top), but for the landing flare, an outline drawn over them; nothing judged reads it. No canvas blur (the glow is two larger, fainter rectangles),
 * for a phone's frame budget. The CANONS setting (⚙): MORPH or OFF.
 */
import type { TouchFugue } from "./fugue.ts";
import { tempoOf } from "./tempi.ts";
import { CANONS, echoPairs, type EchoGeo, type EchoNote, type EchoPair } from "./canon-echo.ts";

/* ---------- the setting ---------- */
export type CanonsMode = "morph" | "off";
const KEY = "tb-canons-v1";
let cached: CanonsMode | null = null;
/** ⚙ CANONS: MORPH (the default) or OFF. Read once, then kept (the box asks every frame). */
export function canonsMode(): CanonsMode {
  if (cached) return cached;
  try {
    cached = localStorage.getItem(KEY) === "off" ? "off" : "morph";
  } catch {
    cached = "morph";
  }
  return cached;
}
export function saveCanonsMode(m: CanonsMode) {
  cached = m;
  try {
    localStorage.setItem(KEY, m);
  } catch {
    /* not kept: the default next time */
  }
}

/* ---------- the shapes ---------- */
export interface Shape {
  leg: number;
  /** The big morph at a structural point (the first entry, a change of leader). */
  big: boolean;
  /** Drawn (adaptive density: every segment for 8 bars after a big morph, then every second one). */
  shown: boolean;
  A: EchoNote[];
  T: EchoNote[];
  contrary: boolean;
  /** The block's slide in staff steps, and the leader group's centre line (steps). */
  dS: number;
  c: number;
  tA0: number;
  tB0: number;
  /** Per note, what the block's transform leaves to its exact target (a tonal answer, a varied note): ticks and steps. */
  rT: number[];
  rS: number[];
  /** Ticks: the lift begins, the flight begins, it lands, the copy is gone. */
  start: number;
  fly: number;
  landed: number;
  end: number;
}
/** The segment's length: half a bar, a bar or two bars, whichever lasts nearest 2¼ s at the piece's tempo. */
export function unitOf(f: TouchFugue): number {
  const tps = (tempoOf(f.id) * f.tpq) / 60;
  return [0.5, 1, 2].map((k) => k * f.barTicks).sort((a, b) => Math.abs(a / tps - 2.25) - Math.abs(b / tps - 2.25))[0];
}
const memo = new WeakMap<TouchFugue, Shape[]>();
/** The canon's shapes, in time: every answered leader note in exactly one. */
export function ribbonShapes(f: TouchFugue): Shape[] {
  const spec = CANONS[f.id];
  if (!spec) return [];
  const had = memo.get(f);
  if (had) return had;
  const q = f.tpq, unit = unitOf(f);
  const flight = Math.max(1.5, Math.min(3, unit / q - 0.5)) * q;
  const pairs = echoPairs(f);
  const shapes: Shape[] = [];
  spec.legs.forEach((L, li) => {
    const run = pairs.filter((p) => p.leg === li);
    if (!run.length) return;
    // a structural point: the first leg, or a leg that changes the canon's name (a new leader); else it carries on
    const structural = li === 0 || L.label !== spec.legs[li - 1].label;
    let i = 0;
    const parts: { list: EchoPair[]; big: boolean }[] = [];
    if (structural) {
      const head = run.filter((p) => p.a.on < run[0].a.on + 2 * unit);
      parts.push({ list: head, big: true });
      i = head.length;
    }
    // the rest in segments of about a unit: cut at the first note past the unit's line, or up to a quarter of a unit before
    // it where a rest or a long note's end falls; a segment of fewer than three notes joins its neighbour
    let cur: EchoPair[] = [];
    let line = i < run.length ? run[i].a.on + unit : 0;
    const segs: EchoPair[][] = [];
    for (; i < run.length; i++) {
      const p = run[i];
      if (cur.length && p.a.on >= line - unit / 4) {
        const prev = cur[cur.length - 1].a;
        if (p.a.on >= line || p.a.on > prev.on + prev.dur || prev.dur >= unit / 2) {
          segs.push(cur);
          cur = [];
          line = p.a.on + unit;
        }
      }
      cur.push(p);
    }
    if (cur.length) segs.push(cur);
    for (let j = segs.length - 1; j >= 0; j--)
      if (segs[j].length < 3 && segs.length > 1) {
        if (j > 0) segs[j - 1].push(...segs[j]);
        else segs[1].unshift(...segs[0]);
        segs.splice(j, 1);
      }
    if (segs.length === 1 && segs[0].length < 3 && parts.length) {
      parts[0].list.push(...segs[0]);
      segs.length = 0;
    }
    for (const s of segs) parts.push({ list: s, big: false });
    // adaptive density
    const from = structural ? run[0].a.on : -Infinity;
    let n = 0;
    for (const part of parts) {
      const sh = shape(f, li, part.list, part.big, L.contrary, part.big ? 2.5 * q : flight);
      if (part.big) sh.shown = true;
      else sh.shown = sh.tA0 < from + 8 * f.barTicks || n++ % 2 === 0;
      shapes.push(sh);
    }
  });
  shapes.sort((a, b) => a.start - b.start);
  memo.set(f, shapes);
  return shapes;
}
function shape(f: TouchFugue, leg: number, list: EchoPair[], big: boolean, contrary: boolean, flight: number): Shape {
  const q = f.tpq, A = list.map((p) => p.a), T = list.map((p) => p.b);
  const tA0 = Math.min(...A.map((n) => n.on)), tB0 = Math.min(...T.map((n) => n.on));
  const lo = Math.min(...A.map((n) => n.step)), hi = Math.max(...A.map((n) => n.step)), c = (lo + hi) / 2;
  const mean = (g: (a: EchoNote, b: EchoNote) => number) => A.reduce((s, a, i) => s + g(a, T[i]), 0) / A.length;
  const dS = contrary ? mean((a, b) => b.step + a.step) - 2 * c : mean((a, b) => b.step - a.step);
  // a follower entering soon after the start (Vars. 6, 15, 18, 21): the lift at 0 and the flight shortened (to a quarter at
  // the least, Var. 6's), landing on time
  const landed = tB0 - q * 0.25;
  const start = Math.max(Math.min(0, landed - 1.25 * q), landed - flight - q * 0.25), fly = start + q * 0.25;
  const ax1 = c + dS;
  const rT = A.map((a, i) => T[i].on - (a.on + (tB0 - tA0)));
  const rS = A.map((a, i) => T[i].step - (contrary ? 2 * ax1 - (a.step + dS) : a.step + dS));
  return { leg, big, shown: true, A, T, contrary, dS, c, tA0, tB0, rT, rS, start, fly, landed, end: landed + 2 * q };
}

/* ---------- the drawing ---------- */
const ease = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const easeOut = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - (1 - u) ** 3);
const parsed = new Map<string, [number, number, number] | null>();
function rgb(c: string): [number, number, number] | null {
  let v = parsed.get(c);
  if (v === undefined) {
    v = /^#[0-9a-f]{6}$/i.test(c) ? ([1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number]) : null;
    parsed.set(c, v);
  }
  return v;
}
function mix(a: string, b: string, u: number): string {
  const A = rgb(a), B = rgb(b);
  if (!A || !B) return u < 0.5 ? a : b;
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * u)},${Math.round(A[1] + (B[1] - A[1]) * u)},${Math.round(A[2] + (B[2] - A[2]) * u)})`;
}
/** A shape's progress at tick t (one for all its notes): the lift, the flight (eased out). */
interface Phase { uL: number; u: number }
const phase = (s: Shape, t: number): Phase => ({ uL: ease((t - s.start) / Math.max(1, s.fly - s.start)), u: easeOut((t - s.fly) / Math.max(1, s.landed - s.fly)) });
interface Place { x: number; w: number; y: number; h: number }
/**
 * Where note i of a shape is at a phase, in the box's pixels: lifted, then flying: the block slid by the delay and the
 * interval, turned about its own centre line in contrary motion (its height folding through the half-turn), and the last
 * step to its exact target folded into the same flight. Worked in ticks and staff steps (the ladder is linear in steps).
 */
function place(s: Shape, i: number, ph: Phase, k: EchoGeo): Place {
  const a = s.A[i], u = ph.u;
  let st = a.step + s.dS * u, h = k.bh;
  if (s.contrary) {
    const ax = s.c + s.dS * u, c = Math.cos(Math.PI * u);
    st = ax + (st - ax) * c;
    h = Math.max(k.bh * 0.4, k.bh * Math.abs(c));
  }
  st += s.rS[i] * u;
  const tt = a.on + (s.tB0 - s.tA0 + s.rT[i]) * u, d = a.dur + (s.T[i].dur - a.dur) * u;
  const x = k.xOf(tt);
  return { x, w: Math.max(2, k.xOf(tt + d) - x - 1), y: k.yOf(st) + k.bh / 2 - 2 * ph.uL * (1 - u), h };
}
/** A shape's colour at a phase: the leader's ink to the follower's (each shape is one leader voice into one follower voice). */
const colourOf = (s: Shape, ph: Phase, k: EchoGeo) => mix(k.ink(s.A[0].voice), k.ink(s.T[0].voice), ease(ph.u));
/** Draws the ribbon: the shapes in flight and the canon named at first under the player's notes; the answers flaring as they land over them. */
export function paintCanon(g: CanvasRenderingContext2D, f: TouchFugue, k: EchoGeo, pass: "under" | "over" | "both" = "both") {
  if (canonsMode() === "off") return;
  const shapes = ribbonShapes(f);
  if (!shapes.length) return;
  const q = f.tpq;
  g.save();
  // "under": the veil, the flying copies and the labels (under the player's notes); "over": the landing flare alone, an
  // outline over the notes it lands on (the player's, where the player follows: under them it would be hidden).
  const under = pass !== "over", over = pass !== "under";
  // D970 (the board, the game against the prototype): while a shape flies, the world and the other voices dim a little
  // (they are drawn already; the player's notes come after, so they stay bright), so the copy reads as in the prototype.
  let veil = 0;
  for (const s of shapes) {
    if (!s.shown || k.now < s.start || k.now >= s.landed + q) continue;
    const inn = Math.min(1, (k.now - s.start) / (q * 0.75)), outv = Math.min(1, Math.max(0, (s.landed + q - k.now) / q));
    veil = Math.max(veil, Math.min(inn, outv) * (s.big ? 1 : 0.75));
  }
  if (veil > 0 && under) {
    g.globalAlpha = 0.3 * veil;
    g.fillStyle = "#06070f";
    g.fillRect(0, 0, k.w, k.h);
  }
  for (const s of shapes) {
    if (!s.shown || k.now < s.start || k.now >= s.end) continue;
    if (k.now < s.landed) {
      if (!under) continue;
      // the trail: the same notes a moment before, fainter, gone within half a beat
      for (let j = 4; j >= 1; j--) {
        const t = k.now - j * q * 0.07;
        if (t < s.fly) continue;
        const ph = phase(s, t);
        g.globalAlpha = 0.26 * (1 - j / 5);
        g.fillStyle = colourOf(s, ph, k);
        for (let i = 0; i < s.A.length; i++) {
          const p = place(s, i, ph, k);
          g.fillRect(p.x, p.y - p.h / 2, p.w, p.h);
        }
      }
      const ph = phase(s, k.now), col = colourOf(s, ph, k), flip = s.contrary && ph.u >= 0.5;
      for (let i = 0; i < s.A.length; i++) {
        const p = place(s, i, ph, k);
        // the glow: two larger, fainter copies (no canvas blur)
        g.fillStyle = col;
        g.globalAlpha = s.big ? 0.2 : 0.16;
        g.fillRect(p.x - 3, p.y - p.h / 2 - 3, p.w + 6, p.h + 6);
        g.globalAlpha = s.big ? 0.38 : 0.3;
        g.fillRect(p.x - 1.5, p.y - p.h / 2 - 1.5, p.w + 3, p.h + 3);
        g.globalAlpha = 0.95;
        g.fillRect(p.x, p.y - p.h / 2, p.w, p.h);
        // the lit edge: on top, underneath once turned over
        g.globalAlpha = 0.7;
        g.fillStyle = "#ffffff";
        g.fillRect(p.x, flip ? p.y + p.h / 2 - 1 : p.y - p.h / 2, p.w, 1);
      }
    } else if (over) {
      // landed: the follower's notes flare in their own colour, then settle
      const fade = 1 - (k.now - s.landed) / (s.end - s.landed);
      for (const b of s.T) {
        const x1 = k.xOf(b.on), x2 = k.xOf(b.on + b.dur), y = k.yOf(b.step);
        if (x2 < 0 || x1 > k.w) continue;
        g.strokeStyle = k.ink(b.voice);
        g.lineWidth = 1;
        g.globalAlpha = (s.big ? 0.4 : 0.3) * fade;
        g.strokeRect(x1 - 3.5, y - 3.5, Math.max(2, x2 - x1) + 6, k.bh + 7);
        g.globalAlpha = (s.big ? 0.95 : 0.85) * fade;
        g.strokeRect(x1 - 1.5, y - 1.5, Math.max(2, x2 - x1) + 2, k.bh + 3);
        g.globalAlpha = (s.big ? 0.3 : 0.18) * fade;
        g.fillStyle = "#ffffff";
        g.fillRect(x1, y, Math.max(2, x2 - x1 - 1), k.bh);
      }
    }
  }
  // Each leg named over the first bars of its follower, fading (D930): the canon at first, then each change of leader.
  const spec = CANONS[f.id];
  for (const s of shapes) {
    if (!s.big || !under) continue;
    const fadeL = 1 - Math.max(0, Math.min(1, (k.now - s.tB0 - 3 * k.barTicks) / (2 * k.barTicks)));
    if (!k.quiet && k.now >= s.start && fadeL > 0) {
      g.globalAlpha = 0.85 * fadeL;
      k.text(g, spec.legs[s.leg].label, k.left + 6, k.labelY ?? 6, k.fg);
    }
  }
  g.restore();
}
