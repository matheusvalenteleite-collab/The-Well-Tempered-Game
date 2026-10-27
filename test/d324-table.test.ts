/**
 * D324, THE LAB's TABLE (src/bench/lab/table.ts): FINGERS' four bars (the place across to a bar, the
 * height to a row, ACCENT's strengths), PIANO's keys (a black key over the whites, the scale over an
 * octave and a half), the contact's size as velocity, joining as the game does, and the touch
 * bookkeeping (down, the most seen, cancels, iOS taking all back at once). A fake chip.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { barAt, keyAt, pianoKeys, rowAtFrac, sizeVelocity, SOFT, STRONG, TablePlay, type TableOptions } from "../src/bench/lab/table.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { MECH, resetMech } from "../src/bench/mechanics.ts";
import type { Chip } from "../src/touch/chip.ts";

function fake() {
  const notes: { midi: number; touch?: number; legato?: boolean; stopped?: number }[] = [];
  const ctx = { currentTime: 10 };
  const chip = {
    ctx,
    note(midi: number, _at: number, _dur: number, _v: unknown, p: { touch?: number; legato?: boolean }) {
      const n: (typeof notes)[number] = { midi, touch: p.touch, legato: p.legato };
      notes.push(n);
      return { stop: (t?: number) => void (n.stopped = t ?? ctx.currentTime), bend() {} };
    },
  };
  return { chip: chip as unknown as Chip, notes, ctx };
}

const I2 = fugueById("wtc1f02");
const O: TableOptions = { mode: "fingers", accent: true, scale: "key", octaves: 1, layout: "chromatic", overlap: "legato", sizeVelocity: true };

test("FINGERS: four bars across, gaps to the nearest; rows high at the top; inner soft, outer strong", () => {
  assert.deepEqual([0.1, 0.24, 0.3, 0.5, 0.6, 0.9].map(barAt), [0, 0, 1, 1, 2, 3]);
  assert.equal(rowAtFrac(0, 8), 7);
  assert.equal(rowAtFrac(0.999, 8), 0);
  const { chip, notes } = fake();
  const lines: string[] = [];
  const t = new TablePlay(I2, 0, chip, O, (l) => lines.push(l));
  t.down(1, 0.1, 0.01, 0, 0);
  assert.equal(notes[0].midi, t.rows.at(-1));
  assert.equal(notes[0].touch, STRONG);
  t.up(1, 10, false);
  t.down(2, 0.35, 0.99, 0, 2000);
  assert.equal(notes[1].midi, t.rows[0]);
  assert.equal(notes[1].touch, SOFT);
  assert.match(lines.at(-1)!, /L index \(inner bar\) · strength 0\.30/);
});

test("PIANO keys: one octave from C with black keys over the whites; the key's scale over 11 keys", () => {
  const k = pianoKeys(I2, 0, "chromatic");
  assert.equal(k.length, 13);
  assert.equal(k.filter((x) => x.black).length, 5);
  const c = k[0].midi;
  assert.equal(c % 12, 0);
  // On the line between C and D: high up the C sharp, low the white.
  assert.equal(k[keyAt(k, 1 / 8, 0.3)].midi, c + 1);
  assert.equal(k[keyAt(k, 1 / 8 - 0.01, 0.9)].midi, c);
  assert.equal(k[keyAt(k, 0.99, 0.5)].midi, c + 12);
  const s = pianoKeys(I2, 0, "scale");
  assert.equal(s.length, 11);
  assert.equal(s[0].midi % 12, 0); // c minor: from C
  assert.deepEqual(s.slice(0, 8).map((x) => x.midi - s[0].midi), [0, 2, 3, 5, 7, 8, 10, 12]);
  assert.equal(sizeVelocity(1), null);
  assert.equal(sizeVelocity(0), null);
  assert.ok(sizeVelocity(40)! > sizeVelocity(15)!);
});

test("joining as the game: a key landing while another holds takes over without an attack; CHORDS ring together", () => {
  resetMech();
  const { chip, notes, ctx } = fake();
  const t = new TablePlay(I2, 0, chip, { ...O, mode: "piano" }, () => {});
  t.down(1, 0.05, 0.9, 30, 0);
  t.down(2, 0.3, 0.9, 30, 100);
  assert.equal(notes[1].legato, true);
  assert.ok(notes[0].stopped !== undefined);
  t.up(1, 200, false);
  t.up(2, 300, false);
  ctx.currentTime += (MECH.legatoGapMs + 50) / 1000;
  t.down(3, 0.5, 0.9, 30, 400);
  assert.equal(notes[2].legato, false);
  t.up(3, 500, false);
  const c = fake();
  const ch = new TablePlay(I2, 0, c.chip, { ...O, mode: "piano", overlap: "chords" }, () => {});
  ch.down(1, 0.05, 0.9, 0, 0);
  ch.down(2, 0.3, 0.9, 0, 10);
  assert.equal(c.notes[1].legato, false);
  assert.equal(c.notes[0].stopped, undefined);
});

test("touch bookkeeping: down, the most seen, cancels, all taken back at once", () => {
  const { chip } = fake();
  const lines: string[] = [];
  const t = new TablePlay(I2, 0, chip, { ...O, mode: "piano", overlap: "chords" }, (l) => lines.push(l));
  for (let i = 1; i <= 5; i++) t.down(i, i / 6, 0.9, 20, i);
  assert.equal(t.active, 5);
  assert.equal(t.maxSeen, 5);
  t.up(5, 100, false);
  assert.equal(t.active, 4);
  for (let i = 1; i <= 4; i++) t.up(i, 200 + i, true);
  assert.equal(t.active, 0);
  assert.equal(t.maxSeen, 5);
  assert.equal(t.cancels, 4);
  assert.equal(t.bursts, 1);
  assert.ok(lines.some((l) => /CANCELLED ALL 4 touches/.test(l)));
});
