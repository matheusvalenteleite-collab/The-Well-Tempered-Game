/**
 * D855-D856, D858, D912: BWV 54'S ALTO (D912: the owner's pick, m3, the oboe leading and the sung alto 3 dB under in unison,
 * is the default on SUPER 16-BIT, its `pieces`; the other trials removed). The owner: "I used to love BWV 54 in the game … It's absurd that even
 * the solo [alto] had the same sound as the orchestra." On SUPER 16-BIT the alto sings on the violas' own patch; until D434
 * the FAST step played it on TRACKER, the alto alone on the choir. PIECE_TRIALS (sound.ts) gives the alto a timbre of its
 * own three ways; heard with `?trial=<id>`; the default (PIECE_SOUND) unchanged until the owner picks. Each trial passes the
 * standing rules: no note in another octave (the line-ups only seat voices), no read past STRETCH_MAX, none past its set's
 * declared reach unstretched (D850), the bass on its own instrument, the budget (D540: 25 MB decoded, 40 resident).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { PIECE_SOUND, soundFor } from "../src/touch/piece-sound.ts";
import { PATCHES, PIECE_TRIALS, patchIdFor, pieceLineUp, pieceTrialNow, setPieceLayout, setPreset } from "../src/touch/sound.ts";
import { nearestSample, reachOf, SAMPLED, setFor, STRETCH_MAX } from "../src/touch/sampled.ts";
import { PRESET_MB, RESIDENT_MB, presetBudget } from "../src/touch/budget.ts";

await loadExtras();
const IDS = ["bwv54-1", "bwv54-3"];
const ALTO: Record<string, number> = { "bwv54-1": 4, "bwv54-3": 2 };

test("D912: BWV 54 opens on SUPER 16-BIT, the alto on the layered oboe and voice (altoM3), its own; no trial left", () => {
  assert.equal(pieceTrialNow(), null);
  assert.deepEqual(Object.keys(PIECE_TRIALS), []);
  for (const id of IDS) {
    assert.equal(PIECE_SOUND[id], "super16");
    assert.equal(soundFor(id, {}, "chip"), "super16");
    const f = fugueById(id);
    setPreset("super16");
    setPieceLayout(pieceLineUp("super16", f));
    const ids = f.voices.map((_, v) => patchIdFor(v, f.voices.length));
    assert.equal(ids[ALTO[id]], "altoM3", id);
    assert.equal(ids.filter((p) => p === "altoM3").length, 1, id);
    assert.ok(PATCHES.altoM3.double && PATCHES.altoM3.double.patch.sample === "voiceA" && PATCHES.altoM3.sample === "trioOboe1", id);
    setPieceLayout(null);
  }
});

test("D912: no note of any voice read past STRETCH_MAX, none past its declared reach, the layer's voice too (D640, D850); the budget (D540)", () => {
  for (const id of IDS) {
    const f = fugueById(id);
    const lu = pieceLineUp("super16", f)!;
    f.voices.forEach((vs, v) => {
      const pt0 = PATCHES[lu.slots[v][0]];
      for (const pt of [pt0, ...(pt0.double ? [pt0.double.patch] : [])]) {
        const inst = pt.sample ? SAMPLED[pt.sample] : null;
        if (!inst) continue;
        for (const [, , m] of vs) {
          const set = setFor(inst, m);
          const near = nearestSample(set, m)!;
          const r = reachOf(inst, set);
          assert.ok(Math.abs(m - near) <= STRETCH_MAX, `${id} v${v}: ${m} read from ${near}`);
          assert.ok(m >= r.lo && m <= r.hi, `${id} v${v}: ${m} past its reach`);
        }
      }
    });
  }
  const b = presetBudget("super16", IDS);
  console.log(`super16 over BWV 54: ${b.mb.toFixed(1)} MB decoded, resident ${b.residentMb.toFixed(1)} MB`);
  assert.ok(b.mb <= PRESET_MB && b.residentMb <= RESIDENT_MB);
});
