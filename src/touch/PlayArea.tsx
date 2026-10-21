/**
 * The play area: the lower half of the screen, one half for each thumb (thumbs.ts). This step only
 * shows where each thumb is, to check that two thumbs at once are read cleanly on the phone.
 */
import { useRef, useState, type PointerEvent } from "react";
import { onSide, touchDown, touchMove, touchUp, type Side, type Touches } from "./thumbs.ts";

export function PlayArea() {
  const area = useRef<HTMLDivElement>(null);
  const [touches, setTouches] = useState<Touches>(new Map());

  const local = (e: PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, width: r.width };
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    setTouches((s) => touchDown(s, e.pointerId, p.x, p.y, p.width, e.timeStamp));
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const p = local(e);
    setTouches((s) => touchMove(s, e.pointerId, p.x, p.y));
  };
  const up = (e: PointerEvent<HTMLDivElement>) => setTouches((s) => touchUp(s, e.pointerId));

  const left = onSide(touches, "left").length;
  const right = onSide(touches, "right").length;
  const status = left && right ? "BOTH THUMBS" : left ? "LEFT THUMB" : right ? "RIGHT THUMB" : "THUMBS DOWN";

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
      <div className={`tg-status${left && right ? " tg-status-both" : ""}`}>{status}</div>
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
