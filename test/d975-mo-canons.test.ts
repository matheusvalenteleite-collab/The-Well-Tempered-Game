/**
 * D975 (canons session; batch A of the Musical Offering's canons, the board's order): Canon a 2 in unisono, per motum
 * contrarium, super Thema Regium, the Fuga canonica in Epidiapente and the Canon a 4 take the ribbon from their own
 * notes; a shape whose leader is off screen as it lifts off appears over its landing and drops (the D972 emblem rule).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { CANONS, echoPairs } from "../src/touch/canon-echo.ts";
import { ribbonShapes, isFar } from "../src/touch/canon-ribbon.ts";

test("the five canons paired from the game's notes: every leader's note with an answer at the canon's place is paired", async () => {
  await loadExtras();
  // [id, the pairs at least (the leader's notes that have a note at the answer's onset, measured)]
  for (const [id, min] of [["bwv1079-3b", 144], ["bwv1079-3c", 124], ["bwv1079-2", 104], ["bwv1079-4", 277], ["bwv1079-7", 3 * 150]] as const) {
    const f = fugueById(id), spec = CANONS[id];
    assert.ok(spec, id);
    const P = echoPairs(f);
    assert.ok(P.length >= min, `${id}: ${P.length}`);
    for (const p of P) {
      const L = spec.legs[p.leg];
      assert.equal(p.b.on, p.a.on + L.delay);
      assert.equal(p.b.step, L.contrary ? L.steps - p.a.step : p.a.step + L.steps);
    }
    // the ribbon carries every pair, each in one shape
    const n = ribbonShapes(f).reduce((s, x) => s + x.A.length, 0);
    assert.equal(n, P.length, id);
  }
});

test("a far flight: a shape whose leader is off screen at lift-off takes the emblem's path (the Fuga canonica: ten bars)", async () => {
  await loadExtras();
  const f = fugueById("bwv1079-4"), s = ribbonShapes(f)[0], B = f.barTicks;
  // the box shows about two bars behind the playhead: the leader, ten bars back, is off screen
  assert.ok(isFar(s, { now: s.start, t0: s.start - 2 * B }));
  // a one-bar canon's leader is on screen
  const u = ribbonShapes(fugueById("bwv1079-3b"))[3];
  assert.ok(!isFar(u, { now: u.start, t0: u.start - 2 * B }));
  const e = readFileSync(new URL("../src/touch/canon-ribbon.ts", import.meta.url), "utf8");
  assert.match(e, /const at = \(i: number, ph: Phase\) => \(far \? placeFar\(s, i, ph, k, top\) : place\(s, i, ph, k\)\);/);
  assert.ok(!/k\.text\(|fillText/.test(e.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")));
});
