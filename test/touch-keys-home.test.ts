// D243: the colours come home: every piece's last key is its own (or, after a Picardy third, its major).
import { test } from "node:test";
import assert from "node:assert/strict";
import { PIECES, barAt, keyAt } from "../src/touch/fugue.ts";

test("every piece of the two books ends coloured in its own key", () => {
  for (const p of PIECES.filter((x) => x.book)) {
    const last = p.keys.at(-1)?.key ?? p.key;
    assert.equal(last.toLowerCase(), p.key.toLowerCase(), p.id);
    if (last !== p.key) assert.ok(p.key === p.key.toLowerCase(), `${p.id}: only a minor piece ends in its major`);
  }
});

test("Prelude 1 is home in C from its dominant pedal (b. 24), not in F", () => {
  const p = PIECES.find((x) => x.id === "wtc1p01")!;
  const home = p.keys.at(-1)!;
  assert.equal(home.key, "C");
  assert.equal(barAt(p, home.on), 24);
  assert.equal(keyAt(p, p.length - 1), "C");
});
