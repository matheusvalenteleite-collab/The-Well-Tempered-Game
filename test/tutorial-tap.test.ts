/**
 * The tutorial stuck at Herr Bach's first message (the owner on WTC 2.31, iPhone: "In lessons I cannot pass the
 * first message, even though I'm tapping"). Between a lesson's steps his card (BachTalk, .tb-bach-low) is drawn
 * inside the music box's roll, and since D416 (WTC 2.04) the widened roll takes no pointer events on the bars, so
 * every tap on his card fell through to the box beneath. His card takes touches again.
 *
 * The browser drive (the production build, iPhone 13 landscape, real touch taps through the first lesson's
 * messages): tools/touch/tutorial-tap.cjs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("his card is drawn inside the roll (so the roll's pointer-events reach it)", () => {
  const app = src("src/bench/BenchApp.tsx");
  const open = app.indexOf("<MusicBox");
  const close = app.indexOf("</MusicBox>");
  const card = app.indexOf('className={manLesson && isCourse(manLesson) ? "tb-bach-low" : undefined}');
  assert.ok(open > 0 && card > open && card < close, "BachTalk (tb-bach-low) sits among MusicBox's children");
  assert.match(src("src/touch/MusicBox.tsx"), /<div className="tg-roll" ref=\{wrap\}>\s*<canvas ref=\{canvas\} \/>\s*\{children\}/);
});

test("the widened roll lets touches through to the bars, but his card takes them", () => {
  const css = src("src/bench/bench.css");
  assert.match(css, /\.tb-bars \.tg-box-wide \.tg-roll \{[^}]*pointer-events: none; \}/);
  const rule = /\.tb-bars \.tg-box-wide \.tg-roll > \.tb-bach[^{]*\{ pointer-events: auto; \}/.exec(css);
  assert.ok(rule, "a rule gives .tb-bach inside the roll its pointer events back");
  // It must come after the roll's own rule (same origin, more specific anyway; kept in order for reading).
  assert.ok(css.indexOf(rule[0]) > css.search(/\.tb-bars \.tg-box-wide \.tg-roll \{/));
  // Never the whole roll: the canvas stays touch-through so the bars under it are pressed.
  assert.ok(!/\.tg-roll > \*\s*[,{][^}]*pointer-events: auto/.test(css));
  assert.ok(!/\.tg-roll > canvas[^{]*\{[^}]*pointer-events: auto/.test(css));
});

test("his card advances on a click (a tap): the handler is on the card itself", () => {
  assert.match(src("src/bench/Bach.tsx"), /className=\{`tb-bach\$\{className \? ` \$\{className\}` : ""\}`\} role="dialog"[^>]*onClick=\{advance\}/);
});
