/**
 * The music box (D169): the whole piece, every voice, drawn as an 8-bit roll on a low-resolution canvas
 * (one canvas pixel is PX CSS pixels), time running right to left past a fixed playhead. One fixed
 * ladder of staff steps covers the piece's whole range, so the voices keep their places (the bass
 * always below the soprano) and every note is a block of the same height. The voice played is drawn
 * full and outlined; the others in their colours, dimmer. A hit note shines; a missed one goes dark and
 * shakes; a long note let go early goes dark from there. The roll takes the colour of the key.
 * D174, the subject: its notes, in whatever voice, are dotted along their top; a ◆ stands over the
 * first note of each entry as it comes, in the voice's colour, gold when the voice is the player's.
 */
import { tr } from "../i18n/index.ts";
import { bossBar, cadenceMarks, pixText, ribbons, sparks, strikes, zoneGlow, type Burst, type Pop, type Span } from "./box-fx.ts";
import { paintVariant } from "./box-variants.ts";
import { paintUi } from "./ui/index.ts";
import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import type { LaneNote } from "./lanes.ts";
import type { OtherNote } from "./voice-mode.ts";

/** CSS pixels per canvas pixel: the chunkiness of the 8-bit look. */
const PX = 2;
/** How many bars the box shows at once, and where the playhead stands (fraction of the width). */
const BARS_SHOWN = 3;
const PLAYHEAD = 0.25;

/** The voices' colours, top voice first, for two to five voices. */
const INKS: Record<number, string[]> = {
  2: ["#5cb2ff", "#5fe08a"],
  3: ["#5cb2ff", "#ff8c4a", "#5fe08a"],
  4: ["#5cb2ff", "#ff8c4a", "#c78bff", "#5fe08a"],
  5: ["#5cb2ff", "#7fe3e0", "#ff8c4a", "#c78bff", "#5fe08a"],
};
export function inkOf(voice: number, count: number): string {
  return (INKS[count] ?? INKS[4])[voice] ?? "#ecead9";
}

/** The roll's colour in a key (D167: all 24): the circle of fifths round the hue wheel, minor keys darker. */
export function keyTint(key: string, light = 0): string {
  const pcs: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  let pc = pcs[key[0].toLowerCase()] ?? 0;
  if (key[1] === "#") pc++;
  if (key[1] === "b") pc--;
  pc = (pc + 12) % 12;
  const fifths = (pc * 7) % 12;
  const minor = key[0] === key[0].toLowerCase();
  const hue = (220 + fifths * 30) % 360;
  return `hsl(${hue} ${minor ? 55 : 45}% ${(minor ? 13 : 17) + light}%)`;
}

/**
 * The ladder as paint() lays it out in a roll `cssH` pixels high: each staff step's middle (CSS px from
 * the roll's top), and a row's height (D179: the testbench's side bars line up with it).
 */
/** A key of LADDER on a computer: a step or a leap, up or down, or the same note. */
export type Arrow = "up" | "down" | "left" | "right" | "rise" | "fall" | "same" | "right2" | "left2" | "free";
/** The keys' arrows, 5 by 5. */
export const ARROW_PIXELS: Record<Arrow, string[]> = {
  up: ["00100", "01110", "10101", "00100", "00100"],
  down: ["00100", "00100", "10101", "01110", "00100"],
  right: ["00100", "00010", "11111", "00010", "00100"],
  left: ["00100", "01000", "11111", "01000", "00100"],
  rise: ["00111", "00011", "00101", "01000", "10000"],
  fall: ["10000", "01000", "00101", "00011", "00111"],
  same: ["00000", "00000", "01100", "01100", "00000"],
  right2: ["10100", "01010", "00101", "01010", "10100"],
  left2: ["00101", "01010", "10100", "01010", "00101"],
  free: ["11111", "10001", "10001", "10001", "11111"],
};

export function ladderGeometry(lo: number, hi: number, cssH: number): { yOf: (step: number) => number; rowH: number } {
  const h = Math.max(1, Math.floor(cssH / PX));
  const rows = hi - (lo - 1) + 2;
  const rowH = Math.max(2, Math.floor(h / rows));
  const top = Math.floor((h - rowH * rows) / 2);
  return { yOf: (step) => (top + (hi + 1 - step) * rowH + rowH / 2) * PX, rowH: rowH * PX };
}

export interface Frame {
  /** The tick the ear is at. */
  now: number;
  /** Ticks per second, for the effects timed in seconds. */
  tps: number;
  key: string;
  barTicks: number;
  beatTicks: number;
  /** How many voices the piece has (for the inks). */
  count: number;
  /** The piece's range of staff steps: the ladder. */
  lo: number;
  hi: number;
  /**
   * D211: the whole piece's range, where the ladder is only the voice's (LADDER): the other voices'
   * notes beyond it are drawn squeezed into the box's margins above and below, so all the music shows
   * and the rows (lined up with the bars) keep their size.
   */
  spill?: { lo: number; hi: number };
  /** The voice played, and its notes as the game judges them. */
  voice: number;
  notes: LaneNote[];
  /** Every other voice's notes. */
  others: OtherNote[];
  /** The subject's notes ("voice:onset") and the entries' first notes, if the piece has them. */
  subject?: Set<string>;
  entries?: { voice: number; on: number; step: number }[];
  /** What the player has sounded (the testbench, D170): the pitch as a step, fractions allowed, in time. */
  trace?: { tick: number; step: number; on: boolean }[];
  /** The testbench (D178): each touch, at the step it asked for, right or wrong. */
  marks?: { tick: number; step: number; ok: boolean }[];
  /** The testbench's score (D181): each entry ("voice:onset") captured (gold) or lost (grey). */
  entryState?: Map<string, "captured" | "lost" | "open">;
  /** The testbench's TWO VOICES (D180): a second voice played, drawn as the first. */
  voice2?: number;
  notes2?: LaneNote[];
  /** The testbench's THUMBS ↔ (D178): each note's move (aligned with `notes`), drawn as the thumb it wants. */
  /** LADDER on a computer (D183): the key each note asks for, drawn over it. */
  arrows?: (Arrow | null)[];
  /** D186: the entries drawn whole (box-fx.ts), the voices' names, the bosses (the player's entries), points and bursts, the zone. */
  spans?: Span[];
  names?: string[];
  bossFight?: boolean;
  pops?: Pop[];
  bursts?: Burst[];
  zone?: "pleno" | "fuoco" | null;
  /** D205: each ornamented note's sign ("voice:onset" → "TR", "~|"…). */
  ornaments?: Map<string, string>;
  /** D272: the reading's marks on the subject's notes ("voice:onset"): joined to the next, detached, short, accented. */
  readingMarks?: Map<string, { join: boolean | null; short: boolean | null; accent: boolean | null }>;
  /** D194: the cadences, named. */
  cadences?: { on: number; text: string }[];
  /** Each voice's range of steps (the design study's staves, box-variants.ts). */
  ranges?: { lo: number; hi: number }[];
  /** The piece's id (the interface templates, ui/index.ts, `?ui=NAME`). */
  piece?: string;
}

export function MusicBox({ frame, hud, legend, children }: { frame: MutableRefObject<Frame>; hud: ReactNode; legend: ReactNode; children?: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = wrap.current;
      if (el && canvas.current) paint(canvas.current, el.clientWidth, el.clientHeight, frame.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [frame]);

  return (
    <section className="tg-box" aria-label="Music box">
      <header className="tg-hud">{hud}</header>
      <div className="tg-roll" ref={wrap}>
        <canvas ref={canvas} />
        {children}
      </div>
      <footer className="tg-legend">{legend}</footer>
    </section>
  );
}

function paint(c: HTMLCanvasElement, cssW: number, cssH: number, fr: Frame) {
  // D228: the interface chosen (ui/index.ts: ⚙ INTERFACE, or `?ui=NAME`), unless CLASSIC.
  if (paintUi(c, cssW, cssH, fr)) return;
  paintClassic(c, cssW, cssH, fr);
}

/** The box as it was (CLASSIC); also the INTERFACE panel's thumbnail. */
export function paintClassic(c: HTMLCanvasElement, cssW: number, cssH: number, fr: Frame) {
  const w = Math.max(1, Math.floor(cssW / PX));
  const h = Math.max(1, Math.floor(cssH / PX));
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
    c.style.width = `${w * PX}px`;
    c.style.height = `${h * PX}px`;
  }
  const g = c.getContext("2d")!;
  // D228: an interface drawn before (a change in ⚙) may have left its scale.
  g.setTransform(1, 0, 0, 1, 0, 0);
  const css = getComputedStyle(c);
  const tok = (name: string) => css.getPropertyValue(name).trim();
  // The design study (box-variants.ts): only with `?boxv=N` in the page's address.
  if (fr.spill && paintVariant(g, w, h, fr)) return;

  g.fillStyle = keyTint(fr.key);
  g.fillRect(0, 0, w, h);

  const span = BARS_SHOWN * fr.barTicks;
  const t0 = fr.now - PLAYHEAD * span;
  const xOf = (tick: number) => Math.round(((tick - t0) / span) * w);
  const playX = xOf(fr.now);
  // The ladder: one row per staff step over the piece's range, a step of room either side.
  const lo = fr.lo - 1;
  const rows = fr.hi - lo + 2;
  const rowH = Math.max(2, Math.floor(h / rows));
  const top = Math.floor((h - rowH * rows) / 2);
  const lin = (step: number) => top + (fr.hi + 1 - step) * rowH;
  const bh = Math.max(2, rowH);
  // D211: beyond the ladder, the margins: every step above it squeezed into the space over the top
  // row, every step below into the space under the bottom one.
  const sp = fr.spill;
  const upTo = sp ? Math.max(fr.hi, sp.hi) : fr.hi;
  const downTo = sp ? Math.min(fr.lo, sp.lo) : fr.lo;
  const capH = lin(fr.hi);
  const footY = lin(fr.lo) + rowH;
  const footH = h - footY;
  const upTh = Math.max(1, Math.floor(capH / Math.max(1, upTo - fr.hi + 1)));
  const downTh = Math.max(1, Math.floor(footH / Math.max(1, fr.lo - downTo + 1)));
  const yOf = (step: number) =>
    !sp || (step <= fr.hi && step >= fr.lo)
      ? lin(step)
      : step > fr.hi
        ? Math.max(0, Math.round(capH - ((step - fr.hi) / (upTo - fr.hi + 1)) * capH) - upTh)
        : Math.min(h - downTh, Math.round(footY + ((fr.lo - step) / (fr.lo - downTo + 1)) * footH));
  const hOf = (step: number) => (!sp || (step <= fr.hi && step >= fr.lo) ? bh : step > fr.hi ? upTh : downTh);
  if (sp && (upTo > fr.hi || downTo < fr.lo)) {
    // The margins a shade darker, a hairline where the ladder begins and ends.
    g.fillStyle = "rgba(0,0,0,0.22)";
    if (upTo > fr.hi) g.fillRect(0, 0, w, capH);
    if (downTo < fr.lo) g.fillRect(0, footY, w, footH);
    g.fillStyle = "rgba(255,255,255,0.08)";
    if (upTo > fr.hi) g.fillRect(0, capH, w, 1);
    if (downTo < fr.lo) g.fillRect(0, footY - 1, w, 1);
  }

  // Beats faint, bar lines brighter.
  for (let t = Math.floor(t0 / fr.beatTicks) * fr.beatTicks; t < t0 + span; t += fr.beatTicks) {
    g.fillStyle = tok(t % fr.barTicks === 0 ? "--tg-barline" : "--tg-grid");
    g.fillRect(xOf(t), 0, 1, h);
  }

  const fx = { g, w, h, xOf, yOf, hOf, bh, now: fr.now, tps: fr.tps, gold: tok("--tg-gold"), miss: tok("--tg-miss"), fg: tok("--tg-fg"), ink: (v: number) => inkOf(v, fr.count) };
  if (fr.spans) ribbons(fx, fr.spans, fr.notes2 && fr.voice2 !== undefined ? [fr.voice, fr.voice2] : [fr.voice], fr.names, fr.entryState);

  // The other voices: their colours, dimmer; (D208) their subject notes full, standing out of the trail.
  // D269: never mistaken for the player's: thinner (half a row, centred), flat (no shadow, no solid
  // outline); a subject note framed in gold dashes (the player's own are framed solid); a note glows
  // while it sounds (brighter, a faint halo in its colour), never in the player's hit colour.
  const subjNotes = new Set(fr.spans?.filter((sp) => sp.form !== "counter").flatMap((sp) => sp.path.map((n) => `${sp.voice}:${n.on}`)) ?? []);
  for (const o of fr.others) {
    const x1 = xOf(o.on);
    if (x1 > w) break;
    const x2 = xOf(o.on + o.dur);
    if (x2 < 0) continue;
    const oh = hOf(o.step);
    const full = oh === bh;
    const isSubj = subjNotes.has(`${o.voice}:${o.on}`);
    const sounding = fr.now >= o.on && fr.now < o.on + o.dur;
    const ink = inkOf(o.voice, fr.count);
    const bw = Math.max(1, x2 - x1 - 1);
    const th = full ? Math.max(1, Math.round(bh * 0.5)) : oh;
    const y = yOf(o.step) + (full ? Math.floor((bh - 1 - th) / 2) : 0);
    if (sounding && full) {
      g.globalAlpha = 0.22;
      g.fillStyle = ink;
      g.fillRect(x1 - 1, yOf(o.step) - 1, bw + 2, bh + 1);
    }
    if (isSubj && full) {
      // D279: the subject's gold stripe over the note, dashed (two pixels on, two off): the player's is solid.
      g.globalAlpha = sounding ? 1 : 0.85;
      g.fillStyle = fx.gold;
      for (let x = x1; x < x1 + bw; x += 4) g.fillRect(x, y - 2, Math.min(2, x1 + bw - x), 1);
    }
    g.globalAlpha = sounding ? 1 : isSubj ? 0.8 : full ? 0.45 : 0.7;
    g.fillStyle = ink;
    g.fillRect(x1, y, bw, th);
    if (sounding && th > 1) {
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.fillRect(x1, y, bw, 1);
    }
    if (!fr.spans && fr.subject?.has(`${o.voice}:${o.on}`)) dots(g, x1, x2, yOf(o.step), tok("--tg-fg"));
  }
  g.globalAlpha = 1;

  // The voice played (or two): full, outlined.
  const shine = tok("--tg-shine");
  const miss = tok("--tg-miss");
  const edge = tok("--tg-fg");
  const played: [number, LaneNote[]][] = [[fr.voice, fr.notes]];
  if (fr.notes2 && fr.voice2 !== undefined) played.push([fr.voice2, fr.notes2]);
  for (const [pv, pnotes] of played) {
    const inkPv = inkOf(pv, fr.count);
    const sinceMs = (at: number | undefined) => (at === undefined ? Infinity : ((fr.now - at) / fr.tps) * 1000);
    for (const n of pnotes) {
      // D214: SUBJECT's line passes between voices, each note in its own colour.
      const ink = n.voice === undefined || n.voice === pv ? inkPv : inkOf(n.voice, fr.count);
      let x1 = xOf(n.on);
      if (x1 > w) break;
      const x2 = xOf(n.on + n.dur);
      if (x2 < 0) continue;
      const y = yOf(n.step);
      const bw = Math.max(1, x2 - x1 - 1);
      if (n.state === "miss") {
        const t = sinceMs(n.at);
        if (t < 300) x1 += Math.round(Math.sin(t / 22) * 2 * (1 - t / 300));
        g.fillStyle = miss;
        g.fillRect(x1, y, bw, bh - 1);
        continue;
      }
      if (n.ride) {
        // D191: a note that rides (too quick to strike, played for the player): thin, unoutlined, faint until it sounds.
        const th = Math.max(1, Math.floor(bh / 2));
        g.globalAlpha = n.state === "hit" ? 0.9 : 0.5;
        g.fillStyle = n.state === "hit" ? shine : ink;
        g.fillRect(x1, y + Math.floor((bh - th) / 2), bw, th);
        g.globalAlpha = 1;
        continue;
      }
      // D202: each block extruded a pixel down and right (a voxel), then outlined and filled.
      g.fillStyle = "rgba(0,0,0,0.55)";
      g.fillRect(x1 + 1, y + 1, bw + 1, bh);
      // D279: the player's notes always outlined white (the owner took the gold frame for "yours"); a
      // subject note marked by a gold stripe over it (the others' subject notes: dashed).
      g.fillStyle = edge;
      g.fillRect(x1 - 1, y - 1, bw + 2, bh + 1);
      if (subjNotes.has(`${n.voice ?? pv}:${n.on}`)) {
        g.fillStyle = fx.gold;
        g.fillRect(x1 - 1, y - 3, bw + 2, 2);
      }
      g.fillStyle = ink;
      g.fillRect(x1, y, bw, bh - 1);
      if (bh > 3) {
        g.fillStyle = "rgba(255,255,255,0.28)";
        g.fillRect(x1, y, bw, 1);
      }
      if (!fr.spans && fr.subject?.has(`${pv}:${n.on}`)) dots(g, x1, x2, y, edge);
      if (n.state === "hit") {
        g.fillStyle = shine;
        g.fillRect(x1, y, Math.max(1, Math.min(bw, 2)), bh - 1);
        if (n.long && n.off !== undefined) {
          const xo = xOf(n.off);
          g.fillStyle = miss;
          g.fillRect(xo, y, Math.max(0, x1 + bw - xo), bh - 1);
        }
        const t = sinceMs(n.at);
        if (t < 240) {
          g.fillStyle = shine;
          g.globalAlpha = 1 - t / 240;
          g.fillRect(x1 - 1, y - 1, bw + 2, bh + 1);
          g.globalAlpha = 1;
        }
      }
    }
  }

  // LADDER on a computer: each coming note's key, a small pixel arrow over it (a dot: the same note).
  if (fr.arrows)
    fr.notes.forEach((n, i) => {
      const a = fr.arrows![i];
      const x = xOf(n.on);
      if (!a || n.ride || n.state !== "pending" || x < playX || x > w || (i > 0 && fr.notes[i - 1].on === n.on)) return;
      g.fillStyle = edge;
      ARROW_PIXELS[a].forEach((row, ry) => [...row].forEach((on, rx) => on === "1" && g.fillRect(x + rx, yOf(n.step) - 7 + ry, 1, 1)));
    });

  // The touches: where each landed (the step it asked for), light when right, red when wrong.
  for (const mk of fr.marks ?? []) {
    const x = xOf(mk.tick);
    if (x < 0 || x > playX + 2) continue;
    const y = yOf(mk.step) + Math.floor(bh / 2);
    g.fillStyle = mk.ok ? shine : tok("--tg-wrong");
    g.fillRect(x - 1, y - 1, 3, 3);
  }

  // The entries coming: a diamond over each entry's first note (where they are not drawn whole).
  for (const e of fr.spans ? [] : (fr.entries ?? [])) {
    const x = xOf(e.on);
    if (x < (fr.entryState?.has(`${e.voice}:${e.on}`) ? 0 : playX - 2) || x > w) continue;
    const y = yOf(e.step) - 6;
    const st = fr.entryState?.get(`${e.voice}:${e.on}`);
    g.fillStyle = st === "captured" ? tok("--tg-gold") : st === "lost" ? tok("--tg-miss") : e.voice === fr.voice && !fr.entryState ? tok("--tg-gold") : inkOf(e.voice, fr.count);
    g.fillRect(x + 1, y, 1, 1);
    g.fillRect(x, y + 1, 3, 1);
    g.fillRect(x - 1, y + 2, 5, 1);
    g.fillRect(x, y + 3, 3, 1);
    g.fillRect(x + 1, y + 4, 1, 1);
  }

  // The player's own line: what they sounded, against the music.
  if (fr.trace?.length) {
    const ys = (step: number) => top + (fr.hi + 1 - step) * rowH + rowH / 2;
    g.fillStyle = tok("--tg-fg");
    let prev: { x: number; y: number } | null = null;
    for (const p of fr.trace) {
      const x = xOf(p.tick);
      if (x < 0 || x > playX) {
        prev = null;
        continue;
      }
      const y = Math.round(ys(p.step));
      if (p.on && prev) {
        const x0 = Math.min(prev.x, x);
        g.fillRect(x0, Math.min(prev.y, y), Math.max(1, Math.abs(x - prev.x)), Math.max(2, Math.abs(y - prev.y) + 1));
      }
      prev = p.on ? { x, y } : null;
    }
  }

  // D279: YOU over the player's next note (the voice played, whatever its colour), so which line is
  // yours is never a guess.
  {
    const n = fr.notes.find((m) => m.on + m.dur >= fr.now && !m.ride);
    if (n) {
      const x = Math.max(playX + 2, xOf(n.on));
      if (x < w - 12) pixText(g, tr("YOU"), x, Math.min(h - 6, yOf(n.step) + bh + 2), edge);
    }
  }
  g.fillStyle = tok("--tg-playhead");
  g.fillRect(playX, 0, 1, h);
  // D205: the ornaments' signs, small, over their notes (gold over the player's, the ink over the others').
  if (fr.ornaments) {
    for (const o of fr.others) {
      const mk = fr.ornaments.get(`${o.voice}:${o.on}`);
      const x = xOf(o.on);
      if (mk && x > -8 && x < w) pixText(g, mk, x, yOf(o.step) - 6, inkOf(o.voice, fr.count));
    }
    for (const [pv, pnotes] of played)
      for (const n of pnotes) {
        const mk = fr.ornaments.get(`${pv}:${n.on}`);
        const x = xOf(n.on);
        if (mk && x > -8 && x < w) pixText(g, mk, x, yOf(n.step) - 6, fx.gold);
      }
  }
  // D272: the reading's marks over the player's subject notes: a slur to the next where joined, a red
  // stroke in the gap where detached, a dot where short, an accent.
  if (fr.readingMarks)
    for (const [pv, pnotes] of played)
      pnotes.forEach((n, j) => {
        const mk = fr.readingMarks!.get(`${pv}:${n.on}`);
        const x = xOf(n.on);
        if (!mk || x < -40 || x > w) return;
        const y = yOf(n.step);
        const nx = pnotes.slice(j + 1).find((m) => m.on > n.on);
        if (mk.join && nx) {
          const x2 = xOf(nx.on);
          const top = Math.min(y, yOf(nx.step)) - 3;
          g.fillStyle = fx.gold;
          g.fillRect(x + 1, top, Math.max(1, x2 - x - 1), 1);
          g.fillRect(x, top + 1, 1, 1);
          g.fillRect(x2, top + 1, 1, 1);
        }
        if (mk.join === false && nx) {
          g.fillStyle = "#ec5a4a";
          g.fillRect(Math.round((xOf(n.on + n.dur) + xOf(nx.on)) / 2) - 1, y - 2, 1, bh + 3);
        }
        if (mk.short) {
          g.fillStyle = edge;
          g.fillRect(Math.round((x + xOf(n.on + n.dur)) / 2), y - 3, 1, 1);
        }
        if (mk.accent) pixText(g, ">", x, y - 6, "#ff8a3d");
      });
  if (fr.spans) strikes(fx, fr.spans);
  if (fr.cadences) cadenceMarks(fx, fr.cadences);
  if (fr.spans && fr.bossFight) bossBar(fx, fr.spans.filter((s) => s.form !== "counter"), fr.voice, fr.notes);
  sparks(fx, fr.pops ?? [], fr.bursts ?? []);
  zoneGlow(fx, fr.zone ?? null);
}

/** The subject's texture: dots along a block's top. */
function dots(g: CanvasRenderingContext2D, x1: number, x2: number, y: number, ink: string) {
  const a = g.globalAlpha;
  g.globalAlpha = 0.85;
  g.fillStyle = ink;
  for (let x = x1 + 1; x < x2 - 1; x += 2) g.fillRect(x, y, 1, 1);
  g.globalAlpha = a;
}
