/**
 * Painting the testbench's prototypes (D175-D179).
 *   The bars (LADDER, THUMBS, TWO VOICES): two side bars over the screen, the music box between them.
 *     LADDER (D181): a soft glow over the coming note's broad area on both bars, brightest at the
 *     height it is drawn, a trail from it in the box, the way to go from your last touch (▲ ▼ =), and
 *     a mark where you last played; only the Cs named, for bearings.
 *     THUMBS lights the bar wanted; TWO VOICES each bar for its voice (1P, 2P). The dynamics are
 *     marked along the bars' feet, pp on the soft side to ff on the strong (touch-expr.ts STRONG_SIDE).
 *   PIANO: paint-piano.ts.
 * The verdict of the last touch flashes over the field.
 */
import { ornamentMark } from "../touch/ornament-play.ts";
import { AUTO } from "../touch/box-variants.ts";
import { ARROW_PIXELS, inkOf, type Arrow } from "../touch/MusicBox.tsx";
import { paperInk } from "./sheet-view.ts";
import { paintPiano } from "../touch/paint-piano.ts";
import { barStart, type TouchFugue } from "../touch/fugue.ts";
import { APPROACH_MS, CROWD_START, OWN_FRESH_S, PHONE_LINE, type ProtoGame } from "./proto-game.ts";
import { trCanvas } from "../i18n/index.ts";
import { drawThumb } from "./fingering.ts";
import { STRONG_SIDE, strengthOf } from "../touch/touch-expr.ts";
import { ARROW_KEYS, arrowOf, BAR, contourOk, fits, keyPlace, laneOk, KEY_ROWS, MARKS } from "./protos.ts";
import { CLEAN_INK, HELD_INK, LEGATO_INK, type ArtFlash } from "./articulation.ts";
import { scaleGem, scaleHands, scaleHow, scaleInk, scaleLetter, scaleStrip } from "./paint-scale.ts";
import { buildMap, fugueMap, SHOULDER } from "./paint-arch.ts";
import { arcOf, pedalSpan } from "./arc.ts";
import { builds, echoShown, hasJourney, paintBackdrop, paintRoadLight, roadFar } from "./journey.ts";
import { deskBegin, deskCrowd, deskEnd, deskFlare, deskGeom, deskKeys, deskOver, deskSparks, deskUnder, subjectGem, type Road } from "./paint-desk.ts";

/** D314: how long (s from the run's start) the bars say where SOFT and STRONG are. */
const SIDES_HINT_S = 6;
/** D371: the thumb bar's inner edge in the player's voice colour (px; the report's 4 px). */
export const STRIP_EDGE = 4;

const FONT = '"TG Accidentals", "Press Start 2P", ui-monospace, monospace';

export type Tok = ReturnType<typeof tokens>;
function tokens() {
  const css = getComputedStyle(document.documentElement);
  const tok = (name: string) => css.getPropertyValue(name).trim() || "#fff";
  return { shine: tok("--tg-shine"), gold: tok("--tg-gold"), wrong: tok("--tg-wrong"), fg: tok("--tg-fg"), muted: tok("--tg-muted"), grid: tok("--tg-grid"), barline: tok("--tg-barline"), miss: tok("--tg-miss") };
}

/**
 * D298: the SHEET mode's look for the bars (sheet-view.ts draws the page between them): paper, dark ink,
 * no pitch names; the same marks as the box's (the coming note's light, the way to go, the last touch).
 */
let paper = false;
export function setPaperLook(on: boolean) {
  paper = on;
}
export const PAPER_TOK: Tok = { shine: "#8a6a12", gold: "#9a7410", wrong: "#b3261e", fg: "#1d1d1f", muted: "#8a857a", grid: "#e4e0d6", barline: "#d6d1c4", miss: "#b3261e" };

export function paintProto(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, subject: Set<string>) {
  const t = paper && g.proto.layout === "bars" ? PAPER_TOK : tokens();
  switch (g.proto.id) {
    case "ladder":
      bars(c, w, h, g, t);
      break;
    case "piano":
      paintPiano(c, w, h, { kb: g.kb, now: g.now, tps: g.tps, voice: g.voice, count: g.f.voices.length, notes: g.notes, others: g.others, late: g.opt.late, held: g.heldCells(), grade: g.grade }, subject);
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
  // D402: the tutorial's screen dressed lesson by lesson: the verdicts from Part 2.
  // D413: nothing judged under his demonstration (a WATCH: Bach plays): no verdicts on his notes.
  if ((!g.o.dress || g.o.dress.includes("verdicts")) && !g.o.demo) verdict(c, w, h, g, t);
  // D359: THE MANUAL's practice room: none of the game's chatter. D402: unless the lesson has dressed it.
  if (!g.o.quiet || g.o.dress?.includes("score")) scoreboard(c, w, h, g, t);
  // D251: how far into the piece, along the top edge.
  progress(c, w, g, t);
}

/** D181: the score and the multiplier, the banners (ORGANO PLENO, CON FUOCO), and CON FUOCO's embers. */
function scoreboard(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok) {
  const bars = g.proto.layout === "bars";
  const desk = g.proto.layout === "desk";
  // D402: a tutorial lesson's dressing (the full screen's banners, chains and embers come with SUBJECTS, at THE REAL THING).
  const dress = g.o.dress;
  const full = !dress || dress.includes("subjects");
  const x = bars ? (w * BAR) / 2 : desk ? w - 90 : w / 2;
  const y = bars ? h * 0.12 : desk ? 34 : 14;
  // D413 (the owner: "Nothing should be scored or counted during WATCH"): under his demonstration the
  // counters stand still at where the step began (0, no multiplier, no combo, ACCURACY —), still in place
  // for the bubbles that point at them.
  const still = !!g.o.demo;
  label(c, still ? "0" : Math.floor(g.score).toLocaleString("en"), x, y, t.fg, g.proto.id === "keys" ? 12 : 9);
  if (still) {
    if (bars) liveSheet(c, w, h, g, t);
    return;
  }
  if (g.mult > 1 && !desk) label(c, `×${g.mult}`, x, y + 16, g.mult >= 4 ? t.gold : t.shine, 9);
  // D249: the combo (the right notes running), small and muted under the score, off the middle of the
  // music (it shared the count-in's centre). Named, so it is not read as the multiplier.
  const combo = g.combo >= 5 && !AUTO;
  const cy = desk ? y + 16 : y + 28;
  if (combo) label(c, `COMBO ${g.combo}`, x, cy, t.muted, 6);
  const below = combo ? 12 : 0;
  // D268: the right bar's live sheet: the share of right notes so far, the subject's entries captured, the crowd.
  if (bars) liveSheet(c, w, h, g, t);
  if (!full) return;
  if (g.pleno) label(c, "PLENO ×2", bars ? w - (w * BAR) / 2 : x, bars ? h * 0.12 + 74 : y + 32 + below, t.gold, 7);
  // D218: the legato chain under way.
  if (g.chain >= 2) label(c, `LEGATO ×${g.chain}`, x, bars ? h * 0.12 + 30 + below : desk ? y + 16 + below : y + (g.pleno ? 46 : 32) + below, LEGATO_INK, 6);
  // CON FUOCO: embers rising along the edges while the run lasts.
  if (g.streak >= 24 && !paper) {
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

/** D268: the right bar's top: ACCURACY so far, SUBJECTS captured of those come, the crowd's meter. */
function liveSheet(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok) {
  const bw = w * BAR;
  const x = w - bw / 2;
  let y = h * 0.12;
  // D402: in the tutorial each line only once the lesson has dressed it (ACCURACY and the crowd from 3.6, SUBJECTS at THE REAL THING).
  const on = (k: string) => !g.o.dress || g.o.dress.includes(k);
  // D413: frozen under his demonstration (see scoreboard).
  const still = !!g.o.demo;
  const acc = still ? null : g.liveAccuracy();
  if (on("accuracy")) {
    label(c, acc === null ? "—" : `${Math.floor(acc * 100)}%`, x, y, acc === null || acc >= 0.9 ? t.fg : acc >= 0.8 ? t.shine : t.wrong, 9);
    label(c, "ACCURACY", x, y + 12, t.muted, 5);
    y += 28;
  }
  const come = still ? 0 : g.entries.filter((e) => e.state !== "open").length;
  if (g.entries.length && on("subjects")) {
    label(c, `${still ? 0 : g.entries.filter((e) => e.state === "captured").length}/${come}`, x, y, t.gold, 8);
    label(c, "SUBJECTS", x, y + 11, t.muted, 5);
    y += 26;
  }
  if (g.o.dress ? g.o.dress.includes("crowd") : g.o.fail) {
    const mw = Math.max(24, bw * 0.6);
    const grad = c.createLinearGradient(x - mw / 2, 0, x + mw / 2, 0);
    grad.addColorStop(0, "#e2533f");
    grad.addColorStop(0.45, "#e8c94a");
    grad.addColorStop(1, "#5fdc6a");
    c.fillStyle = "#1d1a24";
    c.fillRect(Math.round(x - mw / 2), Math.round(y), Math.round(mw), 5);
    c.fillStyle = grad;
    const crowd = still ? CROWD_START : g.crowd;
    c.fillRect(Math.round(x - mw / 2), Math.round(y), Math.round(mw * crowd), 5);
    label(c, "CROWD", x, y + 13, crowd < 0.25 ? t.wrong : t.muted, 5);
  }
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

/** D229: the space bar's glyph (⎵) on a repeated note's gem, and SPACE under it once near enough to read. */
function spaceMark(c: CanvasRenderingContext2D, x: number, y: number, gw: number, gh: number, k: number, missed: boolean) {
  const bw = gw * 0.62;
  const lw = Math.max(1, Math.round(2 * k));
  const by = y + gh * 0.02;
  c.fillStyle = missed ? "#6a6474" : "#120f18";
  c.fillRect(x - bw / 2, by, bw, lw);
  c.fillRect(x - bw / 2, by - gh * 0.28, lw, gh * 0.28 + lw);
  c.fillRect(x + bw / 2 - lw, by - gh * 0.28, lw, gh * 0.28 + lw);
  // A pale bar under the gem: the thumbs' key, as at the foot.
  c.fillStyle = missed ? "#4a4458" : "#e8f4ff";
  c.fillRect(x - bw / 2, y + gh * 0.62, bw, Math.max(2, 3 * k));
  if (k > 0.5 && !missed) label(c, "SPACE", x, y + gh * 0.62 + Math.max(7, 9 * k), "#e8f4ff", Math.max(5, Math.round(6 * k)));
}

/** D229: how near (0 none, 1 at the line) the next SPACE gem is, within 0.8 s. */
function spaceNear(g: ProtoGame): number {
  const notes = g.notes;
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    if (n.state !== "pending" || n.ride || n.on < g.now - g.opt.late) continue;
    const s = (n.on - g.now) / g.tps;
    if (s > 0.8) return 0;
    if (g.spaceGem(i)) return Math.max(0, Math.min(1, 1 - s / 0.8));
  }
  return 0;
}

/**
 * EASY as a highway (D198, after Guitar Hero): the player's notes come down ten lanes, the home row's
 * keys (A S D F G H J K L ;), towards the strike line, in perspective. A note's lane is a fingering
 * of its line (ProtoGame.lanes): the key that answers it is always right; in DIRECTION any key on its
 * side of the last will do for half the points (D239: the lane's key scores in full). A free note is an open bar across all the
 * lanes; a note of the subject's entries a gem with a star; a long note a tail, glowing while held.
 * A struck note flames; a missed one falls through grey. The multiplier's ring on the left, the crowd's
 * meter on the right.
 */
/** A colour darkened (k below 1) for a face in shadow. */
export function shade(hex: string, k: number): string {
  const v = parseInt(hex.slice(1), 16);
  const r = Math.round(((v >> 16) & 255) * k);
  const gg = Math.round(((v >> 8) & 255) * k);
  const b = Math.round((v & 255) * k);
  return `rgb(${r},${gg},${b})`;
}
const LANE_KEYS = ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"];
const LANE_INK = ["#ff6b5a", "#ff9248", "#ffc145", "#d9e34f", "#7ee36b", "#4fd6b2", "#4cb8ff", "#7d8bff", "#b47dff", "#ff7dd6"];
/** D235: the computer's nine lanes by hand: the left (A S D F) warm, G (either index) gold, the right (H J K L) cool. */
/** D262: both hands: the left hand's lanes warm (its last the nearest the split), the right's cool. */
const LEFT_INK = ["#c2452f", "#e0603a", "#f58a3c", "#ffb347"];
const RIGHT_INK = ["#4fd6e6", "#4cb8ff", "#5f86ff", "#8a74ff", "#b47dff"];
const HAND_INK = ["#b8432f", "#e0603a", "#f58a3c", "#ffb347", "#ffd66e", "#57c7ff", "#3f9cf5", "#4f74e8", "#6a5ad6"];
const AHEAD_S = 2.1;
function highway(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok) {
  // D207: on a phone (HIGHWAY), five lanes across the whole width, the strike line high enough for a thumb.
  const phone = g.road;
  // D214, SUBJECT: the line moves between voices; its gems take each one's colour.
  const subj = g.proto.id === "subject";
  const N = g.laneCount;
  // D230, SCALE KEYS: the eight home lanes the home key's scale; the altered notes between them (paint-scale.ts).
  const sc = g.scale;
  // D262: with both hands each hand its own colours, warm the left, cool the right.
  const split = g.hands ? g.laneRegion(0).from : -1;
  const inkOfLane = (l: number) => (sc ? scaleInk(l) : g.hands ? (l < split ? LEFT_INK[l + LEFT_INK.length - split] : RIGHT_INK[l - split]) : N === 5 ? LANE_INK[l * 2] : HAND_INK[l] ?? LANE_INK[l]);
  const cx = w / 2;
  // D220: the computer's road alone in the window (no music box), larger.
  const dg = deskGeom(w, h);
  const y0 = phone ? 64 : dg.y0;
  // D208: on a phone the strike line sits higher, over two rows of pads (room for the thumbs to cross).
  // D257: taller pads, the road nearly the screen's width (the owner: "the touch areas might be too small").
  const y1 = phone ? h - PHONE_LINE : dg.y1;
  const W = phone ? w * 0.98 : dg.W;
  const lvl = g.o.easy ?? "timing";
  // D216, KIMIKO: the road by her time (the seconds between, not the ticks): it scrolls steadily and
  // the notes come spaced as she plays them. The far end: the tick she plays AHEAD_S from now.
  const nowS = g.clock ? g.timeAt(g.now) : 0;
  const ahead = g.clock ? g.tickAtTime(nowS + AHEAD_S) : g.now + AHEAD_S * g.tps;
  // Depth (0 at the line, 1 at the horizon) to the screen: y, and the width's scale.
  const at = (tick: number) => {
    const d = (g.clock ? g.timeAt(tick) - nowS : (tick - g.now) / g.tps) / AHEAD_S;
    const s = 1 / (1 + 3 * Math.max(-0.2, d));
    const f = (s - 0.25) / 0.75;
    return { y: y0 + (y1 - y0) * f, k: 0.3 + 0.7 * f, d };
  };
  const laneX = (lane: number, k: number) => cx + (-W / 2 + ((lane + 0.5) * W) / N) * k;
  // The road.
  const top = at(ahead);
  // D220: the computer's road: its effects (paint-desk.ts), and a light shake on the big moments.
  const R: Road | null = phone ? null : { c, w, h, g, t, at, laneX, cx, W, N, y0, y1, top, ahead };
  // D244: the journey behind it all (a scripted piece): the key's sky, shadow, climb, summit.
  const trip = hasJourney(g.f);
  if (trip) paintBackdrop(c, w, h, top.y, g.f, g.now, g.journeyLive);
  if (R) deskBegin(c, g), deskCrowd(R);
  // D202: the road lit towards the player, its far end in fog; rails along its edges.
  const road = c.createLinearGradient(0, top.y, 0, y1 + 30);
  road.addColorStop(0, trip ? roadFar(g.f, g.now, g.journeyLive) : "#0b0a11");
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
  if (trip) paintRoadLight(c, w, top.y, y1, g.f, g.now, g.journeyLive);
  if (R) deskUnder(R);
  if (R && sc) scaleHands(R);
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
  // D262: the hands apart: a bright line up the road between them (and a gutter through the pads).
  if (g.hands) {
    const xb = cx - W / 2 + (split * W) / N;
    c.save();
    c.strokeStyle = "rgba(255,246,208,0.55)";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cx + (xb - cx) * top.k, top.y);
    c.lineTo(xb, y1 + 30);
    c.stroke();
    c.restore();
  }
  const beat = g.beat;
  for (let tk = Math.ceil(g.now / beat) * beat; tk < ahead; tk += beat) {
    const p = at(tk);
    const bar = ((tk - g.f.bars[0].on) % g.f.barTicks + g.f.barTicks) % g.f.barTicks === 0;
    c.fillStyle = bar ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)";
    c.fillRect(cx - (W / 2) * p.k, Math.round(p.y), W * p.k, bar ? 2 : 1);
  }
  // The keys that would answer the next note (DIRECTION).
  const nx = coming(g);
  const judged = !sc && (lvl === "direction" || lvl === "leaps") && nx && (phone ? g.lastLane >= 0 : g.lastKey) && !g.isFree(nx.i);
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
  // D220: and on the computer's. D235: withdrawn: notes off the lanes in other colours read as the
  // player's own in the wrong lanes (the owner: "so confusing"). D238: the road is the player's
  // alone; the other voices run on rails on its shoulders (paint-arch.ts, from deskUnder).
  // D217, SUBJECT: a stretto's older entry (the lower row) drawn hollow, behind the main line.
  if (subj && g.tracks[1]) secondLine(c, g, at, laneX, W, N, y1, beat, t);
  // D250, THE PEDAL: its lane lit from where it begins to where it ends, bright while held; named at its head.
  // D252: every pedal to come (G, then C), each in its own lane.
  for (const bp of g.pedals) {
  if (!bp.done && bp.on - g.now < 2 * g.f.barTicks + AHEAD_S * g.tps) {
    const near = at(Math.max(bp.on, g.now));
    const far = at(Math.min(bp.end, ahead));
    if (near.d <= 1 && far.d >= near.d) {
      const ink = inkOfLane(bp.lane);
      const held = bp.id !== null;
      const lw0 = (W / N) * 0.36;
      c.fillStyle = ink;
      c.globalAlpha = held ? 0.75 : 0.32;
      c.beginPath();
      c.moveTo(laneX(bp.lane, near.k) - lw0 * near.k, near.y);
      c.lineTo(laneX(bp.lane, near.k) + lw0 * near.k, near.y);
      c.lineTo(laneX(bp.lane, far.k) + lw0 * far.k, far.y);
      c.lineTo(laneX(bp.lane, far.k) - lw0 * far.k, far.y);
      c.closePath();
      c.fill();
      c.globalAlpha = 1;
      if (g.now < bp.on) label(c, `HOLD ${bp.name}`, laneX(bp.lane, near.k), near.y - 10, ink, Math.max(6, Math.round(9 * near.k)));
      else label(c, held ? "PEDAL" : `HOLD ${bp.name}`, laneX(bp.lane, near.k), y1 - 14, held ? "#fff6d0" : ink, 7);
    }
  }
  }
  // D250: the final chord's cue: both thumbs (keys) together.
  const fc = g.finalCue;
  if (fc !== undefined && fc - g.now < 3 * g.beat && fc - g.now > -g.beat / 2) label(c, R ? "TWO KEYS TOGETHER" : "BOTH THUMBS TOGETHER", cx, y1 - 30, t.gold, 8);
  // The notes, far to near. D252: both hands' tracks, each in its own lanes.
  for (let k = 0; k < (g.hands ? 2 : 1); k++) {
  const lanes = g.lanesOf(k);
  const notes = g.tracks[k].notes;
  const subject = new Set(g.entries.filter((e) => e.k === k).flatMap((e) => e.ons));
  // D244: the bar's repeated half drawn hollow (a scripted prelude).
  const echo = echoShown(g.f) && k === 0 ? g.echoOf(0) : null;
  // D262: the echo (the second keyboard's note) drawn hollow.
  const echoRow = !!g.arc?.echo && k === 0 && phone;
  const traces = g.tracks[k].traces;
  const region = g.hands ? g.laneRegion(k) : { from: 0, count: N };
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i];
    if (i > 0 && notes[i - 1].on === n.on) continue;
    const p = at(n.on);
    // D261: a note with a tail (held) stays drawn while it lasts, its head gone by; a tap goes when struck.
    const tailed = g.tailed(n);
    const sounding = tailed && n.state === "hit" && g.now < n.on + n.dur;
    // D262, THE LINE: its path through the notes the slide will sound, from the first to the last, while any is to come.
    const tq = traces?.get(n.on);
    if (tq?.length && g.now < tq[tq.length - 1].on + g.f.tpq / 4 && p.d <= 1) {
      const pts = [{ on: n.on, midi: n.midi }, ...tq].filter((q) => q.on >= g.now - g.f.tpq / 4 && q.on <= ahead).map((q) => ({ x: laneX(g.traceLane(q.midi, k), at(q.on).k), y: at(q.on).y, k: at(q.on).k }));
      if (pts.length) {
        const ink = inkOfLane(g.traceLane(n.midi, k));
        c.strokeStyle = ink;
        c.globalAlpha = 0.8;
        c.lineWidth = Math.max(2, 6 * pts[0].k);
        c.lineJoin = "round";
        c.beginPath();
        pts.forEach((q, j) => (j ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
        c.stroke();
        c.fillStyle = "#fff6d0";
        for (const q of pts) c.fillRect(q.x - 3 * q.k, q.y - 3 * q.k, 6 * q.k, 6 * q.k);
        c.globalAlpha = 1;
      }
    }
    if (p.d > 1 || (p.y > y1 + 40 && !sounding)) continue;
    if (n.state === "hit" && !(tailed && g.now < n.on + n.dur)) continue;
    const lane = lanes[i];
    const ink = subj ? inkOf(n.voice ?? g.voice, g.f.voices.length) : inkOfLane(lane);
    const lw = (W / N) * p.k;
    // The tail of a long note: as long as the note lasts (D261: in a prelude every note held, and only
    // those: wider, in the lane's colour, a bar across its end where the thumb lets go).
    if (tailed && n.state !== "miss") {
      const end = n.on + n.dur;
      const e = at(Math.min(end, ahead));
      const from = n.state === "hit" ? at(Math.max(n.on, g.now)) : p;
      const pre = g.f.kind === "prelude";
      const half = pre ? 0.3 : 0.12;
      c.fillStyle = n.held || pre ? ink : "rgba(255,255,255,0.35)";
      c.globalAlpha = n.held ? 0.9 : pre ? 0.5 : 0.6;
      const x1 = laneX(lane, from.k);
      const x2 = laneX(lane, e.k);
      // The near end as wide as the road is there (its head may have gone by the line).
      const w1 = (W / N) * from.k;
      c.beginPath();
      c.moveTo(x1 - w1 * half, from.y);
      c.lineTo(x1 + w1 * half, from.y);
      c.lineTo(x2 + (W / N) * e.k * half, e.y);
      c.lineTo(x2 - (W / N) * e.k * half, e.y);
      c.closePath();
      c.fill();
      c.globalAlpha = 1;
      if (pre && end <= ahead) {
        // Where to let go.
        c.fillStyle = "#fff6d0";
        c.fillRect(x2 - (W / N) * e.k * 0.4, e.y - Math.max(1.5, 3 * e.k), (W / N) * e.k * 0.8, Math.max(2, 4 * e.k));
      }
      if (n.state === "hit") continue;
    }
    // D261: in a prelude what the game plays is heard, not drawn (no dots).
    if (n.ride && g.f.kind === "prelude") continue;
    if (n.ride) {
      c.fillStyle = ink;
      c.fillRect(laneX(lane, p.k) - 2, p.y - 2, 4, 4);
      continue;
    }
    // D220: the computer's gems taller (its road is larger).
    const gh = Math.max(4, (R ? 16 : 12) * p.k);
    // D229: on a computer a repeat (SPACE) is a gem in the lane of the note before, marked SPACE.
    const space = !!R && g.spaceGem(i, k);
    if (!sc && g.isFree(i, k) && lvl !== "timing" && !space && !tq) {
      // A free note: an open bar across the road (D252: across its hand's lanes).
      c.fillStyle = n.state === "miss" ? t.miss : subj ? ink : "#c78bff";
      const xa = laneX(region.from, p.k) - (W / N / 2) * p.k + 4;
      const xb = laneX(region.from + region.count - 1, p.k) + (W / N / 2) * p.k - 4;
      c.fillRect(xa, p.y - gh / 3, xb - xa, Math.max(3, gh * 0.6));
      continue;
    }
    const x = laneX(lane, p.k);
    if (sc && sc[i]) {
      // D230: the note's key, a home gem or a black key's (raised or lowered), labelled.
      const d = scaleGem(c, x, p.y, lw, gh, p.k, sc[i], n.state === "miss", t);
      const orn = g.ornaments.get(`${n.voice ?? g.voice}:${n.on}`);
      if (orn && n.state !== "miss") label(c, ornamentMark(orn), x, d.y - d.gh - 4 * p.k, t.gold, Math.max(6, Math.round(8 * p.k)));
      if (subject.has(n.on) && n.state !== "miss") subjectGem(c, x, d.y, d.gw, d.gh, p.k, g.entries.some((e) => e.state === "captured" && e.ons.includes(n.on)));
      scaleLetter(c, x, d.y, d.gh, p.k, sc[i], n.state === "miss", t);
      continue;
    }
    const gw = lw * 0.8;
    if ((echo?.has(i) || (echoRow && g.rowOf(i, k) === 1)) && n.state !== "miss" && !space) {
      // D244, THE ECHO: the figure again, hollow: the lane's colour round a dark face.
      c.fillStyle = "rgba(11,10,17,0.85)";
      c.fillRect(x - gw / 2, p.y - gh / 2, gw, gh * 1.05);
      c.strokeStyle = ink;
      c.lineWidth = Math.max(1.5, 2.5 * p.k);
      c.strokeRect(x - gw / 2, p.y - gh / 2, gw, gh * 1.05);
      continue;
    }
    // A gem with depth: its shadow on the road, a darker front face, a lit top.
    c.fillStyle = "rgba(0,0,0,0.45)";
    c.fillRect(x - gw / 2 + 2 * p.k, p.y - gh / 2 + gh * 0.9, gw, gh * 0.45);
    c.fillStyle = n.state === "miss" ? "#3a3644" : shade(ink, 0.55);
    c.fillRect(x - gw / 2, p.y, gw, gh * 0.55);
    c.fillStyle = n.state === "miss" ? t.miss : ink;
    c.fillRect(x - gw / 2, p.y - gh / 2, gw, gh * 0.6);
    c.fillStyle = "rgba(255,255,255,0.4)";
    c.fillRect(x - gw / 2, p.y - gh / 2, gw, Math.max(1, gh * 0.16));
    if (space) spaceMark(c, x, p.y, gw, gh, p.k, n.state === "miss");
    // D252: a note for the lower row of pads (the figure repeated): a bar under the gem, the lower pad's sign.
    if (g.rowOf(i, k) === 1 && n.state !== "miss") {
      c.fillStyle = "#fff6d0";
      c.globalAlpha = 0.85;
      c.fillRect(x - gw * 0.35, p.y + gh * 0.75, gw * 0.7, Math.max(2, gh * 0.22));
      c.globalAlpha = 1;
    }
    // D258, SWEEP: a spread chord: a stair of its notes rising across the gem (a slide across sounds them).
    if (g.tracks[k].sweeps?.has(n.on) && n.state !== "miss") {
      let size = 1;
      while (notes[i + size]?.on === n.on) size++;
      const sq = Math.max(3, 5.5 * p.k);
      c.fillStyle = "#fff6d0";
      for (let q = 0; q < size; q++) c.fillRect(x - gw * 0.4 + (q * gw * 0.8) / size, p.y - gh / 2 - sq * (1.5 + 1.2 * q), sq * 1.6, sq);
    }
    // D205: an ornament's sign over its gem.
    const orn = g.ornaments.get(`${n.voice ?? g.voice}:${n.on}`);
    if (orn && n.state !== "miss") label(c, ornamentMark(orn), x, p.y - gh - 4 * p.k, t.gold, Math.max(6, Math.round(8 * p.k)));
    // D220: on the computer a subject gem: haloed, framed and crowned in gold.
    if (R && subject.has(n.on) && n.state !== "miss") subjectGem(c, x, p.y, gw, gh, p.k, g.entries.some((e) => e.state === "captured" && e.ons.includes(n.on)));
    else if (subject.has(n.on) && n.state !== "miss" && !subj) {
      c.strokeStyle = t.gold;
      c.lineWidth = Math.max(1, 2 * p.k);
      c.strokeRect(x - lw * 0.4, p.y - gh / 2, lw * 0.8, gh);
      label(c, "★", x, p.y, "#1a1408", Math.max(6, 9 * p.k));
    }
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
  slurs(c, g, at, laneX, y1);
  if (subj) subjectCues(c, g, at, cx, top.y, t);
  if (R) deskOver(R);
  // The strike line: the ten keys, lit when down; the last key ringed.
  const lastCol = phone ? (g.lastLane >= 0 ? g.lastLane : undefined) : g.lastKey ? keyPlace(g.lastKey)?.col : undefined;
  const heldLanes = phone ? g.heldLanes : [];
  // D208: on a phone, two rows of pads, the same lanes in each: one thumb above, the other below,
  // so they can pass each other (a lane is a lane in either row).
  if (phone) {
    padRows(c, g, laneX, W, N, y1, inkOfLane, lvl !== "timing" ? lastCol : undefined, t);
    if (subj) strettoRows(c, g, laneX, W, N, y1, t);
  }
  // The keys (a computer's).
  const bh = 18;
  for (let l = 0; l < N && !phone && !sc; l++) {
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
  // Space: the same note (a computer's). D220: the thumbs' bar, under both hands, G's marks.
  if (R) {
    const sy = sc ? scaleStrip(R, sc) : (deskKeys(R, bh), y1 + 36);
    const sdown = g.keysDown.has("Space");
    // D229: the bar lights as a SPACE gem nears the line.
    const near = spaceNear(g);
    if (near > 0 && !sdown) {
      c.fillStyle = t.shine;
      c.globalAlpha = 0.15 + 0.45 * near;
      c.fillRect(cx - W * 0.25 - 6 * near, sy - 6 * near, W * 0.5 + 12 * near, 14 + 12 * near);
      c.globalAlpha = 1;
    }
    c.fillStyle = shade(t.shine, 0.3);
    c.fillRect(cx - W * 0.25, sy + 14, W * 0.5, sdown ? 1 : 4);
    c.fillStyle = sdown ? t.shine : "#1d1a24";
    c.fillRect(cx - W * 0.25, sy + (sdown ? 3 : 0), W * 0.5, 14);
    c.strokeStyle = sdown ? t.shine : "#4a4458";
    c.lineWidth = 2;
    c.strokeRect(cx - W * 0.25, sy + (sdown ? 3 : 0), W * 0.5, 14);
    label(c, "SPACE · THUMBS · THE SAME NOTE AGAIN", cx, sy + 7 + (sdown ? 3 : 0), sdown ? "#1a1408" : t.muted, 6);
  }
  // Flames where notes were struck.
  const now = performance.now();
  for (const fl of g.flames) {
    const age = now - fl.at;
    const fLanes = g.lanesOf(fl.k ?? 0);
    if (age > 260 || fl.i >= fLanes.length) continue;
    const x = laneX(fl.lane ?? fLanes[fl.i], 1);
    for (let k = 0; k < 7; k++) {
      c.fillStyle = k % 2 ? "#ffd56a" : "#ff7a3d";
      c.globalAlpha = 1 - age / 260;
      const fx = x + Math.sin(k * 1.7 + age / 30) * 10;
      const fy = y1 - 10 - ((age / 260) * 40 + k * 4);
      c.fillRect(fx - 2, fy, 4, 6);
    }
    c.globalAlpha = 1;
  }
  laneGrades(c, g, laneX, inkOfLane, W / N, y1);
  if (R) deskSparks(R, inkOfLane);
  // The multiplier's ring (left): eight notes to the next step, its four lamps.
  // D238: on the computer, beyond the voice rails on the shoulders.
  const rx = phone ? 34 : cx - W / 2 - SHOULDER;
  const ry = phone ? 34 : y1 - 40;
  c.lineWidth = 6;
  for (let k = 0; k < 8; k++) {
    c.strokeStyle = k < g.streak % 8 || g.mult >= 4 ? (g.mult >= 4 ? t.gold : t.shine) : "#2a2533";
    c.beginPath();
    c.arc(rx, ry, 26, -Math.PI / 2 + (k * Math.PI) / 4 + 0.06, -Math.PI / 2 + ((k + 1) * Math.PI) / 4 - 0.06);
    c.stroke();
  }
  label(c, `×${g.mult * (g.pleno ? 2 : 1)}`, rx, ry, g.pleno ? t.gold : t.fg, 12);
  // D249: the run's count is shown once, as the combo by the score (it was also here, under the ring).
  if (R) deskFlare(R, rx, ry);
  // The crowd's meter (right).
  const mx = phone ? w - 18 : cx + W / 2 + SHOULDER;
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
  // How it goes, in a line (D239: the two grades of a right note).
  const how = lvl === "timing" ? "ANY KEY ON THE BEAT · THE LANES DRAW THE LINE" : "THE LANE'S KEY SCORES MOST · THE RIGHT DIRECTION STILL COUNTS · SPACE: SAME NOTE";
  if (phone) {
    label(c, lvl === "timing" ? "TAP ANY LANE ON THE BEAT · SLIDE TO JOIN" : "THE LANE SCORES MOST · THE RIGHT WAY STILL COUNTS", w / 2, h - 30, t.fg, 7);
    // D261: a prelude's line says what the drawing means: a gem alone is a tap, a tail is held to its end.
    if (g.f.kind === "prelude") label(c, "NO TAIL: TAP · A TAIL: HOLD TO ITS END", w / 2, h - 16, t.muted, 7);
    else label(c, subj ? "STRETTO: NEW ENTRY UPPER ROW · OLDER LOWER ROW, HOLLOW" : lvl === "timing" ? "TWO ROWS: CROSS THUMBS · HOLD THE LONG NOTES" : `SAME NOTE: SAME LANE${lvl === "leaps" ? " · LEAP: SKIP A LANE" : ""} · SLIDE TO JOIN · TWO ROWS`, w / 2, h - 16, t.muted, 7);
    return;
  }
  if (sc && R) return void (scaleHow(R), deskEnd(c));
  label(c, how, w / 2, h - 14, t.muted, 7);
  deskEnd(c);
}


/**
 * D217, SUBJECT's second line (a stretto's older entry, played in the lower row): its gems hollow, an
 * outline in its voice's colour over the dark road; its free note a hollow bar; its riding notes dots;
 * its long notes' tails as the main line's.
 */
function secondLine(c: CanvasRenderingContext2D, g: ProtoGame, at: (tick: number) => { y: number; k: number; d: number }, laneX: (l: number, k: number) => number, W: number, N: number, y1: number, beat: number, t: Tok) {
  const notes = g.tracks[1].notes;
  const lanes = g.lanesOf(1);
  const cx = laneX((N - 1) / 2, 1);
  const lvl = g.o.easy ?? "timing";
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i];
    if (i > 0 && notes[i - 1].on === n.on) continue;
    const p = at(n.on);
    if (p.d > 1 || p.y > y1 + 40) continue;
    if (n.state === "hit" && !(n.dur >= beat && g.now < n.on + n.dur)) continue;
    const ink = inkOf(n.voice ?? g.tracks[1].voice, g.f.voices.length);
    const lw = (W / N) * p.k;
    const x = laneX(lanes[i], p.k);
    if (n.dur >= beat && n.state !== "miss") {
      const e = at(Math.min(n.on + n.dur, g.now + AHEAD_S * g.tps));
      const from = n.state === "hit" ? at(Math.max(n.on, g.now)) : p;
      c.strokeStyle = ink;
      c.globalAlpha = n.held ? 0.9 : 0.5;
      c.lineWidth = Math.max(1, 2 * p.k);
      c.beginPath();
      c.moveTo(laneX(lanes[i], from.k), from.y);
      c.lineTo(laneX(lanes[i], e.k), e.y);
      c.stroke();
      c.globalAlpha = 1;
      if (n.state === "hit") continue;
    }
    if (n.ride) {
      c.strokeStyle = ink;
      c.lineWidth = 1;
      c.strokeRect(x - 2, p.y - 2, 4, 4);
      continue;
    }
    const gh = Math.max(4, 12 * p.k);
    c.strokeStyle = n.state === "miss" ? t.miss : ink;
    c.lineWidth = Math.max(1.5, 3 * p.k);
    if (g.isFree(i, 1) && lvl !== "timing") {
      c.strokeRect(cx - (W / 2) * p.k + 6, p.y - gh / 3, W * p.k - 12, Math.max(3, gh * 0.6));
      continue;
    }
    const gw = lw * 0.8;
    c.fillStyle = "rgba(10,9,16,0.85)";
    c.fillRect(x - gw / 2, p.y - gh / 2, gw, gh);
    c.strokeRect(x - gw / 2, p.y - gh / 2, gw, gh);
    // A notch at its foot: the lower row's.
    c.fillStyle = n.state === "miss" ? t.miss : ink;
    c.fillRect(x - gw / 6, p.y + gh / 2 - Math.max(1, 3 * p.k), gw / 3, Math.max(1, 3 * p.k));
  }
}

/**
 * D217, SUBJECT: a stretto's two rows named on the pads as it comes (a beat ahead) and while it lasts:
 * the upper row the newer entry (its colour, NEW), the lower the older (OLDER, dashed: hollow, as its gems).
 */
function strettoRows(c: CanvasRenderingContext2D, g: ProtoGame, laneX: (l: number, k: number) => number, W: number, N: number, y1: number, t: Tok) {
  const s = g.strettoNow(g.beat);
  const es = g.line?.entries;
  if (!s || !es) return;
  const count = g.f.voices.length;
  const coming = g.now < s.on;
  const pulse = coming ? 0.5 + 0.5 * Math.abs(Math.sin((g.now / g.beat) * Math.PI)) : 1;
  const x0 = laneX(0, 1) - W / N / 2;
  for (const [row, e, mark] of [[0, es[s.upper], "NEW"], [1, es[s.lower], "OLDER"]] as const) {
    const y = y1 + TIER.top + row * (TIER.h + TIER.gap);
    const ink = inkOf(e.voice, count);
    c.strokeStyle = ink;
    c.globalAlpha = 0.85 * pulse;
    c.lineWidth = 3;
    if (row) c.setLineDash([6, 4]);
    c.strokeRect(x0 + 1, y - 1, W - 2, TIER.h + 2);
    c.setLineDash([]);
    c.globalAlpha = 1;
    const name = (g.f.voiceNames[e.voice] ?? "").toUpperCase();
    label(c, `${mark}: ${name}`, x0 + 8, y + TIER.h - 9, ink, 6, "left");
  }
  if (coming) label(c, "STRETTO · TWO ROWS", laneX((N - 1) / 2, 1), y1 - 56, t.gold, 8);
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
    // D217: in a stretto, the newer entry (the upper row) over the older one (the lower row).
    const st = g.strettoNow();
    const lower = st && g.line ? g.line.entries[st.lower] : null;
    label(c, current.label, cx, 84, inkOf(current.voice, count), Math.round(8 + 4 * flash));
    if (lower) label(c, `+ ${lower.label} · LOWER ROW`, cx, 102, inkOf(lower.voice, count), 7);
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
const TIER = { top: -8, h: 84, gap: 8 };
function padRows(c: CanvasRenderingContext2D, g: ProtoGame, laneX: (l: number, k: number) => number, W: number, N: number, y1: number, inkOfLane: (l: number) => string, lastCol: number | undefined, t: Tok) {
  const pads = g.heldPads;
  const split = y1 + TIER.top + TIER.h + TIER.gap / 2;
  const bw = (W / N) * 0.94;
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
  // D262: the hands apart: a gutter through both rows between the left hand's pads and the right's.
  if (g.hands) {
    const xs = (laneX(g.laneRegion(0).from, 1) + laneX(g.laneRegion(0).from - 1, 1)) / 2;
    c.fillStyle = "#0b0a11";
    c.fillRect(xs - 6, y1 + TIER.top - 4, 12, 2 * TIER.h + TIER.gap + 14);
    c.fillStyle = "rgba(255,246,208,0.55)";
    c.fillRect(xs - 1, y1 + TIER.top - 4, 2, 2 * TIER.h + TIER.gap + 14);
  }
  // D252: the pad the next note asks for (its lane and row) lit as it comes, a beat ahead; with both
  // hands the left thumb's lanes and the right's named (D257: inside the lower row, clear of the hint below).
  for (let k = 0; k < (g.hands ? 2 : 1); k++) {
    const notes = g.tracks[k].notes;
    const i = notes.findIndex((n) => n.state === "pending" && !n.ride);
    if (i < 0) continue;
    const ahead = notes[i].on - g.now;
    if (ahead > g.beat || ahead < -g.beat / 2) continue;
    const lane = g.lanesOf(k)[i];
    const row = g.rowOf(i, k);
    const y = y1 + TIER.top + row * (TIER.h + TIER.gap);
    c.strokeStyle = "#fff6d0";
    c.globalAlpha = Math.max(0.15, 1 - Math.max(0, ahead) / g.beat);
    c.lineWidth = 3;
    c.strokeRect(laneX(lane, 1) - bw / 2 - 2, y - 2, bw + 4, TIER.h + 4);
    c.globalAlpha = 1;
  }
  if (g.hands) {
    const l = g.laneRegion(1);
    const r = g.laneRegion(0);
    const mid = (a: number, b: number) => (laneX(a, 1) + laneX(b, 1)) / 2;
    label(c, "LEFT HAND", mid(l.from, l.from + l.count - 1), y1 + TIER.top + 2 * TIER.h + TIER.gap - 10, inkOfLane(0), 6);
    label(c, "RIGHT HAND", mid(r.from, r.from + r.count - 1), y1 + TIER.top + 2 * TIER.h + TIER.gap - 10, inkOfLane(N - 1), 6);
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

export function label(c: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size = 7, align: CanvasTextAlign = "center") {
  c.fillStyle = color;
  c.font = `${size}px ${FONT}`;
  c.textAlign = align;
  c.textBaseline = "middle";
  // D283: the game's words in the language chosen.
  const word = trCanvas(text);
  // D415: over the music now running under the bars, each word ringed in the bars' dark (read over a note).
  if (!paper) {
    const a = c.globalAlpha;
    c.globalAlpha = a * 0.85;
    c.strokeStyle = "#140e12";
    c.lineWidth = 2.5;
    c.lineJoin = "round";
    c.strokeText(word, x, y);
    c.globalAlpha = a;
  }
  c.fillText(word, x, y);
}

/**
 * Design studio (D460, the owner: "keep it simple and use only the black and white circles, that's all we need"):
 * under each of the player's coming notes in the box, ● or ○, the thumb the plan gives it (fingering.ts, D409's
 * best plan), the two thumbs either way round: ● is the thumb the round begins with. Each bar carries its own
 * sign, small and still, at its outer side (in THE TUTORIAL its thumbs are drawn too). Drawing only: the judge
 * never asks which thumb (D370).
 */
const FIRST_SIDE = new WeakMap<ProtoGame, { start: number; side: "left" | "right"; locked?: boolean; flip?: boolean }>();
function thumbSigns(c: CanvasRenderingContext2D, w: number, h: number, bw: number, g: ProtoGame, t: Tok) {
  const rows = g.rows;
  const plan = g.plan;
  if (!rows || !plan.length) return;
  // The round's ● thumb: the plan's first, unless the player began with the other (then the signs follow the player).
  let first = FIRST_SIDE.get(g);
  if (!first || first.start !== g.startTick) FIRST_SIDE.set(g, (first = { start: g.startTick, side: plan[0].side }));
  const down = g.thumbsDown();
  if (!first.locked && down.length) Object.assign(first, { side: down[0].side, locked: true, flip: down[0].side !== plan[0].side });
  const flip = !!first.flip;
  const notes = g.tracks[0].notes;
  const ink = paper ? "#2a2216" : t.fg;
  const back = paper ? "#f6f5f1" : "#121a34";
  const r = Math.max(2.5, Math.min(4, rows.rowH * 0.35));
  for (const p of plan) {
    const n = notes[p.i];
    if (!n || n.ride) continue;
    const x = rows.xOf(n.on) + r + 1;
    if (x < bw + r) continue;
    if (x > w - bw - r) break;
    const filled = (p.side === plan[0].side) !== flip;
    const y = rows.yOf(n.step) + rows.rowH * 0.5 + r + 2;
    c.globalAlpha = n.state === "pending" ? 0.95 : 0.4;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = filled ? ink : back;
    c.fill();
    if (!filled) {
      c.strokeStyle = ink;
      c.lineWidth = 1.4;
      c.stroke();
    }
  }
  // Each bar's own sign, still, at its outer side, halfway up; brighter while that thumb is down.
  for (const side of ["left", "right"] as const) {
    const filled = side === first.side;
    const x = side === "left" ? 14 : w - 14;
    const y = h * 0.5;
    const on = down.some((d) => d.side === side);
    c.globalAlpha = on ? 1 : 0.6;
    c.beginPath();
    c.arc(x, y, 6, 0, Math.PI * 2);
    c.fillStyle = filled ? (on ? t.shine : ink) : back;
    c.fill();
    if (!filled) {
      c.strokeStyle = on ? t.shine : ink;
      c.lineWidth = 2;
      c.stroke();
    }
  }
  c.globalAlpha = 1;
}

/** D415: the side bars' opacity over the box running under them (0.92 before: opaque in effect). */
const BAR_VEIL = 0.52;
function bars(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok) {
  const bw = w * BAR;
  const count = g.f.voices.length;
  const sides = [
    { x: 0, inner: bw, k: 0 },
    { x: w - bw, inner: w - bw, k: g.tracks.length > 1 ? 1 : 0 },
  ];
  const inkFor = paper ? paperInk : inkOf;
  for (const [n, s] of sides.entries()) {
    if (paper) {
      // D298: the sheet's bars: paper (the play area's own background, bench.css: not filled each frame), a hairline by the page.
      c.fillStyle = t.barline;
      c.fillRect(n ? s.x : bw - 1, 0, 1, h);
    } else {
      // The bar: warm and dark, a little lighter towards its strong side (D314: the phone's edge, or the box's by STRONG_SIDE).
      const grad = c.createLinearGradient(s.inner, 0, n ? w : 0, 0);
      // D415 (the owner: "we don't need the buttons to be opaque at all to know what to do with them"): the bar
      // translucent over the box, which runs under it; enough of its warmth kept that the thumbs' marks read on it.
      grad.addColorStop(strengthOf(0), `rgba(26,18,22,${BAR_VEIL})`);
      grad.addColorStop(strengthOf(1), `rgba(54,34,30,${BAR_VEIL})`);
      c.fillStyle = grad;
      c.fillRect(s.x, 0, bw, h);
      c.fillStyle = t.barline;
      c.fillRect(n ? s.x : bw - 2, 0, 2, h);
    }
    // D371 (Mario and Luigi's report, 8 C): the bar's inner edge in the colour of the voice its thumb plays
    // (the player's voice; with two, each bar its own), so the hands and the line are visibly one.
    const tv = (g.tracks[s.k] ?? g.tracks[0])?.voice;
    if (tv !== undefined) {
      c.fillStyle = inkFor(tv, count);
      c.fillRect(n ? s.x : bw - STRIP_EDGE, 0, STRIP_EDGE, h);
    }
    // The dynamics along the foot, pp on the soft side to ff on the strong (STRONG_SIDE; D296: only where touch dynamics are heard, D293).
    if (g.touchDynamics) MARKS.forEach((m, j) => {
      const u = strengthOf((j + 0.5) / MARKS.length);
      label(c, m, n ? s.x + u * bw : bw - u * bw, h - 9, t.muted, 6);
    });
    // D314: where across the bar is SOFT and where STRONG (D311's attack; the reading's ">"), for the
    // first seconds of the round (through the count-in), then fading out.
    else if (g.proto.layout === "bars" && !g.o.quiet) {
      const left = (g.startTick + SIDES_HINT_S * g.tps - g.now) / g.tps;
      if (left > 0) {
        const a = Math.min(1, left / 2);
        const xAt = (u: number) => (n ? s.x + u * bw : bw - u * bw);
        const weak = strengthOf(0.22);
        const strong = strengthOf(0.78);
        c.globalAlpha = 0.85 * a;
        label(c, "SOFT", xAt(weak), h - 14, "#7fd6e8", 7);
        label(c, "STRONG", xAt(strong), h - 14, "#ff8a3d", 7);
        // A hairline from soft to strong, thicker toward the strong side.
        for (let k = 0; k < 12; k++) {
          const u = 0.12 + (k / 11) * 0.76;
          c.fillStyle = strengthOf(u) < 0.5 ? "#7fd6e8" : "#ff8a3d";
          const th = 1 + Math.round(2 * strengthOf(u));
          c.fillRect(Math.round(xAt(u)) - 1, h - 26 - th, 3, th);
        }
        c.globalAlpha = 1;
      }
    }
  }
  // D244: THE FUGUE'S BUILDING on the phone: the map, small, across the top of the box.
  if (!paper && !g.o.quiet && builds(g.f) && g.f.entries.length) {
    const m = fugueMap(g.f);
    const mw = w - 2 * bw - 24;
    const x0 = bw + 12;
    const span = Math.max(1, m.end - m.start);
    const row = 4;
    const X = (tick: number) => x0 + ((tick - m.start) / span) * mw;
    buildMap(c, m, g.now, new Set(g.tracks.map((x) => x.voice)), X, (v) => 8 + v * row, g.f.tpq, 2, mw);
    c.fillStyle = "rgba(255,255,255,0.8)";
    c.fillRect(Math.round(X(Math.max(m.start, Math.min(m.end, g.now)))), 5, 1, m.rows * row + 6);
  }
  const rows = g.rows;
  if (g.proto.id === "ladder" && rows) {
    // D296: no pitch names on the bars (the bars are not a scale: the way matters, not the spot).
    const nx = coming(g);
    if (nx) {
      const n = g.notes[nx.i];
      const m = g.moves[nx.i];
      const ink = inkFor(g.voice, count);
      const y = rows.yOf(n.step);
      // D296: the whole bar is playable (judged by the thumb's own moves, not by where the note is drawn): the
      // bar lights evenly as the note comes; its sign stands where that thumb last touched (else at the note).
      for (const s of sides) {
        const own = g.lastBySide[s.x === 0 ? "left" : "right"];
        const sy = own && g.now - own.tick <= OWN_FRESH_S * g.tps ? own.y : y;
        c.fillStyle = ink;
        // D415: over the music the bar no longer floods with the note's colour (it hid what runs under it): a
        // faint wash, and a line of light along its inner edge, by the box, brightening as the note comes.
        c.globalAlpha = paper ? 0.04 + 0.14 * nx.p * nx.p : 0.04 + 0.1 * nx.p * nx.p;
        // D308: lit to the screen's foot (a dark strip of 24 px was left under it, the owner: "a useless border").
        c.fillRect(s.x, 0, bw, h);
        if (!paper) {
          c.fillStyle = t.shine;
          c.globalAlpha = 0.1 + 0.6 * nx.p * nx.p;
          c.fillRect(s.x === 0 ? bw - STRIP_EDGE - 2 : s.x + STRIP_EDGE, 0, 2, h);
        }
        c.globalAlpha = 1;
        // Design studio (D460, the owner: the arrows and everything moving in the bars "happening so fast that
        // it's impossible for the player to learn anything from them"): no closing bars, no ▲ ▼ = arrow; the
        // thumbs are ● ○ under the notes (thumbSigns). HOLD stays, alone, where the note is long.
        if (n.long) label(c, "HOLD", s.x + bw / 2, sy, t.fg, 7);
        void m;
        // D278: an ornament to play: its sign and SHAKE under the arrow, gold, the hand wobbling.
        // D314: as the tutorial shows it: the sign larger, the ornament named; till one is shaken, a
        // guide thumb shaking on the bar and how ("TOUCH IT, THEN SHAKE YOUR THUMB").
        const orn = g.ornamentAt(0, nx.i);
        const sk = orn ? g.shakeAt(0, nx.i) : null;
        if (orn && sk && (!g.o.quiet || g.o.quiet.ornaments)) {
          const wob = Math.sin(performance.now() / 70) * 3;
          label(c, `${sk.word} · SHAKE`, s.x + bw / 2 + wob, sy + 17, t.gold, 7);
          if (g.ornHintOn) {
            const size = Math.max(16, Math.min(28, bw * 0.26));
            const hx = s.x === 0 ? bw * 0.5 : w - bw * 0.5;
            // The thumb shaking along the bar (up and down), as THE ORNAMENT's demonstration shows it.
            const shakeY = Math.sin(performance.now() / 45) * g.ladderRow * 0.45;
            drawThumb(c, hx, sy + 46 + shakeY, size, s.x === 0 ? "left" : "right", "down", 0.55 + 0.4 * nx.p);
            label(c, sk.first < 0 ? "DOWN AND BACK" : "UP AND DOWN", s.x + bw / 2, sy + 46 + size * 1.1, t.shine, 6);
            label(c, "TOUCH IT, THEN SHAKE", s.x + bw / 2, sy + 46 + size * 1.1 + 11, t.shine, 6);
          }
        }
      }
      // D271, THE TUTORIAL's coaching.
      // D273: before the first strike either thumb (the point is taking turns, not which starts).
      // D280: with the guide, the thumbs below take its place.
      // D460: the coaching's drawn thumb (a skin-coloured thumb, against the standing rule) gone: ● ○ under the notes say it.
      if (g.o.coach === "dynamics") dynamicsCoach(c, w, h, bw, n.on < g.f.barTicks, t);
      // A soft trail from the note in the box out to the bars (D298: not over the sheet).
      if (!paper) {
        const xn = Math.max(bw, Math.min(w - bw, rows.xOf(n.on)));
        c.fillStyle = ink;
        c.globalAlpha = 0.12 + 0.3 * nx.p;
        c.fillRect(bw, y - rows.rowH, xn - bw, 2 * rows.rowH);
        c.fillRect(xn, y - rows.rowH, w - bw - xn, 2 * rows.rowH);
        c.globalAlpha = 1;
      }
    }
    // Where you last played: a mark on that bar.
    if (g.lastTouch) {
      const s = sides[g.lastTouch.side === "left" ? 0 : 1];
      c.fillStyle = t.shine;
      c.globalAlpha = 0.6;
      c.fillRect(s.x + 4, g.lastTouch.y - 1, bw - 8, 2);
      c.globalAlpha = 1;
    }
  }
  for (const s of g.heldSides()) {
    // D311: the held thumb's glow a little stronger toward the strong side (firmer, brighter; D315: by STRONG_SIDE), and
    // a small mark where it is across the bar; a hairline back to where it landed once it has moved (the sustain).
    const a = s.across;
    c.fillStyle = t.shine;
    c.globalAlpha = a === undefined ? 0.3 : 0.2 + 0.2 * strengthOf(a);
    c.fillRect(s.side === "left" ? 0 : w - bw, s.y - 14, bw, 28);
    // D334 (B+): a thumb PREPARED on its next note: a faint outline, armed (it sounds on the other's lift).
    if (s.armed) {
      c.strokeStyle = t.gold;
      c.globalAlpha = 0.45;
      c.lineWidth = 1;
      c.setLineDash?.([3, 3]);
      c.strokeRect((s.side === "left" ? 0 : w - bw) + 2.5, s.y - 16.5, bw - 5, 33);
      c.setLineDash?.([]);
      c.globalAlpha = a === undefined ? 0.3 : 0.2 + 0.2 * strengthOf(a);
    }
    if (a !== undefined && s.land !== undefined) {
      const xOf = (u: number) => (s.side === "left" ? bw * (1 - u) : w - bw + bw * u);
      const x = xOf(a);
      const x0 = xOf(s.land);
      c.globalAlpha = 0.85;
      c.fillRect(Math.round(x) - 1, s.y - 9, 3, 18);
      if (Math.abs(x - x0) > 2) {
        c.globalAlpha = 0.5;
        c.fillRect(Math.min(x, x0), s.y - 0.5, Math.abs(x - x0), 1);
      }
    }
    c.globalAlpha = 1;
  }
  // D373: in the tutorial the thumbs are its aid's (model A, manual/aids.ts).
  if (g.proto.id === "ladder" && (g.o.demo || g.o.guide) && !g.o.thumbsA) thumbsShown(c, w, h, g, t);
  // D460: which thumb plays each note, ● or ○ under it, and each bar's own sign.
  if (g.proto.id === "ladder" && rows) thumbSigns(c, w, h, bw, g, t);
}

/**
 * D280: the thumbs on the bars: in the demonstration the game's own touches (landing, holding, shaking,
 * lifting); in the guide, the thumb the next note wants hovering where it should land (the other thumb
 * from the last; across the bar as loud as asked), THEN SHAKE for an ornament, SLIDE for a slid step,
 * and LIFT over a thumb whose note is done.
 */
function thumbsShown(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok) {
  const bw = w * BAR;
  const size = Math.max(16, Math.min(30, bw * 0.3));
  const rows = g.rows;
  if (!rows) return;
  const now = performance.now();
  for (const d of g.thumbsDown()) {
    const wob = d.shaking ? Math.sin(now / 45) * g.ladderRow * 0.5 : 0;
    const x = Math.max(size * 0.6, Math.min(w - size * 0.6, d.fx * w));
    drawThumb(c, x, d.y + wob, size, d.side, "down");
    // D425: a hard tap (an accent struck hard) named over the thumb a moment after it lands.
    if (d.hard && d.t0 !== undefined && now - d.t0 < 450) label(c, "HARD TAP", x, d.y - size * 1.5, t.gold, 8);
  }
  const plan = g.plan;
  const notes = g.tracks[0].notes;
  // D282: over each thumb down: HOLD while its note lasts (a long one), LIFT once it is over.
  const struck = plan.filter((p) => !p.slid && p.on <= g.now && notes[p.i].state === "hit");
  for (const d of g.thumbsDown()) {
    const tc = struck.filter((p) => p.side === d.side).at(-1);
    if (!tc) continue;
    const x = d.side === "left" ? bw / 2 : w - bw / 2;
    if (g.now < tc.off && tc.off - tc.on > g.tps * 0.35) label(c, "HOLD", x, d.y - size * 0.9, t.gold, 7);
    else if (g.now > tc.off + g.tps * 0.05) label(c, "LIFT", x, d.y - size * 0.9, t.wrong, 7);
  }
  if (!g.o.guide) return;
  const next = plan.find((p) => notes[p.i].state === "pending");
  if (!next) return;
  const ahead = ((notes[next.i].on - g.now) / g.tps) * 1000;
  if (ahead > APPROACH_MS * 1.6) return;
  const fade = Math.max(0.25, Math.min(1, 1 - ahead / (APPROACH_MS * 1.6)));
  const y = rows.yOf(next.step);
  if (next.slid) {
    // D419 (the audit): the slide's own way (it said ▲ sliding down too).
    const before = next.i > 0 ? notes[next.i - 1] : undefined;
    label(c, before && notes[next.i].step < before.step ? "SLIDE ▼" : "SLIDE ▲", g.thumbsDown()[0]?.side === "right" ? w - bw / 2 : bw / 2, y - size, t.gold, 8);
    return;
  }
  // D460: no hovering thumb, no LEFT THUMB / RIGHT THUMB words: ● ○ under the notes (thumbSigns) say which thumb.
  void fade;
}


/** D271: the part of both bars asked for: soft in the first bar, loud in the second (D314/D315: on the sides STRONG_SIDE gives). */
function dynamicsCoach(c: CanvasRenderingContext2D, w: number, h: number, bw: number, soft: boolean, t: Tok) {
  const zw = bw * 0.45;
  // D314: the strong side may be the inner one (STRONG_SIDE): the zones swap with it.
  const inner = soft === (STRONG_SIDE === "outer");
  c.fillStyle = soft ? "#7fd6e8" : "#ff8a3d";
  c.globalAlpha = 0.16 + 0.06 * Math.sin(performance.now() / 200);
  if (inner) {
    c.fillRect(bw - zw, 0, zw, h);
    c.fillRect(w - bw, 0, zw, h);
  } else {
    c.fillRect(0, 0, zw, h);
    c.fillRect(w - zw, 0, zw, h);
  }
  c.globalAlpha = 1;
  const word = soft ? "SOFT" : "LOUD";
  label(c, word, inner ? bw - zw / 2 : zw / 2, h * 0.5, soft ? "#7fd6e8" : "#ff8a3d", 8);
  label(c, word, inner ? w - bw + zw / 2 : w - zw / 2, h * 0.5, soft ? "#7fd6e8" : "#ff8a3d", 8);
  void t;
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
    // D217: SUBJECT's stretto: a note struck in the other row of pads.
    if (g.proto.id === "subject") why.hand = "✕ OTHER ROW";
    const text = gr.text === "✕" ? (why[gr.why ?? ""] ?? "✕ OFF TIME") : gr.text;
    const bars = g.proto.layout === "bars";
    const desk = g.proto.layout === "desk";
    const x = bars ? (gr.side === "left" ? w * BAR * 0.5 : w * (1 - BAR * 0.5)) : desk ? w - 90 : w / 2;
    // D220: the computer's HIGHWAY: the word over the strike line, larger.
    if (g.proto.id === "keys") label(c, text, w / 2, deskGeom(w, h).y1 - 64, gr.text === "PERFECT" ? t.gold : ok ? t.fg : t.wrong, 10);
    else label(c, text, x, bars ? h * 0.45 : desk ? 14 : 30, gr.text === "PERFECT" ? t.gold : ok ? t.fg : t.wrong, 8);
    c.globalAlpha = 1;
  }
  articulation(c, w, h, g, t);
}

/**
 * D239: a right note's two grades on the road, where it was struck: in its planned lane a bright
 * flash of the lane's colour up from the strike line and LANE ✓ rising; right only by its direction
 * (another lane) a dim silver flash and a ~.
 */
export const RELATIVE_INK = "#a9afbd";
/** A colour mixed towards white (k 0 to 1). */
function lighten(hex: string, k: number): string {
  const v = parseInt(hex.slice(1), 16);
  const m = (x: number) => Math.round(x + (255 - x) * k);
  return `rgb(${m((v >> 16) & 255)},${m((v >> 8) & 255)},${m(v & 255)})`;
}
function laneGrades(c: CanvasRenderingContext2D, g: ProtoGame, laneX: (l: number, k: number) => number, inkOfLane: (l: number) => string, lw: number, y1: number) {
  const now = performance.now();
  for (const fl of g.flames) {
    const age = now - fl.at;
    if (!fl.grade || fl.lane === undefined || age > 520) continue;
    const exact = fl.grade === "exact";
    const x = laneX(fl.lane, 1);
    const ink = exact ? inkOfLane(fl.lane) : RELATIVE_INK;
    const glow = exact ? lighten(ink, 0.25) : ink;
    const fade = Math.max(0, 1 - age / 300);
    if (fade > 0) {
      const tall = exact ? 120 : 60;
      c.fillStyle = glow;
      c.globalAlpha = (exact ? 0.55 : 0.18) * fade;
      c.fillRect(Math.round(x - lw / 2 + 2), y1 - tall, Math.round(lw - 4), tall + 8);
      if (exact) {
        c.fillStyle = "#ffffff";
        c.globalAlpha = 0.6 * fade;
        c.fillRect(Math.round(x - lw / 2 + 2), y1 - 3, Math.round(lw - 4), 4);
      }
    }
    c.globalAlpha = age < 380 ? 1 : 1 - (age - 380) / 140;
    const py = Math.round(y1 - 28 - age / 18);
    if (exact) {
      // The pixel font has no ✓: LANE and a tick drawn in pixels, in the lane's colour lightened.
      const lit = lighten(ink, 0.45);
      label(c, "LANE", x - 6, py, lit, 7);
      c.fillStyle = lit;
      for (const [dx, dy] of [[0, 0], [2, 2], [4, 4], [6, 2], [8, 0], [10, -2], [12, -4]]) c.fillRect(Math.round(x + 14 + dx), py + dy - 1, 2, 2);
    } else label(c, "~", x, py, ink, 10);
    c.globalAlpha = 1;
  }
}

/** D218: the articulation's word (LEGATO ×n, HELD, CLEAN, SHORT, REST!), small, under the verdict, rising a little as it fades. */
function articulation(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok) {
  // D384 (Mario 1): the articulation's word first, the reading's verdict last, a line above it: never hidden.
  if (g.flash) articulationWord(c, w, h, g, t, g.flash, 0);
  if (g.readingWord) articulationWord(c, w, h, g, t, g.readingWord, g.flash && performance.now() - g.flash.at <= ART_WORD_MS ? VERDICT_LIFT : 0);
}

/** How long an articulation's word or a reading's verdict shows (ms). */
const ART_WORD_MS = 650;
/** D384: how far above the articulation's word a reading's verdict sits while both show (px). */
export const VERDICT_LIFT = 10;

function articulationWord(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok, f: ArtFlash, lift: number) {
  // D359: in THE MANUAL's practice room only the words its lesson is about.
  // (The reading's words, DETACHED ✓, ACCENT ✓, SHORT ✓, are of the kind "legato".)
  if (g.o.quiet && !g.o.quiet.words?.includes(f.kind)) return;
  const age = performance.now() - f.at;
  if (age > ART_WORD_MS) return;
  const bars = g.proto.layout === "bars";
  const desk = g.proto.layout === "desk";
  const x = bars ? (g.grade?.side === "right" ? w * (1 - BAR * 0.5) : w * BAR * 0.5) : desk ? w - 90 : w / 2;
  const y = (bars ? h * 0.45 + 14 : desk ? 26 : 44) - age / 60 - lift;
  const ink = f.kind === "legato" ? LEGATO_INK : f.kind === "held" ? HELD_INK : f.kind === "clean" ? CLEAN_INK : t.wrong;
  c.globalAlpha = age < 450 ? 1 : 1 - (age - 450) / 200;
  // D220: on the computer's road, under the verdict over the strike line, larger.
  if (g.proto.id === "keys") label(c, f.text, w / 2, deskGeom(w, h).y1 - 44 - age / 30 - lift * 1.3, ink, 9);
  else label(c, f.text, x, y, ink, 7);
  c.globalAlpha = 1;
}

/**
 * D218, the road's slurs: a faint arc over each coming pair of notes the score joins (D370: only where a reading slurs them; legato pays
 * there), and a bright one across the strike line as a legato is played, fading.
 */
function slurs(c: CanvasRenderingContext2D, g: ProtoGame, at: (tick: number) => { y: number; k: number; d: number }, laneX: (l: number, k: number) => number, y1: number) {
  const notes = g.notes;
  const lanes = g.lanes;
  c.strokeStyle = LEGATO_INK;
  c.lineWidth = 1;
  c.globalAlpha = 0.28;
  let prev = -1;
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    if (n.ride || (i > 0 && notes[i - 1].on === n.on)) continue;
    if (n.on + n.dur < g.now - g.beat) {
      prev = i;
      continue;
    }
    const p = at(n.on);
    if (p.d > 1) break;
    // D370: ⌒ kept for a real slur: drawn only where the reading slurs the pair (no longer over every pair legato could join).
    if (prev >= 0 && n.state === "pending" && notes[prev].state !== "miss" && g.joinedAt(i) && g.slurredInto(i)) {
      const a = at(Math.max(notes[prev].on, g.now));
      const xa = laneX(lanes[prev], a.k);
      const xb = laneX(lanes[i], p.k);
      const lift = 6 + 10 * p.k;
      c.beginPath();
      c.moveTo(xa, a.y - 6 * a.k);
      c.quadraticCurveTo((xa + xb) / 2 + (xa === xb ? 10 * p.k : 0), (a.y + p.y) / 2 - lift, xb, p.y - 6 * p.k);
      c.stroke();
    }
    prev = i;
  }
  const now = performance.now();
  c.lineWidth = 2;
  for (const tie of g.ties) {
    const age = now - tie.at;
    if (age > 500 || tie.k !== 0 || tie.b >= lanes.length) continue;
    const xa = laneX(lanes[tie.a], 1);
    const xb = laneX(lanes[tie.b], 1);
    const span = Math.abs(xb - xa);
    c.globalAlpha = 1 - age / 500;
    c.beginPath();
    if (span < 4) c.arc(xa, y1 - 14, 12, Math.PI * 1.1, Math.PI * 1.9);
    else {
      c.moveTo(xa, y1 - 12);
      c.quadraticCurveTo((xa + xb) / 2, y1 - 30 - span * 0.12 - age / 25, xb, y1 - 12);
    }
    c.stroke();
  }
  c.globalAlpha = 1;
}

/** D251: the progress line's thickness (px). */
export const PROGRESS_H = 3;

/**
 * D251, HOW FAR INTO THE PIECE (the owner: "the player should be able to know how far he is from the
 * end"): a thin line along the canvas's very top edge, in every layout, the whole piece from its start
 * to its end, filled as far as it has sounded (a practice from a later bar fills from there on); a
 * prelude with an arc (arc.ts) has its sections as faint ticks and its pedal as a faint gold span.
 * "n / N" (D344: was "BAR n / N") small under its right end (left of ✕), except over the computer's fugue map (it shows BAR n already).
 */
function progress(c: CanvasRenderingContext2D, w: number, g: ProtoGame, t: Tok) {
  const f = g.f;
  const end = Math.max(1, f.length);
  const X = (tick: number) => Math.round((Math.max(0, Math.min(end, tick)) / end) * w);
  const H = PROGRESS_H;
  c.fillStyle = "rgba(255,255,255,0.10)";
  c.fillRect(0, 0, w, H);
  const arc = arcOf(f);
  const ped = pedalSpan(f, arc);
  if (ped) {
    c.fillStyle = t.gold;
    c.globalAlpha = 0.35;
    c.fillRect(X(ped.on), 0, Math.max(1, X(ped.end) - X(ped.on)), H);
  }
  c.fillStyle = t.shine;
  c.globalAlpha = 0.7;
  c.fillRect(0, 0, X(g.now), H);
  if (arc) {
    c.fillStyle = t.fg;
    c.globalAlpha = 0.45;
    for (const [bar] of arc.rides) if (bar > 1) c.fillRect(X(barStart(f, bar)), 0, 1, H + 2);
  }
  c.globalAlpha = 1;
  // The head: where the music is.
  c.fillStyle = "#ffffff";
  c.fillRect(Math.min(w - 2, X(g.now)), 0, 2, H + 1);
  if ((g.proto.layout === "desk" && f.entries.length > 0) || !f.bars.length) return;
  // Left of the game's ✕ (the DOM button in the top right corner).
  // D308: left of ❚❚ and ✕.
  // D344: the numbers alone ("1 / 27"), no BAR / COMPASSO / COMPÁS (the owner).
  // D402: the tutorial's bar counter from Part 2.
  if (g.o.dress && !g.o.dress.includes("bar")) return;
  label(c, `${barNumberAt(f, g.now)} / ${f.bars[f.bars.length - 1].n}`, w - 100, H + 8, t.muted, 6, "right");
}

/** D251: the number of the bar a tick falls in (the first before bar 1, the last after the end). */
export function barNumberAt(f: Pick<TouchFugue, "bars">, tick: number): number {
  const bars = f.bars;
  if (!bars.length) return 1;
  if (tick < bars[0].on) return bars[0].n;
  let lo = 0;
  let hi = bars.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (bars[mid].on <= tick) lo = mid;
    else hi = mid - 1;
  }
  return bars[lo].n;
}
