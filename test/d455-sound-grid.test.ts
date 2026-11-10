/** D455: SOUND as a grid of cards in DRUMS' language: grouped as the list was, HOME marked, the one playing lit, a tap the list's setSound. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
register("./tsx-hooks.mjs", import.meta.url);
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D455: the knob opens the grid (no list); locked until a B; every sound in a family, HOME and the lit one", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { Selection } = await import("../src/bench/Selection.tsx");
  const { POP_SOUNDS } = await import("../src/bench/PlayPop.tsx");
  const base = { piece: "wtc1f04", current: "wtc1f04", voice: 1, singing: [0, 1, 2, 3, 4], setVoice: () => {}, select: () => {}, play: () => {}, options: () => {}, open: () => {}, hear: () => {}, settings: () => {}, beaten: [], tutorial: { done: 3, of: 12, start: () => {} } };
  const open = renderToStaticMarkup(createElement(Selection, { ...base, sound: { value: "gameboy", name: "GAME BOY", sounds: POP_SOUNDS, own: "stringConsort", set: () => {} } }));
  assert.match(open, /<button[^>]*id="sel-sound-knob"[^>]*aria-haspopup="dialog"/);
  assert.doesNotMatch(open, /id="sel-sound"/, "no unfolding list");
  const locked = renderToStaticMarkup(createElement(Selection, { ...base, sound: { locked: true, value: "stringConsort", name: "STRING CONSORT", sounds: POP_SOUNDS, own: "stringConsort", set: () => {} } }));
  assert.match(locked, /id="sel-sound-knob" disabled=""/);
  const s = src("src/bench/Selection.tsx");
  assert.match(s, /function SoundGrid/);
  assert.match(s, /onClick=\{\(\) => sound\.set\(sid\)\}/, "the list's own setSound");
  assert.match(s, /\{home && \([\s\S]*?tr\("HOME"\)/);
});
