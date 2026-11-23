/**
 * D976 (canons session; batch B of the Musical Offering's canons): per augmentationem contrario motu (the follower's
 * onset the leader's doubled), Quaerendo invenietis and the Canon perpetuus contrario motu (exact chromatic inversion,
 * by MIDI; the mirror moving in the round's second part), per tonos (by MIDI, rising a tone each round).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { CANONS, echoPairs } from "../src/touch/canon-echo.ts";
import { ribbonShapes } from "../src/touch/canon-ribbon.ts";

test("each pair answers by its leg's rule; every pair carried in one shape", async () => {
  await loadExtras();
  for (const [id, min] of [["bwv1079-3d", 160], ["bwv1079-6", 160], ["bwv1079-3e", 400], ["bwv1079-9", 300]] as const) {
    const f = fugueById(id), spec = CANONS[id], P = echoPairs(f);
    assert.ok(P.length >= min, `${id}: ${P.length}`);
    for (const p of P) {
      const L = spec.legs[p.leg];
      assert.equal(p.b.on, Math.round(p.a.on * (L.scale ?? 1)) + L.delay, id);
      const a = L.chroma ? p.a.midi : p.a.step, b = L.chroma ? p.b.midi : p.b.step;
      assert.equal(L.contrary ? a + b : b - a, L.steps, id);
    }
    assert.equal(ribbonShapes(f).reduce((s, x) => s + x.A.length, 0), P.length, id);
  }
});

test("the augmentation: the follower's notes twice the leader's length; the mirror of no. 9 moves twice", async () => {
  await loadExtras();
  const P = echoPairs(fugueById("bwv1079-3d"));
  assert.ok(P.filter((p) => p.b.dur === 2 * p.a.dur).length >= 0.9 * P.length);
  assert.deepEqual(CANONS["bwv1079-9"].legs.map((l) => l.steps), [151, 141, 151, 141, 151]);
});
