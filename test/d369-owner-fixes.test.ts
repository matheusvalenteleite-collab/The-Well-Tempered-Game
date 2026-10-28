/**
 * D369: the owner's fixes for WTC 1.77 (the lock phrase, sideways only, the tutorial's fixes, the stops in
 * the side panels, the voice legend, the subject's readings back, the first plays' voice, runs a little
 * stricter).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D369 (1): a lock phrase, checked by its hash alone, locks the device again from the same secret field", async () => {
  const { LOCK_HASH, UNLOCK_HASH, passMatches, secretAction } = await import("../src/bench/unlock.ts");
  assert.equal(LOCK_HASH, "651c608289ef7de7702d00edf30b4218d662f6a643362b22021632b846fb801e");
  assert.notEqual(LOCK_HASH, UNLOCK_HASH);
  const phrase = "a test phrase for d369";
  const hash = createHash("sha256").update(phrase).digest("hex");
  assert.equal(await passMatches(" A TEST phrase for D369 ", hash), true);
  assert.equal(await secretAction(phrase), null, "a test phrase neither unlocks nor locks");
  const secret = src("src/bench/Secret.tsx");
  assert.match(secret, /setUnlocked\(act === "unlock"\)/);
});

test("D369 (2): play.html sideways only: the turn screen over everything, the run paused, the lock asked, a landscape manifest", () => {
  const main = src("src/bench/lite-main.tsx");
  assert.match(main, /<Sideways \/>/);
  assert.match(main, /lockOnFirstTap\(\)/);
  const sw = src("src/bench/Sideways.tsx");
  assert.match(sw, /UPRIGHT_QUERY = "\(orientation: portrait\) and \(pointer: coarse\)"/);
  assert.match(sw, /lock\?\.\("landscape"\)\.catch/);
  assert.match(sw, /requestFullscreen/);
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /if \(q\.matches && APP\.lite\) \{\s*pauseNow\(true\);/);
  const man = JSON.parse(src("public/play-app/manifest.webmanifest"));
  assert.equal(man.orientation, "landscape");
  assert.equal(man.display, "fullscreen");
  assert.match(src("play.html"), /rel="manifest" href="\.\/play-app\/manifest\.webmanifest"/);
  assert.match(src("src/bench/bench.css"), /\.tb-play-page \.tg-upright \{ display: none !important; \}/);
});

/**
 * Every struck note of a stage played at its time and row by alternating thumbs, held to the next; each
 * shaken `px` px down and back (two legs of `legMs`) 60 ms after it sounds; with `rest`, each thumb comes
 * down on its note right after the note before is struck (PREPARED, the owner's habit) and the lift of
 * the other sounds it (a pull-off). The free graces read.
 */
async function shaken(id: string, stage: number, px: number, legMs: number, rest = false) {
  const { lessonById } = await import("../src/bench/manual/lessons.ts");
  const { gameFor, ROWS } = await import("./d342-sim.ts");
  const l = lessonById(id)!;
  const clock = { t: 0 };
  const { g } = gameFor(l.stages[stage].m, clock, undefined, !!l.ornaments);
  g.wall = () => 0;
  const heads = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
  const evs: { t: number; k: number; fn: () => void }[] = [];
  heads.forEach((n, j) => {
    const side = j % 2 ? "right" : "left";
    const x = side === "left" ? 40 : 760;
    const t = g.timeAt(n.on);
    const nx = heads[j + 1] ? g.timeAt(heads[j + 1].on) : t + 0.6;
    const y = ROWS.yOf(n.step);
    const id = j + 1;
    evs.push({ t: rest && j > 0 ? g.timeAt(heads[j - 1].on) + 0.04 : t, k: 1, fn: () => g.down(id, { side, x, y, w: 800, h: 400 }, 0) });
    for (let q = 0; q < 2; q++) for (let s = 1; s <= 6; s++) evs.push({ t: t + (60 + q * legMs + (s * legMs) / 6) / 1000, k: 2, fn: () => g.move(id, { side, x, y: y + (q === 0 ? (px * s) / 6 : px - (px * s) / 6), w: 800, h: 400 }, 0) });
    evs.push({ t: rest ? nx + 0.005 : nx - 0.01, k: 0, fn: () => g.up(id, 0) });
  });
  evs.sort((a, b) => a.t - b.t || a.k - b.k);
  let done = false;
  for (const e of evs) {
    while (!done && clock.t + 1 / 240 < e.t) (clock.t += 1 / 240), (done = g.step());
    if (done) break;
    clock.t = Math.max(clock.t, e.t);
    e.fn();
  }
  while (!done && clock.t < 900) (clock.t += 1 / 120), (done = g.step());
  const f = g.freeOrns;
  return { free: f.mordents + f.shorts + f.trills + f.turns, heads: heads.length, r: g.results() };
}

test("D369 (3h): a lesson sounds only what is struck: a settling roll of a few px reads no grace of its own (Parts 0–IV)", async () => {
  // Before: a 6 px roll each way, 70 ms, read as a mordent on every note of I.1's drill and I.4's first stage.
  for (const [id, k] of [["I.1", 0], ["I.4", 0], ["I.4", 1], ["II.1", 2]] as const) {
    const s = await shaken(id, k, 6, 70);
    assert.equal(s.free, 0, `${id} stage ${k}: ${s.free} free graces read`);
    assert.equal(s.r.right, s.r.of, `${id}: every note right`);
  }
  assert.match(src("src/bench/proto-game.ts"), /if \(this\.o\.quiet && !this\.o\.quiet\.ornaments\) return false;/);
});

test("D369 (3i): V.4's free graces read, also with the other thumb resting PREPARED on the next note (it no longer takes the held note away)", async () => {
  const subtle = await shaken("V.4", 1, 6, 70);
  assert.ok(subtle.free >= subtle.heads / 2, `subtle: ${subtle.free} of ${subtle.heads}`);
  const prepared = await shaken("V.4", 1, 20, 120, true);
  assert.ok(prepared.free >= prepared.heads / 2, `with a prepared rest: ${prepared.free} of ${prepared.heads} (before D369: 0)`);
  const small = await shaken("V.4", 1, 6, 70, true);
  assert.ok(small.free >= small.heads / 2, `small, prepared: ${small.free}`);
});
