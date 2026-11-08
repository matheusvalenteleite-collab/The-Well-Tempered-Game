/**
 * D510: LUTE, CLAVICHORD and NOCTURNE 32-BIT withdrawn (a stored choice on the nearest kept sound), the fugues reallocated
 * (the owner's requests, neighbours different), and the jazz bass mended (a leap a fresh pluck, the ff recordings from
 * Busoni's f, each recording evened on a phone).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PATCHES, PRESETS, RETIRED, offered, presetById } from "../src/touch/sound.ts";
import { JAZZ_BASS_HARD_ABOVE, SAMPLED, noteInfo, sampledMidis } from "../src/touch/sampled.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { BASS_SLIDE_MAX, slideGesture } from "../src/bench/slide-sound.ts";
import { OWN_LOUD, SOUND_LOUD } from "../src/touch/player-lift-data.ts";
import { COLOURS } from "../tools/touch/colour-plans/index.ts";

const FUGUES = Array.from({ length: 48 }, (_, n) => `wtc${n < 24 ? 1 : 2}f${String((n % 24) + 1).padStart(2, "0")}`);

test("D510: the three withdrawn, a stored choice on the nearest kept sound; nothing opens on them", () => {
  for (const [gone, to] of [["lute", "harpsichordSampled"], ["clavichord", "pianoSampled"], ["nocturne32", "super16"]] as const) {
    assert.ok(!offered(gone) && !PRESETS.some((p) => p.id === gone), gone);
    assert.equal(RETIRED[gone], to);
    assert.equal(presetById(gone).id, to);
    assert.ok(!Object.values(PIECE_SOUND).includes(gone), gone);
  }
  for (const p of ["lute2", "clavichord", "n32Violin", "n32Organ"]) assert.equal((PATCHES as Record<string, unknown>)[p], undefined, p);
  for (const id of Object.keys(SAMPLED)) assert.ok(!/32$|^luteGuitar$/.test(id), id);
  for (const s of ["lute", "clavichord", "nocturne32"]) assert.equal(SOUND_LOUD[s], undefined, s);
});

test("D510: the allocation: the owner's requests, neighbours different, JAZZ QUARTET and SID 64 given more, each fugue's lift measured on its sound", () => {
  const want: Record<string, string> = { wtc1f14: "jazzQuartet", wtc2f17: "chip", wtc1f12: "vocalSynth", wtc2f18: "jazzQuartet", wtc1f10: "soloVoices" };
  for (const [id, s] of Object.entries(want)) assert.equal(PIECE_SOUND[id], s, id);
  for (let k = 1; k < 48; k++) if (k !== 24) assert.notEqual(PIECE_SOUND[FUGUES[k]], PIECE_SOUND[FUGUES[k - 1]], `${FUGUES[k - 1]}, ${FUGUES[k]}`);
  const count = (s: string) => FUGUES.filter((id) => PIECE_SOUND[id] === s).length;
  // (D520: II/10 to SALSA; D521: I/9 to SID 64, which keeps four.)
  assert.ok(count("jazzQuartet") >= 7 && count("sid64") >= 4);
  for (const id of FUGUES) {
    assert.equal(COLOURS[id].sound, PIECE_SOUND[id], id);
    assert.equal(OWN_LOUD[id]?.s, PIECE_SOUND[id], `${id}: the lift measured on its own sound`);
  }
  for (const id of ["wtc1f06", "wtc1f10", "wtc1f12", "wtc1f14", "wtc1f24", "wtc2f03", "wtc2f04", "wtc2f06", "wtc2f17", "wtc2f18", "wtc2f19", "wtc2f24"]) assert.match(COLOURS[id].soundWhy, /D510/, id);
});

test("D510: the jazz bass: a slide a semitone or a tone, a leap a fresh pluck; its ff from Busoni's f; each recording evened on a phone", () => {
  const c = new Set([0, 2, 4, 5, 7, 9, 11]);
  assert.equal(BASS_SLIDE_MAX, 2);
  for (const to of [41, 42]) assert.equal(slideGesture("jazzQuartet", 40, to, 600, c, "schleifer", PATCHES.jqBass).kind, "glide", `${to}`);
  for (const to of [43, 45, 52, 28]) assert.deepEqual(slideGesture("jazzQuartet", 40, to, 600, c, "schleifer", PATCHES.jqBass), { kind: "notes", name: "pluck", notes: [], eachS: 0 }, `${to}`);
  // The vibraphone and the other sounds' slides unchanged.
  assert.equal(slideGesture("stringConsort", 40, 52, 600, c).kind, "glide");
  assert.ok(JAZZ_BASS_HARD_ABOVE > 1.5 && JAZZ_BASS_HARD_ABOVE < 1.8);
  assert.equal(SAMPLED.jazzBass.hard!.above, JAZZ_BASS_HARD_ABOVE);
  for (const set of ["jazzBass", "jazzBassHard"]) {
    const ms = sampledMidis(set);
    assert.ok(ms.length >= 20 && ms[0] === 28, set);
    const t = ms.map((m) => noteInfo(set, m)?.phoneDb ?? 0);
    assert.ok(t.every((d) => d >= -6 && d <= 4), `${set}: within -6 and +4 dB`);
    assert.ok(t.filter((d) => d !== 0).length >= ms.length / 2, `${set}: measured`);
  }
  // Only the bass's recordings trimmed.
  assert.equal(noteInfo("jazzVibes", 60)?.phoneDb, undefined);
});
