import { test } from "node:test";
import assert from "node:assert/strict";
import { FUGUES } from "../src/touch/fugue.ts";
import { betterGrade, bookCards, cardById, CARDS, NEEDS_DATA, SEAL_KINDS, TIERS } from "../src/bench/cards.ts";
import { drawEmblem, EMBLEM_H, EMBLEM_W, emblemPixels, keyHue, strettoCount } from "../src/bench/emblem.ts";

test("every fugue (48 and Contrapunctus XIV) has a card, and every card a fugue", () => {
  assert.equal(FUGUES.length, 49);
  assert.equal(CARDS.length, 49);
  for (const f of FUGUES) assert.ok(cardById(f.id), `no card for ${f.id}`);
  const ids = new Set(FUGUES.map((f) => f.id));
  for (const c of CARDS) assert.ok(ids.has(c.id), `card ${c.id} has no fugue`);
  assert.equal(new Set(CARDS.map((c) => c.id)).size, 49);
});

test("BWV numbers: Book I 846-869, Book II 870-893 in order, XIV 1080/19", () => {
  const one = bookCards(1);
  const two = bookCards(2);
  assert.equal(one.length, 24);
  assert.equal(two.length, 24);
  one.forEach((c, i) => assert.equal(c.bwv, `BWV ${846 + i}`));
  two.forEach((c, i) => assert.equal(c.bwv, `BWV ${870 + i}`));
  for (const c of [...one, ...two]) {
    const f = FUGUES.find((x) => x.id === c.id)!;
    assert.equal(c.bwv, `BWV ${f.bwv}`, c.id);
    assert.equal(c.number, f.number);
    assert.equal(c.formal, f.title, "the formal title is the data's own");
  }
  const [xiv] = bookCards(0);
  assert.equal(xiv.id, "bwv1080-14");
  assert.equal(xiv.bwv, "BWV 1080/19");
  assert.ok(!CARDS.some((c) => c.bwv.includes("1080/14")));
});

test("titles, seals and stars are filled; seals needing data are ready once the data has it (D196)", () => {
  for (const c of CARDS) {
    assert.ok(c.title.trim().length > 3, c.id);
    assert.ok(c.why.trim().length > 10, c.id);
    assert.ok(c.seal.line.trim().length > 5, c.id);
    assert.ok(c.seal.kind in SEAL_KINDS, c.id);
    if (!NEEDS_DATA.has(c.seal.kind)) assert.equal(c.ready, true, c.id);
    assert.ok(Number.isInteger(c.stars) && c.stars >= 1 && c.stars <= TIERS.length, c.id);
    // Nothing marked uncertain in the study reaches the screen.
    assert.ok(!/[~?]/.test(c.title + c.why + c.seal.line), c.id);
  }
  assert.equal(new Set(CARDS.map((c) => c.title)).size, 49, "every title its own");
  assert.equal(cardById("wtc1f08")!.ready, true); // SLOW GIANT: I/8's augmentations (D189)
  // SUBJECTS: the later subjects of the double and triple fugues are in the entries (D197).
  for (const id of ["wtc1f04", "wtc2f04", "wtc2f14", "wtc2f18", "wtc2f23", "bwv1080-14"]) assert.equal(cardById(id)!.ready, true, id);
  // Every card's seal is judged now.
  assert.deepEqual(CARDS.filter((c) => !c.ready).map((c) => c.id), []);
  assert.equal(cardById("wtc1f01")!.ready, true); // STRETTO
});

test("the best grade keeps the better one", () => {
  assert.equal(betterGrade(undefined, "B"), "B");
  assert.equal(betterGrade("B", "A"), "A");
  assert.equal(betterGrade("A", "C"), "A");
  assert.equal(betterGrade("S", "A"), "S");
});

/** A context that records what is painted. */
function fake() {
  const calls: [string, number, number, number, number][] = [];
  return {
    calls,
    fillStyle: "" as unknown,
    fillRect(x: number, y: number, w: number, h: number) {
      calls.push([String(this.fillStyle), x, y, w, h]);
    },
  };
}

test("the emblem paints every pixel once, the same each time, and differs between fugues", () => {
  const a = fake();
  drawEmblem(a, "wtc1f01");
  const b = fake();
  drawEmblem(b, "wtc1f01");
  assert.deepEqual(a.calls, b.calls);
  // The runs tile the 64 x 40 picture exactly.
  const area = a.calls.reduce((s, [, , , w, h]) => s + w * h, 0);
  assert.equal(area, EMBLEM_W * EMBLEM_H);
  for (const [col, x, y, w, h] of a.calls) {
    assert.match(col, /^#[0-9a-f]{3}$/);
    assert.ok(x >= 0 && y >= 0 && x + w <= EMBLEM_W && y + h <= EMBLEM_H);
  }
  // Scaled, the same runs at four times the size.
  const c = fake();
  drawEmblem(c, "wtc1f01", 4);
  assert.deepEqual(
    c.calls,
    a.calls.map(([col, x, y, w, h]) => [col, x * 4, y * 4, w * 4, h * 4]),
  );
  const pics = new Set(CARDS.map((card) => emblemPixels(card.id).join("")));
  assert.equal(pics.size, CARDS.length, "every emblem its own");
});

test("the emblem's colours come from the key's hue (keyTint's circle of fifths)", () => {
  assert.equal(keyHue("C"), 220);
  assert.equal(keyHue("c"), 220);
  assert.equal(keyHue("G"), 250);
  assert.equal(keyHue("C#"), 70);
  assert.equal(keyHue("Eb"), 130);
  assert.equal(keyHue("B"), 10);
});

test("the stretto count matches the study (I/1: 12 of 23 entries)", () => {
  const f = FUGUES.find((x) => x.id === "wtc1f01")!;
  assert.equal(f.entries.length, 23);
  assert.equal(strettoCount(f), 12);
});
