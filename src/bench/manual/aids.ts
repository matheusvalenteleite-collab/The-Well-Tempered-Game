/**
 * D342, THE MANUAL's visual aids for Parts I–II (design 4.5), drawn over the play area after the game's
 * own picture, each for its lesson only, and kept quiet: hairlines, small type, a few seconds' fade.
 *   dial      I.1    the timing dial on the right bar (its lower half): each strike's tick on a short arc (early left,
 *                    late right), the take's mean so far in gold, its spread as a faint band
 *   trace     I.2,   the move trace: a hairline on the bar from the thumb's last touch to this one,
 *             II.2,  green when the way was right, red when not, the move a leap needed beside it, "="
 *             II.5   for a repeat
 *   repeat    I.3    the repeat band: faint, round each thumb's last touch, as wide as a repeat may land
 *   fill      I.4    the hold fill: the player's held block fills as it is held, gold at its bound
 *   letters   II.1   the thumb letters: L or R under each of the player's struck blocks (the first take)
 *   meter     II.3   the touch meter: a strip at the foot of the box, each note's hold from 0 to 1 over
 *                    the zones DETACHED, ORDINARY (from 0.62) and LEGATO (from 0.9)
 *   prepared  II.4   the prepared outline, clearer (a gold dashed frame, PREPARED), and PULL-OFF or
 *                    HAMMER-ON on the bar as a note is so sounded, P or H under its block in the box
 *   trend     II.6   the run's trend line: after each run its landings and the fitted line through them,
 *                    green for RUN ✓, red for RUN ✗
 */
import { MECH } from "../mechanics.ts";
import { label } from "../paint-proto.ts";
import type { ProtoGame } from "../proto-game.ts";
import { BAR, isRepeat } from "../protos.ts";
import type { LensTally } from "./lens.ts";
import type { AidId } from "./lessons.ts";

const GREEN = "#8fe3b0";
const RED = "#ff6b6b";
const GOLD = "#f3d78a";
const FAINT = "rgba(255,255,255,0.35)";
/** How long a trace, a tag, a trend line stays (ms). */
const FADE_MS = 1400;

/** The touch zones (intention.ts touchStyle's bounds: ORDINARY from 0.62, LEGATO from 0.9). */
export const ZONES = { ordinary: 0.62, legato: 0.9 };

export interface AidOptions {
  aids: readonly AidId[];
  /** The thumb letters only on the lesson's first take. */
  firstTake: boolean;
  now?: number;
}

export function paintAids(c: CanvasRenderingContext2D, w: number, h: number, g: ProtoGame, lens: LensTally, o: AidOptions) {
  const now = o.now ?? performance.now();
  const bw = w * BAR;
  const rows = g.rows;
  c.save();
  for (const a of o.aids) {
    if (a === "dial") dial(c, w, h, bw, lens, now);
    if (a === "trace") traces(c, w, bw, lens, now);
    if (a === "repeat" && rows) repeatBand(c, w, bw, g);
    if (a === "fill" && rows) holdFill(c, g);
    if (a === "letters" && rows && o.firstTake) letters(c, g, lens);
    if (a === "meter") meter(c, w, h, bw, lens);
    if (a === "prepared") prepared(c, w, bw, g, lens, now);
    if (a === "trend" && rows) trend(c, g, lens, now);
  }
  c.restore();
}

/** The timing dial: ±150 ms on an arc over the right bar. */
function dial(c: CanvasRenderingContext2D, w: number, h: number, bw: number, lens: LensTally, now: number) {
  const cx = w - bw / 2;
  const r = Math.max(18, Math.min(34, bw * 0.36));
  // Below the scoreboard, in the bar's quiet lower half.
  const cy = Math.max(150, h * 0.62);
  const span = 150;
  const ang = (ms: number) => -Math.PI / 2 + (Math.max(-span, Math.min(span, ms)) / span) * (Math.PI / 3);
  const at = (ms: number, rr: number) => [cx + rr * Math.cos(ang(ms)), cy + rr * Math.sin(ang(ms))] as const;
  c.globalAlpha = 0.9;
  c.strokeStyle = FAINT;
  c.lineWidth = 1;
  c.beginPath();
  c.arc(cx, cy, r, ang(-span), ang(span));
  c.stroke();
  // PERFECT's reach (MECH.perfectMs), faintly.
  c.strokeStyle = "rgba(243,215,138,0.35)";
  c.lineWidth = 3;
  c.beginPath();
  c.arc(cx, cy, r, ang(-MECH.perfectMs), ang(MECH.perfectMs));
  c.stroke();
  const recent = lens.strikes.slice(-8);
  recent.forEach((s, k) => {
    const [x0, y0] = at(s.offMs, r - 6);
    const [x1, y1] = at(s.offMs, r + 5);
    c.globalAlpha = k === recent.length - 1 ? Math.max(0.5, 1 - (now - s.at) / 2000) : 0.25 + (0.35 * k) / recent.length;
    c.strokeStyle = s.perfect ? GOLD : "#e8e3d6";
    c.lineWidth = k === recent.length - 1 ? 2 : 1;
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
  });
  const all = lens.strikes;
  c.globalAlpha = 1;
  if (all.length >= 3) {
    const mean = all.reduce((a, s) => a + s.offMs, 0) / all.length;
    const [mx, my] = at(mean, r + 9);
    c.fillStyle = GOLD;
    c.beginPath();
    c.arc(mx, my, 2.5, 0, Math.PI * 2);
    c.fill();
    const m = Math.round(mean);
    label(c, m < -10 ? `EARLY ${-m} MS` : m > 10 ? `LATE ${m} MS` : "ON TIME", cx, cy + 12, GOLD, 6);
  }
  label(c, "EARLY", cx - r, cy - r * 0.2 + 10, FAINT, 5);
  label(c, "LATE", cx + r, cy - r * 0.2 + 10, FAINT, 5);
}

/** The move trace: on the bar the thumb played, from its last touch to this one. */
function traces(c: CanvasRenderingContext2D, w: number, bw: number, lens: LensTally, now: number) {
  for (const t of lens.traces) {
    const age = now - t.at;
    if (age > FADE_MS) continue;
    const a = 1 - age / FADE_MS;
    const x = t.side === "left" ? bw * 0.72 : w - bw * 0.72;
    c.globalAlpha = 0.9 * a;
    c.strokeStyle = t.ok ? GREEN : RED;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x, t.fromY);
    c.lineTo(x, t.toY);
    c.stroke();
    c.fillStyle = t.ok ? GREEN : RED;
    c.fillRect(x - 3, t.fromY - 0.5, 6, 1);
    c.beginPath();
    c.arc(x, t.toY, 2.5, 0, Math.PI * 2);
    c.fill();
    if (t.need) label(c, t.need, t.side === "left" ? bw * 0.4 : w - bw * 0.4, (t.fromY + t.toY) / 2, t.ok ? GREEN : RED, 5);
  }
  c.globalAlpha = 1;
}

/** The repeat band round each thumb's last touch, stronger when the next note repeats. */
function repeatBand(c: CanvasRenderingContext2D, w: number, bw: number, g: ProtoGame) {
  const half = MECH.repeatRows * g.ladderRow;
  const nx = g.next();
  const rep = nx >= 0 && isRepeat(g.moves[nx]);
  for (const side of ["left", "right"] as const) {
    const t = g.lastBySide[side];
    if (!t) continue;
    const x = side === "left" ? 0 : w - bw;
    c.globalAlpha = rep ? 0.2 : 0.08;
    c.fillStyle = "#7fd6e8";
    c.fillRect(x, t.y - half, bw, 2 * half);
    c.globalAlpha = rep ? 0.6 : 0.25;
    c.fillRect(x, t.y - half, bw, 1);
    c.fillRect(x, t.y + half - 1, bw, 1);
    if (rep) label(c, "=", side === "left" ? bw * 0.15 : w - bw * 0.15, t.y, "#7fd6e8", 8);
  }
  c.globalAlpha = 1;
}

/** The hold fill: a held block filling as it is held, gold once held to its bound (D218's 75%). */
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
    c.strokeStyle = full ? GOLD : FAINT;
    c.lineWidth = 1;
    c.strokeRect(x0 + 0.5, y - hh / 2 + 0.5, Math.max(2, x1 - x0) - 1, hh - 1);
    c.globalAlpha = full ? 0.55 : 0.35;
    c.fillStyle = full ? GOLD : "#ffffff";
    c.fillRect(x0, y - hh / 2, (x1 - x0) * share, hh);
    // The bound itself: a tick at three quarters.
    c.globalAlpha = 0.7;
    c.fillStyle = GOLD;
    c.fillRect(x0 + (x1 - x0) * 0.75, y - hh / 2 - 2, 1, hh + 4);
  }
  c.globalAlpha = 1;
}

/** L or R under each struck block of the player's (within the box's view). */
function letters(c: CanvasRenderingContext2D, g: ProtoGame, lens: LensTally) {
  const rows = g.rows!;
  const ns = g.tracks[0].notes;
  for (let i = 0; i < ns.length; i++) {
    const n = ns[i];
    if (n.state !== "hit" || n.on < g.now - 2 * g.f.barTicks) continue;
    const side = lens.sideOf(i);
    if (!side) continue;
    label(c, side === "left" ? "L" : "R", rows.xOf(n.on) + 3, rows.yOf(n.step) + rows.rowH + 6, side === "left" ? "#9ecbff" : "#ffc58f", 6, "left");
  }
}

/** The touch meter: the last holds as bars over three zones, at the foot of the box. */
function meter(c: CanvasRenderingContext2D, w: number, h: number, bw: number, lens: LensTally) {
  const holds = lens.holds(16);
  const x0 = bw + 10;
  const mw = w - 2 * bw - 20;
  const mh = 26;
  // Above the box's legend (the voices' names, the last 30 px).
  const y0 = h - mh - 36;
  const yOf = (v: number) => y0 + mh - (Math.min(1.1, v) / 1.1) * mh;
  c.globalAlpha = 0.8;
  c.fillStyle = "rgba(0,0,0,0.45)";
  c.fillRect(x0, y0 - 2, mw, mh + 4);
  // The zones: DETACHED, ORDINARY, LEGATO.
  for (const [from, to, name, ink] of [
    [0, ZONES.ordinary, "DETACHED", "rgba(127,214,232,0.10)"],
    [ZONES.ordinary, ZONES.legato, "ORDINARY", "rgba(255,255,255,0.06)"],
    [ZONES.legato, 1.1, "LEGATO", "rgba(201,166,255,0.14)"],
  ] as const) {
    c.fillStyle = ink;
    c.fillRect(x0, yOf(to), mw, yOf(from) - yOf(to));
    label(c, name, x0 + 4, (yOf(from) + yOf(to)) / 2, FAINT, 4, "left");
  }
  const bwid = Math.max(3, Math.min(10, (mw - 70) / 16 - 2));
  holds.forEach((hd, k) => {
    const x = x0 + 66 + k * (bwid + 2);
    const ink = hd.hold >= ZONES.legato ? "#c9a6ff" : hd.hold >= ZONES.ordinary ? "#e8e3d6" : "#7fd6e8";
    c.globalAlpha = k === holds.length - 1 ? 1 : 0.7;
    c.fillStyle = ink;
    c.fillRect(x, yOf(hd.hold), bwid, y0 + mh - yOf(hd.hold));
  });
  c.globalAlpha = 1;
}

/** The prepared outline (clearer than D334's faint one), and PULL-OFF or HAMMER-ON over each note so sounded. */
function prepared(c: CanvasRenderingContext2D, w: number, bw: number, g: ProtoGame, lens: LensTally, now: number) {
  for (const s of g.heldSides()) {
    if (!s.armed) continue;
    const x = s.side === "left" ? 0 : w - bw;
    c.globalAlpha = 0.9;
    c.strokeStyle = GOLD;
    c.lineWidth = 2;
    c.setLineDash?.([5, 3]);
    c.strokeRect(x + 3, s.y - 18, bw - 6, 36);
    c.setLineDash?.([]);
    label(c, "PREPARED", x + bw / 2, s.y + 25, GOLD, 5);
  }
  const rows = g.rows;
  for (const t of lens.tags) {
    const age = now - t.at;
    if (age > FADE_MS) continue;
    c.globalAlpha = 1 - age / FADE_MS;
    const ink = t.word === "PULL-OFF" ? GOLD : "#e8e3d6";
    const n = g.tracks[0].notes[t.i];
    if (rows && n) label(c, t.word === "PULL-OFF" ? "P" : "H", rows.xOf(n.on) + 2, rows.yOf(n.step) + rows.rowH + 6, ink, 5, "left");
    const y = g.lastBySide[t.side]?.y;
    if (y !== undefined) label(c, t.word, t.side === "left" ? bw / 2 : w - bw / 2, y + 36, ink, 5);
  }
  c.globalAlpha = 1;
}

/** After each run: its landings and the line fitted through them. */
function trend(c: CanvasRenderingContext2D, g: ProtoGame, lens: LensTally, now: number) {
  const rows = g.rows!;
  for (const r of lens.trends) {
    const age = now - r.at;
    if (age > FADE_MS * 1.5 || r.pts.length < 2) continue;
    const a = 1 - age / (FADE_MS * 1.5);
    const ink = r.ok ? GREEN : RED;
    const pts = r.pts.map((p) => ({ x: rows.xOf(p.tick), y: p.y }));
    const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const sxx = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
    const slope = sxx > 0 ? pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / sxx : 0;
    c.globalAlpha = 0.8 * a;
    c.fillStyle = ink;
    for (const p of pts) c.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    c.strokeStyle = ink;
    c.lineWidth = 1.5;
    const xa = pts[0].x;
    const xb = pts[pts.length - 1].x;
    c.beginPath();
    c.moveTo(xa, my + slope * (xa - mx));
    c.lineTo(xb, my + slope * (xb - mx));
    c.stroke();
    label(c, r.ok ? "RUN ✓" : "RUN ✗", xb + 6, my + slope * (xb - mx), ink, 6, "left");
  }
  c.globalAlpha = 1;
}
