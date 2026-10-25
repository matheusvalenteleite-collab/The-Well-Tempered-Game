/**
 * Design study (not in play): sixteen other ways to draw LADDER's music box, chosen by the page's query
 * (`bench.html?boxv=N`; `&auto=1` plays the voice by itself, for screenshots). Without the query the box is
 * drawn as before (MusicBox.paint) and nothing here runs.
 *
 * Each variant is one idea: a layout (where the steps lie: every voice at full size, the player's zone
 * lined up with the side bars), a palette, how a note is drawn, and how a subject entry's START and END
 * are marked. The layouts:
 *   full    one ladder over the whole piece's range, every row the same height; the player's zone (the
 *           part the bars map) a band of it.
 *   fish    the player's zone in tall rows, the steps above and below in shorter ones (never squeezed
 *           below 3 px): a lens on the player's register.
 *   staves  one band per voice, top voice first, like a score's system; the player's band tall.
 */
import { keyWords, pixText, sparks, strikes, textWidth, type Span } from "./box-fx.ts";
import type { Frame } from "./MusicBox.tsx";
import type { LaneNote } from "./lanes.ts";

const PX = 2;
const BARS_SHOWN = 3;
const PLAYHEAD = 0.25;

function query(name: string): string | null {
  try {
    return typeof location === "undefined" ? null : new URLSearchParams(location.search).get(name);
  } catch {
    return null;
  }
}
/** The variant asked for by the page's query (0: the box as it is). */
export const BOXV: number = Number(query("boxv")) || 0;
/** `&auto=1`: the voice plays itself (screenshots). */
export const AUTO: boolean = query("auto") === "1";

export type LayoutKind = "full" | "fish" | "staves";
export interface LayoutIn {
  /** The player's zone (the steps the bars map). */
  lo: number;
  hi: number;
  /** The whole piece's range. */
  spill?: { lo: number; hi: number };
  /** Each voice's range (staves). */
  ranges?: { lo: number; hi: number }[];
  voice: number;
}
export interface Layout {
  /** A step's row: its top and height (canvas px); `voice` matters only for staves. */
  y: (step: number, voice?: number) => number;
  rh: (step: number, voice?: number) => number;
  /** The player's zone (canvas px) and its row height. */
  zone: { top: number; bot: number };
  A: number;
  /** The whole ladder's range. */
  LO: number;
  HI: number;
  bands?: { voice: number; top: number; bot: number; lo: number; hi: number; rh: number }[];
}

export function layoutOf(kind: LayoutKind, L: LayoutIn, h: number): Layout {
  const HI = Math.max(L.hi, (L.spill?.hi ?? L.hi) + 1);
  const LO = Math.min(L.lo, (L.spill?.lo ?? L.lo) - 1);
  if (kind === "staves" && L.ranges?.length) {
    const V = L.ranges.length;
    const span = (v: number) => (v === L.voice ? { lo: L.lo, hi: L.hi } : { lo: L.ranges![v].lo, hi: L.ranges![v].hi });
    const gap = 3;
    let A = 12;
    let B = 2;
    for (; A > 2; A--) {
      B = Math.max(2, Math.floor(A * 0.5));
      let tot = gap * (V - 1);
      for (let v = 0; v < V; v++) tot += (span(v).hi - span(v).lo + 1) * (v === L.voice ? A : B);
      if (tot <= h) break;
    }
    let tot = gap * (V - 1);
    for (let v = 0; v < V; v++) tot += (span(v).hi - span(v).lo + 1) * (v === L.voice ? A : B);
    let y = Math.max(0, Math.floor((h - tot) / 2));
    const bands = L.ranges.map((_, v) => {
      const s = span(v);
      const rh = v === L.voice ? A : B;
      const b = { voice: v, top: y, bot: y + (s.hi - s.lo + 1) * rh, lo: s.lo, hi: s.hi, rh };
      y = b.bot + gap;
      return b;
    });
    const band = (v?: number) => bands[v ?? L.voice] ?? bands[L.voice];
    const me = bands[L.voice];
    return {
      y: (s, v) => {
        const b = band(v);
        return b.top + (b.hi - Math.max(b.lo, Math.min(b.hi, s))) * b.rh;
      },
      rh: (_s, v) => band(v).rh,
      zone: { top: me.top, bot: me.bot },
      A,
      LO,
      HI,
      bands,
    };
  }
  if (kind === "fish") {
    const nz = L.hi - L.lo + 1;
    const na = HI - L.hi;
    const nb = L.lo - LO;
    let A = 14;
    let B = 3;
    for (; A > 3; A--) {
      B = Math.min(A, Math.max(3, Math.ceil(A * 0.55)));
      if (A * nz + B * (na + nb) <= h) break;
    }
    const top = Math.floor((h - (A * nz + B * (na + nb))) / 2);
    const zt = top + na * B;
    const zb = zt + nz * A;
    return {
      y: (s) => (s > L.hi ? top + (HI - s) * B : s >= L.lo ? zt + (L.hi - s) * A : zb + (L.lo - 1 - s) * B),
      rh: (s) => (s > L.hi || s < L.lo ? B : A),
      zone: { top: zt, bot: zb },
      A,
      LO,
      HI,
    };
  }
  const rows = HI - LO + 1;
  const A = Math.max(2, Math.floor(h / rows));
  const top = Math.floor((h - A * rows) / 2);
  return {
    y: (s) => top + (HI - s) * A,
    rh: () => A,
    zone: { top: top + (HI - L.hi) * A, bot: top + (HI - L.lo + 1) * A },
    A,
    LO,
    HI,
  };
}

/** The bars' rows for a variant (CSS px from the box's top): its player zone, linear in steps. */
export function variantRows(L: LayoutIn, cssH: number): { yOf: (step: number) => number; rowH: number } | null {
  const v = VARIANTS[BOXV];
  if (!v) return null;
  const lay = layoutOf(v.layout, L, Math.max(1, Math.floor(cssH / PX)));
  // Linear through the player's zone (and on beyond it, as the bars reckon).
  const top = lay.y(L.hi, L.voice);
  return { yOf: (s) => (top + (L.hi - s) * lay.A + lay.A / 2) * PX, rowH: lay.A * PX };
}

// ---------------------------------------------------------------------------------------------------
// What every variant is given.

interface N {
  on: number;
  dur: number;
  step: number;
  voice: number;
  mine: boolean;
  state?: LaneNote["state"];
  at?: number;
  ride?: boolean;
  /** The entry it belongs to (subject or answer), if any. */
  span?: Span;
}
interface Entry {
  s: Span;
  x1: number;
  x2: number;
  /** The entry's notes' extent (canvas px). */
  top: number;
  bot: number;
  color: string;
  mine: boolean;
  num: number;
  label: string;
  short: string;
  stretto: boolean;
  sounding: boolean;
  /** 0..1 how far through it the music is. */
  through: number;
}
interface V {
  g: CanvasRenderingContext2D;
  w: number;
  h: number;
  fr: Frame;
  lay: Layout;
  xOf: (t: number) => number;
  playX: number;
  /** Row top and height of a note. */
  y: (n: { step: number; voice: number }) => number;
  rh: (n: { step: number; voice: number }) => number;
  notes: N[];
  entries: Entry[];
  ink: (v: number) => string;
  name: (v: number) => string;
  gold: string;
  miss: string;
  shine: string;
  /** Ticks since a note was struck (Infinity if not). */
  since: (n: N) => number;
}

type Painter = (v: V) => void;
interface Variant {
  name: string;
  layout: LayoutKind;
  /** The voices' inks (top voice first), when the variant has its own palette. */
  inks?: string[];
  gold?: string;
  paint: Painter;
}

const INK4 = ["#5cb2ff", "#ff8c4a", "#c78bff", "#5fe08a"];
function inkFor(inks: string[], v: number, count: number): string {
  if (count === 2) return [inks[0], inks[3]][v];
  if (count === 3) return [inks[0], inks[1], inks[3]][v];
  return inks[v % inks.length];
}

/** Draws variant BOXV in place of the box (true if it did). */
export function paintVariant(g: CanvasRenderingContext2D, w: number, h: number, fr: Frame): boolean {
  const vt = VARIANTS[BOXV];
  if (!vt) return false;
  const lay = layoutOf(vt.layout, { lo: fr.lo, hi: fr.hi, spill: fr.spill, ranges: fr.ranges, voice: fr.voice }, h);
  const span = BARS_SHOWN * fr.barTicks;
  const t0 = fr.now - PLAYHEAD * span;
  const xOf = (tick: number) => Math.round(((tick - t0) / span) * w);
  const inks = vt.inks ?? INK4;
  const ink = (v: number) => inkFor(inks, v, fr.count);
  const css = getComputedStyle(g.canvas);
  const gold = vt.gold ?? (css.getPropertyValue("--tg-gold").trim() || "#ffd166");
  const subj = (fr.spans ?? []).filter((s) => s.form !== "counter");
  const byNote = new Map<string, Span>();
  for (const s of subj) for (const n of s.path) byNote.set(`${s.voice}:${n.on}`, s);
  const notes: N[] = [];
  for (const o of fr.others) {
    if (xOf(o.on) > w + 4) break;
    if (xOf(o.on + o.dur) < -4) continue;
    notes.push({ on: o.on, dur: o.dur, step: o.step, voice: o.voice, mine: false, span: byNote.get(`${o.voice}:${o.on}`) });
  }
  for (const n of fr.notes) {
    if (xOf(n.on) > w + 4) break;
    if (xOf(n.on + n.dur) < -4) continue;
    notes.push({ on: n.on, dur: n.dur, step: n.step, voice: fr.voice, mine: true, state: n.state, at: n.at, ride: n.ride, span: byNote.get(`${fr.voice}:${n.on}`) });
  }
  const y = (n: { step: number; voice: number }) => lay.y(n.step, n.voice);
  const rh = (n: { step: number; voice: number }) => lay.rh(n.step, n.voice);
  const names = fr.names ?? [];
  const name = (v: number) => (names[v] ?? `VOICE ${v + 1}`).toUpperCase();
  const entries: Entry[] = [];
  subj.forEach((s, k) => {
    const x1 = xOf(s.on);
    const x2 = xOf(s.end);
    if (x2 < -2 || x1 > w + 2 || !s.path.length) return;
    let top = Infinity;
    let bot = -Infinity;
    for (const n of s.path) {
      const yy = lay.y(n.step, s.voice);
      top = Math.min(top, yy);
      bot = Math.max(bot, yy + lay.rh(n.step, s.voice));
    }
    const st = fr.entryState?.get(`${s.voice}:${s.on}`);
    const mine = s.voice === fr.voice;
    const color = st === "lost" ? css.getPropertyValue("--tg-miss").trim() || "#6a5f6a" : mine || st === "captured" ? gold : ink(s.voice);
    const stretto = subj.some((o) => o !== s && o.voice !== s.voice && s.on > o.on && s.on < o.end);
    // D265: every entry a SUBJECT.
    const what = `SUBJECT${s.theme ? ` ${s.theme}` : ""}`;
    entries.push({
      s,
      x1,
      x2,
      top,
      bot,
      color,
      mine,
      num: k + 1,
      label: `${what} · ${name(s.voice)} · ${keyWords(s.key)}${stretto ? " · STRETTO" : ""}`,
      short: `${what} · ${name(s.voice)}`,
      stretto,
      sounding: fr.now >= s.on && fr.now < s.end,
      through: Math.max(0, Math.min(1, (fr.now - s.on) / Math.max(1, s.end - s.on))),
    });
  });
  const v: V = {
    g,
    w,
    h,
    fr,
    lay,
    xOf,
    playX: xOf(fr.now),
    y,
    rh,
    notes,
    entries,
    ink,
    name,
    gold,
    miss: css.getPropertyValue("--tg-miss").trim() || "#6a5f6a",
    shine: css.getPropertyValue("--tg-shine").trim() || "#fff6d0",
    since: (n) => (n.at === undefined ? Infinity : (fr.now - n.at) / fr.tps),
  };
  g.save();
  g.globalAlpha = 1;
  vt.paint(v);
  g.restore();
  // What the playing throws up stays the same in every variant: the strikes, points and bursts.
  const fx = { g, w, h, xOf, yOf: (s: number) => lay.y(s, fr.voice), hOf: (s: number) => lay.rh(s, fr.voice), bh: lay.A, now: fr.now, tps: fr.tps, gold, miss: v.miss, fg: "#ecead9", ink };
  sparks(fx, fr.pops ?? [], fr.bursts ?? []);
  g.globalAlpha = 1;
  return true;
}

// ---------------------------------------------------------------------------------------------------
// Little tools.

function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string, a = 1) {
  if (w <= 0 || h <= 0) return;
  g.globalAlpha = a;
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  g.globalAlpha = 1;
}
function frame1(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string, a = 1) {
  rect(g, x, y, w, 1, c, a);
  rect(g, x, y + h - 1, w, 1, c, a);
  rect(g, x, y + 1, 1, h - 2, c, a);
  rect(g, x + w - 1, y + 1, 1, h - 2, c, a);
}
/** Mixes two #rrggbb colours. */
function mix(a: string, b: string, t: number): string {
  const p = (h: string) => {
    const n = parseInt(h.replace("#", "").slice(0, 6), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  };
  const [x, y] = [p(a), p(b)];
  return `#${x.map((c, i) => Math.round(c + (y[i] - c) * t).toString(16).padStart(2, "0")).join("")}`;
}
const pats = new Map<string, CanvasPattern | null>();
/** A repeating 1-bit pattern ("1" inked) in a colour. */
function pattern(g: CanvasRenderingContext2D, rows: string[], color: string): CanvasPattern | string {
  const key = rows.join("/") + color;
  if (!pats.has(key)) {
    const c = document.createElement("canvas");
    c.width = rows[0].length;
    c.height = rows.length;
    const x = c.getContext("2d")!;
    x.fillStyle = color;
    rows.forEach((r, j) => [...r].forEach((ch, i) => ch === "1" && x.fillRect(i, j, 1, 1)));
    pats.set(key, g.createPattern(c, "repeat"));
  }
  return pats.get(key) ?? color;
}
function fillPat(g: CanvasRenderingContext2D, rows: string[], color: string, x: number, y: number, w: number, h: number, a = 1) {
  if (w <= 0 || h <= 0) return;
  g.globalAlpha = a;
  g.fillStyle = pattern(g, rows, color);
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  g.globalAlpha = 1;
}
const CHECK = ["10", "01"];
const SPARSE = ["1000", "0000", "0010", "0000"];
const HSTRIPE = ["1", "0"];
const DIAG = ["1000", "0100", "0010", "0001"];

function beats(v: V, bar: string, beat: string | null, a = 1) {
  const { fr, xOf, w, h, g } = v;
  const span = BARS_SHOWN * fr.barTicks;
  const t0 = fr.now - PLAYHEAD * span;
  for (let t = Math.floor(t0 / fr.beatTicks) * fr.beatTicks; t < t0 + span; t += fr.beatTicks) {
    const isBar = t % fr.barTicks === 0;
    if (!isBar && !beat) continue;
    rect(g, xOf(t), 0, 1, h, isBar ? bar : beat!, a);
  }
  void w;
}
/** A text tag on a plate. */
function tag(g: CanvasRenderingContext2D, text: string, x: number, y: number, fg: string, plate: string | null, a = 0.85): number {
  const tw = textWidth(text);
  if (plate) rect(g, x - 2, y - 2, tw + 3, 9, plate, a);
  pixText(g, text, x, y, fg);
  return tw;
}
/** Overlapping entries' tags, one above another: each entry's level (0: lowest). */
function levels(es: Entry[], width: (e: Entry) => number): Map<Entry, number> {
  const out = new Map<Entry, number>();
  const placed: { a: number; b: number; k: number }[] = [];
  for (const e of [...es].sort((p, q) => p.x1 - q.x1)) {
    let k = 0;
    while (placed.some((p) => p.k === k && p.a < e.x1 + width(e) + 4 && e.x1 < p.b + 4)) k++;
    placed.push({ a: e.x1, b: Math.max(e.x2, e.x1 + width(e)), k });
    out.set(e, k);
  }
  return out;
}
/**
 * Tags placed over the entries without colliding (a stretto's tags one above another): each entry's tag
 * top, starting from where it wants to be and lifted by a line while it would meet one already placed.
 */
function stack(es: Entry[], want: (e: Entry) => number, width: (e: Entry) => number, line = 9): Map<Entry, number> {
  const out = new Map<Entry, number>();
  const placed: { a: number; b: number; y: number }[] = [];
  for (const e of [...es].sort((p, q) => p.x1 - q.x1)) {
    let y = want(e);
    for (let moved = true; moved; ) {
      moved = false;
      for (const p of placed)
        if (p.a < e.x1 + width(e) + 3 && e.x1 < p.b + 3 && Math.abs(p.y - y) < line) {
          y = p.y - line;
          moved = true;
        }
    }
    y = Math.max(1, y);
    placed.push({ a: e.x1, b: e.x1 + width(e), y });
    out.set(e, y);
  }
  return out;
}
/** A flat block with an optional state (the player's: struck shines, missed goes dark). */
function playerFill(v: V, n: N, base: string, dark: string): string {
  if (n.state === "miss") return v.miss;
  if (n.state === "hit") return v.since(n) < 0.25 ? v.shine : base;
  return n.on < v.fr.now - v.fr.beatTicks ? dark : base;
}
function cadences(v: V, color: string, y?: number) {
  const { g, fr, xOf, w, h } = v;
  for (const cd of fr.cadences ?? []) {
    const x = xOf(cd.on);
    if (x < -60 || x > w) continue;
    const yy = y ?? h - 7;
    rect(g, x, yy - 1, 1, 7, color, 0.8);
    pixText(g, cd.text, Math.min(x + 3, w - textWidth(cd.text) - 2), yy, color);
  }
  g.globalAlpha = 1;
}
function playhead(v: V, color: string, a = 1) {
  rect(v.g, v.playX, 0, 1, v.h, color, a);
}
/** A note's ends, clipped to the box. */
function ends(v: V, n: { on: number; dur: number }): [number, number] {
  const a = v.xOf(n.on);
  const b = v.xOf(n.on + n.dur);
  return [a, Math.max(a + 1, b - 1)];
}
/** The subject's notes as they are played: the shared flash. */
function flash(v: V) {
  strikes({ g: v.g, w: v.w, h: v.h, xOf: v.xOf, yOf: (s) => v.lay.y(s, v.fr.voice), hOf: (s) => v.lay.rh(s, v.fr.voice), bh: v.lay.A, now: v.fr.now, tps: v.fr.tps, gold: v.gold, miss: v.miss, fg: "#fff", ink: v.ink }, v.entries.filter((e) => e.s.voice === v.fr.voice).map((e) => e.s));
}
/** Small pixel sprites (rows of "1"). */
function sprite(g: CanvasRenderingContext2D, rows: string[], x: number, y: number, color: string, a = 1) {
  g.globalAlpha = a;
  g.fillStyle = color;
  rows.forEach((r, j) => [...r].forEach((ch, i) => ch === "1" && g.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1)));
  g.globalAlpha = 1;
}
const FLAG = ["11110", "11111", "11110", "10000"];
const GOAL = ["1010", "0101", "1010", "0101"];
const RING = ["01110", "10001", "10001", "10001", "01110"];
const FLEURON = ["01010", "11111", "01110", "00100", "00100"];
/** Steps of a grand staff (C4 = 28): the treble's lines E4..F5, the bass's G2..A3. */
const STAFF = [30, 32, 34, 36, 38, 18, 20, 22, 24, 26];

/** The player's zone: two hairlines (what the bars map). */
function zoneLines(v: V, color: string, a: number) {
  rect(v.g, 0, v.lay.zone.top - 1, v.w, 1, color, a);
  rect(v.g, 0, v.lay.zone.bot, v.w, 1, color, a);
}
/** A note as a head (oval) of its row's height and a thin tail for its length. */
function head(g: CanvasRenderingContext2D, x: number, y: number, h: number, c: string, filled = true) {
  const hw = Math.max(3, Math.min(6, h + 1));
  const hh = Math.max(2, h - 1);
  if (filled) {
    rect(g, x + 1, y, hw - 2, hh, c);
    rect(g, x, y + (hh > 2 ? 1 : 0), hw, Math.max(1, hh - (hh > 2 ? 2 : 0)), c);
  } else {
    rect(g, x + 1, y, hw - 2, 1, c);
    rect(g, x + 1, y + hh - 1, hw - 2, 1, c);
    rect(g, x, y + 1, 1, Math.max(1, hh - 2), c);
    rect(g, x + hw - 1, y + 1, 1, Math.max(1, hh - 2), c);
  }
  return hw;
}

// ---------------------------------------------------------------------------------------------------
// The variants.

const VARIANTS: Record<number, Variant> = {
  /** 1. Grand staff: real staff lines, noteheads, a thin line for each note's length; the entry under a bracket. */
  1: {
    name: "STAFF",
    layout: "full",
    paint(v) {
      const { g, w, h } = v;
      rect(g, 0, 0, w, h, "#10131c");
      rect(g, 0, v.lay.zone.top, w, v.lay.zone.bot - v.lay.zone.top, "#161b28");
      for (const s of STAFF) if (s <= v.lay.HI && s >= v.lay.LO) rect(g, 0, v.lay.y(s) + Math.floor(v.lay.A / 2), w, 1, "#c9c2a8", 0.16);
      beats(v, "rgba(201,194,168,0.14)", null);
      for (const n of v.notes) {
        const [a, b] = ends(v, n);
        const yy = v.y(n);
        const hh = v.rh(n);
        const c = n.mine ? playerFill(v, n, n.span ? v.gold : "#f4ecd6", "#8f8a7a") : v.ink(n.voice);
        const al = n.mine ? 1 : n.span ? 1 : 0.6;
        rect(g, a, yy + Math.floor(hh / 2) - (n.mine ? 1 : 0), b - a, n.mine ? 2 : 1, c, al * 0.55);
        g.globalAlpha = al;
        head(g, a, yy, hh, c, n.mine || !!n.span);
        g.globalAlpha = 1;
      }
      // The entries: a bracket over each, ticks down at its START and END, the tag above.
      const at = stack(v.entries, (e) => e.top - 4, (e) => Math.max(e.x2 - e.x1, textWidth(e.short) + 4));
      for (const e of v.entries) {
        const by = Math.max(8, at.get(e) ?? 0);
        rect(g, e.x1, by, e.x2 - e.x1, 1, e.color);
        rect(g, e.x1, by, 1, e.top - by - 1, e.color);
        rect(g, e.x2 - 1, by, 1, 4, e.color);
        rect(g, e.x2 - 2, by + 3, 3, 1, e.color);
        pixText(g, e.short, e.x1 + 2, by - 7, e.color);
        if (e.sounding) rect(g, e.x1, by - 1, (e.x2 - e.x1) * e.through, 1, e.color, 0.6);
      }
      flash(v);
      cadences(v, "#c9c2a8");
      playhead(v, "#f4ecd6", 0.7);
    },
  },

  /** 2. Game Boy: four shades of green; the player dark and solid; START a flag, END a checkered goal. */
  2: {
    name: "GAME BOY",
    layout: "full",
    inks: ["#306230", "#306230", "#306230", "#306230"],
    gold: "#0f380f",
    paint(v) {
      const { g, w, h } = v;
      const [d0, d1, d2, d3] = ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"];
      rect(g, 0, 0, w, h, d2);
      rect(g, 0, v.lay.zone.top, w, v.lay.zone.bot - v.lay.zone.top, d3);
      fillPat(g, SPARSE, d1, 0, 0, w, v.lay.zone.top, 0.5);
      fillPat(g, SPARSE, d1, 0, v.lay.zone.bot, w, h - v.lay.zone.bot, 0.5);
      beats(v, d2, null);
      // The entries behind: the lightest band through their extent.
      for (const e of v.entries) {
        fillPat(g, CHECK, d3, e.x1, e.top - 2, e.x2 - e.x1, e.bot - e.top + 4);
        frame1(g, e.x1, e.top - 2, e.x2 - e.x1, e.bot - e.top + 4, d1);
      }
      for (const n of v.notes) {
        const [a, b] = ends(v, n);
        const yy = v.y(n);
        const hh = v.rh(n) - 1;
        if (n.mine) {
          const c = n.state === "miss" ? d2 : n.state === "hit" && v.since(n) < 0.2 ? d3 : d0;
          rect(g, a - 1, yy - 1, b - a + 2, hh + 2, d3);
          rect(g, a, yy, b - a, hh, c);
          if (n.state === "miss") frame1(g, a, yy, b - a, hh, d0);
        } else if (n.span) rect(g, a, yy, b - a, hh, d1);
        else frame1(g, a, yy, b - a, hh, d1);
      }
      const at = stack(v.entries, (e) => e.top - 12, (e) => textWidth(e.short) + 8, 8);
      for (const e of v.entries) {
        const top = at.get(e) ?? 1;
        rect(g, e.x1, top, 1, e.bot - top + 2, d0);
        sprite(g, FLAG, e.x1 + 1, top, d0);
        pixText(g, e.short, e.x1 + 7, top, d0);
        rect(g, e.x2 - 1, e.top - 7, 1, e.bot - e.top + 9, d0);
        sprite(g, GOAL, e.x2, e.top - 7, d0);
      }
      cadences(v, d0);
      for (let y = 0; y < h; y += 3) rect(g, v.playX, y, 1, 2, d0);
    },
  },

  /** 3. Banner: every voice neutral grey; the entry's notes in colour; a ribbon over the box from START to END. */
  3: {
    name: "BANNER",
    layout: "fish",
    paint(v) {
      const { g, w, h } = v;
      rect(g, 0, 0, w, h, "#15151b");
      rect(g, 0, v.lay.zone.top, w, v.lay.zone.bot - v.lay.zone.top, "#1b1b23");
      beats(v, "#24242e", null);
      const greys = ["#8a8fa3", "#6f7487", "#5a5e6e", "#4a4d5a"];
      for (const e of v.entries) {
        rect(g, e.x1, 0, 1, h, e.color, 0.35);
        rect(g, e.x2 - 1, 0, 1, h, e.color, 0.35);
        rect(g, e.x1, 0, e.x2 - e.x1, h, e.color, 0.05);
      }
      for (const n of v.notes) {
        const [a, b] = ends(v, n);
        const yy = v.y(n);
        const hh = v.rh(n) - 1;
        if (n.mine) {
          rect(g, a - 1, yy - 1, b - a + 2, hh + 2, "#0b0b0f");
          rect(g, a, yy, b - a, hh, playerFill(v, n, n.span ? v.gold : "#ecebe4", "#7d7b72"));
        } else rect(g, a, yy, b - a, hh, n.span ? v.ink(n.voice) : greys[n.voice % 4]);
      }
      // The ribbons along the top: a pole at START, a swallowtail at END.
      const lv = levels(v.entries, () => 0);
      for (const e of v.entries) {
        const y = 2 + 10 * (lv.get(e) ?? 0);
        const a = Math.max(e.x1, -200);
        rect(g, a, y, e.x2 - a - 3, 8, e.color);
        rect(g, e.x2 - 3, y, 3, 3, e.color);
        rect(g, e.x2 - 3, y + 5, 3, 3, e.color);
        rect(g, e.x2 - 1, y + 3, 1, 2, e.color);
        rect(g, e.x1, y, 1, 10, "#ecebe4");
        rect(g, e.x1, y + 8, Math.max(0, (e.x2 - e.x1 - 3) * e.through), 1, "#ecebe4", 0.8);
        g.save();
        g.beginPath();
        g.rect(e.x1 + 2, y, e.x2 - e.x1 - 6, 8);
        g.clip();
        pixText(g, e.label, Math.max(e.x1 + 3, Math.min(3, e.x2 - textWidth(e.label) - 6)), y + 2, "#15151b");
        g.restore();
      }
      flash(v);
      cadences(v, "#8a8fa3");
      playhead(v, "#ecebe4", 0.6);
    },
  },

  /** 4. Dark room: only the now is lit; what comes waits in the dark, the entries' outlines glowing; a stage under each. */
  4: {
    name: "SPOTLIGHT",
    layout: "full",
    paint(v) {
      const { g, w, h, playX } = v;
      rect(g, 0, 0, w, h, "#050507");
      const grad = g.createLinearGradient(playX - 60, 0, playX + 90, 0);
      grad.addColorStop(0, "rgba(255,230,180,0)");
      grad.addColorStop(0.4, "rgba(255,230,180,0.10)");
      grad.addColorStop(1, "rgba(255,230,180,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      const lit = (x: number) => Math.max(0.12, 1 - Math.max(0, x - playX) / (w * 0.75) - Math.max(0, playX - x) / 50);
      for (const n of v.notes) {
        const [a, b] = ends(v, n);
        const yy = v.y(n);
        const hh = v.rh(n) - 1;
        const on = n.on <= v.fr.now && n.on + n.dur > v.fr.now;
        const L = on ? 1 : lit(a);
        if (n.span) frame1(g, a - 1, yy - 1, b - a + 2, hh + 2, n.mine ? v.gold : v.ink(n.voice), Math.max(0.55, L));
        rect(g, a, yy, b - a, hh, n.mine ? playerFill(v, n, "#fff4dc", "#5a554c") : v.ink(n.voice), n.mine ? Math.max(0.35, L) : L * 0.8);
      }
      // The stage: a line along the foot from START to END, posts at both ends rising towards the entry.
      const lv = levels(v.entries, (e) => textWidth(e.short) + 6);
      for (const e of v.entries) {
        const k = lv.get(e) ?? 0;
        const y = h - 4 - 12 * k;
        rect(g, e.x1, y, e.x2 - e.x1, 1, e.color, 0.9);
        for (let yy = e.bot + 2; yy < y; yy += 2) {
          rect(g, e.x1, yy, 1, 1, e.color, 0.5);
          rect(g, e.x2 - 1, yy, 1, 1, e.color, 0.5);
        }
        rect(g, e.x1, y - 3, 1, 4, e.color);
        rect(g, e.x2 - 1, y - 3, 1, 4, e.color);
        pixText(g, e.short, e.x1 + 3, y - 7, e.color);
      }
      flash(v);
      playhead(v, "#fff4dc", 0.5);
    },
  },

  /** 5. Music Animation Machine: bars in the voices' colours; the sounding note lit, the past fading; the subject rounded and haloed. */
  5: {
    name: "MAM",
    layout: "full",
    paint(v) {
      const { g, w, h, fr } = v;
      rect(g, 0, 0, w, h, "#07070b");
      for (const n of v.notes) {
        const [a, b] = ends(v, n);
        const yy = v.y(n);
        const hh = v.rh(n) - 1;
        const on = n.on <= fr.now && n.on + n.dur > fr.now;
        const past = n.on + n.dur <= fr.now;
        const c = n.mine ? (n.state === "miss" ? v.miss : "#f2efe6") : v.ink(n.voice);
        const al = on ? 1 : past ? Math.max(0.1, 0.5 - (fr.now - n.on - n.dur) / (fr.barTicks * 1.2)) : n.mine ? 0.9 : 0.55;
        if (n.span) {
          rect(g, a + 1, yy - 1, b - a - 2, hh + 2, n.mine ? v.gold : c, al);
          rect(g, a, yy, b - a, hh, n.mine ? v.gold : c, al);
          if (b - a > 4) rect(g, a + 1, yy + Math.floor(hh / 2), b - a - 2, 1, "#07070b", 0.5 * al);
        } else rect(g, a, yy, b - a, hh, c, al);
        if (on) rect(g, a, yy, b - a, hh, "#ffffff", 0.35);
      }
      // START: a bright stroke before the entry's first note; END: one after its last.
      for (const e of v.entries) {
        const f = e.s.path[0];
        const l = e.s.path[e.s.path.length - 1];
        const fy = v.lay.y(f.step, e.s.voice);
        const ly = v.lay.y(l.step, e.s.voice);
        rect(g, e.x1 - 2, fy - 3, 1, v.lay.A + 5, e.color);
        rect(g, e.x2, ly - 3, 1, v.lay.A + 5, e.color);
      }
      const at = stack(v.entries, (e) => v.lay.y(e.s.path[0].step, e.s.voice) - 10, (e) => textWidth(e.short));
      for (const e of v.entries) pixText(g, e.short, e.x1 - 1, at.get(e) ?? 1, e.color);
      flash(v);
      playhead(v, "#ffffff", 0.25);
    },
  },

  /** 6. Contour: each voice a fine line through its notes; the subject drawn bolder, a ring at its START and a bar at its END. */
  6: {
    name: "CONTOUR",
    layout: "full",
    paint(v) {
      const { g, w, h, fr } = v;
      rect(g, 0, 0, w, h, "#0e1016");
      rect(g, 0, v.lay.zone.top, w, v.lay.zone.bot - v.lay.zone.top, "#12151d");
      beats(v, "#1b1f2a", null);
      const byVoice = new Map<number, N[]>();
      for (const n of v.notes) (byVoice.get(n.voice) ?? byVoice.set(n.voice, []).get(n.voice)!).push(n);
      for (const [vc, ns] of byVoice) {
        ns.sort((p, q) => p.on - q.on);
        const mine = vc === fr.voice;
        const base = mine ? "#f1ecdf" : v.ink(vc);
        g.lineCap = "square";
        let prev: { x: number; y: number; on: number; span?: Span } | null = null;
        for (const n of ns) {
          const [a, b] = ends(v, n);
          const yy = v.y(n) + Math.floor(v.rh(n) / 2);
          const sub = !!n.span;
          const c = sub ? (mine ? v.gold : base) : base;
          const lw = sub ? 2 : mine ? 2 : 1;
          const al = sub || mine ? 1 : 0.55;
          if (prev && n.on - prev.on < fr.barTicks) {
            g.globalAlpha = al;
            g.strokeStyle = sub && prev.span === n.span ? c : base;
            g.lineWidth = lw;
            g.beginPath();
            g.moveTo(prev.x + 0.5, prev.y + 0.5);
            g.lineTo(a + 0.5, yy + 0.5);
            g.stroke();
          }
          rect(g, a, yy - (lw > 1 ? 1 : 0), b - a, lw, mine && n.state === "miss" ? v.miss : c, al);
          const dot = mine ? 3 : 2;
          rect(g, a - (dot > 2 ? 1 : 0), yy - Math.floor(dot / 2), dot, dot, mine ? playerFill(v, n, c, "#7f7a6e") : c, mine || sub ? 1 : 0.8);
          prev = { x: b, y: yy, on: n.on, span: n.span };
        }
        g.globalAlpha = 1;
      }
      for (const e of v.entries) {
        const f = e.s.path[0];
        const l = e.s.path[e.s.path.length - 1];
        const fy = v.lay.y(f.step, e.s.voice) + Math.floor(v.lay.A / 2);
        const ly = v.lay.y(l.step, e.s.voice) + Math.floor(v.lay.A / 2);
        sprite(g, RING, e.x1 - 6, fy - 2, e.color);
        rect(g, e.x2 + 1, ly - 3, 1, 7, e.color);
        rect(g, e.x2 + 3, ly - 3, 1, 7, e.color);
      }
      const at = stack(v.entries, (e) => v.lay.y(e.s.path[0].step, e.s.voice) + Math.floor(v.lay.A / 2) - 9, (e) => textWidth(e.short));
      for (const e of v.entries) pixText(g, e.short, e.x1 - 6, at.get(e) ?? 1, e.color);
      flash(v);
      cadences(v, "#6d7387");
      playhead(v, "#f1ecdf", 0.5);
    },
  },

  /** 7. GeruBach: paper and ink; the subject's notes red, each entry underlined by a bracket with its number. */
  7: {
    name: "PAPER",
    layout: "full",
    inks: ["#2a2a2a", "#2a2a2a", "#2a2a2a", "#2a2a2a"],
    gold: "#c0392b",
    paint(v) {
      const { g, w, h } = v;
      const paper = "#efe7d3";
      rect(g, 0, 0, w, h, paper);
      rect(g, 0, v.lay.zone.top, w, v.lay.zone.bot - v.lay.zone.top, "#e7dcc2");
      for (const s of STAFF) if (s <= v.lay.HI && s >= v.lay.LO) rect(g, 0, v.lay.y(s) + Math.floor(v.lay.A / 2), w, 1, "#8b8375", 0.45);
      beats(v, "rgba(80,70,60,0.25)", null);
      const red = "#c0392b";
      for (const n of v.notes) {
        const [a, b] = ends(v, n);
        const yy = v.y(n);
        const hh = v.rh(n);
        const c = n.span ? red : n.mine ? "#1c3d73" : "#3b3833";
        const st = n.mine && n.state === "miss" ? "#b7aa92" : n.mine && n.state === "hit" && v.since(n) < 0.2 ? "#e0a400" : c;
        rect(g, a, yy + Math.floor(hh / 2), b - a, 1, c, n.mine ? 0.7 : 0.35);
        if (n.mine) rect(g, a, yy + Math.floor(hh / 2) - 1, b - a, 1, c, 0.35);
        head(g, a, yy, hh, st, n.mine || !!n.span);
      }
      for (const e of v.entries) {
        const y = e.bot + 2;
        const c = e.mine ? red : e.color === red ? red : "#a33a2c";
        rect(g, e.x1, y + 2, e.x2 - e.x1, 1, c);
        rect(g, e.x1, y, 1, 3, c);
        rect(g, e.x2 - 1, y, 1, 3, c);
        const label = String(e.num);
        rect(g, e.x1 + 2, y + 1, textWidth(label) + 3, 7, paper);
        frame1(g, e.x1 + 2, y, textWidth(label) + 3, 9, c);
        pixText(g, label, e.x1 + 4, y + 2, c);
        pixText(g, e.short, e.x1 + textWidth(label) + 8, y + 4, c);
      }
      cadences(v, "#5b5246");
      playhead(v, "#1c3d73", 0.6);
    },
  },

  /** 8. Register bands: each voice's register a band, named; each entry framed in a box from START to END, a tab on top. */
  8: {
    name: "BANDS",
    layout: "full",
    paint(v) {
      const { g, w, h, fr } = v;
      rect(g, 0, 0, w, h, "#121218");
      const rs = fr.ranges ?? [];
      rs.forEach((r, vc) => {
        const mid = Math.round((r.lo + r.hi) / 2);
        const y1 = v.lay.y(r.hi);
        const y2 = v.lay.y(r.lo) + v.lay.A;
        rect(g, 0, y1, w, y2 - y1, v.ink(vc), vc === fr.voice ? 0.1 : 0.04);
        pixText(g, v.name(vc)[0], 2, v.lay.y(mid) - 2, v.ink(vc));
      });
      zoneLines(v, "#ecead9", 0.25);
      beats(v, "rgba(255,255,255,0.06)", null);
      for (const n of v.notes) {
        const [a, b] = ends(v, n);
        const yy = v.y(n);
        const hh = v.rh(n) - 1;
        if (n.mine) {
          rect(g, a - 1, yy - 1, b - a + 2, hh + 2, "#ecead9");
          rect(g, a, yy, b - a, hh, playerFill(v, n, v.ink(n.voice), "#4a4652"));
        } else rect(g, a, yy, b - a, hh, v.ink(n.voice), n.span ? 0.95 : 0.5);
      }
      const at = stack(v.entries, (e) => e.top - 11, (e) => textWidth(e.short) + 3);
      for (const e of v.entries) {
        const top = e.top - 3;
        frame1(g, e.x1 - 2, top, e.x2 - e.x1 + 3, e.bot - top + 3, e.color);
        const tw = textWidth(e.short) + 3;
        const ty = at.get(e) ?? 0;
        rect(g, e.x1 - 2, ty, tw, 8, e.color);
        if (top - ty > 8) rect(g, e.x1 - 2, ty + 8, 1, top - ty - 8, e.color);
        pixText(g, e.short, e.x1, ty + 2, "#121218");
      }
      flash(v);
      cadences(v, "#8b8a99");
      playhead(v, "#ecead9", 0.6);
    },
  },

  /** 9. Staves: a band per voice, like a score's system; an entry's stretch of its band lit between double bars. */
  9: {
    name: "STAVES",
    layout: "staves",
    paint(v) {
      const { g, w, h, fr } = v;
      rect(g, 0, 0, w, h, "#0f1015");
      for (const b of v.lay.bands ?? []) {
        rect(g, 0, b.top, w, b.bot - b.top, b.voice === fr.voice ? "#1a1c26" : "#14151c");
        rect(g, 0, b.top - 1, w, 1, v.ink(b.voice), 0.25);
        rect(g, 0, b.bot, w, 1, v.ink(b.voice), 0.25);
      }
      beats(v, "rgba(255,255,255,0.05)", null);
      for (const e of v.entries) {
        const b = v.lay.bands![e.s.voice];
        rect(g, e.x1, b.top, e.x2 - e.x1, b.bot - b.top, e.color, 0.16);
        // START: thick-thin; END: thin-thick, a section's double bars.
        rect(g, e.x1, b.top - 1, 2, b.bot - b.top + 2, e.color);
        rect(g, e.x1 + 3, b.top - 1, 1, b.bot - b.top + 2, e.color);
        rect(g, e.x2 - 4, b.top - 1, 1, b.bot - b.top + 2, e.color);
        rect(g, e.x2 - 2, b.top - 1, 2, b.bot - b.top + 2, e.color);
        rect(g, e.x1 + 4, b.top - 1, (e.x2 - e.x1 - 8) * e.through, 1, e.color);
      }
      for (const n of v.notes) {
        const [a, b] = ends(v, n);
        const yy = v.y(n);
        const hh = v.rh(n) - 1;
        if (n.mine) {
          rect(g, a - 1, yy - 1, b - a + 2, hh + 2, "#0f1015");
          rect(g, a, yy, b - a, hh, playerFill(v, n, n.span ? v.gold : "#ecead9", "#5d5a55"));
        } else rect(g, a, yy, b - a, Math.max(2, hh), v.ink(n.voice), n.span ? 1 : 0.6);
      }
      for (const b of v.lay.bands ?? []) pixText(g, v.name(b.voice).slice(0, 1), 2, Math.round((b.top + b.bot) / 2) - 2, v.ink(b.voice));
      for (const e of v.entries) {
        const b = v.lay.bands![e.s.voice];
        const y = b.top + 2;
        tag(g, e.short, e.x1 + 6, y, e.color, "#0f1015", 0.9);
      }
      flash(v);
      cadences(v, "#8b8a99");
      playhead(v, "#ecead9", 0.6);
    },
  },

  /** 10. Instruments: each voice its own texture (beads, bars, hatching, a dark core), a sprite riding its sounding note; flags START and END. */
  10: {
    name: "INSTRUMENTS",
    layout: "fish",
    paint(v) {
      const { g, w, h, fr } = v;
      rect(g, 0, 0, w, h, "#121019");
      rect(g, 0, v.lay.zone.top, w, v.lay.zone.bot - v.lay.zone.top, "#18151f");
      beats(v, "#221e2b", null);
      const order = (vc: number) => Math.round((vc * 3) / Math.max(1, fr.count - 1));
      for (const e of v.entries) rect(g, e.x1, e.top - 2, e.x2 - e.x1, e.bot - e.top + 4, e.color, 0.08);
      for (const n of v.notes) {
        const [a, b] = ends(v, n);
        const yy = v.y(n);
        const hh = v.rh(n) - 1;
        const c = n.mine ? playerFill(v, n, n.span ? v.gold : v.ink(n.voice), "#4d4656") : v.ink(n.voice);
        const al = n.mine || n.span ? 1 : 0.6;
        if (n.mine) rect(g, a - 1, yy - 1, b - a + 2, hh + 2, "#f3eee2");
        switch (n.mine ? 1 : order(n.voice)) {
          case 0: // beads
            for (let x = a; x < b; x += hh + 1) {
              const d = Math.min(hh, b - x);
              rect(g, x + (d > 2 ? 1 : 0), yy, Math.max(1, d - (d > 2 ? 2 : 0)), hh, c, al);
              rect(g, x, yy + (hh > 2 ? 1 : 0), d, Math.max(1, hh - (hh > 2 ? 2 : 0)), c, al);
            }
            break;
          case 1:
            rect(g, a, yy, b - a, hh, c, al);
            break;
          case 2: // hatching
            frame1(g, a, yy, b - a, hh, c, al);
            fillPat(g, DIAG, c, a, yy, b - a, hh, al);
            break;
          default: // a dark core
            rect(g, a, yy, b - a, hh, c, al);
            rect(g, a + 1, yy + Math.floor(hh / 2), b - a - 2, 1, "#121019", al);
        }
      }
      const RIDERS = [
        ["01010", "11111", "01110"],
        ["00100", "01110", "11111"],
        ["01110", "11011", "01110"],
        ["11011", "11111", "01110"],
      ];
      for (const n of v.notes)
        if (n.on <= fr.now && n.on + n.dur > fr.now) sprite(g, RIDERS[n.mine ? 1 : order(n.voice)], v.playX - 2, v.y(n) - 4 - (Math.floor(performance.now() / 160) % 2), n.mine ? "#f3eee2" : v.ink(n.voice));
      const at = stack(v.entries, (e) => e.top - 9, (e) => textWidth(e.short) + 8, 8);
      for (const e of v.entries) {
        const top = at.get(e) ?? 1;
        rect(g, e.x1, top, 1, e.bot - top + 2, e.color);
        sprite(g, FLAG, e.x1 + 1, top, e.color);
        rect(g, e.x2, e.top - 6, 1, e.bot - e.top + 8, e.color);
        sprite(g, GOAL, e.x2 + 1, e.top - 6, e.color);
        pixText(g, e.short, e.x1 + 7, top, e.color);
      }
      flash(v);
      cadences(v, "#8b8a99");
      playhead(v, "#f3eee2", 0.6);
    },
  },

  /** 11. Negative space: everything outlined in grey, only the player solid; colour only for the entry, between square brackets. */
  11: {
    name: "NEGATIVE",
    layout: "full",
    paint(v) {
      const { g, w, h } = v;
      rect(g, 0, 0, w, h, "#0d0d10");
      zoneLines(v, "#ecead9", 0.12);
      for (const n of v.notes) {
        const [a, b] = ends(v, n);
        const yy = v.y(n);
        const hh = v.rh(n) - 1;
        if (n.span) rect(g, a, yy, b - a, hh, n.mine ? playerFill(v, n, v.gold, "#6b5d35") : v.ink(n.voice));
        else if (n.mine) rect(g, a, yy, b - a, hh, playerFill(v, n, "#efe8d6", "#5c5950"));
        else frame1(g, a, yy, b - a, hh, "#4a4a55");
      }
      const at = stack(v.entries, (e) => e.top - 10, (e) => textWidth(e.short));
      for (const e of v.entries) {
        const t = e.top - 3;
        const bt = e.bot + 2;
        rect(g, e.x1 - 3, t, 1, bt - t, e.color);
        rect(g, e.x1 - 3, t, 3, 1, e.color);
        rect(g, e.x1 - 3, bt, 3, 1, e.color);
        rect(g, e.x2 + 1, t, 1, bt - t, e.color);
        rect(g, e.x2 - 1, t, 3, 1, e.color);
        rect(g, e.x2 - 1, bt, 3, 1, e.color);
        pixText(g, e.short, e.x1 - 3, at.get(e) ?? 1, e.color);
      }
      flash(v);
      playhead(v, "#efe8d6", 0.35);
    },
  },

  /** 12. Parallax: organ pipes and arches drifting behind; notes as lit platforms; the subject gold bricks between a flagpole and a goal. */
  12: {
    name: "PARALLAX",
    layout: "fish",
    paint(v) {
      const { g, w, h, fr } = v;
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#1b1530");
      sky.addColorStop(1, "#3a2340");
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);
      const sp = BARS_SHOWN * fr.barTicks;
      const far = Math.round(((fr.now / sp) * w * 0.25) % 24);
      for (let x = -far; x < w + 24; x += 24)
        for (let k = 0; k < 4; k++) {
          const ph = 30 + ((Math.abs(Math.round(x + far + k * 37)) * 7) % 40);
          rect(g, x + k * 5, h - ph, 4, ph, "#2b2045");
          rect(g, x + k * 5, h - ph, 4, 1, "#3e2f5e");
        }
      const near = Math.round(((fr.now / sp) * w * 0.55) % 60);
      for (let x = -near; x < w + 60; x += 60) {
        rect(g, x, h - 18, 6, 18, "#24183a");
        for (let i = 0; i < 27; i++) rect(g, x + 6 + i, h - 18 + Math.round(8 - 8 * Math.sin((i / 27) * Math.PI)), 1, 2, "#24183a");
      }
      for (const e of v.entries) rect(g, e.x1, e.top - 2, e.x2 - e.x1, e.bot - e.top + 4, e.color, 0.07);
      for (const n of v.notes) {
        const [a, b] = ends(v, n);
        const yy = v.y(n);
        const hh = v.rh(n) - 1;
        const c = n.mine ? playerFill(v, n, n.span ? v.gold : "#f0e6d0", "#6d6070") : n.span ? v.ink(n.voice) : mix(v.ink(n.voice), "#2b2045", 0.45);
        rect(g, a + 1, yy + 1, b - a, hh, "#0c0814", 0.6);
        rect(g, a, yy, b - a, hh, c);
        rect(g, a, yy, b - a, 1, "#ffffff", 0.35);
        if (n.span && hh >= 4) for (let x = a + 3; x < b - 1; x += 4) rect(g, x, yy + 1, 1, hh - 1, "#000", 0.25);
      }
      const at = stack(v.entries, (e) => e.top - 13, (e) => textWidth(e.short) + 8, 8);
      for (const e of v.entries) {
        const top = at.get(e) ?? 1;
        rect(g, e.x1, top, 1, e.bot - top + 2, "#e8e2d0");
        rect(g, e.x1 - 1, top - 1, 3, 2, e.color);
        sprite(g, FLAG, e.x1 + 1, top + 1, e.color);
        pixText(g, e.short, e.x1 + 7, top + 1, e.color);
        rect(g, e.x2, e.top - 7, 1, e.bot - e.top + 9, "#e8e2d0");
        sprite(g, GOAL, e.x2 + 1, e.top - 7, "#e8e2d0");
        sprite(g, ["0101", "1010", "0101", "1010"], e.x2 + 1, e.top - 7, "#1b1530");
      }
      flash(v);
      cadences(v, "#c9b8e0");
      playhead(v, "#f0e6d0", 0.5);
    },
  },

  /** 13. Neon: thin glowing tubes on black, scanlines; an entry between two upright tubes, its sign lit. */
  13: {
    name: "NEON",
    layout: "full",
    paint(v) {
      const { g, w, h } = v;
      rect(g, 0, 0, w, h, "#030306");
      zoneLines(v, "#5cb2ff", 0.15);
      for (const n of v.notes) {
        const [a, b] = ends(v, n);
        const hh = v.rh(n);
        const mid = v.y(n) + Math.floor(hh / 2);
        const c = n.mine ? (n.state === "miss" ? v.miss : n.span ? v.gold : "#fff2f8") : v.ink(n.voice);
        const glow = n.span || n.mine ? 0.28 : 0.12;
        rect(g, a - 1, mid - 2, b - a + 2, 5, c, glow * 0.6);
        rect(g, a, mid - 1, b - a, 3, c, glow);
        rect(g, a, mid, b - a, n.mine ? 2 : 1, c, n.span || n.mine ? 1 : 0.7);
      }
      const signs = stack(v.entries, (e) => e.top - 14, (e) => textWidth(e.short) + 5, 10);
      for (const e of v.entries) {
        const t = e.top - 4;
        const bt = e.bot + 4;
        for (const x of [e.x1 - 2, e.x2 + 1]) {
          rect(g, x - 1, t, 3, bt - t, e.color, 0.25);
          rect(g, x, t, 1, bt - t, e.color);
        }
        const tw = textWidth(e.short);
        const sy = signs.get(e) ?? 1;
        rect(g, e.x1 - 3, sy, tw + 5, 9, e.color, 0.15);
        frame1(g, e.x1 - 3, sy, tw + 5, 9, e.color, 0.8);
        pixText(g, e.short, e.x1 - 1, sy + 2, e.color);
      }
      for (let y = 0; y < h; y += 2) rect(g, 0, y, w, 1, "#000", 0.25);
      flash(v);
      playhead(v, "#fff2f8", 0.4);
    },
  },

  /** 14. One bit: two inks, like a Playdate; the voices told by pattern; an entry inverted, a block of night from START to END. */
  14: {
    name: "ONE BIT",
    layout: "full",
    gold: "#2a2824",
    paint(v) {
      const { g, w, h, fr } = v;
      const L = "#cfcabb";
      const D = "#2a2824";
      rect(g, 0, 0, w, h, L);
      fillPat(g, SPARSE, D, 0, 0, w, v.lay.zone.top, 0.6);
      fillPat(g, SPARSE, D, 0, v.lay.zone.bot, w, h - v.lay.zone.bot, 0.6);
      beats(v, D, null, 0.18);
      const pats = [null, CHECK, HSTRIPE, DIAG];
      let k = 0;
      const pOf = new Map<number, string[] | null>();
      for (let vc = 0; vc < fr.count; vc++) if (vc !== fr.voice) pOf.set(vc, pats[++k % 4]);
      const at = stack(v.entries, (e) => e.top - 11, (e) => textWidth(e.short) + 3);
      for (const e of v.entries) {
        rect(g, e.x1 - 2, e.top - 3, e.x2 - e.x1 + 3, e.bot - e.top + 6, D);
        const tw = textWidth(e.short) + 3;
        const ty = at.get(e) ?? 1;
        rect(g, e.x1 - 2, ty, tw, 8, D);
        rect(g, e.x1 - 2, ty, 1, e.top - ty, D);
      }
      // Each plate's edge in the light ink, so two entries overlapping (a stretto) stay two.
      for (const e of v.entries) frame1(g, e.x1 - 3, e.top - 4, e.x2 - e.x1 + 5, e.bot - e.top + 8, L);
      const inside = (n: N, x: number, yy: number) => v.entries.some((e) => x >= e.x1 - 2 && x < e.x2 + 1 && yy >= e.top - 3 && yy < e.bot + 3);
      for (const n of v.notes) {
        const [a, b] = ends(v, n);
        const yy = v.y(n);
        const hh = v.rh(n) - 1;
        const inv = inside(n, a, yy);
        const ink = inv ? L : D;
        const bg = inv ? D : L;
        if (n.mine) {
          rect(g, a - 1, yy - 1, b - a + 2, hh + 2, bg);
          rect(g, a, yy, b - a, hh, n.state === "miss" ? bg : ink);
          if (n.state === "miss") frame1(g, a, yy, b - a, hh, ink);
          if (n.state === "hit" && v.since(n) < 0.2) frame1(g, a - 2, yy - 2, b - a + 4, hh + 4, ink);
        } else {
          const p = pOf.get(n.voice) ?? null;
          rect(g, a, yy, b - a, hh, bg);
          frame1(g, a, yy, b - a, hh, ink);
          if (p) fillPat(g, p, ink, a + 1, yy + 1, b - a - 2, hh - 2);
          else rect(g, a + 1, yy + 1, b - a - 2, hh - 2, ink);
        }
      }
      for (const e of v.entries) {
        pixText(g, e.short, e.x1, (at.get(e) ?? 1) + 2, L);
        rect(g, e.x1 - 2, e.bot + 2, (e.x2 - e.x1 + 3) * e.through, 1, L);
      }
      for (let y = 0; y < h; y += 2) rect(g, v.playX, y, 1, 1, D);
    },
  },

  /** 15. Illuminated: a manuscript; the entry opens with a gilded initial, its notes red, a red rule to a fleuron at its END. */
  15: {
    name: "ILLUMINATED",
    layout: "full",
    inks: ["#5a4632", "#5a4632", "#5a4632", "#5a4632"],
    gold: "#b0291f",
    paint(v) {
      const { g, w, h } = v;
      rect(g, 0, 0, w, h, "#e8d9b5");
      fillPat(g, SPARSE, "#c9b48a", 0, 0, w, h, 0.5);
      rect(g, 0, v.lay.zone.top, w, v.lay.zone.bot - v.lay.zone.top, "#f1e5c6", 0.6);
      for (const s of STAFF) if (s <= v.lay.HI && s >= v.lay.LO) rect(g, 0, v.lay.y(s) + Math.floor(v.lay.A / 2), w, 1, "#b0291f", 0.18);
      const red = "#b0291f";
      for (const n of v.notes) {
        const [a, b] = ends(v, n);
        const yy = v.y(n);
        const hh = v.rh(n);
        const c = n.span ? red : n.mine ? "#1d1a16" : "#7a6a52";
        const st = n.mine && n.state === "miss" ? "#c9b48a" : n.mine && n.state === "hit" && v.since(n) < 0.2 ? "#d8a520" : c;
        rect(g, a, yy + Math.floor(hh / 2), b - a, 1, c, 0.5);
        // A square note (a neume's punctum), a diamond for the others.
        const s = Math.max(3, hh - 1);
        if (n.mine || n.span) rect(g, a, yy, s, s, st);
        else {
          const m = Math.floor(s / 2);
          for (let i = 0; i < s; i++) rect(g, a + Math.abs(m - i), yy + i, s - 2 * Math.abs(m - i), 1, st);
        }
      }
      for (const e of v.entries) {
        const L = "S"; // D265: every entry a subject
        const x = e.x1 - 15;
        const y = Math.max(0, e.top - 4);
        rect(g, x, y, 13, 14, "#d8a520");
        frame1(g, x, y, 13, 14, red);
        pixText(g, L, x + 4, y + 3, red, 2);
        rect(g, e.x1, e.bot + 2, e.x2 - e.x1, 1, red);
        sprite(g, FLEURON, e.x2 + 1, e.bot - 1, red);
        pixText(g, v.name(e.s.voice), e.x1, e.bot + 4, red);
      }
      cadences(v, "#5a4632");
      playhead(v, "#1d1a16", 0.5);
    },
  },

  /** 16. Lens: the box as it is, simpler: flat blocks, the player's register magnified; an entry marked by corners at its first and last notes and a timeline at the foot. */
  16: {
    name: "LENS",
    layout: "fish",
    paint(v) {
      const { g, w, h } = v;
      g.fillStyle = "#14141c";
      g.fillRect(0, 0, w, h);
      rect(g, 0, v.lay.zone.top, w, v.lay.zone.bot - v.lay.zone.top, "#1a1a24");
      beats(v, "#262633", null);
      for (const n of v.notes) {
        const [a, b] = ends(v, n);
        const yy = v.y(n);
        const hh = v.rh(n) - 1;
        if (n.mine) {
          rect(g, a - 1, yy - 1, b - a + 2, hh + 2, "#ecead9");
          rect(g, a, yy, b - a, hh, playerFill(v, n, v.ink(n.voice), "#4a4652"));
          if (n.span) rect(g, a, yy + hh - 1, b - a, 1, v.gold);
        } else rect(g, a, yy, b - a, hh, v.ink(n.voice), n.span ? 1 : 0.45);
      }
      const lv = levels(v.entries, () => 0);
      const tags = stack(v.entries, (e) => v.lay.y(e.s.path[0].step, e.s.voice) - 10, (e) => textWidth(e.short));
      for (const e of v.entries) {
        const f = e.s.path[0];
        const l = e.s.path[e.s.path.length - 1];
        const fy = v.lay.y(f.step, e.s.voice);
        const ly = v.lay.y(l.step, e.s.voice) + v.lay.rh(l.step, e.s.voice);
        rect(g, e.x1 - 3, fy - 3, 5, 1, e.color);
        rect(g, e.x1 - 3, fy - 3, 1, 5, e.color);
        rect(g, e.x2 - 1, ly + 1, 4, 1, e.color);
        rect(g, e.x2 + 2, ly - 3, 1, 5, e.color);
        pixText(g, e.short, e.x1 - 2, tags.get(e) ?? 1, e.color);
        const y = h - 4 - 5 * (lv.get(e) ?? 0);
        rect(g, e.x1, y, e.x2 - e.x1, 3, e.color, 0.35);
        rect(g, e.x1, y, (e.x2 - e.x1) * e.through, 3, e.color);
      }
      flash(v);
      playhead(v, "#ecead9", 0.6);
    },
  },
};

export const VARIANT_NAMES: Record<number, string> = Object.fromEntries(Object.entries(VARIANTS).map(([k, v]) => [k, v.name]));
