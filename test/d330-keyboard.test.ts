/**
 * D330, FREE PLAY's KEYBOARD (src/bench/lab/free.ts Keyboard): a piano stood on end on each bar, black
 * keys inner, white keys outer and running on between the blacks; a weighted nearest-centre hit test
 * (centres, the black key's slanted tip, mirror symmetry); IN THE KEY's white keys; a touch and a
 * sideways slide on the keyboard struck and logged.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FreePlay, freeRows, Keyboard, KB_DEFAULT, PIANO_WHITES, whitePcs, whiteShare } from "../src/bench/lab/free.ts";
import { FUGUES, fugueById } from "../src/touch/fugue.ts";
import { resetMech } from "../src/bench/mechanics.ts";
import { BAR } from "../src/bench/protos.ts";
import type { Chip } from "../src/touch/chip.ts";

const I2 = fugueById("wtc1f02");
const BW = 169;
const H = 342;

function piano() {
  const rows = freeRows(I2, 0, "keyboard", 2, PIANO_WHITES);
  return { rows, kb: new Keyboard(rows, PIANO_WHITES, KB_DEFAULT, BW, H) };
}

test("range: two octaves are fourteen white keys and the blacks between, both ends white", () => {
  for (const mode of ["piano", "key"] as const) {
    const w = whitePcs(I2, 0, mode);
    const rows = freeRows(I2, 0, "keyboard", 2, w);
    const white = rows.filter((m) => w.includes(m % 12));
    assert.equal(white.length, 14, mode);
    assert.ok(w.includes(rows[0] % 12) && w.includes(rows.at(-1)! % 12));
    assert.ok(rows.every((m, i) => i === 0 || m === rows[i - 1] + 1), "every semitone");
  }
});

test("hit test: each key's own centre strikes it; whites from the outer zone and between the blacks", () => {
  const { kb } = piano();
  const uB = (KB_DEFAULT.split * BW) / 2;
  const uW = ((1 + KB_DEFAULT.split) * BW) / 2;
  for (const k of kb.keys) {
    const h = kb.hit(k.white ? uW : uB, k.y);
    assert.equal(h.row, k.row, `key ${k.midi}`);
    assert.equal(h.white, k.white);
    assert.equal(h.zone, k.white ? "outer" : "inner");
    // A white key reached in the inner zone too, at its own centre line (the segment between blacks).
    if (k.white) assert.deepEqual(kb.hit(2, k.y), { row: k.row, white: true, zone: "inner" });
  }
  // Fourteen whites share the height: (342 − 20) / 14 = 23 px; a black 0.58 of that.
  assert.equal(kb.whites, 14);
  assert.ok(Math.abs(kb.wh - 23) < 1e-9);
  const b = kb.keys.find((k) => !k.white)!;
  assert.ok(Math.abs(b.h - 0.58 * 23) < 1e-9);
  // The black key's height in the inner zone is its drawn height.
  const out = kb.outline(b.row, 1);
  const at = out.filter(([u]) => u === 10).map(([, y]) => y);
  assert.ok(Math.abs(Math.max(...at) - Math.min(...at) - b.h) <= 1.1, `${Math.max(...at) - Math.min(...at)} ≈ ${b.h}`);
});

test("the black key's tip slants: its height falls across the split, a midway touch decided by both x and y", () => {
  const { kb } = piano();
  const b = kb.keys.find((k) => !k.white)!;
  const half = (u: number) => {
    let d = 0;
    while (d < kb.wh && kb.hit(u, b.y - d - 0.25).row === b.row) d += 0.25;
    return d;
  };
  const s = KB_DEFAULT.split * BW;
  const tau = KB_DEFAULT.slant * BW;
  assert.ok(Math.abs(half(s - tau / 2 - 5) - b.h / 2) <= 0.5, "full height inside the inner zone");
  assert.ok(Math.abs(half(s) - b.h / 4) <= 0.5, `a quarter at the split: ${half(s)} vs ${b.h / 4}`);
  assert.ok(half(s - tau / 4) > half(s) && half(s) > half(s + tau / 4), "narrowing outward");
  assert.equal(kb.hit(s + tau / 2 + 2, b.y).white, true, "beyond the tip: white");
  // The same point a little off the centre line: black nearer the inner edge, white further out.
  const y = b.y - b.h / 3;
  assert.equal(kb.hit(s - tau / 2, y).white, false);
  assert.equal(kb.hit(s + tau / 4, y).white, true);
  // No slant: hard edges (the tip is a step at the split).
  const hard = new Keyboard(kb.rows, PIANO_WHITES, { ...KB_DEFAULT, slant: 0 }, BW, H);
  assert.equal(hard.hit(s - 2, b.y + b.h / 2 - 1).row, b.row);
  assert.equal(hard.hit(s + 2, b.y).white, true);
});

test("mirror symmetry: the two bars give the same key at mirrored places, black inner on both", () => {
  resetMech();
  const W = 844;
  const chip = { ctx: { currentTime: 1 }, note: () => ({ stop() {} }), tick() {} } as unknown as Chip;
  const fp = new FreePlay(I2, 0, chip, { scale: "keyboard", octaves: 2, bpm: 80, click: false, kb: { white: "piano", shape: KB_DEFAULT, labels: true } }, () => {});
  const bw = W * BAR;
  for (let y = 12; y < H - 12; y += 3)
    for (let u = 1; u < bw; u += 7) {
      const l = fp.hitAt(bw - u, y, W, H);
      const r = fp.hitAt(W - bw + u, y, W, H);
      assert.deepEqual(l, r, `u ${u} y ${y}`);
    }
  const kb = fp.keyboard(W, H);
  const b = kb.keys.find((k) => !k.white)!;
  assert.equal(fp.hitAt(bw - 4, b.y, W, H).white, false, "left bar: black by its inner (right) edge");
  assert.equal(fp.hitAt(4, b.y, W, H).white, true, "left bar: white by the phone's edge");
  assert.equal(fp.hitAt(W - bw + 4, b.y, W, H).white, false);
  assert.equal(fp.hitAt(W - 4, b.y, W, H).white, true);
});

test("IN THE KEY: the voice's seven commonest pitch classes, ties toward the harmonic scale", () => {
  assert.deepEqual(whitePcs(I2, 0, "piano"), [0, 2, 4, 5, 7, 9, 11]);
  // C minor (I/2): C D Eb F G Ab B (the leading tone, not B flat).
  assert.deepEqual(whitePcs(I2, 0, "key"), [0, 2, 3, 5, 7, 8, 11]);
  // G sharp minor (I/18): on a piano a third of the notes are white; in the key most.
  const gs = fugueById("wtc1f18");
  const k = whitePcs(gs, 0, "key");
  assert.deepEqual(k, [1, 3, 6, 7, 8, 10, 11]);
  assert.ok(whiteShare(gs, 0, PIANO_WHITES) < 0.4 && whiteShare(gs, 0, k) > 0.8);
  // A tie: a voice of C and B flat and B, once each, in C minor: the harmonic minor's B wins the tie.
  const fake = { ...I2, voices: [[[0, 1, 60, 0], [1, 1, 70, 0], [2, 1, 71, 0], [3, 1, 62, 0], [4, 1, 63, 0], [5, 1, 65, 0], [6, 1, 67, 0], [7, 1, 68, 0]]] } as typeof I2;
  assert.deepEqual(whitePcs(fake, 0, "key"), [0, 2, 3, 5, 7, 8, 11]);
  // Over the 48 fugues IN THE KEY puts more of every voice on white keys than a piano does, never less.
  for (const f of FUGUES.filter((x) => x.book > 0))
    for (let v = 0; v < f.voices.length; v++) assert.ok(whiteShare(f, v, whitePcs(f, v, "key")) >= whiteShare(f, v, PIANO_WHITES) - 1e-9, `${f.id} ${v}`);
});

test("a touch on the keyboard strikes the key and logs it; a slide inward onto a black key follows the hit test", () => {
  resetMech();
  const W = 844;
  const notes: number[] = [];
  const ctx = { currentTime: 1 };
  const chip = { ctx, note: (m: number) => (notes.push(m), { stop() {} }), tick() {} } as unknown as Chip;
  const lines: string[] = [];
  const fp = new FreePlay(I2, 0, chip, { scale: "keyboard", octaves: 2, bpm: 80, click: false, kb: { white: "piano", shape: KB_DEFAULT, labels: true } }, (l) => lines.push(l));
  const kb = fp.keyboard(W, H);
  const bw = W * BAR;
  const b = kb.keys.find((k) => !k.white)!;
  const below = kb.key(b.row - 1)!;
  // Land on the white below the black, in the outer zone, at the black's height (the boundary line).
  fp.down(1, "left", 6, b.y + 2, W, H, 0);
  assert.equal(notes[0], below.midi);
  assert.match(lines[0], /white key, outer zone/);
  // Slide inward at that height: onto the black key, after the dwell.
  fp.move(1, bw - 10, b.y + 2, W, H, 10);
  fp.move(1, bw - 10, b.y + 2, W, H, 200);
  assert.equal(notes.at(-1), b.midi);
  assert.match(lines.at(-1)!, /SLIDE .* black key, inner zone .* px in while held/);
});
