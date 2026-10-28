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
