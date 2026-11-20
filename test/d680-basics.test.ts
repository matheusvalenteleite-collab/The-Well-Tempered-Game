/**
 * D680–D682 (design studio): BASICS with Glenn. Each excerpt is real Bach and ends on the downbeat its last bar leads
 * to, a chord of resolution; step 6 is one segment played three times, a voice a pass (top, middle, bottom); the
 * surprise's four sounds exist; nothing is scored or failed; Glenn's keyboard spans the piano.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { barStart, fugueById, loadExtras } from "../src/touch/fugue.ts";
import { BASICS, basicsRun, beginner, SURPRISE_SOUNDS, turnsPage } from "../src/bench/basics/basics.ts";
import { presetById } from "../src/touch/sound.ts";
import { BASICS_PT } from "../src/i18n/basics-pt.ts";
import { BASICS_ES } from "../src/i18n/basics-es.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("every excerpt ends on the downbeat after its last bar, where the voices sound a chord of resolution", async () => {
  await loadExtras();
  // The chords the cuts land on (pitch classes sounding on that downbeat), as the studio read them from the score.
  const want: Record<string, number[]> = { "inv01@3": [0, 4], "inv01@7": [7], "bwv779@3": [5], "bwv779@5": [5, 9], "bwv795@3": [5], "bwv795@5": [0, 3] };
  for (const t of BASICS) {
    if (t.m.count) continue;
    const f = fugueById(t.m.piece);
    const r = basicsRun(t);
    const end = barStart(f, t.m.toBar + 1);
    assert.ok(r.until > end, `${t.m.label}: reaches the downbeat of bar ${t.m.toBar + 1}`);
    const pcs = new Set(f.voices.flatMap((v) => v.filter((n) => n[0] === end).map((n) => n[2] % 12)));
    for (const pc of want[`${t.m.piece}@${t.m.toBar + 1}`]) assert.ok(pcs.has(pc), `${t.m.label}: bar ${t.m.toBar + 1} sounds pitch class ${pc}`);
  }
});

test("step 6: one segment, three passes, top, middle, bottom; nothing failed anywhere", () => {
  const passes = BASICS.filter((t) => t.step === 6);
  assert.deepEqual(passes.map((t) => t.m.voice), [0, 1, 2]);
  assert.equal(new Set(passes.map((t) => `${t.m.piece}:${t.m.fromBar}-${t.m.toBar}`)).size, 1);
  assert.deepEqual(passes.map((t) => t.pass), [0, 1, 2]);
  for (const t of BASICS) assert.equal(basicsRun(t).fail, false);
  // Steps 1–5: Glenn plays it, then the player.
  for (let s = 1; s <= 5; s++) assert.deepEqual([...new Set(BASICS.filter((t) => t.step === s).map((t) => t.kind))], ["hear", "play"]);
});

test("the music itself about two and a half minutes (with count-ins, page turns and rewinds, four to five)", async () => {
  await loadExtras();
  const secs = BASICS.reduce((a, t) => {
    const r = basicsRun(t);
    const f = fugueById(t.m.piece);
    return a + (r.until - r.from) / ((f.tpq * r.bpm) / 60);
  }, 0);
  assert.ok(secs > 140 && secs < 300, `${Math.round(secs)} s`);
});

test("the surprise's sounds, the page turns, the beginner's glow", () => {
  for (const id of SURPRISE_SOUNDS) assert.equal(presetById(id).id, id);
  assert.ok(turnsPage(BASICS.findIndex((t) => t.m.piece === "bwv779")));
  assert.ok(!turnsPage(BASICS.findIndex((t) => t.pass === 1)));
  assert.ok(beginner({}) && beginner({ wtc1f01: "C" }) && !beginner({ wtc1f01: "B" }));
});

test("every word in Portuguese and Spanish; the developer view only; Glenn's window off the notes", () => {
  for (const t of BASICS) if (t.word !== "↑ ↓") assert.ok(BASICS_PT[t.word] && BASICS_ES[t.word], t.word);
  for (const w of ["BASICS", "WITH GLENN", "INTERMEDIATE", "ADVANCED", "UNDER CONSTRUCTION", "LISTEN"]) assert.ok(BASICS_PT[w] && BASICS_ES[w], w);
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /basics=\{unlocked\(\) \?/);
  assert.match(app, /bTake \? BASICS_FLOOR/);
  // No strobe: every pulse in the marks slower than a second.
  assert.match(src("src/bench/basics/basics-aids.ts"), /Math\.sin\(now \/ 420\)/);
});
