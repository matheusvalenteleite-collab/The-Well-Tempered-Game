/**
 * D549-D552, the classic four's v2s (JAZZ QUARTET, BAROQUE BAND, BACH BRASS, ZELENKA TRIO): their instruments kept as the
 * originals' (the owner likes them), each its study's chain (band-fx.ts BAND_CHAINS) with the return calibrated to the
 * original's room, the layers they keep (Slim.keep) real layers of their instruments, within the budget; no default moved.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BAND_CHAINS, type ReverbOpts } from "../src/touch/band-fx.ts";
import { presetBudget, PRESET_MB } from "../src/touch/budget.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { SAMPLED } from "../src/touch/sampled.ts";
import { PATCHES, PRESETS, presetById, V2_SLIM, type PatchId } from "../src/touch/sound.ts";

const CLASSIC = ["jazzQuartet", "baroqueBand", "bachBrass", "oboeTrio"] as const;

test("D549-D552: each v2 keeps its original's instruments, seats aside (no voice re-instrumented)", () => {
  for (const band of CLASSIC) {
    const v1 = presetById(band);
    const v2 = presetById(`${band}V2`);
    assert.equal(v2.id, `${band}V2`);
    assert.deepEqual(v2.slots, v1.slots, band);
    for (const n of [1, 2, 3, 4, 5]) {
      const a = (v1.by?.[n] ?? []).map((x) => x[0]);
      const b = (v2.by?.[n] ?? []).map((x) => x[0]);
      assert.deepEqual(b, a, `${band}, ${n} voices`);
    }
    assert.deepEqual(v2.alts, v1.alts, band);
    assert.equal(v2.chain, BAND_CHAINS[band]);
  }
});

test("D549: JAZZ v2's vibraphone in its chain's lane, the piano's inner voices spread by register", () => {
  const v2 = presetById("jazzQuartetV2");
  assert.equal(v2.lanes?.jqVibes, "vibes");
  assert.ok("vibes" in (BAND_CHAINS.jazzQuartet.lanes ?? {}));
  const four = v2.by?.[4] ?? [];
  assert.deepEqual(four.filter((x) => x[0] === "jqPiano").map((x) => x[1]), [0.12, 0.2]);
  for (const n of [1, 2, 3, 4, 5]) for (const [, pan] of v2.by?.[n] ?? []) assert.ok(Math.abs(pan) <= 0.22);
});

test("D549, D552: the layers a v2 keeps are its instruments' own, and it stays within the budget", () => {
  for (const band of CLASSIC) {
    const v2 = presetById(`${band}V2`);
    const keep = v2.slim?.keep ?? [];
    assert.equal(v2.slim?.rate, V2_SLIM.rate);
    const layers = new Set(
      (v2.slots ?? [])
        .map((id) => PATCHES[id as PatchId].sample)
        .filter((s): s is keyof typeof SAMPLED => !!s && s in SAMPLED)
        .flatMap((s) => [SAMPLED[s].soft?.set, SAMPLED[s].hard?.set, SAMPLED[s].short?.set, SAMPLED[s].blend?.set]),
    );
    for (const set of keep) assert.ok(layers.has(set), `${band}: ${set} a layer of its instruments`);
    assert.ok(presetBudget(v2.id).mb <= PRESET_MB, `${band}V2 within ${PRESET_MB} MB`);
  }
  assert.ok(presetById("jazzQuartetV2").slim?.keep?.includes("jazzVibesHard"));
  assert.ok(presetById("oboeTrioV2").slim?.keep?.includes("trioOboe1Short"));
});

test("D549-D552: each chain's room returns at most as much as the original's (calibrated levels), a phone's less", () => {
  for (const band of CLASSIC) {
    const r: ReverbOpts = BAND_CHAINS[band].reverb;
    const level = r.level ?? 1;
    assert.ok(level < 0.6, band);
    assert.ok((r.phoneLevel ?? level) < level, band);
  }
});

test("D549-D552: no default sound moved to a v2", () => {
  for (const s of Object.values(PIECE_SOUND)) assert.ok(!s.endsWith("V2"), s);
  for (const p of PRESETS) assert.ok(!p.id.endsWith("V2"), p.id);
});
