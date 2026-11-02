/**
 * The design studio (D472): STRING CONSORT's five articulation stops (D512's API) at both bars' feet, three over two,
 * names fitting, the stop in force lit, chosen on pointerdown; only for the consort; the floor kept for OBBLIGATO.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("five stops on each bar's foot, ARCO lit at first, only for STRING CONSORT", async () => {
  register("./tsx-hooks.mjs", import.meta.url);
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { ConsortStops } = await import("../src/touch/ConsortStops.tsx");
  const html = renderToStaticMarkup(React.createElement(ConsortStops, { presetId: "stringConsort", piece: "wtc1f04" }));
  for (const side of ["left", "right"]) {
    const ids = [...html.matchAll(new RegExp(`id="consort-${side}-(\\w+)"`, "g"))].map((m) => m[1]);
    assert.deepEqual(ids, ["arco", "spicc", "pizz", "sord", "trem"], side);
  }
  assert.match(html, /id="consort-left-arco" class="tg-piston on"/);
  assert.match(html, />SPICC\.</);
  assert.equal(renderToStaticMarkup(React.createElement(ConsortStops, { presetId: "chamberOrgan", piece: "wtc1f01" })), "");
});

test("wired at the bars' feet in a game, chosen on pointerdown, the pistons' floor kept", () => {
  const c = src("src/touch/ConsortStops.tsx");
  assert.match(c, /onPointerDown=\{press\(s\)\}/);
  assert.match(c, /chooseConsortStop\(piece, presetId, s\)/);
  assert.match(c, /--tb-stop-rows: \$\{CONSORT_ROWS\}/);
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /\{consortOn && <ConsortStops presetId=\{presetById\(soundNow\)\.id\} piece=\{f\.id\} \/>\}/);
  assert.match(src("src/bench/bench.css"), /\.tb-consort \.tg-piston:nth-child\(n \+ 4\) \{ grid-column: span 3; \}/);
});
