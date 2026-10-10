/**
 * The tour of the game screen (D140), the tutorial's last lesson: a spotlight on each part of the
 * real screen in turn, with a card that says what it is for. The page stays usable underneath
 * (the shade lets clicks through), so the learner may try each part as it is shown.
 */
import { useEffect, useLayoutEffect, useState } from "react";
import { tourText, tt } from "../tutorial/text.ts";
import { TOUR_STOPS } from "../tutorial/tour.ts";


interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const PAD = 6;
const CARD_W = 340;

function boxOf(selector?: string): Box | null {
  if (!selector) return null;
  const el = [...document.querySelectorAll(selector)].find((e) => (e as HTMLElement).offsetParent !== null) as HTMLElement | undefined;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { left: r.left - PAD, top: r.top - PAD, width: r.width + 2 * PAD, height: r.height + 2 * PAD };
}

export function Tour({ onClose, onDone }: { onClose(): void; onDone(): void }) {
  const [k, setK] = useState(0);
  const stop = TOUR_STOPS[k];
  const [box, setBox] = useState<Box | null>(null);
  const [view, setView] = useState({ w: window.innerWidth, h: window.innerHeight });

  useLayoutEffect(() => {
    const el = stop.selector ? document.querySelector(stop.selector) : null;
    el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    const measure = () => {
      setBox(boxOf(stop.selector));
      setView({ w: window.innerWidth, h: window.innerHeight });
    };
    measure();
    // The screen may still be laying itself out (the score draws after a frame): measure again.
    const id = window.setInterval(measure, 400);
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
    };
  }, [k]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const last = k === TOUR_STOPS.length - 1;
  const text = tourText(stop.id);
  // The card: below the spotlight if there is room, else above, else in the middle.
  const w = Math.min(CARD_W, view.w - 24);
  let card: React.CSSProperties = { width: w, left: (view.w - w) / 2, top: Math.max(12, view.h / 2 - 110) };
  if (box) {
    const left = Math.max(12, Math.min(view.w - w - 12, box.left + box.width / 2 - w / 2));
    const below = box.top + box.height + 10;
    if (below + 200 < view.h) card = { width: w, left, top: below };
    else if (box.top - 210 > 0) card = { width: w, left, top: box.top - 10, transform: "translateY(-100%)" };
    else card = { width: w, left, top: Math.max(12, view.h - 230) };
  }
  return (
    <div className="tour" role="dialog" aria-modal="false" aria-label={text.title}>
      {box ? <div className="tour-spot" style={{ left: box.left, top: box.top, width: box.width, height: box.height }} /> : <div className="tour-shade" />}
      <div className="tour-card" style={card}>
        <p className="tour-count">{tt("tour.count", { n: k + 1, total: TOUR_STOPS.length })}</p>
        <h3>{text.title}</h3>
        <p>{text.text}</p>
        <div className="tour-buttons">
          <button onClick={() => setK(k - 1)} disabled={k === 0}>{tt("tour.back")}</button>
          <button className="link" onClick={onClose}>{tt("tour.close")}</button>
          {last ? (
            <button className="primary" onClick={onDone}>{tt("tour.done")}</button>
          ) : (
            <button className="primary" onClick={() => setK(k + 1)}>{tt("tour.next")}</button>
          )}
        </div>
      </div>
    </div>
  );
}
