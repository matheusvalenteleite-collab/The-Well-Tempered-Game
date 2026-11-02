/**
 * D439, OBBLIGATO's sound (the owner on D485: "harsh and silly … maybe we can just try to improve the mix of
 * the new voice with player's voice"): two modes for the owner to pick, the trigger the same in both.
 * "layer": D485's second instrument merged under the voice (LAYER_DB, filtered, late, its envelope following,
 * nothing till its recordings load); "effect": no second instrument, the player's own voice coloured.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { blendFor, effectFor, layerGain, layerLevel, EFFECTS, LAYER_DB, LAYER_LEVEL, LAYER_LP, LAYERS, LEGACY_LAYER_LEVEL, LOUDNESS, LOUDNESS_SPAN, OBBLIGATO_MODE, setObbligatoMode } from "../src/bench/obbligato.ts";
import { VOICE_FX } from "../src/touch/chip.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";
import { synthRun } from "../tools/lab/lab-synth.ts";
import { obbRun } from "./d485-sim.ts";
import type { LabPassage } from "../src/bench/lab/log.ts";

function rng(seed = 12345) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function inMode<T>(m: Parameters<typeof setObbligatoMode>[0], f: () => T): T {
  const was = OBBLIGATO_MODE;
  setObbligatoMode(m);
  try {
    return f();
  } finally {
    setObbligatoMode(was);
  }
}
const passage = (piece: string, voice: number, toBar: number, bpm = 80): LabPassage => ({ piece, voice, fromBar: 1, toBar, bpm, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null });
const args = (c: string) => JSON.parse(c.slice(c.indexOf("(") + 1, c.lastIndexOf(") -> "))) as unknown[];
const isLayer = (c: string) => c.startsWith("note(") && c.includes('"couple":false');
const log = () => synthRun(passage("wtc1f02", 0, 31), { gap: 0.03, jitter: 0.03, seed: 3 });

test("D439, D501: the mode \"auto\" (by the player's sound: test/d501-instruments-finish.test.ts); every mode's names have Portuguese and Spanish", () => {
  assert.equal(OBBLIGATO_MODE, "auto");
  assert.equal(new Set(Object.values(EFFECTS)).size, 6);
  for (const id of ["pianoSampled", "harpsiSampled", "orgPrincipal", "consCello", "singA", "s16Violin", "fmLead", null] as const) {
    const n = effectFor(id).shown.name;
    assert.ok(PT[n] && ES[n], n);
  }
});

test("D439, layer: well under the voice (LAYER_DB), blended: a high-pass under the voice's lowest fundamental, the synthetic darkened, late, its attack never sharper", () => {
  assert.equal(LAYER_DB, -9);
  assert.ok(Math.abs(LAYER_LEVEL - 10 ** (-9 / 20)) < 1e-9);
  inMode("layer", () => assert.equal(layerLevel(), LAYER_LEVEL));
  inMode("legacy", () => assert.equal(layerLevel(), LEGACY_LAYER_LEVEL));
  const cello = LAYERS.find((l) => l.id === "consCello")!;
  const gb = LAYERS.find((l) => l.id === "gbWave")!;
  const b = blendFor("pianoSampled", cello, [48, 50, 55, 57]);
  assert.ok(b.hp < 440 * 2 ** ((48 - 69) / 12) && b.hp > 60, `hp ${b.hp}`);
  assert.equal(b.lp, LAYER_LP.real);
  assert.equal(blendFor("pianoSampled", gb, [48, 55]).lp, LAYER_LP.synthetic);
  assert.ok(b.delay >= 0.01 && b.delay <= 0.02);
  // A sustained layer over a struck piano dies away with it; over a bowed cello it speaks as slowly as the bow.
  assert.ok(b.follow && b.follow.floor < 0.5);
  assert.equal(blendFor("pianoSampled", LAYERS.find((l) => l.id === "harpsiSampled")!, [60]).follow, undefined, "a plucked layer dies away by itself");
  assert.ok(blendFor("consCello", LAYERS.find((l) => l.id === "harpsiSampled")!, [48]).attack >= 0.05);
});

test("D439, layer: the level evened out by the instruments' loudness (every instrument measured), within LOUDNESS_SPAN of LAYER_DB; legacy 0.75", () => {
  for (const l of LAYERS) assert.ok(typeof LOUDNESS[l.id] === "number", `${l.id} unmeasured`);
  const loudest = LAYERS.find((l) => l.id === "trkBass")!;
  const quietest = LAYERS.find((l) => l.id === "tomStrings")!;
  inMode("layer", () => {
    assert.ok(layerGain("orgPrincipal", loudest) < layerGain("orgPrincipal", quietest), "a louder instrument set lower");
    for (const main of ["pianoSampled", "harpsiSampled", "orgPrincipal", "consCello", "fmLead", null] as const)
      for (const l of LAYERS) {
        const db = 20 * Math.log10(layerGain(main, l));
        assert.ok(db <= LAYER_DB + LOUDNESS_SPAN + 3 + 1e-9 && db >= LAYER_DB - LOUDNESS_SPAN - 5.5 - 1e-9, `${main} ${l.id} ${db}`);
      }
  });
  inMode("legacy", () => assert.equal(layerGain("pianoSampled", loudest), LEGACY_LAYER_LEVEL));
});

test("D439, layer: in the game the layer's notes are blended at layerGain of the voice's, and the voice's own calls are as without the boost", () =>
  inMode("layer", () => {
    const l = log();
    const plain = obbRun(l, { on: true, take: false, rng: rng(1) });
    const boosted = obbRun(l, { on: true, take: true, rng: rng(1) });
    const layers = boosted.calls.filter(isLayer);
    assert.ok(layers.length > 5, `layer notes ${layers.length}`);
    for (const c of layers) assert.ok((args(c)[4] as { blend?: unknown }).blend, "blended");
    // A touch's layer straight after its note: its level LAYER_LEVEL of the note's.
    let pairs = 0;
    boosted.calls.forEach((c, i) => {
      const prev = boosted.calls[i - 1];
      if (!isLayer(c) || !prev?.startsWith("note(") || isLayer(prev)) return;
      const [lv, mv] = [(args(c)[4] as { level?: number }).level ?? 1, (args(prev)[4] as { level?: number }).level ?? 1];
      const wants = boosted.offers.map((o) => layerGain(null, LAYERS.find((x) => x.id === o.id)!));
      assert.ok(wants.some((w) => Math.abs(lv / mv - w) < 1e-3), `${lv} / ${mv}`);
      pairs++;
    });
    assert.ok(pairs > 3, `pairs ${pairs}`);
    for (const o of boosted.offers) assert.ok(Math.abs(o.octave) <= 1);
    const main = (cs: string[]) => cs.filter((c) => c.startsWith("note(") && !isLayer(c)).length;
    assert.equal(main(boosted.calls), main(plain.calls));
    assert.equal(boosted.g.score, plain.g.score);
  }));

test("D439, effect: no second instrument; the player's own voice coloured over the entry (one voiceFx each), every other call as without the boost", () =>
  inMode("effect", () => {
    const l = log();
    const plain = obbRun(l, { on: true, take: false, rng: rng(1) });
    const boosted = obbRun(l, { on: true, take: true, rng: rng(1) });
    assert.ok(boosted.offers.length > 0, "offered");
    assert.equal(boosted.calls.filter(isLayer).length, 0, "nothing layered");
    const fx = boosted.calls.filter((c) => c.startsWith("voiceFx("));
    assert.equal(fx.length, boosted.offers.length);
    const g = boosted.g as unknown as { timeAt: (t: number) => number; f: { tpq: number } };
    for (const [c, o] of fx.map((c, i) => [c, boosted.offers[i]] as const)) {
      const [kind, delay, from, until] = args(c) as [string, number, number, number];
      // The offer names the main instrument's colour (the lab's sound here: the classic chip's ping-pong).
      assert.equal(kind, effectFor(o.id === "chip" ? null : (o.id as never)).fx);
      const e = o.spans[0];
      assert.ok(Math.abs(from - (g.timeAt(e.on) - 0.05)) < 1e-6 && Math.abs(until - (g.timeAt(e.end) - 0.05)) < 1e-6);
      assert.ok(delay > 0);
    }
    assert.deepEqual(boosted.calls.filter((c) => !c.startsWith("voiceFx(")).map((c) => c.replace(/\bs\d+\b/g, "s")), plain.calls.map((c) => c.replace(/\bs\d+\b/g, "s")));
    assert.equal(boosted.g.score, plain.g.score);
  }));

test("D439, effect: the colour by the instrument; never louder (the dry trimmed while a colour sounds)", () => {
  const fxOf = (id: Parameters<typeof effectFor>[0]) => effectFor(id).fx;
  assert.equal(fxOf("harpsiSampled"), "echo");
  assert.equal(fxOf("pianoSampled"), "hall");
  assert.equal(fxOf("orgPrincipal"), "cathedral");
  assert.equal(fxOf("orgPedal"), "cathedral");
  assert.equal(fxOf("consViolin"), "ensemble");
  assert.equal(fxOf("singS"), "ensemble");
  assert.equal(fxOf(null), "pingpong");
  assert.equal(fxOf("gbLead"), "pingpong");
  assert.equal(fxOf("s16Violin"), "pingpong");
  assert.equal(fxOf("fmLead"), "flanger");
  for (const [k, v] of Object.entries(VOICE_FX)) assert.ok(v.trim < 1 && v.wet > 0 && v.wet < 0.7, k);
});
