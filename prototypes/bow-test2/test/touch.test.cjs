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
  const P = Object.assign({ leanMode: "octave", rollMode: "off", centreDeg: 45, spanDeg: 45, deadDeg: 3, up1Deg: 22.5, up2Deg: -11.25, down1Deg: 67.5, down2Deg: 101.25, octHystDeg: 4,
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

/* Gyro fusion: a simulated phone. The gyroscope reports with an unknown convention (here: minus sign,
   degrees per second); the accelerometer adds hand jolts. */
function simulatePhone({ source, tiltTau = 120, conv = [-1, 180 / Math.PI], jolt = 1.5, path, dur, seed = 7 }) {
  const P = { leanMode: "octave", rollMode: "off", centreDeg: 45, spanDeg: 45, deadDeg: 3, up1Deg: 22.5, up2Deg: -11.25, down1Deg: 67.5, down2Deg: 101.25, octHystDeg: 4,
    breathBright: 500, leanBright: 1, bendRange: 2, vibMax: 50, rollFullDeg: 30, tiltTau, invLean: false, invRoll: false, tiltSource: source, gyroCorrS: 0.8 };
  let r = seed; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647 - 0.5);
  const evs = [], tr = new G.TiltReader((e) => evs.push(e));
  const dt = 1000 / 60, out = [];
  let jx = 0, jz = 0;
  for (let t = 0; t <= dur; t += dt) {
    const L = path(t), L2 = path(t + 1), w = ((L2 - L) * Math.PI / 180) * 1000; // rad/s about the device's y axis
    const l = L * Math.PI / 180;
    jx += (rnd() * 2 * jolt - jx) * 0.3; jz += (rnd() * 2 * jolt - jz) * 0.3; // band-limited hand jolts, m/s²
    const g = [Math.sin(l) * 9.8 + jx, 0, -Math.cos(l) * 9.8 + jz];
    tr.feed(t, g[0], g[1], g[2], P, { alpha: 0, beta: 0, gamma: conv[0] * conv[1] * w });
    out.push({ t, L, lean: tr.lean, oct: tr.octave });
  }
  return { out, tr };
}
const flipTime = (out, oct) => (out.find((o) => o.oct === oct) || {}).t;

test("gyro fusion: octave changes about as soon as the phone gets there; gravity-only lags by its smoothing", () => {
  // wiggle ±10° for 2 s (lets the tracker learn the gyro's convention), then tip from 45° to 0° at 150°/s
  const path = (t) => (t < 2000 ? 45 + 10 * Math.sin(t / 150) : t < 2500 ? 45 : Math.max(0, 45 - (t - 2500) * 0.15));
  const trueT = 2500 + (45 - 20.5) / 0.15; // the octave step (+1) needs lean ≤ 20.5° (22.5° less half the hysteresis)
  const f = simulatePhone({ source: "fused", path, dur: 3200 }), g = simulatePhone({ source: "gravity", path, dur: 3200 });
  const lagF = flipTime(f.out.filter((o) => o.t > 2500), 1) - trueT, lagG = flipTime(g.out.filter((o) => o.t > 2500), 1) - trueT;
  console.log(`  octave step after the phone reaches it: fused ${lagF.toFixed(0)} ms (${f.tr.gyroLabel()}), gravity-only (120 ms smoothing) ${lagG.toFixed(0)} ms`);
  assert.strictEqual(f.tr.gyroLabel(), "gyro (sign −, deg/s)", "found the gyroscope's convention");
  assert.ok(lagF < 30, "fused: within about two sensor readings");
  assert.ok(lagG > 80, "gravity-only lags");
});

test("gyro fusion: hand jolts near a break do not flicker the octave", () => {
  const path = (t) => (t < 2000 ? 45 + 10 * Math.sin(t / 150) : 23); // then rest just above the 22.5° break
  const count = (o) => o.out.filter((x) => x.t > 2600).reduce((n, x, i, a) => n + (i && x.oct !== a[i - 1].oct ? 1 : 0), 0);
  const f = simulatePhone({ source: "fused", path, dur: 8000, jolt: 2 }), g = simulatePhone({ source: "gravity", tiltTau: 15, path, dur: 8000, jolt: 2 });
  console.log(`  octave changes in 5.4 s of resting 0.5° from the break with jolts: fused ${count(f)}, gravity-only with 15 ms smoothing ${count(g)}`);
  assert.strictEqual(count(f), 0);
});

require("../practice.js");
const PR = global.Practice;
test("practice: balanced prompts, tallies, rhythm judging", () => {
  const deck = PR.makeDeck(30, ["left", "right"], PR.rand(3));
  const count = (f) => deck.filter(f).length;
  assert.strictEqual(deck.length, 30);
  for (const k of PR.KINDS) assert.strictEqual(count((d) => d.kind === k), 10);
  assert.strictEqual(count((d) => d.side === "left"), 15);
  const t = PR.tally([{ side: "left", kind: "tip", got: "tip" }, { side: "left", kind: "normal", got: "tip" }, { side: "right", kind: "flat", got: null }]);
  assert.strictEqual(t.ok, 1); assert.strictEqual(t.confusion.normal.tip, 1); assert.strictEqual(t.confusion.flat.none, 1);
  const beats = [0, 0.5, 1, 1.5].map((t, i) => ({ t: 10 + t, side: "left", kind: ["tip", "flat", "tip", "normal"][i] }));
  const onsets = [{ t: 9.98, side: "left", kind: "tip" }, { t: 10.56, side: "left", kind: "flat" }, { t: 10.6, side: "left", kind: "flat" }, { t: 11.0, side: "right", kind: "tip" }, { t: 11.45, side: "left", kind: "tip" }];
  const r = PR.rhythmScore(beats, onsets);
  assert.deepStrictEqual(r.res.map((x) => x.got), ["tip", "flat", null, "tip"], "nearest onset on the beat's side; the right-hand tap does not count for a left beat");
  assert.strictEqual(r.missed, 1); assert.strictEqual(r.extra, 2);
  assert.ok(Math.abs(r.meanAbsMs - (20 + 60 + 50) / 3) < 1e-6);
  assert.strictEqual(r.tally.ok, 2);
});
