/**
 * D380: play.html on the Home Screen: installed or not, the iPhone Safari hint (once, never in play), the
 * manifest, the worker's registration and its version tied to VERSION.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isInstalled, isIos, isIosSafari, shouldHint, type Env } from "../src/bench/install.ts";
import { VERSION } from "../src/bench/version.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.119 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36";
const env = (ua: string, o: Partial<Env> = {}): Env => ({ ua, maxTouchPoints: 5, media: () => false, ...o });

test("D380: installed is navigator.standalone (iOS) or a display-mode of its own", () => {
  assert.equal(isInstalled(env(IPHONE)), false);
  assert.equal(isInstalled(env(IPHONE, { standalone: true })), true);
  assert.equal(isInstalled(env(ANDROID, { media: (q) => q === "(display-mode: fullscreen)" })), true);
  assert.equal(isInstalled(env(ANDROID, { media: (q) => q === "(display-mode: standalone)" })), true);
  assert.equal(isInstalled(null), false);
});

test("D380: the hint is for Safari on iPhone and iPad only, not installed, not seen, never while busy", () => {
  assert.ok(isIos(env(IPAD)) && isIosSafari(env(IPAD)), "iPadOS says Macintosh, with touch points");
  assert.equal(isIos(env(IPAD, { maxTouchPoints: 0 })), false, "a Mac");
  assert.equal(shouldHint(env(IPHONE), false, false), true);
  assert.equal(shouldHint(env(IPHONE), true, false), false, "once");
  assert.equal(shouldHint(env(IPHONE), false, true), false, "never in play");
  assert.equal(shouldHint(env(IPHONE, { standalone: true }), false, false), false, "already installed");
  assert.equal(shouldHint(env(IPHONE_CHROME), false, false), false, "Chrome on iPhone has its own menu");
  assert.equal(shouldHint(env(ANDROID), false, false), false, "Android: the INSTALL button instead");
});

test("D380: the manifest is complete and points at play.html", () => {
  const m = JSON.parse(src("public/play-app/manifest.webmanifest")) as Record<string, unknown> & { icons: { src: string; sizes: string; purpose?: string }[] };
  for (const k of ["name", "short_name", "start_url", "scope", "display", "orientation", "background_color", "theme_color", "id"]) assert.ok(m[k], k);
  assert.equal(m.start_url, "../play.html");
  assert.equal(m.orientation, "landscape");
  assert.ok(["fullscreen", "standalone"].includes(m.display as string));
  assert.ok(m.icons.some((i) => i.purpose === "maskable" && i.sizes === "512x512"));
  assert.ok(m.icons.some((i) => i.sizes === "192x192") && m.icons.some((i) => i.sizes === "512x512" && i.purpose !== "maskable"));
});

test("D380: play.html's head: Apple's metas, the touch icon, the launch background, the worker registered without the HTTP cache", () => {
  const h = src("play.html");
  for (const s of ['name="apple-mobile-web-app-capable" content="yes"', 'name="apple-mobile-web-app-status-bar-style"', 'name="apple-mobile-web-app-title"', 'rel="apple-touch-icon"', 'rel="manifest"', "viewport-fit=cover", "background: #0b0d18"]) assert.ok(h.includes(s), s);
  assert.match(h, /register\("\.\/play-sw\.js", \{ scope: "\.\/play", updateViaCache: "none" \}\)/);
});

test("D380: the worker's version carries VERSION, its caches named by it, the older ones deleted", async () => {
  const { playVersion } = await import("../tools/play-app/sw-plugin.ts");
  const v = playVersion("0123456789abcdef");
  assert.ok(v.startsWith(VERSION.toLowerCase().replace(/[^a-z0-9.]+/g, "-")), v);
  assert.ok(v.endsWith("-0123456789ab"));
  const sw = src("tools/play-app/sw.js");
  assert.match(sw, /const CACHE = PREFIX \+ VERSION/);
  assert.match(sw, /k\.startsWith\(PREFIX\) && k !== CACHE/);
  assert.match(sw, /skipWaiting/);
  assert.match(sw, /clients\.claim/);
});
