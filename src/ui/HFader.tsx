/**
 * A horizontal fader (D95: tempo and volume, stacked and aligned): label, track, value. Drag along
 * it (or use the wheel); double-click resets. It takes keyboard focus as a slider (D149).
 */
import { useRef } from "react";
import { sliderKey } from "./keys.ts";

export function HFader(p: { label: string; value: number; min: number; max: number; defaultValue: number; format(v: number): string; onChange(v: number): void; help?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const frac = (p.value - p.min) / (p.max - p.min);
  const setFrom = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    p.onChange(p.min + f * (p.max - p.min));
  };
  return (
    <div className="hfader" title={p.help ?? p.label}>
      <span className="hfader-label">{p.label}</span>
      <div
        ref={track}
        className="hfader-track"
        role="slider"
        tabIndex={0}
        aria-label={p.label}
        aria-valuemin={p.min}
        aria-valuemax={p.max}
        aria-valuenow={p.value}
        aria-valuetext={p.format(p.value)}
        onKeyDown={(e) => {
          const next = sliderKey(e, frac);
          if (next !== null) p.onChange(p.min + next * (p.max - p.min));
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setFrom(e.clientX);
        }}
        onPointerMove={(e) => e.buttons && setFrom(e.clientX)}
        onDoubleClick={() => p.onChange(p.defaultValue)}
        onWheel={(e) => p.onChange(Math.max(p.min, Math.min(p.max, p.value - Math.sign(e.deltaY) * (p.max - p.min) / 50)))}
      >
        <div className="hfader-fill" style={{ width: `${frac * 100}%` }} />
        <div className="hfader-cap" style={{ left: `${frac * 100}%` }} />
      </div>
      <span className="hfader-value">{p.format(p.value)}</span>
    </div>
  );
}
