/**
 * D493: the 48 fugues' entries are the experts' (data/wtc/expert-entries.txt: Prout 1910, Iliffe 1897, Busoni,
 * Ledbetter), placed in the notes by tools/touch/expert.ts; the flags name the subject (SUBJECT 1, 2, 3 where a
 * fugue has several) and draw its form (box-fx.ts formText: upside down, stretched, pressed).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, type TouchFugue } from "../src/touch/fugue.ts";
import { entrySpans } from "../src/touch/voice-mode.ts";
import { formText, formWidth, textWidth } from "../src/touch/box-fx.ts";
import { setLang, trCanvas } from "../src/i18n/index.ts";

const expert = JSON.parse(readFileSync(new URL("../docs/wtc/entries/expert-entries.json", import.meta.url), "utf8")) as Record<
  string,
  { subjects: number; sources: string[]; entries: { bar: number; voice: string; subject: number; form: string[]; notes: number; sources: string[] }[]; unplaced: string[] }
>;
const IDS = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));
const at = (f: TouchFugue, bar: number, voice: number) => f.entries.filter((e) => e.voice === voice && e.bar === bar);

test("every one of the 48 fugues has the expert table's entries, each with its sources, none left unplaced", () => {
  for (const id of IDS) {
    const x = expert[id];
    assert.ok(x, id);
    const f = fugueById(id);
    assert.equal(f.entries.length, x.entries.length, id);
    assert.deepEqual(x.unplaced, [], id);
    for (const e of x.entries) assert.ok(e.sources.length > 0 && e.notes >= 3, `${id} b. ${e.bar} ${e.voice}`);
  }
});

test("I/8: the inversions (bb. 30-54, 64) and the three augmentations (bass 62, alto 67, soprano 77)", () => {
  const f = fugueById("wtc1f08");
  for (const [bar, v] of [[30, 0], [36, 1], [39, 2], [44, 2], [45, 0], [47, 1], [54, 0], [54, 1], [54, 2], [64, 0]]) assert.ok(at(f, bar, v).some((e) => e.inverted), `b. ${bar} voice ${v}`);
  const aug = f.entries.filter((e) => e.scale === 2).map((e) => [e.bar, e.voice]);
  assert.deepEqual(aug, [[62, 2], [67, 1], [77, 0]]);
});

test("II/3 and II/9: the diminutions and augmentations the sources name", () => {
  const f3 = fugueById("wtc2f03");
  assert.ok(f3.entries.filter((e) => e.scale === 0.5).length >= 6, "II/3's diminutions (I)");
  assert.equal(f3.entries.filter((e) => e.scale === 2).length, 2, "II/3's augmentations, alto b. 25 and bass b. 27 (I)");
  const f9 = fugueById("wtc2f09");
  for (const [bar, v] of [[26, 0], [27, 1], [28, 2], [28, 3]]) assert.ok(at(f9, bar, v).some((e) => e.scale === 0.5), `II/9 b. ${bar}: Busoni's D`);
});

test("several subjects: every flag numbered (SUBJECT 1, 2, 3); one subject: plain SUBJECT", () => {
  for (const id of IDS) {
    const spans = entrySpans(fugueById(id)).filter((s) => s.form !== "counter");
    if (expert[id].subjects > 1) assert.ok(spans.every((s) => s.theme === 1 || s.theme === 2 || s.theme === 3), id);
    else assert.ok(spans.every((s) => s.theme === undefined), id);
  }
  const i4 = new Set(entrySpans(fugueById("wtc1f04")).map((s) => s.theme));
  assert.deepEqual([...i4].filter(Boolean).sort(), [1, 2, 3], "I/4: three subjects");
});

test("a partial or modified entry is still an entry, drawn with its flag (a span with notes)", () => {
  let checked = 0;
  for (const id of IDS) {
    const spans = entrySpans(fugueById(id)).filter((s) => s.form !== "counter");
    expert[id].entries.forEach((e, i) => {
      if (!e.form.includes("partial") && !e.form.includes("modified")) return;
      assert.ok(spans[i] && spans[i].path.length >= 2, `${id} b. ${e.bar}`);
      checked++;
    });
  }
  assert.ok(checked > 80, `${checked} partial or modified entries`);
});

/** A canvas that records its filled pixels. */
function recorder() {
  const px = new Set<string>();
  const g = {
    fillStyle: "",
    fillRect(x: number, y: number, w: number, h: number) {
      for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) px.add(`${x + i},${y + j}`);
    },
  } as unknown as CanvasRenderingContext2D;
  return { g, px };
}

test("the flag's label in the entry's form: upside down for an inversion, twice as wide augmented, pressed diminished", () => {
  const word = "SUBJECT 1";
  assert.equal(formWidth(word), textWidth(word));
  assert.equal(formWidth(word, { scale: 2 }), 2 * textWidth(word));
  assert.equal(formWidth(word, { scale: 0.5 }), (3 / 4) * textWidth(word));
  const plain = recorder();
  formText(plain.g, word, 0, 0, "#000");
  const turned = recorder();
  formText(turned.g, word, 0, 0, "#000", { inverted: true });
  // Turned through 180 degrees: each pixel (x, y) of the plain word at (W - 1 - x, 4 - y), W the inked width.
  const W = textWidth(word) - 1;
  assert.equal(turned.px.size, plain.px.size);
  for (const p of plain.px) {
    const [x, y] = p.split(",").map(Number);
    assert.ok(turned.px.has(`${W - 1 - x},${4 - y}`), p);
  }
  const wide = recorder();
  formText(wide.g, word, 0, 0, "#000", { scale: 2 });
  assert.equal(wide.px.size, 2 * plain.px.size);
  const narrow = recorder();
  formText(narrow.g, word, 0, 0, "#000", { scale: 0.5 });
  assert.ok(Math.max(...[...narrow.px].map((p) => Number(p.split(",")[0]))) < formWidth(word, { scale: 0.5 }));
});

test("SUBJECT 1, 2, 3 in Portuguese and Spanish", () => {
  setLang("pt");
  assert.equal(trCanvas("SUBJECT 1"), "SUJEITO 1");
  assert.equal(trCanvas("SUBJECT 3"), "SUJEITO 3");
  setLang("es");
  assert.equal(trCanvas("SUBJECT 2"), "SUJETO 2");
  setLang("en");
  assert.equal(trCanvas("SUBJECT 2"), "SUBJECT 2");
});
