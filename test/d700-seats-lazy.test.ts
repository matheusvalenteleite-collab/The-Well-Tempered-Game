/**
 * D700: THE EXTRAS' SEATS OUT OF THE PLAY BUNDLE, IN BEFORE THEIR PIECES. MORE BACH's, the concertos' and the chorales' line-ups
 * (D641, 147 KB of octave-seats.ts's 170) are chunks of their own (src/touch/seats/), imported only dynamically
 * (extra-seats.ts) and merged by loadExtras before it registers any of those pieces: until then none of them can be found
 * (fugueById), so none can be prepared (Chip.prepare reads its line-up by its id) or played (ProtoGame, the same) on a
 * band's generic line-up. The 48 fugues' seats, and those of the pieces whose notes ship in the main bundle (the preludes,
 * the tutorial, the Art of Fugue XIV), stay in octave-seats.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { CHORALE_INDEX, MORE_INDEX, fugueById, loadExtras } from "../src/touch/fugue.ts";
import { OCTAVE_SEATS } from "../src/touch/octave-seats.ts";
import { pieceLineUp, presetById } from "../src/touch/sound.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const chunks = ["more-bach", "concertos", "chorales"] as const;

test("D700: the extras' seats are chunks of their own, never imported statically; the main seat file has none of their pieces", () => {
  assert.deepEqual(readdirSync(new URL("../src/touch/seats/", import.meta.url)).sort(), chunks.map((c) => `${c}.ts`).sort());
  const extras = new Set([...MORE_INDEX.map(([id]) => id), ...CHORALE_INDEX]);
  for (const fs of Object.values(OCTAVE_SEATS)) for (const id of Object.keys(fs)) assert.ok(!extras.has(id), `${id} in octave-seats.ts`);
  // Only extra-seats.ts reaches them, by import(), as fugue.ts reaches extra-seats.ts.
  const files = (dir: string): string[] => readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(`${dir}/${d.name}`) : /\.(ts|tsx)$/.test(d.name) ? [`${dir}/${d.name}`] : []));
  for (const f of files("src")) {
    const s = src(f);
    assert.doesNotMatch(s, /^import[^;]*from\s+["'][^"']*seats\/(more-bach|concertos|chorales)\.ts["']/m, `${f}: a static import of a seat chunk`);
    assert.doesNotMatch(s, /^import[^;]*from\s+["'][^"']*extra-seats\.ts["']/m, `${f}: a static import of extra-seats.ts`);
  }
  assert.match(src("src/touch/fugue.ts"), /import\("\.\/extra-seats\.ts"\)/);
  for (const c of chunks) assert.match(src("src/touch/extra-seats.ts"), new RegExp(`import\\("\\./seats/${c}\\.ts"\\)`));
});

test("D700: an extras piece is found only once its seats are merged: before loadExtras neither, after it both (no moment on the generic line-up)", async () => {
  const sound = "stringConsort";
  const id = "bwv1052-1";
  // Before: the piece cannot be had (fugueById falls back to the first piece), and its seats are not in.
  assert.notEqual(fugueById(id).id, id);
  assert.equal(presetById(sound).pieces?.[id], undefined);
  // The one step that brings the piece brings its seats first.
  await loadExtras();
  const f = fugueById(id);
  assert.equal(f.id, id);
  const lu = pieceLineUp(sound, f);
  const { SEATS } = await import("../src/touch/seats/concertos.ts");
  assert.deepEqual(lu?.slots, SEATS[sound][id][f.voices.length]);
  // Every extras piece on every sound with seats: its line-up is its chunk's once it can be found.
  for (const c of chunks) {
    const { SEATS: t } = await import(`../src/touch/seats/${c}.ts`);
    for (const [s, fs] of Object.entries(t as Record<string, Record<string, Record<number, unknown>>>))
      for (const [pid, byCount] of Object.entries(fs)) {
        const p = fugueById(pid);
        assert.equal(p.id, pid, `${pid} registered`);
        assert.deepEqual(pieceLineUp(s, p)?.slots, byCount[p.voices.length], `${s} ${pid}`);
      }
  }
});
