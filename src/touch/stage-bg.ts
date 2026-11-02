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
const DAY_T: C3 = [70, 110, 150];
const DAY_L: C3 = [170, 180, 170];

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

const WORLDS: Record<string, World> = {
  // ---- BOOK I ----
  // The Canon: four singers in a row on a stage; each lit in turn as its voice enters.
  wtc1f01: (k) => {
    k.room([30, 16, 24], [14, 8, 14], 0.82, "rgba(40,24,20,1)");
    k.curtains([120, 26, 34]);
    for (let i = 0; i < 4; i++) {
      const x = k.w * (0.28 + i * 0.15);
      const on = k.passed > i;
      if (on) k.glow(x, k.h * 0.55, 34, [255, 220, 160], 0.22 + 0.12 * k.stretto);
      k.figure(x, k.h * 0.82 - i * 3, on ? "rgba(70,50,60,1)" : "rgba(30,20,28,1)", 0, 3);
      if (on && !k.still && Math.sin(k.sec * 2 + i) > 0) k.R(x + 1, k.h * 0.82 - i * 3 - 22, 2, 2, "rgba(20,10,14,1)");
    }
  },
  // The Imp: a cave lit by a fire, embers rising; the imp hops at the play line.
  wtc1f02: (k) => {
    k.vgrad(0, k.h, [[0, "#140a10"], [0.7, "#2a1014"], [1, "#3a160e"]]);
    k.hills(0.25, 10, 0.05, 2, "rgba(8,4,8,0.9)", true);
    k.g.save();
    k.g.scale(1, -1);
    k.g.translate(0, -k.h);
    k.hills(0.86, 8, 0.1, 5, "rgba(8,4,8,0.9)", true);
    k.g.restore();
    k.glow(k.w * 0.5, k.h * 0.95, 60 + 30 * k.busy, [255, 110, 40], 0.22 + 0.16 * k.busy);
    for (let i = 0; i < 14; i++) {
      const tt = wrap(k.t * 0.15 + hash(i), 1);
      k.R(k.w * (0.3 + 0.4 * hash(i + 2)) + Math.sin(tt * 9 + i) * 4, k.h * (1 - tt * 0.9), 1, 1, `rgba(255,160,70,${0.7 * (1 - tt)})`);
    }
    const imp = k.wander(14, 0.3);
    const lx = imp.x;
    const hop = k.still ? 0 : Math.abs(Math.sin(k.sec * Math.PI * 1.6)) * 8;
    k.figure(lx, k.h * 0.9 - hop, "rgba(150,40,40,1)", 0, 2);
    k.R(lx - 2, k.h * 0.9 - hop - 22, 1, 3, "rgba(150,40,40,1)");
    k.R(lx + 4, k.h * 0.9 - hop - 22, 1, 3, "rgba(150,40,40,1)");
  },
  // The Stone-Skipper: a pond in the afternoon; each entry a stone's rings on the water.
  wtc1f03: (k) => {
    k.sky(DAY_T, [210, 190, 150], [120, 90, 120], [230, 150, 100], 0.55);
    k.hills(0.5, 6, 0.05, 1, "rgba(50,70,60,1)");
    k.along(18, 0.12, (x, i) => roundTree(k, x, k.h * 0.52, 5 + hash(i) * 4, "rgba(34,52,40,1)"));
    k.vgrad(k.h * 0.55, k.h * 0.45, [[0, "rgba(70,100,120,1)"], [1, "rgba(30,50,70,1)"]]);
    for (let y = k.h * 0.6; y < k.h; y += 7) k.R(wrap(y * 13 - k.bar * k.pxBar * 0.3, k.w), y, 10, 1, "rgba(200,220,230,0.18)");
    k.atEntries((x, i, begun) => {
      if (!begun) {
        k.R(x - 1, k.h * 0.7 + (i % 3) * 6, 3, 2, "rgba(150,150,160,0.8)");
        return;
      }
      for (let r = 1; r <= 3; r++) {
        k.g.strokeStyle = `rgba(210,230,240,${0.35 / r})`;
        k.g.lineWidth = 1;
        k.g.beginPath();
        k.g.ellipse(x, k.h * 0.7 + (i % 3) * 6, 5 * r, 1.6 * r, 0, 0, Math.PI * 2);
        k.g.stroke();
      }
    });
    k.along(30, 0.9, (x, i) => {
      for (let j = 0; j < 4; j++) k.R(x + j * 2, k.h - 4 - (6 + hash(i + j) * 10), 1, 6 + hash(i + j) * 10, "rgba(40,60,36,0.9)");
    });
  },
  // The Cross: a hill at dusk, night falling; a candle lit at its foot for each entry (five).
  wtc1f04: (k) => {
    k.sky(DUSK_T, DUSK_L, NIGHT, [40, 24, 50]);
    k.stars(50, 0.5);
    k.hills(0.82, 12, 0.03, 3, "rgba(24,16,26,1)");
    const cx = k.w * 0.62;
    const base = k.h * 0.74;
    k.R(cx - 3, base - 70, 6, 70, "rgba(20,12,16,1)");
    k.R(cx - 20, base - 54, 40, 6, "rgba(20,12,16,1)");
    for (let i = 0; i < 5; i++) k.candle(cx - 16 + i * 8, base + 6, 5, k.passed > i);
    k.hills(0.92, 6, 0.2, 7, "rgba(12,8,14,1)");
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
  // The Ambush: a forest road; at each entry, eyes in the trees.
  wtc1f06: (k) => {
    k.sky([20, 30, 30], [50, 60, 50], [8, 12, 16], [24, 30, 30]);
    k.along(14, 0.1, (x, i) => pine(k, x, k.h * 0.6, 26 + hash(i) * 14, "rgba(16,26,22,1)"), 6);
    k.along(22, 0.35, (x, i) => pine(k, x, k.h * 0.82, 40 + hash(i) * 18, "rgba(8,14,12,1)"), 8);
    k.ground(0.82, "rgba(40,34,24,1)", "rgba(120,100,70,0.3)", 1);
    k.atEntries((x, i) => {
      const y = k.h * (0.45 + (i % 3) * 0.08);
      const blink = !k.still && Math.sin(k.sec * 1.3 + i * 2) > 0.95;
      if (!blink) {
        k.R(x - 3, y, 2, 1, "rgba(240,220,120,0.8)");
        k.R(x + 2, y, 2, 1, "rgba(240,220,120,0.8)");
      }
    });
    // D464: in a stretto, more eyes in the trees.
    if (k.stretto > 0.3)
      for (let i = 0; i < 5; i++) {
        const x = k.w * (0.1 + 0.2 * i) + Math.sin(i * 7) * 10;
        const y = k.h * (0.42 + (i % 2) * 0.1);
        k.R(x - 3, y, 2, 1, `rgba(240,220,120,${0.7 * k.stretto})`);
        k.R(x + 2, y, 2, 1, `rgba(240,220,120,${0.7 * k.stretto})`);
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
  // The Pilgrim: one walk, afternoon to night, a waymark for each entry, the shrine at the road's end.
  wtc1f08: (k) => {
    k.sky([70, 58, 96], [200, 130, 80], NIGHT, [30, 24, 50]);
    k.stars(50, 0.45);
    k.orb(0.7, 0.45, 0.95, 4, [255, 190, 110], 0.25 * (1 - k.p));
    k.hills(0.62, 16, 0.05, 2, "rgba(40,30,50,1)");
    k.hills(0.74, 9, 0.2, 7, "rgba(24,18,30,1)");
    k.along(61, 0.55, (x, i) => cypress(k, x, k.h * 0.86, 18 + (i % 3) * 6, "rgba(10,10,16,0.9)"));
    k.ground(0.86, "rgba(60,44,40,1)", "rgba(220,190,150,0.18)");
    k.atEntries((x) => {
      k.R(x - 2, k.h * 0.86 - 9, 4, 9, "rgba(150,140,130,0.8)");
      k.R(x - 1, k.h * 0.86 - 7, 2, 1, "rgba(240,220,160,0.8)");
    });
    const sx = k.end;
    if (sx < k.w + 30) {
      k.R(sx - 8, k.h * 0.86 - 18, 16, 18, "rgba(40,34,40,1)");
      k.tri(sx, k.h * 0.86 - 18, 22, 10, "rgba(40,34,40,1)");
      k.glow(sx, k.h * 0.86 - 10, 22, [255, 200, 110], 0.5);
      k.R(sx - 2, k.h * 0.86 - 13, 4, 6, "#ffd88a");
    }
  },
  // The Sparrow: rooftops under a moving sky; the sparrow hops along the ridge.
  wtc1f09: (k) => {
    k.sky([110, 150, 190], [200, 210, 220], [150, 120, 150], [240, 190, 150]);
    clouds(k, 6, 0.4, 0.2);
    k.along(40, 0.5, (x, i) => {
      const hh = 20 + hash(i) * 14;
      k.R(x, k.h - hh, 38, hh, "rgba(110,70,60,1)");
      k.tri(x + 19, k.h - hh, 44, 14, "rgba(80,44,40,1)");
      if (hash(i + 2) > 0.5) k.R(x + 26, k.h - hh - 18, 5, 10, "rgba(80,44,40,1)");
    });
    const bird = k.wander(18, 0.6, 0.2, 0.8);
    const lx = bird.x;
    const hop = k.still ? 0 : Math.abs(Math.sin(k.sec * Math.PI * 2.5)) * 5;
    k.R(lx - 3, k.h * 0.6 - hop, 6, 4, "rgba(110,80,50,1)");
    k.R(lx + 2 * bird.dir, k.h * 0.6 - hop - 2, 3, 3, "rgba(110,80,50,1)");
    k.R(lx - 6 * bird.dir, k.h * 0.6 - hop + 1, 3, 1, "rgba(80,60,40,1)");
  },
  // The Two Horsemen: a plain at dawn, two riders far off; fence posts and dust.
  wtc1f10: (k) => {
    k.sky([40, 40, 70], [200, 120, 90], [110, 140, 180], [230, 200, 160]);
    k.orb(0.2, 0.75, 0.3, 4, [255, 220, 160], 0.25);
    k.hills(0.7, 8, 0.04, 4, "rgba(70,60,60,1)");
    k.ground(0.78, "rgba(120,100,70,1)", "rgba(200,180,140,0.25)", 0.9);
    for (let i = 0; i < 2; i++) {
      const x = k.w * (0.62 + i * 0.1) + (k.still ? 0 : Math.sin(k.sec + i) * 2);
      const y = k.h * 0.78;
      k.R(x - 6, y - 7, 12, 4, "rgba(40,28,24,1)");
      k.R(x - 5, y - 3, 1, 3, "rgba(40,28,24,1)");
      k.R(x + 4, y - 3, 1, 3, "rgba(40,28,24,1)");
      k.R(x + 5, y - 10, 3, 4, "rgba(40,28,24,1)");
      k.R(x - 1, y - 14, 3, 7, "rgba(40,28,24,1)");
      k.glow(x - 10, y - 2, 10, [200, 170, 120], 0.25);
    }
    k.along(24, 1, (x) => k.R(x, k.h * 0.74, 2, 8, "rgba(70,50,36,0.8)"));
  },
  // The Shepherdess: a meadow morning, sheep grazing; a flower opens for each entry.
  wtc1f11: (k) => {
    k.sky([110, 160, 200], [220, 220, 190], [120, 150, 200], [240, 210, 170]);
    clouds(k, 4, 0.35);
    k.hills(0.6, 12, 0.05, 3, "rgba(90,130,80,1)");
    k.hills(0.75, 8, 0.2, 8, "rgba(70,110,60,1)");
    k.along(34, 0.2, (x, i) => {
      const y = k.h * (0.66 + hash(i) * 0.06);
      k.R(x, y - 4, 7, 4, "rgba(230,230,220,0.9)");
      k.R(x + 6, y - 5, 2, 2, "rgba(40,40,40,0.9)");
    }, 14);
    k.ground(0.86, "rgba(60,100,50,1)");
    k.atEntries((x, i) => {
      k.R(x, k.h * 0.86 - 5, 1, 5, "rgba(40,80,40,1)");
      k.disc(x, k.h * 0.86 - 6, 2, ["rgba(240,200,80,0.9)", "rgba(240,140,160,0.9)", "rgba(200,200,255,0.9)"][i % 3]);
    });
  },
  // The Requiem: a dark church, the bier, a row of candles lit one by one.
  wtc1f12: (k) => {
    k.room([16, 14, 22], [8, 8, 12], 0.84, "rgba(26,22,24,1)");
    arches(k, "rgba(6,6,10,0.95)", 4);
    k.R(k.w * 0.36, k.h * 0.68, k.w * 0.28, 8, "rgba(10,8,10,1)");
    k.R(k.w * 0.38, k.h * 0.76, 3, 12, "rgba(10,8,10,1)");
    k.R(k.w * 0.6, k.h * 0.76, 3, 12, "rgba(10,8,10,1)");
    const n = Math.min(12, Math.max(2, k.ents.length));
    for (let i = 0; i < n; i++) k.candle(k.w * (0.16 + (0.68 * i) / (n - 1)), k.h * 0.84, 8, k.passed > i);
  },
  // The Aquarium: the box is the tank; fish drifting, bubbles where each entry comes in.
  wtc1f13: (k) => {
    k.vgrad(0, k.h, [[0, "#0d3a44"], [0.6, "#0a2a36"], [1, "#081c26"]]);
    for (let j = 0; j < 6 + 14 * k.busy; j++) {
      const tt = wrap(k.t * 0.25 + j / 20, 1);
      k.R(k.w * 0.92 + Math.sin(tt * 20 + j) * 2, k.h - 8 - tt * (k.h - 10), 1 + (j % 2), 1 + (j % 2), "rgba(220,250,255,0.3)");
    }
    for (let i = 0; i < 7; i++) {
      const x = wrap(i * 53 + Math.sin(k.t * 0.5 + i) * 12, k.w + 40) - 20;
      k.g.fillStyle = "rgba(160,230,230,0.08)";
      k.g.beginPath();
      k.g.moveTo(x, 0);
      k.g.lineTo(x + 14, 0);
      k.g.lineTo(x + 40, k.h * 0.7);
      k.g.lineTo(x + 30, k.h * 0.7);
      k.g.fill();
    }
    const turns = k.cads.filter((c) => k.xOf(c) < k.xOf(k.now())).length;
    const cols: C3[] = [[230, 140, 60], [230, 210, 90], [220, 90, 80], [120, 190, 230], [230, 160, 200]];
    for (let i = 0; i < 5; i++) {
      const dir = (i + turns) % 2 ? -1 : 1;
      const y = k.h * (0.2 + 0.14 * i) + Math.sin(k.t * 0.7 + i) * 3;
      const x = wrap(dir * k.t * (6 + i * 2.5) + i * 71, k.w + 30) - 15;
      k.R(x - 5, y - 2, 10, 4, rgba(cols[i], 0.42));
      k.R(x - dir * 8, y - 3, 2, 6, rgba(cols[i], 0.42));
    }
    for (let i = 0; i < 9; i++) {
      const bx = hash(i + 2) * k.w;
      const hh = 12 + hash(i) * 22;
      for (let y = 0; y < hh; y += 2) k.R(bx + Math.sin(k.t * 0.9 + y * 0.15 + i) * (y / hh) * 4, k.h - 6 - y, 2, 2, "rgba(60,130,80,0.45)");
    }
    k.vgrad(k.h - 7, 7, [[0, "rgba(170,150,110,0.35)"], [1, "rgba(120,100,70,0.5)"]]);
    k.atEntries((x, i) => {
      for (let j = 0; j < 6; j++) {
        const tt = wrap((k.bar - i) * 0.6 + j / 6, 1);
        k.R(x + Math.sin(tt * 12 + j) * 3, k.h - 8 - tt * (k.h - 12), 2, 2, "rgba(220,250,255,0.28)");
      }
    });
  },
  // Pierrot: a night stage under a great moon.
  wtc1f14: (k) => {
    k.sky([10, 12, 30], [30, 30, 60], [6, 6, 20], [20, 16, 40]);
    k.stars(40);
    k.orb(0.5, 0.35, 0.28, 16, [235, 230, 210], 0.18);
    k.curtains([60, 30, 80]);
    k.R(0, k.h * 0.86, k.w, k.h * 0.14, "rgba(30,24,30,1)");
    const lx = k.w * 0.5;
    k.figure(lx, k.h * 0.86, "rgba(220,220,230,0.9)", 0, 3);
    k.R(lx - 1, k.h * 0.86 - 28, 4, 2, "rgba(20,20,30,1)");
  },
  // The Pinball: a lit playfield; a bumper lights for each entry, the ball in flight.
  wtc1f15: (k) => {
    k.vgrad(0, k.h, [[0, "#1a0c2a"], [1, "#0c0618"]]);
    for (let i = 0; i < 6; i++) k.line(k.w * (0.1 + i * 0.16), 0, k.w * (0.2 + i * 0.12), k.h, "rgba(120,60,200,0.25)");
    const n = 7;
    for (let i = 0; i < n; i++) {
      const x = k.w * (0.15 + 0.7 * hash(i * 3));
      const y = k.h * (0.2 + 0.6 * hash(i * 3 + 1));
      const on = k.passed % n === i || (k.passed > n && hash(i + k.passed) > 0.6) || k.cadence > 0.6;
      if (on) k.glow(x, y, 20, [255, 90, 200], 0.35);
      k.disc(x, y, 7, on ? "rgba(255,120,210,0.9)" : "rgba(90,40,90,0.9)");
      k.disc(x, y, 3, "rgba(20,10,30,1)");
    }
    const bx = k.w * (0.5 + 0.4 * Math.sin(k.bar * 1.3));
    const by = k.h * (0.5 + 0.35 * Math.cos(k.bar * 1.7));
    k.disc(bx, by, 3, "rgba(230,230,240,0.9)");
    k.R(k.w * 0.35, k.h - 6, 30, 4, "rgba(255,200,60,0.7)");
    k.R(k.w * 0.55, k.h - 6, 30, 4, "rgba(255,200,60,0.7)");
  },
  // The Knight: a chessboard in perspective scrolling under the music; pieces at its far edge.
  wtc1f16: (k) => {
    k.vgrad(0, k.h * 0.4, [[0, "#141420"], [1, "#2a2a3a"]]);
    const hz = k.h * 0.4;
    const rows = 7;
    for (let r = 0; r < rows; r++) {
      const y0 = hz + ((k.h - hz) * r * r) / (rows * rows);
      const y1 = hz + ((k.h - hz) * (r + 1) * (r + 1)) / (rows * rows);
      const cw = 12 + r * 8;
      const off = wrap(k.bar * k.pxBar * 0.4 * (0.3 + r * 0.15), cw * 2);
      for (let x = -off - cw * 2; x < k.w; x += cw) {
        const c = Math.floor((x + off) / cw + r) % 2 ? "rgba(70,60,50,1)" : "rgba(180,160,130,1)";
        k.R(x, y0, cw, y1 - y0 + 1, c);
      }
    }
    for (let i = 0; i < 5; i++) {
      const x = k.w * (0.2 + i * 0.15);
      k.R(x - 3, hz - 10, 6, 10, "rgba(20,18,24,1)");
      k.disc(x, hz - 12, 3, "rgba(20,18,24,1)");
    }
    // The knight leaps its L by itself, a leap every two seconds (two squares across, one in depth).
    const leap = k.still ? 0 : Math.floor(k.sec / 2);
    const col = ((leap * 2) % 8 + 8) % 8;
    const row = leap % 2;
    const lx = k.w * (0.14 + col * 0.1);
    const ly = k.h * (0.66 + row * 0.12);
    k.R(lx - 4, ly - 14, 8, 14, "rgba(240,236,224,0.85)");
    k.R(lx - 1, ly - 20, 6, 7, "rgba(240,236,224,0.85)");
  },
  // The Diary: a girl's room by a summer window; leaves outside move with the bars.
  wtc1f17: (k) => {
    k.room([90, 70, 60], [60, 46, 40], 0.8, "rgba(80,56,40,1)");
    k.window(0.55, 0.12, 0.32, 0.5, [120, 170, 210], [220, 220, 180], [200, 120, 110], [250, 200, 140]);
    k.along(16, 0.3, (x, i) => {
      if (x < k.w * 0.55 || x > k.w * 0.87) return;
      k.disc(x, k.h * (0.2 + hash(i) * 0.3), 5, "rgba(60,110,50,0.8)");
    });
    k.R(k.w * 0.1, k.h * 0.62, k.w * 0.35, 5, "rgba(50,34,24,1)");
    k.R(k.w * 0.18, k.h * 0.58, 22, 4, "rgba(240,230,210,0.8)");
    k.R(k.w * 0.18 + 10, k.h * 0.58, 1, 4, "rgba(150,120,100,0.8)");
    k.disc(k.w * 0.23, k.h * 0.57, 2, "rgba(220,110,140,0.8)");
    k.vgrad(0, k.h, [[0, "rgba(255,230,180,0.08)"], [1, "rgba(255,230,180,0)"]], k.w * 0.5, k.w * 0.45);
  },
  // The Sleepwalker: rooftops at night under the moon, chimneys; the walker on the ridge.
  wtc1f18: (k) => {
    k.sky([10, 12, 34], [30, 34, 70], [8, 8, 24], [24, 20, 50]);
    k.stars(60);
    k.orb(0.78, 0.18, 0.12, 8, [230, 230, 200], 0.15, true);
    k.along(46, 0.35, (x, i) => {
      const hh = 26 + hash(i) * 20;
      k.R(x, k.h - hh, 44, hh, "rgba(20,20,36,1)");
      k.tri(x + 22, k.h - hh, 50, 12, "rgba(14,14,28,1)");
      if (hash(i + 5) > 0.4) k.R(x + 30, k.h - hh - 16, 5, 10, "rgba(14,14,28,1)");
      if (hash(i + 9) > 0.7) k.R(x + 10, k.h - hh + 8, 3, 3, "rgba(255,200,110,0.6)");
    });
    const sw = k.wander(40, 0.1);
    k.figure(sw.x, k.h * 0.62, "rgba(210,210,230,0.85)", sw.step, 2);
    k.R(sw.dir > 0 ? sw.x + 2 : sw.x - 8, k.h * 0.62 - 15, 5, 1, "rgba(210,210,230,0.85)");
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
  // The Locomotive: a night ride; telegraph poles stand on the bar lines, steam puffs at each entry.
  wtc1f20: (k) => {
    k.vgrad(0, k.h, [[0, "#1a1030"], [0.45, "#4a2440"], [0.62, "#8a3c3a"], [1, "#2a1418"]]);
    k.stars(40);
    k.orb(0.78, 0.16, 0.16, 5, [233, 220, 192], 0.15, true);
    k.hills(0.66, 14, 0.08, 1, "rgba(58,28,44,1)");
    k.along(97, 0.08, (x, i) => k.R(x, k.h * 0.62 + (i % 3) * 3, 3, 2, "rgba(255,200,100,0.85)"));
    k.hills(0.78, 10, 0.25, 4, "rgba(30,15,24,1)");
    const b0 = Math.floor(k.bar - 1);
    const poles: number[] = [];
    for (let b = b0; b <= b0 + 6; b++) {
      const x = Math.round(k.xOf(k.barTick(b)));
      if (x > -20 && x < k.w + 20) poles.push(x);
    }
    for (const x of poles) {
      k.R(x - 1, k.h * 0.12, 3, k.h * 0.88, "rgba(30,16,20,0.9)");
      k.R(x - 6, k.h * 0.14, 13, 2, "rgba(30,16,20,0.9)");
    }
    for (let i = 0; i + 1 < poles.length; i++) {
      k.g.strokeStyle = "rgba(20,10,14,0.7)";
      k.g.lineWidth = 1;
      k.g.beginPath();
      k.g.moveTo(poles[i] - 4, k.h * 0.14 + 1);
      k.g.quadraticCurveTo((poles[i] + poles[i + 1]) / 2, k.h * 0.24, poles[i + 1] - 4, k.h * 0.14 + 1);
      k.g.stroke();
    }
    k.atEntries((x, i, begun) => {
      if (!begun) return;
      const age = (k.xOf(k.now()) - x) / k.pxBar;
      if (age > 3) return;
      for (let q = 0; q < 3; q++) k.glow(k.w * (0.98 - age * 0.3) - q * 10, k.h * (0.1 + 0.03 * q) - age * 4, 12 + age * 10 + q * 3, [220, 210, 215], 0.2 * (1 - age / 3));
      void i;
    });
    k.R(0, k.h - 5, k.w, 5, "rgba(26,16,20,1)");
    // D464: the busier the music, the faster the sleepers (the train working harder).
    for (let x = -wrap(k.bar * k.pxBar * (1.2 + 1.2 * k.busy), 12); x < k.w; x += 12) k.R(x, k.h - 4, 7, 2, "rgba(110,70,50,0.6)");
  },
  // The Marionettes: a puppet stage, strings from above; the three dance in step with the bars.
  wtc1f21: (k) => {
    k.room([40, 20, 30], [20, 10, 16], 0.84, "rgba(50,30,24,1)");
    k.curtains([140, 100, 40]);
    for (let i = 0; i < 3; i++) {
      const x = k.w * (0.35 + i * 0.15);
      const lift = Math.abs(Math.sin(k.bar * Math.PI)) * 6;
      const y = k.h * 0.84 - lift;
      k.line(x, 0, x, y - 26, "rgba(220,220,200,0.35)");
      k.line(x - 6, 0, x - 5, y - 14, "rgba(220,220,200,0.3)");
      k.line(x + 6, 0, x + 6, y - 14, "rgba(220,220,200,0.3)");
      k.figure(x, y, ["rgba(170,60,60,1)", "rgba(60,90,170,1)", "rgba(170,140,60,1)"][i], Math.floor(k.bar * 2) % 2, 3);
    }
  },
  // The Procession: a street at night; a lantern carried for each entry passes.
  wtc1f22: (k) => {
    k.sky([16, 14, 30], [40, 30, 50], [8, 8, 20], [30, 20, 40]);
    k.stars(30);
    skyline(k, 0.8, 0.2, "rgba(24,20,30,1)", 0);
    k.ground(0.8, "rgba(40,34,36,1)", "rgba(120,110,100,0.2)", 0.5, 14);
    k.atEntries((x, i) => {
      const y = k.h * 0.8;
      k.figure(x, y, "rgba(14,12,18,1)", Math.floor(k.bar * 2 + i) % 2, 2);
      k.R(x + 4, y - 22, 1, 10, "rgba(60,50,40,1)");
      k.glow(x + 4.5, y - 24, 12, [255, 190, 100], 0.4);
      k.R(x + 3, y - 26, 3, 3, "rgba(255,210,130,0.95)");
    });
  },
  // The Gramophone: a quiet room at night; the gramophone, the cat asleep, the lamp.
  wtc1f23: (k) => {
    k.room([50, 36, 40], [30, 22, 26], 0.82, "rgba(54,38,30,1)");
    k.window(0.1, 0.14, 0.2, 0.4, [40, 40, 80], [80, 60, 90], NIGHT, [30, 24, 50]);
    k.glow(k.w * 0.82, k.h * 0.4, 40, [255, 200, 130], 0.25);
    k.R(k.w * 0.8, k.h * 0.4, 6, k.h * 0.42, "rgba(30,20,16,1)");
    k.tri(k.w * 0.8 + 3, k.h * 0.4, 18, 10, "rgba(160,110,60,0.9)");
    const gx = k.w * 0.55;
    k.R(gx - 12, k.h * 0.82 - 10, 24, 10, "rgba(60,36,24,1)");
    k.g.fillStyle = "rgba(170,130,60,0.9)";
    k.g.beginPath();
    k.g.moveTo(gx, k.h * 0.82 - 12);
    k.g.lineTo(gx + 22, k.h * 0.82 - 40);
    k.g.lineTo(gx + 6, k.h * 0.82 - 44);
    k.g.closePath();
    k.g.fill();
    const spin = k.bar * 2;
    k.R(gx - 9, k.h * 0.82 - 12, 18, 2, "rgba(20,16,16,1)");
    k.R(gx - 9 + wrap(spin * 6, 18), k.h * 0.82 - 12, 2, 1, "rgba(200,180,160,0.5)");
    k.disc(k.w * 0.3, k.h * 0.82 - 3, 6, "rgba(40,30,28,1)");
    k.disc(k.w * 0.3 + 6, k.h * 0.82 - 5, 3, "rgba(40,30,28,1)");
  },
  // Faust: the study at night, books, the candle; the sign in the air brightens over the piece.
  wtc1f24: (k) => {
    k.room([24, 18, 30], [14, 10, 18], 0.84, "rgba(30,22,20,1)");
    for (let s = 0; s < 3; s++) for (let x = k.w * 0.05; x < k.w * 0.4; x += 4) k.R(x, k.h * (0.2 + s * 0.18), 3, 12 - hash(x + s) * 4, ["rgba(110,40,40,0.8)", "rgba(40,60,100,0.8)", "rgba(120,100,50,0.8)"][Math.floor(hash(x * s + 1) * 3)]);
    const cx = k.w * 0.68;
    const cy = k.h * 0.36;
    const a = 0.15 + 0.6 * k.p;
    k.glow(cx, cy, 34, [190, 230, 255], a * 0.5);
    k.g.strokeStyle = `rgba(200,240,255,${a})`;
    k.g.lineWidth = 1;
    k.g.beginPath();
    k.g.arc(cx, cy, 14, 0, Math.PI * 2);
    for (let i = 0; i < 5; i++) {
      const t0 = (i * 4 * Math.PI) / 5 - Math.PI / 2 + (k.still ? 0 : k.sec * 0.1);
      const t1 = ((i + 1) * 4 * Math.PI) / 5 - Math.PI / 2 + (k.still ? 0 : k.sec * 0.1);
      k.g.moveTo(cx + Math.cos(t0) * 14, cy + Math.sin(t0) * 14);
      k.g.lineTo(cx + Math.cos(t1) * 14, cy + Math.sin(t1) * 14);
    }
    k.g.stroke();
    k.R(k.w * 0.5, k.h * 0.7, k.w * 0.4, 5, "rgba(40,26,18,1)");
    k.R(k.w * 0.58, k.h * 0.66, 18, 4, "rgba(230,220,190,0.7)");
    k.candle(k.w * 0.82, k.h * 0.7, 9, true);
  },

  // ---- BOOK II ----
  // The Olympian: a stadium at night, floodlights and crowd; the track rushes; laurels at the close.
  wtc2f01: (k) => {
    k.vgrad(0, k.h, [[0, "#0c1020"], [1, "#1a2030"]]);
    for (const x of [0.12, 0.88]) {
      k.R(k.w * x, k.h * 0.05, 2, k.h * 0.4, "rgba(60,60,70,1)");
      k.glow(k.w * x, k.h * 0.06, 30, [240, 240, 220], 0.25);
    }
    for (let y = k.h * 0.3; y < k.h * 0.62; y += 4) for (let x = 0; x < k.w; x += 4) if (hash(x * 3 + y) > 0.45) k.R(x, y, 2, 2, `rgba(${120 + hash(x + y) * 100},${100 + hash(x) * 80},${120},${0.35 + (k.still ? 0 : 0.1 * Math.sin(k.sec * 3 + x))})`);
    k.R(0, k.h * 0.64, k.w, k.h * 0.36, "rgba(150,60,50,1)");
    for (let i = 1; i < 4; i++) k.R(0, k.h * (0.64 + i * 0.09), k.w, 1, "rgba(240,230,220,0.5)");
    for (let x = -wrap(k.bar * k.pxBar * 1.2, 30); x < k.w; x += 30) k.R(x, k.h * 0.64, 1, k.h * 0.36, "rgba(240,230,220,0.25)");
    if (k.p > 0.92) k.glow(k.w * 0.5, k.h * 0.3, 40, [255, 215, 100], (k.p - 0.92) * 5);
  },
  // The Shadows: figures walking at sunset, their shadows twice their length.
  wtc2f02: (k) => {
    k.sky([90, 60, 90], [240, 150, 90], [40, 30, 60], [190, 80, 70], 0.7);
    k.orb(0.85, 0.55, 0.72, 6, [255, 180, 110], 0.35);
    k.ground(0.7, "rgba(120,80,60,1)");
    k.atEntries((x, i) => {
      const y = k.h * (0.74 + (i % 3) * 0.06);
      k.g.fillStyle = "rgba(20,12,16,0.45)";
      k.g.beginPath();
      k.g.moveTo(x - 1, y);
      k.g.lineTo(x - 44, y + 3);
      k.g.lineTo(x - 44, y + 6);
      k.g.lineTo(x + 2, y + 1);
      k.g.fill();
      k.figure(x, y, "rgba(24,16,20,1)", Math.floor(k.bar * 2 + i) % 2, 2);
    });
  },
  // The Switchboard: a panel of jacks; a cord plugged for each entry.
  wtc2f03: (k) => {
    k.vgrad(0, k.h, [[0, "#2a2018"], [1, "#16100c"]]);
    for (let y = k.h * 0.12; y < k.h * 0.8; y += 10) for (let x = 10; x < k.w; x += 12) {
      k.disc(x, y, 2, "rgba(10,8,6,1)");
      k.R(x - 1, y - 6, 3, 2, "rgba(200,180,120,0.4)");
    }
    const cols = ["rgba(200,60,50,0.8)", "rgba(60,120,200,0.8)", "rgba(220,190,70,0.8)", "rgba(80,170,90,0.8)"];
    for (let i = 0; i < Math.min(k.passed, 14); i++) {
      const x0 = 10 + 12 * Math.floor(hash(i) * (k.w / 12 - 1));
      const y0 = k.h * 0.12 + 10 * Math.floor(hash(i + 3) * 6);
      k.g.strokeStyle = cols[i % 4];
      k.g.lineWidth = 2;
      k.g.beginPath();
      k.g.moveTo(x0, y0);
      k.g.quadraticCurveTo(x0 + 20, k.h * 1.05, k.w * (0.3 + 0.4 * hash(i + 7)), k.h);
      k.g.stroke();
    }
    k.R(0, k.h * 0.86, k.w, k.h * 0.14, "rgba(50,34,22,1)");
  },
  // The Perpetual Motion Machine: the wheel of weights turning, a bar a spoke.
  wtc2f04: (k) => {
    k.room([50, 40, 34], [30, 24, 20], 0.86, "rgba(46,34,26,1)");
    const cx = k.w * 0.6;
    const cy = k.h * 0.48;
    const r = k.h * 0.34;
    k.g.strokeStyle = "rgba(90,64,40,1)";
    k.g.lineWidth = 3;
    k.g.beginPath();
    k.g.arc(cx, cy, r, 0, Math.PI * 2);
    k.g.stroke();
    const a0 = (k.bar * Math.PI) / 4;
    for (let i = 0; i < 8; i++) {
      const a = a0 + (i * Math.PI) / 4;
      k.line(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, "rgba(90,64,40,1)", 2);
      const out = Math.cos(a) > 0 ? 1.15 : 0.85;
      k.disc(cx + Math.cos(a) * r * out, cy + Math.sin(a) * r * out, 4, "rgba(60,60,70,1)");
    }
    k.disc(cx, cy, 5, "rgba(120,90,50,1)");
    k.R(cx - 3, cy, 6, k.h * 0.86 - cy, "rgba(70,50,32,1)");
    k.figure(k.w * 0.25, k.h * 0.86, "rgba(40,30,26,1)", 0, 3);
  },
  // The Bell Tower: evening, the tower; a bell swings for each entry, all four at the close.
  wtc2f05: (k) => {
    k.sky([60, 50, 90], [220, 140, 100], [14, 14, 34], [60, 40, 70]);
    k.stars(40, 0.5);
    k.hills(0.88, 6, 0.05, 2, "rgba(30,22,30,1)");
    const tx = k.w * 0.62;
    k.R(tx - 16, k.h * 0.2, 32, k.h * 0.7, "rgba(36,28,34,1)");
    k.tri(tx, k.h * 0.2, 40, 26, "rgba(30,22,28,1)");
    for (let i = 0; i < 4; i++) {
      const bx = tx - 9 + (i % 2) * 18;
      const by = k.h * (0.3 + Math.floor(i / 2) * 0.16);
      k.R(bx - 6, by - 6, 12, 14, "rgba(10,8,12,1)");
      // D464: in a stretto every bell swings, and wider.
      const swing = (k.passed > i || k.stretto > 0.5) && !k.still ? Math.sin(k.sec * 3 + i) * (0.4 + 0.3 * k.stretto) : 0;
      k.g.save();
      k.g.translate(bx, by - 4);
      k.g.rotate(swing);
      k.g.fillStyle = k.passed > i || k.stretto > 0.5 ? "rgba(220,170,80,0.9)" : "rgba(90,70,40,0.9)";
      k.g.beginPath();
      k.g.moveTo(-2, 0);
      k.g.lineTo(2, 0);
      k.g.lineTo(5, 9);
      k.g.lineTo(-5, 9);
      k.g.fill();
      k.g.restore();
    }
  },
  // The Catapult: castle walls on the hill; the arm cocks with each entry.
  wtc2f06: (k) => {
    k.sky([90, 110, 150], [200, 190, 170], [60, 50, 80], [200, 120, 90]);
    clouds(k, 4, 0.3);
    k.hills(0.62, 8, 0.05, 1, "rgba(80,90,70,1)");
    const cxl = k.w * 0.72;
    k.R(cxl, k.h * 0.38, k.w * 0.2, k.h * 0.24, "rgba(110,100,90,1)");
    for (let x = cxl; x < cxl + k.w * 0.2; x += 8) k.R(x, k.h * 0.34, 5, 5, "rgba(110,100,90,1)");
    k.ground(0.8, "rgba(70,80,50,1)");
    const fx = k.w * 0.25;
    const fy = k.h * 0.8;
    k.R(fx - 14, fy - 6, 28, 6, "rgba(70,46,28,1)");
    k.tri(fx, fy - 6, 14, 14, "rgba(70,46,28,1)");
    const cock = (k.passed % 2 ? 1 : 0.3) * Math.PI * 0.4;
    k.line(fx, fy - 18, fx - Math.cos(cock) * 26, fy - 18 - Math.sin(cock) * 26 + 10, "rgba(90,60,36,1)", 3);
  },
  // The Organist: the organ's pipes, lit in waves as the piece grows.
  wtc2f07: (k) => {
    k.room([24, 18, 30], [14, 10, 18], 0.86, "rgba(30,22,22,1)");
    const n = 21;
    for (let i = 0; i < n; i++) {
      const x = k.w * (0.15 + (0.7 * i) / (n - 1));
      const hh = k.h * (0.3 + 0.35 * (1 - Math.abs(i - (n - 1) / 2) / ((n - 1) / 2)));
      const lit = 0.35 + 0.4 * Math.max(0, Math.sin(k.bar * 0.8 - i * 0.4)) * Math.min(1, k.p * 2 + 0.2);
      k.vgrad(k.h * 0.7 - hh, hh, [[0, `rgba(210,180,120,${lit})`], [1, "rgba(90,70,50,0.8)"]], x - 3, 6);
      k.R(x - 3, k.h * 0.7 - hh, 6, 2, "rgba(40,30,20,1)");
    }
    k.R(k.w * 0.1, k.h * 0.7, k.w * 0.8, k.h * 0.16, "rgba(60,40,28,1)");
  },
  // The Rain: a dark street, rain, one lit window; drops ring the puddles.
  wtc2f08: (k) => {
    k.sky([16, 20, 30], [40, 44, 56], [10, 12, 22], [30, 30, 44]);
    skyline(k, 0.8, 0.1, "rgba(22,24,34,1)", 2);
    k.R(k.w * 0.6, k.h * 0.42, 6, 8, "rgba(255,200,110,0.75)");
    k.glow(k.w * 0.6 + 3, k.h * 0.46, 18, [255, 200, 110], 0.18);
    k.ground(0.8, "rgba(30,32,40,1)");
    k.vgrad(k.h * 0.8, k.h * 0.2, [[0, "rgba(255,200,110,0.12)"], [1, "rgba(255,200,110,0)"]], k.w * 0.58, 10);
    // D464: the rain grows over the piece and with the music's density; under a major entry's sun it eases.
    k.rain(Math.round(25 + 120 * (0.2 + 0.8 * k.p) * (0.55 + 0.45 * k.busy) * (1 - 0.7 * k.turn)), 0.26 + 0.16 * k.p);
    k.atEntries((x, i, begun) => {
      if (!begun) return;
      const r = 3 + wrap(k.t * 2 + i, 3) * 3;
      k.g.strokeStyle = "rgba(170,190,220,0.3)";
      k.g.beginPath();
      k.g.ellipse(x, k.h * 0.9, r, r * 0.3, 0, 0, Math.PI * 2);
      k.g.stroke();
    });
  },
  // The Chorale: a congregation standing; a line of the hymn board lights for each entry.
  wtc2f09: (k) => {
    k.room([40, 32, 30], [24, 20, 18], 0.9, "rgba(40,30,24,1)");
    arches(k, "rgba(16,12,12,0.9)", 3);
    const bx = k.w * 0.42;
    k.R(bx, k.h * 0.1, k.w * 0.16, k.h * 0.36, "rgba(30,20,16,1)");
    for (let i = 0; i < 6; i++) k.R(bx + 4, k.h * 0.13 + i * 8, k.w * 0.16 - 8, 4, k.passed > i ? "rgba(240,220,170,0.75)" : "rgba(80,66,50,0.8)");
    for (let row = 0; row < 3; row++) for (let x = 6 + row * 5; x < k.w; x += 12) k.disc(x, k.h * (0.68 + row * 0.1), 4, `rgba(${20 + row * 6},${14 + row * 4},${14},1)`);
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
  // The Butterfly: a bright meadow, butterflies on the air.
  wtc2f11: (k) => {
    k.sky([120, 170, 220], [230, 230, 200], [130, 170, 210], [250, 220, 180]);
    clouds(k, 4, 0.35);
    k.hills(0.72, 8, 0.08, 2, "rgba(90,150,80,1)");
    k.ground(0.82, "rgba(70,130,60,1)");
    k.along(8, 0.5, (x, i) => k.disc(x, k.h * (0.86 + hash(i) * 0.1), 1.5, ["rgba(250,220,80,0.9)", "rgba(250,150,180,0.9)", "rgba(220,220,255,0.9)"][i % 3]), 6);
    for (let i = 0; i < 4; i++) {
      const x = wrap(i * 97 + k.t * (10 + i * 3), k.w + 20) - 10;
      const y = k.h * (0.3 + 0.12 * i) + Math.sin(k.t * 2 + i) * 6;
      const flap = k.still ? 1 : Math.abs(Math.sin(k.sec * 8 + i));
      k.R(x - 3 * flap, y - 2, 3 * flap, 4, "rgba(240,160,60,0.8)");
      k.R(x + 1, y - 2, 3 * flap, 4, "rgba(240,160,60,0.8)");
      k.R(x, y - 2, 1, 4, "rgba(40,30,20,0.9)");
    }
  },
  // The Masquerade: a candlelit hall, chandeliers, masks; the fan opens at each cadence.
  wtc2f12: (k) => {
    k.room([40, 20, 34], [22, 10, 20], 0.86, "rgba(40,24,26,1)");
    for (const x of [0.25, 0.5, 0.75]) {
      k.line(k.w * x, 0, k.w * x, k.h * 0.12, "rgba(160,130,70,0.7)");
      k.R(k.w * x - 12, k.h * 0.12, 24, 2, "rgba(160,130,70,0.8)");
      for (let j = -2; j <= 2; j++) k.candle(k.w * x + j * 5, k.h * 0.12, 4, true);
    }
    for (let i = 0; i < 5; i++) {
      const x = k.w * (0.15 + i * 0.17);
      k.figure(x, k.h * 0.86, "rgba(20,10,18,1)", 0, 3);
      k.R(x - 2, k.h * 0.86 - 24, 6, 2, ["rgba(230,200,90,0.9)", "rgba(220,220,230,0.9)", "rgba(200,60,80,0.9)"][i % 3]);
    }
    k.atCadences((x) => {
      for (let j = 0; j < 7; j++) {
        const a = Math.PI + (j * Math.PI) / 6;
        k.line(x, k.h * 0.7, x + Math.cos(a) * 12, k.h * 0.7 + Math.sin(a) * 12, "rgba(230,200,120,0.6)", 2);
      }
    });
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
  // The Three Sisters: a great tree on a hill, three figures of three ages under it.
  wtc2f14: (k) => {
    k.sky([90, 130, 170], [220, 200, 170], [60, 50, 90], [220, 140, 110]);
    k.hills(0.86, 14, 0.03, 2, "rgba(60,90,50,1)");
    const tx = k.w * 0.55;
    k.R(tx - 4, k.h * 0.4, 8, k.h * 0.4, "rgba(50,34,24,1)");
    for (let i = 0; i < 7; i++) k.disc(tx + (hash(i) - 0.5) * 60, k.h * (0.3 + hash(i + 3) * 0.12), 16, "rgba(40,80,40,0.95)");
    for (let i = 0; i < 3; i++) k.figure(k.w * (0.4 + i * 0.1), k.h * 0.82, "rgba(30,20,22,1)", 0, 2 + i * 0.5);
  },
  // Hopscotch: chalk squares on the pavement, passing; the hop at the play line.
  wtc2f15: (k) => {
    k.vgrad(0, k.h, [[0, "#3a3a40"], [1, "#2a2a30"]]);
    for (let y = 0; y < k.h; y += 12) for (let x = -wrap(k.bar * k.pxBar * 0.2, 24); x < k.w; x += 24) k.R(x, y, 23, 11, "rgba(70,70,76,0.4)");
    k.atEntries((x, i) => {
      for (let j = 0; j < 3; j++) {
        k.g.strokeStyle = "rgba(240,240,230,0.55)";
        k.g.lineWidth = 1;
        k.g.strokeRect(Math.round(x + j * 16) + 0.5, Math.round(k.h * 0.62) + 0.5, 15, 15);
      }
      void i;
    });
    const girl = k.wander(16, 0.5);
    const hop = k.still ? 0 : Math.abs(Math.sin(k.sec * Math.PI * 1.4)) * 10;
    k.figure(girl.x, k.h * 0.82 - hop, "rgba(200,80,90,0.9)", 0, 2);
  },
  // The Jury: wood panelling, the jury box, the forewoman on her feet.
  wtc2f16: (k) => {
    k.room([60, 40, 26], [40, 26, 16], 0.86, "rgba(46,30,20,1)");
    for (let x = 0; x < k.w; x += 30) k.R(x, 0, 2, k.h * 0.86, "rgba(30,18,10,0.6)");
    for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) k.figure(k.w * (0.2 + i * 0.1), k.h * (0.58 + row * 0.14), "rgba(26,18,14,1)", 0, 2);
    k.figure(k.w * 0.75, k.h * 0.58, "rgba(70,40,40,1)", 0, 3);
    k.R(k.w * 0.15, k.h * 0.62, k.w * 0.65, 6, "rgba(70,46,26,1)");
    k.R(k.w * 0.15, k.h * 0.76, k.w * 0.65, 6, "rgba(70,46,26,1)");
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
  // The Gigue: a tavern, lanterns swinging with the beat, the fiddler on a barrel.
  wtc2f18: (k) => {
    k.room([70, 44, 26], [44, 28, 16], 0.84, "rgba(60,38,22,1)");
    for (let i = 0; i < 4; i++) {
      const x = k.w * (0.15 + i * 0.24);
      const a = Math.sin(k.bar * Math.PI * 2 + i) * (0.15 + 0.25 * k.busy);
      const ex = x + Math.sin(a) * 18;
      const ey = Math.cos(a) * 18;
      k.line(x, 0, ex, ey, "rgba(40,26,16,1)");
      k.glow(ex, ey + 3, 16, [255, 190, 100], 0.3);
      k.R(ex - 2, ey, 4, 5, "rgba(255,210,130,0.9)");
    }
    k.R(k.w * 0.78, k.h * 0.84 - 14, 14, 14, "rgba(80,50,26,1)");
    k.figure(k.w * 0.78 + 7, k.h * 0.84 - 14, "rgba(30,20,14,1)", 0, 2);
    const turn = k.bar * Math.PI;
    for (let i = 0; i < 2; i++) k.figure(k.w * 0.45 + Math.cos(turn + i * Math.PI) * 12, k.h * 0.84, "rgba(30,20,14,1)", Math.floor(k.bar * 3) % 2, 3);
  },
  // The Wanderer: a quiet path through gentle hills, day into evening.
  wtc2f19: (k) => {
    k.sky(DAY_T, DAY_L, [80, 70, 110], [230, 160, 120]);
    k.orb(0.25, 0.25, 0.6, 4, [255, 230, 180], 0.2);
    k.hills(0.6, 10, 0.04, 4, "rgba(90,110,90,1)");
    k.hills(0.72, 8, 0.15, 9, "rgba(70,90,70,1)");
    k.along(50, 0.4, (x, i) => roundTree(k, x, k.h * 0.82, 6 + hash(i) * 5, "rgba(40,60,40,1)"), 20);
    k.ground(0.82, "rgba(110,96,70,1)", "rgba(220,200,160,0.2)", 0.8);
    const wd = k.wander(50, 0.2);
    k.figure(wd.x, k.h * 0.82, "rgba(40,34,30,1)", wd.step, 2);
  },
  // The Earthquake: a city street splitting; the crack lengthens with each entry.
  wtc2f20: (k) => {
    k.sky([40, 36, 40], [100, 80, 70], [30, 20, 24], [110, 60, 50]);
    skyline(k, 0.78, 0.15, "rgba(40,34,36,1)", 0.5);
    k.ground(0.78, "rgba(60,56,56,1)");
    const shake = !k.still && (k.stretto > 0.5 || k.ents.some((e) => Math.abs(k.xOf(e) - k.xOf(k.now())) < k.pxBar * 0.15)) ? Math.sin(k.sec * 40) * (1 + 2 * k.stretto) : 0;
    let x = k.w * 0.05;
    let y = k.h * 0.88;
    k.g.strokeStyle = "rgba(10,8,10,0.95)";
    k.g.lineWidth = 2;
    k.g.beginPath();
    k.g.moveTo(x, y);
    for (let i = 0; i < Math.min(k.passed * 3, 40); i++) {
      x += 8;
      y = k.h * 0.88 + (hash(i) - 0.5) * 10;
      k.g.lineTo(x, y);
    }
    k.g.stroke();
    const lp = k.w * 0.7 + shake;
    k.g.save();
    k.g.translate(lp, k.h * 0.78);
    k.g.rotate(-0.04 * Math.min(k.passed, 8));
    k.R(-1, -40, 3, 40, "rgba(30,28,30,1)");
    k.glow(0, -42, 12, [255, 210, 140], 0.3);
    k.g.restore();
  },
  // The Cradle: the fireside; the cradle rocks once a bar.
  wtc2f21: (k) => {
    k.room([40, 26, 20], [24, 16, 12], 0.84, "rgba(40,26,18,1)");
    const fx = k.w * 0.22;
    k.R(fx - 20, k.h * 0.4, 40, k.h * 0.44, "rgba(30,22,20,1)");
    k.glow(fx, k.h * 0.78, 40, [255, 130, 50], 0.35 + (k.still ? 0 : 0.05 * Math.sin(k.sec * 5)));
    for (let i = 0; i < 5; i++) k.tri(fx - 10 + i * 5, k.h * 0.84, 6, 8 + (k.still ? 0 : Math.sin(k.sec * 6 + i) * 3), "rgba(255,170,70,0.8)");
    const cx = k.w * 0.6;
    const a = Math.sin(k.bar * Math.PI * 2) * 0.12;
    k.g.save();
    k.g.translate(cx, k.h * 0.84);
    k.g.rotate(a);
    k.g.fillStyle = "rgba(90,60,36,1)";
    k.g.beginPath();
    k.g.arc(0, -10, 16, 0, Math.PI);
    k.g.fill();
    k.R(-16, -12, 32, 2, "rgba(110,76,44,1)");
    k.g.restore();
    k.figure(k.w * 0.75, k.h * 0.84, "rgba(30,20,16,1)", 0, 3);
  },
  // The Colossus: a giant statue over a harbour; ships pass small at its feet.
  wtc2f22: (k) => {
    k.sky([90, 120, 160], [220, 200, 170], [50, 60, 100], [230, 150, 110], 0.7);
    const sx = k.w * 0.65;
    const firm = 0.4 + 0.6 * Math.min(1, k.passed / Math.max(1, k.ents.length));
    const c = `rgba(60,56,60,${firm})`;
    k.R(sx - 10, k.h * 0.22, 20, k.h * 0.5, c);
    k.disc(sx, k.h * 0.18, 7, c);
    k.R(sx + 8, k.h * 0.08, 4, k.h * 0.16, c);
    k.R(sx - 16, k.h * 0.72 - 6, 32, 6, c);
    k.vgrad(k.h * 0.7, k.h * 0.3, [[0, "rgba(60,90,120,1)"], [1, "rgba(30,50,70,1)"]]);
    for (let y = k.h * 0.74; y < k.h; y += 6) k.R(wrap(y * 17 - k.bar * k.pxBar * 0.3, k.w), y, 12, 1, "rgba(200,220,240,0.18)");
    k.along(70, 0.5, (x, i) => {
      const y = k.h * (0.8 + (i % 2) * 0.08);
      k.R(x, y, 14, 3, "rgba(50,34,26,1)");
      k.tri(x + 7, y, 10, 10, "rgba(220,210,190,0.8)");
    }, 30);
  },
  // The Elegy: a willow by a grave at dusk; its branches move, slower as the piece ends, then still.
  wtc2f23: (k) => {
    k.sky([60, 50, 80], [180, 120, 110], [20, 18, 36], [70, 50, 70]);
    k.stars(30, 0.6);
    k.hills(0.86, 6, 0.02, 3, "rgba(30,34,30,1)");
    const tx = k.w * 0.6;
    k.R(tx - 3, k.h * 0.3, 6, k.h * 0.56, "rgba(26,22,20,1)");
    const sway = (1 - k.p) * (k.still ? 0 : Math.sin(k.sec * 0.5));
    for (let i = 0; i < 16; i++) {
      const bx = tx + (i - 8) * 4;
      const len = k.h * (0.3 + hash(i) * 0.2);
      for (let y = 0; y < len; y += 2) k.R(bx + sway * (y / len) * 6, k.h * 0.3 + y, 1, 2, "rgba(40,60,40,0.8)");
    }
    k.R(k.w * 0.32, k.h * 0.86 - 14, 10, 14, "rgba(90,86,84,0.9)");
    k.disc(k.w * 0.32 + 5, k.h * 0.86 - 14, 5, "rgba(90,86,84,0.9)");
    k.figure(k.w * 0.42, k.h * 0.86, "rgba(24,20,22,1)", 0, 2);
  },
  // The Last Dance: an emptying ballroom; the candles go out one by one, one left at the end.
  wtc2f24: (k) => {
    k.room([36, 24, 34], [20, 12, 20], 0.86, "rgba(36,24,28,1)");
    arches(k, "rgba(14,8,14,0.85)", 4);
    const n = 9;
    const left = Math.max(1, Math.round(n * (1 - k.p)));
    for (let i = 0; i < n; i++) k.candle(k.w * (0.1 + (0.8 * i) / (n - 1)), k.h * 0.4, 6, i < left);
    const turn = k.bar * Math.PI * 0.5;
    k.figure(k.w * 0.5 + Math.cos(turn) * 10, k.h * 0.86, "rgba(26,16,24,1)", 0, 3);
    k.figure(k.w * 0.5 - Math.cos(turn) * 10, k.h * 0.86, "rgba(40,26,34,1)", 0, 3);
  },
};

/** The daylight worlds: a heavier veil, so the notes keep their contrast over a bright sky. */
const BRIGHT = new Set(["wtc1f03", "wtc1f07", "wtc1f09", "wtc1f10", "wtc1f11", "wtc2f06", "wtc2f11", "wtc2f14", "wtc2f19", "wtc2f22", "wtc2f15"]);

/** The pieces that have a world. */
export const STAGE_IDS: readonly string[] = Object.keys(WORLDS);
export const hasStage = (id: string | undefined) => !!id && id in WORLDS;

const KIT = new Kit();
type Piece = { ents: number[]; cads: number[]; end: number; spans: { on: number; end: number; other: boolean }[]; dens: number[]; dLo: number; dHi: number };
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
    cads: f.cadences.map((c) => c.on),
    end: f.length,
    spans: f.entries.map((e) => ({ on: e.on, end: e.end, other: isMinor(e.key) !== home })),
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
  k.cads = m.cads;
  let passed = 0;
  while (passed < m.ents.length && m.ents[passed] <= clock.now) passed++;
  k.passed = passed;
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
  g.save();
  world(k);
  g.restore();
  g.globalAlpha = 1;
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
  // The veil: the world kept under the music (QUIET heavier), darkest in the middle band where the notes run.
  const a = (mode === "quiet" ? 0.62 : 0.4) + (BRIGHT.has(f.id) ? 0.14 : 0);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, `rgba(8,8,16,${a * 0.75})`);
  gr.addColorStop(0.5, `rgba(8,8,16,${a})`);
  gr.addColorStop(1, `rgba(8,8,16,${a * 0.75})`);
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  return true;
}
