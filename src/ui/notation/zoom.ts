import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 4;

/**
 * Zoom gestures on a score (D87): pinch (live preview by CSS transform on `content`, committed
 * when the fingers lift, the point under them kept in place), Ctrl + wheel. Returns `commit`.
 */
export function useZoomGestures(host: RefObject<HTMLDivElement | null>, content: RefObject<HTMLDivElement | null>, zoom: number, onZoom?: (z: number) => void) {
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const onZoomRef = useRef(onZoom);
  onZoomRef.current = onZoom;
  /** The point of the score under the fingers, kept under them when the zoom is committed. */
  const anchor = useRef<{ fy: number; screenY: number } | null>(null);
  const commit = (z: number, screenY?: number) => {
    const el = host.current;
    const next = Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z)) * 100) / 100;
    if (!el || !onZoomRef.current || next === zoomRef.current) return;
    if (screenY !== undefined) {
      const r = el.getBoundingClientRect();
      anchor.current = { fy: (screenY - r.top) / Math.max(1, r.height), screenY };
    }
    onZoomRef.current(next);
  };
  useLayoutEffect(() => {
    const a = anchor.current;
    anchor.current = null;
    const el = host.current;
    if (!a || !el) return;
    const r = el.getBoundingClientRect();
    window.scrollBy(0, r.top + a.fy * r.height - a.screenY);
  }, [zoom]);

  // Pinch: a live preview by CSS transform, committed (re-engraved) when the fingers lift.
  useEffect(() => {
    const el = host.current!;
    let g: { d0: number; my: number; ratio: number } | null = null;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !onZoomRef.current) return;
      const r = el.getBoundingClientRect();
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      g = { d0: Math.max(10, dist(e.touches)), my, ratio: 1 };
      const c = content.current;
      if (c) c.style.transformOrigin = `${mx - r.left}px ${my - r.top}px`;
    };
    const move = (e: TouchEvent) => {
      if (!g || e.touches.length !== 2) return;
      e.preventDefault();
      const z = zoomRef.current;
      g.ratio = Math.max(ZOOM_MIN / z, Math.min(ZOOM_MAX / z, dist(e.touches) / g.d0));
      if (content.current) content.current.style.transform = `scale(${g.ratio})`;
    };
    const end = (e: TouchEvent) => {
      if (!g || e.touches.length >= 2) return;
      const done = g;
      g = null;
      if (content.current) content.current.style.transform = "";
      if (Math.abs(done.ratio - 1) > 0.04) commit(zoomRef.current * done.ratio, done.my);
    };
    // Ctrl + wheel: a trackpad pinch on a computer, or the mouse wheel with Ctrl (as in MuseScore).
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey || !onZoomRef.current) return;
      e.preventDefault();
      commit(zoomRef.current * Math.exp(-e.deltaY * 0.01), e.clientY);
    };
    const gesture = (e: Event) => e.preventDefault(); // Safari's own page zoom
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("gesturestart", gesture);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("gesturestart", gesture);
    };
  }, []);

  return commit;
}
