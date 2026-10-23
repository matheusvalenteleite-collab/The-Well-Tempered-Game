// D224: the feats (judged from a run and what is kept), their storage, and the ACHIEVEMENTS screen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { evaluateFeats, earnFeats, FEATS, FEATS_KEY, FUOCO_RUN, readFeats, writeFeats, bestOf, type FeatStore, type RunFeat } from "../src/bench/feats.ts";
import { FUOCO_NOTES } from "../src/bench/proto-game.ts";
import { CARDS, NOT_OFFERED } from "../src/bench/cards.ts";

const empty = (): FeatStore => ({ earned: {}, done: [] });
const run = (o: Partial<RunFeat> = {}): RunFeat => ({
  piece: "wtc1f02", mode: "ladder", whole: true, failedBar: null, grade: "B", right: 80, of: 100, wrong: 10, missed: 10, captured: 2, entries: 3, maxStreak: 12,
  art: { legato: 5, legatoOf: 10, chain: 6, held: 10, heldOf: 30, clean: 3, cleanOf: 5 }, strettos: 0, her: false, tuning: "equal", ...o,
});
const hist = (store = empty(), best = {}, seals = {}) => ({ store, best, seals });

test("feats: a first ordinary whole run", () => {
  const { store, fresh } = evaluateFeats(run(), hist(), "2026-10-23");
  assert.deepEqual(fresh, ["first-note", "first-fugue", "pleno"]);
  assert.deepEqual(store.done, ["wtc1f02"]);
  assert.equal(store.earned["first-fugue"], "2026-10-23");
  // Earned once only.
  assert.deepEqual(evaluateFeats(run(), hist(store), "2026-10-24").fresh, []);
});

test("feats: a lost run, a perfect run, a stretto, Kimiko, a tuning", () => {
  const lost = evaluateFeats(run({ whole: false, failedBar: 12, captured: 0, right: 0 }), hist(), "d");
  assert.deepEqual(lost.fresh, []);
  assert.deepEqual(lost.store.done, []);
  const perfect = evaluateFeats(run({ piece: "wtc1f03", grade: "S", right: 100, wrong: 0, missed: 0, captured: 3, maxStreak: FUOCO_RUN, art: { legato: 30, legatoOf: 30, chain: 22, held: 40, heldOf: 40, clean: 5, cleanOf: 5 } }), hist(), "d").fresh;
  for (const id of ["clean", "first-s", "fuoco", "legato", "held", "entries", "thomaskantor"] as const) assert.ok(perfect.includes(id), id);
  assert.ok(!perfect.includes("triple"), "I/3 is no triple fugue");
  assert.ok(evaluateFeats(run({ piece: "wtc1f04", captured: 5, entries: 5 }), hist(), "d").fresh.includes("triple"));
  assert.ok(evaluateFeats(run({ mode: "subject", strettos: 1, whole: false }), hist(), "d").fresh.includes("stretto"));
  const her = evaluateFeats(run({ her: true, tuning: "equal" }), hist(), "d").fresh;
  assert.ok(her.includes("kimiko") && !her.includes("temperament"));
  assert.ok(evaluateFeats(run({ tuning: "werckmeister", whole: false }), hist(), "d").fresh.includes("temperament"));
  assert.equal(FUOCO_RUN, FUOCO_NOTES, "CON FUOCO's run as the game's");
});

test("feats: from what is kept (grades, seals, the fugues played whole)", () => {
  const best = { "wtc1f01:0": "A", "wtc1f05:1": "S", "wtc1f06:0": "A", "wtc2f02:2": "A" };
  assert.ok(!evaluateFeats(run({ grade: "B" }), hist(empty(), best), "d").fresh.includes("five-a"));
  assert.ok(evaluateFeats(run({ grade: "A" }), hist(empty(), best), "d").fresh.includes("five-a"));
  const seals: Record<string, true> = {};
  for (const c of CARDS.slice(0, 10)) seals[`${c.id}:0`] = true;
  const s = evaluateFeats(run({ whole: false }), hist(empty(), {}, seals), "d").fresh;
  assert.ok(s.includes("first-seal") && s.includes("ten-seals"));
  const allVoices = { "wtc1f10:0": "C", "wtc1f10:1": "B" };
  assert.ok(evaluateFeats(run({ whole: false }), hist(empty(), allVoices), "d").fresh.includes("every-voice"));
  assert.deepEqual(bestOf(allVoices, "wtc1f10"), { grade: "B", voice: 1, voices: 2 });
  // Book I: 23 done, the 24th makes it, and the 24 keys too.
  const done = Array.from({ length: 23 }, (_, i) => `wtc1f${String(i + 1).padStart(2, "0")}`);
  const last = evaluateFeats(run({ piece: "wtc1f24" }), hist({ earned: {}, done }), "d").fresh;
  assert.ok(last.includes("book-i") && last.includes("keys"));
  // The keys from either book.
  const mixed = Array.from({ length: 23 }, (_, i) => `wtc${i % 2 ? 1 : 2}f${String(i + 1).padStart(2, "0")}`);
  const k = evaluateFeats(run({ piece: "wtc2f24" }), hist({ earned: {}, done: mixed }), "d").fresh;
  assert.ok(k.includes("keys") && !k.includes("book-i"));
  assert.equal(FEATS.length, 21);
  assert.equal(new Set(FEATS.map((f) => f.id)).size, 21);
  for (const f of FEATS) assert.ok(f.glyph.length === 7 && f.glyph.every((r) => r.length === 7), f.id);
});

class Mem {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

test("feats: kept on the device (tb-feats-v1)", () => {
  const ls = new Mem();
  (globalThis as { localStorage?: unknown }).localStorage = ls;
  try {
    assert.deepEqual(readFeats(), empty());
    writeFeats({ earned: { "first-s": "2026-01-02" }, done: ["wtc1f01"] });
    assert.deepEqual(readFeats(), { earned: { "first-s": "2026-01-02" }, done: ["wtc1f01"] });
    const fresh = earnFeats(run({ piece: "wtc1f02" }), {}, {});
    assert.ok(fresh.includes("first-fugue"));
    const back = readFeats();
    assert.deepEqual(back.done, ["wtc1f01", "wtc1f02"]);
    assert.equal(back.earned["first-s"], "2026-01-02");
    assert.ok(JSON.parse(ls.getItem(FEATS_KEY)!).earned["first-fugue"]);
    ls.setItem(FEATS_KEY, "not json");
    assert.deepEqual(readFeats(), empty());
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});

test("ACHIEVEMENTS: every offered seal listed, the not-offered apart; the feats", async () => {
  register("./tsx-hooks.mjs", import.meta.url);
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { Achievements } = await import("../src/bench/Achievements.tsx");
  const data = { best: { "wtc1f01:0": "A" }, seals: { "wtc1f01:0": true, "wtc2f05:3": true } as Record<string, true>, feats: { earned: { "first-note": "2026-10-23" }, done: [] } };
  const html = renderToStaticMarkup(createElement(Achievements, { close: () => {}, data }));
  const offered = CARDS.filter((c) => !NOT_OFFERED.has(c.seal.kind)).length;
  assert.equal(offered, 46, "49 cards, the three DUET seals not offered");
  assert.equal(html.match(/class="tb-ach-row tb-ach-seal[" ]/g)?.length, offered);
  assert.equal(html.match(/tb-ach-seal-off/g)?.length, 3);
  assert.equal(html.match(/tb-ach-seal earned/g)?.length, 2);
  assert.ok(html.includes(`SEALS 2/${offered}`));
  assert.ok(html.indexOf('data-piece="wtc1f01"') < html.indexOf('data-piece="wtc2f01"') && html.indexOf('data-piece="wtc2f24"') < html.indexOf('data-piece="bwv1080-14"'), "Book I, Book II, XIV");
  const feats = renderToStaticMarkup(createElement(Achievements, { close: () => {}, data, tab: "feats", fresh: ["first-note"] }));
  assert.equal(feats.match(/data-feat=/g)?.length, 21);
  assert.ok(feats.includes("NEW!") && feats.includes("FEATS 1/21"));
  const best = renderToStaticMarkup(createElement(Achievements, { close: () => {}, data, tab: "best" }));
  assert.ok(best.includes("BY THE SOPRANO") && best.includes("BEST 1/49"));
});
