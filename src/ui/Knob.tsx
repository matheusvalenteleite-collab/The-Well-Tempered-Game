import { useRef } from "react";
import { sliderKey } from "./keys.ts";

interface KnobProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  /** Logarithmic mapping (times, frequencies). */
  log?: boolean;
  /** Value restored on double-click. */
  defaultValue: number;
  format(v: number): string;
  onChange(v: number): void;
}

const ARC = 270; // degrees of travel

/**
 * Rotary knob, operated by dragging up/down (or the mouse wheel); double-click resets. It takes
 * keyboard focus (D149): the arrows, Page Up/Down, Home and End move it; the score's keys pass it by.
 */
export function Knob(p: KnobProps) {
  const drag = useRef<{ y: number; t: number } | null>(null);
  const toT = (v: number) => (p.log ? Math.log(v / p.min) / Math.log(p.max / p.min) : (v - p.min) / (p.max - p.min));
  const fromT = (t: number) => {
    const c = Math.min(1, Math.max(0, t));
    return p.log ? p.min * (p.max / p.min) ** c : p.min + c * (p.max - p.min);
  };
  const t = toT(p.value);
  const angle = -ARC / 2 + t * ARC;
  const rad = ((angle - 90) * Math.PI) / 180;
  const arc = (from: number, to: number) => {
    const a0 = ((from - 90) * Math.PI) / 180;
    const a1 = ((to - 90) * Math.PI) / 180;
    const large = to - from > 180 ? 1 : 0;
    return `M ${20 + 15 * Math.cos(a0)} ${20 + 15 * Math.sin(a0)} A 15 15 0 ${large} 1 ${20 + 15 * Math.cos(a1)} ${20 + 15 * Math.sin(a1)}`;
  };
  return (
    <div className="knob" id={p.id}>
      <svg
        viewBox="0 0 40 40"
        role="slider"
        aria-label={p.label}
        aria-valuemin={p.min}
        aria-valuemax={p.max}
        aria-valuenow={p.value}
        aria-valuetext={p.format(p.value)}
        tabIndex={0}
        focusable="true"
        onKeyDown={(e) => {
          const next = sliderKey(e, t);
          if (next !== null) p.onChange(fromT(next));
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          (e.target as Element).setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, t };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          p.onChange(fromT(drag.current.t + (drag.current.y - e.clientY) / 150));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onWheel={(e) => p.onChange(fromT(t - Math.sign(e.deltaY) * 0.03))}
        onDoubleClick={() => p.onChange(p.defaultValue)}
      >
        <path d={arc(-ARC / 2, ARC / 2)} className="knob-track" />
        {t > 0.001 && <path d={arc(-ARC / 2, angle)} className="knob-fill" />}
        <circle cx="20" cy="20" r="10" className="knob-cap" />
        <line x1={20 + 4 * Math.cos(rad)} y1={20 + 4 * Math.sin(rad)} x2={20 + 9 * Math.cos(rad)} y2={20 + 9 * Math.sin(rad)} className="knob-pointer" />
      </svg>
      <span className="knob-label">{p.label}</span>
      <span className="knob-value">{p.format(p.value)}</span>
    </div>
  );
}
