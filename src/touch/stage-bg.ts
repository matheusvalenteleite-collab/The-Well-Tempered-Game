/**
 * Design studio (D462, the owner: "the background of the fugue is a big space which we can be more creative
 * about … background images personalized for each fugue, something that would make the stages have more life
 * and character"; "I like stages as journeys, this is probably the best idea"; "you can do the background for
 * all 48 immediately, just do it"): each fugue's world behind its music box, drawn from its name and picture
 * (fugue-names.ts), as a journey: the scene moves with the bars (the far land slower than the near), its light
 * turns from the opening to the close (afternoon to night, dusk to dawn…), and the piece's own events stand in
 * it: each entry of the subject sets something in the world (a waymark, a lantern, a candle lit, a bell
 * swung) where the entry begins, so it passes the play line as the entry sounds; the cadences, quieter marks.
 *
 * Legibility first (the standing rules: the box shows Bach's music): the worlds are dark and muted, under a
 * veil, darker in the middle band where the notes run; nothing flashes; ambient motion is slow (seconds, not
 * beats). STAGE: FULL, QUIET (a heavier veil, no ambient motion) or OFF (the key's flat tint, as before).
 * Drawing only: nothing here is judged, and nothing follows right or wrong.
 *
 * Everything is drawn in the box canvas's own pixels (PX = 2 CSS px), so the worlds are pixel art like the
 * rest of the game.
 */
import type { TouchFugue } from "./fugue.ts";
import { formAt, formOf } from "./form-points.ts";

export type StageMode = "full" | "quiet" | "off";
const STAGE_KEY = "tb-stage-v1";
let cached: StageMode | null = null;
/** The setting (read once, then kept: the box asks every frame). */
export function stageMode(): StageMode {
  if (cached) return cached;
  try {
    const v = localStorage.getItem(STAGE_KEY);
    cached = v === "quiet" || v === "off" ? v : "full";
  } catch {
    cached = "full";
  }
  return cached;
}
export function saveStageMode(m: StageMode) {
  cached = m;
  try {
    localStorage.setItem(STAGE_KEY, m);
  } catch {
    /* not kept: the default next time */
  }
}

type C3 = readonly [number, number, number];
const rgba = (c: C3, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a: C3, b: C3, t: number): C3 => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const wrap = (x: number, m: number) => ((x % m) + m) % m;

/** What a world knows of the music at this frame. */
export interface StageClock {
  now: number;
  /** The canvas's first tick and its span in ticks (the box's whole width, the bars' share included). */
  t0: number;
  span: number;
  /** Wall-clock seconds (ambient motion only). */
  sec: number;
}

/** The kit a world is drawn with: the canvas, the journey's state, and the drawing helpers. */
class Kit {
  g!: CanvasRenderingContext2D;
  w = 0;
  h = 0;
  /** The journey: 0 at the piece's start, 1 at its end. */
  p = 0;
  /** Bars gone by (fractional), and the canvas px a bar takes. */
  bar = 0;
  pxBar = 1;
  /** The tick → canvas x of the box (the play line's scale). */
  xOf: (tick: number) => number = () => 0;
  sec = 0;
  /** Entries begun so far, and every entry's onset; the cadences' onsets. */
  passed = 0;
  ents: number[] = [];
  /** D660: each entry's subject (1, or 2 and 3 in a double or triple fugue), in the order of `ents`. */
  themes: number[] = [];
  cads: number[] = [];
  /** No ambient motion (QUIET). */
  still = false;
  /**
   * D464 (the owner: "the rain getting stronger during the rain fugue … the sun shining for a bit during the
   * moments of a fugal subject modulated to a major key … each fugue has features that allow for these kinds of
   * scripted variation"): the music's own state, eased so nothing jumps. `turn` 0..1 while an entry stands in the
   * other mode than the piece's (a major entry in a minor fugue: the sun; a minor one in a major fugue: a cloud);
   * `stretto` 0..1 while entries overlap; `busy` 0..1 how many notes sound around now (the piece's own range);
   * `cadence` 1 at a cadence's arrival, fading over two bars.
   */
  turn = 0;
  /**
   * D474: the drama (form-points.ts): `acts` weights, how much of each act's scene stands now (the episode before an
   * act turning from the last to it), `climax` 0..1 into the last entry, `rest` 0..1 after the last chord, `calm`
   * 0..1 in an episode. A world that knows its acts draws its scenes from these; every world gets the look in SCRIPTS.
   */
  /**
   * D479 (design studio; the owner's ratings of II/1–II/6: the worlds "static scenery"; approved "Subjects lit, worlds
   * alive"): the entries as events the world acts on. `sounding` the entries sounding now (onset, end, voice);
   * `strettos` the onsets of the entries that begin while another sounds; `since` bars since the last entry began
   * (Infinity before the first): what an entry sets in the world appears over the bar it begins.
   */
  sounding: { on: number; end: number; voice: number }[] = [];
  /** The climax's peak (tick: the last entry's onset, form-points.ts), where a world's payoff lands. */
  peak = Infinity;
  strettos: number[] = [];
  since = Infinity;
  acts: number[] = [1];
  climax = 0;
  rest = 0;
  calm = 0;
  /** How much of act `a` stands (0..1). */
  act(a: number) {
    return this.acts[a] ?? 0;
  }
  homeMinor = false;
  stretto = 0;
  busy = 0;
  cadence = 0;
  /** The tick the ear is at, a bar's ticks, and the canvas x of the piece's end. */
  nowTick = 0;
  barTicks = 1;
  end = 0;
  now() {
    return this.nowTick;
  }
  /**
   * D464 (the owner: the characters "ought not to be tied to the play line. they ought to be wandering by themselves
   * in the background image, as part of the background. walking along the journey, looking swell"): a character's
   * place on its own clock (wall seconds), strolling across the scene and back in `period` seconds each way, eased
   * at the turns; `step` its stride (0/1), `dir` the way it faces. Still (QUIET): standing where it is.
   */
  wander(period: number, phase = 0, from = 0.14, to = 0.86): { x: number; dir: number; step: number } {
    const u = ((this.sec + phase * period) / period) % 2;
    const leg = u < 1 ? u : 2 - u;
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * leg);
    return { x: this.w * (from + (to - from) * eased), dir: u < 1 ? 1 : -1, step: this.still ? 0 : Math.floor(this.sec * 4) % 2 };
  }
  barTick(b: number) {
    return b * this.barTicks;
  }

  R(x: number, y: number, w: number, h: number, c: string) {
    this.g.fillStyle = c;
    this.g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }
  /** Ambient seconds (0 when still). */
  get t() {
    return this.still ? 0 : this.sec;
  }
  vgrad(y: number, h: number, stops: [number, string][], x = 0, w = this.w) {
    const gr = this.g.createLinearGradient(0, y, 0, y + h);
    for (const [o, c] of stops) gr.addColorStop(o, c);
    this.g.fillStyle = gr;
    this.g.fillRect(x, y, w, h);
  }
  glow(x: number, y: number, r: number, c: C3, a: number) {
    if (a <= 0 || r <= 0) return;
    const gr = this.g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(c, a));
    gr.addColorStop(1, rgba(c, 0));
    this.g.fillStyle = gr;
    this.g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  /** A sky from the opening's colours to the close's (top, horizon), over the journey. */
  sky(top0: C3, low0: C3, top1: C3, low1: C3, horizon = 1) {
    const p = this.p;
    this.vgrad(0, this.h * horizon, [
      [0, rgba(mix(top0, top1, p))],
      [1, rgba(mix(low0, low1, p))],
    ]);
  }
  /** Stars, fading in from `from` of the journey (or always, from 0). */
  stars(n: number, from = 0, upTo = 0.6) {
    const a = from <= 0 ? 1 : Math.max(0, Math.min(1, (this.p - from) * 3));
    if (!a) return;
    for (let i = 0; i < n; i++) {
      const tw = this.still ? 1 : 0.7 + 0.3 * Math.sin(this.sec * 0.8 + i);
      this.R(hash(i) * this.w, hash(i + 50) * this.h * upTo, 1, 1, rgba([255, 244, 220], a * tw * (0.25 + 0.5 * hash(i + 9))));
    }
  }
  /** A sun or moon on a path over the journey (y as a share of the height). */
  orb(x: number, y0: number, y1: number, r: number, c: C3, glowA: number, moon = false) {
    const y = this.h * (y0 + (y1 - y0) * this.p);
    const cx = this.w * x;
    this.glow(cx, y, r * 5, c, glowA);
    this.g.fillStyle = rgba(c);
    this.g.beginPath();
    this.g.arc(cx, y, r, 0, Math.PI * 2);
    this.g.fill();
    if (moon) {
      this.g.fillStyle = "rgba(10,10,24,0.85)";
      this.g.beginPath();
      this.g.arc(cx + r * 0.5, y - r * 0.3, r * 0.9, 0, Math.PI * 2);
      this.g.fill();
    }
  }
  /** Rolling land at `base` (share of h), scrolling at `speed` (share of the bars' pace). */
  hills(base: number, amp: number, speed: number, seed: number, c: string, sharp = false) {
    const { g, w, h } = this;
    const off = this.bar * this.pxBar * speed;
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w + 2; x += 2) {
      const u = (x + off) / 34;
      const s = sharp
        ? Math.abs(Math.sin(u * 0.7 + seed)) * 0.8 + 0.2 * Math.sin(u * 2.9 + seed)
        : 0.55 * Math.sin(u + seed) + 0.3 * Math.sin(u * 2.3 + seed * 2) + 0.15 * Math.sin(u * 5.1 + seed * 3);
      g.lineTo(x, Math.round(h * base - amp * s));
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
  }
  /** Things repeating along the way (trees, posts, lamps), each drawn by `draw` at x, scrolling at `speed`. */
  along(gap: number, speed: number, draw: (x: number, k: number) => void, jitter = 0) {
    const off = this.bar * this.pxBar * speed;
    const first = Math.floor(off / gap) - 1;
    for (let k = first; k * gap - off < this.w + gap; k++) draw(k * gap - off + (jitter ? (hash(k) - 0.5) * jitter : 0), k);
  }
  /** Each entry of the subject as a thing standing where it begins (it reaches the play line as it sounds). */
  atEntries(draw: (x: number, k: number, begun: boolean) => void) {
    for (let k = 0; k < this.ents.length; k++) {
      const x = this.xOf(this.ents[k]);
      if (x < -30 || x > this.w + 30) continue;
      draw(x, k, k < this.passed);
    }
  }
  atCadences(draw: (x: number, k: number) => void) {
    for (let k = 0; k < this.cads.length; k++) {
      const x = this.xOf(this.cads[k]);
      if (x > -30 && x < this.w + 30) draw(x, k);
    }
  }
  /** A flat ground band at `y` (share of h), with marks rushing past at `speed`. */
  ground(y: number, c: string, mark?: string, speed = 1, gap = 9) {
    const top = Math.round(this.h * y);
    this.R(0, top, this.w, this.h - top, c);
    if (mark) for (let x = -wrap(this.bar * this.pxBar * speed, gap); x < this.w; x += gap) this.R(x, top + 3, 3, 1, mark);
  }
  tri(x: number, y: number, w: number, h: number, c: string) {
    this.g.fillStyle = c;
    this.g.beginPath();
    this.g.moveTo(x, y - h);
    this.g.lineTo(x + w / 2, y);
    this.g.lineTo(x - w / 2, y);
    this.g.closePath();
    this.g.fill();
  }
  disc(x: number, y: number, r: number, c: string) {
    this.g.fillStyle = c;
    this.g.beginPath();
    this.g.arc(x, y, r, 0, Math.PI * 2);
    this.g.fill();
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string, lw = 1) {
    const g = this.g;
    g.strokeStyle = c;
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  }
  /** A candle at (x, y foot); lit with a small flame. */
  candle(x: number, y: number, hgt: number, lit: boolean) {
    this.R(x - 1, y - hgt, 3, hgt, "rgba(225,214,190,0.75)");
    if (!lit) return;
    const fl = this.still ? 0 : Math.sin(this.sec * 9 + x) * 0.5;
    this.glow(x + 0.5, y - hgt - 3, 9, [255, 190, 100], 0.35);
    this.R(x + fl, y - hgt - 4, 2, 3, "rgba(255,214,130,0.95)");
  }
  /** A walking or standing figure, 2-px pixels, its feet at (x, y). */
  figure(x: number, y: number, c: string, step = 0, s = 1) {
    const P = (dx: number, dy: number, w: number, h: number) => this.R(x + dx * s, y + dy * s, w * s, h * s, c);
    P(-1, -9, 3, 3);
    P(-2, -6, 5, 4);
    P(-1 + step, -2, 1, 2);
    P(1 - step, -2, 1, 2);
  }
  /** Interior walls: a vertical gradient and a floor at `floor` (share of h). */
  room(wallTop: C3, wallLow: C3, floor: number, floorC: string) {
    this.vgrad(0, this.h * floor, [
      [0, rgba(wallTop)],
      [1, rgba(wallLow)],
    ]);
    this.R(0, this.h * floor, this.w, this.h * (1 - floor), floorC);
    for (let x = 0; x < this.w; x += 23) this.R(x, this.h * floor, 1, this.h * (1 - floor), "rgba(0,0,0,0.25)");
  }
  /** A window (x, y, w, h as shares), its own sky over the journey. */
  window(x: number, y: number, ww: number, hh: number, top0: C3, low0: C3, top1: C3, low1: C3) {
    const X = this.w * x;
    const Y = this.h * y;
    const W = this.w * ww;
    const H = this.h * hh;
    this.vgrad(Y, H, [
      [0, rgba(mix(top0, top1, this.p))],
      [1, rgba(mix(low0, low1, this.p))],
    ], X, W);
    this.R(X - 2, Y - 2, W + 4, 2, "rgba(40,28,22,0.95)");
    this.R(X - 2, Y + H, W + 4, 3, "rgba(40,28,22,0.95)");
    this.R(X - 2, Y, 2, H, "rgba(40,28,22,0.95)");
    this.R(X + W, Y, 2, H, "rgba(40,28,22,0.95)");
    this.R(X + W / 2 - 1, Y, 2, H, "rgba(40,28,22,0.9)");
    this.R(X, Y + H / 2 - 1, W, 2, "rgba(40,28,22,0.9)");
  }
  /** Theatre curtains at the sides and a pelmet; footlights at the foot. */
  curtains(c: C3) {
    const { w, h } = this;
    for (const side of [0, 1]) {
      const x0 = side ? w - w * 0.09 : 0;
      for (let k = 0; k < 6; k++) this.R(x0 + (k * w * 0.09) / 6, 0, (w * 0.09) / 6, h, rgba(mix(c, [0, 0, 0], k % 2 ? 0.25 : 0.05)));
    }
    for (let x = 0; x < w; x += 12) this.disc(x + 6, h * 0.06, 6, rgba(mix(c, [0, 0, 0], 0.15)));
    this.R(0, 0, w, h * 0.05, rgba(mix(c, [0, 0, 0], 0.2)));
    for (let x = 8; x < w; x += 22) this.glow(x, h, 14, [255, 210, 140], 0.18);
  }
  /** Light rain streaks. */
  rain(n: number, a: number) {
    for (let i = 0; i < n; i++) {
      const x = hash(i) * this.w;
      const y = wrap(hash(i + 7) * this.h + this.t * (60 + 30 * hash(i + 3)), this.h + 10) - 5;
      this.R(x - y * 0.08, y, 1, 4, `rgba(170,190,220,${a})`);
    }
  }
}

type World = (k: Kit) => void;

// Shared pieces of scenery.
const NIGHT: C3 = [10, 12, 28];
const DUSK_T: C3 = [52, 34, 78];
const DUSK_L: C3 = [170, 80, 70];

function cypress(k: Kit, x: number, y: number, hgt: number, c: string) {
  k.tri(x, y, 8, hgt, c);
}
function pine(k: Kit, x: number, y: number, hgt: number, c: string) {
  k.tri(x, y - hgt * 0.35, 14, hgt * 0.65, c);
  k.tri(x, y, 16, hgt * 0.55, c);
  k.R(x - 1, y - 2, 2, 3, c);
}
function roundTree(k: Kit, x: number, y: number, r: number, c: string) {
  k.R(x - 1, y - r, 2, r, c);
  k.disc(x, y - r - r * 0.6, r, c);
}
function house(k: Kit, x: number, y: number, ww: number, hh: number, c: string, lit: boolean) {
  k.R(x, y - hh, ww, hh, c);
  k.tri(x + ww / 2, y - hh, ww + 4, hh * 0.5, c);
  if (lit) k.R(x + ww * 0.35, y - hh * 0.6, 3, 3, "rgba(255,200,110,0.8)");
}
function skyline(k: Kit, base: number, speed: number, c: string, litFrom = 0.4) {
  k.along(26, speed, (x, i) => {
    const hh = 14 + hash(i) * 26;
    const ww = 14 + hash(i + 3) * 10;
    k.R(x, k.h * base - hh, ww, hh, c);
    if (k.p > litFrom)
      for (let wy = 0; wy < hh - 6; wy += 6) for (let wx = 3; wx < ww - 3; wx += 5) if (hash(i * 31 + wx * 7 + wy) > 0.55) k.R(x + wx, k.h * base - hh + 3 + wy, 2, 2, "rgba(255,206,120,0.55)");
  });
}
function clouds(k: Kit, n: number, a: number, speed = 0.15) {
  for (let i = 0; i < n; i++) {
    const x = wrap(hash(i) * k.w * 1.5 - k.bar * k.pxBar * speed - k.t * 2, k.w + 80) - 40;
    const y = k.h * (0.08 + 0.3 * hash(i + 4));
    for (let j = 0; j < 4; j++) k.disc(x + j * 7, y + (j % 2) * 2, 6 + (j % 3), `rgba(230,230,240,${a * 0.7})`);
  }
}
function arches(k: Kit, c: string, n = 5) {
  const { w, h } = k;
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * (w / n);
    k.R(x - 3, h * 0.15, 6, h * 0.85, c);
    k.g.strokeStyle = c;
    k.g.lineWidth = 3;
    k.g.beginPath();
    k.g.arc(x + w / n / 2, h * 0.28, w / n / 2 - 3, Math.PI, 0);
    k.g.stroke();
  }
}

/**
 * D656 (design studio, the art upgrade; the owner: the old worlds "very bland … PINBALL looks so flat. Compare it with
 * SWITCHBOARD … beautiful, rich, cool, dynamic, involving, personality"): the means of the upgraded worlds. Pixel
 * sprites (characters with a face and a silhouette, rim-lit from the world's own light), cached textures (stone, rock,
 * wood: detail without a draw call per pixel), and the camera's slow sway that moves the near layers more than the far
 * ones (depth without the scene leaving the box). Still (QUIET): no sway.
 */
type Pal = Record<string, string>;
/** A sprite of one-char pixels (`.` empty) at `s` canvas px a pixel, centred on x, its foot at y; runs drawn as one rect. */
function sprite(k: Kit, x: number, y: number, rows: readonly string[], pal: Pal, s = 1, flip = false) {
  const W = rows[0].length;
  const x0 = Math.round(x - (W * s) / 2);
  const y0 = Math.round(y - rows.length * s);
  for (let r = 0; r < rows.length; r++) {
    const row = flip ? [...rows[r]].reverse().join("") : rows[r];
    let c0 = 0;
    for (let c = 1; c <= W; c++) {
      if (c < W && row[c] === row[c0]) continue;
      const col = pal[row[c0]];
      if (col) {
        k.g.fillStyle = col;
        k.g.fillRect(x0 + c0 * s, y0 + r * s, (c - c0) * s, s);
      }
      c0 = c;
    }
  }
}
/** The same sprite in one colour (a silhouette, a shadow, a rim). */
function solid(rows: readonly string[], c: string): [readonly string[], Pal] {
  const pal: Pal = {};
  for (const row of rows) for (const ch of row) if (ch !== ".") pal[ch] = c;
  return [rows, pal];
}
/** A sprite rim-lit from one side: its silhouette in the light's colour a pixel toward the light, then the sprite. */
function lit(k: Kit, x: number, y: number, rows: readonly string[], pal: Pal, s: number, flip: boolean, rim: string, dx: number, dy = 0) {
  const [r, p] = solid(rows, rim);
  sprite(k, x + dx * s, y + dy * s, r, p, s, flip);
  sprite(k, x, y, rows, pal, s, flip);
}
const TEX = new Map<string, CanvasPattern | null>();
/** A repeating texture painted once (`size` px square) and cached; null where there is no document (tests). */
function texture(k: Kit, key: string, size: number, paint: (g: CanvasRenderingContext2D, size: number) => void): CanvasPattern | null {
  if (!TEX.has(key)) {
    let p: CanvasPattern | null = null;
    if (typeof document !== "undefined") {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const g = c.getContext("2d");
      if (g) {
        paint(g, size);
        p = k.g.createPattern(c, "repeat");
      }
    }
    TEX.set(key, p);
  }
  return TEX.get(key) ?? null;
}
/** Specks: `n` deterministic pixels of the given colours, for stone, rock and grain. */
function specks(cols: string[], n: number, seed: number, w = 1, h = 1) {
  return (g: CanvasRenderingContext2D, size: number) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = cols[i % cols.length];
      g.fillRect(Math.floor(hash(i * 7 + seed) * size), Math.floor(hash(i * 13 + seed + 1) * size), w, h);
    }
  };
}
/** Ashlar: courses of stone with their joints, a little grain. */
function stone(g: CanvasRenderingContext2D, s: number) {
  specks(["rgba(255,255,255,0.05)", "rgba(0,0,0,0.25)"], 120, 11)(g, s);
  g.fillStyle = "rgba(0,0,0,0.3)";
  for (let y = 0; y < s; y += 8) g.fillRect(0, y, s, 1);
  for (let y = 0; y < s; y += 8) g.fillRect((y / 8) % 2 ? 6 : 26, y, 1, 8);
}
/** Fill a rect with a cached texture, shifted by `off` px (parallax). */
function fillTex(k: Kit, pat: CanvasPattern | null, x: number, y: number, w: number, h: number, off = 0, offY = 0) {
  if (!pat) return;
  const g = k.g;
  g.save();
  g.translate(Math.round(off), Math.round(offY));
  g.fillStyle = pat;
  g.fillRect(x - Math.round(off), y - Math.round(offY), w, h);
  g.restore();
}
/** The camera's slow sway in px (near layers multiply it more): depth without the scene leaving the box. */
function sway(k: Kit, period = 23) {
  return k.still ? 0 : Math.sin((k.sec * Math.PI * 2) / period) * 6;
}
/** Additive light (a key, a rim, a local glow) that warms what it falls on. */
function light(k: Kit, x: number, y: number, r: number, c: C3, a: number) {
  if (a <= 0) return;
  const g = k.g;
  const op = g.globalCompositeOperation;
  g.globalCompositeOperation = "lighter";
  k.glow(x, y, r, c, a);
  g.globalCompositeOperation = op;
}
/** A 3×5 pixel glyph set (digits and the jackpot's letters), drawn in dots `d` px apart. */
const GLYPH: Record<string, string> = {
  "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001",
  "5": "111100111001111", "6": "111100111101111", "7": "111001010010010", "8": "111101111101111", "9": "111101111001111",
  ",": "000000000010100", J: "001001001101111", A: "111101111101101", C: "111100100100111", K: "101101110101101",
  P: "111101111100100", O: "111101101101111", T: "111010010010010", " ": "000000000000000",
};
function dots(k: Kit, x: number, y: number, text: string, d: number, on: string, off: string | null) {
  for (let i = 0; i < text.length; i++) {
    const gl = GLYPH[text[i]] ?? GLYPH[" "];
    for (let j = 0; j < 15; j++) {
      const c = gl[j] === "1" ? on : off;
      if (c) k.R(x + (i * 4 + (j % 3)) * d, y + Math.floor(j / 3) * d, d - 1 || 1, d - 1 || 1, c);
    }
  }
}
// D656: the characters.
const IMP = [
  "..h......h..",
  "..hr....rh..",
  "...rrrrrr...",
  "..rrrrrrrd..",
  "..rYkrrYkd..",
  "..rrrrrrrd..",
  "...rwmwmd...",
  "....rrdd....",
  ".a.rrrrdd.a.",
  "..arrrrrdda.",
  "....rrrdd...",
  "....rr.dd..t",
  "...rr...dd.t",
  "..bb....bbt.",
] as const;
const IMP_UP = [
  "a.h......h.a",
  "a.hr....rh.a",
  ".a.rrrrrr.a.",
  ".arrrrrrrda.",
  "..rYkrrYkd..",
  "..rrrrrrrd..",
  "...rwmwmd...",
  "....rrdd....",
  "...rrrrdd...",
  "...rrrrrd...",
  "....rrrdd...",
  "....rr.dd..t",
  "...rr...dd.t",
  "..bb....bbt.",
] as const;
const IMP_PAL: Pal = { h: "#efe0b8", r: "#cf3a2e", d: "#86202a", Y: "#ffe85a", k: "#1a0006", w: "#ffffff", m: "#2a0006", a: "#cf3a2e", t: "#86202a", b: "#3a0a0e" };
const BAT_A = ["b.....b", "bb.b.bb", "..bbb.."] as const;
const BAT_B = ["...b...", ".bbbbb.", "b.....b"] as const;
const MOURNER = [
  "..hhh..",
  ".hhhhh.",
  ".hfffh.",
  ".hfffh.",
  "hhhhhhh",
  "hhhhhhd",
  "hhhhhhd",
  "hhhhhhd",
  "hhhhhhd",
  "hhhhhhd",
  "hhhhhhd",
  "hhhhhdd",
  "hhhhhdd",
] as const;
const KNEELER = [
  "..hhh..",
  ".hhhhh.",
  ".hfffh.",
  "hhhhhhd",
  "hhhhhhd",
  "hhhhhhd",
  "hhhhhhd",
  "hhhhhhhd",
].map((r) => r.slice(0, 7));
const FAUST = [
  "...ccc...",
  "..ccccc..",
  "..sssss..",
  "..sksks..",
  "..swwws..",
  "...www...",
  "..rwwwr..",
  ".rrwwwrr.",
  ".rrrwrrd.",
  "rrrrrrrdd",
  "srrrrrrds",
  ".rrrrrdd.",
  ".rrrrrdd.",
  ".rrrrrdd.",
  ".rrrrrdd.",
  "rrrrrrddd",
  "rrrrrrddd",
  ".bb...bb.",
] as const;
const FAUST_UP = [
  "s.......s",
  "s..ccc..s",
  "r.ccccc.r",
  "r.sssss.r",
  "r.sksks.r",
  "r.swwws.r",
  "rr.www.rd",
  ".rrwwwrd.",
  ".rrwwwrr.",
  ".rrrwrrd.",
  ".rrrrrdd.",
  ".rrrrrdd.",
  ".rrrrrdd.",
  ".rrrrrdd.",
  ".rrrrrdd.",
  "rrrrrrddd",
  "rrrrrrddd",
  ".bb...bb.",
] as const;
const FAUST_PAL: Pal = { c: "#2a1a3a", s: "#e8c8a0", k: "#20101a", w: "#e8e4dc", r: "#6a2a30", d: "#40161c", b: "#1a0c0c" };
const CROC = [
  "......gggggggggg..........",
  "ggg.gggggggggggggggggggg..",
  "gGggggggggggggggggggggggww",
  ".g..gg.........gg...gggg..",
] as const;
const BOOK_A = ["pp.pp", "ppppp", ".c.c."] as const;
const BOOK_B = [".....", "ppppp", "ccccc"] as const;

// D658: batch 1's characters.
const SINGER = [
  "..hhh..",
  ".hhhhh.",
  ".hsssh.",
  "..sms..",
  "...s...",
  ".wwwww.",
  "rrrrrrd",
  "rrrrrrd",
  "srrrrds",
  ".rrrrd.",
  ".rrrrd.",
  ".rrrrd.",
  ".rrrrd.",
  ".rrrrd.",
  "..b.b..",
] as const;
const HOOD = [
  "..rrr..",
  ".rrrrr.",
  "rrsssrr",
  "rrsksrr",
  "rrrsrrd",
  "rrrrrrd",
  ".rrrrd.",
  ".rwwwd.",
  ".rwwwd.",
  ".rrrrd.",
  "..l.l..",
  "..b.b..",
] as const;
const HOOD_THROW = [
  "..rrr.s",
  ".rrrrrs",
  "rrsssrs",
  "rrsksr.",
  "rrrsrrd",
  "rrrrrrd",
  ".rrrrd.",
  ".rwwwd.",
  ".rwwwd.",
  ".rrrrd.",
  "..l.l..",
  "..b.b..",
] as const;
const KID = [
  ".hhh.",
  ".sss.",
  ".sks.",
  "ccccc",
  "scccs",
  ".ccc.",
  ".ccc.",
  ".l.l.",
  ".b.b.",
] as const;
const RAIDER = [
  "..ddd..",
  ".ddddd.",
  ".dkkkd.",
  ".ddddd.",
  "ddddddd",
  "sdddddd",
  "ddddddd",
  ".ddddd.",
  ".ddddd.",
  ".ddddd.",
  ".dd.dd.",
  ".b...b.",
] as const;
const PILGRIM = [
  "..hhhhh..",
  "hhhhhhhhh",
  "...sss...",
  "...sss...",
  "..ccccc..",
  ".cccccdd.",
  ".cccccdd.",
  "scccccdd.",
  ".cccccdd.",
  ".cccccdd.",
  "..cccdd..",
  "..cccdd..",
  "..cc.dd..",
  "..b...b..",
] as const;
const PILGRIM_B = [...PILGRIM.slice(0, 12), "...cdd...", "...bb...."] as const;
const SPARROW = ["....bb.", "...bbky", "bbbbbb.", ".bwwb..", "..l.l.."] as const;
const SPARROW_FLY = [".b...b.", "..b.b..", "bbbbbky", "..www..", "......."] as const;
const HORSE_A = [
  "......r.........",
  ".....rrr........",
  ".....rrr.....hh.",
  "...hhhrhhhhhhhhh",
  "..hhhhhhhhhhhh..",
  ".thhhhhhhhhhh...",
  "t..hh.....hh....",
  "..h.h.....h.h...",
  ".h...h...h...h..",
] as const;
const HORSE_B = [
  "......r.........",
  ".....rrr........",
  ".....rrr.....hh.",
  "...hhhrhhhhhhhhh",
  "..hhhhhhhhhhhh..",
  ".thhhhhhhhhhh...",
  "t...hh...hh.....",
  "....hh...hh.....",
  "...h.h...h.h....",
] as const;
/** Velvet: soft vertical folds. */
function velvet(g: CanvasRenderingContext2D, s: number) {
  for (let x = 0; x < s; x++) {
    g.fillStyle = `rgba(0,0,0,${0.12 + 0.18 * (0.5 + 0.5 * Math.sin((x / s) * Math.PI * 4))})`;
    g.fillRect(x, 0, 1, s);
  }
  specks(["rgba(255,255,255,0.04)"], 30, 21)(g, s);
}
/** Grass: blades and specks. */
function grass(g: CanvasRenderingContext2D, s: number) {
  specks(["rgba(0,0,0,0.18)", "rgba(255,255,200,0.08)", "rgba(20,60,20,0.25)"], 140, 31, 1, 2)(g, s);
}
/** Roof tiles: rows of scallops. */
function tiles(g: CanvasRenderingContext2D, s: number) {
  for (let y = 0; y < s; y += 4) for (let x = (y / 4) % 2 ? 3 : 0; x < s; x += 6) {
    g.fillStyle = "rgba(0,0,0,0.25)";
    g.fillRect(x, y + 3, 6, 1);
    g.fillStyle = "rgba(255,200,170,0.08)";
    g.fillRect(x + 1, y, 4, 1);
  }
}

// D659: batch 2's characters.
const SHEPHERDESS = [
  ".yyyyy.",
  "yyhhhyy",
  "..sss..",
  "..sks..",
  "...s...",
  ".wwwww.",
  "bwwwwwb",
  "swwwwws",
  ".bbbbb.",
  "bbbbbbb",
  "bbbbbbb",
  "bbbbbbb",
  "bbbbbbb",
  "..l.l..",
] as const;
const LAMB = ["..ww...", "wwwwwkk", "wwwwwww", "wwwwww.", ".l..l.."] as const;
const FISH = ["..ff..", "ffffkf", ".fffft", "..ff.."] as const;
const PIERROT = [
  "..kkk..",
  ".wwwww.",
  ".wkwkw.",
  ".wwrww.",
  "rrrrrrr",
  ".rrrrr.",
  "wwwwwww",
  "wwwkwww",
  "swwwwws",
  ".wwkww.",
  ".wwwww.",
  ".wwwww.",
  ".ww.ww.",
  ".ww.ww.",
  ".kk.kk.",
] as const;
const PIERROT_REACH = [
  "s.....s",
  "w.kkk.w",
  "wwwwwww",
  ".wkwkw.",
  ".wwrww.",
  "rrrrrrr",
  ".rrrrr.",
  ".wwwww.",
  ".wwkww.",
  ".wwwww.",
  ".wwkww.",
  ".wwwww.",
  ".ww.ww.",
  ".ww.ww.",
  ".kk.kk.",
] as const;
const DIARIST = [
  "..hhh..",
  ".hhhhh.",
  ".hsssh.",
  ".hsksh.",
  "..sss..",
  ".ccccc.",
  "cccccc.",
  "cccccss",
  "ccccc..",
  ".cccc..",
] as const;
const SLEEPER = [
  "sss.....",
  ".hhh....",
  ".hsss...",
  "..sks...",
  "wwwwwwss",
  "wwwwww..",
  ".wwwww..",
  ".wwwww..",
  ".wwwww..",
  ".wwwww..",
  ".wwwww..",
  ".wwwww..",
  "..s.s...",
] as const;
const CAT_SIT = ["k...k..", "kk.kk..", "kykyk..", "kkkkk..", ".kkkk..", ".kkkkk.", ".kkkkkk", ".k.k..k"] as const;
const CAT_STRETCH = ["......k...k", "......kkkkk", "k.....kykyk", "kkkkkkkkkk.", ".kkkkkkkk..", ".k.k...k.k."] as const;
const CAT_SLEEP = ["...kk..", ".kkkkk.", "kkkkkkk", "kkkkkkk"] as const;
const PUPPET_A = [
  "...hhh...",
  "...sss...",
  "...sks...",
  "....s....",
  "s.ccccc.s",
  ".cccccccc",
  "..ccccc..",
  "..ccccc..",
  "..dd.dd..",
  ".d.....d.",
  "b.......b",
] as const;
const PUPPET_B = [
  "...hhh...",
  "s..sss..s",
  ".c.sks.c.",
  "..c.s.c..",
  "...ccc...",
  "..ccccc..",
  "..ccccc..",
  "..ccccc..",
  "...d.d...",
  "...d.d...",
  "...b.b...",
] as const;
const BEARER = [
  "..ddd..",
  ".ddddd.",
  ".dsssd.",
  ".ddddd.",
  "ddddddd",
  "dddddds",
  "ddddddd",
  ".ddddd.",
  ".ddddd.",
  ".ddddd.",
  ".ddddd.",
  ".dd.dd.",
] as const;
/** Water caustics: soft bright threads. */
function caustic(g: CanvasRenderingContext2D, s: number) {
  g.strokeStyle = "rgba(200,255,250,0.12)";
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.moveTo(0, hash(i) * s);
    g.bezierCurveTo(s * 0.3, hash(i + 1) * s, s * 0.7, hash(i + 2) * s, s, hash(i) * s);
    g.stroke();
  }
}
/** Cobbles: offset rows of small stones. */
function cobbles(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "rgba(255,255,255,0.05)";
  for (let y = 0; y < s; y += 4) for (let x = (y / 4) % 2 ? 3 : 0; x < s; x += 6) g.fillRect(x, y, 5, 3);
}
/** Wallpaper: a small repeating sprig. */
function wallpaper(g: CanvasRenderingContext2D, s: number) {
  for (let y = 0; y < s; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < s; x += 8) {
    g.fillStyle = "rgba(255,220,180,0.08)";
    g.fillRect(x, y, 1, 3);
    g.fillRect(x - 1, y + 1, 3, 1);
  }
}

// D660: batch 3's characters.
const ORGANIST = [
  "..hhh..",
  ".hhhhh.",
  ".hhhhh.",
  "..hhh..",
  ".ccccc.",
  "ccccccc",
  "ccccccc",
  "ccccccc",
  "cccccccc",
  "bbbbbbbb",
] as const;
const PERSON = [
  "..hhh..",
  ".hsssh.",
  "..sss..",
  ".ccccc.",
  "ccccccc",
  "scccccs",
  ".ccccc.",
  ".ccccc.",
  ".dd.dd.",
  ".dd.dd.",
  ".b...b.",
] as const;
const SEATED = ["..hhh..", ".hsssh.", "..sss..", ".ccccc.", "ccccccc", "scccccs", "ccccccc", "bbbbbbb"] as const;
const BFLY_A = ["ww.ww", "wwbww", ".wbw.", "ww.ww"] as const;
const BFLY_B = ["..w..", ".wbw.", "..b..", "..w.."] as const;
const DANCER = [
  "..hhh..",
  ".hmmmh.",
  ".hsssh.",
  "..sss..",
  ".ggggg.",
  "sgggggs",
  "..ggg..",
  ".ggggg.",
  ".ggggg.",
  "ggggggg",
  "ggggggg",
  "ggggggg",
  "ggggggg",
] as const;
const PARTNER = [
  "..hhh..",
  ".hmmmh.",
  ".hsssh.",
  "..sss..",
  ".kwwwk.",
  "skkwkks",
  ".kkkkk.",
  ".kkkkk.",
  ".kk.kk.",
  ".kk.kk.",
  ".kk.kk.",
  ".kk.kk.",
  ".bb.bb.",
] as const;
const SISTER = [
  "..hhh..",
  ".hhhhh.",
  ".hsssh.",
  ".hsksh.",
  "..sss..",
  ".ddddd.",
  "sdddddsx",
  ".ddddd.",
  "ddddddd",
  "ddddddd",
  "ddddddd",
  "ddddddd",
  "..b.b..",
].map((r) => r.slice(0, 7));
const HOPPER = [
  "h.hhh.h",
  "h.hhh.h",
  "..sss..",
  "..sks..",
  ".ccccc.",
  "sccccc.",
  ".ccccc.",
  "ccccccc",
  "..l.l..",
  "..l.l..",
  "..b.b..",
] as const;
const HOPPER_UP = [
  "h.hhh.h",
  "h.hhh.h",
  "s.sss.s",
  ".ssks.s",
  ".ccccc.",
  ".ccccc.",
  ".ccccc.",
  "ccccccc",
  "..l....",
  "..l.ll.",
  "..b....",
] as const;
const PIGEON = ["..gg..", ".ggkg.", "gggggy", ".ggg..", "..l..."] as const;
/** Panelling: wood grain in vertical boards. */
function panels(g: CanvasRenderingContext2D, s: number) {
  for (let x = 0; x < s; x += 8) {
    g.fillStyle = "rgba(0,0,0,0.25)";
    g.fillRect(x, 0, 1, s);
    g.fillStyle = "rgba(255,220,170,0.06)";
    g.fillRect(x + 1, 0, 1, s);
  }
  specks(["rgba(0,0,0,0.12)", "rgba(255,220,170,0.05)"], 60, 41, 1, 3)(g, s);
}
/** Parquet: a herringbone of short boards. */
function parquet(g: CanvasRenderingContext2D, s: number) {
  for (let y = 0; y < s; y += 4) for (let x = (y / 4) % 2 ? 4 : 0; x < s; x += 8) {
    g.fillStyle = (x + y) % 16 ? "rgba(0,0,0,0.15)" : "rgba(255,220,170,0.06)";
    g.fillRect(x, y, 7, 3);
  }
}

// D661: batch 4's characters.
const FIDDLER = [
  "..hhh....",
  ".hsssh...",
  "..sks..ww",
  "..sss.wf.",
  ".cccccf..",
  "ccccccs..",
  "scccccc..",
  ".ccccc...",
  ".dd.dd...",
  ".dd.dd...",
  ".b...b...",
] as const;
const BABY = ["..sss..", ".sksks.", "..sss..", "wwwwwww"] as const;
const BABY_SLEEP = ["..sss..", ".sssss.", "..sss..", "wwwwwww"] as const;

// D662: the chess pieces (x the body, d its shade).
const CHESS: Record<string, readonly string[]> = {
  p: ["..x..", ".xxd.", "..x..", ".xxd.", ".xxd.", "xxxxd", "xxxxd"],
  r: ["x.x.x", "xxxxd", ".xxd.", ".xxd.", ".xxd.", ".xxd.", "xxxxd", "xxxxd"],
  n: ["...x..", "..xxx.", ".xxxxd", "xxx.xd", "...xxd", "..xxxd", ".xxxxd", "xxxxxd"],
  b: ["..x..", ".xxd.", ".x.d.", ".xxd.", "..x..", ".xxd.", "xxxxd", "xxxxd"],
  q: ["x.x.x", "xxxxd", ".xxd.", "..x..", ".xxd.", ".xxd.", ".xxd.", "xxxxd", "xxxxd"],
  k: ["..x..", ".xxd.", "..x..", ".xxd.", ".xxd.", ".xxd.", ".xxd.", "xxxxd", "xxxxd"],
};
/** I/16's game: the white knight's tour of captures (Warnsdorff from b1), the squares kept clear of the other pieces. */
const KNIGHT_PATH: [number, number][] = (() => {
  const busy = new Set(["4,0", "0,0", "7,0", "5,1", "6,1", "7,1", "4,7", "2,1"]);
  const moves = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const seen = new Set<string>(["1,0"]);
  const path: [number, number][] = [[1, 0]];
  const ok = (c: number, r: number) => c >= 0 && c < 8 && r >= 0 && r < 8 && !busy.has(`${c},${r}`) && !seen.has(`${c},${r}`);
  const deg = (c: number, r: number) => moves.filter(([dc, dr]) => ok(c + dc, r + dr)).length;
  for (let i = 0; i < 20; i++) {
    const [c, r] = path[path.length - 1];
    const next = moves.map(([dc, dr]) => [c + dc, r + dr] as [number, number]).filter(([a, b]) => ok(a, b)).sort((a, b) => deg(a[0], a[1]) - deg(b[0], b[1]) || b[1] - a[1])[0];
    if (!next) break;
    seen.add(`${next[0]},${next[1]}`);
    path.push(next);
  }
  return path;
})();

const WORLDS: Record<string, World> = {
  // D658 (design studio, the art upgrade, batch 1): The Canon. A concert stage in three depths: the velvet back wall
  // and the proscenium's gilt arch, the curtains in their folds with the gold fringe, the boards in perspective, the
  // footlights, and the audience's heads in silhouette nearest. The drama (D654): each entry a singer steps into a
  // spotlight and stays lit; from the fifth entry the chorus comes in from the wings; at the climax the whole stage lit,
  // the fringe glowing, the lead centre.
  wtc1f01: (k) => {
    const { w, h } = k;
    const cam = sway(k, 33);
    const cl = k.climax;
    const floorY = h * 0.72;
    k.vgrad(0, floorY, [[0, "#2a0c14"], [1, "#4a1620"]]);
    fillTex(k, texture(k, "velvet", 24, velvet), 0, 0, w, floorY, cam * 0.3);
    light(k, w * 0.5, floorY - 30, w * 0.4, [255, 200, 150], 0.12 + 0.3 * cl);
    // the boards in perspective
    k.vgrad(floorY, h - floorY, [[0, "#5a3a26"], [1, "#2a1a12"]]);
    for (let i = -8; i <= 8; i++) k.line(w * 0.5 + i * 18 + cam * 0.5, floorY, w * 0.5 + i * 40 + cam * 1.2, h, "rgba(0,0,0,0.25)", 1);
    // the chorus from the wings, one per entry after the fourth
    const chorus = Math.min(8, Math.max(0, k.passed - 4)) + (cl > 0.5 ? 8 : 0);
    for (let i = 0; i < Math.min(8, chorus); i++) {
      const born = i === chorus - 1 && cl <= 0.5 ? Math.min(1, k.since * 2) : 1;
      const side = i % 2 ? 1 : -1;
      const x = w * (0.5 + side * (0.08 + 0.05 * Math.floor(i / 2))) + side * (1 - born) * 60 + cam * 0.5;
      sprite(k, x, floorY - 2, SINGER, { h: "#2a1a14", s: "#c8a080", m: "#c8a080", w: "#c8c0b0", r: "#4a3040", d: "#2a1a24", b: "#140c0c" }, 1);
    }
    // the spotlights and their singers: one per entry, lit and staying lit
    const lead = Math.min(4, k.passed);
    for (let i = 0; i < 4; i++) {
      const x = w * (0.32 + i * 0.12) + cam * 0.6;
      const on = k.passed > i || cl > 0.5;
      const step = on ? Math.min(1, (i === k.passed - 1 ? k.since : 1) * 2) : 0;
      if (on) {
        k.g.fillStyle = `rgba(255,236,190,${0.07 + 0.05 * cl})`;
        k.g.beginPath();
        k.g.moveTo(x - 4, 0);
        k.g.lineTo(x + 4, 0);
        k.g.lineTo(x + 20, floorY + 10);
        k.g.lineTo(x - 20, floorY + 10);
        k.g.fill();
        k.g.fillStyle = `rgba(255,236,190,${0.18 + 0.1 * cl})`;
        k.g.beginPath();
        k.g.ellipse(x, floorY + 10, 20, 4, 0, 0, Math.PI * 2);
        k.g.fill();
        for (let d = 0; d < 4; d++) {
          const u = wrap(k.t * 0.05 + hash(d + i * 7), 1);
          k.R(x - 10 + 20 * hash(d * 3 + i), u * floorY, 1, 1, "rgba(255,240,210,0.5)");
        }
      }
      const sing = on && !k.still && Math.sin(k.sec * 2.2 + i * 1.3) > 0;
      const centre = cl > 0.5 && i === 0;
      const sx = centre ? w * 0.5 + cam * 0.6 : x;
      const robe = ["#8a2a3a", "#2a4a8a", "#6a5a2a", "#3a6a4a"][i];
      const pal = { h: "#2a1a14", s: on ? "#f0c8a0" : "#3a2a24", m: sing ? "#3a0a10" : on ? "#f0c8a0" : "#3a2a24", w: on ? "#f0ece0" : "#2a2424", r: on ? robe : "#241a20", d: on ? "#20141c" : "#140c12", b: "#140c0c" };
      if (on) lit(k, sx, floorY + 10 + 6 * step, SINGER, pal, 2, false, "rgba(255,240,210,0.8)", 0, -1);
      else sprite(k, sx, floorY + 8, SINGER, pal, 2);
    }
    // the curtains, the proscenium's gilt arch, the fringe
    const fr = 0.35 + 0.15 * Math.min(1, lead / 4) + 0.5 * cl;
    for (const sd of [-1, 1]) {
      const cx = sd < 0 ? cam * 0.9 : w - w * 0.2 + cam * 0.9;
      k.vgrad(0, h, [[0, "#6a0e1a"], [1, "#3a0610"]], cx, w * 0.2);
      fillTex(k, texture(k, "velvet", 24, velvet), cx, 0, w * 0.2, h, (k.still ? 0 : Math.sin(k.sec * 0.6) * 2) + cam * 0.9);
      k.R(sd < 0 ? cx + w * 0.2 - 2 : cx, 0, 2, h, "rgba(255,200,120,0.25)");
    }
    k.vgrad(0, h * 0.12, [[0, "#5a0a16"], [1, "#3a0610"]]);
    fillTex(k, texture(k, "velvet", 24, velvet), 0, 0, w, h * 0.12, cam * 0.9);
    for (let x = 0; x < w; x += 4) k.R(x + wrap(cam, 4), h * 0.12, 2, 3 + (x % 8 ? 0 : 2), `rgba(240,190,90,${fr})`);
    if (cl > 0.01) light(k, w * 0.5, h * 0.12, w * 0.5, [255, 200, 110], 0.2 * cl);
    // the footlights and the audience's heads, nearest
    for (let x = w * 0.08; x < w * 0.95; x += 18) {
      light(k, x + cam * 1.4, h * 0.97, 16, [255, 210, 140], 0.25 + 0.05 * Math.sin(k.t * 3 + x));
    }
    for (let i = 0; i < 16; i++) {
      const x = (i + 0.5) * (w / 16) + cam * 2;
      const bob = k.still ? 0 : Math.sin(k.sec * 0.8 + i * 1.7) * 0.8;
      k.disc(x, h + 2 + bob, 9, "#0a0608");
      k.disc(x, h - 9 + bob, 5, "#0a0608");
    }
  },
  // D656 (design studio, the art upgrade): The Imp. A cave in three depths (the back wall's rock and strata, the
  // stalactites and stalagmites rim-lit by the fire, dark rocks near), water dripping and a bat at all times. The imp a
  // sprite with horns, eyes and tail, lit from the fire's side, his shadow thrown up the wall. The drama (D654): each
  // entry he throws a log on and the fire grows a step, the sparks higher, his shadow taller; at the climax the fire
  // roars up the wall, the cave lit red to its roof, the imp dancing on the rim.
  wtc1f02: (k) => {
    const { w, h } = k;
    const cam = sway(k, 27);
    const grow = Math.min(1, k.passed / Math.max(1, k.ents.length));
    const roar = k.climax;
    const fx = w * 0.5;
    const fy = h * 0.9;
    // the back wall: rock and strata, warmed toward the fire
    k.vgrad(0, h, [[0, "#220e16"], [0.6, "#3a181a"], [1, "#4a2214"]]);
    fillTex(k, texture(k, "rock", 48, specks(["rgba(0,0,0,0.35)", "rgba(120,60,50,0.25)", "rgba(60,24,24,0.4)"], 260, 3, 2, 1)), 0, 0, w, h, cam * 0.3);
    for (let i = 0; i < 6; i++) k.line(0, h * (0.2 + i * 0.12) + cam * 0.3, w, h * (0.14 + i * 0.13) + cam * 0.3, "rgba(0,0,0,0.22)", 1);
    light(k, fx, fy - 20, 120 + 70 * grow + 120 * roar, [255, 110, 40], 0.26 + 0.14 * grow + 0.25 * roar + 0.03 * k.busy);
    // the imp's shadow on the wall, taller with every entry
    const imp = k.wander(14, 0.3, 0.3, 0.7);
    const dance = roar > 0.5;
    const ix = dance ? fx + Math.sin(k.t * 1.5) * 18 : imp.x;
    const iy = dance ? fy - 14 : h * 0.93;
    const up = k.since < 0.5 || dance ? Math.floor(k.t * 3) % 2 === 0 : false;
    const body = up ? IMP_UP : IMP;
    const [sr, sp] = solid(body, `rgba(12,2,6,${0.22 + 0.16 * grow})`);
    sprite(k, ix + (ix - fx) * 1.2, h * 0.92, sr, sp, 3 + 2 * grow + 2 * roar, imp.dir < 0);
    // the stalactites, rim-lit on the fire's side, water dripping from some
    for (let i = 0; i < 24; i++) {
      const x = (i + 0.5) * (w / 24) + (hash(i) - 0.5) * 10 + cam * 0.6;
      const len = 8 + hash(i + 40) * 26;
      const side = Math.sign(fx - x) || 1;
      k.tri(x + side * 1.5, 0, 9 + hash(i + 2) * 6, -len - 2, `rgba(255,140,70,${0.3 + 0.3 * grow + 0.4 * roar})`);
      k.tri(x, 0, 8 + hash(i + 2) * 6, -len, "rgba(40,18,18,1)");
      if (i % 4 === 1) {
        const ph = wrap(k.t * 0.22 + hash(i + 7), 1);
        if (!k.still) k.R(x, len + ph * (h * 0.85 - len), 1, 2, `rgba(170,210,255,${0.6 * (1 - ph * 0.5)})`);
      }
    }
    k.R(0, 0, w, 4, "rgba(24,10,12,1)");
    // the stalagmites (mid), rim-lit
    for (const [sx, sh] of [[0.12, 0.5], [0.2, 0.32], [0.8, 0.36], [0.9, 0.55]] as const) {
      const x = w * sx + cam * 0.8;
      const side = Math.sign(fx - x);
      k.tri(x + side * 2, fy + 4, 26, h * sh + 2, `rgba(255,130,60,${0.25 + 0.3 * grow + 0.3 * roar})`);
      k.tri(x, fy + 4, 26, h * sh, "rgba(30,12,14,1)");
    }
    // the floor, lit near the fire
    k.g.fillStyle = "#1e0c0e";
    k.g.beginPath();
    k.g.moveTo(0, h);
    for (let x = 0; x <= w; x += 6) k.g.lineTo(x, fy - 2 + Math.sin(x * 0.07) * 2 + hash(x) * 2);
    k.g.lineTo(w, h);
    k.g.fill();
    light(k, fx, fy, 70 + 30 * grow, [255, 120, 50], 0.25 + 0.15 * grow);
    // the fire: the logs (one more per entry), the tongues layered red to white, the sparks
    for (let i = 0; i < Math.min(k.passed, 12); i++) k.R(fx - 16 + (i % 4) * 8 + (Math.floor(i / 4) % 2) * 4, fy - 3 - Math.floor(i / 4) * 3, 8, 3, i % 2 ? "#5a3020" : "#6e3c24");
    k.R(fx - 18, fy - 2, 36, 3, "#3a1c12");
    const fh = 24 + 26 * grow + 50 * roar + 4 * k.busy;
    const layers: [number, number, string][] = [[1, 1, "rgba(200,40,30,0.75)"], [0.8, 0.78, "rgba(255,120,40,0.85)"], [0.55, 0.55, "rgba(255,210,80,0.9)"], [0.3, 0.3, "rgba(255,250,220,0.95)"]];
    for (const [sw, sh, c] of layers) for (let i = 0; i < 7; i++) {
      const fl = k.still ? 0.9 : 0.75 + 0.25 * Math.sin(k.sec * 6 + i * 1.9);
      k.tri(fx + (i - 3) * (4 + 3 * grow + 3 * roar), fy - 3, (11 + 5 * grow) * sw, fh * sh * fl * (0.6 + 0.4 * hash(i)), c);
    }
    for (let i = 0; i < 10 + 18 * grow + 14 * roar; i++) {
      const tt = wrap(k.t * 0.2 + hash(i), 1);
      k.R(fx + (hash(i + 2) - 0.5) * (30 + 60 * grow) + Math.sin(tt * 9 + i) * 5, fy - 10 - tt * h * (0.3 + 0.4 * grow + 0.3 * roar), 1, 1, `rgba(255,${Math.round(200 - 80 * tt)},80,${0.9 * (1 - tt)})`);
    }
    // the imp, rim-lit from the fire; a log in flight when an entry begins
    const face = dance ? (Math.floor(k.t) % 2 ? 1 : -1) : imp.dir;
    lit(k, ix, iy - (k.still ? 0 : Math.abs(Math.sin(k.sec * Math.PI * (1.4 + roar))) * (4 + 6 * roar)), body, IMP_PAL, 2, face < 0, "rgba(255,190,110,0.95)", Math.sign(fx - ix) || 1);
    if (k.since < 0.5 && !dance) {
      const u = k.since / 0.5;
      k.R(ix + (fx - ix) * u - 4, iy - 24 - Math.sin(u * Math.PI) * 22, 8, 3, "#6e3c24");
    }
    // a bat, now and then
    const bp = wrap(k.sec / 26, 1);
    if (!k.still && bp < 0.4) sprite(k, w * (0.1 + bp * 2.2), h * (0.22 + 0.05 * Math.sin(k.sec * 3)), Math.floor(k.sec * 6) % 2 ? BAT_A : BAT_B, { b: "#0c0408" }, 2);
    // the near rocks, darkest, moving most
    k.g.fillStyle = "#0a0406";
    for (const [x0, ww, hh] of [[-10, 70, 26], [w - 64, 80, 30]] as const) {
      k.g.beginPath();
      k.g.moveTo(x0 + cam * 1.6, h);
      k.g.quadraticCurveTo(x0 + ww * 0.3 + cam * 1.6, h - hh, x0 + ww * 0.6 + cam * 1.6, h - hh * 0.7);
      k.g.quadraticCurveTo(x0 + ww * 0.9 + cam * 1.6, h - hh * 0.4, x0 + ww + cam * 1.6, h);
      k.g.fill();
    }
    if (roar > 0.01) light(k, fx, h * 0.2, w * 0.5, [255, 60, 30], 0.22 * roar);
  },
  // D658: The Stone-Skipper. A pond in an afternoon going gold: the sky and its clouds drifting, the far hills, the
  // trees on the far bank rim-lit by the low sun, the water mirroring the sky with its shimmer moving, reeds swaying
  // nearest and a dragonfly. The drama (D654, the owner: "Little Red Riding Hood … throwing the stones, jumping
  // around"): she wanders the bank, hopping; each entry she throws a stone that skips, its rings staying on the water;
  // more children join her; at the climax a stone skips the whole pond and the water is lit gold.
  wtc1f03: (k) => {
    const { w, h } = k;
    const cam = sway(k, 27);
    const cl = k.climax;
    const bank = h * 0.56;
    k.sky([110, 160, 210], [230, 210, 170], [120, 90, 140], [250, 170, 100], 0.6);
    const sunX = w * 0.7;
    const sunY = h * (0.12 + 0.3 * k.p);
    light(k, sunX, sunY, 60, [255, 230, 170], 0.35);
    k.disc(sunX, sunY, 7, "rgba(255,246,220,0.95)");
    clouds(k, 5, 0.35, 0.1);
    k.hills(0.48, 8, 0.02, 1, "rgba(90,110,130,1)");
    k.g.save();
    k.g.translate(cam * 0.6, 0);
    k.hills(0.53, 5, 0.04, 2, "rgba(56,80,64,1)");
    for (let i = 0; i < 14; i++) {
      const x = (i + 0.5) * (w / 13) + (hash(i) - 0.5) * 10;
      const r = 6 + hash(i + 3) * 5;
      k.R(x - 1, bank - r, 2, r, "#2a3020");
      k.disc(x + 1, bank - r * 1.6, r, "rgba(255,210,140,0.5)");
      k.disc(x, bank - r * 1.6, r, "#2e4a30");
      k.disc(x - r * 0.3, bank - r * 1.9, r * 0.5, "#3a5a38");
    }
    k.g.restore();
    // the water: the sky mirrored, darker; the shimmer moving; gold at the climax
    k.vgrad(bank, h - bank, [[0, "rgba(150,170,180,1)"], [1, "rgba(40,60,80,1)"]]);
    if (cl > 0.01) k.vgrad(bank, h - bank, [[0, `rgba(255,200,110,${0.45 * cl})`], [1, `rgba(255,160,80,${0.2 * cl})`]]);
    for (let y = bank + 3; y < h; y += 4) k.R(wrap(y * 37 + k.t * 6 * (1 + (y % 3)), w), y, 6 + (y % 7), 1, "rgba(230,240,250,0.22)");
    k.R(sunX - 6, bank + 2, 12, h - bank, "rgba(255,240,200,0.08)");
    // the rings, one stone per entry, staying
    const n = Math.min(14, k.passed);
    for (let i = 0; i < n; i++) {
      const x = w * (0.3 + 0.4 * hash(i + 3));
      const y = h * (0.66 + 0.2 * hash(i + 7));
      const age = i === n - 1 ? Math.min(1, k.since * 2) : 1;
      for (let r = 1; r <= 3; r++) {
        k.g.strokeStyle = `rgba(230,240,250,${(0.45 / r) * age})`;
        k.g.lineWidth = 1;
        k.g.beginPath();
        k.g.ellipse(x, y, (4 + 4 * age) * r, (1.3 + 1.3 * age) * r, 0, 0, Math.PI * 2);
        k.g.stroke();
      }
    }
    if (cl > 0.5) {
      const u = wrap(k.t * 0.3, 1);
      for (let j = 0; j < 6; j++) {
        const x = w * (0.25 + 0.5 * Math.min(u * 1.2, (j + 1) / 6));
        k.g.strokeStyle = `rgba(255,236,190,${0.6 * cl})`;
        k.g.beginPath();
        k.g.ellipse(x, h * 0.72, 5, 1.5, 0, 0, Math.PI * 2);
        k.g.stroke();
      }
    }
    // the near bank: she wanders, hopping, throwing at each entry; the children who join her
    k.g.fillStyle = "#4a5a2a";
    k.g.beginPath();
    k.g.moveTo(0, h);
    k.g.lineTo(0, h * 0.62);
    k.g.quadraticCurveTo(w * 0.3, h * 0.58, w * 0.5, h * 0.62);
    k.g.quadraticCurveTo(w * 0.7, h * 0.66, w, h * 0.6);
    k.g.lineTo(w, h * 0.66);
    k.g.quadraticCurveTo(w * 0.6, h * 0.72, w * 0.2, h * 0.68);
    k.g.lineTo(0, h * 0.7);
    k.g.fill();
    fillTex(k, texture(k, "grass", 32, grass), 0, h * 0.58, w, h * 0.12, cam);
    const girl = k.wander(16, 0.2, 0.28, 0.72);
    const gy = h * 0.63;
    const hop = k.still ? 0 : Math.abs(Math.sin(k.sec * 3)) * 3;
    const throwing = k.since < 0.6;
    const kids = Math.min(3, Math.floor(k.passed / 3));
    for (let i = 0; i < kids; i++) {
      const kx = w * (0.34 + i * 0.12) + (k.still ? 0 : Math.sin(k.sec * 0.5 + i * 2) * 10);
      const kh = k.still ? 0 : Math.abs(Math.sin(k.sec * 2.6 + i)) * 2;
      lit(k, kx, gy - 1 - kh, KID, { h: ["#5a3a1a", "#d8b060", "#2a1a10"][i], s: "#f0c8a0", k: "#201010", c: ["#3a6ac0", "#e0a020", "#40a060"][i], l: "#3a2a20", b: "#201410" }, 2, girl.x > kx, "rgba(255,230,170,0.85)", 1);
    }
    lit(k, girl.x, gy - hop, throwing ? HOOD_THROW : HOOD, { r: "#d02a2a", d: "#8a1a1a", s: "#f4cca8", k: "#201010", w: "#f0ece0", l: "#f4cca8", b: "#3a2018" }, 2, girl.dir < 0 && !throwing, "rgba(255,230,170,0.9)", 1);
    if (throwing) {
      const u = k.since / 0.6;
      const i = n - 1;
      const tx = w * (0.3 + 0.4 * hash(i + 3));
      const ty = h * (0.66 + 0.2 * hash(i + 7));
      k.R(girl.x + (tx - girl.x) * u, gy - 24 + (ty - gy + 24) * u - Math.sin(u * Math.PI) * 14, 2, 2, "rgba(120,120,130,1)");
    }
    // the dragonfly, and the reeds nearest
    if (!k.still) {
      const dx = w * (0.5 + 0.3 * Math.sin(k.sec * 0.37)) + Math.sin(k.sec * 5) * 3;
      const dy = h * (0.5 + 0.08 * Math.sin(k.sec * 0.53));
      k.R(dx - 3, dy, 7, 1, "rgba(40,120,140,0.9)");
      k.R(dx - 1, dy - 1 - (Math.floor(k.sec * 10) % 2), 3, 1, "rgba(200,230,255,0.6)");
    }
    for (let i = 0; i < 26; i++) {
      const x = (i < 13 ? i * 6 : w - (i - 13) * 6) + cam * 1.8;
      const hh = 14 + hash(i) * 16;
      const sw2 = k.still ? 0 : Math.sin(k.sec * 1.1 + i) * 2;
      k.line(x, h, x + sw2, h - hh, "rgba(40,56,26,1)", 2);
      if (i % 3 === 0) k.R(x + sw2 - 1, h - hh - 5, 3, 6, "rgba(90,60,30,1)");
    }
  },
  // D658: The Cross. A hill under a darkening sky in three depths (far ridges, the hill, the near grass swaying), the
  // cross of rough wood rim-lit by the candles at its foot, clouds passing the moon, a mourner kneeling. The drama (D654):
  // each of the five entries lights a candle and the night thickens; in the strettos their light reaches higher up the
  // hill; at the climax dawn breaks behind the cross and the five flames stand in a line in the first light.
  wtc1f04: (k) => {
    const { w, h } = k;
    const cam = sway(k, 35);
    const cl = k.climax;
    k.sky(DUSK_T, DUSK_L, NIGHT, [40, 24, 50]);
    k.stars(60 * (1 - cl), 0.4);
    k.orb(0.28, 0.2, 0.14, 5, [235, 230, 210], 0.2 * (1 - cl), true);
    clouds(k, 4, 0.25, 0.06);
    const cx = w * 0.55 + cam * 0.6;
    const base = h * 0.7;
    if (cl > 0.01) {
      k.vgrad(h * 0.3, h * 0.45, [[0, "rgba(255,190,130,0)"], [1, `rgba(255,190,130,${0.55 * cl})`]]);
      light(k, cx, base - 6, w * 0.45, [255, 200, 140], 0.4 * cl);
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i * Math.PI) / 8;
        k.line(cx, base - 4, cx + Math.cos(a) * w * 0.5, base - 4 + Math.sin(a) * h * 0.6, `rgba(255,220,170,${0.12 * cl})`, 3);
      }
    }
    k.g.save();
    k.g.translate(cam * 0.3, 0);
    k.hills(0.66, 10, 0.01, 3, "rgba(34,24,40,1)");
    k.g.restore();
    // the hill
    k.g.fillStyle = "#1c1420";
    k.g.beginPath();
    k.g.moveTo(-10, h);
    k.g.quadraticCurveTo(cx - w * 0.2, base - 4, cx, base - 2);
    k.g.quadraticCurveTo(cx + w * 0.25, base, w + 10, h * 0.9);
    k.g.lineTo(w + 10, h);
    k.g.fill();
    fillTex(k, texture(k, "grass", 32, grass), 0, base, w, h - base, cam * 0.6);
    // the candles' light, higher in the strettos
    const lit5 = Math.min(5, k.passed);
    if (lit5) light(k, cx, base, 26 + 10 * lit5 + 40 * k.stretto, [255, 180, 100], 0.12 + 0.06 * lit5);
    // the cross: rough wood, rim-lit from below
    const rim = `rgba(255,190,120,${0.15 + 0.1 * lit5 + 0.4 * cl})`;
    k.R(cx - 4, base - 72, 8, 72, rim);
    k.R(cx - 22, base - 56, 44, 8, rim);
    k.R(cx - 3, base - 71, 6, 71, "#2a1c16");
    k.R(cx - 21, base - 55, 42, 6, "#2a1c16");
    for (let y = base - 70; y < base; y += 5) k.R(cx - 2 + (y % 3), y, 1, 3, "rgba(0,0,0,0.35)");
    for (let i = 0; i < 5; i++) {
      const x = cx - 16 + i * 8;
      k.R(x - 1, base - 5, 3, 6, "rgba(230,220,200,0.9)");
      if (k.passed > i || cl > 0.5) {
        const fl = k.still ? 0 : Math.sin(k.sec * 8 + i) * 0.5;
        light(k, x, base - 8, 10, [255, 190, 100], 0.4);
        k.R(x + fl, base - 9, 2, 3, "rgba(255,226,140,0.95)");
      }
    }
    // a mourner kneeling, rim-lit by the candles
    lit(k, cx - 34, base + 2, KNEELER, { h: "#2a2232", d: "#18121e", f: "#06040a" }, 2, false, rgba([255, 190, 120], 0.25 + 0.1 * lit5), 1);
    // the near grass, swaying
    for (let i = 0; i < 60; i++) {
      const x = (i / 60) * w + cam * 1.6;
      const hh = 5 + hash(i) * 8;
      k.line(x, h, x + (k.still ? 0 : Math.sin(k.sec * 0.9 + i * 0.4) * 2), h - hh, "rgba(14,10,16,1)", 1);
    }
  },
  // The Coronation: a cathedral, the window's light, banners; more banners hung as the voices enter.
  wtc1f05: (k) => {
    k.room([26, 20, 34], [16, 12, 22], 0.86, "rgba(40,30,30,1)");
    arches(k, "rgba(12,10,18,0.95)");
    k.glow(k.w * 0.5, k.h * 0.22, 40 + 20 * k.cadence, [210, 160, 255], 0.25 + 0.15 * k.p + 0.2 * k.cadence);
    k.disc(k.w * 0.5, k.h * 0.22, 12, "rgba(140,90,170,0.7)");
    for (let i = 0; i < 6; i++) k.line(k.w * 0.5, k.h * 0.22, k.w * 0.5 + Math.cos((i * Math.PI) / 3) * 12, k.h * 0.22 + Math.sin((i * Math.PI) / 3) * 12, "rgba(30,20,40,0.9)");
    const cols = ["rgba(150,30,40,0.9)", "rgba(40,60,150,0.9)", "rgba(190,150,40,0.9)", "rgba(40,120,70,0.9)"];
    for (let i = 0; i < Math.min(8, k.passed + 2); i++) {
      const x = k.w * (0.12 + i * 0.105);
      k.R(x, k.h * 0.12, 8, 26, cols[i % 4]);
      k.tri(x + 4, k.h * 0.12 + 32, 8, -6, cols[i % 4]);
    }
    for (let i = 0; i < 3; i++) k.vgrad(0, k.h, [[0, "rgba(255,230,180,0.06)"], [1, "rgba(255,230,180,0)"]], k.w * (0.3 + i * 0.15), 10);
  },
  // D658: The Ambush. A forest road at night in four depths: far pines in moonlight, mid pines rim-lit, mist drifting
  // between them, near trunks and ferns; a traveller with a lantern on the road. The drama (D654): each entry a pair of
  // eyes opens among the trees (blinking now and then, slowly); at the climax the ambushers break cover with torches
  // and the road is lit orange; at the last chord a quiet road again.
  wtc1f06: (k) => {
    const { w, h } = k;
    const cam = sway(k, 31);
    const out = k.climax * (1 - k.rest);
    k.vgrad(0, h, [[0, "#0a1418"], [0.6, "#14222a"], [1, "#1a1a16"]]);
    k.orb(0.66, 0.12, 0.1, 6, [220, 230, 240], 0.25, true);
    k.g.save();
    k.g.translate(cam * 0.3, 0);
    k.along(12, 0.05, (x, i) => pine(k, x, h * 0.6, 26 + hash(i) * 14, "rgba(24,40,44,1)"), 6);
    k.g.restore();
    for (let i = 0; i < 3; i++) k.glow(wrap(k.t * (3 + i) + i * 150, w + 160) - 80, h * (0.55 + i * 0.06), 70, [160, 180, 190], 0.1);
    k.g.save();
    k.g.translate(cam * 0.7, 0);
    k.along(20, 0.12, (x, i) => {
      pine(k, x + 1, h * 0.8, 40 + hash(i) * 18, "rgba(120,150,170,0.35)");
      pine(k, x, h * 0.8, 40 + hash(i) * 18, "rgba(12,20,18,1)");
    }, 8);
    k.g.restore();
    // the road
    k.R(0, h * 0.8, w, h * 0.2, "#2a241a");
    for (let x = -wrap(k.bar * k.pxBar * 0.12, 14); x < w; x += 14) k.R(x, h * 0.86, 6, 1, "rgba(120,100,70,0.35)");
    // the eyes, one pair per entry
    const eyes = Math.min(16, k.passed) * (1 - out);
    for (let i = 0; i < eyes; i++) {
      const x = w * (0.24 + 0.52 * hash(i * 3 + 1)) + cam * 0.7;
      const y = h * (0.42 + 0.3 * hash(i * 5 + 2));
      const blink = !k.still && Math.sin(k.sec * 1.3 + i * 2) > 0.95;
      if (!blink) {
        light(k, x, y, 5, [240, 220, 120], 0.25);
        k.R(x - 3, y, 2, 1, "rgba(250,230,130,0.95)");
        k.R(x + 2, y, 2, 1, "rgba(250,230,130,0.95)");
      }
    }
    // the traveller and his lantern
    const tr = k.wander(22, 0.1, 0.3, 0.7);
    const ty = h * 0.86;
    light(k, tr.x + 6 * tr.dir, ty - 12, 26, [255, 200, 110], 0.35);
    lit(k, tr.x, ty, PILGRIM, { h: "#2a2018", s: "#d8b090", c: "#3a3030", d: "#201818", b: "#140c0c" }, 1, tr.dir < 0, "rgba(255,200,120,0.8)", tr.dir);
    k.R(tr.x + 5 * tr.dir, ty - 12, 2, 3, "rgba(255,220,130,1)");
    // the ambushers, out of cover with torches
    if (out > 0.01) {
      k.vgrad(h * 0.6, h * 0.4, [[0, "rgba(255,140,50,0)"], [1, `rgba(255,140,50,${0.35 * out})`]]);
      for (let i = 0; i < 6; i++) {
        const x = w * (0.26 + 0.09 * i) + cam * 0.8;
        const y = h * 0.86;
        const step = k.still ? 0 : Math.abs(Math.sin(k.sec * 3 + i)) * 2;
        light(k, x + 6, y - 28, 20, [255, 150, 60], 0.45 * out);
        lit(k, x, y - step, RAIDER, { d: `rgba(30,20,18,${out})`, k: `rgba(255,200,120,${out})`, s: `rgba(200,150,110,${out})`, b: `rgba(10,6,6,${out})` }, 2, i % 2 === 1, `rgba(255,160,80,${0.8 * out})`, 1);
        k.R(x + 6, y - 30 - step, 1, 8, `rgba(80,50,30,${out})`);
        k.R(x + 5, y - 34 - step + (k.still ? 0 : Math.sin(k.sec * 9 + i)), 3, 4, `rgba(255,200,90,${out})`);
      }
    }
    // the near trunks and ferns, darkest, moving most
    for (const [x0, ww] of [[0.04, 12], [0.9, 16]] as const) k.R(w * x0 + cam * 1.8, 0, ww, h, "#06090a");
    for (let i = 0; i < 18; i++) {
      const x = (i < 9 ? i * 9 : w - (i - 9) * 9) + cam * 1.8;
      k.tri(x, h, 12, 10 + hash(i) * 8, "#0a1210");
    }
  },
  // The Bicycle: a summer road through the country, fence posts flying past.
  wtc1f07: (k) => {
    k.sky([90, 150, 200], [210, 220, 200], [80, 120, 170], [240, 200, 150]);
    clouds(k, 5, 0.35);
    k.hills(0.62, 10, 0.06, 2, "rgba(80,120,70,1)");
    k.along(60, 0.15, (x, i) => house(k, x, k.h * 0.62, 10, 8, "rgba(120,90,80,1)", false));
    k.hills(0.76, 6, 0.25, 6, "rgba(60,100,50,1)");
    k.ground(0.84, "rgba(150,130,90,1)", "rgba(240,230,200,0.4)", 1.4);
    k.along(16, 1.2, (x) => {
      k.R(x, k.h * 0.74, 2, 10, "rgba(90,60,40,0.9)");
      k.R(x - 8, k.h * 0.76, 16, 1, "rgba(90,60,40,0.8)");
    });
  },
  // D658: The Pilgrim. A road through afternoon into night: the sky turning, the sun setting and the stars coming, far
  // mountains, mid hills with their cypresses passing, the road with its waymarks, fireflies at dusk. The pilgrim is a
  // sprite with hat, cloak and staff, walking. The drama (D654): each entry a waymark lights on the road; at the climax
  // the shrine's door opens at the road's end and light pours out down the road.
  wtc1f08: (k) => {
    const { w, h } = k;
    const cam = sway(k, 37);
    const cl = k.climax;
    k.sky([90, 120, 170], [230, 170, 110], NIGHT, [40, 30, 60]);
    k.stars(70, 0.45);
    k.orb(0.74, 0.3, 0.9, 5, [255, 200, 130], 0.3 * (1 - k.p));
    k.hills(0.56, 18, 0.02, 2, "rgba(70,60,90,1)");
    k.hills(0.66, 12, 0.06, 5, "rgba(46,38,56,1)");
    k.along(54, 0.25, (x, i) => {
      cypress(k, x + 1, h * 0.8, 22 + (i % 3) * 7, `rgba(255,190,130,${0.3 * (1 - k.p)})`);
      cypress(k, x, h * 0.8, 22 + (i % 3) * 7, "rgba(20,22,26,1)");
    });
    k.R(0, h * 0.8, w, h * 0.2, "#4a3a30");
    fillTex(k, texture(k, "grass", 32, grass), 0, h * 0.8, w, h * 0.2, k.bar * k.pxBar * 0.5);
    k.R(0, h * 0.84, w, h * 0.06, "rgba(200,170,130,0.25)");
    if (cl > 0.01) k.vgrad(h * 0.78, h * 0.22, [[0, `rgba(255,210,130,${0.45 * cl})`], [1, "rgba(255,210,130,0)"]]);
    k.atEntries((x, i, begun) => {
      k.R(x - 2, h * 0.86 - 10, 5, 10, "#8a8078");
      k.R(x - 2, h * 0.86 - 10, 1, 10, "rgba(255,230,180,0.4)");
      if (begun) {
        light(k, x, h * 0.86 - 8, 12, [255, 210, 130], 0.4);
        k.R(x - 1, h * 0.86 - 8, 3, 2, "#ffe6a0");
      }
    });
    if (k.p > 0.4 && !k.still) for (let i = 0; i < 10; i++) {
      const fx = wrap(hash(i) * w + Math.sin(k.sec * 0.3 + i) * 20, w);
      const fy = h * (0.6 + 0.2 * hash(i + 4)) + Math.sin(k.sec * 0.7 + i * 2) * 6;
      const on = 0.5 + 0.5 * Math.sin(k.sec * 1.2 + i * 3);
      light(k, fx, fy, 4, [200, 255, 140], 0.4 * on * Math.min(1, (k.p - 0.4) * 4));
    }
    const sx = Math.min(k.end, w * 0.74);
    if (k.end < w + 30 || cl > 0.01) {
      k.R(sx - 10, h * 0.86 - 22, 20, 22, "#4a3e44");
      k.tri(sx, h * 0.86 - 22, 26, 12, "#3a3036");
      fillTex(k, texture(k, "stone", 40, stone), sx - 10, h * 0.86 - 22, 20, 22);
      const open = 0.3 + 0.7 * cl;
      k.R(sx - 3, h * 0.86 - 14, 6, 14, "#1a1014");
      k.R(sx - 3, h * 0.86 - 14, 6 * open, 14, "#ffd88a");
      light(k, sx, h * 0.86 - 8, 26 + 80 * cl, [255, 200, 110], 0.4 + 0.3 * cl);
      if (cl > 0.01) {
        k.g.fillStyle = `rgba(255,220,150,${0.18 * cl})`;
        k.g.beginPath();
        k.g.moveTo(sx - 3, h * 0.86);
        k.g.lineTo(sx + 3, h * 0.86);
        k.g.lineTo(sx - w * 0.2, h);
        k.g.lineTo(sx - w * 0.5, h);
        k.g.fill();
      }
    }
    const px = w * (0.36 + 0.06 * Math.sin(k.t * 0.15)) + cam * 0.8;
    const walk = !k.still && Math.floor(k.sec * (2 + k.busy)) % 2 === 1;
    lit(k, px, h * 0.87, walk ? PILGRIM_B : PILGRIM, { h: "#3a2a1a", s: "#e0b890", c: "#5a4a3a", d: "#3a2e24", b: "#1a1210" }, 2, false, rgba(mix([255, 190, 120], [150, 160, 220], k.p), 0.85), 1);
    k.line(px + 10, h * 0.87, px + 12, h * 0.87 - 34, "#5a4028", 2);
  },
  // D658: The Sparrow. Rooftops under a clearing sky in three depths: the far city, the mid roofs with their tiles and
  // chimneys smoking, the near ridge where the birds land; the sun's rim light on the roofs' edges. The drama (D654):
  // the first sparrow wanders the ridge on its own clock (D464); each entry another lands beside it, the flock growing;
  // at the climax the whole flock takes off together across the clearing sky.
  wtc1f09: (k) => {
    const { w, h } = k;
    const cam = sway(k, 29);
    const cl = k.climax;
    k.sky([110, 150, 190], [200, 210, 220], [150, 170, 210], [240, 220, 190]);
    if (cl > 0.01) light(k, w * 0.6, h * 0.1, w * 0.5, [255, 240, 200], 0.3 * cl);
    clouds(k, Math.round(6 * (1 - 0.7 * cl)), 0.45, 0.2);
    skyline(k, 0.62, 0.05, "rgba(120,130,160,1)", 2);
    k.g.save();
    k.g.translate(cam * 0.6, 0);
    k.along(46, 0.15, (x, i) => {
      const hh = 26 + hash(i) * 16;
      k.R(x, h * 0.86 - hh, 40, hh + 10, "#a06a58");
      k.tri(x + 20, h * 0.86 - hh, 48, 16, "#7a3a30");
      fillTex(k, texture(k, "tiles", 24, tiles), x - 4, h * 0.86 - hh - 16, 48, 16);
      k.R(x - 4, h * 0.86 - hh, 48, 1, "rgba(255,230,190,0.6)");
      if (hash(i + 2) > 0.4) {
        const cx2 = x + 30;
        k.R(cx2, h * 0.86 - hh - 20, 6, 12, "#6a3a30");
        if (!k.still) for (let s2 = 0; s2 < 4; s2++) {
          const u = wrap(k.t * 0.15 + s2 / 4 + hash(i), 1);
          k.glow(cx2 + 3 + u * 16, h * 0.86 - hh - 22 - u * 26, 4 + u * 6, [230, 230, 235], 0.25 * (1 - u));
        }
      }
      for (let j = 0; j < 3; j++) k.R(x + 6 + j * 11, h * 0.86 - hh + 8, 5, 6, hash(i * 3 + j) > 0.5 ? "#f0d890" : "#3a2a30");
    });
    k.g.restore();
    // the near ridge
    const ry = h * 0.8;
    k.R(0, ry, w, h - ry, "#7a3a30");
    fillTex(k, texture(k, "tiles", 24, tiles), 0, ry, w, h - ry, cam * 1.2);
    k.R(0, ry - 2, w, 3, "#5a2a24");
    k.R(0, ry - 2, w, 1, "rgba(255,230,190,0.7)");
    const pal = { b: "#7a5030", k: "#101010", y: "#e0b040", w: "#e8d8c0", l: "#3a2a20" };
    const lead = k.wander(18, 0.6, 0.26, 0.74);
    const fly = cl > 0.3 ? (cl - 0.3) / 0.7 : 0;
    const lhop = k.still ? 0 : Math.abs(Math.sin(k.sec * Math.PI * 2.5)) * 4;
    lit(k, lead.x, ry - 2 - lhop - fly * h * 0.5, fly ? SPARROW_FLY : SPARROW, pal, 2, lead.dir < 0, "rgba(255,240,200,0.8)", 0, -1);
    const n = Math.min(16, k.passed);
    for (let i = 0; i < n; i++) {
      const bx = w * (0.26 + 0.48 * (i / 16)) + (hash(i) - 0.5) * 8 + cam * 1.2;
      const born = i === n - 1 ? Math.min(1, k.since * 2) : 1;
      const x = bx + fly * (w * 0.3 + hash(i + 5) * 40);
      const y = ry - 2 - (1 - born) * 30 - fly * h * (0.4 + 0.2 * hash(i + 2)) - (k.still ? 0 : Math.abs(Math.sin(k.sec * 3 + i)) * (fly ? 3 : 1));
      const flap = born < 1 || fly > 0 ? !k.still && Math.floor(k.sec * 8 + i) % 2 === 0 : false;
      sprite(k, x, y, flap ? SPARROW_FLY : SPARROW, pal, 2, hash(i + 9) > 0.5);
    }
  },
  // D658: The Two Horsemen. A plain under a rising sun: the far mountains, the plain's grass passing at the gallop's
  // pace, the dust; the riders as sprites, horse and cloak, galloping in two frames. The drama (D654): each entry a
  // rider appears on the plain, the two first racing side by side, dust rising; at the climax they gallop toward the
  // viewer, the dust lit gold by the high sun.
  wtc1f10: (k) => {
    const { w, h } = k;
    const cam = sway(k, 25);
    const near = k.climax;
    k.sky([60, 70, 110], [230, 150, 100], [120, 150, 190], [240, 210, 170]);
    k.orb(0.5, 0.75, 0.15 - 0.05 * near, 4 + 3 * near, [255, 230, 170], 0.3 + 0.3 * near);
    k.hills(0.62, 14, 0.02, 4, "rgba(110,100,120,1)");
    k.hills(0.7, 8, 0.08, 6, "rgba(90,80,70,1)");
    k.R(0, h * 0.72, w, h * 0.28, "#9a8050");
    fillTex(k, texture(k, "grass", 32, grass), 0, h * 0.72, w, h * 0.28, k.bar * k.pxBar * 0.9);
    k.along(24, 1, (x) => k.R(x, h * 0.92, 2, 6, "rgba(70,50,36,0.8)"));
    const n = Math.min(6, Math.max(2, k.passed));
    for (let i = n - 1; i >= 0; i--) {
      const sc = (i < 2 ? 2 : 1) + (i < 2 ? Math.round(near * 2) : 0);
      const born = i === k.passed - 1 ? Math.min(1, k.since * 2) : 1;
      const x = w * (0.36 + (i % 3) * 0.14 + (i < 2 ? 0 : 0.04)) + (k.still ? 0 : Math.sin(k.sec * 2 + i) * 4) + cam * (i < 2 ? 1 : 0.5);
      const y = h * (0.84 + 0.08 * near * (i < 2 ? 1 : 0) - (i >= 2 ? 0.07 : 0)) - (i === 1 ? 6 : 0);
      for (let d = 0; d < 5; d++) {
        const u = wrap(k.t * 1.2 + d / 5 + i * 0.3, 1);
        k.glow(x - 8 * sc - u * 26, y - 2 - u * 8, 3 + u * 8, near > 0.3 ? [255, 210, 130] : [210, 180, 130], (0.35 + 0.2 * near) * (1 - u) * born);
      }
      const gal = !k.still && Math.floor(k.sec * 6 + i) % 2 === 0;
      const pal = { r: ["#2a1a2a", "#5a1a1a", "#1a2a3a", "#2a2a1a", "#3a1a2a", "#1a1a1a"][i], h: ["#3a2418", "#6a4428", "#1e1410", "#8a6a48", "#4a3020", "#2a1c14"][i], t: "#1a100c" };
      if (born > 0.05) lit(k, x, y, gal ? HORSE_A : HORSE_B, pal, sc, false, `rgba(255,220,160,${0.7 * born})`, 0, -1);
    }
  },
  // D659 (design studio, the art upgrade, batch 2): The Shepherdess. A meadow after rain in three depths: the sky
  // clearing (a rainbow's ghost), the far hills, the meadow's grass and flowers, a fence and a tree near; the sun's rim
  // on everything. She stands with her crook, her bonnet yellow. The drama: each entry a flower opens and a lamb joins
  // the flock round her; at the climax the meadow in full bloom, the flock gathered, the light after the rain.
  wtc1f11: (k) => {
    const { w, h } = k;
    const cam = sway(k, 31);
    const cl = k.climax;
    k.sky([120, 150, 190], [210, 220, 210], [150, 180, 220], [250, 230, 190]);
    light(k, w * 0.3, h * 0.08, w * 0.4, [255, 240, 200], 0.25 + 0.25 * cl);
    if (k.p > 0.3) for (let b = 0; b < 5; b++) {
      k.g.strokeStyle = `rgba(${["255,120,120", "255,200,120", "250,250,140", "140,220,160", "140,170,255"][b]},${0.08 + 0.12 * cl})`;
      k.g.lineWidth = 2;
      k.g.beginPath();
      k.g.arc(w * 0.62, h * 0.9, w * 0.34 - b * 2, Math.PI * 1.1, Math.PI * 1.9);
      k.g.stroke();
    }
    clouds(k, 4, 0.4, 0.08);
    k.hills(0.56, 12, 0.02, 1, "rgba(110,140,130,1)");
    k.g.save();
    k.g.translate(cam * 0.5, 0);
    k.hills(0.64, 8, 0.04, 4, "rgba(80,130,80,1)");
    k.g.restore();
    k.R(0, h * 0.7, w, h * 0.3, "#4e8a46");
    fillTex(k, texture(k, "grass", 32, grass), 0, h * 0.62, w, h * 0.38, cam);
    // the flowers, one more per entry; all of them at the climax
    const nf = Math.min(30, k.passed * 3) + Math.round(40 * cl);
    for (let i = 0; i < nf; i++) {
      const x = w * (0.1 + 0.8 * hash(i * 7)) + cam;
      const y = h * (0.74 + 0.24 * hash(i * 3));
      const sw2 = k.still ? 0 : Math.sin(k.sec * 1.2 + i) * 0.6;
      k.R(x + sw2, y - 3, 1, 3, "#3a6a2a");
      k.R(x - 1 + sw2, y - 5, 3, 2, ["#f0d040", "#f08aa0", "#d0d0ff", "#ffffff"][i % 4]);
    }
    // the tree and the fence, near
    k.R(w * 0.86 + cam * 1.4, h * 0.3, 6, h * 0.5, "#4a3424");
    k.disc(w * 0.86 + cam * 1.4 + 3, h * 0.26, 26, "#3a6a34");
    k.disc(w * 0.86 + cam * 1.4 - 6, h * 0.22, 14, "#4a7a3c");
    light(k, w * 0.84 + cam * 1.4, h * 0.18, 20, [255, 240, 190], 0.15);
    for (let x = -wrap(-cam * 1.6, 20); x < w * 0.24; x += 20) {
      k.R(x, h * 0.8, 3, 18, "#6a4a30");
      k.R(x, h * 0.84, 20, 2, "#6a4a30");
    }
    // the shepherdess and her flock
    const sx = w * 0.42 + (k.still ? 0 : Math.sin(k.sec * 0.25) * 16) + cam * 0.8;
    const gather = cl;
    const nl = Math.min(12, k.passed);
    for (let i = 0; i < nl; i++) {
      const born = i === nl - 1 ? Math.min(1, k.since * 2) : 1;
      const a = (i / 12) * Math.PI * 2;
      const lx = (w * (0.5 + 0.026 * i) + (hash(i) - 0.5) * 8) * (1 - gather) + (sx + Math.cos(a) * 30) * gather + (k.still ? 0 : Math.sin(k.sec * 0.4 + i) * 3) + cam * 0.8;
      const ly = h * (0.86 + 0.06 * hash(i + 3)) * (1 - gather) + (h * 0.88 + Math.sin(a) * 6) * gather;
      if (born > 0.2) lit(k, lx, ly, LAMB, { w: "#f4f0e4", k: "#2a2420", l: "#2a2420" }, 2, hash(i + 5) > 0.5, "rgba(255,240,200,0.9)", 0, -1);
    }
    lit(k, sx, h * 0.88, SHEPHERDESS, { y: "#f0d040", h: "#8a5a2a", s: "#f4cca8", k: "#201010", w: "#f4f0e8", b: "#5a7ac0", l: "#3a2a20" }, 2, false, "rgba(255,240,200,0.9)", -1);
    k.line(sx + 9, h * 0.88, sx + 10, h * 0.88 - 34, "#7a5a3a", 2);
    k.g.strokeStyle = "#7a5a3a";
    k.g.lineWidth = 2;
    k.g.beginPath();
    k.g.arc(sx + 13, h * 0.88 - 34, 3, Math.PI, 0);
    k.g.stroke();
  },
  // D656 (design studio, the art upgrade): The Requiem. A Gothic nave in one-point perspective: the apse with its
  // lancets and the rose window far, five bays of columns and pointed arches receding, the tiled floor, the clerestory's
  // stained glass throwing moonlight down in shafts where the dust drifts; the bier under its pall. The drama (D654):
  // each entry lights a candle on the stands along the aisle (near to far), and the mourners arrive, hooded, by twos;
  // at the climax the rose window at dawn floods the nave and every flame leans toward the light.
  wtc1f12: (k) => {
    const { w, h } = k;
    const cam = sway(k, 31);
    const vx = w * 0.5 + cam * 0.2;
    const vy = h * 0.4;
    const X = w * 0.44;
    const P = (x: number, y: number, z: number) => [vx + x / z, vy + y / z] as const;
    const floorY = h * 1.04 - vy;
    const roofY = -h * 0.55 - vy;
    const moon = Math.min(1, 0.35 + k.act(1) + 0.4 * k.act(2));
    const rose = Math.max(k.act(3), k.climax);
    // the walls and vault: stone, darker high up
    k.vgrad(0, h, [[0, "#121020"], [0.5, "#24202c"], [1, "#2c2428"]]);
    fillTex(k, texture(k, "stone", 40, stone), 0, 0, w, h, cam * 0.4);
    // the apse (z = 5): the lancets in moonlight, the rose window above, the altar
    const az = 5;
    const [ax0, ay1] = P(-X, floorY, az);
    const [ax1] = P(X, floorY, az);
    const [, ay0] = P(0, roofY, az);
    k.R(ax0, ay0, ax1 - ax0, ay1 - ay0, "rgba(16,14,22,1)");
    for (let i = 0; i < 3; i++) {
      const lx = ax0 + (ax1 - ax0) * (0.25 + i * 0.25) - 3;
      k.R(lx, ay0 + (ay1 - ay0) * 0.35, 6, (ay1 - ay0) * 0.45, `rgba(${70 + 120 * rose},${90 + 90 * rose},${170 - 40 * rose},${0.35 + 0.4 * moon})`);
      k.R(lx + 2, ay0 + (ay1 - ay0) * 0.35, 1, (ay1 - ay0) * 0.45, "rgba(10,8,14,0.8)");
    }
    const rx = vx;
    const ry = ay0 + (ay1 - ay0) * 0.18;
    k.disc(rx, ry, 11, "rgba(10,8,14,1)");
    const rc = ["rgba(200,60,80,", "rgba(60,90,200,", "rgba(230,180,60,", "rgba(80,160,110,"];
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6 + (k.still ? 0 : k.sec * 0.01);
      k.disc(rx + Math.cos(a) * 6.5, ry + Math.sin(a) * 6.5, 2.4, rc[i % 4] + (0.25 + 0.7 * rose) + ")");
    }
    k.disc(rx, ry, 3, `rgba(255,230,170,${0.3 + 0.7 * rose})`);
    k.R(vx - 10, ay1 - 8, 20, 8, "rgba(40,30,30,1)");
    k.R(vx - 10, ay1 - 9, 20, 1, "rgba(200,160,90,0.7)");
    // the floor: tiles in perspective, a checker of two stones
    for (let j = -6; j < 6; j++) for (let zi = 0; zi < 7; zi++) {
      const z0 = 1 + zi * 0.6;
      const z1 = z0 + 0.6;
      const [x00, y0] = P((j * X) / 6, floorY, z0);
      const [x01] = P(((j + 1) * X) / 6, floorY, z0);
      const [x10, y1] = P((j * X) / 6, floorY, z1);
      const [x11] = P(((j + 1) * X) / 6, floorY, z1);
      k.g.fillStyle = (j + zi) % 2 ? "rgba(70,58,58,1)" : "rgba(36,30,34,1)";
      k.g.beginPath();
      k.g.moveTo(x00, y0);
      k.g.lineTo(x01, y0);
      k.g.lineTo(x11, y1);
      k.g.lineTo(x10, y1);
      k.g.fill();
    }
    // the clerestory's glass and its shafts of moonlight, the dust drifting in them
    for (let i = 0; i < 4; i++) {
      const z = 1.4 + i * 0.9;
      for (const sd of [-1, 1]) {
        const [wx, wy] = P(sd * X, roofY * 0.55, z);
        const ww = 12 / z;
        const wh = 56 / z;
        k.R(wx - ww / 2, wy, ww, wh, `rgba(${sd < 0 ? 70 : 190},${sd < 0 ? 110 : 50},${sd < 0 ? 230 : 110},${0.4 + 0.5 * moon})`);
        if (sd < 0 && moon > 0.05) {
          const [fx0, fy0] = P(-X * 0.1, floorY, z + 0.4);
          k.g.fillStyle = `rgba(150,170,230,${0.05 * moon})`;
          k.g.beginPath();
          k.g.moveTo(wx, wy);
          k.g.lineTo(wx + ww, wy);
          k.g.lineTo(fx0 + 10 / z, fy0);
          k.g.lineTo(fx0 - 6 / z, fy0);
          k.g.fill();
          for (let d = 0; d < 6; d++) {
            const u = wrap(k.t * 0.03 + hash(d + i * 9), 1);
            k.R(wx + (fx0 - wx) * u + Math.sin(k.t * 0.5 + d) * 3, wy + (fy0 - wy) * u, 1, 1, `rgba(220,230,255,${0.5 * moon})`);
          }
        }
      }
    }
    // the columns and their arches, far to near (rim-lit warm on the aisle's side by the candles)
    for (let zi = 4; zi >= 0; zi--) {
      const z = 1 + zi * 0.9;
      const near = cam * (1.2 / z);
      for (const sd of [-1, 1]) {
        const [cx, cy1] = P(sd * X, floorY, z);
        const [, cy0] = P(sd * X, roofY * 0.5, z);
        const cw = 30 / z;
        k.R(cx - cw / 2 + near, cy0, cw, cy1 - cy0, `rgba(${62 - zi * 6},${54 - zi * 5},${64 - zi * 6},1)`);
        k.R(cx - sd * cw / 2 + near - (sd > 0 ? 0 : 2), cy0, 2, cy1 - cy0, `rgba(255,180,110,${0.25 + 0.04 * Math.min(k.passed, 12) + 0.3 * rose})`);
        k.R(cx + sd * cw / 2 + near - (sd > 0 ? 3 : 0), cy0, 3, cy1 - cy0, "rgba(0,0,0,0.3)");
        k.R(cx - cw / 2 - 2 / z + near, cy1 - 6 / z, cw + 4 / z, 6 / z, "rgba(20,16,22,1)");
      }
      // the arch across the nave, pointed
      const [lx, ly] = P(-X, roofY * 0.5, z);
      const [rx2] = P(X, roofY * 0.5, z);
      const [, apex] = P(0, roofY, z);
      k.g.strokeStyle = `rgba(${58 - zi * 6},${50 - zi * 5},${60 - zi * 6},1)`;
      k.g.lineWidth = Math.max(2, 14 / z);
      k.g.beginPath();
      k.g.moveTo(lx + near, ly);
      k.g.quadraticCurveTo(lx + near, apex, vx + near, apex);
      k.g.quadraticCurveTo(rx2 + near, apex, rx2 + near, ly);
      k.g.stroke();
    }
    // the bier: the pall, its gold border, the lilies
    {
      const z = 2.2;
      const [bx0, by] = P(-X * 0.22, floorY, z);
      const [bx1] = P(X * 0.22, floorY, z);
      const bh = 22 / z;
      k.R(bx0 + 2, by - bh, 2, bh, "rgba(14,10,12,1)");
      k.R(bx1 - 4, by - bh, 2, bh, "rgba(14,10,12,1)");
      k.R(bx0 - 3, by - bh - 8, bx1 - bx0 + 6, 10, "rgba(12,10,14,1)");
      k.R(bx0 - 3, by - bh + 1, bx1 - bx0 + 6, 1, "rgba(210,170,90,0.85)");
      k.R(vx - 1, by - bh - 7, 2, 7, "rgba(210,170,90,0.7)");
      k.R(vx - 3, by - bh - 5, 6, 2, "rgba(210,170,90,0.7)");
      for (let i = 0; i < 5; i++) k.R(vx - 10 + i * 5, by - bh - 10, 2, 2, "rgba(240,240,230,0.85)");
    }
    // the candles on their stands down the aisle, one per entry near to far; flames leaning to the rose's light
    const n = Math.min(12, Math.max(2, k.ents.length));
    for (let i = n - 1; i >= 0; i--) {
      const z = 1.25 + Math.floor(i / 2) * 0.55;
      const sd = i % 2 ? 1 : -1;
      const [cx, cy] = P(sd * X * 0.55, floorY, z);
      const sh = 30 / z;
      k.R(cx, cy - sh, Math.max(1, 2 / z), sh, "rgba(70,56,44,1)");
      k.R(cx - 3 / z, cy - sh, 8 / z, 1.5, "rgba(120,100,70,1)");
      k.R(cx, cy - sh - 8 / z, Math.max(1, 3 / z), 8 / z, "rgba(230,220,200,0.9)");
      if (k.passed > i) {
        const lean = rose * (vx - cx) * 0.04;
        const fl = k.still ? 0 : Math.sin(k.sec * 8 + i) * 0.5;
        light(k, cx + 1, cy - sh - 10 / z, 22 / z + 6, [255, 170, 80], 0.35);
        k.R(cx + fl + lean, cy - sh - 13 / z, Math.max(1, 3 / z), 5 / z + 1, "rgba(255,226,140,0.95)");
      }
    }
    // the mourners, by twos, rim-lit on the bier's side
    const m = Math.min(8, Math.floor(k.passed / 2));
    for (let i = m - 1; i >= 0; i--) {
      const z = 1.6 + (i % 4) * 0.25;
      const sd = i < 4 ? -1 : 1;
      const [mx, my] = P(sd * X * (0.34 + (i % 4) * 0.05), floorY, z);
      const born = i === m - 1 && k.passed % 2 === 0 ? Math.min(1, k.since * 2) : 1;
      const rows = i % 3 === 2 ? KNEELER : MOURNER;
      lit(k, mx, my, rows, { h: `rgba(44,36,54,${born})`, d: `rgba(26,22,34,${born})`, f: `rgba(6,4,8,${born})` }, z < 1.8 ? 2 : 1, sd > 0, `rgba(255,190,120,${0.55 * born})`, -sd);
    }
    // the rose window at dawn: its light down the nave onto the bier
    if (rose > 0.01) {
      k.g.fillStyle = `rgba(255,214,160,${0.09 * rose})`;
      k.g.beginPath();
      k.g.moveTo(rx - 9, ry);
      k.g.lineTo(rx + 9, ry);
      k.g.lineTo(vx + X * 0.4, h);
      k.g.lineTo(vx - X * 0.4, h);
      k.g.fill();
      light(k, rx, ry, 70, [255, 220, 170], 0.5 * rose);
      light(k, vx, h * 0.8, w * 0.3, [255, 200, 150], 0.1 * rose);
    }
    // the censer's smoke (act III)
    if (k.act(2) > 0.01) for (let j = 0; j < 5; j++) k.glow(vx + Math.sin(k.t * 0.2 + j) * 30, h * (0.6 - j * 0.1) - wrap(k.t * 3, 20), 26, [200, 190, 170], 0.08 * k.act(2));
  },
  // D659: The Aquarium. A tank in three depths: the back glass's blue, the light from the surface rippling down in
  // caustics and shafts, rocks and weed swaying, the gravel; the glass's reflection nearest. The drama: each entry a
  // new fish swims in, the tank filling; bubbles rise thicker in the strettos; at the climax a great school turns as
  // one in a shaft of light from the surface.
  wtc1f13: (k) => {
    const { w, h } = k;
    const cam = sway(k, 27);
    const cl = k.climax;
    k.vgrad(0, h, [[0, "#1a6a7a"], [0.5, "#0e4058"], [1, "#081e30"]]);
    fillTex(k, texture(k, "caustic", 48, caustic), 0, 0, w, h * 0.7, k.t * 4, k.t * 2);
    for (let i = 0; i < 5; i++) {
      const x = w * (0.15 + i * 0.18) + Math.sin(k.t * 0.2 + i) * 10;
      k.g.fillStyle = `rgba(200,250,240,${0.05 + 0.08 * (i === 2 ? cl : 0)})`;
      k.g.beginPath();
      k.g.moveTo(x - 6, 0);
      k.g.lineTo(x + 6, 0);
      k.g.lineTo(x + 30, h);
      k.g.lineTo(x + 6, h);
      k.g.fill();
    }
    k.R(0, 0, w, 3, "rgba(220,255,250,0.35)");
    // the far rocks and weed
    k.g.save();
    k.g.translate(cam * 0.4, 0);
    for (let i = 0; i < 8; i++) k.disc(w * (0.05 + i * 0.13), h * 0.96, 14 + hash(i) * 12, "#0a2a34");
    k.g.restore();
    for (let i = 0; i < 16; i++) {
      const x = w * (0.04 + i * 0.062) + cam * 0.8;
      const hh = h * (0.2 + 0.25 * hash(i + 3));
      for (let s2 = 0; s2 < hh; s2 += 3) k.R(x + (k.still ? 0 : Math.sin(k.sec * 1.2 + s2 * 0.08 + i) * (s2 / hh) * 5), h - s2, 2, 3, i % 3 ? "#2a7a4a" : "#4a8a3a");
    }
    // the fish: one per entry; at the climax the school turning in the light
    const school = cl;
    if (school > 0.01) light(k, w * 0.5, h * 0.3, h * 0.7, [190, 250, 240], 0.25 * school);
    const nf = Math.min(18, k.passed * 2) + Math.round(14 * school);
    const cols = ["#f08a30", "#f0d040", "#e04a60", "#60c0f0", "#c0a0f0"];
    for (let i = 0; i < nf; i++) {
      const dir = school > 0.5 ? 1 : i % 2 ? -1 : 1;
      const cx = school > 0.5 ? w * 0.5 + Math.cos(k.t * 0.6 + i * 0.2) * w * 0.18 : w * 0.22 + wrap(dir * k.t * (8 + (i % 5) * 2) + hash(i) * w, w * 0.56);
      const cy = school > 0.5 ? h * 0.42 + Math.sin(k.t * 0.6 + i * 0.2) * h * 0.18 : h * (0.2 + 0.55 * hash(i + 9)) + Math.sin(k.t + i) * 3;
      const flip = school > 0.5 ? Math.sin(k.t * 0.6 + i * 0.2) > 0 : dir < 0;
      sprite(k, cx + cam * 0.8, cy, FISH, { f: cols[i % 5], k: "#101010", t: cols[(i + 2) % 5] }, 2, flip);
    }
    // the bubbles, thicker in the strettos
    for (let i = 0; i < 8 + 20 * k.stretto; i++) {
      const u = wrap(k.t * 0.25 + hash(i), 1);
      k.disc(w * (0.3 + 0.4 * hash(i + 4)) + Math.sin(u * 12 + i) * 2, h * (1 - u), 1 + hash(i) * 1.5, "rgba(220,250,255,0.5)");
    }
    // the gravel and the glass
    k.R(0, h * 0.94, w, h * 0.06, "#c0a070");
    fillTex(k, texture(k, "rock", 48, specks(["rgba(0,0,0,0.35)", "rgba(120,60,50,0.25)", "rgba(60,24,24,0.4)"], 260, 3, 2, 1)), 0, h * 0.94, w, h * 0.06);
    k.g.fillStyle = "rgba(255,255,255,0.04)";
    k.g.beginPath();
    k.g.moveTo(w * 0.7 + cam * 2, 0);
    k.g.lineTo(w * 0.78 + cam * 2, 0);
    k.g.lineTo(w * 0.62 + cam * 2, h);
    k.g.lineTo(w * 0.54 + cam * 2, h);
    k.g.fill();
  },
  // D659: Pierrot. A moonlit stage in three depths: the painted night backdrop with its moon, the stage's boards and
  // the footlights' blue, the curtains near; Pierrot white, his ruff red, rim-lit by the moon. The drama: each entry
  // Pierrot takes a step in his moonlit dance and a star lights; at the climax the moon full and huge, Pierrot
  // reaching for it, the stage filled with stars.
  wtc1f14: (k) => {
    const { w, h } = k;
    const cam = sway(k, 33);
    const cl = k.climax;
    k.vgrad(0, h * 0.8, [[0, "#14143a"], [1, "#2a2a5a"]]);
    fillTex(k, texture(k, "velvet", 24, velvet), 0, 0, w, h * 0.8, cam * 0.3);
    const ns = Math.min(24, k.passed) + Math.round(30 * cl);
    for (let i = 0; i < ns; i++) {
      const x = w * (0.2 + 0.6 * hash(i * 5)) + cam * 0.3;
      const y = h * (0.06 + 0.4 * hash(i * 5 + 1));
      const tw = k.still ? 1 : 0.7 + 0.3 * Math.sin(k.sec * 0.9 + i);
      light(k, x, y, 4, [255, 250, 220], 0.5 * tw);
      k.R(x, y, 1, 1, "#fffbe8");
    }
    const mr = 14 + 30 * cl;
    const mx = w * 0.62 + cam * 0.3;
    const my = h * 0.3;
    light(k, mx, my, mr * 3, [235, 230, 210], 0.25 + 0.2 * cl);
    k.disc(mx, my, mr, "#f0ecd8");
    k.disc(mx - mr * 0.3, my - mr * 0.2, mr * 0.2, "rgba(200,195,170,0.6)");
    k.disc(mx + mr * 0.25, my + mr * 0.3, mr * 0.14, "rgba(200,195,170,0.6)");
    if (cl < 0.5) k.disc(mx + mr * 0.45, my - mr * 0.2, mr * 0.9, "#1c1c46");
    // the boards and the footlights' blue
    k.vgrad(h * 0.8, h * 0.2, [[0, "#3a3050"], [1, "#1a1428"]]);
    for (let i = -8; i <= 8; i++) k.line(w * 0.5 + i * 18 + cam * 0.5, h * 0.8, w * 0.5 + i * 40 + cam * 1.2, h, "rgba(0,0,0,0.25)", 1);
    for (let x = w * 0.1; x < w * 0.95; x += 20) light(k, x + cam * 1.4, h * 0.98, 14, [140, 160, 255], 0.3);
    // Pierrot: one step of his dance per entry; reaching for the moon at the climax
    const step = k.passed % 6;
    const px = w * (0.32 + step * 0.04) + cam * 0.8 + (k.still ? 0 : Math.sin(k.sec * 0.8) * 3);
    const lean = k.still ? 0 : Math.sin(k.sec * 1.6) * 1;
    lit(k, px, h * 0.86 - Math.abs(lean), cl > 0.5 ? PIERROT_REACH : PIERROT, { k: "#101018", w: "#f4f2f0", r: "#d03040", s: "#f4f2f0" }, 2, false, "rgba(200,210,255,0.9)", 1);
    k.g.fillStyle = "rgba(0,0,0,0.3)";
    k.g.beginPath();
    k.g.ellipse(px, h * 0.87, 10, 2, 0, 0, Math.PI * 2);
    k.g.fill();
    // the curtains, near
    for (const sd of [-1, 1]) {
      const cx = sd < 0 ? cam * 1.2 : w * 0.84 + cam * 1.2;
      k.vgrad(0, h, [[0, "#3a1a4a"], [1, "#1a0a24"]], cx, w * 0.16);
      fillTex(k, texture(k, "velvet", 24, velvet), cx, 0, w * 0.16, h, cam * 1.2);
    }
  },
  // D656 (design studio, the art upgrade): The Pinball. A cosmic table under glass: the playfield's print (a sunburst,
  // a ringed planet, a field of stars), the arrow inserts up three lanes, chrome ramps, pop bumpers as mushrooms lit from
  // above with their skirts and shadows, slingshots and flippers, the chrome ball always in play; the dot-matrix display
  // at the head; the glass's reflections drifting over it all. The drama (D654): each entry lights a bumper and fills an
  // arrow, the display's points climb; while voices pile up, multiball; at the climax JACKPOT: every light lit and held.
  wtc1f15: (k) => {
    const { w, h } = k;
    const cam = sway(k, 37);
    const fill = Math.min(1, k.passed / Math.max(1, k.ents.length));
    const jack = k.climax;
    const cx = w * 0.5;
    const cy = h * 0.5;
    k.vgrad(0, h, [[0, "#22093e"], [0.5, "#2c0c4c"], [1, "#14052a"]]);
    for (let i = 0; i < 16; i++) {
      const a0 = (i * Math.PI) / 8;
      k.g.fillStyle = i % 2 ? "rgba(255,120,200,0.05)" : "rgba(120,200,255,0.04)";
      k.g.beginPath();
      k.g.moveTo(cx, cy);
      k.g.arc(cx, cy, w, a0, a0 + Math.PI / 8);
      k.g.fill();
    }
    fillTex(k, texture(k, "pin-stars", 64, specks(["rgba(255,255,255,0.5)", "rgba(140,220,255,0.4)", "rgba(255,180,240,0.35)"], 40, 5)), 0, 0, w, h);
    // the ringed planet, lit from above left
    {
      const gr = k.g.createRadialGradient(cx - 10, cy - 12, 2, cx, cy, 30);
      gr.addColorStop(0, "#5fd8d0");
      gr.addColorStop(0.6, "#2a6a9a");
      gr.addColorStop(1, "#162a5a");
      k.g.fillStyle = gr;
      k.g.beginPath();
      k.g.arc(cx, cy, 28, 0, Math.PI * 2);
      k.g.fill();
      k.g.strokeStyle = "rgba(255,170,80,0.55)";
      k.g.lineWidth = 3;
      k.g.beginPath();
      k.g.ellipse(cx, cy, 52, 12, -0.25, 0, Math.PI * 2);
      k.g.stroke();
    }
    light(k, cx, -20, h * 1.1, [255, 200, 150], 0.16 + 0.2 * jack);
    // the arrow inserts up three lanes, lit as the entries pass; a slow chase in each when idle
    const lanes: [number, C3][] = [[0.3, [255, 190, 60]], [0.5, [90, 230, 255]], [0.7, [255, 90, 200]]];
    let ai = 0;
    for (const [lx, c] of lanes) for (let j = 0; j < 5; j++, ai++) {
      const x = w * lx;
      const y = h * (0.86 - j * 0.11);
      const on = jack > 0.5 || ai < Math.round(fill * 15);
      const chase = !k.still && Math.floor(k.sec * 2.2) % 5 === j;
      k.tri(x, y, 10, 7, on ? rgba(c, 0.95) : chase ? rgba(c, 0.5) : rgba(mix(c, [30, 10, 50], 0.75), 0.9));
      if (on) light(k, x, y - 3, 12, c, 0.3);
    }
    // the ramps: chrome rails sweeping round
    for (const sd of [-1, 1]) {
      const x0 = cx + sd * w * 0.27;
      for (const [lw, c] of [[5, "rgba(20,20,30,0.9)"], [3, "rgba(150,160,180,1)"], [1, "rgba(250,250,255,0.95)"]] as const) {
        k.g.strokeStyle = c;
        k.g.lineWidth = lw;
        k.g.beginPath();
        k.g.moveTo(x0, h + 4);
        k.g.quadraticCurveTo(x0 + sd * 26, h * 0.1, cx + sd * 20, h * 0.08);
        k.g.stroke();
      }
    }
    // the pop bumpers, one lit per entry
    const bumps: [number, number, C3][] = [[0.42, 0.3, [255, 80, 160]], [0.58, 0.3, [255, 80, 160]], [0.5, 0.17, [255, 200, 70]], [0.37, 0.56, [90, 220, 255]], [0.63, 0.56, [90, 220, 255]]];
    bumps.forEach(([bx, by, c], i) => {
      const x = w * bx;
      const y = h * by;
      const on = jack > 0.5 || k.passed > i;
      const kick = k.passed % bumps.length === (i + 1) % bumps.length && k.since < 0.4 ? 1 - k.since / 0.4 : 0;
      k.disc(x + 2, y + 3, 10, "rgba(0,0,0,0.4)");
      k.disc(x, y, 10, "rgba(235,235,245,1)");
      k.disc(x, y, 8, on ? rgba(c) : rgba(mix(c, [30, 10, 40], 0.65)));
      k.disc(x - 1, y - 2, 6, on ? rgba(mix(c, [255, 255, 255], 0.45)) : rgba(mix(c, [30, 10, 40], 0.5)));
      k.R(x - 4, y - 6, 3, 1, "rgba(255,255,255,0.85)");
      if (on) light(k, x, y, 26 + 10 * kick, c, 0.3 + 0.2 * kick);
    });
    // the slingshots and the flippers
    for (const sd of [-1, 1]) {
      const x = cx + sd * w * 0.17;
      k.g.fillStyle = "rgba(240,240,250,1)";
      k.g.beginPath();
      k.g.moveTo(x, h * 0.66);
      k.g.lineTo(x + sd * 14, h * 0.86);
      k.g.lineTo(x, h * 0.86);
      k.g.fill();
      k.g.fillStyle = k.since < 0.25 ? "rgba(255,90,90,1)" : "rgba(200,40,60,1)";
      k.g.beginPath();
      k.g.moveTo(x + sd * 2, h * 0.7);
      k.g.lineTo(x + sd * 11, h * 0.84);
      k.g.lineTo(x + sd * 2, h * 0.84);
      k.g.fill();
    }
    const balls = 1 + Math.min(2, Math.max(0, k.sounding.length - 1));
    const pos = (i: number) => {
      const t = k.t * 0.8 + i * 2.1;
      return [cx + Math.sin(t) * w * 0.2 + Math.sin(t * 2.3) * w * 0.05, h * (0.52 + 0.36 * Math.sin(t * 1.3 + 1))] as const;
    };
    const flip = k.since < 0.15 || [0, 1, 2].slice(0, balls).some((i) => pos(i)[1] > h * 0.84);
    for (const sd of [-1, 1]) {
      const px = cx + sd * 26;
      const a = flip ? -0.35 : 0.45;
      k.g.save();
      k.g.translate(px, h * 0.93);
      k.g.rotate(sd < 0 ? a : Math.PI - a);
      k.g.fillStyle = "rgba(240,240,250,1)";
      k.g.fillRect(0, -3, 22, 6);
      k.g.fillStyle = "rgba(220,40,60,1)";
      k.g.fillRect(2, -2, 18, 4);
      k.g.restore();
    }
    for (let i = 0; i < balls; i++) {
      const [x, y] = pos(i);
      k.disc(x + 2, y + 3, 4, "rgba(0,0,0,0.45)");
      const gr = k.g.createRadialGradient(x - 1.5, y - 1.5, 0.5, x, y, 4.5);
      gr.addColorStop(0, "#ffffff");
      gr.addColorStop(0.5, "#b8c0cc");
      gr.addColorStop(1, "#4a5060");
      k.g.fillStyle = gr;
      k.g.beginPath();
      k.g.arc(x, y, 4.5, 0, Math.PI * 2);
      k.g.fill();
    }
    // the display at the head: the points climb per entry; JACKPOT at the climax
    {
      const text = jack > 0.5 ? "JACKPOT" : (k.passed * 125000).toLocaleString("en-US");
      const tw = text.length * 8;
      k.R(cx - 56, 1, 112, 14, "rgba(8,4,4,1)");
      k.R(cx - 56, 15, 112, 1, "rgba(255,140,40,0.5)");
      dots(k, cx - tw / 2, 3, text, 2, "rgba(255,160,50,0.95)", "rgba(70,30,10,0.55)");
      if (jack > 0.5) light(k, cx, 8, 60, [255, 160, 60], 0.35 * jack);
    }
    if (jack > 0.01) light(k, cx, cy, w * 0.5, [255, 210, 140], 0.22 * jack);
    // the glass: reflections drifting with the camera; the chrome rails at the sides
    for (const [x0, ww, a] of [[0.62, 36, 0.05], [0.72, 10, 0.07]] as const) {
      const x = w * x0 + cam * 3;
      k.g.fillStyle = `rgba(255,255,255,${a})`;
      k.g.beginPath();
      k.g.moveTo(x, 0);
      k.g.lineTo(x + ww, 0);
      k.g.lineTo(x + ww - 70, h);
      k.g.lineTo(x - 70, h);
      k.g.fill();
    }
    k.vgrad(0, h, [[0, "#c0c8d8"], [0.5, "#5a6070"], [1, "#a0a8b8"]], 0, 5);
    k.vgrad(0, h, [[0, "#c0c8d8"], [0.5, "#5a6070"], [1, "#a0a8b8"]], w - 5, 5);
  },
  // D662 (design studio, the art upgrade, the new art; the owner on the old one: "It barely resembled a chessboard"):
  // The Knight. A real board of 8 by 8 in true perspective on a club table, under a hanging lamp, in a panelled room at
  // night; the pieces drawn as pieces (pawn, rook, knight, bishop, queen, king), lit from the lamp; the chess clock
  // ticking at the board's side. The drama: each entry the white knight makes its L move and captures a black piece,
  // which joins the line of captured pieces on the table; the board empties. At the climax checkmate: the black king
  // topples and the board is lit white.
  wtc1f16: (k) => {
    const { w, h } = k;
    const cam = sway(k, 41);
    const cl = k.climax;
    // the room: panelled wall, a window, the lamp hung over the board
    k.vgrad(0, h, [[0, "#1a1a16"], [1, "#24221c"]]);
    fillTex(k, texture(k, "panels", 24, panels), 0, 0, w, h * 0.5, cam * 0.3);
    k.R(w * 0.06 + cam * 0.3, h * 0.08, 34, 44, "#3a2a1a");
    k.vgrad(h * 0.08 + 2, 40, [[0, "#141a34"], [1, "#2a2a4a"]], w * 0.06 + cam * 0.3 + 2, 30);
    k.R(w * 0.06 + cam * 0.3 + 16, h * 0.08, 2, 44, "#3a2a1a");
    const sw2 = k.still ? 0 : Math.sin(k.sec * 0.5) * 2;
    k.line(w * 0.5, 0, w * 0.5 + sw2, h * 0.12, "#0a0a08", 1);
    k.tri(w * 0.5 + sw2, h * 0.2, 30, 10, "#2a4a2a");
    k.R(w * 0.5 + sw2 - 15, h * 0.2 - 1, 30, 2, "#4a6a3a");
    light(k, w * 0.5 + sw2, h * 0.22, 14, [255, 240, 200], 0.6);
    // the table
    k.R(0, h * 0.42, w, h * 0.58, "#3a2414");
    fillTex(k, texture(k, "panels", 24, panels), 0, h * 0.42, w, h * 0.58, cam);
    k.R(0, h * 0.42, w, 1, "rgba(255,220,170,0.2)");
    // the board in perspective: (c, r) its corner, r = 0 the near rank
    const cx = w * 0.5 + cam;
    const vy = -h * 0.071;
    const D = h * 1.041;
    const S = w * 0.07;
    const z = (r: number) => 1 + r * 0.12;
    const P = (c: number, r: number) => [cx + ((c - 4) * S) / z(r), vy + D / z(r)] as const;
    const quad = (c0: number, r0: number, c1: number, r1: number, col: string) => {
      const a = P(c0, r0), b = P(c1, r0), c = P(c1, r1), d = P(c0, r1);
      k.g.fillStyle = col;
      k.g.beginPath();
      k.g.moveTo(a[0], a[1]);
      k.g.lineTo(b[0], b[1]);
      k.g.lineTo(c[0], c[1]);
      k.g.lineTo(d[0], d[1]);
      k.g.closePath();
      k.g.fill();
    };
    quad(-0.35, -0.3, 8.35, 8.35, "#4a2a14");
    quad(-0.25, -0.2, 8.25, 8.25, "#6a3e1e");
    k.R(P(-0.35, -0.3)[0], P(0, -0.3)[1], P(8.35, -0.3)[0] - P(-0.35, -0.3)[0], 3, "#2a160a");
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) quad(c, r, c + 1, r + 1, (c + r) % 2 ? "#ecdcb4" : "#7a4e2c");
    // the lamp's pool on the board, the board lit white at the climax
    light(k, cx, P(4, 3.5)[1], w * 0.24, [255, 236, 190], 0.18);
    if (cl > 0.01) light(k, cx, P(4, 4)[1], w * 0.3, [255, 255, 245], 0.35 * cl);
    // the pieces: the knight's captures from KNIGHT_PATH, one per entry
    const steps = Math.min(KNIGHT_PATH.length - 1, k.passed);
    const kinds = "pppbpnprpqppbpprp";
    const pieces: { c: number; r: number; kind: string; white: boolean; topple?: boolean }[] = [
      { c: 4, r: 0, kind: "k", white: true }, { c: 0, r: 0, kind: "r", white: true }, { c: 7, r: 0, kind: "r", white: true },
      { c: 5, r: 1, kind: "p", white: true }, { c: 6, r: 1, kind: "p", white: true }, { c: 7, r: 1, kind: "p", white: true }, { c: 2, r: 1, kind: "p", white: true },
      { c: 4, r: 7, kind: "k", white: false, topple: cl > 0.5 },
    ];
    for (let i = steps + 1; i < KNIGHT_PATH.length; i++) pieces.push({ c: KNIGHT_PATH[i][0], r: KNIGHT_PATH[i][1], kind: kinds[i % kinds.length], white: false });
    // the knight, leaping its L over the bar its entry begins
    const [tc, tr] = KNIGHT_PATH[steps];
    const [fc, fr] = KNIGHT_PATH[Math.max(0, steps - 1)];
    const u = steps > 0 && k.since < 0.6 ? k.since / 0.6 : 1;
    const along = (x: number) => Math.min(1, x * 1.5);
    const kc = u < 1 ? fc + (tc - fc) * along(u) : tc;
    const kr = u < 1 ? fr + (tr - fr) * Math.max(0, u * 1.5 - 0.5) : tr;
    const drawPiece = (c: number, r: number, kind: string, white: boolean, lift = 0, topple = false) => {
      const [x, y] = P(c + 0.5, r + 0.5);
      const sc = z(r) < 1.45 ? 2 : 1;
      const rows = CHESS[kind];
      const pal = white ? { x: "#f6eedc", d: "#b8ac94" } : { x: "#3a3034", d: "#1a1416" };
      k.g.fillStyle = "rgba(0,0,0,0.3)";
      k.g.beginPath();
      k.g.ellipse(x + 1, y + 1, 4 * sc, 1.5 * sc, 0, 0, Math.PI * 2);
      k.g.fill();
      if (topple) {
        k.g.save();
        k.g.translate(x, y);
        k.g.rotate(Math.PI / 2 * Math.min(1, (cl - 0.5) * 4));
        sprite(k, 0, 0, rows, pal, sc);
        k.g.restore();
        return;
      }
      lit(k, x, y - lift, rows, pal, sc, kind === "n" && !white, white ? "rgba(255,240,200,0.9)" : "rgba(255,226,180,0.95)", white ? 0 : 1, -1);
    };
    const all = [...pieces.map((p) => ({ ...p, knight: false })), { c: kc, r: kr, kind: "n", white: true, knight: true, topple: false }];
    all.sort((a, b) => b.r - a.r);
    {
      const [nx, ny] = P(kc + 0.5, kr + 0.5);
      light(k, nx, ny - 6, 18, [255, 230, 160], 0.35);
    }
    for (const p of all) drawPiece(p.c, p.r, p.kind, p.white, p.knight && u < 1 ? Math.sin(u * Math.PI) * 10 : 0, !!p.topple);
    // the captured pieces, lined up on the table by the board
    for (let i = 1; i <= steps; i++) {
      const x = P(8.6, 0)[0] + 8 + ((i - 1) % 4) * 9;
      const y = h * (0.97 - Math.floor((i - 1) / 4) * 0.08);
      sprite(k, x, y, CHESS[kinds[i % kinds.length]], { x: "#2e2628", d: "#141012" }, 1);
    }
    // the chess clock, its hands turning
    const CX = P(-0.6, 3)[0] - 26, CY = P(0, 3)[1];
    k.R(CX - 14, CY - 12, 28, 12, "#6a2a1a");
    k.R(CX - 14, CY - 12, 28, 1, "rgba(255,200,150,0.5)");
    for (const sd of [-1, 1]) {
      k.disc(CX + sd * 7, CY - 6, 4, "#f0ead8");
      const a = (k.still ? 0 : k.sec * (sd < 0 ? 1 : 0.1)) * Math.PI / 30 * 6;
      k.line(CX + sd * 7, CY - 6, CX + sd * 7 + Math.sin(a) * 3, CY - 6 - Math.cos(a) * 3, "#1a1010", 1);
    }
  },
  // D659: The Diary. A girl's room on a summer afternoon in three depths: the window with the garden's leaves (more
  // with the summer) and the sky beyond, the papered wall and its shelf, the desk near with the diary and the inkpot;
  // the diarist at her desk, writing. The drama: each entry a page turns and a line of writing appears; at the climax
  // the sunset through the window lights the whole page gold.
  wtc1f17: (k) => {
    const { w, h } = k;
    const cam = sway(k, 29);
    const cl = k.climax;
    k.vgrad(0, h * 0.8, [[0, "#4a3a3a"], [1, "#5a4440"]]);
    fillTex(k, texture(k, "paper", 24, wallpaper), 0, 0, w, h * 0.8, cam * 0.4);
    // the window and the garden beyond
    const WX = w * 0.52 + cam * 0.4, WY = h * 0.1, WW = w * 0.24, WH = h * 0.46;
    k.R(WX - 3, WY - 3, WW + 6, WH + 6, "#e8dccc");
    k.vgrad(WY, WH, [[0, rgba(mix([130, 180, 230], [240, 150, 90], Math.max(k.p * 0.6, cl)))], [1, rgba(mix([200, 220, 220], [255, 200, 120], Math.max(k.p * 0.6, cl)))]], WX, WW);
    const leaves = 10 + Math.min(30, k.passed * 2);
    for (let i = 0; i < leaves; i++) {
      const lx = WX + WW * hash(i * 11) + (k.still ? 0 : Math.sin(k.sec * 0.8 + i) * 1.5);
      const ly = WY + WH * (0.2 + 0.8 * hash(i * 13));
      k.disc(lx, ly, 3 + hash(i) * 2, i % 3 ? "#3a7a3a" : "#5a9a44");
    }
    k.R(WX + WW / 2 - 1, WY, 2, WH, "#e8dccc");
    k.R(WX, WY + WH / 2 - 1, WW, 2, "#e8dccc");
    light(k, WX + WW / 2, WY + WH / 2, WW, cl > 0.1 ? [255, 180, 110] : [255, 240, 210], 0.18 + 0.3 * cl);
    // the shaft of light onto the desk
    k.g.fillStyle = `rgba(255,${Math.round(230 - 60 * cl)},${Math.round(180 - 80 * cl)},${0.08 + 0.12 * cl})`;
    k.g.beginPath();
    k.g.moveTo(WX, WY + WH);
    k.g.lineTo(WX + WW, WY + WH);
    k.g.lineTo(w * 0.5, h * 0.74);
    k.g.lineTo(w * 0.24, h * 0.74);
    k.g.fill();
    for (let d = 0; d < 6; d++) {
      const u = wrap(k.t * 0.04 + hash(d), 1);
      k.R(WX + (w * 0.3 - WX) * u + WW * hash(d + 3), WY + WH + (h * 0.74 - WY - WH) * u, 1, 1, "rgba(255,240,210,0.5)");
    }
    // the shelf
    k.R(w * 0.24 + cam * 0.6, h * 0.24, w * 0.18, 3, "#5a3a24");
    for (let i = 0; i < 9; i++) k.R(w * 0.25 + cam * 0.6 + i * 6, h * 0.24 - 10 - hash(i) * 4, 4, 10 + hash(i) * 4, ["#8a3a3a", "#3a5a8a", "#8a7a3a", "#4a7a4a"][i % 4]);
    // the desk, the diary, the diarist
    const DY = h * 0.74;
    k.R(0, DY, w, h - DY, "#6a4a30");
    k.R(0, DY, w, 2, "#8a6a48");
    k.vgrad(DY + 2, h - DY, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.4)"]]);
    const bx = w * 0.36 + cam * 1.2;
    k.R(bx - 18, DY - 3, 36, 4, "#f4ecd8");
    k.R(bx - 1, DY - 3, 2, 4, "#c0b090");
    for (let i = 0; i < Math.min(8, k.passed); i++) k.R(bx - 16 + (i >= 4 ? 18 : 0), DY - 2 + 0 * i, 6 + ((i * 5) % 9), 1, "rgba(60,40,60,0.7)");
    if (k.since < 0.4) {
      const u = k.since / 0.4;
      k.R(bx + 16 - 32 * u, DY - 3 - Math.sin(u * Math.PI) * 6, 16 * (1 - Math.abs(0.5 - u)), 2, "#fffaf0");
    }
    if (cl > 0.01) light(k, bx, DY - 2, 30, [255, 200, 110], 0.5 * cl);
    k.R(bx + 26, DY - 6, 5, 6, "#1a1a2a");
    k.line(bx + 28, DY - 6, bx + 34, DY - 16, "#f0f0f0", 1);
    const write = !k.still && Math.floor(k.sec * 2) % 2 === 0;
    lit(k, bx - 30, DY + 1 - (write ? 1 : 0), DIARIST, { h: "#6a3a1a", s: "#f4cca8", k: "#201010", c: "#b04a6a" }, 2, false, rgba(cl > 0.1 ? [255, 190, 110] : [255, 240, 210], 0.85), 1);
  },
  // D659: The Sleepwalker. The roofs by night in three depths: the far city under the moon, the mid roofs with their
  // chimneys and a few lit windows, the near ridge the walker follows; the moon's rim on the tiles. The walker in a
  // nightgown, arms out, wandering on their own clock (D464). The drama: each entry a window lights in the roofs as the
  // walker goes on; at the climax dawn on the roofs, the walker safe at the end, a cat beside them.
  wtc1f18: (k) => {
    const { w, h } = k;
    const cam = sway(k, 35);
    const cl = k.climax;
    k.sky([16, 20, 44], [40, 40, 80], [80, 70, 120], [240, 170, 150]);
    k.stars(50 * (1 - cl), 0);
    if (cl > 0.01) k.vgrad(h * 0.3, h * 0.5, [[0, "rgba(255,180,160,0)"], [1, `rgba(255,180,160,${0.45 * cl})`]]);
    k.orb(0.8, 0.12, 0.2, 7, [240, 236, 210], 0.25 * (1 - cl), true);
    skyline(k, 0.58, 0.02, "rgba(30,30,56,1)", 0.4);
    k.g.save();
    k.g.translate(cam * 0.6, 0);
    k.along(42, 0.08, (x, i) => {
      const hh = 22 + hash(i) * 14;
      k.R(x, h * 0.8 - hh, 36, hh + 20, "#2a2a44");
      k.tri(x + 18, h * 0.8 - hh, 44, 14, "#1e1e34");
      fillTex(k, texture(k, "tiles", 24, tiles), x - 4, h * 0.8 - hh - 14, 44, 14);
      k.R(x - 4, h * 0.8 - hh, 44, 1, `rgba(200,210,255,${0.35 + 0.3 * cl})`);
      k.R(x + 26, h * 0.8 - hh - 20, 5, 12, "#24243c");
      const on = hash(i * 3) < Math.min(1, 0.15 + k.passed * 0.06);
      k.R(x + 8, h * 0.8 - hh + 8, 5, 6, on ? "#ffd890" : "#141428");
      if (on) light(k, x + 10, h * 0.8 - hh + 11, 8, [255, 200, 120], 0.3);
    });
    k.g.restore();
    // the near ridge
    const ry = h * 0.82;
    k.R(0, ry, w, h - ry, "#24203a");
    fillTex(k, texture(k, "tiles", 24, tiles), 0, ry, w, h - ry, cam * 1.2);
    k.R(0, ry - 2, w, 3, "#1a1828");
    k.R(0, ry - 2, w, 1, `rgba(220,220,255,${0.5 + 0.3 * cl})`);
    const sw = k.wander(40, 0.1);
    const x = cl > 0.5 ? w * 0.7 : sw.x;
    lit(k, x + cam * 1.2, ry - 2, SLEEPER, { s: "#e8c8b0", h: "#5a3a2a", k: "#201010", w: "#e8e4f0" }, 2, (cl > 0.5 ? 1 : sw.dir) < 0, rgba(mix([200, 210, 255], [255, 190, 160], cl), 0.9), 1);
    if (cl > 0.01) {
      lit(k, x + 18 + cam * 1.2, ry - 2, CAT_SIT, { k: `rgba(30,24,30,${cl})`, y: `rgba(240,220,90,${cl})` }, 2, true, `rgba(255,190,160,${0.8 * cl})`, -1);
      light(k, w * 0.2, h * 0.6, w * 0.5, [255, 190, 160], 0.2 * cl);
    }
  },
  // The Three Stooges: a silent film in sepia: a brick wall, grain and scratches.
  wtc1f19: (k) => {
    k.vgrad(0, k.h, [[0, "#5a4a36"], [1, "#3a2e22"]]);
    for (let y = 0; y < k.h * 0.8; y += 8) for (let x = (y / 8) % 2 ? 0 : -10; x < k.w; x += 20) k.R(x + 1 - wrap(k.bar * k.pxBar * 0.2, 20), y + 1, 18, 6, "rgba(110,86,60,0.6)");
    k.R(0, k.h * 0.8, k.w, k.h * 0.2, "rgba(60,48,34,1)");
    for (let i = 0; i < 3; i++) k.figure(k.w * (0.35 + i * 0.12), k.h * 0.8, "rgba(30,24,18,0.9)", Math.floor(k.bar * 2 + i) % 2, 3);
    if (!k.still) {
      for (let i = 0; i < 60; i++) k.R(hash(i + Math.floor(k.sec * 12)) * k.w, hash(i * 7 + Math.floor(k.sec * 12)) * k.h, 1, 1, "rgba(240,220,180,0.25)");
      k.R(hash(Math.floor(k.sec * 3)) * k.w, 0, 1, k.h, "rgba(240,220,180,0.25)");
    }
    k.vgrad(0, k.h, [[0, "rgba(0,0,0,0.3)"], [0.5, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.3)"]]);
  },
  // D659: The Locomotive. A night line across hills toward dawn in three depths: the far hills under the stars (the
  // dawn coming at the climax), the telegraph poles passing on the bar lines, the embankment near with its sleepers;
  // the train in silhouette, its windows lit, its steam lit from the firebox. The drama: each entry another carriage
  // is coupled, steam puffing; at the climax the train crests the hill at dawn, the long train against the sun.
  wtc1f20: (k) => {
    const { w, h } = k;
    const cam = sway(k, 31);
    const cl = k.climax;
    k.sky([20, 16, 40], [80, 40, 60], [60, 40, 80], [255, 170, 110]);
    k.stars(50 * (1 - cl), 0);
    if (cl > 0.01) {
      light(k, w * 0.62, h * 0.62, w * 0.5, [255, 180, 110], 0.45 * cl);
      k.disc(w * 0.62, h * 0.6, 16 * cl, `rgba(255,220,160,${cl})`);
    }
    k.hills(0.66, 16, 0.03, 3, "rgba(40,24,40,1)");
    // the line: the train on the crest, carriages per entry
    const cars = Math.min(14, k.passed);
    const ty = h * 0.66 - 6 * cl + Math.sin(k.t * 0.3) * 1;
    const tx = w * 0.26 + (k.still ? 0 : wrap(k.t * 4, w * 0.12)) * (1 - cl) + cam * 0.5;
    const ink = "#120a10";
    for (let i = 0; i < cars; i++) {
      const born = i === 0 && k.since < 0.5 ? k.since * 2 : 1;
      const cx = tx + (cars - 1 - i) * 13;
      k.R(cx, ty - 9, 12 * born, 8, ink);
      k.R(cx, ty - 10, 12 * born, 1, `rgba(255,200,140,${0.3 + 0.5 * cl})`);
      for (let j = 0; j < 3; j++) k.R(cx + 2 + j * 3, ty - 7, 2, 2, "rgba(255,210,120,0.85)");
      k.disc(cx + 3, ty, 2, ink);
      k.disc(cx + 9, ty, 2, ink);
    }
    const lx = tx + cars * 13;
    k.R(lx, ty - 11, 20, 10, ink);
    k.R(lx + 14, ty - 16, 4, 6, ink);
    k.R(lx + 2, ty - 15, 7, 4, ink);
    k.R(lx, ty - 12, 20, 1, `rgba(255,200,140,${0.3 + 0.5 * cl})`);
    light(k, lx + 10, ty - 4, 8, [255, 140, 60], 0.5);
    k.disc(lx + 4, ty, 3, ink);
    k.disc(lx + 12, ty, 3, ink);
    for (let s2 = 0; s2 < 7; s2++) {
      const u = wrap(k.t * 0.5 + s2 / 7, 1);
      const puff = k.since < 0.3 && s2 === 0 ? 1.6 : 1;
      k.glow(lx + 16 - u * 60, ty - 18 - u * 22, (4 + u * 10) * puff, mix([255, 180, 120], [200, 200, 210], u), 0.35 * (1 - u));
    }
    // the poles on the bar lines, and the near embankment
    for (let b = Math.floor(k.bar) - 2; b < k.bar + 6; b++) {
      const x = k.xOf(k.barTick(b)) + cam * 1.4;
      if (x < -10 || x > w + 10) continue;
      k.R(x, h * 0.42, 2, h * 0.5, "#0e080c");
      k.R(x - 5, h * 0.44, 12, 2, "#0e080c");
    }
    k.line(0, h * 0.46, w, h * 0.47, "rgba(20,14,20,0.8)", 1);
    k.R(0, h * 0.9, w, h * 0.1, "#1a1018");
    for (let x = -wrap(k.bar * k.pxBar * 1.2, 10); x < w; x += 10) k.R(x + cam * 1.4, h * 0.92, 6, 2, "#2e2024");
  },
  // D659: The Marionettes. A puppet theatre in three depths: the painted backdrop (a village), the little stage and
  // its gilt frame, the strings running up into the dark; the puppets as jointed sprites dancing on the beat. The
  // drama: each entry a puppet joins the dance, its strings lit; at the climax all the puppets in a line, bowing, the
  // spotlight full.
  wtc1f21: (k) => {
    const { w, h } = k;
    const cam = sway(k, 33);
    const cl = k.climax;
    k.vgrad(0, h, [[0, "#20101a"], [1, "#100810"]]);
    // the backdrop: a painted village
    const BX = w * 0.24 + cam * 0.4, BY = h * 0.2, BW = w * 0.52, BH = h * 0.6;
    k.vgrad(BY, BH, [[0, "#6a8ac0"], [1, "#c0d0a0"]], BX, BW);
    for (let i = 0; i < 6; i++) {
      const hx = BX + 8 + i * (BW / 6);
      k.R(hx, BY + BH * 0.55, 18, BH * 0.3, ["#d0a080", "#e0c090", "#c08070"][i % 3]);
      k.tri(hx + 9, BY + BH * 0.55, 22, 10, "#8a3a30");
    }
    k.R(BX, BY + BH * 0.85, BW, BH * 0.15, "#7a9a5a");
    // the stage floor and the spotlight
    k.R(BX - 10, h * 0.8, BW + 20, h * 0.06, "#5a3a24");
    light(k, w * 0.5, h * 0.7, w * (0.2 + 0.2 * cl), [255, 230, 180], 0.2 + 0.25 * cl);
    // the puppets, one per entry, dancing on the beat; bowing in a line at the climax
    const n = Math.min(6, Math.max(1, k.passed));
    const beat = k.still ? 0 : Math.floor(k.bar * 2) % 2;
    const robes = ["#c03a3a", "#3a5ac0", "#c0a03a", "#3a9a5a", "#9a3ac0", "#e07030"];
    for (let i = 0; i < n; i++) {
      const born = i === k.passed - 1 ? Math.min(1, k.since * 2) : 1;
      const x = cl > 0.5 ? w * (0.3 + i * 0.08) : w * (0.32 + (i % 3) * 0.16 + (i >= 3 ? 0.08 : 0)) + Math.sin(k.bar * Math.PI + i) * 4;
      const lift = cl > 0.5 ? 0 : Math.abs(Math.sin(k.bar * Math.PI + i)) * 6;
      const y = h * 0.82 - lift - (1 - born) * 30;
      const strings = `rgba(240,240,220,${0.25 + 0.35 * born})`;
      k.line(x + cam * 0.8, 0, x + cam * 0.8, y - 22, strings);
      k.line(x - 8 + cam * 0.8, 0, x - 8 + cam * 0.8, y - 16, strings);
      k.line(x + 8 + cam * 0.8, 0, x + 8 + cam * 0.8, y - 16, strings);
      k.R(x - 10 + cam * 0.8, h * 0.04, 20, 2, "#6a4a2a");
      const bow = cl > 0.5 && !k.still && Math.sin(k.sec * 1.2) > 0;
      lit(k, x + cam * 0.8, y + (bow ? 3 : 0), (beat + i) % 2 && !cl ? PUPPET_B : PUPPET_A, { h: ["#3a2a1a", "#d8b060", "#1a1010"][i % 3], s: "#f0d0b0", k: "#201010", c: robes[i], d: "#2a1a10", b: "#1a1010" }, 2, i % 2 === 1, "rgba(255,240,200,0.9)", 0, -1);
    }
    // the gilt frame and the dark around it
    k.g.strokeStyle = "#c09040";
    k.g.lineWidth = 4;
    k.g.strokeRect(BX - 12, BY - 12, BW + 24, h * 0.86 - BY + 12);
    k.g.strokeStyle = "rgba(255,230,160,0.5)";
    k.g.lineWidth = 1;
    k.g.strokeRect(BX - 14, BY - 14, BW + 28, h * 0.86 - BY + 16);
    k.vgrad(h * 0.86, h * 0.14, [[0, "#3a1a10"], [1, "#1a0a08"]]);
  },
  // D659: The Procession. A night street climbing to a square in three depths: the far church against the stars, the
  // houses with their lit windows, the cobbles near; the bearers hooded, each lantern lighting its own bit of wall. The
  // drama: each entry another lantern bearer joins the procession and the line lengthens up the street; at the climax
  // the procession reaches the square and every lantern is raised.
  wtc1f22: (k) => {
    const { w, h } = k;
    const cam = sway(k, 31);
    const cl = k.climax;
    k.sky([16, 14, 34], [40, 30, 60], [10, 10, 26], [30, 24, 50]);
    k.stars(50);
    // the church on the hill
    const cx = w * 0.62 + cam * 0.3;
    k.R(cx - 14, h * 0.3, 28, h * 0.3, "#1a1626");
    k.tri(cx, h * 0.3, 32, 16, "#1a1626");
    k.R(cx - 3, h * 0.12, 6, h * 0.2, "#1a1626");
    k.tri(cx, h * 0.12, 10, 14, "#1a1626");
    k.R(cx - 2, h * 0.4, 4, 6, `rgba(255,210,130,${0.5 + 0.5 * cl})`);
    if (cl > 0.01) light(k, cx, h * 0.45, 60, [255, 200, 120], 0.3 * cl);
    // the street climbing: houses either side
    k.g.save();
    k.g.translate(cam * 0.7, 0);
    for (let i = 0; i < 8; i++) {
      const x = w * (0.02 + i * 0.13);
      const hh = h * (0.3 + 0.12 * hash(i));
      const base = h * (0.86 - i * 0.02);
      k.R(x, base - hh, w * 0.11, hh, i % 2 ? "#2a2234" : "#241e30");
      fillTex(k, texture(k, "stone", 40, stone), x, base - hh, w * 0.11, hh);
      k.tri(x + w * 0.055, base - hh, w * 0.12, 10, "#1a1424");
      for (let j = 0; j < 2; j++) {
        const on = hash(i * 7 + j) > 0.4;
        k.R(x + 6 + j * 16, base - hh + 10, 5, 7, on ? "#ffd890" : "#141020");
        if (on) light(k, x + 8 + j * 16, base - hh + 13, 8, [255, 200, 120], 0.25);
      }
    }
    k.g.restore();
    k.R(0, h * 0.86, w, h * 0.14, "#2a2428");
    fillTex(k, texture(k, "cobbles", 24, cobbles), 0, h * 0.87, w, h * 0.13, cam);
    // the bearers: one per entry, the line lengthening up the street; lanterns raised at the climax
    const n = Math.min(14, k.passed);
    for (let i = 0; i < n; i++) {
      const born = i === n - 1 ? Math.min(1, k.since * 2) : 1;
      const u = cl > 0.5 ? i / Math.max(1, n - 1) : (i + (k.still ? 0 : wrap(k.t * 0.03, 1))) / 14;
      const x = w * (0.26 + 0.5 * u) + cam * (1.2 - u * 0.6);
      const y = h * (0.92 - 0.12 * u);
      const sc = u < 0.5 ? 2 : 1;
      const step = !k.still && Math.floor(k.sec * 2 + i) % 2 === 0 ? 1 : 0;
      const raise = cl > 0.5 ? 10 * sc : 0;
      light(k, x + 5 * sc, y - 12 * sc - raise, 14 * sc, [255, 190, 100], 0.35 * born);
      sprite(k, x, y - step, BEARER, { d: `rgba(22,18,28,${born})`, s: `rgba(220,180,140,${born})` }, sc);
      k.R(x + 4 * sc, y - 14 * sc - raise, 1, 6 * sc, `rgba(80,60,40,${born})`);
      k.R(x + 3 * sc, y - 16 * sc - raise, 3 * sc, 3 * sc, `rgba(255,214,130,${born})`);
    }
  },
  // D659: The Gramophone. A quiet room at night in three depths: the window with the city's lights, the papered wall
  // and the standard lamp, the gramophone near with its brass horn and the record turning, the cat asleep on the rug.
  // The drama: each entry a record turns and the lamp brightens; the cat stirs; at the climax the cat wakes and
  // stretches as the lamp blooms and the record spins on.
  wtc1f23: (k) => {
    const { w, h } = k;
    const cam = sway(k, 37);
    const cl = k.climax;
    const lamp = Math.min(1, 0.2 + k.passed * 0.06) + 0.4 * cl;
    k.vgrad(0, h * 0.82, [[0, "#3a2a34"], [1, "#4a3640"]]);
    fillTex(k, texture(k, "paper", 24, wallpaper), 0, 0, w, h * 0.82, cam * 0.4);
    // the window and the city
    const WX = w * 0.26 + cam * 0.4, WY = h * 0.12, WW = w * 0.18, WH = h * 0.42;
    k.R(WX - 3, WY - 3, WW + 6, WH + 6, "#2a1a14");
    k.vgrad(WY, WH, [[0, "#14143a"], [1, "#3a2a50"]], WX, WW);
    for (let i = 0; i < 14; i++) k.R(WX + WW * hash(i * 3), WY + WH * (0.5 + 0.5 * hash(i * 5)), 2, 2, hash(i) > 0.4 ? "#ffd890" : "#8a8ac0");
    k.R(WX + WW / 2 - 1, WY, 2, WH, "#2a1a14");
    // the lamp
    const LX = w * 0.72 + cam * 0.6;
    k.R(LX, h * 0.38, 3, h * 0.44, "#2a1a14");
    k.tri(LX + 1, h * 0.38, 22, 12, "#c09060");
    light(k, LX + 1, h * 0.34, 40 + 40 * lamp, [255, 200, 130], 0.2 + 0.3 * lamp);
    // the floor and the rug
    k.R(0, h * 0.82, w, h * 0.18, "#4a3024");
    k.g.fillStyle = "#7a2a2a";
    k.g.beginPath();
    k.g.ellipse(w * 0.42 + cam * 1.2, h * 0.9, w * 0.18, h * 0.05, 0, 0, Math.PI * 2);
    k.g.fill();
    // the gramophone: cabinet, turntable, record, brass horn
    const gx = w * 0.56 + cam * 1.2;
    const gy = h * 0.82;
    k.R(gx - 14, gy - 12, 28, 12, "#5a3420");
    k.R(gx - 14, gy - 12, 28, 1, "#8a5a34");
    k.g.fillStyle = "#141010";
    k.g.beginPath();
    k.g.ellipse(gx, gy - 13, 11, 2.5, 0, 0, Math.PI * 2);
    k.g.fill();
    const spin = k.bar * Math.PI;
    k.R(gx + Math.cos(spin) * 9, gy - 13 + Math.sin(spin) * 2, 2, 1, "rgba(220,200,180,0.7)");
    k.disc(gx, gy - 13, 2, "#c03030");
    const horn = k.g.createLinearGradient(gx, gy - 50, gx + 26, gy - 14);
    horn.addColorStop(0, "#f0c870");
    horn.addColorStop(1, "#8a5a20");
    k.g.fillStyle = horn;
    k.g.beginPath();
    k.g.moveTo(gx + 2, gy - 16);
    k.g.lineTo(gx + 26, gy - 50);
    k.g.lineTo(gx + 8, gy - 56);
    k.g.closePath();
    k.g.fill();
    light(k, gx + 18, gy - 48, 16, [255, 210, 140], 0.2 + 0.2 * lamp);
    // the records turned, stacked by the cabinet
    for (let i = 0; i < Math.min(8, k.passed); i++) k.R(gx - 26, gy - 2 - i * 2, 10, 1, i % 2 ? "#141010" : "#2a1a1a");
    // the cat: asleep, stirring with the entries, stretching at the climax
    const cx = w * 0.4 + cam * 1.2;
    const stir = k.since < 0.5 && !k.still ? 1 : 0;
    if (cl > 0.5) lit(k, cx, h * 0.9, CAT_STRETCH, { k: "#2a2028", y: "#f0d050" }, 2, false, "rgba(255,200,140,0.8)", 1);
    else lit(k, cx, h * 0.9 - stir, stir ? CAT_SIT : CAT_SLEEP, { k: "#2a2028", y: "#f0d050" }, 2, false, "rgba(255,200,140,0.7)", 1);
  },
  // D656 (design studio, the art upgrade): Faust. The study at night in three depths: the stone wall with its Gothic
  // window (the moon, the clouds running; the storm on the panes in act II), the bookcase's spines and the stuffed
  // crocodile hung from the vault, the desk near (the open grimoire, the skull, the hourglass running, the alembic
  // bubbling green). Faust himself, robed and bearded, lit from the sign. The drama (D654): each entry a candle lights
  // and a book flies open to circle the sign, which brightens; at the climax the sign blazes, Faust's arms raised before
  // it, and the room's walls fall away to the night sky.
  wtc1f24: (k) => {
    const { w, h } = k;
    const cam = sway(k, 29);
    const away = k.climax;
    const sx = w * 0.6;
    const sy = h * 0.34;
    const storm = k.act(1);
    const red = k.act(2);
    // the night beyond (seen when the walls fall away)
    k.vgrad(0, h, [[0, "#06061a"], [1, "#141038"]]);
    k.stars(70, 0, 1);
    k.g.fillStyle = "rgba(160,140,220,0.06)";
    k.g.beginPath();
    k.g.moveTo(0, h * 0.8);
    k.g.lineTo(w, h * 0.05);
    k.g.lineTo(w, h * 0.3);
    k.g.lineTo(0, h);
    k.g.fill();
    const room = 1 - 0.9 * away;
    k.g.save();
    k.g.globalAlpha = room;
    // the wall
    k.vgrad(0, h * 0.84, [[0, "#1c1622"], [1, "#2a2026"]]);
    fillTex(k, texture(k, "stone", 40, stone), 0, 0, w, h * 0.84, cam * 0.3);
    // the window: moon and running cloud; rain in the storm
    const WX = w * 0.44 + cam * 0.3, WY = h * 0.08, WW = w * 0.15, WH = h * 0.46;
    k.R(WX - 3, WY - 3, WW + 6, WH + 6, "#120e14");
    k.vgrad(WY, WH, [[0, rgba(mix([20, 30, 70], [16, 18, 30], storm))], [1, rgba(mix([48, 48, 80], [26, 28, 40], storm))]], WX, WW);
    k.disc(WX + WW * 0.7, WY + 14, 6, `rgba(235,230,210,${0.9 - 0.6 * storm})`);
    light(k, WX + WW * 0.7, WY + 14, 30, [200, 210, 255], 0.2 * (1 - storm));
    for (let i = 0; i < 3; i++) k.R(WX + wrap(k.t * (4 + 6 * storm) + i * 22, WW + 24) - 24, WY + 8 + i * 12, 24, 5, `rgba(70,70,100,${0.6 + 0.3 * storm})`);
    if (storm > 0.01) for (let i = 0; i < 18; i++) k.R(WX + hash(i) * WW, WY + wrap(k.t * 60 + hash(i + 3) * WH, WH), 1, 4, `rgba(170,190,230,${0.5 * storm})`);
    k.R(WX + WW / 2 - 1, WY, 2, WH, "#120e14");
    k.R(WX, WY + WH * 0.55, WW, 2, "#120e14");
    k.g.strokeStyle = "#120e14";
    k.g.lineWidth = 3;
    k.g.beginPath();
    k.g.moveTo(WX, WY + 10);
    k.g.quadraticCurveTo(WX, WY - 12, WX + WW / 2, WY - 14);
    k.g.quadraticCurveTo(WX + WW, WY - 12, WX + WW, WY + 10);
    k.g.stroke();
    // the bookcase: spines of many colours
    const BX = w * 0.2 + cam * 0.6;
    k.R(BX, h * 0.1, w * 0.18, h * 0.74, "#2a1a12");
    for (let s = 0; s < 4; s++) {
      const y = h * (0.12 + s * 0.18);
      let x = BX + 3;
      for (let b = 0; x < BX + w * 0.18 - 6; b++) {
        const bw = 3 + Math.floor(hash(b * 3 + s) * 3);
        const bh = h * 0.14 - hash(b + s * 11) * 8;
        const c = ["#7a2a2a", "#2a4a7a", "#8a7030", "#3a6a40", "#5a3a6a", "#a07a5a"][Math.floor(hash(b * 5 + s * 7) * 6)];
        k.R(x, y + h * 0.15 - bh, bw, bh, c);
        k.R(x, y + h * 0.15 - bh + 3, bw, 1, "rgba(230,200,120,0.5)");
        x += bw + (hash(b + 2) > 0.85 ? 3 : 0);
      }
      k.R(BX, y + h * 0.15, w * 0.18, 3, "#1a100a");
    }
    // the crocodile hung from the vault, swinging a little
    sprite(k, w * 0.66 + cam * 0.5 + (k.still ? 0 : Math.sin(k.sec * 0.7) * 2), h * 0.1, CROC, { g: "#2a3a26", G: "#4a6a3a", w: "#d8d0b0" }, 2);
    k.line(w * 0.6 + cam * 0.5, 0, w * 0.6 + cam * 0.5, h * 0.06, "rgba(60,50,40,1)");
    k.line(w * 0.72 + cam * 0.5, 0, w * 0.72 + cam * 0.5, h * 0.06, "rgba(60,50,40,1)");
    // the floor
    k.R(0, h * 0.84, w, h * 0.16, "#2a1c16");
    for (let x = -wrap(cam, 18); x < w; x += 18) k.R(x, h * 0.84, 1, h * 0.16, "rgba(0,0,0,0.3)");
    k.g.restore();
    // the sign in the air: brighter over the piece; red in act III; blazing at the climax
    const a = 0.25 + 0.5 * k.p + 0.03 * k.passed + 0.4 * away;
    const sc: C3 = red > 0.5 ? [255, 110, 90] : [190, 230, 255];
    light(k, sx, sy, 40 + 50 * away, sc, Math.min(0.7, a * 0.45));
    if (red > 0.01) light(k, sx, sy, 90, [220, 50, 40], 0.3 * red);
    if (away > 0.01) for (let i = 0; i < 12; i++) {
      const an = (i * Math.PI) / 6 + (k.still ? 0 : k.sec * 0.05);
      k.line(sx, sy, sx + Math.cos(an) * 80 * away, sy + Math.sin(an) * 80 * away, `rgba(255,240,200,${0.18 * away})`, 2);
    }
    k.g.strokeStyle = rgba(sc, Math.min(1, a + 0.2));
    k.g.lineWidth = 1;
    k.g.beginPath();
    k.g.arc(sx, sy, 15, 0, Math.PI * 2);
    k.g.arc(sx, sy, 17, 0, Math.PI * 2);
    for (let i = 0; i < 5; i++) {
      const t0 = (i * 4 * Math.PI) / 5 - Math.PI / 2 + (k.still ? 0 : k.sec * 0.1);
      const t1 = ((i + 1) * 4 * Math.PI) / 5 - Math.PI / 2 + (k.still ? 0 : k.sec * 0.1);
      k.g.moveTo(sx + Math.cos(t0) * 15, sy + Math.sin(t0) * 15);
      k.g.lineTo(sx + Math.cos(t1) * 15, sy + Math.sin(t1) * 15);
    }
    k.g.stroke();
    // the books flown open, circling the sign
    const nb = Math.min(8, k.passed);
    for (let i = 0; i < nb; i++) {
      const an = k.t * 0.35 + (i * Math.PI * 2) / Math.max(1, nb);
      const bx = sx + Math.cos(an) * (34 + 6 * away);
      const by = sy + Math.sin(an) * (16 + 4 * away);
      const flap = !k.still && Math.floor(k.sec * 3 + i) % 2 === 0;
      sprite(k, bx, by, flap ? BOOK_A : BOOK_B, { p: "#ece4cc", c: ["#7a2a2a", "#2a4a7a", "#8a7030"][i % 3] }, 2);
    }
    k.g.save();
    k.g.globalAlpha = room;
    // the desk and its things
    const DY = h * 0.72;
    k.R(w * 0.46, DY, w * 0.32, 4, "#4a3020");
    k.R(w * 0.46, DY + 4, w * 0.32, 2, "#2a1a10");
    k.R(w * 0.48, DY + 6, 3, h * 0.84 - DY - 6, "#2a1a10");
    k.R(w * 0.75, DY + 6, 3, h * 0.84 - DY - 6, "#2a1a10");
    k.R(w * 0.54, DY - 3, 22, 3, "#ece4cc");
    k.R(w * 0.54 + 10, DY - 4, 2, 4, "#8a7a60");
    for (let i = 0; i < 4; i++) k.R(w * 0.54 + 2 + (i % 2) * 12, DY - 2 + 0, 6, 1, "rgba(60,40,40,0.6)");
    sprite(k, w * 0.68, DY, ["..ww..", ".wwww.", "wkwwkw", ".wwww.", "..ww.."], { w: "#e0d8c0", k: "#201814" }, 1);
    const sand = k.still ? 0.5 : wrap(k.sec / 60, 1);
    k.R(w * 0.735, DY - 12, 7, 1, "#8a6a3a");
    k.R(w * 0.735, DY - 1, 7, 1, "#8a6a3a");
    k.R(w * 0.735 + 1, DY - 11 + 5 * sand, 5, 5 - 5 * sand, "#e0c070");
    k.R(w * 0.735 + 1, DY - 1 - 5 * sand, 5, 5 * sand, "#e0c070");
    if (!k.still) k.R(w * 0.735 + 3, DY - 6, 1, 5, "#e0c070");
    // the alembic, bubbling green
    const AX = w * 0.3, AY = h * 0.84;
    k.R(AX - 12, AY - 18, 24, 18, "#3a2618");
    k.disc(AX, AY - 26, 7, "rgba(80,220,140,0.75)");
    k.R(AX - 1, AY - 40, 3, 10, "rgba(160,200,180,0.6)");
    k.line(AX + 1, AY - 40, AX + 16, AY - 34, "rgba(160,200,180,0.6)", 1);
    light(k, AX, AY - 26, 22, [80, 255, 150], 0.3);
    for (let i = 0; i < 4; i++) {
      const u = wrap(k.t * 0.5 + hash(i), 1);
      k.R(AX - 3 + i * 2, AY - 26 - u * 8, 1, 1, `rgba(200,255,220,${1 - u})`);
    }
    // the candles, one per entry: on the desk, the shelves, the floor
    const spots: [number, number][] = [[0.5, 0.72], [0.62, 0.72], [0.24, 0.3], [0.33, 0.48], [0.27, 0.66], [0.42, 0.84], [0.72, 0.72], [0.36, 0.3], [0.58, 0.84], [0.47, 0.84]];
    spots.forEach(([cx2, cy2], i) => {
      const x = w * cx2;
      const y = h * cy2;
      k.R(x - 1, y - 7, 3, 7, "rgba(230,220,200,0.9)");
      if (k.passed > i) {
        const fl = k.still ? 0 : Math.sin(k.sec * 8 + i) * 0.5;
        light(k, x, y - 9, 16, [255, 180, 90], 0.35);
        k.R(x + fl, y - 11, 2, 3, "rgba(255,226,140,0.95)");
      }
    });
    k.g.restore();
    // Faust, before the sign: rim-lit from it; arms raised at the climax
    const up = away > 0.5;
    lit(k, w * 0.4, h * 0.85, up ? FAUST_UP : FAUST, FAUST_PAL, 2, false, rgba(sc, 0.8), 1);
  },

  // ---- BOOK II ----
  // The Olympian (D479): a packed stadium at night. The subject is the runner in front; every entry sends one more runner
  // onto the track, the stands fill as the entries pile up, and at the climax the crowd rises, arms up, under full floodlights.
  wtc2f01: (k) => {
    k.vgrad(0, k.h, [[0, "#0a0e20"], [1, "#1a2030"]]);
    const fill = Math.min(1, 0.25 + (0.75 * k.passed) / Math.max(1, k.ents.length));
    const rise = k.climax;
    for (const x of [0.1, 0.9]) {
      k.R(k.w * x, k.h * 0.04, 2, k.h * 0.36, "rgba(60,60,70,1)");
      k.glow(k.w * x, k.h * 0.05, 30 + 30 * rise, [250, 245, 220], 0.25 + 0.3 * rise);
    }
    for (let r = 0; r < 7; r++) for (let x = 2; x < k.w; x += 4) {
      const hx = hash(x * 3 + r * 17);
      if (hx > fill) continue;
      const up = rise > 0.3 && hash(x + r) > 0.4 && !k.still ? Math.round(Math.abs(Math.sin(k.sec * 4 + x)) * 2 * rise) : 0;
      const y = k.h * 0.26 + r * 6 - up;
      k.R(x, y, 2, 3, `rgba(${150 + hx * 100},${110 + hash(x) * 90},${130},${0.5 + 0.3 * fill})`);
      if (up) k.R(x, y - 2, 1, 2, "rgba(220,200,180,0.8)");
    }
    k.R(0, k.h * 0.68, k.w, k.h * 0.32, "rgba(150,60,50,1)");
    for (let i = 1; i < 4; i++) k.R(0, k.h * (0.68 + i * 0.08), k.w, 1, "rgba(240,230,220,0.5)");
    for (let x = -wrap(k.bar * k.pxBar * 1.2, 30); x < k.w; x += 30) k.R(x, k.h * 0.68, 1, k.h * 0.32, "rgba(240,230,220,0.2)");
    const n = Math.min(10, k.passed);
    for (let i = 0; i < n; i++) {
      const lane = i % 4;
      const speed = 22 + hash(i) * 8;
      const x = wrap(k.t * speed + hash(i + 9) * k.w - i * 18, k.w + 30) - 15;
      const y = k.h * (0.75 + lane * 0.08);
      const born = i === k.passed - 1 ? Math.min(1, k.since * 2) : 1;
      k.figure(x, y, i === 0 ? "rgba(240,220,120,1)" : `rgba(${[220, 120, 200][i % 3]},${[120, 180, 140][i % 3]},${[90, 230, 200][i % 3]},${born})`, Math.floor(k.t * 8 + i) % 2, 2);
    }
    if (k.rest > 0.1) k.glow(k.w * 0.5, k.h * 0.3, 40, [255, 215, 100], 0.4 * k.rest);
  },
  // The Shadows (D479): the subject is light, the other voices the figures' long shadows. Each entry sounding is a beam
  // crossing the ground; in a stretto the beams cross and the crossing glows; at the climax the beams fill the field
  // and the shadows dissolve.
  wtc2f02: (k) => {
    k.sky([90, 60, 90], [240, 150, 90], [40, 30, 60], [190, 80, 70], 0.7);
    k.orb(0.85, 0.55, 0.72, 6, [255, 180, 110], 0.35);
    k.ground(0.7, "rgba(120,80,60,1)");
    const shade = 0.5 * (1 - 0.8 * k.climax);
    k.atEntries((x, i) => {
      const y = k.h * (0.74 + (i % 3) * 0.06);
      k.g.fillStyle = `rgba(20,12,16,${shade})`;
      k.g.beginPath();
      k.g.moveTo(x - 1, y);
      k.g.lineTo(x - 44, y + 3);
      k.g.lineTo(x - 44, y + 6);
      k.g.lineTo(x + 2, y + 1);
      k.g.fill();
      k.figure(x, y, "rgba(24,16,20,1)", Math.floor(k.bar * 2 + i) % 2, 2);
    });
    const beams: number[] = [];
    for (const s of k.sounding) {
      const x0 = k.xOf(s.on);
      const tilt = s.voice % 2 ? -1 : 1;
      const grow = Math.min(1, ((k.now() - s.on) / k.barTicks) * 2);
      const a = (0.16 + 0.1 * k.climax) * grow;
      k.g.fillStyle = `rgba(255,232,180,${a})`;
      k.g.beginPath();
      k.g.moveTo(x0, 0);
      k.g.lineTo(x0 + 16, 0);
      k.g.lineTo(x0 + tilt * k.w * 0.3 + 16, k.h);
      k.g.lineTo(x0 + tilt * k.w * 0.3, k.h);
      k.g.closePath();
      k.g.fill();
      beams.push(x0, tilt);
    }
    for (let i = 0; i < beams.length; i += 2) for (let j = i + 2; j < beams.length; j += 2) {
      if (beams[i + 1] === beams[j + 1]) continue;
      const t = (beams[j] - beams[i]) / ((beams[i + 1] - beams[j + 1]) * k.w * 0.3);
      if (t < 0 || t > 1) continue;
      k.glow(beams[i] + 8 + beams[i + 1] * k.w * 0.3 * t, k.h * t, 24, [255, 240, 200], 0.45);
    }
  },
  // The Switchboard (D479): each entry patches one more cable, in its voice's colour, its jack lighting with a spark;
  // the lamps light up jack by jack, synth waves run behind the panel with the music, and at the climax every line is live.
  wtc2f03: (k) => {
    k.vgrad(0, k.h, [[0, "#1c1612"], [1, "#100c0a"]]);
    for (let i = 0; i < 5; i++) {
      const c = ["120,200,255", "255,140,200", "140,255,180"][i % 3];
      const amp = 3 + 6 * k.busy + 6 * k.climax;
      for (let x = 0; x < k.w; x += 2) k.R(x, k.h * (0.1 + i * 0.17) + Math.sin(x / 13 + i * 2 + k.t * (1 + i * 0.3)) * amp, 2, 1, `rgba(${c},${0.1 + 0.15 * k.busy + 0.2 * k.climax})`);
    }
    const lit = Math.min(1, k.passed / Math.max(1, k.ents.length) + k.climax);
    let j = 0;
    for (let y = k.h * 0.14; y < k.h * 0.8; y += 10) for (let x = 10; x < k.w; x += 12, j++) {
      k.disc(x, y, 2, "rgba(10,8,6,1)");
      const on = hash(j) < lit;
      k.R(x - 1, y - 6, 3, 2, on ? ["rgba(255,210,70,0.95)", "rgba(100,240,140,0.95)", "rgba(255,90,90,0.95)"][j % 3] : "rgba(120,100,70,0.35)");
    }
    const cols = ["rgba(92,178,255,0.9)", "rgba(255,140,74,0.9)", "rgba(181,140,255,0.9)", "rgba(95,224,138,0.9)"];
    const n = Math.min(k.passed, 18);
    for (let i = 0; i < n; i++) {
      const x0 = 10 + 12 * Math.floor(hash(i) * (k.w / 12 - 1));
      const y0 = k.h * 0.14 + 10 * Math.floor(hash(i + 3) * 6);
      const x1 = 10 + 12 * Math.floor(hash(i + 11) * (k.w / 12 - 1));
      const y1 = k.h * 0.14 + 10 * Math.floor(hash(i + 13) * 6);
      k.g.strokeStyle = cols[i % 4];
      k.g.lineWidth = 2;
      k.g.beginPath();
      k.g.moveTo(x0, y0);
      k.g.quadraticCurveTo((x0 + x1) / 2, k.h * 0.98, x1, y1);
      k.g.stroke();
      if (i === k.passed - 1 && k.since < 0.5) k.glow(x1, y1, 14, [220, 245, 255], 0.9 * (1 - k.since * 2));
    }
    k.R(0, k.h * 0.88, k.w, k.h * 0.12, "rgba(46,32,22,1)");
  },
  // The Chase (D479; the owner renamed II/4): a night road; the bandits' car is the subject's first statement, and every
  // answer a police car joining the pursuit, the imitation as the chase. The sirens glow slowly (never a strobe), and at
  // the climax the road is blocked and the bandits caught in the searchlights.
  wtc2f04: (k) => {
    k.vgrad(0, k.h, [[0, "#070a18"], [1, "#151a30"]]);
    k.stars(30, 0, 0.35);
    skyline(k, 0.62, 0.15, "rgba(14,16,30,1)", 0.5);
    k.R(0, k.h * 0.62, k.w, k.h * 0.38, "rgba(28,28,32,1)");
    for (let x = -wrap(k.bar * k.pxBar * 2, 40); x < k.w; x += 40) k.R(x, k.h * 0.8, 18, 2, "rgba(220,200,110,0.8)");
    const car = (x: number, y: number, body: string, top: string) => {
      k.R(x, y, 30, 8, body);
      k.R(x + 6, y - 5, 16, 5, top);
      k.R(x + 3, y + 7, 6, 4, "rgba(0,0,0,1)");
      k.R(x + 21, y + 7, 6, 4, "rgba(0,0,0,1)");
    };
    const caught = k.climax;
    const bx = k.w * (0.82 - 0.22 * caught) + (k.still ? 0 : Math.sin(k.sec * 1.3) * 4 * (1 - caught));
    car(bx, k.h * 0.72, "rgba(60,58,62,1)", "rgba(90,88,96,1)");
    k.glow(bx + 32, k.h * 0.74, 12, [255, 240, 180], 0.5);
    const cops = Math.min(6, Math.max(0, k.passed - 1));
    for (let i = 0; i < cops; i++) {
      const lane = i % 2;
      const target = k.w * (0.62 - i * 0.12) + caught * (i % 2 ? 1 : -1) * k.w * 0.08;
      const born = i === k.passed - 2 ? Math.min(1, k.since * 1.5) : 1;
      const x = -40 + (target + 40) * born + (k.still ? 0 : Math.sin(k.sec * 1.7 + i) * 3);
      const y = k.h * (0.72 + lane * 0.12);
      car(x, y, "rgba(230,230,240,1)", "rgba(30,30,90,1)");
      // the siren: red and blue in turn, once a second, soft
      const phase = k.still ? 0 : (Math.sin(k.sec * Math.PI + i) + 1) / 2;
      k.glow(x + 14, y - 6, 12, [255, 60, 60], 0.35 * phase);
      k.glow(x + 14, y - 6, 12, [60, 90, 255], 0.35 * (1 - phase));
    }
    if (caught > 0.05) {
      k.R(k.w * 0.5, k.h * 0.66, 6, k.h * 0.3, `rgba(200,60,40,${caught})`);
      for (const sx of [0.3, 0.85]) {
        k.g.fillStyle = `rgba(255,255,220,${0.16 * caught})`;
        k.g.beginPath();
        k.g.moveTo(k.w * sx, 0);
        k.g.lineTo(k.w * sx + 8, 0);
        k.g.lineTo(bx + 36, k.h * 0.8);
        k.g.lineTo(bx - 6, k.h * 0.8);
        k.g.closePath();
        k.g.fill();
      }
    }
  },
  // The Bell Tower (D479): evening; a tower rises on the skyline for each stretto entry, its bell swinging as it comes in,
  // so the climax is a skyline of towers, every bell swinging in gold light.
  wtc2f05: (k) => {
    k.sky([60, 50, 90], [220, 140, 100], [14, 14, 34], [60, 40, 70]);
    k.stars(40, 0.5);
    k.hills(0.88, 6, 0.05, 2, "rgba(30,22,30,1)");
    const begun = k.strettos.filter((on) => on <= k.now());
    const towers = [{ x: 0.5, hgt: 0.62, on: -1 }, ...begun.slice(0, 7).map((on, i) => ({ x: [0.26, 0.74, 0.12, 0.88, 0.38, 0.62, 0.03][i], hgt: 0.4 + hash(i + 2) * 0.18, on }))];
    for (const [i, t] of towers.entries()) {
      const grow = t.on < 0 ? 1 : Math.min(1, ((k.now() - t.on) / k.barTicks) * 1.5);
      const hgt = k.h * t.hgt * grow;
      const tx = k.w * t.x;
      const top = k.h * 0.9 - hgt;
      k.R(tx - 10, top, 20, hgt, "rgba(36,28,34,1)");
      k.tri(tx, top, 26, 16 * grow, "rgba(30,22,28,1)");
      if (grow < 0.6) continue;
      const ringing = k.sounding.some((s) => s.on === t.on) || k.climax > 0.3 || (i === 0 && k.sounding.length > 0);
      const swing = ringing && !k.still ? Math.sin(k.sec * 3 + i) * (0.35 + 0.3 * k.climax) : 0;
      k.R(tx - 6, top + 6, 12, 12, "rgba(10,8,12,1)");
      k.g.save();
      k.g.translate(tx, top + 8);
      k.g.rotate(swing);
      k.g.fillStyle = ringing ? "rgba(225,175,85,0.95)" : "rgba(100,78,44,0.9)";
      k.g.beginPath();
      k.g.moveTo(-2, 0);
      k.g.lineTo(2, 0);
      k.g.lineTo(5, 9);
      k.g.lineTo(-5, 9);
      k.g.fill();
      k.g.restore();
      if (ringing) k.glow(tx, top + 12, 16 + 10 * k.climax, [255, 210, 130], 0.3 + 0.25 * k.climax);
    }
  },
  // The Catapult (D479): the siege advances entry by entry: every entry is a shot, a stone arcing from the catapult to
  // the gate over the bar it begins; the gate cracks, splinters and burns a little more each time, and at the climax it
  // falls and light pours through.
  wtc2f06: (k) => {
    k.sky([90, 110, 150], [200, 190, 170], [60, 50, 80], [200, 120, 90]);
    clouds(k, 4, 0.3);
    k.hills(0.62, 8, 0.05, 1, "rgba(80,90,70,1)");
    const cxl = k.w * 0.52; // D650: the siege in the open box (the bars cover 0–22% and 78–100%)
    // D650: the castle, the gate and the catapult lighter, rimmed in the evening light, so the siege reads.
    const wall = "rgba(150,138,124,1)";
    k.R(cxl, k.h * 0.34, k.w * 0.26, k.h * 0.28, wall);
    for (let x = cxl; x < cxl + k.w * 0.26; x += 8) k.R(x, k.h * 0.3, 5, 5, wall);
    const gx = cxl + k.w * 0.09;
    const gw = k.w * 0.08;
    const gy = k.h * 0.42;
    const gh = k.h * 0.2;
    // The gate falls on the climax's peak (the last entry's onset), over half a bar.
    const fall = Math.max(0, Math.min(1, (k.now() - k.peak) / (k.barTicks * 0.5)));
    const dmg = Math.min(1, k.passed / Math.max(1, k.ents.length - 1));
    if (fall < 1) {
      k.g.save();
      k.g.translate(gx, gy + gh);
      k.g.rotate((-Math.PI / 2) * fall * fall);
      k.R(-1, -gh - 1, gw + 2, gh + 1, "rgba(255,200,130,0.55)");
      k.R(0, -gh, gw, gh, "rgba(150,96,50,1)");
      for (let i = 0; i < 3; i++) k.R(0, -gh + 4 + i * (gh / 3), gw, 2, "rgba(40,28,16,1)");
      const cracks = Math.round(dmg * 12);
      for (let i = 0; i < cracks; i++) k.line(hash(i) * gw, -gh + hash(i + 1) * gh, hash(i + 2) * gw, -gh + hash(i + 3) * gh, "rgba(20,10,4,0.9)", 1);
      k.g.restore();
    }
    if (fall > 0) {
      k.glow(gx + gw / 2, gy + gh / 2, 30 + 40 * fall, [255, 240, 200], 0.6 * fall);
      k.R(gx, gy, gw, gh, `rgba(255,236,190,${0.5 * fall})`);
    } else if (dmg > 0.3) k.glow(gx + gw / 2, gy + gh * 0.8, 10 + 14 * dmg, [255, 140, 50], 0.25 + 0.35 * dmg);
    k.ground(0.8, "rgba(70,80,50,1)");
    const fx = k.w * 0.31;
    const fy = k.h * 0.8;
    k.R(fx - 21, fy - 10, 42, 11, "rgba(255,200,130,0.45)");
    k.R(fx - 20, fy - 9, 40, 9, "rgba(140,96,56,1)");
    k.tri(fx, fy - 9, 20, 20, "rgba(140,96,56,1)");
    // The shot: flung 0.7 bar before each entry, the stone landing on the entry's onset (the sound's thud there,
    // Instruments' table); the splinters fly over the 0.3 bar after it.
    const next = k.passed < k.ents.length ? k.ents[k.passed] : Infinity;
    const toNext = (next - k.now()) / k.barTicks;
    const flying = toNext <= 0.7 && fall < 1;
    const u = flying ? 1 - toNext / 0.7 : 0;
    const cock = (flying ? 0.3 + 0.7 * Math.min(1, u * 4) : 0.3) * Math.PI * 0.45;
    k.line(fx, fy - 26, fx - Math.cos(cock) * 36, fy - 26 - Math.sin(cock) * 36 + 14, "rgba(170,120,70,1)", 4);
    if (flying) {
      const sx = fx + (gx + gw / 2 - fx) * u;
      const sy = fy - 30 - Math.sin(u * Math.PI) * k.h * 0.35 + (gy + gh / 2 - fy + 30) * u;
      k.glow(sx, sy, 8, [255, 160, 70], 0.8);
      k.R(sx - 2, sy - 2, 4, 4, "rgba(255,225,160,1)");
    }
    if (k.since < 0.3 && fall < 1) for (let i = 0; i < 8; i++) k.R(gx + gw / 2 + Math.cos(i) * k.since * 120, gy + gh / 2 + Math.sin(i) * k.since * 60, 2, 2, "rgba(120,90,60,0.9)");
  },
  // D660 (design studio, the art upgrade, batch 3): The Organist. A cathedral organ in three depths: the dark vault and
  // its rose of glass, the organ case with its gilt towers of pipes (each rank its own flat), the console near with the
  // organist seen from behind, the music desk's candles. The drama: each entry another rank of pipes lights; in the
  // strettos the organist's hands move to another manual; at the climax every pipe lit at once in a wave from the
  // centre outward.
  wtc2f07: (k) => {
    const { w, h } = k;
    const cam = sway(k, 37);
    const cl = k.climax;
    k.vgrad(0, h, [[0, "#0e0a14"], [1, "#1e1620"]]);
    fillTex(k, texture(k, "stone", 40, stone), 0, 0, w, h, cam * 0.3);
    light(k, w * 0.5, h * 0.06, 30, [200, 160, 255], 0.25);
    // the case and its ranks of pipes: 9 flats, lit one per entry from the centre
    const ranks = 9;
    const nLit = Math.min(ranks, k.passed);
    const order = [4, 3, 5, 2, 6, 1, 7, 0, 8];
    const wave = cl > 0.01 ? (k.still ? 1 : wrap(k.t * 0.4, 1)) : -1;
    k.R(w * 0.2 + cam * 0.6, h * 0.12, w * 0.6, h * 0.62, "#3a2414");
    fillTex(k, texture(k, "panels", 24, panels), w * 0.2 + cam * 0.6, h * 0.12, w * 0.6, h * 0.62, cam * 0.6);
    for (let r = 0; r < ranks; r++) {
      const on = order.indexOf(r) < nLit || cl > 0.5;
      const centre = Math.abs(r - 4);
      const x0 = w * (0.22 + r * 0.063) + cam * 0.6;
      const top = h * (0.14 + centre * 0.025);
      const glowA = on ? 0.18 + (wave >= 0 && Math.abs(wave * 5 - centre) < 0.8 ? 0.3 : 0) : 0;
      for (let p2 = 0; p2 < 5; p2++) {
        const px = x0 + p2 * 5;
        const ph = h * 0.5 - centre * 6 - Math.abs(p2 - 2) * 4;
        k.R(px, top + (h * 0.5 - ph), 4, ph, on ? "#a89060" : "#4a4438");
        k.R(px, top + (h * 0.5 - ph), 1, ph, on ? "rgba(255,240,200,0.55)" : "rgba(200,200,190,0.15)");
        k.R(px + 3, top + (h * 0.5 - ph), 1, ph, "rgba(0,0,0,0.3)");
        k.tri(px + 2, top + h * 0.5 + 6, 4, -5, on ? "#a89060" : "#4a4238");
      }
      if (glowA) light(k, x0 + 12, top + h * 0.25, 30, [255, 220, 150], glowA);
      k.R(x0 - 1, top - 3, 26, 3, "#c09040");
    }
    // the console, its candles, the organist from behind
    const CY = h * 0.86;
    k.R(w * 0.3 + cam * 1.2, CY - 14, w * 0.4, 14, "#2a180e");
    for (let m2 = 0; m2 < 3; m2++) k.R(w * 0.32 + cam * 1.2, CY - 12 + m2 * 4, w * 0.36, 2, m2 === 1 ? "#e8e0d0" : "#d8d0c0");
    for (const cx of [0.33, 0.67]) {
      const x = w * cx + cam * 1.2;
      k.R(x - 1, CY - 22, 3, 8, "rgba(230,220,200,0.9)");
      const fl = k.still ? 0 : Math.sin(k.sec * 8 + cx * 9) * 0.5;
      light(k, x, CY - 24, 14, [255, 190, 100], 0.4);
      k.R(x + fl, CY - 25, 2, 3, "#ffe08a");
    }
    const manual = k.stretto > 0.5 ? 1 : 0;
    const hand = k.still ? 0 : Math.sin(k.sec * 6) * 2;
    k.R(w * 0.44 + cam * 1.2 + hand, CY - 11 + manual * 4, 4, 2, "#f0c8a0");
    k.R(w * 0.54 + cam * 1.2 - hand, CY - 11 + manual * 4, 4, 2, "#f0c8a0");
    lit(k, w * 0.5 + cam * 1.2, h, ORGANIST, { h: "#4a3a3a", c: "#2a2030", b: "#140c10" }, 2, false, "rgba(255,210,150,0.7)", 0, -1);
    if (cl > 0.01) light(k, w * 0.5, h * 0.4, w * 0.4, [255, 220, 160], 0.25 * cl);
  },
  // D660: The Rain. A street at night in three depths: the far roofs under the cloud, the houses along the street with
  // their windows, the wet cobbles near mirroring every light; a street lamp, a passer-by under an umbrella. The drama:
  // each entry the rain grows and a new window lights along the street; at the climax the rain stops, the clouds part
  // and the street shines under the moon.
  wtc2f08: (k) => {
    const { w, h } = k;
    const cam = sway(k, 29);
    const cl = k.climax;
    k.sky([16, 20, 30], [40, 44, 56], [10, 12, 22], [30, 30, 44]);
    if (cl > 0.01) {
      k.orb(0.7, 0.16, 0.16, 7, [235, 235, 220], 0.35 * cl, true);
      light(k, w * 0.7, h * 0.16, 80, [200, 210, 240], 0.25 * cl);
    }
    clouds(k, Math.round(7 * (1 - 0.8 * cl)), 0.5, 0.1);
    skyline(k, 0.5, 0.02, "rgba(22,24,34,1)", 2);
    // the houses and their windows, one more lit per entry
    k.g.save();
    k.g.translate(cam * 0.7, 0);
    const nLit = Math.min(18, k.passed + 1);
    let wi = 0;
    for (let i = 0; i < 7; i++) {
      const x = w * (0.02 + i * 0.14);
      const hh = h * (0.36 + 0.1 * hash(i + 2));
      k.R(x, h * 0.78 - hh, w * 0.13, hh, i % 2 ? "#262a38" : "#2e2a36");
      fillTex(k, texture(k, "stone", 40, stone), x, h * 0.78 - hh, w * 0.13, hh);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++, wi++) {
        const on = hash(wi * 5) * 18 < nLit;
        const wx = x + 6 + c * 22, wy = h * 0.78 - hh + 10 + r * 18;
        k.R(wx, wy, 8, 10, on ? "#ffd890" : "#141620");
        if (on) light(k, wx + 4, wy + 5, 12, [255, 200, 120], 0.3);
      }
    }
    k.g.restore();
    // the street lamp
    const LX = w * 0.3 + cam;
    k.R(LX, h * 0.36, 2, h * 0.5, "#14141c");
    k.R(LX - 4, h * 0.34, 10, 4, "#14141c");
    light(k, LX + 1, h * 0.38, 40, [255, 210, 140], 0.35);
    // the wet street, mirroring
    k.R(0, h * 0.78, w, h * 0.22, "#1a1c26");
    k.vgrad(h * 0.78, h * 0.22, [[0, "rgba(255,210,140,0.12)"], [1, "rgba(255,210,140,0)"]], LX - 6, 14);
    for (let i = 0; i < 7; i++) k.R(w * (0.05 + i * 0.14) + cam * 0.7 + 8, h * 0.82, 6, 10 + hash(i) * 8, "rgba(255,216,144,0.12)");
    // D464: the rain grows over the piece and with the music's density; under a major entry's sun it eases. D660: it stops at the climax.
    if (cl < 0.6) k.rain(Math.round(25 + 120 * (0.2 + 0.8 * k.p) * (0.55 + 0.45 * k.busy) * (1 - 0.7 * k.turn)), 0.26 + 0.16 * k.p);
    k.atEntries((x, i, begun) => {
      if (!begun || cl > 0.6) return;
      const r = 3 + wrap(k.t * 2 + i, 3) * 3;
      k.g.strokeStyle = "rgba(170,190,220,0.35)";
      k.g.beginPath();
      k.g.ellipse(x, h * 0.9, r, r * 0.3, 0, 0, Math.PI * 2);
      k.g.stroke();
    });
    if (cl > 0.01) k.vgrad(h * 0.78, h * 0.22, [[0, `rgba(200,210,240,${0.2 * cl})`], [1, "rgba(200,210,240,0)"]]);
    // the passer-by, under an umbrella
    const pb = k.wander(30, 0.4, 0.3, 0.7);
    lit(k, pb.x + cam, h * 0.92, PERSON, { h: "#2a2020", s: "#d0b090", c: "#3a3a4a", d: "#2a2a34", b: "#141018" }, 2, pb.dir < 0, "rgba(255,210,150,0.6)", -1);
    k.g.fillStyle = "#5a1a2a";
    k.g.beginPath();
    k.g.arc(pb.x + cam, h * 0.92 - 22, 12, Math.PI, 0);
    k.g.fill();
    k.R(pb.x + cam, h * 0.92 - 22, 1, 10, "#14101a");
  },
  // D660: The Chorale. A Lutheran church in three depths: the far organ loft and the tall windows, the pews with the
  // congregation, the hymn board near with its numbers; light from above. The drama: each entry a line of the hymn
  // board lights and more of the congregation stand; at the climax everyone standing, the light from above on the
  // whole church.
  wtc2f09: (k) => {
    const { w, h } = k;
    const cam = sway(k, 35);
    const cl = k.climax;
    k.vgrad(0, h, [[0, "#e8e0d0"], [1, "#c8b8a0"]]);
    fillTex(k, texture(k, "stone", 40, stone), 0, 0, w, h, cam * 0.3);
    // the tall windows and their light
    for (let i = 0; i < 4; i++) {
      const x = w * (0.24 + i * 0.16) + cam * 0.3;
      k.R(x, h * 0.06, 10, h * 0.34, "#c8d8f0");
      k.tri(x + 5, h * 0.06, 10, 6, "#c8d8f0");
      k.R(x + 4, h * 0.06, 2, h * 0.34, "#a0a8b8");
      k.g.fillStyle = `rgba(255,250,230,${0.08 + 0.12 * cl})`;
      k.g.beginPath();
      k.g.moveTo(x, h * 0.4);
      k.g.lineTo(x + 10, h * 0.4);
      k.g.lineTo(x + 30, h);
      k.g.lineTo(x + 10, h);
      k.g.fill();
    }
    // the organ loft
    k.R(w * 0.36 + cam * 0.4, h * 0.42, w * 0.28, 6, "#6a4a30");
    for (let p2 = 0; p2 < 14; p2++) k.R(w * 0.37 + cam * 0.4 + p2 * 8, h * 0.42 - 10 - Math.abs(p2 - 7) * 1.5, 4, 10 + Math.abs(p2 - 7) * 1.5, "#c0b090");
    // the pews and the congregation: more standing per entry
    const standing = Math.min(1, k.passed / Math.max(1, k.ents.length)) + cl;
    let n = 0;
    for (let row = 0; row < 3; row++) {
      const y = h * (0.72 + row * 0.1);
      const sc = row < 2 ? 1 : 2;
      for (let i = 0; i < 9 - row * 2; i++, n++) {
        const x = w * (0.24 + (i + 0.5) * (0.52 / (9 - row * 2))) + cam * (0.6 + row * 0.4);
        const up = hash(n * 3) < standing;
        const pal = { h: ["#3a2a1a", "#d8b060", "#6a4a3a", "#2a1a14"][n % 4], s: "#e8c8a8", c: ["#3a3a5a", "#5a3a3a", "#3a5a4a", "#4a4a4a"][n % 4], d: "#2a2a30", b: "#1a1414" };
        sprite(k, x, y, up ? PERSON : SEATED, pal, sc);
      }
      k.R(w * 0.22 + cam * (0.6 + row * 0.4), y, w * 0.56, 3 * (row < 2 ? 1 : 2), "#5a3a24");
    }
    // the hymn board, near: its lines lit one per entry
    const BX = w * 0.7 + cam * 1.6;
    k.R(BX, h * 0.46, 30, 44, "#4a2e1a");
    k.R(BX + 2, h * 0.46 + 2, 26, 40, "#1a120c");
    for (let i = 0; i < 5; i++) {
      const on = k.passed > i || cl > 0.5;
      dots(k, BX + 4, h * 0.46 + 5 + i * 8, String((i * 137 + 23) % 500), 1, on ? "#f0e8d0" : "rgba(240,232,208,0.2)", null);
    }
    if (cl > 0.01) light(k, w * 0.5, 0, h * 1.2, [255, 250, 230], 0.3 * cl);
  },
  // The Crook: a fair at night, string lights and tents, the crowd.
  wtc2f10: (k) => {
    k.sky([18, 14, 34], [50, 30, 60], [10, 8, 24], [40, 20, 50]);
    k.stars(30);
    k.along(70, 0.15, (x, i) => {
      k.tri(x + 20, k.h * 0.7, 46, 30, i % 2 ? "rgba(120,40,50,1)" : "rgba(50,60,120,1)");
      k.R(x, k.h * 0.7 - 2, 40, 2, "rgba(20,14,20,1)");
    });
    k.along(10, 0.15, (x, i) => k.disc(x, k.h * 0.18 + Math.sin(x / 20) * 6, 1.5, ["rgba(255,200,90,0.8)", "rgba(255,110,110,0.8)", "rgba(140,200,255,0.8)"][i % 3]));
    k.ground(0.82, "rgba(40,30,30,1)");
    k.along(9, 0.6, (x, i) => k.figure(x, k.h * 0.86, `rgba(${14 + (i % 3) * 6},12,18,1)`, Math.floor(k.bar * 2 + i) % 2, 2), 5);
  },
  // D660: The Butterfly. A bright meadow in three depths: the sky and its sun, the far hills and hedges, the flowering
  // grass near, swaying; the butterflies as sprites flapping in their own colours. The drama: each entry another
  // butterfly rises from the meadow, the cloud of wings growing; at the climax hundreds in a swirl across the sun.
  wtc2f11: (k) => {
    const { w, h } = k;
    const cam = sway(k, 27);
    const cl = k.climax;
    k.sky([110, 170, 230], [220, 235, 240], [130, 180, 230], [240, 230, 200]);
    const sx = w * 0.62, sy = h * 0.2;
    light(k, sx, sy, 70, [255, 250, 210], 0.35 + 0.2 * cl);
    k.disc(sx, sy, 9, "#fffbe0");
    clouds(k, 4, 0.5, 0.1);
    k.hills(0.62, 10, 0.02, 3, "rgba(120,170,120,1)");
    k.g.save();
    k.g.translate(cam * 0.6, 0);
    for (let i = 0; i < 10; i++) k.disc(w * (0.04 + i * 0.11), h * 0.66, 12 + hash(i) * 8, "#4a8a4a");
    k.g.restore();
    k.R(0, h * 0.7, w, h * 0.3, "#5aa04a");
    fillTex(k, texture(k, "grass", 32, grass), 0, h * 0.7, w, h * 0.3, cam);
    for (let i = 0; i < 60; i++) {
      const x = w * hash(i * 7) + cam * 1.2;
      const y = h * (0.74 + 0.26 * hash(i * 3));
      const sw2 = k.still ? 0 : Math.sin(k.sec * 1.3 + i) * 0.8;
      k.R(x + sw2, y - 4, 1, 4, "#3a7a2a");
      k.R(x - 1 + sw2, y - 6, 3, 2, ["#f05a8a", "#f0d040", "#ffffff", "#a070f0", "#f08a30"][i % 5]);
    }
    // the butterflies: one more per entry; hundreds swirling across the sun at the climax
    const nb = Math.min(24, k.passed * 2) + Math.round(80 * cl);
    const cols = ["#f08a30", "#f0d040", "#60b0f0", "#f05a8a", "#ffffff", "#a070f0"];
    for (let i = 0; i < nb; i++) {
      const born = i >= nb - 2 && cl < 0.1 ? Math.min(1, k.since * 1.5) : 1;
      let x: number, y: number;
      if (cl > 0.3 && i >= Math.min(24, k.passed * 2)) {
        const a = k.t * 0.5 + i * 0.37;
        const r = 20 + (i % 9) * 8;
        x = sx + Math.cos(a) * r * 1.6;
        y = sy + Math.sin(a) * r * 0.7;
      } else {
        x = w * (0.26 + 0.48 * hash(i * 5)) + Math.sin(k.t * 0.7 + i) * 18 + cam * 0.8;
        y = h * (0.72 - 0.5 * born * (0.4 + 0.6 * hash(i * 9))) + Math.sin(k.t * 1.3 + i * 2) * 6;
      }
      const flap = !k.still && Math.floor(k.sec * 7 + i) % 2 === 0;
      sprite(k, x, y, flap ? BFLY_A : BFLY_B, { w: cols[i % 6], b: "#2a1a10" }, i % 3 === 0 ? 2 : 1);
    }
  },
  // D660: The Masquerade. A ballroom in three depths: the mirrored far wall, the chandeliers hung over the floor,
  // the parquet in perspective with the dancers waltzing in pairs, masked. The drama: each entry a dancer unmasks; the
  // fan opens at each cadence; at the climax the chandeliers blaze and all the masks come off at once.
  wtc2f12: (k) => {
    const { w, h } = k;
    const cam = sway(k, 31);
    const cl = k.climax;
    k.vgrad(0, h * 0.62, [[0, "#3a1a30"], [1, "#5a2a40"]]);
    fillTex(k, texture(k, "paper", 24, wallpaper), 0, 0, w, h * 0.62, cam * 0.3);
    // the mirrors on the far wall
    for (let i = 0; i < 5; i++) {
      const x = w * (0.12 + i * 0.18) + cam * 0.3;
      k.R(x, h * 0.16, 30, h * 0.4, "#c09040");
      k.vgrad(h * 0.18, h * 0.36, [[0, "#6a5a7a"], [1, "#3a2a4a"]], x + 2, 26);
      k.line(x + 6, h * 0.2, x + 14, h * 0.5, "rgba(255,255,255,0.15)", 2);
    }
    // the parquet in perspective
    k.vgrad(h * 0.62, h * 0.38, [[0, "#6a4024"], [1, "#3a2414"]]);
    fillTex(k, texture(k, "parquet", 16, parquet), 0, h * 0.62, w, h * 0.38, cam);
    // the chandeliers
    const blaze = 0.3 + 0.7 * cl;
    for (const x0 of [0.3, 0.5, 0.7]) {
      const x = w * x0 + cam * 0.8;
      k.line(x, 0, x, h * 0.1, "rgba(200,170,90,0.8)");
      k.g.strokeStyle = "#c0a050";
      k.g.lineWidth = 2;
      k.g.beginPath();
      k.g.arc(x, h * 0.1, 14, 0, Math.PI);
      k.g.stroke();
      for (let j = -3; j <= 3; j++) {
        const cx = x + j * 4.5;
        const cy = h * 0.1 + Math.sqrt(Math.max(0, 196 - (j * 4.5) ** 2)) - 2;
        k.R(cx, cy - 3, 1, 3, "#f0e8d0");
        k.R(cx, cy - 5, 1, 2, "#ffe08a");
      }
      light(k, x, h * 0.16, 30 + 40 * cl, [255, 220, 150], 0.25 * blaze);
      for (let d = 0; d < 6; d++) k.R(x - 12 + d * 5, h * 0.2 + (d % 2) * 3, 1, 2, "rgba(220,240,255,0.7)");
    }
    // the dancers waltzing in pairs; one unmasks per entry
    const off = Math.min(10, k.passed) + (cl > 0.5 ? 10 : 0);
    const gowns = ["#c03a5a", "#3a6ac0", "#e0b040", "#5aa070", "#a050c0"];
    for (let i = 0; i < 5; i++) {
      const a = k.t * 0.5 + (i * Math.PI * 2) / 5;
      const x = w * 0.5 + Math.cos(a) * w * 0.2 + cam * 1.1;
      const y = h * 0.86 + Math.sin(a) * h * 0.06;
      const sc = y > h * 0.86 ? 2 : 2;
      const maskA = off > i * 2 ? "#f0c8a0" : ["#f0d040", "#e8e8f0", "#c03040"][i % 3];
      const maskB = off > i * 2 + 1 ? "#f0c8a0" : ["#e8e8f0", "#c03040", "#f0d040"][i % 3];
      lit(k, x - 7, y, DANCER, { h: "#3a2010", m: maskA, s: "#f0c8a0", g: gowns[i] }, sc, false, "rgba(255,220,160,0.8)", 0, -1);
      lit(k, x + 7, y, PARTNER, { h: "#1a1010", m: maskB, s: "#f0c8a0", k: "#141018", w: "#f0f0f0", b: "#0a0808" }, sc, true, "rgba(255,220,160,0.8)", 0, -1);
    }
    k.atCadences((x) => {
      for (let j = 0; j < 7; j++) {
        const a = Math.PI + (j * Math.PI) / 6;
        k.line(x, h * 0.62, x + Math.cos(a) * 14, h * 0.62 + Math.sin(a) * 14, "rgba(230,200,120,0.7)", 2);
      }
    });
    if (cl > 0.01) light(k, w * 0.5, h * 0.2, w * 0.5, [255, 220, 150], 0.2 * cl);
  },
  // The Telephone: wallpaper, the rotary telephone on its table, its bell shaking at each entry.
  wtc2f13: (k) => {
    k.room([70, 50, 44], [50, 36, 32], 0.8, "rgba(60,40,30,1)");
    for (let x = 6; x < k.w; x += 14) for (let y = 6; y < k.h * 0.8; y += 14) k.R(x, y, 2, 2, "rgba(120,90,60,0.35)");
    k.R(k.w * 0.4, k.h * 0.64, k.w * 0.2, 4, "rgba(40,26,18,1)");
    k.R(k.w * 0.48, k.h * 0.64, 3, k.h * 0.16, "rgba(40,26,18,1)");
    const ring = k.ents.some((e) => Math.abs(k.xOf(e) - k.xOf(k.now())) < k.pxBar * 0.25);
    const sh = ring && !k.still ? Math.sin(k.sec * 50) * 1.5 : 0;
    const px = k.w * 0.5 + sh;
    k.R(px - 10, k.h * 0.64 - 9, 20, 9, "rgba(20,16,16,1)");
    k.R(px - 12, k.h * 0.64 - 13, 24, 4, "rgba(20,16,16,1)");
    k.disc(px, k.h * 0.64 - 5, 4, "rgba(200,190,170,0.5)");
  },
  // D660: The Three Sisters. A great tree on a hill in three depths: the sky turning, the far fields, the tree itself
  // near; three sisters under it, one per subject, each with her season: autumn (her leaves falling red), winter (snow on
  // her side), spring (blossom). The drama: each sister's entries light her figure and her season; at the climax the
  // three subjects together, the tree in every season at once.
  wtc2f14: (k) => {
    const { w, h } = k;
    const cam = sway(k, 33);
    const cl = k.climax;
    k.sky([90, 130, 170], [220, 200, 170], [60, 50, 90], [220, 140, 110]);
    k.hills(0.7, 10, 0.02, 2, "rgba(110,130,90,1)");
    const by = [0, 0, 0, 0];
    for (let i = 0; i < k.passed; i++) by[k.themes[i] ?? 1]++;
    const tot = [0, 0, 0, 0];
    for (const t of k.themes) tot[t]++;
    const season = [0, 1, 2, 3].map((t) => (tot[t] ? Math.min(1, by[t] / tot[t] + cl) : 0));
    const sounding = new Set<number>();
    k.sounding.forEach((sp) => {
      const j = k.ents.indexOf(sp.on);
      if (j >= 0) sounding.add(k.themes[j] ?? 1);
    });
    k.g.save();
    k.g.translate(cam * 0.6, 0);
    k.hills(0.82, 14, 0.03, 2, "rgba(70,100,60,1)");
    const tx = w * 0.5;
    k.R(tx - 5, h * 0.36, 10, h * 0.46, "#4a3222");
    k.line(tx, h * 0.5, tx - 30, h * 0.32, "#4a3222", 4);
    k.line(tx, h * 0.46, tx + 34, h * 0.3, "#4a3222", 4);
    // the canopy: autumn left, winter middle, spring right, each by its sister's entries
    const sectors: [number, string, string][] = [[-1, "#c05a2a", "#e08a3a"], [0, "#dce4ec", "#ffffff"], [1, "#f0a0c0", "#ffd0e0"]];
    sectors.forEach(([sd, c0, c1], t) => {
      const a = season[t + 1];
      for (let i = 0; i < 14; i++) {
        const x = tx + sd * 30 + (hash(i + t * 20) - 0.5) * 50;
        const y = h * (0.22 + hash(i + t * 20 + 3) * 0.16);
        k.disc(x, y, 9, a > 0.05 ? (i % 2 ? c0 : c1) : "#2a4a2a");
        if (a < 1) k.disc(x, y, 9, `rgba(42,74,42,${1 - a})`);
      }
    });
    // the seasons falling: leaves, snow, petals
    if (!k.still) sectors.forEach(([sd, c0], t) => {
      const a = season[t + 1];
      for (let i = 0; i < 8 * a; i++) {
        const u = wrap(k.sec * 0.08 + hash(i + t * 9), 1);
        k.R(tx + sd * 40 + (hash(i * 3 + t) - 0.5) * 60 + Math.sin(u * 8 + i) * 4, h * (0.3 + 0.55 * u), 2, 2, c0);
      }
    });
    k.g.restore();
    // the three sisters, lit while their subject sounds
    const robes = ["#a04a2a", "#5a7ab0", "#d070a0"];
    for (let t = 0; t < 3; t++) {
      const x = w * (0.36 + t * 0.14) + cam * 1.1;
      const on = sounding.has(t + 1) || cl > 0.5;
      const a = 0.4 + 0.6 * season[t + 1];
      if (on) light(k, x, h * 0.78, 24, [255, 230, 190], 0.35);
      lit(k, x, h * 0.88, SISTER, { h: ["#6a2a14", "#e8e0d0", "#3a2a1a"][t], s: `rgba(240,204,168,${a})`, k: "#201010", d: robes[t], b: "#1a1010" }, 2 + (t === 2 ? 0 : 0), t === 2, on ? "rgba(255,240,210,0.95)" : "rgba(255,240,210,0.3)", 0, -1);
    }
  },
  // D660: Hopscotch. A pavement on an autumn afternoon in three depths: the park railings and trees beyond, the
  // pavement's flags with the chalk court drawn on them, leaves blowing and a pigeon pecking near. The child in her
  // pinafore hops the court; a friend wanders by on her own clock (D464). The drama (the owner: "the character playing
  // hopscotch"): each entry a chalk square fills and the child hops onto it; at the climax the last square reached,
  // chalk dust flying, the whole court drawn.
  wtc2f15: (k) => {
    const { w, h } = k;
    const cam = sway(k, 29);
    const cl = k.climax;
    k.sky([150, 170, 200], [230, 210, 180], [120, 110, 150], [240, 170, 120]);
    k.g.save();
    k.g.translate(cam * 0.4, 0);
    for (let i = 0; i < 9; i++) roundTree(k, w * (0.05 + i * 0.12), h * 0.5, 14 + hash(i) * 6, ["#c06a2a", "#d0a040", "#8a6a2a"][i % 3]);
    k.g.restore();
    for (let x = -wrap(-cam * 0.7, 6); x < w; x += 6) k.R(x, h * 0.42, 1, h * 0.14, "#1a1a1a");
    k.R(0, h * 0.42, w, 2, "#1a1a1a");
    k.R(0, h * 0.56, w, h * 0.44, "#7a7a80");
    for (let y = h * 0.56; y < h; y += 16) for (let x = -wrap(-cam, 28); x < w; x += 28) k.R(x, y, 27, 15, "rgba(255,255,255,0.05)");
    // the court: 1 / 2-3 / 4 / 5-6 / 7 / 8-9 / 10, chalked square by square
    const cells: [number, number][] = [[0, 0], [1, -0.5], [1, 0.5], [2, 0], [3, -0.5], [3, 0.5], [4, 0], [5, -0.5], [5, 0.5], [6, 0]];
    const S = 15;
    const cx0 = w * 0.3 + cam;
    const cy = h * 0.8;
    const n = Math.min(cells.length, k.ents.length);
    const per = cells.length / Math.max(1, n);
    const filled = cl > 0.5 ? cells.length : Math.min(cells.length, Math.round(k.passed * per));
    cells.forEach(([c, r], i) => {
      const x = cx0 + c * S;
      const y = cy + r * S - S / 2;
      if (i < filled) k.R(x + 1, y + 1, S - 2, S - 2, "rgba(240,180,200,0.35)");
      k.g.strokeStyle = i < filled ? "rgba(250,250,240,0.95)" : "rgba(250,250,240,0.35)";
      k.g.lineWidth = 1;
      k.g.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, S, S);
      if (i < filled) dots(k, x + 6, y + 5, String((i + 1) % 10), 1, "rgba(250,250,240,0.8)", null);
    });
    // the child: on the square of the last entry, hopping
    const target = Math.max(0, filled - 1);
    const [tc, tr] = cells[target];
    const prev = cells[Math.max(0, target - 1)];
    const u = k.since < 0.5 ? k.since / 0.5 : 1;
    const hx = cx0 + (prev[0] + (tc - prev[0]) * u) * S + S / 2;
    const hy = cy + (prev[1] + (tr - prev[1]) * u) * S + 4 - Math.sin(u * Math.PI) * 10;
    const up = u < 1 || (!k.still && Math.floor(k.sec * 2) % 2 === 0);
    lit(k, hx, hy, up ? HOPPER_UP : HOPPER, { h: "#5a3a1a", s: "#f4cca8", k: "#201010", c: "#3a8ac0", l: "#f4cca8", b: "#2a1a10" }, 2, false, "rgba(255,230,180,0.85)", -1);
    if (cl > 0.5 && !k.still) for (let i = 0; i < 20; i++) {
      const v = wrap(k.sec * 0.6 + hash(i), 1);
      k.R(hx + (hash(i + 2) - 0.5) * 40 * v, hy - v * 26, 1, 1, `rgba(250,250,240,${1 - v})`);
    }
    // her friend, wandering on her own clock, and the pigeon, the leaves
    const fr = k.wander(16, 0.5, 0.56, 0.74);
    lit(k, fr.x + cam, h * 0.72, PERSON, { h: "#2a1a10", s: "#c09070", c: "#c04a4a", d: "#3a2a2a", b: "#1a1010" }, 2, fr.dir < 0, "rgba(255,230,180,0.7)", 1);
    const pg = w * 0.7 + cam * 1.3 + (k.still ? 0 : Math.sin(k.sec * 0.4) * 10);
    sprite(k, pg, h * 0.95 - (!k.still && Math.floor(k.sec * 3) % 3 === 0 ? 1 : 0), PIGEON, { g: "#8a8a98", k: "#101010", y: "#e0a040", l: "#c06040" }, 2);
    if (!k.still) for (let i = 0; i < 6; i++) {
      const v = wrap(k.sec * 0.05 + hash(i), 1);
      k.R(w * v * 1.2 - 20, h * (0.5 + 0.4 * hash(i + 1)) + Math.sin(k.sec + i) * 6, 2, 1, ["#c06a2a", "#d0a040"][i % 2]);
    }
  },
  // D660: The Jury. A courtroom in three depths: the panelled far wall with its high window and the light falling from
  // it, the evidence board, the jury box near with its twelve. The drama: each entry a juror stands and the evidence
  // board fills; at the climax the forewoman reads the verdict, the light from the high window falling on the jury.
  wtc2f16: (k) => {
    const { w, h } = k;
    const cam = sway(k, 35);
    const cl = k.climax;
    k.vgrad(0, h, [[0, "#3a2414"], [1, "#2a1a0e"]]);
    fillTex(k, texture(k, "panels", 24, panels), 0, 0, w, h, cam * 0.3);
    // the high window and its light
    const WX = w * 0.6 + cam * 0.3;
    k.R(WX, h * 0.04, 30, h * 0.22, "#d0d8e0");
    k.R(WX + 14, h * 0.04, 2, h * 0.22, "#5a4a3a");
    k.R(WX, h * 0.14, 30, 2, "#5a4a3a");
    k.g.fillStyle = `rgba(255,250,230,${0.08 + 0.14 * cl})`;
    k.g.beginPath();
    k.g.moveTo(WX, h * 0.26);
    k.g.lineTo(WX + 30, h * 0.26);
    k.g.lineTo(w * 0.5, h);
    k.g.lineTo(w * 0.24, h);
    k.g.fill();
    for (let d = 0; d < 8; d++) {
      const u = wrap(k.t * 0.03 + hash(d), 1);
      k.R(WX + (w * 0.36 - WX) * u + 20 * hash(d + 2), h * 0.26 + h * 0.74 * u, 1, 1, "rgba(255,250,230,0.5)");
    }
    // the evidence board, filling per entry
    const EB = w * 0.26 + cam * 0.6;
    k.R(EB, h * 0.12, 50, 40, "#8a6a40");
    k.R(EB + 2, h * 0.12 + 2, 46, 36, "#c0a070");
    for (let i = 0; i < Math.min(10, k.passed); i++) {
      const px = EB + 4 + (i % 5) * 9, py = h * 0.12 + 5 + Math.floor(i / 5) * 16;
      k.R(px, py, 7, 10, i % 3 ? "#f0ece0" : "#e0d8a0");
      k.R(px + 3, py, 1, 1, "#c03030");
      k.R(px + 1, py + 3, 5, 1, "rgba(40,40,40,0.5)");
    }
    // the jury box: twelve; one more standing per entry
    const BY = h * 0.84;
    const standing = Math.min(12, k.passed) + (cl > 0.5 ? 12 : 0);
    for (let i = 0; i < 12; i++) {
      const row = i < 6 ? 0 : 1;
      const x = w * (0.28 + (i % 6) * 0.075) + cam * (0.9 + row * 0.4);
      const y = BY - (1 - row) * 10;
      const up = hash(i * 7) * 12 < standing;
      const fore = i === 8 && cl > 0.5;
      const pal = { h: ["#3a2a1a", "#d8b060", "#6a6a6a", "#2a1a14"][i % 4], s: "#e8c8a8", c: ["#2a2a3a", "#4a3a2a", "#3a4a3a", "#5a2a3a"][i % 4], d: "#1a1a20", b: "#140c0c" };
      if (fore) light(k, x, y - 20, 24, [255, 245, 220], 0.4);
      sprite(k, x, y - (fore ? 4 : 0), up || fore ? PERSON : SEATED, pal, 2);
      if (fore) k.R(x - 8, y - 14, 6, 4, "#f0ece0");
    }
    k.R(w * 0.22 + cam * 1.3, BY, w * 0.56, h - BY, "#4a2e18");
    fillTex(k, texture(k, "panels", 24, panels), w * 0.22 + cam * 1.3, BY, w * 0.56, h - BY);
    k.R(w * 0.22 + cam * 1.3, BY, w * 0.56, 2, "#8a6a40");
    if (cl > 0.01) light(k, w * 0.4, BY - 20, w * 0.3, [255, 245, 220], 0.25 * cl);
  },
  // The Mirror: a tall mirror; the room and its reflection.
  wtc2f17: (k) => {
    k.room([40, 36, 50], [24, 22, 30], 0.86, "rgba(36,30,34,1)");
    const mx = k.w * 0.5;
    k.R(mx - 30, k.h * 0.1, 60, k.h * 0.76, "rgba(110,90,50,1)");
    k.vgrad(k.h * 0.12, k.h * 0.72, [[0, "rgba(90,100,120,1)"], [1, "rgba(40,44,60,1)"]], mx - 27, 54);
    const sway = k.still ? 0 : Math.sin(k.sec * 0.6) * 2;
    k.figure(mx - 46 + sway, k.h * 0.86, "rgba(26,22,30,1)", 0, 3);
    k.figure(mx + 46 - sway, k.h * 0.86, "rgba(26,22,30,1)", 0, 3);
    k.figure(mx - 10 + sway, k.h * 0.8, "rgba(60,64,84,0.9)", 0, 2.5);
    k.figure(mx + 10 - sway, k.h * 0.8, "rgba(60,64,84,0.9)", 0, 2.5);
  },
  // D661 (design studio, the art upgrade, batch 4): The Gigue. A tavern in three depths: the beams and the plastered
  // wall, the hearth with its fire, the barrels; lanterns swinging from the beams; the fiddler on his barrel, bowing on
  // the beat, the dancers hopping round him. The drama: each entry another dancer joins the floor and the lanterns
  // swing wider; at the climax the whole tavern dancing round the fiddler, the hearth blazing.
  wtc2f18: (k) => {
    const { w, h } = k;
    const cam = sway(k, 27);
    const cl = k.climax;
    const grow = Math.min(1, k.passed / Math.max(1, k.ents.length));
    k.vgrad(0, h, [[0, "#3a2418"], [1, "#4a3020"]]);
    fillTex(k, texture(k, "stone", 40, stone), 0, 0, w, h * 0.8, cam * 0.3);
    // the hearth and its fire
    const HX = w * 0.68 + cam * 0.5, HY = h * 0.78;
    k.R(HX - 26, HY - 46, 52, 46, "#2a1a14");
    k.R(HX - 20, HY - 34, 40, 34, "#120806");
    const fh = 12 + 10 * grow + 18 * cl;
    for (const [sw2, sh2, c] of [[1, 1, "rgba(200,50,30,0.8)"], [0.7, 0.75, "rgba(255,130,40,0.9)"], [0.4, 0.5, "rgba(255,220,100,0.95)"]] as [number, number, string][])
      for (let i = 0; i < 5; i++) k.tri(HX + (i - 2) * 6, HY - 2, 10 * sw2, fh * sh2 * (k.still ? 0.9 : 0.75 + 0.25 * Math.sin(k.sec * 6 + i * 2)), c);
    light(k, HX, HY - 10, 60 + 40 * grow + 60 * cl, [255, 140, 60], 0.25 + 0.1 * grow + 0.2 * cl);
    // the beams and the swinging lanterns
    for (let i = 0; i < 4; i++) k.R(0, h * (0.04 + i * 0.0), w, 0, "#000");
    k.R(0, h * 0.06, w, 6, "#2a180e");
    const amp = 0.08 + 0.25 * grow + 0.15 * cl;
    for (let i = 0; i < 4; i++) {
      const lx = w * (0.26 + i * 0.16) + cam * 0.8;
      const a = k.still ? 0 : Math.sin(k.sec * 1.6 + i) * amp;
      const ex = lx + Math.sin(a) * 26, ey = h * 0.08 + Math.cos(a) * 26;
      k.line(lx, h * 0.08, ex, ey, "#1a1008", 1);
      k.R(ex - 3, ey, 6, 7, "#3a2a1a");
      k.R(ex - 2, ey + 1, 4, 5, "#ffd890");
      light(k, ex, ey + 4, 22, [255, 200, 110], 0.3);
    }
    // the floor and the barrels
    k.R(0, h * 0.8, w, h * 0.2, "#5a3a24");
    fillTex(k, texture(k, "panels", 24, panels), 0, h * 0.8, w, h * 0.2, cam);
    for (const bx of [0.24, 0.8]) {
      const x = w * bx + cam * 1.2;
      k.R(x - 9, h * 0.8 - 18, 18, 18, "#6a4228");
      k.R(x - 9, h * 0.8 - 14, 18, 2, "#2a1a10");
      k.R(x - 9, h * 0.8 - 6, 18, 2, "#2a1a10");
    }
    // the fiddler on his barrel, bowing on the beat
    const FX = w * 0.5 + cam;
    k.R(FX - 9, h * 0.86 - 16, 18, 16, "#7a4a2a");
    k.R(FX - 9, h * 0.86 - 12, 18, 2, "#2a1a10");
    const bow = Math.floor(k.bar * 6) % 2;
    lit(k, FX, h * 0.86 - 16, FIDDLER, { h: "#3a2010", s: "#f0c8a0", k: "#201010", c: "#3a6a3a", d: "#2a2a20", b: "#140c08", w: "#8a5a2a", f: "#6a3a1a" }, 2, false, "rgba(255,180,100,0.85)", 1);
    k.line(FX + 6, h * 0.86 - 34 + bow * 2, FX + 18, h * 0.86 - 40 - bow * 2, "#e0d0b0", 1);
    // the dancers, one more per entry, hopping on the beat round the fiddler
    const n = Math.min(10, k.passed) + (cl > 0.5 ? 4 : 0);
    const cols = ["#c03a3a", "#3a5ac0", "#c0a03a", "#3a9a5a", "#9a3ac0", "#e07030", "#6a6a8a"];
    for (let i = 0; i < n; i++) {
      const born = i === n - 1 && cl < 0.5 ? Math.min(1, k.since * 2) : 1;
      const a = k.t * 0.6 + (i * Math.PI * 2) / Math.max(1, n);
      const x = FX + Math.cos(a) * w * (0.22 + 0.04 * (i % 2)) * born;
      const y = h * 0.92 + Math.sin(a) * h * 0.05;
      const hop = k.still ? 0 : Math.abs(Math.sin(k.bar * Math.PI * 2 + i)) * 4;
      lit(k, x, y - hop, i % 2 ? PERSON : DANCER, { h: "#3a2010", s: "#f0c8a0", m: "#f0c8a0", c: cols[i % 7], g: cols[i % 7], d: "#2a2020", b: "#140c08" }, 2, Math.cos(a) > 0, "rgba(255,180,100,0.8)", Math.sign(HX - x) || 1);
    }
  },
  // D661: The Wanderer. A walk over the hills toward evening: the far ranges and the sky, the hills in many layers
  // (more of them as the view opens), the near crest with its grass; the wanderer with hat and staff on his own clock
  // (D464). The drama: each entry the wanderer reaches a new crest and the view opens wider (another range on the
  // horizon); at the climax the last hill and a valley at sunset spread out below, a river and a village's lights.
  wtc2f19: (k) => {
    const { w, h } = k;
    const cam = sway(k, 37);
    const cl = k.climax;
    k.sky([90, 130, 180], [230, 210, 170], [70, 60, 110], [250, 160, 100]);
    const sunY = h * (0.2 + 0.32 * k.p);
    light(k, w * 0.66, sunY, 70, [255, 220, 160], 0.35);
    k.disc(w * 0.66, sunY, 8, "#fff0c8");
    clouds(k, 4, 0.4, 0.06);
    // the ranges: one more on the horizon per entry
    const ranges = Math.min(7, 2 + k.passed);
    for (let r = ranges - 1; r >= 0; r--) {
      const t = r / 7;
      const base = 0.5 + 0.06 * (6 - r) - 0.08 * cl;
      k.g.save();
      k.g.translate(cam * (0.2 + 0.2 * (6 - r) / 6), 0);
      k.hills(base, 8 + r * 2, 0.01 + 0.01 * (6 - r), r + 1, rgba(mix([60, 80, 70], [170, 170, 200], t)));
      k.g.restore();
    }
    // the valley at the climax: a river, a village's lights
    if (cl > 0.01) {
      k.g.strokeStyle = `rgba(255,220,170,${0.7 * cl})`;
      k.g.lineWidth = 2;
      k.g.beginPath();
      k.g.moveTo(w * 0.3, h * 0.75);
      k.g.bezierCurveTo(w * 0.45, h * 0.62, w * 0.55, h * 0.72, w * 0.72, h * 0.6);
      k.g.stroke();
      for (let i = 0; i < 12; i++) light(k, w * (0.48 + 0.12 * hash(i)), h * (0.64 + 0.06 * hash(i + 3)), 4, [255, 210, 130], 0.6 * cl);
    }
    // the near crest
    k.g.fillStyle = "#3a4a2a";
    k.g.beginPath();
    k.g.moveTo(0, h);
    k.g.lineTo(0, h * 0.86);
    k.g.quadraticCurveTo(w * 0.5 + cam * 1.4, h * 0.78, w, h * 0.88);
    k.g.lineTo(w, h);
    k.g.fill();
    fillTex(k, texture(k, "grass", 32, grass), 0, h * 0.8, w, h * 0.2, cam * 1.4);
    const wd = k.wander(50, 0.2, 0.26, 0.74);
    const wy = h * 0.82 + Math.abs(wd.x - w * 0.5) / w * 8;
    const walk = !k.still && wd.step === 1;
    lit(k, wd.x, wy, walk ? PILGRIM_B : PILGRIM, { h: "#3a2a1a", s: "#e0b890", c: "#4a5a6a", d: "#2a3440", b: "#1a1210" }, 2, wd.dir < 0, "rgba(255,210,150,0.9)", 1);
    k.line(wd.x + 10 * wd.dir, wy, wd.x + 12 * wd.dir, wy - 34, "#5a4028", 2);
    for (let i = 0; i < 30; i++) {
      const x = (i / 30) * w + cam * 2;
      k.line(x, h, x + (k.still ? 0 : Math.sin(k.sec + i) * 2), h - 6 - hash(i) * 6, "#2a3a1e", 1);
    }
  },
  // D661: The Earthquake. A city street at dusk in three depths: the far towers, the houses along the street with
  // their windows, the cobbled road near with the crack running along it; a street lamp. The drama: each entry the
  // crack lengthens and a building leans (slowly, never a shake); at the climax the street splits wide, dust rising; at
  // the last chord stillness, the sun through the dust.
  wtc2f20: (k) => {
    const { w, h } = k;
    const cam = sway(k, 33);
    const cl = k.climax;
    k.sky([40, 36, 40], [120, 90, 70], [30, 20, 24], [140, 80, 60]);
    if (k.rest > 0.01) light(k, w * 0.6, h * 0.3, w * 0.5, [255, 210, 150], 0.35 * k.rest);
    skyline(k, 0.56, 0.02, "rgba(50,42,44,1)", 0.5);
    // the houses: one more leaning per entry
    const lean = Math.min(8, k.passed);
    for (let i = 0; i < 6; i++) {
      const x = w * (0.08 + i * 0.15) + cam * 0.7;
      const hh = h * (0.34 + 0.12 * hash(i + 4));
      const a = i < lean ? (i % 2 ? 1 : -1) * (0.02 + 0.02 * Math.min(1, (i === lean - 1 ? k.since : 1) * 2) + 0.04 * cl) : 0;
      k.g.save();
      k.g.translate(x + w * 0.06, h * 0.8);
      k.g.rotate(a);
      k.R(-w * 0.06, -hh, w * 0.12, hh, i % 2 ? "#5a4a44" : "#4a3e3c");
      fillTex(k, texture(k, "stone", 40, stone), -w * 0.06, -hh, w * 0.12, hh);
      k.tri(0, -hh, w * 0.13, 10, "#3a2e2c");
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) k.R(-w * 0.04 + c * 16, -hh + 10 + r * 16, 6, 8, hash(i * 4 + r * 2 + c) > 0.5 ? "#e0b070" : "#2a2224");
      k.g.restore();
    }
    // the road and the crack
    k.R(0, h * 0.8, w, h * 0.2, "#4a4446");
    fillTex(k, texture(k, "cobbles", 24, cobbles), 0, h * 0.8, w, h * 0.2, cam);
    const gap = 2 + 10 * cl;
    k.g.fillStyle = "#0a0808";
    k.g.beginPath();
    let x = w * 0.05;
    const pts: [number, number][] = [];
    for (let i = 0; i <= Math.min(k.passed * 3, 44); i++, x += 8) pts.push([x + cam, h * 0.89 + (hash(i) - 0.5) * 10]);
    if (pts.length > 1) {
      k.g.moveTo(pts[0][0], pts[0][1]);
      pts.forEach(([px, py]) => k.g.lineTo(px, py - gap / 2));
      for (let i = pts.length - 1; i >= 0; i--) k.g.lineTo(pts[i][0], pts[i][1] + gap / 2);
      k.g.fill();
    }
    if (cl > 0.01 && k.rest < 0.5) for (let i = 0; i < 10; i++) {
      const u = wrap(k.t * 0.15 + hash(i), 1);
      k.glow(w * (0.2 + 0.6 * hash(i * 3)), h * (0.88 - 0.4 * u), 10 + 20 * u, [170, 150, 130], 0.25 * cl * (1 - u));
    }
    // the lamp, leaning with the street
    k.g.save();
    k.g.translate(w * 0.72 + cam * 1.2, h * 0.8);
    k.g.rotate(-0.04 * lean);
    k.R(-1, -42, 3, 42, "#1e1a1c");
    light(k, 0, -44, 18, [255, 210, 140], 0.4);
    k.g.restore();
  },
  // D661: The Cradle. A nursery at night in three depths: the window and its sky, the wall with its paper and a moon
  // mobile turning slowly, the cradle near and the hearth's low fire. The drama: each entry the cradle rocks and a star
  // appears in the window; at the climax the child asleep, the window full of stars, the fire low and warm.
  wtc2f21: (k) => {
    const { w, h } = k;
    const cam = sway(k, 39);
    const cl = k.climax;
    k.vgrad(0, h * 0.82, [[0, "#2a2438"], [1, "#3a3048"]]);
    fillTex(k, texture(k, "paper", 24, wallpaper), 0, 0, w, h * 0.82, cam * 0.4);
    // the window, a star per entry
    const WX = w * 0.32 + cam * 0.4, WY = h * 0.1, WW = w * 0.2, WH = h * 0.42;
    k.R(WX - 3, WY - 3, WW + 6, WH + 6, "#e0d8c8");
    k.vgrad(WY, WH, [[0, "#0c0c2a"], [1, "#24244a"]], WX, WW);
    const ns = Math.min(30, k.passed * 2) + Math.round(30 * cl);
    for (let i = 0; i < ns; i++) {
      const sx = WX + 2 + (WW - 4) * hash(i * 7), sy = WY + 2 + (WH - 4) * hash(i * 11);
      const tw = k.still ? 1 : 0.6 + 0.4 * Math.sin(k.sec * 0.7 + i);
      light(k, sx, sy, 3, [255, 250, 220], 0.4 * tw);
      k.R(sx, sy, 1, 1, "#fffbe8");
    }
    k.R(WX + WW / 2 - 1, WY, 2, WH, "#e0d8c8");
    k.R(WX, WY + WH * 0.5, WW, 2, "#e0d8c8");
    // the mobile turning
    const MX = w * 0.6 + cam * 0.7;
    k.line(MX, 0, MX, h * 0.12, "rgba(220,220,220,0.5)");
    for (let i = 0; i < 4; i++) {
      const a = (k.still ? 0 : k.sec * 0.3) + (i * Math.PI) / 2;
      const ox = Math.cos(a) * 14;
      k.line(MX, h * 0.12, MX + ox, h * 0.18, "rgba(220,220,220,0.4)");
      if (i % 2) k.disc(MX + ox, h * 0.21, 3, "#f0e090");
      else k.tri(MX + ox, h * 0.23, 6, 6, "#f0e090");
    }
    // the hearth, low
    const HX = w * 0.82 + cam * 0.9;
    k.R(HX - 20, h * 0.5, 40, h * 0.32, "#4a3a34");
    k.R(HX - 14, h * 0.6, 28, h * 0.22, "#140a08");
    for (let i = 0; i < 4; i++) k.tri(HX + (i - 1.5) * 6, h * 0.82, 7, 6 + (k.still ? 3 : 3 * Math.sin(k.sec * 4 + i)), i % 2 ? "rgba(255,150,60,0.9)" : "rgba(255,200,90,0.9)");
    light(k, HX, h * 0.78, 50, [255, 150, 70], 0.3);
    // the floor, the rug and the cradle, rocking per entry
    k.R(0, h * 0.82, w, h * 0.18, "#4a3024");
    k.g.fillStyle = "#6a3a4a";
    k.g.beginPath();
    k.g.ellipse(w * 0.5 + cam * 1.2, h * 0.92, w * 0.16, h * 0.05, 0, 0, Math.PI * 2);
    k.g.fill();
    const rock = k.still ? 0 : Math.sin(k.sec * 2.2) * 0.12 * Math.max(0.15, Math.exp(-k.since * 1.5)) * (1 - cl);
    const CX = w * 0.5 + cam * 1.2, CY = h * 0.9;
    k.g.save();
    k.g.translate(CX, CY);
    k.g.rotate(rock);
    k.g.fillStyle = "#8a5a34";
    k.g.beginPath();
    k.g.arc(0, 0, 18, 0, Math.PI);
    k.g.fill();
    k.R(-20, -14, 40, 12, "#7a4a2a");
    k.R(-20, -14, 40, 1, "rgba(255,200,140,0.5)");
    sprite(k, 0, -12, cl > 0.5 ? BABY_SLEEP : BABY, { s: "#f4d0b0", k: "#3a2020", w: "#e8e0f0" }, 2);
    k.R(-16, -12, 32, 4, "#d0c0e0");
    k.g.restore();
    if (cl > 0.01) light(k, CX, CY - 14, 30, [255, 190, 120], 0.25 * cl);
  },
  // D661: The Colossus. A harbour under a giant statue in three depths: the sky and the far headlands, the statue on
  // its mole, stone-textured and rim-lit, the beacon in its raised hand; the harbour water near with the ships. The
  // drama: each entry a ship enters the harbour and the beacon brightens (D474's acts: afternoon, dusk, the beacon lit);
  // at the climax the low sun behind the statue, every ship's sail lit gold.
  wtc2f22: (k) => {
    const { w, h } = k;
    const cam = sway(k, 35);
    const cl = k.climax;
    k.sky([90, 120, 160], [220, 200, 170], [50, 60, 100], [230, 150, 110], 0.7);
    const dusk = k.act(2) + k.act(3) * (1 - cl);
    if (k.act(1) > 0.01) k.vgrad(0, h * 0.7, [[0, `rgba(200,140,80,${0.3 * k.act(1)})`], [1, `rgba(255,190,120,${0.45 * k.act(1)})`]]);
    if (dusk > 0.01) k.vgrad(0, h * 0.7, [[0, `rgba(30,20,60,${0.75 * dusk})`], [1, `rgba(150,70,90,${0.6 * dusk})`]]);
    const sx = w * 0.56 + cam * 0.5;
    if (cl > 0.01) {
      light(k, sx, h * 0.5, w * 0.5, [255, 190, 110], 0.45 * cl);
      k.disc(sx + 4, h * 0.56, 18 * cl, `rgba(255,220,150,${cl})`);
    }
    k.hills(0.68, 8, 0.01, 2, "rgba(70,70,90,1)");
    // the statue: legs, robe, head, raised arm, beacon; stone texture, rim light
    const st = "#5a5660";
    const rim = cl > 0.01 ? `rgba(255,200,130,${0.4 + 0.5 * cl})` : "rgba(255,230,190,0.35)";
    const body: [number, number, number, number][] = [[-12, 0.5, 9, 0.22], [3, 0.5, 9, 0.22], [-14, 0.26, 28, 0.25], [-6, 0.17, 12, 0.09], [10, 0.02, 5, 0.26], [-20, 0.3, 6, 0.14]];
    for (const [dx, y0, ww, hh] of body) {
      k.R(sx + dx - 1, h * y0, ww + 1, h * hh, rim);
      k.R(sx + dx, h * y0, ww, h * hh, st);
    }
    fillTex(k, texture(k, "stone", 40, stone), sx - 20, h * 0.02, 40, h * 0.7);
    const fire = Math.max(k.act(2), k.act(3), 0.2) * (0.6 + 0.4 * Math.min(1, k.passed / Math.max(1, k.ents.length)));
    light(k, sx + 12, h * 0.02, 24, [255, 170, 80], 0.6 * fire);
    k.R(sx + 10, h * 0.0, 6, 5, `rgba(255,210,120,${Math.min(1, fire + 0.2)})`);
    k.R(sx - 24, h * 0.72 - 6, 48, 6, "#3a3640");
    // the water and the ships, one per entry
    k.vgrad(h * 0.7, h * 0.3, [[0, "rgba(60,90,120,1)"], [1, "rgba(30,50,70,1)"]]);
    if (cl > 0.01) k.vgrad(h * 0.7, h * 0.3, [[0, `rgba(255,190,110,${0.35 * cl})`], [1, "rgba(255,190,110,0)"]]);
    for (let y = h * 0.74; y < h; y += 6) k.R(wrap(y * 17 + k.t * 5, w), y, 12, 1, "rgba(200,220,240,0.18)");
    const n = Math.min(9, k.passed);
    for (let i = 0; i < n; i++) {
      const born = i === n - 1 ? Math.min(1, k.since * 1.5) : 1;
      const tx = w * (0.24 + 0.06 * i + (i % 2) * 0.03);
      const x = -30 + (tx + 30) * born + cam * (1 + (i % 2) * 0.4) + (k.still ? 0 : Math.sin(k.sec * 0.6 + i) * 2);
      const y = h * (0.8 + (i % 3) * 0.06) + (k.still ? 0 : Math.sin(k.sec * 1.1 + i) * 1);
      const sail = cl > 0.01 ? rgba(mix([230, 222, 205], [255, 200, 110], cl)) : "#e6dccc";
      k.R(x, y, 16, 3, "#3a2618");
      k.R(x + 2, y - 1, 12, 1, "#5a3a24");
      k.R(x + 7, y - 14, 1, 14, "#3a2618");
      k.tri(x + 8, y - 2, 12, 11, sail);
      k.R(x + 2, y + 4, 14, 1, "rgba(0,0,0,0.25)");
    }
  },
  // D661: The Elegy. A churchyard at dusk in three depths: the far church and the hills, the willow over the grave, its
  // strands swaying, the grave near with the mourner kneeling, fireflies. The drama: each entry a flower is laid at the
  // grave and the willow stirs; at the climax the moon rises over the grave, the flowers silver, the willow still.
  wtc2f23: (k) => {
    const { w, h } = k;
    const cam = sway(k, 41);
    const cl = k.climax;
    k.sky([60, 60, 100], [160, 120, 130], [20, 22, 50], [60, 50, 80]);
    k.stars(40, 0.4);
    const my = h * (0.6 - 0.45 * cl);
    if (cl > 0.01) {
      light(k, w * 0.36, my, 60, [220, 225, 240], 0.35 * cl);
      k.disc(w * 0.36, my, 9, `rgba(240,240,225,${cl})`);
    }
    k.hills(0.66, 10, 0.01, 3, "rgba(40,40,60,1)");
    k.g.save();
    k.g.translate(cam * 0.4, 0);
    k.R(w * 0.16, h * 0.46, 22, h * 0.2, "#2a2a3a");
    k.tri(w * 0.16 + 11, h * 0.46, 26, 12, "#2a2a3a");
    k.R(w * 0.16 + 8, h * 0.3, 6, h * 0.16, "#2a2a3a");
    k.tri(w * 0.16 + 11, h * 0.3, 8, 10, "#2a2a3a");
    k.g.restore();
    k.R(0, h * 0.8, w, h * 0.2, "#2a3424");
    fillTex(k, texture(k, "grass", 32, grass), 0, h * 0.8, w, h * 0.2, cam);
    // the willow: strands swaying, still at the climax; stirring at each entry
    const TX = w * 0.6 + cam * 0.8;
    k.R(TX - 4, h * 0.34, 8, h * 0.48, "#2a2018");
    k.disc(TX, h * 0.3, 26, "#2a3a26");
    const stir = (k.since < 1 ? 1 - k.since : 0) * 3;
    const swing = (k.still ? 0 : 1) * (1 - cl);
    for (let i = 0; i < 28; i++) {
      const x0 = TX + (i - 14) * 3;
      const len = h * (0.2 + 0.18 * hash(i));
      const dx = swing * (Math.sin(k.sec * 0.6 + i * 0.3) * 3 + Math.sin(k.sec * 3 + i) * stir);
      k.line(x0, h * 0.28, x0 + dx, h * 0.28 + len, i % 3 ? "#3a5a34" : "#4a6a3c", 1);
    }
    // the grave, the flowers laid one per entry, the mourner
    const GX = w * 0.46 + cam * 1.2;
    k.R(GX - 8, h * 0.82 - 22, 16, 22, "#6a6870");
    k.disc(GX, h * 0.82 - 22, 8, "#6a6870");
    k.R(GX - 8, h * 0.82 - 24, 1, 22, "rgba(255,255,255,0.15)");
    k.R(GX - 12, h * 0.82, 24, 3, "#3a3020");
    const nf = Math.min(12, k.passed);
    for (let i = 0; i < nf; i++) {
      const c = cl > 0.3 ? rgba(mix([220, 80, 100], [220, 225, 240], cl)) : ["#d04060", "#f0f0f0", "#e0c040"][i % 3];
      const fx = GX - 10 + (i % 6) * 4, fy = h * 0.82 - (i >= 6 ? 3 : 0);
      k.R(fx, fy - 2, 1, 3, "#3a5a2a");
      k.R(fx - 1, fy - 4, 3, 2, c);
    }
    lit(k, GX - 26, h * 0.86, KNEELER, { h: "#2a2232", d: "#18121e", f: "#06040a" }, 2, false, rgba(cl > 0.01 ? [220, 225, 240] : [255, 190, 150], 0.4), 1);
    if (!k.still) for (let i = 0; i < 8; i++) {
      const fx = w * (0.3 + 0.5 * hash(i)) + Math.sin(k.sec * 0.4 + i) * 16;
      const fy = h * (0.6 + 0.2 * hash(i + 2)) + Math.sin(k.sec * 0.7 + i * 2) * 6;
      light(k, fx, fy, 4, [210, 255, 150], 0.3 * (0.5 + 0.5 * Math.sin(k.sec * 1.1 + i * 2)));
    }
  },
  // D661: The Last Dance. A ballroom emptying in three depths: the arches and the tall dark windows, the candles in
  // their sconces going out, the floor with the couples; the light gathering as it fades. The drama: each entry a
  // couple leaves the ballroom and a candle goes out; at the climax the last couple dances alone in one candle's pool
  // of light; at the last chord darkness, and the image held.
  wtc2f24: (k) => {
    const { w, h } = k;
    const cam = sway(k, 41);
    const cl = k.climax;
    const n = 9;
    const left = Math.max(1, n - k.passed);
    k.vgrad(0, h * 0.84, [[0, "#241828"], [1, "#342438"]]);
    fillTex(k, texture(k, "paper", 24, wallpaper), 0, 0, w, h * 0.84, cam * 0.3);
    arches(k, "rgba(14,8,14,0.85)", 4);
    for (let i = 0; i < 3; i++) {
      const x = w * (0.3 + i * 0.2) + cam * 0.3;
      k.R(x - 8, h * 0.14, 16, h * 0.4, "#141228");
      k.disc(x, h * 0.14, 8, "#141228");
      for (let s2 = 0; s2 < 3; s2++) k.R(x - 6 + s2 * 5, h * 0.2 + s2 * 9, 1, 1, "rgba(255,250,220,0.6)");
    }
    // the sconces, one going out per entry
    for (let i = 0; i < n; i++) {
      const x = w * (0.1 + (0.8 * i) / (n - 1)) + cam * 0.5;
      const on = i < left || (cl > 0.5 && i === 4);
      k.R(x - 3, h * 0.42, 7, 2, "#8a7040");
      k.R(x - 1, h * 0.42 - 6, 3, 6, "rgba(230,220,200,0.85)");
      if (on) {
        const fl = k.still ? 0 : Math.sin(k.sec * 8 + i) * 0.5;
        light(k, x, h * 0.42 - 8, 16, [255, 190, 100], 0.35 * (1 - k.rest));
        k.R(x + fl, h * 0.42 - 9, 2, 3, "#ffe08a");
      } else if (!k.still && i === left && k.since < 1.5) k.glow(x, h * 0.42 - 12 - k.since * 8, 4, [200, 200, 210], 0.3 * (1 - k.since / 1.5));
    }
    k.R(0, h * 0.84, w, h * 0.16, "#3a2414");
    fillTex(k, texture(k, "parquet", 16, parquet), 0, h * 0.84, w, h * 0.16, cam);
    // the couples, one leaving per entry; the last alone in one pool of light
    const couples = cl > 0.5 ? 1 : Math.max(1, 6 - k.passed);
    const gowns = ["#c03a5a", "#3a6ac0", "#e0b040", "#5aa070", "#a050c0", "#e07030"];
    if (cl > 0.01) {
      k.R(0, 0, w, h, `rgba(0,0,0,${0.35 * cl})`);
      light(k, w * 0.5, h * 0.84, 50, [255, 200, 120], 0.45 * cl * (1 - k.rest));
    }
    for (let i = 0; i < couples; i++) {
      const a = k.t * 0.5 + (i * Math.PI * 2) / couples;
      const r = couples === 1 ? 6 : w * 0.18;
      const x = w * 0.5 + Math.cos(a) * r + cam * 1.1;
      const y = h * 0.92 + Math.sin(a) * (couples === 1 ? 2 : h * 0.04);
      lit(k, x - 7, y, DANCER, { h: "#3a2010", m: "#f0c8a0", s: "#f0c8a0", g: gowns[i] }, 2, false, "rgba(255,210,150,0.8)", 0, -1);
      lit(k, x + 7, y, PARTNER, { h: "#1a1010", m: "#f0c8a0", s: "#f0c8a0", k: "#141018", w: "#f0f0f0", b: "#0a0808" }, 2, true, "rgba(255,210,150,0.8)", 0, -1);
    }
    if (k.rest > 0.01) k.R(0, 0, w, h, `rgba(0,0,0,${0.6 * k.rest})`);
  },
};

/**
 * D474 (design studio; the owner: "visual changes, background variety during the fugue, climactic changes"; "Don't
 * meddle with the MUSIC. Make the music shine"): the world as a drama in the fugue's form (form-points.ts). Each act
 * (the exposition, the middle entries in one or two acts, the final group) has its own look: the light (a tint over
 * the world), the weather, the camera (a tilt and a slight zoom about the play line, so what the world sets for an
 * entry still passes the line as it sounds); an episode is the way from one act's look to the next, and dimmer,
 * sparser, slower; an entry is charged. The climax builds into the last entry and holds to the last cadence: the
 * world lit, a light breaking where the world keeps it; at the last chord the image is held still.
 */
type Weather = "none" | "rain" | "snow" | "mist" | "motes" | "stars" | "embers" | "shafts";
interface Look {
  /** The light over the world: a colour and how much of it. */
  tint?: [C3, number];
  weather?: Weather;
  /** The camera: a slight zoom (1 to 1.08: zoom subtly) and a tilt (a share of the height, + down). */
  zoom?: number;
  tilt?: number;
}
interface Script {
  acts: Look[];
  /** Where the climax's light breaks (shares of the canvas) and its colour. */
  climax: { x: number; y: number; c: C3; rays?: boolean };
  /** The held image at the last chord. */
  rest: [C3, number];
}
const NIGHT_BLUE: C3 = [40, 60, 120];
const DUSK_GOLD: C3 = [230, 150, 80];
const SCRIPTS: Record<string, Script> = {
  // The Requiem: the dark nave; moonlight through the windows; the vaults, incense in the air; dawn through the rose window.
  wtc1f12: {
    acts: [{}, { tint: [NIGHT_BLUE, 0.2], weather: "shafts", tilt: 0.03, zoom: 1.03 }, { tint: [[150, 110, 60], 0.14], weather: "motes", tilt: -0.05, zoom: 1.06 }, { tint: [[255, 220, 170], 0.1], zoom: 1 }],
    climax: { x: 0.5, y: 0.1, c: [255, 226, 180], rays: true },
    rest: [[220, 210, 190], 0.1],
  },
  // Faust: the study at night; the storm at the window; the sign's red hour, embers; the sign blazes, the room revealed.
  wtc1f24: {
    acts: [{}, { tint: [NIGHT_BLUE, 0.22], weather: "rain", tilt: 0.02, zoom: 1.03 }, { tint: [[150, 40, 40], 0.16], weather: "embers", tilt: -0.04, zoom: 1.07 }, { tint: [[200, 230, 255], 0.08], zoom: 1 }],
    climax: { x: 0.68, y: 0.36, c: [200, 235, 255], rays: true },
    rest: [[150, 160, 180], 0.14],
  },
  // The Colossus: the harbour by day; the afternoon; dusk and the sea mist; the low sun breaking behind the statue.
  wtc2f22: {
    acts: [{}, { tint: [DUSK_GOLD, 0.14], weather: "motes", tilt: 0.02, zoom: 1.03 }, { tint: [[90, 60, 120], 0.24], weather: "mist", tilt: -0.03, zoom: 1.06 }, { tint: [[255, 180, 100], 0.1], zoom: 1 }],
    climax: { x: 0.65, y: 0.3, c: [255, 200, 120], rays: true },
    rest: [[30, 40, 90], 0.22],
  },
};
/** A script in short: acts II and III as [colour, amount, weather, tilt, zoom]; the climax's light [x, y, colour, rays]; the rest. */
type Act = [C3, number, Weather?, number?, number?];
const sk = (ii: Act, iii: Act, climax: [number, number, C3, boolean?], rest: [C3, number]): Script => {
  const L = (a: Act): Look => ({ tint: [a[0], a[1]], weather: a[2] ?? "none", tilt: a[3] ?? 0, zoom: a[4] ?? 1 });
  return { acts: [{}, L(ii), L(iii), { tint: [climax[2], 0.08], zoom: 1 }], climax: { x: climax[0], y: climax[1], c: climax[2], rays: climax[3] ?? true }, rest };
};
const GOLD: C3 = [240, 190, 110];
const WARM: C3 = [255, 220, 170];
const COOL: C3 = [80, 110, 180];
const DUSK_NIGHT: C3 = [30, 40, 100];
const VIOLET: C3 = [100, 60, 130];
const SILVER: C3 = [210, 225, 255];
const EMBER: C3 = [230, 110, 50];
const GREY: C3 = [120, 120, 130];
const SEPIA: C3 = [150, 110, 60];
Object.assign(SCRIPTS, {
  // The Canon: the footlights warm; a cold spot from above; the whole stage lit.
  wtc1f01: sk([GOLD, 0.12, "motes", 0.02, 1.03], [COOL, 0.16, "shafts", -0.03, 1.05], [0.5, 0.05, WARM], [WARM, 0.08]),
  // The Imp: the fire lower, embers; the cave's blue depths; the fire flaring up.
  wtc1f02: sk([EMBER, 0.12, "embers", 0.02, 1.03], [DUSK_NIGHT, 0.2, "mist", 0.03, 1.06], [0.5, 0.8, [255, 160, 80], false], [EMBER, 0.1]),
  // The Stone-Skipper: the golden hour; dusk on the pond; the sunset on the water.
  wtc1f03: sk([GOLD, 0.14, "motes", 0.02, 1.03], [VIOLET, 0.2, "mist", -0.02, 1.05], [0.7, 0.45, [255, 200, 120]], [DUSK_NIGHT, 0.2]),
  // The Cross: night comes, the stars; the dark and the mist; dawn behind the cross.
  wtc1f04: sk([DUSK_NIGHT, 0.2, "stars", -0.03, 1.03], [DUSK_NIGHT, 0.26, "mist", 0.02, 1.06], [0.55, 0.2, [255, 210, 150]], [[230, 210, 200], 0.1]),
  // The Coronation: the window's light in shafts; the banners' red; the window ablaze.
  wtc1f05: sk([GOLD, 0.12, "shafts", -0.03, 1.03], [[170, 50, 50], 0.12, "motes", 0.02, 1.06], [0.5, 0.15, WARM], [WARM, 0.08]),
  // The Ambush: dusk and mist in the trees; night and rain; the moon rising over the road.
  wtc1f06: sk([COOL, 0.18, "mist", 0.02, 1.03], [DUSK_NIGHT, 0.24, "rain", 0.03, 1.06], [0.8, 0.15, SILVER], [GREY, 0.14]),
  // The Bicycle: the noon heat; the late afternoon; the sun at the road's end.
  wtc1f07: sk([GOLD, 0.1, "motes", 0.02, 1.03], [EMBER, 0.14, "none", -0.02, 1.05], [0.85, 0.4, [255, 210, 130]], [VIOLET, 0.16]),
  // The Pilgrim: evening; night, the stars; the shrine's light at the road's end.
  wtc1f08: sk([EMBER, 0.14, "none", 0.02, 1.03], [DUSK_NIGHT, 0.2, "stars", -0.03, 1.05], [0.9, 0.6, GOLD], [DUSK_NIGHT, 0.2]),
  // The Sparrow: the clouds gathering; a shower over the roofs; the sun breaking through.
  wtc1f09: sk([GREY, 0.14, "none", -0.02, 1.03], [COOL, 0.16, "rain", 0.02, 1.05], [0.7, 0.1, WARM], [GOLD, 0.08]),
  // The Two Horsemen: the full day, dust; a dust storm; the sun high over the plain.
  wtc1f10: sk([GOLD, 0.08, "motes", 0.02, 1.03], [[170, 130, 70], 0.16, "mist", 0.03, 1.06], [0.5, 0.05, WARM], [EMBER, 0.12]),
  // The Shepherdess: midday; an afternoon shower; the light after the rain.
  wtc1f11: sk([GOLD, 0.08, "motes", 0.02, 1.03], [COOL, 0.12, "rain", -0.02, 1.05], [0.3, 0.1, WARM], [GOLD, 0.1]),
  // The Aquarium: deeper, plankton drifting; the light from the surface in shafts; the sun on the water above.
  wtc1f13: sk([DUSK_NIGHT, 0.14, "motes", 0.03, 1.03], [[20, 80, 70], 0.16, "shafts", -0.03, 1.05], [0.5, 0, [170, 240, 230]], [DUSK_NIGHT, 0.14]),
  // Pierrot: the moon brighter, the stars; clouds over it; the moon full.
  wtc1f14: sk([SILVER, 0.08, "stars", -0.02, 1.03], [VIOLET, 0.16, "mist", 0.02, 1.05], [0.7, 0.2, SILVER], [DUSK_NIGHT, 0.12]),
  // The Pinball: the neon turns magenta; blue, sparks; the jackpot's glow.
  wtc1f15: sk([[200, 60, 160], 0.1, "none", 0.02, 1.03], [COOL, 0.14, "motes", -0.02, 1.05], [0.5, 0.15, [255, 220, 120]], [DUSK_NIGHT, 0.12]),
  // The Knight: candlelight on the board; the cold of the endgame; the mate's light.
  wtc1f16: sk([GOLD, 0.1, "none", 0.02, 1.03], [COOL, 0.16, "mist", -0.02, 1.05], [0.5, 0.1, SILVER], [GREY, 0.12]),
  // The Diary: the afternoon sun; evening rain at the window; the sunset through it.
  wtc1f17: sk([GOLD, 0.1, "motes", 0.02, 1.03], [COOL, 0.16, "rain", -0.02, 1.05], [0.8, 0.3, [255, 200, 130]], [VIOLET, 0.14]),
  // The Sleepwalker: mist over the roofs; the deep night, stars; dawn on the roofs.
  wtc1f18: sk([GREY, 0.14, "mist", 0.02, 1.03], [DUSK_NIGHT, 0.18, "stars", -0.03, 1.05], [0.2, 0.3, [255, 190, 170]], [[230, 200, 200], 0.1]),
  // The Three Stooges: the sepia warmer; dust in the projector's light; the projector's beam.
  wtc1f19: sk([SEPIA, 0.1, "none", 0.02, 1.03], [GREY, 0.14, "motes", -0.02, 1.05], [0.5, 0, [250, 240, 210]], [SEPIA, 0.14]),
  // The Locomotive: the moonlit country, stars; rain on the line; dawn ahead.
  wtc1f20: sk([DUSK_NIGHT, 0.14, "stars", -0.02, 1.03], [COOL, 0.16, "rain", 0.02, 1.05], [0.9, 0.5, GOLD], [[230, 210, 190], 0.1]),
  // The Marionettes: the stage warm; a cold light in shafts; the spotlight.
  wtc1f21: sk([GOLD, 0.1, "motes", 0.02, 1.03], [COOL, 0.14, "shafts", -0.02, 1.05], [0.5, 0.05, WARM], [DUSK_NIGHT, 0.12]),
  // The Procession: the mist in the street; snow; every lantern lit.
  wtc1f22: sk([GREY, 0.14, "mist", 0.02, 1.03], [COOL, 0.14, "snow", -0.02, 1.05], [0.6, 0.85, GOLD, false], [DUSK_NIGHT, 0.12]),
  // The Gramophone: the lamp's warmth; moonlight in shafts; the lamp blooming.
  wtc1f23: sk([GOLD, 0.1, "motes", 0.02, 1.03], [COOL, 0.14, "shafts", -0.02, 1.05], [0.25, 0.4, WARM, false], [DUSK_NIGHT, 0.12]),
  // The Olympian: the floodlights whiter; rain on the track; the floodlights full.
  wtc2f01: sk([SILVER, 0.08, "motes", -0.02, 1.03], [COOL, 0.14, "rain", 0.02, 1.05], [0.5, 0.05, SILVER], [GOLD, 0.1]),
  // The Shadows: the sunset deeper; dusk; the last of the sun.
  wtc2f02: sk([EMBER, 0.14, "none", 0.02, 1.03], [VIOLET, 0.18, "none", -0.02, 1.05], [0.85, 0.55, [255, 190, 110]], [DUSK_NIGHT, 0.2]),
  // The Switchboard: amber; green, sparks; every jack lit.
  wtc2f03: sk([GOLD, 0.1, "none", 0.02, 1.03], [[60, 160, 90], 0.1, "motes", -0.02, 1.05], [0.5, 0.2, [255, 200, 110]], [DUSK_NIGHT, 0.1]),
  // The Chase: rain on the road; the mist; the searchlights from above.
  wtc2f04: sk([COOL, 0.12, "rain", 0.02, 1.03], [GREY, 0.14, "mist", -0.02, 1.05], [0.5, 0, SILVER], [DUSK_NIGHT, 0.14]),
  // The Bell Tower: dusk; night, the stars; the tower lit gold.
  wtc2f05: sk([EMBER, 0.14, "none", -0.02, 1.03], [DUSK_NIGHT, 0.2, "stars", -0.03, 1.05], [0.5, 0.2, GOLD], [DUSK_NIGHT, 0.18]),
  // The Catapult: the afternoon; the storm; the sun breaking.
  wtc2f06: sk([GOLD, 0.1, "motes", 0.02, 1.03], [DUSK_NIGHT, 0.18, "rain", 0.02, 1.05], [0.7, 0.1, WARM], [EMBER, 0.1]),
  // The Organist: candlelight; a cool light in shafts; the pipes ablaze.
  wtc2f07: sk([GOLD, 0.1, "motes", -0.02, 1.03], [COOL, 0.12, "shafts", -0.03, 1.05], [0.5, 0.1, WARM], [WARM, 0.08]),
  // The Rain: harder; the storm; the rain gone, the window lit.
  wtc2f08: sk([COOL, 0.1, "rain", 0.02, 1.03], [DUSK_NIGHT, 0.16, "rain", 0.03, 1.06], [0.7, 0.3, WARM, false], [DUSK_NIGHT, 0.1]),
  // The Chorale: the window's light in shafts; candles; the light from above.
  wtc2f09: sk([GOLD, 0.1, "shafts", -0.02, 1.03], [EMBER, 0.1, "motes", 0.02, 1.05], [0.5, 0, WARM], [WARM, 0.08]),
  // The Crook: the string lights; rain on the fair; the whole fair aglow.
  wtc2f10: sk([GOLD, 0.1, "motes", 0.02, 1.03], [COOL, 0.14, "rain", 0.02, 1.05], [0.5, 0.1, [255, 170, 200]], [DUSK_NIGHT, 0.12]),
  // The Butterfly: midday; a shower; the sun.
  wtc2f11: sk([GOLD, 0.08, "motes", 0.02, 1.03], [COOL, 0.12, "rain", -0.02, 1.05], [0.6, 0.05, WARM], [GOLD, 0.1]),
  // The Masquerade: the red deeper; blue and smoke; the chandeliers ablaze.
  wtc2f12: sk([[160, 40, 60], 0.12, "motes", 0.02, 1.03], [COOL, 0.14, "mist", -0.02, 1.05], [0.5, 0.1, GOLD], [EMBER, 0.1]),
  // The Telephone: the evening lamp; the night in shafts; the lamp blooming.
  wtc2f13: sk([GOLD, 0.1, "none", 0.02, 1.03], [DUSK_NIGHT, 0.14, "shafts", -0.02, 1.05], [0.3, 0.3, WARM, false], [DUSK_NIGHT, 0.12]),
  // The Three Sisters: autumn, the leaves; winter, snow; the spring light.
  wtc2f14: sk([EMBER, 0.12, "motes", 0.02, 1.03], [COOL, 0.14, "snow", -0.02, 1.05], [0.5, 0.1, [230, 255, 200]], [GOLD, 0.08]),
  // Hopscotch: the afternoon; a shower; the sun.
  wtc2f15: sk([GOLD, 0.1, "none", 0.02, 1.03], [COOL, 0.12, "rain", 0.02, 1.05], [0.7, 0.1, WARM], [EMBER, 0.1]),
  // The Jury: evening; the lamps, dust in the air; the light from the high window.
  wtc2f16: sk([EMBER, 0.12, "none", 0.02, 1.03], [GOLD, 0.1, "motes", -0.02, 1.05], [0.3, 0.05, SILVER], [GREY, 0.12]),
  // The Mirror: candlelight; a cold mist; the mirror shining.
  wtc2f17: sk([GOLD, 0.1, "motes", 0.02, 1.03], [COOL, 0.14, "mist", -0.02, 1.05], [0.5, 0.35, SILVER], [DUSK_NIGHT, 0.12]),
  // The Gigue: the lanterns; the late night, embers; the hearth blooming.
  wtc2f18: sk([GOLD, 0.1, "motes", 0.02, 1.03], [DUSK_NIGHT, 0.14, "embers", 0.02, 1.05], [0.2, 0.7, [255, 170, 90], false], [EMBER, 0.12]),
  // The Wanderer: the afternoon; evening mist; the sunset.
  wtc2f19: sk([GOLD, 0.1, "none", 0.02, 1.03], [VIOLET, 0.16, "mist", -0.02, 1.05], [0.8, 0.45, [255, 190, 120]], [DUSK_NIGHT, 0.2]),
  // The Earthquake: dust; the dark, the dust thick; the sun through it.
  wtc2f20: sk([SEPIA, 0.12, "motes", 0.02, 1.03], [DUSK_NIGHT, 0.18, "mist", 0.03, 1.06], [0.6, 0.1, WARM], [GREY, 0.14]),
  // The Cradle: the fire, embers; the night; the fire blooming.
  wtc2f21: sk([EMBER, 0.1, "embers", 0.02, 1.03], [DUSK_NIGHT, 0.12, "none", -0.02, 1.05], [0.3, 0.7, [255, 180, 100], false], [EMBER, 0.1]),
  // The Elegy: night, the stars; the mist; the moon rising.
  wtc2f23: sk([DUSK_NIGHT, 0.16, "stars", -0.02, 1.03], [GREY, 0.16, "mist", 0.02, 1.05], [0.75, 0.2, SILVER], [[200, 200, 220], 0.12]),
  // The Last Dance: the hall deeper; blue; the last candle blooming.
  wtc2f24: sk([EMBER, 0.12, "motes", 0.02, 1.03], [COOL, 0.14, "none", -0.02, 1.05], [0.5, 0.35, GOLD, false], [EMBER, 0.12]),
});
/** The look between two (the episode's way from one act to the next). */
function blend(a: Look, b: Look, t: number): Required<Omit<Look, "weather">> & { wa: Weather; wb: Weather; t: number } {
  const ga = a.tint ?? [b.tint?.[0] ?? [0, 0, 0], 0];
  const gb = b.tint ?? [a.tint?.[0] ?? [0, 0, 0], 0];
  return {
    tint: [mix(ga[0], gb[0], t), ga[1] + (gb[1] - ga[1]) * t],
    zoom: (a.zoom ?? 1) + ((b.zoom ?? 1) - (a.zoom ?? 1)) * t,
    tilt: (a.tilt ?? 0) + ((b.tilt ?? 0) - (a.tilt ?? 0)) * t,
    wa: a.weather ?? "none",
    wb: b.weather ?? "none",
    t,
  };
}
/** The weather over the world: `amt` 0..1 (an episode's sparser). Slow and soft: nothing flashes. */
function weather(k: Kit, kind: Weather, amt: number) {
  if (kind === "none" || amt <= 0.01) return;
  const { g, w, h } = k;
  const t = k.t;
  if (kind === "rain") {
    const n = Math.round(70 * amt);
    for (let i = 0; i < n; i++) {
      const x = wrap(hash(i) * w * 1.2 - t * 60 * (0.8 + hash(i + 7) * 0.4), w * 1.2) - w * 0.1;
      const y = wrap(hash(i + 3) * h + t * 160 * (0.8 + hash(i + 9) * 0.4), h + 10) - 10;
      k.R(x, y, 1, 4, `rgba(170,190,230,${0.32 * amt})`);
    }
  } else if (kind === "snow") {
    for (let i = 0; i < 50 * amt; i++) k.R(wrap(hash(i) * w + Math.sin(t * 0.6 + i) * 6, w), wrap(hash(i + 3) * h + t * 14, h), 1, 1, `rgba(240,240,255,${0.5 * amt})`);
  } else if (kind === "mist") {
    for (let i = 0; i < 4; i++) {
      const y = h * (0.55 + i * 0.1);
      const x = wrap(t * (3 + i) + i * 90, w * 1.5) - w * 0.25;
      k.glow(x, y, w * 0.4, [200, 190, 220], 0.14 * amt);
      k.glow(x - w * 0.55, y, w * 0.4, [200, 190, 220], 0.14 * amt);
    }
  } else if (kind === "motes" || kind === "embers") {
    const c = kind === "embers" ? "255,140,70" : "255,230,170";
    for (let i = 0; i < 40 * amt; i++) {
      const x = wrap(hash(i) * w + Math.sin(t * 0.3 + i) * 10, w);
      const y = wrap(hash(i + 5) * h - t * (kind === "embers" ? 10 : 3) * (0.5 + hash(i + 2)), h);
      k.R(x, y, 1, 1, `rgba(${c},${(0.35 + 0.35 * Math.sin(t + i)) * amt})`);
    }
  } else if (kind === "stars") {
    for (let i = 0; i < 60 * amt; i++) k.R(hash(i) * w, hash(i + 11) * h * 0.5, 1, 1, `rgba(255,255,240,${(0.3 + 0.3 * Math.sin(t * 0.7 + i * 3)) * amt})`);
  } else if (kind === "shafts") {
    g.fillStyle = `rgba(150,170,230,${0.12 * amt})`;
    for (let r = 0; r < 3; r++) {
      const x0 = w * (0.2 + r * 0.25);
      g.beginPath();
      g.moveTo(x0, 0);
      g.lineTo(x0 + 14, 0);
      g.lineTo(x0 + w * 0.12 + 22, h);
      g.lineTo(x0 + w * 0.12, h);
      g.closePath();
      g.fill();
    }
  }
}
/** The climax's light: a slow bloom where the world keeps it, and soft rays; `a` 0..1. */
function bloom(k: Kit, s: Script["climax"], a: number) {
  if (a <= 0.01) return;
  const { g, w, h } = k;
  const x = w * s.x;
  const y = h * s.y;
  k.glow(x, y, h * (0.6 + 0.9 * a), s.c, 0.5 * a);
  g.fillStyle = rgba(s.c, 0.05 * a);
  g.fillRect(0, 0, w, h);
  if (!s.rays) return;
  g.fillStyle = rgba(s.c, 0.06 * a);
  const turn = k.t * 0.02;
  for (let r = 0; r < 7; r++) {
    const th = turn + (r * Math.PI * 2) / 7;
    const th2 = th + 0.12;
    const L = w * 1.2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(th) * L, y + Math.sin(th) * L);
    g.lineTo(x + Math.cos(th2) * L, y + Math.sin(th2) * L);
    g.closePath();
    g.fill();
  }
}

/**
 * D650 (design studio; the owner: "some backgrounds are too dark. For example, the catapult one is so dark that one can
 * barely see the catapult attacking the castle"): each dark world lifted, the world itself, never the veil over the note
 * band. Measured (tools: the stage alone, mean luminance over the box between the bars at the exposition, the middle and
 * the climax, with MusicBox's D478 shade): a world whose darkest moment is under 0.17 gets a soft light screened over it,
 * (T - L) / (1 - L), at most 0.13, so night worlds stay night but their objects read.
 */
const WORLD_LIFT: Readonly<Record<string, number>> = { wtc1f01: 0.111, wtc1f02: 0.13, wtc1f04: 0.036, wtc1f05: 0.11, wtc1f06: 0.088, wtc1f08: 0.02, wtc1f12: 0.13, wtc1f13: 0.064, wtc1f14: 0.089, wtc1f15: 0.13, wtc1f18: 0.115, wtc1f19: 0.029, wtc1f20: 0.078, wtc1f21: 0.088, wtc1f22: 0.107, wtc1f23: 0.081, wtc1f24: 0.118, wtc2f01: 0.058, wtc2f03: 0.112, wtc2f04: 0.116, wtc2f05: 0.026, wtc2f07: 0.081, wtc2f08: 0.099, wtc2f09: 0.095, wtc2f10: 0.103, wtc2f12: 0.109, wtc2f13: 0.052, wtc2f15: 0.046, wtc2f16: 0.079, wtc2f17: 0.07, wtc2f18: 0.067, wtc2f20: 0.041, wtc2f21: 0.105, wtc2f24: 0.113 };
/** The daylight worlds: a heavier veil, so the notes keep their contrast over a bright sky. */
const BRIGHT = new Set(["wtc1f03", "wtc1f07", "wtc1f09", "wtc1f10", "wtc1f11", "wtc2f06", "wtc2f11", "wtc2f14", "wtc2f19", "wtc2f22", "wtc2f15"]);

/** The pieces that have a world. */
export const STAGE_IDS: readonly string[] = Object.keys(WORLDS);
export const hasStage = (id: string | undefined) => !!id && id in WORLDS;

const KIT = new Kit();
type Piece = { ents: number[]; themes: number[]; cads: number[]; end: number; spans: { on: number; end: number; other: boolean; voice: number }[]; dens: number[]; dLo: number; dHi: number; strettos: number[] };
const memo = new Map<string, Piece>();
const isMinor = (key: string) => key.charAt(0) === key.charAt(0).toLowerCase();
function piece(f: TouchFugue): Piece {
  let m = memo.get(f.id);
  if (m) return m;
  const home = isMinor(f.key);
  // D464: the notes struck in each bar (all voices), and the piece's own quiet and busy bars (10th and 90th centiles).
  const nb = Math.max(1, Math.ceil(f.length / f.barTicks));
  const dens = new Array<number>(nb).fill(0);
  for (const v of f.voices) for (const n of v) dens[Math.min(nb - 1, Math.floor(n[0] / f.barTicks))]++;
  const sorted = [...dens].sort((a, b) => a - b);
  m = {
    ents: f.entries.map((e) => e.on).sort((a, b) => a - b),
    themes: [...f.entries].sort((a, b) => a.on - b.on).map((e) => e.theme ?? 1),
    cads: f.cadences.map((c) => c.on),
    end: f.length,
    spans: f.entries.map((e) => ({ on: e.on, end: e.end, other: isMinor(e.key) !== home, voice: e.voice })),
    strettos: f.entries.filter((e) => f.entries.some((o) => o !== e && o.on < e.on && o.end > e.on)).map((e) => e.on).sort((a, b) => a - b),
    dens,
    dLo: sorted[Math.floor(nb * 0.1)] ?? 0,
    dHi: Math.max((sorted[Math.floor(nb * 0.9)] ?? 1), (sorted[Math.floor(nb * 0.1)] ?? 0) + 1),
  };
  memo.set(f.id, m);
  return m;
}
/** D464: the eased states, kept per piece between frames (and the wall clock of the last frame). */
const eased = new Map<string, { turn: number; stretto: number; busy: number; at: number }>();
const ease = (from: number, to: number, dt: number, s: number) => from + (to - from) * Math.min(1, dt / s);
/** D474: an episode's calm, eased per piece. */
const calm = new Map<string, { calm: number; at: number }>();


/**
 * Draws the piece's world over the whole box canvas (w × h canvas px), then the veil that keeps the notes
 * readable. True where it drew (the classic box then skips its flat key tint).
 */
export function paintStage(g: CanvasRenderingContext2D, w: number, h: number, f: TouchFugue, clock: StageClock, mode: StageMode = stageMode()): boolean {
  if (mode === "off") return false;
  const world = WORLDS[f.id];
  if (!world) return false;
  const m = piece(f);
  const k = KIT;
  k.g = g;
  k.w = w;
  k.h = h;
  k.p = Math.max(0, Math.min(1, clock.now / Math.max(1, m.end)));
  k.bar = clock.now / f.barTicks;
  k.pxBar = (w * f.barTicks) / clock.span;
  const t0 = clock.t0;
  const span = clock.span;
  k.xOf = (tick: number) => ((tick - t0) / span) * w;
  k.sec = clock.sec;
  k.still = mode === "quiet";
  k.ents = m.ents;
  k.themes = m.themes;
  k.cads = m.cads;
  let passed = 0;
  while (passed < m.ents.length && m.ents[passed] <= clock.now) passed++;
  k.passed = passed;
  k.since = passed ? (clock.now - m.ents[passed - 1]) / f.barTicks : Infinity;
  k.strettos = m.strettos;
  k.sounding.length = 0;
  for (const sp of m.spans) if (sp.on <= clock.now && clock.now < sp.end) k.sounding.push(sp);
  // D464: the music's state, eased (a second or so), so the world turns with it and never jumps.
  const now = clock.now;
  let other = 0;
  let sounding = 0;
  for (const sp of m.spans) if (sp.on <= now && now < sp.end) (sounding++, sp.other && (other = 1));
  const bi = Math.min(m.dens.length - 1, Math.max(0, Math.floor(now / f.barTicks)));
  const busyNow = Math.max(0, Math.min(1, (m.dens[bi] - m.dLo) / (m.dHi - m.dLo)));
  const e = eased.get(f.id) ?? { turn: other, stretto: 0, busy: busyNow, at: clock.sec };
  const dt = Math.max(0, Math.min(0.25, clock.sec - e.at));
  e.turn = ease(e.turn, other, dt, 1.2);
  e.stretto = ease(e.stretto, sounding >= 2 ? 1 : 0, dt, 0.8);
  e.busy = ease(e.busy, busyNow, dt, 2);
  e.at = clock.sec;
  eased.set(f.id, e);
  k.turn = mode === "quiet" ? other : e.turn;
  k.stretto = e.stretto;
  k.busy = e.busy;
  k.homeMinor = isMinor(f.key);
  let lastCad = -Infinity;
  for (const c of m.cads) if (c <= now) lastCad = c;
  k.cadence = Math.max(0, 1 - (now - lastCad) / (2 * f.barTicks));
  k.nowTick = clock.now;
  k.barTicks = f.barTicks;
  k.end = k.xOf(m.end);
  // D474: the act's look (the episode before an act turning to it), the climax and the last chord.
  const sc = SCRIPTS[f.id];
  const fm = sc ? formOf(f) : null;
  const fa = fm ? formAt(fm, now) : null;
  // A script's four looks are I, II, III and the final act; a form of two or three acts skips to the final look for its last.
  const li = (a: number) => (fm && a === fm.acts - 1 ? 3 : a);
  const look = sc && fa ? blend(sc.acts[li(Math.max(0, fa.mix < 1 ? fa.act - 1 : fa.act))] ?? {}, sc.acts[li(fa.act)] ?? {}, fa.mix < 1 ? fa.mix : 1) : null;
  const calmNow = fa && fa.episode && fa.climax < 0.5 ? 1 : 0;
  const ce = calm.get(f.id) ?? { calm: calmNow, at: clock.sec };
  ce.calm = ease(ce.calm, calmNow, Math.max(0, Math.min(0.25, clock.sec - ce.at)), 1.5);
  ce.at = clock.sec;
  calm.set(f.id, ce);
  const climax = fa ? fa.climax * (1 - 0.4 * fa.resolved) : 0;
  if (fa && fa.resolved > 0.5) k.still = true;
  const weights = k.acts;
  weights.length = 0;
  if (fa) {
    for (let i = 0; i < 4; i++) weights.push(0);
    weights[li(fa.act)] = fa.mix;
    if (fa.mix < 1 && fa.act > 0) weights[li(fa.act - 1)] = 1 - fa.mix;
  } else weights.push(1);
  k.climax = climax;
  k.peak = fm ? fm.climax.peak : Infinity;
  k.rest = fa ? fa.resolved : 0;
  k.calm = ce.calm;
  g.save();
  if (look && (look.zoom !== 1 || look.tilt !== 0)) {
    // About the play line (a quarter of the box between the bars): what the world sets for an entry keeps its place.
    const px = k.xOf(now);
    g.translate(px, h * (0.5 + look.tilt));
    g.scale(look.zoom, look.zoom);
    g.translate(-px, -h * 0.5);
  }
  world(k);
  g.restore();
  g.globalAlpha = 1;
  if (look && sc && fa) {
    if (look.tint[1] > 0.005) {
      g.fillStyle = rgba(look.tint[0], look.tint[1]);
      g.fillRect(0, 0, w, h);
    }
    const amt = 1 - 0.55 * ce.calm;
    weather(k, look.wa, (1 - look.t) * amt);
    weather(k, look.wb, look.t * amt);
    bloom(k, sc.climax, climax);
    if (fa.resolved > 0.01) {
      g.fillStyle = rgba(sc.rest[0], sc.rest[1] * fa.resolved);
      g.fillRect(0, 0, w, h);
    }
  }
  // D464: the subject in the other mode lights the world for its length: in a minor fugue a major entry, the sun
  // breaking through (warm light from above, a few rays); in a major fugue a minor entry, a cloud passing (cool shade).
  if (k.turn > 0.01) {
    if (k.homeMinor) {
      const sun = k.turn;
      k.glow(w * 0.8, -h * 0.1, h * 1.3, [255, 214, 140], 0.28 * sun);
      g.fillStyle = `rgba(255,226,170,${0.05 * sun})`;
      for (let r = 0; r < 4; r++) {
        const x0 = w * (0.55 + r * 0.12);
        g.beginPath();
        g.moveTo(x0, 0);
        g.lineTo(x0 + 10, 0);
        g.lineTo(x0 - w * 0.25 + 18, h);
        g.lineTo(x0 - w * 0.25, h);
        g.closePath();
        g.fill();
      }
    } else {
      g.fillStyle = `rgba(30,40,80,${0.22 * k.turn})`;
      g.fillRect(0, 0, w, h);
    }
  }
  // D650: the dark worlds lifted (a light screened over the world, before the veil).
  const worldLift = WORLD_LIFT[f.id] ?? 0;
  if (worldLift > 0) {
    g.globalCompositeOperation = "screen";
    g.fillStyle = `rgba(255,248,236,${worldLift})`;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "source-over";
  }
  // The veil: the world kept under the music (QUIET heavier), darkest in the middle band where the notes run.
  // D474: an episode's world dimmer (calm), an entry's a shade brighter, the climax's lifted at the edges only (the middle band kept).
  const a = (mode === "quiet" ? 0.62 : 0.4) + (BRIGHT.has(f.id) ? 0.14 : 0) + (sc ? 0.12 * ce.calm - 0.04 * (1 - ce.calm) : 0);
  const lift = (mode === "quiet" ? 0.15 : 0.35) * climax * (BRIGHT.has(f.id) ? 0.5 : 1);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, `rgba(8,8,16,${a * 0.75 * (1 - lift)})`);
  gr.addColorStop(0.5, `rgba(8,8,16,${a * (1 - 0.3 * lift)})`);
  gr.addColorStop(1, `rgba(8,8,16,${a * 0.75 * (1 - lift)})`);
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  return true;
}
