/**
 * D640-D642: THE AUDITS OVER EVERY PLAYABLE PIECE. D631's written octave and D635's stretch held beyond the 48 fugues: the
 * preludes and the Art of Fugue's XIV (pieces.json), the tutorial's pieces, MORE BACH (more-bach.json), the harpsichord
 * concertos (concertos.json) and the chorales (chorales.json), each on every sound a player can choose for it (one list
 * for every piece: PlayPop.tsx POP_SOUNDS) and the trials (tools/touch/stretch/collections.ts).
 *
 * Beyond the 48 a stretched read (more than STRETCH_MAX from a recording) is allowed by rule, not by a list (D641): it is
 * on the bass (which keeps its instrument), on a kept instrument within KEPT_MAX (VAUDEVILLE's xylophone on its line), or
 * on an upper voice whose instrument is the band's best for that line (the seats as tools/touch/octaves/seats.ts
 * seatsForPieces chooses them: no other instrument of the band leaves fewer notes stretched, its doubling parts counted).
 * The totals are held exactly here, so that any change is seen.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { STRETCH_MAX } from "../src/touch/sampled.ts";
import { OCTAVE_SEATS } from "../src/touch/octave-seats.ts";
import { SEATS as MORE_SEATS } from "../src/touch/seats/more-bach.ts";
import { SEATS as CONCERTO_SEATS } from "../src/touch/seats/concertos.ts";
import { SEATS as CHORALE_SEATS } from "../src/touch/seats/chorales.ts";
import { PRESET_MB, RESIDENT_MB, presetBudget } from "../src/touch/budget.ts";
import { loadExtras } from "../src/touch/fugue.ts";
import { AUDIT_SOUNDS } from "../tools/touch/octaves/audit.ts";
import { KEPT_MAX, STRETCH_KEPT, seatsForPieces } from "../tools/touch/octaves/seats.ts";
import { COLLECTIONS, auditCollection } from "../tools/touch/stretch/collections.ts";

/** D640: each collection's notes stretched and past their set's declared reach (all of them stretched ones), after D641-D642. */
const TOTALS: Readonly<Record<string, { pieces: number; stretched: number; undeclared: number }>> = {
  "WTC preludes": { pieces: 48, stretched: 255, undeclared: 69 },
  "other fugues": { pieces: 1, stretched: 0, undeclared: 0 },
  tutorial: { pieces: 1, stretched: 2, undeclared: 0 },
  "more bach": { pieces: 58, stretched: 106, undeclared: 7 },
  concertos: { pieces: 42, stretched: 1104, undeclared: 106 },
  chorales: { pieces: 370, stretched: 52, undeclared: 0 },
};
const extra = COLLECTIONS.filter(([name]) => name !== "WTC fugues");

test("D640: every playable piece beyond the 48, on every sound: no note in another octave; past its set's declared reach only where stretched (D641's)", () => {
  assert.deepEqual(
    extra.map(([n]) => n),
    Object.keys(TOTALS),
  );
  let notes = 0;
  for (const [name, pieces] of extra) {
    const r = auditCollection(name, pieces);
    notes += r.notes;
    assert.equal(r.moves, 0, `${name}: octave moves`);
    for (const u of r.undeclared) assert.ok(Math.abs(u.shift) > STRETCH_MAX, `${name} ${u.sound} ${u.piece} v${u.voice} ${u.patch} ${u.written}: past its declared reach, read ${u.shift}`);
    const st = r.stretched.reduce((a, s) => a + s.n, 0);
    assert.deepEqual({ pieces: r.pieces, stretched: st, undeclared: r.undeclared.length }, TOTALS[name], name);
    // A kept instrument within KEPT_MAX (D641), else the seat chooser's (the next test).
    for (const s of r.stretched) if (STRETCH_KEPT[s.sound]?.includes(s.patch as never)) assert.ok(Math.abs(s.shift) <= KEPT_MAX, `${name} ${s.sound} ${s.piece} ${s.patch} ${s.shift}`);
  }
  assert.ok(notes > 14_000_000, `${notes} notes checked`);
});

test("D641, D700: beyond the 48 every upper voice on the band's best instrument for its line (octave-seats.ts and the chunks of src/touch/seats/ as seatsForPieces makes them)", () => {
  const pieces = extra.flatMap(([, ps]) => ps);
  const ids = new Set(pieces.map((p) => p.id));
  for (const sound of AUDIT_SOUNDS) {
    const { seats } = seatsForPieces(sound, pieces);
    // (D700: the main file's and the three chunks', together.)
    const all = [OCTAVE_SEATS, MORE_SEATS, CONCERTO_SEATS, CHORALE_SEATS].flatMap((t) => Object.entries(t[sound] ?? {}));
    const have = Object.fromEntries(all.filter(([id]) => ids.has(id)));
    assert.deepEqual(have, seats, `${sound}: run tools/touch/octaves/seats.ts`);
  }
});

test("D642: every sound within D540's budget over every playable piece (25 MB decoded, 40 MB resident)", async () => {
  await loadExtras();
  const ids = extra.flatMap(([, ps]) => ps.map((p) => p.id));
  for (const sound of AUDIT_SOUNDS) {
    const b = presetBudget(sound, ids);
    assert.ok(b.mb <= PRESET_MB, `${sound}: ${b.mb.toFixed(2)} MB (${b.piece} v${b.voice})`);
    assert.ok(b.residentMb <= RESIDENT_MB, `${sound}: ${b.residentMb.toFixed(2)} MB resident`);
  }
});
