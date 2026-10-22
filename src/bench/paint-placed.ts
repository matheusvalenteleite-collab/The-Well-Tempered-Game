/**
 * Painting the testbench's batch 2 (D176; placed.ts): the dulcimer's strings, the upright keyboard,
 * the sideways piano (paint-piano.ts), and the two whole-screen fields, SNES (every voice scrolling
 * past a line) and TETRIS (every voice falling to a line). The coming note's place lights in the
 * voice's colour as its time comes; the count-in and the verdicts are drawn here too when the field
 * has the whole screen.
 */
import { inkOf, keyTint } from "../touch/MusicBox.tsx";
import { paintPiano } from "../touch/paint-piano.ts";
import { isBlack } from "../touch/piano.ts";
import { stepName } from "../touch/fugue.ts";
import { APPROACH_MS, type ProtoGame } from "./proto-game.ts";
import { BLACK_SPAN, SNES_LINE, snesY, TETRIS_LINE, tetrisX, uprightSpan, whites } from "./placed.ts";

const FONT = '"Press Start 2P", ui-monospace, monospace';

function tokens() {
  const css = getComputedStyle(document.documentElement);
  const tok = (name: string) => css.getPropertyValue(name).trim() || "#fff";
  return { shine: tok("--tg-shine"), gold: tok("--tg-gold"), wrong: tok("--tg-wrong"), fg: tok("--tg-fg"), muted: tok("--tg-muted"), grid: tok("--tg-grid"), barline: tok("--tg-barline"), miss: tok("--tg-miss") };
}

/** The coming notes (up to two), with how near each is (0 far, 1 on its beat). */
function coming(g: ProtoGame): { i: number; p: number }[] {
  const approach = (APPROACH_MS / 1000) * g.tps;
  const out: { i: number; p: number }[] = [];
  g.notes.forEach((n, i) => {
    if (out.length >= 2 || n.state !== "pending" || (i > 0 && g.notes[i - 1].on === n.on)) return;
    const dt = n.on - g.now;
    if (dt < -g.opt.late || dt > approach * 1.3) return;
    out.push({ i, p: Math.max(0, Math.min(1, 1 - dt / approach)) });
  });
  return out;
}

/** The verdict of the last gesture, over the field. */
function verdict(c: CanvasRenderingContext2D, w: number, g: ProtoGame, t: ReturnType<typeof tokens>, y = 16) {
  const gr = g.grade;
  if (!gr) return;
  const age = performance.now() - gr.at;
  if (age >= 500) return;
  c.globalAlpha = 1 - age / 500;
  c.fillStyle = gr.text === "PERFECT" ? t.gold : gr.text === "GOOD" ? t.fg : t.wrong;
  c.font = `8px ${FONT}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(gr.text === "✕" ? "✕ PLACE" : gr.text, w / 2, y);
  c.globalAlpha = 1;
}

/** The count-in, large, when the field has the whole screen. */
function countIn(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: ReturnType<typeof tokens>) {
  const n = g.countIn();
  if (!n) return;
  c.fillStyle = t.shine;
  c.font = `48px ${FONT}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(String(n), w / 2, h / 2);
}

export function paintPlaced(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, subject: Set<string>) {
  const t = tokens();
  const ink = inkOf(g.voice, g.f.voices.length);
  switch (g.proto.placed) {
    case "dulcimer":
      return dulcimer(c, w, h, g, t, ink);
    case "upright":
      return upright(c, w, h, g, t, ink);
    case "piano":
      paintPiano(c, w, h, { kb: g.kb, now: g.now, tps: g.tps, voice: g.voice, count: g.f.voices.length, notes: g.notes, others: g.others, late: g.opt.late, held: g.heldCells(), grade: g.grade }, subject);
      return verdict(c, w, g, t);
    case "snes":
      return snes(c, w, h, g, t, ink, subject);
    case "tetris":
      return tetris(c, w, h, g, t, ink, subject);
  }
}

function dulcimer(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: ReturnType<typeof tokens>, ink: string) {
  const win = g.windowNow();
  const sh = h / win.n;
  const yOf = (k: number) => h - (k + 0.5) * sh;
  const held = new Set(g.heldCells());
  // The coming notes' strings.
  for (const { i, p } of coming(g)) {
    const k = Math.max(0, Math.min(win.n - 1, g.notes[i].step - win.lo));
    const first = i === coming(g)[0].i;
    c.fillStyle = ink;
    c.globalAlpha = first ? 0.15 + 0.5 * p * p : 0.12;
    c.fillRect(0, yOf(k) - sh / 2, w, sh);
    if (first) {
      const half = (w / 2) * (1 - p);
      c.globalAlpha = 0.9;
      c.fillStyle = t.shine;
      c.fillRect(0, yOf(k) + sh / 2 - 4, w / 2 - half, 3);
      c.fillRect(w / 2 + half, yOf(k) + sh / 2 - 4, w / 2 - half, 3);
    }
    c.globalAlpha = 1;
  }
  // The strings: a pair of wires each, the held ones bright; their letters at both ends.
  c.font = `7px ${FONT}`;
  c.textBaseline = "middle";
  for (let k = 0; k < win.n; k++) {
    const y = Math.round(yOf(k));
    const step = win.lo + k;
    c.fillStyle = held.has(step) ? t.shine : (step % 7) % 2 === 0 ? t.fg : t.muted;
    c.globalAlpha = held.has(step) ? 1 : 0.55;
    c.fillRect(0, y - 1, w, 1);
    c.fillRect(0, y + 1, w, 1);
    c.globalAlpha = 1;
    c.fillStyle = t.muted;
    c.textAlign = "left";
    c.fillText(stepName(step), 4, y - 7);
    c.textAlign = "right";
    c.fillText(stepName(step), w - 4, y - 7);
  }
  verdict(c, w, g, t);
}

function upright(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: ReturnType<typeof tokens>, ink: string) {
  const win = g.windowNow();
  const held = new Set(g.heldCells());
  const lit = new Set(coming(g).slice(0, 1).map(({ i }) => g.notes[i].midi));
  const p = coming(g)[0]?.p ?? 0;
  const key = (m: number, x0: number, x1: number, base: string) => {
    const [a, b] = uprightSpan(win, m);
    c.fillStyle = base;
    c.fillRect(x0, a * h + 1, x1 - x0, (b - a) * h - 2);
    if (lit.has(m)) {
      c.fillStyle = ink;
      c.globalAlpha = 0.35 + 0.5 * p;
      c.fillRect(x0, a * h + 1, x1 - x0, (b - a) * h - 2);
      c.globalAlpha = 1;
    }
    if (held.has(m)) {
      c.fillStyle = t.shine;
      c.globalAlpha = 0.5;
      c.fillRect(x0, a * h + 1, x1 - x0, (b - a) * h - 2);
      c.globalAlpha = 1;
    }
  };
  c.font = `7px ${FONT}`;
  c.textBaseline = "middle";
  for (const m of whites(win)) {
    key(m, 2, w - 2, "#d9d6c3");
    if (m % 12 === 0) {
      const [a, b] = uprightSpan(win, m);
      c.fillStyle = t.muted;
      c.textAlign = "left";
      c.fillText(`C${Math.floor(m / 12) - 1}`, 8, ((a + b) / 2) * h);
    }
  }
  for (let m = win.lo; m < win.lo + win.n; m++) if (isBlack(m)) key(m, BLACK_SPAN[0] * w, BLACK_SPAN[1] * w, "#1a1c2c");
  verdict(c, w, g, t);
}

function snes(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: ReturnType<typeof tokens>, ink: string, subject: Set<string>) {
  const { lo, hi } = g.range;
  const rowH = h / (hi - lo + 3);
  const bh = Math.max(4, rowH - 1);
  const span = 3 * g.f.barTicks;
  const xOf = (tick: number) => w * SNES_LINE + ((tick - g.now) / span) * w;
  c.fillStyle = keyTint(g.keyNow());
  c.fillRect(0, 0, w, h);
  for (let tk = Math.floor((g.now - span) / g.f.barTicks) * g.f.barTicks; tk < g.now + span; tk += g.f.barTicks) {
    c.fillStyle = t.barline;
    c.fillRect(Math.round(xOf(tk)), 0, 1, h);
  }
  const block = (on: number, dur: number, step: number) => {
    const x1 = xOf(on);
    const x2 = xOf(on + dur);
    return { x: x1, y: snesY(step, lo, hi, h) - bh / 2, w: Math.max(2, x2 - x1 - 2) };
  };
  c.globalAlpha = 0.5;
  for (const o of g.others) {
    if (xOf(o.on) > w) break;
    if (xOf(o.on + o.dur) < 0) continue;
    const b = block(o.on, o.dur, o.step);
    c.fillStyle = inkOf(o.voice, g.f.voices.length);
    c.fillRect(b.x, b.y, b.w, bh);
  }
  c.globalAlpha = 1;
  for (const n of g.notes) {
    if (xOf(n.on) > w) break;
    if (xOf(n.on + n.dur) < 0) continue;
    const b = block(n.on, n.dur, n.step);
    if (n.state === "miss") {
      c.fillStyle = t.miss;
      c.fillRect(b.x, b.y, b.w, bh);
      continue;
    }
    c.fillStyle = t.fg;
    c.fillRect(b.x - 1, b.y - 1, b.w + 2, bh + 2);
    c.fillStyle = n.state === "hit" ? t.shine : ink;
    c.fillRect(b.x, b.y, b.w, bh);
    if (subject.has(`${g.voice}:${n.on}`)) {
      c.fillStyle = t.fg;
      for (let x = b.x + 1; x < b.x + b.w - 1; x += 4) c.fillRect(x, b.y, 2, 1);
    }
  }
  // The line, and a glow where the thumbs may touch.
  c.fillStyle = t.shine;
  c.globalAlpha = 0.07;
  c.fillRect(w * (SNES_LINE - 0.22), 0, w * 0.44, h);
  c.globalAlpha = 1;
  c.fillRect(Math.round(w * SNES_LINE) - 1, 0, 2, h);
  countIn(c, w, h, g, t);
  verdict(c, w, g, t, h - 14);
}

function tetris(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: ReturnType<typeof tokens>, ink: string, subject: Set<string>) {
  const { lo, hi } = g.range;
  const colW = w / (hi - lo + 3);
  const line = h * TETRIS_LINE;
  const span = 2 * g.f.barTicks;
  const yOf = (tick: number) => line - ((tick - g.now) / span) * line;
  c.fillStyle = keyTint(g.keyNow());
  c.fillRect(0, 0, w, h);
  // The columns: the Cs brighter, so the keyboard reads.
  for (let s = lo - 1; s <= hi + 1; s++) {
    c.fillStyle = s % 7 === 0 ? t.barline : t.grid;
    c.fillRect(Math.round(tetrisX(s, lo, hi, w) - colW / 2), 0, 1, h);
  }
  const block = (on: number, dur: number, step: number, pad: number) => {
    const y1 = yOf(on);
    const y0 = yOf(on + dur);
    const x = tetrisX(step, lo, hi, w) - colW / 2 + pad;
    return { x, y: y0, w: colW - 2 * pad, h: Math.max(3, y1 - y0 - 2) };
  };
  c.globalAlpha = 0.45;
  for (const o of g.others) {
    if (yOf(o.on) < 0) break;
    if (yOf(o.on + o.dur) > h || o.step < lo - 1 || o.step > hi + 1) continue;
    const b = block(o.on, o.dur, o.step, colW * 0.25);
    c.fillStyle = inkOf(o.voice, g.f.voices.length);
    c.fillRect(b.x, b.y, b.w, b.h);
  }
  c.globalAlpha = 1;
  for (const n of g.notes) {
    if (yOf(n.on) < 0) break;
    if (yOf(n.on + n.dur) > h) continue;
    const b = block(n.on, n.dur, n.step, 1);
    if (n.state === "miss") {
      c.fillStyle = t.miss;
      c.fillRect(b.x, b.y, b.w, b.h);
      continue;
    }
    c.fillStyle = t.fg;
    c.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
    c.fillStyle = n.state === "hit" ? t.shine : ink;
    c.fillRect(b.x, b.y, b.w, b.h);
    if (subject.has(`${g.voice}:${n.on}`)) {
      c.fillStyle = t.fg;
      for (let x = b.x + 1; x < b.x + b.w - 1; x += 4) c.fillRect(x, b.y + b.h - 2, 2, 1);
    }
  }
  c.fillStyle = t.shine;
  c.globalAlpha = 0.07;
  c.fillRect(0, h * 0.3, w, h * 0.7);
  c.globalAlpha = 1;
  c.fillRect(0, Math.round(line) - 1, w, 2);
  countIn(c, w, h, g, t);
  verdict(c, w, g, t, line + 20);
}
