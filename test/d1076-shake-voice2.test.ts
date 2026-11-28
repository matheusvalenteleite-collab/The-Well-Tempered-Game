/**
 * D1076, THE REST OF THE ORNAMENT SLURS AND THE SWAY'S OWN MOTION: switch off (SHAKE_PROTO.on false), nothing changes; on, the
 * winds, the sung voices and the bowed strings slur, BACH BRASS's held sway is the lip vibrato and PIPE ORGAN's the tremulant.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHAKE_PROTO, shakeVoice, swayHold, lipVib, tremulantAt, LIP_VIB, TREMULANT_SWAY } from "../src/touch/shake-voice.ts";
import { PATCHES } from "../src/touch/sound.ts";
import { holdMode } from "../src/touch/touch-expr.ts";

const P = PATCHES as Record<string, any>;
const SLURRED: [string, string, string][] = [
  ["oboeTrio", "trioOboe1", "ZELENKA's oboe"], ["oboeTrio", "trioBassoon", "ZELENKA's bassoon"], ["fluteHarp", "seaFlute", "FLUTE & HARP's flute"],
  ["baroqueBand", "bandOboe", "BAROQUE BAND's oboe"], ["super16", "s16Flute", "SUPER 16-BIT's flute"], ["super16", "s16Bassoon", "its bassoon"],
  ["vocalSynth", "vocLa", "VOCAL SYNTH"], ["soloVoices", "singS", "SOLO VOICES"], ["soloVoices", "singB", "its bass"],
  ["stringConsort", "consViolin", "STRING CONSORT's violin"], ["stringConsort", "consCello", "its cello"], ["baroqueBand", "bandViola", "the band's viola"], ["super16", "s16Strings", "SUPER 16-BIT's strings"],
];

test("D1076: off by default: no wind, voice or string changes, no sway changes", () => {
  assert.equal(SHAKE_PROTO.on, false);
  for (const [preset, patch] of SLURRED) assert.equal(shakeVoice(preset, P[patch]), null, patch);
  assert.equal(swayHold("brass", "swell"), "swell");
  assert.equal(swayHold("organ", "messa"), "messa");
});

test("D1076: on, the winds, voices and bowed strings slur, the pitch settling within a few ms; the harpsichord and piano are as today", () => {
  SHAKE_PROTO.on = true;
  try {
    for (const [preset, patch, what] of SLURRED) {
      const v = shakeVoice(preset, P[patch]);
      assert.equal(v?.kind, "slur", what);
      if (v?.kind === "slur") assert.ok(v.tau > 0 && v.tau <= 0.012, `${what}: tau ${v.tau}`);
    }
    assert.equal(shakeVoice("harpsichordSampled", P.harpsiSampled), null);
    assert.equal(shakeVoice("pianoSampled", P.pianoSampled), null);
    assert.equal(shakeVoice("chamberOrgan", P.orgPrincipal), null);
  } finally {
    SHAKE_PROTO.on = false;
  }
});

test("D1076: on, the brass's sway is the lip vibrato and the organ's the tremulant; no other family changes", () => {
  SHAKE_PROTO.on = true;
  try {
    assert.equal(swayHold("brass", holdMode("brass", null, false)), "lip");
    assert.equal(swayHold("organ", holdMode("organ", null, false)), "tremulant");
    assert.equal(swayHold("singers", holdMode("singers", null, false)), holdMode("singers", null, false));
    assert.equal(swayHold("synth", "wah"), "wah");
    // in proportion, either way, never past the full sway
    assert.equal(lipVib(0), 0);
    assert.equal(lipVib(0.5), LIP_VIB.cents / 2);
    assert.equal(lipVib(-1), LIP_VIB.cents);
    assert.equal(lipVib(3), LIP_VIB.cents);
    assert.equal(tremulantAt(-0.25), 0.25);
    assert.equal(tremulantAt(NaN), 0);
    // the tremulant never raises the level (its mean stays the note's own) and is under 1 dB either way at the full sway
    assert.ok(20 * Math.log10(1 + TREMULANT_SWAY.depth / 2) < 1);
  } finally {
    SHAKE_PROTO.on = false;
  }
});
