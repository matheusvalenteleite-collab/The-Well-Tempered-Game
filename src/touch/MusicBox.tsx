/**
 * The music box: the line being played, drawn as an 8-bit roll on a low-resolution canvas (one canvas
 * pixel is PX CSS pixels), time running right to left past a fixed playhead, pitch upwards on one axis
 * for the whole piece. The roll takes the colour of the key the music is in. A hit note shines (a gold
 * outline where the note was hidden); a missed one goes dark and shakes. The thumb's pitch is the
 * square on the playhead. While a line is played the box's pitch axis is the thumb's: the line's range
 * with the same margin, top to bottom.
 */
import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import { pitchRange, type TouchFugue } from "./fugue.ts";
import { MARGIN, type NoteState } from "./judge.ts";

/** CSS pixels per canvas pixel: the chunkiness of the 8-bit look. */
const PX = 2;
/** How many bars the box shows at once, and where the playhead stands (fraction of the width). */
const BARS_SHOWN = 3;
const PLAYHEAD = 0.25;

export const VOICE_INKS = ["#5cb2ff", "#ff8c4a", "#5fe08a"];

/** The roll's colour in each key: c a night blue, g a deep teal, E♭ a wine. */
export const KEY_TINTS: Record<string, string> = { c: "#0f1a40", g: "#082d31", Eb: "#2c1236" };
const DEFAULT_TINT = "#0e1126";

export interface BoxNote {
  on: number;
  dur: number;
  midi: number;
  state: NoteState;
  /** Tick of the hit or miss. */
  at?: number;
  /** In view before it is played. */
  shown: boolean;
}

export interface Frame {
  /** The tick the ear is at. */
  now: number;
  /** Ticks per second, for the effects timed in seconds. */
  tps: number;
  key: string;
  voice: number;
  notes: BoxNote[];
  /** The thumb's pitch, or null with no thumb down. */
  cursor: number | null;
  /** The range of the line being played: the box zooms to it. Absent: the whole piece. */
  range?: { lo: number; hi: number };
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
  tint.rgb = tint.rgb.map((v, i) => v + (target[i] - v) * 0.08);
  g.fillStyle = `rgb(${tint.rgb.map(Math.round).join(",")})`;
  g.fillRect(0, 0, w, h);

  const { lo, hi } = fr.range ? { lo: fr.range.lo - MARGIN, hi: fr.range.hi + MARGIN } : pitchRange(f);
  const rows = hi - lo + 1;
  const rowH = Math.max(1, Math.floor((h - 2) / rows));
  const top = Math.floor((h - rowH * rows) / 2);
  const yOf = (midi: number) => top + (hi - midi) * rowH;

  const barTicks = f.tpq * 4;
  const span = BARS_SHOWN * barTicks;
  const t0 = fr.now - PLAYHEAD * span;
  const xOf = (tick: number) => Math.round(((tick - t0) / span) * w);

  // Each C a faint row line, the octave's floor; beats faint, bar lines brighter.
  g.fillStyle = tok("--tg-grid");
  for (let m = Math.ceil(lo / 12) * 12; m <= hi; m += 12) g.fillRect(0, yOf(m) + rowH - 1, w, 1);
  for (let t = Math.floor(t0 / f.tpq) * f.tpq; t < t0 + span; t += f.tpq) {
    g.fillStyle = tok(t % barTicks === 0 ? "--tg-barline" : "--tg-grid");
    g.fillRect(xOf(t), 0, 1, h);
  }

  const ink = VOICE_INKS[fr.voice] ?? VOICE_INKS[0];
  const gold = tok("--tg-gold");
  const shine = tok("--tg-shine");
  const miss = tok("--tg-miss");
  const sinceMs = (at: number | undefined) => (at === undefined ? Infinity : ((fr.now - at) / fr.tps) * 1000);
  for (const n of fr.notes) {
    let x1 = xOf(n.on);
    const x2 = xOf(n.on + n.dur);
    if (x2 < 0 || x1 > w) continue;
    const y = yOf(n.midi);
    const bw = Math.max(1, x2 - x1 - 1);
    const bh = Math.max(1, rowH - (rowH > 2 ? 1 : 0));
    if (n.state === "pending") {
      if (!n.shown) continue;
      g.fillStyle = ink;
      g.fillRect(x1, y, bw, bh);
    } else if (n.state === "hit") {
      const t = sinceMs(n.at);
      g.fillStyle = ink;
      g.fillRect(x1, y, bw, bh);
      if (!n.shown) {
        // The gold outline: a hidden note brought into view by playing it.
        g.fillStyle = gold;
        g.fillRect(x1 - 1, y - 1, bw + 2, 1);
        g.fillRect(x1 - 1, y + bh, bw + 2, 1);
        g.fillRect(x1 - 1, y, 1, bh);
        g.fillRect(x1 + bw, y, 1, bh);
      }
      if (t < 260) {
        g.fillStyle = shine;
        g.globalAlpha = 1 - t / 260;
        g.fillRect(x1 - 1, y - 2, bw + 2, bh + 4);
        g.globalAlpha = 1;
      }
    } else {
      const t = sinceMs(n.at);
      if (t < 300) x1 += Math.round(Math.sin(t / 22) * 2 * (1 - t / 300));
      g.fillStyle = miss;
      g.fillRect(x1, y, bw, bh);
    }
  }

  const playX = xOf(fr.now);
  g.fillStyle = tok("--tg-playhead");
  g.fillRect(playX, 0, 1, h);
  if (fr.cursor !== null) {
    const cy = Math.round(top + (hi - fr.cursor) * rowH + rowH / 2);
    g.fillStyle = tok("--tg-fg");
    g.fillRect(playX - 2, cy - 2, 5, 5);
    g.fillStyle = tok("--tg-bg");
    g.fillRect(playX - 1, cy - 1, 3, 3);
  }
}
