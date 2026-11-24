// node --test prototypes/bow-test2/test/loop.test.cjs
const test = require("node:test");
const assert = require("node:assert");
require("../loopcore.js");
const C = globalThis.LoopCore;
const S = { bpm: 120, beats: 4, bars: 2 }; // loop = 4 s, sixteenth = 0.125 s

test("loop length", () => { assert.strictEqual(C.loopLen(S), 4); assert.strictEqual(C.loopLen({ bpm: 90, beats: 3, bars: 4 }), 8); });

test("a note held across the loop's end wraps: it starts near the end and runs on into the next pass", () => {
  const take = { notes: [{ on: 3.7, off: 4.4, midi: 62 }, { on: -0.05, off: 0.3, midi: 64 }, { on: 1, off: 9, midi: 65 }] };
  const [a, b, c] = C.playNotes(take, S, "off");
  assert.ok(Math.abs(a.start - 3.7) < 1e-9 && Math.abs(a.dur - 0.7) < 1e-9, "kept whole, not cut at 4.0");
  assert.ok(Math.abs(b.start - 3.95) < 1e-9, "a touch just before the top lands at the loop's end (it precedes the top on repeat)");
  assert.ok(Math.abs(c.dur - 3.99) < 1e-9, "never longer than the loop");
});

test("quantizing is applied on playback only; the take is unchanged", () => {
  const take = { notes: [{ on: 0.52, off: 0.9, midi: 60 }] };
  assert.ok(Math.abs(C.playNotes(take, S, "strong")[0].start - 0.5) < 1e-9);
  assert.ok(Math.abs(C.playNotes(take, S, "light")[0].start - 0.51) < 1e-9);
  assert.ok(Math.abs(C.playNotes(take, S, "off")[0].start - 0.52) < 1e-9);
  assert.strictEqual(take.notes[0].on, 0.52);
});

test("finale: voices enter one per pass in recording order, then all together twice", () => {
  assert.deepStrictEqual(C.finalePlan(["a", "b", "c"]), [["a"], ["a", "b"], ["a", "b", "c"], ["a", "b", "c"], ["a", "b", "c"]]);
});

test("latency: median offset of the taps matched to clicks", () => {
  const clicks = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5];
  const taps = [1.04, 1.53, 2.05, 2.52, 3.04, 3.55, 4.03, 4.9 /* stray, matched to nothing within 0.25 s? 4.9 vs 4.5 = 0.4 */];
  const r = C.latencyFrom(clicks, taps);
  assert.strictEqual(r.n, 7); assert.ok(Math.abs(r.offset - 0.04) < 1e-9);
});

test("WAV and ZIP bytes", () => {
  assert.strictEqual(C.crc32(new TextEncoder().encode("123456789")).toString(16), "cbf43926");
  const w = C.wavBytes([new Float32Array([0, 0.5, -1]), new Float32Array([0, 0.5, 1])], 44100);
  assert.strictEqual(w.length, 44 + 3 * 2 * 2);
  assert.strictEqual(String.fromCharCode(...w.slice(0, 4)), "RIFF");
  const z = C.zipOne("a.wav", w);
  assert.strictEqual(new DataView(z.buffer).getUint32(0, true), 0x04034b50);
  assert.strictEqual(new DataView(z.buffer).getUint32(z.length - 22, true), 0x06054b50);
});
