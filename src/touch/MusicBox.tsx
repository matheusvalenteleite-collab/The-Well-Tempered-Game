/**
 * The music box: the fugue drawn as an 8-bit roll on a low-resolution canvas (one canvas pixel is
 * PX CSS pixels), time running right to left past a fixed playhead, pitch upwards on one axis for
 * the whole piece. Notes under the playhead are the ones sounding; the game will make them shine
 * (a good move) or shake (a bad one).
 */
import { useEffect, useRef } from "react";
import { barStart, pitchRange, type TouchFugue } from "./fugue.ts";

/** CSS pixels per canvas pixel: the chunkiness of the 8-bit look. */
const PX = 2;
/** How many bars the box shows at once, and where the playhead stands (fraction of the width). */
const BARS_SHOWN = 3;
const PLAYHEAD = 0.25;
/** The still frame of this step: the soprano's entry with the subject (bar 3), the alto's countersubject against it. */
const FRAME_BAR = 3;

export const VOICE_INKS = ["#5cb2ff", "#ff8c4a", "#5fe08a"];

export function MusicBox({ fugue }: { fugue: TouchFugue }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = wrap.current!;
    const draw = () => paint(canvas.current!, el.clientWidth, el.clientHeight, fugue, barStart(fugue, FRAME_BAR));
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fugue]);

  return (
    <section className="tg-box" aria-label="Music box">
      <header className="tg-hud">
        <span className="tg-hud-title">{fugue.title}</span>
        <span className="tg-hud-bar">BAR {FRAME_BAR}</span>
      </header>
      <div className="tg-roll" ref={wrap}>
        <canvas ref={canvas} />
      </div>
      <footer className="tg-legend">
        {fugue.voiceNames.map((name, i) => (
          <span key={name} style={{ color: VOICE_INKS[i] }}>
            ■ {name.toUpperCase()}
          </span>
        ))}
      </footer>
    </section>
  );
}

function paint(c: HTMLCanvasElement, cssW: number, cssH: number, f: TouchFugue, now: number) {
  const w = Math.max(1, Math.floor(cssW / PX));
  const h = Math.max(1, Math.floor(cssH / PX));
  c.width = w;
  c.height = h;
  c.style.width = `${w * PX}px`;
  c.style.height = `${h * PX}px`;
  const g = c.getContext("2d")!;
  const css = getComputedStyle(c);
  const tok = (name: string) => css.getPropertyValue(name).trim();

  g.fillStyle = tok("--tg-roll");
  g.fillRect(0, 0, w, h);

  const { lo, hi } = pitchRange(f);
  const rows = hi - lo + 1;
  const rowH = Math.max(1, Math.floor((h - 2) / rows));
  const top = Math.floor((h - rowH * rows) / 2);
  const yOf = (midi: number) => top + (hi - midi) * rowH;

  const barTicks = f.tpq * 4;
  const span = BARS_SHOWN * barTicks;
  const t0 = now - PLAYHEAD * span;
  const xOf = (tick: number) => Math.round(((tick - t0) / span) * w);

  // Each C a faint row line, the octave's floor.
  g.fillStyle = tok("--tg-grid");
  for (let m = Math.ceil(lo / 12) * 12; m <= hi; m += 12) g.fillRect(0, yOf(m) + rowH - 1, w, 1);
  // Beats faint, bar lines brighter.
  for (let t = Math.floor(t0 / f.tpq) * f.tpq; t < t0 + span; t += f.tpq) {
    const bar = t % barTicks === 0;
    g.fillStyle = tok(bar ? "--tg-barline" : "--tg-grid");
    g.fillRect(xOf(t), 0, 1, h);
  }

  const playX = xOf(now);
  f.voices.forEach((voice, vi) => {
    for (const [on, dur, midi] of voice) {
      const x1 = xOf(on);
      const x2 = xOf(on + dur);
      if (x2 < 0 || x1 > w) continue;
      const y = yOf(midi);
      const sounding = on <= now && now < on + dur;
      const past = on + dur <= now;
      g.globalAlpha = past ? 0.35 : 1;
      g.fillStyle = VOICE_INKS[vi];
      // One pixel of gap before the next note, so repeated pitches read as separate blocks.
      g.fillRect(x1, y, Math.max(1, x2 - x1 - 1), Math.max(1, rowH - (rowH > 2 ? 1 : 0)));
      if (sounding) {
        g.fillStyle = tok("--tg-shine");
        g.fillRect(x1, y - 1, Math.max(1, x2 - x1 - 1), 1);
        g.fillRect(x1, y + rowH - 1, Math.max(1, x2 - x1 - 1), 1);
      }
    }
  });
  g.globalAlpha = 1;

  g.fillStyle = tok("--tg-playhead");
  g.fillRect(playX, 0, 1, h);
}
