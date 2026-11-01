/**
 * The design studio (D419): the side bars a little wider (the owner, via the main board: "widen them by about
 * 5–10% to give the player more touch area"), their share set once for the CSS (--tb-bar) and once for the
 * canvas and the touches (protos.ts BAR), the two the same number; no 20% left behind in the bars' CSS.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BAR } from "../src/bench/protos.ts";

const css = readFileSync(new URL("../src/bench/bench.css", import.meta.url), "utf8");

test("the bars' share: one CSS variable, the same as BAR, between 21% and 22%", () => {
  const v = Number(/--tb-bar: ([\d.]+);/.exec(css)?.[1]);
  assert.equal(v, BAR);
  assert.ok(BAR >= 0.21 && BAR <= 0.22, `${BAR}`);
});

test("no bar width left hard-coded: the box's margins, ✕, the roll's overhang, the side panels and the tutorial read --tb-bar", () => {
  assert.ok(!/var\(--tg-sar\)\) \* 0\.2\b/.test(css), "a 0.2 left");
  assert.ok(!/calc\(-100% \/ 3\)/.test(css), "the roll's 20/60/20 overhang left");
  assert.ok((css.match(/var\(--tb-bar\)/g) ?? []).length >= 10);
  assert.match(css, /\.tb-bars \.tg-box \{ margin: 0 calc\(var\(--tb-bar\) \* 100%\); \}/);
});
