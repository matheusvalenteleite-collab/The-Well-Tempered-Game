import { test } from "node:test";
import assert from "node:assert/strict";
import { DULL_VOICES, voicesFrom } from "../src/touch/voice-mode.ts";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";

await loadExtras();

test("D864: the dull lines are not offered, every piece keeps a voice, and its default voice is still offered", () => {
  for (const [id, dull] of Object.entries(DULL_VOICES)) {
    const f = fugueById(id);
    const offered = voicesFrom(f, 0);
    for (const v of dull) assert.ok(!offered.includes(v), `${id} voice ${v} offered`);
    assert.ok(offered.length > 0, `${id} keeps a voice`);
    if (f.defaultVoice !== undefined) assert.ok(offered.includes(f.defaultVoice), `${id} default voice ${f.defaultVoice}`);
  }
});
