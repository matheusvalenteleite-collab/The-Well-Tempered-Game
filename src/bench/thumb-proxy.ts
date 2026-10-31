/**
 * D374 (the owner on D373's drawn thumbs: "trying to imitate a human part ends up looking disgusting"):
 * the thumb as an abstract proxy, no nail, knuckle or skin. The phone is held sideways in both hands and
 * each thumb comes over the glass from its lower outer corner at an angle (the left from bottom-left
 * pointing up and right, the right mirrored), so the mark is:
 *   - a contact disc where the thumb touches;
 *   - a faint see-through wedge from the disc toward that thumb's lower outer corner, at the thumb's
 *     angle (THUMB_ANGLE), widening and fading: the hand's direction without its anatomy.
 * States: "rest" (a thin ring, the wedge dim), "press" (the disc filled, a ripple as it lands), "prep"
 * (a dotted ring at the next target: prepared, or where the next note wants it), and moving (a short
 * trail from where it was, `trailY`). The colours: the cream of the pressing ring and the blue of the
 * prepared ring the thumbs have used since D334 (manual/aids.ts), the wedge the same cream.
 * Nothing allocated but the canvas's own paths.
 */
type Side = "left" | "right";

export type ProxyState = "rest" | "press" | "prep";

/** The thumb's angle from the horizontal (degrees), the left thumb's wedge down-left, the right's down-right. */
export const THUMB_ANGLE = 42;
export const PROXY_INK = "#fff3b0";
export const PROXY_PREP = "#6fb2ff";
const COS = Math.cos((THUMB_ANGLE * Math.PI) / 180);
const SIN = Math.sin((THUMB_ANGLE * Math.PI) / 180);

export interface ProxyOpts {
  /** 0..1 of the ripple after a press (none outside). */
  ripple?: number;
  /** Moving: where it was a moment ago (y), a short trail drawn from there. */
  trailY?: number;
  /** The wedge's strength (0 none, 1 full; default by state). */
  beam?: number;
}

/** The wedge from (x, y) toward the side's lower outer corner: three overlapping lengths, so it fades out. */
function wedge(c: CanvasRenderingContext2D, x: number, y: number, size: number, side: Side, a: number) {
  const dx = side === "left" ? -COS : COS;
  const dy = SIN;
  const px = -dy;
  const py = dx;
  const near = size * 0.34;
  for (let k = 1; k <= 3; k++) {
    const len = size * 1.15 * k;
    const far = near + size * 0.12 * k;
    c.globalAlpha = a;
    c.beginPath();
    c.moveTo(x + px * near, y + py * near);
    c.lineTo(x + dx * len + px * far, y + dy * len + py * far);
    c.lineTo(x + dx * len - px * far, y + dy * len - py * far);
    c.lineTo(x - px * near, y - py * near);
    c.closePath();
    c.fill();
  }
}

/** The thumb's proxy at (x, y), `size` about the thumb's width in px. */
export function drawThumbProxy(c: CanvasRenderingContext2D, x: number, y: number, size: number, side: Side, state: ProxyState, alpha = 1, o: ProxyOpts = NONE) {
  const r = size * 0.42;
  c.save();
  // The wedge, toward the hand.
  const beam = o.beam ?? (state === "press" ? 1 : state === "rest" ? 0.5 : 0.35);
  if (beam > 0) {
    c.fillStyle = state === "prep" ? PROXY_PREP : PROXY_INK;
    wedge(c, x, y, size, side, alpha * 0.07 * beam);
  }
  // Moving: a short trail, from where it was.
  if (o.trailY !== undefined && Math.abs(o.trailY - y) > 2) {
    c.globalAlpha = alpha * 0.45;
    c.strokeStyle = PROXY_INK;
    c.lineWidth = Math.max(2, r * 0.7);
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x, o.trailY);
    c.lineTo(x, y);
    c.stroke();
  }
  c.lineWidth = state === "rest" ? 1.25 : 1.75;
  if (state === "press") {
    // Design studio (D386): the pressing thumb glows, a soft halo of its own ink round the disc.
    c.globalAlpha = alpha * 0.85;
    c.fillStyle = PROXY_INK;
    c.shadowColor = PROXY_INK;
    c.shadowBlur = size * GLOW;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    c.shadowColor = "transparent";
    c.globalAlpha = alpha;
    c.strokeStyle = "#ffffff";
    c.stroke();
    const k = o.ripple;
    if (k !== undefined && k >= 0 && k < 1) {
      c.globalAlpha = alpha * (1 - k) * 0.8;
      c.strokeStyle = PROXY_INK;
      c.beginPath();
      c.arc(x, y, r * (1 + 1.1 * k), 0, Math.PI * 2);
      c.stroke();
    }
  } else {
    c.globalAlpha = alpha * (state === "rest" ? 0.75 : 0.95);
    c.strokeStyle = state === "prep" ? PROXY_PREP : PROXY_INK;
    if (state === "prep") c.setLineDash?.(DASH);
    c.beginPath();
    c.arc(x, y, state === "prep" ? r * 1.1 : r, 0, Math.PI * 2);
    c.stroke();
    if (state === "prep") c.setLineDash?.(SOLID);
  }
  c.restore();
}
const NONE: ProxyOpts = {};
/** Design studio (D386): the pressing disc's glow, its blur as a share of the thumb's size. */
export const GLOW = 0.75;
const DASH = [2, 3];
const SOLID: number[] = [];
