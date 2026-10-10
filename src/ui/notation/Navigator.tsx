/**
 * The whole piece at a glance (D147), under the music: its sections as bands, every entry of the
 * subject as a mark in its voice's colour, the bar numbers, the passage chosen, and where the music
 * is. A click plays from there (on the nearest bar line), a drag chooses a passage.
 */
import { useEffect, useRef, useState } from "react";
import { onFrames } from "../playhead.ts";

export interface NavSection {
  from: number;
  to: number;
  kind: string;
  label: string;
}

interface Props {
  starts: number[];
  firstBar: number;
  sections: NavSection[];
  entries: { at: number; end: number; voice: number; inverted: boolean; label: string }[];
  colors: string[];
  span: { from: number; to: number } | null;
  marker: number | null;
  onSeek(q: number): void;
  onSelect(from: number, to: number): void;
}

export function Navigator(p: Props) {
  const end = p.starts[p.starts.length - 1];
  const pct = (q: number) => `${(Math.max(0, Math.min(end, q)) / end) * 100}%`;
  const box = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      onFrames((pos) => {
        const h = head.current;
        if (!h) return;
        h.style.display = pos === null ? "none" : "block";
        if (pos !== null) h.style.left = pct(pos);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [end],
  );
  // The bar line nearest a pointer.
  const barAt = (clientX: number): number => {
    const r = box.current!.getBoundingClientRect();
    const q = ((clientX - r.left) / r.width) * end;
    let k = 0;
    while (k + 1 < p.starts.length - 1 && p.starts[k + 1] <= q) k++;
    return k;
  };
  const [drag, setDrag] = useState<{ a: number; b: number; moved: boolean } | null>(null);
  const bars = p.starts.length - 1;
  const every = bars > 120 ? 20 : bars > 60 ? 10 : bars > 24 ? 5 : 2;
  const sel = drag?.moved ? { from: p.starts[Math.min(drag.a, drag.b)], to: p.starts[Math.max(drag.a, drag.b) + 1] } : p.span;
  return (
    <div
      className="navigator"
      ref={box}
      onPointerDown={(e) => {
        const b = barAt(e.clientX);
        setDrag({ a: b, b, moved: false });
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag) return;
        const b = barAt(e.clientX);
        if (b !== drag.b || drag.moved) setDrag({ ...drag, b, moved: drag.moved || b !== drag.a });
      }}
      onPointerUp={() => {
        if (!drag) return;
        if (drag.moved) p.onSelect(p.starts[Math.min(drag.a, drag.b)], p.starts[Math.max(drag.a, drag.b) + 1]);
        else p.onSeek(p.starts[drag.a]);
        setDrag(null);
      }}
      onPointerCancel={() => setDrag(null)}
    >
      {p.sections.map((s, k) => (
        <div key={k} className={`nav-sec nav-${s.kind}`} style={{ left: pct(s.from), width: `calc(${pct(s.to)} - ${pct(s.from)})` }} data-info={s.label} />
      ))}
      {p.starts.slice(0, -1).map((q, b) =>
        (b + p.firstBar) % every === 0 ? (
          <span key={b} className="nav-bar" style={{ left: pct(q) }}>
            {b + p.firstBar}
          </span>
        ) : null,
      )}
      {p.entries.map((e, k) => (
        <div
          key={`e${k}`}
          className={e.inverted ? "nav-entry inv" : "nav-entry"}
          style={{ left: pct(e.at), width: `calc(${pct(e.end)} - ${pct(e.at)})`, background: p.colors[e.voice % p.colors.length], top: `${10 + (e.voice % 6) * 3}px` }}
          data-info={e.label}
        />
      ))}
      {sel && <div className="nav-span" style={{ left: pct(sel.from), width: `calc(${pct(sel.to)} - ${pct(sel.from)})` }} />}
      {p.marker !== null && <div className="nav-marker" style={{ left: pct(p.marker) }} />}
      <div ref={head} className="nav-head" style={{ display: "none" }} />
    </div>
  );
}
