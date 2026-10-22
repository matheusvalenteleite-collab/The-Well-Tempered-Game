/**
 * The play area: the lower half of the screen, one half for each thumb (thumbs.ts). The keys are
 * drawn here (D167: paint-keys.ts), on a canvas the game paints every frame. With two voices each half
 * is named in its voice's colour. The game gets every tap, slide and lift with the event's time; a
 * finished tap (lift) is also reported, since phones let a page start its sound only then.
 */
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { onSide, touchDown, touchMove, touchUp, type Side, type Touches } from "./thumbs.ts";

export interface ThumbEvents {
  down: (id: number, side: Side, x: number, y: number, w: number, h: number, ts: number) => void;
  move: (id: number, x: number, y: number, w: number, h: number, ts: number) => void;
  up: (id: number, ts: number) => void;
}

export type Painter = (g: CanvasRenderingContext2D, w: number, h: number) => void;

export function PlayArea(p: {
  events: ThumbEvents;
  /** Paints the targets, every frame, in CSS pixels. */
  paint: React.MutableRefObject<Painter | null>;
  /** What each half plays (two voices), in its ink. */
  labels?: Partial<Record<Side, { text: string; ink: string }>>;
  hint: string;
}) {
  const { events, paint, labels, hint } = p;
  const area = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [touches, setTouches] = useState<Touches>(new Map());
  const state = useRef<Touches>(new Map());

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const c = canvas.current;
      const el = area.current;
      if (c && el) {
        const dpr = Math.min(3, window.devicePixelRatio || 1);
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
          c.width = Math.round(w * dpr);
          c.height = Math.round(h * dpr);
          c.style.width = `${w}px`;
          c.style.height = `${h}px`;
        }
        const g = c.getContext("2d")!;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        paint.current?.(g, w, h);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paint]);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not capturable: the lift still arrives */
    }
    const r = area.current!.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    state.current = touchDown(state.current, e.pointerId, x, y, r.width, e.timeStamp);
    setTouches(state.current);
    events.down(e.pointerId, state.current.get(e.pointerId)!.side, x, y, r.width, r.height, e.timeStamp);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!state.current.has(e.pointerId)) return;
    const r = area.current!.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    state.current = touchMove(state.current, e.pointerId, x, y);
    events.move(e.pointerId, x, y, r.width, r.height, e.timeStamp);
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    state.current = touchUp(state.current, e.pointerId);
    setTouches(state.current);
    events.up(e.pointerId, e.timeStamp);
  };

  const left = onSide(touches, "left").length;
  const right = onSide(touches, "right").length;

  return (
    <section
      className="tg-play"
      aria-label="Play area"
      ref={area}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Half side="left" active={left > 0} label={labels?.left} />
      <Half side="right" active={right > 0} label={labels?.right} />
      <canvas className="tg-targets" ref={canvas} />
      <div className="tg-status">{hint}</div>
    </section>
  );
}

function Half({ side, active, label }: { side: Side; active: boolean; label?: { text: string; ink: string } }) {
  return (
    <div className={`tg-half tg-half-${side}${active ? " tg-half-on" : ""}`}>
      {label ? (
        <span className="tg-half-voice" style={{ color: label.ink }}>
          {label.text}
        </span>
      ) : null}
    </div>
  );
}
