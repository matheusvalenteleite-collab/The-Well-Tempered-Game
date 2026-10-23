/**
 * D210: the sound's load stays bounded however long a fugue runs (the iPhone's hiss and crash): every
 * note's nodes are disconnected once it ends, a phone never sounds more notes than its cap, and the
 * game's lists stay short. On the fake context of fake-audio.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio, type FakeAudioContext } from "./fake-audio.ts";
import { Chip, VOICE_CAP, voicing } from "../src/touch/chip.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { setPreset } from "../src/touch/sound.ts";
import { startTick } from "../src/touch/voice-mode.ts";
import { protoById } from "../src/bench/protos.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";

const ctxOf = installFakeAudio(5, true);

/** A fugue played by the bench with the band at its fullest; the player's voice left alone. */
function playFugue(piece: string, preset: string, chip: Chip, ctx: FakeAudioContext, seconds = Infinity) {
  setPreset(preset);
  const f = fugueById(piece);
  const g = new ProtoGame(f, [0], startTick(f, 0), protoById("ladder"), { bpm: 80, legato: false }, chip);
  const fixed = ctx.nodes.size;
  const peak = { wired: 0, notes: 0, sources: 0, band: 0, marks: 0, pops: 0, flames: 0 };
  const lists = g as unknown as Record<"band" | "marks" | "pops" | "flames", unknown[]>;
  for (let t = ctx.currentTime; t < seconds; t += 1 / 60) {
    ctx.advance(t);
    g.mult = 4;
    const done = g.step();
    peak.wired = Math.max(peak.wired, ctx.nodes.size - fixed);
    peak.notes = Math.max(peak.notes, chip.sounding());
    peak.sources = Math.max(peak.sources, ctx.sounding());
    for (const k of ["band", "marks", "pops", "flames"] as const) peak[k] = Math.max(peak[k], lists[k].length);
    if (done) break;
  }
  // Let the last rings end.
  ctx.advance(ctx.currentTime + 10);
  return { peak, left: ctx.nodes.size - fixed, made: ctx.totalMade() };
}

test("every note's nodes are disconnected once it has ended: a whole fugue leaves nothing wired", () => {
  for (const preset of ["strings", "bossa", "chip", "carlos"]) {
    const chip = new Chip();
    const ctx = ctxOf();
    const r = playFugue("wtc1f02", preset, chip, ctx);
    assert.ok(r.made > 3000, `${preset}: the fugue was played (${r.made} nodes made)`);
    assert.equal(r.left, 0, `${preset}: nodes left wired after the fugue`);
    // Before D210 the graph held every node ever made (4,700 to 8,500 by the end of this fugue).
    assert.ok(r.peak.wired < 400, `${preset}: at most ${r.peak.wired} nodes wired at once`);
    assert.equal(chip.sounding(), 0);
  }
});

test("the recorded harpsichord too: the key-up noises included", async () => {
  setPreset("harpsichordSampled");
  const chip = new Chip();
  const ctx = ctxOf();
  const f = fugueById("bwv1080-14");
  await chip.prepare(f.voices.flat().map((n) => n[2]));
  const r = playFugue("bwv1080-14", "harpsichordSampled", chip, ctx, 200);
  assert.ok((ctx.made.get("buffer") ?? 0) > 500, "played from the recordings");
  assert.equal(r.left, 0);
  assert.ok(r.peak.wired < 400, `at most ${r.peak.wired} nodes wired at once`);
});

test("the game's lists stay short over the longest fugue (Contrapunctus XIV, 12 minutes)", () => {
  const chip = new Chip();
  const r = playFugue("bwv1080-14", "baroque", chip, ctxOf());
  assert.ok(r.peak.band <= 64 + 40, `band ${r.peak.band}`);
  assert.ok(r.peak.marks <= 400 && r.peak.pops <= 40 && r.peak.flames <= 24);
  assert.ok(r.peak.notes <= chip.cap, `${r.peak.notes} notes at once`);
});

test("a phone never sounds more notes than its cap: the oldest are let go, never the player's", () => {
  const chip = new Chip();
  const ctx = ctxOf();
  assert.equal(chip.cap, VOICE_CAP.phone);
  setPreset("strings");
  const v = voicing(1, 4);
  const lead = chip.note(60, 0, 8, v, { lead: true });
  let stopped = false;
  const stop = lead.stop;
  lead.stop = (at) => ((stopped = true), stop(at));
  // A cluster far denser than any fugue: 100 long notes struck within a second.
  for (let i = 0; i < 100; i++) {
    ctx.advance(i / 100);
    chip.note(48 + (i % 30), ctx.currentTime, 4, v);
    assert.ok(chip.sounding() <= chip.cap, `${chip.sounding()} notes at once`);
  }
  assert.equal(chip.stolen, 100 + 1 - chip.cap);
  assert.equal(stopped, false, "the player's note held");
  // The notes let go stop within a fraction of a second.
  ctx.advance(1.5);
  assert.ok(ctx.sounding() < 6 * (chip.cap + 2), `${ctx.sounding()} sources sounding`);
});
