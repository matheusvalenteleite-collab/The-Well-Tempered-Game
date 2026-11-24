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

test("tilt: neutral, dead zone, full range, bend and vibrato", () => {
  const P = { tiltMode: "bend", bendRange: 2, vibMax: 50, fullDeg: 30, deadDeg: 3, tiltTau: 1, pitchBright: 1, invRoll: false, invPitch: false };
  const evs = []; const r = new G.TiltReader((e) => evs.push(e));
  const grav = (rollDeg, leanDeg) => { const a = (82 + rollDeg) * Math.PI / 180, l = (-24 + leanDeg) * Math.PI / 180; return [Math.sin(a) * Math.cos(l) * 9.8, Math.cos(a) * Math.cos(l) * 9.8, Math.sin(l) * 9.8]; };
  let t = 0;
  const feed = (roll, lean) => { const g = grav(roll, lean); r.feed((t += 20), g[0], g[1], g[2], P); return evs[evs.length - 1]; };
  assert.ok(Math.abs(feed(0, 0).bend) < 1e-9, "first reading becomes neutral");
  assert.ok(Math.abs(feed(2, 0).bend) < 1e-9, "inside the dead zone");
  assert.ok(Math.abs(feed(30, 0).bend - 2) < 1e-3, "full roll = full bend");
  assert.ok(Math.abs(feed(-16.5, 0).bend + 1) < 1e-3, "halfway (past the dead zone) = −1 semitone");
  assert.ok(Math.abs(feed(0, 30).bright - 1200) < 1e-3, "full pitch tilt = +1 octave of brightness");
  P.tiltMode = "vibrato";
  const v = feed(30, 0); assert.ok(v.bend === 0 && Math.abs(v.vib - 50) < 1e-3);
  P.invRoll = true; P.tiltMode = "bend"; assert.ok(feed(30, 0).bend < 0, "invert roll");
});
