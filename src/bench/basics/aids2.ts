/**
 * D687 (design studio; BASICS v2): the aids, on the real play screen. One ring per thumb where that thumb last
 * touched, in its colour; an arrow from the ring to the next note (on the bar of the thumb that should take it);
 * the gold line pulsing; long blocks draining while held; LIFT at the rests; after a miss, the move made shown
 * beside the move needed. In PROVE they fade. Every pulse slower than a second (no strobe); nothing brighter or
 * louder for a right or a wrong note.
 */
import { trCanvas } from "../../i18n/index.ts";
import { label } from "../paint-proto.ts";
import type { ProtoGame } from "../proto-game.ts";
import { BAR } from "../protos.ts";
import type { Aid } from "./plan.ts";

/** Each thumb's colour (the left warm, the right cool), as the rings and their arrows are drawn. */
export const THUMB_INK = { left: "#ffb35c", right: "#7fd0ff" } as const;
const GOLD = "#f3d78a";

export interface MissShown {
  side: "left" | "right";
  /** The tune's way (+1 up, −1 down, 0 the same) and the thumb's (from its last touch). */
  needed: number;
  made: number;
  /** Where the thumb touched before (the ring the two arrows start from), and where it touched now. */
  y0: number;
  y: number;
  at: number;
}

export interface AidsState {
  aids: readonly Aid[];
  /** 1 in DO; fading to 0 in PROVE. */
  alpha: number;
  /** One thumb: the side the arrows are drawn on. */
  side?: "left" | "right";
  miss: MissShown | null;
  /** D693 (6.2): the last join credited (thumb to thumb, no gap): when, and where the new note landed. */
  join?: { at: number; y: number } | null;
  /** The beat (ticks), to find the rests. */
  beat: number;
}

function arrow(c: CanvasRenderingContext2D, x: number, y0: number, y1: number, ink: string, dashed = false, width = 3) {
  const dy = y1 - y0;
  c.save();
  c.strokeStyle = ink;
  c.fillStyle = ink;
  c.lineWidth = width;
  if (dashed) c.setLineDash([4, 4]);
  if (Math.abs(dy) < 6) {
    // The same note: a small ring around the spot (stay).
    c.beginPath();
    c.arc(x, y0, 9, 0, Math.PI * 2);
    c.stroke();
    c.restore();
    return;
  }
  const d = Math.sign(dy);
  c.beginPath();
  c.moveTo(x, y0 + d * 12);
  c.lineTo(x, y1 - d * 8);
  c.stroke();
  c.setLineDash([]);
  c.beginPath();
  c.moveTo(x, y1);
  c.lineTo(x - 7, y1 - d * 10);
  c.lineTo(x + 7, y1 - d * 10);
  c.closePath();
  c.fill();
  c.restore();
}


/** The hold fill (from THE MANUAL's aids, D218): a held block filling as it is held, gold once held to its bound (75%). */
function holdFill(c: CanvasRenderingContext2D, g: ProtoGame) {
  const rows = g.rows!;
  const ns = g.tracks[0].notes;
  for (const hn of g.heldNotes()) {
    if (hn.k !== 0) continue;
    const n = ns[hn.i];
    if (!n) continue;
    const x0 = rows.xOf(n.on);
    const x1 = rows.xOf(n.on + n.dur);
    const share = Math.max(0, Math.min(1, (g.now - n.on) / Math.max(1, n.dur)));
    const y = rows.yOf(n.step);
    const hh = Math.max(4, rows.rowH * 1.4);
    const full = share >= 0.75;
    c.globalAlpha = 0.85;
    c.strokeStyle = full ? "#f3d78a" : "rgba(255,255,255,0.35)";
    c.lineWidth = 1;
    c.strokeRect(x0 + 0.5, y - hh / 2 + 0.5, Math.max(2, x1 - x0) - 1, hh - 1);
    c.globalAlpha = full ? 0.55 : 0.35;
    c.fillStyle = full ? "#f3d78a" : "#ffffff";
    c.fillRect(x0, y - hh / 2, (x1 - x0) * share, hh);
    c.globalAlpha = 0.7;
    c.fillStyle = "#f3d78a";
    c.fillRect(x0 + (x1 - x0) * 0.75, y - hh / 2 - 2, 1, hh + 4);
  }
  c.globalAlpha = 1;
}
export function paintBasics2(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, s: AidsState, now = performance.now()) {
  const rows = g.rows;
  if (!rows || s.alpha <= 0) return;
  const bw = w * BAR;
  const has = (a: Aid) => s.aids.includes(a);
  const barX = (side: "left" | "right") => (side === "left" ? bw / 2 : w - bw / 2);
  const notes = g.tracks[0]?.notes ?? [];
  const nextI = notes.findIndex((n) => n.state === "pending" && !n.ride);
  const next = nextI >= 0 ? notes[nextI] : undefined;
  const pulse = 0.5 + 0.5 * Math.sin(now / 450);
  c.save();
  c.globalAlpha = s.alpha;
  // The gold line, pulsing (a slow breath).
  if (has("gold")) {
    const x = rows.xOf(g.viewNow);
    const grd = c.createLinearGradient(x - 12, 0, x + 12, 0);
    grd.addColorStop(0, "rgba(243,215,138,0)");
    grd.addColorStop(0.5, `rgba(243,215,138,${0.18 + 0.22 * pulse})`);
    grd.addColorStop(1, "rgba(243,215,138,0)");
    c.fillStyle = grd;
    c.fillRect(x - 12, 0, 24, h);
  }
  // Long blocks drain while held.
  if (has("drain")) holdFill(c, g);
  // LIFT where a rest follows a note (over its end in the box), and on the bar while the rest lasts.
  if (has("lift")) {
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      const nx = notes[i + 1];
      const end = n.on + n.dur;
      if (nx && nx.on - end < s.beat * 0.75) continue;
      const x = rows.xOf(end);
      if (x < bw || x > w - bw) continue;
      label(c, trCanvas("LIFT"), x, rows.yOf(n.step) - 8, GOLD, 6);
      if (g.now >= end && (!nx || g.now < nx.on)) for (const side of ["left", "right"] as const) label(c, trCanvas("LIFT"), barX(side), h * 0.85, GOLD, 7);
    }
  }
  // While a miss is shown: its own ring (the touch before) and two arrows, nothing else on that bar.
  const missing = has("made") && !!s.miss && now - s.miss.at < 1800;
  // The rings: each thumb's last touch, in its colour; the arrow from the ring to the next note.
  for (const side of ["left", "right"] as const) {
    if (!has("rings")) break;
    const last = g.lastBySide[side];
    if (!last || (missing && s.miss?.side === side)) continue;
    c.strokeStyle = THUMB_INK[side];
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(barX(side), last.y, Math.max(10, bw * 0.16), 0, Math.PI * 2);
    c.stroke();
  }
  // (While a miss is shown, its two arrows only: no third.)
  if (has("arrow") && next && !missing) {
    const planned = g.plan.find((p) => p.i === nextI)?.side;
    const side = s.side ?? planned ?? "right";
    const last = g.lastBySide[side];
    const y1 = rows.yOf(next.step) + rows.rowH / 2;
    if (last) arrow(c, barX(side), last.y, y1, THUMB_INK[side]);
    else {
      // No touch yet on that thumb: where it may land, a soft target ring.
      c.strokeStyle = THUMB_INK[side];
      c.globalAlpha = s.alpha * (0.4 + 0.4 * pulse);
      c.beginPath();
      c.arc(barX(side), y1, Math.max(10, bw * 0.16), 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = s.alpha;
    }
    // TWO THUMBS: the bar of the thumb that takes the next note lit, the other quiet.
    if (has("sides") && planned) {
      const x0 = planned === "left" ? 0 : w - bw;
      c.fillStyle = `rgba(243,215,138,${0.05 + 0.07 * pulse})`;
      c.fillRect(x0, 0, bw, h);
    }
  }
  // D693 (6.2): a join made: a gold bridge across the box between the two bars at the new note's height, and NO
  // GAP over it; it fades over a second (one light a join, nothing for a gap).
  if (has("join") && s.join && now - s.join.at < 1000) {
    const k = 1 - (now - s.join.at) / 1000;
    c.globalAlpha = s.alpha * k;
    c.fillStyle = "rgba(243,215,138,0.35)";
    c.fillRect(bw, s.join.y - 3, w - 2 * bw, 6);
    label(c, trCanvas("NO GAP"), w / 2, s.join.y - 12, GOLD, 7);
    c.globalAlpha = s.alpha;
  }
  // After a miss: exactly two arrows from the ring of the touch before, labelled: what you did (dimmed, dashed)
  // and what was needed (gold).
  if (missing && s.miss) {
    const m = s.miss;
    const k = 1 - Math.max(0, (now - m.at - 1200) / 600);
    c.globalAlpha = s.alpha * k;
    const x = barX(m.side);
    const span = Math.max(28, rows.rowH * 3);
    c.strokeStyle = THUMB_INK[m.side];
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(x, m.y0, Math.max(10, bw * 0.16), 0, Math.PI * 2);
    c.stroke();
    const madeTo = m.made === 0 ? m.y0 : m.y0 - m.made * span;
    const needTo = m.needed === 0 ? m.y0 : m.y0 - m.needed * span;
    const dx = Math.max(16, bw * 0.2);
    arrow(c, x - dx, m.y0, madeTo, "rgba(236,230,214,0.6)", true, 2);
    arrow(c, x + dx, m.y0, needTo, GOLD);
    const ly = (to: number) => (to === m.y0 ? m.y0 + 22 : to + Math.sign(to - m.y0) * 12);
    label(c, trCanvas("YOU DID"), x - dx, ly(madeTo), "rgba(236,230,214,0.75)", 6);
    label(c, trCanvas("NEEDED"), x + dx, ly(needTo), GOLD, 6);
  }
  c.restore();
}

/**
 * D692 (design studio; BASICS v2, Act V): a line said at a moment of the music (5.2: Glenn, as the soprano
 * answers), on the box's top edge between the bars, small and unboxed; it fades in and out over a second and
 * never stops the music.
 */
export function paintCue(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, cue: { text: string; on: number; off: number }) {
  if (g.now < cue.on || g.now > cue.off) return;
  const span = Math.max(1, cue.off - cue.on);
  const k = Math.min(1, (g.now - cue.on) / (span * 0.08), (cue.off - g.now) / (span * 0.12));
  const bw = w * BAR;
  const max = w - 2 * bw - 48;
  const size = Math.round(Math.max(12, Math.min(16, h * 0.036)));
  c.save();
  c.globalAlpha = Math.max(0, k);
  c.font = `500 ${size}px system-ui, sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "top";
  const words = cue.text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const wd of words) {
    const t = line ? `${line} ${wd}` : wd;
    if (c.measureText(t).width > max && line) (lines.push(line), (line = wd));
    else line = t;
  }
  if (line) lines.push(line);
  const lh = size * 1.3;
  // Below the header (the title, pause and close), never over them.
  const y0 = Math.max(52, h * 0.13);
  c.fillStyle = "rgba(10,12,16,0.55)";
  const tw = Math.max(...lines.map((l) => c.measureText(l).width));
  c.fillRect(w / 2 - tw / 2 - 12, y0 - 6, tw + 24, lines.length * lh + 10);
  c.fillStyle = "#ece6d6";
  lines.forEach((l, i) => c.fillText(l, w / 2, y0 + i * lh));
  c.restore();
}

/**
 * D941 (design studio; the owner's playtest: "Glenn's message could remain visible on the screen somewhere, so that player
 * is able to remember what they need to do" and "needs not have a background box when it is displayed during exercise"):
 * the stage's line in a strip kept clear at the box's foot (BenchApp's floor: no note is drawn there), above the legend,
 * centred between the bars: plain text with a soft shadow, no box. It gives way while a cue speaks (5.2).
 */
export function paintInstruction(c: CanvasRenderingContext2D, w: number, h: number, text: string, strip: { top: number; bottom: number }) {
  const bw = w * BAR;
  const max = w - 2 * bw - 24;
  const room = strip.bottom - strip.top;
  if (room < 10 || max < 60) return;
  let size = Math.round(Math.max(11, Math.min(15, h * 0.034)));
  c.save();
  c.textAlign = "center";
  c.textBaseline = "middle";
  const fit = () => {
    c.font = `500 ${size}px system-ui, sans-serif`;
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const wd of words) {
      const t = line ? `${line} ${wd}` : wd;
      if (c.measureText(t).width > max && line) (lines.push(line), (line = wd));
      else line = t;
    }
    if (line) lines.push(line);
    return lines;
  };
  let lines = fit();
  while (lines.length * size * 1.2 > room && size > 10) (size -= 1), (lines = fit());
  const lh = size * 1.2;
  const y0 = (strip.top + strip.bottom) / 2 - ((lines.length - 1) * lh) / 2;
  c.shadowColor = "rgba(0,0,0,0.85)";
  c.shadowBlur = 4;
  c.shadowOffsetY = 1;
  c.fillStyle = "rgba(236,230,214,0.92)";
  lines.forEach((l, i) => c.fillText(l, w / 2, y0 + i * lh));
  c.restore();
}

