/**
 * D335: FREE PLAY's DYNAMICS on the sampled piano (src/bench/lab/dynamics.ts): the three designs'
 * levels (A place × strike, B pedal + strike, C strike only) within 16 dB, the strike's strength by the
 * zone's calibration (log scale), the pedal's average, the late correction's ramp (chip.ts rampTrim),
 * the zone report and storage, and FREE PLAY striking at the touchdown's level then correcting.
 */
import { BAR } from "../src/bench/protos.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { baseDb, correctionRamp, dynLevel, dynLine, DYN_MAX_DB, loadZoneCal, logStrength, Pedal, pianoOnset, saveZoneCal, strikeDb, strikeWord, zoneCalibration, zoneOf, zoneReport, zoneStrength, type ZoneTap } from "../src/bench/lab/dynamics.ts";
import { landing, PIANO_SOFT_NET_DB } from "../src/touch/touch-expr.ts";
import { rampTrim, type Chip, type TrimParam } from "../src/touch/chip.ts";
import { FreePlay } from "../src/bench/lab/free.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { setPreset } from "../src/touch/sound.ts";
import { MECH, MECH_DEFAULTS, resetMech } from "../src/bench/mechanics.ts";

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("D335: the defaults: off, no wait, a 12 ms ramp, a 1 s pedal", () => {
  assert.deepEqual([MECH_DEFAULTS.dynWait, MECH_DEFAULTS.dynRampMs, MECH_DEFAULTS.dynPedalMs, MECH_DEFAULTS.dynWaitMs], [false, 12, 1000, 35]);
});

test("D335: the levels: A ±4 place and ±4 strike, B ±6 pedal and ±4 accent, C ±8; never beyond ±8 dB (16 dB)", () => {
  near(baseDb("place", 1), 4);
  near(baseDb("place", 0), -4);
  near(baseDb("pedal", 1), 6);
  near(baseDb("pedal", 0.25), -3);
  near(baseDb("strike", 1), 0);
  near(strikeDb("place", 1), 4);
  near(strikeDb("pedal", 0.25), -2);
  near(strikeDb("strike", 0, "even"), -8); // D335's even curve (D336 made "firm" the default: test/d336-passage-dynamics.test.ts)
  near(strikeDb("place", null), 0, 1e-9);
  near(strikeDb("off", 1), 0);
  const b = dynLevel("pedal", 1, 1);
  assert.equal(b.total, DYN_MAX_DB);
  assert.ok(b.clipped);
  const a = dynLevel("place", 0.75, 0.25);
  near(a.base, 2);
  near(a.strike, -2);
  near(a.total, 0);
  assert.ok(!a.clipped);
  for (const m of ["place", "pedal", "strike"] as const) for (let c = 0; c <= 1; c += 0.1) for (let s = 0; s <= 1; s += 0.1) assert.ok(Math.abs(dynLevel(m, c, s).total) <= DYN_MAX_DB + 1e-9);
});

test("D335: the strike's strength on a log scale: soft median 0.25, hard 0.75, their geometric mean 0.5, clamped", () => {
  const cal = { soft: 0.25, hard: 1 };
  near(logStrength(0.25, cal), 0.25);
  near(logStrength(1, cal), 0.75);
  near(logStrength(0.5, cal), 0.5);
  near(logStrength(0.125, cal), 0);
  near(logStrength(2, cal), 1);
  assert.equal(logStrength(0.01, cal), 0);
  assert.equal(logStrength(9, cal), 1);
  assert.deepEqual(["soft", "light", "medium", "firm", "hard"], [0.1, 0.3, 0.5, 0.7, 0.9].map(strikeWord));
});

test("D335, D385: the piano's onset: the layer by the landing's zone, the level beyond it made up; the loudness the one asked", () => {
  for (const db of [-8, -6, -4, -3, -1, 0, 2, 4, 6, 8]) {
    const o = pianoOnset(db);
    const l = landing("piano", o.touch, 60, null);
    const got = 20 * Math.log10(l.level!) + (l.layer === "soft" ? PIANO_SOFT_NET_DB : 0) + 20 * Math.log10(o.level);
    near(got, db, 1e-9);
  }
  assert.deepEqual(pianoOnset(0), { touch: 0.5, level: 1 });
  assert.ok(pianoOnset(6).touch >= 2 / 3, "the strong zone");
  near(pianoOnset(6).level, 10 ** (3 / 20));
});

test("D335: the pedal: the landings over the window averaged, the old ones dropped, the middle with none", () => {
  const p = new Pedal(1000);
  assert.equal(p.value(0), 0.5);
  near(p.add(0, 1), 1);
  near(p.add(400, 0), 0.5);
  near(p.add(800, 0.5), 0.5);
  near(p.add(1200, 0.5), (0 + 0.5 + 0.5) / 3, 1e-9);
  near(p.add(3000, 0.2), 0.2);
  assert.equal(p.count, 1);
  p.windowMs = 5000;
  near(p.add(3100, 0.4), 0.3);
});

test("D335: the late correction: a ramp from the strike's reading, never before the onset; scheduled on the gain without a step", () => {
  assert.deepEqual(correctionRamp(1.0, 1.05, 12), { at: 1.05, until: 1.05 });
  const r = correctionRamp(1.03, 1.0, 12);
  near(r.at, 1.03);
  near(r.until, 1.042);
  const calls: string[] = [];
  const fake = (hold: boolean): TrimParam => ({
    value: 1,
    setValueAtTime: (v, t) => calls.push(`set ${v.toFixed(3)} @${t.toFixed(3)}`),
    linearRampToValueAtTime: (v, t) => calls.push(`ramp ${v.toFixed(3)} @${t.toFixed(3)}`),
    cancelScheduledValues: (t) => calls.push(`cancel @${t.toFixed(3)}`),
    ...(hold ? { cancelAndHoldAtTime: (t: number) => calls.push(`hold @${t.toFixed(3)}`) } : {}),
  });
  rampTrim(fake(true), 1, 0.8, r.at, r.until);
  assert.deepEqual(calls, ["hold @1.030", "set 1.000 @1.030", "ramp 0.800 @1.042"]);
  calls.length = 0;
  rampTrim(fake(false), 0.8, 1.2, 2, 2);
  assert.deepEqual(calls, ["cancel @2.000", "set 0.800 @2.000", "set 1.200 @2.000"]);
});

const taps = (zone: "inner" | "outer", soft: number[], hard: number[], rot = 50): (ZoneTap & { rotPeak: number })[] => [...soft.map((peak) => ({ label: "soft", peak, zone, rotPeak: rot })), ...hard.map((peak) => ({ label: "hard", peak, zone, rotPeak: rot * 2 }))];

test("D335: calibration by zone: each half its own soft and hard medians; a zone without one uses both, then the fallback", () => {
  const all = [...taps("inner", [0.3, 0.35, 0.4], [1.2, 1.3, 1.4]), ...taps("outer", [0.15, 0.2, 0.25], [0.6, 0.7, 0.8])];
  const zc = zoneCalibration(all);
  assert.deepEqual([zc.inner!.soft, zc.inner!.hard, zc.outer!.soft, zc.outer!.hard], [0.35, 1.3, 0.2, 0.7]);
  near(zoneStrength(0.35, "inner", zc)!.strength, 0.25);
  near(zoneStrength(0.7, "outer", zc)!.strength, 0.75);
  assert.equal(zoneStrength(0.7, "outer", zc)!.cal, "outer zone's calibration");
  assert.ok(zoneStrength(0.6, "inner", zc)!.strength < zoneStrength(0.6, "outer", zc)!.strength, "the same peak softer by the box, where taps shake more");
  const onlyInner = zoneCalibration(taps("inner", [0.3, 0.35, 0.4], [1.2, 1.3, 1.4]));
  assert.equal(onlyInner.outer, null);
  assert.equal(zoneStrength(0.35, "outer", onlyInner)!.cal, "both zones' calibration");
  assert.equal(zoneStrength(0.5, "outer", null, { soft: 0.25, hard: 1, from: "recent" })!.cal, "the recent taps");
  assert.equal(zoneStrength(0.5, "outer", null), null);
  assert.equal(zoneStrength(null, "inner", zc), null);
  assert.equal(zoneOf(0.2), "inner");
  assert.equal(zoneOf(0.7), "outer");
});

test("D335: the zone report: outer ÷ inner medians, a verdict; too few without both", () => {
  const r = zoneReport([...taps("inner", [0.3, 0.35, 0.4], [1.2, 1.3, 1.4], 40), ...taps("outer", [0.15, 0.2, 0.25], [0.6, 0.7, 0.8], 90)]);
  near(r.ratioSoft, 0.2 / 0.35);
  near(r.ratioHard, 0.7 / 1.3);
  assert.equal(r.verdict, "differ");
  assert.equal(r.inner.rot.median, 60);
  assert.equal(r.outer.sep!.auc, 1);
  assert.equal(zoneReport(taps("inner", [0.3, 0.35, 0.4], [1, 1, 1])).verdict, "too few");
  assert.equal(zoneReport([...taps("inner", [0.3, 0.3, 0.3], [1, 1, 1]), ...taps("outer", [0.32, 0.32, 0.32], [1.1, 1.1, 1.1])]).verdict, "alike");
});

test("D335: the zone calibration kept in localStorage; storage blocked: nothing, no throw", () => {
  const g = globalThis as { localStorage?: unknown };
  const before = g.localStorage;
  const m = new Map<string, string>();
  g.localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
  const zc = { inner: { soft: 0.3, hard: 1.2, from: "session" as const }, outer: null, all: null };
  assert.equal(saveZoneCal(zc), true);
  assert.deepEqual(loadZoneCal(), zc);
  m.set("wtc.lab.zoneCal", '{"inner":{"soft":2,"hard":1}}');
  assert.deepEqual(loadZoneCal(), { inner: null, outer: null, all: null }, "a reversed calibration refused");
  saveZoneCal(null);
  assert.equal(loadZoneCal(), null);
  g.localStorage = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  assert.equal(loadZoneCal(), null);
  assert.equal(saveZoneCal(zc), false);
  g.localStorage = before;
});

test("D335: the note's line names each part of its level", () => {
  const st = logStrength(1.1, { soft: 0.25, hard: 1 });
  const l = dynLevel("pedal", 0.25, st, "even");
  const s = dynLine("C5", "pedal", l, { strength: st, peak: 1.1, ms: 31 });
  assert.equal(s, "♩ C5 · pedal −3.0 dB · strike +2.3 dB (firm, peak 1.10, 31 ms) · total −0.7 dB");
  assert.match(dynLine("D4", "strike", dynLevel("strike", 0.5, null), { strength: null, peak: null, ms: 20 }), /fixed level · strike — \(no motion samples: neutral\)/);
});

// ---- In FREE PLAY ----

type Rec = { midi: number; p: { touch?: number; level?: number }; trims: [number, number, number][] };
function fakeFree(clock: { t: number }) {
  const notes: Rec[] = [];
  const chip = {
    ctx: {
      get currentTime() {
        return clock.t;
      },
    },
    note: (midi: number, _at: number, _d: number, _v: unknown, p: Rec["p"]) => {
      const r: Rec = { midi, p, trims: [] };
      notes.push(r);
      return { stop: () => {}, bend: () => {}, dyn: () => {}, trim: (l: number, at: number, until: number) => void r.trims.push([l, at, until]) };
    },
    tick: () => {},
  } as unknown as Chip;
  return { chip, notes };
}
const I2 = fugueById("wtc1f02");
const W = 750;
const H = 342;
/** D461: the left bar's inner edge (BAR of the width: 150 px at 20%, 165 at 22%), one px inside. */
const INNER = Math.round(BAR * W) - 1;

test("D335: FREE PLAY, A · PLACE × STRIKE: struck at once at the place's level, then corrected by the strike over the ramp", () => {
  resetMech();
  setPreset("pianoSampled");
  const clock = { t: 10 };
  const { chip, notes } = fakeFree(clock);
  const out: string[] = [];
  let pending: ((r: { peak: number | null; strength: number | null; cal: string }) => void) | null = null;
  const fp = new FreePlay(I2, 0, chip, { scale: "key", octaves: 2, bpm: 80, click: false, dynamics: { mode: "place", strike: (_ts, zone, _w, done) => (assert.equal(zone, "inner"), (pending = done)) } }, (l) => out.push(l));
  // By the box (the left bar's inner edge, INNER): the strong side, about +4 dB.
  fp.down(1, "left", INNER, 100, W, H, performance.now());
  assert.equal(notes.length, 1, "at once");
  const t0 = notes[0].p.touch!;
  // D385: the piano's landing in three zones: the strong zone, the rest of the place's +4 dB made up in level.
  assert.ok(t0 >= 2 / 3, `the place's level at touchdown: touch ${t0}`);
  assert.equal(out.length, 0, "the line waits for the strike");
  clock.t = 10.03;
  pending!({ peak: 0.25, strength: 0.25, cal: "inner zone's calibration" });
  const [k, at, until] = notes[0].trims[0];
  near(20 * Math.log10(k), -2, 1e-6);
  near(at, 10.03);
  near(until, 10.03 + MECH.dynRampMs / 1000);
  // D461: a px inside the wider bar's edge rounds to +3.9 or +4.0 (the place's ramp tops at +4).
  assert.match(out[0], /♩ \S+ · place \+(3\.9|4\.0) dB · strike −2\.0 dB \(light, peak 0\.25, \d+ ms\) · total \+(1\.9|2\.0) dB · inner zone/);
  assert.match(out[0], /corrected −2\.0 dB over 12 ms, 30 ms after the onset/);
  resetMech();
});

test("D335: FREE PLAY, B · PEDAL: the running level from the last second's landings; MECH wait: the attack struck once the strike is read", () => {
  resetMech();
  MECH.dynWait = true;
  setPreset("pianoSampled");
  const clock = { t: 0 };
  const { chip, notes } = fakeFree(clock);
  const out: string[] = [];
  const fp = new FreePlay(I2, 0, chip, { scale: "key", octaves: 2, bpm: 80, click: false, dynamics: { mode: "pedal", strike: (_ts, _z, waitMs, done) => (assert.equal(waitMs, MECH.dynWaitMs), done({ peak: 2.7, strength: 1, cal: "x" })) } }, (l) => out.push(l));
  const ts = performance.now();
  // Two landings at the outer edge (soft), one by the box (strong): the pedal at a third.
  fp.down(1, "left", 1, 100, W, H, ts);
  fp.up(1, ts + 100, false);
  fp.down(2, "left", 1, 120, W, H, ts + 300);
  fp.up(2, ts + 400, false);
  fp.down(3, "left", INNER, 140, W, H, ts + 600);
  const p = fp.pedal.value(ts + 600);
  assert.ok(Math.abs(p - 1 / 3) < 0.01, `pedal ${p}`);
  const line = out.filter((l) => l.includes("♩")).at(-1)!;
  assert.match(line, /pedal −2\.0 dB · strike \+4\.0 dB \(hard, peak 2\.70/);
  assert.match(line, /the attack waited/);
  assert.equal(notes.length, 3);
  assert.equal(notes[2].trims.length, 0, "struck at the whole level: nothing to correct");
  resetMech();
});

test("D335: DYNAMICS on another sound: off (the piano only)", () => {
  resetMech();
  setPreset("harpsichordSampled");
  const { chip } = fakeFree({ t: 0 });
  const fp = new FreePlay(I2, 0, chip, { scale: "key", octaves: 2, bpm: 80, click: false, dynamics: { mode: "place", strike: () => assert.fail("no strike read") } }, () => {});
  assert.equal(fp.dynMode(), "off");
  fp.down(1, "left", INNER, 100, W, H, 0);
  setPreset("pianoSampled");
  resetMech();
});
