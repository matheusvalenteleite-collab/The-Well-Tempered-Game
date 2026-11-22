/** D940: DRUMS as two knobs in SOUND's language; the style's knob opens the grid; no third button. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
register("./tsx-hooks.mjs", import.meta.url);

test("D940: DRUMS ON/OFF a knob with its lamp and word; the style's knob opens the grid; no MORE button", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { Selection } = await import("../src/bench/Selection.tsx");
  const presets = [{ id: "home", name: "MARCH", home: true }, { id: "b", name: "SWING" }];
  const base = { piece: "wtc1f04", current: "wtc1f04", voice: 1, singing: [0, 1, 2, 3, 4], setVoice: () => {}, select: () => {}, play: () => {}, options: () => {}, open: () => {}, settings: () => {}, beaten: [] };
  const off = renderToStaticMarkup(createElement(Selection, { ...base, drums: { on: false, toggle: () => {}, presets, preset: "home", choose: () => {} } }));
  assert.match(off, /id="sel-drums-on"[^>]*role="switch"[^>]*aria-checked="false"[^>]*>.*sel-lamp.*DRUMS.*<b>OFF<\/b>/s);
  assert.match(off, /id="sel-drums-preset"[^>]*aria-haspopup="dialog"[^>]*>.*HOME.*MARCH ▦/s);
  assert.doesNotMatch(off, /sel-drums-more|sel-switch|sel-drums-ask/);
  const on = renderToStaticMarkup(createElement(Selection, { ...base, drums: { on: true, toggle: () => {}, presets, preset: "b", choose: () => {} } }));
  assert.match(on, /aria-checked="true"[^>]*>.*<b>ON<\/b>/s);
  // The grid keeps its OFF, so turning the drums off from the grid stays one tap.
  assert.match(readFileSync(new URL("../src/bench/Selection.tsx", import.meta.url), "utf8"), /id="drum-grid-off"/);
});
