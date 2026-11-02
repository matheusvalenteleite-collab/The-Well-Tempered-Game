/**
 * D506: the game asks for no permission: the hard tap's motion sensor (D425) behind the Lab's switch, off. No iOS
 * motion dialog (askMotion asks nothing), no reader listening, no calibration offered, no TAP STRENGTH row; the
 * accent is the strong zone (the legends, the tutorial's 3.5, HOW TO PLAY and the coach say so, en/pt/es).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };

test("D506: the hard tap off by default (a Lab switch); with it off no motion permission is requested and no device counts as a hard-tap device", async () => {
  const { MECH, MECH_DEFAULTS, MECH_SPEC } = await import("../src/bench/mechanics.ts");
  assert.equal(MECH_DEFAULTS.hardTap, false);
  assert.ok(MECH_SPEC.some((s) => s.key === "hardTap" && s.kind === "bool"), "the Lab's switch");
  // An iPhone: DeviceMotionEvent.requestPermission, a touch screen.
  let asked = 0;
  let listened = 0;
  const g = globalThis as Record<string, unknown>;
  g.window = { DeviceMotionEvent: { requestPermission: () => (asked++, Promise.resolve("granted")) }, addEventListener: () => void listened++, removeEventListener: () => {} };
  Object.defineProperty(globalThis, "navigator", { value: { maxTouchPoints: 5 }, configurable: true });
  const motion = await import("../src/touch/motion.ts");
  MECH.hardTap = false;
  await motion.askMotion();
  await motion.askMotion(true);
  assert.equal(asked, 0, "no permission dialog");
  assert.equal(listened, 0, "no sensor read");
  assert.equal(motion.hardTapDevice(), false);
  // On (the Lab only): D425 as it was, asked from the tap.
  MECH.hardTap = true;
  await motion.askMotion();
  assert.equal(asked, 1, "asked with the switch on");
  MECH.hardTap = false;
  delete g.window;
});

test("D506: the game's pages gate the sensor, the calibration and the settings row on the switch; the demonstration lands accents in the strong zone", () => {
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /if \(platform === "mobile" && MECH\.hardTap\) g\.strikes = motionStrikes/);
  assert.equal((app.match(/\{platform === "mobile" && MECH\.hardTap && <HardTapSetting \/>\}/g) ?? []).length, 2);
  assert.doesNotMatch(app, /\{platform === "mobile" && <HardTapSetting \/>\}/);
  assert.match(src("src/bench/proto-game.ts"), /const strike = !MECH\.hardTap \? undefined :/);
});

test("D506: the texts say the strong zone (D387's wording), translated", async () => {
  const { PT } = await import("../src/i18n/pt.ts");
  const { ES } = await import("../src/i18n/es.ts");
  const lessons = src("src/bench/lessons.ts");
  assert.match(lessons, /> ACCENT \(STRONG ZONE, ON TIME\)"/);
  assert.doesNotMatch(lessons, /TAP HARD/);
  for (const f of ["src/bench/manual/lessons.ts", "src/bench/manual/coach.ts", "src/bench/lite.ts"]) assert.doesNotMatch(src(f), /tap (it|the accent|each top note|them) hard|hard tap/i, f);
  assert.match(src("src/bench/lite.ts"), /An accent \(>\) is weight on time: land it in the strong zone/);
  for (const d of [PT, ES]) {
    assert.ok(d["PLAY THE SUBJECT AS THE MARKS SAY: ‾ LEGATO · ⌒ SLUR · | DETACHED · · SHORT · > ACCENT (STRONG ZONE, ON TIME)"]);
    assert.ok(d["ACCENT: STRONG ZONE"]);
  }
});
