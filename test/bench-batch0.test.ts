/**
 * D249 (ROADMAP Batch 0): a slip costs a quarter of the run, the multiplier only a second slip close
 * to the one before; a touch the system takes back is not judged; the sound's ceiling (iPhone
 * clipping); the organ withdrawn.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio } from "./fake-audio.ts";
import { CEILING, Chip, organSwell, PLENO_SCALE, ROOM_S, softClipCurve, VOICE_CAP, voicing } from "../src/touch/chip.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { FAMILIES, ORGAN_SAMPLED, presetById, PRESETS, setPreset } from "../src/touch/sound.ts";
import { PIECE_SOUND, soundFor } from "../src/touch/piece-sound.ts";
import { ProtoGame, slipLoss, SLIP_NEAR } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";

const ctxOf = installFakeAudio(5, true);

function fakeChip(clock: { t: number }, stops: { n: number }) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => void stops.n++, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
}

/** A computer HIGHWAY (keys, TIMING) on the C minor fugue's alto. */
function game() {
  const clock = { t: 0 };
  const stops = { n: 0 };
  const g = new ProtoGame(fugueById("wtc1f02"), 1, 0, protoById("keys"), { bpm: 54, legato: false, easy: "timing" }, fakeChip(clock, stops));
  const to = (t: number) => {
    while (clock.t < t - 0.02) (clock.t += 0.02), g.step();
    clock.t = Math.max(clock.t, t);
    g.step();
  };
  return { g, clock, stops, to };
}
type Inside = { slip(): void; sinceSlip: number };

test("D249: a slip costs the streak and the combo a quarter (at least 4, never below 0)", () => {
  assert.deepEqual([0, 3, 4, 10, 16, 20, 40, 100].map(slipLoss), [0, 0, 0, 6, 12, 15, 30, 75]);
  const { g } = game();
  g.streak = g.combo = 40;
  (g as unknown as Inside).slip();
  assert.equal(g.streak, 30);
  assert.equal(g.combo, 30);
  assert.equal(g.slips, 1, "counted all the same");
});

test("D249: the multiplier falls only on a second slip within 8 notes of the one before", () => {
  const { g } = game();
  const inside = g as unknown as Inside;
  g.mult = 4;
  g.streak = 30;
  inside.slip();
  assert.equal(g.mult, 4, "a first slip keeps it");
  inside.slip();
  assert.equal(g.mult, 3, "a second right after costs a step");
  inside.sinceSlip = SLIP_NEAR - 1;
  inside.slip();
  assert.equal(g.mult, 2, "seven notes after: still close");
  inside.sinceSlip = SLIP_NEAR;
  inside.slip();
  assert.equal(g.mult, 2, "eight notes after: a fresh slip");
  // A right note counts toward the distance.
  const { g: h, to } = game();
  const heads = h.notes.map((_, i) => i).filter((i) => !h.notes[i].ride && !(i > 0 && h.notes[i - 1].on === h.notes[i].on));
  const first = h.notes[heads[0]];
  to(h.timeAt(first.on));
  h.keyDown(1, { velocity: 0.5 }, performance.now());
  assert.equal(first.state, "hit");
  assert.equal((h as unknown as Inside).sinceSlip, Infinity, "no slip yet");
});

test("D249: a touch the system takes back (pointercancel) stops its note, unjudged: no SHORT", () => {
  const probe = game().g;
  const heads = probe.notes.map((_, i) => i).filter((i) => !probe.notes[i].ride && !(i > 0 && probe.notes[i - 1].on === probe.notes[i].on));
  const i = heads.find((j) => probe.timeAt(probe.notes[j].on + probe.notes[j].dur) - probe.timeAt(probe.notes[j].on) >= 0.4 && probe.joinedAt(heads[heads.indexOf(j) + 1]))!;
  const n = probe.notes[i];
  const t0 = probe.timeAt(n.on);
  const len = probe.timeAt(n.on + n.dur) - t0;
  for (const cancelled of [false, true]) {
    const { g, to, stops } = game();
    to(t0);
    g.keyDown(1, { velocity: 0.5 }, performance.now());
    assert.equal(g.notes[i].state, "hit");
    to(t0 + len * 0.2);
    const before = stops.n;
    g.up(1, performance.now(), cancelled);
    assert.ok(stops.n > before, "its sound stopped");
    if (cancelled) {
      assert.equal(g.flash, null, "no verdict on its end");
      assert.deepEqual([g.art.held, g.art.heldOf], [0, 0]);
    } else {
      assert.equal(g.flash?.text, "SHORT");
      assert.deepEqual([g.art.held, g.art.heldOf], [0, 1]);
    }
  }
});

test("D249: the master chain ends in a tanh soft clip (4x) at about 0.95; the limiter lower; the drive unwired outside CON FUOCO", () => {
  setPreset("harpsichordSampled");
  const chip = new Chip();
  const ctx = ctxOf();
  const ceiling = chip.ceiling as unknown as { oversample: string; curve: Float32Array; targets: unknown[] };
  assert.equal(ceiling.oversample, "4x");
  assert.ok(ceiling.targets.includes(ctx.destination), "the ceiling feeds the output");
  const curve = softClipCurve();
  assert.ok(Math.max(...curve.map(Math.abs)) <= CEILING);
  assert.ok(curve[curve.length - 1] > 0.9, "the ceiling near 0.95");
  // Near silence unity gain (the input pre-scaled by a half): the curve's slope there about 2.
  const mid = (curve.length - 1) / 2;
  const slope = (curve[Math.ceil(mid) + 1] - curve[Math.floor(mid) - 1]) / ((Math.ceil(mid) + 1 - (Math.floor(mid) - 1)) * (2 / (curve.length - 1)));
  assert.ok(Math.abs(slope - 2) < 0.01, `slope ${slope}`);
  const comps = [...ctx.nodes].filter((x) => x.kind === "compressor") as unknown as { threshold: { value: number }; attack: { value: number }; release: { value: number } }[];
  assert.ok(comps.some((c) => c.threshold.value === -10 && c.attack.value === 0.003 && c.release.value === 0.25), "the limiter");
  assert.equal(chip.driving, false);
  chip.zone("fuoco");
  assert.equal(chip.driving, true);
  chip.zone(null);
  // A phone's room shorter.
  const room = [...ctx.nodes].find((x) => x.kind === "convolver") as unknown as { buffer: { duration: number } };
  assert.ok(Math.abs(room.buffer.duration - ROOM_S.phone) < 0.01);
});

test("D249: the volume reaches the notes' room sends", () => {
  setPreset("harpsichordSampled");
  const chip = new Chip();
  chip.setVolume(0.5);
  const sends = (chip as unknown as { sends: { gain: { value: number } } }).sends;
  assert.equal(sends.gain.value, 0.5);
  chip.setVolume(1);
  assert.equal(sends.gain.value, 1);
});

test("D249: the organ's swell bounded, ORGANO PLENO scaled, and on a phone the lower cap with the pleno's pipes counted", async () => {
  assert.equal(organSwell(5), 1.4);
  assert.equal(organSwell(-1), 0.05);
  assert.equal(organSwell(0.8), 0.8);
  assert.ok(Math.abs(PLENO_SCALE * (1 + 0.45 + 0.5) - 1.39) < 0.02);
  setPreset(ORGAN_SAMPLED);
  const chip = new Chip();
  const ctx = ctxOf();
  assert.equal(chip.cap, VOICE_CAP.phoneSustained);
  await chip.prepare([48, 60, 72]);
  const v = voicing(1, 4);
  chip.note(60, ctx.currentTime, 2, v, { lead: true, pleno: true });
  assert.equal(chip.sounding(), 3, "the note and its two extra pipes");
  setPreset("harpsichordSampled");
  assert.equal(chip.cap, VOICE_CAP.phone, "a plucked sound keeps the phone's cap");
});

test("D249: the organ out: no piece opens on it, the players cannot choose it, a stored choice opens on the harpsichord", () => {
  assert.ok(!Object.values(PIECE_SOUND).includes("organSampled"));
  // D275: Book II's 22 now on strings; its 2 on the harpsichord.
  for (const id of ["wtc2f02", "bwv1080-14"]) assert.equal(PIECE_SOUND[id], "harpsichordSampled", id);
  // D266: Book I's stile antico fugues now on strings (recorded).
  for (const id of ["wtc1f01", "wtc1f22"]) assert.equal(PIECE_SOUND[id], "stringsReal", id);
  assert.ok(!PRESETS.some((p) => p.id === "organSampled"));
  assert.ok(!FAMILIES.some((f) => f.presets.some((p) => p.id === "organSampled")));
  assert.equal(presetById("organSampled").id, "harpsichordSampled");
  assert.equal(soundFor("wtc2f22", { wtc2f22: "organSampled" }, "bossa"), "harpsichordSampled");
});
