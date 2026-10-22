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
export type Arrow = "up" | "down" | "left" | "right" | "rise" | "fall" | "same";
/** The keys' arrows, 5 by 5. */
export const ARROW_PIXELS: Record<Arrow, string[]> = {
  up: ["00100", "01110", "10101", "00100", "00100"],
  down: ["00100", "00100", "10101", "01110", "00100"],
  right: ["00100", "00010", "11111", "00010", "00100"],
  left: ["00100", "01000", "11111", "01000", "00100"],
  rise: ["00111", "00011", "00101", "01000", "10000"],
  fall: ["10000", "01000", "00101", "00011", "00111"],
  same: ["00000", "00000", "01100", "01100", "00000"],
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
  /** The testbench's FINGERING (D181): each note's thumb and articulation (aligned with `notes`), and the bosses' spans. */
  fingers?: { hand: "left" | "right"; art: string; boss?: string }[];
  bosses?: { from: number; to: number; kind: "sub" | "boss" }[];
  /** The testbench's score (D181): each entry ("voice:onset") captured (gold) or lost (grey). */
  entryState?: Map<string, "captured" | "lost" | "open">;
  /** The testbench's TWO VOICES (D180): a second voice played, drawn as the first. */
  voice2?: number;
  notes2?: LaneNote[];
  /** The testbench's THUMBS ↔ (D178): each note's move (aligned with `notes`), drawn as the thumb it wants. */
  /** LADDER on a computer (D183): the key each note asks for, drawn over it. */
  arrows?: (Arrow | null)[];
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
  const w = Math.max(1, Math.floor(cssW / PX));
  const h = Math.max(1, Math.floor(cssH / PX));
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
    c.style.width = `${w * PX}px`;
    c.style.height = `${h * PX}px`;
  }
  const g = c.getContext("2d")!;
  const css = getComputedStyle(c);
  const tok = (name: string) => css.getPropertyValue(name).trim();

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
  const yOf = (step: number) => top + (fr.hi + 1 - step) * rowH;
  const bh = Math.max(2, rowH);

  // Beats faint, bar lines brighter.
  for (let t = Math.floor(t0 / fr.beatTicks) * fr.beatTicks; t < t0 + span; t += fr.beatTicks) {
    g.fillStyle = tok(t % fr.barTicks === 0 ? "--tg-barline" : "--tg-grid");
    g.fillRect(xOf(t), 0, 1, h);
  }

  // FINGERING's bosses: a tinted band over their spans.
  for (const b of fr.bosses ?? []) {
    const x1 = xOf(b.from);
    const x2 = xOf(b.to);
    if (x2 < 0 || x1 > w) continue;
    g.fillStyle = b.kind === "boss" ? "rgba(255,80,70,0.13)" : "rgba(199,139,255,0.1)";
    g.fillRect(x1, 0, x2 - x1, h);
    g.fillStyle = b.kind === "boss" ? "#ff5a4f" : "#c78bff";
    g.fillRect(x1, 0, Math.max(1, x2 - x1), 1);
  }

  // The other voices: their colours, dimmer.
  for (const o of fr.others) {
    const x1 = xOf(o.on);
    if (x1 > w) break;
    const x2 = xOf(o.on + o.dur);
    if (x2 < 0) continue;
    g.globalAlpha = 0.5;
    g.fillStyle = inkOf(o.voice, fr.count);
    g.fillRect(x1, yOf(o.step), Math.max(1, x2 - x1 - 1), bh - 1);
    if (fr.subject?.has(`${o.voice}:${o.on}`)) dots(g, x1, x2, yOf(o.step), tok("--tg-fg"));
  }
  g.globalAlpha = 1;

  // The voice played (or two): full, outlined.
  const shine = tok("--tg-shine");
  const miss = tok("--tg-miss");
  const edge = tok("--tg-fg");
  const played: [number, LaneNote[]][] = [[fr.voice, fr.notes]];
  if (fr.notes2 && fr.voice2 !== undefined) played.push([fr.voice2, fr.notes2]);
  for (const [pv, pnotes] of played) {
    const ink = inkOf(pv, fr.count);
    const sinceMs = (at: number | undefined) => (at === undefined ? Infinity : ((fr.now - at) / fr.tps) * 1000);
    for (const n of pnotes) {
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
      g.fillStyle = edge;
      g.fillRect(x1 - 1, y - 1, bw + 2, bh + 1);
      g.fillStyle = ink;
      g.fillRect(x1, y, bw, bh - 1);
      if (fr.subject?.has(`${pv}:${n.on}`)) dots(g, x1, x2, y, edge);
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

  // FINGERING: L or R over each coming note (pixel letters), its articulation under it.
  if (fr.fingers)
    fr.notes.forEach((n, i) => {
      const fg = fr.fingers![i];
      const x = xOf(n.on);
      const x2 = xOf(n.on + n.dur);
      if (!fg || n.state !== "pending" || x < playX || x > w || (i > 0 && fr.notes[i - 1].on === n.on)) return;
      const y = yOf(n.step);
      g.fillStyle = fg.hand === "left" ? "#ff8c4a" : "#5cb2ff";
      // A 3 by 5 pixel letter, above the block.
      const L = ["100", "100", "100", "100", "111"];
      const R = ["110", "101", "110", "101", "101"];
      (fg.hand === "left" ? L : R).forEach((row, ry) => [...row].forEach((on, rx) => on === "1" && g.fillRect(x + rx, y - 7 + ry, 1, 1)));
      g.fillStyle = edge;
      if (fg.art === "staccato") g.fillRect(x + 1, y + bh + 1, 1, 1);
      if (fg.art === "tenuto") g.fillRect(x, y + bh + 1, Math.max(2, x2 - x - 1), 1);
      if (fg.art === "legato") g.fillRect(x - 3, y + bh + 1, Math.max(3, x2 - x + 2), 1);
    });

  // LADDER on a computer: each coming note's key, a small pixel arrow over it (a dot: the same note).
  if (fr.arrows)
    fr.notes.forEach((n, i) => {
      const a = fr.arrows![i];
      const x = xOf(n.on);
      if (!a || n.state !== "pending" || x < playX || x > w || (i > 0 && fr.notes[i - 1].on === n.on)) return;
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

  // The entries coming: a diamond over each entry's first note.
  for (const e of fr.entries ?? []) {
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

  g.fillStyle = tok("--tg-playhead");
  g.fillRect(playX, 0, 1, h);
}

/** The subject's texture: dots along a block's top. */
function dots(g: CanvasRenderingContext2D, x1: number, x2: number, y: number, ink: string) {
  const a = g.globalAlpha;
  g.globalAlpha = 0.85;
  g.fillStyle = ink;
  for (let x = x1 + 1; x < x2 - 1; x += 2) g.fillRect(x, y, 1, 1);
  g.globalAlpha = a;
}
