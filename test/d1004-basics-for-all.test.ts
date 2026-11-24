/**
 * D1004 (design studio; the owner: "add it to main game for all players"): BASICS in the TUTORIAL slot for every player;
 * the first visit's hint with BASICS; every word in pt and es. D1050 (code audit A): the old tutorial (THE MANUAL) deleted,
 * its developer link with it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";
import { BASICS_PT } from "../src/i18n/basics-pt.ts";
import { BASICS_ES } from "../src/i18n/basics-es.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("BASICS for every player; the old tutorial gone", () => {
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /basics=\{\{ beginner: beginner\(lite\.best\), start: \(\) => basicsAct\(0\), soon: unlocked\(\) \}\}/);
  assert.doesNotMatch(app, /startManual|manualProgress|tutorial=\{/);
  const sel = src("src/bench/Selection.tsx");
  assert.match(sel, /const first = !!p\.basics && liteFirstVisit\(beaten, 0\);/);
  assert.doesNotMatch(sel, /card-tutorial-old|id="card-tutorial"/);
});

test("every word of the BASICS block and the first visit's hint in Portuguese and Spanish", () => {
  const both = (w: string) => (PT[w] ?? BASICS_PT[w]) && (ES[w] ?? BASICS_ES[w]);
  for (const w of ["BASICS", "WITH GLENN", "BEGIN", "INTERMEDIATE", "ADVANCED", "UNDER CONSTRUCTION", "Pick a fugue in the middle, or learn first with BASICS on the left."]) assert.ok(both(w), w);
});
