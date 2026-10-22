/**
 * Painting the Synth's play area (D171): the left half falls (▼), the right half rises (▲); at
 * NORMAL each half is cut in four bands, SAME at the bottom to LEAP at the top. The coming note lights
 * the half it wants (both, for a repeat or the first note), at NORMAL only its band, in the voice's
 * colour, brightest as its beat comes, two bars sweeping in to meet on the beat; the note after it
 * shows faintly. A held long note fills with gold as it lasts; a hit flashes, a miss flashes red.
 */
import { APPROACH_MS, type Game } from "./engine.ts";
import type { LaneNote } from "./lanes.ts";
import { inkOf } from "./MusicBox.tsx";
import { BANDS, sideFor } from "./shape.ts";

const FONT = '"TG Accidentals", "Press Start 2P", ui-monospace, monospace';
const BAND_LABEL = ["SAME", "STEP", "3RD", "LEAP"];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where a note is played: its half (or both), at NORMAL its band. */
function targets(n: LaneNote, w: number, h: number, sized: boolean): Rect[] {
  const side = sideFor(n);
  const halves = side === "left" ? [0] : side === "right" ? [w / 2] : [0, w / 2];
  const band = sized && n.size !== undefined && n.size >= 0 ? n.size : -1;
  const bh = h / BANDS.length;
  return halves.map((x) => (band < 0 ? { x, y: 0, w: w / 2, h } : { x, y: h - (band + 1) * bh, w: w / 2, h: bh }));
}

export function paintSynth(g: CanvasRenderingContext2D, w: number, h: number, game: Game) {
  const css = getComputedStyle(document.documentElement);
  const tok = (name: string) => css.getPropertyValue(name).trim() || "#fff";
  const shine = tok("--tg-shine");
  const gold = tok("--tg-gold");
  const wrong = tok("--tg-wrong");
  const fg = tok("--tg-fg");
  const muted = tok("--tg-muted");
  const grid = tok("--tg-grid");
  const sized = game.o.difficulty === "normal";
  const now = game.now;
  const tps = game.tps;
  const approach = (APPROACH_MS / 1000) * tps;
  const tr = game.tracks[0];
  const ink = inkOf(tr.lv.voice, game.f.voices.length);
  const notes = tr.lv.notes;

  // The halves, the bands, their names.
  g.font = `7px ${FONT}`;
  g.textBaseline = "middle";
  if (sized) {
    const bh = h / BANDS.length;
    for (let b = 0; b < BANDS.length; b++) {
      const y = h - (b + 1) * bh;
      g.fillStyle = b % 2 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.008)";
      g.fillRect(0, y, w, bh);
      g.fillStyle = grid;
      g.fillRect(0, y, w, 1);
      g.fillStyle = muted;
      g.textAlign = "left";
      g.fillText(BAND_LABEL[b], 6, y + bh / 2);
      g.textAlign = "right";
      g.fillText(BAND_LABEL[b], w - 6, y + bh / 2);
    }
  }
  g.font = `10px ${FONT}`;
  g.textAlign = "center";
  g.fillStyle = muted;
  g.globalAlpha = 0.6;
  g.fillText("▼", w / 4, h - 12);
  g.fillText("▲", (3 * w) / 4, 12);
  g.globalAlpha = 1;

  // The thumbs held.
  for (const t of game.heldSides()) {
    g.fillStyle = ink;
    g.globalAlpha = 0.18;
    g.fillRect(t.side === "left" ? 0 : w / 2, 0, w / 2, h);
    g.globalAlpha = 1;
  }

  // The coming notes: the next lit, the one after faint.
  let lit = 0;
  for (let i = 0; i < notes.length && lit < 2; i++) {
    const n = notes[i];
    if (n.ride || (i > 0 && notes[i - 1].on === n.on) || n.state !== "pending") continue;
    const dt = n.on - now;
    if (dt < -game.opt.late) continue;
    if (dt > approach * (lit ? 1.6 : 1)) break;
    lit++;
    const p = Math.max(0, Math.min(1, 1 - dt / approach));
    for (const r of targets(n, w, h, sized)) {
      g.fillStyle = ink;
      if (lit === 2) {
        g.globalAlpha = 0.5;
        g.strokeStyle = ink;
        g.lineWidth = 2;
        g.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
        g.globalAlpha = 1;
        continue;
      }
      g.globalAlpha = 0.15 + 0.5 * p * p;
      g.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      const half = (r.w / 2) * (1 - p);
      g.globalAlpha = 0.9;
      g.fillStyle = shine;
      g.fillRect(r.x, r.y + r.h - 4, r.w / 2 - half, 3);
      g.fillRect(r.x + r.w / 2 + half, r.y + r.h - 4, r.w / 2 - half, 3);
      g.globalAlpha = 1;
      if (n.long) {
        g.fillStyle = fg;
        g.font = `7px ${FONT}`;
        g.textAlign = "center";
        g.fillText("HOLD", r.x + r.w / 2, r.y + r.h / 2);
      }
    }
  }

  // Notes just played: a held long note's gold, a hit's flash, a miss's red.
  notes.forEach((n, i) => {
    if (n.state === "pending" || n.ride || (i > 0 && notes[i - 1].on === n.on)) return;
    const age = (now - (n.at ?? now)) / tps;
    const rs = targets(n, w, h, sized);
    if (n.state === "hit") {
      if (n.long && game.holding(0, i) && now < n.on + n.dur) {
        g.fillStyle = gold;
        g.globalAlpha = 0.6;
        for (const r of rs) g.fillRect(r.x, r.y + r.h - 6, r.w * Math.min(1, (now - n.on) / n.dur), 5);
        g.globalAlpha = 1;
        return;
      }
      if (age > 0.25 || age < 0) return;
      g.fillStyle = shine;
      g.globalAlpha = 0.5 * (1 - age / 0.25);
      for (const r of rs) g.fillRect(r.x, r.y, r.w, r.h);
      g.globalAlpha = 1;
      return;
    }
    if (age > 0.35 || age < 0) return;
    g.fillStyle = wrong;
    g.globalAlpha = 0.4 * (1 - age / 0.35);
    for (const r of rs) g.fillRect(r.x, r.y, r.w, r.h);
    g.globalAlpha = 1;
  });

  // The grade, on the side played.
  const gr = game.grade;
  if (gr?.side) {
    const age = performance.now() - gr.at;
    if (age < 500) {
      g.globalAlpha = 1 - age / 500;
      g.fillStyle = gr.text === "PERFECT" ? gold : gr.text === "GOOD" ? fg : wrong;
      g.font = `8px ${FONT}`;
      g.textAlign = "center";
      g.fillText(gr.text, gr.side === "left" ? w / 4 : (3 * w) / 4, h / 2 - 20);
      g.globalAlpha = 1;
    }
  }

  g.fillStyle = tok("--tg-barline");
  g.fillRect(w / 2 - 1, 0, 2, h);
}
