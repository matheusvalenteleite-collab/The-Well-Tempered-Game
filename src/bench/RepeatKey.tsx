/**
 * D1081, REPEAT (developer-only; MECH.repeat): the button, at the feet of both bars in the pistons' innermost slot (the one nearest the
 * middle, either thumb). It shows from the second-last bar of the section to one beat before its end (ProtoGame.repeatView), lights
 * when pressed and cancels when pressed again; its face is the musician's printed repeat sign (two dots, a thin and a thick barline),
 * no letters. It acts on pointerdown, as the pistons do (a thumb holding a note never stops the other pressing it), and takes no touch
 * where it is not shown. Not drawn at all while the flag is off.
 */
import { useEffect, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { ProtoGame } from "./proto-game.ts";
import type { RepeatView } from "./repeat.ts";

export function RepeatKey({ game }: { game: RefObject<ProtoGame | null> }) {
  const [view, setView] = useState<RepeatView>("none");
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setView(game.current?.repeatView() ?? "none");
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [game]);
  if (view === "none") return null;
  const press = (e: ReactPointerEvent) => {
    if (e.button > 0) return;
    e.preventDefault();
    if (game.current?.pressRepeat()) setView(game.current.repeatView());
  };
  return (
    <>
      {(["left", "right"] as const).map((side) => (
        <button
          key={side}
          type="button"
          id={`repeat-${side}`}
          className={`tb-repeat tb-repeat-${side}${view === "latched" ? " on" : ""}`}
          aria-pressed={view === "latched"}
          aria-label="repeat"
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={press}
          onClick={(e) => e.detail === 0 && game.current?.pressRepeat()}
        >
          <svg viewBox="0 0 28 16" width="28" height="16" aria-hidden="true" focusable="false">
            <circle cx="5" cy="5.5" r="1.7" fill="currentColor" />
            <circle cx="5" cy="10.5" r="1.7" fill="currentColor" />
            <rect x="10" y="1" width="1.6" height="14" fill="currentColor" />
            <rect x="14.5" y="1" width="4.2" height="14" fill="currentColor" />
          </svg>
        </button>
      ))}
    </>
  );
}
