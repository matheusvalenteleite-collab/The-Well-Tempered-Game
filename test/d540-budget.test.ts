/**
 * D540, the memory budget (BRIEF-BANDS2: "≤25 MB of decoded audio per preset, ≤40 MB resident in total"; budget.ts): every
 * sound's decoded MB reported (its worst fugue and voice, as a phone holds it); a preset marked `budgeted` (each v2 once
 * v2) fails above 25 MB or 40 MB resident; the originals are reported only (most of the bands far over: the grand's two
 * stereo layers, the harpsichord's 57 stereo notes; their sound unchanged until the owner approves).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { overBudget, presetBudget, PRESET_MB, RESIDENT_MB } from "../src/touch/budget.ts";
import { PRESETS, TRIALS, V2_PRESETS } from "../src/touch/sound.ts";

const all = [...PRESETS, ...TRIALS, ...V2_PRESETS];
const rows = all.map((p) => ({ p, b: presetBudget(p.id) }));

test("D540: every sound's decoded audio reported; every v2 (budgeted) within 25 MB and 40 MB resident", () => {
  for (const p of V2_PRESETS) assert.ok(p.budgeted, `${p.id}: held to the budget`);
  const lines = rows.map(({ b }) => `${b.id.padEnd(20)} ${b.mb.toFixed(1).padStart(6)} MB  resident ${b.residentMb.toFixed(1).padStart(6)} MB${overBudget(b) ? "  OVER" : ""}`);
  console.log(`decoded audio per preset (limits ${PRESET_MB} / ${RESIDENT_MB} MB):\n${lines.join("\n")}`);
  for (const { p, b } of rows) if (p.budgeted) assert.equal(overBudget(b), null);
});

test("D540: the budget's test fails what it should (a preset over 25 MB, or over 40 MB with the drums)", () => {
  const ok = { id: "x", name: "X", mb: 24, piece: "wtc1f01", voice: 0, ownDrumsMb: 5, drumsOnMb: 11, residentMb: 30 };
  assert.equal(overBudget(ok), null);
  assert.ok(overBudget({ ...ok, mb: 25.5 })?.includes("over 25 MB"));
  assert.ok(overBudget({ ...ok, residentMb: 41 })?.includes("over 40 MB"));
});
