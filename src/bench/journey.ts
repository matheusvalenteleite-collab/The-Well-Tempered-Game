/**
 * D244: the journey (a prototype: Prelude 1 and Fugue 1 of Book I). The background shows the music's
 * course, never the player's: the playing is scored in front; behind it the light follows the piece.
 *   THE PRELUDE'S ROAD: the key's colour (the music box's, D167) in the sky and the road's far end,
 *   cross-faded over a beat; SHADOW, the light dropping at the diminished sevenths; CLIMB, a glow
 *   rising at the horizon through the dominant pedal; the SUMMIT, the tonic's arrival: a bloom at
 *   the horizon that settles into a lasting warm light. Only the backdrop changes: the gems keep
 *   their brightness, and every change takes a beat or more (nothing flashes).
 *   THE ECHO: a figure stated twice in the bar keeps its lanes the second time (echo.ts); in a
 *   prelude whose script asks for it its second statement is drawn hollow, the bar's own repeat shown.
 *   THE FUGUE'S BUILDING (paint-arch.ts): the fugue map is the plan at first, each entry an outline,
 *   laid as a stone when it is played, the stretto's line drawn as it comes; the last stone laid,
 *   the whole wall lit.
 * Each script is read by hand from the harmonic map (data/wtc/harmonic-maps.json) and the score:
 * the automatic map marks a pedal under nearly every bar of Prelude 1 (the figure holds its bass),
 * so a journey is not drawn from it unchecked.
 */
import { barStart, keyAt, type TouchFugue } from "../touch/fugue.ts";
import { keyTint } from "../touch/MusicBox.tsx";

/** The journey at a moment: each 0 to 1. */
export interface Journey {
  /** The light dropped (a diminished seventh). */
  shadow: number;
  /** The climb's progress (a dominant pedal). */
  climb: number;
  /** The arrival home. */
  summit: number;
}
/** A script: at a bar (fractions within it), the values from there (straight lines between). */
type Frame = [bar: number, shadow: number, climb: number, summit: number];
interface Script {
  frames: Frame[];
  /** The bar's repeated half drawn hollow. */
  echo?: boolean;
}

/**
 * Prelude 1 (the harmonic map, read against the score): home in C (bb. 1–4); towards G, its cadence
 * at b. 11; diminished sevenths at bb. 12 and 14; home at b. 19; F at b. 21; diminished sevenths at
 * bb. 22–23; the dominant pedal, G, bb. 24–31 (the climb); the tonic pedal, C, bb. 32–35 (the summit).
 */
const SCRIPTS: Record<string, Script> = {
  wtc1p01: {
    // D250: no hollow echo (the owner: no memory puzzles; the repeat keeps its lanes, echo.ts).
    frames: [
      [1, 0, 0, 0],
      [12, 0, 0, 0],
      [12.1, 1, 0, 0],
      [12.9, 1, 0, 0],
      [13.1, 0, 0, 0],
      [14, 0, 0, 0],
      [14.1, 1, 0, 0],
      [14.9, 1, 0, 0],
      [15.1, 0, 0, 0],
      [22, 0, 0, 0],
      [22.1, 1, 0, 0],
      [23.9, 1, 0, 0],
      [24.1, 0, 0.05, 0],
      [31.9, 0, 1, 0],
      [32, 0, 1, 0],
      [32.25, 0, 0, 1],
      [33, 0, 0, 0.7],
      [99, 0, 0, 0.7],
    ],
  },
};
/** Fugues whose map is built stone by stone. */
const BUILDS = new Set(["wtc1f01"]);

export const hasJourney = (f: TouchFugue) => f.id in SCRIPTS;
export const echoShown = (f: TouchFugue) => !!SCRIPTS[f.id]?.echo;
export const builds = (f: TouchFugue) => BUILDS.has(f.id);

const NONE: Journey = { shadow: 0, climb: 0, summit: 0 };
/** The journey at a tick (none outside a scripted piece). */
export function journeyAt(f: TouchFugue, tick: number): Journey {
  const s = SCRIPTS[f.id];
  if (!s) return NONE;
  const tickOf = (bar: number) => {
    const b = Math.floor(bar);
    const on = barStart(f, b);
    return on + (bar - b) * f.barTicks;
  };
  const fr = s.frames;
  let i = 0;
  while (i + 1 < fr.length && tickOf(fr[i + 1][0]) <= tick) i++;
  const a = fr[i];
  const b = fr[i + 1] ?? a;
  const ta = tickOf(a[0]);
  const tb = tickOf(b[0]);
  const u = tick <= ta ? 0 : tb > ta ? Math.min(1, (tick - ta) / (tb - ta)) : 1;
  const mix = (k: 1 | 2 | 3) => a[k] + (b[k] - a[k]) * u;
  return { shadow: mix(1), climb: mix(2), summit: mix(3) };
}

/** keyTint's hue, saturation and lightness. */
function hsl(key: string): [number, number, number] {
  const m = keyTint(key).match(/hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [240, 30, 12];
}
/** The key's colour at a tick, cross-faded over a beat from the key before (hue the short way round). */
export function keyColour(f: TouchFugue, tick: number, light = 0, alpha = 1): string {
  const keys = f.keys.filter((k) => k.on <= tick);
  const now = hsl(keyAt(f, tick));
  const at = keys.at(-1)?.on ?? -Infinity;
  const u = Math.min(1, (tick - at) / f.tpq);
  const was = u < 1 ? hsl(keys.length > 1 ? keys[keys.length - 2].key : f.key) : now;
  let dh = now[0] - was[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const h = (was[0] + dh * u + 360) % 360;
  const s = was[1] + (now[1] - was[1]) * u;
  const l = was[2] + (now[2] - was[2]) * u + light;
  return `hsla(${h.toFixed(1)} ${s.toFixed(1)}% ${Math.max(0, l).toFixed(1)}% / ${alpha})`;
}

/**
 * The backdrop behind HIGHWAY's road: the sky to the horizon (`horizon`, the road's far end) and the
 * ground beside the road, in the key's colour, darkened by SHADOW, warmed at the horizon by the CLIMB
 * and the SUMMIT. Drawn first; the road and the notes go over it.
 */
export function paintBackdrop(c: CanvasRenderingContext2D, w: number, h: number, horizon: number, f: TouchFugue, tick: number) {
  const j = journeyAt(f, tick);
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, keyColour(f, tick, -6 + 10 * j.summit));
  sky.addColorStop(1, keyColour(f, tick, 2 + 6 * j.climb + 14 * j.summit));
  c.fillStyle = sky;
  c.fillRect(0, 0, w, horizon);
  c.fillStyle = keyColour(f, tick, -5);
  c.fillRect(0, horizon, w, h - horizon);
  // The glow at the horizon: rising through the climb, a bloom at the summit.
  const glow = j.climb * 0.35 + j.summit * 0.55;
  if (glow > 0.01) {
    const band = Math.max(24, horizon * (0.6 + 0.8 * j.climb + 0.6 * j.summit));
    const g = c.createLinearGradient(0, horizon - band, 0, horizon + band * 0.5);
    g.addColorStop(0, "rgba(255,190,110,0)");
    g.addColorStop(0.66, `rgba(255,200,120,${glow.toFixed(3)})`);
    g.addColorStop(1, "rgba(255,200,120,0)");
    c.fillStyle = g;
    c.fillRect(0, horizon - band, w, band * 1.5);
  }
  if (j.shadow > 0.01) {
    c.fillStyle = `rgba(24,10,44,${(0.55 * j.shadow).toFixed(3)})`;
    c.fillRect(0, 0, w, h);
  }
}

/**
 * Over the road's far half (drawn after the road, before the lanes and the notes): the horizon's light
 * carried down it (on a phone the sky is a strip; the road is the backdrop) and the SHADOW's dimming.
 */
export function paintRoadLight(c: CanvasRenderingContext2D, w: number, horizon: number, near: number, f: TouchFugue, tick: number) {
  const j = journeyAt(f, tick);
  const mid = horizon + (near - horizon) * 0.55;
  const glow = j.climb * 0.22 + j.summit * 0.3;
  if (glow > 0.01) {
    const g = c.createLinearGradient(0, horizon, 0, mid);
    g.addColorStop(0, `rgba(255,200,120,${glow.toFixed(3)})`);
    g.addColorStop(1, "rgba(255,200,120,0)");
    c.fillStyle = g;
    c.fillRect(0, horizon, w, mid - horizon);
  }
  if (j.shadow > 0.01) {
    const g = c.createLinearGradient(0, horizon, 0, near);
    g.addColorStop(0, `rgba(24,10,44,${(0.5 * j.shadow).toFixed(3)})`);
    g.addColorStop(1, `rgba(24,10,44,${(0.2 * j.shadow).toFixed(3)})`);
    c.fillStyle = g;
    c.fillRect(0, horizon, w, near - horizon);
  }
}

/** The road's far colour (its gradient's first stop): the key's, darkened in SHADOW, warmed at the SUMMIT. */
export function roadFar(f: TouchFugue, tick: number): string {
  const j = journeyAt(f, tick);
  return keyColour(f, tick, 2 - 4 * j.shadow + 8 * j.summit + 4 * j.climb);
}

export { echoHalves } from "./echo.ts";
