/**
 * D630, SOUND BLURBS: every offered sound (PRESETS, SoundSelect's SOUND_GROUPS) has a one-line description in English,
 * Brazilian Portuguese and Spanish, each at most 60 characters; an unknown id has none; no audition clips yet.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { PRESETS } from "../src/touch/sound.ts";
import { auditionUrl, soundBlurb } from "../src/touch/sound-blurbs.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { SOUND_GROUPS } = await import("../src/bench/SoundSelect.tsx");

const LANGS = ["en", "pt", "es"] as const;
const IDS = [...new Set([...PRESETS.map((p) => p.id), ...SOUND_GROUPS.flatMap(([, ids]) => ids)])];

test("D630: every sound has a blurb in all three languages, each at most 60 characters", () => {
  assert.ok(IDS.length >= PRESETS.length && PRESETS.length > 0);
  for (const id of IDS) {
    for (const lang of LANGS) {
      const b = soundBlurb(id, lang);
      assert.ok(b.trim().length > 0, `${id} ${lang}: empty`);
      assert.ok([...b].length <= 60, `${id} ${lang}: ${[...b].length} characters: ${b}`);
      assert.ok(!b.includes("\n"), `${id} ${lang}: one line`);
    }
    assert.equal(soundBlurb(id), soundBlurb(id, "en"), `${id}: English by default`);
  }
});

test("D630: an unknown id has no blurb", () => {
  for (const id of ["", "nope", "toString", "__proto__", "traverso"]) for (const lang of LANGS) assert.equal(soundBlurb(id, lang), "", id);
});

test("D630: no audition clips yet", () => {
  for (const id of IDS) assert.equal(auditionUrl("wtc1f01", id), null);
  assert.equal(auditionUrl("", ""), null);
});
