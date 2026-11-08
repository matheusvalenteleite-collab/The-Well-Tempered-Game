/**
 * D453: the selection's DRUMS against the drum library: a switch; the style's name, a tap the next of HOME and the
 * sound's family (and the fugue's picks); MORE, every style by family, HOME and FITS marked, the one playing lit.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
register("./tsx-hooks.mjs", import.meta.url);

test("D453: the quick round is HOME and the curated styles, round; MORE's choice is kept and turns the drums on", async () => {
  store.clear();
  await import("../src/bench/drum-presets-link.ts");
  const D = await import("../src/bench/LiteDrums.tsx");
  const L = await import("../src/touch/drum-library.ts");
  const piece = "wtc1f04";
  const sound = "harpsichord";
  const menu = D.drumPresets(piece, sound);
  assert.equal(menu.length, L.styleIds.length, "every style for every fugue");
  assert.equal(menu[0].id, "home");
  const quick = 1 + L.curatedFor(piece, sound).filter((s) => s !== L.homeStyleFor(sound)).length;
  assert.ok(quick >= 2 && quick < menu.length);
  const seen = [D.drumPresetOf(piece, sound)];
  for (let i = 0; i < quick; i++) seen.push(D.cycleDrumPreset(piece, sound, quick));
  assert.deepEqual(seen.slice(0, quick), menu.slice(0, quick).map((m) => m.id), "HOME, then the sound's family, in order");
  assert.equal(seen[quick], "home", "round");
  assert.equal(D.liteDrums(), true, "cycling turns the drums on");
  D.setLiteDrums(false);
  const far = menu[menu.length - 1].id;
  D.chooseDrumPreset(piece, far);
  assert.equal(D.drumPresetOf(piece, sound), far);
  assert.equal(L.chosenStyle(piece), far, "the drummer plays it");
  assert.equal(D.liteDrums(), true);
  assert.equal(D.cycleDrumPreset(piece, sound, quick), menu[0].id, "from beyond the round, back to its first");
});

test("D453: the row (a switch, the style, MORE) and the grid by family with HOME, FITS and the one lit", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { Selection } = await import("../src/bench/Selection.tsx");
  const L = await import("../src/touch/drum-library.ts");
  const presets = L.drumMenuFor("wtc1f04", "harpsichord");
  const html = renderToStaticMarkup(createElement(Selection, { piece: "wtc1f04", current: "wtc1f04", voice: 1, singing: [0, 1, 2, 3, 4], setVoice: () => {}, select: () => {}, play: () => {}, options: () => {}, open: () => {}, hear: () => {}, settings: () => {}, beaten: [], tutorial: { done: 3, of: 12, start: () => {} }, drums: { on: true, toggle: () => {}, presets, preset: "home", quick: 4, cycle: () => {}, choose: () => {} } }));
  assert.match(html, /id="sel-drums-on"[^>]*role="switch"[^>]*aria-checked="true"/);
  assert.match(html, new RegExp(`id="sel-drums-preset".*${presets[0].name} ↻`, "s"));
  assert.match(html, /id="sel-drums-more"/);
  const src = (await import("node:fs")).readFileSync(new URL("../src/bench/Selection.tsx", import.meta.url), "utf8");
  assert.match(src, /function DrumGrid/);
  assert.match(src, /\{d\.home && <i className="home">\{tr\("HOME"\)\}<\/i>\}/);
  assert.match(src, /\{d\.fits && <i className="fits">\{tr\("FITS"\)\}<\/i>\}/);
});
