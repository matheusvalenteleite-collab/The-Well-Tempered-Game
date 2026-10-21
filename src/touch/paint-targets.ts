/**
 * Painting the targets in the play area (D166): each note to tap is a square in its voice's colour
 * with its name, and a frame closing in on it that meets it at the note's onset; a long note carries a
 * bar that fills while it is held; a dotted line leads to the next square; EASY's riding notes are
 * small dots that flash as they sound. A hit bursts; a miss leaves a red cross. The grade is written
 * beside the last tap.
 */
import type { Game } from "./engine.ts";
import { APPROACH_MS, TARGET } from "./targets.ts";
import { VOICE_INKS } from "./MusicBox.tsx";

const FONT = '"Press Start 2P", ui-monospace, monospace';

export function paintTargets(g: CanvasRenderingContext2D, w: number, h: number, game: Game, spell: Record<string, string>) {
  const css = getComputedStyle(document.documentElement);
  const tok = (name: string) => css.getPropertyValue(name).trim() || "#fff";
  const shine = tok("--tg-shine");
  const gold = tok("--tg-gold");
  const wrong = tok("--tg-wrong");
  const fg = tok("--tg-fg");
  const now = game.now;
  const tps = game.tps;
  const approach = (APPROACH_MS / 1000) * tps;
  const late = game.opt.late;
  const S = TARGET;

  game.tracks.forEach((tr, k) => {
    const notes = tr.lv.notes;
    const ink = VOICE_INKS[tr.lv.voice];
    // The next squares to tap, in order, for the dotted path.
    const upcoming = notes.filter((n, i) => !n.ride && n.state === "pending" && (i === 0 || notes[i - 1].on !== n.on) && n.on - now <= approach);
    g.setLineDash([3, 5]);
    g.strokeStyle = ink;
    g.globalAlpha = 0.35;
    g.lineWidth = 2;
    for (let i = 0; i + 1 < upcoming.length; i++) {
      g.beginPath();
      g.moveTo(upcoming[i].x! * w, upcoming[i].y! * h);
      g.lineTo(upcoming[i + 1].x! * w, upcoming[i + 1].y! * h);
      g.stroke();
    }
    g.setLineDash([]);
    g.globalAlpha = 1;

    notes.forEach((n, i) => {
      if (i > 0 && notes[i - 1].on === n.on) return; // a chord: one square
      const cx = Math.round(n.x! * w);
      const cy = Math.round(n.y! * h);
      const dt = n.on - now;
      if (n.ride) {
        if (dt > approach || now > n.on + n.dur) return;
        const sz = n.state === "hit" && now >= n.on ? 14 : 8;
        g.globalAlpha = n.state === "miss" ? 0.2 : 0.7;
        g.fillStyle = n.state === "hit" && now >= n.on ? shine : ink;
        g.fillRect(cx - sz / 2, cy - sz / 2, sz, sz);
        g.globalAlpha = 1;
        return;
      }
      if (n.state === "pending") {
        if (dt > approach || dt < -late) return;
        const p = Math.min(1, 1 - dt / approach);
        g.globalAlpha = 0.25 + 0.75 * p;
        g.fillStyle = ink;
        g.globalAlpha = 0.18 + 0.3 * p;
        g.fillRect(cx - S / 2, cy - S / 2, S, S);
        g.globalAlpha = 0.5 + 0.5 * p;
        g.strokeStyle = ink;
        g.lineWidth = 4;
        g.strokeRect(cx - S / 2 + 2, cy - S / 2 + 2, S - 4, S - 4);
        // The closing frame: meets the square at the onset.
        const F = S * (1 + 1.5 * (1 - p));
        g.globalAlpha = Math.min(1, 0.3 + p);
        g.strokeStyle = shine;
        g.lineWidth = 3;
        g.strokeRect(cx - F / 2, cy - F / 2, F, F);
        g.globalAlpha = 1;
        g.fillStyle = fg;
        g.font = `8px ${FONT}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText((spell[n.midi] ?? "").replace(/\d/, ""), cx, cy);
        if (n.long) {
          g.strokeStyle = ink;
          g.lineWidth = 2;
          g.strokeRect(cx - S / 2, cy + S / 2 + 5, S, 7);
          g.fillStyle = ink;
          g.font = `6px ${FONT}`;
          g.fillText("HOLD", cx, cy + S / 2 + 20);
        }
        return;
      }
      if (n.state === "hit") {
        const held = n.long && game.holding(k, i) && now < n.on + n.dur;
        if (held) {
          g.fillStyle = ink;
          g.fillRect(cx - S / 2, cy - S / 2, S, S);
          g.fillStyle = gold;
          g.fillRect(cx - S / 2, cy + S / 2 + 5, S * Math.min(1, (now - n.on) / n.dur), 7);
          g.strokeStyle = ink;
          g.lineWidth = 2;
          g.strokeRect(cx - S / 2, cy + S / 2 + 5, S, 7);
          return;
        }
        const age = (now - (n.at ?? now)) / tps;
        if (age > 0.3) return;
        const B = S * (1 + age * 2.2);
        g.globalAlpha = 1 - age / 0.3;
        g.strokeStyle = shine;
        g.lineWidth = 4;
        g.strokeRect(cx - B / 2, cy - B / 2, B, B);
        g.fillStyle = ink;
        g.fillRect(cx - S / 2, cy - S / 2, S, S);
        g.globalAlpha = 1;
        return;
      }
      // A miss: a red cross, fading.
      const age = (now - (n.at ?? now)) / tps;
      if (age > 0.45) return;
      g.globalAlpha = 1 - age / 0.45;
      g.strokeStyle = wrong;
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(cx - 14, cy - 14);
      g.lineTo(cx + 14, cy + 14);
      g.moveTo(cx + 14, cy - 14);
      g.lineTo(cx - 14, cy + 14);
      g.stroke();
      g.globalAlpha = 1;
    });
  });

  // The grade, beside the last tap.
  const gr = game.grade;
  if (gr && gr.x !== undefined && gr.y !== undefined) {
    const age = performance.now() - gr.at;
    if (age < 500) {
      g.globalAlpha = 1 - age / 500;
      g.fillStyle = gr.text === "PERFECT" ? gold : gr.text === "GOOD" ? fg : wrong;
      g.font = `9px ${FONT}`;
      g.textAlign = "center";
      g.fillText(gr.text, gr.x * w, gr.y * h - S / 2 - 12 - age / 25);
      g.globalAlpha = 1;
    }
  }
}
