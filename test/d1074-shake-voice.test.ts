/**
 * D1074, THE ORNAMENT SLURS: the switch is off (every ornament as today), and with it on the four instruments take their
 * voice: brass, GAME BOY pulses and SWITCHED-ON slur, the plucked guitars hammer, the rest unchanged.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHAKE_PROTO, shakeVoice, HAMMER_DB } from "../src/touch/shake-voice.ts";
import { PATCHES } from "../src/touch/sound.ts";

const P = PATCHES as Record<string, any>;

test("D1074: off by default: no instrument changes", () => {
  assert.equal(SHAKE_PROTO.on, false);
  for (const id of ["bachBrass", "gameboy", "analog", "chip"]) assert.equal(shakeVoice(id, P.gbLead), null);
});

test("D1074: on, brass, GAME BOY's pulses and SWITCHED-ON slur; a guitar hammers; the piano and organ are as today", () => {
  SHAKE_PROTO.on = true;
  try {
    assert.equal(shakeVoice("bachBrass", null)?.kind, "slur");
    assert.equal(shakeVoice("gameboy", P.gbLead)?.kind, "slur");
    assert.equal(shakeVoice("analog", null)?.kind, "slur");
    const g = shakeVoice("bossaNova", { sample: "bossaGuitar", osc: [] } as any);
    assert.equal(g?.kind, "hammer");
    if (g?.kind === "hammer") assert.ok(Math.abs(20 * Math.log10(g.level) - HAMMER_DB) < 1e-9);
    assert.equal(shakeVoice("pianoSampled", null), null);
    assert.equal(shakeVoice("chamberOrgan", null), null);
  } finally {
    SHAKE_PROTO.on = false;
  }
});
