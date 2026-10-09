/**
 * The score's window (D100). The score is one line, never broken into systems: at 100% it fits
 * its box (the width, and on a computer the height too); zooming in makes it literally larger, so
 * that it scrolls sideways inside the box. The lock (on by default) makes the view follow what is
 * playing when it leaves the window, and return to the beginning at the end.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useZoomGestures, ZOOM_MAX, ZOOM_MIN } from "./zoom.ts";
import { store, stored } from "../shared.ts";
import { t } from "../i18n.ts";

const STEP = 1.25;
/** Below this width (a phone) the score is drawn at least this large, and scrolls sideways. */
const NARROW = 700;
const NARROW_MIN = 0.62;
/** On a computer the score never grows beyond this at 100%. */
const MAX_FIT = 1.15;
/** Room kept for the horizontal scrollbar. */
const BAR_ROOM = 12;

export interface ViewportProps {
  /** Logical width and (expected) height of the score at scale 1. */
  natural: number;
  naturalHeight: number;
  /** A fixed scale (excerpts): no fitting, no zoom. */
  zoom: number;
  onZoom?(z: number): void;
  zoomLabels?: { in: string; out: string; reset: string };
  tools?: ReactNode;
  /** Logical x of what is playing, or null when nothing plays. */
  playingX: number | null;
  children(scale: number): ReactNode;
}

export function Viewport(p: ViewportProps) {
  const host = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [height, setHeight] = useState(p.naturalHeight);
  const [follow, setFollow] = useState(() => stored("wtg.follow", true, (v) => typeof v === "boolean"));
  useEffect(() => store("wtg.follow", follow), [follow]);

  useLayoutEffect(() => {
    const el = host.current!;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const commit = useZoomGestures(host, content, p.zoom, p.onZoom);
  const narrow = box.w > 0 && box.w < NARROW;
  const fitW = box.w ? box.w / p.natural : 1;
  const fitH = !narrow && box.h > 40 ? (box.h - BAR_ROOM) / height : Infinity;
  const base = narrow ? Math.max(NARROW_MIN, Math.min(1, fitW)) : Math.max(0.25, Math.min(MAX_FIT, fitW, fitH));
  const scale = Math.max(0.2, Math.min(3, base * p.zoom));

  // The drawing's real height (the continuo and the figures add to it), for fitting the box: read
  // from its proportions, which do not depend on the scale it was last drawn at.
  useEffect(() => {
    const el = content.current;
    if (!el) return;
    const read = () => {
      const r = el.querySelector("svg")?.getBoundingClientRect();
      if (!r || r.width < 10) return;
      const h = (r.height / r.width) * p.natural;
      setHeight((old) => (h > 40 && Math.abs(h - old) / old > 0.03 ? h : old));
    };
    const mo = new MutationObserver(read);
    mo.observe(el, { childList: true, subtree: true });
    read();
    return () => mo.disconnect();
  }, [p.natural]);

  // Zooming keeps the same music at the left edge.
  const lastScale = useRef(scale);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && lastScale.current !== scale) el.scrollLeft = (el.scrollLeft * scale) / lastScale.current;
    lastScale.current = scale;
  }, [scale]);

  // The lock: follow what plays when it leaves the window; back to the beginning at the end.
  const wasPlaying = useRef(false);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (p.playingX === null) {
      if (wasPlaying.current && follow) el.scrollTo({ left: 0, behavior: "smooth" });
      wasPlaying.current = false;
      return;
    }
    wasPlaying.current = true;
    if (!follow) return;
    const x = p.playingX * scale;
    if (x < el.scrollLeft + 8 || x > el.scrollLeft + el.clientWidth - 48) el.scrollTo({ left: Math.max(0, x - el.clientWidth * 0.12), behavior: "smooth" });
  }, [p.playingX, follow, scale]);

  return (
    <div ref={host} className="viewport">
      {p.onZoom && (
        <div className="zoombar" role="group">
          {p.tools}
          <button className="icon quiet lock" aria-pressed={follow} onClick={() => setFollow(!follow)} title={t(follow ? "ui.zoom.lockOn" : "ui.zoom.lockOff")} aria-label={t("ui.zoom.lock")}>
            {follow ? "🔒" : "🔓"}
          </button>
          <button className="icon quiet" onClick={() => commit(p.zoom / STEP)} disabled={p.zoom <= ZOOM_MIN} aria-label={p.zoomLabels?.out} title={p.zoomLabels?.out}>−</button>
          <button className="zoom-level" onClick={() => commit(1)} title={p.zoomLabels?.reset}>{Math.round(p.zoom * 100)}%</button>
          <button className="icon quiet" onClick={() => commit(p.zoom * STEP)} disabled={p.zoom >= ZOOM_MAX} aria-label={p.zoomLabels?.in} title={p.zoomLabels?.in}>+</button>
        </div>
      )}
      <div ref={scroller} className="viewport-scroll">
        <div ref={content} className="viewport-content">{box.w > 0 && p.children(scale)}</div>
      </div>
    </div>
  );
}
