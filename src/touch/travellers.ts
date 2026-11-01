/**
 * Design studio (D465; the owner: "Develop the bouncing-cube animation on fugal subjects so that each fugue has
 * a distinctive analogue … keeping the bouncing cube's forward motion: the animation moves forward along the
 * subject, so it feels musically driven"; on the preview, "I like all the ideas for subject travellers. Go
 * ahead!"): twelve travellers, each a head that GLIDES along an entry's notes, from each note's start to the
 * next's over the note's own time (the old HOP hopped, then waited: in a slow fugue nothing moved for long), so
 * something is always travelling while a subject sounds, at any tempo. Each is drawn in the voice's own ink and
 * its pale light (no hue of its own, D411), above the notes and never over them, three times the old effects'
 * size (the owner: the cube "too shy"), a few dozen pixels a frame at most (D372's budget). Another voice's
 * entry at half strength. Drawing only: nothing here is heard, scored, or reads right or wrong.
 */

export type Traveller = "HOP" | "COMET" | "FLAME" | "BOLT" | "SKIP" | "SMOKE" | "DROP" | "RIBBON" | "HEART" | "LANTERN" | "BIRD" | "STAR";
export const TRAVELLERS: readonly Traveller[] = ["HOP", "COMET", "FLAME", "BOLT", "SKIP", "SMOKE", "DROP", "RIBBON", "HEART", "LANTERN", "BIRD", "STAR"];

/** The casting the owner approved (the preview page "Subject Travellers"), one a fugue, from its character and name. */
export const TRAVEL_CAST: Readonly<Record<string, Traveller>> = {
  wtc1f01: "STAR", wtc1f02: "HOP", wtc1f03: "SKIP", wtc1f04: "HEART", wtc1f05: "FLAME", wtc1f06: "BOLT",
  wtc1f07: "COMET", wtc1f08: "LANTERN", wtc1f09: "BIRD", wtc1f10: "BOLT", wtc1f11: "RIBBON", wtc1f12: "SMOKE",
  wtc1f13: "RIBBON", wtc1f14: "DROP", wtc1f15: "HOP", wtc1f16: "STAR", wtc1f17: "RIBBON", wtc1f18: "LANTERN",
  wtc1f19: "HOP", wtc1f20: "FLAME", wtc1f21: "HOP", wtc1f22: "LANTERN", wtc1f23: "RIBBON", wtc1f24: "SMOKE",
  wtc2f01: "COMET", wtc2f02: "HEART", wtc2f03: "BOLT", wtc2f04: "COMET", wtc2f05: "STAR", wtc2f06: "FLAME",
  wtc2f07: "HEART", wtc2f08: "DROP", wtc2f09: "LANTERN", wtc2f10: "HOP", wtc2f11: "BIRD", wtc2f12: "STAR",
  wtc2f13: "BOLT", wtc2f14: "RIBBON", wtc2f15: "HOP", wtc2f16: "BOLT", wtc2f17: "STAR", wtc2f18: "BIRD",
  wtc2f19: "LANTERN", wtc2f20: "BOLT", wtc2f21: "HEART", wtc2f22: "FLAME", wtc2f23: "DROP", wtc2f24: "SMOKE",
};
/** A piece outside the 48 (a prelude's subject, a Lab piece): today's cube. */
export const travellerOf = (piece: string | undefined): Traveller => (piece && TRAVEL_CAST[piece]) || "HOP";

/** Each mark at three times the old effects' pixels, centred where it would have been. */
const SZ = 3;
/** How far above a note's top the head runs (canvas px), so the marks keep off the notes. */
const LIFT = 5;

/** One entry's notes as the box draws them: each note's onset and length (ticks) and its top (canvas px). */
export interface TravelNote {
  on: number;
  dur: number;
  top: number;
}
export interface TravelCtx {
  g: CanvasRenderingContext2D;
  xOf: (tick: number) => number;
  /** The tick the ear is at; ticks a beat; wall-clock seconds (flicker only). */
  now: number;
  beat: number;
  t: number;
  ink: string;
  rim: string;
  /** 1 for the player's entry, OTHERS_SCALE for another voice's. */
  a: number;
}

type Head = { x: number; y: number; u: number; j: number; dur: number };
/** The head at a tick: gliding from the current note's start to the next note's start over that time (null outside the entry). */
function head(ns: readonly TravelNote[], tick: number, c: TravelCtx): Head | null {
  const last = ns[ns.length - 1];
  if (!last || tick < ns[0].on || tick > last.on + last.dur) return null;
  let j = 0;
  while (j + 1 < ns.length && ns[j + 1].on <= tick) j++;
  const a = ns[j];
  const b = ns[j + 1];
  const end = b ? b.on : a.on + a.dur;
  const u = Math.max(0, Math.min(1, (tick - a.on) / Math.max(1, end - a.on)));
  const x0 = c.xOf(a.on);
  const x1 = b ? c.xOf(b.on) : c.xOf(a.on + a.dur);
  const y0 = a.top - LIFT;
  const y1 = b ? b.top - LIFT : y0;
  return { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u, u, j, dur: end - a.on };
}

const WHITE = "#ffffff";
const rnd = (a: number, b: number) => {
  const x = Math.sin(a * 91.7 + b * 47.3) * 43758.5;
  return x - Math.floor(x);
};

/**
 * Draws an entry's traveller (budget: the rectangles it may use; returns those used). `ns` the entry's notes in
 * order; nothing drawn outside the entry's own time.
 */
export function drawTraveller(kind: Traveller, ns: readonly TravelNote[], c: TravelCtx, budget: number): number {
  if (!ns.length || budget <= 0) return 0;
  const { g, a } = c;
  let used = 0;
  const R = (x: number, y: number, w: number, h: number, col: string, alpha: number) => {
    if (alpha <= 0.02 || used >= budget) return;
    g.globalAlpha = Math.min(1, alpha);
    g.fillStyle = col;
    g.fillRect(Math.round(x - (w * (SZ - 1)) / 2), Math.round(y - (h * (SZ - 1)) / 2), w * SZ, h * SZ);
    used++;
  };
  const beatTicks = Math.max(1, c.beat);
  const back = (k: number, step: number) => head(ns, c.now - k * step * beatTicks, c);
  const h = head(ns, c.now, c);
  switch (kind) {
    case "HOP": {
      if (!h) break;
      const n = ns[h.j];
      const lift = (3 + 5 * a) * Math.min(1.6, 0.6 + h.dur / beatTicks);
      const y = h.y - lift * Math.sin(Math.PI * h.u);
      R(h.x, n.top - 2, 3, 1, c.ink, 0.35 * a);
      R(h.x, y - 1, 4, 3, c.rim, 0.6 + 0.4 * a);
      R(h.x - 0.5, y - 2, 2, 1, WHITE, a);
      if (h.u > 0.85) {
        const k = (h.u - 0.85) / 0.15;
        R(h.x - 3 - k * 2, h.y, 1, 1, c.rim, (1 - k) * a);
        R(h.x + 3 + k * 2, h.y, 1, 1, c.rim, (1 - k) * a);
      }
      break;
    }
    case "COMET":
      for (let k = 10; k >= 0; k--) {
        const p = back(k, 0.06);
        if (p) R(p.x, p.y, k ? 1 : 2, k ? 1 : 2, k ? c.rim : WHITE, k ? (1 - k / 11) * 0.8 * a : a);
      }
      break;
    case "FLAME": {
      if (!h) break;
      const fl = Math.floor(c.t * 14);
      for (let k = -2; k <= 2; k++) {
        const hh = Math.round((2 + 4 * a) * (0.4 + 0.6 * rnd(k, fl)) * (1 - Math.abs(k) * 0.25));
        R(h.x + k, h.y - hh / 2, 1, hh, k === 0 ? "#fffae6" : c.rim, 0.9 * a);
      }
      for (let e = 1; e <= 4; e++) {
        const p = back(e, 0.15);
        if (p) R(p.x + rnd(e, 3) * 3 - 1, p.y + e * 1.5, 1, 1, c.ink, (0.8 - e * 0.18) * a);
      }
      break;
    }
    case "BOLT": {
      if (!h) break;
      const cur = ns[h.j];
      const prev = h.j > 0 ? ns[h.j - 1] : null;
      const age = (c.now - cur.on) / Math.max(0.15 * beatTicks, Math.min(0.5 * beatTicks, h.dur));
      if (prev && age < 1) {
        const x0 = c.xOf(prev.on);
        const y0 = prev.top - LIFT;
        const x1 = c.xOf(cur.on);
        const y1 = cur.top - LIFT;
        const fl = Math.floor(c.t * 20);
        let px = x0;
        let py = y0;
        for (let s = 1; s <= 5; s++) {
          const nx = x0 + ((x1 - x0) * s) / 5;
          const ny = y0 + ((y1 - y0) * s) / 5 + (s < 5 ? (rnd(s, fl) - 0.5) * 6 : 0);
          const steps = Math.min(8, Math.max(Math.abs(nx - px), Math.abs(ny - py), 1) / 2);
          for (let q = 0; q <= steps; q++) R(px + ((nx - px) * q) / steps, py + ((ny - py) * q) / steps, 1, 1, q % 2 ? c.rim : WHITE, (1 - age) * a);
          px = nx;
          py = ny;
        }
      }
      const fl2 = Math.floor(c.t * 16);
      for (let k = 0; k < 3; k++) R(h.x + (rnd(k, fl2) - 0.5) * 6, h.y - rnd(k + 5, fl2) * 4, 1, 1, c.rim, 0.8 * a);
      break;
    }
    case "SKIP": {
      if (!h) break;
      R(h.x, h.y - (2 + 3 * a) * Math.sin(Math.PI * h.u), 3, 2, "#e6e6f0", a);
      for (let k = 0; k < 3; k++) {
        const n = ns[h.j - k];
        if (!n) break;
        const age = ((c.now - n.on) / beatTicks) * 1.6;
        if (age > 1) continue;
        const r = 1 + age * 6;
        const x = c.xOf(n.on);
        R(x - r * SZ, n.top - LIFT + 2, 1, 1, c.rim, (1 - age) * a);
        R(x + r * SZ, n.top - LIFT + 2, 1, 1, c.rim, (1 - age) * a);
        R(x - r * SZ * 0.6, n.top - LIFT, 1, 1, c.rim, (1 - age) * 0.6 * a);
        R(x + r * SZ * 0.6, n.top - LIFT, 1, 1, c.rim, (1 - age) * 0.6 * a);
      }
      break;
    }
    case "SMOKE":
      for (let k = 0; k < 9; k++) {
        const p = back(k, 0.12);
        if (p) R(p.x + Math.sin(c.t * 3 + k) * k * 0.4, p.y - k * 1.3 * SZ, k > 4 ? 2 : 1, 1, k ? c.rim : WHITE, (1 - k / 9) * 0.7 * a);
      }
      break;
    case "DROP": {
      if (!h) break;
      const n = ns[h.j];
      if (h.u < 0.7) {
        R(h.x, n.top - LIFT, 2, 2, c.rim, a);
        R(h.x - 0.5, n.top - LIFT - 0.5, 1, 1, WHITE, a);
      } else {
        const k = (h.u - 0.7) / 0.3;
        R(c.xOf(n.on + n.dur), n.top + 3 + k * k * 8 * SZ, 1, 2, c.rim, (1 - k * 0.5) * a);
      }
      break;
    }
    case "RIBBON":
      for (let k = 14; k >= 0; k--) {
        const p = back(k, 0.05);
        if (p) R(p.x, p.y - 1 + Math.sin(c.t * 6 - k * 0.7) * 1.5, 1, 1, k ? c.rim : WHITE, k ? (1 - k / 15) * 0.85 * a : a);
      }
      break;
    case "HEART": {
      if (!h) break;
      const ph = ((c.now / beatTicks) % 1 + 1) % 1;
      const beat = Math.max(0, 1 - ph * 5) + 0.6 * Math.max(0, 1 - Math.abs(ph - 0.3) * 7);
      const r = 1 + Math.round(2 * beat * a);
      R(h.x, h.y - r / 2, 2 * r + 1, 2 * r, c.rim, (0.35 + 0.5 * beat) * a);
      R(h.x, h.y - 1, 1, 1, WHITE, a);
      break;
    }
    case "LANTERN": {
      if (!h) break;
      const n = ns[h.j];
      const y = h.y - 4 * SZ;
      // The cone in stepped rectangles (the box draws rectangles only, D372), widening toward the note.
      g.globalAlpha = 0.16 * a;
      g.fillStyle = c.rim;
      const y0 = Math.round(y + 2 * SZ);
      const rows = Math.max(1, Math.round((n.top - 1 - y0) / 2));
      for (let r = 0; r < rows && used < budget; r++) {
        const half = Math.round(((r + 1) / rows) * 5 * SZ);
        g.fillRect(Math.round(h.x - half), y0 + r * 2, half * 2 + 1, 2);
        used++;
      }
      R(h.x, y, 3, 3, c.rim, a);
      R(h.x, y, 1, 1, "#fff5d2", a);
      R(h.x, y - 2.5 * SZ, 1, 2, c.ink, a);
      break;
    }
    case "BIRD": {
      if (!h) break;
      const n = ns[h.j];
      const x0 = c.xOf(n.on);
      const flying = h.u > 0.35;
      const u = flying ? (h.u - 0.35) / 0.65 : 0;
      const x = flying ? x0 + ((h.x - x0) / Math.max(0.01, h.u)) * (0.35 + 0.65 * u) : x0;
      const y = n.top - LIFT - (flying ? 4 * SZ * Math.sin(Math.PI * u) : 0);
      const flap = flying && Math.floor(c.t * 12) % 2 === 1;
      R(x, y, 3, 2, c.rim, a);
      R(x + 2 * SZ, y - SZ, 1, 1, c.rim, a);
      R(x - 2 * SZ, y - (flap ? 2 * SZ : 0), 1, 1, c.ink, a);
      R(x, y - (flap ? 2 * SZ : -SZ), 1, 1, c.ink, a);
      break;
    }
    case "STAR": {
      if (!h) break;
      const tw = Math.floor(c.t * 8) % 2 === 1;
      R(h.x, h.y - SZ, 1, 5, WHITE, a);
      R(h.x, h.y - SZ, 5, 1, tw ? c.rim : WHITE, a);
      for (let k = 1; k < 5; k++) {
        const p = back(k, 0.25);
        if (p) R(p.x + rnd(k, 2) * 2 * SZ, p.y - SZ - rnd(k, 7) * 3 * SZ, 1, 1, c.rim, (1 - k / 5) * a);
      }
      break;
    }
  }
  g.globalAlpha = 1;
  return used;
}
