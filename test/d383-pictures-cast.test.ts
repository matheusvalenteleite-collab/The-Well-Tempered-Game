/**
 * D383: the 48 fugues' pictures, names and subject effects. Every fugue of Book I and Book II has its own
 * drawn picture (pictures-data.ts, decoded by emblem.ts), its name in English, Portuguese and Spanish, and
 * an effect cast for each of its subjects; all ten effects are drawn, cheaply, and none of it reaches the
 * sound, the judge or the score, or ever asks whether a note was right or wrong.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EMBLEM_H, EMBLEM_W, emblemPixels, pictureOf } from "../src/bench/emblem.ts";
import { PICTURES } from "../src/bench/pictures-data.ts";
import { FUGUE_NAMES, fugueName } from "../src/touch/fugue-names.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { BOOK1_CAST, BOOK2_CAST, CAST, castOf, effectOf, EFFECTS, FX_BUILT, ONLY_FX, type SubjectEffect } from "../src/touch/subject-cast.ts";
import { FX_RECTS, subjectFx, type Span } from "../src/touch/box-fx.ts";

const THE_48 = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("pictures: all 48 fugues drawn, 64 x 40 in #rgb, each its own; the preludes keep their emblems", () => {
  assert.equal(Object.keys(PICTURES).length, 48);
  const seen = new Set<string>();
  for (const id of THE_48) {
    const px = pictureOf(id);
    assert.ok(px, id);
    assert.equal(px.length, EMBLEM_W * EMBLEM_H, id);
    for (const c of new Set(px)) assert.match(c, /^#[0-9a-f]{3}$/, id);
    assert.ok(new Set(px).size >= 8, `${id}: a picture, not a flat field`);
    assert.deepEqual(emblemPixels(id), px, `${id}: the emblem is the picture`);
    seen.add(px.join(""));
  }
  assert.equal(seen.size, 48, "every picture its own");
  assert.equal(pictureOf("wtc1p01"), null);
  assert.equal(pictureOf("bwv1080-14"), null);
  assert.equal(emblemPixels("wtc1p01").length, EMBLEM_W * EMBLEM_H);
  // The generator is kept beside the data it writes.
  assert.match(src("src/bench/pictures-data.ts"), /tools\/pictures\/build\.py/);
  for (const f of ["lib.py", "book1.py", "book2.py", "build.py", "sheet.py"]) assert.ok(src(`tools/pictures/${f}`).length > 100, f);
});

test("names: all 48 in English, Portuguese and Spanish, a short form for the tiles, each its own; II/13 the owner's Telephone (WTC 1.92)", () => {
  for (const id of THE_48) {
    for (const l of ["en", "pt", "es"] as const) {
      const full = fugueName(id, l);
      const short = fugueName(id, l, "short");
      assert.ok(full && full.length <= 28, `${id} ${l}`);
      assert.ok(short && short.length <= 13, `${id} ${l} short`);
    }
  }
  for (const l of ["en", "pt", "es"] as const) assert.equal(new Set(THE_48.map((id) => fugueName(id, l))).size, 48, `${l}: 48 different names`);
  assert.deepEqual(FUGUE_NAMES.wtc2f13, { en: { full: "The Telephone", short: "Telephone" }, pt: { full: "O Telefone", short: "Telefone" }, es: { full: "El Teléfono", short: "Teléfono" } });
  // Each of Book II's names carries its reason on the line above it.
  const lines = src("src/touch/fugue-names.ts").split("\n");
  for (let i = 1; i <= 24; i++) {
    const at = lines.findIndex((x) => x.includes(`wtc2f${String(i).padStart(2, "0")}:`));
    assert.match(lines[at - 1], /^\s*\/\/ .{20,}/, `II/${i}: its reason`);
  }
});

test("the cast: every subject of all 48 fugues has an effect, every one of the ten used, Book II's with reasons", () => {
  assert.deepEqual(Object.keys(CAST).sort(), [...THE_48].sort());
  for (const id of THE_48) {
    const themes = new Set(fugueById(id).entries.map((e) => (e.theme === 2 || e.theme === 3 ? e.theme : 1)));
    assert.equal(CAST[id].length, Math.max(...themes), `${id}: one effect a subject`);
    for (const t of themes) {
      const e = castOf(id, t as 1 | 2 | 3);
      assert.ok(e && FX_BUILT.has(e), `${id} subject ${t}`);
      // The design studio: for now every subject is drawn HOP (ONLY_FX); the cast is kept as the record.
      assert.equal(effectOf(id, t as 1 | 2 | 3), ONLY_FX ?? e, `${id} subject ${t} drawn`);
    }
  }
  const used = new Set(Object.values(CAST).flat());
  assert.deepEqual([...used].sort(), [...EFFECTS].sort(), "all ten in use");
  assert.equal(Object.keys(BOOK1_CAST).length, 24);
  assert.equal(Object.keys(BOOK2_CAST).length, 24);
  for (const line of src("src/touch/subject-cast.ts").split("\n").filter((x) => /^\s*wtc2f\d\d:/.test(x))) assert.match(line, /\/\/ .{15,}/, line);
});

/** A canvas that only counts: the effects may only set colours and alphas and fill rectangles. */
function fakeCtx(spans: Span[]) {
  const calls = { rects: 0, other: [] as string[] };
  const g = new Proxy(
    { fillStyle: "", globalAlpha: 1, fillRect: () => void calls.rects++ } as Record<string, unknown>,
    {
      get(o, k) {
        if (k === "fillRect") return o.fillRect;
        if (k === "fillStyle" || k === "globalAlpha") return o[k as string];
        calls.other.push(String(k));
        return () => undefined;
      },
      set(o, k, v) {
        if (k !== "fillStyle" && k !== "globalAlpha") calls.other.push(`set ${String(k)}`);
        o[k as string] = v;
        return true;
      },
    },
  );
  const c = { g: g as unknown as CanvasRenderingContext2D, w: 400, h: 200, xOf: (tk: number) => (tk - 1000) / 8, yOf: (st: number) => 100 - st * 6, bh: 6, now: 1960, tps: 960, gold: "#fc4", miss: "#888", fg: "#fff", ink: (v: number) => ["#5aa0e6", "#ff8a50", "#c478e6", "#3ca060"][v % 4] };
  return { c, calls, spans };
}

function entry(voice: number, on: number, shape?: string): Span {
  const path = Array.from({ length: 10 }, (_, i) => ({ on: on + i * 240, dur: i % 3 ? 240 : 480, step: (i * 3) % 7 }));
  return { voice, on, end: on + 2640, form: "subject", key: "C", path, shape };
}

test("each of the ten effects draws within its budget, only rectangles, the same at the same moment, and leaves the notes alone", () => {
  const byFx = new Map<SubjectEffect, string>();
  for (const [id, row] of Object.entries(CAST)) if (!byFx.has(row[0])) byFx.set(row[0], id);
  assert.equal(byFx.size, 10);
  for (const [fx, piece] of byFx) {
    const spans = [entry(0, 1200), entry(1, 1500, "INVERSION"), entry(2, 1800, "AUGMENTATION"), entry(3, 900)];
    const before = JSON.stringify(spans);
    let total = 0;
    for (const t of [0.1, 0.5, 1.3, 2.7]) {
      for (const mine of [false, true]) {
        const { c, calls } = fakeCtx(spans);
        subjectFx(c, spans, [1], mine, piece, 480, t);
        assert.deepEqual(calls.other, [], `${fx}: nothing but fillRect, fillStyle and globalAlpha`);
        assert.ok(calls.rects <= FX_RECTS + 40, `${fx}: ${calls.rects} rectangles`);
        total += calls.rects;
        const again = fakeCtx(spans);
        subjectFx(again.c, spans, [1], mine, piece, 480, t);
        assert.equal(again.calls.rects, calls.rects, `${fx}: stateless`);
      }
    }
    assert.ok(total > 0, `${fx} (${piece}) draws something`);
    assert.equal(JSON.stringify(spans), before, `${fx}: the spans untouched`);
  }
});

test("drawing only: the effects never look at right or wrong, allocate nothing a frame, and reach neither the sound nor the score", () => {
  const fx = src("src/touch/box-fx.ts");
  const body = fx.slice(fx.indexOf("export function subjectFx"), fx.indexOf("/** A pixel star"));
  assert.ok(body.includes('fx === "TEARS"') && body.includes('fx === "PULSE"') && body.includes('fx === "RIPPLE"'));
  const code = body.slice(body.indexOf(") {")).replace(/\/\/.*$/gm, "");
  assert.ok(!/\.state\b|"hit"|"miss"|\bmissed\b|\bjudge/.test(code), "no right or wrong");
  assert.ok(!/new |\[\]|\{\s*\}|`|\.map\(|\.filter\(|\.slice\(|\+ ?"/.test(code), "no allocation in the frame's loop (no arrays, objects, template strings or string sums)");
  const cast = src("src/touch/subject-cast.ts").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  assert.ok(!/state|hit|miss|gain|velocity|volume/i.test(cast), "no note states or loudness in the cast");
  for (const p of ["src/touch/sound.ts", "src/touch/sampled.ts", "src/touch/piece-sound.ts", "src/touch/chip.ts", "src/touch/engine.ts", "src/touch/phrasing.ts", "src/bench/proto-game.ts", "src/bench/glenn.ts"]) {
    const s = src(p);
    assert.ok(!s.includes("subject-cast") && !s.includes("pictures-data") && !s.includes("fugue-names"), `${p} knows nothing of the effects, pictures or names`);
  }
});
