/**
 * D682 (design studio): BASICS's marks over the play area (on the thumbs' bars, never over the notes): the step's
 * one word by the thumbs, and its cue. TAP: a ring pulsing on each bar. ↑ ↓ and LEAPS: a light arrow on each bar
 * for the next note's way (longer for a leap), fading as the moves come right. TWO THUMBS: the bar of the
 * thumb the next note wants lit, left and right in turn. HOLD: the long block drains while it is held (the
 * tutorial's own fill). STRONG · SOFT: each bar's map, firm by the box, soft by the rim. Nothing flashes: every
 * pulse is slower than a second (no strobe), and nothing here is louder or brighter for a right or a wrong note.
 */
import { trCanvas } from "../../i18n/index.ts";
import { colourMap, holdFill } from "../manual/aids.ts";
import { label } from "../paint-proto.ts";
import type { ProtoGame } from "../proto-game.ts";
import { BAR } from "../protos.ts";
import type { BasicsTake } from "./basics.ts";

const GOLD = "#f3d78a";
const SOFT = "rgba(243,215,138,";

export interface BasicsInk {
  /** Moves made the right way so far in this step (the arrows fade with them). */
  learned: number;
  /** The surprise's sound now (its name, shown small). */
  soundName?: string;
}

function arrow(c: CanvasRenderingContext2D, x: number, y: number, up: boolean, len: number, alpha: number) {
  const d = up ? -1 : 1;
  c.strokeStyle = `${SOFT}${alpha})`;
  c.fillStyle = `${SOFT}${alpha})`;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x, y - (d * len) / 2);
  c.lineTo(x, y + (d * len) / 2);
  c.stroke();
  c.beginPath();
  c.moveTo(x, y + (d * len) / 2 + d * 6);
  c.lineTo(x - 6, y + (d * len) / 2 - d * 2);
  c.lineTo(x + 6, y + (d * len) / 2 - d * 2);
  c.closePath();
  c.fill();
}

export function paintBasics(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, t: BasicsTake, ink: BasicsInk, now = performance.now()) {
  const bw = w * BAR;
  const rows = g.rows;
  const notes = g.tracks[0]?.notes ?? [];
  const nextI = notes.findIndex((n) => n.state === "pending");
  const next = nextI >= 0 ? notes[nextI] : undefined;
  const prev = nextI > 0 ? notes[nextI - 1] : undefined;
  const pulse = 0.5 + 0.5 * Math.sin(now / 420);
  c.save();
  // The word, by the thumbs (the upper part of each bar, off the notes).
  if (t.kind === "play" || t.aid === "surprise") {
    // The surprise names each sound as it comes ("Pick any piece." is Glenn's, at the end).
    const word = trCanvas(t.aid === "surprise" ? (ink.soundName ?? "PIANO") : t.word);
    for (const x of [bw / 2, w - bw / 2]) label(c, word, x, Math.max(18, h * 0.12), GOLD, word.length > 8 ? 6 : 8);
  } else {
    // Glenn's take: LISTEN, small.
    for (const x of [bw / 2, w - bw / 2]) label(c, trCanvas("LISTEN"), x, Math.max(18, h * 0.12), "rgba(243,215,138,0.75)", 6);
  }
  if (t.kind !== "play" || !rows) return void c.restore();
  const y = next ? rows.yOf(next.step) + rows.rowH / 2 : h * 0.55;
  switch (t.aid) {
    case "tap": {
      // A ring on each bar, where the next note stands, breathing slowly.
      if (!next) break;
      for (const x of [bw / 2, w - bw / 2]) {
        c.strokeStyle = `${SOFT}${0.35 + 0.45 * pulse})`;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(x, y, Math.max(10, bw * 0.18) + 4 * pulse, 0, Math.PI * 2);
        c.stroke();
      }
      break;
    }
    case "arrows":
    case "leaps": {
      if (!next || !prev || next.midi === prev.midi) break;
      const fade = Math.max(0.18, 0.85 - ink.learned * 0.05);
      const len = Math.min(h * 0.3, 14 + Math.abs(next.step - prev.step) * (t.aid === "leaps" ? 6 : 3));
      const ay = rows.yOf(prev.step) + rows.rowH / 2;
      for (const x of [bw / 2, w - bw / 2]) arrow(c, x, ay, next.midi > prev.midi, len, fade);
      break;
    }
    case "alternate": {
      if (!next) break;
      // The thumb the plan gives the next note (else turn about), its bar lit.
      const side = g.plan.find((p) => p.i === nextI)?.side ?? (nextI % 2 ? "right" : "left");
      const x0 = side === "left" ? 0 : w - bw;
      const grd = c.createLinearGradient(x0, 0, x0 + bw, 0);
      const inner = side === "left" ? 1 : 0;
      grd.addColorStop(inner, `${SOFT}0.28)`);
      grd.addColorStop(1 - inner, `${SOFT}0.06)`);
      c.fillStyle = grd;
      c.fillRect(x0, 0, bw, h);
      break;
    }
    case "hold":
      holdFill(c, g);
      break;
    case "swell":
      colourMap(c, w, h, bw);
      break;
    default:
      break;
  }
  c.restore();
}
