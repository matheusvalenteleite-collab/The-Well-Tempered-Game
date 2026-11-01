/**
 * D372: each subject's own effect (Mario's cast for Book I; D383 all ten effects built) and (D374) one strength on every subject note; and the box's drawing of it reaches neither the sound nor the score.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById } from "../src/touch/fugue.ts";
import { BOOK1_CAST, castOf, effectOf, FALLBACK_FX, FX_BUILT, NOTE_WEIGHT, ONLY_FX, OTHERS_SCALE } from "../src/touch/subject-cast.ts";

test("the cast names all 24 fugues of Book I, I/4 with three effects (RAYS, RIPPLE, FIRE)", () => {
  for (let i = 1; i <= 24; i++) assert.ok(BOOK1_CAST[`wtc1f${String(i).padStart(2, "0")}`]?.length, `I/${i}`);
  assert.deepEqual(BOOK1_CAST.wtc1f04, ["RAYS", "RIPPLE", "FIRE"]);
  // Every subject the analysis marks has a cast (I/4's three themes).
  const themes = new Set(fugueById("wtc1f04").entries.map((e) => e.theme ?? 1));
  for (const t of themes) assert.ok(castOf("wtc1f04", t as 1 | 2 | 3), `theme ${t}`);
});

// The design studio (the owner: HOP "shows most clearly that a subject is playing"): for now HOP is the only
// effect drawn (ONLY_FX), so this test, which pinned each fugue drawn as cast, now pins the cast as the
// record (castOf) and HOP drawn everywhere (effectOf).
test("the effects built (D383: all ten), each fugue's cast kept as the record; for now every subject drawn HOP", () => {
  assert.deepEqual([...FX_BUILT].sort(), ["EMBERS", "FIRE", "GLINT", "HOP", "PULSE", "RAYS", "RIPPLE", "SHIMMER", "SMOKE", "TEARS"]);
  assert.equal(FALLBACK_FX, "GLINT");
  assert.equal(ONLY_FX, "HOP");
  const expect: Record<string, string> = { wtc1f01: "GLINT", wtc1f02: "HOP", wtc1f03: "SHIMMER", wtc1f05: "FIRE", wtc1f06: "EMBERS", wtc1f07: "RIPPLE", wtc1f08: "PULSE", wtc1f12: "SMOKE", wtc1f14: "TEARS", wtc1f17: "RAYS", wtc1f24: "SMOKE" };
  for (const [id, fx] of Object.entries(expect)) assert.equal(castOf(id, 1), fx, id);
  assert.equal(castOf("wtc1f04", 1), "RAYS");
  assert.equal(castOf("wtc1f04", 2), "RIPPLE");
  assert.equal(castOf("wtc1f04", 3), "FIRE");
  assert.equal(castOf("wtc2f01", 1), "HOP");
  assert.equal(castOf("bwv1080-14", 1), null);
  for (const id of ["wtc1f01", "wtc1f04", "wtc2f01", "bwv1080-14"]) for (const t of [1, 2, 3] as const) assert.equal(effectOf(id, t), "HOP", `${id} ${t}`);
  assert.equal(effectOf(undefined, 1), "HOP");
  for (const [id, row] of Object.entries(BOOK1_CAST)) row.forEach((_, i) => assert.equal(effectOf(id, (i + 1) as 1 | 2 | 3), "HOP", id));
});

test("D374: every subject note the same strength (no per-note weights); another voice's at half", () => {
  assert.ok(NOTE_WEIGHT > 0 && NOTE_WEIGHT <= 1);
  assert.equal(OTHERS_SCALE, 0.5);
  const fx = readFileSync(new URL("../src/touch/box-fx.ts", import.meta.url), "utf8");
  const cast = readFileSync(new URL("../src/touch/subject-cast.ts", import.meta.url), "utf8");
  assert.ok(!/weightsOf|noteWeights|W_HEAD|W_QUICK/.test(fx + cast), "no per-note weighting left");
});

test("drawing only: the cast and weights reach neither the sound, the judge nor the score, and never ask right or wrong", () => {
  const src = readFileSync(new URL("../src/touch/subject-cast.ts", import.meta.url), "utf8");
  assert.ok(!/state|hit|miss|gain|level|velocity/i.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), "no note states or loudness in the cast");
  const fx = readFileSync(new URL("../src/touch/box-fx.ts", import.meta.url), "utf8");
  const body = fx.slice(fx.indexOf("export function subjectFx"), fx.indexOf("/** A pixel star"));
  assert.ok(body.length > 100 && !/\.state\b|"hit"|"miss"/.test(body), "the effects never look at hit or miss");
  for (const p of ["src/touch/sound.ts", "src/bench/proto-game.ts", "src/touch/phrasing.ts"]) {
    assert.ok(!readFileSync(new URL(`../${p}`, import.meta.url), "utf8").includes("subject-cast"), p);
  }
});
