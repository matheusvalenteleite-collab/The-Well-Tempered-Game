/**
 * D306: BLUETOOTH MODE's AUTO not kept on the speaker by a delay tapped for earbuds; the subject's heads
 * the library's finder missed (I/22 b. 61; short heads in I/13, I/24, II/1, II/4, II/16).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { btAuto, BT_AUTO_S, setupKey } from "../src/touch/headphones.ts";
import { fugueById } from "../src/touch/fugue.ts";

test("D306: AUTO: on by the reported latency; a stored delay only for the output it was tapped with, or (no latency reported) only in the page load it was tapped in", () => {
  // The browser reports a Bluetooth latency: on, whatever is stored.
  assert.equal(btAuto(null, 0.2, { fresh: false }), true);
  // Nothing stored, a speaker's latency: off.
  assert.equal(btAuto(null, 0.02, { fresh: false }), false);
  // A delay tapped with earbuds (reported 0.2 s), now the speaker (0.02 s): off.
  assert.equal(btAuto(0.25, 0.02, { setup: setupKey(0.2), fresh: true }), false);
  // ...and on with the same earbuds (the next 50 ms bucket counts as the same).
  assert.equal(btAuto(0.25, 0.22, { setup: setupKey(0.2), fresh: false }), true);
  // Safari reports no latency: a delay tapped in this page load counts; one restored from before does not.
  assert.equal(btAuto(0.25, undefined, { setup: "default", fresh: true }), true);
  assert.equal(btAuto(0.25, undefined, { setup: "default", fresh: false }), false);
  // A short delay (wired) never turns it on.
  assert.equal(btAuto(BT_AUTO_S - 0.01, undefined, { fresh: true }), false);
});

test("D306: I/22's second soprano at b. 61 (its head bent: B♭ A, then G♭ F E♭ D♭ C B♭) is an entry, highlighted", () => {
  const f = fugueById("wtc1f22");
  const e = f.entries.find((x) => x.bar === 61 && x.voice === 1);
  assert.ok(e, "b. 61, second soprano");
  assert.deepEqual(
    e.notes.map((n) => n[2]),
    [70, 69, 78, 77, 75, 73, 72, 70],
  );
  // Every five-voice entry of the closing stretto (bb. 67-69) still there.
  assert.deepEqual(
    f.entries.filter((x) => x.bar >= 67).map((x) => x.voice),
    [0, 1, 2, 3, 4],
  );
});

test("D306: the subject's head stated alone (six or seven notes, then Bach's own way) is an entry in every fugue where the notes have it", () => {
  const at = (id: string, bar: number, voice: number) => fugueById(id).entries.some((e) => e.bar === bar && e.voice === voice);
  assert.ok(at("wtc1f13", 11, 0), "I/13 b. 11, soprano");
  assert.ok(at("wtc1f24", 74, 1), "I/24 b. 74, alto");
  assert.ok(at("wtc2f01", 68, 2) && at("wtc2f01", 72, 1), "II/1 bb. 68 and 72");
  assert.ok(at("wtc2f04", 51, 2), "II/4 b. 51, bass");
  assert.ok(at("wtc2f16", 67, 2), "II/16 b. 67, tenor");
  assert.ok(!at("wtc2f15", 58, 0), "not II/15's broken chord at b. 58");
});
