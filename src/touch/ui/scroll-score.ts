/**
 * D227: GERUBACH and SCORE, the two engraved interfaces (`ui` "gerubach", "score"): the whole piece engraved
 * once as one long strip (strip.ts: rests, ties, beams, accidentals, an engraver's spacing), painted in
 * tiles as they come into view (kept a few at a time: memory bounded), and scrolled under a fixed band by
 * the strip's own time→x map, so the music under the band is the music sounding. Each frame only blits
 * the tiles and draws what changes: the player's notes as the game judges them, the band, the bars.
 *
 * GERUBACH (the "scrolling score" videos): a grand staff on white, the player's voice in blue, the
 * subject's entries in black with a bracket and a red circled number, the other voices plain grey; a
 * translucent red band where the music sounds; a black title bar ("FUGA II."), a black foot with the 24
 * keys, the piece's in red and the key reached underlined.
 * SCORE (the Open Well-Tempered Clavier's look): one staff per voice, the player's full size and blue, the
 * others cue size; the system's bracket, bar numbers, the entries bracketed "S" (subject) or "A"
 * (answer), the bar sounding tinted and a cursor.
 *
 * The side bars (LADDER) keep their own ladder (rows: false): the score only scrolls.
 */
import { fugueById, type TouchFugue } from "../fugue.ts";
import { fullGeo, glyph, keyShort, keySignature, rect, roman, WTC_KEYS, type Ctx, type Template } from "./core.ts";
import { BRAVURA, type GlyphName } from "./glyphs.ts";
import { grandStaves, layoutStrip, voiceStaves, type Ev, type StaffSpec, type Strip } from "./strip.ts";

/** Where the staves stand in the box (CSS px) and how big a staff space is. */
export interface Plan {
  /** CSS px per staff space of a full-size staff (and per strip unit across). */
  sp: number;
  /** Each staff's top line's y. */
  top: number[];
  /** A step's y on a staff. */
  y: (step: number, staff: number) => number;
  /** The staves' first and last lines (the system's height). */
  y0: number;
  y1: number;
  /** The room the staves were given (the marks kept inside it). */
  area: [number, number];
}

/** A staff's notes' reach above its top line and below its bottom line, in steps (0 where they stay inside). */
function reach(f: TouchFugue, s: StaffSpec): { above: number; below: number } {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of s.voices) for (const n of f.voices[v] ?? []) (lo = Math.min(lo, n[3])), (hi = Math.max(hi, n[3]));
  if (lo === Infinity) (lo = s.lines[0]), (hi = s.lines[4]);
  return { above: Math.max(0, hi - s.lines[4]), below: Math.max(0, s.lines[0] - lo) };
}

/**
 * D231: a grand staff's gap, in steps from the upper staff's bottom line to the lower's top line: one room
 * the two staves' inner notes share, as a keyboard score has it (6 to 9 spaces), not each staff's own
 * room stacked (which left 15 spaces on I/12, its tenor's notes adrift between the staves).
 */
export function grandGap(upperBelow: number, lowerAbove: number): number {
  return Math.max(12, Math.min(18, Math.max(upperBelow, lowerAbove) + 4));
}

/**
 * The staves stacked in [top, bottom), each with room for its notes (and `up` / `down` steps more for
 * stems and marks), a staff space at most `max` px. `grand`: the staves are one keyboard system, the
 * room between two staves shared (grandGap).
 */
export function planStaves(f: TouchFugue, staves: StaffSpec[], top: number, bottom: number, max: number, up = 5, down = 5, grand = false): Plan {
  const r = staves.map((s) => reach(f, s));
  const n = staves.length;
  const above = staves.map((_, i) => (grand && i > 0 ? 0 : r[i].above + up));
  const below = staves.map((_, i) => (grand && i < n - 1 ? grandGap(r[i].below, r[i + 1].above) : r[i].below + down));
  const steps = staves.reduce((a, s, i) => a + (above[i] + 8 + below[i]) * s.scale, 0);
  const room = bottom - top;
  const half = Math.min(room / steps, max / 2);
  const sp = 2 * half;
  let y = top + (room - steps * half) / 2;
  const tops = staves.map((s, i) => {
    y += above[i] * half * s.scale;
    const t = y;
    y += (8 + below[i]) * half * s.scale;
    return t;
  });
  const yOf = (step: number, i: number) => tops[i] + (staves[i].lines[4] - step) * half * staves[i].scale;
  return { sp, top: tops, y: yOf, y0: tops[0], y1: yOf(staves[n - 1].lines[0], n - 1), area: [top, bottom] };
}

/** Each staff's five lines' y, top first, on the half pixel: what the plate and the strip both draw (D231). */
export function staffLineYs(p: Plan, staves: StaffSpec[]): number[][] {
  return staves.map((s, i) => [...s.lines].reverse().map((l) => Math.round(p.y(l, i) * 2) / 2));
}

export interface Look {
  paper: string;
  staffInk: string;
  ink: (e: Ev) => string;
  /** The entries: GeruBach's red numbers, or an analyst's S / A. */
  marks: "numbers" | "letters";
  barNumbers: boolean;
  /** A pale band behind the player's staff. */
  mine: number | null;
  /** The player's voice and its ink (an entry's bracket in it). */
  player: number;
  mineInk: string;
}

/** The piece's entries in time, each with its notes' onsets ("voice:onset"). */
function entriesOf(f: TouchFugue) {
  const list = [...f.entries].sort((a, b) => a.on - b.on || a.voice - b.voice);
  const notes = new Set<string>();
  for (const e of list) for (const [on] of e.notes) notes.add(`${e.voice}:${on}`);
  return { list, notes };
}

// ---------------------------------------------------------------------------------------------------
// The strip's painter.

const HEAD_W = 1.18;

/** Paints the strip's units [u0, u1) into g (its origin at u0), every staff, bar line, note, beam, tie and mark. */
export function paintStrip(g: CanvasRenderingContext2D, f: TouchFugue, s: Strip, p: Plan, look: Look, u0: number, u1: number, h: number) {
  const sp = p.sp;
  const X = (u: number) => (u - u0) * sp;
  const st = s.staves;
  rect(g, 0, 0, (u1 - u0) * sp, h, look.paper);
  if (look.mine !== null) {
    const i = look.mine;
    rect(g, 0, p.y(st[i].lines[4], i) - 1.6 * sp * st[i].scale, (u1 - u0) * sp, (4 + 3.2) * sp * st[i].scale, "#1d55c4", 0.05);
  }
  // Staff lines across the tile, the past before the first bar too (D231: unbroken from the plate on).
  g.strokeStyle = look.staffInk;
  const ys = staffLineYs(p, st);
  st.forEach((sf, i) => {
    g.lineWidth = Math.max(0.6, 0.1 * sp * sf.scale);
    g.beginPath();
    for (const y of ys[i]) {
      g.moveTo(0, y);
      g.lineTo(X(Math.min(u1, s.end)), y);
    }
    g.stroke();
  });
  // The time signature at the strip's start.
  if (u0 < 0) {
    const [num, den] = f.meter.split("/");
    st.forEach((sf, i) => {
      const s2 = sp * sf.scale;
      const x = X(-3.4);
      if (f.meter === "4/4") glyph(g, BRAVURA, "timeSigCommon", x, p.y(sf.lines[2], i), s2, look.staffInk);
      else if (f.meter === "2/2") glyph(g, BRAVURA, "timeSigCutCommon", x, p.y(sf.lines[2], i), s2, look.staffInk);
      else {
        [...num].forEach((d, k) => glyph(g, BRAVURA, `timeSig${d}` as GlyphName, x + k * 1.7 * s2, p.y(sf.lines[3], i), s2, look.staffInk));
        [...den].forEach((d, k) => glyph(g, BRAVURA, `timeSig${d}` as GlyphName, x + k * 1.7 * s2, p.y(sf.lines[1], i), s2, look.staffInk));
      }
    });
  }
  // Bar lines through the system; the final double bar.
  g.fillStyle = look.staffInk;
  const lw = Math.max(1, 0.16 * sp);
  for (const b of s.bars) {
    if (b.x < u0 - 1 || b.x > u1 + 1 || b.x === 0) continue;
    g.fillRect(X(b.x) - lw / 2, p.y0, lw, p.y1 - p.y0);
    if (look.barNumbers && b.n > 0) {
      g.font = `italic ${Math.round(Math.max(9, sp * 1.15))}px "Liberation Serif", Georgia, serif`;
      g.textAlign = "left";
      g.textBaseline = "alphabetic";
      g.fillText(String(b.n), X(b.x) - 0.3 * sp, p.y0 - 1.1 * sp * st[0].scale);
    }
  }
  if (s.end >= u0 - 2 && s.end <= u1 + 2) {
    g.fillRect(X(s.end) - 1.4 * lw, p.y0, lw, p.y1 - p.y0);
    g.fillRect(X(s.end), p.y0, 3 * lw, p.y1 - p.y0);
  }
  // The events in reach (and the beams and ties that cross in).
  const lo = u0 - 8;
  const hi = u1 + 8;
  const prevNext = new Map<Ev, Ev>();
  let first = lowerBound(s.evs, lo);
  const last: Map<number, Ev> = new Map();
  for (let i = Math.max(0, first - 40); i < s.evs.length && s.evs[i].x <= hi; i++) {
    const e = s.evs[i];
    const p0 = last.get(e.voice);
    if (p0) prevNext.set(p0, e);
    last.set(e.voice, e);
  }
  first = Math.max(0, first - 40);
  const groupsSeen = new Set<number>();
  for (let i = first; i < s.evs.length && s.evs[i].x <= hi; i++) {
    const e = s.evs[i];
    if (e.x < lo) continue;
    const sf = st[e.staff];
    const s2 = sp * sf.scale;
    const ink = look.ink(e);
    const x = X(e.x);
    if (e.rest) {
      paintRest(g, e, sf, p, x, s2, ink);
      continue;
    }
    const hw = HEAD_W * s2;
    // Ledger lines.
    g.strokeStyle = look.staffInk;
    g.lineWidth = Math.max(0.7, 0.13 * s2);
    const top = Math.max(...e.heads.map((h) => h.step));
    const bot = Math.min(...e.heads.map((h) => h.step));
    g.beginPath();
    for (let l = sf.lines[4] + 2; l <= top; l += 2) line(g, x - 0.35 * s2, p.y(l, e.staff), x + hw + 0.35 * s2);
    for (let l = sf.lines[0] - 2; l >= bot; l -= 2) line(g, x - 0.35 * s2, p.y(l, e.staff), x + hw + 0.35 * s2);
    g.stroke();
    const head: GlyphName = e.base >= 4 ? "noteheadWhole" : e.base >= 2 ? "noteheadHalf" : "noteheadBlack";
    for (const h of e.heads) {
      const y = p.y(h.step, e.staff);
      if (h.acc !== null) glyph(g, BRAVURA, h.acc > 0 ? "accidentalSharp" : h.acc < 0 ? "accidentalFlat" : "accidentalNatural", x - 1.1 * s2, y, s2, ink);
      glyph(g, BRAVURA, head, x, y, s2, ink);
      if (e.dot) {
        const dy = (h.step - sf.lines[0]) % 2 === 0 ? -0.5 * s2 : 0;
        g.fillStyle = ink;
        g.beginPath();
        g.arc(x + hw + 0.4 * s2, y + dy, 0.17 * s2, 0, Math.PI * 2);
        g.fill();
      }
    }
    // A stem and flag of its own.
    if (e.group < 0 && e.base < 4) {
      const stemW = Math.max(0.8, 0.12 * s2);
      const ya = p.y(e.up ? bot : top, e.staff);
      const yb = p.y(e.up ? top : bot, e.staff) + (e.up ? -3.4 : 3.4) * s2;
      const sx = e.up ? x + hw - stemW / 2 : x + stemW / 2;
      stem(g, ink, stemW, sx, ya, yb);
      const fl = flagOf(e.base, e.up);
      if (fl) glyph(g, BRAVURA, fl, sx - stemW / 2, yb, s2, ink);
    } else if (e.group >= 0) groupsSeen.add(e.group);
    // A tie to the next.
    const nx = prevNext.get(e);
    if (e.tie && nx && !nx.rest) {
      for (const h of e.heads) {
        const y = p.y(h.step, e.staff);
        const dir = e.up ? 1 : -1;
        const xa = x + hw + 0.15 * s2;
        const xb = X(nx.x) - 0.15 * s2;
        g.fillStyle = ink;
        g.beginPath();
        g.moveTo(xa, y + dir * 0.45 * s2);
        g.quadraticCurveTo((xa + xb) / 2, y + dir * 1.25 * s2, xb, y + dir * 0.45 * s2);
        g.quadraticCurveTo((xa + xb) / 2, y + dir * 1.05 * s2, xa, y + dir * 0.45 * s2);
        g.fill();
      }
    }
  }
  for (const k of groupsSeen) paintBeamed(g, s, p, s.groups[k].map((i) => s.evs[i]), X, look);
  paintEntries(g, f, s, p, look, X, u0, u1);
}

const stepIndex = new WeakMap<Strip, Map<string, number>>();
/** Each note's first head's step, by "voice:onset". */
function stepsOf(s: Strip): Map<string, number> {
  let m = stepIndex.get(s);
  if (!m) {
    m = new Map();
    for (const e of s.evs) if (!e.rest && !e.tied) m.set(`${e.voice}:${e.src}`, e.heads[0].step);
    stepIndex.set(s, m);
  }
  return m;
}

function lowerBound(evs: Ev[], x: number): number {
  let lo = 0;
  let hi = evs.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (evs[m].x < x) lo = m + 1;
    else hi = m;
  }
  return lo;
}
function line(g: CanvasRenderingContext2D, x1: number, y: number, x2: number) {
  g.moveTo(x1, y);
  g.lineTo(x2, y);
}
function stem(g: CanvasRenderingContext2D, ink: string, w: number, x: number, y1: number, y2: number) {
  g.fillStyle = ink;
  g.fillRect(x - w / 2, Math.min(y1, y2), w, Math.abs(y2 - y1));
}
function flagOf(base: number, up: boolean): GlyphName | null {
  if (base > 0.5) return null;
  const n = base > 0.25 ? "8th" : base > 0.125 ? "16th" : "32nd";
  return `flag${n}${up ? "Up" : "Down"}` as GlyphName;
}
function beamsOf(base: number): number {
  return base <= 0.0625 ? 4 : base <= 0.125 ? 3 : base <= 0.25 ? 2 : 1;
}

function paintRest(g: CanvasRenderingContext2D, e: Ev, sf: StaffSpec, p: Plan, x: number, s2: number, ink: string) {
  const k = sf.voices.indexOf(e.voice);
  const shift = sf.voices.length > 1 ? (k < sf.voices.length / 2 ? 4 : -4) : 0;
  const mid = sf.lines[2] + shift;
  const name: GlyphName = e.measure || e.base >= 4 ? "restWhole" : e.base >= 2 ? "restHalf" : e.base >= 1 ? "restQuarter" : e.base >= 0.5 ? "rest8th" : e.base >= 0.25 ? "rest16th" : "rest32nd";
  const y = name === "restWhole" ? p.y(mid + 2, e.staff) : p.y(mid, e.staff);
  glyph(g, BRAVURA, name, x, y, s2, ink);
}

/** A beamed group: one stem direction, a straight beam (its slope limited), the shorter values' beams. */
function paintBeamed(g: CanvasRenderingContext2D, s: Strip, p: Plan, grp: Ev[], X: (u: number) => number, look: Look) {
  const sf = s.staves[grp[0].staff];
  const s2 = p.sp * sf.scale;
  const hw = HEAD_W * s2;
  const stemW = Math.max(0.8, 0.12 * s2);
  const up = grp[0].up;
  const ink = look.ink(grp[0]);
  const yEnd = (e: Ev) => p.y(up ? Math.max(...e.heads.map((h) => h.step)) : Math.min(...e.heads.map((h) => h.step)), e.staff);
  const yRoot = (e: Ev) => p.y(up ? Math.min(...e.heads.map((h) => h.step)) : Math.max(...e.heads.map((h) => h.step)), e.staff);
  const sx = (e: Ev) => (up ? X(e.x) + hw - stemW / 2 : X(e.x) + stemW / 2);
  const len = 3.3 * s2;
  const xa = sx(grp[0]);
  const xb = sx(grp[grp.length - 1]);
  let slope = (yEnd(grp[grp.length - 1]) - yEnd(grp[0])) / Math.max(1, xb - xa);
  slope = Math.max(-0.2, Math.min(0.2, slope)) * 0.6;
  let ya = up ? Infinity : -Infinity;
  for (const e of grp) {
    const want = (up ? yEnd(e) - len : yEnd(e) + len) - slope * (sx(e) - xa);
    ya = up ? Math.min(ya, want) : Math.max(ya, want);
  }
  const yAt = (x: number) => ya + slope * (x - xa);
  for (const e of grp) stem(g, look.ink(e), stemW, sx(e), yRoot(e), yAt(sx(e)));
  const th = 0.5 * s2;
  const gap = 0.75 * s2;
  const lvl = (k: number) => (up ? k * gap : -k * gap) + (up ? 0 : -th);
  const bar = (a: number, b: number, k: number) => {
    g.fillStyle = ink;
    g.beginPath();
    g.moveTo(a, yAt(a) + lvl(k));
    g.lineTo(b, yAt(b) + lvl(k));
    g.lineTo(b, yAt(b) + lvl(k) + th);
    g.lineTo(a, yAt(a) + lvl(k) + th);
    g.closePath();
    g.fill();
  };
  bar(xa - stemW / 2, xb + stemW / 2, 0);
  for (let k = 1; k < 4; k++)
    for (let i = 0; i < grp.length; i++) {
      const e = grp[i];
      if (beamsOf(e.base) <= k) continue;
      const nx = grp[i + 1];
      const pv = grp[i - 1];
      let a = sx(e);
      let b = a;
      if (nx && beamsOf(nx.base) > k) b = sx(nx);
      else if (!(pv && beamsOf(pv.base) > k)) {
        if (nx) b = a + 1.1 * s2;
        else a = a - 1.1 * s2;
      } else continue;
      bar(a - stemW / 2, b + stemW / 2, k);
    }
}

/** The entries: a bracket over (or under) the voice's notes, GeruBach's red circled number or "S" / "A". */
function paintEntries(g: CanvasRenderingContext2D, f: TouchFugue, s: Strip, p: Plan, look: Look, X: (u: number) => number, u0: number, u1: number) {
  const { list } = entriesOf(f);
  list.forEach((e, k) => {
    const a = s.xOf(e.on);
    const b = s.xOf(e.end);
    if (b < u0 - 4 || a > u1 + 4) return;
    const staff = Math.max(0, s.staves.findIndex((x) => x.voices.includes(e.voice)));
    const sf = s.staves[staff];
    const s2 = p.sp * sf.scale;
    const shared = sf.voices.length > 1;
    const above = !shared || sf.voices.indexOf(e.voice) < sf.voices.length / 2;
    const at = stepsOf(s);
    const steps = e.notes.map((n) => at.get(`${e.voice}:${n[0]}`) ?? sf.lines[2]);
    const y = above ? Math.min(p.y(sf.lines[4], staff) - 1.4 * s2, ...steps.map((st) => p.y(st, staff) - 4.2 * s2)) : Math.max(p.y(sf.lines[0], staff) + 1.4 * s2, ...steps.map((st) => p.y(st, staff) + 4.2 * s2));
    const pad = look.marks === "numbers" ? Math.max(6, 0.95 * s2) + 1 : 0.9 * s2;
    // Kept off the neighbouring staff's lines (D231: an inner voice's bracket in a grand staff's gap).
    let lim: [number, number] = [p.area[0] + pad, p.area[1] - pad];
    if (above && staff > 0) lim = [Math.max(lim[0], p.y(s.staves[staff - 1].lines[0], staff - 1) + 1.5 * p.sp), lim[1]];
    if (!above && staff < s.staves.length - 1) lim = [lim[0], Math.min(lim[1], p.y(s.staves[staff + 1].lines[4], staff + 1) - 1.5 * p.sp)];
    const yy = Math.max(lim[0], Math.min(lim[1], y));
    const tick = (above ? 1 : -1) * 0.7 * s2;
    // GeruBach's bracket in its number's red (D231: in the staves' black it read as a stray staff line).
    const col = e.voice === look.player ? look.mineInk : look.marks === "numbers" ? "#e0281b" : look.staffInk;
    const x1 = X(a) - 0.4 * s2;
    const x2 = X(b) - 0.8 * s2;
    g.strokeStyle = col;
    g.lineWidth = Math.max(1, 0.14 * s2);
    g.beginPath();
    g.moveTo(x1, yy + tick);
    g.lineTo(x1, yy);
    g.lineTo(x2, yy);
    g.lineTo(x2, yy + tick);
    g.stroke();
    if (look.marks === "numbers") {
      const r = Math.max(6, 0.95 * s2);
      g.fillStyle = "#e0281b";
      g.beginPath();
      g.arc(x1, yy, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#fff";
      g.font = `bold ${Math.round(r * 1.25)}px "Liberation Sans", Arial, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(String(k + 1), x1, yy + 0.5);
    } else {
      const text = e.form === "answer" ? "A" : "S";
      g.font = `bold ${Math.round(Math.max(10, 1.5 * s2))}px "Liberation Serif", Georgia, serif`;
      const tw = g.measureText(text).width;
      rect(g, x1 + 2, yy - 0.8 * s2, tw + 4, 1.6 * s2, look.paper);
      g.fillStyle = col;
      g.textAlign = "left";
      g.textBaseline = "middle";
      g.fillText(text, x1 + 4, yy + 0.5);
    }
  });
}

// ---------------------------------------------------------------------------------------------------
// The tiles: the strip painted a slice at a time, a few kept.

const TILE = 512;
const KEEP = 6;
export interface Scroll {
  key: string;
  f: TouchFugue;
  strip: Strip;
  plan: Plan;
  look: Look;
  res: number;
  tiles: Map<number, HTMLCanvasElement>;
  pool: HTMLCanvasElement[];
}
const scrolls = new Map<string, { strip: Strip; ms: number }>();
let cur: Scroll | null = null;

/** Measurements (the decision's numbers, D227): the layout's and the tiles' time, the tiles kept. */
export const STATS = { layoutMs: 0, tileMs: 0, tiles: 0, painted: 0 };
(globalThis as { __uiStats?: typeof STATS }).__uiStats = STATS;

/** A piece's strip (laid out once per piece and staff plan). */
export function stripOf(f: TouchFugue, staves: StaffSpec[], key: string): Strip {
  const k = `${f.id}:${key}`;
  let s = scrolls.get(k);
  if (!s) {
    if (scrolls.size > 6) scrolls.clear();
    const t0 = performance.now();
    const strip = layoutStrip(f, staves);
    s = { strip, ms: performance.now() - t0 };
    STATS.layoutMs = s.ms;
    scrolls.set(k, s);
  }
  return s.strip;
}

function newCanvas(w: number, h: number): HTMLCanvasElement {
  // Off the page (node tests), a canvas that draws nothing.
  if (typeof document === "undefined") {
    const noop: CanvasRenderingContext2D = new Proxy({} as CanvasRenderingContext2D, { get: (t, k) => (k in t ? (t as never)[k] : () => ({ width: 0 })), set: (t, k, v) => (((t as unknown as Record<string | symbol, unknown>)[k] = v), true) });
    return { width: w, height: h, getContext: () => noop } as unknown as HTMLCanvasElement;
  }
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function scrollFor(key: string, make: () => Omit<Scroll, "key" | "tiles" | "pool">): Scroll {
  if (cur && cur.key === key) return cur;
  const pool = cur ? [...cur.pool, ...cur.tiles.values()] : [];
  cur = { key, ...make(), tiles: new Map(), pool };
  return cur;
}

function tile(sc: Scroll, i: number, h: number): HTMLCanvasElement {
  const hit = sc.tiles.get(i);
  if (hit) {
    sc.tiles.delete(i);
    sc.tiles.set(i, hit);
    return hit;
  }
  const W = Math.ceil(TILE * sc.res);
  const H = Math.ceil(h * sc.res);
  if (sc.tiles.size >= KEEP) {
    const old = sc.tiles.keys().next().value as number;
    sc.pool.push(sc.tiles.get(old)!);
    sc.tiles.delete(old);
  }
  const c = sc.pool.pop() ?? newCanvas(W, H);
  if (c.width !== W || c.height !== H) (c.width = W), (c.height = H);
  const g = c.getContext("2d")!;
  const t0 = performance.now();
  g.setTransform(sc.res, 0, 0, sc.res, 0, 0);
  const u0 = (i * TILE) / sc.plan.sp;
  paintStrip(g, sc.f, sc.strip, sc.plan, sc.look, u0, u0 + TILE / sc.plan.sp, h);
  const ms = performance.now() - t0;
  STATS.painted++;
  STATS.tileMs = STATS.tileMs ? STATS.tileMs * 0.8 + ms * 0.2 : ms;
  sc.tiles.set(i, c);
  STATS.tiles = sc.tiles.size;
  return c;
}

/** Blits the strip so that `nowX` (strip units) stands at screen x `bandX`; paints one tile ahead. */
function blit(c: Ctx, sc: Scroll, nowX: number, bandX: number, x0: number) {
  const sp = sc.plan.sp;
  const off = bandX - nowX * sp;
  const a = Math.floor((x0 - off) / TILE);
  const b = Math.floor((c.W - off) / TILE);
  for (let i = a; i <= b; i++) c.g.drawImage(tile(sc, i, c.H), off + i * TILE, 0, TILE, c.H);
  // The next tile, before it is needed.
  if (!sc.tiles.has(b + 1)) tile(sc, b + 1, c.H);
}

/** Screen x of a strip unit, for the frame's overlays. */
function screenX(sc: Scroll, nowX: number, bandX: number, u: number): number {
  return bandX + (u - nowX) * sc.plan.sp;
}

/** The player's notes as the game has judged them: a halo where hit, red where missed. */
function overlay(c: Ctx, sc: Scroll, nowX: number, bandX: number, x0: number) {
  const { g } = c;
  const voice = c.fr.voice;
  const staff = Math.max(0, sc.strip.staves.findIndex((s) => s.voices.includes(voice)));
  const s2 = sc.plan.sp * sc.strip.staves[staff].scale;
  for (const n of c.fr.notes) {
    if (n.state !== "hit" && n.state !== "miss") continue;
    const x = screenX(sc, nowX, bandX, sc.strip.xOf(n.on));
    if (x < x0 - 10 || x > c.W + 10) continue;
    const y = sc.plan.y(n.step, staff);
    if (n.state === "hit") {
      g.globalAlpha = 0.22;
      g.fillStyle = "#2f6fdc";
      g.beginPath();
      g.arc(x + 0.6 * s2, y, 1.15 * s2, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    } else glyph(g, BRAVURA, "noteheadBlack", x, y, s2, "#d0473b");
  }
}

/** The fixed plate at the left: the clefs and the key signature (the strip scrolls under it). */
export function plate(c: Ctx, sc: Scroll, w: number, names?: string[]) {
  const { g } = c;
  const { plan, strip, look } = sc;
  rect(g, 0, 0, w - 10, c.H, look.paper);
  const grad = g.createLinearGradient(w - 10, 0, w, 0);
  grad.addColorStop(0, look.paper);
  grad.addColorStop(1, `${look.paper}00`);
  g.fillStyle = grad;
  g.fillRect(w - 10, 0, 10, c.H);
  const sig = keySignature(c.f.key);
  const SH = [38, 35, 39, 36, 33, 37, 34];
  const FL = [34, 37, 33, 36, 32, 35, 31];
  const left = names ? 26 : 0;
  strip.staves.forEach((s, i) => {
    const s2 = plan.sp * s.scale;
    const x = left + 0.5 * s2 + 2;
    g.strokeStyle = look.staffInk;
    g.lineWidth = Math.max(0.6, 0.1 * s2);
    g.beginPath();
    for (const y of staffLineYs(plan, strip.staves)[i]) line(g, left, y, w);
    g.stroke();
    // The G clef curls round its second line, the F clef's dots straddle its fourth (D231: by the staff's lines, so a tenor's G clef an octave down too, its 8 beneath).
    if (s.clef === "f") glyph(g, BRAVURA, "fClef", x, plan.y(s.lines[3], i), s2, look.staffInk);
    else glyph(g, BRAVURA, "gClef", x, plan.y(s.lines[1], i), s2, look.staffInk);
    if (s.clef === "g8") glyph(g, BRAVURA, "timeSig8", x + 0.85 * s2, plan.y(s.lines[0], i) + 2.9 * s2, 0.5 * s2, look.staffInk);
    const vals = [...sig.values()];
    const sharp = vals[0] > 0;
    for (let k = 0; k < vals.length; k++) {
      let pos = (sharp ? SH : FL)[k] - (38 - s.lines[4] + (s.clef === "f" ? 2 : 0));
      while (pos > s.lines[4] + 1) pos -= 7;
      while (pos < s.lines[0] - 1) pos += 7;
      glyph(g, BRAVURA, sharp ? "accidentalSharp" : "accidentalFlat", x + 3.0 * s2 + k * 0.95 * s2, plan.y(pos, i), s2, look.staffInk);
    }
    if (names) {
      g.fillStyle = s.scale < 1 ? "#666" : "#1d55c4";
      g.font = `${s.scale < 1 ? "italic" : "italic bold"} ${Math.round(Math.min(12, Math.max(9, s2 * 1.1)))}px "Liberation Serif", Georgia, serif`;
      g.textAlign = "left";
      g.textBaseline = "middle";
      g.fillText(names[i], 1, plan.y(s.lines[2], i));
    }
  });
  // The system's bracket (several staves) or brace line.
  rect(g, left - 3, plan.y0 - 0.5 * plan.sp, Math.max(2, 0.35 * plan.sp), plan.y1 - plan.y0 + plan.sp, look.staffInk);
  rect(g, left, plan.y0, Math.max(1, 0.16 * plan.sp), plan.y1 - plan.y0, look.staffInk);
}

function plateWidth(c: Ctx, sp: number, names: boolean): number {
  return (names ? 26 : 0) + sp * (3.9 + keySignature(c.f.key).size * 0.95) + 10;
}

// ---------------------------------------------------------------------------------------------------

const GB_TOP = 0.13;
const GB_FOOT = 0.12;
const footCache = new Map<string, number[]>();

export const GERUBACH: Template = {
  name: "GERUBACH",
  pixel: 0,
  bars: 6,
  playhead: 0.3,
  chrome: true,
  rows: false,
  css: ".ui-gerubach .tg-box { background: #000 !important; }",
  geo: (L) => fullGeo(L),
  paint(c) {
    const { g, W, H } = c;
    const f = fugueById(c.f.id);
    const player = c.fr.voice;
    const staves = grandStaves(f.voices.length);
    const strip = stripOf(f, staves, "grand");
    const top = H * GB_TOP;
    const foot = H * GB_FOOT;
    const res = Math.min(2, typeof devicePixelRatio === "number" ? devicePixelRatio : 1);
    const { notes } = entriesOf(f);
    const sc = scrollFor(`gb:${f.id}:${player}:${Math.round(W)}x${Math.round(H)}:${res}`, () => ({
      f,
      strip,
      plan: planStaves(f, staves, top + 2, H - foot - 2, 15, 6, 6, true),
      look: {
        paper: "#ffffff",
        staffInk: "#1a1a1a",
        ink: (e: Ev) => (e.voice === player ? "#1d3fbf" : e.rest ? "#9a9a9a" : notes.has(`${e.voice}:${e.src}`) ? "#000000" : "#6b6b6b"),
        marks: "numbers",
        barNumbers: true,
        mine: null,
        player,
        mineInk: "#1d3fbf",
      },
      res,
    }));
    const pw = plateWidth(c, sc.plan.sp, false);
    const bandX = pw + (W - pw) * 0.3;
    const nowX = strip.xOf(c.now);
    rect(g, 0, 0, W, H, "#fff");
    blit(c, sc, nowX, bandX, pw - 10);
    overlay(c, sc, nowX, bandX, pw);
    plate(c, sc, pw);
    // The red band where the music sounds.
    const bw = Math.max(1.8 * sc.plan.sp, 14);
    rect(g, bandX - 0.45 * sc.plan.sp, top, bw, H - top - foot, "#f04a3c", 0.32);
    // The title bar.
    rect(g, 0, 0, W, top, "#000");
    g.fillStyle = "#fff";
    g.textBaseline = "middle";
    g.font = `bold ${Math.round(top * 0.62)}px "Rockwell", "Roboto Slab", "DejaVu Serif", Georgia, serif`;
    const title = `${f.kind === "prelude" ? "PRAELUDIUM" : f.book ? "FUGA" : "CONTRAPUNCTUS"} ${roman(f.number || 14)}.`;
    spaced(g, title, W / 2, top / 2 + 1, top * 0.06);
    // The 24 keys, the piece's in red, the key reached underlined.
    rect(g, 0, H - foot, W, foot, "#000");
    g.font = `bold ${Math.round(foot * 0.66)}px "Liberation Serif", "DejaVu Serif", Georgia, serif`;
    g.textAlign = "left";
    const words = WTC_KEYS.map(keyShort);
    const fk = `${Math.round(foot)}`;
    let widths = footCache.get(fk);
    if (!widths) footCache.set(fk, (widths = words.map((w) => g.measureText(w).width)));
    const gapW = foot * 0.32;
    const home = WTC_KEYS.indexOf(f.key);
    const now = WTC_KEYS.indexOf(c.fr.key);
    const total = widths.reduce((a, b) => a + b + gapW, 0);
    let x = total < W || home < 0 ? (W - total) / 2 : W / 2 - (widths.slice(0, home).reduce((a, b) => a + b + gapW, 0) + widths[home] / 2);
    words.forEach((w, i) => {
      g.fillStyle = i === home ? "#ff2a1a" : "#6f6f6f";
      g.fillText(w, x, H - foot / 2 + 1);
      if (i === now && now !== home) rect(g, x, H - foot * 0.2, widths![i], Math.max(1.5, foot * 0.05), "#ff2a1a", 0.8);
      x += widths![i] + gapW;
    });
  },
};

function spaced(g: CanvasRenderingContext2D, text: string, cx: number, y: number, track: number) {
  const ws = [...text].map((ch) => g.measureText(ch).width);
  const total = ws.reduce((a, b) => a + b + track, -track);
  let x = cx - total / 2;
  g.textAlign = "left";
  [...text].forEach((ch, i) => {
    g.fillText(ch, x, y);
    x += ws[i] + track;
  });
}

// ---------------------------------------------------------------------------------------------------

export const SCORE: Template = {
  name: "SCORE",
  pixel: 0,
  bars: 6,
  playhead: 0.3,
  chrome: true,
  rows: false,
  css: ".ui-score .tg-box { background: #fdfdfb !important; }",
  geo: (L) => fullGeo(L),
  paint(c) {
    const { g, W, H } = c;
    const f = fugueById(c.f.id);
    const player = Math.min(c.fr.voice, f.voices.length - 1);
    const staves = voiceStaves(f, player);
    const strip = stripOf(f, staves, `voices:${player}`);
    const res = Math.min(2, typeof devicePixelRatio === "number" ? devicePixelRatio : 1);
    const sc = scrollFor(`sc:${f.id}:${player}:${Math.round(W)}x${Math.round(H)}:${res}`, () => ({
      f,
      strip,
      plan: planStaves(f, staves, 4, H - 2, 10, 5, 4),
      look: {
        paper: "#fdfdfb",
        staffInk: "#222222",
        ink: (e: Ev) => (e.voice === player ? "#1d55c4" : "#1a1a1a"),
        marks: "letters",
        barNumbers: true,
        mine: player,
        player,
        mineInk: "#1d55c4",
      },
      res,
    }));
    const pw = plateWidth(c, sc.plan.sp, true);
    const bandX = pw + (W - pw) * 0.28;
    const nowX = strip.xOf(c.now);
    rect(g, 0, 0, W, H, "#fdfdfb");
    blit(c, sc, nowX, bandX, pw - 10);
    // The bar sounding, tinted.
    const bars = strip.bars;
    let k = 0;
    while (k + 1 < bars.length && bars[k + 1].on <= c.now) k++;
    const xa = screenX(sc, nowX, bandX, bars[k]?.x ?? 0);
    const xb = screenX(sc, nowX, bandX, bars[k + 1]?.x ?? strip.end);
    rect(g, xa, sc.plan.y0 - sc.plan.sp, xb - xa, sc.plan.y1 - sc.plan.y0 + 2 * sc.plan.sp, "#2f6fdc", 0.06);
    overlay(c, sc, nowX, bandX, pw);
    plate(c, sc, pw, c.names.map((n) => `${n[0]}${n.slice(1).toLowerCase().slice(0, 2)}.`));
    // The cursor.
    rect(g, bandX - 1, sc.plan.y0 - 1.2 * sc.plan.sp, 2.5, sc.plan.y1 - sc.plan.y0 + 2.4 * sc.plan.sp, "#2f6fdc", 0.7);
  },
};
