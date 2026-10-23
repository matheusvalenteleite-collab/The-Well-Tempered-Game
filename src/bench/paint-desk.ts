/**
 * D220, the computer's HIGHWAY (proto "keys") on its own: the road the whole window, no music box.
 * What this file adds over the shared road (paint-proto.ts `highway`, also the phone's):
 *   the two hands' halves of the road tinted (left warm, right cool) and G, the lane either index
 *   takes, a lane of its own (shaded gold, a gold seam down its middle, its key-cap framed and marked
 *   ◂ ▸ as shared); the thumbs' space bar under them;
 *   the fugue's architecture on the road: the player's own entries a gold carpet with a gate where
 *   each begins (its name) and a chequered line where it ends, its gems crowned; every other voice
 *   on its own rail on the road's shoulders (D238, paint-arch.ts: higher right, lower left), lit in its
 *   colour while it states the subject, lightning down it as it begins and ALTO · ANSWER called out;
 *   the fugue map over the horizon (D238); a stretto
 *   (D217's) braids both edges in the two voices' colours, STRETTO named; cadences a gate across the
 *   road, named, lit as it is passed;
 *   the run's effects, 8-bit and cheap (no blur): sparks per lane at each hit, the multiplier's ×2 ×3
 *   ×4 flare, ORGANO PLENO (an entry captured, D181) the road gilded and the organ's pipes risen at
 *   the horizon until the next entry, CON FUOCO fire along the rails, the crowd bobbing to the beat,
 *   a light camera shake on the big moments. The road's speed never changes (AHEAD_S).
 * The painter remembers per game only what it has shown (a WeakMap); the game is not touched.
 */
import { inkOf } from "../touch/MusicBox.tsx";
import { cadenceName } from "../touch/fugue.ts";
import type { ProtoGame } from "./proto-game.ts";
import { entryLabel, subjectLine } from "./subject-line.ts";
import { label, shade, type Tok } from "./paint-proto.ts";
import { deskMap, deskRails, gameRails, mapBottom, RAIL0, RAIL_GAP, railLabel } from "./paint-arch.ts";

/** G: the middle of the nine lanes, either index's. */
export const G_LANE = 4;
/** The seam down G and its key-cap's frame. */
export const SEAM = "#ffd66e";
const LEFT_TINT = "rgba(255,140,100,0.045)";
const RIGHT_TINT = "rgba(110,170,255,0.045)";
const CADENCE_INK = "#9fd3ff";

/** The road's place in the window: the horizon, the strike line, its width at the line. */
export function deskGeom(w: number, h: number) {
  // D238: the horizon lower, the fugue map and the callouts over it.
  const y0 = Math.max(72, Math.round(h * 0.125));
  const y1 = h - 118;
  return { y0, y1, W: Math.min(w * 0.58, (y1 - y0) * 1.3, 900) };
}

type At = (tick: number) => { y: number; k: number; d: number };
export interface Road {
  c: CanvasRenderingContext2D;
  w: number;
  h: number;
  g: ProtoGame;
  t: Tok;
  at: At;
  laneX: (lane: number, k: number) => number;
  cx: number;
  W: number;
  N: number;
  y0: number;
  y1: number;
  top: { y: number; k: number };
  ahead: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  at: number;
  ink: string;
}
interface Fx {
  mult: number;
  flare: { m: number; at: number } | null;
  shake: { at: number; amp: number } | null;
  callouts: { text: string; ink: string; at: number; size: number }[];
  bolts: { side: -1 | 1; ink: string; at: number; seed: number; off: number }[];
  seen: Set<string>;
  lastFlame: number;
  sparks: Spark[];
  pleno: boolean;
  strettos: { on: number; end: number; upper: number; lower: number }[];
  index: Map<string, number>;
  captured: Set<string>;
}
const memo = new WeakMap<ProtoGame, Fx>();
function fxOf(g: ProtoGame): Fx {
  let fx = memo.get(g);
  if (!fx) {
    // D217's strettos (the ranking's), each named by its two entries' voices.
    const line = subjectLine(g.f, g.entry);
    const strettos = line.strettos.map((s) => ({ on: s.on, end: s.end, upper: line.entries[s.upper].voice, lower: line.entries[s.lower].voice }));
    const index = new Map(g.f.entries.map((e, i) => [`${e.voice}:${e.on}`, i]));
    fx = { mult: g.mult, flare: null, shake: null, callouts: [], bolts: [], seen: new Set(), lastFlame: performance.now(), sparks: [], pleno: false, strettos, index, captured: new Set() };
    memo.set(g, fx);
  }
  return fx;
}

const call = (fx: Fx, text: string, ink: string, size = 9) => {
  fx.callouts.push({ text, ink, at: performance.now(), size });
  if (fx.callouts.length > 3) fx.callouts.shift();
};
const shake = (fx: Fx, amp: number) => {
  const now = performance.now();
  const left = fx.shake ? fx.shake.amp * Math.max(0, 1 - (now - fx.shake.at) / 260) : 0;
  fx.shake = { at: now, amp: Math.max(amp, left) };
};

/** A light shake of the whole road (begun; deskEnd restores). */
export function deskBegin(c: CanvasRenderingContext2D, g: ProtoGame) {
  const fx = fxOf(g);
  c.save();
  const s = fx.shake;
  if (!s) return;
  const age = performance.now() - s.at;
  if (age > 260) return void (fx.shake = null);
  const a = s.amp * (1 - age / 260);
  c.translate(Math.round(Math.sin(age / 17) * a), Math.round(Math.cos(age / 23) * a * 0.6));
}
export function deskEnd(c: CanvasRenderingContext2D) {
  c.restore();
}

/** A lane's band on the road, from the horizon to the line. */
function laneBand(r: Road, l0: number, l1: number, fill: string) {
  const { c, cx, W, N, top, y1 } = r;
  const xa = cx - W / 2 + (l0 * W) / N;
  const xb = cx - W / 2 + (l1 * W) / N;
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(cx + (xa - cx) * top.k, top.y);
  c.lineTo(cx + (xb - cx) * top.k, top.y);
  c.lineTo(xb, y1 + 30);
  c.lineTo(xa, y1 + 30);
  c.closePath();
  c.fill();
}

/** The road's x at its edge (side -1 left, 1 right) at a depth. */
const edgeX = (r: Road, side: number, k: number) => r.cx + side * (r.W / 2) * k;

/**
 * Under the notes: the hands' halves and G; ORGANO PLENO's gilding and pipes; the player's entries
 * (carpet, gate, end); the cadences' gates; the other voices' ribbons; G's seam.
 */
export function deskUnder(r: Road) {
  const { c, g, t, at, cx, W, N, top, y1, ahead } = r;
  const fx = fxOf(g);
  const nowMs = performance.now();
  // The hands: left warm, right cool; G shaded gold (D230: not with SCALE KEYS, whose lanes are degrees).
  const hands = !g.scale;
  if (hands) laneBand(r, 0, G_LANE, LEFT_TINT);
  if (hands) laneBand(r, G_LANE + 1, N, RIGHT_TINT);
  if (hands) laneBand(r, G_LANE, G_LANE + 1, g.pleno ? "rgba(255,214,110,0.13)" : "rgba(255,214,110,0.075)");
  // ORGANO PLENO: the road gilded towards the player, the pipes risen at the horizon.
  if (g.pleno) {
    const glow = c.createLinearGradient(0, top.y, 0, y1 + 30);
    glow.addColorStop(0, "rgba(255,214,110,0)");
    glow.addColorStop(1, "rgba(255,214,110,0.12)");
    laneBand(r, 0, N, "rgba(0,0,0,0)");
    c.fillStyle = glow;
    c.fill();
    pipes(r, nowMs);
  }
  // The player's entries: a gold carpet from gate to end.
  const beat = g.beat;
  for (const e of g.entries) {
    if (e.k !== 0 || e.end < g.now - beat || e.on > ahead) continue;
    // (from the strike line at the nearest: the road's perspective does not go past it)
    const a = at(Math.max(e.on, g.now));
    const b = at(Math.min(e.end, ahead));
    const ink = e.state === "lost" ? "rgba(150,140,170," : "rgba(255,214,110,";
    c.fillStyle = `${ink}${e.state === "captured" ? 0.06 : 0.035})`;
    c.beginPath();
    c.moveTo(edgeX(r, -1, a.k), Math.min(a.y, y1 + 30));
    c.lineTo(edgeX(r, 1, a.k), Math.min(a.y, y1 + 30));
    c.lineTo(edgeX(r, 1, b.k), b.y);
    c.lineTo(edgeX(r, -1, b.k), b.y);
    c.closePath();
    c.fill();
    // Its borders: two gold threads just inside the rails.
    c.strokeStyle = `${ink}0.55)`;
    c.lineWidth = 2;
    for (const side of [-1, 1]) {
      c.beginPath();
      c.moveTo(edgeX(r, side, a.k) - side * 5 * a.k, Math.min(a.y, y1 + 30));
      c.lineTo(edgeX(r, side, b.k) - side * 5 * b.k, b.y);
      c.stroke();
    }
    // The gate where it begins, named.
    if (e.on >= g.now && e.on <= ahead) {
      const p = at(e.on);
      c.fillStyle = e.state === "lost" ? t.miss : SEAM;
      c.fillRect(edgeX(r, -1, p.k), Math.round(p.y) - Math.max(2, 4 * p.k), W * p.k, Math.max(2, 4 * p.k));
      const i = fx.index.get(`${e.voice}:${e.on}`);
      label(c, i === undefined ? "SUBJECT" : entryLabel(g.f, i), cx, p.y - Math.max(10, 20 * p.k), SEAM, Math.max(6, Math.round(10 * p.k)));
    }
    // A chequered line where it ends.
    if (e.end > g.now && e.end <= ahead) {
      const p = at(e.end);
      const sq = Math.max(3, Math.round(8 * p.k));
      const x0 = edgeX(r, -1, p.k);
      for (let j = 0, x = x0; x < x0 + W * p.k - 1; j++, x += sq) {
        c.fillStyle = j % 2 ? "rgba(255,214,110,0.8)" : "rgba(20,16,10,0.8)";
        c.fillRect(Math.round(x), Math.round(p.y) - sq / 2, Math.min(sq, x0 + W * p.k - x), Math.max(2, sq / 2));
      }
      label(c, "END", edgeX(r, 1, p.k) + 6, p.y, SEAM, Math.max(6, Math.round(7 * p.k)), "left");
    }
  }
  // The cadences: a gate across the road, named; lit as it is passed with the run holding.
  for (const cad of g.f.cadences ?? []) {
    if (cad.on < g.now - beat || cad.on > ahead || cad.on < g.entry) continue;
    const p = at(cad.on);
    const passed = cad.on <= g.now;
    const lit = passed && g.streak >= 4;
    const ink = lit ? SEAM : CADENCE_INK;
    c.globalAlpha = passed ? Math.max(0, 1 - (g.now - cad.on) / beat) : 0.85;
    const ph = Math.max(10, 54 * p.k);
    const pw = Math.max(2, 5 * p.k);
    const xl = edgeX(r, -1, p.k) - 8 * p.k - pw;
    const xr = edgeX(r, 1, p.k) + 8 * p.k;
    c.fillStyle = shade(ink, 0.5);
    c.fillRect(xl, p.y - ph, pw, ph);
    c.fillRect(xr, p.y - ph, pw, ph);
    // The arch: a lintel, its middle raised a step.
    c.fillStyle = ink;
    c.fillRect(xl - pw / 2, p.y - ph - pw, xr - xl + 2 * pw, pw);
    c.fillRect(cx - (W / 4) * p.k, p.y - ph - 2 * pw, (W / 2) * p.k, pw);
    label(c, cadenceName(cad), cx, p.y - ph - 2 * pw - Math.max(6, 9 * p.k), ink, Math.max(6, Math.round(9 * p.k)));
    c.globalAlpha = 1;
  }
  // D238: the other voices on their rails on the shoulders (paint-arch.ts), never on the road.
  deskRails(r);
  // G's seam: a gold line down the middle of its lane, dashed on the beat.
  if (!hands) return;
  const gx = (k: number) => r.laneX(G_LANE, k);
  c.strokeStyle = SEAM;
  c.globalAlpha = 0.35;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(gx(top.k), top.y);
  c.lineTo(gx(1), y1);
  c.stroke();
  c.globalAlpha = 0.8;
  c.fillStyle = SEAM;
  for (let tk = Math.ceil(g.now / beat) * beat; tk < ahead; tk += beat) {
    const p = at(tk);
    const q = at(Math.min(ahead, tk + beat * 0.4));
    c.fillRect(Math.round(gx(p.k)) - Math.max(1, 1.5 * p.k), q.y, Math.max(2, 3 * p.k), Math.max(1, p.y - q.y));
  }
  c.globalAlpha = 1;
}

/** ORGANO PLENO's pipes, risen at the horizon behind the road, swaying a little on the beat. */
function pipes(r: Road, nowMs: number) {
  const { c, g, cx, W, top } = r;
  const n = 19;
  const span = W * 0.9;
  const pw = Math.max(4, Math.floor(span / n) - 3);
  const beatPh = ((g.now / g.beat) % 1 + 1) % 1;
  for (let j = 0; j < n; j++) {
    const m = Math.abs(j - (n - 1) / 2);
    const ph = 18 + (((n - 1) / 2 - m) / ((n - 1) / 2)) * 34 + (j % 2 ? 0 : 6) + (beatPh < 0.2 ? 3 : 0);
    const x = Math.round(cx - span / 2 + (j * span) / n);
    c.fillStyle = shade(SEAM, 0.45 + 0.1 * Math.sin(nowMs / 400 + j));
    c.fillRect(x, top.y - ph, pw, ph);
    c.fillStyle = SEAM;
    c.fillRect(x, top.y - ph, pw, 2);
    c.fillStyle = "#1a1408";
    c.fillRect(x + 1, top.y - 10, pw - 2, 2);
  }
}

/**
 * A subject note's gem (the player's own entry): a white frame and a small crown over it. D236: no
 * halo and no gold: the gem keeps its lane's colour (gold is G's).
 */
export function subjectGem(c: CanvasRenderingContext2D, x: number, y: number, gw: number, gh: number, k: number, captured: boolean) {
  c.strokeStyle = captured ? "#fff6d0" : "rgba(255,246,208,0.8)";
  c.lineWidth = Math.max(1, 1.5 * k);
  c.strokeRect(x - gw / 2 - 1, y - gh / 2 - 1, gw + 2, gh + 2);
  // The crown: a small white diamond over the gem.
  const s = Math.max(2, 4 * k);
  const cy = y - gh / 2 - s - 2 * k;
  c.fillStyle = "#fff6d0";
  c.beginPath();
  c.moveTo(x, cy - s);
  c.lineTo(x + s, cy);
  c.lineTo(x, cy + s);
  c.lineTo(x - s, cy);
  c.closePath();
  c.fill();
  c.fillStyle = "#fff6d0";
  c.fillRect(x - Math.max(1, s / 3), cy - Math.max(1, s / 3), Math.max(1, s / 2), Math.max(1, s / 2));
}

/**
 * Over the notes: the moments as they come (an entry begun, a stretto, an entry captured, the
 * multiplier's steps, ORGANO PLENO), the stretto's braided edges, lightning, the callouts, the
 * count-in, CON FUOCO's fire.
 */
export function deskOver(r: Road) {
  const { c, g, t, cx, y0, y1, top } = r;
  const fx = fxOf(g);
  const nowMs = performance.now();
  const count = g.f.voices.length;
  const mine = g.voice;
  const played = new Set(g.tracks.map((x) => x.voice));
  // Entries begun (only those under way; a mid-piece start does not replay the past).
  for (const e of g.f.entries) {
    if (e.on < g.entry || e.on > g.now) continue;
    const key = `e${e.voice}:${e.on}`;
    if (fx.seen.has(key)) continue;
    fx.seen.add(key);
    if (g.now - e.on > g.beat) continue;
    const i = fx.index.get(`${e.voice}:${e.on}`);
    const name = i === undefined ? "SUBJECT" : entryLabel(g.f, i);
    if (played.has(e.voice)) {
      call(fx, `YOUR ENTRY · ${name}`, SEAM, 12);
      shake(fx, 2);
    } else {
      // D238: named as its rail names it; lightning down its rail.
      const rail = gameRails(g).find((x) => x.voice === e.voice);
      const side = rail?.side ?? (e.voice < mine ? 1 : -1);
      call(fx, i === undefined ? name : railLabel(g.f, i), inkOf(e.voice, count), 9);
      fx.bolts.push({ side, ink: inkOf(e.voice, count), at: nowMs, seed: e.on % 97, off: RAIL0 + RAIL_GAP * (rail?.slot ?? 0) });
    }
  }
  // Strettos: announced a beat before, both edges struck.
  for (const s of fx.strettos) {
    const key = `s${s.on}`;
    if (fx.seen.has(key) || g.now < s.on - g.beat) continue;
    fx.seen.add(key);
    if (g.now > s.end) continue;
    const name = (v: number) => (g.f.voiceNames[v] ?? "").toUpperCase();
    call(fx, `STRETTO! ${name(s.upper)} + ${name(s.lower)}`, "#ff8a3d", 13);
    fx.bolts.push({ side: -1, ink: inkOf(s.lower, count), at: nowMs, seed: 11, off: 14 }, { side: 1, ink: inkOf(s.upper, count), at: nowMs, seed: 37, off: 14 });
    shake(fx, 4);
  }
  // Entries captured: a shake (the game raises ORGANO PLENO's banner).
  for (const e of g.entries)
    if (e.state === "captured" && !fx.captured.has(`${e.voice}:${e.on}`)) {
      fx.captured.add(`${e.voice}:${e.on}`);
      shake(fx, 5);
    }
  // The multiplier's steps.
  if (g.mult > fx.mult) {
    fx.flare = { m: g.mult, at: nowMs };
    if (g.mult >= 4) shake(fx, 3);
  }
  fx.mult = g.mult;
  if (g.pleno && !fx.pleno) shake(fx, 4);
  fx.pleno = g.pleno;
  // A stretto sounding: both edges braided in its voices' colours, its name over the far end.
  const st = fx.strettos.find((s) => s.on <= g.now && g.now < s.end);
  if (st) {
    const beatPh = ((g.now / g.beat) % 1 + 1) % 1;
    for (const side of [-1, 1]) {
      for (let j = 0; j < 14; j++) {
        const u0 = (j + beatPh) / 14;
        const u1 = Math.min(1, u0 + 0.5 / 14);
        const k0 = top.k + (1 - top.k) * u0;
        const k1 = top.k + (1 - top.k) * u1;
        // (on the road's own depth: just outside its edge all the way down)
        const ya = top.y + (y1 - top.y) * u0;
        const yb = top.y + (y1 - top.y) * u1;
        c.strokeStyle = inkOf(j % 2 ? st.upper : st.lower, count);
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(edgeX(r, side, k0) + side * 4, ya);
        c.lineTo(edgeX(r, side, k1) + side * 4, yb);
        c.stroke();
      }
    }
    c.globalAlpha = 0.6 + 0.4 * Math.max(0, 1 - beatPh * 3);
    label(c, "STRETTO", cx, top.y + 16, "#ff8a3d", 9);
    c.globalAlpha = 1;
  }
  // Lightning down an edge.
  fx.bolts = fx.bolts.filter((b) => nowMs - b.at < 420);
  for (const b of fx.bolts) {
    const age = nowMs - b.at;
    c.globalAlpha = age < 120 ? 1 : 1 - (age - 120) / 300;
    c.strokeStyle = b.ink;
    c.lineWidth = 3;
    c.beginPath();
    for (let j = 0; j <= 12; j++) {
      const u = j / 12;
      const k = top.k + (1 - top.k) * u;
      const y = top.y + (y1 - top.y) * u;
      const jag = ((j * 7 + b.seed) % 5) - 2;
      const x = edgeX(r, b.side, k) + b.side * (b.off + jag * 3) * k;
      if (j) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.stroke();
    c.strokeStyle = "#ffffff";
    c.lineWidth = 1;
    c.stroke();
    c.globalAlpha = 1;
  }
  // CON FUOCO: fire along the rails' near half.
  if (g.streak >= 24) {
    for (const side of [-1, 1])
      for (let j = 0; j < 16; j++) {
        const u = 0.5 + (j / 16) * 0.5;
        const k = top.k + (1 - top.k) * u;
        const y = top.y + (y1 + 30 - top.y) * u;
        const fl = 6 + ((j * 13 + Math.floor(nowMs / 70)) % 7) * 2 * k;
        c.fillStyle = j % 3 ? "#ff7a3d" : "#ffd56a";
        c.globalAlpha = 0.75;
        c.fillRect(Math.round(edgeX(r, side, k) + side * 6), Math.round(y - fl), 3, Math.round(fl));
      }
    c.globalAlpha = 1;
  }
  // D238: the fugue map over the horizon.
  deskMap(r);
  // The callouts, under the map, newest largest.
  fx.callouts = fx.callouts.filter((x) => nowMs - x.at < 2200);
  const cy0 = g.f.entries.length ? mapBottom(count) + 12 : Math.max(14, y0 - 58);
  fx.callouts.forEach((x, j) => {
    const age = nowMs - x.at;
    c.globalAlpha = age < 1700 ? 1 : 1 - (age - 1700) / 500;
    const pop = Math.max(0, 4 - age / 50);
    const y = cy0 + j * 16;
    label(c, x.text, cx + 2, y + 2, "#000", Math.round(x.size + pop));
    label(c, x.text, cx, y, x.ink, Math.round(x.size + pop));
  });
  c.globalAlpha = 1;
  // The count-in, large over the road (the box's count is gone).
  const ci = g.countIn();
  if (ci) {
    const ph = ((g.entry - g.now) / g.beat) % 1;
    label(c, String(ci), cx + 3, y0 + (y1 - y0) * 0.45 + 3, "#000", Math.round(28 + 10 * ph));
    label(c, String(ci), cx, y0 + (y1 - y0) * 0.45, ci === 1 ? t.gold : t.fg, Math.round(28 + 10 * ph));
  }
}

/** G's key-cap framed in gold and marked shared (◂ ▸); the hands named under their halves. */
export function deskKeys(r: Road, keyH: number) {
  const { c, t, laneX, W, N, y1 } = r;
  const x = laneX(G_LANE, 1);
  const bw = (W / N) * 0.8;
  c.strokeStyle = SEAM;
  c.lineWidth = 2;
  c.strokeRect(x - bw / 2 - 2, y1 - keyH / 2 - 2, bw + 4, keyH + 4);
  c.fillStyle = SEAM;
  const s = Math.max(3, Math.round(bw * 0.09));
  for (const side of [-1, 1]) {
    const tx = x + side * bw * 0.3;
    c.beginPath();
    c.moveTo(tx + side * s, y1);
    c.lineTo(tx, y1 - s);
    c.lineTo(tx, y1 + s);
    c.closePath();
    c.fill();
  }
  label(c, "SHARED", x, y1 + keyH / 2 + 14, SEAM, 6);
  const mid = (a: number, b: number) => (laneX(a, 1) + laneX(b, 1)) / 2;
  label(c, "LEFT HAND", mid(0, G_LANE - 1), y1 + keyH / 2 + 14, "#ff9a7a", 6);
  label(c, "RIGHT HAND", mid(G_LANE + 1, N - 1), y1 + keyH / 2 + 14, "#8fbcff", 6);
  // The divide: a gold tick under G's both edges.
  c.fillStyle = SEAM;
  c.fillRect(Math.round(x - W / N / 2), y1 + keyH / 2 + 4, 2, 18);
  c.fillRect(Math.round(x + W / N / 2) - 2, y1 + keyH / 2 + 4, 2, 18);
  void t;
}

/** Sparks from each struck lane, and the key-cap's flash. */
export function deskSparks(r: Road, inkOfLane: (l: number) => string) {
  const { c, g, laneX, y1 } = r;
  const fx = fxOf(g);
  const nowMs = performance.now();
  for (const fl of g.flames) {
    if (fl.at <= fx.lastFlame) continue;
    const lanes = g.lanesOf(fl.k ?? 0);
    if (fl.i >= lanes.length) continue;
    // D239: from the lane struck; a note right only by its direction a few silver sparks.
    const x = laneX(fl.lane ?? lanes[fl.i], 1);
    const rel = fl.grade === "relative";
    const ink = rel ? "#a9afbd" : inkOfLane(fl.lane ?? lanes[fl.i]);
    const n = rel ? 4 : g.mult >= 4 || g.pleno ? 14 : 9;
    for (let j = 0; j < n; j++) {
      const a = -Math.PI * (0.1 + (0.8 * j) / (n - 1));
      const v = 0.12 + ((j * 37) % 10) / 80;
      fx.sparks.push({ x, y: y1 - 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, at: fl.at, ink: j % 3 || rel ? ink : "#ffffff" });
    }
  }
  for (const fl of g.flames) fx.lastFlame = Math.max(fx.lastFlame, fl.at);
  fx.sparks = fx.sparks.filter((s) => nowMs - s.at < 420).slice(-160);
  for (const s of fx.sparks) {
    const age = nowMs - s.at;
    c.fillStyle = s.ink;
    c.globalAlpha = 1 - age / 420;
    c.fillRect(Math.round(s.x + s.vx * age), Math.round(s.y + s.vy * age + 0.00025 * age * age), 3, 3);
  }
  c.globalAlpha = 1;
}

/** The multiplier's step: a ring flaring out of its lamps, ×n rising. */
export function deskFlare(r: Road, rx: number, ry: number) {
  const { c, g, t } = r;
  const f = fxOf(g).flare;
  if (!f) return;
  const age = performance.now() - f.at;
  if (age > 900) return;
  const ink = f.m >= 4 ? t.gold : t.shine;
  c.globalAlpha = 1 - age / 900;
  c.strokeStyle = ink;
  c.lineWidth = 3;
  c.beginPath();
  c.arc(rx, ry, 30 + age / 12, 0, Math.PI * 2);
  c.stroke();
  label(c, `×${f.m}!`, rx, ry - 50 - age / 30, ink, Math.round(14 + Math.max(0, 8 - age / 40)));
  c.globalAlpha = 1;
}

/** The crowd: little people at the window's foot, as many as it is warm, bobbing on the beat. */
export function deskCrowd(r: Road) {
  const { c, g, w, h, cx, W } = r;
  const beatPh = ((g.now / g.beat) % 1 + 1) % 1;
  const hop = Math.max(0, 1 - beatPh * 4);
  const inks = ["#c9b28a", "#9fb4d6", "#d69f9f", "#a7d69f", "#d6c79f"];
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? 12 : cx + W / 2 + 90;
    const x1 = side < 0 ? cx - W / 2 - 110 : w - 12;
    const room = Math.max(0, Math.floor((x1 - x0) / 14));
    const n = Math.min(room, Math.round(g.crowd * room));
    for (let j = 0; j < n; j++) {
      const x = side < 0 ? x1 - j * 14 : x0 + j * 14;
      const lift = g.crowd > 0.5 && (j + Math.floor(g.now / g.beat)) % 2 === 0 ? Math.round(hop * 4 * g.crowd) : 0;
      const y = h - 44 - lift;
      c.fillStyle = inks[j % inks.length];
      c.fillRect(x, y, 6, 6);
      c.fillRect(x - 1, y + 7, 8, 9);
      // CON FUOCO: arms up.
      if (g.streak >= 24) {
        c.fillRect(x - 3, y - 4 + (j % 2), 2, 8);
        c.fillRect(x + 7, y - 4 + ((j + 1) % 2), 2, 8);
      }
    }
  }
}
