import { slotLayout } from "../../counterpoint/layout.ts";
import { barWidth, SCORE_LEAD, ScoreView, type ScoreProps } from "./ScoreView.tsx";
import { Viewport } from "./Viewport.tsx";
import { ZOOM_MAX, ZOOM_MIN } from "./zoom.ts";
export { ZOOM_MAX, ZOOM_MIN };

/**
 * The main score (D100): one line in its window, zoomed and scrolled sideways, following what
 * plays (see Viewport). It replaced the systems of D83/D87: zooming in no longer reflows the
 * score onto several lines.
 */
export function Systems(props: ScoreProps & { zoom?: number; onZoom?: (z: number) => void; zoomLabels?: { in: string; out: string; reset: string }; tools?: React.ReactNode }) {
  const layout = props.layout ?? slotLayout("first", props.cantus.length);
  const bars = props.cantus.length;
  const widths = Array.from({ length: bars }, (_, b) => barWidth(layout, b));
  const natural = SCORE_LEAD + widths.reduce((a, w) => a + w, 0) + 24;
  const playingX = (() => {
    const k = props.cursor;
    if (k < 0 || !layout[k]) return null;
    const bar = layout[k].bar;
    const inBar = layout.filter((sl) => sl.bar === bar);
    const i = inBar.indexOf(layout[k]);
    return SCORE_LEAD + widths.slice(0, bar).reduce((a, w) => a + w, 0) + (widths[bar] * Math.max(0, i)) / Math.max(1, inBar.length);
  })();
  return (
    <Viewport natural={natural} naturalHeight={330} zoom={props.zoom ?? 1} onZoom={props.onZoom} zoomLabels={props.zoomLabels} tools={props.tools} playingX={playingX}>
      {(scale) => <ScoreView {...props} drawScale={scale} />}
    </Viewport>
  );
}
