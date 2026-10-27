/**
 * D313: SOLO VOICES without the copy and paste (no loop in the touch game: a long note goes on with
 * passages of its recording from places drawn each time, aligned and crossfaded at constant power for
 * their correlation; the recordings themselves made of pieces of many takes, build_sustain.py);
 * BLEEPS AND BLOOPS' bass a synth upright (sine and triangle, a pluck of FM and a thump), not a saw.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio, type FakeParam } from "./fake-audio.ts";
import { CHAIN, Chip, scoopShift, voicing } from "../src/touch/chip.ts";
import { PATCHES, setPreset } from "../src/touch/sound.ts";
import { chainOf, PERIOD, VOICE_CHAIN } from "../src/touch/sampled.ts";
import { fugueById } from "../src/touch/fugue.ts";

const ctxOf = installFakeAudio(0, true);

test("D313: SOLO VOICES' four singers are chained, not looped, from their steady stretch; the choir and the other recordings keep their loops", () => {
  for (const set of ["voiceS", "voiceA", "voiceT", "voiceB"]) {
    assert.deepEqual(chainOf(set), VOICE_CHAIN, set);
    assert.ok(PERIOD[set].loop, `${set} keeps its loop for the chorales`);
  }
  assert.equal(chainOf("choirAah"), undefined);
  assert.equal(chainOf("pipePedal"), undefined);
  const [a, b] = VOICE_CHAIN;
  assert.ok(a >= 0.3 && b <= 3.1 && b - a >= CHAIN.least + CHAIN.spread - 1e-9, "every passage drawn lasts at least CHAIN.least");
  assert.ok(CHAIN.xf >= 0.25, "long crossfades (the owner heard the seam)");
  assert.ok(CHAIN.tries >= 2 && CHAIN.points >= 4 && CHAIN.max >= 8);
});

test("D313: a scoop from below puts the recording behind, a glide from above ahead, none nothing", () => {
  assert.ok(scoopShift(-20, 4, 0.07) < 0);
  assert.ok(scoopShift(700, 4, 0.08) > 0.01, "a glide down from a fifth above: over 10 ms ahead");
  assert.equal(scoopShift(0, 0, 0.07), 0);
  // About -0.3 ms for the soprano's scoop (the measured offset in Chromium: 0.30 ms).
  assert.ok(Math.abs(scoopShift(-20, 4, 0.07) * 1000 + 0.25) < 0.1, `${scoopShift(-20, 4, 0.07) * 1000} ms`);
});

test("D313: a long sung note goes on with passages crossfaded at constant power, never looped; a short one is one source", async () => {
  setPreset("soloVoices");
  await new Chip().prepare(fugueById("wtc1f02").voices.flat().map((n) => n[2]));
  const chip = new Chip();
  const ctx = ctxOf();
  chip.note(60, 0, 0.05, voicing(0, 4));
  const before = new Set(ctx.nodes);
  chip.note(72, 1, 0.8, voicing(0, 4));
  const short = [...ctx.nodes].filter((n) => !before.has(n) && n.kind === "buffer");
  assert.equal(short.length, 1);
  const mid = new Set(ctx.nodes);
  chip.note(72, 3, 9, voicing(0, 4));
  const srcs = [...ctx.nodes].filter((n) => !mid.has(n) && n.kind === "buffer") as unknown as { loop: boolean; startAt: number; offset: number; stopCall: number }[];
  assert.ok(srcs.length >= 4, `${srcs.length} passages for 9 s`);
  assert.ok(srcs.every((s) => !s.loop), "none looped");
  // Each passage is stopped only after the next has crossfaded in (no gap), and starts from within the
  // steady stretch; each starts before the one before has run out of it (the real recording's 3.25 s).
  for (let k = 1; k < srcs.length; k++) {
    assert.ok(srcs[k - 1].stopCall >= srcs[k].startAt + CHAIN.xf - 1e-6, `passage ${k - 1} held through the crossfade`);
    assert.ok(srcs[k].startAt + CHAIN.xf <= srcs[k - 1].startAt + (VOICE_CHAIN[1] - srcs[k - 1].offset) + 1e-6, `passage ${k} before the last runs out`);
    assert.ok(srcs[k].offset >= VOICE_CHAIN[0] - 1e-6 && srcs[k].offset <= VOICE_CHAIN[0] + CHAIN.spread + 0.05, `passage ${k} from ${srcs[k].offset}`);
  }
  // The crossfade's gains: equal power where nothing correlates (the fake recording is silence there).
  const gains = [...ctx.nodes].filter((n) => !mid.has(n) && n.kind === "gain" && (n.gain as FakeParam).events.length >= CHAIN.points) as unknown as { gain: FakeParam }[];
  assert.ok(gains.length >= 2);
  const [out, inc] = gains;
  const t0 = srcs[1].startAt;
  for (let x = 0; x <= 1; x += 0.25) {
    const p = out.gain.valueAt(t0 + x * CHAIN.xf) ** 2 + inc.gain.valueAt(t0 + x * CHAIN.xf) ** 2;
    assert.ok(Math.abs(10 * Math.log10(p)) < 0.3, `power ${p.toFixed(3)} at ${x}`);
  }
  setPreset("chip");
});

test("D313: BLEEPS AND BLOOPS' bass a synth upright: sine and triangle (no saw, no square), a pluck of FM, a thump, a scoop and a slide; round", () => {
  const b = PATCHES.modBass;
  assert.deepEqual(b.osc.map((o) => o.wave), ["sine", "triangle"]);
  assert.ok(b.fm && b.fm.index <= 2 && b.fm.time <= 0.2, "the FM only at the pluck");
  assert.ok(b.chiff && b.chiff.time <= 0.05, "a short thump");
  assert.ok(b.scoop && b.scoop.cents <= 30 && b.slide && b.slide <= 0.1);
  assert.ok(b.filter!.freq <= 2500 && !b.drive, "round: no drive, the highs filtered");
  assert.ok(b.amp.s < 0.5, "plucked: it falls to a lower sustain");
});
