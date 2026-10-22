/**
 * The music box: the voice (or the two voices) being played, drawn as an 8-bit roll on a low-resolution
 * canvas (one canvas pixel is PX CSS pixels), time running right to left past a fixed playhead. Its
 * rows are the keys' rows (rows.ts): a band per voice played, the higher voice above, each row a staff
 * step, so a note's height in the box is the row the thumb plays it on (D167). Where the rows are set
 * afresh (every two bars, for a wide voice) a dashed line marks the change. The other voices, when they
 * play, are thin lines behind. The roll takes the colour of the key. A hit note shines; a missed one
 * goes dark and shakes; a long note let go early goes dark from there.
 */
import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import type { LaneNote } from "./lanes.ts";
import type { RowWindow } from "./rows.ts";
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
export function keyTint(key: string): string {
  const pcs: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  let pc = pcs[key[0].toLowerCase()] ?? 0;
  if (key[1] === "#") pc++;
  if (key[1] === "b") pc--;
  pc = (pc + 12) % 12;
  const fifths = (pc * 7) % 12;
  const minor = key[0] === key[0].toLowerCase();
  const hue = (220 + fifths * 30) % 360;
  return `hsl(${hue} ${minor ? 55 : 45}% ${minor ? 13 : 17}%)`;
}

export interface Band {
  voice: number;
  notes: LaneNote[];
  windows: RowWindow[];
  /** The rows held down now. */
  held: number[];
}

export interface Frame {
  /** The tick the ear is at. */
  now: number;
  /** Ticks per second, for the effects timed in seconds. */
  tps: number;
  key: string;
  barTicks: number;
  beatTicks: number;
  /** How many voices the fugue has (for the inks). */
  count: number;
  /** The voices played, the higher first. */
  bands: Band[];
  others: OtherNote[];
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

  // Beats faint, bar lines brighter.
  for (let t = Math.floor(t0 / fr.beatTicks) * fr.beatTicks; t < t0 + span; t += fr.beatTicks) {
    g.fillStyle = tok(t % fr.barTicks === 0 ? "--tg-barline" : "--tg-grid");
    g.fillRect(xOf(t), 0, 1, h);
  }

  const shine = tok("--tg-shine");
  const miss = tok("--tg-miss");
  const sinceMs = (at: number | undefined) => (at === undefined ? Infinity : ((fr.now - at) / fr.tps) * 1000);
  const n = Math.max(1, fr.bands.length);
  const bandH = Math.floor(h / n);

  fr.bands.forEach((band, bi) => {
    const top = bi * bandH;
    if (bi > 0) {
      g.fillStyle = tok("--tg-barline");
      g.fillRect(0, top, w, 1);
    }
    const ink = inkOf(band.voice, fr.count);
    for (const win of band.windows) {
      if (win.to < t0 || win.from > t0 + span) continue;
      const xa = Math.max(0, xOf(win.from));
      const xb = Math.min(w, xOf(win.to));
      const rowH = Math.max(2, Math.floor((bandH - 2) / win.rows));
      const pad = top + Math.floor((bandH - rowH * win.rows) / 2);
      const yOf = (step: number) => pad + (win.rows - 1 - (step - win.lo)) * rowH;
      const inside = (step: number) => step >= win.lo && step < win.lo + win.rows;
      // The rows' floors; where the rows are set afresh, a dashed line.
      g.fillStyle = tok("--tg-grid");
      for (let r = 0; r <= win.rows; r++) g.fillRect(xa, pad + r * rowH - 1, xb - xa, 1);
      if (win.from > t0) {
        g.fillStyle = tok("--tg-barline");
        for (let y = top; y < top + bandH; y += 4) g.fillRect(xa, y, 1, 2);
      }
      // The rows held down, lit along the playhead's left.
      if (win.from <= fr.now && fr.now < win.to) {
        g.fillStyle = tok("--tg-lane-on");
        for (const r of band.held) if (r >= 0 && r < win.rows) g.fillRect(Math.max(xa, 0), pad + (win.rows - 1 - r) * rowH, Math.max(0, playX - xa), rowH - 1);
      }
      // The other voices: thin lines behind.
      for (const o of fr.others) {
        if (o.on < win.from || o.on >= win.to || !inside(o.step)) continue;
        const x1 = xOf(o.on);
        const x2 = xOf(o.on + o.dur);
        if (x2 < 0 || x1 > w) continue;
        g.globalAlpha = 0.45;
        g.fillStyle = inkOf(o.voice, fr.count);
        g.fillRect(x1, yOf(o.step) + Math.floor(rowH / 2) - 1, Math.max(1, x2 - x1 - 1), Math.max(1, Math.floor(rowH / 4)));
        g.globalAlpha = 1;
      }
      const bh = Math.max(1, rowH - 2);
      for (const note of band.notes) {
        if (note.on < win.from || note.on >= win.to) continue;
        let x1 = xOf(note.on);
        const x2 = xOf(note.on + note.dur);
        if (x2 < 0 || x1 > w) continue;
        const y = yOf(Math.max(win.lo, Math.min(win.lo + win.rows - 1, note.step))) + 1;
        const bw = Math.max(1, x2 - x1 - 1);
        if (note.state === "miss") {
          const t = sinceMs(note.at);
          if (t < 300) x1 += Math.round(Math.sin(t / 22) * 2 * (1 - t / 300));
          g.fillStyle = miss;
          g.fillRect(x1, y, bw, bh);
          continue;
        }
        g.fillStyle = ink;
        g.globalAlpha = note.state === "hit" ? 1 : note.ride ? 0.55 : 0.85;
        g.fillRect(x1, y, bw, note.ride ? Math.max(1, Math.floor(bh / 2)) : bh);
        g.globalAlpha = 1;
        if (note.state === "hit") {
          g.fillStyle = shine;
          g.fillRect(x1, y, Math.max(1, Math.min(bw, 2)), bh);
          if (note.long && note.off !== undefined) {
            const xo = xOf(note.off);
            g.fillStyle = miss;
            g.fillRect(xo, y, Math.max(0, x1 + bw - xo), bh);
          }
          const t = sinceMs(note.at);
          if (t < 240) {
            g.fillStyle = shine;
            g.globalAlpha = 1 - t / 240;
            g.fillRect(x1 - 1, y - 1, bw + 2, bh + 2);
            g.globalAlpha = 1;
          }
        }
      }
    }
  });

  g.fillStyle = tok("--tg-playhead");
  g.fillRect(playX, 0, 1, h);
}
