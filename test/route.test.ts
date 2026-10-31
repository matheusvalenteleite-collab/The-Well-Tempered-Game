/**
 * D381: the headphones gone (or back): the decision on the sound's delay from what the browser reports,
 * with a mocked AudioContext's latency and the signs of a route change.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { latencyOf, setupKey, withLag } from "../src/touch/headphones.ts";
import { latOfSetup, REREAD_MS, routeDecision, routeSign, tells, type RouteInput, type RouteSignal } from "../src/touch/route.ts";

/** A mocked AudioContext: its reported output latency, changed by the "route". */
class MockCtx {
  outputLatency: number | undefined;
  baseLatency = 0.005;
  constructor(l?: number) {
    this.outputLatency = l;
  }
}
const AIRPODS = 0.18;
const SPEAKER = 0.012;
const WIRED = 0.035;

const decide = (ctx: MockCtx, o: Partial<RouteInput> & { signal?: RouteSignal } = {}) =>
  routeDecision({ lag: null, tappedAt: undefined, held: null, book: {}, signal: "poll", ...o, reported: latencyOf(ctx as unknown as AudioContext) });

test("D381: a Bluetooth delay tapped with a Bluetooth-like latency is dropped as soon as the latency falls to the speaker's", () => {
  const ctx = new MockCtx(AIRPODS);
  const tappedAt = latOfSetup(setupKey(AIRPODS));
  assert.ok(tells(tappedAt), "the browser told the routes apart when the delay was tapped");
  assert.deepEqual(decide(ctx, { lag: 0.21, tappedAt }), { kind: "none" }, "the headphones still on");
  ctx.outputLatency = SPEAKER; // the AirPods taken out
  assert.deepEqual(decide(ctx, { lag: 0.21, tappedAt }), { kind: "drop" }, "on the regular poll too");
  ctx.outputLatency = WIRED;
  assert.deepEqual(decide(ctx, { lag: 0.21, tappedAt, signal: "devicechange" }), { kind: "drop" }, "a wire: wired-like too");
});

test("D381: a small change of a Bluetooth latency (drift, another bucket) is not a disconnection", () => {
  const ctx = new MockCtx(0.15);
  assert.deepEqual(decide(ctx, { lag: 0.2, tappedAt: 0.2, signal: "devicechange" }), { kind: "none" });
  ctx.outputLatency = 0.09; // still Bluetooth-like
  assert.deepEqual(decide(ctx, { lag: 0.2, tappedAt: 0.2 }), { kind: "none" });
});

test("D381: a delay of wired size is never touched", () => {
  const ctx = new MockCtx(SPEAKER);
  for (const signal of ["poll", "devicechange", "mediapause", "resume"] as const) assert.deepEqual(decide(ctx, { lag: 0.04, tappedAt: 0.2, signal }), { kind: "none" });
});

test("D381: where the browser reports no latency (older Safari), a sign of a route change asks; the poll alone never does", () => {
  const ctx = new MockCtx(undefined);
  assert.deepEqual(decide(ctx, { lag: 0.2 }), { kind: "none" });
  assert.deepEqual(decide(ctx, { lag: 0.2, signal: "start" }), { kind: "none" });
  for (const signal of ["devicechange", "statechange", "mediapause", "resume"] as const) assert.deepEqual(decide(ctx, { lag: 0.2, signal }), { kind: "ask" }, signal);
  ctx.outputLatency = 0; // reported as nothing
  assert.deepEqual(decide(ctx, { lag: 0.2, signal: "mediapause" }), { kind: "ask" });
});

test("D381: where the browser reported a speaker-like latency even with the headphones, a speaker-like latency asks (it cannot drop)", () => {
  const ctx = new MockCtx(SPEAKER);
  const tappedAt = latOfSetup(setupKey(0.02));
  assert.equal(tells(tappedAt), false);
  assert.deepEqual(decide(ctx, { lag: 0.2, tappedAt }), { kind: "ask" });
});

test("D381: the headphones back: the delay dropped this visit restored, or the setup's remembered one; else recalibrate", () => {
  const ctx = new MockCtx(SPEAKER);
  const held = { lag: 0.21, at: 0.15 };
  assert.deepEqual(decide(ctx, { held }), { kind: "none" }, "still on the speaker");
  ctx.outputLatency = AIRPODS;
  assert.deepEqual(decide(ctx, { held, signal: "devicechange" }), { kind: "restore", lag: 0.21 });
  const book = withLag({}, setupKey(0.3), 0.27);
  ctx.outputLatency = 0.31; // other headphones, remembered from an earlier visit
  assert.deepEqual(decide(ctx, { held, book }), { kind: "restore", lag: 0.27 });
  ctx.outputLatency = 0.45; // headphones never calibrated
  assert.deepEqual(decide(ctx, { held, book, signal: "devicechange" }), { kind: "recalibrate" });
  assert.deepEqual(decide(ctx, { held, book }), { kind: "none" }, "the poll alone does not raise the banner");
});

test("D381: a speaker's delay in the book is never given back as a Bluetooth one", () => {
  const ctx = new MockCtx(0.1);
  const book = withLag({}, setupKey(0.1), 0.05);
  assert.deepEqual(decide(ctx, { book }), { kind: "none" });
});

test("D381: the signs, the re-reads after them, and the setup's latency", () => {
  assert.equal(routeSign("poll"), false);
  assert.equal(routeSign("start"), false);
  assert.equal(routeSign("devicechange"), true);
  assert.ok(REREAD_MS.length >= 2 && REREAD_MS.every((ms, i) => i === 0 || ms > REREAD_MS[i - 1]));
  assert.equal(latOfSetup("lat:4"), 0.2);
  assert.equal(latOfSetup("default"), undefined);
  assert.equal(latOfSetup(undefined), undefined);
  assert.equal(latOfSetup("dev:AirPods"), undefined);
});

test("D381: play.html wires the watch, its notice and chip translated, and the keep-alive is watched", () => {
  const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /useRoute\(/);
  assert.match(app, /<RouteNotice /);
  assert.match(src("src/touch/chip.ts"), /get keepAliveAudio\(\)/);
  const watch = src("src/bench/RouteWatch.tsx");
  for (const ev of ["devicechange", "statechange", "visibilitychange", '"pause"']) assert.ok(watch.includes(ev), ev);
  for (const d of ["pt", "es"]) {
    const dict = src(`src/i18n/${d}.ts`);
    for (const k of ["Headphones disconnected: delay reset", "Headphones back: delay {ms} ms restored", "Using speaker? Tap to reset delay"]) assert.ok(dict.includes(`"${k}"`), `${d}: ${k}`);
  }
});
