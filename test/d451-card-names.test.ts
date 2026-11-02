/** D451: the cards' names wrap only between words (and after a hyphen); a long word sets a smaller size so it fits whole. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

register("./tsx-hooks.mjs", import.meta.url);

test("D451: no break inside a word; the longest word sizes the name", async () => {
  const { longestWord } = await import("../src/bench/Selection.tsx");
  assert.deepEqual(["The Shepherdess", "The Sleepwalker", "The Gramophone", "The Stone-Skipper", "The Imp", "A Locomotiva"].map(longestWord), ["11", "11", "10", "short", "short", "10"]);
  const css = readFileSync(new URL("../src/bench/selection.css", import.meta.url), "utf8");
  const last = css.slice(css.lastIndexOf("D451"));
  assert.match(last, /\.sel-tile \.sel-tile-name \{ overflow-wrap: normal; word-break: normal;/);
});
