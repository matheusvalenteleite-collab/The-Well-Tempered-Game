/**
 * The design studio (D469, D470): the owner's last batch before the friends test: the pistons in the box's frame,
 * slides drawn, the fugue's name in the title (the map off it), no legend or hint at a game's start, SOFT / STRONG
 * always at the bars' top, (OBBLIGATO named while it plays: retired by D496), failure words that stay; the score screen on the whole screen.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D471: the pistons back at the bars' feet (D469's move undone), acting on pointerdown", () => {
  const r = src("src/touch/RegistrationStops.tsx");
  assert.ok(!r.includes("rollRect") && !r.includes("TAB_ROW"));
  assert.match(r, /--tb-stop-rows: \$\{PISTON_ROWS\}/);
  assert.match(r, /onPointerDown=\{\(e: ReactPointerEvent\) => \{/);
  // D495: the legend's floor gone (the roll as tall as without stops); the feet a strip over the roll's foot that takes no touch but on its buttons.
  const css = src("src/bench/bench.css");
  assert.ok(!/\.tb-has-side-stops\.tb-bars \.tg-legend \{ min-height/.test(css), "no floor under the roll");
  assert.match(css, /\.tb-stops-side \{ pointer-events: none; \}/);
  assert.match(css, /\.tb-stops-side \.tg-piston \{ pointer-events: auto; height: 28px;/);
});

test("slides drawn in the box: from the note slid from, or from a slide-in's start", () => {
  assert.match(src("src/touch/MusicBox.tsx"), /if \(n\.state !== "hit" \|\| n\.via !== "slide"\) continue;/);
  assert.match(src("src/touch/MusicBox.tsx"), /if \(n\.slideFrom !== undefined\)/);
  assert.match(src("src/bench/proto-game.ts"), /notes\[i\]\.slideFrom = this\.rows \? this\.rows\.stepAt\(si\.y0\) : undefined;/);
});

test("the title bar: the fugue's name before its title; the map moved to the left bar's foot", () => {
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /return name \? `\$\{name\.toUpperCase\(\)\} · \$\{formal\}` : formal;/);
  const p = src("src/bench/paint-proto.ts");
  assert.match(p, /const mw = bw - 16;\s*const x0 = 8;/);
});

test("no legend, no instructions at a game's start (the tutorial keeps them; the gloss stays)", () => {
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /glossOnly=\{!man\}/);
  assert.match(app, /\{hintLine && \(layout !== "bars" \|\| man \|\| revealPlan\)/);
  assert.match(src("src/bench/SideNotes.tsx"), /if \(glossOnly\) return whole \?/);
});

test("SOFT / STRONG always, at the bars' top; failure words stay 1.8 s, one slot each", () => {
  const p = src("src/bench/paint-proto.ts");
  assert.match(p, /const SIDES_Y = 26;/);
  assert.match(p, /label\(c, "SOFT", xAt\(weak\), SIDES_Y/);
  assert.ok(!/SIDES_HINT_S/.test(p), "no longer only the first seconds");
  assert.match(p, /export const BAD_WORD_MS = 1800;/);
  assert.match(p, /export const SLIDE_CUE_MS = 1800;/);
});

test("the score screen on the whole screen, the safe areas inside its padding", () => {
  const css = src("src/bench/bench.css");
  assert.match(css, /\.tb-result \{ position: fixed; inset: 0; z-index: 50; box-sizing: border-box; width: 100vw; height: 100vh; height: 100dvh;/);
});
