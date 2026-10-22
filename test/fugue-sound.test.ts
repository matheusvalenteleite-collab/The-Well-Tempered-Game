import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFugueSound, D200_PATCHES, DESIGNATED, FUGUE_SOUNDS, fugueSound, presetForFugue, REGISTER, slotsFor } from "../src/touch/fugue-sound.ts";
import { FUGUES, beatOf, fugueById } from "../src/touch/fugue.ts";
import { grooveHits, PATCHES, preset, PRESETS, setPreset, slotOf, type Groove } from "../src/touch/sound.ts";
import { TEMPERAMENTS } from "../src/touch/tuning.ts";

test("D200: every fugue (the 48 and Contrapunctus XIV) has its own designated sound, named and reasoned", () => {
  assert.equal(FUGUES.length, 49);
  assert.equal(FUGUE_SOUNDS.length, 49);
  assert.equal(new Set(FUGUE_SOUNDS.map((s) => s.id)).size, 49);
  assert.equal(new Set(FUGUE_SOUNDS.map((s) => s.name)).size, 49);
  for (const f of FUGUES) {
    const s = FUGUE_SOUNDS.find((x) => x.id === f.id);
    assert.ok(s, f.id);
    assert.ok(s.why.length > 40, f.id);
    assert.match(s.name, /^(I|II|XIV)(\/\d+)? · [A-Z0-9' -]+$/, f.id);
    const p = fugueSound(f.id);
    assert.equal(p.id, `fugue:${f.id}`);
    assert.equal(p.name, s.name);
    assert.ok(p.room && p.room >= 0.24 && p.room <= 0.45, f.id);
    if (s.temperament) assert.ok(TEMPERAMENTS.some((t) => t.id === s.temperament), f.id);
  }
});

test("D200: the slots are valid patches, one instrument per voice, in the place slotOf gives it", () => {
  for (const s of FUGUE_SOUNDS) {
    const f = fugueById(s.id);
    assert.equal(s.voices.length, f.voices.length, s.id);
    const p = fugueSound(s.id);
    assert.ok(p.slots && p.slots.length === 5, s.id);
    for (const id of p.slots) assert.ok(id in PATCHES, `${s.id}: ${id}`);
    for (let v = 0; v < f.voices.length; v++) assert.equal(p.slots[slotOf(v, f.voices.length)], s.voices[v], `${s.id} voice ${v}`);
  }
  assert.deepEqual(slotsFor(["violin", "cello"]), ["violin", "violin", "violin", "cello", "cello"]);
});

test("D200: each voice's instrument suits its register: every note within the instrument's compass", () => {
  for (const s of FUGUE_SOUNDS) {
    const f = fugueById(s.id);
    for (const [v, notes] of f.voices.entries()) {
      const r = REGISTER[s.voices[v]];
      assert.ok(r, `${s.id}: ${s.voices[v]} has no register`);
      const midi = notes.map((n) => n[2]);
      const lo = Math.min(...midi);
      const hi = Math.max(...midi);
      assert.ok(lo >= r[0] && hi <= r[1], `${s.id} ${f.voiceNames[v]} ${lo}-${hi} on ${s.voices[v]} ${r[0]}-${r[1]}`);
    }
  }
});

test("D200: voices told apart: in no fugue do two voices share an instrument", () => {
  for (const s of FUGUE_SOUNDS) assert.equal(new Set(s.voices).size, s.voices.length, s.id);
});

test("D200: no backbeat: the fugues' loops have no snare or clap, and nothing after the downbeat outweighs it", () => {
  const used = new Set(FUGUE_SOUNDS.map((s) => s.groove).filter((g): g is Groove => !!g));
  for (const s of FUGUE_SOUNDS) {
    if (!s.groove) continue;
    const f = fugueById(s.id);
    const { perBar } = beatOf(f);
    const [num] = f.meter.split("/").map(Number);
    const compound = num % 3 === 0 && num > 3;
    for (const bar of [1, 2]) {
      const down = grooveHits(s.groove, 0, bar, perBar, compound).filter((h) => h.at === 0);
      const top = Math.max(...down.map((h) => h.vel));
      assert.ok(top > 0, `${s.id}: nothing on the downbeat`);
      for (let b = 0; b < perBar; b++) {
        for (const h of grooveHits(s.groove, b, bar, perBar, compound)) {
          assert.ok(h.drum !== "snare" && h.drum !== "clap", `${s.id} ${s.groove}: ${h.drum}`);
          if (b > 0 || h.at > 0) assert.ok(h.vel <= top, `${s.id} ${s.groove}: beat ${b} ${h.drum} ${h.vel} over the downbeat's ${top}`);
        }
      }
    }
  }
  // And every new loop, in every metre the game counts.
  for (const g of ["tactus", "lament", "toccata", "gigue", "passepied", "minuet", "sarabande", "gavotte", "overture", "triplet"] as Groove[])
    for (const per of [1, 2, 3, 4])
      for (const compound of [false, true])
        for (let b = 0; b < per; b++) for (const h of grooveHits(g, b, 0, per, compound)) assert.ok(h.drum !== "snare" && h.drum !== "clap", g);
  assert.ok(used.size >= 8);
});

test("D200: the bossa's principles: soft bodies (every new instrument has a sine or triangle), modest drive, gentle vibrato", () => {
  for (const id of D200_PATCHES) {
    const p = PATCHES[id];
    assert.ok(p.osc.some((o) => o.wave === "sine" || o.wave === "triangle"), id);
    assert.ok(!("drive" in p) || (p as { drive?: number }).drive! <= 1, id);
    if ("vib" in p && p.vib) assert.ok(p.vib.depth <= 12 && p.vib.rate <= 6, id);
  }
});

test("D200: applying: setPreset takes a preset itself; a DESIGNATED setting gives the fugue's own, any other the ensemble", () => {
  const before = preset();
  const p = applyFugueSound("wtc1f02");
  assert.equal(preset(), p);
  assert.equal(p.name, "I/2 · NIGHT TRIO");
  assert.equal(presetForFugue("wtc1f02", DESIGNATED).id, "fugue:wtc1f02");
  assert.equal(presetForFugue("wtc1f02", "strings").id, "strings");
  // A prelude gives its fugue's; an unknown id the bossa.
  assert.equal(fugueSound("wtc1p02").id, "fugue:wtc1f02");
  assert.equal(fugueSound("nope").id, "bossa");
  setPreset("jazz");
  assert.equal(preset().id, "jazz");
  setPreset(before);
  // The ensembles are untouched.
  assert.equal(PRESETS.length, 20);
});
