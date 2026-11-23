/**
 * D1004 (design studio; the owner: "add it to main game for all players"): BASICS in the TUTORIAL slot for every player;
 * the old tutorial (THE MANUAL, out of the game since D868) reachable in the developer view only; the first visit's hint
 * with BASICS; every word in pt and es.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";
import { BASICS_PT } from "../src/i18n/basics-pt.ts";
import { BASICS_ES } from "../src/i18n/basics-es.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("BASICS for every player; the old tutorial the developer view's alone", () => {
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /basics=\{\{ beginner: beginner\(lite\.best\), start: \(\) => basicsAct\(0\), soon: unlocked\(\) \}\}/);
  assert.match(app, /tutorial=\{unlocked\(\) \? \{ \.\.\.manualProgress\(readManual\(\)\), start: \(\) => startManual\(\) \} : undefined\}/);
  const sel = src("src/bench/Selection.tsx");
  assert.match(sel, /const first = \(!!tutorial \|\| !!p\.basics\) && liteFirstVisit\(beaten, tutorial\?\.done \?\? 0\);/);
  assert.match(sel, /\{tutorial && \(\s*<button type="button" id="card-tutorial-old"/);
});

test("every word of the BASICS block and the first visit's hint in Portuguese and Spanish", () => {
  const both = (w: string) => (PT[w] ?? BASICS_PT[w]) && (ES[w] ?? BASICS_ES[w]);
  for (const w of ["BASICS", "WITH GLENN", "BEGIN", "INTERMEDIATE", "ADVANCED", "UNDER CONSTRUCTION", "OLD TUTORIAL", "Pick a fugue in the middle, or learn first with BASICS on the left."]) assert.ok(both(w), w);
});
