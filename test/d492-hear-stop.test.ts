/**
 * D492: HEAR THE SUBJECT without fingering suggestions, and its playback stopped whenever the view closes,
 * by any route: the close button and the backdrop (its close path), Escape, and the view taken away by
 * whatever shows it (its unmount), so the rule goes with the component wherever it is placed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D492: HEAR THE SUBJECT draws no fingering and offers no FINGERING SUGGESTION", async () => {
  register("./tsx-hooks.mjs", import.meta.url);
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { HearSubject } = await import("../src/bench/HearSubject.tsx");
  const html = renderToStaticMarkup(React.createElement(HearSubject, { id: "wtc1f02", play: async () => 0, stop: () => {}, close: () => {} }));
  assert.doesNotMatch(html, /FINGERING|hear-fingering/);
  const hs = src("src/bench/HearSubject.tsx");
  assert.doesNotMatch(hs, /subjectFingerings|drawThumb|FINGERING SUGGESTION/);
});

test("D492: the playback stops on every close and on unmount; the play screen passes its stop", () => {
  const hs = src("src/bench/HearSubject.tsx");
  // `stop` is required (a new home for the view must hand it over), called on unmount and in the close path.
  assert.match(hs, /stop: \(\) => void; close: \(\) => void/);
  assert.match(hs, /useEffect\(\(\) => \(\) => stopRef\.current\(\), \[\]\)/);
  assert.match(hs, /const close = \(\) => \{\s*stopRef\.current\(\);/);
  // The close button and the backdrop go through it; Escape too.
  assert.match(hs, /className="tb-hear-wrap"[^>]*onClick=\{close\}/);
  assert.match(hs, /aria-label="Close" onClick=\{close\}/);
  assert.match(hs, /ev\.key === "Escape"\) close\(\)/);
  assert.match(src("src/bench/BenchApp.tsx"), /<HearSubject [^>]*stop=\{stopHearing\}/);
});
