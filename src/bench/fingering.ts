/**
 * D280, THE THUMBS SHOWN: how a passage is played with the two thumbs, worked out once and drawn in three
 * places: HEAR THE SUBJECT (the subject played, a thumb on each side), the tutorial's demonstration
 * (the passage played by the game, the thumbs touching the bars) and its guide (a thumb hovering where
 * and how the next note asks). The plan: each note a touch, the thumbs taking turns (so a joined note
 * is always the other thumb landing before the last one lifts: the owner's "alternate thumbs rather than
 * one thumb repeatedly"); its landing and lifting (joined: a little after the next lands; detached: at
 * three fifths; short: at a third); its loudness (where across the bar: soft by the box, loud by the
 * edge); its ornament (shaken); a rising step slid by the same thumb where sliding is taught.
 */
import type { Shake } from "../touch/ornament-play.ts";

export type Thumb = "left" | "right";
export interface PlanNote {
  at: number;
  dur: number;
  step: number;
  /** How it goes to the next: joined, detached, or not said (joined if the next follows at once). */
  join?: boolean | null;
  short?: boolean | null;
  /** 0 pp .. 1 ff. */
  d?: number;
  shake?: Shake | null;
}
export interface Touch {
  i: number;
  side: Thumb;
  on: number;
  off: number;
  step: number;
  d: number;
  shake: Shake | null;
  /** Played by the thumb already down sliding on (no new touch). */
  slid: boolean;
}

/** The touches for a line of notes (times in any unit: ticks or seconds; `overlap` in the same). */
export function planTouches(notes: PlanNote[], o: { overlap: number; first?: Thumb; slides?: boolean } = { overlap: 0 }): Touch[] {
  const out: Touch[] = [];
  let side: Thumb = o.first === "left" ? "right" : "left";
  notes.forEach((n, i) => {
    const next = notes[i + 1];
    const gap = next ? next.at - n.at : n.dur;
    const follows = !!next && next.at <= n.at + n.dur + 1e-9;
    const joined = n.join ?? follows;
    const prev = out[out.length - 1];
    // A rising step joined to the note before, where sliding is taught: the same thumb slides on.
    const slid = !!o.slides && !!prev && prev.off >= n.at && n.step > notes[i - 1].step && n.step - notes[i - 1].step <= 2 && !n.shake;
    if (!slid) side = side === "left" ? "right" : "left";
    const off = n.short ? n.at + n.dur * 0.35 : joined && next ? next.at + o.overlap : joined === false ? n.at + Math.min(n.dur, gap) * 0.6 : n.at + n.dur;
    if (slid) prev.off = Math.max(prev.off, off);
    out.push({ i, side: slid ? prev.side : side, on: n.at, off, step: n.step, d: n.d ?? 0.5, shake: n.shake ?? null, slid });
  });
  return out;
}

/** Where a loudness sits across a side bar (0..1 of the bar's width, from the box). */
export const acrossBar = (d: number) => 0.12 + 0.76 * Math.max(0, Math.min(1, d));

/**
 * A thumb drawn on a bar at (x, y), its tip toward the box: down (pressed: flat, darker, a ring where it
 * touches), hover (lifted and faint: about to land), shaking (a wobble). `size` its width in px.
 */
export function drawThumb(c: CanvasRenderingContext2D, x: number, y: number, size: number, side: Thumb, state: "down" | "hover", alpha = 1, wobble = 0) {
  const w = size;
  const h = size * 1.45;
  const dir = side === "left" ? 1 : -1;
  const lift = state === "hover" ? size * 0.35 : 0;
  const cx = x + wobble - dir * lift;
  const cy = y - (state === "hover" ? size * 0.25 : 0);
  c.save();
  c.globalAlpha = alpha * (state === "hover" ? 0.55 : 1);
  if (state === "down") {
    c.strokeStyle = "#fff3b0";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x + dir * w * 0.25, y, w * 0.55, 0, Math.PI * 2);
    c.stroke();
  }
  // The thumb: a rounded body pointing at the box, the nail at its tip.
  c.fillStyle = state === "down" ? "#d9a57a" : "#f2c9a0";
  c.beginPath();
  const left = cx - (dir > 0 ? w * 0.9 : w * 0.1);
  c.roundRect(left, cy - h * 0.32, w, h * 0.64, w * 0.32);
  c.fill();
  c.fillStyle = "#b07a52";
  c.fillRect(left + (dir > 0 ? 0 : w * 0.75), cy - h * 0.32, w * 0.25, h * 0.64);
  c.fillStyle = "#fff1e2";
  c.beginPath();
  c.roundRect(cx + (dir > 0 ? -w * 0.32 : w * 0.02), cy - h * 0.18, w * 0.3, h * 0.36, w * 0.12);
  c.fill();
  c.restore();
}
