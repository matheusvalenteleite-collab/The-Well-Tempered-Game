/**
 * Design studio (D478; the owner rated II/1–II/6's visuals 1–3/5: "the subject in other voices looks the same as every
 * other note", the traveller "boring and feeble", "use shadows and light intelligently"; they approved the preview
 * "Subjects lit, worlds alive"): THE SUBJECT'S SKIN. Seven skins replace D465's twelve travellers, each world one
 * (SKIN_CAST): a large head riding the entry's actual notes (gliding from each note's start to the next's, as D465),
 * a trail behind it, particles along the line it has passed, and a burst as the entry lands. Every voice's entry the
 * same (no longer half for another voice's). The light and the shadow are MusicBox's (the subject lights the world
 * round it, the rest of the music casts shadow); here only the skin.
 *
 *  FIRE: a fireball, embers trailing and rising off the line. BOLT: lightning from the last note struck to the head,
 *  sparks crackling off the notes passed. COMET (bronze, gold or silver): a bright head with a long tail along the path
 *  behind, a ring spreading from each note it strikes. SPARKS: a bright spark hopping note to note, sparks thrown off
 *  each. SMOKE: a glowing coal, slow wisps rising. PETALS: a blossom, petals drifting down behind it. SNOW: a
 *  snowflake, flakes falling slowly off the line.
 *
 * No strobe: the shapes move but no light flashes (a bolt's path changes eight times a second, its brightness
 * never); the entry's burst is particles flying out, not a flash. QUIET draws none of it (MusicBox keeps the light
 * and shadow). Drawing only: nothing heard, scored, or read as right or wrong.
 */
import type { TravelNote } from "./travellers.ts";

export type Skin = "FIRE" | "BOLT" | "COMET" | "SPARKS" | "SMOKE" | "PETALS" | "SNOW";
export const SKINS: readonly Skin[] = ["FIRE", "BOLT", "COMET", "SPARKS", "SMOKE", "PETALS", "SNOW"];
export type Metal = "bronze" | "gold" | "silver";
type Cast = Skin | [Skin, Metal];

/** Each world's skin, from its picture and character. */
export const SKIN_CAST: Readonly<Record<string, Cast>> = {
  wtc1f01: ["COMET", "silver"], wtc1f02: "FIRE", wtc1f03: "SPARKS", wtc1f04: "PETALS", wtc1f05: ["COMET", "gold"], wtc1f06: "BOLT",
  wtc1f07: "SPARKS", wtc1f08: ["COMET", "gold"], wtc1f09: "SPARKS", wtc1f10: "BOLT", wtc1f11: "PETALS", wtc1f12: "SMOKE",
  wtc1f13: "SNOW", wtc1f14: ["COMET", "silver"], wtc1f15: "SPARKS", wtc1f16: ["COMET", "silver"], wtc1f17: "PETALS", wtc1f18: "SNOW",
  wtc1f19: "SPARKS", wtc1f20: "FIRE", wtc1f21: "SPARKS", wtc1f22: ["COMET", "gold"], wtc1f23: "SMOKE", wtc1f24: "SMOKE",
  wtc2f01: "FIRE", wtc2f02: ["COMET", "gold"], wtc2f03: "BOLT", wtc2f04: ["COMET", "silver"], wtc2f05: ["COMET", "bronze"], wtc2f06: "FIRE",
  wtc2f07: ["COMET", "gold"], wtc2f08: "SNOW", wtc2f09: ["COMET", "gold"], wtc2f10: "SPARKS", wtc2f11: "PETALS", wtc2f12: ["COMET", "silver"],
  wtc2f13: "BOLT", wtc2f14: "PETALS", wtc2f15: "SPARKS", wtc2f16: "BOLT", wtc2f17: ["COMET", "silver"], wtc2f18: "SPARKS",
  wtc2f19: ["COMET", "gold"], wtc2f20: "BOLT", wtc2f21: "FIRE", wtc2f22: "FIRE", wtc2f23: "SNOW", wtc2f24: "SMOKE",
};
/** A piece outside the 48: SPARKS. */
export function skinOf(piece: string | undefined): { skin: Skin; metal: Metal } {
  const c = (piece && SKIN_CAST[piece]) || "SPARKS";
  return Array.isArray(c) ? { skin: c[0], metal: c[1] } : { skin: c, metal: "gold" };
}

const METAL: Record<Metal, [number, number, number]> = { bronze: [255, 190, 100], gold: [255, 220, 120], silver: [215, 230, 255] };
/** How far above a note's top the head rides (canvas px). */
const LIFT = 6;
/** The entry's burst: beats it lasts. */
const BURST_BEATS = 1;
/** The bolt's path changes this many times a second (its light never). */
const BOLT_HZ = 8;

export interface SkinCtx {
  g: CanvasRenderingContext2D;
  xOf: (tick: number) => number;
  now: number;
  /** Ticks a beat; wall-clock seconds (the particles' motion). */
  beat: number;
  t: number;
  /** The voice's ink (the burst's and the particles' tint). */
  ink: string;
  rowH: number;
}

const rnd = (a: number, b: number) => {
  const x = Math.sin(a * 91.7 + b * 47.3) * 43758.5;
  return x - Math.floor(x);
};
const rgbOf = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((ch) => ch + ch).join("") : h.slice(0, 6), 16);
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [255, 255, 255];
};

/** The head at a tick (gliding between notes' starts, smoothstep in height), null outside the entry. */
function headAt(ns: readonly TravelNote[], tick: number, c: SkinCtx): { x: number; y: number; j: number } | null {
  const last = ns[ns.length - 1];
  if (!last || tick < ns[0].on || tick > last.on + last.dur) return null;
  let j = 0;
  while (j + 1 < ns.length && ns[j + 1].on <= tick) j++;
  const a = ns[j];
  const b = ns[j + 1];
  const end = b ? b.on : a.on + a.dur;
  const u = Math.max(0, Math.min(1, (tick - a.on) / Math.max(1, end - a.on)));
  const e = u * u * (3 - 2 * u);
  const x0 = c.xOf(a.on);
  const x1 = b ? c.xOf(b.on) : c.xOf(a.on + a.dur);
  const y0 = a.top - LIFT;
  const y1 = b ? b.top - LIFT : y0;
  return { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * e, j };
}

/** A filled disc in pixels (rows of rectangles: the box draws only rectangles, D383). */
function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) {
  g.fillStyle = c;
  const cx = Math.round(x);
  const cy = Math.round(y);
  const R = Math.max(1, Math.round(r));
  for (let dy = -R; dy <= R; dy++) {
    const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
    g.fillRect(cx - half, cy + dy, 2 * half + 1, 1);
  }
}
/** A line in pixels (stepped rectangles), `lw` thick. */
function line(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, lw: number) {
  const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i += 1) g.fillRect(Math.round(x0 + ((x1 - x0) * i) / n) - (lw >> 1), Math.round(y0 + ((y1 - y0) * i) / n) - (lw >> 1), lw, lw);
}
/** A ring in pixels (an ellipse's outline as points). */
function ring(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  const n = Math.max(8, Math.round(rx * 2));
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    g.fillRect(Math.round(x + Math.cos(th) * rx), Math.round(y + Math.sin(th) * ry), 1, 1);
  }
}

/** Draws an entry's skin; returns the marks used (at most `budget`). */
export function drawSkin(skin: Skin, metal: Metal, ns: readonly TravelNote[], c: SkinCtx, budget: number): number {
  const { g, xOf, now, beat, t } = c;
  if (!ns.length || budget <= 0) return 0;
  let used = 0;
  const ink = rgbOf(c.ink);
  const mt = METAL[metal];
  // The entry's burst: particles flying out from its first note (not a flash).
  const since = (now - ns[0].on) / beat;
  if (since >= 0 && since < BURST_BEATS) {
    const x0 = xOf(ns[0].on);
    const y0 = ns[0].top + c.rowH / 2;
    const tint = skin === "BOLT" ? "200,240,255" : skin === "FIRE" ? "255,170,70" : skin === "SNOW" ? "235,245,255" : skin === "PETALS" ? "255,190,210" : skin === "COMET" ? mt.join(",") : ink.join(",");
    const a = 1 - since / BURST_BEATS;
    for (let k = 0; k < 18 && used < budget; k++, used++) {
      const th = (k / 18) * Math.PI * 2;
      const r = 5 + since * 30 * (0.7 + 0.3 * rnd(k, ns[0].on));
      g.fillStyle = `rgba(${tint},${a})`;
      g.fillRect(Math.round(x0 + Math.cos(th) * r), Math.round(y0 + Math.sin(th) * r * 0.7), 2, 2);
    }
  }
  const h = headAt(ns, now, c);
  // Particles along the line already passed (the last two beats), each skin its own.
  const from = now - 2 * beat;
  for (let j = 0; j < ns.length && used < budget; j++) {
    const n = ns[j];
    if (n.on > now) break;
    if (n.on + n.dur < from) continue;
    const xa = xOf(Math.max(n.on, from));
    const xb = xOf(Math.min(n.on + n.dur, now));
    if (xb <= xa) continue;
    const per = skin === "SMOKE" || skin === "SNOW" || skin === "PETALS" ? 2 : 3;
    for (let k = 0; k < per && used < budget; k++, used++) {
      const life = (t * (skin === "SMOKE" ? 0.4 : skin === "SNOW" || skin === "PETALS" ? 0.5 : 1.3) + rnd(j, k)) % 1;
      const x = xa + rnd(k, n.on) * (xb - xa);
      if (skin === "FIRE") {
        g.fillStyle = `rgba(255,${Math.round(210 - 140 * life)},${Math.round(80 - 70 * life)},${1 - life})`;
        g.fillRect(Math.round(x + Math.sin(t * 4 + k) * 2), Math.round(n.top - 2 - life * 12), life < 0.4 ? 2 : 1, life < 0.4 ? 2 : 1);
      } else if (skin === "BOLT" || skin === "SPARKS") {
        if (rnd(k + Math.floor(t * BOLT_HZ), n.on) > 0.5) continue;
        g.fillStyle = skin === "BOLT" ? "rgba(225,245,255,0.95)" : `rgba(${ink.join(",")},0.95)`;
        g.fillRect(Math.round(x), Math.round(n.top - 2 - rnd(k * 3, n.on) * 5), 1, 2);
      } else if (skin === "SMOKE") {
        g.fillStyle = `rgba(200,195,210,${0.35 * (1 - life)})`;
        g.fillRect(Math.round(x + Math.sin(t + k + j) * 4 * life), Math.round(n.top - 2 - life * 16), 3, 2);
      } else if (skin === "PETALS") {
        g.fillStyle = `rgba(255,${180 + Math.round(40 * rnd(k, j))},210,${1 - life})`;
        g.fillRect(Math.round(x + Math.sin(t * 1.5 + k) * 4), Math.round(n.top + c.rowH + life * 12), 2, 1);
      } else if (skin === "SNOW") {
        g.fillStyle = `rgba(240,248,255,${0.9 * (1 - life)})`;
        g.fillRect(Math.round(x + Math.sin(t + k) * 3), Math.round(n.top + c.rowH + life * 14), 1, 1);
      } else if (skin === "COMET") {
        const struck = (now - n.on) / beat;
        if (k === 0 && struck < 0.75) {
          const r = 3 + struck * 14;
          g.fillStyle = `rgba(${mt.join(",")},${1 - struck / 0.75})`;
          ring(g, xOf(n.on), n.top + c.rowH / 2, r, r * 0.6);
        }
      }
    }
  }
  if (!h) return used;
  // The head and its trail.
  if (skin === "FIRE") {
    for (let k = 0; k < 22 && used < budget; k++, used++) {
      const age = (k / 22 + t * 1.6) % 1;
      g.fillStyle = `rgba(255,${Math.round(220 - age * 150)},${Math.round(90 - age * 80)},${1 - age})`;
      g.fillRect(Math.round(h.x - age * 26 + Math.sin(k * 3 + t * 5) * 2), Math.round(h.y - age * 12 + rnd(k, 1) * 3), age < 0.3 ? 3 : 2, age < 0.3 ? 3 : 2);
    }
    disc(g, h.x, h.y, 6, "rgba(255,120,30,0.5)");
    disc(g, h.x, h.y, 4, "rgba(255,170,60,0.95)");
    disc(g, h.x, h.y, 2.5, "rgba(255,240,180,1)");
  } else if (skin === "BOLT") {
    const a = ns[h.j];
    const x0 = xOf(a.on) + 2;
    const y0 = a.top - 2;
    const seed = Math.floor(t * BOLT_HZ);
    const pts: [number, number][] = [];
    for (let k = 0; k <= 6; k++) {
      const u = k / 6;
      const jx = k % 6 ? (rnd(k, seed) - 0.5) * 7 : 0;
      const jy = k % 6 ? (rnd(k * 7, seed) - 0.5) * 7 : 0;
      pts.push([x0 + (h.x - x0) * u + jx, y0 + (h.y - y0) * u + jy]);
    }
    for (const [lw, cc] of [[3, "rgba(120,200,255,0.5)"], [1, "rgba(240,250,255,1)"]] as const) {
      g.fillStyle = cc;
      for (let k = 1; k < pts.length; k++) line(g, pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], lw);
    }
    g.fillStyle = "rgba(140,210,255,0.5)";
    g.fillRect(Math.round(h.x) - 4, Math.round(h.y) - 4, 8, 8);
    g.fillStyle = "rgba(235,250,255,1)";
    g.fillRect(Math.round(h.x) - 2, Math.round(h.y) - 2, 5, 5);
    used += 10;
  } else if (skin === "COMET") {
    for (let k = 1; k < 22 && used < budget; k++, used++) {
      const p = headAt(ns, now - k * 0.05 * beat, c);
      if (!p) break;
      g.fillStyle = `rgba(${mt[0]},${mt[1] - k * 3},${mt[2] - k * 3},${1 - k / 22})`;
      g.fillRect(Math.round(p.x), Math.round(p.y), k < 6 ? 3 : 2, k < 6 ? 3 : 2);
    }
    disc(g, h.x, h.y, 5, `rgba(${mt.join(",")},0.45)`);
    disc(g, h.x, h.y, 3.5, `rgba(${mt.join(",")},1)`);
    disc(g, h.x, h.y, 1.5, "rgba(255,252,235,1)");
  } else if (skin === "SPARKS") {
    disc(g, h.x, h.y, 4.5, `rgba(${ink.join(",")},0.45)`);
    disc(g, h.x, h.y, 2.5, "rgba(255,255,240,1)");
    for (let k = 0; k < 6 && used < budget; k++, used++) {
      const th = t * 6 + k;
      g.fillStyle = `rgba(${ink.join(",")},0.9)`;
      g.fillRect(Math.round(h.x + Math.cos(th) * 7), Math.round(h.y + Math.sin(th) * 5), 1, 1);
    }
  } else if (skin === "SMOKE") {
    disc(g, h.x, h.y, 5, "rgba(255,140,60,0.35)");
    disc(g, h.x, h.y, 3, "rgba(255,170,90,0.95)");
    for (let k = 0; k < 8 && used < budget; k++, used++) {
      const life = (t * 0.5 + k / 8) % 1;
      g.fillStyle = `rgba(210,205,220,${0.45 * (1 - life)})`;
      g.fillRect(Math.round(h.x - 2 + Math.sin(t + k) * 4 * life), Math.round(h.y - 5 - life * 18), 4, 3);
    }
  } else if (skin === "PETALS") {
    for (let k = 0; k < 5; k++) disc(g, h.x + Math.cos((k * Math.PI * 2) / 5 + t) * 3.5, h.y + Math.sin((k * Math.PI * 2) / 5 + t) * 3.5, 2.5, "rgba(255,190,215,0.95)");
    disc(g, h.x, h.y, 2, "rgba(255,230,140,1)");
    used += 6;
  } else if (skin === "SNOW") {
    g.fillStyle = "rgba(240,248,255,1)";
    for (let k = 0; k < 3; k++) {
      const th = (k * Math.PI) / 3 + t * 0.6;
      for (let r = -5; r <= 5; r++) g.fillRect(Math.round(h.x + Math.cos(th) * r), Math.round(h.y + Math.sin(th) * r), 1, 1);
    }
    disc(g, h.x, h.y, 6, "rgba(200,225,255,0.25)");
    used += 33;
  }
  return used;
}
