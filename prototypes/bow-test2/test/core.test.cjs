// node --test prototypes/bow-test2/test/core.test.cjs
const test = require("node:test");
const assert = require("node:assert");
const C = require("../bowcore.js");
const P = C.DEFAULTS;

test("speed -> gain at 2, 5, 20, 100, 800 px/s (defaults)", () => {
  const rows = [2, 5, 20, 100, 800].map((s) => [s, C.ampToDb(C.speedToGain(s, P))]);
  console.log("  speed px/s -> gain dB: " + rows.map(([s, d]) => `${s}: ${d.toFixed(1)}`).join(", "));
  assert.ok(Math.abs(rows[0][1] - P.floorDb) < 0.01, "2 px/s sits at the floor");
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i][1] > rows[i - 1][1], "monotonic");
  assert.strictEqual(rows[4][1], 0, "800 px/s is full volume");
  assert.ok(rows[1][1] - rows[0][1] > 6, "5 px/s is clearly louder than 2 px/s");
  // continuity below the floor: no step, fades to 0
  assert.ok(Math.abs(C.speedToGain(1.9999, P) - C.speedToGain(2.0001, P)) < 1e-4);
  assert.strictEqual(C.speedToGain(0, P), 0);
  // smooth curve: no jump bigger than 1.5 dB between neighbouring speeds 1% apart
  let prev = C.ampToDb(C.speedToGain(2.02, P));
  for (let s = 2.04; s < 800; s *= 1.01) { const d = C.ampToDb(C.speedToGain(s, P)); assert.ok(d - prev < 1.5, `step at ${s}`); prev = d; }
});

function simulate(speed, { hz = 60, res = 1 / 3, jitter = 0, dur = 2000, seed = 1 } = {}) {
  // digitizer: samples at hz, coordinates quantised to res px, events only when the value changes
  let r = seed; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647 - 0.5);
  const f = new C.Backlash(P.jitterPx), e = new C.SpeedEstimator({});
  let lastQ = null; const out = [];
  for (let t = 0; t <= dur; t += 1000 / hz) {
    const y = 100 + (speed * t) / 1000 + jitter * rnd();
    const q = Math.round(y / res) * res;
    if (q !== lastQ) { lastQ = q; const o = f.push(q); if (o.moved || e.s.length === 0) e.push(t, o.y); }
    out.push([t, e.estimate(t)]);
  }
  return out;
}

test("slow bow (3 px/s, 1/3 px steps) is measured, not rounded to zero", () => {
  const est = simulate(3).filter(([t]) => t > 800).map(([, v]) => v);
  const mean = est.reduce((a, b) => a + b, 0) / est.length, min = Math.min(...est);
  console.log(`  3 px/s -> estimate mean ${mean.toFixed(2)}, min ${min.toFixed(2)}`);
  assert.ok(mean > 2.2 && mean < 3.8);
  assert.ok(min > 1.5, "never drops to silence while moving");
});

test("slow bow with whole-pixel coordinates (if Safari gives integers)", () => {
  const est = simulate(3, { res: 1 }).filter(([t]) => t > 1000).map(([, v]) => v);
  const mean = est.reduce((a, b) => a + b, 0) / est.length;
  console.log(`  3 px/s, 1 px steps -> estimate mean ${mean.toFixed(2)}, min ${Math.min(...est).toFixed(2)}`);
  assert.ok(mean > 1.8 && mean < 4.5);
});

test("still thumb with ±0.25 px jitter reads as (near) zero", () => {
  const est = simulate(0, { jitter: 0.5 }).filter(([t]) => t > 300).map(([, v]) => v);
  const max = Math.max(...est);
  console.log(`  jitter only -> max estimate ${max.toFixed(2)} px/s`);
  assert.ok(max < 2, "below the 2 px/s floor");
});

test("fast bow (500 px/s) is tracked within ~50 ms", () => {
  const est = simulate(500, { hz: 120 });
  const at50 = est.find(([t]) => t >= 50)[1];
  console.log(`  500 px/s -> estimate after 50 ms ${at50.toFixed(0)}`);
  assert.ok(at50 > 400 && at50 < 600);
});

test("a stopped bow decays to silence within about half a second", () => {
  const f = new C.SpeedEstimator({});
  for (let t = 0; t <= 500; t += 16.7) f.push(t, 100 + 0.2 * t); // 200 px/s
  const v = (dt) => f.estimate(500 + dt);
  console.log(`  after stop: +50 ms ${v(50).toFixed(1)}, +200 ms ${v(200).toFixed(1)}, +500 ms ${v(500).toFixed(1)} px/s`);
  assert.ok(v(200) < 5 && v(500) < 1.5);
});

test("slide: a quick jump from row 2 to row 6 does not sound 3, 4, 5", () => {
  const s = new C.RowSelector(7, { hystPx: 7, dwellMs: 30 }), rowH = 48, played = [];
  played.push(s.down(2.5));
  // thumb travels 4 rows in 60 ms (~15 ms per row), then rests on row 6
  for (let t = 0; t <= 60; t += 4) { const r = s.move(2.5 + (4 * t) / 60, t, rowH); if (r !== null) played.push(r); }
  for (let t = 64; t <= 120; t += 8) { const r = s.move(6.5, t, rowH); if (r !== null) played.push(r); }
  console.log("  rows sounded: " + played.join(" -> "));
  assert.deepStrictEqual(played, [2, 6]);
});

test("slide: hysteresis holds a row when the thumb hovers on the edge", () => {
  const s = new C.RowSelector(7, { hystPx: 7, dwellMs: 0 }), rowH = 48;
  s.down(2.5);
  for (let t = 0; t < 200; t += 8) { const u = 3 + 0.1 * Math.sin(t / 10); assert.strictEqual(s.move(u, t, rowH), null); }
});
