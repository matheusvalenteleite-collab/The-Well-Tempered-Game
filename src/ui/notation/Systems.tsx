import { useLayoutEffect, useRef, useState } from "react";
import { HOLD, slotLayout, slotsOfBars } from "../../counterpoint/layout.ts";
import type { Overlay } from "./overlay.ts";
import { barWidth, SCORE_LEAD, ScoreView, type ScoreProps } from "./ScoreView.tsx";

/**
 * The score broken into systems (D83), as on a printed page, when one line would be too small to
 * read: on a narrow screen when it would be drawn below 60% of its size, anywhere below 35%. Each
 * system is an ordinary score of a run of bars; clicks, selection, the playback cursor, marks and
 * the overlay are mapped between the systems and the whole. The continuo is not drawn in systems.
 */
const NARROW = 700;
const TARGET = 0.62;

export function Systems(props: ScoreProps) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = host.current!;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const layout = props.layout ?? slotLayout("first", props.cantus.length);
  const bars = props.cantus.length;
  const widths = Array.from({ length: bars }, (_, b) => barWidth(layout, b));
  const natural = SCORE_LEAD + widths.reduce((a, w) => a + w, 0);
  const single = width ? width / natural : 1;
  const wrap = !props.fixedScale && width > 0 && ((width < NARROW && single < 0.6) || single < 0.35);
  if (!wrap) return <div ref={host} className="systems-host"><ScoreView {...props} /></div>;

  // Bars per system: as many as fit at about TARGET of full size (at least one).
  const capacity = width / TARGET - SCORE_LEAD;
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

  return (
    <div ref={host} className="systems-host systems">
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
              continuo={undefined}
              carry={{ counterpoint: heldAt(props.counterpoint, start), fux: heldAt(props.fux, start), extras: props.extraLines?.map((l) => heldAt(l.notes, start) ?? null) }}
              lastSystem={b === bars - 1}
              compact
              onPlace={(col, n) => props.onPlace(col + start, n)}
              onSelect={(col) => props.onSelect(col + start)}
              onDrag={props.onDrag && ((from, to, n) => props.onDrag!(from + start, to + start, n))}
            />
          </div>
        );
      })}
    </div>
  );
}
