/**
 * Painting the play area for the testbench's prototypes (D175): where the next note is given lights up
 * in the voice's colour as its time comes, two bars sweeping in to meet on the beat; the rules that
 * measure from the last touch draw it as a line; a glyph says what is wanted (▲ up, ▼ down, = a
 * repeat, ANY). A gesture judged right flashes light, wrong or missed red.
 */
import { inkOf } from "../touch/MusicBox.tsx";
import { APPROACH_MS, type ProtoGame } from "./proto-game.ts";
import { zone, type Move } from "./protos.ts";

const FONT = '"Press Start 2P", ui-monospace, monospace';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the move is given, a glyph for it, and the line it is measured from (if any). */
function target(g: ProtoGame, m: Move, w: number, h: number): { rects: Rect[]; glyph: string; line?: number } {
  const full = [{ x: 0, y: 0, w, h }];
  const arrow = m.dir > 0 ? "▲" : m.dir < 0 ? "▼" : "=";
  const size = ["", "STEP", "THIRD", "LEAP"][Math.max(0, m.size)];
  const last = g.last;
  const free = m.size < 0;
  const band = (y0: number, y1: number): Rect => {
    const a = Math.max(0, Math.min(y0, y1));
    const b = Math.min(h, Math.max(y0, y1));
    return { x: 0, y: a, w, h: Math.max(4, b - a) };
  };
  switch (g.proto.id) {
    case "bow":
      return { rects: full, glyph: "" };
    case "ladder": {
      if (free || m.size === 3 || !last) return { rects: full, glyph: free ? "ANY" : `${arrow} LEAP: ANY`, line: last?.y };
      const z = zone("ladder", m, last.y, h)!;
      return { rects: [band(z[0], z[1])], glyph: arrow, line: last.y };
    }
    case "thumbs": {
      if (free || m.dir === 0) return { rects: full, glyph: free ? "ANY" : "= EITHER" };
      let side: "left" | "right" | null = m.dir > 0 ? "right" : "left";
      if (m.size === 3) side = null;
      if (g.o.relative) side = m.size === 3 || m.ref === 0 || !last ? null : m.dir === m.ref ? last.side : last.side === "left" ? "right" : "left";
      if (!side) return { rects: full, glyph: `${arrow} EITHER` };
      return { rects: [{ x: side === "left" ? 0 : w / 2, y: 0, w: w / 2, h }], glyph: arrow };
    }
    case "trace": {
      if (free || !last) return { rects: full, glyph: "ANY" };
      const r = m.fresh ? h / 2 : last.y;
      const z = zone("trace", m, r, h)!;
      return { rects: [band(z[0], z[1])], glyph: `${arrow} ${size}`, line: r };
    }
    case "line": {
      if (free) return { rects: full, glyph: "ANY" };
      const span = m.dir === 0 ? [-0.15, 0.15] : m.size === 1 ? [0.08, 0.48] : m.size === 2 ? [0.38, 0.78] : [0.68, 1];
      const [a, b] = m.dir < 0 ? [-span[1], -span[0]] : span;
      const x0 = ((a + 1) / 2) * w;
      const x1 = ((b + 1) / 2) * w;
      return { rects: [{ x: x0, y: 0, w: x1 - x0, h }], glyph: `${arrow} ${size}` };
    }
    case "flick":
      return { rects: full, glyph: free ? "ANY" : m.dir === 0 ? "• NO FLICK" : `${arrow} ${size}` };
    default:
      return { rects: full, glyph: "" };
  }
}

export function paintProto(gc: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame) {
  const css = getComputedStyle(document.documentElement);
  const tok = (name: string) => css.getPropertyValue(name).trim() || "#fff";
  const shine = tok("--tg-shine");
  const gold = tok("--tg-gold");
  const wrong = tok("--tg-wrong");
  const fg = tok("--tg-fg");
  const muted = tok("--tg-muted");
  const ink = inkOf(g.voice, g.f.voices.length);
  const approach = (APPROACH_MS / 1000) * g.tps;

  // The fixed marks: the halves (THUMBS), the interval line's zones.
  if (g.proto.id === "thumbs" || g.proto.id === "bow") {
    gc.fillStyle = tok("--tg-barline");
    gc.fillRect(w / 2 - 1, 0, 2, h);
  }
  if (g.proto.id === "line") {
    gc.font = `7px ${FONT}`;
    gc.textAlign = "center";
    gc.fillStyle = muted;
    const xOf = (u: number) => Math.round(((u + 1) / 2) * w);
    for (const u of [0.15, 0.43, 0.73]) {
      gc.globalAlpha = 0.35;
      gc.fillRect(xOf(u), 0, 1, h);
      gc.fillRect(xOf(-u), 0, 1, h);
      gc.globalAlpha = 1;
    }
    gc.fillText("=", xOf(0), h - 8);
    for (const [u, t] of [[0.29, "STEP"], [0.58, "3RD"], [0.87, "LEAP"]] as const) {
      gc.fillText(t, xOf(u), h - 8);
      gc.fillText(t, xOf(-u), h - 8);
    }
  }

  // The thumbs held.
  for (const t of g.heldSides()) {
    gc.fillStyle = ink;
    gc.globalAlpha = 0.12;
    gc.fillRect(0, t.y - 20, w, 40);
    gc.globalAlpha = 1;
  }

  // The next note.
  const i = g.next();
  if (i >= 0) {
    const n = g.notes[i];
    const dt = n.on - g.now;
    if (dt <= approach * 1.4) {
      const p = Math.max(0, Math.min(1, 1 - dt / approach));
      const t = target(g, g.moves[i], w, h);
      for (const r of t.rects) {
        gc.fillStyle = ink;
        gc.globalAlpha = 0.12 + 0.45 * p * p;
        gc.fillRect(r.x, r.y, r.w, r.h);
        const half = (r.w / 2) * (1 - p);
        gc.globalAlpha = 0.9;
        gc.fillStyle = shine;
        gc.fillRect(r.x, r.y + r.h - 4, r.w / 2 - half, 3);
        gc.fillRect(r.x + r.w / 2 + half, r.y + r.h - 4, r.w / 2 - half, 3);
        gc.globalAlpha = 1;
      }
      if (t.line !== undefined) {
        gc.fillStyle = shine;
        for (let x = 0; x < w; x += 8) gc.fillRect(x, Math.round(t.line), 4, 1);
      }
      const label = `${t.glyph}${n.long ? (t.glyph ? " · HOLD" : "HOLD") : ""}`;
      if (label) {
        gc.fillStyle = fg;
        gc.font = `9px ${FONT}`;
        gc.textAlign = "center";
        gc.textBaseline = "middle";
        const r = t.rects[0];
        gc.fillText(label, r.x + r.w / 2, Math.max(14, Math.min(h - 14, r.y + r.h / 2)));
      }
    }
  }

  // A long note held: gold along the bottom as it lasts.
  g.notes.forEach((n, k) => {
    if (n.state === "hit" && n.long && g.holding(k) && g.now < n.on + n.dur) {
      gc.fillStyle = gold;
      gc.globalAlpha = 0.6;
      gc.fillRect(0, h - 6, w * Math.min(1, (g.now - n.on) / n.dur), 5);
      gc.globalAlpha = 1;
    }
  });

  // The verdict.
  const gr = g.grade;
  if (gr) {
    const age = performance.now() - gr.at;
    if (age < 220) {
      gc.fillStyle = gr.text === "PERFECT" || gr.text === "GOOD" ? shine : wrong;
      gc.globalAlpha = 0.18 * (1 - age / 220);
      gc.fillRect(0, 0, w, h);
      gc.globalAlpha = 1;
    }
    if (age < 500) {
      gc.globalAlpha = 1 - age / 500;
      gc.fillStyle = gr.text === "PERFECT" ? gold : gr.text === "GOOD" ? fg : wrong;
      gc.font = `8px ${FONT}`;
      gc.textAlign = "center";
      gc.fillText(gr.text === "✕" ? "✕ SHAPE" : gr.text, gr.side === "left" ? w / 4 : gr.side === "right" ? (3 * w) / 4 : w / 2, 16);
      gc.globalAlpha = 1;
    }
  }
}
