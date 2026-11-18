/**
 * D855-D856, D858: BWV 54'S ALTO, TRIALS (not offered; D858: v1, TRACKER, dropped; m1-m3 the sung alto and the oboe layered). The owner: "I used to love BWV 54 in the game … It's absurd that even
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
import { PATCHES, PIECE_TRIALS, patchIdFor, pieceLineUp, pieceTrialNow, presetById, setPieceLayout, setPieceTrial, setPreset } from "../src/touch/sound.ts";
import { nearestSample, reachOf, SAMPLED, setFor, STRETCH_MAX } from "../src/touch/sampled.ts";
import { PRESET_MB, RESIDENT_MB, presetBudget } from "../src/touch/budget.ts";

await loadExtras();
const IDS = ["bwv54-1", "bwv54-3"];
const ALTO: Record<string, number> = { "bwv54-1": 4, "bwv54-3": 2 };

test("D855: the trials are off by default; BWV 54 opens on SUPER 16-BIT as before", () => {
  assert.equal(pieceTrialNow(), null);
  for (const id of IDS) {
    assert.equal(PIECE_SOUND[id], "super16");
    assert.equal(soundFor(id, {}, "chip"), "super16");
  }
});

test("D855: each trial seats every voice of both arias, the alto on an instrument of its own (no other voice on its patch)", () => {
  assert.deepEqual(Object.keys(PIECE_TRIALS), ["bwv54-v2", "bwv54-v3", "bwv54-m1", "bwv54-m2", "bwv54-m3"]);
  for (const [tid, t] of Object.entries(PIECE_TRIALS)) {
    setPieceTrial(tid);
    try {
      for (const id of IDS) {
        const f = fugueById(id);
        assert.equal(soundFor(id, {}, "chip"), t.sound, `${tid} ${id}`);
        const lu = pieceLineUp(t.sound, f);
        assert.ok(lu && lu.slots.length === f.voices.length, `${tid} ${id}: a line-up for its ${f.voices.length} voices`);
        setPreset(t.sound);
        setPieceLayout(lu);
        const ids = f.voices.map((_, v) => patchIdFor(v, f.voices.length));
        const alto = ids[ALTO[id]];
        assert.equal(ids.filter((p) => p === alto).length, 1, `${tid} ${id}: the alto's ${alto} its own`);
        assert.ok(PATCHES[alto!], `${tid} ${id}`);
        // the bass on the sound's own bass instrument (as the sound seats it without the trial)
        setPieceTrial(null);
        setPieceLayout(pieceLineUp(t.sound, f));
        const bassOwn = patchIdFor(f.voices.length - 1, f.voices.length);
        setPieceTrial(tid);
        assert.equal(ids[f.voices.length - 1], bassOwn, `${tid} ${id}: the bass keeps its instrument`);
      }
    } finally {
      setPieceTrial(null);
      setPieceLayout(null);
    }
  }
});

test("D855: no note of any voice read past STRETCH_MAX from a recording, none past its set's declared reach (D640, D850)", () => {
  const worst: string[] = [];
  for (const [tid, t] of Object.entries(PIECE_TRIALS)) {
    setPieceTrial(tid);
    try {
      for (const id of IDS) {
        const f = fugueById(id);
        const lu = pieceLineUp(t.sound, f)!;
        f.voices.forEach((vs, v) => {
          const pt0 = PATCHES[lu.slots[v][0]];
          let far = 0;
          // (D858: a layered alto's second instrument, Patch.double, read on the same notes)
          for (const pt of [pt0, ...(pt0.double ? [pt0.double.patch] : [])]) {
          const inst = pt.sample ? SAMPLED[pt.sample] : null;
          if (!inst) continue;
          for (const [, , m] of vs) {
            const set = setFor(inst, m);
            const near = nearestSample(set, m);
            const r = reachOf(inst, set);
            assert.ok(near !== null, `${tid} ${id} v${v}`);
            far = Math.max(far, Math.abs(m - near!));
            assert.ok(Math.abs(m - near!) <= STRETCH_MAX, `${tid} ${id} v${v} ${lu.slots[v][0]}: ${m} read from ${near}`);
            assert.ok(m >= r.lo && m <= r.hi, `${tid} ${id} v${v} ${lu.slots[v][0]}: ${m} past its reach ${r.lo}-${r.hi}`);
          }
          }
          if (v === ALTO[id]) worst.push(`${tid} ${id} alto ${lu.slots[v][0]}: worst read ${far}`);
        });
      }
    } finally {
      setPieceTrial(null);
    }
  }
  console.log(worst.join("\n"));
});

test("D855: the budget: each trial's sound over both arias within 25 MB decoded and 40 MB resident (D540)", () => {
  for (const [tid, t] of Object.entries(PIECE_TRIALS)) {
    setPieceTrial(tid);
    try {
      const b = presetBudget(t.sound, IDS);
      console.log(`${tid} ${presetById(t.sound).id}: ${b.mb.toFixed(1)} MB decoded (${b.piece} v${b.voice}), resident ${b.residentMb.toFixed(1)} MB`);
      assert.ok(b.mb <= PRESET_MB && b.residentMb <= RESIDENT_MB, tid);
    } finally {
      setPieceTrial(null);
    }
  }
});
