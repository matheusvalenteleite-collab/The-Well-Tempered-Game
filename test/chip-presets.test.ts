import { test } from "node:test";
import assert from "node:assert/strict";
import { FAMILIES, grooveHits, harmonicsOf, PATCHES, patchFor, presetById, setPreset, SHAPES, slotOf } from "../src/touch/sound.ts";

test("D209: the CHIP family has ten consoles, distinct ids, five slots each on existing patches (or the classic sound)", () => {
  const chip = FAMILIES.find((f) => f.name === "CHIP")!;
  assert.equal(chip.presets.length, 10);
  assert.equal(new Set(chip.presets.map((p) => p.id)).size, 10);
  for (const old of ["chip2", "chip3", "chip4", "chip5"]) assert.ok(!chip.presets.some((p) => p.id === old), old);
  for (const p of chip.presets) {
    assert.ok(p.name.length <= 22, p.name);
    assert.equal(p.kit, "chip", p.id);
    assert.ok(p.drums, p.id);
    if (p.slots === null) continue;
    assert.equal(p.slots.length, 5, p.id);
    for (const s of p.slots) assert.ok(PATCHES[s], `${p.id}: ${s}`);
    // With three voices (slots 0, 2, 4) and four (0, 1, 3, 4) every voice has its own instrument.
    for (const n of [3, 4]) {
      const ids = Array.from({ length: n }, (_, v) => p.slots![slotOf(v, n)]);
      assert.equal(new Set(ids).size, n, `${p.id} with ${n} voices`);
    }
    // Light on the CPU: at most two oscillators a patch.
    for (const s of p.slots) assert.ok(PATCHES[s].osc.length <= 2, s);
  }
  assert.equal(chip.presets.filter((p) => p.slots === null).length, 1, "the classic sound kept once");
  setPreset("chip");
  assert.equal(patchFor(0, 3), null);
  setPreset("chipPocket");
  assert.equal(patchFor(0, 3), PATCHES.pkLead);
  assert.equal(presetById("chip3").id, "chip", "an old saved id falls back to the classic sound");
  setPreset("bossa");
});

test("D209: Wendy Carlos: five distinct Moog voices, no drums (Switched-On Bach had none)", () => {
  const carlos = presetById("carlos");
  assert.equal(carlos.id, "carlos");
  assert.equal(new Set(carlos.slots).size, 5);
  assert.equal(carlos.drums, undefined);
  assert.equal(carlos.groove, undefined);
  assert.ok(carlos.slots!.some((s) => PATCHES[s].scoop), "a scoop somewhere");
  assert.ok(carlos.slots!.some((s) => (PATCHES[s].filter?.q ?? 0) >= 8), "a resonant filter's boing");
});

test("D209: the consoles' wave shapes: one cycle each, within -1..1, and their harmonics", () => {
  for (const [name, f] of Object.entries(SHAPES)) {
    for (let j = 0; j < 64; j++) {
      const y = f(j / 64);
      assert.ok(y >= -1.0001 && y <= 1.0001, `${name} at ${j}`);
    }
  }
  // The NES triangle: 32 four-bit steps, top at the start, bottom at the middle.
  assert.equal(SHAPES.tri4(0), 1);
  assert.equal(SHAPES.tri4(15.5 / 32), -1);
  assert.equal(new Set(Array.from({ length: 32 }, (_, k) => SHAPES.tri4((k + 0.5) / 32))).size, 16);
  // The VRC6 saw: seven steps.
  assert.equal(new Set(Array.from({ length: 70 }, (_, k) => SHAPES.saw7((k + 0.5) / 70))).size, 7);
  // A sine's harmonics: the first alone.
  const { real, imag } = harmonicsOf((x) => Math.sin(2 * Math.PI * x), 8);
  assert.ok(Math.abs(imag[1] - 1) < 1e-6 && Math.abs(real[1]) < 1e-6);
  for (let k = 2; k < 8; k++) assert.ok(Math.abs(imag[k]) < 1e-6 && Math.abs(real[k]) < 1e-6);
  // The FM bell's partials: 1, 6, 8 (a 1:7 modulator), nothing at 2.
  const bell = harmonicsOf(SHAPES.fmBell, 16);
  const amp = (k: number) => Math.hypot(bell.real[k], bell.imag[k]);
  assert.ok(amp(6) > 0.2 && amp(8) > 0.2 && amp(2) < 1e-6);
});

test("D209: the two new chip loops keep a beat in 4/4, 3/4 and compound time", () => {
  for (const g of ["chipBounce", "chipFunk"] as const)
    for (const [per, compound] of [[4, false], [3, false], [4, true]] as const) {
      const hits = Array.from({ length: per }, (_, b) => grooveHits(g, b, 0, per, compound)).flat();
      assert.ok(hits.some((h) => h.drum === "kick") && hits.length >= per * 2, `${g} ${per} ${compound}`);
      for (const h of hits) assert.ok(h.at >= 0 && h.at < 1 && h.vel > 0 && h.vel <= 1);
    }
});
