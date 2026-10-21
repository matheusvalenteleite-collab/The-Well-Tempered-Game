/**
 * The music box: the voice being played, drawn as an 8-bit roll on a low-resolution canvas (one canvas
 * pixel is PX CSS pixels), time running right to left past a fixed playhead. Its rows are the voice's
 * lanes, the same ladder as under the thumbs (lanes.ts). The roll takes the colour of the key. A hit
 * note shines; a missed one goes dark and shakes; a long note let go early goes dark from there. The
 * thumbs' lanes light up on the playhead; a tap that plays nothing flashes its row.
 */
import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import type { TouchFugue } from "./fugue.ts";
import type { LaneNote } from "./lanes.ts";

/** CSS pixels per canvas pixel: the chunkiness of the 8-bit look. */
const PX = 2;
/** How many bars the box shows at once, and where the playhead stands (fraction of the width). */
const BARS_SHOWN = 3;
const PLAYHEAD = 0.25;

export const VOICE_INKS = ["#5cb2ff", "#ff8c4a", "#5fe08a"];

/** The roll's colour in each key: c a night blue, g a deep teal, E♭ a wine. */
export const KEY_TINTS: Record<string, string> = { c: "#0f1a40", g: "#082d31", Eb: "#2c1236" };
const DEFAULT_TINT = "#0e1126";

export interface Frame {
  /** The tick the ear is at. */
  now: number;
  /** Ticks per second, for the effects timed in seconds. */
  tps: number;
  key: string;
  voice: number;
  notes: LaneNote[];
  /** How many lanes. */
  lanes: number;
  /** The lanes under the thumbs now. */
  touched: number[];
  /** Taps that played nothing: their lane and tick. */
  flashes: { lane: number; at: number }[];
}

export function MusicBox({ fugue, frame, hud, children }: { fugue: TouchFugue; frame: MutableRefObject<Frame>; hud: ReactNode; children?: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    const tint = { rgb: hex(DEFAULT_TINT) };
    const loop = () => {
      const el = wrap.current;
      if (el && canvas.current) paint(canvas.current, el.clientWidth, el.clientHeight, fugue, frame.current, tint);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fugue, frame]);

  return (
    <section className="tg-box" aria-label="Music box">
      <header className="tg-hud">{hud}</header>
      <div className="tg-roll" ref={wrap}>
        <canvas ref={canvas} />
        {children}
      </div>
      <footer className="tg-legend">
        {fugue.voiceNames.map((name, i) => (
          <span key={name} style={{ color: VOICE_INKS[i], opacity: i === frame.current.voice ? 1 : 0.35 }}>
            ■ {name.toUpperCase()}
          </span>
        ))}
      </footer>
    </section>
  );
}

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

function paint(c: HTMLCanvasElement, cssW: number, cssH: number, f: TouchFugue, fr: Frame, tint: { rgb: number[] }) {
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

  // The key's colour, eased in over about half a second.
  const target = hex(KEY_TINTS[fr.key] ?? DEFAULT_TINT);
  tint.rgb = tint.rgb.map((v, i) => v + (target[i] - v) * 0.06);
  g.fillStyle = `rgb(${tint.rgb.map(Math.round).join(",")})`;
  g.fillRect(0, 0, w, h);

  const rows = Math.max(1, fr.lanes);
  const rowH = Math.max(2, Math.floor(h / rows));
  const top = Math.floor((h - rowH * rows) / 2);
  const yOf = (lane: number) => top + (rows - 1 - lane) * rowH;

  const barTicks = f.tpq * 4;
  const span = BARS_SHOWN * barTicks;
  const t0 = fr.now - PLAYHEAD * span;
  const xOf = (tick: number) => Math.round(((tick - t0) / span) * w);
  const playX = xOf(fr.now);

  // The lanes' floors faint; beats faint, bar lines brighter.
  g.fillStyle = tok("--tg-grid");
  for (let l = 0; l < fr.lanes; l++) g.fillRect(0, yOf(l) + rowH - 1, w, 1);
  for (let t = Math.floor(t0 / f.tpq) * f.tpq; t < t0 + span; t += f.tpq) {
    g.fillStyle = tok(t % barTicks === 0 ? "--tg-barline" : "--tg-grid");
    g.fillRect(xOf(t), 0, 1, h);
  }

  const sinceMs = (at: number | undefined) => (at === undefined ? Infinity : ((fr.now - at) / fr.tps) * 1000);
  // The thumbs' lanes, lit along the playhead's left.
  g.fillStyle = tok("--tg-lane-on");
  for (const l of fr.touched) g.fillRect(0, yOf(l), playX, rowH - 1);
  g.fillStyle = tok("--tg-wrong");
  for (const fl of fr.flashes) {
    const t = sinceMs(fl.at);
    if (t > 220) continue;
    g.globalAlpha = 1 - t / 220;
    g.fillRect(0, yOf(fl.lane), w, rowH - 1);
    g.globalAlpha = 1;
  }

  const ink = VOICE_INKS[fr.voice] ?? VOICE_INKS[0];
  const shine = tok("--tg-shine");
  const miss = tok("--tg-miss");
  const bh = Math.max(1, rowH - 2);
  for (const n of fr.notes) {
    let x1 = xOf(n.on);
    const x2 = xOf(n.on + n.dur);
    if (x2 < 0 || x1 > w) continue;
    const y = yOf(n.lane) + 1;
    const bw = Math.max(1, x2 - x1 - 1);
    if (n.state === "miss") {
      const t = sinceMs(n.at);
      if (t < 300) x1 += Math.round(Math.sin(t / 22) * 2 * (1 - t / 300));
      g.fillStyle = miss;
      g.fillRect(x1, y, bw, bh);
      continue;
    }
    g.fillStyle = ink;
    g.globalAlpha = n.state === "hit" ? 1 : 0.8;
    g.fillRect(x1, y, bw, bh);
    g.globalAlpha = 1;
    if (n.state === "hit") {
      // Hit: a bright cap; a long note let go early: dark from there (a short one may be let go at once).
      g.fillStyle = shine;
      g.fillRect(x1, y, Math.max(1, Math.min(bw, 2)), bh);
      if (n.long && n.off !== undefined) {
        const xo = xOf(n.off);
        g.fillStyle = miss;
        g.fillRect(xo, y, Math.max(0, x1 + bw - xo), bh);
      }
      const t = sinceMs(n.at);
      if (t < 240) {
        g.fillStyle = shine;
        g.globalAlpha = 1 - t / 240;
        g.fillRect(x1 - 1, y - 1, bw + 2, bh + 2);
        g.globalAlpha = 1;
      }
    }
  }

  g.fillStyle = tok("--tg-playhead");
  g.fillRect(playX, 0, 1, h);
}
