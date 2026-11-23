/**
 * D977 (canons session; prototype only): the crab canon (bwv1079-3a) has a ribbon only with ?fm=crab / crabmid; without
 * the flag nothing changes in play. Its data: the second line is the first backwards at the unison, about the middle.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { CANONS } from "../src/touch/canon-echo.ts";

test("off by default; the data a true crab canon (every note's end and its answer's start sum to the length)", async () => {
  await loadExtras();
  assert.ok(!CANONS["bwv1079-3a"]);
  const f = fugueById("bwv1079-3a"), [A, B] = f.voices;
  for (const a of A) assert.ok(B.some((b) => b[0] + b[1] + a[0] === f.length && b[2] === a[2] && b[1] === a[1]));
  const e = readFileSync(new URL("../src/touch/canon-ribbon.ts", import.meta.url), "utf8");
  assert.ok(!/k\.text\(|fillText/.test(e.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")));
});
