/**
 * Painting the testbench's prototypes (D175-D179).
 *   The bars (LADDER, THUMBS, TWO VOICES): two side bars over the screen, the music box between them.
 *     LADDER's bars carry the box's rows as rungs (the staff's lines brighter, the Cs named), and the
 *     coming note's glow runs from where it is drawn in the box out across both bars at its height.
 *     THUMBS lights the bar wanted; TWO VOICES each bar for its voice (1P, 2P). The dynamics are
 *     marked along the bars' feet, pp by the box to ff by the phone's edge.
 *   SIDEWAYS: the whole screen in chunky pixels, warm: every voice falling in the window's columns,
 *     bevelled blocks, a dotted line to land on, scanlines; ff at the top, pp at the foot.
 *   PIANO: paint-piano.ts.
 * The verdict of the last touch flashes over the field.
 */
import { inkOf, keyTint } from "../touch/MusicBox.tsx";
import { paintPiano } from "../touch/paint-piano.ts";
import { stepName } from "../touch/fugue.ts";
import { columnX, COLUMNS, LINE } from "./placed.ts";
import { APPROACH_MS, type ProtoGame } from "./proto-game.ts";
import { BAR, MARKS } from "./protos.ts";

const FONT = '"Press Start 2P", ui-monospace, monospace';
/** The staff's lines: treble E4 G4 B4 D5 F5, bass G2 B2 D3 F3 A3 (C0 = step 0). */
const LINES = new Set([30, 32, 34, 36, 38, 18, 20, 22, 24, 26]);

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
    case "thumbs":
    case "duo":
      bars(c, w, h, g, t);
      break;
    case "sideways":
      sideways(c, w, h, g, t, subject);
      break;
    case "piano":
      paintPiano(c, w, h, { kb: g.kb, now: g.now, tps: g.tps, voice: g.voice, count: g.f.voices.length, notes: g.notes, others: g.others, late: g.opt.late, held: g.heldCells(), grade: g.grade }, subject);
      break;
  }
  verdict(c, w, h, g, t);
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
    // The rungs: the box's rows carried across the bars.
    for (let st = Math.floor(rows.stepAt(h)) - 1; st <= rows.stepAt(0) + 1; st++) {
      const y = Math.round(rows.yOf(st));
      if (y < 0 || y > h - 18) continue;
      const line = LINES.has(st);
      c.fillStyle = line ? t.muted : t.grid;
      c.globalAlpha = line ? 0.7 : 0.45;
      for (const s of sides) c.fillRect(s.x, y, bw, 1);
      c.globalAlpha = 1;
      if (st % 7 === 0) {
        label(c, stepName(st), 4, y - 6, t.muted, 6, "left");
        label(c, stepName(st), w - 4, y - 6, t.muted, 6, "right");
      }
    }
  }
  if (g.proto.id === "ladder" && rows) {
    const nx = coming(g);
    if (nx) {
      const n = g.notes[nx.i];
      const ink = inkOf(g.voice, count);
      const y = rows.yOf(n.step);
      const band = Math.max(1.5 * rows.rowH, 20);
      // The glow from the note in the box out to both bars.
      const xn = Math.max(bw, Math.min(w - bw, rows.xOf(n.on)));
      c.fillStyle = ink;
      c.globalAlpha = 0.25 + 0.5 * nx.p;
      c.fillRect(bw, Math.round(y) - 1, xn - bw, 2);
      c.fillRect(xn, Math.round(y) - 1, w - bw - xn, 2);
      c.globalAlpha = 1;
      for (const s of sides) light(c, s.x, y - band, bw, band * 2, nx.p, ink, t);
      if (n.long) for (const s of sides) label(c, "HOLD", s.x + bw / 2, y, t.fg, 7);
    }
  } else if (g.proto.id === "thumbs") {
    const nx = coming(g);
    if (nx) {
      const m = g.moves[nx.i];
      const either = m.size < 0 || m.dir === 0 || m.size === 3;
      const ink = inkOf(g.voice, count);
      if (either || m.dir < 0) light(c, 0, 0, bw, h - 18, nx.p, ink, t);
      if (either || m.dir > 0) light(c, w - bw, 0, bw, h - 18, nx.p, ink, t);
    }
    label(c, "▼", bw / 2, h / 2, t.muted, 14);
    label(c, "▲", w - bw / 2, h / 2, t.muted, 14);
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

/** SIDEWAYS, in chunky pixels: every voice falling in the window's columns onto a line. */
function sideways(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok, subject: Set<string>) {
  const P = 3;
  const snap = (v: number) => Math.round(v / P) * P;
  const box = (x: number, y: number, bw: number, bh: number, fill: string) => {
    c.fillStyle = fill;
    c.fillRect(snap(x), snap(y), Math.max(P, snap(bw)), Math.max(P, snap(bh)));
  };
  const cw = w / COLUMNS;
  const line = h * LINE;
  const span = 1.5 * g.f.barTicks;
  const yOf = (tick: number) => line - ((tick - g.now) / span) * line;
  const count = g.f.voices.length;
  const ink = inkOf(g.voice, count);
  // The ground: the key's colour, warmed; the columns in alternate shades, the Cs marked.
  c.fillStyle = keyTint(g.keyNow(), 3);
  c.fillRect(0, 0, w, h);
  // Warmed: an amber wash over the key's colour.
  c.fillStyle = "rgba(120,60,30,0.28)";
  c.fillRect(0, 0, w, h);
  const held = new Set(g.heldCells());
  for (let s = Math.floor(g.pan - COLUMNS / 2) - 1; s <= g.pan + COLUMNS / 2 + 1; s++) {
    const x = columnX(s, g.pan, w) - cw / 2;
    box(x, 0, cw, h, s % 2 ? "rgba(255,200,140,0.035)" : "rgba(0,0,0,0.08)");
    if (held.has(s)) box(x, 0, cw, h, "rgba(255,226,150,0.16)");
    if (s % 7 === 0) box(x, 0, P, h, "rgba(255,210,150,0.25)");
    label(c, stepName(s), x + cw / 2, h - 10, s % 7 === 0 ? "#ffd9a0" : t.muted, 7);
  }
  // The others in the window: narrow, dim, in their colours.
  for (const o of g.others) {
    if (yOf(o.on) < 0) break;
    if (yOf(o.on + o.dur) > h) continue;
    const x = columnX(o.step, g.pan, w);
    if (x < -cw || x > w + cw) continue;
    c.globalAlpha = 0.5;
    box(x - cw * 0.18, yOf(o.on + o.dur), cw * 0.36, yOf(o.on) - yOf(o.on + o.dur) - P, inkOf(o.voice, count));
    c.globalAlpha = 1;
  }
  // The voice played: bevelled blocks, a light edge above and to the left, a shadow below.
  for (const n of g.notes) {
    if (yOf(n.on) < 0) break;
    if (yOf(n.on + n.dur) > h) continue;
    const x = columnX(n.step, g.pan, w) - cw / 2 + 2 * P;
    const y0 = yOf(n.on + n.dur);
    const bh = Math.max(3 * P, yOf(n.on) - y0 - P);
    const bwid = cw - 4 * P;
    const fill = n.state === "miss" ? t.miss : n.state === "hit" ? t.shine : ink;
    box(x + P, y0 + P, bwid, bh, "rgba(0,0,0,0.45)");
    box(x, y0, bwid, bh, fill);
    if (n.state !== "miss") {
      box(x, y0, bwid, P, "rgba(255,255,255,0.45)");
      box(x, y0, P, bh, "rgba(255,255,255,0.25)");
      box(x, y0 + bh - P, bwid, P, "rgba(0,0,0,0.3)");
    }
    if (subject.has(`${g.voice}:${n.on}`)) for (let k = x + P; k < x + bwid - P; k += 2 * P) box(k, y0 + bh - 2 * P, P, P, "#fff3d6");
  }
  // The line: dotted amber.
  for (let x = 0; x < w; x += 4 * P) box(x, line - P, 2 * P, P, "#ffcf7a");
  // The dynamics, up the left edge.
  label(c, "ff", 6, 14, "#ffd9a0", 7, "left");
  label(c, "mf", 6, h / 2, t.muted, 7, "left");
  label(c, "pp", 6, h - 28, t.muted, 7, "left");
  if (g.o.legato) label(c, "LEGATO", w - 6, 56, "#ffd9a0", 7, "right");
  // Scanlines, for an old screen's warmth.
  c.fillStyle = "rgba(0,0,0,0.12)";
  for (let y = 0; y < h; y += 2 * P) c.fillRect(0, y, w, 1);
  const n = g.countIn();
  if (n) label(c, String(n), w / 2, h / 2, "#ffe7a8", 48);
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
    const text = gr.text === "✕" ? (gr.why === "legato" ? "✕ LEGATO" : gr.why === "gesture" ? "✕ WRONG" : "✕ OFF TIME") : gr.text;
    const bars = g.proto.layout === "bars";
    const x = bars ? (gr.side === "left" ? w * BAR * 0.5 : w * (1 - BAR * 0.5)) : w / 2;
    label(c, text, x, g.proto.id === "sideways" ? h * LINE + 24 : bars ? h * 0.45 : 30, gr.text === "PERFECT" ? t.gold : ok ? t.fg : t.wrong, 8);
    c.globalAlpha = 1;
  }
}
