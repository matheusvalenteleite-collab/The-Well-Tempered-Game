/**
 * D549-D552, the classic four rebuilt (JAZZ QUARTET, BAROQUE BAND, BACH BRASS, ZELENKA TRIO; D560: promoted in their
 * originals' place): their instruments kept (the owner likes them), each its study's chain (band-fx.ts BAND_CHAINS) with the
 * return calibrated to the original's room, the layers they keep (Slim.keep) real layers of their instruments, within the budget.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BAND_CHAINS, type ReverbOpts } from "../src/touch/band-fx.ts";
import { presetBudget, PRESET_MB } from "../src/touch/budget.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { SAMPLED } from "../src/touch/sampled.ts";
import { BAND_SLIM, PATCHES, PRESETS, presetById, type PatchId } from "../src/touch/sound.ts";

const CLASSIC = ["jazzQuartet", "baroqueBand", "bachBrass", "oboeTrio"] as const;
/** The four's instruments as D430-D504 seated them (the slots), kept. */
const SLOTS: Record<(typeof CLASSIC)[number], readonly PatchId[]> = {
  jazzQuartet: ["jqVibes", "jqPiano", "jqPiano", "jqPiano", "jqBass"],
  baroqueBand: ["bandViolin", "bandViolin", "bandOboe", "bandViola", "bandCello"],
  bachBrass: ["bachTrumpet", "bachTrumpet", "bachHorn", "bachTrombone", "bachBass"],
  oboeTrio: ["trioOboe1", "trioOboe2", "trioHarpsi", "trioBassoon", "trioCello"],
};

test("D549-D552: each keeps its instruments, its chain the study's", () => {
  for (const band of CLASSIC) {
    const p = presetById(band);
    assert.equal(p.id, band);
    assert.deepEqual(p.slots, SLOTS[band], band);
    assert.equal(p.chain, BAND_CHAINS[band]);
  }
  assert.ok(presetById("oboeTrio").alts?.[3]);
});

test("D549: JAZZ QUARTET's vibraphone in its chain's lane, the piano's inner voices spread by register", () => {
  const p = presetById("jazzQuartet");
  assert.equal(p.lanes?.jqVibes, "vibes");
  assert.ok("vibes" in (BAND_CHAINS.jazzQuartet.lanes ?? {}));
  const four = p.by?.[4] ?? [];
  assert.deepEqual(four.filter((x) => x[0] === "jqPiano").map((x) => x[1]), [0.12, 0.2]);
  for (const n of [1, 2, 3, 4, 5]) for (const [, pan] of p.by?.[n] ?? []) assert.ok(Math.abs(pan) <= 0.22);
});

test("D549, D552: the layers each keeps are its instruments' own, and it stays within the budget", () => {
  for (const band of CLASSIC) {
    const p = presetById(band);
    const keep = p.slim?.keep ?? [];
    assert.equal(p.slim?.rate, BAND_SLIM.rate);
    const layers = new Set(
      (p.slots ?? [])
        .map((id) => PATCHES[id as PatchId].sample)
        .filter((s): s is keyof typeof SAMPLED => !!s && s in SAMPLED)
        .flatMap((s) => [SAMPLED[s].soft?.set, SAMPLED[s].hard?.set, SAMPLED[s].short?.set, SAMPLED[s].blend?.set]),
    );
    for (const set of keep) assert.ok(layers.has(set), `${band}: ${set} a layer of its instruments`);
    assert.ok(presetBudget(p.id).mb <= PRESET_MB, `${band} within ${PRESET_MB} MB`);
  }
  assert.ok(presetById("jazzQuartet").slim?.keep?.includes("jazzVibesHard"));
  // D560: the grand's soft layer would take JAZZ QUARTET over 25 MB (27.0): one layer of piano in it.
  assert.ok(!presetById("jazzQuartet").slim?.keep?.includes("grandSoft"));
  assert.ok(presetById("oboeTrio").slim?.keep?.includes("trioOboe1Short"));
});

test("D549-D552: each chain's room returns at most as much as the original's (calibrated levels), a phone's less", () => {
  for (const band of CLASSIC) {
    const r: ReverbOpts = BAND_CHAINS[band].reverb;
    const level = r.level ?? 1;
    assert.ok(level < 0.6, band);
    assert.ok((r.phoneLevel ?? level) < level, band);
  }
});

test("D560: no default sound and no offered sound a v2 id", () => {
  for (const s of Object.values(PIECE_SOUND)) assert.ok(!s.endsWith("V2"), s);
  for (const p of PRESETS) assert.ok(!p.id.endsWith("V2"), p.id);
});
