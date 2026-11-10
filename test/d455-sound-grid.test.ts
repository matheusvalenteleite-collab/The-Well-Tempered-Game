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
  assert.match(s, /const pick = \(sid: string\) => \{\s*sound\.set\(sid\);/, "the list's own setSound");
  assert.match(s, /onClick=\{\(\) => pick\(sid\)\}/);
  // The clip: Instruments' auditionUrl, nothing fetched before the tap, stopped by the next tap and by the closing.
  assert.match(s, /<audio ref=\{clip\} preload="none"/);
  assert.match(s, /const url = auditionUrl\(sid\);/);
  assert.match(s, /const a = clip\.current;\s*return \(\) => a\?\.pause\(\);/);
  assert.match(s, /soundBlurb\(sid, blurbLang\)/);
  const { auditionUrl, soundBlurb } = await import("../src/touch/sound-blurbs.ts");
  const { SOUND_GROUPS } = await import("../src/bench/SoundSelect.tsx");
  for (const [, ids] of SOUND_GROUPS) for (const id of ids) for (const l of ["en", "pt", "es"] as const) {
    assert.ok(auditionUrl(id), `${id}: a clip`);
    assert.ok(soundBlurb(id, l).length > 0 && soundBlurb(id, l).length <= 60, `${id} ${l}: a line`);
  }
  assert.match(s, /\{home && \([\s\S]*?tr\("HOME"\)/);
});
