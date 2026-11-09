/**
 * D540, the memory budget (BRIEF-BANDS2: "≤25 MB of decoded audio per preset, ≤40 MB resident in total"; budget.ts): every
 * sound's decoded MB reported (its worst fugue and voice, as a phone holds it). D560 (the v2s and the slim keyboards
 * promoted): EVERY offered sound (and the unoffered trials presetById still finds) fails above 25 MB or 40 MB resident.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { overBudget, presetBudget, PRESET_MB, RESIDENT_MB, wireBudget } from "../src/touch/budget.ts";
import { PRESETS, TRIALS } from "../src/touch/sound.ts";

const all = [...PRESETS, ...TRIALS];
const rows = all.map((p) => ({ p, b: presetBudget(p.id) }));

test("D560: every sound's decoded audio reported; every one within 25 MB and 40 MB resident", () => {
  const lines = rows.map(({ b }) => `${b.id.padEnd(20)} ${b.mb.toFixed(1).padStart(6)} MB  resident ${b.residentMb.toFixed(1).padStart(6)} MB${overBudget(b) ? "  OVER" : ""}`);
  console.log(`decoded audio per preset (limits ${PRESET_MB} / ${RESIDENT_MB} MB):\n${lines.join("\n")}`);
  for (const { b } of rows) assert.equal(overBudget(b), null);
});

test("D540: the budget's test fails what it should (a preset over 25 MB, or over 40 MB with the drums)", () => {
  const ok = { id: "x", name: "X", mb: 24, piece: "wtc1f01", voice: 0, ownDrumsMb: 5, drumsOnMb: 11, residentMb: 30 };
  assert.equal(overBudget(ok), null);
  assert.ok(overBudget({ ...ok, mb: 25.5 })?.includes("over 25 MB"));
  assert.ok(overBudget({ ...ok, residentMb: 41 })?.includes("over 40 MB"));
});

test("D542: every sound's size on the wire and its time to the first notes with real samples reported (AAC, Safari's: the larger of the two copies)", () => {
  const lines = rows
    .filter(({ b }) => b.mb > 0)
    .map(({ p }) => {
      const w = wireBudget(p.id);
      assert.ok(w.firstFiles <= w.files && w.firstMb.m4a <= w.mb.m4a + 1e-9);
      assert.ok(w.mb.webm < w.mb.mp3 && w.mb.m4a < w.mb.mp3, `${p.id}: the copies smaller than the MP3s`);
      return `${p.id.padEnd(20)} ${w.mb.mp3.toFixed(2).padStart(6)} MB mp3 → ${w.mb.m4a.toFixed(2).padStart(5)} m4a / ${w.mb.webm.toFixed(2).padStart(5)} webm, ${String(w.files).padStart(3)} files; opening ${String(w.firstFiles).padStart(3)} files ${w.firstMb.m4a.toFixed(2)} MB: first notes ~${w.firstS.slow4g.toFixed(1)} s slow 4G, ${w.firstS.mid4g.toFixed(1)} s mid 4G; all ~${w.allS.slow4g.toFixed(1)} / ${w.allS.mid4g.toFixed(1)} s`;
    });
  console.log(`on the wire (the worst fugue; the model of budget.ts LINES):\n${lines.join("\n")}`);
});
