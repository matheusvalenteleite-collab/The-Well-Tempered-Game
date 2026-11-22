/**
 * D972 (canons session; the owner, on the fugue morph gallery: "All looks good"; the board: build steps 1 and 2): THE
 * TRANSFORMED ENTRIES MORPH IN PLAY. An inverted, augmented or diminished entry is shown being made from the subject:
 *
 * - from THE ENTRY BEFORE IT, the latest plain entry of the same subject already sounding when the morph begins, if that
 *   entry's first note is still on screen then: a glowing copy of its notes lifts, slides to the new entry's time and
 *   pitch, turns upside down (inversion: its height folding through the half-turn), stretches (augmentation) or
 *   squeezes (diminution), and lands on the new entry's notes a moment before they sound;
 * - else from THE SUBJECT ITSELF (an isolated entry: the board's rule, so every entry is tied to the subject and not to a
 *   neighbour far away): a small emblem of the subject's first statement appears in the box's top margin above the
 *   entry, holds, then drops onto it the same way.
 *
 * No words (the owner: "We don't need tags … They're just cluttering"): the motion and the colour carry it. The colour moves with the shape
 * (D971): the source's ink (the subject's gold for the emblem) at lift-off, the entry's voice's at landing. Every note
 * of the entry is carried (no thinning, D971). At most one morph in 8 bars, but the first entry of each form always
 * (the board). The morph replaces the subject effect (HOP, the traveller) on the entry it builds; elsewhere it stays.
 *
 * Drawing only, as the canons' ribbon (canon-ribbon.ts, D970): over the world and the other voices (which dim a little
 * while a shape flies), under the player's notes; the landing flare drawn again over them as an outline. No canvas
 * blur. The ⚙ CANONS & FUGUES setting (MORPH / OFF) covers it.
 */
import type { TouchEntry, TouchFugue } from "./fugue.ts";
import { tempoOf } from "./tempi.ts";
import { canonsMode, ease, easeOut, mix } from "./canon-ribbon.ts";
import type { EchoGeo } from "./canon-echo.ts";

/** A note of a morph: onset, length (ticks), staff step, voice. */
export interface MorphNote { on: number; dur: number; step: number; voice: number }
export interface FugueMorph {
  /** The entry built ("voice:onset", as the box's spans are keyed). */
  key: string;
  entry: TouchEntry;
  /** The plain entry before it (null: the subject's emblem only), and the subject's first statement. */
  src: TouchEntry | null;
  subject: TouchEntry;
  /** Paired note for note: the source's (or the subject's) notes and the entry's. */
  A: MorphNote[];
  S: MorphNote[];
  T: MorphNote[];
  inv: boolean;
  ratio: number;
  tB0: number;
  /** From the neighbour: the lift, the flight, the landing. From the emblem: it appears, holds, then the same. */
  n: { start: number; fly: number; landed: number };
  e: { start: number; hold: number; fly: number; landed: number };
  end: number;
  /** Precomputed: the source's centre line and the mean step shift; the subject's span and range (the emblem). */
  c: number;
  dS: number;
  s0: number;
  s1: number;
  lo: number;
  hi: number;
  /** D973 (prototype): what is built: a transformed entry (D972), an answer in the exposition, or a stretto's entry. */
  kind: "form" | "answer" | "stretto";
  /** D973: an answer's notes that the tonal answer moves differently from the rest (they take a step of their own, last). */
  adj?: boolean[];
}

/**
 * D973 (prototype, the board: "prototype first"): the further kinds, on in the game only with `?fm=answer,stretto`
 * (play.html's address), for the gallery's live recordings; off by default, nothing changes in play without it.
 */
const PROTO: ReadonlySet<string> = (() => {
  try {
    return new Set((new URLSearchParams(globalThis.location?.search ?? "").get("fm") ?? "").split(",").filter(Boolean));
  } catch {
    return new Set();
  }
})();

const formKey = (e: TouchEntry) => `${e.theme ?? 1}:${!!e.inverted}:${e.scale ?? 1}`;
const plain = (e: TouchEntry) => !e.inverted && (e.scale ?? 1) === 1;
const transformed = (e: TouchEntry) => !!e.inverted || (e.scale ?? 1) !== 1;

const memo = new WeakMap<TouchFugue, FugueMorph[]>();
/** The fugue's morphs, in time order: its transformed entries, at most one in 8 bars, the first of each form always. */
export function fugueMorphs(f: TouchFugue): FugueMorph[] {
  const had = memo.get(f);
  if (had) return had;
  const out: FugueMorph[] = [];
  const es = [...f.entries].sort((a, b) => a.on - b.on || a.voice - b.voice);
  const q = f.tpq, bpm = tempoOf(f.id), qs = (sec: number) => ((sec * bpm) / 60) * q;
  const steps = (v: number) => {
    const m = new Map<number, number>();
    for (const n of f.voices[v]) m.set(n[0], Math.max(n[3], m.get(n[0]) ?? -Infinity));
    return m;
  };
  const stepCache = new Map<number, Map<number, number>>();
  const notesOf = (e: TouchEntry): MorphNote[] => {
    const st = stepCache.get(e.voice) ?? (stepCache.set(e.voice, steps(e.voice)), stepCache.get(e.voice)!);
    const seen = new Set<number>();
    return e.notes.filter(([on]) => st.has(on) && !seen.has(on) && (seen.add(on), true)).map(([on, dur]) => ({ on, dur, step: st.get(on)!, voice: e.voice }));
  };
  const S0of = (theme: number) => notesOf(es.find((e) => (e.theme ?? 1) === theme)!);
  /** One morph: the entry t from `src` (or the subject's emblem), its flight ending a quarter before t sounds. */
  const make = (t: TouchEntry, kind: FugueMorph["kind"], pick: (n: { start: number }) => TouchEntry | null, lead?: number): FugueMorph | null => {
    const theme = t.theme ?? 1;
    const subject = es.find((e) => (e.theme ?? 1) === theme)!;
    const T0 = notesOf(t);
    if (T0.length < 2) return null;
    const tB0 = T0[0].on;
    // the timings in quarters, never shorter than they take to read at a fast tempo
    const flight = lead ?? Math.max(2.5 * q, qs(1.4));
    const n = { landed: tB0 - q / 4, fly: 0, start: 0 };
    n.fly = n.landed - flight;
    n.start = n.fly - q / 4;
    const e = { landed: n.landed, fly: n.fly, hold: 0, start: 0 };
    e.hold = e.fly - Math.max(0.5 * q, qs(0.8));
    e.start = e.hold - Math.max(0.75 * q, qs(0.45));
    // (a fragment, fewer than four in five of the entry's notes, is no model: the emblem then)
    const S0 = S0of(theme);
    const cand = pick(n);
    const src = cand && notesOf(cand).length >= 0.8 * Math.min(T0.length, S0.length) ? cand : null;
    const A0 = src ? notesOf(src) : [];
    const len = Math.min(T0.length, S0.length, src ? A0.length : Infinity);
    const model = src ?? subject, inv = !!t.inverted !== !!model.inverted, ratio = (t.scale ?? 1) / (model.scale ?? 1);
    const A = A0.slice(0, len), S = S0.slice(0, len), T = T0.slice(0, len);
    let c = 0, dS = 0, adj: boolean[] | undefined;
    if (A.length) {
      const lo = Math.min(...A.map((x) => x.step)), hi = Math.max(...A.map((x) => x.step));
      c = (lo + hi) / 2;
      const mean = (fn: (x: MorphNote, y: MorphNote) => number) => A.reduce((sum, x, j) => sum + fn(x, T[j]), 0) / A.length;
      dS = inv ? mean((x, y) => y.step + x.step) - 2 * c : mean((x, y) => y.step - x.step);
      if (kind === "answer" && !inv) {
        // the transposition: the shift most notes take; the others (the tonal answer's) move on their own at the end
        const count = new Map<number, number>();
        for (let j = 0; j < A.length; j++) count.set(T[j].step - A[j].step, (count.get(T[j].step - A[j].step) ?? 0) + 1);
        dS = [...count.entries()].sort((x, y) => y[1] - x[1])[0][0];
        adj = A.map((x, j) => T[j].step - x.step !== dS);
        // more than three notes apart is not a tonal answer's adjustment but a varied line: moved as one, blended
        if (adj.filter(Boolean).length > 3) (adj = undefined), (dS = mean((x, y) => y.step - x.step));
      }
    }
    return {
      key: `${t.voice}:${t.on}`, entry: t, src, subject, A, S, T, inv, ratio, tB0, n, e,
      end: n.landed + 2 * q, kind, adj,
      c, dS, s0: S[0].on, s1: S[S.length - 1].on + S[S.length - 1].dur, lo: Math.min(...S.map((x) => x.step)), hi: Math.max(...S.map((x) => x.step)),
    };
  };
  const seen = new Set<string>();
  let last = -Infinity;
  for (const t of es) {
    if (!transformed(t)) continue;
    const fk = formKey(t), first = !seen.has(fk);
    seen.add(fk);
    if (!first && t.on < last + 8 * f.barTicks) continue;
    const theme = t.theme ?? 1;
    const subject = es.find((e) => (e.theme ?? 1) === theme)!;
    if (subject === t && !subject.inverted && (subject.scale ?? 1) === 1) continue;
    // the neighbour: the latest plain entry of this subject already sounding as the morph lifts off
    const m = make(t, "form", (n) => [...es].reverse().find((x) => x !== t && plain(x) && (x.theme ?? 1) === theme && x.on <= n.start) ?? null);
    if (!m) continue;
    out.push(m);
    last = t.on;
  }
  const taken = new Set(out.map((m) => m.entry));
  if (PROTO.has("answer")) {
    // D973: the exposition's answers (its first entries, one a voice), each built from the entry before it
    const expo = es.filter((e) => (e.theme ?? 1) === 1).slice(0, f.voices.length);
    for (const t of expo) {
      if (t.form !== "answer" || !plain(t) || taken.has(t)) continue;
      const m = make(t, "answer", (n) => [...expo].reverse().find((x) => x !== t && x.on <= n.start && plain(x)) ?? null);
      if (m) (out.push(m), taken.add(t));
    }
  }
  if (PROTO.has("stretto")) {
    // D973: a stretto's entry, built from the entry it overlaps while both sound (a short flight from the moment the
    // first comes in); at most one in 8 bars
    let lastS = -Infinity;
    const expo = new Set(es.filter((e) => (e.theme ?? 1) === 1).slice(0, f.voices.length));
    for (const t of es) {
      if (taken.has(t) || expo.has(t) || t.on < lastS + 8 * f.barTicks) continue;
      // a stretto: it comes in within the first half of the entry it overlaps
      const p = [...es].reverse().find((x) => x !== t && (x.theme ?? 1) === (t.theme ?? 1) && x.voice !== t.voice && x.on < t.on && t.on - x.on <= 0.5 * (x.end - x.on));
      if (!p) continue;
      // the lift as the first entry sounds: the flight from then to a quarter before the second comes in
      const lead = t.on - q / 4 - (p.on + q / 4);
      if (lead < qs(0.45)) continue;
      const m = make(t, "stretto", () => p, Math.min(lead, Math.max(2.5 * q, qs(1.4))));
      if (m && m.src) (out.push(m), taken.add(t), (lastS = t.on));
    }
  }
  out.sort((a, b) => a.n.start - b.n.start);
  memo.set(f, out);
  return out;
}

/** The entries a morph builds ("voice:onset"): the box leaves their subject effect off while the morphs are on. */
export function morphedKeys(f: TouchFugue): ReadonlySet<string> {
  if (canonsMode() === "off") return EMPTY;
  return keyMemo.get(f) ?? (keyMemo.set(f, new Set(fugueMorphs(f).map((m) => m.key))), keyMemo.get(f)!);
}
const EMPTY: ReadonlySet<string> = new Set();
const keyMemo = new WeakMap<TouchFugue, Set<string>>();

/** The box's geometry, as the canons' (canon-echo.ts EchoGeo), with the subject's gold for the emblem. */
export type MorphGeo = EchoGeo & {
  gold: string;
  /** The lowest entry tab's bottom over these columns (0: none): the emblem stands under them. */
  tabsBelow?: (x0: number, x1: number) => number;
};

/** From the neighbour if its first note is on screen as the morph lifts off (the box's view runs `now - t0` behind). */
export const fromNeighbour = (m: FugueMorph, k: { now: number; t0: number }) => !!m.src && m.src.on >= m.n.start - (k.now - k.t0);

interface Rect { x: number; w: number; y: number; h: number; col: string; flip: boolean; hot?: number }

/** A note of a morph from the neighbour at tick t: lifted, slid, turned, stretched, its last step to the target. */
function neighbourAt(m: FugueMorph, i: number, t: number, k: MorphGeo): Rect {
  const a = m.A[i], b = m.T[i], c = m.c, dS = m.dS;
  const uL = ease((t - m.n.start) / Math.max(1, m.n.fly - m.n.start));
  const u = easeOut((t - m.n.fly) / Math.max(1, m.n.landed - m.n.fly));
  const tA0 = m.A[0].on;
  const base = (uu: number) => {
    let tt = a.on + (m.tB0 - tA0) * uu, d = a.dur;
    if (m.ratio !== 1) { const f = 1 + (m.ratio - 1) * uu; tt = m.tB0 + (tt - m.tB0) * f; d *= f; }
    let st = a.step + dS * uu, cos = 1;
    if (m.inv) { const ax = c + dS * uu; cos = Math.cos(Math.PI * uu); st = ax + (st - ax) * cos; }
    return { tt, d, st, cos };
  };
  const B = base(u), E = base(1);
  // D973: an answer's adjusted note keeps the transposition's path, then takes its own step at the end
  const ru = m.adj?.[i] ? ease((u - 0.6) / 0.4) : u;
  const tt = B.tt + (b.on - E.tt) * u, d = B.d + (b.dur - E.d) * u, st = B.st + (b.step - E.st) * ru;
  const x = k.xOf(tt);
  // D973: its own step drawn as a small soft arc, the note lit while it takes it
  const own = m.adj?.[i] && ru > 0 && ru < 1 ? Math.sin(Math.PI * ru) : 0;
  return {
    hot: own,
    x, w: Math.max(2, k.xOf(tt + d) - x - 1), y: k.yOf(st) + k.bh / 2 - 2 * uL * (1 - u) - own * k.bh * 1.5,
    h: m.inv ? Math.max(k.bh * 0.4, k.bh * Math.abs(B.cos)) : k.bh,
    col: mix(k.ink(a.voice), k.ink(b.voice), u), flip: m.inv && u >= 0.5,
  };
}

/** Where the emblem stands: above the entry, kept inside the box (at a fast tempo the entry is still off its right edge). */
function emblemX(m: FugueMorph, k: MorphGeo, width: number): number {
  const right = k.w - k.left - 4 - width;
  return Math.max(k.left + 4, Math.min(k.xOf(m.tB0), right));
}
/** The emblem: the subject's first statement, small, in the top margin above the entry; then it drops onto it. */
function emblemAt(m: FugueMorph, i: number, t: number, k: MorphGeo, top: number): Rect & { a: number } {
  const S = m.S, b = m.T[i], s0 = m.s0, s1 = m.s1, lo = m.lo, hi = m.hi;
  const px = (k.xOf(s1) - k.xOf(s0)), sc = Math.min(1, (k.w * 0.4) / Math.max(1, px));
  const X = emblemX(m, k, px * sc), HM = Math.max(8, Math.round(k.bh * 2.5)), eh = Math.max(2, Math.round(k.bh * 0.5));
  const a = S[i];
  const ex = X + (k.xOf(a.on) - k.xOf(s0)) * sc, ew = Math.max(1, (k.xOf(a.on + a.dur) - k.xOf(a.on)) * sc - 1);
  const ey = top + 2 + ((hi - a.step) / Math.max(1, hi - lo)) * (HM - eh) + eh / 2, cE = top + 2 + HM / 2;
  const uA = ease((t - m.e.start) / Math.max(1, m.e.hold - m.e.start));
  const u = easeOut((t - m.e.fly) / Math.max(1, m.e.landed - m.e.fly));
  const tx = k.xOf(b.on), tw = Math.max(2, k.xOf(b.on + b.dur) - tx - 1), ty = k.yOf(b.step) + k.bh / 2;
  let cos = 1, y0 = ey;
  if (m.inv) { cos = Math.cos(Math.PI * u); y0 = cE + (ey - cE) * cos; }
  const h = (eh + (k.bh - eh) * u) * (m.inv ? Math.max(0.4, Math.abs(cos)) : 1);
  return { x: ex + (tx - ex) * u, w: ew + (tw - ew) * u, y: y0 + (ty - y0) * u, h, col: mix(k.gold, k.ink(b.voice), u), flip: m.inv && u >= 0.5, a: uA };
}

/**
 * Draws the morphs: "under" the veil, the flying copies and the emblem (under the player's notes); "over" the
 * landing flare alone, an outline over the notes it lands on.
 */
export function paintFugueMorphs(g: CanvasRenderingContext2D, f: TouchFugue, k: MorphGeo, pass: "under" | "over" | "both" = "both") {
  if (canonsMode() === "off") return;
  const ms = fugueMorphs(f);
  if (!ms.length) return;
  const q = f.tpq, under = pass !== "over", over = pass !== "under";
  g.save();
  for (const m of ms) {
    if (k.now >= m.end || k.now < m.e.start) continue;
    const near = fromNeighbour(m, k);
    const start = near ? m.n.start : m.e.start;
    if (k.now < start) continue;
    if (under && k.now < m.n.landed + q) {
      // the veil: the world and the other voices dim while it flies
      const inn = Math.min(1, (k.now - start) / (q * 0.75)), out = Math.min(1, Math.max(0, (m.n.landed + q - k.now) / q));
      g.globalAlpha = 0.3 * Math.min(inn, out);
      g.fillStyle = "#06070f";
      g.fillRect(0, 0, k.w, k.h);
    }
    if (under && k.now < m.n.landed) {
      // the emblem's band: in the top margin, under any entry tab over its columns (kept clear of the flags)
      const top = Math.max((k.labelY ?? 6) + 10, (k.tabsBelow ? k.tabsBelow(Math.min(k.xOf(m.tB0), k.w - k.left - k.w * 0.4) - 4, k.w) : 0) + 3);
      if (!near) {
        // the emblem's frame, until it leaves
        const first = emblemAt(m, 0, k.now, k, top), lastN = emblemAt(m, m.S.length - 1, k.now, k, top);
        const fade = k.now < m.e.fly ? first.a : Math.max(0, 1 - (k.now - m.e.fly) / (q * 0.75));
        if (fade > 0 && k.now < m.e.fly + q) {
          const x0 = Math.round(first.x) - 3, x1 = Math.round(lastN.x + lastN.w) + 3, hm = Math.max(8, Math.round(k.bh * 2.5));
          g.globalAlpha = 0.85 * fade;
          g.fillStyle = "#0b0d18";
          g.fillRect(x0, top - 1, x1 - x0, hm + 6);
          g.globalAlpha = fade;
          g.strokeStyle = k.gold;
          g.lineWidth = 1;
          g.strokeRect(x0 + 0.5, top - 0.5, x1 - x0 - 1, hm + 5);
        }
      } else {
        // the trail
        for (let j = 4; j >= 1; j--) {
          const t = k.now - j * q * 0.07;
          if (t < m.n.fly) continue;
          g.globalAlpha = 0.26 * (1 - j / 5);
          for (let i = 0; i < m.T.length; i++) {
            const r = neighbourAt(m, i, t, k);
            g.fillStyle = r.col;
            g.fillRect(r.x, r.y - r.h / 2, r.w, r.h);
          }
        }
      }
      for (let i = 0; i < m.T.length; i++) {
        const r = near ? neighbourAt(m, i, k.now, k) : emblemAt(m, i, k.now, k, top);
        const al = near ? 1 : (r as Rect & { a: number }).a;
        g.fillStyle = r.col;
        g.globalAlpha = 0.18 * al;
        g.fillRect(r.x - 3, r.y - r.h / 2 - 3, r.w + 6, r.h + 6);
        g.globalAlpha = 0.36 * al;
        g.fillRect(r.x - 1.5, r.y - r.h / 2 - 1.5, r.w + 3, r.h + 3);
        g.globalAlpha = 0.95 * al;
        g.fillRect(r.x, r.y - r.h / 2, r.w, r.h);
        if (r.hot) {
          // an answer's adjusted note, lit while it takes its own step
          g.globalAlpha = 0.5 * r.hot * al;
          g.fillStyle = "#ffffff";
          g.fillRect(r.x, r.y - r.h / 2, r.w, r.h);
        }
        g.globalAlpha = 0.7 * al;
        g.fillStyle = "#ffffff";
        g.fillRect(r.x, r.flip ? r.y + r.h / 2 - 1 : r.y - r.h / 2, r.w, 1);
      }
    }
    if (over && k.now >= m.n.landed - q / 4) {
      // landed: the entry's notes flare in their own colour (an outline over them), then settle
      const fade = Math.max(0, 1 - (k.now - m.n.landed) / (m.end - m.n.landed));
      for (const b of m.T) {
        const x1 = k.xOf(b.on), x2 = k.xOf(b.on + b.dur), y = k.yOf(b.step);
        if (x2 < 0 || x1 > k.w) continue;
        g.strokeStyle = k.ink(b.voice);
        g.lineWidth = 1;
        g.globalAlpha = 0.4 * fade;
        g.strokeRect(x1 - 3.5, y - 3.5, Math.max(2, x2 - x1) + 6, k.bh + 7);
        g.globalAlpha = 0.95 * fade;
        g.strokeRect(x1 - 1.5, y - 1.5, Math.max(2, x2 - x1) + 2, k.bh + 3);
        g.globalAlpha = 0.3 * fade;
        g.fillStyle = "#ffffff";
        g.fillRect(x1, y, Math.max(2, x2 - x1 - 1), k.bh);
      }
    }
  }
  g.restore();
}
