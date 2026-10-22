/**
 * Painting the keys in the play area (D167): the rows of the voice played (with two voices, each half
 * its own), lowest at the bottom, the same rows as the music box's, each labelled with its letter at the
 * outer edge; the rows on the lines of the treble and bass staves carry a line, so the keys read like a
 * staff. A row lights up in the voice's colour as its next note comes (the light-up keys of piano
 * tutors), brightest on the beat; a held long note fills its row with gold as it lasts; a hit flashes,
 * a miss flashes red. The grade is written at the row's end.
 */
import { APPROACH_MS, type Game } from "./engine.ts";
import { stepName } from "./fugue.ts";
import { inkOf } from "./MusicBox.tsx";

const FONT = '"Press Start 2P", ui-monospace, monospace';
/** The staff steps on the lines: treble E4 G4 B4 D5 F5, bass G2 B2 D3 F3 A3 (C0 = 0). */
const LINES = new Set([30, 32, 34, 36, 38, 18, 20, 22, 24, 26]);

export function paintKeys(g: CanvasRenderingContext2D, w: number, h: number, game: Game) {
  const css = getComputedStyle(document.documentElement);
  const tok = (name: string) => css.getPropertyValue(name).trim() || "#fff";
  const shine = tok("--tg-shine");
  const gold = tok("--tg-gold");
  const wrong = tok("--tg-wrong");
  const fg = tok("--tg-fg");
  const muted = tok("--tg-muted");
  const grid = tok("--tg-grid");
  const now = game.now;
  const tps = game.tps;
  const approach = (APPROACH_MS / 1000) * tps;
  const count = game.f.voices.length;
  const split = game.tracks.length > 1;

  game.tracks.forEach((tr, k) => {
    const x0 = split ? (k === 0 ? 0 : w / 2) : 0;
    const x1 = split ? (k === 0 ? w / 2 : w) : w;
    const win = game.keys(k);
    const rowH = h / win.rows;
    const yOf = (row: number) => h - (row + 1) * rowH;
    const ink = inkOf(tr.lv.voice, count);
    const held = game.heldRows(k);

    // The rows: alternate shades, staff lines, letters.
    for (let r = 0; r < win.rows; r++) {
      const y = yOf(r);
      const step = win.lo + r;
      g.fillStyle = r % 2 ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.01)";
      g.fillRect(x0, y, x1 - x0, rowH);
      g.fillStyle = grid;
      g.fillRect(x0, y, x1 - x0, 1);
      if (LINES.has(step)) {
        g.fillStyle = muted;
        g.globalAlpha = 0.45;
        g.fillRect(x0, Math.round(y + rowH / 2), x1 - x0, 1);
        g.globalAlpha = 1;
      }
      if (held.includes(r)) {
        g.fillStyle = ink;
        g.globalAlpha = 0.28;
        g.fillRect(x0, y, x1 - x0, rowH);
        g.globalAlpha = 1;
      }
      g.fillStyle = muted;
      g.font = `${Math.min(9, Math.max(6, Math.floor(rowH / 4)))}px ${FONT}`;
      g.textBaseline = "middle";
      g.textAlign = split && k === 1 ? "right" : "left";
      g.fillText(stepName(step), split && k === 1 ? x1 - 6 : x0 + 6, y + rowH / 2);
    }

    // The coming notes light their rows; the nearest brightest.
    const notes = tr.lv.notes;
    let lit = 0;
    notes.forEach((n, i) => {
      if (n.ride || (i > 0 && notes[i - 1].on === n.on)) return;
      // A note beyond the keys lights the nearest edge row.
      const r = Math.max(0, Math.min(win.rows - 1, n.step - win.lo));
      if (n.on < win.from - approach || n.on >= win.to) return;
      const y = yOf(r);
      if (n.state === "pending") {
        const dt = n.on - now;
        if (dt > approach || dt < -game.opt.late || lit >= 3) return;
        lit++;
        const p = Math.max(0, Math.min(1, 1 - dt / approach));
        g.fillStyle = ink;
        g.globalAlpha = (lit === 1 ? 0.15 : 0.08) + (lit === 1 ? 0.5 : 0.2) * p * p;
        g.fillRect(x0, y + 1, x1 - x0, rowH - 2);
        // The beat closing in: a bar sweeping in from both ends, meeting in the middle on the beat.
        if (lit === 1) {
          const half = ((x1 - x0) / 2) * (1 - p);
          g.globalAlpha = 0.9;
          g.fillStyle = shine;
          g.fillRect(x0, y + rowH - 4, (x1 - x0) / 2 - half, 3);
          g.fillRect(x0 + (x1 - x0) / 2 + half, y + rowH - 4, (x1 - x0) / 2 - half, 3);
        }
        g.globalAlpha = 1;
        if (n.long && lit === 1) {
          g.fillStyle = fg;
          g.font = `7px ${FONT}`;
          g.textAlign = "center";
          g.fillText("HOLD", (x0 + x1) / 2, y + rowH / 2);
        }
        return;
      }
      const age = (now - (n.at ?? now)) / tps;
      if (n.state === "hit") {
        if (n.long && game.holding(k, i) && now < n.on + n.dur) {
          g.fillStyle = gold;
          g.globalAlpha = 0.55;
          g.fillRect(x0, y + rowH - 5, (x1 - x0) * Math.min(1, (now - n.on) / n.dur), 4);
          g.globalAlpha = 1;
          return;
        }
        if (age > 0.25) return;
        g.fillStyle = shine;
        g.globalAlpha = 0.6 * (1 - age / 0.25);
        g.fillRect(x0, y, x1 - x0, rowH);
        g.globalAlpha = 1;
        return;
      }
      if (age > 0.35) return;
      g.fillStyle = wrong;
      g.globalAlpha = 0.45 * (1 - age / 0.35);
      g.fillRect(x0, y, x1 - x0, rowH);
      g.globalAlpha = 1;
    });

    // The grade, at the end of the row where it was played.
    const gr = game.grade;
    if (gr && gr.track === k && gr.row !== undefined) {
      const age = performance.now() - gr.at;
      if (age < 500) {
        g.globalAlpha = 1 - age / 500;
        g.fillStyle = gr.text === "PERFECT" ? gold : gr.text === "GOOD" ? fg : wrong;
        g.font = `8px ${FONT}`;
        g.textAlign = split && k === 0 ? "left" : "right";
        g.textBaseline = "middle";
        const y = yOf(Math.max(0, Math.min(win.rows - 1, gr.row))) + rowH / 2;
        g.fillText(gr.text, split && k === 0 ? x0 + 40 : x1 - 40, y);
        g.globalAlpha = 1;
      }
    }
  });

  if (split) {
    g.fillStyle = tok("--tg-barline");
    g.fillRect(w / 2 - 1, 0, 2, h);
  }
}
