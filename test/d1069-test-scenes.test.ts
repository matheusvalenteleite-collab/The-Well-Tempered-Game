/**
 * D1069, TEST SCENES: every scene's piece, sound, voice and bars are real, and the voice is the instrument the scene tests
 * (a guitar for the guitar scenes, PSYCH's for the tilt, a consort string for the bow).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { TEST_SCENES } from "../src/bench/test-scenes.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { PATCHES, PRESETS } from "../src/touch/sound.ts";
import { GUITAR_SAMPLES } from "../src/touch/touch-expr.ts";
import { PSYCH_GUITARS, PSYCH_PRESET } from "../src/touch/guitar.ts";

test("D1069: every test scene names a real piece, sound, voice and bars, the voice the instrument tested", () => {
  const ids = new Set<string>();
  for (const s of TEST_SCENES) {
    assert.ok(!ids.has(s.id), `${s.id} twice`);
    ids.add(s.id);
    const f = fugueById(s.piece);
    assert.equal(f.id, s.piece, `${s.id}: piece`);
    const p = PRESETS.find((x) => x.id === s.sound);
    assert.ok(p, `${s.id}: sound ${s.sound}`);
    const count = f.voices.length;
    assert.ok(s.voice >= 0 && s.voice < count, `${s.id}: voice`);
    const bars = new Set(f.bars.map((b) => b.n));
    assert.ok(bars.has(s.fromBar) && bars.has(s.toBar) && s.fromBar <= s.toBar, `${s.id}: bars`);
    assert.ok(s.tempo >= 50 && s.tempo <= 100, `${s.id}: tempo`);
    // The voice has notes in the bars played.
    const from = f.bars.find((b) => b.n === s.fromBar)!.on;
    const to = f.bars.find((b) => b.n === s.toBar + 1)?.on ?? f.length;
    assert.ok(f.voices[s.voice].filter((n) => n[0] >= from && n[0] < to).length >= 4, `${s.id}: the voice plays in the bars`);
    const slot = (p!.by as Record<number, [string, number][]>)[count]?.[s.voice]?.[0];
    assert.ok(slot, `${s.id}: the sound seats ${count} voices`);
    const sample = (PATCHES as Record<string, { sample?: string }>)[slot]?.sample;
    if (s.mech === "guitarTilt") assert.ok(sample && GUITAR_SAMPLES.has(sample), `${s.id}: ${slot} is a guitar`);
    if (s.mech === "guitarTilt" && s.sound === PSYCH_PRESET) assert.ok(PSYCH_GUITARS.has(sample!), `${s.id}: PSYCH's guitar`);
    if (s.mech === "bow") assert.match(slot, /^cons(Violin|Viola|Cello)$/, `${s.id}: a consort string`);
    // D1070: the clean guitar's scenes exposed (the owner could not hear the fuzz tenor in four voices): at most one other voice
    // sounding at three quarters of the guitar's onsets in the bars played.
    if (s.mech === "guitarTilt") {
      const own = f.voices[s.voice].filter((n) => n[0] >= from && n[0] < to);
      const bare = own.filter(([on]) => f.voices.filter((v, i) => i !== s.voice && v.some(([o, d]) => o <= on && o + d > on)).length <= 1).length;
      assert.ok(bare >= 0.75 * own.length, `${s.id}: the guitar exposed (${bare} of ${own.length})`);
    }
    assert.ok(s.line.length > 10 && s.line.length < 160, `${s.id}: one short line`);
  }
});
