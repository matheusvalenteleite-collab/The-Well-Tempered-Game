/**
 * D383: a page that draws each subject effect on a little box, for the effect GIFs (fx-gifs.cjs bundles
 * it with esbuild and films it in Chromium). Two entries: the player's (blue soprano, over its notes)
 * and another voice's (orange alto, at half strength, under its notes), scrolling past the playhead.
 */
import { subjectFx, type Span } from "../../src/touch/box-fx.ts";
import { BOOK1_CAST, BOOK2_CAST, type SubjectEffect } from "../../src/touch/subject-cast.ts";

const W = 168;
const H = 64;
const TPS = 960;
const INKS = ["#5aa0e6", "#ff8a50"];

function entry(voice: number, on: number, base: number): Span {
  const steps = [0, 2, 4, 3, 5, 7, 6, 4, 5, 2];
  const durs = [240, 240, 480, 240, 240, 480, 240, 240, 720, 480];
  let t = on;
  const path = steps.map((s, i) => {
    const n = { on: t, dur: durs[i], step: base + s };
    t += durs[i];
    return n;
  });
  return { voice, on, end: t, form: "subject", key: "C", path };
}

/** The first piece cast as each effect (so effectOf picks it). */
export function pieceFor(fx: SubjectEffect): string {
  for (const [id, row] of Object.entries({ ...BOOK1_CAST, ...BOOK2_CAST })) if (row[0] === fx) return id;
  return "wtc1f01";
}

/** Draws frame `i` of `n` (24 a second) of an effect on the canvas, at `scale` pixels a pixel. */
export function frame(cv: HTMLCanvasElement, fx: SubjectEffect, i: number, scale: number) {
  cv.width = W * scale;
  cv.height = H * scale;
  const out = cv.getContext("2d")!;
  const box = document.createElement("canvas");
  box.width = W;
  box.height = H;
  const g = box.getContext("2d")!;
  const t = i / 24;
  const now = 600 + t * TPS * 0.9;
  const xOf = (tk: number) => Math.round(28 + (tk - now) / 14);
  const yOf = (st: number) => H - 8 - st * 4;
  const bh = 4;
  g.fillStyle = "#121a34";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#1a2448";
  for (let y = 2; y < H; y += 8) g.fillRect(0, y, W, 4);
  g.fillStyle = "#fef0a8";
  g.globalAlpha = 0.5;
  g.fillRect(28, 0, 1, H);
  g.globalAlpha = 1;
  const spans = [entry(0, 700, 6), entry(1, 400, 0)];
  const c = { g, w: W, h: H, xOf, yOf, bh, now, tps: TPS, gold: "#fc4", miss: "#777", fg: "#fff", ink: (v: number) => INKS[v] };
  const piece = pieceFor(fx);
  // The other voice's notes, its effect under them; then the player's, outlined, its effect over them.
  subjectFx(c, spans, [0], false, piece, 480, t);
  for (const n of spans[1].path) {
    g.fillStyle = INKS[1];
    g.globalAlpha = now >= n.on && now < n.on + n.dur ? 1 : 0.7;
    g.fillRect(xOf(n.on), yOf(n.step) + 1, Math.max(1, xOf(n.on + n.dur) - xOf(n.on) - 2), 2);
  }
  g.globalAlpha = 1;
  for (const n of spans[0].path) {
    const x = xOf(n.on);
    const w = Math.max(1, xOf(n.on + n.dur) - x - 2);
    g.fillStyle = "#ffffff";
    g.fillRect(x - 1, yOf(n.step) - 1, w + 2, bh + 2);
    g.fillStyle = INKS[0];
    g.fillRect(x, yOf(n.step), w, bh);
  }
  subjectFx(c, spans, [0], true, piece, 480, t);
  g.fillStyle = "#fef0a8";
  g.font = "6px monospace";
  out.imageSmoothingEnabled = false;
  out.drawImage(box, 0, 0, W * scale, H * scale);
  out.fillStyle = "#fef0a8";
  out.font = `bold ${4 * scale}px monospace`;
  out.fillText(fx, 4 * scale, 7 * scale);
}

(globalThis as unknown as { fxFrame: typeof frame }).fxFrame = frame;
