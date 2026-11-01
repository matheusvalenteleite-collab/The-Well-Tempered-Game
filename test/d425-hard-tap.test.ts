/** D425: THE HARD TAP: an accent is a note struck harder (the motion sensor's peak), within GOOD, anywhere across the strip; the strong zone where no sensor. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip, Play } from "../src/touch/chip.ts";
import type { Reading } from "../src/touch/readings.ts";
import { markLegend } from "../src/touch/readings.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { accentWeighted } from "../src/bench/accent.ts";
import { withMech } from "../src/bench/mechanics.ts";
import { setPreset } from "../src/touch/sound.ts";
import { PLAYER_ACCENT_DB } from "../src/touch/whole-reading.ts";
import { MotionReader, tapPeak, windowEnd, type MotionSample } from "../src/touch/motion.ts";
import { DEFAULT_HARD_CAL, HARD_ACCENT_FROM, HARD_CAL_KEY, HARD_RAMP_MS, HARD_WEIGHT_FROM, hardCalibration, hardDb, hardForAccent, hardForWeight, loadHardCal, logStrength, motionStrikes, peakAt, saveHardCal, StrikeSlot, type StrikeSource } from "../src/touch/hard-tap.ts";
import { logStrength as labLogStrength } from "../src/bench/lab/dynamics.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const near = (a: number, b: number, eps = 1e-6, m?: string) => assert.ok(Math.abs(a - b) <= eps, `${m ?? ""} ${a} ≠ ${b}`);

// ---- Strength and the threshold ----

test("D425: a strike's strength on a log scale by the calibration (D335's medians by default); HARD over the midpoint with a margin", () => {
  assert.deepEqual({ soft: DEFAULT_HARD_CAL.soft, hard: DEFAULT_HARD_CAL.hard }, { soft: 0.25, hard: 1.05 });
  near(logStrength(0.25, DEFAULT_HARD_CAL), 0.25);
  near(logStrength(1.05, DEFAULT_HARD_CAL), 0.75);
  near(logStrength(Math.sqrt(0.25 * 1.05), DEFAULT_HARD_CAL), 0.5, 1e-9, "the geometric mean is the midpoint");
  assert.equal(logStrength(0.01, DEFAULT_HARD_CAL), 0);
  assert.equal(logStrength(9, DEFAULT_HARD_CAL), 1);
  assert.equal(labLogStrength, logStrength, "the Lab's DYNAMICS reads by the same function");
  // The thresholds in m/s² by default: an asked accent from about 0.44, the piano's weight on an unmarked note from about 0.59.
  near(peakAt(HARD_ACCENT_FROM, DEFAULT_HARD_CAL), 0.444, 0.005);
  near(peakAt(HARD_WEIGHT_FROM, DEFAULT_HARD_CAL), 0.59, 0.005);
  near(logStrength(peakAt(0.62, DEFAULT_HARD_CAL), DEFAULT_HARD_CAL), 0.62, 1e-9);
  // D335's medians: every soft one soft, every hard one hard.
  for (const p of [0.23, 0.25, 0.27]) assert.ok(!hardForAccent(logStrength(p, DEFAULT_HARD_CAL)), `soft ${p}`);
  for (const p of [0.95, 1.05, 1.18]) assert.ok(hardForAccent(logStrength(p, DEFAULT_HARD_CAL)) && hardForWeight(logStrength(p, DEFAULT_HARD_CAL), false), `hard ${p}`);
  // The margin: between the two, an asked accent credited, an unmarked note not weighted.
  const mid = logStrength(0.5, DEFAULT_HARD_CAL);
  assert.ok(hardForAccent(mid) && hardForWeight(mid, true) && !hardForWeight(mid, false));
  assert.ok(!hardForAccent(null));
  // A player's own calibration moves the threshold: a light-handed player's 0.3 is hard.
  const light = { soft: 0.08, hard: 0.35 };
  assert.ok(hardForAccent(logStrength(0.3, light)) && !hardForAccent(logStrength(0.3, DEFAULT_HARD_CAL)));
});

test("D425: the calibration from six soft and six hard taps: their medians; too few or alike, none", () => {
  const c = hardCalibration([0.2, 0.3, 0.25, 0.22, 0.28, 0.26], [1.0, 1.2, 0.9, 1.1, 0.95, 1.3])!;
  near(c.soft, 0.255);
  near(c.hard, 1.05);
  assert.equal(c.from, "player");
  assert.equal(hardCalibration([0.2, 0.3], [1, 1, 1]), null, "too few");
  assert.equal(hardCalibration([0.4, 0.5, 0.45], [0.5, 0.45, 0.48]), null, "alike");
});

test("D425: the calibration kept on the device (localStorage, guarded): round trip, forget, a blocked store", () => {
  const m = new Map<string, string>();
  const store = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
  assert.equal(loadHardCal(store), DEFAULT_HARD_CAL, "nothing kept: the default");
  assert.ok(saveHardCal({ soft: 0.18, hard: 0.9, from: "player" }, store));
  const back = loadHardCal(store);
  assert.deepEqual([back.soft, back.hard, back.from], [0.18, 0.9, "player"]);
  assert.ok(typeof JSON.parse(m.get(HARD_CAL_KEY)!).at === "string");
  m.set(HARD_CAL_KEY, "{not json");
  assert.equal(loadHardCal(store), DEFAULT_HARD_CAL, "garbage: the default");
  m.set(HARD_CAL_KEY, JSON.stringify({ soft: 0.5, hard: 0.4 }));
  assert.equal(loadHardCal(store), DEFAULT_HARD_CAL, "hard under soft: the default");
  assert.ok(saveHardCal(null, store));
  assert.ok(!m.has(HARD_CAL_KEY), "forgotten");
  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
  assert.equal(loadHardCal(blocked), DEFAULT_HARD_CAL);
  assert.equal(saveHardCal({ soft: 0.2, hard: 1, from: "player" }, blocked), false);
});

// ---- The reader ----

test("D425: the motion reader: a touchdown's peak in its window, ended by the next touchdown; the strike source by the calibration", () => {
  const samples: MotionSample[] = [];
  for (let t = -300; t <= 120; t += 10) samples.push({ t, rt: t + 2, gx: 0, gy: 0, gz: 9.8 + (t === 20 ? 1.0 : t === 70 ? 0.3 : 0) });
  near(tapPeak(samples, 0, -10, 35).peak!, 1.0);
  // Two thumbs 40 ms apart: the first's window ends a few ms after the second lands.
  assert.equal(windowEnd(0, 35, [0, 20]), 24);
  assert.equal(windowEnd(0, 35, [0, 60]), 35);
  // The source answers null where the sensor gives nothing (never waits on it), a strength where it does.
  const off = new MotionReader();
  let got: number | null | undefined;
  motionStrikes(off).read(0, (s) => (got = s));
  assert.equal(got, null);
  const r = new MotionReader();
  (r as unknown as { listening: boolean }).listening = true;
  const t0 = performance.now();
  for (const s of samples) r.add({ ...s, t: s.t + t0, rt: s.rt + t0 });
  let s1: number | null | undefined;
  motionStrikes(r).read(t0, (s) => (s1 = s));
  near(s1!, logStrength(1.0, DEFAULT_HARD_CAL));
  assert.ok(hardForAccent(s1!));
});

// ---- The judge ----

test("D425: the judge: a hard strike within GOOD is ACCENT ✓, anywhere across; soft is not; no sensor, the strong zone within GOOD", () => {
  const W = { early: 140, late: 160 };
  assert.equal(accentWeighted(0, W, { hard: true }), null);
  assert.equal(accentWeighted(130, W, { hard: true }), null, "GOOD, not PERFECT: still an accent");
  assert.equal(accentWeighted(-130, W, { hard: true }), null);
  assert.equal(accentWeighted(0, W, { hard: false }), "soft");
  assert.equal(accentWeighted(170, W, { hard: true }), "late");
  assert.equal(accentWeighted(-150, W, { hard: true }), "early");
  assert.equal(accentWeighted(120, W, { zone: 0.9 }), null, "the fallback: the strong zone within GOOD");
  assert.equal(accentWeighted(0, W, { zone: 0.5 }), "soft");
  // The legend: here (node, no sensor) the fallback's words; on a phone with the sensor the hard tap's.
  assert.equal(markLegend().find((m) => m.kind === "strong")!.text, "ACCENT: STRONG ZONE");
  assert.match(src("src/touch/readings.ts"), /hardTapDevice\(\) \? tr\("ACCENT: TAP HARD"\) : tr\("ACCENT: STRONG ZONE"\)/);
});

function fakeChip(clock: { t: number }, heard?: { midi: number; p: Play; trims: number[] }[]) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: (midi: number, _at: number, _dur: number, _v: unknown, p: Play = {}) => {
      const rec = { midi, p, trims: [] as number[] };
      if (p.lead) heard?.push(rec);
      return { stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {}, trim: (l: number, at: number, until: number) => (rec.trims.push(l), assert.ok(Math.abs(until - at - HARD_RAMP_MS / 1000) < 1e-9, "a 12 ms ramp")) };
    },
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
}
const firstEntry = (id: string) => [...fugueById(id).entries].filter((e) => !e.theme).sort((a, b) => a.on - b.on || a.voice - b.voice)[0];

/** I/2's first entry: every note accented (or none), struck `lean` beats late, at `x` across (by the box at 395), with `strike` given (or read by `source`). */
function play(o: { strike?: number; x?: number; lean?: number; accent?: boolean; source?: StrikeSource; heard?: { midi: number; p: Play; trims: number[] }[]; flush?: () => void }) {
  const f = fugueById("wtc1f02");
  const e = firstEntry("wtc1f02");
  const reading = { id: "t", notes: e.notes.map(() => ({ join: null, short: null, accent: o.accent ?? true })), level: null, plan: [], tempo: 60 } as unknown as Reading;
  const W = 800;
  const ROWS: Rows = { yOf: (s) => 900 - s * 16, stepAt: (y) => Math.round((900 - y) / 16), rowH: 16, xOf: () => W / 2 };
  const clock = { t: 0 };
  const g = new ProtoGame(f, e.voice, 0, protoById("ladder"), { bpm: 60, legato: false, until: e.end, solo: true, easy: "direction", fail: false, reading }, fakeChip(clock, o.heard));
  g.wall = () => clock.t * 1000;
  g.rows = ROWS;
  if (o.source) g.strikes = o.source;
  const to = (t: number) => {
    while (clock.t < t - 0.02) (clock.t += 0.02), g.step(), o.flush?.();
    clock.t = Math.max(clock.t, t);
    g.step();
  };
  let id = 0;
  let side: "left" | "right" = "left";
  for (const n of g.notes) {
    to(g.timeAt(n.on + (o.lean ?? 0) * g.beat));
    side = side === "left" ? "right" : "left";
    const nid = ++id;
    const x = o.x ?? 200;
    g.down(nid, { side, x: side === "left" ? x : W - x, y: ROWS.yOf(n.step), w: W, h: 400, ...(o.strike !== undefined ? { strike: o.strike } : {}) }, g.wall());
    to(g.timeAt(n.on + n.dur * 0.9));
    g.up(nid, g.wall());
  }
  to(g.timeAt(g.end + 1));
  o.flush?.();
  return g;
}

test("D425: in play: struck hard, every accent credited wherever across and a little off time (GOOD); soft, none; the notes' verdicts the same", () =>
  withMech({ glenn: true }, () => {
    const hard = play({ strike: 1, x: 20 });
    assert.ok(hard.style.of > 5 && hard.style.hit === hard.style.of, `hard by the edge: ${hard.style.hit}/${hard.style.of}`);
    const leaned = play({ strike: 1, x: 20, lean: 0.12 });
    assert.ok(leaned.style.hit / leaned.style.of > 0.9, `hard, 12% of a beat late (GOOD, not PERFECT): ${leaned.style.hit}/${leaned.style.of}`);
    const soft = play({ strike: 0.2, x: 395 });
    assert.equal(soft.style.hit, 0, "soft, even in the strong zone: no accent (the sensor decides)");
    assert.equal(soft.style.of, hard.style.of);
    // Unmarked notes: striking hard changes no verdict, no point.
    const a = play({ strike: 1, accent: false });
    const b = play({ strike: 0.2, accent: false });
    const ra = a.results();
    const rb = b.results();
    assert.equal(a.style.of, 0);
    assert.deepEqual([ra.right, ra.wrong, ra.missed, ra.score], [rb.right, rb.wrong, rb.missed, rb.score]);
  }));

test("D425: no sensor: the strong zone within GOOD (a late landing by the box still an accent); the CLASSIC mechanics unchanged", () =>
  withMech({ glenn: true }, () => {
    const box = play({ x: 395, lean: 0.12 });
    assert.ok(box.style.of > 5 && box.style.hit / box.style.of > 0.9, `by the box, GOOD: ${box.style.hit}/${box.style.of}`);
    assert.equal(play({ x: 20 }).style.hit, 0, "by the edge: no accent");
    // A sensor that answers nothing (no samples): the same fallback.
    const silent: StrikeSource = { read: (_ts, done) => done(null) };
    assert.ok(play({ x: 395, source: silent }).style.hit > 5);
    withMech({ glenn: false }, () => {
      const classic = play({ strike: 0.2, x: 20 });
      assert.ok(classic.style.hit / classic.style.of > 0.9, "CLASSIC: D338's time rules, no strength asked");
    });
  }));

test("D425: a strike read after the onset (the sensor's 3-36 ms): the verdict waits for it, the sound is corrected by a ramp", () =>
  withMech({ glenn: true }, () => {
    setPreset("pianoSampled");
    const queue: ((s: number | null) => void)[] = [];
    const source: StrikeSource = { read: (_ts, done) => void queue.push(done) };
    const flush = (s: number) => () => queue.splice(0).forEach((d) => d(s));
    const heard: { midi: number; p: Play; trims: number[] }[] = [];
    const hard = play({ source, flush: flush(1), x: 200, heard });
    assert.ok(hard.style.of > 5 && hard.style.hit === hard.style.of, `read late, hard: ${hard.style.hit}/${hard.style.of}`);
    assert.ok(heard.length > 5 && heard.every((h) => h.trims.length === 1), "each accented note corrected once");
    near(20 * Math.log10(heard[0].trims[0]), PLAYER_ACCENT_DB.accent, 1e-9, "the reading's > weight");
    assert.ok(heard.every((h) => h.p.accentDb === undefined), "the strong zone no longer gives the accent's weight at the onset");
    const soft = play({ source, flush: flush(0.2), x: 200 });
    assert.equal(soft.style.hit, 0);
    setPreset("harpsichordSampled");
    const hh: { midi: number; p: Play; trims: number[] }[] = [];
    play({ source, flush: flush(1), x: 200, heard: hh });
    assert.ok(hh.length > 5 && hh.every((h) => h.trims.length === 0), "the harpsichord: no level change (credited only)");
    setPreset("pianoSampled");
  }));

test("D425: the piano's sound for a hard strike: PLAYER_ACCENT_DB where marked, +3 dB unmarked; strings and voices a small firmer onset; harpsichord and organ nothing", () => {
  assert.equal(hardDb("piano", 1, PLAYER_ACCENT_DB.accent), 4);
  assert.equal(hardDb("piano", 1, PLAYER_ACCENT_DB.marcato), 6);
  assert.equal(hardDb("piano", 1), 3);
  assert.equal(hardDb("piano", 0.25), 0, "a soft strike: the zone's level alone");
  assert.equal(hardDb("piano", 0.47, 4), 4, "marked: the accent's own threshold");
  assert.equal(hardDb("piano", 0.47), 0, "unmarked: the stricter threshold");
  assert.equal(hardDb("bowed", 1), 1.5);
  assert.equal(hardDb("sung", 1), 1.5);
  assert.equal(hardDb("plucked", 1, 4), 0);
  assert.equal(hardDb("organ", 1, 6), 0);
  // Known at the onset (a thumb that landed early, the demonstration): struck at the whole level, no ramp.
  withMech({ glenn: true }, () => {
    setPreset("pianoSampled");
    const marked: { midi: number; p: Play; trims: number[] }[] = [];
    const plain: { midi: number; p: Play; trims: number[] }[] = [];
    const softly: { midi: number; p: Play; trims: number[] }[] = [];
    play({ strike: 1, x: 200, heard: marked });
    play({ strike: 1, x: 200, accent: false, heard: plain });
    play({ strike: 0.2, x: 200, accent: false, heard: softly });
    near(20 * Math.log10(plain[0].p.level! / softly[0].p.level!), 3, 1e-9, "+3 dB unmarked");
    near(20 * Math.log10(marked[0].p.level! / softly[0].p.level!), 4, 1e-9, "+4 dB for >");
    assert.ok(marked.every((h) => !h.trims.length));
  });
});

test("D425: the slot: read once, answered at once when known; Herr Bach's demonstration strikes accents hard", () => {
  const s = new StrikeSlot();
  const got: (number | null)[] = [];
  s.on((v) => got.push(v));
  s.set(0.8);
  s.set(0.1);
  s.on((v) => got.push(v));
  assert.deepEqual(got, [0.8, 0.8]);
  const pg = src("src/bench/proto-game.ts");
  assert.match(pg, /const strike = this\.asksAccent\(0, t\.i\) \? 1 : 0\.25;/);
  assert.match(src("src/bench/BenchApp.tsx"), /void askMotion\(\);\n    const ch = ensureChip\(\);/, "asked on the PLAY tap");
});
