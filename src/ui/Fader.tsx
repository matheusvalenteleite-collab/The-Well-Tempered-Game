import { useRef } from "react";

/**
 * A mixer fader in the manner of Ableton Live's (D80): a vertical track with a decibel scale and a
 * level meter beside it, dragged (or scrolled) on the dB scale, double-click for 0 dB. The value
 * is a linear gain (0 .. 1.5, i.e. -inf .. +3.5 dB). The meter is filled from outside through
 * `meterRef` (set at animation-frame rate, never through React state).
 */
const DB_MIN = -60;
const DB_MAX = 20 * Math.log10(1.5);
export const gainToDb = (g: number) => (g <= 0.001 ? -Infinity : 20 * Math.log10(g));
/**
 * Position 0..1 on the fader for a level in dB: the square of the dB-linear position, so that the
 * travel near 0 dB is wide (as on a console fader) and the bottom of the scale is compressed.
 */
export const posOfDb = (db: number) => (db === -Infinity ? 0 : Math.max(0, Math.min(1, (db - DB_MIN) / (DB_MAX - DB_MIN))) ** 2);
export const posOfGain = (g: number) => posOfDb(gainToDb(g));
export const gainOfPos = (p: number) => (p <= 0.002 ? 0 : 10 ** ((DB_MIN + Math.sqrt(p) * (DB_MAX - DB_MIN)) / 20));
export const formatDb = (g: number) => {
  const db = gainToDb(g);
  return db === -Infinity ? "-inf" : `${db > 0 ? "+" : ""}${db.toFixed(1)}`;
};
const TICKS = [0, -6, -12, -24, -48];

export function Fader(p: { value: number; onChange(v: number): void; label: string; color: string; meterRef?: (el: HTMLDivElement | null) => void; disabled?: boolean }) {
  const drag = useRef<{ y: number; pos: number; h: number } | null>(null);
  const pos = posOfGain(p.value);
  return (
    <div className={`fader2 ${p.disabled ? "off" : ""}`} style={{ ["--track" as string]: p.color }}>
      <div className="fader-scale" aria-hidden="true">
        {TICKS.map((db) => (
          <span key={db} style={{ bottom: `${posOfDb(db) * 100}%` }}>{db > 0 ? `+${db}` : db}</span>
        ))}
      </div>
      <div
        className="fader-track"
        role="slider"
        aria-label={p.label}
        aria-valuemin={0}
        aria-valuemax={1.5}
        aria-valuenow={p.value}
        aria-valuetext={`${formatDb(p.value)} dB`}
        title={`${p.label}: ${formatDb(p.value)} dB`}
        onPointerDown={(e) => {
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          // A click away from the cap jumps there; dragging the cap moves it relatively.
          const at = 1 - (e.clientY - r.top) / r.height;
          const near = Math.abs(at - pos) < 0.08;
          drag.current = { y: e.clientY, pos: near ? pos : at, h: r.height };
          if (!near) p.onChange(gainOfPos(at));
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          p.onChange(gainOfPos(Math.max(0, Math.min(1, d.pos + (d.y - e.clientY) / d.h))));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onWheel={(e) => p.onChange(gainOfPos(Math.max(0, Math.min(1, pos - Math.sign(e.deltaY) * 0.02))))}
        onDoubleClick={() => p.onChange(1)}
      >
        <div className="fader-groove" />
        <div className="fader-zero" style={{ bottom: `${posOfDb(0) * 100}%` }} />
        <div className="fader-cap" style={{ bottom: `calc(${pos * 100}% - 5px)` }} />
      </div>
      <div className="meter" aria-hidden="true">
        <div className="meter-fill" ref={p.meterRef} />
      </div>
    </div>
  );
}
