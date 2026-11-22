/**
 * D973 (canons session; prototype, the board: "prototype first"): the answer in the exposition and a stretto's entry
 * morph only with play.html's `?fm=answer,stretto`; without it, play is D972's (transformed entries only).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { fugueMorphs } from "../src/touch/fugue-morph.ts";

test("off by default: no answer or stretto morphs without ?fm=", async () => {
  await loadExtras();
  for (const id of ["wtc1f01", "wtc1f02", "wtc1f08", "wtc2f05"]) assert.ok(fugueMorphs(fugueById(id)).every((m) => m.kind === "form"), id);
  const e = readFileSync(new URL("../src/touch/fugue-morph.ts", import.meta.url), "utf8");
  assert.match(e, /if \(PROTO\.has\("answer"\)\)/);
  assert.match(e, /if \(PROTO\.has\("stretto"\)\)/);
  // an answer's adjusted notes take their own step at the end; nothing is written in play
  assert.match(e, /const ru = m\.adj\?\.\[i\] \? ease\(\(u - 0\.6\) \/ 0\.4\) : u;/);
  assert.ok(!/k\.text\(|fillText/.test(e.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")));
});
