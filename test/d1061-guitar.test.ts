/**
 * D1061-D1066, THE GUITARIST'S HANDS AND THE AMP (MECH.guitar, MECH.tilt): the pure model (src/touch/guitar.ts: the pick's place,
 * the hard pick, the bend's cap and return, the join's hammer-on and pull-off, the slide), the tilt reader (src/touch/tilt.ts: the
 * neutral, the lean's dead zone and direction, the steering's hysteresis, either landscape and either browser's signs), the
 * engine on the fake context (a guitar note with and without Play.guitar; the flags off, every note as before), the measured
 * loudness (D508) and the developer view's switch (new-mech.ts).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeAudioContext, type FakeNode, installFakeAudio } from "./fake-audio.ts";
import { BEND, bendCents, bloomOf, BLOOM, fuzzCurve, GUITAR_SLIDE_MAX, HARD_PICK, LEFT_HAND, lhOf, lhSkip, PickTracker, pickLanding, pickLevelDb, pickTone, stompOf } from "../src/touch/guitar.ts";
import { leanValue, SteerStop, TILT, TiltCore } from "../src/touch/tilt.ts";
import { Chip, voicing } from "../src/touch/chip.ts";
import { setPreset } from "../src/touch/sound.ts";
import { MECH, MECH_DEFAULTS, lockMech, resetMech } from "../src/bench/mechanics.ts";
import { ampNow, GuitarHand, guitarNow, guitarPlay, guitarSlide } from "../src/bench/guitaring.ts";
import { settleTau, SETTLE_CENTS } from "../src/bench/slide-sound.ts";

// ---- D1061: the pick's place ----

test("D1061: the pick's place: the middle exactly today's (no filter, no level); the bridge brighter, the neck rounder; the level only ±1 dB", () => {
  assert.deepEqual(pickTone(0.5), { shelf: 0, twang: 0, warm: 0 });
  assert.equal(pickLevelDb(0.5), 0);
  const br = pickTone(1);
  const nk = pickTone(0);
  assert.ok(br.shelf > 0 && br.twang > 0 && br.warm === 0);
  assert.ok(nk.shelf < 0 && nk.warm > 0 && nk.twang === 0);
  for (let c = 0; c <= 1; c += 0.05) assert.ok(Math.abs(pickLevelDb(c)) <= 1, `${c}`);
  // continuous: no step anywhere across the bar
  for (let c = 0; c < 1; c += 0.01) assert.ok(Math.abs(pickTone(c + 0.01).shelf - pickTone(c).shelf) < 0.1);
  // the landing: the line's level kept, a reading's accent still the strong zone's
  const l = pickLanding(0.5, { lineDb: -2 });
  assert.ok(Math.abs(l.vel! + 2) < 1e-9 && l.pick === 0.5);
  assert.ok(pickLanding(0.9, { accentDb: 4 }).vel === 4);
  assert.ok(pickLanding(0.2, { accentDb: 4 }).vel! < 0);
});

test("D1061: the hard pick: a fast flick within the first 40 ms, told once; a still or slow landing none; the flick's travel bends nothing", () => {
  const BAR = 200;
  const flick = new PickTracker(0, 0.5, BAR);
  let hard = 0;
  let cents = 0;
  // 3 bar widths a second for 30 ms, then still
  let x = 0.5;
  for (let t = 8; t <= 30; t += 8) {
    x += 3 * 0.008;
    const r = flick.move(t, x);
    hard += r.hard ? 1 : 0;
    cents = r.cents;
  }
  for (let t = 40; t <= 400; t += 16) {
    const r = flick.move(t, x);
    hard += r.hard ? 1 : 0;
    cents = r.cents;
  }
  assert.equal(hard, 1);
  assert.ok(flick.wasHard);
  assert.equal(cents, 0, "a flick and a still thumb after it: no bend");
  const slow = new PickTracker(0, 0.5, BAR);
  let h2 = 0;
  for (let t = 16; t <= 200; t += 16) h2 += slow.move(t, 0.5 + 0.2 * (t / 1000)).hard ? 1 : 0;
  assert.equal(h2, 0);
  // a flick after the first 40 ms is no hard pick (the pick is already played)
  const late = new PickTracker(0, 0.5, BAR);
  late.move(60, 0.5);
  assert.equal(late.move(70, 0.6).hard, false);
  assert.ok(HARD_PICK.attackMs === 40);
});

// ---- D1062: the bend ----

test("D1062: the bend: nothing within the dead zone; rising with the push either way; never past a quarter tone; back to 0 as the thumb comes back", () => {
  assert.equal(bendCents(0), 0);
  assert.equal(bendCents(BEND.dead), 0);
  assert.equal(bendCents(NaN), 0);
  assert.ok(bendCents(0.1) > 0 && bendCents(-0.1) === bendCents(0.1));
  assert.ok(bendCents(0.2) > bendCents(0.1));
  assert.equal(BEND.cents, 50);
  for (const dx of [0.5, 0.7, 1, -1, 5]) assert.equal(bendCents(dx), 50);
  for (let dx = -1; dx <= 1; dx += 0.01) assert.ok(bendCents(dx) >= 0 && bendCents(dx) <= 50);
  // the tracker: a push and back
  const tr = new PickTracker(0, 0.4, 200);
  let t = 100;
  assert.equal(tr.move(t, 0.4).cents, 0);
  const up = tr.move((t += 100), 0.7).cents;
  assert.ok(up > 25 && up <= 50);
  assert.equal(tr.move((t += 100), 0.4).cents, 0, "returned");
  // to and fro: a vibrato above the pitch only
  const vib: number[] = [];
  for (let k = 0; k < 40; k++) vib.push(tr.move((t += 30), 0.4 + 0.08 * Math.sin(k)).cents);
  assert.ok(Math.max(...vib) > 5 && Math.min(...vib) >= 0);
});

test("D1062: the hand sends the bend to guitar notes only (Sounding.bend), and lets the string back on the lift", () => {
  const got: number[] = [];
  const other: number[] = [];
  const gsd = { stop: () => {}, bend: (c: number) => got.push(c), guitar: () => {} };
  const plain = { stop: () => {}, bend: (c: number) => other.push(c) };
  const h = new GuitarHand(0, 0.5, 200);
  h.move(100, 0.5, [gsd, plain]);
  h.move(200, 0.8, [gsd, plain]);
  assert.ok(got.length === 1 && got[0] > 0);
  assert.equal(other.length, 0);
  h.lift([gsd, plain]);
  assert.equal(got.at(-1), 0);
});

// ---- D1063: hammer-on, pull-off ----

test("D1063: a join up a hammer-on, down a pull-off, a set-and-release a pull-off; the same pitch or no note before a fresh pick", () => {
  assert.equal(lhOf(60, 62, false), "hammer");
  assert.equal(lhOf(62, 60, false), "pull");
  assert.equal(lhOf(60, 62, true), "pull");
  assert.equal(lhOf(62, 60, true), "pull");
  assert.equal(lhOf(60, 60, false), null);
  assert.equal(lhOf(60, 60, true), null);
  assert.equal(lhOf(undefined, 60, false), null);
  // the ring: entered past the pick, never past MAX_SKIP
  assert.equal(lhSkip(0), LEFT_HAND.minSkip);
  assert.equal(lhSkip(0.07), 0.07);
  assert.equal(lhSkip(9), LEFT_HAND.maxSkip);
  assert.equal(lhSkip(NaN), LEFT_HAND.minSkip);
  assert.ok(LEFT_HAND.hammer.db < 0 && LEFT_HAND.pull.db < 0, "softer than a pick");
});

// ---- D1064: the slide ----

test("D1064: a guitar's slide a quick glide settled early in the note, no fret steps; past a fifth a fresh pick", () => {
  for (let d = 1; d <= GUITAR_SLIDE_MAX; d++) {
    const g = guitarSlide(60, 60 + d, 400);
    assert.equal(g.kind, "glide");
    if (g.kind === "glide") assert.ok(g.tau <= settleTau(60, 60 + d, 400) + 1e-12 && g.tau <= 0.055);
  }
  assert.equal(guitarSlide(60, 60 + GUITAR_SLIDE_MAX + 1, 400).kind, "notes");
  // a quick note: still settled within its first part (D1018)
  const q = guitarSlide(64, 60, 150);
  assert.ok(q.kind === "glide" && q.tau * Math.log(400 / SETTLE_CENTS) <= 0.15 * 0.15 + 1e-9);
});

// ---- D1065: the amp, the stompboxes ----

test("D1065: the feedback never on a note too short to bloom; it grows with the lean; the octave only on a long note leaned far", () => {
  assert.deepEqual(bloomOf(1, BLOOM.delay - 0.01), { level: 0, octave: 0 });
  assert.deepEqual(bloomOf(0, 3), { level: 0, octave: 0 });
  assert.ok(bloomOf(1, 1).level > bloomOf(0.3, 1).level);
  assert.equal(bloomOf(1, 1).octave, 0);
  assert.ok(bloomOf(1, 2).octave > 0 && bloomOf(0.5, 2).octave === 0);
  assert.equal(stompOf(-1), "vibe");
  assert.equal(stompOf(1), "fuzz");
  assert.equal(stompOf(0), undefined);
  const c = fuzzCurve(9, 0.12);
  assert.ok(Math.abs(c[1024]) < 0.01 && Math.max(...c) <= 1 + 1e-6 && Math.min(...c) >= -1 - 1e-6);
});

// ---- D1065: the tilt reader ----

/** Gravity for the phone held sideways at `lean` degrees (0 flat face up, 90 upright facing the player) and turned `roll` degrees anticlockwise as the player sees it; `side` the landscape (+1 or -1); `ios` the inverted signs WebKit reports. */
function gravity(lean: number, roll: number, side = 1, ios = false): [number, number, number] {
  const r = (lean * Math.PI) / 180;
  const inPlane = 9.81 * Math.sin(r);
  const z = 9.81 * Math.cos(r);
  // in landscape the screen's "down" is along the device's x axis (side), turned by the roll about z
  const a = (side > 0 ? -Math.PI / 2 : Math.PI / 2) + (roll * Math.PI) / 180;
  const g: [number, number, number] = [inPlane * Math.sin(a), inPlane * Math.cos(a), z];
  return ios ? [-g[0], -g[1], -g[2]] : g;
}

test("D1065: the tilt: neutral where the piece starts; lean away from the player positive, the steering anticlockwise positive, either landscape, either browser", () => {
  for (const side of [1, -1])
    for (const ios of [false, true]) {
      const core = new TiltCore();
      let t = 0;
      for (let k = 0; k < 10; k++) core.feed((t += 16), ...gravity(50, 0, side, ios));
      assert.ok(core.ready && Math.abs(core.lean) < 1e-6 && Math.abs(core.roll) < 1e-6);
      for (let k = 0; k < 120; k++) core.feed((t += 16), ...gravity(30, 0, side, ios));
      assert.ok(Math.abs(core.lean - 20) < 1, `${side} ${ios} lean ${core.lean}`);
      for (let k = 0; k < 120; k++) core.feed((t += 16), ...gravity(50, 35, side, ios));
      assert.ok(Math.abs(core.roll - 35) < 1.5, `${side} ${ios} roll ${core.roll}`);
      assert.ok(Math.abs(core.lean) < 1.5);
      // a new piece: the neutral taken again where the phone is now
      core.retakeNeutral();
      core.feed((t += 16), ...gravity(50, 35, side, ios));
      assert.ok(Math.abs(core.roll) < 1e-6 && Math.abs(core.lean) < 1e-6);
    }
});

test("D1065: the gyroscope carries the reading at once whichever way the browser labels its axes", () => {
  for (const labels of ["standard", "swapped"] as const) {
    const core = new TiltCore();
    let t = 0;
    // a steady turn about the screen's axis (z): 90°/s for 0.4 s, read with its rate in degrees a second
    const rateZ = 90;
    const rot = labels === "standard" ? { alpha: rateZ, beta: 0, gamma: 0 } : { alpha: 0, beta: 0, gamma: rateZ };
    for (let k = 0; k < 60; k++) core.feed((t += 16), ...gravity(50, 0), { alpha: 0, beta: 0, gamma: 0 });
    let roll = 0;
    for (let k = 0; k < 120; k++) {
      roll += (rateZ * 16) / 1000;
      core.feed((t += 16), ...gravity(50, roll), rot);
    }
    assert.equal(core.source, "fused");
    assert.ok(Math.abs(Math.abs(core.roll) - Math.abs(wrapDeg(roll))) < 6, `${labels}: ${core.roll} vs ${roll}`);
  }
});
const wrapDeg = (d: number) => ((((d + 540) % 360) + 360) % 360) - 180;

test("D1065: LEAN continuous with a dead zone, one way only; STEER's stops with hysteresis (on only past 30°, off only back within 10°)", () => {
  assert.equal(leanValue(0), 0);
  assert.equal(leanValue(TILT.deadDeg), 0);
  assert.equal(leanValue(-25), 0, "toward the player: nothing");
  assert.ok(leanValue(TILT.deadDeg + 1) > 0 && leanValue(15) < leanValue(20));
  assert.equal(leanValue(TILT.fullDeg), 1);
  assert.equal(leanValue(80), 1);
  assert.equal(TILT.onDeg, 30);
  assert.equal(TILT.offDeg, 10);
  const s = new SteerStop();
  assert.equal(s.feed(25), 0, "a big turn short of the threshold: nothing");
  assert.equal(s.feed(31), -1, "anticlockwise past 30: left");
  assert.equal(s.feed(15), -1, "held while back to 15");
  assert.equal(s.feed(5), 0, "back within 10: off");
  assert.equal(s.feed(-31), 1, "clockwise past 30: right");
  assert.equal(s.feed(20), 0, "turned over to the other side at once: off (never the other stop without the turn)");
  assert.equal(s.feed(-25), 0);
  assert.equal(s.feed(-29), 0);
  assert.equal(s.feed(-31), 1, "clockwise past 30: right");
  assert.equal(s.feed(-11), 1);
  assert.equal(s.feed(-9), 0);
  // two thumbs playing: the phone's ordinary wobble never engages
  for (let k = 0; k < 500; k++) assert.equal(s.feed(18 * Math.sin(k / 7)), 0);
});

// ---- The flags ----

test("D1061/D1066: the flags off by default (the Lab, old takes); on, only a guitar's notes are the guitarist's, PSYCH's alone reach the amp", () => {
  assert.equal(MECH_DEFAULTS.guitar, false);
  assert.equal(MECH_DEFAULTS.tilt, false);
  const clean = { sample: "rockGuitar" } as never;
  const moog = { sample: undefined } as never;
  assert.equal(guitarNow(clean), false);
  lockMech({ guitar: true, tilt: true });
  try {
    assert.equal(guitarNow(clean), true);
    assert.equal(guitarNow(moog), false);
    setPreset("krautrock");
    assert.equal(ampNow(clean), true);
    assert.deepEqual(guitarPlay(clean), { amp: true }, "no tilt read: no stompbox");
    assert.deepEqual(guitarPlay(clean, { lh: "hammer", skip: 0.05 }), { amp: true, lh: "hammer", skip: 0.05 });
    setPreset("abbeyRoad");
    assert.equal(ampNow(clean), false);
    assert.deepEqual(guitarPlay(clean), {});
  } finally {
    lockMech({ guitar: false, tilt: false });
    resetMech();
  }
  assert.equal(MECH.guitar, false);
});

// ---- The engine (the fake context) ----

const ctxOf = installFakeAudio(5, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 4 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;
async function guitarNote(play: Record<string, unknown>) {
  setPreset("krautrock");
  const chip = new Chip();
  await chip.prepare([64, 60], [64]);
  const ctx = ctxOf();
  chip.note(60, 0, 0.05, voicing(2, 5, true));
  const before = new Set(ctx.nodes);
  const sd = chip.note(64, 1, 2, voicing(2, 5, true), { lead: true, touch: 0.5, ...play });
  const made = [...ctx.nodes].filter((x) => !before.has(x));
  return { sd, made };
}
const kinds = (made: FakeNode[]) => made.map((x) => x.kind + ("type" in x ? `:${(x as unknown as { type: string }).type}` : "")).sort();

test("D1061/D1066: flag off (no Play.guitar): PSYCH's guitar note exactly as before (D1014's finger vibrato, no guitar answer)", async () => {
  const a = await guitarNote({});
  const b = await guitarNote({});
  assert.equal(a.sd.guitar, undefined);
  assert.deepEqual(kinds(a.made), kinds(b.made));
  // D1014's vibrato LFO there (an oscillator), as ever
  assert.ok(kinds(a.made).some((k) => k.startsWith("Oscillator") || k.toLowerCase().includes("osc")));
});

test("D1061-D1065: on (Play.guitar): the guitar stage, the hard pick and the lean answered, the stompboxes built; no vibrato LFO (the bend instead)", async () => {
  const off = await guitarNote({});
  const on = await guitarNote({ guitar: { amp: true } });
  assert.ok(on.sd.guitar, "a guitar note answers the hands");
  const osc = (m: FakeNode[]) => kinds(m).filter((k) => k.toLowerCase().includes("osc")).length;
  assert.ok(osc(on.made) < osc(off.made), "D1014's finger vibrato replaced by the bend");
  on.sd.guitar!({ kind: "hard" });
  on.sd.guitar!({ kind: "lean", v: 1 });
  on.sd.bend(30);
  const count = (m: FakeNode[], f: (k: string) => boolean) => kinds(m).filter(f).length;
  const plain = await guitarNote({ guitar: {} });
  const fuzz = await guitarNote({ guitar: { stomp: "fuzz" } });
  assert.equal(count(fuzz.made, (k) => k.includes("shaper")) - count(plain.made, (k) => k.includes("shaper")), 1);
  const vibe = await guitarNote({ guitar: { stomp: "vibe" } });
  assert.equal(count(vibe.made, (k) => k.endsWith(":allpass")) - count(plain.made, (k) => k.endsWith(":allpass")), 4);
  const hammer = await guitarNote({ legato: true, guitar: { lh: "hammer", skip: 0.08 } });
  assert.ok(hammer.sd.guitar);
});

test("D1061-D1065 (D508): every gesture's loudness on the player's guitar within ±1.5 LU of today's through the phone model (measured)", async () => {
  const { readFileSync } = await import("node:fs");
  const m = JSON.parse(readFileSync(new URL("./fixtures/d1061-guitar-levels.json", import.meta.url), "utf8")) as { lu: Record<string, { phone: number; full: number }> };
  for (const g of ["clean", "fuzz"])
    for (const k of ["neck", "bridge", "hard", "hammer", "pull", "vibe", "fuzz", "bloom", "bloom-half"]) {
      const v = m.lu[`${g}-${k}`];
      assert.ok(v, `${g}-${k}`);
      assert.ok(Math.abs(v.phone) <= 1.5, `${g}-${k} ${v.phone}`);
    }
});

test("D1066: GUITAR & TILT: on for every player by default; only an unlocked device that switched it off goes without", async () => {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } as Storage;
  const { applyGuitarTilt, guitarTiltStored, saveGuitarTilt } = await import("../src/bench/new-mech.ts");
  const { setUnlocked } = await import("../src/bench/unlock.ts");
  try {
    assert.equal(guitarTiltStored(), true);
    setUnlocked(false);
    saveGuitarTilt(false);
    assert.equal(applyGuitarTilt(), true);
    assert.ok(MECH.guitar && MECH.tilt);
    lockMech({ guitar: false, tilt: false });
    resetMech();
    setUnlocked(true);
    assert.equal(applyGuitarTilt(), false);
    assert.ok(!MECH.guitar && !MECH.tilt);
    saveGuitarTilt(true);
    assert.equal(applyGuitarTilt(), true);
  } finally {
    lockMech({ guitar: false, tilt: false });
    resetMech();
    setUnlocked(false);
  }
});
