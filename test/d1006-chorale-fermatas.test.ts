/**
 * D1006 (design studio; the owner: "Fermata: b."): in the chorales only the final fermata and the Stollen's close are held
 * (a beat, the band waiting); every other plays in time with a short breath. The rule general, no chorale by chorale.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { heldFermatas } from "../tools/touch/chorales.ts";

const DATA = JSON.parse(readFileSync(new URL("../data/touch/chorales.json", import.meta.url), "utf8")) as { id: string; length: number; barTicks: number; fermatas: number[] }[];

test("the rule: the last fermata always; the Stollen's close where the first section is repeated, within a bar before the next", () => {
  const T = (q: number) => q * 4 * 1920; // a whole note: four quarters at the importer's TPQ (1920)
  const c = { expansion: { full: ["A", "A", "B"] }, sections: [{ label: "A", offset: "0/1" }, { label: "B", offset: "2/1" }] };
  assert.deepEqual(heldFermatas(c, [T(1), T(2), T(3), T(4)], T(1)), [T(2), T(4)]);
  assert.deepEqual(heldFermatas({ expansion: { full: ["A", "B"] }, sections: c.sections }, [T(1), T(2), T(4)], T(1)), [T(4)]);
  assert.deepEqual(heldFermatas({}, [T(3), T(5)], T(1)), [T(5)]);
  // No fermata within a bar of the boundary: none held there.
  assert.deepEqual(heldFermatas(c, [T(0.5), T(4)], T(1)), [T(4)]);
  // After a pickup, with first and second endings (nos. 253, 272, 333: I A A1 A A2 B): the close before the repeat.
  const volta = { expansion: { full: ["I", "A", "A1", "A", "A2", "B"] }, sections: [{ label: "I", offset: "0/1" }, { label: "A", offset: "1/4" }, { label: "A1", offset: "4/1" }, { label: "A2", offset: "9/2" }, { label: "B", offset: "5/1" }] };
  assert.deepEqual(heldFermatas(volta, [T(2), T(4), T(8)], T(1)), [T(4), T(8)]);
  // A later section repeated (no. 222: A B B; no. 205: A B B C C …): not the Stollen, the final alone.
  assert.deepEqual(heldFermatas({ expansion: { full: ["A", "B", "B"] }, sections: [{ label: "A", offset: "0/1" }, { label: "B", offset: "4/1" }] }, [T(2), T(4), T(6)], T(1)), [T(6)]);
});

test("all 370: one or two held each (the final, and 183 Stollen closes), the last at the end", () => {
  assert.equal(DATA.length, 370);
  for (const f of DATA) {
    assert.ok(f.fermatas.length >= 1 && f.fermatas.length <= 2, `${f.id}: ${f.fermatas.length}`);
    assert.ok(f.length - f.fermatas.at(-1)! <= f.barTicks, `${f.id}: the last held fermata at the end`);
  }
  assert.equal(DATA.filter((f) => f.fermatas.length === 2).length, 183);
  assert.equal(DATA.reduce((t, f) => t + f.fermatas.length, 0), 553);
});
