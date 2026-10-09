import { useLayoutEffect, useRef, useState } from "react";
import { useZoomGestures, ZOOM_MAX, ZOOM_MIN } from "./zoom.ts";
export { ZOOM_MAX, ZOOM_MIN };
import { HOLD, slotLayout, slotsOfBars } from "../../counterpoint/layout.ts";
import type { Overlay } from "./overlay.ts";
import type { ContinuoRealization } from "../../continuo/types.ts";
import { barWidth, SCORE_LEAD, ScoreView, type ScoreProps } from "./ScoreView.tsx";

/**
 * The score broken into systems (D83), as on a printed page, when one line would be too small to
 * read: on a narrow screen when it would be drawn below 60% of its size, anywhere below 35%. Each
 * system is an ordinary score of a run of bars; clicks, selection, the playback cursor, marks and
 * the overlay are mapped between the systems and the whole; so is the continuo, in each
 * system its own bars (D93).
 *
 * Zoom (D87): pinching with two fingers (or Ctrl + wheel, a trackpad pinch, or − / +) makes the
 * notes larger or smaller, and the score reflows into systems at the new size, as a text does,
 * so that the page scrolls only downwards; one finger scrolls, a tap places a note. Only a bar
 * too wide for the screen at that size scrolls sideways. The systems are justified at one scale.
 */
const NARROW = 700;
const TARGET = 0.62;


const SCALE_MIN = 0.3;
const SCALE_MAX = 2.4;
const STEP = 1.25;

/** The continuo of bars a..b, renumbered from 0 (two half-note beats per bar). */
function sliceRealization(r: ContinuoRealization, a: number, b: number): ContinuoRealization {
  return {
    ...r,
    bars: r.bars.slice(a, b + 1).map((bi) => ({ ...bi, bar: bi.bar - a })),
    events: r.events.filter((e) => e.bar >= a && e.bar <= b).map((e) => ({ ...e, bar: e.bar - a, startBeat: e.startBeat - 2 * a })),
    totalBeats: 2 * (b - a + 1),
  };
}

export function Systems(props: ScoreProps & { zoom?: number; onZoom?: (z: number) => void; zoomLabels?: { in: string; out: string; reset: string }; tools?: React.ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = host.current!;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const zoom = props.zoom ?? 1;
  const commit = useZoomGestures(host, content, zoom, props.onZoom);

  const layout = props.layout ?? slotLayout("first", props.cantus.length);
  const bars = props.cantus.length;
  const widths = Array.from({ length: bars }, (_, b) => barWidth(layout, b));
  const natural = SCORE_LEAD + widths.reduce((a, w) => a + w, 0);
  const single = width ? width / natural : 1;
  const wrapByDefault = !props.fixedScale && width > 0 && ((width < NARROW && single < 0.6) || single < 0.35);
  const scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, (wrapByDefault ? TARGET : Math.min(1, single)) * zoom));
  const bar = props.onZoom && (
    <div className="zoombar" role="group">
      {props.tools}
      <button className="icon quiet" onClick={() => commit(zoom / STEP)} disabled={zoom <= ZOOM_MIN} aria-label={props.zoomLabels?.out} title={props.zoomLabels?.out}>−</button>
      <button className="zoom-level" onClick={() => commit(1)} title={props.zoomLabels?.reset}>{Math.round(zoom * 100)}%</button>
      <button className="icon quiet" onClick={() => commit(zoom * STEP)} disabled={zoom >= ZOOM_MAX} aria-label={props.zoomLabels?.in} title={props.zoomLabels?.in}>+</button>
    </div>
  );
  const shell = (body: React.ReactNode, wrapped: boolean) => (
    <div ref={host} className={wrapped ? "systems-host systems" : "systems-host"}>
      {bar}
      <div ref={content} className="systems-content">{body}</div>
    </div>
  );
  if (!wrapByDefault && zoom === 1) return shell(<ScoreView {...props} />, false);
  if (scale * natural <= width + 0.5) return shell(<ScoreView {...props} drawScale={scale} />, false);

  // Bars per system: as many as fit at the chosen scale (at least one).
  const capacity = width / scale - SCORE_LEAD;
  const chunks: [number, number][] = [];
  let lo = 0;
  let used = 0;
  for (let b = 0; b < bars; b++) {
    if (b > lo && used + widths[b] > capacity) {
      chunks.push([lo, b - 1]);
      lo = b;
      used = 0;
    }
    used += widths[b];
  }
  chunks.push([lo, bars - 1]);
  // A last system holding only the final whole note joins the one before.
  if (chunks.length > 1 && chunks[chunks.length - 1][0] === bars - 1 && widths[bars - 1] <= 60) {
    chunks.pop();
    chunks[chunks.length - 1][1] = bars - 1;
  }
  /** Justify a system to the full width, unless it is a last one filled less than two thirds. */
  const fillOf = (a: number, b: number) => {
    const w = widths.slice(a, b + 1).reduce((x, y) => x + y, 0);
    return b === bars - 1 && w < capacity * 0.66 ? undefined : width / scale;
  };

  const heldAt = (line: (string | null)[] | undefined, k: number) => {
    if (!line || line[k] !== HOLD) return undefined;
    let j = k;
    while (j > 0 && line[j] === HOLD) j--;
    return line[j];
  };
  const shiftOverlay = (o: Overlay | undefined, start: number, end: number): Overlay | undefined =>
    o && {
      intervals: o.intervals.filter((x) => x.column >= start && x.column < end).map((x) => ({ ...x, column: x.column - start })),
      links: o.links.filter((l) => l.from >= start && l.to < end).map((l) => ({ ...l, from: l.from - start, to: l.to - start })),
    };

  return shell(
    <>
      {chunks.map(([a, b], i) => {
        const slots = slotsOfBars(layout, a, b);
        const start = slots[0];
        const end = start + slots.length;
        const inside = (k: number) => (k >= start && k < end ? k - start : -1);
        const slice = <T,>(line: T[]) => slots.map((k) => line[k]);
        return (
          <div key={`${a}-${b}`} className="system">
            <ScoreView
              {...props}
              cantus={props.cantus.slice(a, b + 1)}
              counterpoint={slice(props.counterpoint)}
              layout={slots.map((k) => layout[k])}
              fux={props.fux && slice(props.fux)}
              extraLines={props.extraLines?.map((l) => ({ ...l, notes: slice(l.notes) }))}
              selected={inside(props.selected)}
              cursor={inside(props.cursor)}
              marks={props.marks?.filter((m) => inside(m.column) >= 0).map((m) => ({ ...m, column: m.column - start }))}
              overlay={shiftOverlay(props.overlay, start, end)}
              firstBar={(props.firstBar ?? 1) + a}
              continuo={props.continuo && { ...props.continuo, realization: sliceRealization(props.continuo.realization, a, b) }}
              carry={{ counterpoint: heldAt(props.counterpoint, start), fux: heldAt(props.fux, start), extras: props.extraLines?.map((l) => heldAt(l.notes, start) ?? null) }}
              lastSystem={b === bars - 1}
              compact
              drawScale={scale}
              fillWidth={fillOf(a, b)}
              onPlace={(col, n) => props.onPlace(col + start, n)}
              onSelect={(col) => props.onSelect(col + start)}
              onDrag={props.onDrag && ((from, to, n) => props.onDrag!(from + start, to + start, n))}
            />
          </div>
        );
      })}
    </>,
    true,
  );
}
