/**
 * D237: the streamlined flow (the pop-up's defaults, CONTINUE and NEXT straight into the count-in, the
 * tutorial behind `?dev=1`) and the minimal page for friends (play.html): its tiers shown five pieces
 * at a time, its own key, and none of the bench's extras.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { fugueById } from "../src/touch/fugue.ts";
import { voicesFrom } from "../src/touch/voice-mode.ts";
import { defaultVoice, nextIn } from "../src/bench/flow.ts";
import { devFlag } from "../src/bench/config.ts";
import { LITE_KEY, liteLine, liteOrder, litePieces, liteTiers, liteToGo, readLite, recordLite, START_HERE } from "../src/bench/lite.ts";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const EASY = litePieces("EASY");
const MID = litePieces("INTERMEDIATE");
const HARD = litePieces("HARD");

test("D237: the minimal page opens on the EASY pairs, prelude and fugue each, Prelude 1 in C major first", () => {
  assert.deepEqual(liteTiers(new Set()), ["EASY"]);
  const order = liteOrder(new Set());
  assert.equal(order[0], START_HERE);
  assert.equal(START_HERE, "wtc1p01");
  assert.equal(order[1], "wtc1f01");
  assert.equal(order.length, 20, "the ten EASY pairs, both pieces");
  assert.ok(order.every((id) => /^wtc1[pf]\d\d$/.test(id)), "Book I only");
  assert.equal(liteLine(new Set()), "5 MORE TO UNLOCK INTERMEDIATE");
});

test("D237: five pieces finished (preludes and fugues alike) show the next tier; the BOSS after all the others", () => {
  const four = new Set([EASY[0], EASY[1], EASY[2], EASY[4]]);
  assert.deepEqual(liteTiers(four), ["EASY"]);
  assert.equal(liteLine(four), "1 MORE TO UNLOCK INTERMEDIATE");
  const five = new Set([...four, EASY[7]]);
  assert.deepEqual(liteTiers(five), ["EASY", "INTERMEDIATE"]);
  assert.equal(liteLine(five), "5 MORE TO UNLOCK HARD");
  assert.equal(liteOrder(five).length, 20 + MID.length);
  const mid = new Set([...five, ...MID.slice(0, 5)]);
  assert.deepEqual(liteTiers(mid), ["EASY", "INTERMEDIATE", "HARD"]);
  const others = EASY.length + MID.length + HARD.length;
  assert.equal(others, 46);
  assert.equal(liteToGo("BOSS", mid), others - 10);
  assert.match(liteLine(mid), /^36 MORE TO UNLOCK BOSS$/);
  const all = new Set([...EASY, ...MID, ...HARD]);
  assert.deepEqual(liteTiers(all), ["EASY", "INTERMEDIATE", "HARD", "BOSS"]);
  assert.deepEqual(liteOrder(all).slice(-2), ["wtc1p24", "wtc1f24"]);
  assert.equal(liteLine(all), "");
  // HARD needs INTERMEDIATE shown first (pieces of a hidden tier cannot open the one after it).
  assert.deepEqual(liteTiers(new Set(MID.slice(0, 5))), ["EASY"]);
});

test("D237: a run finished is kept in tb-lite-v1 (a failed one is not), and the tier it opens returned", () => {
  store.clear();
  assert.deepEqual(recordLite("wtc1p01", true), [], "failed: nothing kept");
  assert.deepEqual(readLite().beaten, []);
  for (const id of EASY.slice(0, 4)) assert.deepEqual(recordLite(id, false), []);
  assert.deepEqual(recordLite(EASY[0], false), [], "the same piece again counts once");
  assert.deepEqual(recordLite(EASY[5], false), ["INTERMEDIATE"]);
  assert.equal(JSON.parse(store.get(LITE_KEY)!).beaten.length, 5);
  assert.deepEqual(recordLite("wtc2f01", false), [], "Book II is not on the page");
  assert.ok(![...store.keys()].some((k) => k.startsWith("tb-stages") || k.startsWith("tb-feats")), "the bench's progress untouched");
});

test("D237: the pop-up's default voice: a prelude's upper hand, a fugue's first entry", () => {
  const p = fugueById("wtc1p01");
  assert.equal(defaultVoice(p, voicesFrom(p, 0)), 0);
  for (const id of ["wtc1f01", "wtc1f02", "wtc1f04", "wtc1f08", "wtc1f12"]) {
    const f = fugueById(id);
    const first = [...f.entries].sort((a, b) => a.on - b.on)[0];
    assert.equal(defaultVoice(f, voicesFrom(f, 0)), first.voice, id);
  }
  // I/1 opens with the alto alone.
  assert.equal(fugueById("wtc1f01").voiceNames[defaultVoice(fugueById("wtc1f01"), voicesFrom(fugueById("wtc1f01"), 0))].toLowerCase(), "alto");
});

test("D237: NEXT is the next card (wrapping), skipping what is not open", () => {
  const order = ["a", "b", "c", "d"];
  assert.equal(nextIn(order, "b"), "c");
  assert.equal(nextIn(order, "d"), "a");
  assert.equal(nextIn(order, "b", (x) => x !== "c"), "d");
  assert.equal(nextIn(order, "x"), null);
  assert.equal(nextIn(["a"], "a"), null);
});

test("D237: the pop-up: the formal title, the default voice pressed, ▶ PLAY and ✕; no LEARN unless asked", async () => {
  register("./tsx-hooks.mjs", import.meta.url);
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { PlayPop } = await import("../src/bench/PlayPop.tsx");
  const f = fugueById("wtc1f01");
  const v = defaultVoice(f, voicesFrom(f, 0));
  const html = renderToStaticMarkup(createElement(PlayPop, { id: "wtc1f01", voice: v, singing: voicesFrom(f, 0), setVoice: () => {}, play: () => {}, close: () => {} }));
  assert.match(html, /BWV 846\/2 · FUGUE IN C MAJOR/);
  assert.match(html, new RegExp(`id="voice-${v}" class="on"[^>]*aria-pressed="true"`));
  assert.match(html, /id="play"[^>]*>▶ PLAY</);
  assert.match(html, /id="pop-close"/);
  assert.doesNotMatch(html, /LEARN THIS MODE/);
  const pre = renderToStaticMarkup(createElement(PlayPop, { id: "wtc1p01", voice: 0, singing: [0, 1], setVoice: () => {}, play: () => {}, close: () => {} }));
  assert.match(pre, /BWV 846\/1 · PRELUDE IN C MAJOR/);
  assert.match(pre, /YOU PLAY THE RIGHT HAND/);
});

test("D251: a prelude's pop-up offers no hand to choose; the game starts on the prelude's own part, whatever was chosen before", async () => {
  register("./tsx-hooks.mjs", import.meta.url);
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { PlayPop } = await import("../src/bench/PlayPop.tsx");
  const { PRELUDE_PART, preludePart } = await import("../src/bench/stages.ts");
  const pre = renderToStaticMarkup(createElement(PlayPop, { id: "wtc1p01", voice: 0, singing: [0, 1], setVoice: () => {}, play: () => {}, close: () => {} }));
  assert.doesNotMatch(pre, /id="voice-\d"/, "no hand buttons");
  assert.doesNotMatch(pre, /YOUR HAND|LEFT HAND/);
  assert.match(pre, /id="pop-part"[^>]*>YOU PLAY THE RIGHT HAND</);
  // A fugue keeps its voices.
  const fug = renderToStaticMarkup(createElement(PlayPop, { id: "wtc1f01", voice: 1, singing: [0, 1, 2, 3], setVoice: () => {}, play: () => {}, close: () => {} }));
  assert.match(fug, /YOUR VOICE/);
  assert.equal(fug.match(/id="voice-\d"/g)?.length, 4);
  // Every prelude's part is the right hand (voice 0) unless the map names another.
  assert.deepEqual(PRELUDE_PART, {});
  for (let n = 1; n <= 24; n++) {
    const id = `wtc1p${String(n).padStart(2, "0")}`;
    assert.equal(preludePart(id), 0, id);
    const p = fugueById(id);
    assert.equal(defaultVoice(p, voicesFrom(p, 0)), 0, id);
  }
  // The pick: a prelude's left hand chosen (or kept) before gives its own part; on the bench and on play.html.
  const { APP } = await import("../src/bench/config.ts");
  const { sane } = await import("../src/bench/BenchApp.tsx");
  const was = { proto: "ladder", piece: "wtc1p01", voice: 1, share: 0, legato: false, her: false, mine: "on", keys: "home" } as Parameters<typeof sane>[0];
  assert.equal(sane(was).voice, 0);
  assert.equal(sane({ ...was, voice: -1 }).voice, 0);
  assert.equal(sane({ ...was, share: 0.5 }).voice, 0, "from a later bar too");
  APP.lite = true;
  try {
    assert.equal(sane(was).voice, 0);
    assert.equal(sane({ ...was, voice: -1 }).voice, 0);
  } finally {
    APP.lite = false;
  }
  // A fugue's voice chosen is kept.
  const f2 = fugueById("wtc2f01");
  const alt = defaultVoice(f2, voicesFrom(f2, 0)) === 1 ? 0 : 1;
  assert.equal(sane({ ...was, piece: "wtc2f01", voice: alt }).voice, alt);
});

test("D237: CONTINUE and NEXT start the game at once; a card opens the pop-up; the tutorial only with ?dev=1", () => {
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /const begin = \(piece: string\) => \{[\s\S]{0,160}?start\(true\);/, "begin: straight into the count-in");
  assert.match(app, /<Home\s+current=\{pick\.piece\}\s+on=\{\{ play: begin,/, "HOME's CONTINUE begins");
  assert.match(app, /id="next"[^>]*onClick=\{\(\) => begin\(phase\.next!\)\}/, "NEXT begins");
  assert.match(app, /pick=\{open\}/, "the wheel's card opens the pop-up");
  assert.doesNotMatch(app, /function Title\(/, "the title card is gone");
  assert.match(app, /tutorial: APP\.dev \?/);
  assert.match(app, /useState\(\(\) => APP\.dev && !APP\.lite && askFirst\(platform\)\)/, "HAVE YOU PLAYED BEFORE? only with ?dev=1");
  assert.match(app, /learn=\{APP\.dev &&/);
  assert.equal(devFlag("?dev=1"), true);
  assert.equal(devFlag(""), false);
  assert.equal(devFlag("?dev=0"), false);
});

test("D237: HOME without the tutorial button unless given one", async () => {
  register("./tsx-hooks.mjs", import.meta.url);
  store.clear();
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { Home } = await import("../src/bench/Home.tsx");
  const on = { play: () => {}, choose: () => {}, achievements: () => {}, settings: () => {} };
  assert.doesNotMatch(renderToStaticMarkup(createElement(Home, { current: "wtc1p01", on })), /TUTORIAL/);
  assert.match(renderToStaticMarkup(createElement(Home, { current: "wtc1p01", on: { ...on, tutorial: () => {} } })), /TUTORIAL/);
});

test("D237: play.html: built beside bench.html, the grid only: no tutorial, achievements, interfaces, Kimiko or seals", async () => {
  register("./tsx-hooks.mjs", import.meta.url);
  store.clear();
  const page = src("play.html");
  assert.match(page, /src="\/src\/bench\/lite-main\.tsx"/);
  assert.match(src("vite.config.ts"), /play: fileURLToPath\(new URL\("\.\/play\.html"/);
  const main = src("src/bench/lite-main.tsx");
  assert.match(main, /APP\.lite = true;/);
  assert.match(main, /forceUi\("classic"\)/);
  assert.doesNotMatch(main, /keepUiUnder/, "D265: one look");
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { LiteGrid } = await import("../src/bench/LiteGrid.tsx");
  const html = renderToStaticMarkup(createElement(LiteGrid, { beaten: [], open: () => {}, settings: () => {} }));
  // D264: all open from the start (48 cards on a computer, 24 fugues on a phone), each with its difficulty.
  assert.equal(html.match(/class="tb-lite-card/g)?.length, 48);
  assert.match(html, /id="card-wtc1p01"[^>]*>.*?START HERE/);
  assert.doesNotMatch(html, /MORE TO UNLOCK/);
  assert.match(html, /id="card-wtc1f02".*?NORMAL/);
  const phone = renderToStaticMarkup(createElement(LiteGrid, { beaten: [], open: () => {}, settings: () => {}, fuguesOnly: true }));
  assert.equal(phone.match(/class="tb-lite-card/g)?.length, 24);
  assert.match(phone, /id="card-wtc1f01"[^>]*>.*?START HERE/);
  assert.match(html, /id="lite-settings"/);
  for (const word of ["TUTORIAL", "ACHIEVEMENT", "INTERFACE", "KIMIKO", "SEAL", "BOOK II", "LESSON"]) assert.doesNotMatch(html, new RegExp(word, "i"), word);
  // The whole app on the minimal page, as it first renders: the grid, nothing of the bench's.
  const { APP } = await import("../src/bench/config.ts");
  APP.lite = true;
  try {
    const { BenchApp } = await import("../src/bench/BenchApp.tsx");
    const app = renderToStaticMarkup(createElement(BenchApp));
    assert.match(app, /class="tb-lite"/);
    for (const id of ["home-tutorial", "home-achievements", "played-yes", "interface", "her"]) assert.doesNotMatch(app, new RegExp(`id="${id}`), id);
    assert.doesNotMatch(app, /TUTORIAL|ACHIEVEMENTS|INTERFACE|KIMIKO/);
  } finally {
    APP.lite = false;
  }
});

test("D237: bench.css's braces balance (an unclosed @media once swallowed every rule after it, the diptych's and the pop-up's)", () => {
  const css = src("src/bench/bench.css").replace(/\/\*[\s\S]*?\*\//g, "");
  let depth = 0;
  for (const ch of css) {
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    assert.ok(depth >= 0);
  }
  assert.equal(depth, 0);
  assert.match(css, /\n\.tb-pop-veil \{ position: fixed;/, "the pop-up's rule at the top level");
});

test("D263: on a phone the minimal page has the fugues only: its cards, its start (Fugue 1) and its unlocking count fugues", async () => {
  const { litePieces, liteTiers, liteLine, startHere } = await import("../src/bench/lite.ts");
  const easy = litePieces("EASY", true);
  assert.ok(easy.length === 10 && easy.every((id) => /^wtc1f/.test(id)));
  assert.equal(startHere(true), "wtc1f01");
  assert.equal(startHere(false), "wtc1p01");
  assert.deepEqual(liteTiers(new Set(), true), ["EASY"]);
  assert.equal(liteLine(new Set(), true), "5 MORE TO UNLOCK INTERMEDIATE");
  assert.deepEqual(liteTiers(new Set(easy.slice(0, 5)), true), ["EASY", "INTERMEDIATE"]);
  assert.deepEqual(liteTiers(new Set(easy.slice(0, 4)), true), ["EASY"]);
});

test("D264: every piece open from the start, in Bach's order; each card's difficulty EASY (green), NORMAL (yellow) or HARD (red)", async () => {
  const { liteAll, liteLevel } = await import("../src/bench/lite.ts");
  assert.equal(liteAll(true).length, 24);
  assert.deepEqual(liteAll(true).slice(0, 3), ["wtc1f01", "wtc1f02", "wtc1f03"]);
  assert.deepEqual(liteAll(false).slice(0, 4), ["wtc1p01", "wtc1f01", "wtc1p02", "wtc1f02"]);
  assert.equal(liteLevel("wtc1f01").label, "EASY");
  assert.equal(liteLevel("wtc1f02").label, "NORMAL");
  assert.equal(liteLevel("wtc1f03").label, "HARD");
  assert.equal(liteLevel("wtc1f24").label, "HARD", "the BOSS among the hard");
  assert.equal(liteLevel("wtc1p02").label, "NORMAL", "a prelude its fugue's");
});

test("D265: a piece's sound opens only once it is finished with an A or S (the best grade kept)", async () => {
  store.clear();
  const { recordLite, soundUnlocked, readLite } = await import("../src/bench/lite.ts");
  assert.equal(soundUnlocked("wtc1f01"), false);
  recordLite("wtc1f01", false, true, "B");
  assert.equal(soundUnlocked("wtc1f01"), false);
  recordLite("wtc1f01", true, true, "S");
  assert.equal(soundUnlocked("wtc1f01"), false, "a failed run counts for nothing");
  recordLite("wtc1f01", false, true, "A");
  assert.equal(soundUnlocked("wtc1f01"), true);
  recordLite("wtc1f01", false, true, "C");
  assert.equal(readLite().best.wtc1f01, "A", "the best kept");
});
