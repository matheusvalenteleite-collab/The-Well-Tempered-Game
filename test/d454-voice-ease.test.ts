/**
 * D454: the voice offered first is the fugue's easiest (difficulty.ts voiceDifficulty, baked in voice-ease.ts);
 * II/6 never offers the alto; the player's own last choice wins.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import { voiceDifficulty } from "../src/bench/difficulty.ts";
import { VOICE_SCORES } from "../src/bench/voice-ease.ts";
import { defaultVoice } from "../src/bench/flow.ts";

const ids = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));
const all = (id: string) => fugueById(id).voices.map((_, i) => i);

test("D454: the baked scores are the notes' (rerun tools/touch/voice-ease.ts after a change)", () => {
  assert.deepEqual(Object.keys(VOICE_SCORES).sort(), ids);
  for (const id of ids) {
    const f = fugueById(id);
    assert.deepEqual(VOICE_SCORES[id], f.voices.map((_, v) => voiceDifficulty(f, v).score), id);
  }
});

test("D454: II/6 never offers the alto; every fugue offers its easiest voice, fresh or finished", () => {
  const f = fugueById("wtc2f06");
  const alto = f.voiceNames.indexOf("Alto");
  assert.ok(alto >= 0);
  for (const fresh of [true, false]) assert.notEqual(defaultVoice(f, all("wtc2f06"), { fresh }), alto);
  for (const id of ids) {
    const s = VOICE_SCORES[id];
    const v = defaultVoice(fugueById(id), all(id), { fresh: true });
    assert.equal(s[v], Math.min(...s), id);
    assert.equal(defaultVoice(fugueById(id), all(id)), v, `${id}: the same once finished`);
  }
  // A voice that cannot be taken is passed over for the next easiest.
  const sop = defaultVoice(f, all("wtc2f06"));
  const rest = all("wtc2f06").filter((v) => v !== sop);
  const next = rest.reduce((b, v) => (VOICE_SCORES.wtc2f06[v] < VOICE_SCORES.wtc2f06[b] ? v : b), rest[0]);
  assert.equal(defaultVoice(f, rest), next);
});

test("D454: the player's last choice wins, finished or not", async () => {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
  const { liteVoice, saveLastVoice } = await import("../src/bench/lite.ts");
  const f = fugueById("wtc2f06");
  saveLastVoice("wtc2f06", 1);
  assert.equal(liteVoice(f, all("wtc2f06"), false), 1);
  assert.equal(liteVoice(f, all("wtc2f06"), true), 1);
  store.clear();
  assert.equal(liteVoice(f, all("wtc2f06"), false), defaultVoice(f, all("wtc2f06"), { fresh: true }));
});
