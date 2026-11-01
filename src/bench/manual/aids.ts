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
 *   letters   II.1   the thumb marks: ● or ○ under each of the player's struck blocks (the first take; D409)
 *   meter     II.3   the touch meter: a strip at the foot of the box, each note's hold from 0 to 1 over
 *                    the zones DETACHED, ORDINARY (from 0.62) and LEGATO (from 0.9)
 *   prepared  II.4   the prepared outline, clearer (a gold dashed frame, PREPARED), and PULL-OFF or
 *                    HAMMER-ON on the bar as a note is so sounded, P or H under its block in the box
 *   trend     II.6   the run's trend line: after each run its landings and the fitted line through them,
 *                    green for RUN ✓, red for RUN ✗
 *   breath    IV.1   D360: a comma over the box before each note the line may breathe into (after a written
 *                    rest or a cadence's arrival: ProtoGame.breathAt), gold once breathed (a BREATH grace)
 * D359 (the audit: the owner saw overlapping text): the practice room (Options.quiet) leaves the bars to
 * the aids; PULL-OFF and HAMMER-ON stand in a fixed slot at the bar's foot (they stacked on the verdict and
 * the articulation word); the touch meter draws the take's running median and, where a take asks for a
 * touch (III.1), its zone outlined; the timing dial marks a strike PERFECT by expressive time in gold with
 * its word (LEAN, BREATH, BROADER).
 */
import { MECH } from "../mechanics.ts";
import { label } from "../paint-proto.ts";
import type { ProtoGame } from "../proto-game.ts";
import { BAR, isRepeat } from "../protos.ts";
import type { LensTally } from "./lens.ts";
import type { AidId, TouchName } from "./lessons.ts";
import type { Side } from "../../touch/thumbs.ts";
import { trCanvas } from "../../i18n/index.ts";
import { drawThumbProxy, type ProxyOpts } from "../thumb-proxy.ts";
import { drawThumbMark } from "../fingering.ts";

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
  /** D360: the touch the take asks for (the meter outlines its zone). */
  ask?: TouchName;
  now?: number;
  /** D373: the music box's rectangle in the play area (the tour's frames, his words' arrow). */
  box?: { x: number; y: number; w: number; h: number };
  /** D373: 1.1's tour: the part that glows, and the strips touched so far. */
  tour?: { focus: TourFocus; left: boolean; right: boolean };
  /** D373: the step under way (WATCH: his thumbs whole and the next move named). */
  step?: "watch" | "try" | "play" | "tour";
}
export type TourFocus = "all" | "strips" | "box" | "notes" | "line" | "height";

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
    if (a === "meter") meter(c, w, h, bw, lens, o.ask);
    if (a === "breath" && rows) breaths(c, w, bw, g, lens);
    if (a === "prepared") prepared(c, w, h, bw, g, lens, now);
    if (a === "trend" && rows) trend(c, g, lens, now);
    if (a === "rest" && g.o.side) rest(c, w, h, bw, g.o.side === "left" ? "right" : "left");
    if (a === "count" && rows) counted(c, g, o.box);
    if (a === "plan" && rows) planLetters(c, g, o.box);
    if (a === "answer" && rows) answer(c, g);
    if (a === "point" && rows && o.box) point(c, g, o.box);
    if (a === "colour") colourMap(c, w, h, bw);
    // Design studio (D396, the owner: "we don't need A for buttons, because the L and R markings appearing in
    // synchrony with the thumbs movement is informative enough"): the path on the strips only where a lesson is
    // about where across the strip a thumb lands (6.4, colour); elsewhere the played notes keep their marks
    // (D409: ● and ○, sparse, never L or R).
    if (a === "thumbs" && rows && o.tour?.focus !== "height" && o.aids.includes("colour")) thumbPath(c, w, bw, g, true);
    if (a === "thumbs" && rows && o.tour?.focus !== "height") playedLetters(c, g, o.box, now);
    if (a === "thumbs" && rows && o.tour?.focus !== "height") thumbsA(c, w, h, bw, g, o.step ?? "play");
  }
  if (o.tour && rows) tour(c, w, h, bw, g, o.tour, o.box, now);
  c.restore();
}

const GRACE_WORD = { agogic: "LEAN", breath: "BREATH", broaden: "BROADER" } as const;

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
    c.strokeStyle = s.grace ? "#ffcf4a" : s.perfect ? GOLD : "#e8e3d6";
    c.lineWidth = k === recent.length - 1 || s.grace ? 2 : 1;
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
  });
  const all = lens.strikes;
  c.globalAlpha = 1;
  // D359: the last strike PERFECT by expressive time, named for a moment.
  const last = recent.at(-1);
  if (last?.grace && now - last.at < 1500) {
    c.globalAlpha = 1 - (now - last.at) / 1500;
    label(c, `${GRACE_WORD[last.grace]} ✓`, cx, cy - r - 10, "#ffcf4a", 6);
    c.globalAlpha = 1;
  }
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

/** The thumb under each struck block of the player's (within the box's view). D409: ● the thumb of the take's first note, ○ the other, never L or R. */
function letters(c: CanvasRenderingContext2D, g: ProtoGame, lens: LensTally) {
  const rows = g.rows!;
  const ns = g.tracks[0].notes;
  let first: Side | null = null;
  for (let i = 0; i < ns.length; i++) {
    const n = ns[i];
    if (n.state !== "hit") continue;
    const side = lens.sideOf(i);
    if (!side) continue;
    first ??= side;
    if (n.on < g.now - 2 * g.f.barTicks) continue;
    drawThumbMark(c, rows.xOf(n.on) + 5, rows.yOf(n.step) + rows.rowH + 6, MARK_R, side === first ? "A" : "B", LETTER_INK);
  }
}

/** The touch meter: the last holds as bars over three zones, at the foot of the box. */
function meter(c: CanvasRenderingContext2D, w: number, h: number, bw: number, lens: LensTally, ask?: TouchName) {
  const holds = lens.holds(16);
  const x0 = bw + 10;
  const mw = w - 2 * bw - 20;
  // D359: tall enough for its three zones and their names (26 px stacked the names).
  const mh = 44;
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
    label(c, name, x0 + 4, (yOf(from) + yOf(to)) / 2, ask === name ? GOLD : FAINT, 4, "left");
  }
  // D360: the zone the take asks for, outlined.
  if (ask) {
    const [from, to] = ask === "LEGATO" ? [ZONES.legato, 1.1] : ask === "ORDINARY" ? [ZONES.ordinary, ZONES.legato] : [0, ZONES.ordinary];
    c.globalAlpha = 0.9;
    c.strokeStyle = GOLD;
    c.lineWidth = 1;
    c.strokeRect(x0 + 0.5, yOf(to) + 0.5, mw - 1, yOf(from) - yOf(to) - 1);
  }
  const bwid = Math.max(3, Math.min(10, (mw - 70) / 16 - 2));
  // D360: the take's running median hold: the touch it is keeping.
  if (holds.length >= 3) {
    const sorted = holds.map((x) => x.hold).sort((a, b) => a - b);
    const med = sorted[sorted.length >> 1];
    c.globalAlpha = 0.9;
    c.fillStyle = GOLD;
    c.fillRect(x0 + 62, Math.round(yOf(med)), mw - 66, 1);
  }
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
function prepared(c: CanvasRenderingContext2D, w: number, h: number, bw: number, g: ProtoGame, lens: LensTally, now: number) {
  for (const s of g.heldSides()) {
    if (!s.armed) continue;
    const x = s.side === "left" ? 0 : w - bw;
    c.globalAlpha = 0.9;
    c.strokeStyle = GOLD;
    c.lineWidth = 2;
    c.setLineDash?.([5, 3]);
    c.strokeRect(x + 3, s.y - 18, bw - 6, 36);
    c.setLineDash?.([]);
    // Inside the frame's corner (above it, the guide's LIFT stands; below it, the verdict).
    label(c, "PREPARED", x + 7, s.y - 12, GOLD, 4, "left");
  }
  const rows = g.rows;
  for (const t of lens.tags) {
    const age = now - t.at;
    if (age > FADE_MS) continue;
    c.globalAlpha = 1 - age / FADE_MS;
    const ink = t.word === "PULL-OFF" ? GOLD : "#e8e3d6";
    const n = g.tracks[0].notes[t.i];
    if (rows && n) label(c, t.word === "PULL-OFF" ? "P" : "H", rows.xOf(n.on) + 2, rows.yOf(n.step) + rows.rowH + 6, ink, 5, "left");
    // A fixed slot near the bar's foot (it stacked on the verdict and the words at the thumb's height).
    label(c, t.word, t.side === "left" ? bw / 2 : w - bw / 2, h - 44, ink, 6);
  }
  c.globalAlpha = 1;
}

/** D360: a comma over each coming note the line may breathe into; gold once breathed. */
function breaths(c: CanvasRenderingContext2D, w: number, bw: number, g: ProtoGame, lens: LensTally) {
  const rows = g.rows!;
  const ns = g.tracks[0].notes;
  const span = 3 * g.f.barTicks;
  for (let i = 1; i < ns.length; i++) {
    const n = ns[i];
    if (n.ride || ns[i - 1].on === n.on || n.on < g.now - span * 0.25 || n.on > g.now + span) continue;
    if (!g.breathAt(i)) continue;
    const x = rows.xOf(n.on) - Math.max(4, rows.rowH);
    if (x < bw || x > w - bw) continue;
    const y = rows.yOf(n.step) - rows.rowH * 2.2;
    const taken = n.state === "hit" && lens.strikes.some((s) => s.grace === "breath");
    c.globalAlpha = 0.9;
    label(c, ",", x, y, taken ? "#ffcf4a" : "#e8e3d6", 12);
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

// D373, THE TUTORIAL's aids (Mario's designs: tut-watch, tut-play, tut-01-tour; the thumbs his model A).

/**
 * D374: the thumb in the tutorial, the abstract proxy (thumb-proxy.ts; D373's model A, nail and knuckle,
 * dropped: the owner). `lift` 0 pressing (a filled disc), 1 resting (a thin ring), between the ghost of
 * where it goes next (a dotted ring); prepared (resting early on the next note) a dotted blue ring round
 * the pressing disc. The wedge points to the thumb's lower outer corner of the phone.
 */
export function drawThumbA(c: CanvasRenderingContext2D, x: number, y: number, size: number, side: Side, lift: number, alpha = 1, prepared = false, o?: ProxyOpts) {
  const l = Math.max(0, Math.min(1, lift));
  drawThumbProxy(c, x, y, size, side, l === 0 ? "press" : l >= 0.9 ? "rest" : "prep", alpha, o);
  if (prepared && l === 0) drawThumbProxy(c, x, y, size * 1.5, side, "prep", alpha, { beam: 0 });
}

/** D374: the pressing proxy's ripple and trail (kept). */
const PROXY_O: ProxyOpts = {};

/** Where a thumb rests on its strip (across): its tip toward the box. */
const restX = (w: number, bw: number, side: Side) => (side === "left" ? bw * 0.72 : w - bw * 0.72);

/** The words for the next move, from where the thumb is to where the note lands. */
function moveWord(from: number | undefined, to: number): string {
  if (from === undefined) return "";
  const d = to - from;
  if (Math.abs(d) < 0.5) return "NEXT: THE SAME NOTE";
  if (d >= 3) return "NEXT: A BIG JUMP UP";
  if (d <= -3) return "NEXT: A BIG JUMP DOWN";
  return d > 0 ? "NEXT: A LITTLE HIGHER" : "NEXT: A LITTLE LOWER";
}

/**
 * Both thumbs, always there (the owner: "the thumbs should not disappear … they ought to become
 * shadowed"): pressing where a touch is down (his in a WATCH, yours in TRY and PLAY), resting over their
 * shadows where they last were otherwise; the ghost of the next move (the plan's thumb hovering where the
 * next note lands, an arrow from where it rests), named in WATCH and TRY.
 */
function thumbsA(c: CanvasRenderingContext2D, w: number, h: number, bw: number, g: ProtoGame, step: "watch" | "try" | "play" | "tour") {
  const rows = g.rows!;
  const size = Math.max(14, Math.min(26, bw * 0.24));
  const notes = g.tracks[0].notes;
  const plan = g.plan;
  const next = plan.find((p) => notes[p.i]?.state === "pending");
  const downs = g.thumbsDown();
  const mid = next ? rows.yOf(next.step) : h * 0.55;
  for (const side of ["left", "right"] as const) {
    const d = downs.find((x) => x.side === side);
    if (d) {
      const armed = !!g.heldSides().find((x) => x.side === side)?.armed;
      // His thumbs (WATCH) drawn whole; yours a little see-through, not to cover the place you aim at.
      // D374: a ripple as it lands, a short trail while it moves.
      const since = d.t0 !== undefined ? performance.now() - d.t0 : -1;
      PROXY_O.ripple = since >= 0 && since < 350 ? since / 350 : undefined;
      PROXY_O.trailY = d.was;
      drawThumbA(c, step === "watch" ? Math.max(size, Math.min(w - size, d.fx * w)) : restX(w, bw, side), d.y, size, side, 0, step === "watch" ? 1 : 0.6, armed, PROXY_O);
      continue;
    }
    const last = g.lastBySide[side];
    const y = last ? last.y : side === "left" ? mid + rows.rowH * 2 : mid - rows.rowH * 2;
    drawThumbA(c, restX(w, bw, side), Math.max(size, Math.min(h - size, y)), size, side, 1, g.o.side && g.o.side !== side ? 0.45 : 0.85);
  }
  if (!next) return;
  const ahead = ((notes[next.i].on - g.now) / g.tps) * 1000;
  if (ahead > 1800) return;
  const side = next.side;
  if (downs.some((d) => d.side === side)) return;
  const y = rows.yOf(next.step);
  const from = g.lastBySide[side];
  drawThumbA(c, restX(w, bw, side), y, size, side, 0.5, Math.max(0.3, Math.min(0.7, 1 - ahead / 1800)));
  if (from && Math.abs(from.y - y) > 4) {
    c.globalAlpha = 0.7;
    c.strokeStyle = GOLD;
    c.lineWidth = 1.5;
    const ax = side === "left" ? bw * 0.3 : w - bw * 0.3;
    const dy = y < from.y ? 1 : -1;
    c.beginPath();
    c.moveTo(ax, from.y);
    c.lineTo(ax, y);
    c.moveTo(ax - 4, y + dy * 6);
    c.lineTo(ax, y);
    c.lineTo(ax + 4, y + dy * 6);
    c.stroke();
    c.globalAlpha = 1;
  }
  if (step === "watch" || step === "try") {
    const word = moveWord(from?.step, next.step);
    if (word) label(c, word, side === "left" ? bw / 2 : w - bw / 2, Math.min(h - 12, y + size * 1.3), GOLD, 6);
  }
}

/**
 * D379 (the owner: "The shadows of earlier thumbs should remain in place, perhaps in a gradient of opacity
 * up to the current one, so one can see the whole movement at once when it's finished"): every touch of
 * the step (his in a WATCH, the player's in a TRY or PLAY) leaves a small marker where it landed, at its
 * own height on its own strip (each later one a step toward the box, so the path reads in order and a
 * repeated note never hides the one before); a slide adds one where it arrives. Each thumb's markers joined in order by a
 * thin line (the left's gold, the right's blue, so the two paths read apart), the older fainter, the
 * latest full; numbered in order while there are few. Kept for the whole step (and held a moment after
 * its end, BenchApp PATH_HOLD_MS), fresh for each step (one per game).
 */
type PathMark = { side: Side; x: number; y: number; t0: number };
const PATHS = new WeakMap<ProtoGame, PathMark[]>();
const PATH_INK: Record<Side, string> = { left: "#f3d78a", right: "#8cc4ff" };
/** At most so many markers drawn (the latest), and numbered while the step has no more than this. */
const PATH_MAX = 40;
const PATH_NUMBERED = 16;
export function thumbPath(c: CanvasRenderingContext2D, w: number, bw: number, g: ProtoGame, across = false) {
  const rows = g.rows!;
  let marks = PATHS.get(g);
  if (!marks) PATHS.set(g, (marks = []));
  for (const d of g.thumbsDown()) {
    const t0 = d.t0 ?? 0;
    const x = Math.max(4, Math.min(w - 4, d.fx * w));
    const mine = marks.filter((m) => m.t0 === t0 && m.side === d.side).at(-1);
    // A new touch, or the same thumb slid a row or more since its last marker.
    if (!mine || Math.abs(mine.y - d.y) >= rows.rowH * 0.9) marks.push({ side: d.side, x, y: d.y, t0 });
  }
  const shown = marks.slice(-PATH_MAX);
  const n = shown.length;
  if (!n) return;
  const alphaOf = (j: number) => 0.18 + (0.67 * (j + 1)) / n;
  c.save();
  for (const side of ["left", "right"] as const) {
    const raw = shown.map((m, j) => ({ m, j })).filter(({ m }) => m.side === side);
    // Read in order like a line of music: each later touch a step further toward the box, from where the
    // thumb first landed (a repeated note no longer hides the one before it), within the strip.
    const step = raw.length > 1 ? Math.max(5, Math.min(14, (bw - 24) / (raw.length - 1))) : 0;
    const dir = side === "left" ? 1 : -1;
    const lo = side === "left" ? 6 : w - bw + 6;
    const hi = side === "left" ? bw - 6 : w - 6;
    const x0 = raw.length ? Math.max(lo, Math.min(hi - (raw.length - 1) * step * (dir > 0 ? 1 : 0), raw[0].m.x)) : 0;
    const start = dir > 0 ? Math.min(x0, hi - (raw.length - 1) * step) : Math.max(x0, lo + (raw.length - 1) * step);
    // D379 (6.4): where the lesson is about where across the strip a thumb lands, each marker where it landed.
    const pts = raw.map(({ m, j }, k) => ({ j, x: across ? m.x : Math.max(lo, Math.min(hi, start + dir * k * step)), y: m.y }));
    c.strokeStyle = PATH_INK[side];
    c.lineWidth = 1.5;
    for (let k = 1; k < pts.length; k++) {
      c.globalAlpha = alphaOf(pts[k].j) * 0.75;
      c.beginPath();
      c.moveTo(pts[k - 1].x, pts[k - 1].y);
      c.lineTo(pts[k].x, pts[k].y);
      c.stroke();
    }
    for (const { x, y, j } of pts) {
      c.globalAlpha = alphaOf(j);
      c.fillStyle = PATH_INK[side];
      c.beginPath();
      c.arc(x, y, j === n - 1 ? 5 : 3.5, 0, Math.PI * 2);
      c.fill();
      if (marks.length <= PATH_NUMBERED && !across) label(c, String(j + 1), x, y - 10, PATH_INK[side], 6);
    }
  }
  c.restore();
}

/**
 * D379 (6.4, colour: the mechanics report's free dimension, §5 Luigi 4 and Mario 3): each strip's map
 * across its width: firm and bright by the box (its inner edge), soft and dark out by the phone's edge.
 * Never a verdict: the sound only (D311).
 */
function colourMap(c: CanvasRenderingContext2D, w: number, h: number, bw: number) {
  const y = h * 0.88;
  for (const side of ["left", "right"] as const) {
    const x0 = side === "left" ? 0 : w - bw;
    const inner = side === "left" ? x0 + bw : x0;
    const outer = side === "left" ? x0 : x0 + bw;
    const grad = c.createLinearGradient(inner, 0, outer, 0);
    grad.addColorStop(0, "rgba(255,226,150,0.85)");
    grad.addColorStop(1, "rgba(80,70,120,0.35)");
    c.fillStyle = grad;
    c.fillRect(x0 + 4, y, bw - 8, 6);
    const lx = (at: number) => Math.max(x0 + 22, Math.min(x0 + bw - 22, at));
    label(c, "FIRM", lx(inner + (side === "left" ? -18 : 18)), y - 8, "#ffe296", 6);
    label(c, "SOFT", lx(outer + (side === "left" ? 18 : -18)), y - 8, "#a59cc8", 6);
  }
}

/** A thumb not in use: its strip dimmed, REST. */
function rest(c: CanvasRenderingContext2D, w: number, h: number, bw: number, side: Side) {
  const x = side === "left" ? 0 : w - bw;
  c.fillStyle = "rgba(10,8,14,0.45)";
  c.fillRect(x, 0, bw, h);
  label(c, "REST", x + bw / 2, h * 0.8, "#b8b0d6", 9);
  label(c, "THIS THUMB SITS OUT", x + bw / 2, h * 0.8 + 16, "#8e87ac", 6);
}

/** The player's notes in the passage, in order (heads only). */
function heads(g: ProtoGame) {
  const ns = g.tracks[0].notes;
  return ns.map((n, i) => ({ n, i })).filter(({ n, i }) => !n.ride && !(i > 0 && ns[i - 1].on === n.on));
}
const inBox = (x: number, box?: { x: number; w: number }) => !box || (x > box.x - 2 && x < box.x + box.w - 6);

/** 1, 2, 3 … over the player's notes (pointing at them one by one). */
function counted(c: CanvasRenderingContext2D, g: ProtoGame, box?: { x: number; w: number }) {
  const rows = g.rows!;
  heads(g).forEach(({ n }, k) => {
    const x = rows.xOf(n.on);
    if (!inBox(x, box) || k > 15) return;
    label(c, String(k + 1), x + 6, rows.yOf(n.step) - rows.rowH - 8, n.state === "pending" ? GOLD : FAINT, 7);
  });
}

/**
 * D409 (the owner: "the editor doesn't suggest fingerings for ALL notes"; "two distinct symbols meaning one
 * thumb and the other, without settling a particular order"): the plan's marks on the player's notes to come,
 * faint, only where the plan marks them (fingering.ts suggestionMarks: the start, a same-thumb repeat, after a
 * rest or a slide, the first leap let go, a reminder); ● one thumb, ○ the other, either way round; elsewhere
 * plain alternation is implied. A lesson that teaches one thumb alone (`o.side`) draws none: its words name
 * the hand. `every` (1.4, TAKING TURNS, where the marks are introduced): a mark on every note.
 */
function planLetters(c: CanvasRenderingContext2D, g: ProtoGame, box?: { x: number; w: number }) {
  if (g.o.side) return;
  const rows = g.rows!;
  const notes = g.tracks[0].notes;
  const every = g.o.everyMark;
  const marks = g.planMarks;
  const first = g.plan.find((t) => !t.slid)?.side;
  for (const t of g.plan) {
    const n = notes[t.i];
    // Design studio (D396): the plan's marks only on notes still to come, faint, in the thumbs' one ink;
    // a played note shows the thumb that played it (playedLetters).
    if (!n || t.slid || n.state !== "pending") continue;
    const m = marks.get(t.i);
    if (!m && !every) continue;
    const x = rows.xOf(n.on);
    if (!inBox(x, box)) continue;
    drawThumbMark(c, x + 6, rows.yOf(n.step) + rows.rowH + 8, MARK_R, m?.thumb ?? (t.side === first ? "A" : "B"), LETTER_INK, 0.45);
  }
}

/**
 * Design studio (D396): under each played note, the thumb that played it, appearing as the thumb lands (a short
 * flash, the mark a size larger, settling): his thumbs in a WATCH, yours in a TRY or PLAY. One ink for both
 * thumbs (the owner: "share"), the thumbs' cream. Which thumb: the one down nearest the note's height when it is
 * first seen struck, else the plan's. D409: neutral marks, ● the thumb that took the first marked note and ○
 * the other (never L or R), and only on the notes the plan marks (every note in 1.4); none in a one-thumb
 * lesson. Drawing only; nothing judged.
 */
const PLAYED = new WeakMap<ProtoGame, { first: Side | null; seen: Map<number, { side: Side; t: number }> }>();
const LETTER_INK = "#fff3b0";
const FLASH_MS = 350;
/** D409: a mark's radius (px), settled. */
const MARK_R = 2.6;
function playedLetters(c: CanvasRenderingContext2D, g: ProtoGame, box: { x: number; w: number } | undefined, now: number) {
  if (g.o.side) return;
  const rows = g.rows!;
  const notes = g.tracks[0].notes;
  let rec = PLAYED.get(g);
  if (!rec) PLAYED.set(g, (rec = { first: null, seen: new Map() }));
  const downs = g.thumbsDown();
  const marks = g.planMarks;
  const every = g.o.everyMark;
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    if (n.state !== "hit" || n.ride || (!every && !marks.has(i))) continue;
    let mark = rec.seen.get(i);
    if (!mark) {
      const y = rows.yOf(n.step);
      const near = downs.reduce<{ side: Side; d: number } | null>((b, d) => (!b || Math.abs(d.y - y) < b.d ? { side: d.side, d: Math.abs(d.y - y) } : b), null);
      const side = near?.side ?? g.plan.find((t) => t.i === i)?.side;
      if (!side) continue;
      rec.first ??= side;
      rec.seen.set(i, (mark = { side, t: now }));
    }
    const x = rows.xOf(n.on);
    if (!inBox(x, box)) continue;
    const y = rows.yOf(n.step) + rows.rowH + 8;
    const k = Math.min(1, (now - mark.t) / FLASH_MS);
    if (k < 1) {
      c.save();
      c.globalAlpha = 0.5 * (1 - k);
      c.fillStyle = LETTER_INK;
      c.beginPath();
      c.arc(x + 6, y, 6 + 8 * k, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    drawThumbMark(c, x + 6, y, k < 1 ? MARK_R + 1 : MARK_R, mark.side === rec.first ? "A" : "B", LETTER_INK);
  }
}

/** YOU ANSWER HERE under the player's first note (1.5). */
function answer(c: CanvasRenderingContext2D, g: ProtoGame) {
  const rows = g.rows!;
  const first = heads(g)[0]?.n;
  if (!first || first.state !== "pending") return;
  label(c, "YOU ANSWER HERE", rows.xOf(first.on), rows.yOf(first.step) + rows.rowH + 18, GOLD, 7, "left");
}

/** The sign a note bears in the lesson's own reading (its name, D370's vocabulary). */
function signOf(g: ProtoGame, on: number): string | null {
  const rd = g.o.reading;
  const at = g.o.readingAt;
  if (!rd || !at) return null;
  const n = rd.notes[at.indexOf(on)];
  if (!n) return null;
  return n.short ? "SHORT" : n.accent ? "ACCENT" : n.join === true ? "JOINED" : n.join === false ? "DETACHED" : null;
}

/** An arrow from his words (over the foot of the box) to the next of your notes, its sign named over it. */
function point(c: CanvasRenderingContext2D, g: ProtoGame, box: { x: number; y: number; w: number; h: number }) {
  const rows = g.rows!;
  const next = heads(g).find(({ n }) => n.state === "pending")?.n;
  if (!next) return;
  const x = rows.xOf(next.on) + 4;
  if (x > box.x + box.w - 8 || x < box.x) return;
  const y = rows.yOf(next.step) + rows.rowH + 3;
  const y0 = box.y + box.h - 92;
  if (y0 - y < 12) return;
  const x0 = box.x + box.w * 0.42;
  c.save();
  c.strokeStyle = GOLD;
  c.globalAlpha = 0.85;
  c.lineWidth = 1.5;
  const a = Math.atan2(y - y0, x - x0);
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x, y);
  c.moveTo(x - 7 * Math.cos(a - 0.4), y - 7 * Math.sin(a - 0.4));
  c.lineTo(x, y);
  c.lineTo(x - 7 * Math.cos(a + 0.4), y - 7 * Math.sin(a + 0.4));
  c.stroke();
  c.restore();
  const sign = signOf(g, next.on);
  if (sign) label(c, sign, x, rows.yOf(next.step) - rows.rowH - 10, GOLD, 7);
}

/**
 * 1.1, the play screen explained on the play screen (Mario's tut-01-tour): the part he is speaking of
 * glows in gold, the rest dims; the strips ask to be touched (left, then right).
 */
function tour(c: CanvasRenderingContext2D, w: number, h: number, bw: number, g: ProtoGame, t: { focus: TourFocus; left: boolean; right: boolean }, box: { x: number; y: number; w: number; h: number } | undefined, now: number) {
  const rows = g.rows!;
  const b = box ?? { x: bw, y: 0, w: w - 2 * bw, h };
  const dim = (x: number, y: number, ww: number, hh: number) => {
    c.fillStyle = "rgba(6,5,10,0.55)";
    c.fillRect(x, y, ww, hh);
  };
  const frame = (x: number, y: number, ww: number, hh: number) => {
    c.strokeStyle = GOLD;
    c.globalAlpha = 0.65 + 0.3 * Math.sin(now / 300);
    c.lineWidth = 2;
    c.strokeRect(x + 1, y + 1, ww - 2, hh - 2);
    c.globalAlpha = 1;
  };
  const tag = (text: string, x: number, y: number, align: "left" | "right" = "left") => {
    c.font = `7px "Press Start 2P", monospace`;
    const tw = c.measureText(trCanvas(text)).width;
    const x0 = align === "right" ? x - tw - 8 : x;
    c.fillStyle = "#fff0b0";
    c.fillRect(x0, y - 7, tw + 8, 14);
    label(c, text, x0 + 4, y, "#12101a", 7, "left");
  };
  const mine = heads(g).filter(({ n }) => inBox(rows.xOf(n.on), b));
  switch (t.focus) {
    case "all":
      frame(b.x, b.y, b.w, b.h);
      break;
    case "strips":
      dim(b.x, b.y, b.w, b.h);
      frame(0, 0, bw, h);
      frame(w - bw, 0, bw, h);
      tag("LEFT THUMB", 10, 18);
      tag("RIGHT THUMB", w - 10, 18, "right");
      label(c, t.left ? "✓" : "TOUCH THE LEFT STRIP", bw / 2, h * 0.3, t.left ? "#8fe3b0" : GOLD, t.left ? 14 : 6);
      if (t.left) label(c, t.right ? "✓" : "NOW THE RIGHT STRIP", w - bw / 2, h * 0.3, t.right ? "#8fe3b0" : GOLD, t.right ? 14 : 6);
      break;
    case "box": {
      dim(0, 0, bw, h);
      dim(w - bw, 0, bw, h);
      frame(b.x, b.y, b.w, b.h);
      const y = b.y + 22;
      tag("THE MUSIC MOVES THIS WAY", b.x + b.w - 70, y, "right");
      c.strokeStyle = "#fff0b0";
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(b.x + b.w - 14, y);
      c.lineTo(b.x + b.w - 66, y);
      c.lineTo(b.x + b.w - 58, y - 4);
      c.moveTo(b.x + b.w - 66, y);
      c.lineTo(b.x + b.w - 58, y + 4);
      c.stroke();
      break;
    }
    case "notes": {
      dim(0, 0, bw, h);
      dim(w - bw, 0, bw, h);
      if (mine.length) {
        const xs = mine.map(({ n }) => rows.xOf(n.on));
        const ys = mine.map(({ n }) => rows.yOf(n.step));
        const x0 = Math.max(b.x + 2, Math.min(...xs) - 6);
        const x1 = Math.min(b.x + b.w - 4, Math.max(...mine.map(({ n }) => rows.xOf(n.on + n.dur))) + 6);
        const y0 = Math.min(...ys) - rows.rowH - 6;
        const y1 = Math.max(...ys) + rows.rowH + 6;
        frame(x0, y0, x1 - x0, y1 - y0);
        tag("YOURS: WHITE BORDER", x0, y0 - 10);
      }
      const nowX = rows.xOf(g.now);
      const other = g.others.find((n) => inBox(rows.xOf(n.on), b) && rows.xOf(n.on) > nowX + 20);
      if (other) tag("MINE: THIN", Math.min(b.x + b.w - 90, rows.xOf(other.on)), rows.yOf(other.step) + rows.rowH + 12);
      break;
    }
    case "line": {
      dim(0, 0, bw, h);
      dim(w - bw, 0, bw, h);
      const x = rows.xOf(g.now);
      frame(x - 5, b.y, 10, b.h);
      tag("NOW", x + 8, b.y + 18);
      break;
    }
    case "height": {
      dim(b.x, b.y, b.w, b.h);
      dim(w - bw, 0, bw, h);
      frame(0, 0, bw, h);
      const size = Math.max(14, Math.min(26, bw * 0.24));
      const lo = h * 0.72;
      const hi = h * 0.32;
      const k = (Math.sin(now / 700) + 1) / 2;
      drawThumbA(c, bw * 0.72, lo + (hi - lo) * k, size, "left", k > 0.9 || k < 0.1 ? 0 : 0.6);
      c.strokeStyle = GOLD;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(bw * 0.2, lo);
      c.lineTo(bw * 0.2, hi);
      c.lineTo(bw * 0.2 - 4, hi + 7);
      c.moveTo(bw * 0.2, hi);
      c.lineTo(bw * 0.2 + 4, hi + 7);
      c.stroke();
      label(c, "HIGHER NOTE: TOUCH HIGHER", bw / 2, h * 0.84, GOLD, 6);
      break;
    }
  }
}
