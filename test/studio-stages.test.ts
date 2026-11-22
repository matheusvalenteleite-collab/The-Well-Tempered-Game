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

/** D669: the Art of Fugue's 20 share one setting (the Constellation); no piece of it has a world of its own. */
const AOF = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12r", "12i", "13r", "13i", "c14", "c15", "c16", "c17", "14"].map((x) => `bwv1080-${x}`);

test("all 48 fugues have a world of their own, and only they; the Art of Fugue its one setting (D669)", () => {
  const ids = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));
  assert.deepEqual([...STAGE_IDS].sort(), ids);
  // D941: a WTC prelude in its fugue's world.
  for (const id of ids) assert.ok(hasStage(id.replace("f", "p")), id);
  for (const id of AOF) assert.ok(hasStage(id), id);
  // D670: the Inventions and Sinfonias share the Songbirds.
  for (let b = 772; b <= 801; b++) assert.ok(hasStage(`bwv${b}`), `bwv${b}`);
  // D671: the Four Duets share the Gallery.
  for (let b = 802; b <= 805; b++) assert.ok(hasStage(`bwv${b}`), `bwv${b}`);
  // D672: the Chromatic Fugue, the Lighthouse.
  assert.ok(hasStage("bwv903-2") && !hasStage("bwv903-1"));
  // D673: the Albinoni fugue, the Lagoon.
  assert.ok(hasStage("bwv951"));
  // D674: the Fantasia and Fugue in C minor, the Scaffold.
  assert.ok(hasStage("bwv906-1") && hasStage("bwv906-2"));
  // D675: the Prelude, Fugue and Allegro, the Lute-Maker's Workshop.
  assert.ok(hasStage("bwv998-1") && hasStage("bwv998-2") && hasStage("bwv998-3"));
  // D677: the Goldberg Variations, the Night Watch.
  for (let v = 0; v <= 30; v++) assert.ok(hasStage(`bwv988-${String(v).padStart(2, "0")}`), `bwv988 ${v}`);
  // D941: a prelude in its fugue's world (above); nothing for no piece.
  assert.ok(hasStage("wtc1p01") && !hasStage(undefined));
  const s = src("src/touch/stage-bg.ts");
  assert.ok(!/^  "bwv1080-/m.test(s), "no per-piece Art of Fugue world or script");
  assert.match(s, /test: \(id\) => id\.startsWith\("bwv1080-"\), world: constellation/);
  assert.match(s, /test: \(id\) => INV_ID\.test\(id\), world: songbirds/);
  assert.match(s, /test: \(id\) => DUET_ID\.test\(id\), world: gallery/);
  assert.match(s, /test: \(id\) => CHROMATIC_ID\.test\(id\), world: lighthouse/);
  assert.match(s, /test: \(id\) => ALBINONI_ID\.test\(id\), world: lagoon/);
  assert.match(s, /test: \(id\) => C_MINOR_906_ID\.test\(id\), world: scaffold/);
  assert.match(s, /test: \(id\) => LUTE_998_ID\.test\(id\), world: workshop/);
  assert.match(s, /test: \(id\) => GOLDBERG_ID\.test\(id\), world: nightWatch/);
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

test("each world draws at the opening, the middle and the close, in FULL and QUIET, and draws nothing when OFF", async () => {
  // D665: the Art of Fugue's pieces are in the extras chunk.
  const { loadExtras } = await import("../src/touch/fugue.ts");
  await loadExtras();
  for (const id of [...STAGE_IDS, ...AOF, "bwv772", "bwv786", "bwv787", "bwv801", "bwv802", "bwv805", "bwv903-2", "bwv951", "bwv906-1", "bwv906-2", "bwv998-1", "bwv998-2", "bwv998-3", "bwv988-00", "bwv988-03", "bwv988-16", "bwv988-25", "bwv988-30"]) {
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
  // D475: an episode's veil heavier, an entry's lighter, the climax lifting the edges (never the middle band past 30%).
  assert.match(s, /const a = \(mode === "quiet" \? 0\.62 : 0\.4\) \+ \(BRIGHT\.has\(f\.id\) \? 0\.14 : 0\) \+ \(sc \? 0\.12 \* ce\.calm - 0\.04 \* \(1 - ce\.calm\) : 0\);/);
  assert.match(s, /gr\.addColorStop\(0\.5, `rgba\(8,8,16,\$\{a \* \(1 - 0\.3 \* lift\)\}\)`\);/);
  assert.ok(!/state|"hit"|"miss"|score|grade/.test(s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")), "nothing reads right or wrong");
  for (const p of ["src/bench/proto-game.ts", "src/touch/engine.ts"]) assert.ok(!/stage-bg/.test(src(p)), p);
  assert.match(src("src/touch/MusicBox.tsx"), /!fr\.floor && hasStage\(fr\.piece\) && paintStage\(/);
  assert.match(src("src/bench/BenchApp.tsx"), /<Choice id="stage" label="STAGE"/);
});

test("D464: the worlds follow the music: an entry in the other mode turns the light, the rain grows, strettos and cadences show", () => {
  const s = src("src/touch/stage-bg.ts");
  assert.match(s, /spans: f\.entries\.map\(\(e\) => \(\{ on: e\.on, end: e\.end, other: isMinor\(e\.key\) !== home, voice: e\.voice \}\)\)/);
  assert.match(s, /if \(k\.turn > 0\.01\) \{\s*if \(k\.homeMinor\)/);
  assert.match(s, /k\.rain\(Math\.round\(25 \+ 120 \* \(0\.2 \+ 0\.8 \* k\.p\) \* \(0\.55 \+ 0\.45 \* k\.busy\) \* \(1 - 0\.7 \* k\.turn\)\)/);
  // D479: II/5's bells now ring in its stretto towers (k.strettos); the eased stretto still read by the worlds.
  assert.match(s, /k\.stretto/);
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

test("D475: every world has its script of acts, and the director reads the form (form-points.ts)", async () => {
  const s = src("src/touch/stage-bg.ts");
  const { STAGE_IDS } = await import("../src/touch/stage-bg.ts");
  for (const id of STAGE_IDS) assert.ok(new RegExp(`\\n  "?${id}"?: (sk\\(|\\{\\n    acts:)`).test(s.slice(s.indexOf("const SCRIPTS"))), `${id} has no script`);
  assert.match(s, /const fa = fm \? formAt\(fm, now\) : null;/);
  assert.match(s, /zoom: a\[4\] \?\? 1/);
  // The zoom stays subtle (at most 7%).
  for (const m of s.matchAll(/, (1\.\d+)\]\)/g)) assert.ok(+m[1] <= 1.07, m[0]);
});
