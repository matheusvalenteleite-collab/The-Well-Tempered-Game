/**
 * D343: play.html for the owner's friends: mobile only, Book I alone, no TOOLS, the fewest choices, the
 * language at hand; everything back behind the owner's secret (unlock.ts: seven taps on the version,
 * a passphrase whose SHA-256 alone is kept).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { register } from "node:module";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D343: the passphrase is checked by its SHA-256 (trimmed, lower-cased); only the hash is in the code", async () => {
  const { passMatches, sha256Hex, UNLOCK_HASH } = await import("../src/bench/unlock.ts");
  // A test-only phrase, its hash computed here (never the real passphrase).
  const phrase = "a test phrase for d343";
  const hash = createHash("sha256").update(phrase).digest("hex");
  assert.equal(await sha256Hex(phrase), hash);
  assert.equal(await passMatches(phrase, hash), true);
  assert.equal(await passMatches("  A Test PHRASE for D343 \n", hash), true, "trimmed and lower-cased");
  assert.equal(await passMatches("a test phrase for d34", hash), false);
  assert.equal(await passMatches("", hash), false);
  assert.equal(UNLOCK_HASH, "fb6c3730b0c638153a307e0ca6c18f0df952bf240e05e0469ba5e7a892d72546");
  assert.equal(await passMatches(phrase), false, "the test phrase is not the passphrase");
  // The field: the hash compared, the device unlocked and reloaded only on a match; a wrong input closes silently.
  const secret = src("src/bench/Secret.tsx");
  assert.match(secret, /const ok = await passMatches\(text\);\s*close\(\);\s*if \(!ok\) return;\s*setUnlocked\(true\);\s*window\.location\.reload\(\);/);
});

test("D343: seven taps within three seconds open the field; slower taps never do", async () => {
  const { tapCounter, UNLOCK_TAPS, UNLOCK_WINDOW_MS } = await import("../src/bench/unlock.ts");
  assert.deepEqual([UNLOCK_TAPS, UNLOCK_WINDOW_MS], [7, 3000]);
  const fast = tapCounter();
  const hits = Array.from({ length: 7 }, (_, i) => fast(1000 + i * 300));
  assert.deepEqual(hits, [false, false, false, false, false, false, true]);
  assert.equal(fast(4000), false, "counting starts again");
  const slow = tapCounter();
  assert.ok(Array.from({ length: 14 }, (_, i) => slow(i * 600)).every((x) => !x), "one tap every 0.6 s: never seven within 3 s");
});

test("D343: locked, play.html is Book I's fugues on a phone; unlocked, all four tabs and the platform as detected or chosen", async () => {
  const { liteNextOrder, litePlatform, liteTabs } = await import("../src/bench/lite.ts");
  const { nextIn } = await import("../src/bench/flow.ts");
  const { UNLOCK_KEY, unlocked } = await import("../src/bench/unlock.ts");
  store.clear();
  assert.equal(unlocked(), false);
  assert.equal(litePlatform(), "mobile");
  assert.deepEqual(liteTabs().map(([t]) => t), ["I"]);
  assert.equal(nextIn(liteNextOrder("wtc1f24", true), "wtc1f24"), "wtc1f01", "NEXT after Book I's last wraps to its first");
  store.set(UNLOCK_KEY, "1");
  try {
    assert.equal(unlocked(), true);
    assert.deepEqual(liteTabs().map(([t]) => t), ["I", "II", "MORE", "CHORALES"]);
    assert.equal(nextIn(liteNextOrder("wtc1f24", true), "wtc1f24"), "wtc2f01");
    store.set("tb-lite-platform", "computer");
    assert.equal(litePlatform(), "computer", "⚙ PLAY ON again");
  } finally {
    store.clear();
  }
});

test("D343: the first screen: SETTINGS labelled, EN · PT · ES at hand, the tutorial first, cards without BWV or sound; no TOOLS for the friends", async () => {
  register("./tsx-hooks.mjs", import.meta.url);
  store.clear();
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { LiteGrid } = await import("../src/bench/LiteGrid.tsx");
  const html = renderToStaticMarkup(createElement(LiteGrid, { beaten: [], open: () => {}, settings: () => {}, fuguesOnly: true, setLang: () => {}, tutorial: { done: 0, of: 12, start: () => {} } }));
  assert.match(html, /id="lite-settings" class="tb-settings-btn"[^>]*>.*?<svg.*?<span>SETTINGS<\/span>/);
  for (const l of ["en", "pt", "es"]) assert.match(html, new RegExp(`id="head-lang-${l}"`));
  assert.match(html, /id="card-tutorial"[^>]*>.*?▶ BEGIN.*?START HERE/);
  assert.match(html, /BOOK I · 24 FUGUES/);
  assert.doesNotMatch(html, /BWV|SOUND:/);
  assert.equal(html.match(/class="tb-lite-card/g)?.length, 25, "the tutorial and Book I's 24 fugues");
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /beside=\{full \? <ToolsButton/);
  assert.match(app, /APP\.lite && full && toolsOpen/);
});

test("D343: the pop-up for the friends: the piece's name, the voice, PLAY; no BWV, no sound to choose (a recorded sound's credit kept)", async () => {
  register("./tsx-hooks.mjs", import.meta.url);
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { PlayPop } = await import("../src/bench/PlayPop.tsx");
  const base = { id: "wtc1f01", voice: 1, singing: [0, 1, 2, 3], setVoice: () => {}, play: () => {}, close: () => {}, setSound: () => {}, tuning: "EQUAL · A440" };
  const plain = renderToStaticMarkup(createElement(PlayPop, { ...base, sound: "chip", plain: true }));
  assert.match(plain, /class="tb-pop-title">FUGUE IN C MAJOR</);
  assert.doesNotMatch(plain, />[^<]*BWV|id="pop-sound"|id="pop-tuning"/, "no BWV on screen (the dialog's label for screen readers keeps the formal title)");
  assert.match(plain, /id="voice-1" class="on"/);
  assert.match(plain, /id="play"/);
  const piano = renderToStaticMarkup(createElement(PlayPop, { ...base, sound: "pianoSampled", plain: true }));
  assert.match(piano, /id="pop-credit"/, "the recorded piano's credit (CC BY) still shown");
  const full = renderToStaticMarkup(createElement(PlayPop, { ...base, sound: "chip" }));
  assert.match(full, /BWV 846\/2 · FUGUE IN C MAJOR/);
  assert.match(full, /id="pop-sound"/);
});

test("D343: settings: the language first, named in its own tongue; the owner's items and LOCK AGAIN only unlocked; the version last, tappable", () => {
  const app = src("src/bench/BenchApp.tsx");
  const lite = app.slice(app.indexOf('<Panel title="SETTINGS" close={back} className="tb-lite-settings">'), app.indexOf('{phase.kind === "settings" && !APP.lite && ('));
  const order = ['id={`lang-${l}`}', 'id="volume"', "<LagSetting", "{full && (", 'id="lite-platform"', "<DisplayChoice", "<TuningSelect", 'id="lock-again"', "<VersionTap"].map((s) => lite.indexOf(s));
  assert.ok(order.every((i) => i >= 0), String(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order, "in that order");
  assert.match(lite, /\{name\}/, "each language by its own name (LANGS), not translated");
  assert.match(lite, /setUnlocked\(false\), window\.location\.reload\(\)/);
});

test("D343: MOBILE ONLY on a computer (unless unlocked), its title taking the seven taps; translated", async () => {
  register("./tsx-hooks.mjs", import.meta.url);
  const main = src("src/bench/lite-main.tsx");
  assert.match(main, /isSurelyComputer\(\) && !unlocked\(\) \? <MobileOnly \/> : <BenchApp \/>/);
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { MobileOnly } = await import("../src/bench/MobileOnly.tsx");
  assert.match(renderToStaticMarkup(createElement(MobileOnly)), /id="mobile-only-title"[^>]*>MOBILE ONLY</);
  const { useLang } = await import("../src/i18n/index.ts");
  useLang("pt");
  try {
    assert.match(renderToStaticMarkup(createElement(MobileOnly)), /SÓ NO CELULAR/);
  } finally {
    useLang("en");
  }
});

test("D343: the MORE BACH and CHORALES notes load on demand; their index (ids, collections) matches the data", async () => {
  const fugue = src("src/touch/fugue.ts");
  assert.doesNotMatch(fugue, /^import .*(more-bach|chorales)\.json/m, "no static import of the notes");
  assert.match(fugue, /import\("\.\/extras-data\.ts"\)/);
  const { extrasIndex } = await import("../tools/touch/extras-index.ts");
  const data = (p: string) => JSON.parse(src(p));
  // D348: and the harpsichord concertos (data/touch/concertos.json, their own chunk).
  assert.deepEqual(JSON.parse(src("data/touch/extras-index.json")), extrasIndex(data("data/touch/more-bach.json"), data("data/touch/chorales.json"), data("data/touch/concertos.json")), "run node tools/touch/extras-index.ts");
  const { CHORALE_IDS, MORE_SECTIONS } = await import("../src/bench/lite.ts");
  const { extrasLoaded, fugueById, loadExtras } = await import("../src/touch/fugue.ts");
  assert.equal(CHORALE_IDS.length, 370, "the tabs known before the notes");
  assert.equal(MORE_SECTIONS.flatMap((s) => s.ids).length, 59 + 39);
  await Promise.all([loadExtras(), loadExtras()]);
  assert.equal(extrasLoaded(), true);
  assert.equal(fugueById("chor001").id, "chor001");
  assert.equal(fugueById("bwv1080-14").id, "bwv1080-14", "Contrapunctus 14 still pieces.json's");
});
