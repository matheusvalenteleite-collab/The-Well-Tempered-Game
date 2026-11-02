/**
 * The design studio (D462): every fugue of both books has its world behind the box (stage-bg.ts), drawn as a
 * journey, under a veil; STAGE FULL / QUIET / OFF; drawing only (nothing judged reads it).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { STAGE_IDS, hasStage, paintStage } from "../src/touch/stage-bg.ts";
import { fugueById } from "../src/touch/fugue.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("all 48 fugues have a world, and only they", () => {
  const ids = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));
  assert.deepEqual([...STAGE_IDS].sort(), ids);
  assert.ok(!hasStage("wtc1p01") && !hasStage(undefined));
});

/** A canvas that only counts what is drawn (the worlds draw without throwing, at the start, middle and end). */
function fakeCanvas() {
  let ops = 0;
  const grad = { addColorStop: () => {} };
  const g = new Proxy(
    {},
    {
      get: (_t, k) => (k === "createLinearGradient" || k === "createRadialGradient" ? () => grad : k === "ops" ? ops : () => void ops++),
      set: () => true,
    },
  );
  return g as unknown as CanvasRenderingContext2D & { ops: number };
}

test("each world draws at the opening, the middle and the close, in FULL and QUIET, and draws nothing when OFF", () => {
  for (const id of STAGE_IDS) {
    const f = fugueById(id);
    for (const p of [0, 0.5, 1]) {
      const now = f.length * p;
      for (const mode of ["full", "quiet"] as const) {
        const g = fakeCanvas();
        assert.equal(paintStage(g, 420, 150, f, { now, t0: now - f.barTicks, span: 5 * f.barTicks, sec: 3 }, mode), true, `${id} ${p} ${mode}`);
        assert.ok(g.ops > 5, `${id} drew`);
      }
    }
    assert.equal(paintStage(fakeCanvas(), 420, 150, f, { now: 0, t0: 0, span: 5 * f.barTicks, sec: 0 }, "off"), false);
  }
});

test("the veil keeps the music readable (heavier in QUIET and over daylight); drawing only, never judged", () => {
  const s = src("src/touch/stage-bg.ts");
  assert.match(s, /const a = \(mode === "quiet" \? 0\.62 : 0\.4\) \+ \(BRIGHT\.has\(f\.id\) \? 0\.14 : 0\);/);
  assert.ok(!/state|"hit"|"miss"|score|grade/.test(s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")), "nothing reads right or wrong");
  for (const p of ["src/bench/proto-game.ts", "src/touch/engine.ts"]) assert.ok(!/stage-bg/.test(src(p)), p);
  assert.match(src("src/touch/MusicBox.tsx"), /!fr\.floor && hasStage\(fr\.piece\) && paintStage\(/);
  assert.match(src("src/bench/BenchApp.tsx"), /<Choice id="stage" label="STAGE"/);
});

test("D464: the worlds follow the music: an entry in the other mode turns the light, the rain grows, strettos and cadences show", () => {
  const s = src("src/touch/stage-bg.ts");
  assert.match(s, /spans: f\.entries\.map\(\(e\) => \(\{ on: e\.on, end: e\.end, other: isMinor\(e\.key\) !== home \}\)\)/);
  assert.match(s, /if \(k\.turn > 0\.01\) \{\s*if \(k\.homeMinor\)/);
  assert.match(s, /k\.rain\(Math\.round\(25 \+ 120 \* \(0\.2 \+ 0\.8 \* k\.p\) \* \(0\.55 \+ 0\.45 \* k\.busy\) \* \(1 - 0\.7 \* k\.turn\)\)/);
  assert.match(s, /k\.stretto > 0\.5/);
  assert.match(s, /k\.cadence = Math\.max\(0, 1 - \(now - lastCad\) \/ \(2 \* f\.barTicks\)\)/);
});

test("D464: the characters wander on their own clock, not on the play line", () => {
  const s = src("src/touch/stage-bg.ts");
  assert.match(s, /wander\(period: number, phase = 0, from = 0\.14, to = 0\.86\)/);
  for (const id of ["wtc1f02", "wtc1f09", "wtc1f18", "wtc2f15", "wtc2f19"]) {
    const at = s.indexOf(`  ${id}: (k) => {`);
    const body = s.slice(at, s.indexOf("\n  },\n", at));
    assert.ok(body.includes("k.wander(") && !body.includes("k.xOf(k.now())"), id);
  }
});
