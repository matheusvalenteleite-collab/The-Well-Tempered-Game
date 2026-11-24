/**
 * D1055-D1059, THE BOW (MECH.bow): the pure model (src/touch/bow.ts: the speed reading, speed to colour, the attack, the turns and
 * the joins, the safety rules), the glue's switch (bowing.ts), the recordings' plan, the engine on the fake context (a bowed note's
 * layers and answers; MECH.bow off, every note as before) and the developer view's switch (new-mech.ts).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeAudioContext, FakeNode, FakeParam, installFakeAudio } from "./fake-audio.ts";
import { Backlash, BOW, BOW_ATTACK, BOW_TURN, bowChangeShape, BowTracker, colourOf, colourStep, joinOf, layerMix, MIN_HOLD_S, SpeedEstimator, turnAudibility } from "../src/touch/bow.ts";
import { STRING_BOW_CHANGE, setPreset } from "../src/touch/sound.ts";
import { BOW_LAYER_GAIN, SAMPLED, bowLayersWanted, bowSetsOf, planFor, setBowLayersWanted } from "../src/touch/sampled.ts";
import { Chip, voicing, type Sounding } from "../src/touch/chip.ts";
import { MECH, MECH_DEFAULTS, lockMech, resetMech, setMech } from "../src/bench/mechanics.ts";
import { BowHand, bowedNow } from "../src/bench/bowing.ts";

const BAR_PX = 200;
/** A thumb moving at `bps` bar widths a second from `t0` for `ms`, a sample every 16 ms (positions in px). */
function bowAt(tr: BowTracker, t0: number, pos0: number, bps: number, ms: number, dir = 1) {
  let t = t0;
  let pos = pos0;
  const evs = [];
  while (t < t0 + ms) {
    t += 16;
    pos += dir * bps * BAR_PX * 0.016;
    evs.push(...tr.move(t, pos));
  }
  return { t, pos, evs };
}

// ---- The speed reading (bow test 2's) ----

test("D1055: the backlash filter ignores a wobble under h, follows beyond it, a reversal only after 2h back", () => {
  const b = new Backlash(0.4);
  b.push(10);
  assert.equal(b.push(10.3).moved, false);
  const r = b.push(11);
  assert.equal(r.moved, true);
  assert.equal(r.reversed, false);
  assert.equal(b.push(10.4).moved, false); // 0.2 back: inside the play
  const back = b.push(9.5);
  assert.equal(back.moved, true);
  assert.equal(back.reversed, true);
});

test("D1055: the adaptive-window speed: a steady stroke read at its speed; a stopped bow decays to nothing", () => {
  const e = new SpeedEstimator();
  for (let t = 0; t <= 400; t += 16) e.push(t, (t / 1000) * 100);
  assert.ok(Math.abs(e.estimate(400) - 100) < 5, `${e.estimate(400)}`);
  assert.ok(e.estimate(700) < 5);
  assert.equal(e.estimate(2000), 0);
});

// ---- Speed to colour ----

test("D1056: speed to colour: still today's (0); slow the lightest; an ordinary bow today's; faster fuller, to the fullest", () => {
  assert.equal(colourOf(0), 0);
  assert.equal(colourOf(BOW.still), 0);
  assert.ok(Math.abs(colourOf(BOW.slow) + 1) < 1e-9);
  assert.ok(Math.abs(colourOf(BOW.normal)) < 1e-9);
  assert.equal(colourOf(BOW.full), 1);
  assert.equal(colourOf(50), 1);
  assert.ok(colourOf(1) > 0 && colourOf(1) < 1);
  assert.ok(colourOf(0.3) < 0);
  // continuous: no step anywhere on the way
  for (let s = 0; s < 3; s += 0.005) assert.ok(Math.abs(colourOf(s + 0.005) - colourOf(s)) < 0.1, `${s}`);
});

test("D1056: the layers at equal power, the mf alone at colour 0 (exactly today's), one side at a time", () => {
  assert.deepEqual(layerMix(0), { pp: 0, mf: 1, ff: 0 });
  assert.deepEqual(layerMix(NaN), { pp: 0, mf: 1, ff: 0 });
  for (const c of [-1, -0.5, -0.1, 0.1, 0.5, 1]) {
    const m = layerMix(c);
    assert.ok(Math.abs(m.pp ** 2 + m.mf ** 2 + m.ff ** 2 - 1) < 1e-9, `${c}`);
    assert.ok(c < 0 ? m.ff === 0 : m.pp === 0);
  }
  assert.ok(layerMix(1).ff > 0.999 && layerMix(-1).pp > 0.999);
});

test("D1056: the colour follows quickly and eases back to today's slowly; a stopped bow returns to 0, never past it", () => {
  let c = 0;
  for (let i = 0; i < 10; i++) c = colourStep(c, 1, 0.016);
  assert.ok(c > 0.9);
  const at = c;
  c = colourStep(c, 0, 0.1);
  assert.ok(c < at && c > 0.5, `${c}`); // easing over EASE_TAU, not at once
  for (let i = 0; i < 200; i++) c = colourStep(c, 0, 0.016);
  assert.ok(Math.abs(c) < 0.01 && c >= 0);
});

test("D1056: a held note bowed steadily: fuller when fast, lighter when slow; back to today's when the thumb stops; never under MIN_HOLD_S", () => {
  const tr = new BowTracker(0, 100, BAR_PX);
  // under MIN_HOLD_S nothing (the normal stroke), however fast
  const a = bowAt(tr, 0, 100, 1.2, 60);
  assert.equal(tr.colour(a.t), 0);
  const b = bowAt(tr, a.t, a.pos, 1.2, 500);
  assert.ok(tr.colour(b.t) > 0.3, `${tr.colour(b.t)}`);
  const tr2 = new BowTracker(0, 100, BAR_PX);
  const c = bowAt(tr2, 0, 100, 0.15, 900);
  assert.ok(tr2.colour(c.t) < -0.4, `${tr2.colour(c.t)}`);
  // stopped: the colour eases back to today's (the note never dies: only the colour moves)
  let t = c.t;
  for (let i = 0; i < 150; i++) (t += 16), tr2.tick(t), tr2.colour(t);
  assert.ok(Math.abs(tr2.colour(t)) < 0.02, `${tr2.colour(t)}`);
});

// ---- The attack ----

test("D1057: the attack: a still landing today's (no event); a flick at once a bite; a flick lifted at once a spiccato; a gentle start soft", () => {
  const still = new BowTracker(0, 100, BAR_PX);
  let t = 0;
  for (; t < 200; t += 16) assert.deepEqual(still.tick(t), []);
  assert.equal(still.attack, "still");
  assert.equal(still.lift(t), null);
  const flick = new BowTracker(0, 100, BAR_PX);
  const f = bowAt(flick, 0, 100, 3, 32);
  assert.ok(f.evs.some((e) => e.kind === "bite"));
  assert.equal(flick.attack, "bite");
  assert.equal(flick.lift(120), "spicc");
  assert.equal(flick.lift(BOW_ATTACK.spiccLiftMs + 50), null); // held on: the bite only
  // a fast stroke only after the attack window: no bite (the attack was today's)
  const late = new BowTracker(0, 100, BAR_PX);
  for (t = 0; t < 100; t += 16) late.tick(t);
  bowAt(late, 100, 100, 3, 100);
  assert.equal(late.attack, "still");
  // a gentle acceleration after a still landing: the soft start
  const soft = new BowTracker(0, 100, BAR_PX);
  for (t = 0; t < 60; t += 16) soft.tick(t);
  const s = bowAt(soft, 60, 100, 0.3, 200);
  assert.ok(s.evs.some((e) => e.kind === "soft"));
  assert.equal(soft.attack, "soft");
});

// ---- Turns and joins ----

test("D1058: a turn's audibility by its stall: quick nearly seamless, a stall today's join (STRING_BOW_CHANGE)", () => {
  assert.equal(turnAudibility(0), 0);
  assert.equal(turnAudibility(BOW_TURN.quickMs), 0);
  assert.equal(turnAudibility(BOW_TURN.stallMs), 1);
  assert.equal(turnAudibility(5000), 1);
  const q = bowChangeShape(0);
  assert.ok(q.floor >= 0.89 && q.still === 0 && q.accentDb === 0); // under 1 dB of dip
  const full = bowChangeShape(1);
  assert.ok(Math.abs(full.floor - STRING_BOW_CHANGE.floor) < 1e-9);
  assert.equal(full.still, STRING_BOW_CHANGE.still);
  assert.equal(full.accentDb, STRING_BOW_CHANGE.accentDb);
  assert.ok(full.accentDb <= 1.5); // D508
});

test("D1058: one thumb reversing on a held note: a bow change on it (no new note), as audible as its stall", () => {
  const tr = new BowTracker(0, 100, BAR_PX);
  const a = bowAt(tr, 0, 100, 1, 300);
  const q = bowAt(tr, a.t, a.pos, 1, 200, -1);
  const ch = q.evs.filter((e) => e.kind === "change");
  assert.equal(ch.length, 1);
  assert.ok(ch[0].kind === "change" && ch[0].aud < 0.2, JSON.stringify(ch));
  // a stall at the far end, then back: a fresh-attack change
  let t = q.t;
  for (let i = 0; i < 20; i++) (t += 16), tr.tick(t);
  const r = bowAt(tr, t, q.pos, 1, 200, 1);
  const ch2 = r.evs.filter((e) => e.kind === "change");
  assert.ok(ch2.length === 1 && ch2[0].kind === "change" && ch2[0].aud === 1, JSON.stringify(ch2));
  assert.equal(tr.changes, 2);
});

test("D1058: a join's bow: still given way today's; moving, the same way along each bar a slur, the other way a bow change; no move a stall's", () => {
  const moving = { moving: true, dir: 1 as const, stillMs: 0, colour: 0.4 };
  assert.equal(joinOf(null, 1, 0).kind, "today");
  assert.equal(joinOf({ ...moving, moving: false }, 1, 0).kind, "today");
  assert.equal(joinOf(moving, 0, 10).kind, "pending");
  assert.equal(joinOf(moving, 1, 16).kind, "carry");
  const quick = joinOf(moving, -1, 16);
  assert.ok(quick.kind === "change" && quick.aud === 0);
  const slow = joinOf({ ...moving, stillMs: 150 }, -1, 100);
  assert.ok(slow.kind === "change" && slow.aud === 1);
  const none = joinOf(moving, 0, BOW_TURN.joinDecideMs);
  assert.ok(none.kind === "change" && none.aud === 1);
});

test("D1058: the bars mirrored: both thumbs read toward the strong side as +; a landing's settle is no direction", () => {
  const tr = new BowTracker(0, 100, BAR_PX);
  tr.move(16, 101.5);
  assert.equal(tr.away, 0);
  tr.move(32, 104);
  assert.equal(tr.away, 1);
});

test("D1055: the glue: a carried join sends no change; an opposite one sends a change; the colour sent to the notes", () => {
  const got: unknown[] = [];
  const sd = { stop() {}, bend() {}, bow: (c: unknown) => got.push(c) } as unknown as Sounding;
  const carry = new BowHand(0, 100, BAR_PX, { moving: true, dir: 1, stillMs: 0, colour: 0.3 });
  assert.equal(carry.carried, true);
  assert.equal(carry.start, 0.3);
  carry.move(16, 104, [sd]);
  assert.ok(!got.some((c) => (c as { kind: string }).kind === "change"));
  got.length = 0;
  const turn = new BowHand(0, 100, BAR_PX, { moving: true, dir: 1, stillMs: 0, colour: 0.3 });
  turn.move(16, 96, [sd]);
  assert.ok(got.some((c) => (c as { kind: string }).kind === "change"));
  const today = new BowHand(0, 100, BAR_PX, { moving: false, dir: 1, stillMs: 400, colour: 0 });
  assert.equal(today.carried, false);
  assert.equal(today.start, 0);
});

// ---- The switch: off everywhere but the New Lab and the developer view's NEW MECHANICS ----

test("D1055: MECH.bow off by default; bowedNow only with it on and STRING CONSORT; a page's lock survives a reset", () => {
  assert.equal(MECH_DEFAULTS.bow, false);
  assert.equal(MECH.bow, false);
  setPreset("stringConsort");
  assert.equal(bowedNow(), false);
  setMech({ bow: true });
  assert.equal(bowedNow(), true);
  setPreset("baroqueBand");
  assert.equal(bowedNow(), false);
  resetMech();
  assert.equal(MECH.bow, false);
});

test("D1056: the bow's recordings planned only while wanted: the violin, viola and cello, the same pitches as the mf", () => {
  assert.equal(bowLayersWanted(), false);
  const vn = SAMPLED.consortViolinSolo;
  const off = planFor(vn, [67, 72, 79], [72]);
  assert.ok(!off.some((e) => bowSetsOf(vn).includes(e.set)));
  setBowLayersWanted(true);
  try {
    const on = planFor(vn, [67, 72, 79], [72]);
    const main = on.find((e) => e.set === vn.set)!;
    assert.deepEqual(on.find((e) => e.set === "violinSoloPp")?.notes, main.notes);
    assert.deepEqual(on.find((e) => e.set === "violinSoloFf")?.notes, main.notes);
    for (const id of ["consortViolinSolo", "consortCelloSolo", "consortViola"] as const) assert.equal(bowSetsOf(SAMPLED[id]).length, 3, id);
  } finally {
    setBowLayersWanted(false);
  }
  assert.ok(BOW_LAYER_GAIN > 1.5 && BOW_LAYER_GAIN < 1.6);
});

// ---- The engine (the fake context) ----

const ctxOf = installFakeAudio(5, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 4 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;

async function consortNote(bow: number | undefined) {
  setPreset("stringConsort");
  const chip = new Chip();
  await chip.prepare([76, 64, 88], [76]);
  const ctx = ctxOf();
  chip.note(60, 0, 0.05, voicing(0, 3, true));
  const before = new Set(ctx.nodes);
  const sd = chip.note(76, 1, 2, voicing(0, 3, true), { lead: true, legato: false, touch: 0.5, ...(bow === undefined ? {} : { bow }) });
  const made = [...ctx.nodes].filter((x) => !before.has(x));
  return { sd, made, ctx };
}
const sources = (made: FakeNode[]) => made.filter((x) => "playbackRate" in x).length;
const kinds = (made: FakeNode[]) => made.map((x) => x.kind + ("type" in x ? `:${(x as unknown as { type: string }).type}` : "")).sort();

test("D1055: MECH.bow off: a STRING CONSORT note exactly as before (no layers, no bow answer); the bow's layers not loaded", async () => {
  const off = await consortNote(undefined);
  assert.equal(off.sd.bow, undefined);
  assert.equal(sources(off.made), 1);
  // D1016's contact point still there (its high shelf), and a sway still moves it
  assert.ok(kinds(off.made).some((k) => k.endsWith(":highshelf")));
});

test("D1055/D1056: a bowed note: the pp and ff beside the mf (silent at colour 0), D1016's shelf gone; the colour, the bite, a bow change", async () => {
  setBowLayersWanted(true);
  try {
    const on = await consortNote(0);
    assert.ok(on.sd.bow, "a bowed note answers its bow");
    assert.equal(sources(on.made), 3);
    const gains = on.made.filter((x) => "gain" in x && x.kind.toLowerCase().includes("gain")) as unknown as { gain: FakeParam }[];
    // at colour 0: the mf at 1, the two layers silent: today's sound
    const vals = gains.map((g) => g.gain.value);
    assert.ok(vals.filter((v) => v === 0).length >= 2);
    const evs = () => gains.reduce((n, g) => n + g.gain.events.length, 0);
    const e0 = evs();
    on.sd.bow!({ kind: "colour", c: 0.8 });
    assert.ok(evs() > e0);
    const e1 = evs();
    on.sd.bow!({ kind: "change", aud: 1 });
    on.sd.bow!({ kind: "bite" });
    assert.ok(evs() > e1);
    // the contact point's shelf is not on a bowed note (the bow replaces it)
    const off = await consortNote(undefined);
    assert.equal(kinds(on.made).filter((k) => k.endsWith(":highshelf")).length, kinds(off.made).filter((k) => k.endsWith(":highshelf")).length - 1);
  } finally {
    setBowLayersWanted(false);
  }
});

test("D1059: the developer view's NEW MECHANICS: off unless kept on AND the device unlocked", async () => {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } as Storage;
  const { applyNewMech, newMechStored, saveNewMech } = await import("../src/bench/new-mech.ts");
  const { setUnlocked } = await import("../src/bench/unlock.ts");
  assert.equal(newMechStored(), false);
  saveNewMech(true);
  setUnlocked(false);
  assert.equal(applyNewMech(), false);
  assert.equal(MECH.bow, false);
  setUnlocked(true);
  assert.equal(applyNewMech(), true);
  assert.equal(MECH.bow, true);
  // locked on: a reset (the Lab's presets) keeps it
  resetMech();
  assert.equal(MECH.bow, true);
  lockMech({ bow: false });
  resetMech();
  setBowLayersWanted(false);
  setUnlocked(false);
  saveNewMech(false);
  assert.equal(MIN_HOLD_S > 0, true);
});

test("D1056: the bow's colour on the player's voice: through the phone model within ±1.5 LU of today's at every colour, every recording (D508)", async () => {
  const { readFileSync } = await import("node:fs");
  const m = JSON.parse(readFileSync(new URL("./fixtures/d1056-bow-layers.json", import.meta.url), "utf8")) as { sets: Record<string, { notes: number; colour: Record<string, [number, number, number]> }> };
  assert.deepEqual(Object.keys(m.sets).sort(), ["celloSolo", "violaSolo", "violinSolo"]);
  for (const [set, s] of Object.entries(m.sets))
    for (const c of ["-1", "-0.5", "0.5", "1"]) {
      const [lo, , hi] = s.colour[`ph${c}`];
      assert.ok(lo >= -1.5 && hi <= 1.5, `${set} at ${c}: ${lo}..${hi} LU`);
    }
});
