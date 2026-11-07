/**
 * The design studio (D474): each fugue's form from its own data (form-points.ts), the one source for the stage's
 * scenes and the sound's sections (Instruments' D513/D514). Pure and stable: the kinds and the climax ramp are a contract.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import { formOf, phaseAt } from "../src/touch/form-points.ts";

const FUGUES = Array.from({ length: 2 }, (_, b) => Array.from({ length: 24 }, (_, i) => `wtc${b + 1}f${String(i + 1).padStart(2, "0")}`)).flat();

test("D474: every fugue has a form: seams in order covering the piece, 2 to 4 acts, a climax before the end, the last chord", () => {
  for (const id of FUGUES) {
    const f = fugueById(id);
    const F = formOf(f);
    assert.ok(F.acts >= 2 && F.acts <= 4, `${id}: ${F.acts} acts`);
    assert.equal(F.seams[0].kind, "exposition");
    assert.equal(F.seams[0].on, 0);
    for (let i = 1; i < F.seams.length; i++) assert.ok(F.seams[i].on >= F.seams[i - 1].on && F.seams[i].on >= F.seams[i - 1].end - 1, `${id}: seam ${i} out of order`);
    assert.ok(F.seams.some((s) => s.kind === "final"), `${id}: no final group`);
    const c = F.climax;
    assert.ok(c.rise <= c.peak && c.peak <= c.arrival && c.arrival <= F.end, `${id}: climax ${c.rise} ${c.peak} ${c.arrival} ${F.end}`);
    assert.ok(F.last > c.peak - f.barTicks && F.last < F.end, `${id}: last chord ${F.last}`);
    assert.equal(F.actOn.length, F.acts);
  }
});

test("D474: the phase and the ramp: subject in entries, episode between, the climax rising to 1 and held", () => {
  const f = fugueById("wtc1f12");
  const F = formOf(f);
  const bar = (b: number) => (b - 1) * f.barTicks;
  assert.equal(phaseAt(F, bar(2)).phase, "subject");
  assert.equal(phaseAt(F, bar(18)).phase, "episode");
  assert.equal(phaseAt(F, bar(20)).kind, "middle");
  assert.equal(phaseAt(F, bar(54)).kind, "final");
  assert.equal(phaseAt(F, bar(50)).climax, 0);
  assert.equal(phaseAt(F, bar(54)).climax, 1);
  assert.ok(phaseAt(F, bar(52.3)).climax > 0 && phaseAt(F, bar(52.3)).climax < 1);
  assert.equal(phaseAt(F, bar(58.5)).phase, "coda");
  assert.ok(phaseAt(F, bar(58.9)).resolved > 0);
  // Pure: the same object for the same piece.
  assert.equal(formOf(f), F);
});
