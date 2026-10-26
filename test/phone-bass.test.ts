/** D291: on a phone's speaker the triangle bass all but vanishes; there the bass is a pulse. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PHONE_BASS_GAIN, voicing } from "../src/touch/chip.ts";

const touch = (n: number) => Object.defineProperty(globalThis, "navigator", { value: { maxTouchPoints: n }, configurable: true });

test("D291: a computer keeps the triangle bass", () => {
  touch(0);
  assert.equal(voicing(2, 3).timbre, "triangle");
  assert.equal(voicing(3, 4).gain, 1);
});

test("D291: a phone's bass is a pulse no neighbour uses, a little louder", () => {
  touch(5);
  assert.equal(voicing(2, 3).timbre, "pulse50");
  assert.equal(voicing(3, 4).timbre, "pulse25");
  assert.equal(voicing(3, 4).gain, PHONE_BASS_GAIN);
  assert.equal(voicing(0, 4).timbre, "pulse12");
  assert.equal(voicing(0, 1).timbre, "triangle");
  touch(0);
});
