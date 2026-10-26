/**
 * D308: a touched note let go is silent at once, on the speaker as in BLUETOOTH MODE (the owner: "the notes
 * keep ringing in the player's voice even when they let it go. staccato has become impossible"). On the
 * fake audio graph (fake-audio.ts FakeParam.valueAt), every sound (PRESETS), every way the player's note
 * is struck (plain, joined, tied, the piano's envelope, the subject's layers) is down 40 dB within 120 ms
 * of the release; a whole run in the game cuts every sound a touch made as it lets go.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeAudioContext, FakeNode, FakeParam, FakeSource, installFakeAudio } from "./fake-audio.ts";
import { Chip, voicing, type Play } from "../src/touch/chip.ts";
import { PRESETS, setPreset } from "../src/touch/sound.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { SubjectCues } from "../src/touch/subject-fx.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";

const ctxOf = installFakeAudio(5, true);
// The recordings four seconds long (the fake's tenth of a second would end before the release).
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 4 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;

/** A note's level at t: over its sources sounding, the product of the gains on the way to `bus`, summed. */
function envelope(made: FakeNode[], bus: unknown, t: number): number {
  const path = (n: FakeNode, depth: number): number => {
    if (n === bus) return 1;
    if (depth > 24) return 0;
    let best = 0;
    for (const to of n.targets) {
      if (!(to instanceof FakeNode)) continue;
      const g = to.kind === "gain" ? Math.abs((to.gain as FakeParam).valueAt(t)) : 1;
      if (g > 0) best = Math.max(best, g * path(to, depth + 1));
    }
    return best;
  };
  let sum = 0;
  // (A recording as long as it is let sound: the fake's are a tenth of a second.)
  for (const n of made) if (n instanceof FakeSource && n.startAt !== null && n.startAt <= t && t < (n.kind === "buffer" && n.stopCall < Infinity ? n.stopCall : n.stopAt)) sum += path(n, 0);
  return sum;
}

const HOLD_MAX = 8;
const DOWN = 1;
const UP = 1.1;
const WITHIN = 0.12;
/** -40 dB. */
const QUIET = 0.01;

/** Strikes a note as the game strikes a touch's (HOLD_MAX, the player's), lets it go 0.1 s later; its level's peak and its level 120 ms after the release. */
async function touch(presetId: string, play: Play, midi = 64) {
  setPreset(presetId);
  const chip = new Chip();
  await chip.prepare([midi, midi - 12, midi + 12], [midi]);
  const ctx = ctxOf();
  chip.note(60, 0, 0.05, voicing(0, 3, true));
  const before = new Set(ctx.nodes);
  const sd = chip.note(midi, DOWN, HOLD_MAX, voicing(0, 3, true), { lead: true, ...play });
  const made = [...ctx.nodes].filter((x) => !before.has(x));
  ctx.advance(UP);
  sd.stop();
  let peak = 0;
  for (let t = DOWN; t < UP; t += 0.002) peak = Math.max(peak, envelope(made, ctx.destination, t));
  return { peak, after: envelope(made, ctx.destination, UP + WITHIN), made, chip };
}

const WAYS: [string, Play][] = [
  ["plain", { legato: false }],
  ["joined (legato)", { legato: true, from: 62 }],
  ["the piano's envelope", { envelope: "piano", legato: false }],
  ["tied (D302)", { legato: false, tie: 0.08 }],
  ["detached (D304)", { legato: false, apart: true }],
];

for (const p of PRESETS)
  test(`D308: ${p.name}: a touch let go after 0.1 s is 40 dB down within 120 ms, however struck`, async () => {
    for (const [way, play] of WAYS) {
      const r = await touch(p.id, play);
      assert.ok(r.peak > 0, `${way}: it sounded`);
      assert.ok(r.after < r.peak * QUIET, `${p.id}, ${way}: ${(20 * Math.log10(r.after / r.peak)).toFixed(1)} dB 120 ms after the release`);
    }
  });

test("D308: the subject's layers (h.fx) on a touched note stop with it", async () => {
  const f = fugueById("wtc1f22");
  const cues = new SubjectCues(f);
  const e = f.entries[0];
  const sn = cues.note(e.voice, e.notes[0][0])!;
  let tested = 0;
  for (const p of PRESETS) {
    setPreset(p.id);
    const chip = new Chip();
    await chip.prepare([e.notes[0][2]]);
    const ctx = ctxOf();
    chip.note(60, 0, 0.05, voicing(0, 5, true));
    const before = new Set(ctx.nodes);
    const { SubjectSound } = await import("../src/touch/subject-fx.ts");
    const subj = new SubjectSound(f);
    const layers = subj.layers(chip, sn, e.notes[0][2], DOWN, 1, voicing(0, 5, true), 1);
    const made = [...ctx.nodes].filter((x) => !before.has(x));
    if (!layers.length) continue;
    ctx.advance(UP);
    for (const l of layers) l.stop();
    let peak = 0;
    for (let t = DOWN; t < UP; t += 0.002) peak = Math.max(peak, envelope(made, ctx.destination, t));
    if (peak === 0) continue;
    const after = envelope(made, ctx.destination, UP + WITHIN);
    tested++;
    assert.ok(after < peak * QUIET, `${p.id}: the layers ${(20 * Math.log10(after / peak)).toFixed(1)} dB 120 ms after the release`);
  }
  assert.ok(tested > 0, "some sound has layers");
});

// ---- In the game (wired, the speaker): every sound a touch makes is cut as it lets go.

interface Rec {
  midi: number;
  at: number;
  asked: number;
  stopAt?: number;
}
function fakeChip(clock: { t: number }) {
  const notes: Rec[] = [];
  const chip = {
    ctx: {
      get currentTime() {
        return clock.t;
      },
    },
    heard: () => clock.t,
    visual: 0,
    note: (midi: number, at: number) => {
      const r: Rec = { midi, at, asked: clock.t };
      notes.push(r);
      return { stop: (w?: number) => void (r.stopAt ??= w ?? clock.t), bend() {}, glide() {}, muffle() {}, dyn() {} };
    },
    swoosh() {},
    tick() {},
  };
  return { chip: chip as unknown as Chip, notes };
}

test("D308: a whole run on the speaker (I/22 and I/2, ornaments and the subject's layers): every sound a touch made stops as it lets go, 0.1 s after the touch", () => {
  for (const id of ["wtc1f22", "wtc1f02"]) {
    const clock = { t: 0 };
    const fc = fakeChip(clock);
    const g = new ProtoGame(fugueById(id), 0, 0, protoById("keys"), { bpm: 60, legato: false, easy: "timing", bt: false }, fc.chip);
    const heads = g.notes.filter((n, i) => !n.ride && !(i > 0 && g.notes[i - 1].on === n.on));
    const evs: { t: number; down: boolean; id: number }[] = [];
    heads.forEach((n, q) => {
      const t = g.timeAt(n.on);
      evs.push({ t, down: true, id: q + 1 }, { t: t + 0.1, down: false, id: q + 1 });
    });
    evs.sort((a, b) => a.t - b.t || Number(a.down) - Number(b.down));
    let k = 0;
    let checked = 0;
    const end = g.timeAt(g.end) + 1;
    const mine = new Map<number, Rec[]>();
    for (let t = 0; t < end; t += 1 / 60) {
      while (k < evs.length && evs[k].t <= t) {
        const e = evs[k++];
        clock.t = e.t;
        const before = fc.notes.length;
        if (e.down) {
          g.keyDown(e.id, { velocity: 0.5 }, performance.now());
          mine.set(e.id, fc.notes.slice(before));
        } else {
          g.keyUp(e.id, performance.now());
          for (const r of mine.get(e.id) ?? []) {
            checked++;
            assert.ok(r.stopAt !== undefined && r.stopAt <= e.t + 1e-9, `${id}: a sound of the touch at ${(e.t - 0.1).toFixed(3)} s (MIDI ${r.midi}) stopped at ${r.stopAt}, let go at ${e.t}`);
          }
        }
      }
      clock.t = t;
      if (g.step()) break;
    }
    assert.ok(checked > heads.length * 0.8, `${id}: ${checked} sounds checked of ${heads.length} touches`);
  }
});

test("D308: a touch the system takes back (pointercancel) with no other thumb down is let go there; with another down it rings on (D293)", () => {
  const clock = { t: 0 };
  const fc = fakeChip(clock);
  const g = new ProtoGame(fugueById("wtc1f02"), 0, 0, protoById("keys"), { bpm: 60, legato: false, easy: "timing", bt: false }, fc.chip);
  const heads = g.notes.filter((n, i) => !n.ride && !(i > 0 && g.notes[i - 1].on === n.on));
  const long = heads.filter((n) => g.timeAt(n.on + n.dur) - g.timeAt(n.on) > 0.3);
  const strike = (id: number, n: (typeof heads)[number]) => {
    for (let t = clock.t; t < g.timeAt(n.on); t += 1 / 60) ((clock.t = t), g.step());
    clock.t = g.timeAt(n.on);
    const before = fc.notes.length;
    g.keyDown(id, { velocity: 0.5 }, performance.now());
    return fc.notes.slice(before);
  };
  const alone = strike(1, long[0]);
  clock.t += 0.1;
  g.up(1, performance.now(), true);
  assert.ok(alone.length > 0 && alone.every((r) => r.stopAt !== undefined && r.stopAt <= clock.t + 1e-9), "alone: let go at once");
  // The other thumb already down (it gives way to the new touch, and stays down).
  for (let t = clock.t; t < g.timeAt(long[3].on) - 0.3; t += 1 / 60) ((clock.t = t), g.step());
  g.keyDown(3, { velocity: 0.5 }, performance.now());
  const ringing = strike(2, long[3]);
  clock.t += 0.1;
  g.up(2, performance.now(), true);
  assert.ok(ringing.length > 0 && ringing.every((r) => r.stopAt === undefined || r.stopAt > clock.t + 0.05), "another thumb down: rings on");
});
