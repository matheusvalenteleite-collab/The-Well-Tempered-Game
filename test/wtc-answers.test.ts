import { test } from "node:test";
import assert from "node:assert/strict";
import { FUGUES, events, mutated, options } from "../src/wtc/answers.ts";

test("answers: every fugue offers Bach's answer once, among two or three distinct options", () => {
  assert.ok(FUGUES.length >= 20);
  for (const f of FUGUES) {
    const o = options(f);
    assert.ok(o.length >= 1 && o.length <= 3);
    assert.equal(o.filter((x) => x.is.includes("bach")).length, 1, f.id);
    assert.equal(new Set(o.map((x) => x.notes.join(" "))).size, o.length);
    assert.equal(f.bach.length, f.subject.length);
  }
});

test("answers: 1/1 is answered real, 1/2 (C minor) tonally with G answered by C", () => {
  const f1 = FUGUES.find((f) => f.id === "wtc1f01")!;
  assert.equal(f1.kind, "real");
  assert.deepEqual(mutated(f1, f1.bach), []);
  const f2 = FUGUES.find((f) => f.id === "wtc1f02")!;
  assert.notEqual(f2.kind, "real");
  assert.equal(f2.subject[3], "G4");
  assert.equal(f2.bach[3], "C5");
  assert.ok(mutated(f2, f2.bach).includes(3));
});

test("answers: playback is the subject, then the answer", () => {
  const f = FUGUES[0];
  const ev = events(f, f.bach);
  assert.equal(ev.length, f.subject.length * 2);
  assert.ok(ev.every((e, i) => i === 0 || e.at >= ev[i - 1].at));
});
