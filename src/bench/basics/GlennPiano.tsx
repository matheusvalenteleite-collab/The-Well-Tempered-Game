/**
 * D681, D683 (design studio; the owner: "Glenn is holding an iPhone in front of piano, and is actually playing the game
 * and not the piano, his left and right arm movements (thumbs) clearly in sync with the music as it ought to be played
 * in the game, so that the player learns also by watching Glenn"): BASICS's host in pixel art (the LucasArts manner),
 * an original figure in the game's own Glenn's colours (GlennFace.tsx: the swept-back hair, the olive scarf, the dark
 * coat), seen over his shoulder: he sits at his piano (unplayed, behind), holding an iPhone sideways in both hands,
 * its screen toward him and so toward us, his left hand on the left.
 *
 * His thumbs play exactly what the game asks (ProtoGame.plan, the game's own touches: which thumb, when, how high on
 * its bar, how long held, and where across the bar it lands, firm by the box or soft by the rim, sliding there on
 * STRONG · SOFT). The phone's screen is a tiny mirror of the game (the two bars, the box between with the notes coming
 * to the gold line), so each touch is read against its bar; each thumb is the game's abstract marker (a disc, its beam
 * toward the lower outer corner, to his hand), lit while down. The forearm and hand follow the thumb, so the motion
 * reads at the window's size. Between excerpts he looks up at the score on the music stand and turns the page; between
 * step 6's passes he leafs back; at the end he lowers the phone and shrugs. Drawing only: nothing judged reads it.
 */
import { useEffect, useRef } from "react";

export type GlennMode = "play" | "turn" | "rewind" | "shrug" | "idle";
export interface GlennSource {
  now: number;
  /** Ticks a second, a beat and a bar in ticks. */
  tps: number;
  beat: number;
  bar: number;
  /** The box's rows now (steps), and how many bars it shows. */
  lo: number;
  hi: number;
  bars: number;
  /** The game's touches (its plan): which thumb, from when to when, at what height, landing where across (0 rim … 1 box). */
  plan: readonly { side: "left" | "right"; on: number; off: number; step: number; d: number }[];
  /** The notes in the box: the player's (bright) and the band's (dim). */
  notes: readonly { on: number; dur: number; step: number; mine: boolean }[];
  /** STRONG · SOFT: each touch slides across its bar to where it lands. */
  slide?: boolean;
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
  white: "#bdb6a6",
  black: "#141018",
  phone: "#101016",
  edge: "#5a5a6a",
  screen: "#1e2240",
  strip: "#2b3156",
  gold: "#f3d78a",
  mine: "#5cb2ff",
  band: "#3e5a74",
  thumb: "#fff0b0",
  thumbUp: "#c9b880",
  hair: "#4a3424",
  hair2: "#6e5038",
  skin: "#e6c09c",
  skin2: "#c49470",
  scarf: "#6f7d68",
  scarf2: "#55604f",
  coat: "#262c3c",
  coatHi: "#343c50",
  out: "#0a0810",
};

// The phone, held up before him: its screen (x0..x1, y0..y1), the bars 22% of it each side (protos.ts BAR).
const PH = { x: 26, y: 8, w: 68, h: 24 };
const SC = { x: PH.x + 3, y: PH.y + 2, w: PH.w - 6, h: PH.h - 4 };
const BW = Math.round(SC.w * 0.22);

function px(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ink: string) {
  c.fillStyle = ink;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
/** A thick pixel line (an arm), `t` pixels wide. */
function limb(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, t: number, ink: string) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) px(c, x0 + ((x1 - x0) * i) / n - t / 2, y0 + ((y1 - y0) * i) / n - t / 2, t, t, ink);
}

export interface ThumbAt {
  side: "left" | "right";
  /** On the screen (grid pixels). */
  x: number;
  y: number;
  down: boolean;
}

/** Where his two thumbs are now, from the game's plan: down on a touch's height while it lasts, else just above the last. */
export function thumbsOf(s: GlennSource, last: Record<"left" | "right", { y: number; x: number }>): ThumbAt[] {
  const yOf = (step: number) => SC.y + 1 + (SC.h - 3) * (1 - (step - s.lo) / Math.max(1, s.hi - s.lo));
  return (["left", "right"] as const).map((side) => {
    const t = s.plan.find((p) => p.side === side && p.on <= s.now && s.now < p.off);
    const x0 = side === "left" ? SC.x : SC.x + SC.w - BW;
    // Across the bar: the rim (0) to the box (1); on STRONG · SOFT sliding there over the touch's first third.
    const across = (d: number) => (side === "left" ? x0 + 1 + d * (BW - 3) : x0 + BW - 2 - d * (BW - 3));
    if (t) {
      const k = s.slide ? Math.min(1, (s.now - t.on) / Math.max(1, (t.off - t.on) / 3)) : 1;
      const d = s.slide ? 0.5 + (t.d - 0.5) * k : 0.5;
      const at = { x: across(d), y: Math.max(SC.y + 1, Math.min(SC.y + SC.h - 2, yOf(t.step))) };
      last[side] = at;
      return { side, ...at, down: true };
    }
    // Lifted: hovering where it last played (toward its next touch as that comes within a beat).
    const nx = s.plan.find((p) => p.side === side && p.on > s.now);
    const to = nx && nx.on - s.now < s.beat ? yOf(nx.step) : last[side].y;
    const y = last[side].y + (to - last[side].y) * 0.25;
    last[side] = { x: across(0.5), y };
    return { side, x: across(0.5), y, down: false };
  });
}

function scene(c: CanvasRenderingContext2D, s: GlennSource | null, thumbs: ThumbAt[] | null, o: { turn: number; rewind: number; shrug: number; look: number; t: number }) {
  // The wall, dithered, the lamp's warmth from the left.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const warm = Math.max(0, 1 - Math.hypot(x - 12, y - 4) / 44);
      const dither = (x + y) % 2 === 0;
      c.fillStyle = warm > 0.45 || (warm > 0.25 && dither) ? C.lamp : dither && y > 20 ? C.wall2 : C.wall;
      c.fillRect(x, y, 1, 1);
    }
  // The piano behind, unplayed: the case, the keys, the music desk and the score.
  px(c, 2, 9, 116, 15, C.piano);
  px(c, 2, 9, 116, 1, C.shine);
  px(c, 4, 22, 112, 4, C.white);
  for (let x = 4; x < 116; x += 2) px(c, x, 22, 1, 4, "#9a9384");
  for (let x = 5; x < 116; x += 14) for (const dx of [0, 2, 6, 8, 10]) px(c, x + dx, 22, 1, 2, C.black);
  px(c, 2, 26, 116, 2, C.piano);
  px(c, 44, 0, 32, 9, C.stand);
  const leaf = o.turn > 0 ? o.turn : o.rewind > 0 ? 1 - ((o.rewind * 3) % 1) : 0;
  px(c, 47, 1, 13, 7, C.page);
  px(c, 60, 1, 13, 7, C.page);
  for (const y of [3, 5]) (px(c, 48, y, 11, 1, C.page2), px(c, 61, y, 11, 1, C.page2));
  for (const [x, y] of [[50, 2], [54, 4], [57, 6], [63, 3], [67, 5], [70, 2]]) px(c, x, y, 1, 1, C.ink);
  if (leaf > 0 && leaf < 1) {
    const w = Math.round(13 * Math.cos(Math.PI * leaf));
    if (w > 0) px(c, 60, 0, w, 9, C.page);
    else px(c, 60 + w, 0, -w, 9, C.page2);
    px(c, 60 + w, 0, 1, 9, C.ink);
  }
  // Lowered (the shrug), the phone sinks out of the picture.
  const drop = Math.round(o.shrug * 20);
  const look = Math.round(o.look * 3);
  // The phone, sideways, its screen a tiny mirror of the game.
  const py = PH.y + drop + look;
  px(c, PH.x - 1, py - 1, PH.w + 2, PH.h + 2, C.out);
  px(c, PH.x, py, PH.w, PH.h, C.phone);
  px(c, PH.x, py, PH.w, 1, C.edge);
  const sy = SC.y + drop + look;
  px(c, SC.x, sy, SC.w, SC.h, C.screen);
  px(c, SC.x, sy, BW, SC.h, C.strip);
  px(c, SC.x + SC.w - BW, sy, BW, SC.h, C.strip);
  const bx = SC.x + BW;
  const bw = SC.w - 2 * BW;
  const gold = bx + Math.round(bw * 0.25);
  if (s && o.shrug === 0) {
    const span = s.bars * s.bar;
    const t0 = s.now - 0.25 * span;
    const xOf = (tick: number) => bx + ((tick - t0) / span) * bw;
    const yOf = (step: number) => sy + 1 + (SC.h - 3) * (1 - (step - s.lo) / Math.max(1, s.hi - s.lo));
    for (const n of s.notes) {
      const x1 = Math.max(bx, xOf(n.on));
      const x2 = Math.min(bx + bw, xOf(n.on + n.dur) - 0.5);
      if (x2 <= x1) continue;
      px(c, x1, yOf(n.step), Math.max(1, x2 - x1), 1, n.mine ? C.mine : C.band);
    }
  }
  px(c, gold, sy, 1, SC.h, C.gold);
  // His arms come up from below to the phone's two ends; the hands grip its edges, the thumbs on the screen.
  const shrugUp = Math.round(o.shrug * 6);
  for (const side of ["left", "right"] as const) {
    const th = thumbs?.find((t) => t.side === side);
    const dir = side === "left" ? -1 : 1;
    const ex = side === "left" ? PH.x - 2 : PH.x + PH.w + 1;
    // The hand rides a little with the thumb (down and in as it presses), so the motion reads.
    const ty = th ? th.y + drop + look : sy + SC.h / 2;
    const hy = o.shrug > 0.3 ? 14 - shrugUp : Math.max(py + 4, Math.min(py + PH.h - 2, ty + 3)) + (th?.down ? 1 : 0);
    const hx = o.shrug > 0.3 ? ex + dir * 10 : ex;
    const shx = 60 + dir * 16;
    limb(c, shx, 40, hx - dir * 1, hy + 4, 6, C.out);
    limb(c, shx, 40, hx - dir * 1, hy + 4, 4, C.coat);
    limb(c, shx + dir, 40, hx - dir * 1 + dir, hy + 4, 1, C.coatHi);
    px(c, hx - 3, hy - 1, 6, 7, C.out);
    px(c, hx - 2, hy, 4, 5, C.skin);
    px(c, hx - 2, hy + 4, 4, 1, C.skin2);
    if (th && o.shrug === 0) {
      // The thumb: from the hand across the screen's edge to its touch (the game's marker: a disc, its beam to the hand).
      const tx = th.x;
      limb(c, hx + dir * -1, hy + 1, tx, th.y + drop + look, 2, C.skin2);
      limb(c, hx + dir * -1, hy + 1, tx, th.y + drop + look, 1, C.skin);
      const r = th.down ? 2 : 1;
      px(c, tx - r, th.y + drop + look - r, 2 * r + 1, 2 * r + 1, th.down ? C.thumb : C.thumbUp);
      if (th.down) px(c, tx, th.y + drop + look, 1, 1, "#ffffff");
    }
  }
  // Glenn from behind, low before the phone: the swept-back hair, the ears, the scarf, the coat's shoulders.
  const hy0 = 29 + Math.round(o.shrug * -2) - look;
  px(c, 41, 36 - Math.round(o.shrug * 2), 38, 6, C.out);
  px(c, 42, 37 - Math.round(o.shrug * 2), 36, 3, C.coat);
  px(c, 42, 37 - Math.round(o.shrug * 2), 10, 3, C.coatHi);
  px(c, 50, 35, 20, 3, C.out);
  px(c, 51, 35, 18, 2, C.scarf);
  px(c, 61, 35, 7, 2, C.scarf2);
  px(c, 53, hy0 - 1, 14, 12, C.out);
  px(c, 54, hy0, 12, 10, C.hair);
  px(c, 54, hy0, 4, 7, C.hair2);
  for (const [x, y, n] of [[57, hy0 + 1, 5], [60, hy0, 7], [63, hy0 + 1, 6]]) for (let i = 0; i < n; i += 2) px(c, x + (i >> 2), y + i, 1, 1, C.hair2);
  px(c, 52, hy0 + 4, 2, 3, C.out);
  px(c, 53, hy0 + 4, 1, 2, C.skin);
  px(c, 66, hy0 + 4, 2, 3, C.out);
  px(c, 66, hy0 + 4, 1, 2, C.skin);
}

/**
 * Glenn with his phone. `src()` gives the game now (its plan, the box's notes); `mode` the moment: playing, turning
 * the page, leafing back, the shrug.
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
    const last = { left: { x: SC.x + 5, y: SC.y + 14 }, right: { x: SC.x + SC.w - 6, y: SC.y + 6 } };
    let raf = 0;
    const tick = () => {
      const t = performance.now();
      const m = modeRef.current;
      const age = t - since.current;
      const s = m === "play" ? srcRef.current() : null;
      const thumbs = s ? thumbsOf(s, last) : (["left", "right"] as const).map((side) => ({ side, ...last[side], down: false }));
      const turn = m === "turn" ? Math.min(1, age / 1000) : 0;
      const rewind = m === "rewind" ? Math.min(0.999, age / 1000) : 0;
      const shrug = m === "shrug" ? Math.min(1, age / 400) * (age < 2600 ? 1 : Math.max(0, 1 - (age - 2600) / 400)) : 0;
      // He looks up at the score (the phone lowered a little) while he turns or leafs back.
      const look = m === "turn" || m === "rewind" ? Math.sin(Math.PI * Math.min(1, age / 1000)) : 0;
      scene(c, s, thumbs, { turn, rewind, shrug, look, t });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className={className ?? "basics-glenn"} aria-label="Glenn playing the game on his phone" />;
}
