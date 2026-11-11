/**
 * D646 (design studio; the owner: THE FUGUE'S BUILDING at the left bar's foot "weird", back with the music box,
 * "probably in the bottom of music box"; chose the strip): the map drawn as a full-width strip over the voice legend's
 * line at the box's foot (D473). MusicBox's foot measure keeps every row of the ladder above it.
 */
import { useEffect, useRef, type MutableRefObject } from "react";
import { buildMap, fugueMap } from "./paint-arch.ts";
import type { ProtoGame } from "./proto-game.ts";

export function LegendMap({ game }: { game: MutableRefObject<ProtoGame | null> }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const c = cv.current;
      const g = game.current;
      if (c && g) {
        const dpr = window.devicePixelRatio || 1;
        const w = c.clientWidth;
        const h = c.clientHeight;
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
          c.width = Math.round(w * dpr);
          c.height = Math.round(h * dpr);
        }
        const x = c.getContext("2d")!;
        x.setTransform(dpr, 0, 0, dpr, 0, 0);
        x.clearRect(0, 0, w, h);
        const m = fugueMap(g.f);
        const span = Math.max(1, m.end - m.start);
        const row = Math.max(2, Math.floor((h - 4) / Math.max(1, m.rows)));
        const X = (tick: number) => 2 + ((tick - m.start) / span) * (w - 4);
        buildMap(x, m, g.now, new Set(g.tracks.map((t) => t.voice)), X, (v) => 3 + v * row, g.f.tpq, Math.max(1, row - 1), w - 4);
        x.fillStyle = "rgba(255,255,255,0.85)";
        x.fillRect(Math.round(X(Math.max(m.start, Math.min(m.end, g.now)))), 0, 1, h);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game]);
  return <canvas ref={cv} className="tb-legend-map" aria-hidden="true" />;
}
