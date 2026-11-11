/**
 * D505: the glockenspiel, every source. No synthesized subject layer on any sound (the synthesizers too); the
 * count-in's click no pitch (a square at C7 was a tiny bell); no recording read more than three semitones fast on
 * any recorded set (the harpsichord's 4' choir included); a recording still loading stood in for by a loaded
 * neighbour of the same instrument before the synthesized stand-in.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installFakeAudio } from "./fake-audio.ts";
import { Chip, TICK, voicing, type Voicing } from "../src/touch/chip.ts";
import { PATCHES, PRESETS, setPreset, type Patch } from "../src/touch/sound.ts";
import { GENERIC, playFx, SYNTH_LAYERS, TAILORED, type SubjectFx } from "../src/touch/subject-fx.ts";
import { MAX_SHIFT_ANY, reachOf, SAMPLED, sampledMidis, setFor } from "../src/touch/sampled.ts";

const ctxOf = installFakeAudio(0, true);
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const OWN = new Set<Patch>(Object.values(PATCHES));
const ALL_FX: SubjectFx[] = [GENERIC, ...Object.values(TAILORED).flatMap((t) => [t[1], t[2], t[3], t.inverted, t.augmented].filter((x): x is SubjectFx => !!x))];

test("D505: no fugue's subject effect sounds a synthesized layer on any sound, the consoles and synthesizers included; the voice's own echo and second choir stay", () => {
  const sn = { voice: 1, on: 0, dur: 480, midi: 72, theme: 1, inverted: false, scale: 1, head: true, leap: true, long: true, weight: 1 } as const;
  let own = 0;
  for (const p of PRESETS) {
    setPreset(p.id);
    for (const count of [2, 3, 4]) {
      const v = voicing(1, count);
      for (const fx of ALL_FX) {
        const vs: Voicing[] = [];
        const chip = { note: (_m: number, _a: number, _d: number, x: Voicing) => (vs.push(x), { stop() {}, bend() {} }) } as unknown as Chip;
        playFx(chip, fx, sn, 72, 0, 0.5, v);
        for (const x of vs) assert.ok(x.patch === v.patch && (!x.patch || OWN.has(x.patch)), `${p.id} ${fx.name}: a layer on the voice's own sound only`);
        own += vs.length;
        if (fx.layers.every((l) => SYNTH_LAYERS.has(l.kind))) assert.equal(vs.length, 0, `${p.id} ${fx.name}`);
      }
    }
  }
  assert.ok(own > 0, "the echoes and second choirs still sound");
  setPreset("chip");
});

test("D505: the count-in's click is band-passed noise, no oscillator (the old square at C7 rang as a small bell)", () => {
  setPreset("chip");
  const chip = new Chip();
  const ctx = ctxOf();
  const osc = ctx.made.get("oscillator") ?? 0;
  const before = ctx.totalMade();
  chip.tick(1, true, 0.12);
  chip.tick(1.5, false, 0.12);
  assert.ok(ctx.totalMade() > before, "it sounds");
  assert.equal(ctx.made.get("oscillator") ?? 0, osc, "no oscillator");
  assert.ok(TICK.q < 2 && TICK.decay <= 0.02, "broad and short: no pitch to ring");
  assert.doesNotMatch(src("src/touch/chip.ts"), /accent \? 2093 : 1568/);
});

// D631 (the owner: "no note may sound in a different octave from the one written"): D505's upward fold withdrawn. What it
// guarded (a set read glassy-fast) is held instead by the choice of instrument and the declared reach (test/d631-octaves).
test("D505, D631: every recorded set's reach over its top recording MAX_SHIFT_ANY (or its maxShift), past it only where declared (`extend`); the harpsichord's G6 within it", () => {
  assert.equal(MAX_SHIFT_ANY, 3);
  for (const [id, inst] of Object.entries(SAMPLED)) {
    const ms = sampledMidis(setFor(inst, 60));
    if (!ms.length) continue;
    const r = reachOf(inst, setFor(inst, 60));
    assert.equal(r.hi - ms[ms.length - 1], inst.extend?.up ?? inst.maxShift ?? MAX_SHIFT_ANY, id);
  }
  // The harpsichord's top: F6 the last string; G6 (2 over) within its reach.
  assert.equal(reachOf(SAMPLED.harpsichord, "harpsichord").hi, 92);
});

test("D505: the harpsichord's choirs and a stand-in never read a string more than MAX_SHIFT_ANY off; a loaded neighbour before the synthesized stand-in", () => {
  const chip = src("src/touch/chip.ts");
  assert.match(chip, /loadedMidis\(set\)\.includes\(x\) && Math\.abs\(x - m\) <= MAX_SHIFT_ANY/);
  assert.doesNotMatch(chip, /Math\.abs\(x - m\) <= 12/);
  assert.equal((chip.match(/const nb = nearestSample\(main, midi, \(m\) => m !== near && Math\.abs\(m - midi\) <= \(inst\.maxShift \?\? MAX_SHIFT_ANY\) && !!loaded\(main, m\)\);/g) ?? []).length, 2);
});
