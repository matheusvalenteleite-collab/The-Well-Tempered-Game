/**
 * D298: the SHEET mode's picture: the fugue engraved (tools/sheet/engrave.ts, Verovio, at build time; read
 * here from public/sheet, a piece at a time, when first wanted) on a white page, black ink, every voice's
 * notes in its colour (darkened for paper: the game's own hues), the player's no bigger than the others.
 * One long system scrolls past a thin fixed playhead; where it stands follows the engraving's time map
 * (sheet-format.ts: each onset's tick at its heads' x, linear between two), so the engraver's spacing,
 * not the clock's, sets the speed, and the clock it reads is the engine's (the frame's `now`: its ticks,
 * the count-in, the final ritard and the screen's delay in them): the note under the playhead is the
 * note sounding.
 * The engraving is painted once into tiles (bitmaps a little wider than a screen's fifth, at most twice the
 * CSS pixel), made as they come near and dropped once behind; each frame only blits two to four tiles and
 * draws the few marks of the game: the next note ringed, a miss crossed in red under its head, the
 * entries' brackets (Subject, Answer; dashed, with a dot a beat, while ahead), small bar numbers. The
 * opening's clefs and key signatures stayed at the left (a column the music passes under); D307: they
 * scroll away with the music, as in GeruBach's videos.
 * D300: the playhead 35% into the score right of that column (about the box's middle), the music played
 * in sight until it leaves at the left, a shade lighter; each entry on a faint band from its first note
 * to its last (its voice's colour hugging its heads on two staves; a warm neutral over its staff in the
 * open score; fainter while announced); the open score in black, the player's staff marked at the
 * clefs; the tiles at the screen's own resolution (up to 3), each made a still image once painted.
 */
import type { Frame } from "../touch/MusicBox.tsx";
import { SITE } from "../audio/site.ts";
import { tr } from "../i18n/index.ts";
import { eachMark, entryBand, markInk, noteIndex, paperInk, playheadX, sheetNotes, SHEET_UNIT, timeMap, xAtTick, type SheetData, type SheetLayoutId, type SheetNote } from "./sheet-format.ts";

export { paperInk };
export const PAPER = "#ffffff";
/** D300: the open score's brackets and words (black like its notes), and its subject band (a warm neutral). */
const OPEN_MARK = "#3a3631";
const OPEN_BAND = "#b4914f";
/** The bands' opacity: an entry sounding or past, one announced (ahead). */
const BAND_ALPHA = { grand: 0.12, open: 0.14 };
const BAND_AHEAD = 0.45;
/** The page's room above and below the staves (staff spaces). */
const ROOM_ABOVE = 3.4;
const ROOM_BELOW = 2.8;
/** The largest staff space drawn (CSS px): a tablet's box does not make the music huge. */
const MAX_SPACE = 12;
/** A tile's width (CSS px) and how many are kept. */
const TILE = 512;
const KEEP = 8;
const SERIF = 'Georgia, "Times New Roman", serif';

// ---------------------------------------------------------------- loading

type Load = { data: SheetData | null; promise: Promise<SheetData | null> };
const loads = new Map<string, Load>();
let glyphs: Promise<Map<number, Path2D> | null> | null = null;
let glyphsReady: Map<number, Path2D> | null = null;

async function fetchJson<T>(path: string): Promise<T | null> {
  const here = typeof document !== "undefined" ? document.baseURI : SITE;
  for (const base of [...new Set([here, SITE])]) {
    try {
      const res = await fetch(new URL(path, base).href);
      if (!res.ok) continue;
      const text = await res.text();
      // A host that answers a missing file with its index page.
      if (/^\s*</.test(text)) continue;
      return JSON.parse(text) as T;
    } catch {
      /* the next place */
    }
  }
  return null;
}

function loadGlyphs(font: string) {
  glyphs ??= fetchJson<Record<string, [string, number[]]>>(`sheet/glyphs-${font}.json`).then((t) => {
    if (!t) return null;
    const m = new Map<number, Path2D>();
    for (const [code, [d]] of Object.entries(t)) m.set(Number(code), new Path2D(d));
    glyphsReady = m;
    return m;
  });
  return glyphs;
}

/** Starts loading a piece's engraving (and the font's glyphs); resolves to it, or null where there is none. */
export function loadSheet(id: string, layout: SheetLayoutId): Promise<SheetData | null> {
  const key = `${id}.${layout}`;
  let l = loads.get(key);
  if (!l) {
    const entry: Load = { data: null, promise: Promise.resolve(null) };
    entry.promise = fetchJson<SheetData>(`sheet/${key}.json`).then(async (d) => {
      if (!d || d.v !== 2) return null;
      await loadGlyphs(d.font);
      entry.data = d;
      return d;
    });
    loads.set(key, (l = entry));
  }
  return l.promise;
}

/** The engraving if loaded (and its glyphs), else null (loading it). */
export function sheetNow(id: string, layout: SheetLayoutId): SheetData | null {
  const l = loads.get(`${id}.${layout}`);
  if (!l) void loadSheet(id, layout);
  return l?.data && glyphsReady ? l.data : null;
}

// ---------------------------------------------------------------- the engraving, prepared

interface Mark {
  /** The ink list (0 black, v + 1 voice v). */
  k: number;
  kind: 0 | 1 | 2 | 3;
  x0: number;
  x1: number;
  a: number[];
  path?: Path2D;
}

const BUCKET = 4 * SHEET_UNIT;

/** An engraving made ready to paint: its marks by place, its notes, its time map. */
export class Engraving {
  readonly notes: SheetNote[];
  /** The time maps, by the voice played (timeMap: through its heads). */
  private maps = new Map<number, [number, number][]>();
  readonly heads: Map<string, { x: number; y: number }>;
  readonly headsAt = new Map<string, { x: number; y: number }>();
  private buckets: Mark[][] = [];
  private long: Mark[] = [];
  private codes: number[];
  readonly d: SheetData;
  constructor(d: SheetData) {
    this.d = d;
    this.notes = sheetNotes(d);
    this.heads = noteIndex(this.notes);
    for (const [v, t, , x, y] of this.notes) {
      const k = `${v}:${t}`;
      const o = this.headsAt.get(k);
      if (!o || y < o.y) this.headsAt.set(k, { x, y });
    }
    this.codes = d.glyphs;
    d.ink.forEach((list, k) => {
      eachMark(
        list,
        (gi, x, y, s) => this.add({ k, kind: 0, x0: x - 40, x1: x + 10 * s, a: [this.codes[gi], x, y, s] }),
        (x1, y1, x2, y2, w) => this.add({ k, kind: 1, x0: Math.min(x1, x2) - w, x1: Math.max(x1, x2) + w, a: [x1, y1, x2, y2, w] }),
        (l, at, n, x1) => {
          const a = [x1, l[at]];
          let lo = x1;
          let hi = x1;
          for (let j = 1; j < n; j++) {
            const x = x1 + l[at + 1 + 2 * (j - 1)];
            a.push(x, l[at + 2 + 2 * (j - 1)]);
            lo = Math.min(lo, x);
            hi = Math.max(hi, x);
          }
          this.add({ k, kind: 2, x0: lo, x1: hi, a });
        },
      );
    });
    for (const [k, w, path] of d.curves) {
      const xs = [...path.matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
      this.add({ k, kind: 3, x0: Math.min(...xs) - w, x1: Math.max(...xs) + w, a: [w], path: typeof Path2D === "undefined" ? undefined : new Path2D(path) });
    }
  }
  private add(m: Mark) {
    if (m.x1 - m.x0 > 3 * BUCKET) return void this.long.push(m);
    const b = Math.max(0, Math.floor(m.x0 / BUCKET));
    (this.buckets[b] ??= []).push(m);
  }
  /** The marks that may touch [x0, x1] (units). */
  *marksIn(x0: number, x1: number): Generator<Mark> {
    for (const m of this.long) if (m.x1 >= x0 && m.x0 <= x1) yield m;
    const b0 = Math.max(0, Math.floor(x0 / BUCKET) - 3);
    const b1 = Math.floor(x1 / BUCKET);
    for (let b = b0; b <= b1; b++) for (const m of this.buckets[b] ?? []) if (m.x1 >= x0 && m.x0 <= x1) yield m;
  }
  /** Paints the marks in [x0, x1] (units) with the context's transform set to units; `only`: one ink list. */
  paint(g: CanvasRenderingContext2D, x0: number, x1: number, inkOf: (k: number) => string, glyphPaths: Map<number, Path2D>, only?: number) {
    for (const m of this.marksIn(x0, x1)) {
      if (only !== undefined && m.k !== only) continue;
      const ink = inkOf(m.k);
      if (m.kind === 0) {
        const p = glyphPaths.get(m.a[0]);
        if (!p) continue;
        const s = m.a[3] / 100;
        g.fillStyle = ink;
        g.save();
        g.translate(m.a[1], m.a[2]);
        g.scale(s, -s);
        g.fill(p);
        g.restore();
      } else if (m.kind === 1) {
        g.strokeStyle = ink;
        g.lineWidth = m.a[4];
        g.beginPath();
        g.moveTo(m.a[0], m.a[1]);
        g.lineTo(m.a[2], m.a[3]);
        g.stroke();
      } else if (m.kind === 2) {
        g.fillStyle = ink;
        g.beginPath();
        g.moveTo(m.a[0], m.a[1]);
        for (let j = 2; j < m.a.length; j += 2) g.lineTo(m.a[j], m.a[j + 1]);
        g.closePath();
        g.fill();
      } else if (m.path) {
        g.fillStyle = ink;
        g.strokeStyle = ink;
        g.lineWidth = m.a[0];
        g.fill(m.path);
        if (m.a[0] > 0) g.stroke(m.path);
      }
    }
  }
  /** x (units) where the playhead stands at a tick. */
  xAt(tick: number, voice = -1): number {
    let map = this.maps.get(voice);
    if (!map) this.maps.set(voice, (map = timeMap(this.notes, this.d.end, voice)));
    return xAtTick(map, tick);
  }
}

// ---------------------------------------------------------------- the view

interface Geometry {
  w: number;
  h: number;
  dpr: number;
  /** CSS px per unit; the staves' offset (CSS px of y = 0). */
  k: number;
  oy: number;
}

const SVG = "http://www.w3.org/2000/svg";

/** An entry's bracket on the page (CSS px of the strip) and its elements. */
interface Bracket {
  xa: number;
  xz: number;
  y: number;
  up: boolean;
  g: SVGGElement;
  line: SVGPathElement;
  band: SVGRectElement | null;
  dots: SVGGElement;
  text: SVGTextElement;
  /** The word's width (about), the dots' height; where the word stands now. */
  ww: number;
  dy: number;
  lx: number;
  /** What is drawn: dashed (ahead) and the beats to go. */
  ahead: boolean | null;
  beats: number;
}

/**
 * One piece's sheet in a box of one size. Drawn in the box's place as page elements (sheet-view's own
 * layer over the box's canvas): a strip as wide as the piece holding the tiles (canvases, each painted
 * once) and an SVG of the game's marks (brackets, ring, crosses) in the strip's coordinates, moved each
 * frame by a CSS transform only (nothing re-laid out, nothing re-painted but what changes); the
 * playhead and the clefs' column fixed over it.
 */
export class SheetView {
  readonly e: Engraving;
  private geo: Geometry | null = null;
  private tiles = new Map<number, HTMLCanvasElement | HTMLImageElement>();
  private brackets = new Map<string, Bracket | null>();
  private crosses = new Set<string>();
  private ringAt = "";
  /** What the fixed elements (playhead, veil, the player's staff's mark) were last set for. */
  private fixedAt = "";
  /** Tiles painted (for the measurements). */
  painted = 0;
  private readonly glyphPaths: Map<number, Path2D>;
  private dom: { root: HTMLDivElement; strip: HTMLDivElement; svg: SVGSVGElement; marks: SVGGElement; ring: SVGEllipseElement; head: HTMLDivElement; headCanvas: HTMLCanvasElement; playhead: HTMLDivElement; bands: SVGGElement; past: HTMLDivElement; mine: HTMLDivElement } | null = null;
  constructor(d: SheetData, glyphPaths: Map<number, Path2D>) {
    this.e = new Engraving(d);
    this.glyphPaths = glyphPaths;
  }

  private inkOf = (k: number) => markInk(this.e.d.layout, k, this.e.d.voices);

  private layout(w: number, h: number): Geometry {
    // D300: the tiles at the screen's own resolution (an iPhone's 3): at 2, scaled up, the heads and
    // the hairlines went soft and round.
    const dpr = Math.min(3, typeof devicePixelRatio === "number" ? devicePixelRatio : 1);
    const g = this.geo;
    if (g && g.w === w && g.h === h && g.dpr === dpr) return g;
    const d = this.e.d;
    const span = d.h + (ROOM_ABOVE + ROOM_BELOW) * SHEET_UNIT;
    const k = Math.min(h / span, MAX_SPACE / SHEET_UNIT);
    const oy = (h - d.h * k) / 2 + ((ROOM_ABOVE - ROOM_BELOW) / 2) * SHEET_UNIT * k;
    this.geo = { w, h, dpr, k, oy };
    // A new size: everything drawn anew.
    for (const [i, t] of [...this.tiles]) this.drop(i, t);
    if (this.dom) {
      this.dom.marks.replaceChildren(this.dom.ring);
      this.dom.bands.replaceChildren();
      this.dom.head.style.display = "none";
      this.fixedAt = "";
      this.dom.headCanvas.width = 0;
    }
    this.brackets.clear();
    this.crosses.clear();
    this.ringAt = "";
    return this.geo;
  }

  /** The page's elements in the box (made once, put back if the box was rebuilt). */
  private mount(roll: HTMLElement): NonNullable<SheetView["dom"]> {
    if (!this.dom) {
      const root = document.createElement("div");
      root.className = "tb-sheet-page";
      const strip = document.createElement("div");
      strip.className = "tb-sheet-strip";
      const svg = document.createElementNS(SVG, "svg");
      svg.setAttribute("class", "tb-sheet-marks");
      const marks = document.createElementNS(SVG, "g");
      const ring = document.createElementNS(SVG, "ellipse");
      ring.setAttribute("fill", "none");
      ring.setAttribute("stroke-width", "1.5");
      ring.style.display = "none";
      marks.append(ring);
      // D300: the entries' bands, under the brackets and the ring.
      const bands = document.createElementNS(SVG, "g");
      svg.append(bands, marks);
      strip.append(svg);
      // D300: what was played stays in sight, a shade lighter (a veil from the box's left to the playhead).
      const past = document.createElement("div");
      past.className = "tb-sheet-past";
      const head = document.createElement("div");
      head.className = "tb-sheet-headpaper";
      const headCanvas = document.createElement("canvas");
      head.append(headCanvas);
      // D300: the open score: the player's staff marked at the clefs (a rule in the player's colour).
      const mine = document.createElement("div");
      mine.className = "tb-sheet-mine";
      const playhead = document.createElement("div");
      playhead.className = "tb-sheet-playhead";
      root.append(strip, past, head, mine, playhead);
      this.dom = { root, strip, svg, marks, ring, head, headCanvas, playhead, bands, past, mine };
    }
    // Over the box's canvas, under what the box holds after it (the count-in, the cards).
    if (this.dom.root.parentElement !== roll) roll.insertBefore(this.dom.root, roll.querySelector("canvas")?.nextSibling ?? null);
    return this.dom;
  }

  /** Takes the page out of the box (another piece, another mode). */
  unmount() {
    this.dom?.root.remove();
  }

  /** A tile's canvas in the strip, painted now if it is not yet. */
  private tile(i: number, geo: Geometry, strip: HTMLDivElement): HTMLCanvasElement | HTMLImageElement {
    let t = this.tiles.get(i);
    if (t) return t;
    const { k, dpr, h, oy } = geo;
    const pw = Math.round(TILE * dpr);
    const ph = Math.round(h * dpr);
    t = document.createElement("canvas");
    t.width = pw;
    t.height = ph;
    t.style.left = `${i * TILE}px`;
    t.style.width = `${TILE}px`;
    t.style.height = `${h}px`;
    const g = t.getContext("2d")!;
    g.fillStyle = PAPER;
    g.fillRect(0, 0, pw, ph);
    const x0 = (i * TILE) / k;
    const x1 = ((i + 1) * TILE) / k;
    g.setTransform(k * dpr, 0, 0, k * dpr, -x0 * k * dpr, oy * dpr);
    g.lineCap = "butt";
    this.e.paint(g, x0, x1, this.inkOf, this.glyphPaths);
    // The bar numbers, small, over the top staff (bar 1 has none, as printed).
    const d = this.e.d;
    const sp = SHEET_UNIT * k;
    g.setTransform(dpr, 0, 0, dpr, -i * TILE * dpr, 0);
    g.font = `italic ${Math.max(8, Math.round(sp * 1.05))}px ${SERIF}`;
    g.fillStyle = "#4a4a4a";
    g.textBaseline = "alphabetic";
    const top = d.staves[0].top * k + oy;
    for (const [n, x] of d.bars) {
      const bx = x * k;
      if (n < 2 || bx < i * TILE - 30 || bx > (i + 1) * TILE) continue;
      g.fillText(String(n), bx + 2, top - 0.9 * sp);
    }
    strip.insertBefore(t, strip.firstChild);
    this.tiles.set(i, t);
    this.painted++;
    this.freeze(i, t);
    return t;
  }

  /**
   * D300: a painted tile made a still picture (an image of its pixels, encoded off the frame): a canvas's
   * bitmap is handed to the compositor again at every frame's commit, so at the screen's full resolution
   * the canvases cost a third of the frame on a slow phone; an image is uploaded once.
   */
  private freeze(i: number, c: HTMLCanvasElement) {
    if (typeof c.toBlob !== "function" || typeof URL.createObjectURL !== "function") return;
    c.toBlob((blob) => {
      if (!blob || this.tiles.get(i) !== c) return;
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      img.style.cssText = c.style.cssText;
      img.decode().then(
        () => {
          if (this.tiles.get(i) !== c) return URL.revokeObjectURL(img.src);
          c.replaceWith(img);
          this.tiles.set(i, img);
          c.width = 0;
          c.height = 0;
        },
        () => URL.revokeObjectURL(img.src),
      );
    });
  }

  /** A tile let go (a still one's picture freed). */
  private drop(i: number, t: HTMLCanvasElement | HTMLImageElement) {
    t.remove();
    if (t instanceof HTMLImageElement) URL.revokeObjectURL(t.src);
    this.tiles.delete(i);
  }

  /** An entry's bracket: over its first to its last note, above its staff (the lower staff's voices below). */
  private bracket(s: NonNullable<Frame["spans"]>[number], geo: Geometry, marks: SVGGElement, bands: SVGGElement): Bracket | null {
    const key = `${s.voice}:${s.on}:${s.end}`;
    if (this.brackets.has(key)) return this.brackets.get(key)!;
    const d = this.e.d;
    const heads = s.path.map((n) => this.e.headsAt.get(`${s.voice}:${n.on}`)).filter((x): x is { x: number; y: number } => !!x);
    if (!heads.length || s.form === "counter") {
      this.brackets.set(key, null);
      return null;
    }
    const { k, oy, h } = geo;
    const sp = SHEET_UNIT * k;
    const st = d.staves.findIndex((x) => x.voices.includes(s.voice));
    const staff = d.staves[Math.max(0, st)];
    const up = d.layout === "open" || st === 0 || d.staves.length === 1;
    const zone = entryBand(d, s.voice, heads)!;
    const ua = zone.x0;
    const uz = zone.x1;
    const near = this.e.notes.filter((n) => staff.voices.includes(n[0]) && n[3] > ua - SHEET_UNIT && n[3] < uz + SHEET_UNIT).map((n) => n[4]);
    const top = staff.top;
    const bottom = top + 4 * SHEET_UNIT;
    // Clear of the heads and of their stems and beams (3.5 spaces from a head); kept on the page.
    const uy = up ? Math.min(top - (d.layout === "open" ? 1.6 : 2.2) * SHEET_UNIT, ...near.map((y) => y - 4 * SHEET_UNIT)) : Math.max(bottom + 2.2 * SHEET_UNIT, ...near.map((y) => y + 4 * SHEET_UNIT));
    const y = Math.min(h - 1.6 * sp, Math.max(1.8 * sp, uy * k + oy));
    const xa = ua * k;
    const xz = uz * k;
    const open = d.layout === "open";
    const ink = open ? OPEN_MARK : paperInk(s.voice, d.voices);
    // D300: the band behind the entry's notes (its voice's colour, faint; the open score's a warm neutral).
    const band = document.createElementNS(SVG, "rect");
    band.setAttribute("x", xa.toFixed(1));
    band.setAttribute("width", (xz - xa).toFixed(1));
    band.setAttribute("y", (zone.y0 * k + oy).toFixed(1));
    band.setAttribute("height", ((zone.y1 - zone.y0) * k).toFixed(1));
    band.setAttribute("rx", (0.6 * sp).toFixed(1));
    band.setAttribute("fill", open ? OPEN_BAND : ink);
    band.setAttribute("fill-opacity", String(BAND_ALPHA[d.layout]));
    bands.append(band);
    const g = document.createElementNS(SVG, "g");
    g.setAttribute("fill", ink);
    g.setAttribute("stroke", ink);
    const hook = (up ? 1 : -1) * 0.55 * sp;
    const line = document.createElementNS(SVG, "path");
    line.setAttribute("d", `M${xa.toFixed(1)} ${(y + hook).toFixed(1)}V${y.toFixed(1)}H${xz.toFixed(1)}V${(y + hook).toFixed(1)}`);
    line.setAttribute("fill", "none");
    line.setAttribute("stroke-width", "1.1");
    const text = document.createElementNS(SVG, "text");
    text.textContent = tr(s.form === "answer" ? "Answer" : "Subject");
    const size = Math.max(10, Math.round(sp * 1.35));
    text.setAttribute("x", (xa + 1).toFixed(1));
    const ty = up ? y - 0.35 * sp : y + 1.25 * sp;
    text.setAttribute("y", ty.toFixed(1));
    text.setAttribute("font-size", String(size));
    text.setAttribute("class", "tb-sheet-word");
    const dots = document.createElementNS(SVG, "g");
    dots.setAttribute("stroke", "none");
    dots.setAttribute("transform", `translate(${(xa + 1 + size * 0.45 * text.textContent.length + 6).toFixed(1)} ${(ty - 0.4 * sp).toFixed(1)})`);
    g.append(line, text, dots);
    marks.append(g);
    const b: Bracket = { xa, xz, y, up, g, line, band, dots, text, ww: size * 0.45 * text.textContent.length, dy: ty - 0.4 * sp, lx: xa + 1, ahead: null, beats: -1 };
    this.brackets.set(key, b);
    return b;
  }

  /** Time spent painting frames (ms) and how many, for the measurements (globalThis.__sheet). */
  spent = 0;
  frames = 0;
  /** The last frame's tick and the playhead's x on the engraving (units), for the measurements. */
  last = { now: 0, x: 0 };

  /** Draws the frame in the box (`c`, the box's canvas, is covered: the page goes over it). */
  paint(c: HTMLCanvasElement, w: number, h: number, fr: Frame) {
    const t0 = performance.now();
    const roll = c.parentElement;
    if (roll) this.draw(roll, w, h, fr);
    this.spent += performance.now() - t0;
    this.frames++;
  }

  private draw(roll: HTMLElement, w: number, h: number, fr: Frame) {
    const geo = this.layout(w, h);
    const dom = this.mount(roll);
    const { k, dpr } = geo;
    const d = this.e.d;
    // D300: the playhead 35% into the score (sheet-format.ts playheadX). D307: no clefs' column kept
    // (the owner: "Gerubach scrolls it all"): the opening's clefs and keys scroll away with the music.
    const playX = playheadX(w, 0);
    // The page's place: the playhead on the engraving's x for the tick sounding (to the device pixel).
    const xNow = this.e.xAt(fr.now, fr.voice);
    this.last = { now: fr.now, x: xNow };
    const ox = Math.round((playX - xNow * k) * dpr) / dpr;
    dom.strip.style.transform = `translate3d(${ox}px,0,0)`;
    const full = d.w * k;
    const first = Math.max(0, Math.floor(-ox / TILE));
    const last = Math.min(Math.floor(full / TILE), Math.floor((w - ox) / TILE));
    for (let i = first; i <= last; i++) this.tile(i, geo, dom.strip);
    // One tile ahead, painted before it is needed; the ones behind dropped.
    const ahead = last + 1;
    if (!this.tiles.has(ahead) && ahead * TILE < full + TILE) this.tile(ahead, geo, dom.strip);
    if (this.tiles.size > KEEP)
      for (const [i, t] of [...this.tiles])
        if (i < first - 1 || i > ahead + 2) {
          this.drop(i, t);
        }
    const sp = SHEET_UNIT * k;
    const top = d.staves[0].top * k + geo.oy;
    const bottom = (d.staves[d.staves.length - 1].top + 4 * SHEET_UNIT) * k + geo.oy;
    // D307: the clefs and keys are no longer kept at the left: they scroll away with the opening.
    dom.head.style.display = "none";
    // The playhead: a thin line in the player's colour; the veil over what was played; (the open score)
    // the player's staff marked at the clefs. Set when they change.
    const mine = paperInk(fr.voice, d.voices);
    const fixed = `${playX}:${fr.voice}:${top}`;
    if (this.fixedAt !== fixed) {
      this.fixedAt = fixed;
      const ph = dom.playhead.style;
      ph.left = `${playX}px`;
      ph.top = `${(top - 2.2 * sp).toFixed(1)}px`;
      ph.height = `${(bottom - top + 4.4 * sp).toFixed(1)}px`;
      ph.background = mine;
      dom.past.style.width = `${playX}px`;
      const st = d.layout === "open" ? d.staves.find((x) => x.voices.includes(fr.voice)) : undefined;
      const m = dom.mine.style;
      if (st) {
        m.display = "block";
        m.top = `${((st.top - 0.5 * SHEET_UNIT) * k + geo.oy).toFixed(1)}px`;
        m.height = `${(5 * SHEET_UNIT * k).toFixed(1)}px`;
        m.background = mine;
      } else m.display = "none";
    }
    if (dom.svg.getAttribute("width") !== String(Math.ceil(full + w))) {
      dom.svg.setAttribute("width", String(Math.ceil(full + w)));
      dom.svg.setAttribute("height", String(h));
    }
    const left = -ox;
    const headW = 0;
    const right = w - ox;
    // The entries: a bracket from the first note to the last, dashed (a dot a beat to go) while ahead.
    for (const s of fr.spans ?? []) {
      const b = this.bracket(s, geo, dom.marks, dom.bands);
      if (!b || b.xz < left - 40 || b.xa > right + 40) continue;
      const isAhead = s.on > fr.now;
      if (b.ahead !== isAhead) {
        b.ahead = isAhead;
        if (isAhead) b.line.setAttribute("stroke-dasharray", "3 2.5");
        else b.line.removeAttribute("stroke-dasharray");
        // Announced: the band fainter.
        b.band?.setAttribute("fill-opacity", String(BAND_ALPHA[d.layout] * (isAhead ? BAND_AHEAD : 1)));
      }
      const beats = isAhead && fr.beatTicks > 0 ? Math.min(16, Math.ceil((s.on - fr.now) / fr.beatTicks - 1e-6)) : 0;
      // The word stays in sight while its bracket runs on past the clefs' column.
      const lx = Math.round(Math.max(b.xa + 1, left + headW + (headW ? 20 : 2)));
      if (lx !== b.lx) {
        b.lx = lx;
        b.text.setAttribute("x", String(lx));
        b.text.style.display = lx + b.ww > b.xz ? "none" : "";
        b.dots.setAttribute("transform", `translate(${(lx + b.ww + 6).toFixed(1)} ${b.dy.toFixed(1)})`);
      }
      if (b.beats !== beats) {
        b.beats = beats;
        const dots: SVGCircleElement[] = [];
        for (let i = 0; i < beats; i++) {
          const dot = document.createElementNS(SVG, "circle");
          dot.setAttribute("cx", String(i * 5.5));
          dot.setAttribute("r", "1.7");
          dots.push(dot);
        }
        b.dots.replaceChildren(...dots);
      }
    }
    // The player's notes: the next one ringed, a miss crossed in red under its head.
    let ring = "";
    for (const n of fr.notes) {
      if (n.state === "hit") continue;
      const v = n.voice ?? fr.voice;
      const head = this.e.heads.get(`${v}:${n.on}:${n.midi}`) ?? this.e.headsAt.get(`${v}:${n.on}`);
      if (!head) continue;
      const hx = head.x * k;
      if (hx > right + 8) break;
      const hy = head.y * k + geo.oy;
      if (n.state === "miss") {
        const key = `${v}:${n.on}:${n.midi}`;
        if (this.crosses.has(key)) continue;
        this.crosses.add(key);
        const r = Math.max(2.5, 0.45 * sp);
        const cy = hy + 1.5 * sp;
        const cross = document.createElementNS(SVG, "path");
        cross.setAttribute("d", `M${(hx - r).toFixed(1)} ${(cy - r).toFixed(1)}L${(hx + r).toFixed(1)} ${(cy + r).toFixed(1)}M${(hx + r).toFixed(1)} ${(cy - r).toFixed(1)}L${(hx - r).toFixed(1)} ${(cy + r).toFixed(1)}`);
        cross.setAttribute("class", "tb-sheet-miss");
        dom.marks.append(cross);
      } else if (!ring && n.on + n.dur > fr.now && hx > left - 8) {
        ring = `${hx.toFixed(1)}:${hy.toFixed(1)}:${v}`;
        if (ring !== this.ringAt) {
          const el = dom.ring;
          el.setAttribute("cx", hx.toFixed(1));
          el.setAttribute("cy", hy.toFixed(1));
          el.setAttribute("rx", (1.0 * sp).toFixed(1));
          el.setAttribute("ry", (0.78 * sp).toFixed(1));
          el.setAttribute("stroke", paperInk(v, d.voices));
          el.style.display = "";
        }
      }
    }
    if (!ring && this.ringAt) dom.ring.style.display = "none";
    this.ringAt = ring;
  }
}

/** The page alone (the engraving still on its way). */
export function blankPage(c: HTMLCanvasElement, w: number, h: number) {
  if (c.width !== Math.round(w) || c.height !== Math.round(h)) {
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
  }
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  const g = c.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = PAPER;
  g.fillRect(0, 0, c.width, c.height);
}

const views = new Map<string, SheetView>();
/** The view of a piece's sheet, if its engraving is loaded. */
export function sheetView(id: string, layout: SheetLayoutId): SheetView | null {
  const key = `${id}.${layout}`;
  const had = views.get(key);
  if (had) return had;
  const d = sheetNow(id, layout);
  if (!d || !glyphsReady) return null;
  if (views.size > 2) unmountSheets(true);
  const v = new SheetView(d, glyphsReady);
  views.set(key, v);
  // For the page's own checks in a browser (as __bench): the view in use.
  (globalThis as { __sheet?: unknown }).__sheet = v;
  return v;
}

/** Every sheet's page out of the box (the mode or the piece left); `forget`: their tiles let go too. */
export function unmountSheets(forget = false) {
  for (const v of views.values()) v.unmount();
  if (forget) views.clear();
}
