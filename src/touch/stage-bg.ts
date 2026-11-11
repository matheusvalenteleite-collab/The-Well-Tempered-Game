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
  // The Canon (D649): each entry a singer steps forward into a spotlight and stays lit; as the entries pile up the
  // chorus comes in from the wings; at the climax the whole stage is lit, the curtain's fringe glowing gold.
  wtc1f01: (k) => {
    k.room([30, 16, 24], [14, 8, 14], 0.82, "rgba(40,24,20,1)");
    k.curtains([120, 26, 34]);
    k.glow(k.w * 0.5, k.h * 0.6, k.w * 0.4, [255, 220, 160], 0.35 * k.climax);
    k.R(0, k.h * 0.08, k.w, 2, `rgba(240,200,110,${0.25 + 0.6 * k.climax})`);
    const chorus = Math.min(10, Math.max(0, k.passed - 4));
    for (let i = 0; i < chorus; i++) {
      const born = i === chorus - 1 ? Math.min(1, k.since * 2) : 1;
      const side = i % 2 ? 1 : -1;
      const x = k.w * (0.5 + side * (0.26 - 0.022 * Math.floor(i / 2))) + side * (1 - born) * 40;
      k.figure(x, k.h * 0.78, `rgba(60,44,54,${born})`, 0, 2);
    }
    for (let i = 0; i < 4; i++) {
      const x = k.w * (0.32 + i * 0.12);
      const on = k.passed > i;
      const step = on ? Math.min(1, (i === k.passed - 1 ? k.since : 1) * 2) : 0;
      if (on) k.glow(x, k.h * 0.55, 30 + 10 * k.climax, [255, 220, 160], 0.22 + 0.12 * k.stretto + 0.2 * k.climax);
      k.figure(x, k.h * 0.82 - i * 3 + 4 * step, on ? "rgba(90,64,76,1)" : "rgba(30,20,28,1)", 0, 3);
      if (on && !k.still && Math.sin(k.sec * 2 + i) > 0) k.R(x + 1, k.h * 0.82 - i * 3 + 4 * step - 22, 2, 2, "rgba(20,10,14,1)");
    }
  },
  // The Imp (D649): each entry the imp throws a log on the fire and it grows a step; the sparks fly higher and his shadow
  // on the cave wall grows; at the climax the fire roars up the wall, the imp dancing on its rim, the cave lit red.
  wtc1f02: (k) => {
    const grow = Math.min(1, k.passed / Math.max(1, k.ents.length));
    const roar = k.climax;
    k.vgrad(0, k.h, [[0, "#140a10"], [0.7, "#2a1014"], [1, "#3a160e"]]);
    k.glow(k.w * 0.5, k.h * 0.6, k.w * 0.5, [255, 90, 40], 0.25 * roar);
    k.hills(0.25, 10, 0.05, 2, "rgba(8,4,8,0.9)", true);
    k.g.save();
    k.g.scale(1, -1);
    k.g.translate(0, -k.h);
    k.hills(0.86, 8, 0.1, 5, "rgba(8,4,8,0.9)", true);
    k.g.restore();
    const fx = k.w * 0.5;
    const fy = k.h * 0.92;
    const size = 18 + 26 * grow + 40 * roar;
    k.glow(fx, fy, 50 + 50 * grow + 60 * roar + 20 * k.busy, [255, 110, 40], 0.25 + 0.15 * grow + 0.2 * roar);
    for (let i = 0; i < 6 + 10 * grow + 12 * roar; i++) {
      const fl = k.still ? 0.5 : wrap(k.t * 1.3 + hash(i), 1);
      k.R(fx + (hash(i + 4) - 0.5) * size, fy - fl * size * 1.2, 2, 3, `rgba(255,${Math.round(200 - 120 * fl)},60,${1 - fl})`);
    }
    for (let i = 0; i < 10 + 16 * grow; i++) {
      const tt = wrap(k.t * 0.15 + hash(i), 1);
      k.R(fx + (hash(i + 2) - 0.5) * k.w * 0.3 + Math.sin(tt * 9 + i) * 4, fy - tt * k.h * (0.4 + 0.5 * grow + 0.3 * roar), 1, 1, `rgba(255,160,70,${0.7 * (1 - tt)})`);
    }
    for (let i = 0; i < Math.min(k.passed, 12); i++) k.R(fx - 14 + (i % 4) * 7, fy - 2 - Math.floor(i / 4) * 2, 6, 2, "rgba(70,40,24,1)");
    const imp = k.wander(14, 0.3, 0.3, 0.7);
    const throwing = k.since < 0.5;
    const lx = roar > 0.5 ? fx + Math.sin(k.t * 2) * size * 0.5 : imp.x;
    const ly = roar > 0.5 ? fy - size * 0.9 : k.h * 0.9;
    const hop = k.still ? 0 : Math.abs(Math.sin(k.sec * Math.PI * (1.6 + roar))) * (8 + 8 * roar);
    k.g.fillStyle = `rgba(20,6,8,${0.35 + 0.25 * grow})`;
    k.g.fillRect(lx - 4 - 8 * grow, k.h * 0.2, 12 + 16 * grow, k.h * (0.3 + 0.3 * grow));
    k.figure(lx, ly - hop, "rgba(170,44,44,1)", 0, 2);
    k.R(lx - 2, ly - hop - 22, 1, 3, "rgba(170,44,44,1)");
    k.R(lx + 4, ly - hop - 22, 1, 3, "rgba(170,44,44,1)");
    if (throwing && roar < 0.5) {
      const u = k.since / 0.5;
      k.R(lx + (fx - lx) * u - 3, ly - 20 - Math.sin(u * Math.PI) * 18, 6, 2, "rgba(110,70,40,1)");
    }
  },
  // The Stone-Skipper (D649; the owner: "Little Red Riding Hood in the background … throwing the stones, jumping around"):
  // she wanders the bank and throws a stone on each entry; its rings stay on the water and cross the others'; at the
  // climax a stone skips the whole pond and the water is lit gold.
  wtc1f03: (k) => {
    k.sky(DAY_T, [210, 190, 150], [120, 90, 120], [230, 150, 100], 0.55);
    k.hills(0.5, 6, 0.05, 1, "rgba(50,70,60,1)");
    k.along(18, 0.12, (x, i) => roundTree(k, x, k.h * 0.52, 5 + hash(i) * 4, "rgba(34,52,40,1)"));
    k.vgrad(k.h * 0.55, k.h * 0.45, [[0, "rgba(70,100,120,1)"], [1, "rgba(30,50,70,1)"]]);
    if (k.climax > 0.01) k.vgrad(k.h * 0.55, k.h * 0.45, [[0, `rgba(255,200,110,${0.35 * k.climax})`], [1, `rgba(255,170,80,${0.15 * k.climax})`]]);
    for (let y = k.h * 0.6; y < k.h; y += 7) k.R(wrap(y * 13 - k.bar * k.pxBar * 0.3, k.w), y, 10, 1, "rgba(200,220,230,0.18)");
    const n = Math.min(14, k.passed);
    for (let i = 0; i < n; i++) {
      const x = k.w * (0.3 + 0.4 * hash(i + 3));
      const y = k.h * (0.66 + 0.2 * hash(i + 7));
      const age = i === n - 1 ? Math.min(1, k.since * 2) : 1;
      for (let r = 1; r <= 3; r++) {
        k.g.strokeStyle = `rgba(210,230,240,${(0.4 / r) * age})`;
        k.g.lineWidth = 1;
        k.g.beginPath();
        k.g.ellipse(x, y, (4 + 4 * age) * r, (1.3 + 1.3 * age) * r, 0, 0, Math.PI * 2);
        k.g.stroke();
      }
    }
    // Red Riding Hood on the near bank: wandering, hopping, throwing on each entry.
    const girl = k.wander(16, 0.2, 0.28, 0.72);
    const gx = girl.x;
    const gy = k.h * 0.6;
    const hop = k.still ? 0 : Math.abs(Math.sin(k.sec * 3)) * 3;
    k.R(gx - 3, gy - 10 - hop, 7, 9, "rgba(200,40,40,1)");
    k.R(gx - 2, gy - 14 - hop, 5, 4, "rgba(200,40,40,1)");
    k.R(gx - 1, gy - 13 - hop, 3, 3, "rgba(240,200,170,1)");
    k.R(gx - 1, gy - 1 - hop, 1, 2, "rgba(40,30,30,1)");
    k.R(gx + 2, gy - 1 - hop, 1, 2, "rgba(40,30,30,1)");
    if (k.since < 0.6) {
      const u = k.since / 0.6;
      const i = n - 1;
      const tx = k.w * (0.3 + 0.4 * hash(i + 3));
      const ty = k.h * (0.66 + 0.2 * hash(i + 7));
      k.R(gx + 3, gy - 14 - hop, 1, 4, "rgba(240,200,170,1)");
      if (u < 1) k.R(gx + (tx - gx) * u, gy - 10 + (ty - gy + 10) * u - Math.sin(u * Math.PI) * 14, 2, 2, "rgba(150,150,160,1)");
    }
    if (k.climax > 0.5) {
      const u = wrap(k.t * 0.3, 1);
      for (let j = 0; j < 6; j++) {
        const x = k.w * (0.25 + 0.5 * Math.min(u * 1.2, (j + 1) / 6));
        k.g.strokeStyle = `rgba(255,236,190,${0.5 * k.climax})`;
        k.g.beginPath();
        k.g.ellipse(x, k.h * 0.72, 5, 1.5, 0, 0, Math.PI * 2);
        k.g.stroke();
      }
    }
    k.along(30, 0.9, (x, i) => {
      for (let j = 0; j < 4; j++) k.R(x + j * 2, k.h - 4 - (6 + hash(i + j) * 10), 1, 6 + hash(i + j) * 10, "rgba(40,60,36,0.9)");
    });
  },
  // The Cross (D649): each of the five entries lights a candle at the cross's foot as the night thickens; in the strettos
  // their light reaches higher up the hill; at the climax dawn breaks behind the cross, the five flames in the first light.
  wtc1f04: (k) => {
    k.sky(DUSK_T, DUSK_L, NIGHT, [40, 24, 50]);
    k.stars(50 * (1 - k.climax), 0.5);
    const cx = k.w * 0.55;
    const base = k.h * 0.74;
    if (k.climax > 0.01) {
      k.glow(cx, base - 10, k.w * 0.5, [255, 200, 140], 0.45 * k.climax);
      k.vgrad(k.h * 0.4, k.h * 0.34, [[0, "rgba(255,190,130,0)"], [1, `rgba(255,190,130,${0.4 * k.climax})`]]);
    }
    k.hills(0.82, 12, 0.03, 3, "rgba(24,16,26,1)");
    const lit = Math.min(5, k.passed);
    k.glow(cx, base, 20 + 12 * lit + 40 * k.stretto, [255, 190, 110], 0.12 + 0.05 * lit);
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
  // The Ambush (D649): each entry a pair of eyes opens in the trees, more of them as the entries pile up; at the climax
  // the ambushers break cover with torches and the road is lit orange; then a quiet road at the last chord.
  wtc1f06: (k) => {
    k.sky([20, 30, 30], [50, 60, 50], [8, 12, 16], [24, 30, 30]);
    k.along(14, 0.1, (x, i) => pine(k, x, k.h * 0.6, 26 + hash(i) * 14, "rgba(16,26,22,1)"), 6);
    k.along(22, 0.35, (x, i) => pine(k, x, k.h * 0.82, 40 + hash(i) * 18, "rgba(8,14,12,1)"), 8);
    k.ground(0.82, "rgba(40,34,24,1)", "rgba(120,100,70,0.3)", 1);
    const out = k.climax * (1 - k.rest);
    const eyes = Math.min(16, k.passed) * (1 - out);
    for (let i = 0; i < eyes; i++) {
      const x = k.w * (0.24 + 0.52 * hash(i * 3 + 1));
      const y = k.h * (0.42 + 0.3 * hash(i * 5 + 2));
      const blink = !k.still && Math.sin(k.sec * 1.3 + i * 2) > 0.95;
      if (!blink) {
        k.R(x - 3, y, 2, 1, "rgba(240,220,120,0.85)");
        k.R(x + 2, y, 2, 1, "rgba(240,220,120,0.85)");
      }
    }
    if (out > 0.01) {
      k.vgrad(k.h * 0.6, k.h * 0.4, [[0, "rgba(255,140,50,0)"], [1, `rgba(255,140,50,${0.3 * out})`]]);
      for (let i = 0; i < 6; i++) {
        const x = k.w * (0.26 + 0.09 * i);
        const y = k.h * 0.84;
        k.figure(x, y, `rgba(20,14,12,${out})`, Math.floor(k.t * 4 + i) % 2, 2);
        k.glow(x + 4, y - 22, 14, [255, 150, 60], 0.6 * out);
        k.R(x + 3, y - 24, 2, 3, `rgba(255,210,120,${out})`);
      }
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
  // The Pilgrim (D649): one walk, afternoon to night, a waymark lit for each entry; the pilgrim walks on (slower in an
  // augmented entry); at the climax the shrine's door opens at the road's end and its light pours down the road.
  wtc1f08: (k) => {
    k.sky([70, 58, 96], [200, 130, 80], NIGHT, [30, 24, 50]);
    k.stars(50, 0.45);
    k.orb(0.7, 0.45, 0.95, 4, [255, 190, 110], 0.25 * (1 - k.p));
    k.hills(0.62, 16, 0.05, 2, "rgba(40,30,50,1)");
    k.hills(0.74, 9, 0.2, 7, "rgba(24,18,30,1)");
    k.along(61, 0.55, (x, i) => cypress(k, x, k.h * 0.86, 18 + (i % 3) * 6, "rgba(10,10,16,0.9)"));
    k.ground(0.86, "rgba(60,44,40,1)", "rgba(220,190,150,0.18)");
    if (k.climax > 0.01) k.vgrad(k.h * 0.82, k.h * 0.18, [[0, `rgba(255,210,130,${0.4 * k.climax})`], [1, "rgba(255,210,130,0)"]]);
    k.atEntries((x) => {
      k.R(x - 2, k.h * 0.86 - 9, 4, 9, "rgba(150,140,130,0.8)");
      k.R(x - 1, k.h * 0.86 - 7, 2, 1, "rgba(240,220,160,0.8)");
      k.glow(x, k.h * 0.86 - 7, 8, [255, 210, 130], 0.3);
    });
    const walker = k.w * (0.3 + 0.1 * Math.sin(k.t * 0.2));
    k.figure(walker, k.h * 0.86, "rgba(30,24,30,1)", Math.floor(k.t * 2) % 2, 2);
    k.R(walker + 5, k.h * 0.86 - 24, 1, 24, "rgba(60,44,30,1)");
    const sx = Math.min(k.end, k.w * 0.74);
    const near = k.end < k.w + 30 || k.climax > 0.01;
    if (near) {
      k.R(sx - 8, k.h * 0.86 - 18, 16, 18, "rgba(40,34,40,1)");
      k.tri(sx, k.h * 0.86 - 18, 22, 10, "rgba(40,34,40,1)");
      k.glow(sx, k.h * 0.86 - 10, 22 + 60 * k.climax, [255, 200, 110], 0.5 + 0.3 * k.climax);
      k.R(sx - 2, k.h * 0.86 - 13, 4, 6, "#ffd88a");
    }
  },
  // The Sparrow (D649): each entry another sparrow lands on the ridge, the flock growing along the roof; at the climax
  // the whole flock takes off together across a clearing sky.
  wtc1f09: (k) => {
    k.sky([110, 150, 190], [200, 210, 220], [150, 120, 150], [240, 190, 150]);
    if (k.climax > 0.01) k.glow(k.w * 0.6, k.h * 0.1, k.w * 0.5, [255, 240, 200], 0.3 * k.climax);
    clouds(k, Math.round(6 * (1 - 0.7 * k.climax)), 0.4, 0.2);
    k.along(40, 0.5, (x, i) => {
      const hh = 20 + hash(i) * 14;
      k.R(x, k.h - hh, 38, hh, "rgba(110,70,60,1)");
      k.tri(x + 19, k.h - hh, 44, 14, "rgba(80,44,40,1)");
      if (hash(i + 2) > 0.5) k.R(x + 26, k.h - hh - 18, 5, 10, "rgba(80,44,40,1)");
    });
    // The first sparrow wanders the ridge on its own clock (D464); the flock gathers round it.
    const lead = k.wander(18, 0.6, 0.26, 0.74);
    const lhop = k.still ? 0 : Math.abs(Math.sin(k.sec * Math.PI * 2.5)) * 5;
    const lup = k.climax > 0.3 ? ((k.climax - 0.3) / 0.7) * k.h * 0.5 : 0;
    k.R(lead.x - 3, k.h * 0.6 - lhop - lup, 6, 4, "rgba(110,80,50,1)");
    k.R(lead.x + 2 * lead.dir, k.h * 0.6 - lhop - lup - 2, 3, 3, "rgba(110,80,50,1)");
    const n = Math.min(16, k.passed);
    const lift = k.climax;
    for (let i = 0; i < n; i++) {
      const bx = k.w * (0.26 + 0.48 * (i / 16)) + (hash(i) - 0.5) * 8;
      const born = i === n - 1 ? Math.min(1, k.since * 2) : 1;
      const fly = lift > 0.3 ? (lift - 0.3) / 0.7 : 0;
      const x = bx + fly * (k.w * 0.3 + hash(i + 5) * 40);
      const y = k.h * 0.6 - (1 - born) * 30 - fly * k.h * (0.4 + 0.2 * hash(i + 2)) - (k.still ? 0 : Math.abs(Math.sin(k.sec * 3 + i)) * (fly ? 3 : 1));
      k.R(x - 3, y, 6, 3, "rgba(110,80,50,1)");
      k.R(x + 2, y - 2, 3, 3, "rgba(110,80,50,1)");
      if (fly > 0 && !k.still && Math.sin(k.sec * 12 + i) > 0) k.R(x - 4, y - 3, 8, 1, "rgba(110,80,50,1)");
    }
  },
  // The Two Horsemen (D649): each entry a rider appears on the plain, the two voices' riders racing side by side, dust
  // rising with the music; at the climax they gallop toward the viewer, the dust lit gold by the high sun.
  wtc1f10: (k) => {
    k.sky([40, 40, 70], [200, 120, 90], [110, 140, 180], [230, 200, 160]);
    k.orb(0.5, 0.75, 0.15 - 0.05 * k.climax, 4 + 3 * k.climax, [255, 220, 160], 0.25 + 0.3 * k.climax);
    k.hills(0.7, 8, 0.04, 4, "rgba(70,60,60,1)");
    k.ground(0.78, "rgba(120,100,70,1)", "rgba(200,180,140,0.25)", 0.9);
    const n = Math.min(6, Math.max(2, k.passed));
    const near = k.climax;
    for (let i = 0; i < n; i++) {
      const sc = 1 + near * 1.2 + (i < 2 ? 0 : -0.3);
      const born = i === k.passed - 1 ? Math.min(1, k.since * 2) : 1;
      const x = k.w * (0.34 + (i % 3) * 0.14 + (i < 2 ? 0 : 0.04)) + (k.still ? 0 : Math.sin(k.sec * 2 + i) * 3);
      const y = k.h * (0.78 + 0.08 * near - (i >= 2 ? 0.05 : 0));
      const c = `rgba(40,28,24,${born})`;
      k.R(x - 6 * sc, y - 7 * sc, 12 * sc, 4 * sc, c);
      k.R(x - 5 * sc, y - 3 * sc, 1 * sc, 3 * sc, c);
      k.R(x + 4 * sc, y - 3 * sc, 1 * sc, 3 * sc, c);
      k.R(x + 5 * sc, y - 10 * sc, 3 * sc, 4 * sc, c);
      k.R(x - 1 * sc, y - 14 * sc, 3 * sc, 7 * sc, c);
      k.glow(x - 10 * sc, y - 2, 10 + 8 * k.busy + 16 * near, near > 0.3 ? [255, 210, 130] : [200, 170, 120], 0.25 + 0.2 * near);
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
    // D474: II the moon in the tall windows; III the vault's gold, the censer's smoke; the end: the rose window at dawn.
    const moon = k.act(1) + 0.4 * k.act(2);
    for (let i = 0; i < 4; i++) if (moon > 0.01) {
      const x = (i + 1) * (k.w / 4) - 6;
      k.R(x, k.h * 0.18, 10, k.h * 0.34, `rgba(120,150,220,${0.35 * moon})`);
      k.R(x + 4, k.h * 0.18, 2, k.h * 0.34, `rgba(10,10,20,${0.6 * moon})`);
    }
    if (k.act(2) > 0.01) {
      k.vgrad(0, k.h * 0.3, [[0, `rgba(120,90,40,${0.5 * k.act(2)})`], [1, "rgba(120,90,40,0)"]]);
      for (let j = 0; j < 5; j++) k.glow(k.w * 0.5 + Math.sin(k.t * 0.2 + j) * 30, k.h * (0.6 - j * 0.1) - wrap(k.t * 3, 20), 26, [200, 190, 170], 0.08 * k.act(2));
    }
    const rose = Math.max(k.act(3), k.climax);
    if (rose > 0.01) {
      const cx = k.w * 0.5, cy = k.h * 0.14;
      k.disc(cx, cy, 16, `rgba(255,220,170,${0.55 * rose})`);
      for (let i = 0; i < 8; i++) k.R(cx + Math.cos((i * Math.PI) / 4) * 10 - 1, cy + Math.sin((i * Math.PI) / 4) * 10 - 1, 3, 3, `rgba(120,60,90,${0.7 * rose})`);
    }
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
    // D474: II the storm at the window (cloud running, the panes wet); III the sign's red hour, the room gone dark round it.
    const storm = k.act(1);
    if (storm > 0.01) {
      const X = k.w * 0.44, Y = k.h * 0.12, W = k.w * 0.14, H = k.h * 0.3;
      k.R(X - 2, Y - 2, W + 4, H + 4, `rgba(40,30,26,${storm})`);
      k.R(X, Y, W, H, `rgba(30,40,70,${storm})`);
      for (let i = 0; i < 3; i++) k.R(X + wrap(k.t * 8 + i * 20, W + 20) - 20, Y + 4 + i * 8, 20, 5, `rgba(70,80,110,${0.8 * storm})`);
      k.R(X + W / 2 - 1, Y, 2, H, `rgba(40,30,26,${storm})`);
      k.R(X, Y + H / 2 - 1, W, 2, `rgba(40,30,26,${storm})`);
    }
    const red = k.act(2);
    if (red > 0.01) k.glow(cx, cy, 70, [220, 60, 50], 0.3 * red);
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
    const cxl = k.w * 0.66;
    const wall = "rgba(110,100,90,1)";
    k.R(cxl, k.h * 0.34, k.w * 0.3, k.h * 0.28, wall);
    for (let x = cxl; x < cxl + k.w * 0.3; x += 8) k.R(x, k.h * 0.3, 5, 5, wall);
    const gx = cxl + k.w * 0.1;
    const gw = k.w * 0.1;
    const gy = k.h * 0.42;
    const gh = k.h * 0.2;
    // The gate falls on the climax's peak (the last entry's onset), over half a bar.
    const fall = Math.max(0, Math.min(1, (k.now() - k.peak) / (k.barTicks * 0.5)));
    const dmg = Math.min(1, k.passed / Math.max(1, k.ents.length - 1));
    if (fall < 1) {
      k.g.save();
      k.g.translate(gx, gy + gh);
      k.g.rotate((-Math.PI / 2) * fall * fall);
      k.R(0, -gh, gw, gh, "rgba(90,58,30,1)");
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
    const fx = k.w * 0.22;
    const fy = k.h * 0.8;
    k.R(fx - 14, fy - 6, 28, 6, "rgba(70,46,28,1)");
    k.tri(fx, fy - 6, 14, 14, "rgba(70,46,28,1)");
    // The shot: flung 0.7 bar before each entry, the stone landing on the entry's onset (the sound's thud there,
    // Instruments' table); the splinters fly over the 0.3 bar after it.
    const next = k.passed < k.ents.length ? k.ents[k.passed] : Infinity;
    const toNext = (next - k.now()) / k.barTicks;
    const flying = toNext <= 0.7 && fall < 1;
    const u = flying ? 1 - toNext / 0.7 : 0;
    const cock = (flying ? 0.3 + 0.7 * Math.min(1, u * 4) : 0.3) * Math.PI * 0.45;
    k.line(fx, fy - 18, fx - Math.cos(cock) * 26, fy - 18 - Math.sin(cock) * 26 + 10, "rgba(90,60,36,1)", 3);
    if (flying) {
      const sx = fx + (gx + gw / 2 - fx) * u;
      const sy = fy - 30 - Math.sin(u * Math.PI) * k.h * 0.35 + (gy + gh / 2 - fy + 30) * u;
      k.glow(sx, sy, 8, [255, 160, 70], 0.8);
      k.R(sx - 2, sy - 2, 4, 4, "rgba(255,225,160,1)");
    }
    if (k.since < 0.3 && fall < 1) for (let i = 0; i < 8; i++) k.R(gx + gw / 2 + Math.cos(i) * k.since * 120, gy + gh / 2 + Math.sin(i) * k.since * 60, 2, 2, "rgba(120,90,60,0.9)");
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
    // D474: II the afternoon; III dusk over the harbour, the beacon lit in the statue's hand; the end: the low sun behind it.
    const dusk = k.act(2) + k.act(3) * (1 - k.climax);
    if (k.act(1) > 0.01) k.vgrad(0, k.h * 0.7, [[0, `rgba(200,140,80,${0.3 * k.act(1)})`], [1, `rgba(255,190,120,${0.45 * k.act(1)})`]]);
    if (dusk > 0.01) k.vgrad(0, k.h * 0.7, [[0, `rgba(30,20,60,${0.75 * dusk})`], [1, `rgba(150,70,90,${0.6 * dusk})`]]);
    const sx = k.w * 0.65;
    const firm = 0.4 + 0.6 * Math.min(1, k.passed / Math.max(1, k.ents.length));
    const c = `rgba(60,56,60,${firm})`;
    k.R(sx - 10, k.h * 0.22, 20, k.h * 0.5, c);
    k.disc(sx, k.h * 0.18, 7, c);
    k.R(sx + 8, k.h * 0.08, 4, k.h * 0.16, c);
    const fire = Math.max(k.act(2), k.act(3));
    if (fire > 0.01) {
      k.glow(sx + 10, k.h * 0.07, 20, [255, 170, 80], 0.6 * fire);
      k.R(sx + 8, k.h * 0.04, 4, 4, `rgba(255,210,120,${fire})`);
    }
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

/** The daylight worlds: a heavier veil, so the notes keep their contrast over a bright sky. */
const BRIGHT = new Set(["wtc1f03", "wtc1f07", "wtc1f09", "wtc1f10", "wtc1f11", "wtc2f06", "wtc2f11", "wtc2f14", "wtc2f19", "wtc2f22", "wtc2f15"]);

/** The pieces that have a world. */
export const STAGE_IDS: readonly string[] = Object.keys(WORLDS);
export const hasStage = (id: string | undefined) => !!id && id in WORLDS;

const KIT = new Kit();
type Piece = { ents: number[]; cads: number[]; end: number; spans: { on: number; end: number; other: boolean; voice: number }[]; dens: number[]; dLo: number; dHi: number; strettos: number[] };
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
