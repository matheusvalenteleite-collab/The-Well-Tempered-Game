/**
 * D367: the harpsichord concertos' trills (tools/touch/concertos.ts → data/touch/concertos.json). D348
 * read a written-out trill back to one held note in the lines the player may take, so the band played
 * it plain too. Now the note carries a trill sign (the player shakes it, D353) and the band, playing the
 * line, sounds the edition's own notes as written; a trill the edition marks with a sign (BWV 1052's and
 * 1056's scores) is a sign on the note, realised for the band by D353's rules. The lines stay one note
 * at a time and the trill's quick notes never count toward the 5.5 notes a second (the player does not
 * strike them).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, loadExtras, type TouchFugue } from "../src/touch/fugue.ts";
import { freeOrnamentParts, ornamentMark, ornamentsOf, realiseHeld, realiseNote, shakeOf } from "../src/touch/ornament-play.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { busiest60, untrill } from "../tools/touch/concertos.ts";

type N = [number, number, number, number];

/** The note of voice `v` at bar `bar`, `q` quarters in. */
function noteAt(f: TouchFugue, v: number, bar: number, q: number) {
  const on = f.bars.find((b) => b.n === bar)!.on + q * f.tpq;
  const n = f.voices[v].find((x) => x[0] === on);
  assert.ok(n, `${f.id} ${f.voiceNames[v]} bar ${bar} +${q}: no note`);
  return n!;
}

test("D367: a written-out trill found (adjacent letters at the demisemiquaver), its notes kept", () => {
  const T = 1920;
  const d = T / 8;
  // E-D# from the upper note, eight demisemiquavers, then the note after.
  const run: N[] = [76, 75, 76, 75, 76, 75, 76, 75].map((m, i) => [i * d, d, m, m === 76 ? 37 : 36]);
  const u = untrill([...run, [T, T, 76, 37]], T);
  assert.equal(u.trills, 1);
  assert.deepEqual(u.line.map((n) => [n[0], n[1], n[2]]), [[0, T, 75], [T, T, 76]]);
  assert.deepEqual(u.found, [{ on: 0, signs: "t", notes: run.map((n) => [n[0], n[1], n[2]]) }]);
  // A whole step: "T".
  assert.equal(untrill([74, 72, 74, 72].map((m, i) => [i * d, d, m, m === 74 ? 36 : 35] as N), T).found[0].signs, "T");
  // One letter (the editions' playback spells a few trills so: A flat, A) is read as the trill it is;
  // two letters apart (B sharp, D) is not one; nor three notes; nor semiquavers.
  assert.equal(untrill([81, 80, 81, 80].map((m, i) => [i * d, d, m, 40] as N), T).found[0].signs, "t");
  assert.equal(untrill([74, 72, 74, 72].map((m, i) => [i * d, d, m, m === 74 ? 36 : 34] as N), T).trills, 0);
  assert.equal(untrill([74, 72, 74].map((m, i) => [i * d, d, m, m === 74 ? 36 : 35] as N), T).trills, 0);
  assert.equal(untrill([74, 72, 74, 72].map((m, i) => [(i * T) / 4, T / 4, m, m === 74 ? 36 : 35] as N), T).trills, 0);
});

test("D367: the concertos' trills: on the lines offered, one note each, the band's notes the edition's", async () => {
  await loadExtras();
  let written = 0;
  let signed = 0;
  for (const b of [1052, 1053, 1054, 1055, 1056, 1057, 1058, 1059, 1060, 1061, 1062, 1063, 1064, 1065])
    for (const m of [1, 2, 3]) {
      const f = fugueById(`bwv${b}-${m}`);
      for (const [v, on, signs, w] of f.ornaments ?? []) {
        assert.ok(f.playable!.includes(v), `${f.id}: a trill on a line not offered`);
        assert.match(signs, /^[tT]$/);
        const n = f.voices[v].find((x) => x[0] === on);
        assert.ok(n, `${f.id} ${v}:${on}: no note`);
        assert.ok(n![1] >= f.tpq / 4, `${f.id} ${v}:${on}: a trill on a note under a semiquaver`);
        const o = ornamentsOf(f).get(`${v}:${on}`)!;
        assert.equal(ornamentMark(o), "TR");
        assert.equal(shakeOf(o)!.kind, "trill");
        if (!w) {
          signed++;
          continue;
        }
        written++;
        // The edition's notes: from the note's onset, joined, over its span, two adjacent pitches, the main note one of them.
        assert.equal(w[0][0], on);
        assert.equal(w.at(-1)![0] + w.at(-1)![1], on + n![1]);
        for (let k = 1; k < w.length; k++) assert.equal(w[k][0], w[k - 1][0] + w[k - 1][1]);
        const pitches = [...new Set(w.map((p) => p[2]))].sort((x, y) => x - y);
        assert.equal(pitches.length, 2);
        assert.equal(pitches[0], n![2]);
        assert.equal(pitches[1] - pitches[0], signs === "t" ? 1 : 2);
        // The player's line holds one note there: none of the quick notes is in it.
        assert.ok(!f.voices[v].some((x) => x[0] > on && x[0] < on + n![1]), `${f.id} ${v}:${on}: a note inside the trill`);
        // The band sounds them as written.
        assert.deepEqual(realiseNote(f, o, on, n![1], n![2], undefined, 80), w);
      }
    }
  // As read on 28 October 2026 (the editions in data/sources/bach-harpsichord-concertos/).
  assert.equal(written, 707);
  assert.equal(signed, 36);
});

test("D367: known trills, as the band plays them and as the player strikes them", async () => {
  await loadExtras();
  // BWV 1055/I bar 56, the right hand's cadential trill on G sharp (beat 4's second quaver): A G# A G# in demisemiquavers.
  const a = fugueById("bwv1055-1");
  const an = noteAt(a, 0, 56, 3.5);
  assert.deepEqual([an[1], an[2]], [a.tpq / 2, 80]);
  const ao = ornamentsOf(a).get(`0:${an[0]}`)!;
  assert.equal(ao.signs, "t");
  assert.deepEqual(realiseNote(a, ao, an[0], an[1], an[2], undefined, tempoOf(a.id)).map((p) => p[2]), [81, 80, 81, 80]);
  // A long one: Violin I, bar 28, F# E over six crotchets (48 demisemiquavers), one E to strike.
  const v1 = a.voiceNames.indexOf("Violin I");
  const vn = noteAt(a, v1, 28, 0);
  assert.deepEqual([vn[1], vn[2]], [6 * a.tpq, 76]);
  assert.equal(ornamentsOf(a).get(`${v1}:${vn[0]}`)!.written!.length, 48);

  // BWV 1056/II bar 15: the right hand's trill on C (C Db, 17 demisemiquavers from the main note, as the edition writes it).
  const l = fugueById("bwv1056-2");
  const ln = noteAt(l, 0, 15, 2);
  assert.equal(ln[2], 72);
  const lo = ornamentsOf(l).get(`0:${ln[0]}`)!;
  const band = realiseNote(l, lo, ln[0], ln[1], ln[2], undefined, tempoOf(l.id));
  assert.equal(band.length, 17);
  assert.deepEqual(band.map((p) => p[2]), Array.from({ length: 17 }, (_, k) => (k % 2 ? 73 : 72)));
  // Detached by the band's articulation: the edition's notes, the last shortened.
  const held = realiseHeld(l, lo, ln[0], ln[1], 0.8, ln[2], undefined, tempoOf(l.id));
  assert.equal(held.length, 17);
  assert.ok(held.at(-1)![1] < band.at(-1)![1]);
  // The player's shake realised by D353's rules: from the upper note, alternating.
  const shaken = freeOrnamentParts(l, "trill", ln[0], ln[2], ln[0], ln[0] + ln[1], tempoOf(l.id), lo.signs);
  assert.ok(shaken.length >= 4);
  assert.equal(shaken[0][2], 73);
  assert.ok(shaken.every((p) => p[2] >= 70 && p[2] <= 73));

  // BWV 1052/I: the edition's trill signs (bar 39, the left hand's cadential trill on B flat; bars 113-115, the right hand's chain).
  const d = fugueById("bwv1052-1");
  const dn = noteAt(d, 1, 39, 2.5);
  assert.equal(dn[2], 58);
  const dorn = ornamentsOf(d).get(`1:${dn[0]}`)!;
  assert.equal(dorn.written, undefined);
  // The band's realised by D353's rules: from the upper note (C).
  const dp = realiseNote(d, dorn, dn[0], dn[1], dn[2], undefined, tempoOf(d.id));
  assert.equal(dp[0][2], 60);
  assert.ok(dp.length >= 3 && dp.some((p) => p[2] === 58));
  for (const [bar, q, midi] of [[113, 1, 82], [114, 0, 81], [115, 0, 79]] as const) {
    const n = noteAt(d, 0, bar, q);
    assert.equal(n[2], midi);
    assert.equal(ornamentsOf(d).get(`0:${n[0]}`)?.signs, "T", `bar ${bar}`);
  }
});

test("D367: the trills' quick notes do not count toward the game's load", async () => {
  await loadExtras();
  for (const id of ["bwv1055-1", "bwv1056-2", "bwv1053-1", "bwv1063-1"]) {
    const f = fugueById(id);
    // The lines offered with the edition's notes put back in: busier; as the player has them: at most 5.5 notes a second at the tempo.
    const back = f.voices.map((v, i) => {
      const os = (f.ornaments ?? []).filter(([w]) => w === i);
      return os.length ? v.flatMap((n) => os.find(([, on]) => on === n[0])?.[3]?.map((p) => [...p, n[3]] as typeof n) ?? [n]) : v;
    });
    for (const v of f.playable!) {
      const plain = busiest60(f, [v]);
      assert.ok((plain * tempoOf(id)) / 60 <= 5.5 + 1e-9, `${id} ${f.voiceNames[v]}`);
      assert.ok(busiest60({ tpq: f.tpq, voices: back }, [v]) >= plain);
    }
  }
});
