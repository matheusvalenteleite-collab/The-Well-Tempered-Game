/**
 * The play area: the lower half of the screen, one half for each thumb (thumbs.ts), crossed by the
 * voice's lanes (lanes.ts), lowest at the bottom, each labelled with its note at both edges (NOTES),
 * or showing the player's last touch with its zones, higher, about the same, lower (SHAPE). The game
 * gets every landing, slide and lift with the event's time.
 */
import { useRef, useState, type PointerEvent } from "react";
import { SAME } from "./lanes.ts";
import { onSide, touchDown, touchMove, touchUp, type Side, type Touches } from "./thumbs.ts";

export interface ThumbEvents {
  down: (id: number, y: number, h: number, ts: number) => void;
  move: (id: number, y: number, h: number, ts: number) => void;
  up: (id: number, ts: number) => void;
}

export function PlayArea(p: {
  events: ThumbEvents;
  /** The lanes (NOTES); none for the other levels. */
  lanes: string[];
  lit: number[];
  wrong: { lane: number; id: number } | null;
  /** SHAPE: the height of the player's previous touch (a share, 0 at the top), with its zones. */
  anchor: number | null;
  hint: string;
}) {
  const { events, lanes, lit, wrong, anchor, hint } = p;
  const area = useRef<HTMLDivElement>(null);
  const [touches, setTouches] = useState<Touches>(new Map());
  const state = useRef<Touches>(new Map());

  const update = (f: (s: Touches) => Touches) => {
    state.current = f(state.current);
    setTouches(state.current);
  };
  const local = (e: PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, width: r.width, height: r.height };
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    update((s) => touchDown(s, e.pointerId, p.x, p.y, p.width, e.timeStamp));
    events.down(e.pointerId, p.y, p.height, e.timeStamp);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!state.current.has(e.pointerId)) return;
    const p = local(e);
    update((s) => touchMove(s, e.pointerId, p.x, p.y));
    events.move(e.pointerId, p.y, p.height, e.timeStamp);
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    update((s) => touchUp(s, e.pointerId));
    events.up(e.pointerId, e.timeStamp);
  };

  const left = onSide(touches, "left").length;
  const right = onSide(touches, "right").length;
  const n = lanes.length;

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
      {n > 0 && (
        <div className="tg-lanes" style={{ gridTemplateRows: `repeat(${n}, 1fr)` }}>
          {lanes.map((_, row) => {
            const lane = n - 1 - row;
            const cls = ["tg-lane", lane % 2 ? "tg-lane-odd" : "", lit.includes(lane) ? "tg-lane-lit" : ""].join(" ");
            return (
              <div key={lane} className={cls}>
                {wrong && wrong.lane === lane && <span key={wrong.id} className="tg-lane-wrong" />}
                <span className="tg-lane-name">{lanes[lane]}</span>
                <span className="tg-lane-name">{lanes[lane]}</span>
              </div>
            );
          })}
        </div>
      )}
      {anchor !== null && (
        <div className="tg-anchor" style={{ top: `${anchor * 100}%`, ["--same" as string]: `${SAME * 100}cqh` }}>
          <div className="tg-anchor-same" />
          <span className="tg-anchor-up">▲ HIGHER</span>
          <span className="tg-anchor-down">▼ LOWER</span>
        </div>
      )}
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
