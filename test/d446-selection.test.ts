/**
 * D446, THE SELECTION SCREEN TIGHTENED: every card shows its level; the number, key and name inside the
 * picture; no language picker on the selection screen (SETTINGS has it); four voices' names short enough
 * for one line; the grades' inks in order of worth (S gold, A green, B yellow, C orange-red, D red).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
register("./tsx-hooks.mjs", import.meta.url);

test("D446: the grades' inks: A green, B yellow, C reddish", async () => {
  const { GRADE_INK } = await import("../src/bench/LiteGrid.tsx");
  assert.deepEqual(GRADE_INK, { S: "#ffd23f", A: "#5fdc6a", B: "#e8c94a", C: "#f0784a", D: "#d8443a" });
});

test("D446: every card its level and its words inside the picture; no language picker; short voice names", async () => {
  store.clear();
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { Selection, shortPart } = await import("../src/bench/Selection.tsx");
  const html = renderToStaticMarkup(createElement(Selection, { piece: "wtc1f02", voice: 1, singing: [0, 1, 2], setVoice: () => {}, select: () => {}, play: () => {}, options: () => {}, open: () => {}, hear: () => {}, settings: () => {}, setLang: () => {}, beaten: [], tutorial: { done: 3, of: 12, start: () => {} } }));
  assert.equal(html.match(/id="level-wtc1f\d\d"/g)?.length, 24, "a level on every card");
  assert.ok(/class="sel-pic"(?:(?!sel-tile-level).)*?<\/span>/s.test(html) && html.includes("sel-tile-words"), "the words on the picture");
  assert.doesNotMatch(html, /tb-lang-pick|sel-lang/);
  assert.deepEqual(["SOPRANO", "SOPRANO II", "TENOR", "ALTO", "BASS"].map(shortPart), ["SOP", "SOP II", "TEN", "ALTO", "BASS"]);
  assert.match(src("src/bench/selection.css"), /D446/);
});
