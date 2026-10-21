/**
 * The play area: the lower half of the screen, one half for each thumb (thumbs.ts). In subject mode
 * either thumb plays; its height is the pitch. The touches are kept in a ref as well as in state, so
 * the game loop reads the thumb without waiting for React.
 */
import { useRef, useState, type MutableRefObject, type PointerEvent } from "react";
import { onSide, touchDown, touchMove, touchUp, type Side, type Touches } from "./thumbs.ts";

export interface ThumbsRef {
  touches: Touches;
  /** The play area's height in CSS pixels. */
  height: number;
}

export function PlayArea({ thumbs, onTap, hint }: { thumbs: MutableRefObject<ThumbsRef>; onTap: () => void; hint: string }) {
  const area = useRef<HTMLDivElement>(null);
  const [touches, setTouches] = useState<Touches>(new Map());

  const update = (f: (s: Touches) => Touches) => {
    const next = f(thumbs.current.touches);
    thumbs.current = { touches: next, height: area.current?.clientHeight ?? thumbs.current.height };
    setTouches(next);
  };
  const local = (e: PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, width: r.width };
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    update((s) => touchDown(s, e.pointerId, p.x, p.y, p.width, e.timeStamp));
    onTap();
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const p = local(e);
    update((s) => touchMove(s, e.pointerId, p.x, p.y));
  };
  const up = (e: PointerEvent<HTMLDivElement>) => update((s) => touchUp(s, e.pointerId));

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
      <Half side="left" active={left > 0} />
      <Half side="right" active={right > 0} />
      <div className="tg-status">{hint}</div>
      {[...touches.values()].map((t) => (
        <div key={t.id} className={`tg-thumb tg-thumb-${t.side}`} style={{ transform: `translate(${t.x}px, ${t.y}px)` }} />
      ))}
    </section>
  );
}

function Half({ side, active }: { side: Side; active: boolean }) {
  return (
    <div className={`tg-half tg-half-${side}${active ? " tg-half-on" : ""}`}>
      <span className="tg-half-label">{side === "left" ? "L" : "R"}</span>
    </div>
  );
}
