import { test } from "node:test";
import assert from "node:assert/strict";
import { INSTRUMENTS, bow, dial, keybed, ornament, scaleNotes, theremin, type Touch } from "../src/bench/instruments.ts";
import type { Mono } from "../src/bench/mono.ts";

/** A voice that only remembers what it was told. */
function fakeVoice() {
  const log: string[] = [];
  const v = {
    pitch: 62,
    level: 0,
    on: false,
    setPitch(m: number) {
      v.pitch = m;
    },
    attack(l = 1) {
      v.on = true;
      v.level = l;
      log.push("attack");
    },
    setLevel(l: number) {
      v.level = l;
    },
    pluck() {
      log.push("pluck");
    },
    release() {
      v.on = false;
      v.level = 0;
      log.push("release");
    },
    vibrato() {},
    stop() {},
  };
  return { v: v as unknown as Mono & typeof v, log };
}
const at = (x: number, y: number, t0 = 0): Touch => ({ x, y, x0: x, y0: y, t0 });
const ALTO = { lo: 53, hi: 79 };

test("the scale: D minor with both forms of the sixth and seventh", () => {
  assert.deepEqual(scaleNotes(60, 72).map((m) => m % 12), [0, 1, 2, 4, 5, 7, 9, 10, 11, 0]);
  assert.equal(INSTRUMENTS.length, 6);
});

test("theremin: no sound until the left thumb is down; the pitch, still, settles on a note of the scale", () => {
  const { v } = fakeVoice();
  const i = theremin(v, ALTO);
  i.down(2, at(0.8, 0.43));
  assert.equal(v.on, false);
  for (let k = 0; k < 30; k++) i.tick!(1 / 60);
  assert.ok(scaleNotes(40, 90).includes(Math.round(v.pitch)) && Math.abs(v.pitch - Math.round(v.pitch)) < 0.05, `${v.pitch}`);
  i.down(1, at(0.2, 0.1));
  assert.equal(v.on, true);
  assert.ok(v.level > 0.8, "high on the left: loud");
  i.up(1, at(0.2, 0.1));
  assert.equal(v.on, false);
});

test("bow: the note sounds while the bow moves, a quick tap plucks", () => {
  const { v, log } = fakeVoice();
  const i = bow(v, ALTO);
  i.down(1, at(0.2, 0.5));
  i.down(2, at(0.8, 0.5));
  assert.equal(v.on, false);
  i.move(2, at(0.8, 0.3), 0.05);
  assert.equal(v.on, true);
  i.up(2, at(0.8, 0.3));
  const t = at(0.8, 0.6, performance.now() / 1000);
  i.down(3, t);
  i.up(3, t);
  assert.equal(log.at(-1), "pluck");
});

test("dial: a notch clockwise is a step up the scale; the left thumb sounds it", () => {
  const { v } = fakeVoice();
  const i = dial(v, ALTO);
  i.draw({ strokeStyle: "", lineWidth: 0, beginPath() {}, arc() {}, stroke() {}, fillRect() {}, fillText() {} } as unknown as CanvasRenderingContext2D, 400, 400, { fg: "", muted: "", grid: "", shine: "", voice: "", font: "" });
  i.down(1, at(0.2, 0.5));
  const before = v.pitch;
  i.down(2, at(0.9, 0.5));
  // A quarter turn clockwise (on screen, y down): from the right of the wheel to its bottom.
  for (let k = 1; k <= 10; k++) i.move(2, at(0.75 + 0.15 * Math.cos((k * Math.PI) / 20), 0.5 + 0.15 * Math.sin((k * Math.PI) / 20)), 0.02);
  assert.ok(v.pitch > before, `${before} → ${v.pitch}`);
  assert.equal(v.on, true);
});

test("home & ornament: the other thumb's tap sounds a neighbour and falls back to the home note, unarticulated", () => {
  const { v, log } = fakeVoice();
  const i = ornament(v, ALTO);
  i.down(1, at(0.2, 0.5));
  const home = v.pitch;
  i.down(2, at(0.8, 0.45));
  assert.notEqual(v.pitch, home);
  i.up(2, at(0.8, 0.45));
  assert.equal(v.pitch, home);
  assert.deepEqual(log, ["attack"]);
});

test("keybed: the black keys stand in the upper part; the last key pressed sounds", () => {
  const { v } = fakeVoice();
  const i = keybed(v, ALTO);
  i.down(1, at(0.02, 0.9));
  const white = v.pitch;
  assert.equal(white % 12, 0);
  i.down(2, at(0.06, 0.3));
  assert.equal(v.pitch, white + 1);
  i.up(2, at(0.06, 0.3));
  assert.equal(v.pitch, white);
});
