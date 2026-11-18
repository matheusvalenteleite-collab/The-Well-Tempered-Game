/**
 * D678 (design studio; the owner's pilot, THE ECHO LANE, Goldberg Variations 3 and 12): the canons tagged from the score
 * (dux, comes, delay, interval or contrary motion) and their notes paired, each leader's note with its answer.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { CANONS, echoPairs } from "../src/touch/canon-echo.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("Variation 3: the alto answers the soprano one bar later at the unison, note for note", async () => {
  await loadExtras();
  const f = fugueById("bwv988-03");
  const spec = CANONS["bwv988-03"];
  assert.equal(spec.delay, f.barTicks);
  const pairs = echoPairs(f);
  const dux = f.voices[0].filter((n) => n[0] + spec.delay < f.length).length;
  // The canon breaks at each half's cadence (the leader's last bars there unanswered): 129 of 152 notes paired.
  assert.ok(pairs.length / dux > 0.8, `${pairs.length}/${dux}`);
  for (const { a, b } of pairs) assert.ok(b.on === a.on + spec.delay && b.midi === a.midi);
});

test("Variation 12: the comes answers one bar later a fourth below, in contrary motion (the pitches mirrored)", async () => {
  await loadExtras();
  const f = fugueById("bwv988-12");
  const spec = CANONS["bwv988-12"];
  assert.equal(spec.delay, f.barTicks);
  assert.ok(spec.contrary);
  const pairs = echoPairs(f);
  assert.ok(pairs.length >= 100, String(pairs.length));
  // The opening: the soprano's G (67) answered by the D a fourth below (62); its rising step by a falling one.
  assert.equal(pairs[0].a.midi + pairs[0].b.midi, 129);
  for (let i = 1; i < 6; i++) assert.equal(Math.sign(pairs[i].a.midi - pairs[i - 1].a.midi), -Math.sign(pairs[i].b.midi - pairs[i - 1].b.midi) || 0);
});

test("the box draws the echo lane under the notes for a tagged canon only; drawing only", () => {
  const s = src("src/touch/MusicBox.tsx");
  assert.match(s, /if \(fr\.piece && CANONS\[fr\.piece\] && !fr\.floor\) paintEcho\(/);
  const e = src("src/touch/canon-echo.ts");
  assert.match(e, /if \(spec\.contrary\) g\.rotate\(Math\.PI \* t\);/);
  assert.ok(!/score|grade|"hit"|"miss"/.test(e.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")));
});
