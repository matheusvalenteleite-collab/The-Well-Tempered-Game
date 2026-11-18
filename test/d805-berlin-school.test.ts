/**
 * D805-D808: BERLIN SCHOOL rebuilt in place (D803's CLEAR, chosen by D805's rule over CLEAR+MOTION), its id kept so its six
 * pieces keep their default; the trial versions gone; the standing rules held (D308's release, D299's attacks, D585's seating).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PATCHES, PRESETS, TRIALS, presetById, pieceLevel } from "../src/touch/sound.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";

test("D805: BERLIN SCHOOL is CLEAR, in place: pulse lead, plucked sequencer, glassy pad, dry bass; no trial left", () => {
  const p = presetById("berlinSchool");
  assert.ok(PRESETS.includes(p));
  assert.deepEqual(p.slots, ["bsLead", "bsSeq", "bsStrings", "bsSeq", "bsBass"]);
  assert.deepEqual(PATCHES.bsLead.osc.map((o) => o.wave), ["pulse50", "pulse25"]);
  assert.equal(PATCHES.bsBass.send ?? 0, 0, "the bass dry");
  assert.ok(!PATCHES.bsSeq.filter?.sweep && !PATCHES.bsLead.filter?.sweep, "CLEAR+MOTION's sweeps not taken");
  for (const id of ["berlinWarm", "berlinModular", "berlinClear", "berlinBlend"]) {
    assert.ok(!TRIALS.some((t) => t.id === id) && !PRESETS.some((t) => t.id === id), id);
    assert.notEqual(presetById(id).id, id);
  }
  for (const k of Object.keys(PATCHES)) assert.ok(!/^b[wmcx][A-Z]/.test(k), k);
  const six = Object.entries(PIECE_SOUND).filter(([, s]) => s === "berlinSchool").map(([id]) => id).sort();
  assert.deepEqual(six, ["bwv1080-01", "bwv1080-c17", "bwv773", "bwv780", "bwv802", "wtc1f02"]);
  for (let n = 1; n <= 5; n++) for (const [, pan] of p.by![n]!) assert.ok(Math.abs(pan) <= 0.3);
  // Contrapunctus I 1.5 dB down on a phone (D715's limit), the computer path as it was.
  const db = 20 * Math.log10(pieceLevel("berlinSchool", "bwv1080-01", true));
  assert.ok(db < -1.4 && db >= -1.5, `${db}`);
  assert.equal(pieceLevel("berlinSchool", "bwv1080-01", false), 1);
});
