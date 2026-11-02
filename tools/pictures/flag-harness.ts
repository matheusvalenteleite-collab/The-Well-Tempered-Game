/**
 * D493: a page that draws a fugue's music box at a moment, its entry flags as the game draws them (box-fx.ts
 * entryMarks, variant a: the tabs ahead, the pinned tags of the entries sounding), for the flag screenshots
 * (flag-shots.cjs bundles it with esbuild and photographs it in Chromium). The notes are the piece's own, each
 * voice in its ink; the play line at a third of the box.
 */
import { entryMarks } from "../../src/touch/box-fx.ts";
import { fugueById } from "../../src/touch/fugue.ts";
import { entrySpans, stepRange } from "../../src/touch/voice-mode.ts";

const INKS = ["#5aa0e6", "#ff8a50", "#7ad07a", "#d68ae6", "#e6d25a"];

/** Draws fugue `id` at bar `bar` (+ quarters `q`) on the canvas: a box `w` by `h` pixels, at `scale`. */
export function shot(cv: HTMLCanvasElement, id: string, bar: number, q: number, w: number, h: number, scale: number, title: string) {
  const f = fugueById(id);
  const spans = entrySpans(f);
  const b = f.bars.find((x) => x.n === bar) ?? f.bars[0];
  const now = b.on + q * f.tpq;
  const play = Math.round(w / 3);
  const tickPx = f.tpq / 7; // ticks a pixel: a quarter is 7 px
  const xOf = (t: number) => Math.round(play + (t - now) / tickPx);
  const { lo, hi } = stepRange(f);
  const top = 26;
  const rowH = Math.max(2, Math.floor((h - top - 4) / (hi - lo + 1)));
  const yOf = (st: number) => top + (hi - st) * rowH;
  const bh = Math.max(2, rowH);
  const box = document.createElement("canvas");
  box.width = w;
  box.height = h;
  const g = box.getContext("2d")!;
  g.fillStyle = "#121a34";
  g.fillRect(0, 0, w, h);
  const rects: [number, number, number, number, number][] = [];
  f.voices.forEach((notes, v) => {
    for (const [on, dur, , step] of notes) {
      const x = xOf(on);
      const x2 = xOf(on + dur);
      if (x2 < 0 || x > w) continue;
      rects.push([x, yOf(step), Math.max(1, x2 - x - 1), bh, v]);
    }
  });
  const noteTop = (x0: number, x1: number) => {
    let t = h;
    for (const [x, y, rw] of rects) if (x < x1 && x + rw > x0) t = Math.min(t, y);
    return t;
  };
  const blocked = (x0: number, x1: number, y0: number, y1: number, voice: number) =>
    rects.some(([x, y, rw, rh, v]) => (voice < 0 || v !== voice) && x < x1 && x + rw > x0 && y < y1 && y + rh > y0);
  const c = { g, w, h, xOf, yOf, bh, now, tps: f.tpq * 2, gold: "#fc4", miss: "#777", fg: "#fff", ink: (v: number) => INKS[v % INKS.length], play, left: 0 };
  entryMarks(c as never, spans, "a", "under", noteTop, blocked);
  for (const [x, y, rw, rh, v] of rects) {
    g.fillStyle = INKS[v % INKS.length];
    g.globalAlpha = x <= play ? 0.55 : 1;
    g.fillRect(x, y, rw, rh);
  }
  g.globalAlpha = 1;
  g.fillStyle = "#fef0a8";
  g.fillRect(play, 0, 1, h);
  entryMarks(c as never, spans, "a", "over", noteTop, blocked);
  cv.width = w * scale;
  cv.height = (h + 12) * scale;
  const out = cv.getContext("2d")!;
  out.fillStyle = "#0b1022";
  out.fillRect(0, 0, cv.width, cv.height);
  out.imageSmoothingEnabled = false;
  out.drawImage(box, 0, 12 * scale, w * scale, h * scale);
  out.fillStyle = "#fef0a8";
  out.font = `bold ${7 * scale}px monospace`;
  out.fillText(title, 3 * scale, 9 * scale);
}
(globalThis as Record<string, unknown>).flagShot = shot;
