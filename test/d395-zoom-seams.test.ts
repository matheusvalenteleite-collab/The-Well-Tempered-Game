/**
 * D395 (design studio; the owner: zooms "amidst a player's melody … confusing and caused mistakes"): the box's
 * zoom changes only at a SEAM of the player's line (none of their notes sounding as it begins, none struck from
 * a quarter second before the ease to a quarter second after); out at a seam before anything is clipped; in
 * (and an opening narrowed) only when the way back out also falls at a seam. Over all of Book I's voices: no
 * ease over the player's notes, none begun under a held note, none forced, nothing clipped.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, loadExtras, everyNote, type TouchFugue } from "../src/touch/fugue.ts";
import { stepRange } from "../src/touch/voice-mode.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { BoxZoom, chooseBars, initialRange, planZoom, seamAt, seamIn, ZOOM } from "../src/touch/box-zoom.ts";

await loadExtras();

const tpsOf = (f: TouchFugue) => (f.tpq * tempoOf(f.id)) / 60;
const fullOf = (f: TouchFugue) => {
  const r = stepRange(f);
  return { lo: r.lo - 1, hi: r.hi + 1 };
};

test("seamAt: a rest of the player's long enough for the ease and its margins; never under a held note", () => {
  // Notes at 0–100, 100–200, then a rest until 1000, then a long note 1000–2000.
  const own = [[0, 100, 60, 0], [100, 100, 60, 1], [1000, 1000, 60, 2]];
  const p = planZoom(own, own, { lo: 0, hi: 10 }, 400, 0, Infinity);
  assert.equal(seamAt(p, 50, 300, 50), false, "inside a note");
  assert.equal(seamAt(p, 250, 300, 50), true, "the rest: 250..600 clear, margins included");
  assert.equal(seamAt(p, 700, 300, 50), false, "the next note struck inside the ease");
  assert.equal(seamAt(p, 1500, 300, 50), false, "a long note held");
  assert.equal(seamAt(p, 2000, 300, 50), true, "after the last note");
  assert.equal(seamIn(p, 0, 2400, 300, 50), 200, "the first seam: the end of the second note");
  assert.equal(seamIn(p, 650, 1900, 300, 50), -1, "none between");
});

test("a voice that never rests: its opening is not narrowed (no way back out at a seam)", () => {
  const bt = 100;
  const shown: number[][] = [];
  const own: number[][] = [];
  for (let t = 0; t < 8 * bt; t += 25) shown.push([t, 25, 60, 18 + ((t / 25) % 3)]), own.push([t, 25, 60, 18]);
  for (let t = 8 * bt; t < 16 * bt; t += 25) shown.push([t, 25, 60, (t / 25) % 2 ? 2 : 38]);
  const p = planZoom(shown, own, { lo: 0, hi: 40 }, bt, 0, Infinity);
  assert.notDeepEqual(initialRange(p, 0), p.full, "D377's rule alone narrows it");
  assert.deepEqual(initialRange(p, 0, 100, 200), p.full, "D395: not without a seam");
});

test("Book I, every voice: every zoom change at a seam, none forced, nothing clipped; still some zoom", () => {
  let changes = 0;
  let narrowed = 0;
  for (let n = 1; n <= 24; n++) {
    const f = fugueById(`wtc1f${String(n).padStart(2, "0")}`);
    const all = everyNote(f);
    const full = fullOf(f);
    const tps = tpsOf(f);
    const end = Math.max(...all.map((x) => x[0] + x[1]));
    for (let v = 0; v < f.voices.length; v++) {
      const own = f.voices[v];
      const p = planZoom(all, own, full, f.barTicks, 0, Infinity);
      const bars = chooseBars(own, f.barTicks, tps);
      const ahead = 0.75 * bars * f.barTicks;
      const beat = f.barTicks / 4;
      const z = new BoxZoom(p, 0, beat, true, tps, ahead);
      if (z.cur.hi - z.cur.lo < full.hi - full.lo) narrowed++;
      const ease = ZOOM.easeS * tps;
      let cur = z.cur;
      // Each half beat, as the game drives it; the ease taken as instant for the clip check (the union of both ranges is shown while it eases).
      for (let now = 0, ms = 0; now < end; now += beat / 2, ms += (beat / 2 / tps) * 1000) {
        z.update(now, ms, tps, ahead);
        if (z.cur !== cur) {
          changes++;
          assert.ok(seamAt(p, now, ease, ZOOM.seamS * tps), `${f.id} v${v}: a change at ${now} not at a seam`);
          cur = z.cur;
        }
        // Nothing on screen outside the range shown or the one it comes from.
        const lo = Math.min(z.cur.lo, z.prev?.lo ?? 99);
        const hi = Math.max(z.cur.hi, z.prev?.hi ?? -99);
        for (const x of all) if (x[0] <= now + ahead && x[0] + x[1] >= now && (x[3] < lo || x[3] > hi)) assert.fail(`${f.id} v${v}: step ${x[3]} at ${x[0]} clipped at ${now}`);
      }
    }
  }
  assert.ok(changes > 20, `the zoom still works: ${changes} changes`);
  assert.ok(narrowed > 5, `openings still narrowed: ${narrowed}`);
});
