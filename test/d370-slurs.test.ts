/**
 * D370 (Glenn's notes §1): a slur is not legato. The readings carry slur groups apart from a legato rule
 * (the per-note join their derived view); the band shapes a slur (a lean into its first, over-legato
 * inside, its last let go early and on the piano lighter) and leaves plain legato even; the player's
 * piano shapes only what a reading slurs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { READINGS, readingMarks, slurRole, slurredJoin, type Reading } from "../src/touch/readings.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { ART_HOLD, OVERLAP_S, phrase, SLUR_SHAPE, type Marks, type Style } from "../src/touch/phrasing.ts";
import type { OtherNote } from "../src/touch/voice-mode.ts";
import { SLUR_DB, SLUR_HANDOVER_S, SLUR_LAST_DB, slurHandoverS } from "../src/bench/proto-game.ts";

const all = () => Object.entries(READINGS).flatMap(([id, rs]) => rs.map((r) => ({ id, r })));

test("D370: every reading's joins are its slurs' insides or its legato; a slur's inside joined, its span in the subject; every choice documented", () => {
  const doc = JSON.parse(readFileSync(new URL("../docs/wtc/readings/slurs.json", import.meta.url), "utf8")) as Record<string, Record<string, { legato: boolean; slurs: [number, number][]; why: string }>>;
  let slurs = 0;
  let legato = 0;
  for (const { id, r } of all()) {
    assert.ok(Array.isArray(r.slurs) && typeof r.legato === "boolean", `${id}/${r.id}`);
    const v = [...fugueById(id).entries].filter((e) => !e.theme).sort((a, b) => a.on - b.on || a.voice - b.voice)[0].voice;
    for (const s of r.slurs) {
      assert.ok(s.from < s.to && s.to < r.notes.length, `${id}/${r.id} ${s.from}-${s.to}`);
      assert.equal(s.v, v, `${id}/${r.id}: read against the first entry's voice`);
      for (let i = s.from; i < s.to; i++) assert.equal(r.notes[i].join, true, `${id}/${r.id}: slur ${s.from}-${s.to} joined inside at ${i}`);
    }
    // Slurs never overlap.
    const sorted = [...r.slurs].sort((a, b) => a.from - b.from);
    sorted.forEach((s, k) => k && assert.ok(s.from > sorted[k - 1].to, `${id}/${r.id}: slurs apart`));
    r.notes.forEach((n, i) => {
      // (A last note "joined": a slur running past the end of the author's example.)
      if (n.join === true && i < r.notes.length - 1 && !slurredJoin(r, i)) assert.ok(r.legato, `${id}/${r.id}: join ${i} neither slurred nor legato`);
    });
    if (r.notes.some((n) => n.join === true)) assert.ok(doc[id]?.[r.id]?.why, `${id}/${r.id}: why documented`);
    slurs += r.slurs.length;
    if (r.legato) legato++;
  }
  assert.ok(slurs > 100 && legato > 30, `${slurs} slurs, ${legato} legato readings`);
  // Glenn's two examples: Keller's II/18 "everything is legato" a legato, no slur; Keller's I/2 mordent figure three slurs.
  const keller = (id: string) => READINGS[id].find((r) => r.id === "keller")!;
  assert.deepEqual([keller("wtc2f18").legato, keller("wtc2f18").slurs.length], [true, 0]);
  assert.deepEqual(keller("wtc1f02").slurs.map((s) => [s.from, s.to]), [[0, 2], [5, 7], [10, 12]]);
  assert.equal(keller("wtc1f02").legato, false);
  assert.deepEqual([0, 1, 2, 3].map((i) => slurRole(keller("wtc1f02"), i)), ["first", "mid", "last", null]);
});

test("D370: the reading's marks on every entry carry each note's place in a slur (its last too)", () => {
  const f = fugueById("wtc1f02");
  const r = READINGS.wtc1f02.find((x) => x.id === "keller")!;
  const m = readingMarks(f.entries, r);
  for (const e of f.entries.filter((x) => !x.theme)) {
    assert.equal(m.get(`${e.voice}:${e.notes[0][0]}`)?.slur, "first");
    assert.equal(m.get(`${e.voice}:${e.notes[1][0]}`)?.slur, "mid");
    assert.equal(m.get(`${e.voice}:${e.notes[2][0]}`)?.slur, "last");
    assert.equal(m.get(`${e.voice}:${e.notes[3][0]}`)?.slur, undefined);
  }
  assert.equal(readingMarks(f.entries, { ...r, slurs: [] } as Reading).get(`${f.entries[0].voice}:${f.entries[0].notes[0][0]}`)?.slur, undefined);
});

// Glenn's line: C D E F G F E D C in quavers over a bass, crotchet = 72.
const TPQ = 480;
const STEP: Record<number, number> = { 72: 35, 74: 36, 76: 37, 77: 38, 79: 39, 48: 21, 43: 18 };
function line(): OtherNote[] {
  const mel = [72, 74, 76, 77, 79, 77, 76, 74];
  const n: OtherNote[] = mel.map((m, k) => ({ on: (k * TPQ) / 2, dur: TPQ / 2, midi: m, step: STEP[m], voice: 0 }));
  n.push({ on: 4 * TPQ, dur: 2 * TPQ, midi: 72, step: 35, voice: 0 });
  n.push({ on: 0, dur: 2 * TPQ, midi: 48, step: 21, voice: 1 }, { on: 2 * TPQ, dur: 2 * TPQ, midi: 43, step: 18, voice: 1 }, { on: 4 * TPQ, dur: 2 * TPQ, midi: 48, step: 21, voice: 1 });
  return n.sort((a, b) => a.on - b.on || a.voice - b.voice);
}
function marks(kind: "legato" | "pairs" | "pairs-old"): Marks {
  const m = new Map<string, { join: boolean | null; short: boolean | null; slur?: "first" | "mid" | "last" }>();
  for (let k = 0; k < 8; k++) {
    const on = (k * TPQ) / 2;
    if (kind === "legato") m.set(`0:${on}`, { join: true, short: null });
    else m.set(`0:${on}`, { join: k % 2 === 0, short: null, ...(kind === "pairs" ? { slur: k % 2 === 0 ? ("first" as const) : ("last" as const) } : {}) });
  }
  return m;
}
const shapesOf = (style: Style, kind: "legato" | "pairs" | "pairs-old") => {
  const notes = line();
  const tps = (TPQ * 72) / 60;
  const sh = phrase(notes, TPQ, (t) => t % (4 * TPQ), new Set(), style, { marks: marks(kind), bass: 1, spt: 1 / tps, score: notes, cadences: [], bar: 4 * TPQ, quaver: TPQ / 2 });
  const mel = notes.map((n, i) => ({ n, s: sh[i] })).filter((x) => x.n.voice === 0);
  return mel.map((x) => x.s);
};

test("D370: the band's slur: the first leaned (piano 10 ms, else 20, within ±20 ms), over-legato inside (harpsichord 60–90 ms, piano 25–40), its last held 0.55; legato even", () => {
  for (const style of ["harpsichord", "piano", "organ"] as Style[]) {
    const legato = shapesOf(style, "legato");
    const old = shapesOf(style, "pairs-old");
    const pairs = shapesOf(style, "pairs");
    // Plain legato: no lean, a table's overlap, nothing held short.
    legato.slice(0, 8).forEach((s) => assert.equal(s.art, "join"));
    for (let k = 0; k < 8; k += 2) {
      const lean = pairs[k].nudge - old[k].nudge;
      const want = style === "piano" ? SLUR_SHAPE.lean.piano : SLUR_SHAPE.lean.other;
      if (k > 0) assert.ok(lean > 0 && lean <= want + 1e-9 && Math.abs(pairs[k].nudge) <= 0.02 + 1e-9, `${style} ${k}: lean ${lean}`);
      else assert.ok(Math.abs(lean) < 1e-9, `${style}: the first note of all has no lifted note before`);
      const over = pairs[k].over - (pairs[k + 1].nudge - pairs[k].nudge);
      if (style === "harpsichord") assert.ok(over >= 0.06 && over <= 0.09, `${style} over ${over}`);
      else if (style === "piano") assert.ok(over >= 0.025 && over <= 0.04, `${style} over ${over}`);
      else assert.ok(Math.abs(over - (old[k].over - (old[k + 1].nudge - old[k].nudge))) < 0.005, `${style}: a sustained sound keeps its crossfade (${over})`);
      assert.ok(Math.abs(pairs[k + 1].hold - SLUR_SHAPE.lastHold) < 1e-9 && old[k + 1].hold === ART_HOLD.detach, `${style} last ${pairs[k + 1].hold}`);
    }
    // Legato inside the plain line no more than the table's overlap (an even line).
    for (let k = 0; k < 7; k++) assert.ok(legato[k].over - (legato[k + 1].nudge - legato[k].nudge) <= Math.max(OVERLAP_S, 0.03) + 1e-9, `${style} legato ${k}`);
  }
  // The piano: the first +1.5 dB, the last -3.5 dB against the unslurred pairs (the same music otherwise).
  const old = shapesOf("piano", "pairs-old");
  const pairs = shapesOf("piano", "pairs");
  for (let k = 0; k < 8; k += 2) {
    assert.ok(Math.abs(pairs[k].db! - old[k].db! - SLUR_SHAPE.firstDb) < 1e-9);
    assert.ok(Math.abs(pairs[k + 1].db! - old[k + 1].db! - SLUR_SHAPE.lastDb) < 1e-9);
  }
});

test("D370: the subject's clamp holds with slurs: no subject note's mean level over the others' in its voice and octave", () => {
  const f = fugueById("wtc1f02");
  const r = READINGS.wtc1f02.find((x) => x.id === "keller")!;
  const notes = [...f.voices.flatMap((v, k) => v.map((n) => ({ on: n[0], dur: n[1], midi: n[2], step: n[3], voice: k })))].sort((a, b) => a.on - b.on || a.voice - b.voice);
  const subject = new Set(f.entries.filter((e) => !e.theme).flatMap((e) => e.notes.map((n) => `${e.voice}:${n[0]}`)));
  const sh = phrase(notes, f.tpq, (t) => t % f.barTicks, subject, "piano", { marks: readingMarks(f.entries, r), score: notes, bar: f.barTicks, cadences: f.cadences ?? [] });
  const bins = new Map<string, { s: number[]; o: number[] }>();
  notes.forEach((n, i) => {
    const k = `${n.voice}:${Math.floor(n.midi / 12)}`;
    const b = bins.get(k) ?? { s: [], o: [] };
    (subject.has(`${n.voice}:${n.on}`) ? b.s : b.o).push(sh[i].db!);
    bins.set(k, b);
  });
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  for (const [k, b] of bins) if (b.s.length && b.o.length) assert.ok(mean(b.s) <= mean(b.o) + 1e-9, `${k}: subject ${mean(b.s).toFixed(2)} over ${mean(b.o).toFixed(2)}`);
});

test("D370: the player's voice: the slur's piano dB by place only on a reading's slurs, its last lighter; a longer handover inside a slur on the harpsichord (70 ms) and the piano", () => {
  assert.ok(SLUR_LAST_DB < SLUR_DB[1]);
  assert.equal(SLUR_HANDOVER_S.plucked, 0.07);
  assert.equal(slurHandoverS("harpsichordSampled"), 0.07);
  assert.equal(slurHandoverS("lute"), 0.07);
  assert.ok(slurHandoverS("pianoSampled") >= 0.025 && slurHandoverS("pianoSampled") <= 0.04);
  assert.equal(slurHandoverS("chamberOrgan"), 0.03);
});
