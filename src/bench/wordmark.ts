/**
 * D371 (Mario and Luigi's report, 1a, wordmark A, "the title page"): the game's name as Bach's own
 * title pages set theirs, Roman capitals between two gold rules with a diamond, drawn in pixels (the
 * report's tools/wordmark.py `wordmark_a`, ported): each line a serif bold set small without
 * antialiasing (the alpha thresholded), filled with a two-band dithered gradient, a 1 px dark outline,
 * the main line with a red drop shadow and a light top row. Made once per language and size on a
 * canvas, shown as an image enlarged with `image-rendering: pixelated`; null where there is no canvas
 * (the tests' server rendering: the page then shows the name as text).
 */
import { WORDMARK, type Lang } from "../i18n/index.ts";

type Rgb = readonly [number, number, number];
interface Px {
  w: number;
  h: number;
  /** RGBA, row by row. */
  d: Uint8ClampedArray;
}

const hex = (s: string): Rgb => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
/** The faces tried, in order: a serif bold every phone has (Georgia on iOS, Noto Serif on Android). */
const SERIF = 'Georgia, "Times New Roman", "Noto Serif", serif';

/** A line of capitals as a mask (1: ink), each letter `tracking` px apart (wordmark.py `mono_text`). */
function maskText(doc: Document, s: string, px: number, tracking: number): { w: number; h: number; m: Uint8Array } | null {
  const cv = doc.createElement("canvas");
  const c = cv.getContext("2d", { willReadFrequently: true });
  if (!c) return null;
  const font = `bold ${px}px ${SERIF}`;
  c.font = font;
  const widths = [...s].map((ch) => Math.round(c.measureText(ch).width));
  const W = widths.reduce((a, b) => a + b, 0) + tracking * s.length + 4;
  const H = Math.ceil(px * 1.6) + 4;
  cv.width = W;
  cv.height = H;
  c.font = font;
  c.textBaseline = "top";
  c.fillStyle = "#fff";
  let x = 1;
  [...s].forEach((ch, i) => {
    c.fillText(ch, x, 1);
    x += widths[i] + tracking;
  });
  const img = c.getImageData(0, 0, W, H).data;
  const m = new Uint8Array(W * H);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++)
    for (let xx = 0; xx < W; xx++)
      if (img[(y * W + xx) * 4 + 3] >= 128) {
        m[y * W + xx] = 1;
        x0 = Math.min(x0, xx);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, xx);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) out[y * w + xx] = m[(y + y0) * W + xx + x0];
  return { w, h, m: out };
}

const blank = (w: number, h: number): Px => ({ w, h, d: new Uint8ClampedArray(w * h * 4) });
function put(p: Px, x: number, y: number, c: Rgb) {
  if (x < 0 || y < 0 || x >= p.w || y >= p.h) return;
  const i = (y * p.w + x) * 4;
  p.d[i] = c[0];
  p.d[i + 1] = c[1];
  p.d[i + 2] = c[2];
  p.d[i + 3] = 255;
}

/** wordmark.py `colourise`: the mask filled top → bottom (dithered at the middle), outlined, shadowed. */
function colourise(mask: { w: number; h: number; m: Uint8Array }, top: string, bottom: string, outline?: string, shadow?: string, hi?: string): Px {
  const { w, h, m } = mask;
  const pad = 3;
  const out = blank(w + pad * 2, h + pad * 2);
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
  if (shadow) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (at(x, y)) put(out, x + pad + 1, y + pad + 1, hex(shadow));
  if (outline)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (at(x, y))
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]] as const) if (!at(x + dx, y + dy)) put(out, x + dx + pad, y + dy + pad, hex(outline));
  const T = hex(top), B = hex(bottom);
  for (let y = 0; y < h; y++) {
    const t = y / Math.max(1, h - 1);
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      const bay = [[0, 2], [3, 1]][y % 2][x % 2] / 4 + 0.125;
      put(out, x + pad, y + pad, hi && y === 0 ? hex(hi) : t > 0.5 + (bay - 0.5) * 0.35 ? B : T);
    }
  }
  return out;
}

/** A gold rule with a diamond at its middle (wordmark.py `rule`). */
function rule(w: number, colour: string): Px {
  const p = blank(w, 5);
  const c = hex(colour);
  for (let x = 0; x < w; x++) put(p, x, 2, c);
  const cx = Math.floor(w / 2);
  for (const [dx, dy] of [[0, 0], [1, 1], [-1, 1], [0, 2], [1, 3], [-1, 3], [0, 4], [2, 2], [-2, 2]]) put(p, cx + dx, dy, c);
  for (const dx of [-4, -3, 3, 4]) p.d[(2 * w + cx + dx) * 4 + 3] = 0;
  return p;
}

/** The pieces one above another, centred, `gap` px apart. */
function vstack(parts: Px[], gap: number): Px {
  const W = Math.max(...parts.map((p) => p.w));
  const H = parts.reduce((a, p) => a + p.h, 0) + gap * (parts.length - 1);
  const out = blank(W, H);
  let y = 0;
  for (const p of parts) {
    const x = Math.floor((W - p.w) / 2);
    for (let yy = 0; yy < p.h; yy++)
      for (let xx = 0; xx < p.w; xx++) {
        const i = (yy * p.w + xx) * 4;
        if (p.d[i + 3]) out.d.set(p.d.subarray(i, i + 4), ((y + yy) * W + x + xx) * 4);
      }
    y += p.h + gap;
  }
  return out;
}

export interface Wordmark {
  url: string;
  w: number;
  h: number;
}
const made = new Map<string, Wordmark | null>();

/**
 * The title page's wordmark for a language: the small line (THE · O JOGO · EL JUEGO), a rule, the main
 * line (WELL-TEMPERED · BEM TEMPERADO · BIEN TEMPERADO), a rule, and English's GAME; `big` the main
 * line's size in px (15 on the intro, 12 in the selection's corner, as the report's mockups).
 */
export function wordmark(l: Lang, big = 15): Wordmark | null {
  const key = `${l}-${big}`;
  if (made.has(key)) return made.get(key)!;
  let res: Wordmark | null = null;
  try {
    const doc = typeof document !== "undefined" ? document : null;
    if (doc) {
      const [small, main, tail] = WORDMARK[l];
      const sm = Math.max(9, Math.round(big * 0.67));
      const mainM = maskText(doc, main, big, 2);
      const topM = maskText(doc, small, sm, 2);
      const tailM = tail ? maskText(doc, tail, sm, 2) : null;
      if (mainM && topM) {
        const m = colourise(mainM, "#fef0a8", "#f3c76a", "#1a1424", "#b8322a", "#fffbe6");
        const plain = (x: { w: number; h: number; m: Uint8Array }) => colourise(x, "#cfc8b8", "#a99f8a", "#1a1424");
        const r = rule(m.w, "#c9a34a");
        const px = vstack([plain(topM), r, m, r, ...(tailM ? [plain(tailM)] : [])], 2);
        const cv = doc.createElement("canvas");
        cv.width = px.w;
        cv.height = px.h;
        const c = cv.getContext("2d");
        if (c) {
          const img = c.createImageData(px.w, px.h);
          img.data.set(px.d);
          c.putImageData(img, 0, 0);
          res = { url: cv.toDataURL("image/png"), w: px.w, h: px.h };
        }
      }
    }
  } catch {
    res = null;
  }
  made.set(key, res);
  return res;
}
