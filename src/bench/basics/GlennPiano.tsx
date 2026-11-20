/**
 * D681 (design studio; the owner: BASICS's host, "Glenn, as stylised pixel art in the LucasArts/Monkey Island
 * manner"): Glenn at the piano in a small window above the box, seen over his shoulder (so his left hand is on
 * the left, with the low notes, as the player's left thumb). An original figure in the game's own Glenn
 * (GlennFace.tsx's colours: the swept-back hair, the olive scarf, the dark coat), drawn on a 120×40 grid and
 * scaled by whole pixels: chunky outlines, two-tone dithered shading, a warm lamp from the left.
 *
 * His hands play the notes that sound, in sync (the left the notes below middle C, the right the rest), each
 * key pressed lit; he hunches as the music thickens, hums (small notes rising), lifts a hand at the end of a
 * phrase (a hand with nothing to play for a beat). Between excerpts he turns the page (TURN_MS); between
 * step 6's passes he leafs back (the rewind); at the end he shrugs. Drawing only: nothing judged reads it.
 */
import { useEffect, useRef } from "react";

export type GlennMode = "play" | "turn" | "rewind" | "shrug" | "idle";
export interface GlennSource {
  now: number;
  /** Ticks a second, and a beat in ticks. */
  tps: number;
  beat: number;
  notes: readonly { on: number; dur: number; midi: number }[];
}

const W = 120;
const H = 40;
const C = {
  wall: "#2a2030",
  wall2: "#231b29",
  lamp: "#3a2c34",
  piano: "#0f0d13",
  rim: "#2c2733",
  shine: "#463f50",
  stand: "#1a1612",
  page: "#efe8d6",
  page2: "#cfc6b0",
  ink: "#8a8070",
  white: "#e9e4d6",
  whiteSh: "#b9b2a2",
  black: "#141018",
  lit: "#ffd75e",
  litB: "#c9a03a",
  hair: "#4a3424",
  hair2: "#6e5038",
  skin: "#e6c09c",
  skin2: "#c49470",
  scarf: "#6f7d68",
  scarf2: "#55604f",
  coat: "#262c3c",
  coat2: "#1b2030",
  coatHi: "#343c50",
  out: "#0a0810",
  note: "#ffe9a8",
};

// The keyboard: 52 white keys (A0 to C8), two pixels each, from x = 8.
const KEY_X0 = 8;
const KEY_Y = 24;
const WHITE_PC = [0, 2, 4, 5, 7, 9, 11];
const whiteIndex = (midi: number) => {
  const o = Math.floor(midi / 12);
  const pc = midi % 12;
  const w = WHITE_PC.filter((p) => p <= pc).length - 1;
  return o * 7 + w - (Math.floor(21 / 12) * 7 + 5);
};
const isBlack = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);
export const keyX = (midi: number) => KEY_X0 + Math.max(0, Math.min(51, whiteIndex(Math.max(21, Math.min(108, midi))))) * 2 + (isBlack(midi) ? 1 : 0);

interface Hand {
  x: number;
  y: number;
  down: boolean;
  idle: number;
}

function px(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ink: string) {
  c.fillStyle = ink;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
/** A thick pixel line (an arm), Bresenham's steps, `t` pixels wide. */
function limb(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, t: number, ink: string) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) px(c, x0 + ((x1 - x0) * i) / n - t / 2, y0 + ((y1 - y0) * i) / n - t / 2, t, t, ink);
}

function scene(c: CanvasRenderingContext2D, lit: Set<number>, hands: { l: Hand; r: Hand }, o: { hunch: number; hum: number; turn: number; rewind: number; shrug: number; glance: number; t: number }) {
  // The wall, dithered, the lamp's warmth from the left.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x += 1) {
      const warm = Math.max(0, 1 - Math.hypot(x - 14, y - 6) / 46);
      const dither = (x + y) % 2 === 0;
      c.fillStyle = warm > 0.45 || (warm > 0.25 && dither) ? C.lamp : dither && y > 20 ? C.wall2 : C.wall;
      c.fillRect(x, y, 1, 1);
    }
  // The piano: the case behind the keys, its rim lit, the music desk and the page.
  px(c, 4, 12, 112, 12, C.piano);
  px(c, 4, 12, 112, 1, C.shine);
  px(c, 4, 23, 112, 1, C.rim);
  px(c, 44, 2, 32, 11, C.stand);
  px(c, 44, 2, 32, 1, C.rim);
  // The page (turning: the leaf sweeps right to left, its back shown as it passes the middle).
  const leaf = o.turn > 0 ? o.turn : o.rewind > 0 ? 1 - ((o.rewind * 3) % 1) : 0;
  px(c, 47, 3, 13, 9, C.page);
  px(c, 60, 3, 13, 9, C.page);
  px(c, 60, 3, 1, 9, C.page2);
  for (const y of [5, 7, 9]) {
    px(c, 48, y, 11, 1, C.page2);
    px(c, 61, y, 11, 1, C.page2);
  }
  for (const [x, y] of [[49, 4], [52, 6], [55, 5], [58, 8], [62, 6], [65, 4], [68, 7], [70, 9]]) px(c, x, y, 1, 1, C.ink);
  if (leaf > 0 && leaf < 1) {
    const w = Math.round(13 * Math.cos(Math.PI * leaf));
    if (w > 0) px(c, 60, 2, w, 10, C.page);
    else px(c, 60 + w, 2, -w, 10, C.page2);
    px(c, 60 + w, 2, 1, 10, C.ink);
  }
  // The keys: white, the black above them, each sounding key lit.
  px(c, KEY_X0 - 1, KEY_Y, 52 * 2 + 1, 6, C.whiteSh);
  for (let k = 0; k < 52; k++) px(c, KEY_X0 + k * 2, KEY_Y, 1, 5, C.white);
  for (let m = 21; m <= 108; m++) {
    const x = keyX(m);
    if (isBlack(m)) px(c, x, KEY_Y, 1, 3, lit.has(m) ? C.litB : C.black);
    else if (lit.has(m)) px(c, x, KEY_Y, 1, 5, C.lit);
  }
  px(c, KEY_X0 - 2, KEY_Y + 6, 52 * 2 + 3, 2, C.piano);
  // Glenn, over his shoulder: low, hunched, the coat, the scarf, the swept-back hair.
  const cx = 60;
  const sh = Math.round(o.shrug * 3);
  const hy = 15 + Math.round(o.hunch * 3) - sh;
  // Arms first (behind the hands, in front of the keys): from the shoulders, out, then up to the keys.
  const sy = 31 - sh;
  const lh = o.shrug > 0.3 ? { x: cx - 24, y: 19 } : hands.l;
  const rh = o.shrug > 0.3 ? { x: cx + 22, y: 19 } : hands.r;
  for (const [x0, h, dir] of [[cx - 13, lh, -1], [cx + 13, rh, 1]] as const) {
    const ex = x0 + dir * 4;
    const ey = sy + 3;
    limb(c, x0, sy, ex, ey, 5, C.out);
    limb(c, ex, ey, h.x + 1, h.y + 3, 5, C.out);
    limb(c, x0, sy, ex, ey, 3, C.coat);
    limb(c, ex, ey, h.x + 1, h.y + 3, 3, C.coat);
    limb(c, ex, ey - 1, h.x + 1, h.y + 2, 1, C.coatHi);
  }
  for (const h of [lh, rh]) {
    px(c, h.x - 1, h.y - 1, 5, 5, C.out);
    px(c, h.x, h.y, 3, 3, C.skin);
    px(c, h.x, h.y + 2, 3, 1, C.skin2);
    px(c, h.x + 1, h.y, 1, 1, C.skin2);
    if (o.shrug > 0.3) px(c, h.x, h.y - 2, 3, 2, C.skin);
  }
  // The back: the coat's shoulders, round with the hunch (lit from the left), a crease, the raised collar.
  px(c, cx - 16, 30 - sh, 32, 10 + sh, C.out);
  px(c, cx - 15, 31 - sh, 30, 9 + sh, C.coat);
  px(c, cx - 17, 32 - sh, 2, 8 + sh, C.out);
  px(c, cx + 15, 32 - sh, 2, 8 + sh, C.out);
  px(c, cx - 15, 31 - sh, 10, 9 + sh, C.coatHi);
  px(c, cx - 15, 31 - sh, 30, 1, C.coatHi);
  for (let y = 33 - sh; y < 40; y++) px(c, cx + 4 + ((y >> 1) % 2), y, 1, 1, C.coat2);
  px(c, cx + 9, 33 - sh, 5, 7 + sh, C.coat2);
  // The scarf: once round the neck, its end hanging down his back on the left.
  px(c, cx - 9, 27 - sh, 18, 5, C.out);
  px(c, cx - 8, 28 - sh, 16, 3, C.scarf);
  px(c, cx + 2, 28 - sh, 6, 3, C.scarf2);
  px(c, cx - 7, 31 - sh, 4, 7, C.out);
  px(c, cx - 6, 31 - sh, 2, 6, C.scarf);
  px(c, cx - 6, 34 - sh, 2, 1, C.scarf2);
  // The nape, then the head from behind (turned a little to the right when he glances, as at a rewind).
  const g = Math.round(o.glance * 2);
  px(c, cx - 4, hy + 10, 8, 3, C.skin2);
  px(c, cx - 7 + g, hy - 1, 14, 13, C.out);
  px(c, cx - 6 + g, hy, 12, 11, C.hair);
  // The hair swept back: streaks from the brow to the crown, the lamp on the left.
  px(c, cx - 6 + g, hy, 4, 8, C.hair2);
  for (const [x, y, n] of [[cx - 3, hy + 1, 5], [cx, hy, 7], [cx + 3, hy + 1, 6]]) for (let i = 0; i < n; i += 2) px(c, x + g + (i >> 2), y + i, 1, 1, C.hair2);
  px(c, cx - 5 + g, hy + 10, 10, 1, C.hair);
  // The ears; turned, the cheek, the brow and the nose.
  px(c, cx - 8 + g, hy + 4, 2, 3, C.out);
  px(c, cx - 7 + g, hy + 4, 1, 2, C.skin);
  px(c, cx + 6 + g, hy + 4, 2, 3, C.out);
  px(c, cx + 6 + g, hy + 4, 1, 2, C.skin);
  if (g > 0) {
    px(c, cx + 5 + g, hy + 3, 3, 6, C.skin);
    px(c, cx + 8 + g, hy + 5, 1, 2, C.skin);
    px(c, cx + 5 + g, hy + 3, 3, 1, C.hair);
    px(c, cx + 6 + g, hy + 4, 1, 1, C.out);
  }
  // Humming: small notes rising over his head.
  if (o.hum > 0) {
    for (let i = 0; i < 2; i++) {
      const p = (o.t / 1600 + i * 0.5) % 1;
      const x = cx + 8 + i * 3 + Math.round(Math.sin(p * 6) * 1.5);
      const y = hy - 2 - Math.round(p * 10);
      if (y < 1) continue;
      c.globalAlpha = o.hum * (1 - p);
      px(c, x, y, 2, 1, C.note);
      px(c, x + 1, y - 2, 1, 3, C.note);
      c.globalAlpha = 1;
    }
  }
}

/**
 * Glenn at the piano. `src()` gives the music sounding now (the game's notes, the player's and the band's);
 * `mode` the moment: playing, turning the page, leafing back, the shrug.
 */
export function GlennPiano({ src, mode, className }: { src: () => GlennSource | null; mode: GlennMode; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const since = useRef(performance.now());
  if (modeRef.current !== mode) {
    modeRef.current = mode;
    since.current = performance.now();
  }
  const srcRef = useRef(src);
  srcRef.current = src;
  useEffect(() => {
    const cv = ref.current;
    const c = cv?.getContext("2d");
    if (!cv || !c) return;
    cv.width = W;
    cv.height = H;
    c.imageSmoothingEnabled = false;
    const hands = { l: { x: keyX(48), y: KEY_Y - 1, down: false, idle: 0 }, r: { x: keyX(72), y: KEY_Y - 1, down: false, idle: 0 } };
    let hunch = 0;
    let hum = 0;
    let raf = 0;
    let last = performance.now();
    const tick = () => {
      const t = performance.now();
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const m = modeRef.current;
      const age = t - since.current;
      const s = m === "play" ? srcRef.current() : null;
      const lit = new Set<number>();
      let lows: number[] = [];
      let highs: number[] = [];
      let thick = 0;
      if (s) {
        for (const n of s.notes) if (n.on <= s.now && s.now < n.on + n.dur) lit.add(n.midi);
        lows = [...lit].filter((x) => x < 60);
        highs = [...lit].filter((x) => x >= 60);
        // How thick the music is: the notes begun in the last beat.
        thick = s.notes.filter((n) => n.on <= s.now && n.on > s.now - s.beat).length;
      }
      const ease = (h: Hand, keys: number[], home: number) => {
        if (keys.length) {
          const x = keys.reduce((a, b) => a + keyX(b), 0) / keys.length - 1;
          h.x += (x - h.x) * Math.min(1, dt * 18);
          h.down = true;
          h.idle = 0;
        } else {
          h.down = false;
          h.idle += dt;
          if (!s) h.x += (keyX(home) - h.x) * Math.min(1, dt * 2);
        }
        // Pressed: on the key; at rest: just above; a phrase's end (nothing for a beat): the hand lifted, a breath.
        const beatS = s ? s.beat / Math.max(1, s.tps) : 0.6;
        const lift = h.idle > beatS ? Math.min(4, (h.idle - beatS) * 10) : 0;
        const want = h.down ? KEY_Y : KEY_Y - 2 - lift;
        h.y += (want - h.y) * Math.min(1, dt * 22);
      };
      ease(hands.l, lows, 48);
      ease(hands.r, highs, 72);
      hunch += ((s ? Math.min(1, thick / 6) : 0) - hunch) * Math.min(1, dt * 3);
      hum += ((s && lit.size ? 1 : 0) - hum) * Math.min(1, dt * 2);
      const turn = m === "turn" ? Math.min(1, age / 1000) : 0;
      const rewind = m === "rewind" ? Math.min(0.999, age / 1000) : 0;
      const shrug = m === "shrug" ? Math.min(1, age / 300) * (age < 2600 ? 1 : Math.max(0, 1 - (age - 2600) / 400)) : 0;
      const glance = m === "rewind" ? Math.min(1, age / 250) : 0;
      scene(c, lit, hands, { hunch, hum, turn, rewind, shrug, glance, t });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className={className ?? "basics-glenn"} aria-label="Glenn at the piano" />;
}
