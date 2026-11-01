/**
 * The design studio (D415): the music box under translucent bars, and the SUBJECT tab kept inside the box.
 * The owner: "we ought to be able to see the music flowing behind the buttons"; on 1.99/2.00 some tabs sat
 * off the top of the box, only their dotted pole seen.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { entryMarks, type Span } from "../src/touch/box-fx.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

/** A canvas that records the rectangles filled (x, y, w, h). */
function recorder() {
  const rects: [number, number, number, number][] = [];
  const g = { fillStyle: "", globalAlpha: 1, fillRect: (x: number, y: number, w: number, h: number) => rects.push([x, y, w, h]) };
  return { g: g as unknown as CanvasRenderingContext2D, rects };
}

const span = { voice: 1, on: 100, end: 900, form: "subject", theme: 0, path: [{ step: 20, on: 100 }] } as unknown as Span;

function draw(noteTop: number, freeFrom: number, left = 0) {
  const { g, rects } = recorder();
  const c = { g, w: 300, h: 140, left, xOf: (t: number) => t / 5, yOf: () => 4, hOf: () => 4, bh: 4, now: 200, tps: 100, gold: "", miss: "", fg: "", ink: () => "#fff" };
  const blocked = (_x0: number, _x1: number, y0: number) => y0 < freeFrom;
  entryMarks(c, [span], "a", "under", () => noteTop, blocked);
  const pole = rects.length;
  entryMarks(c, [span], "a", "over", () => noteTop, blocked);
  return { pole: rects.slice(0, pole), tab: rects.slice(pole) };
}

test("a tab with room over the notes stands at the box's top", () => {
  const { tab } = draw(40, 0);
  assert.ok(tab.length > 0 && tab[0][1] === 0 && tab[0][3] === 7);
});

test("a tab with no room at the top takes a free place lower down, its pole joining it to the note", () => {
  const { tab, pole } = draw(3, 30);
  assert.ok(tab.length > 0, "drawn");
  assert.ok(tab[0][1] >= 30 && tab[0][1] + tab[0][3] < 140, `inside the box, at ${tab[0][1]}`);
  for (const r of pole) assert.ok(r[1] > 8 && r[1] < tab[0][1], "the pole between the note and the tab, never up to the top");
});

test("with no place anywhere, no tab and no pole (never a pole to nothing)", () => {
  const { tab, pole } = draw(3, 1000);
  assert.equal(tab.length, 0);
  assert.equal(pole.length, 0);
});

test("a tab held once its note has gone by stops at the bars' edge (the open part's left), not under the bar", () => {
  const { tab } = draw(40, 0, 60);
  assert.ok(tab[0][0] >= 62);
});

test("the box runs under the bars with the time scale and play line of the part between them", () => {
  const box = src("src/touch/MusicBox.tsx");
  assert.match(box, /const span = \(vis \* w\) \/ wi;/);
  assert.match(box, /const t0 = fr\.now - PLAYHEAD \* vis - \(cl \/ wi\) \* vis;/);
  assert.match(src("src/bench/bench.css"), /\.tb-bars \.tg-box-wide \.tg-roll \{ margin: 0 calc\(-100% \/ 3\); pointer-events: none; \}/);
  // The judging geometry and the hint read the roll between the bars, as the box draws it.
  const app = src("src/bench/BenchApp.tsx");
  assert.ok(!app.includes('document.querySelector(".tg-roll")'));
  assert.ok(!src("src/bench/lab/LabApp.tsx").includes('document.querySelector(".tg-roll")'));
  const veil = Number(/const BAR_VEIL = ([\d.]+);/.exec(src("src/bench/paint-proto.ts"))?.[1]);
  assert.ok(veil > 0.3 && veil < 0.7, `the bars translucent (${veil})`);
});
