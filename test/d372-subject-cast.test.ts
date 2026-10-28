/**
 * D372: each subject's own effect (Mario's cast for Book I, FIRE, GLINT and SMOKE built, the rest GLINT
 * for now) and each note's weight (the head 1.0, a leap's landing 0.85, longer notes 0.7, quick passing
 * notes 0.35); and the box's drawing of it reaches neither the sound nor the score.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beatOf, fugueById, FUGUES } from "../src/touch/fugue.ts";
import { entrySpans } from "../src/touch/voice-mode.ts";
import { BOOK1_CAST, castOf, effectOf, FALLBACK_FX, FX_BUILT, noteWeights, OTHERS_SCALE, weightsOf, W_HEAD, W_LEAP, W_LONG, W_QUICK } from "../src/touch/subject-cast.ts";

test("the cast names all 24 fugues of Book I, I/4 with three effects (RAYS, RIPPLE, FIRE)", () => {
  for (let i = 1; i <= 24; i++) assert.ok(BOOK1_CAST[`wtc1f${String(i).padStart(2, "0")}`]?.length, `I/${i}`);
  assert.deepEqual(BOOK1_CAST.wtc1f04, ["RAYS", "RIPPLE", "FIRE"]);
  // Every subject the analysis marks has a cast (I/4's three themes).
  const themes = new Set(fugueById("wtc1f04").entries.map((e) => e.theme ?? 1));
  for (const t of themes) assert.ok(castOf("wtc1f04", t as 1 | 2 | 3), `theme ${t}`);
});

test("the effects drawn: the report's FIRE, GLINT and SMOKE where cast, GLINT for the rest and for pieces outside the table", () => {
  assert.deepEqual([...FX_BUILT].sort(), ["FIRE", "GLINT", "SMOKE"]);
  assert.equal(FALLBACK_FX, "GLINT");
  const expect: Record<string, string> = { wtc1f01: "GLINT", wtc1f05: "FIRE", wtc1f10: "FIRE", wtc1f12: "SMOKE", wtc1f16: "GLINT", wtc1f19: "GLINT", wtc1f20: "FIRE", wtc1f24: "SMOKE", wtc1f02: "GLINT", wtc1f03: "GLINT", wtc1f14: "GLINT" };
  for (const [id, fx] of Object.entries(expect)) assert.equal(effectOf(id, 1), fx, id);
  assert.equal(effectOf("wtc1f04", 1), "GLINT");
  assert.equal(effectOf("wtc1f04", 2), "GLINT");
  assert.equal(effectOf("wtc1f04", 3), "FIRE");
  assert.equal(effectOf("wtc2f01", 1), "GLINT");
  assert.equal(effectOf(undefined, 1), "GLINT");
  // The cast's FIRE, GLINT and SMOKE subjects: nine of Book I's (the report counted twelve fugues).
  const built = Object.values(BOOK1_CAST).flat().filter((e) => FX_BUILT.has(e)).length;
  assert.equal(built, 9);
});

test("the weights: I/2's subject as the report's diagram gives it", () => {
  const f = fugueById("wtc1f02");
  const e = f.entries[0];
  const s = entrySpans(f).find((x) => x.voice === e.voice && x.on === e.on && x.form !== "counter")!;
  const beat = beatOf(f).ticks;
  const w = [...noteWeights(s.path, beat)].slice(0, 10).map((x) => +x.toFixed(2));
  assert.deepEqual(w, [1, 1, 1, 0.85, 0.7, 0.35, 0.35, 0.7, 0.7, 0.85]);
});

test("the weights' rules: head, leap of a fourth or more, half a beat or longer, else quick", () => {
  const beat = 480;
  const w = noteWeights(
    [
      { dur: 120, step: 10 },
      { dur: 120, step: 11 },
      { dur: 120, step: 12 },
      { dur: 120, step: 9 }, // a fourth down: a leap's landing, quick or not
      { dur: 120, step: 7 }, // a third: quick
      { dur: 240, step: 8 }, // half a beat
      { dur: 239, step: 9 }, // just under: quick
      { dur: 960, step: 14 }, // a sixth up
    ],
    beat,
  );
  assert.deepEqual([...w].map((x) => +x.toFixed(2)), [W_HEAD, W_HEAD, W_HEAD, W_LEAP, W_QUICK, W_LONG, W_QUICK, W_LEAP]);
  assert.equal(OTHERS_SCALE, 0.5);
});

test("every entry of Book I weighted within 0.35..1, its head at 1, kept per entry", () => {
  for (const f of FUGUES.filter((x) => x.id.startsWith("wtc1f"))) {
    const beat = beatOf(f).ticks;
    for (const s of entrySpans(f)) {
      if (s.form === "counter" || !s.path.length) continue;
      const w = weightsOf(s, beat);
      assert.equal(w.length, s.path.length);
      assert.equal(w[0], 1, f.id);
      for (const x of w) assert.ok(x >= W_QUICK - 1e-6 && x <= 1, `${f.id} ${x}`);
      assert.equal(weightsOf(s, beat), w, "kept");
    }
  }
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
