/**
 * D320, THE LAB's FREE PLAY (src/bench/lab/free.ts): the rows (the key's notes or every semitone round
 * the voice's range), a touch striking the row under it with its place across the bar as the attack,
 * the other thumb still down joining, a shake becoming a mordent or a trill, a slide after its dwell;
 * MECH switches obeyed. A fake chip records what would sound.
 */
import { BAR } from "../src/bench/protos.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { FreePlay, freeRows, keyOf, SLIDE_DWELL_MS } from "../src/bench/lab/free.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { MECH, resetMech } from "../src/bench/mechanics.ts";
import { barDynamic } from "../src/bench/protos.ts";
import type { Chip } from "../src/touch/chip.ts";

function fake() {
  const notes: { midi: number; at: number; touch?: number; legato?: boolean; stopped?: number; glided?: number[]; shapes: number[] }[] = [];
  const ctx = { currentTime: 10 };
  const chip = {
    ctx,
    note(midi: number, at: number, _dur: number, _v: unknown, p: { touch?: number; legato?: boolean }) {
      const n = { midi, at, touch: p.touch, legato: p.legato, glided: [] as number[], shapes: [] as number[] } as (typeof notes)[number];
      notes.push(n);
      return { stop: (t?: number) => void (n.stopped = t ?? ctx.currentTime), bend() {}, glide: (m: number) => void n.glided!.push(m), shape: (s: number) => void n.shapes.push(s) };
    },
    tick() {},
  };
  return { chip: chip as unknown as Chip, notes, ctx };
}

const I2 = fugueById("wtc1f02");
const W = 750;
const H = 342;

test("rows: the key's notes (c minor) or every semitone, round the voice's range, low to high", () => {
  assert.deepEqual(keyOf("c"), { tonic: 0, minor: true });
  assert.deepEqual(keyOf("Eb"), { tonic: 3, minor: false });
  const key = freeRows(I2, 0, "key", 2);
  const chrom = freeRows(I2, 0, "chromatic", 2);
  assert.equal(chrom.length, 25);
  assert.ok(key.length >= 14 && key.length <= 15);
  for (const m of key) assert.ok([0, 2, 3, 5, 7, 8, 10].includes(m % 12), `${m} in C minor`);
  assert.ok(key.every((m, i) => i === 0 || m > key[i - 1]));
});

test("a touch strikes the row under it, its place across the bar the attack; high at the top", () => {
  resetMech();
  const { chip, notes } = fake();
  const lines: string[] = [];
  const fp = new FreePlay(I2, 0, chip, { scale: "key", octaves: 2, bpm: 80, click: false }, (l) => lines.push(l));
  fp.down(1, "left", 20, 20, W, H, 0);
  fp.up(1, 100, false);
  fp.down(2, "right", W - 10, H - 20, W, H, 200);
  assert.equal(notes[0].midi, fp.rows.at(-1));
  assert.equal(notes[1].midi, fp.rows[0]);
  assert.equal(notes[0].touch, barDynamic(20, W));
  assert.equal(notes[1].touch, barDynamic(W - 10, W));
  // D461: x = 20 on a bar of BAR × W: across 1 − 20 / (BAR × W), to two places.
  assert.match(lines[0], new RegExp(`♩ .* L thumb · across ${(1 - 20 / (BAR * W)).toFixed(2).replace(".", "\\.")}`));
  MECH.expression = false;
  fp.down(3, "left", 20, 100, W, H, 300);
  assert.equal(notes.at(-1)!.touch, 0.5);
  resetMech();
});

test("the other thumb still down: joined (it gives way, no new attack); sideways while holding: the sustain", () => {
  resetMech();
  const { chip, notes, ctx } = fake();
  const lines: string[] = [];
  const fp = new FreePlay(I2, 0, chip, { scale: "key", octaves: 2, bpm: 80, click: false }, (l) => lines.push(l));
  fp.down(1, "right", W - 75, 150, W, H, 0);
  ctx.currentTime += 0.3;
  for (let k = 1; k <= 5; k++) fp.move(1, W - 75 - k * 8, 150, W, H, k * 20);
  assert.ok(notes[0].shapes.length >= 3, "the sustain moved");
  fp.down(2, "left", 75, 170, W, H, 200);
  assert.equal(notes[1].legato, true);
  assert.ok(notes[0].stopped !== undefined);
  assert.ok(lines.some((l) => /JOINED: other thumb still down/.test(l)));
  fp.up(1, 300, false);
  fp.up(2, 400, false);
  assert.ok(lines.some((l) => /sustain moves: \d/.test(l)));
});

test("a shake: down and back a mordent; three legs a trill (D319: settles when the legs stop); MECH.freeOrnaments off: nothing", () => {
  resetMech();
  const { chip, notes, ctx } = fake();
  const lines: string[] = [];
  const fp = new FreePlay(I2, 0, chip, { scale: "key", octaves: 2, bpm: 80, click: false }, (l) => lines.push(l));
  const y = 170;
  fp.down(1, "left", 75, y, W, H, 1000);
  fp.move(1, 75, y + 14, W, H, 1060);
  fp.move(1, 75, y, W, H, 1120);
  // D353: the return ends at rest (read on the frame's clock: a still thumb sends nothing).
  fp.frame(1200);
  assert.ok(lines.some((l) => /SHAKE: mordent/.test(l)), lines.join("\n"));
  const main = notes[0].midi;
  assert.ok(notes.slice(1).some((n) => n.midi < main), "the note below sounds");
  fp.up(1, 1300, false);
  // A trill.
  const n0 = notes.length;
  fp.down(2, "right", W - 75, y, W, H, 2000);
  for (let k = 1; k <= 6; k++) fp.move(2, W - 75, y + (k % 2 ? -14 : 0), W, H, 2000 + k * 60);
  assert.ok(lines.some((l) => /SHAKE: trill/.test(l)), lines.join("\n"));
  ctx.currentTime += 0.05;
  fp.frame();
  assert.ok(notes.length > n0 + 2, "trill notes sound");
  ctx.currentTime += 1;
  fp.frame();
  assert.ok(lines.some((l) => /TRILL SETTLED/.test(l)));
  fp.up(2, 4000, false);
  MECH.freeOrnaments = false;
  const before = lines.length;
  fp.down(3, "left", 75, y, W, H, 5000);
  fp.move(3, 75, y + 14, W, H, 5060);
  fp.move(3, 75, y, W, H, 5120);
  fp.frame(5200);
  assert.ok(!lines.slice(before).some((l) => /SHAKE/.test(l)));
  resetMech();
});

test("a slide: held into another row, it glides there once it has stayed SLIDE_DWELL_MS; MECH.slides off: none", () => {
  resetMech();
  const { chip, notes } = fake();
  const lines: string[] = [];
  const fp = new FreePlay(I2, 0, chip, { scale: "key", octaves: 2, bpm: 80, click: false }, (l) => lines.push(l));
  const rh = fp.rowH(H);
  fp.down(1, "left", 75, 200, W, H, 0);
  fp.move(1, 75, 200 - 2 * rh, W, H, 10);
  assert.equal(notes[0].glided!.length, 0, "not before its dwell");
  fp.move(1, 75, 200 - 2 * rh, W, H, 10 + SLIDE_DWELL_MS + 1);
  assert.equal(notes[0].glided!.length, 1);
  assert.equal(notes[0].glided![0], fp.rows[fp.rowAt(200 - 2 * rh, H)]);
  assert.ok(lines.some((l) => /SLIDE/.test(l)));
  fp.up(1, 500, false);
  MECH.slides = false;
  fp.down(2, "left", 75, 200, W, H, 1000);
  fp.move(2, 75, 200 - 2 * rh, W, H, 1010);
  fp.move(2, 75, 200 - 2 * rh, W, H, 1200);
  assert.equal(notes.at(-1)!.glided!.length, 0);
  resetMech();
});

test("D318 in free play: a handover within the gap sounds joined; a touch on the held thumb's half is the other thumb; a rolling contact is ignored", () => {
  resetMech();
  const { chip, notes, ctx } = fake();
  const lines: string[] = [];
  const fp = new FreePlay(I2, 0, chip, { scale: "key", octaves: 2, bpm: 80, click: false }, (l) => lines.push(l));
  fp.down(1, "left", 75, 150, W, H, 0);
  ctx.currentTime += 0.3;
  fp.up(1, 300, false);
  ctx.currentTime += 0.05;
  fp.down(2, "right", W - 75, 170, W, H, 350);
  assert.equal(notes.at(-1)!.legato, true);
  assert.match(lines.at(-1)!, /JOINED by handover/);
  // The other thumb lands on the right half too (the left half free): it is the left thumb.
  fp.down(3, "right", W - 140, 120, W, H, 500);
  assert.match(lines.at(-1)!, /L thumb \(crossed/);
  // A contact right by a thumb still down: that thumb rolling.
  const n = notes.length;
  fp.down(4, "right", W - 140 + 5, 122, W, H, 520);
  assert.equal(notes.length, n);
  assert.match(lines.at(-1)!, /DOUBLE contact ignored/);
  fp.up(4, 600, false);
  MECH.joinedSound = false;
  fp.up(2, 700, false);
  fp.up(3, 700, false);
  ctx.currentTime += 0.03;
  fp.down(5, "left", 75, 150, W, H, 750);
  assert.equal(notes.at(-1)!.legato, false);
  resetMech();
});
