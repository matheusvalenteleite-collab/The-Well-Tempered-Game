/**
 * D630, SOUND BLURBS: every offered sound (PRESETS, SoundSelect's SOUND_GROUPS) has a one-line description in English,
 * Brazilian Portuguese and Spanish, each at most 60 characters; an unknown id has none. Every sound's audition clip
 * (public/audition/<id>.mp3: I/2 from bar 7, 3.5 s) exists, the clips under 1 MB in all, each matched to -23 LUFS on the
 * phone model within 1 LU (public/audition/clips.json, tools/touch/audition/encode.cjs).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { existsSync, readFileSync, statSync } from "node:fs";
import { PRESETS } from "../src/touch/sound.ts";
import { AUDITION_SOUNDS, auditionUrl, soundBlurb } from "../src/touch/sound-blurbs.ts";

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

const PUBLIC = new URL("../public/", import.meta.url);
const CLIPS = JSON.parse(readFileSync(new URL("audition/clips.json", PUBLIC), "utf8")) as { target: number; phrase: { piece: string; fromBar: number; secs: number }; clips: Record<string, { lufs: number; drums: string }> };

test("D630: every sound in the list has its audition clip, and an unknown id none", () => {
  const listed = SOUND_GROUPS.flatMap(([, ids]) => ids);
  assert.deepEqual([...AUDITION_SOUNDS].sort(), [...new Set(listed)].sort());
  for (const id of listed) {
    const url = auditionUrl(id);
    assert.equal(url, `audition/${id}.mp3`, id);
    const file = new URL(url!, PUBLIC);
    assert.ok(existsSync(file), `${id}: ${url} missing`);
    assert.ok(statSync(file).size > 4000, `${id}: clip too small`);
  }
  for (const id of ["", "nope", "toString", "traverso"]) assert.equal(auditionUrl(id), null, id);
});

test("D630: the clips under 1 MB in all, each matched to -23 LUFS on the phone model within 1 LU", () => {
  assert.equal(CLIPS.target, -23);
  assert.deepEqual(CLIPS.phrase && [CLIPS.phrase.piece, CLIPS.phrase.fromBar, CLIPS.phrase.secs], ["wtc1f02", 7, 3.5]);
  let total = 0;
  for (const id of AUDITION_SOUNDS) {
    total += statSync(new URL(`audition/${id}.mp3`, PUBLIC)).size;
    const c = CLIPS.clips[id];
    assert.ok(c, `${id}: not measured`);
    assert.ok(Math.abs(c.lufs - -23) <= 1, `${id}: ${c.lufs} LUFS`);
  }
  assert.ok(total < 1024 * 1024, `${total} bytes`);
});

test("D630: ORCHESTRA & ORGAN's clip at its last stage; the timpani sounds' clips with their tonic strokes", () => {
  const c = CLIPS.clips as Record<string, { notes?: string[]; timpAt?: number[] }>;
  assert.match(c.orchestraOrgan.notes?.join(" ") ?? "", /full complement/);
  for (const id of ["chamberOrgan", "baroqueBand", "orchestraOrgan"]) {
    assert.ok((c[id].timpAt?.length ?? 0) >= 1 && (c[id].timpAt?.length ?? 0) <= 3, id);
    assert.ok(!/clash/.test(c[id].notes?.join(" ") ?? ""), `${id}: a stroke on a clash`);
  }
});
