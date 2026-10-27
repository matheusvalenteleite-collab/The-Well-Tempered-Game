/**
 * D336: THE LAB's DYNAMICS in PASSAGE (src/bench/lab/passage-dyn.ts, ProtoGame.noteDyn): the player's own
 * notes (struck, hammer-ons, pull-offs) shaped as in FREE PLAY, the verdicts and points untouched; one
 * calibration, ADAPTIVE (dynamics.ts AdaptiveCal); the strike's curve trusting a firm tap more than a
 * soft one; the STUDY never with it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ADAPT_MIN_RATIO, ADAPT_N, AdaptiveCal, DEFAULT_CAL, DYN_MAX_DB, dynLevel, loadDynCal, logStrength, refsText, saveDynCal, saveZoneCal, SOFT_CUT_DB, strikeDb } from "../src/bench/lab/dynamics.ts";
import { PassageDynamics, type StrikeReader } from "../src/bench/lab/passage-dyn.ts";
import { replay } from "../src/bench/lab/replay.ts";
import { configById, configMech } from "../src/bench/lab/presets.ts";
import type { LabPassage } from "../src/bench/lab/log.ts";
import type { LabEvent } from "../src/bench/lab/events.ts";
import type { NoteDynAsk } from "../src/bench/proto-game.ts";
import type { Sounding } from "../src/touch/chip.ts";
import { synthPreparer, synthRun } from "../tools/lab/lab-synth.ts";

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const II18: LabPassage = { piece: "wtc2f18", voice: 0, fromBar: 1, toBar: 8, bpm: 83, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null };
const BP = () => configMech(configById("B+")!);
const notesOf = (ev: LabEvent[]) => ev.filter((e): e is Extract<LabEvent, { kind: "note" }> => e.kind === "note");
const tick = () => new Promise((r) => setTimeout(r, 0));

test("D336: the strike trusts firm over soft: at or below the soft reference −2 dB at most, from the midpoint the full accent", () => {
  assert.equal(SOFT_CUT_DB, 2);
  for (const m of ["place", "pedal"] as const) {
    near(strikeDb(m, 0), -2);
    near(strikeDb(m, 0.25), -2);
    near(strikeDb(m, 0.375), 1);
    near(strikeDb(m, 0.5), 4);
    near(strikeDb(m, 0.75), 4);
    near(strikeDb(m, 1), 4);
  }
  near(strikeDb("strike", 0), -4);
  near(strikeDb("strike", 0.6), 8);
  near(strikeDb("place", null), 0, 1e-9);
  // D335's even line still there.
  near(strikeDb("place", 0, "even"), -4);
  // A hard tap read as soft (3 of 18 by the box) loses 2 dB, not 4; one between soft and hard is an accent.
  const cal = { soft: 0.22, hard: 0.64 };
  near(strikeDb("pedal", logStrength(0.2, cal)), -2);
  near(strikeDb("pedal", logStrength(Math.sqrt(0.22 * 0.64), cal)), 4, 1e-9);
  for (const m of ["place", "pedal", "strike"] as const) for (let c = 0; c <= 1; c += 0.1) for (let s = 0; s <= 1; s += 0.05) assert.ok(Math.abs(dynLevel(m, c, s).total) <= DYN_MAX_DB + 1e-9);
});

test("D336, ADAPTIVE: the references follow the recent strikes from the stored calibration; never closer than ×2; off, the calibration", () => {
  // His earlier sessions' calibration; now his levels are lower (soft ~0.22, hard ~0.64: the phone turned).
  const seed = { soft: 0.26, hard: 1.05, from: "learn" as const };
  const a = new AdaptiveCal(seed);
  assert.deepEqual(a.refs(), seed);
  a.add(0.3);
  a.add(null);
  a.add(-1);
  assert.equal(a.n, 1);
  assert.deepEqual(a.refs(), seed, "too few strikes yet");
  let x = 7;
  const rand = () => ((x = (x * 16807) % 2147483647), x / 2147483647);
  for (let k = 0; k < 200; k++) a.add(k % 2 ? 0.64 * (0.8 + 0.4 * rand()) : 0.22 * (0.8 + 0.4 * rand()));
  assert.equal(a.n, ADAPT_N);
  const r = a.refs();
  assert.equal(r.from, "adaptive");
  assert.ok(r.soft > 0.18 && r.soft < 0.26, `soft ${r.soft}`);
  assert.ok(r.hard > 0.6 && r.hard < 0.8, `hard ${r.hard} (the seed's 1.05 left behind)`);
  // A median new hard tap reads firm (the full accent); under the old calibration it read medium.
  assert.ok(strikeDb("pedal", logStrength(0.64, r)) === 4);
  assert.ok(logStrength(0.64, seed) < 0.65 && logStrength(0.64, r) > 0.7, `${logStrength(0.64, seed)} → ${logStrength(0.64, r)}`);
  // Even strikes: the references kept ×2 apart round them.
  const e = new AdaptiveCal(seed);
  for (let k = 0; k < 60; k++) e.add(0.4);
  const er = e.refs();
  near(er.hard / er.soft, ADAPT_MIN_RATIO, 1e-9);
  // Off: the stored calibration alone; a LEARN starts it again.
  a.on = false;
  assert.deepEqual(a.refs(), seed);
  a.on = true;
  a.reseed({ soft: 0.2, hard: 0.6, from: "learn" });
  assert.equal(a.n, 0);
  assert.equal(a.refs().hard, 0.6);
  assert.match(refsText(r), /^soft 0\.\d\d · hard 0\.\d\d \(adaptive, 60 strikes\)$/);
  assert.match(refsText(DEFAULT_CAL), /default/);
});

test("D336: one calibration kept on the device (LEARN's or the adaptive's); before any, D335's zones together; else the default; storage blocked, the default", () => {
  const g = globalThis as { localStorage?: unknown };
  const before = g.localStorage;
  const m = new Map<string, string>();
  g.localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
  assert.deepEqual(loadDynCal(), DEFAULT_CAL);
  saveZoneCal({ inner: null, outer: null, all: { soft: 0.22, hard: 0.65, from: "session" } });
  assert.deepEqual(loadDynCal(), { soft: 0.22, hard: 0.65, from: "learn" });
  assert.equal(saveDynCal({ soft: 0.21, hard: 0.66, from: "adaptive", n: 60 }), true);
  const c = loadDynCal();
  assert.equal(c.from, "adaptive");
  assert.equal(c.hard, 0.66);
  assert.equal(c.n, 60);
  assert.ok(c.at);
  saveDynCal({ soft: 0.5, hard: 0.4, from: "learn" });
  assert.equal(loadDynCal().hard, 0.65, "a reversed one refused (removed): the zones' again");
  g.localStorage = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  assert.deepEqual(loadDynCal(), DEFAULT_CAL);
  assert.equal(saveDynCal(DEFAULT_CAL), false);
  g.localStorage = before;
});

type Fake = { s: Sounding; trims: [number, number, number][] };
const fakeSound = (): Fake => {
  const trims: [number, number, number][] = [];
  return { trims, s: { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {}, trim: (k: number, at: number, until: number) => void trims.push([k, at, until]) } as unknown as Sounding };
};
const ask = (o: Partial<NoteDynAsk> = {}): NoteDynAsk => ({ k: 0, i: 3, midi: 72, side: "left", land: 1, across: 0.1, ts: 1000, ok: true, ...o });

test("D336: a struck note: at the place's level at once, corrected over the ramp once the strike is read; the line says each part", async () => {
  const lines: string[] = [];
  let pending: ((p: number | null) => void) | null = null;
  const read: StrikeReader = (_ts, zone, _w, done) => (assert.equal(zone, "inner"), (pending = done));
  const audio = { t: 5 };
  const pd = new PassageDynamics({ mode: "place", adapt: new AdaptiveCal({ soft: 0.25, hard: 1, from: "learn" }), read, say: (l) => lines.push(l), name: () => "C5", audioNow: () => audio.t, wall: () => 1010 });
  const a = pd.ask(ask())!;
  // The place (by the box: strong) +4 dB at once: the piano's layer at the top, no level beyond.
  near(a.touch, 1);
  near(a.level, 1);
  const f = fakeSound();
  a.sounded!([f.s], 5);
  audio.t = 5.03;
  pending!(1.1);
  near(f.trims[0][0], 10 ** (4 / 20));
  near(f.trims[0][1], 5.03);
  near(f.trims[0][2], 5.042);
  await tick();
  assert.match(lines[0], /^♩ C5 · place \+4\.0 dB · strike \+4\.0 dB \(firm, peak 1\.10, \d+ ms\) · total \+8\.0 dB · refs 0\.25\/1\.00 · struck at \+4\.0 dB, corrected \+4\.0 dB over 12 ms, 30 ms after the onset · inner zone · L thumb$/);
  assert.equal(pd.adapt.n, 1, "learned from");
});

test("D336: a pull-off (no strike) keeps its place or pedal level, strike neutral, nothing read; a landing long ago is read at once and sounds whole", async () => {
  const lines: string[] = [];
  let reads = 0;
  const pd = new PassageDynamics({ mode: "pedal", adapt: new AdaptiveCal({ soft: 0.25, hard: 1, from: "learn" }), read: (_t, _z, _w, done) => (reads++, done(0.2)), say: (l) => lines.push(l), name: () => "B4", audioNow: () => 0, wall: () => 2000 });
  const p = pd.ask(ask({ gesture: "pull-off", land: 0 }))!;
  assert.equal(reads, 0);
  assert.equal(p.sounded, undefined);
  assert.equal(pd.notes[0].strike, 0);
  near(pd.notes[0].base, -6);
  // A thumb that waited for its note (landed 400 ms before): the strike already read: the whole level at once.
  const w = pd.ask(ask({ ts: 1600, land: 0 }))!;
  assert.equal(reads, 1);
  assert.equal(w.sounded, undefined);
  near(pd.notes[1].strike, -2);
  near(pd.notes[1].total, -8);
  await tick();
  assert.match(lines[0], /^♩ B4 · pedal −6\.0 dB · strike — \(a pull-off: no strike: neutral\) · total −6\.0 dB · struck at −6\.0 dB · inner zone · L thumb · PULL-OFF$/);
  assert.match(lines[1], /strike −2\.0 dB \(light|strike −2\.0 dB \(soft/);
  assert.match(lines[1], /the strike already read \(landed 400 ms before\)/);
  // Off: nothing asked of it.
  assert.equal(new PassageDynamics({ mode: "off", adapt: new AdaptiveCal(), read: null, say: () => {}, name: () => "", audioNow: () => 0 }).ask(ask()), null);
  // No sensor: neutral, said so.
  const ns: string[] = [];
  new PassageDynamics({ mode: "strike", adapt: new AdaptiveCal(), read: null, say: (l) => ns.push(l), name: () => "D4", audioNow: () => 0 }).ask(ask());
  await tick();
  assert.match(ns[0], /strike — \(the motion sensor is off: neutral\)/);
});

test("D336: in the game: every note of the player's asked (struck, hammer-ons, pull-offs), and the verdicts, points and events the same with DYNAMICS and without", () => {
  const log = synthPreparer(II18, { seed: 3, jitter: 0.001 });
  const plain = replay(log, BP());
  const asked: NoteDynAsk[] = [];
  let made = 0;
  const withDyn = replay(log, BP(), (g) => {
    const pd = new PassageDynamics({ mode: "pedal", adapt: new AdaptiveCal(), read: (_t, _z, _w, done) => done(Math.random() * 2), say: () => {}, name: () => "", audioNow: () => 0, wall: () => 0 });
    g.noteDyn = (n) => {
      asked.push(n);
      const a = pd.ask(n);
      return a && { ...a, sounded: (s) => void (made += s.length) };
    };
  });
  assert.deepEqual(withDyn.events, plain.events);
  assert.deepEqual(withDyn.summary, plain.summary);
  const played = notesOf(plain.events).filter((e) => !e.slide);
  assert.equal(asked.length, played.length);
  assert.ok(asked.some((n) => n.gesture === "pull-off"), "pull-offs asked");
  assert.ok(asked.some((n) => n.gesture === "hammer-on"), "hammer-ons asked");
  assert.ok(asked.filter((n) => n.gesture !== "pull-off").every((n) => n.ts !== null && n.land >= 0 && n.land <= 1 && n.across !== undefined));
  assert.equal(made, asked.length, "each note's sound handed back for the correction");
  // A plain run (B), sloppy: the same again.
  const sloppy = synthRun(II18, { gap: 0.02, jitter: 0.06, wrongEvery: 7, strayEvery: 9 });
  const b = configMech(configById("B")!);
  const p2 = replay(sloppy, b);
  const d2 = replay(sloppy, b, (g) => (g.noteDyn = new PassageDynamics({ mode: "strike", adapt: new AdaptiveCal(), read: null, say: () => {}, name: () => "", audioNow: () => 0 }).ask));
  assert.deepEqual(d2.events, p2.events);
  assert.deepEqual(d2.summary, p2.summary);
});

test("D336: the lab wires it: PASSAGE with the sampled piano, never a STUDY (its own settings: DYNAMICS OFF), never BLUETOOTH; one setting shown in both tabs", () => {
  const src = readFileSync(new URL("../src/bench/lab/LabApp.tsx", import.meta.url), "utf8");
  assert.match(src, /const dynOn = !forStudy && s\.dynMode !== "off" && presetById\(sound\)\.id === "pianoSampled" && !passage\.bt;/);
  assert.match(src, /sound: STUDY_SOUND, loop: false, drill: undefined, mode: "passage", dynMode: "off" \}/);
  assert.match(src, /<DynPick id="lab-passage-dyn"/);
  assert.match(src, /<DynPick id="lab-free-dyn"/);
  assert.match(src, /dynAdaptive: s\.dynAdaptive !== false/, "ADAPTIVE on by default");
});
