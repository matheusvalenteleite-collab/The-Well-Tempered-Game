/**
 * Painting the testbench's prototypes (D175-D179).
 *   The bars (LADDER, THUMBS, TWO VOICES): two side bars over the screen, the music box between them.
 *     LADDER (D181): a soft glow over the coming note's broad area on both bars, brightest at the
 *     height it is drawn, a trail from it in the box, the way to go from your last touch (▲ ▼ =), and
 *     a mark where you last played; only the Cs named, for bearings.
 *     THUMBS lights the bar wanted; TWO VOICES each bar for its voice (1P, 2P). The dynamics are
 *     marked along the bars' feet, pp by the box to ff by the phone's edge.
 *   SIDEWAYS: the whole screen in chunky pixels, warm: every voice falling in the window's columns,
 *     bevelled blocks, a dotted line to land on, scanlines; ff at the top, pp at the foot.
 *   PIANO: paint-piano.ts.
 * The verdict of the last touch flashes over the field.
 */
import { ARROW_PIXELS, inkOf, keyTint, type Arrow } from "../touch/MusicBox.tsx";
import { paintPiano } from "../touch/paint-piano.ts";
import { stepName } from "../touch/fugue.ts";
import { columnX, COLUMNS, LINE } from "./placed.ts";
import { APPROACH_MS, type ProtoGame } from "./proto-game.ts";
import { ARROW_KEYS, arrowOf, BAR, contourOk, fits, KEY_ROWS, LADDER_AREA, MARKS } from "./protos.ts";
import { isBlack, keySpan } from "../touch/piano.ts";
import { KEYS_SHARE } from "./placed.ts";

const FONT = '"Press Start 2P", ui-monospace, monospace';

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
    case "fingering":
    case "duo":
      bars(c, w, h, g, t);
      break;
    case "sideways":
      sideways(c, w, h, g, t, subject);
      break;
    case "piano":
      paintPiano(c, w, h, { kb: g.kb, now: g.now, tps: g.tps, voice: g.voice, count: g.f.voices.length, notes: g.notes, others: g.others, late: g.opt.late, held: g.heldCells(), grade: g.grade }, subject);
      pianoLetters(c, w, h, g, t);
      break;
    case "keys":
      desk(c, w, h, g, t);
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
  const y = bars ? h * 0.12 : g.proto.id === "sideways" ? 30 : desk ? 34 : 14;
  label(c, g.score.toLocaleString("en"), x, y, t.fg, 9);
  if (g.mult > 1) label(c, `×${g.mult}`, x, y + 16, g.mult >= 4 ? t.gold : t.shine, 9);
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
    // A lesson: the keys not yet taught dimmed.
    c.globalAlpha = g.o.keys && !g.o.keys.includes(ARROW_KEYS[code]) ? 0.25 : 1;
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
    c.globalAlpha = 1;
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

/** EASY on a computer: the keyboard's four rows (ff to p), the keys down lit; the next note's time as two bars meeting. */
function desk(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: Tok) {
  const ink = inkOf(g.voice, g.f.voices.length);
  const rowH = Math.min(46, (h - 60) / KEY_ROWS.length);
  const key = Math.min(46, (w - 90) / 13);
  const top = 16;
  const nx = coming(g);
  // DIRECTION (D187): only the keys that answer the next move light up; the last key struck ringed.
  const lvl = g.o.easy ?? "timing";
  const judged = lvl !== "timing" && nx && g.lastKey && !g.isFree(nx.i);
  const fitsKey = (code: string) => !judged || contourOk(g.moves[nx!.i], g.lastKey!, code, lvl === "leaps");
  KEY_ROWS.forEach((r, ri) => {
    const y = top + ri * rowH;
    const x0 = 60 + ri * key * 0.35;
    label(c, r.mark, 30, y + rowH / 2, ri === 0 ? t.gold : t.muted, 9);
    r.codes.forEach((code, ci) => {
      const x = x0 + ci * key;
      const down = g.keysDown.has(code);
      c.fillStyle = down ? t.shine : "#1d1a24";
      c.fillRect(x, y + 3, key - 4, rowH - 6);
      c.fillStyle = "rgba(0,0,0,0.4)";
      c.fillRect(x, y + rowH - 6, key - 4, 3);
      if (code === g.lastKey && lvl !== "timing") {
        c.fillStyle = t.gold;
        c.fillRect(x - 2, y + 1, key, 2);
        c.fillRect(x - 2, y + rowH - 5, key, 2);
        c.fillRect(x - 2, y + 1, 2, rowH - 4);
        c.fillRect(x + key - 4, y + 1, 2, rowH - 4);
      }
      if (nx && !down && fitsKey(code)) {
        c.fillStyle = ink;
        c.globalAlpha = 0.1 + 0.4 * nx.p * nx.p;
        c.fillRect(x, y + 3, key - 4, rowH - 6);
        c.globalAlpha = 1;
      }
      const name = code.replace("Key", "").replace("Digit", "").replace("Backquote", "`").replace("Minus", "-").replace("Equal", "=").replace("BracketLeft", "[").replace("BracketRight", "]").replace("Backslash", "\\").replace("Semicolon", ";").replace("Quote", "'").replace("Comma", ",").replace("Period", ".").replace("Slash", "/");
      label(c, name, x + (key - 4) / 2, y + rowH / 2, down ? "#1a1408" : t.muted, 8);
    });
  });
  // DIRECTION: the space bar, for a repeated note.
  if (lvl !== "timing") {
    const y = top + KEY_ROWS.length * rowH;
    const x = 60 + 3 * key;
    const down = g.keysDown.has("Space");
    c.fillStyle = down ? t.shine : "#1d1a24";
    c.fillRect(x, y + 3, key * 6, rowH * 0.6);
    if (nx && !down && fitsKey("Space") && judged) {
      c.fillStyle = ink;
      c.globalAlpha = 0.1 + 0.4 * nx.p * nx.p;
      c.fillRect(x, y + 3, key * 6, rowH * 0.6);
      c.globalAlpha = 1;
    }
    label(c, "SPACE", x + key * 3, y + 3 + rowH * 0.3, down ? "#1a1408" : t.muted, 8);
  }
  // The beat closing in, under the keys.
  if (nx) {
    const y = top + KEY_ROWS.length * rowH + (lvl !== "timing" ? rowH * 0.6 + 8 : 6);
    const half = (w / 2) * (1 - nx.p);
    c.fillStyle = t.shine;
    c.fillRect(0, y, w / 2 - half, 3);
    c.fillRect(w / 2 + half, y, w / 2 - half, 3);
    if (g.notes[nx.i].long) label(c, "HOLD", w / 2, y + 14, t.fg, 8);
  }
  const how =
    lvl === "timing"
      ? "SPACE: A NOTE (A SWOOSH WHILE ONE SOUNDS)"
      : `LINE UP: A KEY FURTHER RIGHT · DOWN: FURTHER LEFT · SAME NOTE: SAME KEY OR SPACE${lvl === "leaps" ? " · A LEAP SKIPS A KEY" : ""} · A BOXED NOTE: ANY KEY`;
  label(c, how, w / 2, h - 26, t.fg, 7);
  label(c, `SHIFT: PEDAL${g.pedalOn ? " (DOWN)" : ""} · ↑ ↓: BEND`, w / 2, h - 12, g.pedalOn ? t.gold : t.muted, 7);
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
  } else if (g.proto.id === "fingering") {
    const nx = coming(g);
    if (nx) {
      const fg = g.tracks[0].fingers[nx.i];
      const ink = fg.boss === "boss" ? "#ff5a4f" : fg.boss === "sub" ? "#c78bff" : inkOf(g.voice, count);
      const s = sides[fg.hand === "left" ? 0 : 1];
      // The part of the bar wanted: all of it; a boss's height the upper or lower half; its dynamic the outer or inner half.
      const top = fg.height === "low" ? (h - 18) / 2 : 0;
      const tall = fg.height ? (h - 18) / 2 : h - 18;
      const outer = s.x === 0 ? 0 : s.x + bw / 2;
      const inner = s.x === 0 ? bw / 2 : s.x;
      const x = fg.dyn === "f" ? outer : fg.dyn === "p" ? inner : s.x;
      const wid = fg.dyn ? bw / 2 : bw;
      light(c, x, top, wid, tall, nx.p, ink, t);
      const art = { legato: "LEGATO", staccato: "STACC.", tenuto: "TEN.", free: "" }[fg.art];
      label(c, fg.hand === "left" ? "L" : "R", s.x + bw / 2, top + tall / 2 - 10, t.fg, 14);
      if (art) label(c, art, s.x + bw / 2, top + tall / 2 + 12, t.fg, 7);
      if (fg.dyn) label(c, fg.dyn, x + wid / 2, top + tall / 2 + 28, t.gold, 9);
      if (fg.boss) label(c, fg.boss === "boss" ? "BOSS" : "SUB BOSS", w / 2, h - 30, ink, 8);
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
    const why: Record<string, string> = { legato: "✕ LEGATO", gesture: "✕ WRONG", staccato: "✕ STACCATO", tenuto: "✕ TENUTO", hand: "✕ OTHER THUMB", height: "✕ HIGHER/LOWER", dynamic: "✕ FORTE/PIANO" };
    const text = gr.text === "✕" ? (why[gr.why ?? ""] ?? "✕ OFF TIME") : gr.text;
    const bars = g.proto.layout === "bars";
    const desk = g.proto.layout === "desk";
    const x = bars ? (gr.side === "left" ? w * BAR * 0.5 : w * (1 - BAR * 0.5)) : desk ? w - 90 : w / 2;
    label(c, text, x, g.proto.id === "sideways" ? h * LINE + 24 : bars ? h * 0.45 : desk ? 14 : 30, gr.text === "PERFECT" ? t.gold : ok ? t.fg : t.wrong, 8);
    c.globalAlpha = 1;
  }
}
