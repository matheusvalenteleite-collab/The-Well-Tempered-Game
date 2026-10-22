/**
 * The keys (D167): the play area is crossed by rows, one per staff step (line or space) of the voice,
 * lowest at the bottom, and the music box draws the voice on the same rows, so the eyes can stay on the
 * music and the thumbs find the row by its height. A row plays whatever the score has on that step
 * (B or B♭ alike). When a voice's range in a section is small (MAX_ROWS steps or fewer) the rows stay
 * put for the whole section; otherwise they are set afresh every two bars, to the steps those bars use,
 * or every bar where two bars range too wide (D168: a prelude's hand leaps further than a voice).
 */
export const MAX_ROWS = 12;
export const MIN_ROWS = 7;

export interface RowWindow {
  /** Ticks [from, to). */
  from: number;
  to: number;
  /** The lowest step, and how many rows. */
  lo: number;
  rows: number;
}

/** Rows around the steps lo..hi: at least MIN_ROWS, a step of room either side when it fits. */
function frame(lo: number, hi: number): { lo: number; rows: number } {
  let rows = hi - lo + 1;
  if (rows + 2 <= MAX_ROWS) (lo -= 1), (rows += 2);
  if (rows < MIN_ROWS) {
    const more = MIN_ROWS - rows;
    lo -= Math.floor(more / 2);
    rows = MIN_ROWS;
  }
  return { lo, rows };
}

export function rowWindows(notes: readonly { on: number; step: number }[], from: number, to: number, barTicks: number): RowWindow[] {
  const steps = notes.map((n) => n.step);
  if (!steps.length) return [{ from, to, lo: 0, rows: MIN_ROWS }];
  const lo = Math.min(...steps);
  const hi = Math.max(...steps);
  if (hi - lo + 1 <= MAX_ROWS) return [{ from, to, ...frame(lo, hi) }];
  const out: RowWindow[] = [];
  const spans: [number, number][] = [];
  const wide = (a: number, b: number) => {
    const here = notes.filter((n) => n.on >= a && n.on < b).map((n) => n.step);
    return here.length > 0 && Math.max(...here) - Math.min(...here) + 1 > MAX_ROWS + 2;
  };
  for (let a = from; a < to; a += 2 * barTicks) {
    const b = Math.min(to, a + 2 * barTicks);
    if (wide(a, b) && b - a > barTicks) spans.push([a, a + barTicks], [a + barTicks, b]);
    else spans.push([a, b]);
  }
  for (const [a, b] of spans) {
    const here = notes.filter((n) => n.on >= a && n.on < b).map((n) => n.step);
    if (!here.length) {
      if (out.length) out[out.length - 1].to = b;
      else out.push({ from: a, to: b, ...frame(lo, Math.min(hi, lo + MAX_ROWS - 1)) });
      continue;
    }
    let l = Math.min(...here);
    let h = Math.max(...here);
    // A bar that leaps more than the rows can hold (MAX_ROWS, or two more at a pinch) keeps the
    // middle of its range; the rare note beyond it is drawn and played on the nearest row.
    if (h - l + 1 > MAX_ROWS + 2) {
      const mid = Math.round((l + h) / 2);
      (l = mid - 6), (h = mid + 7);
    }
    out.push({ from: a, to: b, ...frame(l, h) });
  }
  return out;
}

export function windowAt(ws: readonly RowWindow[], tick: number): RowWindow {
  return ws.find((w) => tick >= w.from && tick < w.to) ?? (tick < ws[0].from ? ws[0] : ws[ws.length - 1]);
}

/** The row (0 at the bottom) under a thumb at height y (a share of the area, 0 at the top). */
export function rowAt(y: number, rows: number): number {
  return rows - 1 - Math.floor(Math.min(0.9999, Math.max(0, y)) * rows);
}
