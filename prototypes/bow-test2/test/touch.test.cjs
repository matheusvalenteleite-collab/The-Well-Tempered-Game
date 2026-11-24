// node --test prototypes/bow-test2/test/touch.test.cjs
const test = require("node:test");
const assert = require("node:assert");
global.window = global;
require("../touchgest.js");
const G = global.TouchGest;
const STEP = 24.2025; // the iPhone's pointer.width step (probe, 24 Nov 2026)
const lv = (k) => +(k * STEP).toFixed(3);

test("well separated classes: no errors, cuts between the groups", () => {
  const f = G.fitThresholds({ tip: [lv(1), lv(1), lv(2)], normal: [lv(3), lv(4), lv(3)], flat: [lv(6), lv(7), lv(6)] });
  assert.strictEqual(f.errors, 0);
  assert.ok(f.t1 > lv(2) && f.t1 < lv(3) && f.t2 > lv(4) && f.t2 < lv(6));
  assert.strictEqual(G.classify(f, lv(1)), "tip");
  assert.strictEqual(G.classify(f, lv(4)), "normal");
  assert.strictEqual(G.classify(f, lv(8)), "flat");
});

test("classes sharing a size level: errors counted, the best cut chosen", () => {
  const f = G.fitThresholds({ tip: [lv(2), lv(2), lv(2), lv(3)], normal: [lv(3), lv(3), lv(3), lv(4)], flat: [lv(4), lv(5), lv(5), lv(5)] });
  assert.strictEqual(f.errors, 2);
  assert.strictEqual(f.n, 12);
  assert.ok(f.overlapTipNormal > 0 && f.overlapNormalFlat > 0);
  const hist = Object.fromEntries(f.hist.map(([v, ...c]) => [Math.round(v / STEP), c]));
  assert.deepStrictEqual(hist[3], [1, 3, 0]);
});

test("decision delay: the largest size within the delay; settling time", () => {
  const seq = [[0, lv(1)], [16, lv(2)], [33, lv(3)], [50, lv(3)]];
  assert.strictEqual(G.sizeAt(seq, 0), lv(1));
  assert.strictEqual(G.sizeAt(seq, 20), lv(2));
  assert.strictEqual(G.sizeAt(seq, 100), lv(3));
  const th = { t1: lv(1.5), t2: lv(4.5) };
  assert.strictEqual(G.stableAfter(th, seq), 16); // tip at 0, normal from 16 ms on
});

test("gesture layer: onset waits for the decision delay and carries the class", () => {
  const evs = [], A = { left: { left: 0, right: 200, top: 0, bottom: 300, height: 300 }, right: { left: 400, right: 600, top: 0, bottom: 300, height: 300 } };
  const th = { t1: lv(2.5), t2: lv(5.5) };
  const g = new G.TouchGestures(() => A, () => [60, 62, 64, 65, 67], (e) => evs.push(e), () => ({ contactOn: true, decideMs: 30, cal: { left: th, right: th }, sizeRange: {} }));
  g.down(1, 1000, 100, 150, { width: lv(1) });
  assert.strictEqual(evs.length, 0, "nothing before the delay");
  g.move(1, 1016, 100, 150, { width: lv(3) });
  g.tick(1031);
  assert.strictEqual(evs[0].type, "onset");
  assert.strictEqual(evs[0].cls, "normal", "the larger size within 30 ms decides");
  g.move(1, 1100, 100, 150, { width: lv(5) });
  assert.strictEqual(evs[1].type, "contact");
  assert.ok(evs[1].norm > evs[1].norm0);
  g.up(1, 1200);
  assert.strictEqual(evs[2].type, "release");
  // a quick tap shorter than the delay still sounds
  g.down(2, 2000, 500, 150, { width: lv(7) }); g.up(2, 2010);
  assert.deepStrictEqual(evs.slice(3).map((e) => e.type + ":" + (e.cls || "")), ["onset:flat", "release:"]);
});

function tiltRig(zSign = -1, extra = {}) {
  const P = Object.assign({ leanMode: "octave", rollMode: "off", centreDeg: 45, spanDeg: 45, deadDeg: 3, octStep1: 0.5, octStep2: 1.25, octHystDeg: 4,
    breathBright: 500, leanBright: 1, bendRange: 2, vibMax: 50, rollFullDeg: 30, tiltTau: 1, invLean: false, invRoll: false }, extra);
  const evs = [], r = new G.TiltReader((e) => evs.push(e));
  let t = 0;
  // gravity for a lean L (0 flat face up, 90 upright) and a roll R; zSign = the browser's sign for "face up"
  const feed = (L, R = 0) => { const l = L * Math.PI / 180, q = R * Math.PI / 180, g = [Math.sin(l) * Math.cos(q) * 9.8, Math.sin(l) * Math.sin(q) * 9.8, zSign * Math.cos(l) * 9.8];
    for (let i = 0; i < 3; i++) r.feed((t += 50), g[0], g[1], g[2], P); return { ...evs[evs.length - 1], lean: r.lean, v: r.v }; };
  return { P, r, feed };
}

test("lean is absolute: 45° is the centre, whatever the browser's sign convention", () => {
  for (const z of [-1, 1]) {
    const { feed } = tiltRig(z);
    feed(45);
    for (const L of [45, 20, 0, -10, 90, 110]) assert.ok(Math.abs(feed(L).lean - L) < 0.01, `lean ${L} (z sign ${z})`);
    assert.ok(Math.abs(feed(60, 25).lean - 60) < 0.01, "steering-wheel roll does not change the lean");
  }
});

test("octave steps: +1 toward flat, −1 toward upright, ±2 past them, with hysteresis", () => {
  const { feed } = tiltRig();
  const oct = (L) => feed(L).octave;
  assert.strictEqual(oct(45), 0);
  assert.strictEqual(oct(30), 0);
  assert.strictEqual(oct(20), 1, "past 22.5° (+hysteresis) → +1");
  assert.strictEqual(oct(24), 1, "hysteresis holds +1 just above 22.5°");
  assert.strictEqual(oct(27), 0, "back toward 45° → 0");
  assert.strictEqual(oct(0), 1, "flat is still +1");
  assert.strictEqual(oct(-15), 2, "past flat by ~13° → +2");
  assert.strictEqual(oct(70), -1);
  assert.strictEqual(oct(98), -1, "a little past upright is still −1");
  assert.strictEqual(oct(105), -2, "past upright by ~13° → −2");
  assert.strictEqual(oct(45), 0, "straight back to the centre");
  assert.strictEqual(oct(-20), 2, "a fast tip from 45° to −20° lands on +2");
});

test("breath: brighter toward flat within a step; brightness mode spreads over 45° each way", () => {
  const { feed } = tiltRig();
  assert.ok(feed(35).bright > 0 && feed(55).bright < 0);
  const b = tiltRig(-1, { leanMode: "brightness" });
  b.feed(45);
  assert.ok(Math.abs(b.feed(45).bright) < 1e-6);
  assert.ok(Math.abs(b.feed(46).bright) < 1e-6, "inside the 3° dead zone");
  assert.ok(Math.abs(b.feed(0).bright - 1200) < 1, "flat = full (+1 octave)");
  assert.ok(Math.abs(b.feed(90).bright + 1200) < 1, "upright = full the other way");
  const half = b.feed(22.5).bright; assert.ok(half > 500 && half < 700, "halfway = about half: " + half.toFixed(0));
  assert.ok(Math.abs(b.feed(-20).bright - 1440) < 1, "a little room past flat, capped at 1.2×");
});
