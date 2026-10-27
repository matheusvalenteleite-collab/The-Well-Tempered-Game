/**
 * D233, HOME: the platform guessed from the pointer, CONTINUE's piece for a new and a progressed player,
 * the progress line, the KIMIKO ISHIZAKA feat that unlocks playing with her, and MIDI CONTROLLER offered
 * only while a MIDI input is connected.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { continueTarget, detectPlatform, midiInputNames, platformOf, progressLine, type MidiLike } from "../src/bench/home.ts";
import { evaluateFeats, FEATS_KEY, type RunFeat } from "../src/bench/feats.ts";
import { herUnlocked, type Stages } from "../src/bench/stages.ts";
import { menuOf, offered } from "../src/bench/protos.ts";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };

const id = (n: number, k = "f") => `wtc1${k}${String(n).padStart(2, "0")}`;
const ALL = Array.from({ length: 24 }, (_, i) => id(i + 1));
const EASY = [1, 4, 6, 8, 12, 14, 16, 18, 22, 23];
const beat = (...ids: string[]): Stages => Object.fromEntries(ids.map((x) => [x, { beaten: "2026-10-23", best: "B" }]));
const won = (s: Stages) => new Set(Object.keys(s).filter((k) => /^wtc1f/.test(k)));

test("D233: the platform from the pointer: a finger with no hover a phone, else a computer; ⚙ overrides", () => {
  assert.equal(detectPlatform({ coarse: true, hover: false }), "mobile");
  assert.equal(detectPlatform({ coarse: false, hover: true }), "computer");
  assert.equal(detectPlatform({ coarse: true, hover: true }), "computer", "a touch laptop with a mouse");
  assert.equal(detectPlatform({ coarse: false, hover: false }), "computer");
  // D263: phones that report hover (Samsung's), tablets, an iPad passing as a Mac.
  const s22 = "Mozilla/5.0 (Linux; Android 14; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
  assert.equal(detectPlatform({ coarse: true, hover: true, ua: s22 }), "mobile", "Galaxy S22, Chrome");
  assert.equal(detectPlatform({ coarse: true, hover: true, ua: "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36" }), "mobile", "Samsung Internet");
  assert.equal(detectPlatform({ coarse: true, hover: true, uaMobile: true }), "mobile", "userAgentData says mobile");
  assert.equal(detectPlatform({ coarse: true, hover: false, ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129 Mobile/15E148 Safari/604.1" }), "mobile", "iPhone");
  assert.equal(detectPlatform({ coarse: true, hover: true, ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15", touchPoints: 5 }), "mobile", "iPad as a Mac");
  assert.equal(detectPlatform({ coarse: false, hover: true, ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15", touchPoints: 0 }), "computer", "a Mac");
  assert.equal(detectPlatform({ coarse: false, hover: true, ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36" }), "computer", "Windows");
  assert.equal(platformOf("auto", "mobile"), "mobile");
  assert.equal(platformOf("computer", "mobile"), "computer");
  assert.equal(platformOf("mobile", "computer"), "mobile");
});

test("D233: CONTINUE: a new player STARTs on the first EASY prelude; then the pair's next unbeaten stage, then the next pair", () => {
  assert.deepEqual(continueTarget("wtc1f02", {}, new Set()), { piece: "wtc1p01", fresh: true });
  // The prelude beaten: its fugue.
  let s = beat("wtc1p01");
  assert.deepEqual(continueTarget("wtc1p01", s, won(s)), { piece: "wtc1f01", fresh: false });
  // The pair done: the next EASY pair's prelude (the wheel's order: by tier, Bach's within).
  s = beat("wtc1p01", "wtc1f01");
  assert.deepEqual(continueTarget("wtc1f01", s, won(s)), { piece: "wtc1p04", fresh: false });
  // Mid-pair elsewhere: that pair's fugue.
  s = beat("wtc1p01", "wtc1f01", "wtc1p06");
  assert.equal(continueTarget("wtc1p06", s, won(s)).piece, "wtc1f06");
  // A closed tier is passed over: the last EASY pair done with INTERMEDIATE shut (4 of 5) wraps to an EASY pair left.
  s = beat(...EASY.slice(0, 3).flatMap((n) => [id(n, "p"), id(n)]), id(23, "p"), id(23));
  assert.equal(continueTarget(id(23), s, won(s)).piece, id(8, "p"));
  // Five EASY fugues open INTERMEDIATE: it comes next.
  s = { ...s, ...beat(id(8, "p"), id(8)) };
  assert.equal(continueTarget(id(8), s, won(s)).piece, id(12, "p"));
  assert.equal(continueTarget(id(23), s, won(s)).piece, id(2, "p"));
  // Book II continues as it is.
  assert.equal(continueTarget("wtc2f05", s, won(s)).piece, "wtc2f05");
});

test("D233: the progress line: the highest tier open and its fugues beaten", () => {
  assert.equal(progressLine(new Set()), "EASY · 0/10 FUGUES BEATEN");
  assert.equal(progressLine(new Set([id(1), id(4), id(6)])), "EASY · 3/10 FUGUES BEATEN");
  assert.equal(progressLine(new Set(EASY.slice(0, 5).map((n) => id(n)))), "INTERMEDIATE · 0/6 FUGUES BEATEN");
  assert.equal(progressLine(new Set(ALL)), "BOSS · 1/1 FUGUE BEATEN");
});

test("D233: the feat KIMIKO ISHIZAKA: all 24 Book I fugues beaten; it unlocks WITH KIMIKO", () => {
  const run: RunFeat = { piece: "wtc1f24", mode: "keys", whole: true, failedBar: null, grade: "B", right: 9, of: 10, wrong: 1, missed: 0, captured: 0, entries: 0, maxStreak: 5, strettos: 0, her: false, tuning: "equal" };
  const store0 = { earned: {}, done: [] };
  const h = (beaten: string[]) => ({ store: store0, best: {}, seals: {}, beaten });
  assert.ok(!evaluateFeats({ ...run, piece: id(1) }, h(ALL.slice(0, 23)), "d").fresh.includes("ishizaka"), "23 is not enough");
  assert.ok(evaluateFeats(run, h(ALL), "d").fresh.includes("ishizaka"));
  // The stages' fugues and the feats' remembered ones together.
  assert.ok(evaluateFeats(run, { ...h(ALL.slice(0, 12)), store: { earned: {}, done: ALL.slice(12, 23) } }, "d").fresh.includes("ishizaka"), "the run's own fugue counts");
  // The unlock: the feat earned, or the 24 beaten.
  assert.equal(herUnlocked({}, { earned: {}, done: [] }), false);
  assert.equal(herUnlocked({}, { earned: { ishizaka: "d" }, done: [] }), true);
  assert.equal(herUnlocked(beat(...ALL), { earned: {}, done: [] }), true);
  assert.equal(herUnlocked(beat(...ALL.slice(1)), { earned: {}, done: [] }), false);
  store.delete(FEATS_KEY);
});

test("D233: MIDI CONTROLLER offered only while a MIDI input is connected", () => {
  const access = (inputs: { name?: string; state?: string }[]): MidiLike => ({ inputs: { forEach: (cb) => inputs.forEach((i) => cb(i)) } });
  assert.deepEqual(midiInputNames(null), [], "no Web MIDI (Safari)");
  assert.deepEqual(midiInputNames(access([])), []);
  assert.deepEqual(midiInputNames(access([{ name: "Keystation 49", state: "connected" }, { state: "connected" }])), ["Keystation 49", "MIDI"]);
  assert.deepEqual(midiInputNames(access([{ name: "Gone", state: "disconnected" }])), []);
  const has = (names: string[]) => menuOf("computer", names.length > 0).some((p) => p.id === "piano");
  assert.equal(has(midiInputNames(access([]))), false);
  assert.equal(has(midiInputNames(access([{ name: "K", state: "connected" }]))), true);
  assert.ok(!menuOf("mobile", true).some((p) => p.id === "piano"), "never on a phone");
  // A stored MIDI CONTROLLER with the keyboard unplugged plays HIGHWAY; plugged in, itself.
  assert.equal(offered("piano", "computer", false), "keys");
  assert.equal(offered("piano", "computer", true), "piano");
  assert.equal(offered("keys", "mobile", true), "ladder");
});

test("D343: play.html turns away only a device that is surely a computer", async () => {
  const { surelyComputer } = await import("../src/bench/home.ts");
  const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
  const win = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
  const linux = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
  assert.equal(surelyComputer({ anyCoarse: false, ua: mac, touchPoints: 0 }), true, "a Mac");
  assert.equal(surelyComputer({ anyCoarse: false, ua: win, touchPoints: 0 }), true, "Windows");
  assert.equal(surelyComputer({ anyCoarse: false, ua: mac, touchPoints: 5 }), false, "an iPad or iPhone asking for the desktop site");
  assert.equal(surelyComputer({ anyCoarse: true, ua: linux, touchPoints: 5 }), false, "Android in desktop mode");
  assert.equal(surelyComputer({ anyCoarse: false, ua: win, touchPoints: 10 }), false, "a touch-screen laptop");
  assert.equal(surelyComputer({ anyCoarse: true, ua: win, touchPoints: 0 }), false, "a coarse pointer somewhere");
  assert.equal(surelyComputer({ anyCoarse: false, ua: win, uaMobile: true, touchPoints: 0 }), false, "the browser says mobile");
  assert.equal(surelyComputer({ anyCoarse: false, ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", touchPoints: 0 }), false, "an iPhone's user agent");
  assert.equal(surelyComputer({ anyCoarse: false, ua: "Mozilla/5.0 (Linux; Android 14; SM-S901B) Mobile", touchPoints: 0 }), false, "a Galaxy's user agent");
});
