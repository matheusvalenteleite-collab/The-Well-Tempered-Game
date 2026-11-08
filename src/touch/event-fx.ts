/**
 * Design studio (D477; the owner approved "music you can see": "Go"): each musical event seen on the tick it sounds,
 * read from the one stream (music-events.ts, D476): the score's events (the form, Busoni's dynamics) and what the
 * sound reports it plays (the drums' strokes, rolls and fills, the timpani, the registration's changes).
 *
 *  - An ENTRY: pale rings gather toward the entering voice's first note for the beat before it (from a roll's start
 *    where the drums roll into it), then one ring spreads from it as it lands.
 *  - A CRASH, a SUBITO F, an FP or SF: a short warm burst (the world's light kicked up, or a glow at the play line).
 *  - The drums' strokes (kick, snare, accent, fill, timpani): the box's inner edges pulse with the stroke's level.
 *  - An EPISODE breathes out (a cool vignette closing in); a SUBITO P (a p after f) hushes (the world dimmed at once).
 *  - CRESC. and DIM.: the world's light rises or falls with the hairpin.
 *  - A REGISTRATION change: one shimmer along the box's top edge.
 *  - The CLIMAX warms the box's sides and frame as it builds (form-points.ts' ramp); the LAST CHORD a held glow.
 *
 * Legibility and photosensitivity (the standing rules): everything is drawn under the notes, on the world and the
 * box's edges, never on a note or a touch zone; only dimming is sudden; every brightening is capped (FX_MAX) and
 * at most BURSTS_PER_S of them begin in any second (the rest are merged into the one before). The level of each
 * effect is the sound's: the event's own level, scaled by the output's meter where the sound gives one. QUIET keeps
 * the hush, the breath, the climax and the held chord, and none of the rings, bursts or pulses; OFF draws nothing.
 * Nothing here reads the player's notes: nothing is judged.
 */
import type { TouchFugue } from "./fugue.ts";
import { formOf, phaseAt } from "./form-points.ts";
import { liveEvents, outputLevelNow, scoreBetween, type MusicEvent } from "./music-events.ts";

/** At most this many brightenings begin in any second (the photosensitivity guideline: fewer than three flashes a second). */
export const BURSTS_PER_S = 2.5;
/** The most each effect brightens (alpha of a warm light over the world; the notes are drawn over it). */
export const FX_MAX = { ring: 0.4, burst: 0.08, glow: 0.26, edge: 0.55, frame: 0.6, held: 0.2, swell: 0.08 } as const;
/** How long each lasts (s). */
export const FX_S = { gather: 0.6, ring: 0.45, burst: 0.35, glow: 0.5, edge: 0.18, hush: 1.6, shimmer: 0.6 } as const;

const BURSTING = new Set(["crash", "subito-f", "fp", "sf"]);
const STROKES = new Set(["kick", "snare", "accent", "fill", "timp", "roll"]);

export interface FxState {
  /** Rings: x as a tick, the entering voice's first note's step, gather (0..1 before) or spread (0..1 after), strength. */
  rings: { tick: number; step: number; gather: number; spread: number; a: number }[];
  burst: number;
  glow: number;
  edge: number;
  edgeWide: boolean;
  breath: number;
  hush: number;
  swell: number;
  shimmer: number;
  climax: number;
  held: number;
}

/** Bursts kept: in tick order, none beginning within 1/BURSTS_PER_S s of the one kept before (deterministic). */
export function keepBursts(ev: readonly MusicEvent[], tps: number): MusicEvent[] {
  const out: MusicEvent[] = [];
  const gap = (1 / BURSTS_PER_S) * tps;
  let last = -Infinity;
  for (const e of ev) {
    if (!BURSTING.has(e.kind)) continue;
    if (e.tick - last < gap) continue;
    out.push(e);
    last = e.tick;
  }
  return out;
}

const decay = (s: number, len: number) => (s < 0 || s > len ? 0 : 1 - s / len);

/** What shows at tick `now` (ticks per second `tps`). `quiet`: only the slow effects. */
export function fxState(f: TouchFugue, now: number, tps: number, quiet: boolean, live?: readonly MusicEvent[]): FxState {
  const st: FxState = { rings: [], burst: 0, glow: 0, edge: 0, edgeWide: false, breath: 0, hush: 0, swell: 0, shimmer: 0, climax: 0, held: 0 };
  const sec = (tick: number) => (now - tick) / tps;
  const back = Math.max(4 * f.barTicks, 2 * tps);
  const score = scoreBetween(f, now - back, now + 2 * tps);
  const played = live ?? liveEvents(now - back, now + 2 * tps);
  const meter = outputLevelNow();
  const loud = (lv: number) => (meter === null ? 0.4 + 0.6 * lv : 0.3 + 0.7 * Math.max(lv * 0.6, meter));
  // The slow ones (QUIET too): the episode's breath, the hush, the climax, the held chord.
  const form = formOf(f);
  const ph = phaseAt(form, now);
  st.climax = ph.climax * (1 - ph.resolved);
  st.held = ph.resolved;
  for (const e of score) {
    if (e.kind === "episode" && e.dur && now >= e.tick && now < e.tick + e.dur) {
      const into = Math.min(1, sec(e.tick) / 1.2);
      const out = Math.min(1, (e.tick + e.dur - now) / tps / 0.6);
      st.breath = Math.max(st.breath, Math.min(into, out) * (1 - st.climax));
    }
    if (e.kind === "subito-p") st.hush = Math.max(st.hush, decay(sec(e.tick), FX_S.hush));
  }
  if (quiet) return st;
  // Entries: the gathering before, the ring after (a live roll into it starts the gathering at the roll).
  for (const e of score) {
    if (e.kind !== "entry" || e.voice === undefined) continue;
    const note = f.voices[e.voice]?.find((n) => n[0] >= e.tick);
    if (!note) continue;
    const roll = played.find((x) => x.kind === "roll" && x.tick < e.tick && x.tick + (x.dur ?? 0) >= e.tick - tps * 0.1);
    const from = roll ? roll.tick : e.tick - FX_S.gather * tps;
    const a = FX_MAX.ring * loud(roll ? Math.max(roll.level, e.level) : e.level);
    if (now >= from && now < e.tick) st.rings.push({ tick: e.tick, step: note[3], gather: (now - from) / Math.max(1, e.tick - from), spread: 0, a });
    else if (now >= e.tick && sec(e.tick) < FX_S.ring) st.rings.push({ tick: e.tick, step: note[3], gather: 1, spread: sec(e.tick) / FX_S.ring, a });
  }
  // Bursts (crashes, subito f, fp, sf), at most BURSTS_PER_S a second.
  for (const e of keepBursts([...score, ...played].sort((a, b) => a.tick - b.tick), tps)) {
    const s = sec(e.tick);
    if (e.kind === "fp" || e.kind === "sf") st.glow = Math.max(st.glow, FX_MAX.glow * loud(e.level) * decay(s, FX_S.glow));
    else st.burst = Math.max(st.burst, FX_MAX.burst * loud(e.level) * decay(s, FX_S.burst));
  }
  // The drums' strokes on the box's edges; the registration's shimmer.
  for (const e of played) {
    const s = sec(e.tick);
    if (STROKES.has(e.kind)) {
      const len = e.kind === "timp" ? FX_S.edge * 2 : FX_S.edge;
      const v = FX_MAX.edge * loud(e.level) * decay(s, len);
      if (v > st.edge) (st.edge = v), (st.edgeWide = e.kind === "timp");
    }
    if (e.kind === "registration") st.shimmer = Math.max(st.shimmer, s >= 0 && s < FX_S.shimmer ? s / FX_S.shimmer : 0);
  }
  // The hairpins: the light rises with a cresc., falls with a dim.
  for (const e of score) {
    if ((e.kind !== "cresc" && e.kind !== "dim") || !e.dur || now < e.tick || now >= e.tick + e.dur) continue;
    const u = (now - e.tick) / e.dur;
    st.swell += (e.kind === "cresc" ? 1 : -1) * FX_MAX.swell * u;
  }
  st.swell = Math.max(-FX_MAX.swell, Math.min(FX_MAX.swell, st.swell));
  return st;
}

/**
 * Draws the state on the box's canvas (w × h canvas px), under the notes: `xOf`/`yOf` the box's own scales, `inner` the
 * box's part between the bars (canvas px), `playX` the play line.
 */
export function paintFx(g: CanvasRenderingContext2D, w: number, h: number, st: FxState, xOf: (tick: number) => number, yOf: (step: number) => number, rowH: number, inner: [number, number], playX: number) {
  const [L, R] = inner;
  if (st.hush > 0.001) fill(g, `rgba(6,8,20,${0.4 * st.hush})`, 0, 0, w, h);
  if (st.breath > 0.001) {
    const gr = g.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, w * 0.6);
    gr.addColorStop(0, "rgba(10,14,30,0)");
    gr.addColorStop(1, `rgba(10,14,30,${0.4 * st.breath})`);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  }
  if (st.swell > 0.002) fill(g, `rgba(255,236,200,${st.swell})`, 0, 0, w, h);
  else if (st.swell < -0.002) fill(g, `rgba(6,8,20,${-st.swell * 1.5})`, 0, 0, w, h);
  if (st.burst > 0.002) fill(g, `rgba(255,230,170,${st.burst})`, 0, 0, w, h);
  if (st.glow > 0.002) {
    const gr = g.createLinearGradient(playX - 40, 0, playX + 40, 0);
    gr.addColorStop(0, "rgba(255,200,120,0)");
    gr.addColorStop(0.5, `rgba(255,200,120,${st.glow})`);
    gr.addColorStop(1, "rgba(255,200,120,0)");
    g.fillStyle = gr;
    g.fillRect(playX - 40, 0, 80, h);
  }
  if (st.held > 0.01) {
    const gr = g.createRadialGradient(playX, h / 2, 4, playX, h / 2, h * 0.7);
    gr.addColorStop(0, `rgba(255,236,190,${FX_MAX.held * st.held})`);
    gr.addColorStop(1, "rgba(255,236,190,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  }
  for (const r of st.rings) {
    const x = xOf(r.tick);
    const y = yOf(r.step) + rowH / 2;
    g.lineWidth = 1;
    if (r.spread === 0) {
      for (let i = 0; i < 3; i++) {
        const rad = 8 + (2 - i) * 10 * (1 - 0.5 * r.gather);
        g.strokeStyle = `rgba(255,236,170,${r.a * (0.35 + 0.25 * i) * r.gather})`;
        g.strokeRect(Math.round(x - rad), Math.round(y - rad * 0.6), Math.round(2 * rad), Math.round(1.2 * rad));
      }
    } else {
      const rad = 12 + 26 * r.spread;
      g.lineWidth = 2;
      g.strokeStyle = `rgba(255,240,190,${r.a * (1 - r.spread)})`;
      g.strokeRect(Math.round(x - rad), Math.round(y - rad * 0.6), Math.round(2 * rad), Math.round(1.2 * rad));
    }
  }
  if (st.edge > 0.002) {
    const wd = st.edgeWide ? 6 : 3;
    fill(g, `rgba(255,220,130,${st.edge})`, L, 0, 1, h);
    fill(g, `rgba(255,220,130,${st.edge})`, R - 1, 0, 1, h);
    fill(g, `rgba(255,220,130,${st.edge * 0.25})`, L + 1, 0, wd, h);
    fill(g, `rgba(255,220,130,${st.edge * 0.25})`, R - 1 - wd, 0, wd, h);
  }
  if (st.climax > 0.01) {
    for (const [x0, dir] of [[L, 1], [R, -1]] as const) {
      const gr = g.createLinearGradient(x0, 0, x0 + dir * w * 0.1, 0);
      gr.addColorStop(0, `rgba(255,190,100,${0.3 * st.climax})`);
      gr.addColorStop(1, "rgba(255,190,100,0)");
      g.fillStyle = gr;
      g.fillRect(dir > 0 ? x0 : x0 - w * 0.1, 0, w * 0.1, h);
    }
    fill(g, `rgba(255,210,120,${FX_MAX.frame * st.climax})`, L, 0, R - L, 1);
    fill(g, `rgba(255,210,120,${FX_MAX.frame * st.climax})`, L, h - 1, R - L, 1);
  }
  if (st.shimmer > 0) {
    const x = L + (R - L) * st.shimmer;
    fill(g, `rgba(255,255,230,${0.5 * (1 - st.shimmer)})`, x - 12, 0, 24, 1);
  }
}

function fill(g: CanvasRenderingContext2D, c: string, x: number, y: number, w: number, h: number) {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}
