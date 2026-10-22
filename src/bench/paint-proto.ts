/**
 * Painting the testbench's prototypes (D175; D178).
 *   BOW: the two halves (the up-bow's ∨, the down-bow's ⊓), dark towards the middle (tasto), bright
 *     towards the edges (ponticello); the next note's time as two bars meeting.
 *   LADDER: rungs a staff step apart from the last touch; the band where the next note is given
 *     (its interval away, within what counts); the expression's two ends marked.
 *   THUMBS ↕: the voice's notes falling in two lanes (left: down, right: up; across both: either).
 *   THUMBS ↔: the two side bars over the music box, the one wanted lighting up.
 *   SIDEWAYS: the whole screen: every voice falling in columns, the window following the passage.
 *   PIANO: paint-piano.ts.
 * The verdict of the last touch flashes over the field.
 */
import { inkOf, keyTint } from "../touch/MusicBox.tsx";
import { paintPiano } from "../touch/paint-piano.ts";
import { stepName } from "../touch/fugue.ts";
import { columnX, COLUMNS, LINE, TOUCH_FROM } from "./placed.ts";
import { APPROACH_MS, type ProtoGame } from "./proto-game.ts";
import { LADDER_PX, ladderTolerance, upBow, type Move } from "./protos.ts";

const FONT = '"Press Start 2P", ui-monospace, monospace';

type Tok = ReturnType<typeof tokens>;
function tokens() {
  const css = getComputedStyle(document.documentElement);
  const tok = (name: string) => css.getPropertyValue(name).trim() || "#fff";
  return { shine: tok("--tg-shine"), gold: tok("--tg-gold"), wrong: tok("--tg-wrong"), fg: tok("--tg-fg"), muted: tok("--tg-muted"), grid: tok("--tg-grid"), barline: tok("--tg-barline"), miss: tok("--tg-miss") };
}

export function paintProto(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, subject: Set<string>) {
  const t = tokens();
  const ink = inkOf(g.voice, g.f.voices.length);
  switch (g.proto.id) {
    case "bow":
      bow(c, w, h, g, t, ink);
      break;
    case "ladder":
      ladder(c, w, h, g, t, ink);
      break;
    case "thumbsV":
      lanes(c, w, h, g, t, ink, subject);
      break;
    case "thumbsH":
      bars(c, w, h, g, t, ink);
      break;
    case "sideways":
      sideways(c, w, h, g, t, ink, subject);
      break;
    case "piano":
      paintPiano(c, w, h, { kb: g.kb, now: g.now, tps: g.tps, voice: g.voice, count: g.f.voices.length, notes: g.notes, others: g.others, late: g.opt.late, held: g.heldCells(), grade: g.grade }, subject);
      break;
  }
  verdict(c, w, h, g, t);
}

/** The next note and how near it is (0 far, 1 on its beat), if it is showing. */
function coming(g: ProtoGame): { i: number; p: number } | null {
  const i = g.next();
  if (i < 0) return null;
  const approach = (APPROACH_MS / 1000) * g.tps;
  const dt = g.notes[i].on - g.now;
  if (dt > approach * 1.4) return null;
  return { i, p: Math.max(0, Math.min(1, 1 - dt / approach)) };
}

/** A lit place: the colour rising as the beat comes, two bars meeting on it. */
function light(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: number, ink: string, t: Tok) {
  c.fillStyle = ink;
  c.globalAlpha = 0.12 + 0.45 * p * p;
  c.fillRect(x, y, w, h);
  const half = (w / 2) * (1 - p);
  c.globalAlpha = 0.9;
  c.fillStyle = t.shine;
  c.fillRect(x, y + h - 4, w / 2 - half, 3);
  c.fillRect(x + w / 2 + half, y + h - 4, w / 2 - half, 3);
  c.globalAlpha = 1;
}

function label(c: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size = 7, align: CanvasTextAlign = "center") {
  c.fillStyle = color;
  c.font = `${size}px ${FONT}`;
  c.textAlign = align;
  c.textBaseline = "middle";
  c.fillText(text, x, y);
}

const ARROW = (m: Move) => (m.size < 0 ? "ANY" : m.dir > 0 ? "▲" : m.dir < 0 ? "▼" : "=");
const SIZE = (m: Move) => (m.size < 0 ? "" : ["REPEAT", "STEP", "THIRD", "LEAP"][m.size]);

function bow(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok, ink: string) {
  // Tasto to ponticello: darker at the middle, brighter at the edges.
  for (const side of ["left", "right"] as const) {
    const x0 = side === "left" ? 0 : w / 2;
    const grad = c.createLinearGradient(side === "left" ? w / 2 : w / 2, 0, side === "left" ? 0 : w, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(255,255,255,0.06)");
    c.fillStyle = grad;
    c.fillRect(x0, 0, w / 2, h);
    const up = upBow(side, g.o);
    label(c, up ? "UP ∨" : "DOWN ⊓", x0 + w / 4, 14, t.muted, 8);
    label(c, "TASTO", side === "left" ? w / 2 - 6 : w / 2 + 6, h - 10, t.muted, 6, side === "left" ? "right" : "left");
    label(c, "PONT.", side === "left" ? 6 : w - 6, h - 10, t.muted, 6, side === "left" ? "left" : "right");
  }
  c.fillStyle = t.barline;
  c.fillRect(w / 2 - 1, 0, 2, h);
  const nx = coming(g);
  if (nx) light(c, 0, 0, w, h, nx.p, ink, t);
  if (nx && g.notes[nx.i].long) label(c, "HOLD", w / 2, h / 2, t.fg, 9);
  for (const s of g.heldSides()) {
    c.fillStyle = ink;
    c.globalAlpha = 0.25;
    c.fillRect(s.side === "left" ? 0 : w / 2, s.y - 18, w / 2, 36);
    c.globalAlpha = 1;
  }
}

function ladder(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok, ink: string) {
  const last = g.last?.y ?? h / 2;
  // The rungs, a staff step apart, from the last touch.
  for (let k = -20; k <= 20; k++) {
    const y = last - k * LADDER_PX;
    if (y < 0 || y > h) continue;
    c.fillStyle = k === 0 ? t.shine : k % 2 ? t.grid : t.barline;
    c.globalAlpha = k === 0 ? 0.8 : 0.6;
    if (k === 0) for (let x = 0; x < w; x += 8) c.fillRect(x, Math.round(y), 4, 1);
    else c.fillRect(w * 0.3, Math.round(y), w * 0.4, 1);
    c.globalAlpha = 1;
  }
  label(c, "SOFT", w / 2, h - 10, t.muted, 6);
  label(c, "SHARP", 6, h - 10, t.muted, 6, "left");
  label(c, "SHARP", w - 6, h - 10, t.muted, 6, "right");
  const nx = coming(g);
  if (!nx) return;
  const m = g.moves[nx.i];
  if (m.size < 0 || !g.last) {
    light(c, 0, 0, w, h, nx.p, ink, t);
    label(c, "ANY", w / 2, h / 2, t.fg, 9);
    return;
  }
  const tol = ladderTolerance(m.steps);
  const centre = last - m.steps * LADDER_PX;
  const y0 = Math.max(0, Math.min(h - 44, centre - (tol + 0.5) * LADDER_PX));
  const y1 = Math.min(h, Math.max(44, centre + (tol + 0.5) * LADDER_PX));
  light(c, 0, y0, w, y1 - y0, nx.p, ink, t);
  label(c, `${ARROW(m)} ${SIZE(m)}${g.notes[nx.i].long ? " · HOLD" : ""}`, w / 2, Math.max(12, Math.min(h - 12, (y0 + y1) / 2)), t.fg, 8);
}

/** THUMBS ↕: the voice's notes falling in their lanes onto a line. */
function lanes(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok, ink: string, subject: Set<string>) {
  const line = h * 0.84;
  const span = 1.5 * g.f.barTicks;
  const yOf = (tick: number) => line - ((tick - g.now) / span) * line;
  c.fillStyle = t.barline;
  c.fillRect(w / 2 - 1, 0, 2, h);
  label(c, "▼", w / 4, h - 10, t.muted, 9);
  label(c, "▲", (3 * w) / 4, h - 10, t.muted, 9);
  label(c, "LOUD", w - 6, 10, t.muted, 6, "right");
  label(c, "SOFT", w - 6, h - 24, t.muted, 6, "right");
  g.notes.forEach((n, i) => {
    if (i > 0 && g.notes[i - 1].on === n.on) return;
    const y1 = yOf(n.on);
    const y0 = yOf(n.on + n.dur);
    if (y1 < 0 || y0 > h) return;
    const m = g.moves[i];
    const either = m.size < 0 || m.dir === 0 || m.size === 3;
    const x = either ? w * 0.3 : m.dir < 0 ? 8 : w / 2 + 8;
    const bw = either ? w * 0.4 : w / 2 - 16;
    const bh = Math.max(6, y1 - y0 - 3);
    if (n.state === "miss") c.fillStyle = t.miss;
    else {
      c.fillStyle = t.fg;
      c.fillRect(x - 1, y1 - bh - 1, bw + 2, bh + 2);
      c.fillStyle = n.state === "hit" ? t.shine : ink;
    }
    c.fillRect(x, y1 - bh, bw, bh);
    if (subject.has(`${g.voice}:${n.on}`)) {
      c.fillStyle = t.fg;
      for (let k = x + 2; k < x + bw - 2; k += 5) c.fillRect(k, y1 - 3, 2, 1);
    }
    if (n.state === "pending") label(c, either ? "↕" : m.dir > 0 ? "▲" : "▼", x + bw / 2, y1 - Math.min(bh, 24) / 2, "#0b0d18", 8);
  });
  c.fillStyle = t.shine;
  c.fillRect(0, Math.round(line) - 1, w, 2);
}

/** THUMBS ↔: the side bars (the play area lies over the music box; the middle is left clear). */
function bars(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok, ink: string) {
  const bw = w * 0.2;
  for (const side of ["left", "right"] as const) {
    const x = side === "left" ? 0 : w - bw;
    c.fillStyle = "rgba(11,13,24,0.88)";
    c.fillRect(x, 0, bw, h);
    c.fillStyle = t.barline;
    c.fillRect(side === "left" ? bw - 2 : x, 0, 2, h);
    label(c, side === "left" ? "▼" : "▲", x + bw / 2, h / 2, t.muted, 14);
    label(c, "LOUD", x + bw / 2, 12, t.muted, 6);
    label(c, "SOFT", x + bw / 2, h - 12, t.muted, 6);
  }
  const nx = coming(g);
  if (nx) {
    const m = g.moves[nx.i];
    const either = m.size < 0 || m.dir === 0 || m.size === 3;
    if (either || m.dir < 0) light(c, 0, 0, bw, h, nx.p, ink, t);
    if (either || m.dir > 0) light(c, w - bw, 0, bw, h, nx.p, ink, t);
  }
  for (const s of g.heldSides()) {
    c.fillStyle = t.shine;
    c.globalAlpha = 0.3;
    c.fillRect(s.side === "left" ? 0 : w - bw, s.y - 20, bw, 40);
    c.globalAlpha = 1;
  }
}

/** SIDEWAYS: every voice falling in the window's columns; the line near the bottom. */
function sideways(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok, ink: string, subject: Set<string>) {
  const cw = w / COLUMNS;
  const line = h * LINE;
  const span = 1.5 * g.f.barTicks;
  const yOf = (tick: number) => line - ((tick - g.now) / span) * line;
  c.fillStyle = keyTint(g.keyNow());
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(255,255,255,0.04)";
  c.fillRect(0, h * TOUCH_FROM, w, h * (1 - TOUCH_FROM));
  const held = new Set(g.heldCells());
  // The columns, labelled along the bottom; the Cs brighter.
  for (let s = Math.floor(g.pan - COLUMNS / 2) - 1; s <= g.pan + COLUMNS / 2 + 1; s++) {
    const x = columnX(s, g.pan, w);
    c.fillStyle = s % 7 === 0 ? t.barline : t.grid;
    c.fillRect(Math.round(x - cw / 2), 0, 1, h);
    if (held.has(s)) {
      c.fillStyle = t.shine;
      c.globalAlpha = 0.18;
      c.fillRect(x - cw / 2, 0, cw, h);
      c.globalAlpha = 1;
    }
    label(c, stepName(s), x, h - 10, s % 7 === 0 ? t.fg : t.muted, 6);
  }
  c.globalAlpha = 0.45;
  for (const o of g.others) {
    if (yOf(o.on) < 0) break;
    if (yOf(o.on + o.dur) > h) continue;
    const x = columnX(o.step, g.pan, w);
    if (x < -cw || x > w + cw) continue;
    c.fillStyle = inkOf(o.voice, g.f.voices.length);
    c.fillRect(x - cw * 0.25, yOf(o.on + o.dur), cw * 0.5, Math.max(3, yOf(o.on) - yOf(o.on + o.dur) - 2));
  }
  c.globalAlpha = 1;
  for (const n of g.notes) {
    if (yOf(n.on) < 0) break;
    if (yOf(n.on + n.dur) > h) continue;
    const x = columnX(n.step, g.pan, w) - cw / 2 + 2;
    const y0 = yOf(n.on + n.dur);
    const bh = Math.max(5, yOf(n.on) - y0 - 2);
    if (n.state === "miss") c.fillStyle = t.miss;
    else {
      c.fillStyle = t.fg;
      c.fillRect(x - 1, y0 - 1, cw - 2, bh + 2);
      c.fillStyle = n.state === "hit" ? t.shine : ink;
    }
    c.fillRect(x, y0, cw - 4, bh);
    if (subject.has(`${g.voice}:${n.on}`)) {
      c.fillStyle = t.fg;
      for (let k = x + 2; k < x + cw - 6; k += 5) c.fillRect(k, y0 + bh - 2, 2, 1);
    }
  }
  c.fillStyle = t.shine;
  c.fillRect(0, Math.round(line) - 1, w, 2);
  const n = g.countIn();
  if (n) label(c, String(n), w / 2, h / 2, t.shine, 48);
}

function verdict(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok) {
  const gr = g.grade;
  if (!gr) return;
  const age = performance.now() - gr.at;
  const ok = gr.text === "PERFECT" || gr.text === "GOOD";
  if (age < 220) {
    c.fillStyle = ok ? t.shine : t.wrong;
    c.globalAlpha = 0.14 * (1 - age / 220);
    c.fillRect(0, 0, w, h);
    c.globalAlpha = 1;
  }
  if (age < 500) {
    c.globalAlpha = 1 - age / 500;
    const x = g.proto.id === "thumbsH" ? (gr.side === "left" ? w * 0.1 : w * 0.9) : gr.side === "left" ? w / 4 : gr.side === "right" ? (3 * w) / 4 : w / 2;
    label(c, gr.text === "✕" ? (gr.why === "gesture" ? "✕ WRONG" : "✕ OFF TIME") : gr.text, x, g.proto.id === "sideways" ? h * LINE + 24 : 30, gr.text === "PERFECT" ? t.gold : ok ? t.fg : t.wrong, 8);
    c.globalAlpha = 1;
  }
}
