/**
 * D970 (canons session; the owner's pick, the third prototype): THE ROLLING RIBBON on the nine Goldberg canons and
 * Inventions 2 and 8, replacing the echo lane. Every answered leader note carried in exactly one shape; segments of about a
 * bar's breath, never fewer than three notes; a big morph at the first entry and at each change of leader;
 * no thinning (D971: every segment flies); each shape landing before its follower's first note sounds; drawing only, no canvas blur; ⚙ CANONS.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { CANONS, echoPairs } from "../src/touch/canon-echo.ts";
import { ribbonShapes, unitOf, canonsMode } from "../src/touch/canon-ribbon.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const IDS = ["bwv988-03", "bwv988-06", "bwv988-09", "bwv988-12", "bwv988-15", "bwv988-18", "bwv988-21", "bwv988-24", "bwv988-27", "bwv773", "bwv779"];

test("batch 1: the nine Goldberg canons and Inventions 2 and 8 carry a ribbon", async () => {
  await loadExtras();
  for (const id of IDS) assert.ok(CANONS[id] && ribbonShapes(fugueById(id)).length > 3, id);
});

test("every answered leader note is in exactly one shape, landing on its own answer", async () => {
  await loadExtras();
  for (const id of IDS) {
    const f = fugueById(id), P = echoPairs(f), S = ribbonShapes(f);
    const seen = new Map<string, number>();
    for (const s of S) s.A.forEach((a, i) => { const k = `${a.voice}:${a.on}`; seen.set(k, (seen.get(k) ?? 0) + 1); const p = P.find((x) => x.a.voice === a.voice && x.a.on === a.on)!; assert.equal(s.T[i], p.b); });
    assert.equal(seen.size, P.length, id);
    assert.ok([...seen.values()].every((n) => n === 1), id);
  }
});

test("segments: about a bar's breath (half a bar to two bars, nearest 2¼ s), never fewer than three notes", async () => {
  await loadExtras();
  for (const id of IDS) {
    const f = fugueById(id), u = unitOf(f) / f.barTicks;
    assert.ok([0.5, 1, 2].includes(u), `${id} ${u}`);
    for (const s of ribbonShapes(f)) assert.ok(s.A.length >= 3, `${id} ${s.A.length}`);
  }
});

test("a big morph at the first entry and at each change of leader, and only there", async () => {
  await loadExtras();
  const bigs = (id: string) => ribbonShapes(fugueById(id)).filter((s) => s.big).map((s) => s.leg);
  assert.deepEqual(bigs("bwv988-03"), [0]);
  assert.deepEqual(bigs("bwv988-12"), [0, 1]);
  assert.deepEqual(bigs("bwv988-15"), [0]); // one leg since D951
  assert.deepEqual(bigs("bwv988-24"), [0, 1, 2]);
  assert.deepEqual(bigs("bwv988-27"), [0, 1]);
  assert.deepEqual(bigs("bwv773"), [0, 1, 2]);
});

test("D971: no thinning: every shape is drawn, and every answered leader note flies in one (none skipped by density)", async () => {
  await loadExtras();
  const src = readFileSync(new URL("../src/touch/canon-ribbon.ts", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.ok(!/shown|% 2/.test(src));
  for (const id of Object.keys(CANONS)) {
    const f = fugueById(id), S = ribbonShapes(f);
    const flown = new Set(S.flatMap((s) => s.A.map((a) => `${a.voice}:${a.on}`)));
    for (const p of echoPairs(f)) assert.ok(flown.has(`${p.a.voice}:${p.a.on}`), `${id}: ${p.a.voice} at ${p.a.on}`);
  }
});

test("each shape lands a quarter before its follower's first note sounds, its flight never under a quarter, never before the start", async () => {
  await loadExtras();
  for (const id of IDS) {
    const f = fugueById(id);
    for (const s of ribbonShapes(f)) {
      assert.equal(s.landed, s.tB0 - f.tpq / 4);
      assert.ok(s.start >= 0 && s.fly > s.start && s.landed - s.fly >= f.tpq - 1, `${id} ${s.start} ${s.fly} ${s.landed}`);
    }
  }
});

test("drawing only, under the notes, no canvas blur; ⚙ CANONS: MORPH by default, or OFF", () => {
  const e = src("src/touch/canon-ribbon.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.ok(!/shadowBlur|filter\s*=/.test(e));
  assert.ok(!/score|grade|"hit"|"miss"/.test(e));
  assert.equal(canonsMode(), "morph");
  const b = src("src/bench/BenchApp.tsx");
  assert.match(b, /<Choice id="canons" label="CANONS"/);
  for (const l of ["pt", "es"]) assert.match(src(`src/i18n/${l}.ts`), /CANONS: "/);
});

test("the layers (the board, #450): the copies over the other voices and under the player's notes; the landing flare again over them", () => {
  const m = src("src/touch/MusicBox.tsx");
  const under = m.indexOf('paintCanon(g, fugueById(fr.piece), canonGeo!, "under")');
  const players = m.indexOf("// The voice played (or two): full, outlined.");
  const over = m.indexOf('paintCanon(g, fugueById(fr.piece), canonGeo, "over")');
  assert.ok(under > 0 && players > under && over > players, `${under} ${players} ${over}`);
  const e = src("src/touch/canon-ribbon.ts");
  assert.match(e, /if \(veil > 0 && under\)/);
  assert.match(e, /Math\.max\(k\.bh \* 0\.4, k\.bh \* Math\.abs\(c\)\)/);
});
