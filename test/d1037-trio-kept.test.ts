/**
 * D1037: what D504 built for ZELENKA TRIO and other sounds still play, kept under test after the sound's withdrawal (its
 * own tests, test/d504-oboe-trio.test.ts, went with it): the Iowa oboe (BWV 54's layered alto on SUPER 16-BIT, D912) and the
 * Iowa bassoon (VAUDEVILLE's, SUPER 16-BIT's lowest notes) with their layers, compasses and tongue; the oboe's lowest notes
 * read where written (D631: guarded for every piece on every sound by d631 and d640's audits); the winds' breath touch (VAUDEVILLE's band family).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PATCHES, TRIO_COMPASS, TRIO_JOIN, TRIO_TONGUE, bowEntry, inCompass } from "../src/touch/sound.ts";
import { SAMPLED, TRIO_SHORT_S } from "../src/touch/sampled.ts";
import { BREATH_DB, BREATH_TONE_DB, breathGain, breathTone, breathVib, holdMode, landing } from "../src/touch/touch-expr.ts";


test("D504, D1037: the Iowa oboe (BWV 54's alto) and bassoon (VAUDEVILLE, SUPER 16-BIT) keep their soft layers and short notes", () => {
  assert.equal(PATCHES.altoM3.sample, "trioOboe1");
  assert.equal(PATCHES.vdBassoon.sample, "trioBassoon");
  for (const i of [SAMPLED.trioOboe1, SAMPLED.trioBassoon]) {
    assert.ok(i.soft && i.short && !i.plucked, i.set);
    assert.ok(i.short!.under === TRIO_SHORT_S && TRIO_SHORT_S <= 0.2);
  }
  // The recordings in the repository: the bassoon every semitone Bb1-D5 (Iowa has no fortissimo B3), the oboe Bb3-Ab6.
  const manifest = readFileSync(new URL("../src/audio/sample-manifest.ts", import.meta.url), "utf8");
  const notes = (set: string) => JSON.parse(manifest.slice(manifest.indexOf("= ") + 2, manifest.lastIndexOf(";")))[set].notes as string[];
  assert.equal(notes("trioBassoon").length, 40);
  assert.equal(notes("trioBassoonMf").length, 41);
  assert.equal(notes("trioOboe").length, 35);
  assert.equal(notes("trioOboeMf").length, 35);
});

test("D504, D1037: the oboe's and the bassoon's compasses; a note outside one played an octave nearer (inCompass), never out of it", () => {
  assert.equal(PATCHES.altoM3.compass, TRIO_COMPASS.oboe);
  assert.equal(PATCHES.vdBassoon.compass, TRIO_COMPASS.bassoon);
  assert.deepEqual(TRIO_COMPASS.oboe, { lo: 58, hi: 89 });
  assert.deepEqual(TRIO_COMPASS.bassoon, { lo: 34, hi: 75 });
  for (let m = 20; m < 110; m++) {
    for (const c of Object.values(TRIO_COMPASS)) {
      const f = inCompass(m, c);
      assert.ok(f >= c.lo && f <= c.hi && (f - m) % 12 === 0, `${m} ${f}`);
      if (m >= c.lo && m <= c.hi) assert.equal(f, m);
    }
  }
});

test("D504, D1037: the winds' touch (VAUDEVILLE's bassoon): the breath's attack, the swell held; the tongue's joins", () => {
  const soft = landing("winds", 0, 48, PATCHES.vdBassoon);
  const strong = landing("winds", 1, 48, PATCHES.vdBassoon);
  assert.equal(soft.layer, "soft");
  assert.ok(soft.soft! > 0.9 && soft.lp! < 8000);
  assert.equal(strong.layer, "firm");
  assert.ok(strong.tone! > 1.5 && strong.lp === undefined);
  assert.equal(soft.level, undefined, "no level from the landing: the line's own");
  assert.equal(holdMode("winds", PATCHES.vdBassoon, false), "breath");
  assert.ok(Math.abs(20 * Math.log10(breathGain(1)) - BREATH_DB) < 1e-9 && BREATH_DB === 4);
  assert.ok(Math.abs(20 * Math.log10(breathGain(-1)) + BREATH_DB) < 1e-9);
  assert.equal(breathTone(1), BREATH_TONE_DB);
  assert.ok(breathVib(0, 1) > 0 && breathVib(0, -1) === 0 && breathVib(0, 0) === 0);
  for (const p of [PATCHES.altoM3, PATCHES.vdBassoon]) assert.equal(p.bow, TRIO_TONGUE);
  const join = bowEntry(TRIO_TONGUE, { legato: true, lead: true })!;
  assert.deepEqual(join, { ...TRIO_JOIN });
  assert.ok(join.floor > 0.18 && join.accentDb < 1.25, "softer than a bow change");
  assert.equal(bowEntry(TRIO_TONGUE, { legato: true, slur: true, lead: true })!.skip, 0.25);
  assert.equal(bowEntry(TRIO_TONGUE, { legato: true })!.skip, TRIO_TONGUE.skip);
});
