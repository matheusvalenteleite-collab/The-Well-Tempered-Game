/**
 * D509, OBBLIGATO's three effects (the owner: "OBBLIGATO's effects on sound are disappointing and dumb …
 * octaves the player's voice … a bit of delay … that sounds analog and cool but will not dominate … a
 * flanger … a vibrato"): D439's modes (the merged layer, the colours by instrument; D501's "auto") gone; each
 * offer draws an octave doubling, a tape echo or a chorus with a vibrato, on the player's own voice over the
 * player's own entry, the trigger D485's. The octave's notes: test/d485-obbligato.test.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as OBB from "../src/bench/obbligato.ts";
import { FX_NAMES, OBB_FX, TAPE_QUARTERS, VIBRATO_CENTS, VIBRATO_HZ } from "../src/bench/obbligato.ts";
import { VIB_HZ, VOICE_FX, VOICE_FX_RAMP } from "../src/touch/chip.ts";
import { synthRun } from "../tools/lab/lab-synth.ts";
import { obbRun } from "./d485-sim.ts";
import type { LabPassage } from "../src/bench/lab/log.ts";

const passage = (piece: string, voice: number, toBar: number, bpm = 80): LabPassage => ({ piece, voice, fromBar: 1, toBar, bpm, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null });
const args = (c: string) => JSON.parse(c.slice(c.indexOf("(") + 1, c.lastIndexOf(") -> "))) as unknown[];
const isOctave = (c: string) => c.startsWith("note(") && c.includes('"couple":false');
const log = () => synthRun(passage("wtc1f02", 0, 31), { gap: 0.03, jitter: 0.03, seed: 3 });
/** The draw's rng pinned to one of the three (the pick's thirds: the octave, the tape echo, the chorus). */
const pinned = (fx: (typeof OBB_FX)[number]) => () => (OBB_FX.indexOf(fx) + 0.5) / 3;
const renumbered = (cs: string[]) => cs.map((c) => c.replace(/\bs\d+\b/g, "s"));

test("D509: the layer and effect modes are gone (no second instrument, no mode switch, no colours by instrument)", () => {
  for (const k of ["OBBLIGATO_MODE", "setObbligatoMode", "obbligatoParam", "obbligatoModeFor", "EFFECT_SOUNDS", "drawLayer", "blendFor", "layerGain", "effectFor", "EFFECTS", "LOUDNESS", "TIER_ODDS"]) assert.ok(!(k in OBB), k);
  assert.deepEqual([...OBB_FX], ["octave", "tape", "chorus"]);
  assert.deepEqual(Object.keys(VOICE_FX).sort(), ["chorus", "octave", "tape"]);
  assert.equal(Object.keys(FX_NAMES).length, 3);
});

for (const fx of ["tape", "chorus"] as const)
  test(`D509, ${fx}: no note added; the player's own voice coloured over the entry (one voiceFx a boost, its first note to its end), every other call as without the boost`, () => {
    const l = log();
    const plain = obbRun(l, { on: true, take: false, rng: pinned(fx) });
    const boosted = obbRun(l, { on: true, take: true, rng: pinned(fx) });
    assert.ok(boosted.offers.length >= 2, "offered");
    assert.ok(boosted.offers.every((o) => o.fx === fx && o.shift === 0 && o.octave === 0));
    assert.equal(boosted.calls.filter(isOctave).length, 0, "nothing doubled");
    const calls = boosted.calls.filter((c) => c.startsWith("voiceFx("));
    assert.equal(calls.length, boosted.offers.length);
    const g = boosted.g as unknown as { timeAt: (t: number) => number; f: { tpq: number } };
    calls.forEach((c, i) => {
      const [kind, delay, from, until, vib, dies] = args(c) as [string, number, number, number, number, boolean];
      const e = boosted.offers[i].spans[0];
      assert.equal(kind, fx);
      assert.ok(Math.abs(from - (g.timeAt(e.on) - 0.05)) < 1e-6 && Math.abs(until - (g.timeAt(e.end) - 0.05)) < 1e-6);
      // The tape's delay a dotted eighth at the tempo there (no tempo change: the clock's own).
      assert.ok(Math.abs(delay - (g.timeAt(e.on + TAPE_QUARTERS * g.f.tpq) - g.timeAt(e.on))) < 1e-6);
      // The chorus's vibrato a sustaining sound's (the lab plays the classic chip); none on the tape.
      assert.equal(vib, fx === "chorus" ? VIBRATO_CENTS.sustained : 0);
      assert.equal(dies, false, "the classic chip sustains");
    });
    assert.deepEqual(renumbered(boosted.calls.filter((c) => !c.startsWith("voiceFx("))), renumbered(plain.calls));
    assert.equal(boosted.g.score, plain.g.score);
  });

test("D509: the effects' settings: ramped in and out over ~150 ms, the wet well under the dry, the dry trimmed (measured: the whole within half a dB)", () => {
  assert.ok(Math.abs(VOICE_FX_RAMP - 0.15) < 1e-9);
  for (const [k, v] of Object.entries(VOICE_FX)) assert.ok(v.trim < 1 && v.trim >= 0.75 && v.wet >= 0 && v.wet <= 0.3, k);
  const T = VOICE_FX.tape;
  assert.ok(T.feedback <= 0.3, "low feedback");
  assert.ok(T.hp >= 200 && T.lp <= 3500, "band-limited");
  assert.ok(T.drive > 1 && T.drive < 4, "a little saturated");
  // Wow and flutter: a delay swept at f by A bends the pitch by 2πfA: a slow few cents, a quick couple.
  const cents = (s: { rate: number; depth: number }) => 1200 * Math.log2(1 + 2 * Math.PI * s.rate * s.depth);
  assert.ok(T.wow.rate < 1.5 && cents(T.wow) > 2 && cents(T.wow) < 8, `wow ${cents(T.wow)}`);
  assert.ok(T.flutter.rate > 4 && cents(T.flutter) < 4, `flutter ${cents(T.flutter)}`);
  const C = VOICE_FX.chorus;
  assert.ok(C.delays.every((d) => d < 0.02) && C.feedback < 0.4 && C.rates.every((r) => r < 0.5));
  assert.equal(VIB_HZ, VIBRATO_HZ);
});
