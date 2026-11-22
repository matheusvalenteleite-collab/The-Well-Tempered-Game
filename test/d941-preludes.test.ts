/**
 * D941-D948: the WTC preludes on play.html: the gate (PRELUDE_PLAN, not held), PRELUDE | FUGUE in the right column, COMING,
 * the shared world and sound, NEXT its fugue, I/5's and I/21's slow tempo, ABOUT THIS PRELUDE's words in pt and es.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
register("./tsx-hooks.mjs", import.meta.url);

test("D941: the gate: a PRELUDE_PLAN row not held; the voices offered exist and are never dull (I/1's RH the exception)", async () => {
  const { PRELUDE_PLAN, DULL_EXCEPTIONS, preludeReady, fugueOfPrelude, preludeOfFugue, worldOf } = await import("../src/touch/prelude-plan.ts");
  const { DULL_VOICES, voicesFrom } = await import("../src/touch/voice-mode.ts");
  const { fugueById } = await import("../src/touch/fugue.ts");
  assert.ok(preludeReady("wtc1p01") && preludeReady("wtc1p12"));
  // (I/2: held by D883 until Progression's row lands; the loop below holds either way.)
  assert.ok(!preludeReady("wtc2p01"), "Book II: no rows yet");
  assert.ok(!preludeReady("wtc1f01") && !preludeReady("bwv772"));
  for (let n = 1; n <= 24; n++) {
    const id = `wtc1p${String(n).padStart(2, "0")}`;
    assert.equal(preludeReady(id), !!PRELUDE_PLAN[id] && !PRELUDE_PLAN[id].held, id);
  }
  for (const [id, plan] of Object.entries(PRELUDE_PLAN)) {
    if (plan.held) continue;
    const f = fugueById(id);
    assert.deepEqual(voicesFrom(f, 0), [...plan.offer].sort((a, b) => a - b), `${id}: exactly the voices offered`);
    for (const v of plan.offer) {
      assert.ok(v < f.voices.length, `${id}: voice ${v}`);
      assert.ok(!(DULL_VOICES[id] ?? []).includes(v) || DULL_EXCEPTIONS[id]?.voice === v, `${id}: voice ${v} dull`);
    }
  }
  assert.equal(fugueOfPrelude("wtc2p07"), "wtc2f07");
  assert.equal(preludeOfFugue("wtc1f09"), "wtc1p09");
  assert.equal(worldOf("wtc1p09"), "wtc1f09");
  assert.equal(worldOf("bwv772"), "bwv772");
});

test("D941: PRELUDE | FUGUE in the right column; COMING for a prelude not ready; the tile's P", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { Selection } = await import("../src/bench/Selection.tsx");
  const base = { voice: 0, singing: [0], setVoice: () => {}, select: () => {}, play: () => {}, options: () => {}, open: () => {}, settings: () => {}, preludes: true };
  const pre = renderToStaticMarkup(createElement(Selection, { ...base, piece: "wtc1p05", current: "wtc1p05", beaten: ["wtc1p09"], tempo: { word: "SLOW", beat: "♩ 46", locked: false, fixed: true, cycle: () => {} } }));
  assert.match(pre, /id="sel-stage-prelude" class="on" aria-pressed="true"/);
  assert.match(pre, /id="sel-stage-fugue" class=""/);
  assert.match(pre, /id="sel-piece-name"[^>]*>PRELUDE IN D MAJOR/);
  assert.match(pre, /id="sel-voice-0"/, "the voice picker shown for a ready prelude");
  assert.match(pre, /id="sel-tempo"[^>]*disabled=""[^>]*>.*SLOW ♩ 46/s, "TEMPO fixed at SLOW");
  assert.match(pre, /id="tile-wtc1f05"[^>]*aria-pressed="true"/, "the key's tile lit");
  assert.match(pre, /id="ppip-wtc1f09"/, "I/9's prelude finished: its P");
  assert.doesNotMatch(pre, /id="ppip-wtc1f05"/);
  // A prelude not ready: Book II's (no rows yet).
  const held = renderToStaticMarkup(createElement(Selection, { ...base, piece: "wtc2f07", current: "wtc2f07", beaten: [] }));
  assert.match(held, /id="sel-stage-prelude" class="soon" disabled="" aria-disabled="true">PRELUDE<i>COMING<\/i>/);
  assert.match(held, /id="sel-stage-fugue" class="on"/);
  // D949: the normal view as before: no switch, no P.
  const normal = renderToStaticMarkup(createElement(Selection, { ...base, preludes: false, piece: "wtc1f09", current: "wtc1f09", beaten: ["wtc1p09"] }));
  assert.doesNotMatch(normal, /sel-stage|ppip-/);
});

test("D941, D946: the prelude's world and sound are its fugue's; a prelude not ready keeps its own sound", async () => {
  const { PIECE_SOUND } = await import("../src/touch/piece-sound.ts");
  const { hasStage } = await import("../src/touch/stage-bg.ts");
  const { PRELUDE_PLAN } = await import("../src/touch/prelude-plan.ts");
  for (const [id, plan] of Object.entries(PRELUDE_PLAN)) if (!plan.held) assert.equal(PIECE_SOUND[id], PIECE_SOUND[id.replace("p", "f")], id);
  assert.equal(PIECE_SOUND.wtc1p05, "bachBrass");
  // A prelude not ready keeps its own: Book II's (no rows yet).
  assert.equal(PIECE_SOUND.wtc2p01, "harpsichordSampled");
  assert.ok(hasStage("wtc1p09") && hasStage("wtc2p24"));
});

test("D941: after a prelude, NEXT is its fugue", async () => {
  const { liteNextOrder } = await import("../src/bench/lite.ts");
  const { nextIn } = await import("../src/bench/flow.ts");
  assert.equal(nextIn(liteNextOrder("wtc1p09", true), "wtc1p09"), "wtc1f09");
  assert.equal(nextIn(liteNextOrder("wtc1f09", true), "wtc1f09"), "wtc1f10", "a fugue's as before");
});

test("D948: I/5 and I/21 at their slow tempo; a prelude's level its own", async () => {
  const { tempoOf, PRELUDE_TEMPO } = await import("../src/touch/tempi.ts");
  const { liteLevel } = await import("../src/bench/lite.ts");
  assert.equal(tempoOf("wtc1p05"), PRELUDE_TEMPO.wtc1p05.slow);
  assert.equal(tempoOf("wtc1p04"), PRELUDE_TEMPO.wtc1p04.normal);
  assert.equal(liteLevel("wtc1p04").label, "EASY");
  assert.notEqual(liteLevel("wtc1p06").label, liteLevel("wtc1f06").label, "I/6: its prelude HARD, its fugue EASY");
});

test("D947: ABOUT THIS PRELUDE's words in Portuguese and Spanish, one for each English line", async () => {
  const T = await import("../src/wtc/prelude-texts.ts");
  const { NOTES } = await import("../src/wtc/notes.ts");
  const { preludeLook } = await import("../src/bench/cards.ts");
  const { setLang } = await import("../src/i18n/index.ts");
  const withNote = Object.entries(NOTES).filter(([, n]) => n.prelude).map(([k]) => k);
  assert.deepEqual(Object.keys(T.NOTES_PRELUDE_I18N).sort(), withNote.sort());
  assert.equal(T.PRELUDE_TRAITS_I18N.length, 24);
  for (let n = 1; n <= 24; n++) assert.ok(preludeLook(`wtc1p${String(n).padStart(2, "0")}`)?.trait);
  // The metres kept, line for line.
  T.PRELUDE_TRAITS_I18N.forEach((t, i) => {
    const en = preludeLook(`wtc1p${String(i + 1).padStart(2, "0")}`)!.trait;
    const metres = en.match(/\d+\/\d+/g) ?? [];
    for (const m of metres) assert.ok(t.pt.includes(m) && t.es.includes(m), `${i + 1}: ${m}`);
  });
  setLang("pt");
  try {
    assert.match(T.preludeNote("wtc1p01")!, /Ave Maria/);
    assert.match(T.preludeNote("wtc1p01")!, /^Uma só figura/);
    assert.equal(T.preludeTrait("wtc1p09"), "Uma pastoral em 12/8.");
    setLang("es");
    assert.equal(T.preludeTrait("wtc1p09"), "Una pastoral en 12/8.");
    assert.equal(T.preludeNote("wtc1p03"), undefined, "no note written");
  } finally {
    setLang("en");
  }
  assert.match(T.preludeNote("wtc1p01")!, /^One figure/);
});
