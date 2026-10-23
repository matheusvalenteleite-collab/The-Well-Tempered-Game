/**
 * Design study (not in play): what every interface template (`?ui=NAME`, ui/index.ts) is given each frame:
 * the piece, time as x, the steps as y (the template's own layout), the notes in view (the player's with
 * their state), the subject's entries in view (stretto, sounding, done), and small drawing tools: SMuFL
 * glyphs (glyphs.ts), seeded noise, colour mixing.
 */
import { barStart, beatOf, fugueById, type TouchFugue } from "../fugue.ts";
import { ARROW_PIXELS, type Arrow, type Frame } from "../MusicBox.tsx";
import type { LaneNote } from "../lanes.ts";
import { stepRange } from "../voice-mode.ts";
import type { GlyphName } from "./glyphs.ts";

/** Where a template lays the steps (CSS px), for its paint and for the side bars (linear for the player's voice). */
export interface Geo {
  /** A step's middle (CSS px from the box's top), in a voice's staff where the template has several. */
  yOf: (step: number, voice: number) => number;
  /** CSS px per step in a voice's staff. */
  A: (voice: number) => number;
  /** D228: a step's own height (CSS px) where it differs from A (the squeezed margins beyond the player's range). */
  hOf?: (step: number, voice: number) => number;
}
export interface GeoIn {
  f: TouchFugue;
  voice: number;
  /** The player's range (the steps the bars map). */
  range: { lo: number; hi: number };
  w: number;
  h: number;
}

export interface UEntry {
  k: number;
  voice: number;
  on: number;
  end: number;
  form: "subject" | "answer";
  key: string;
  shape?: string;
  theme?: number;
  path: { on: number; dur: number; step: number }[];
  stretto: boolean;
  sounding: boolean;
  done: boolean;
  /** Still to come or sounding: the "current" entries (the only ones in colour). */
  live: boolean;
  through: number;
  state?: "captured" | "lost" | "open";
  mine: boolean;
}
export interface UNote {
  on: number;
  dur: number;
  midi: number;
  step: number;
  voice: number;
  mine: boolean;
  state?: LaneNote["state"];
  at?: number;
  ride?: boolean;
  entry?: UEntry;
  /** The arrow key it asks for (the computer's LADDER). */
  arrow?: string | null;
}

export interface Ctx {
  g: CanvasRenderingContext2D;
  /** The drawing's size in its units (CSS px, or chunky pixels). */
  W: number;
  H: number;
  /** CSS px per unit. */
  u: number;
  fr: Frame;
  f: TouchFugue;
  now: number;
  /** Wall-clock seconds (for shimmer). */
  secs: number;
  span: number;
  t0: number;
  xOf: (tick: number) => number;
  playX: number;
  /** A step's middle and a step's height, in units. */
  y: (step: number, voice: number) => number;
  A: (voice: number) => number;
  /** D228: a step's height in units (smaller in the margins beyond the player's range). */
  h: (step: number, voice: number) => number;
  notes: UNote[];
  entries: UEntry[];
  names: string[];
  count: number;
  /** Seconds since a note was struck (Infinity if not). */
  since: (n: UNote) => number;
  beat: number;
  /** The game (the bench's own handle, for the score in a status line). */
  game: { score?: number; combo?: number; mult?: number; crowd?: number } | null;
}

export interface Template {
  name: string;
  /** D228: one line for the INTERFACE panel. */
  desc?: string;
  /** D228: the family it is listed under in the panel ("RETRO"). */
  family?: string;
  /** CSS px per drawing unit: 2 or 3 for chunky pixels; 0 for the device's full resolution (units are CSS px). */
  pixel: number;
  /** Bars in view and where the now stands (fraction of the width). */
  bars?: number;
  playhead?: number;
  /** The template draws its own title and legend: the box's are hidden. */
  chrome?: boolean;
  /** CSS for the page while the template is on. */
  css?: string;
  /** false: the side bars keep the game's own ladder (the template's rows are not the player's steps, D227). */
  rows?: boolean;
  geo: (L: GeoIn) => Geo;
  paint: (c: Ctx) => void;
}

/** One ladder over the whole piece (and some room), every step the same height. */
export function fullGeo(L: GeoIn, pad = 1, minLo = Infinity, minHi = -Infinity, top = 0, bottom = 0): Geo {
  const r = stepRange(L.f);
  const lo = Math.min(r.lo, L.range.lo, minLo) - pad;
  const hi = Math.max(r.hi, L.range.hi, minHi) + pad;
  const A = (L.h - top - bottom) / (hi - lo + 1);
  return { yOf: (s) => top + (hi - s + 0.5) * A, A: () => A };
}

/**
 * D228: the player's range as the ladder (its rows as tall as fit: the side bars' touch rows line up
 * with them), every step beyond it squeezed into margins above and below at `k` of a row (D211's
 * spill, for every interface), so all the voices show. `top`/`bottom`: the chrome's bands (CSS px),
 * given the row height. Where the range is the piece's (the computer's modes) it is one plain ladder.
 */
export function ladderGeo(L: GeoIn, top: (A: number) => number = () => 0, bottom: (A: number) => number = () => 0, k = 0.5): Geo {
  const r = stepRange(L.f);
  const hi = L.range.hi;
  const lo = L.range.lo;
  const up = Math.max(0, r.hi + 1 - hi);
  const down = Math.max(0, lo - (r.lo - 1));
  const n = hi - lo + 1;
  const units = n + k * (up + down) + 1;
  let A = L.h / units;
  for (let i = 0; i < 4; i++) A = Math.max(1, (L.h - top(A) - bottom(A)) / units);
  const ladTop = top(A) + A / 2 + up * k * A;
  const ladBot = ladTop + n * A;
  const kA = k * A;
  return {
    yOf: (s) => (s > hi ? ladTop - (s - hi - 0.5) * kA : s < lo ? ladBot + (lo - s - 0.5) * kA : ladTop + (hi - s + 0.5) * A),
    A: () => A,
    hOf: (s) => (s > hi || s < lo ? kA : A),
  };
}

export function buildCtx(t: Template, g: CanvasRenderingContext2D, W: number, H: number, u: number, fr: Frame, geo: Geo): Ctx {
  const f = fugueById(fr.piece ?? "wtc1f02");
  const bars = t.bars ?? 3;
  const span = bars * fr.barTicks;
  const t0 = fr.now - (t.playhead ?? 0.25) * span;
  const xOf = (tick: number) => ((tick - t0) / span) * W;
  const subj = (fr.spans ?? []).filter((s) => s.form !== "counter");
  const entries: UEntry[] = [];
  const byNote = new Map<string, UEntry>();
  subj.forEach((s, k) => {
    const stretto = subj.some((o) => o !== s && o.voice !== s.voice && s.on > o.on && s.on < o.end);
    const e: UEntry = {
      k,
      voice: s.voice,
      on: s.on,
      end: s.end,
      form: s.form as "subject" | "answer",
      key: s.key,
      shape: s.shape,
      theme: s.theme,
      path: s.path,
      stretto,
      sounding: fr.now >= s.on && fr.now < s.end,
      done: fr.now >= s.end,
      live: fr.now < s.end,
      through: Math.max(0, Math.min(1, (fr.now - s.on) / Math.max(1, s.end - s.on))),
      state: fr.entryState?.get(`${s.voice}:${s.on}`),
      mine: s.voice === fr.voice,
    };
    for (const n of s.path) byNote.set(`${s.voice}:${n.on}`, e);
    if (xOf(s.end) > -40 && xOf(s.on) < W + 40) entries.push(e);
  });
  const lo = t0 - fr.barTicks;
  const hi = t0 + span + fr.barTicks / 2;
  const notes: UNote[] = [];
  for (const o of fr.others) if (o.on + o.dur > lo && o.on < hi) notes.push({ ...o, mine: false, entry: byNote.get(`${o.voice}:${o.on}`) });
  fr.notes.forEach((n, i) => {
    if (n.on + n.dur <= lo || n.on >= hi) return;
    const v = n.voice ?? fr.voice;
    notes.push({ on: n.on, dur: n.dur, midi: n.midi, step: n.step, voice: v, mine: true, state: n.state, at: n.at, ride: n.ride, entry: byNote.get(`${v}:${n.on}`), arrow: fr.arrows?.[i] ?? null });
  });
  notes.sort((a, b) => a.on - b.on || b.step - a.step);
  return {
    g,
    W,
    H,
    u,
    fr,
    f,
    now: fr.now,
    secs: performance.now() / 1000,
    span,
    t0,
    xOf,
    playX: xOf(fr.now),
    y: (s, v) => geo.yOf(s, v) / u,
    A: (v) => geo.A(v) / u,
    h: geo.hOf ? (s, v) => geo.hOf!(s, v) / u : (_s, v) => geo.A(v) / u,
    notes,
    entries,
    names: (fr.names ?? f.voiceNames).map((n) => n.toUpperCase()),
    count: fr.count,
    since: (n) => (n.at === undefined ? Infinity : (fr.now - n.at) / fr.tps),
    beat: beatOf(f).ticks,
    game: ((globalThis as { __bench?: Ctx["game"] }).__bench ?? null) as Ctx["game"],
  };
}

// ---------------------------------------------------------------------------------------------------
// Drawing tools.

/**
 * D228: LADDER on a computer: the key each coming note of the player's asks for, the box's 5×5 pixel
 * arrow over the note (`px` units a pixel), in the interface's ink on a backing of its own.
 */
export function arrowMarks(c: Ctx, ink: string, back: string, px = 1) {
  if (!c.fr.arrows) return;
  const g = c.g;
  let last = -1;
  for (const n of c.notes) {
    if (!n.mine || !n.arrow || n.ride || n.state !== "pending" || n.on === last) continue;
    last = n.on;
    const x = Math.round(c.xOf(n.on));
    if (x < c.playX || x > c.W) continue;
    const y = Math.round(c.y(n.step, n.voice) - c.h(n.step, n.voice) / 2 - 7 * px);
    rect(g, x - px, y - px, 7 * px, 7 * px, back);
    g.fillStyle = ink;
    const rows = ARROW_PIXELS[n.arrow as Arrow];
    for (let ry = 0; ry < 5; ry++) for (let rx = 0; rx < 5; rx++) if (rows?.[ry][rx] === "1") g.fillRect(x + rx * px, y + ry * px, px, px);
  }
}

const paths = new Map<string, Path2D>();
/** A SMuFL glyph (VexFlow's outline format) at (x, y), a staff space `sp` units; y is the glyph's baseline (a notehead's middle). */
export function glyph(g: CanvasRenderingContext2D, font: Partial<Record<GlyphName, string>>, name: GlyphName, x: number, y: number, sp: number, color: string, rot = 0) {
  const o = font[name];
  if (!o) return;
  const key = `${name}:${o.length}:${o.slice(0, 24)}`;
  let p = paths.get(key);
  if (!p) {
    p = new Path2D();
    const t = o.trim().split(/\s+/);
    for (let i = 0; i < t.length; ) {
      const c = t[i++];
      const n = () => Number(t[i++]);
      if (c === "m") p.moveTo(n(), n());
      else if (c === "l") p.lineTo(n(), n());
      else if (c === "q") {
        const [x1, y1, cx, cy] = [n(), n(), n(), n()];
        p.quadraticCurveTo(cx, cy, x1, y1);
      } else if (c === "b") {
        const [x1, y1, ax, ay, bx, by] = [n(), n(), n(), n(), n(), n()];
        p.bezierCurveTo(ax, ay, bx, by, x1, y1);
      } else if (c === "z") p.closePath();
    }
    paths.set(key, p);
  }
  // VexFlow keeps the outlines at 1.44 times SMuFL's units: a staff space is 360.
  const s = sp / 360;
  g.save();
  g.translate(x, y);
  if (rot) g.rotate(rot);
  g.scale(s, -s);
  g.fillStyle = color;
  g.fill(p);
  g.restore();
}

/** A deterministic random in [0, 1) from numbers (the hand's wobble, the paper's spots). */
export function hash(...n: number[]): number {
  let h = 2166136261;
  for (const x of n) {
    h ^= Math.round(x * 1000) | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  return ((h >>> 0) % 100000) / 100000;
}

export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => {
    const n = parseInt(h.replace("#", "").slice(0, 6), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  };
  const [x, y] = [p(a), p(b)];
  return `#${x.map((c, i) => Math.round(c + (y[i] - c) * t).toString(16).padStart(2, "0")).join("")}`;
}

export function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string, a = 1) {
  if (w <= 0 || h <= 0) return;
  g.globalAlpha = a;
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
  g.globalAlpha = 1;
}
/** Crisp pixel rectangle (rounded to whole units). */
export function prect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string, a = 1) {
  rect(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), c, a);
}
export function pframe(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string, a = 1) {
  prect(g, x, y, w, 1, c, a);
  prect(g, x, y + h - 1, w, 1, c, a);
  prect(g, x, y, 1, h, c, a);
  prect(g, x + w - 1, y, 1, h, c, a);
}

/** "SUBJECT", "ANSWER", "SUBJECT 2", with the entry's shape ("INVERSION"). */
export function entryWord(e: UEntry): string {
  return `${e.form === "answer" ? "ANSWER" : "SUBJECT"}${e.theme ? ` ${e.theme}` : ""}${e.shape ? ` · ${e.shape}` : ""}`;
}
/** "C MINOR", "E♭ MAJOR". */
export function keyLong(key: string): string {
  const minor = key[0] === key[0].toLowerCase();
  return `${key[0].toUpperCase()}${key.slice(1).replace("b", "♭").replace("#", "♯")} ${minor ? "MINOR" : "MAJOR"}`;
}
/** "c" → "c", "Eb" → "E♭", "f#" → "f♯" (the key as the WTC's table names it). */
export function keyShort(key: string): string {
  return key[0] + key.slice(1).replace("b", "♭").replace("#", "♯");
}
/** The WTC's 24 keys, in its order. */
export const WTC_KEYS = ["C", "c", "C#", "c#", "D", "d", "Eb", "d#", "E", "e", "F", "f", "F#", "f#", "G", "g", "Ab", "g#", "A", "a", "Bb", "bb", "B", "b"];
export function roman(n: number): string {
  const r: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [v, s] of r) while (n >= v) (out += s), (n -= v);
  return out;
}

/** Bar lines and beats in view: [tick, isBar, bar number]. */
export function gridLines(c: Ctx): { t: number; bar: boolean; n: number }[] {
  const out: { t: number; bar: boolean; n: number }[] = [];
  const first = c.f.bars[0]?.on ?? 0;
  for (let t = first + Math.floor((c.t0 - first) / c.beat) * c.beat; t < c.t0 + c.span + c.beat; t += c.beat) {
    const b = c.f.bars.find((x) => x.on === t);
    out.push({ t, bar: !!b, n: b?.n ?? 0 });
  }
  return out;
}

/** The key signature of a key: the letters sharpened (+1) or flattened (-1). */
export function keySignature(key: string): Map<string, number> {
  const majors = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];
  const minor = key[0] === key[0].toLowerCase();
  const pcs: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  let pc = pcs[key[0].toLowerCase()] + (key[1] === "#" ? 1 : key[1] === "b" ? -1 : 0);
  if (minor) pc += 3;
  // The relative major's name, spelled by the minor's letter + 2.
  let major = key;
  if (minor) {
    const L = "CDEFGAB";
    const letter = L[(L.indexOf(key[0].toUpperCase()) + 2) % 7];
    const nat = pcs[letter.toLowerCase()];
    const d = (((pc - nat) % 12) + 18) % 12 - 6;
    major = letter + (d > 0 ? "#".repeat(d) : "b".repeat(-d));
  }
  const n = majors.indexOf(major) - 7;
  const sharps = "FCGDAEB";
  const flats = "BEADGCF";
  const out = new Map<string, number>();
  if (n > 0) for (let i = 0; i < n; i++) out.set(sharps[i], 1);
  if (n < 0) for (let i = 0; i < -n; i++) out.set(flats[i], -1);
  return out;
}

/** A note's letter and alteration as the score spells it ("Eb4" → E, -1). */
export function spelled(f: TouchFugue, midi: number): { letter: string; alter: number } {
  const s = f.spell[String(midi)] ?? "C4";
  const m = /^([A-G])(#{1,2}|b{1,2})?/.exec(s);
  return { letter: m?.[1] ?? "C", alter: m?.[2] ? (m[2][0] === "#" ? m[2].length : -m[2].length) : 0 };
}

export function firstBarIn(c: Ctx): number {
  const b = c.f.bars.filter((x) => x.on <= c.t0).at(-1);
  return b ? b.on : barStart(c.f, 1);
}
