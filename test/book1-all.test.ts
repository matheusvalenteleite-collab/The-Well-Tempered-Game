/**
 * D221: every Book I fugue as well served as the testbench's eight (D212): its data (entries and their
 * notes, cadences, ornaments, tempo, Ishizaka's timing), its SUBJECT line (strettos in two rows, D217),
 * its lanes and crossbars, its card and seal. The perfect playthroughs are in bench-subject (SUBJECT),
 * bench-protos (LADDER, HIGHWAY, the computer's HIGHWAY) and kimiko (KIMIKO).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { beatOf, fugueById, FUGUES } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ornamentsOf } from "../src/touch/ornament-play.ts";
import { TEMPO } from "../src/touch/tempi.ts";
import { herMap } from "../src/bench/her-clock.ts";
import { cardById } from "../src/bench/cards.ts";
import { subjectLine } from "../src/bench/subject-line.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { fxFor, GENERIC, TAILORED } from "../src/touch/subject-fx.ts";

export const BOOK_I = Array.from({ length: 24 }, (_, i) => `wtc1f${String(i + 1).padStart(2, "0")}`);

const chip = () =>
  ({
    ctx: { currentTime: 0 },
    heard: () => 0,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
  }) as unknown as Chip;

test("D221: every Book I fugue's data: entries (their notes in their voices), cadences, ornaments on real notes, a tempo, her timing", () => {
  for (const id of BOOK_I) {
    const f = fugueById(id);
    assert.equal(f.id, id);
    assert.ok(f.entries.length >= f.voices.length, `${id}: ${f.entries.length} entries`);
    const at = f.voices.map((v) => new Map(v.map(([on, , midi]) => [`${on}:${midi}`, true])));
    for (const e of f.entries) {
      assert.ok(e.voice >= 0 && e.voice < f.voices.length && e.notes.length >= 3 && e.on < e.end, `${id}: entry at ${e.on}`);
      assert.equal(e.notes[0][0], e.on, `${id}: entry at ${e.on} begins with its first note`);
      for (const [on, , midi] of e.notes) assert.ok(at[e.voice].has(`${on}:${midi}`), `${id}: entry note ${e.voice}:${on}:${midi} in its voice`);
    }
    // The cadence finder reads a bass and a top voice over a chord: I/10's two voices give it none (no cadence bonus there).
    if (f.voices.length > 2) assert.ok(f.cadences.length > 0, `${id}: cadences`);
    assert.ok(f.cadences.every((c) => c.on >= 0 && c.on <= f.length));
    for (const [k] of ornamentsOf(f)) {
      const [v, on] = k.split(":").map(Number);
      assert.ok(f.voices[v]?.some((n) => n[0] === on), `${id}: ornament on a note (${k})`);
    }
    const t = TEMPO[id];
    assert.ok(t && t.normal > 20 && t.normal < 200, `${id}: tempo`);
    const m = herMap(id);
    assert.ok(m && m.ticks.length > f.length / beatOf(f).ticks, `${id}: Ishizaka's timing`);
  }
});

test("D221: every Book I card's seal is judged (its data present)", () => {
  for (const id of BOOK_I) {
    const c = cardById(id)!;
    assert.ok(c.ready, `${id}: ${c.seal.kind}`);
  }
});

test("D221, D213: every Book I fugue has its own effect (each later subject and each inversion where it has one); Book II keeps the default", () => {
  for (const id of BOOK_I) {
    const f = fugueById(id);
    assert.ok(TAILORED[id], id);
    for (const e of f.entries) assert.notEqual(fxFor(id, { theme: e.theme ?? 1, inverted: !!e.inverted, scale: e.scale ?? 1 }), GENERIC);
  }
  for (const f of FUGUES.filter((f) => f.book === 2)) assert.equal(fxFor(f.id, { theme: 1, inverted: false, scale: 1 }), GENERIC);
});

/**
 * The crossbars (D217): open bars among the struck notes, on HIGHWAY (every voice from the start) and
 * SUBJECT (from the start, both rows). D221_TABLE=1 prints the table.
 */
test("D221, D217: the crossbars of every Book I fugue: HIGHWAY a few in a hundred, SUBJECT mostly entry heads", () => {
  const rows: string[] = [];
  let [hs, hf, ss, sf] = [0, 0, 0, 0];
  for (const id of BOOK_I) {
    const f = fugueById(id);
    let [heads, free] = [0, 0];
    for (let v = 0; v < f.voices.length; v++) {
      const g = new ProtoGame(f, v, 0, protoById("highway"), { bpm: 60, legato: false, easy: "exact" }, chip());
      g.notes.forEach((n, i) => {
        if (n.ride || (i > 0 && g.notes[i - 1].on === n.on)) return;
        heads++;
        if (g.isFree(i)) free++;
      });
    }
    const g = new ProtoGame(f, 0, 0, protoById("subject"), { bpm: 60, legato: false, easy: "exact" }, chip());
    let [sh, sfree] = [0, 0];
    g.tracks.forEach((t, k) =>
      t.notes.forEach((n, i) => {
        if (n.ride || (i > 0 && t.notes[i - 1].on === n.on)) return;
        sh++;
        if (g.isFree(i, k)) sfree++;
      }),
    );
    const line = subjectLine(f, 0);
    const minutes = (g.timeAt(f.length) - g.timeAt(0)) / 60;
    assert.ok(free / heads < 0.06, `${id} HIGHWAY crossbars ${free}/${heads}`);
    // SUBJECT: every entry head and each stretto's first lower-row note are free; little else.
    assert.ok(sfree <= line.entries.length + line.strettos.length + Math.ceil(0.05 * sh), `${id} SUBJECT crossbars ${sfree}/${sh}`);
    rows.push(
      `${id} HIGHWAY ${free}/${heads} ${((100 * free) / heads).toFixed(1)}% · SUBJECT ${sfree}/${sh} ${((100 * sfree) / sh).toFixed(1)}% (${line.entries.length} entries, ${line.strettos.length} strettos) · ${(free / minutes / f.voices.length).toFixed(1)}/${(sfree / minutes).toFixed(1)} a minute`,
    );
    [hs, hf, ss, sf] = [hs + heads, hf + free, ss + sh, sf + sfree];
  }
  rows.push(`all HIGHWAY ${hf}/${hs} ${((100 * hf) / hs).toFixed(1)}% · SUBJECT ${sf}/${ss} ${((100 * sf) / ss).toFixed(1)}%`);
  assert.ok(hf / hs < 0.04, rows.at(-1));
  if (process.env.D221_TABLE) console.log(rows.join("\n"));
});
