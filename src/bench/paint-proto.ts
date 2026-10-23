/**
 * Painting the testbench's prototypes (D175-D179).
 *   The bars (LADDER, THUMBS, TWO VOICES): two side bars over the screen, the music box between them.
 *     LADDER (D181): a soft glow over the coming note's broad area on both bars, brightest at the
 *     height it is drawn, a trail from it in the box, the way to go from your last touch (▲ ▼ =), and
 *     a mark where you last played; only the Cs named, for bearings.
 *     THUMBS lights the bar wanted; TWO VOICES each bar for its voice (1P, 2P). The dynamics are
 *     marked along the bars' feet, pp by the box to ff by the phone's edge.
 *   PIANO: paint-piano.ts.
 * The verdict of the last touch flashes over the field.
 */
import { ornamentMark } from "../touch/ornament-play.ts";
import { ARROW_PIXELS, inkOf, type Arrow } from "../touch/MusicBox.tsx";
import { paintPiano } from "../touch/paint-piano.ts";
import { stepName } from "../touch/fugue.ts";
import { APPROACH_MS, type ProtoGame } from "./proto-game.ts";
import { ARROW_KEYS, arrowOf, BAR, contourOk, fits, keyPlace, laneOk, KEY_ROWS, LADDER_AREA, MARKS } from "./protos.ts";
import { isBlack, keySpan } from "../touch/piano.ts";
import { KEYS_SHARE } from "./placed.ts";

const FONT = '"TG Accidentals", "Press Start 2P", ui-monospace, monospace';

type Tok = ReturnType<typeof tokens>;
function tokens() {
  const css = getComputedStyle(document.documentElement);
  const tok = (name: string) => css.getPropertyValue(name).trim() || "#fff";
  return { shine: tok("--tg-shine"), gold: tok("--tg-gold"), wrong: tok("--tg-wrong"), fg: tok("--tg-fg"), muted: tok("--tg-muted"), grid: tok("--tg-grid"), barline: tok("--tg-barline"), miss: tok("--tg-miss") };
}

export function paintProto(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, subject: Set<string>) {
  const t = tokens();
  switch (g.proto.id) {
    case "ladder":
    case "duo":
      bars(c, w, h, g, t);
      break;
    case "piano":
      paintPiano(c, w, h, { kb: g.kb, now: g.now, tps: g.tps, voice: g.voice, count: g.f.voices.length, notes: g.notes, others: g.others, late: g.opt.late, held: g.heldCells(), grade: g.grade }, subject);
      pianoLetters(c, w, h, g, t);
      break;
    case "keys":
    case "highway":
    case "subject":
      highway(c, w, h, g, t);
      break;
    case "arrows":
      pads(c, w, h, g, t);
      break;
  }
  verdict(c, w, h, g, t);
  scoreboard(c, w, h, g, t);
}

/** D181: the score and the multiplier, the banners (ORGANO PLENO, CON FUOCO), and CON FUOCO's embers. */
function scoreboard(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok) {
  const bars = g.proto.layout === "bars";
  const desk = g.proto.layout === "desk";
  const x = bars ? (w * BAR) / 2 : desk ? w - 90 : w / 2;
  const y = bars ? h * 0.12 : desk ? 34 : 14;
  label(c, g.score.toLocaleString("en"), x, y, t.fg, 9);
  if (g.mult > 1 && !desk) label(c, `×${g.mult}`, x, y + 16, g.mult >= 4 ? t.gold : t.shine, 9);
  if (g.pleno) label(c, "PLENO ×2", bars ? w - (w * BAR) / 2 : x, bars ? h * 0.12 : y + 32, t.gold, 7);
  // CON FUOCO: embers rising along the edges while the run lasts.
  if (g.streak >= 24) {
    const now = performance.now() / 1000;
    for (let k = 0; k < 18; k++) {
      const phase = (now * (0.4 + (k % 5) * 0.1) + k * 0.37) % 1;
      const ex = bars ? (k % 2 ? w - (k * 7) % (w * BAR) : (k * 7) % (w * BAR)) : (k * 53) % w;
      c.fillStyle = k % 3 ? "#ffb347" : "#ff6a3d";
      c.globalAlpha = 1 - phase;
      c.fillRect(Math.round(ex), Math.round(h - phase * h * 0.9), 3, 3);
    }
    c.globalAlpha = 1;
  }
  const b = g.banner;
  if (b) {
    const age = performance.now() - b.at;
    if (age < 1600) {
      c.globalAlpha = age < 1200 ? 1 : 1 - (age - 1200) / 400;
      const size = 14 + Math.max(0, 6 - age / 40);
      label(c, b.text, w / 2, h * 0.3, b.text.startsWith("ORGANO") ? t.gold : "#ff8a3d", size);
      c.globalAlpha = 1;
    }
  }
}

/** PIANO on a computer: the typing keys' letters on the piano keys they play (the octave as set). */
function pianoLetters(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok) {
  const letters = ["A", "W", "S", "E", "D", "F", "T", "G", "Y", "H", "U", "J", "K", "O", "L", "P", ";"];
  const base = g.kb.lo - (((g.kb.lo % 12) + 12) % 12) + 12 * g.octave;
  letters.forEach((l, i) => {
    const m = base + i;
    if (m < g.kb.lo || m > g.kb.hi) return;
    const [a, b] = keySpan(g.kb, m);
    const black = isBlack(m);
    label(c, l, ((a + b) / 2) * w, black ? h * (1 - KEYS_SHARE) + 20 : h - 22, black ? t.shine : "#2a2216", 7);
  });
}

/**
 * LADDER on a computer (D183): the two hands' keys as on the keyboard, WASD and the arrows, with space
 * between; the key the next note asks for lit on both as its beat comes, the keys down bright; one line
 * saying how it goes.
 */
function pads(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok) {
  const ink = inkOf(g.voice, g.f.voices.length);
  const nx = coming(g);
  const asked = nx ? arrowOf(g.moves[nx.i]) : null;
  const key = Math.max(28, Math.min(54, (h - 70) / 2.3));
  const top = Math.max(14, (h - 40 - 2 * key) / 2);
  const cap = (code: string, x: number, y: number, kw: number, letter: string) => {
    const down = g.keysDown.has(code);
    c.fillStyle = down ? t.shine : "#1d1a24";
    c.fillRect(x, y, kw - 4, key - 4);
    c.fillStyle = "rgba(0,0,0,0.4)";
    c.fillRect(x, y + key - 8, kw - 4, 4);
    if (nx && !down && asked && fits(asked, ARROW_KEYS[code])) light(c, x, y, kw - 4, key - 8, nx.p, ink, t);
    const fg = down ? "#1a1408" : t.fg;
    const s = Math.max(3, Math.floor(key / 12));
    pixels(c, ARROW_KEYS[code], x + (kw - 4) / 2 - 2.5 * s, y + (key - 8) / 2 - 2.5 * s, s, fg);
    if (letter) label(c, letter, x + 4, y + 8, down ? fg : t.muted, 7, "left");
  };
  const cluster = (cx: number, codes: [string, string, string, string], letters: [string, string, string, string]) => {
    cap(codes[0], cx - key / 2, top, key, letters[0]);
    [1, 2, 3].forEach((j) => cap(codes[j], cx - key * 1.5 + (j - 1) * key, top + key, key, letters[j]));
  };
  cluster(w * 0.2, ["KeyW", "KeyA", "KeyS", "KeyD"], ["W", "A", "S", "D"]);
  cluster(w * 0.8, ["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"], ["", "", "", ""]);
  cap("Space", w * 0.35, top + key, w * 0.3, "SPACE");
  // How it goes, in one line: each key's arrow and what it does.
  const parts: [Arrow, string][] = [["right", "STEP UP"], ["left", "STEP DOWN"], ["up", "LEAP UP"], ["down", "LEAP DOWN"], ["rise", "THIRD: EITHER"], ["same", "SAME NOTE"]];
  c.font = `8px ${FONT}`;
  const lead = "WASD OR ARROWS:";
  const gap = 18;
  const total = c.measureText(lead).width + parts.reduce((a, [, txt]) => a + gap + 15 + c.measureText(txt).width, 0);
  let x = (w - total) / 2;
  const y = h - 14;
  label(c, lead, x, y, t.muted, 8, "left");
  x += c.measureText(lead).width;
  for (const [a, txt] of parts) {
    x += gap;
    pixels(c, a, x, y - 5, 2, t.shine);
    x += 15;
    label(c, txt, x, y, t.fg, 8, "left");
    x += c.measureText(txt).width;
  }
}

/** A key's arrow (or the same note's dot), 5 by 5 pixels at scale s. */
function pixels(c: CanvasRenderingContext2D, a: Arrow, x: number, y: number, s: number, color: string) {
  c.fillStyle = color;
  ARROW_PIXELS[a].forEach((row, ry) => [...row].forEach((on, rx) => on === "1" && c.fillRect(Math.round(x + rx * s), Math.round(y + ry * s), s, s)));
}

/**
 * EASY as a highway (D198, after Guitar Hero): the player's notes come down ten lanes, the home row's
 * keys (A S D F G H J K L ;), towards the strike line, in perspective. A note's lane is a fingering
 * of its line (ProtoGame.lanes): the key that answers it is always right; in DIRECTION any key on its
 * side of the last will do (the lanes that would, tinted). A free note is an open bar across all the
 * lanes; a note of the subject's entries a gem with a star; a long note a tail, glowing while held.
 * A struck note flames; a missed one falls through grey. The multiplier's ring on the left, the crowd's
 * meter on the right.
 */
/** A colour darkened (k below 1) for a face in shadow. */
function shade(hex: string, k: number): string {
  const v = parseInt(hex.slice(1), 16);
  const r = Math.round(((v >> 16) & 255) * k);
  const gg = Math.round(((v >> 8) & 255) * k);
  const b = Math.round((v & 255) * k);
  return `rgb(${r},${gg},${b})`;
}
const LANE_KEYS = ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"];
const LANE_INK = ["#ff6b5a", "#ff9248", "#ffc145", "#d9e34f", "#7ee36b", "#4fd6b2", "#4cb8ff", "#7d8bff", "#b47dff", "#ff7dd6"];
const AHEAD_S = 2.1;
function highway(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok) {
  // D207: on a phone (HIGHWAY), five lanes across the whole width, the strike line high enough for a thumb.
  const phone = g.road;
  // D214, SUBJECT: the line moves between voices; its gems take each one's colour.
  const subj = g.proto.id === "subject";
  const N = g.laneCount;
  const inkOfLane = (l: number) => LANE_INK[N === 5 ? l * 2 : l];
  const cx = w / 2;
  const y0 = phone ? 64 : 18;
  // D208: on a phone the strike line sits higher, over two rows of pads (room for the thumbs to cross).
  const y1 = phone ? h - 196 : h - 78;
  const W = phone ? w * 0.94 : Math.min(w * 0.7, 620);
  const lvl = g.o.easy ?? "timing";
  // Depth (0 at the line, 1 at the horizon) to the screen: y, and the width's scale.
  const at = (tick: number) => {
    const d = (tick - g.now) / g.tps / AHEAD_S;
    const s = 1 / (1 + 3 * Math.max(-0.2, d));
    const f = (s - 0.25) / 0.75;
    return { y: y0 + (y1 - y0) * f, k: 0.3 + 0.7 * f, d };
  };
  const laneX = (lane: number, k: number) => cx + (-W / 2 + ((lane + 0.5) * W) / N) * k;
  // The road.
  const top = at(g.now + AHEAD_S * g.tps);
  // D202: the road lit towards the player, its far end in fog; rails along its edges.
  const road = c.createLinearGradient(0, top.y, 0, y1 + 30);
  road.addColorStop(0, "#0b0a11");
  road.addColorStop(1, "#1b1726");
  c.fillStyle = road;
  c.beginPath();
  c.moveTo(cx - (W / 2) * top.k, top.y);
  c.lineTo(cx + (W / 2) * top.k, top.y);
  c.lineTo(cx + W / 2 + 10, y1 + 30);
  c.lineTo(cx - W / 2 - 10, y1 + 30);
  c.closePath();
  c.fill();
  for (const side of [-1, 1]) {
    const rail = c.createLinearGradient(0, top.y, 0, y1 + 30);
    rail.addColorStop(0, "rgba(255,214,110,0)");
    rail.addColorStop(1, g.pleno ? "rgba(255,214,110,0.9)" : g.streak >= 24 ? "rgba(255,120,60,0.9)" : "rgba(140,170,255,0.6)");
    c.fillStyle = rail;
    c.beginPath();
    c.moveTo(cx + side * (W / 2) * top.k, top.y);
    c.lineTo(cx + side * ((W / 2) * top.k + 2), top.y);
    c.lineTo(cx + side * (W / 2 + 16), y1 + 30);
    c.lineTo(cx + side * (W / 2 + 8), y1 + 30);
    c.closePath();
    c.fill();
  }
  if (g.pleno || g.streak >= 24) {
    c.fillStyle = g.pleno ? "rgba(255,214,110,0.06)" : "rgba(255,120,60,0.07)";
    c.fill();
  }
  // Lanes, and the beats and bars crossing them.
  c.strokeStyle = "rgba(255,255,255,0.07)";
  c.lineWidth = 1;
  for (let l = 0; l <= N; l++) {
    const xb = cx - W / 2 + (l * W) / N;
    c.beginPath();
    c.moveTo(cx + (xb - cx) * top.k, top.y);
    c.lineTo(xb, y1 + 30);
    c.stroke();
  }
  const beat = g.beat;
  for (let tk = Math.ceil(g.now / beat) * beat; tk < g.now + AHEAD_S * g.tps; tk += beat) {
    const p = at(tk);
    const bar = ((tk - g.f.bars[0].on) % g.f.barTicks + g.f.barTicks) % g.f.barTicks === 0;
    c.fillStyle = bar ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)";
    c.fillRect(cx - (W / 2) * p.k, Math.round(p.y), W * p.k, bar ? 2 : 1);
  }
  // The keys that would answer the next note (DIRECTION).
  const nx = coming(g);
  const judged = (lvl === "direction" || lvl === "leaps") && nx && (phone ? g.lastLane >= 0 : g.lastKey) && !g.isFree(nx.i);
  if (judged)
    for (let l = 0; l < N; l++) {
      const fitsLane = phone ? laneOk(g.moves[nx!.i], g.lastLane, l, lvl === "leaps", N) : contourOk(g.moves[nx!.i], g.lastKey!, KEY_ROWS[2].codes[l] ?? "Quote", lvl === "leaps");
      if (!fitsLane) continue;
      c.fillStyle = phone ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.035)";
      const xb = cx - W / 2 + (l * W) / N;
      c.beginPath();
      c.moveTo(cx + (xb - cx) * top.k, top.y);
      c.lineTo(cx + (xb + W / N - cx) * top.k, top.y);
      c.lineTo(xb + W / N, y1);
      c.lineTo(xb, y1);
      c.closePath();
      c.fill();
    }
  // D208: the other voices, faint, by pitch across the road (low left, high right), so the fugue's
  // architecture shows behind the lanes: each voice its colour, its subject entries brighter.
  if (phone) ghosts(c, g, at, cx, W, y1);
  // The notes, far to near.
  const lanes = g.lanes;
  const notes = g.notes;
  const subject = new Set(g.entries.flatMap((e) => e.ons));
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i];
    if (i > 0 && notes[i - 1].on === n.on) continue;
    const p = at(n.on);
    if (p.d > 1 || p.y > y1 + 40) continue;
    if (n.state === "hit" && !(n.dur >= beat && g.now < n.on + n.dur)) continue;
    const lane = lanes[i];
    const ink = subj ? inkOf(n.voice ?? g.voice, g.f.voices.length) : inkOfLane(lane);
    const lw = (W / N) * p.k;
    // The tail of a long note.
    if (n.dur >= beat && n.state !== "miss") {
      const e = at(Math.min(n.on + n.dur, g.now + AHEAD_S * g.tps));
      const from = n.state === "hit" ? at(Math.max(n.on, g.now)) : p;
      c.fillStyle = n.held ? ink : "rgba(255,255,255,0.35)";
      c.globalAlpha = n.held ? 0.9 : 0.6;
      const x1 = laneX(lane, from.k);
      const x2 = laneX(lane, e.k);
      c.beginPath();
      c.moveTo(x1 - lw * 0.12, from.y);
      c.lineTo(x1 + lw * 0.12, from.y);
      c.lineTo(x2 + (W / N) * e.k * 0.12, e.y);
      c.lineTo(x2 - (W / N) * e.k * 0.12, e.y);
      c.closePath();
      c.fill();
      c.globalAlpha = 1;
      if (n.state === "hit") continue;
    }
    if (n.ride) {
      c.fillStyle = ink;
      c.fillRect(laneX(lane, p.k) - 2, p.y - 2, 4, 4);
      continue;
    }
    const gh = Math.max(4, 12 * p.k);
    if (g.isFree(i) && lvl !== "timing") {
      // A free note: an open bar across the road.
      c.fillStyle = n.state === "miss" ? t.miss : subj ? ink : "#c78bff";
      c.fillRect(cx - (W / 2) * p.k + 4, p.y - gh / 3, W * p.k - 8, Math.max(3, gh * 0.6));
      continue;
    }
    const x = laneX(lane, p.k);
    // A gem with depth: its shadow on the road, a darker front face, a lit top.
    const gw = lw * 0.8;
    c.fillStyle = "rgba(0,0,0,0.45)";
    c.fillRect(x - gw / 2 + 2 * p.k, p.y - gh / 2 + gh * 0.9, gw, gh * 0.45);
    c.fillStyle = n.state === "miss" ? "#3a3644" : shade(ink, 0.55);
    c.fillRect(x - gw / 2, p.y, gw, gh * 0.55);
    c.fillStyle = n.state === "miss" ? t.miss : ink;
    c.fillRect(x - gw / 2, p.y - gh / 2, gw, gh * 0.6);
    c.fillStyle = "rgba(255,255,255,0.4)";
    c.fillRect(x - gw / 2, p.y - gh / 2, gw, Math.max(1, gh * 0.16));
    // D205: an ornament's sign over its gem.
    const orn = g.ornaments.get(`${n.voice ?? g.voice}:${n.on}`);
    if (orn && n.state !== "miss") label(c, ornamentMark(orn), x, p.y - gh - 4 * p.k, t.gold, Math.max(6, Math.round(8 * p.k)));
    if (subject.has(n.on) && n.state !== "miss" && !subj) {
      c.strokeStyle = t.gold;
      c.lineWidth = Math.max(1, 2 * p.k);
      c.strokeRect(x - lw * 0.4, p.y - gh / 2, lw * 0.8, gh);
      label(c, "★", x, p.y, "#1a1408", Math.max(6, 9 * p.k));
    }
  }
  // Fog over the far end.
  const fog = c.createLinearGradient(0, top.y, 0, top.y + (y1 - top.y) * 0.35);
  fog.addColorStop(0, "rgba(10,9,16,1)");
  fog.addColorStop(1, "rgba(10,9,16,0)");
  c.save();
  c.beginPath();
  c.moveTo(cx - (W / 2) * top.k, top.y);
  c.lineTo(cx + (W / 2) * top.k, top.y);
  c.lineTo(cx + W / 2 + 10, y1 + 30);
  c.lineTo(cx - W / 2 - 10, y1 + 30);
  c.closePath();
  c.clip();
  c.fillStyle = fog;
  c.fillRect(cx - W / 2 - 20, top.y - 2, W + 40, (y1 - top.y) * 0.35);
  c.restore();
  if (subj) subjectCues(c, g, at, cx, top.y, t);
  // The strike line: the ten keys, lit when down; the last key ringed.
  const lastCol = phone ? (g.lastLane >= 0 ? g.lastLane : undefined) : g.lastKey ? keyPlace(g.lastKey)?.col : undefined;
  const heldLanes = phone ? g.heldLanes : [];
  // D208: on a phone, two rows of pads, the same lanes in each: one thumb above, the other below,
  // so they can pass each other (a lane is a lane in either row).
  if (phone) {
    padRows(c, g, laneX, W, N, y1, inkOfLane, lvl !== "timing" ? lastCol : undefined, t);
  }
  // The keys (a computer's).
  const bh = 18;
  for (let l = 0; l < N && !phone; l++) {
    const x = laneX(l, 1);
    const down = phone ? heldLanes.includes(l) : [...g.keysDown].some((code) => keyPlace(code)?.col === l);
    const ink = inkOfLane(l);
    // A raised key, sinking when pressed.
    const bw = (W / N) * 0.8;
    const sink = down ? 4 : 0;
    c.fillStyle = shade(ink, 0.35);
    c.fillRect(x - bw / 2, y1 - bh / 2 + bh, bw, 6 - sink);
    c.fillStyle = down ? ink : "#1d1a24";
    c.fillRect(x - bw / 2, y1 - bh / 2 + sink, bw, bh);
    c.strokeStyle = ink;
    c.lineWidth = 2;
    c.strokeRect(x - bw / 2, y1 - bh / 2 + sink, bw, bh);
    if (down) {
      c.fillStyle = ink;
      c.globalAlpha = 0.25;
      c.fillRect(x - bw / 2 - 6, y1 - bh / 2 - 40, bw + 12, 40);
      c.globalAlpha = 1;
    }
    if (lvl !== "timing" && lastCol === l) {
      c.strokeStyle = t.gold;
      c.strokeRect(x - bw / 2 - 3, y1 - bh / 2 - 3, bw + 6, bh + 6);
    }
    if (!phone) label(c, LANE_KEYS[l], x, y1, down ? "#1a1408" : t.fg, 9);
  }
  // Space: the same note (a computer's).
  if (!phone) {
    const sdown = g.keysDown.has("Space");
    c.fillStyle = sdown ? t.shine : "#1d1a24";
    c.fillRect(cx - W * 0.2, y1 + 16, W * 0.4, 10);
    label(c, "SPACE", cx, y1 + 21, sdown ? "#1a1408" : t.muted, 6);
  }
  // Flames where notes were struck.
  const now = performance.now();
  for (const fl of g.flames) {
    const age = now - fl.at;
    if (age > 260 || fl.i >= lanes.length) continue;
    const x = laneX(lanes[fl.i], 1);
    for (let k = 0; k < 7; k++) {
      c.fillStyle = k % 2 ? "#ffd56a" : "#ff7a3d";
      c.globalAlpha = 1 - age / 260;
      const fx = x + Math.sin(k * 1.7 + age / 30) * 10;
      const fy = y1 - 10 - ((age / 260) * 40 + k * 4);
      c.fillRect(fx - 2, fy, 4, 6);
    }
    c.globalAlpha = 1;
  }
  // The multiplier's ring (left): eight notes to the next step, its four lamps.
  const rx = phone ? 34 : cx - W / 2 - 60;
  const ry = phone ? 34 : y1 - 40;
  c.lineWidth = 6;
  for (let k = 0; k < 8; k++) {
    c.strokeStyle = k < g.streak % 8 || g.mult >= 4 ? (g.mult >= 4 ? t.gold : t.shine) : "#2a2533";
    c.beginPath();
    c.arc(rx, ry, 26, -Math.PI / 2 + (k * Math.PI) / 4 + 0.06, -Math.PI / 2 + ((k + 1) * Math.PI) / 4 - 0.06);
    c.stroke();
  }
  label(c, `×${g.mult * (g.pleno ? 2 : 1)}`, rx, ry, g.pleno ? t.gold : t.fg, 12);
  label(c, `${g.streak}`, rx, ry + (phone ? 36 : 44), t.muted, 8);
  // The crowd's meter (right).
  const mx = phone ? w - 18 : cx + W / 2 + 44;
  const mh = phone ? 70 : 120;
  const my = phone ? 10 : y1 - mh;
  const grad = c.createLinearGradient(0, my, 0, my + mh);
  grad.addColorStop(0, "#5fdc6a");
  grad.addColorStop(0.55, "#e8c94a");
  grad.addColorStop(1, "#e2533f");
  c.fillStyle = grad;
  c.globalAlpha = 0.85;
  c.fillRect(mx - 6, my, 12, mh);
  c.globalAlpha = 1;
  const ny = my + mh * (1 - g.crowd);
  c.fillStyle = t.fg;
  c.fillRect(mx - 12, ny - 2, 24, 4);
  label(c, "CROWD", mx, my + mh + 12, g.crowd < 0.25 ? t.wrong : t.muted, 6);
  // How it goes, in a line.
  const how =
    lvl === "timing"
      ? "ANY KEY ON THE BEAT · THE LANES DRAW THE LINE"
      : `THE NOTE'S KEY, OR ANY KEY ON ITS SIDE OF THE LAST · SAME NOTE: SAME KEY OR SPACE${lvl === "leaps" ? " · A LEAP SKIPS A KEY" : ""} · OPEN BAR: ANY KEY`;
  if (phone) {
    label(c, lvl === "timing" ? "TAP ANY LANE ON THE BEAT · SLIDE TO JOIN" : "LINE UP: TAP FURTHER RIGHT · DOWN: LEFT", w / 2, h - 30, t.fg, 7);
    label(c, lvl === "timing" ? "TWO ROWS: CROSS THUMBS · HOLD THE LONG NOTES" : `SAME NOTE: SAME LANE${lvl === "leaps" ? " · LEAP: SKIP A LANE" : ""} · SLIDE TO JOIN · TWO ROWS`, w / 2, h - 16, t.muted, 7);
    return;
  }
  label(c, how, w / 2, h - 24, t.fg, 7);
  label(c, `Q ROW f · A ROW mf · Z ROW p · SHIFT: PEDAL${g.pedalOn ? " (DOWN)" : ""}`, w / 2, h - 10, g.pedalOn ? t.gold : t.muted, 7);
}


/**
 * D214, SUBJECT: whose the subject is. The entry under way named at the top in its voice's colour
 * (larger as it begins); the next entry's name riding beside its first note down the road; during a
 * rest, a marker at the road's far end pulsing on the beat, counting the next entry in.
 */
function subjectCues(c: CanvasRenderingContext2D, g: ProtoGame, at: (tick: number) => { y: number; k: number; d: number }, cx: number, topY: number, t: Tok) {
  const { current, next } = g.entryNow();
  const count = g.f.voices.length;
  const beatS = g.beat / g.tps;
  if (current) {
    const age = (g.now - current.on) / g.tps;
    const flash = Math.max(0, 1 - age / (2 * beatS));
    c.globalAlpha = 0.75 + 0.25 * flash;
    label(c, current.label, cx, 84, inkOf(current.voice, count), Math.round(8 + 4 * flash));
    c.globalAlpha = 1;
  }
  if (!next) return;
  const ink = inkOf(next.voice, count);
  if (next.on <= g.now + AHEAD_S * g.tps) {
    const p = at(next.on);
    label(c, next.label, cx, p.y - Math.max(10, 18 * p.k), ink, Math.max(6, Math.round(8 * p.k)));
    return;
  }
  // Waiting: the count-in, from four bars out.
  const beats = Math.ceil((next.on - g.now) / g.beat);
  if (current || beats > 4 * Math.max(1, Math.round(g.f.barTicks / g.beat))) return;
  const ph = ((next.on - g.now) / g.beat) % 1;
  const pulse = ph > 0.75 ? (ph - 0.75) * 4 : 0;
  c.globalAlpha = 0.45 + 0.5 * pulse;
  c.fillStyle = ink;
  const s = 5 + 3 * pulse;
  c.beginPath();
  c.moveTo(cx, topY - s);
  c.lineTo(cx + s, topY);
  c.lineTo(cx, topY + s);
  c.lineTo(cx - s, topY);
  c.closePath();
  c.fill();
  c.globalAlpha = 0.8;
  label(c, next.label, cx, topY + 18, ink, 7);
  label(c, `IN ${beats}`, cx, topY + 32, beats <= 4 ? t.fg : t.muted, beats <= 4 ? 10 : 7);
  c.globalAlpha = 1;
}

/** HIGHWAY's pads on a phone (D208): an upper and a lower row, the same five lanes; a pad lights where a thumb is. */
const TIER = { top: -8, h: 64, gap: 10 };
function padRows(c: CanvasRenderingContext2D, g: ProtoGame, laneX: (l: number, k: number) => number, W: number, N: number, y1: number, inkOfLane: (l: number) => string, lastCol: number | undefined, t: Tok) {
  const pads = g.heldPads;
  const split = y1 + TIER.top + TIER.h + TIER.gap / 2;
  const bw = (W / N) * 0.88;
  for (let row = 0; row < 2; row++) {
    const y = y1 + TIER.top + row * (TIER.h + TIER.gap);
    for (let l = 0; l < N; l++) {
      const x = laneX(l, 1);
      const ink = inkOfLane(l);
      const down = pads.some((p) => p.lane === l && (p.y >= split) === (row === 1));
      const sink = down ? 4 : 0;
      c.fillStyle = shade(ink, 0.3);
      c.fillRect(x - bw / 2, y + TIER.h, bw, 6 - sink);
      c.fillStyle = down ? ink : row ? "#17141e" : "#1d1a24";
      c.fillRect(x - bw / 2, y + sink, bw, TIER.h);
      c.strokeStyle = ink;
      c.globalAlpha = row ? 0.7 : 1;
      c.lineWidth = 2;
      c.strokeRect(x - bw / 2, y + sink, bw, TIER.h);
      c.globalAlpha = 1;
      if (down) {
        c.fillStyle = ink;
        c.globalAlpha = 0.22;
        c.fillRect(x - bw / 2 - 4, y1 - 46, bw + 8, 40);
        c.globalAlpha = 1;
      }
    }
  }
  // The strike line across the upper row's top, and the last lane ringed (both rows).
  c.fillStyle = "rgba(255,255,255,0.55)";
  c.fillRect(laneX(0, 1) - W / N / 2, y1 - 1, W, 2);
  if (lastCol !== undefined) {
    const x = laneX(lastCol, 1);
    c.strokeStyle = t.gold;
    c.lineWidth = 2;
    c.strokeRect(x - bw / 2 - 3, y1 + TIER.top - 3, bw + 6, 2 * TIER.h + TIER.gap + 6);
  }
}

/** HIGHWAY's other voices (D208): faint marks by pitch across the road, the subject entries brighter. */
const ghostRange = new WeakMap<ProtoGame, { lo: number; hi: number; subj: (n: { voice: number; on: number }) => boolean; from: number }>();
function ghosts(c: CanvasRenderingContext2D, g: ProtoGame, at: (tick: number) => { y: number; k: number; d: number }, cx: number, W: number, y1: number) {
  let r = ghostRange.get(g);
  if (!r) {
    const steps = [...g.others.map((n) => n.step), ...g.notes.map((n) => n.step)];
    const ents = g.f.entries;
    r = { lo: Math.min(...steps), hi: Math.max(...steps), subj: (n) => ents.some((e) => e.voice === n.voice && n.on >= e.on && n.on < e.end), from: 0 };
    ghostRange.set(g, r);
  }
  const span = Math.max(1, r.hi - r.lo);
  const horizon = g.now + AHEAD_S * g.tps;
  const count = g.f.voices.length;
  // A cursor past the notes long gone (eight beats back), so a frame does not walk the whole piece.
  while (r.from < g.others.length && g.others[r.from].on < g.now - 8 * g.beat) r.from++;
  for (let j = r.from; j < g.others.length; j++) {
    const n = g.others[j];
    if (n.on > horizon) break;
    if (n.on + n.dur < g.now - g.tps * 0.2) continue;
    const a = at(Math.max(n.on, g.now - g.tps * 0.2));
    const e = at(Math.min(n.on + n.dur, horizon));
    if (a.y > y1 + 4) continue;
    const u = (n.step - r.lo) / span;
    const xa = cx + (-W / 2 + W * (0.06 + 0.88 * u)) * a.k;
    const xe = cx + (-W / 2 + W * (0.06 + 0.88 * u)) * e.k;
    const subj = r.subj(n);
    c.fillStyle = inkOf(n.voice, count);
    c.globalAlpha = subj ? 0.5 : 0.22;
    const wa = (subj ? 7 : 4) * a.k;
    const we = (subj ? 7 : 4) * e.k;
    c.beginPath();
    c.moveTo(xa - wa, Math.min(a.y, y1));
    c.lineTo(xa + wa, Math.min(a.y, y1));
    c.lineTo(xe + we, e.y);
    c.lineTo(xe - we, e.y);
    c.closePath();
    c.fill();
  }
  c.globalAlpha = 1;
}

/** A voice's next note and how near it is (0 far, 1 on its beat), if it is showing. */
function coming(g: ProtoGame, k = 0): { i: number; p: number } | null {
  const i = g.next(k);
  if (i < 0) return null;
  const approach = (APPROACH_MS / 1000) * g.tps;
  const dt = g.tracks[k].notes[i].on - g.now;
  if (dt > approach * 1.4) return null;
  return { i, p: Math.max(0, Math.min(1, 1 - dt / approach)) };
}

/** A lit place: the colour rising as the beat comes, two bars meeting on it. */
function light(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: number, ink: string, t: Tok) {
  c.fillStyle = ink;
  c.globalAlpha = 0.14 + 0.5 * p * p;
  c.fillRect(x, y, w, h);
  const half = (w / 2) * (1 - p);
  c.globalAlpha = 0.95;
  c.fillStyle = t.shine;
  c.fillRect(x, y + h - 3, w / 2 - half, 3);
  c.fillRect(x + w / 2 + half, y + h - 3, w / 2 - half, 3);
  c.globalAlpha = 1;
}

function label(c: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size = 7, align: CanvasTextAlign = "center") {
  c.fillStyle = color;
  c.font = `${size}px ${FONT}`;
  c.textAlign = align;
  c.textBaseline = "middle";
  c.fillText(text, x, y);
}

function bars(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok) {
  const bw = w * BAR;
  const count = g.f.voices.length;
  const sides = [
    { x: 0, inner: bw, k: 0 },
    { x: w - bw, inner: w - bw, k: g.tracks.length > 1 ? 1 : 0 },
  ];
  for (const [n, s] of sides.entries()) {
    // The bar: warm and dark, a little lighter towards the phone's edge (forte).
    const grad = c.createLinearGradient(s.inner, 0, n ? w : 0, 0);
    grad.addColorStop(0, "rgba(26,18,22,0.92)");
    grad.addColorStop(1, "rgba(54,34,30,0.92)");
    c.fillStyle = grad;
    c.fillRect(s.x, 0, bw, h);
    c.fillStyle = t.barline;
    c.fillRect(n ? s.x : bw - 2, 0, 2, h);
    // The dynamics along the foot, pp by the box to ff by the edge.
    MARKS.forEach((m, j) => {
      const u = (j + 0.5) / MARKS.length;
      label(c, m, n ? s.x + u * bw : bw - u * bw, h - 9, t.muted, 6);
    });
  }
  const rows = g.rows;
  if (g.proto.id === "ladder" && rows) {
    // Only the Cs named at the edges, for bearings; no rungs to aim at (D181: the way matters, not the spot).
    for (let st = Math.floor(rows.stepAt(h)) - 1; st <= rows.stepAt(0) + 1; st++) {
      const y = Math.round(rows.yOf(st));
      if (st % 7 !== 0 || y < 8 || y > h - 24) continue;
      label(c, stepName(st), 4, y, t.muted, 6, "left");
      label(c, stepName(st), w - 4, y, t.muted, 6, "right");
    }
    const nx = coming(g);
    if (nx) {
      const n = g.notes[nx.i];
      const m = g.moves[nx.i];
      const ink = inkOf(g.voice, count);
      const y = rows.yOf(n.step);
      const reach = LADDER_AREA * rows.rowH;
      // A soft glow over the note's broad area, brightest at its height, on both bars.
      for (const s of sides) {
        const grad = c.createLinearGradient(0, y - reach, 0, y + reach);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(0.5, ink);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = grad;
        c.globalAlpha = 0.2 + 0.55 * nx.p * nx.p;
        c.fillRect(s.x, y - reach, bw, 2 * reach);
        c.globalAlpha = 1;
        // The beat closing in: two bars meeting at the bar's foot.
        const half = (bw / 2) * (1 - nx.p);
        c.fillStyle = t.shine;
        c.fillRect(s.x, h - 22, bw / 2 - half, 3);
        c.fillRect(s.x + bw / 2 + half, h - 22, bw / 2 - half, 3);
        const way = !g.lastTouch || m.size < 0 ? "" : m.dir === 0 || m.steps === 0 ? "=" : m.dir > 0 ? "▲" : "▼";
        label(c, `${way}${n.long ? " HOLD" : ""}`, s.x + bw / 2, y, t.fg, 9);
      }
      // A soft trail from the note in the box out to the bars.
      const xn = Math.max(bw, Math.min(w - bw, rows.xOf(n.on)));
      c.fillStyle = ink;
      c.globalAlpha = 0.12 + 0.3 * nx.p;
      c.fillRect(bw, y - rows.rowH, xn - bw, 2 * rows.rowH);
      c.fillRect(xn, y - rows.rowH, w - bw - xn, 2 * rows.rowH);
      c.globalAlpha = 1;
    }
    // Where you last played: a mark on that bar.
    if (g.lastTouch) {
      const s = sides[g.lastTouch.side === "left" ? 0 : 1];
      c.fillStyle = t.shine;
      c.globalAlpha = 0.6;
      c.fillRect(s.x + 4, g.lastTouch.y - 1, bw - 8, 2);
      c.globalAlpha = 1;
    }
  } else if (g.proto.id === "duo") {
    for (const [n, s] of sides.entries()) {
      const tr = g.tracks[s.k];
      const ink = inkOf(tr.voice, count);
      const nx = coming(g, s.k);
      if (nx) light(c, s.x, 0, bw, h - 18, nx.p, ink, t);
      label(c, n ? "2P" : "1P", s.x + bw / 2, 16, ink, 12);
      label(c, g.f.voiceNames[tr.voice].toUpperCase(), s.x + bw / 2, 34, ink, 6);
    }
  }
  for (const s of g.heldSides()) {
    c.fillStyle = t.shine;
    c.globalAlpha = 0.3;
    c.fillRect(s.side === "left" ? 0 : w - bw, s.y - 14, bw, 28);
    c.globalAlpha = 1;
  }
}


function verdict(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok) {
  const gr = g.grade;
  if (!gr) return;
  const age = performance.now() - gr.at;
  const ok = gr.text === "PERFECT" || gr.text === "GOOD";
  if (age < 220) {
    c.fillStyle = ok ? t.shine : t.wrong;
    c.globalAlpha = 0.12 * (1 - age / 220);
    c.fillRect(0, 0, w, h);
    c.globalAlpha = 1;
  }
  if (age < 500) {
    c.globalAlpha = 1 - age / 500;
    const why: Record<string, string> = { legato: "✕ LEGATO", gesture: "✕ WRONG", staccato: "✕ STACCATO", tenuto: "✕ TENUTO", hand: "✕ OTHER THUMB", height: "✕ HIGHER/LOWER", dynamic: "✕ FORTE/PIANO" };
    const text = gr.text === "✕" ? (why[gr.why ?? ""] ?? "✕ OFF TIME") : gr.text;
    const bars = g.proto.layout === "bars";
    const desk = g.proto.layout === "desk";
    const x = bars ? (gr.side === "left" ? w * BAR * 0.5 : w * (1 - BAR * 0.5)) : desk ? w - 90 : w / 2;
    label(c, text, x, bars ? h * 0.45 : desk ? 14 : 30, gr.text === "PERFECT" ? t.gold : ok ? t.fg : t.wrong, 8);
    c.globalAlpha = 1;
  }
}
