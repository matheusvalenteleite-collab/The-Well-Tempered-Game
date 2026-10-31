/**
 * D391 (WTC 1.89): a whole-piece reading (BUSONI) drawn in the box over the player's own line, the whole
 * piece: its note marks (as judged), arcs, levels, hairpins, words (translated in the side legend) and
 * caesuras; the subject-only readings drawn as before; the reading's marks still over the sparks.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById } from "../src/touch/fugue.ts";
import { readingsOf, wholeReadingOf, readingMarks } from "../src/touch/readings.ts";
import { wholePlan } from "../src/touch/whole-reading.ts";
import { WORD_GLOSS, glossOf, wholeAsk, wholeAsks, wholeBox, wholeLegend, firstOn } from "../src/touch/whole-marks.ts";
import { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";

const FIVE = ["wtc1f01", "wtc1f02", "wtc1f08", "wtc1f16", "wtc1f24"];

function silentChip(): Chip {
  return {
    ctx: { currentTime: 0 },
    heard: () => 0,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
    groove: () => true,
  } as unknown as Chip;
}

test("D391: a whole reading's marks cover the player's whole line, every voice, not only the subject's entries", () => {
  for (const id of FIVE) {
    const f = fugueById(id);
    const r = wholeReadingOf(id)!;
    const plan = wholePlan(f, r)!;
    const all = wholeAsks(plan);
    for (let v = 0; v < f.voices.length; v++) {
      const box = wholeBox(f, r, [v])!;
      // Every marked note of the voice, and only the voice's.
      const want = [...all.keys()].filter((k) => k.startsWith(`${v}:`));
      assert.deepEqual([...box.marks.keys()].sort(), want.sort(), `${id} voice ${v}`);
      const subj = new Set(f.entries.filter((e) => e.voice === v && !e.theme).flatMap((e) => e.notes.map(([on]) => `${v}:${on}`)));
      const outside = [...box.marks.keys()].filter((k) => !subj.has(k));
      assert.ok(outside.length > 0, `${id} voice ${v}: marks outside the subject's entries`);
      const ons = [...box.marks.keys()].map((k) => Number(k.split(":")[1]));
      assert.ok(Math.max(...ons) > f.length / 2, `${id} voice ${v}: marks in the second half`);
      const l = box.lines[0];
      assert.equal(l.voice, v);
      for (const list of [l.dyn, l.words, l.breaths]) for (let i = 1; i < list.length; i++) assert.ok(list[i].on >= list[i - 1].on, "in time order (the painter's index)");
      for (let i = 1; i < l.spans.length; i++) assert.ok(l.spans[i].a >= l.spans[i - 1].a);
    }
    // Over the voices together: levels, words and slurs reach the end of the piece.
    const box = wholeBox(f, r, f.voices.map((_, i) => i))!;
    assert.ok(box.lines.some((l) => l.dyn.length), `${id}: levels drawn`);
    assert.ok(box.lines.some((l) => l.spans.some((s) => s.kind !== "phrase" && s.a > f.length / 2)), `${id}: slurs in the second half`);
    assert.ok(box.lines.some((l) => l.words.some((w) => w.shown)), `${id}: words drawn`);
    if (r.whole!.slurs.some((s) => s.kind === "phrase")) assert.ok(box.lines.some((l) => l.spans.some((s) => s.kind === "phrase")), `${id}: phrase arcs`);
    if (r.whole!.hairpins.length) assert.ok(box.lines.some((l) => l.hairpins.length), `${id}: hairpins`);
    // Memoised: the same object for the same voices (the box's marks map, the side legend's).
    assert.equal(wholeBox(f, r, [0]), wholeBox(f, r, [0]));
  }
});

test("D391: I/2's line shows every kind Busoni prints there; the legend explains them", () => {
  const f = fugueById("wtc1f02");
  const r = wholeReadingOf("wtc1f02")!;
  const box = wholeBox(f, r, f.voices.map((_, i) => i))!;
  const ms = [...box.marks.values()];
  for (const k of ["wedge", "marcato", "tenuto", "portato", "fermata"] as const) assert.ok(ms.some((m) => m[k]), k);
  assert.ok(ms.some((m) => m.short) && ms.some((m) => m.accent) && ms.some((m) => m.join === true) && ms.some((m) => m.join === false));
  assert.ok(box.lines.some((l) => l.breaths.length), "the caesura");
  const kinds = wholeLegend(box).map((l) => l.kind);
  for (const k of ["marcato", "wedge", "tenuto", "portato", "lift", "breath", "fermata", "dynamics", "hairpin", "words"]) assert.ok(kinds.includes(k as never), k);
  // sfz is the strong zone (I/1).
  const f1 = fugueById("wtc1f01");
  const b1 = wholeBox(f1, wholeReadingOf("wtc1f01")!, f1.voices.map((_, i) => i))!;
  assert.ok(b1.lines.some((l) => l.dyn.some((d) => d.strong && /sf/.test(d.text))));
  assert.ok(b1.lines.every((l) => l.dyn.every((d) => d.strong === /sf/.test(d.text))), "every other level the normal zone");
});

test("D391: every word Busoni prints is drawn as printed with a translation in three languages, or is a label", () => {
  const LABEL = /^(\(?[A-Zᗺ∀Ƨ]\)?( \(augmentation\))?( molto marc\.)?|r\. H\.( \/ Alto)?|Tenor|\(Coda\)|\(S\)|\(sotto\)|\(Modulation\)|[ᗺ∀Ƨ ]+|ma marc\. \(ᗺ\)|∀ … marc\.)$/;
  for (const id of FIVE) {
    const W = wholeReadingOf(id)!.whole!;
    const texts = [...W.text.map((t) => t.text), ...W.tempo.map((t) => t.text), ...(W.heading ? [W.heading] : [])];
    for (const t of texts) assert.ok(glossOf(t) || LABEL.test(t), `${id}: "${t}" neither translated nor a label`);
  }
  for (const [k, g] of Object.entries(WORD_GLOSS)) for (const l of ["en", "pt", "es"] as const) assert.ok(g[l].length > 1, `${k} ${l}`);
});

test("D391: the judge asks what the box draws: slurs joined inside and lifted at their end, dots short, > and ^ the strong zone, a phrase arc not asked", () => {
  const ask = (arts: string[], o: Record<string, unknown> = {}) => wholeAsk({ arts: new Set(arts), dyn: 0, markDb: 0, ...o } as never);
  assert.deepEqual(ask([], { slur: "first", join: true }), { join: true, short: null, accent: null });
  assert.deepEqual(ask([], { slur: "last" }), { join: false, short: null, accent: null });
  assert.deepEqual(ask(["staccato"]), { join: null, short: true, accent: null });
  assert.deepEqual(ask(["wedge"]), { join: null, short: true, accent: null });
  assert.deepEqual(ask(["marcato"]), { join: null, short: true, accent: true });
  assert.deepEqual(ask(["accent"]), { join: null, short: null, accent: true });
  assert.deepEqual(ask(["portato"], { join: false }), { join: false, short: null, accent: null });
  assert.deepEqual(ask([], { phrase: { x: 0.5, last: false }, join: true }), { join: null, short: null, accent: null });
  assert.deepEqual(ask(["tenuto"]), { join: null, short: null, accent: null });
  // The game reads the same asks, every note of the line (its subject's too), on the piano's BUSONI.
  const f = fugueById("wtc1f02");
  const g = new ProtoGame(f, 0, 0, protoById("ladder"), { bpm: 70, legato: false, reading: wholeReadingOf("wtc1f02")! }, silentChip());
  const gg = g as unknown as { wholeAsking(): boolean; wholeAskOf(k: number, i: number): unknown; tracks: { notes: { on: number }[] }[] };
  assert.equal(gg.wholeAsking(), true);
  const box = wholeBox(f, wholeReadingOf("wtc1f02")!, [0])!;
  const notes = gg.tracks[0].notes;
  let seen = 0;
  notes.forEach((n, i) => {
    const mk = box.marks.get(`0:${n.on}`);
    if (mk) seen++;
    assert.equal(gg.wholeAskOf(0, i), mk);
  });
  assert.ok(seen > 20);
});

test("D391: the subject-only readings are unchanged: no whole box, their marks on the entries only, the judge by the subject's place", () => {
  for (const id of FIVE) {
    const f = fugueById(id);
    for (const r of readingsOf(id).filter((x) => !x.whole)) {
      assert.equal(wholeBox(f, r, [0]), null, `${id} ${r.id}`);
      const m = readingMarks(f.entries, r);
      const subj = new Set(f.entries.filter((e) => !e.theme).flatMap((e) => e.notes.map(([on]) => `${e.voice}:${on}`)));
      for (const k of m.keys()) assert.ok(subj.has(k), `${id} ${r.id}: ${k} on an entry`);
      const g = new ProtoGame(f, 0, 0, protoById("ladder"), { bpm: 70, legato: false, reading: r }, silentChip());
      assert.equal((g as unknown as { wholeAsking(): boolean }).wholeAsking(), false);
    }
  }
  assert.equal(wholeBox(fugueById("wtc1f03"), readingsOf("wtc1f03")[0], [0]), null);
});

test("D391: draw order: sparks, then the whole reading's arcs and guides, then the note marks; the verdict over the articulation's word", () => {
  const box = readFileSync(new URL("../src/touch/MusicBox.tsx", import.meta.url), "utf8");
  const sparks = box.indexOf("sparks(fx, fr.pops");
  const arcs = box.indexOf("paintWholeArcs(wg, fr.whole)");
  const guides = box.indexOf("paintWholeGuides(wg, fr.whole)");
  const marks = box.indexOf("if (fr.readingMarks?.size)\n");
  const legend = box.indexOf("marksLegend(g, w, h, fr");
  assert.ok(sparks > 0 && arcs > sparks && guides > arcs && marks > guides && legend > marks, "the reading's marks over the flashes");
  const pp = readFileSync(new URL("../src/bench/paint-proto.ts", import.meta.url), "utf8");
  assert.ok(pp.indexOf("if (g.readingWord) articulationWord(") > pp.indexOf("if (g.flash) articulationWord("), "the verdict on top");
  // Nothing allocated a frame: the geometry object kept, the lists walked by index.
  const bw = readFileSync(new URL("../src/touch/box-whole.ts", import.meta.url), "utf8");
  assert.ok(!/\.(map|filter|forEach|flatMap|slice)\(|\[\.\.\./.test(bw.slice(bw.indexOf("export function paintWholeArcs"))), "no arrays made while painting");
  assert.ok(!/Object\.assign\(wg/.test(box) && /const WHOLE_GEO = \{\} as WholeGeo/.test(box));
});

test("D391: the painter's index: the first item at or after a tick", () => {
  const l = [{ on: 0 }, { on: 10 }, { on: 10 }, { on: 30 }];
  assert.equal(firstOn(l, -5), 0);
  assert.equal(firstOn(l, 10), 1);
  assert.equal(firstOn(l, 11), 3);
  assert.equal(firstOn(l, 31), 4);
});
