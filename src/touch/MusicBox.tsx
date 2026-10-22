/**
 * The music box (D169): the whole piece, every voice, drawn as an 8-bit roll on a low-resolution canvas
 * (one canvas pixel is PX CSS pixels), time running right to left past a fixed playhead. One fixed
 * ladder of staff steps covers the piece's whole range, so the voices keep their places (the bass
 * always below the soprano) and every note is a block of the same height. The voice played is drawn
 * full and outlined; the others in their colours, dimmer. A hit note shines; a missed one goes dark and
 * shakes; a long note let go early goes dark from there. A bracket on the playhead marks the steps the
 * keys under the thumbs reach now. The roll takes the colour of the key.
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
  /** The steps the keys reach now (lowest, how many), if playing. */
  keys?: { lo: number; rows: number };
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

  // The keys' reach now: a bracket on the playhead.
  if (fr.keys) {
    const yTop = yOf(fr.keys.lo + fr.keys.rows - 1);
    const yBot = yOf(fr.keys.lo) + rowH;
    g.fillStyle = tok("--tg-lane-on");
    g.fillRect(0, yTop, playX, yBot - yTop);
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
  }
  g.globalAlpha = 1;

  // The voice played: full, outlined.
  const ink = inkOf(fr.voice, fr.count);
  const shine = tok("--tg-shine");
  const miss = tok("--tg-miss");
  const edge = tok("--tg-fg");
  const sinceMs = (at: number | undefined) => (at === undefined ? Infinity : ((fr.now - at) / fr.tps) * 1000);
  for (const n of fr.notes) {
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

  g.fillStyle = tok("--tg-playhead");
  g.fillRect(playX, 0, 1, h);
}
