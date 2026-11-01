/**
 * The design studio (D466): the owner chose B with C. B: a sounding entry's SUBJECT tab pinned at the top just
 * before the play line (never over what is coming), a bar of what is left; stretto entries stacked. C: the
 * player's own subject notes rimmed in gold.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { entryMarks, type Span } from "../src/touch/box-fx.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

function recorder() {
  const rects: [number, number, number, number][] = [];
  const g = { fillStyle: "", globalAlpha: 1, fillRect: (x: number, y: number, w: number, h: number) => rects.push([x, y, w, h]) };
  return { g: g as unknown as CanvasRenderingContext2D, rects };
}
const span = (on: number, end: number, voice = 1) => ({ voice, on, end, form: "subject", theme: 0, path: [{ step: 20, on }] }) as unknown as Span;

test("a sounding entry's tab ends just before the play line, at the top, with the bar of what is left", () => {
  const { g, rects } = recorder();
  const c = { g, w: 400, h: 140, left: 40, play: 150, xOf: (t: number) => t / 5, yOf: () => 60, hOf: () => 4, bh: 4, now: 600, tps: 100, gold: "", miss: "", fg: "", ink: () => "#5cb2ff" };
  entryMarks(c, [span(400, 1200)], "a", "over", () => 0, () => true);
  const tab = rects[0];
  assert.ok(tab[0] + tab[2] <= 150 - 2, `ends before the line (${tab[0] + tab[2]})`);
  assert.ok(tab[1] <= 2, "at the top");
  const bar = rects.filter((r) => r[3] === 1 && r[1] > tab[1] + tab[3]);
  assert.ok(bar.length >= 2, "the bar and its track");
});

test("overlapping entries stack, one row each; an entry not yet sounding keeps its tab at its own start", () => {
  const { g, rects } = recorder();
  const c = { g, w: 400, h: 140, left: 0, play: 150, xOf: (t: number) => t / 5, yOf: () => 60, hOf: () => 4, bh: 4, now: 900, tps: 100, gold: "", miss: "", fg: "", ink: () => "#fff" };
  entryMarks(c, [span(400, 1600, 1), span(800, 2000, 2)], "a", "over", () => 40, () => false);
  const tabs = rects.filter((r) => r[3] === 7);
  assert.equal(tabs.length, 2);
  assert.notEqual(tabs[0][1], tabs[1][1]);
});

test("the player's subject notes rimmed (gold, outside the white outline)", () => {
  const box = src("src/touch/MusicBox.tsx");
  assert.match(box, /const subjIdx = spans \? membership\(pnotes, spans, pv\) : null;/);
  assert.match(box, /if \(subjIdx && subjIdx\[ni\] >= 0\) \{\s*g\.fillStyle = SUBJECT_RIM;/);
  assert.match(box, /left: Math\.round\(cl\), play: playX,/);
});
