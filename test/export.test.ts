import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeMp3, encodeWav, toInt16 } from "../src/audio/export.ts";

const tone = (n: number, sr: number) => Float32Array.from({ length: n }, (_, i) => 0.5 * Math.sin((2 * Math.PI * 440 * i) / sr));

test("export (D74): 16-bit conversion, a valid WAV header, an MP3 stream", async () => {
  assert.deepEqual([...toInt16(Float32Array.from([0, 1, -1, 2]))], [0, 32767, -32768, 32767]);
  const sr = 44100;
  const ch = [tone(sr, sr), tone(sr, sr)];
  const wav = new Uint8Array(await encodeWav(ch, sr).arrayBuffer());
  assert.equal(String.fromCharCode(...wav.slice(0, 4)), "RIFF");
  assert.equal(wav.length, 44 + sr * 2 * 2);
  const mp3 = new Uint8Array(await encodeMp3(ch, sr).arrayBuffer());
  // An MPEG frame sync (11 set bits) at the start, and about 192 kbps for one second.
  assert.equal(mp3[0], 0xff);
  assert.equal(mp3[1] & 0xe0, 0xe0);
  assert.ok(mp3.length > 20000 && mp3.length < 30000, String(mp3.length));
});
