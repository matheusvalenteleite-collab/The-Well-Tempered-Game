/**
 * P45: the gerubach layout (the owner's default way to watch and hear a piece, after the
 * "Scrolling Bach Project" videos of gerubach): the systems joined into one horizontal strip that
 * moves right to left under a fixed playhead, nothing else on screen. The playhead marks the moment
 * only; no note is lit. While stopped, the strip can be dragged (or scrolled sideways) to the bar
 * to start from. Position: `bar` (fractional) from the caller, which moves it with the music.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { WtcStrip, type WtcScoreVoice } from "./WtcScore.tsx";
import type { ClefId } from "./clefs.ts";
import type { Step } from "../../music/pitch.ts";

export interface ScrollScoreProps {
  voices: WtcScoreVoice[];
  clefs: ClefId[];
  clefPlan?: ClefId[][];
  keySig: string;
  signature: Record<Step, number>;
  time: string;
  barQuarters: number;
  bars: number;
  /** Where the playhead stands, in bars from the start (fractional). */
  bar: number;
  /** While stopped: the bar the reader has scrolled to. */
  onSeek?(bar: number): void;
  /** Systems of this many bars are joined into the strip (as cut from pages). */
  systemBars?: number;
  /** Drawn on the paper after the last bar (the unfinished fugue: where the manuscript breaks off). */
  after?: React.ReactNode;
  playing: boolean;
}

/** Cut the voices into systems of `n` bars, each starting at 0 (as pageRows does, without labels). */
function systems(voices: WtcScoreVoice[], barQ: number, bars: number, n: number) {
  const out: { voices: WtcScoreVoice[]; bars: number; key: string; from: number }[] = [];
  for (let a = 0; a < bars; a += n) {
    const z = Math.min(bars, a + n);
    const q0 = a * barQ;
    const q1 = z * barQ;
    out.push({
      key: `s${a}`,
      from: a,
      bars: z - a,
      voices: voices.map((v) => ({
        ...v,
        notes: v.notes
          .filter((x) => x.at < q1 - 1e-9 && x.at + x.dur > q0 + 1e-9)
          .map((x) => ({ ...x, at: Math.max(x.at, q0) - q0, dur: Math.min(x.at + x.dur, q1) - Math.max(x.at, q0), fermata: x.fermata && x.at + x.dur <= q1 + 1e-9, label: x.at >= q0 - 1e-9 ? x.label : undefined, mark: x.at >= q0 - 1e-9 ? x.mark : undefined })),
      })),
    });
  }
  return out;
}

export function ScrollScore(p: ScrollScoreProps) {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = host.current!;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  const rows = useMemo(() => systems(p.voices, p.barQuarters, p.bars, p.systemBars ?? 4), [p.voices, p.barQuarters, p.bars, p.systemBars]);
  const [layout, setLayout] = useState<{ bars: { x: number; w: number }[]; total: number }>({ bars: [], total: 0 });
  const xOf = (bar: number) => {
    const b = layout.bars;
    if (!b.length) return 0;
    const k = Math.max(0, Math.min(b.length - 1, Math.floor(bar)));
    if (bar >= b.length) return b[b.length - 1].x + b[b.length - 1].w;
    return b[k].x + b[k].w * Math.max(0, bar - k);
  };
  const barOfX = (x: number) => {
    const b = layout.bars;
    const k = b.findIndex((y) => x < y.x + y.w);
    if (k < 0) return b.length;
    return k + Math.max(0, (x - b[k].x) / b[k].w);
  };
  const head = Math.round(size.w * 0.48);
  const shift = head - xOf(p.bar);
  // Dragging the strip while stopped.
  const drag = useRef<{ x: number; bar: number } | null>(null);
  const seek = (dx: number, from: number) => p.onSeek?.(Math.max(0, Math.min(p.bars - 0.001, barOfX(xOf(from) - dx))));
  return (
    <div
      ref={host}
      className="scroll-score"
      onPointerDown={(e) => {
        if (p.playing || !p.onSeek) return;
        drag.current = { x: e.clientX, bar: p.bar };
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => drag.current && seek(e.clientX - drag.current.x, drag.current.bar)}
      onPointerUp={() => (drag.current = null)}
      onWheel={(e) => {
        if (p.playing || !p.onSeek) return;
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        seek(-d, p.bar);
      }}
    >
      {size.h > 0 && (
        <div className="scroll-score-strip" style={{ transform: `translateX(${shift}px)` }}>
          <WtcStrip rows={rows} height={size.h} clefs={p.clefs} clefPlan={p.clefPlan} keySig={p.keySig} signature={p.signature} time={p.time} barQuarters={p.barQuarters} onLayout={(bars, total) => setLayout({ bars, total })} />
          {p.after && <div className="scroll-score-after">{p.after}</div>}
        </div>
      )}
      <div className="scroll-score-head" style={{ left: head }} aria-hidden="true" />
    </div>
  );
}

/**
 * The playhead's bar, moving smoothly with the music: `onBar(b)` as each bar begins (the engine's
 * callback), the position in between from the audio clock and the bar's length. `steady`: a piece
 * in strict time (a fugue), timed from its start by the clock; otherwise (chorales with fermatas)
 * each bar waits at its end for the next to begin.
 */
export function usePlayhead(now: () => number, barSeconds: () => number, steady = false) {
  const [bar, setBar] = useState(0);
  const mark = useRef<{ bar: number; t: number } | null>(null);
  const raf = useRef(0);
  const tick = () => {
    const m = mark.current;
    if (!m) return;
    const run = Math.max(0, (now() - m.t) / barSeconds());
    setBar(m.bar + (steady ? run : Math.min(1, run)));
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return {
    bar,
    setBar: (b: number) => {
      mark.current = null;
      cancelAnimationFrame(raf.current);
      setBar(b);
    },
    /** Call as bar `b` begins to sound. */
    onBar: (b: number) => {
      // The engine reports every event as it sounds: a bar begins with the first of its own. In
      // steady time (no fermatas) the clock alone moves the playhead from the first bar on, and a
      // bar's first event only corrects it when it has fallen behind.
      if (mark.current && mark.current.bar === b) return;
      if (steady && mark.current) {
        const at = mark.current.bar + (now() - mark.current.t) / barSeconds();
        if (b < at + 0.25) return;
      }
      const first = mark.current === null;
      mark.current = { bar: b, t: now() };
      if (first) {
        cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(tick);
      }
    },
    stop: () => {
      mark.current = null;
      cancelAnimationFrame(raf.current);
    },
  };
}
