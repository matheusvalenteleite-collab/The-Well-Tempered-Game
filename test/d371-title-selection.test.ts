/**
 * D371 (WTC 1.78, Mario and Luigi's report): play.html's title page (B-A-C-H on the organ, the wordmark
 * in three languages, TOUCH TO BEGIN), the selection screen in three columns (Book I's 24 fugues at
 * once, D's NEXT ribbon, the TUTORIAL button, the collections), the voice legend's filled chip and the
 * thumb bars edged in the player's colour, an Invention's voices UPPER and LOWER, and the app icon.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
register("./tsx-hooks.mjs", import.meta.url);

test("D371: the intro's subject is Contrapunctus XIV's B♭–A–C–B♮, read from the game's data (the tenor, bar 193), about nine seconds", async () => {
  const { bachNotes, BACH_SOURCE, BACH_PITCHES, INTRO_S, INTRO_HALF_S } = await import("../src/bench/intro-sound.ts");
  const { fugueById } = await import("../src/touch/fugue.ts");
  const f = fugueById(BACH_SOURCE.piece);
  assert.equal(f.id, "bwv1080-14");
  const bar = f.bars.find((b) => b.n === BACH_SOURCE.bar)!;
  const line = f.voices[BACH_SOURCE.voice].filter(([on]) => on >= bar.on);
  // The data: B♭3 A3 C4 B3, half notes, the tenor from bar 193 (its first B♭ in that bar).
  const k = line.findIndex(([, , m]) => m === 58);
  assert.ok(line[k][0] < bar.on + f.barTicks, "in bar 193");
  assert.deepEqual(line.slice(k, k + 4).map(([, , m]) => m), [58, 57, 60, 59]);
  assert.deepEqual(line.slice(k, k + 3).map(([, d]) => d), [f.tpq * 2, f.tpq * 2, f.tpq * 2], "half notes");
  const notes = bachNotes();
  assert.deepEqual(notes.map((n) => n.midi), [...BACH_PITCHES]);
  assert.deepEqual(notes.map((n) => n.at), [0, INTRO_HALF_S, 2 * INTRO_HALF_S, 3 * INTRO_HALF_S]);
  assert.deepEqual(notes.map((n) => n.fade), [false, false, false, true], "only the last fades");
  const last = notes[3];
  assert.ok(last.at + last.len < INTRO_S && INTRO_S >= 8 && INTRO_S <= 10, "the last note dies within the intro's nine seconds");
  // On the PIPE ORGAN (the existing preset), through the game's own sound (BenchApp's chip), every touch after the first skipping.
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /setPreset\("chamberOrgan"\)/);
  assert.match(app, /const introBegin = async/);
  assert.match(app, /\{APP\.lite && intro && <Intro begin=\{introBegin\} end=\{introEnd\} \/>\}/);
  const intro = src("src/bench/Intro.tsx");
  assert.match(intro, /if \(stage !== "touch"\) return finish\(true\);/, "a touch during the intro skips");
});

test("D371: the title page: TOUCH TO BEGIN in the three languages first; the wordmark's lines per language; the subtitle and the version translated", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const i18n = await import("../src/i18n/index.ts");
  const { Intro, versionLine } = await import("../src/bench/Intro.tsx");
  i18n.useLang("pt");
  try {
    const html = renderToStaticMarkup(createElement(Intro, { begin: async () => 0, end: () => {} }));
    assert.match(html, /id="intro-touch"[^>]*>TOQUE PARA COMEÇAR</);
    assert.match(html, /TOUCH TO BEGIN/);
    assert.match(html, /TOCA PARA EMPEZAR/);
    assert.match(versionLine(), /^VERSÃO \d+\.\d+$/);
    assert.equal(i18n.tr("24 FUGUES FOR TWO THUMBS"), "24 FUGAS PARA DOIS POLEGARES");
    i18n.useLang("es");
    assert.match(versionLine(), /^VERSIÓN \d+\.\d+$/);
    assert.equal(i18n.tr("24 FUGUES FOR TWO THUMBS"), "24 FUGAS PARA DOS PULGARES");
  } finally {
    i18n.useLang("en");
  }
  assert.deepEqual(i18n.WORDMARK.en, ["THE", "WELL-TEMPERED", "GAME"]);
  assert.deepEqual(i18n.WORDMARK.pt, ["O JOGO", "BEM TEMPERADO", ""]);
  assert.deepEqual(i18n.WORDMARK.es, ["EL JUEGO", "BIEN TEMPERADO", ""]);
  // Without a canvas (here) the wordmark is its words.
  const { wordmark } = await import("../src/bench/wordmark.ts");
  assert.equal(wordmark("en"), null);
});

test("D371: NEXT is the first fugue not yet finished, in Bach's order; none on the first visit or once all are finished", async () => {
  const { liteSuggested, liteFirstVisit } = await import("../src/bench/lite.ts");
  const { gridIds } = await import("../src/bench/Selection.tsx");
  const ids = gridIds("I");
  assert.equal(ids.length, 24);
  assert.deepEqual([ids[0], ids[1], ids[23]], ["wtc1f01", "wtc1f02", "wtc1f24"], "C, c, … b: Bach's order");
  assert.equal(liteSuggested(ids, []), "wtc1f01");
  assert.equal(liteSuggested(ids, ["wtc1f01", "wtc1f02"]), "wtc1f03");
  assert.equal(liteSuggested(ids, new Set(["wtc1f01", "wtc1f03"])), "wtc1f02");
  assert.equal(liteSuggested(ids, [], true), null);
  assert.equal(liteSuggested(ids, ids), null);
  assert.equal(liteFirstVisit([], 0), true);
  assert.equal(liteFirstVisit([], 1), false);
  assert.equal(liteFirstVisit(["wtc1f01"], 0), false);
});

test("D371: the selection screen: 24 tiles, no list; TUTORIAL; Book I alone for the friends, all four tabs once unlocked; NEXT, grades and PLAY", async () => {
  store.clear();
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { Selection } = await import("../src/bench/Selection.tsx");
  const base = { piece: "wtc1f02", voice: 1, singing: [0, 1, 2], setVoice: () => {}, select: () => {}, play: () => {}, options: () => {}, open: () => {}, hear: () => {}, settings: () => {}, setLang: () => {} };
  // The first visit: the TUTORIAL glows (BEGIN), the right column says where to start, no PLAY yet.
  const first = renderToStaticMarkup(createElement(Selection, { ...base, beaten: [], tutorial: { done: 0, of: 12, start: () => {} } }));
  assert.equal(first.match(/id="tile-wtc1f\d\d"/g)?.length, 24);
  assert.doesNotMatch(first, /tb-lite-card|id="tile-wtc2/);
  assert.match(first, /class="tb-sel tb-sel-first"/);
  assert.match(first, /id="card-tutorial" class="sel-tutorial sel-glow"[^>]*>.*?▶ BEGIN/);
  assert.match(first, /id="sel-hint"/);
  assert.doesNotMatch(first, /id="sel-play"|id="next-/);
  assert.match(first, /id="tab-book-I"[^>]*>BOOK I · 24 FUGUES</);
  assert.doesNotMatch(first, /id="tab-book-II"|id="tab-book-MORE"/);
  // Played before: NEXT on the first unfinished, the grades stamped, the chosen piece and PLAY on the right.
  const later = renderToStaticMarkup(createElement(Selection, { ...base, beaten: ["wtc1f01", "wtc1f02"], best: { wtc1f01: "A" }, scores: { wtc1f02: 12340 }, tutorial: { done: 3, of: 12, start: () => {} } }));
  assert.match(later, /id="next-wtc1f03"/);
  assert.equal(later.match(/id="next-/g)?.length, 1);
  assert.match(later, /id="grade-wtc1f01"[^>]*>A</);
  assert.match(later, /id="tile-wtc1f02" class="sel-tile on done"/);
  assert.match(later, /id="sel-piece-name"[^>]*>FUGUE IN C MINOR</);
  assert.match(later, /id="best-wtc1f02"[^>]*>BEST 12,340</);
  assert.match(later, /id="sel-voice-1" class="on"/);
  assert.match(later, /id="sel-play"/);
  assert.match(later, /▶ CONTINUE/);
  assert.match(later, /3 OF 12 LESSONS/);
  // Unlocked: the four tabs; MORE BACH keeps its scrolling list (LiteGrid, bare).
  store.set("tb-unlock-all", "1");
  try {
    const full = renderToStaticMarkup(createElement(Selection, { ...base, beaten: [] }));
    for (const t of ["I", "II", "MORE", "CHORALES"]) assert.match(full, new RegExp(`id="tab-book-${t}"`));
    store.set("tb-lite-book-v1", "MORE");
    const more = renderToStaticMarkup(createElement(Selection, { ...base, piece: "bwv772", voice: 0, singing: [0, 1], beaten: [] }));
    assert.match(more, /class="tb-lite tb-lite-bare"/);
    assert.doesNotMatch(more, /id="tile-|id="lite-top"/);
  } finally {
    store.clear();
  }
  // The CSS: three columns as the play screen (20 · 60 · 20), the grid 6 × 4.
  const css = src("src/bench/selection.css");
  assert.match(css, /grid-template-columns: 20fr 60fr 20fr;/);
  assert.match(css, /grid-template-columns: repeat\(6, minmax\(0, 1fr\)\); grid-template-rows: repeat\(4, minmax\(0, 1fr\)\);/);
  assert.match(src("src/bench/lite-main.tsx"), /import "\.\/selection\.css";/);
});

test("D371: an Invention's voices are UPPER and LOWER (SUPERIOR, INFERIOR), a prelude keeps its hands; the legend chip filled", async () => {
  const i18n = await import("../src/i18n/index.ts");
  assert.equal(i18n.partKey("fugue", "Right hand"), "Upper");
  assert.equal(i18n.partKey("fugue", "Left hand"), "Lower");
  assert.equal(i18n.partKey("prelude", "Left hand"), "Left hand");
  assert.equal(i18n.partKey("fugue", "Soprano"), "Soprano");
  assert.equal(i18n.partName("fugue", "Right hand"), "UPPER");
  i18n.useLang("pt");
  try {
    assert.equal(i18n.partName("fugue", "Right hand"), "SUPERIOR");
    assert.equal(i18n.partName("fugue", "Left hand"), "INFERIOR");
    assert.equal(i18n.partName("prelude", "Left hand"), "MÃO ESQUERDA");
    i18n.useLang("es");
    assert.equal(i18n.partName("fugue", "Left hand"), "INFERIOR");
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { VoiceLegend } = await import("../src/bench/BenchApp.tsx");
    const html = renderToStaticMarkup(createElement(VoiceLegend, { names: ["Upper", "Lower"], played: [0], ink: (i: number) => (i ? "#0f0" : "#00f") }));
    assert.match(html, /id="legend-you" style="background:#00f[^"]*"[^>]*><span>TÚ · SUPERIOR<\/span>/);
    assert.match(html, /■ INFERIOR/);
  } finally {
    i18n.useLang("en");
  }
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /<VoiceLegend names=\{f\.voiceNames\.map\(\(n\) => partKey\(f\.kind, n\)\)\}/);
  assert.match(src("src/bench/PlayPop.tsx"), /\{partName\(f\.kind, name\)\}/);
  // The thumb bars' inner edge in the player's voice colour (the report's 8 C, 4 px).
  const { STRIP_EDGE } = await import("../src/bench/paint-proto.ts");
  assert.equal(STRIP_EDGE, 4);
  assert.match(src("src/bench/paint-proto.ts"), /c\.fillStyle = inkFor\(tv, count\);\s*c\.fillRect\(n \? s\.x : bw - STRIP_EDGE, 0, STRIP_EDGE, h\);/);
});

test("D371: play.html's app icon is the B-A-C-H sign, 180, 192 and 512 (and maskable), in its own manifest", () => {
  const man = JSON.parse(src("public/play-app/manifest.webmanifest"));
  const icons = man.icons as { src: string; sizes: string; purpose?: string }[];
  for (const s of [180, 192, 512]) {
    const i = icons.find((x) => x.sizes === `${s}x${s}` && !x.purpose)!;
    assert.equal(i.src, `icon-${s}.png`);
    const png = readFileSync(new URL(`../public/play-app/${i.src}`, import.meta.url));
    assert.equal(png.readUInt32BE(16), s, "width");
    assert.equal(png.readUInt32BE(20), s, "height");
  }
  assert.ok(icons.some((x) => x.purpose === "maskable" && x.src === "icon-maskable-512.png"));
  const page = src("play.html");
  assert.match(page, /rel="apple-touch-icon" href="\.\/play-app\/icon-180\.png"/);
  assert.match(page, /rel="icon" type="image\/png" sizes="192x192" href="\.\/play-app\/icon-192\.png"/);
});
