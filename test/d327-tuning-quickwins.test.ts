/**
 * D327 (WTC 1.44): each sound its own tuning (INSTRUMENT DEFAULT first in ⚙ TUNING), every sound open
 * from the start, the opening's words in the side bars, DISPLAY kept per piece, the free ornaments on the
 * score sheet, two of Herr Bach's lines reworded.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { INSTRUMENT_TUNING, TUNING_FALLBACK, instrumentTuning, resolveTuning, tuningOfValue, tuningPrefOf, tuningShort, tuningValue } from "../src/touch/instrument-tuning.ts";
import { PRESETS } from "../src/touch/sound.ts";
const CONSOLES_AND_SYNTHS = ["chip", "gameboy", "super16", "nocturne32", "megaFm", "sid64", "tracker", "analog", "modular", "tomita"];
import { hz, setTuning, TEMPERAMENTS } from "../src/touch/tuning.ts";
import { rateFor, sampleHz } from "../src/touch/sampled.ts";
import { DISPLAY_BY_PIECE_KEY, DISPLAY_KEY, displayFor, saveDisplay, saveDisplayFor } from "../src/bench/sheet-format.ts";
import { freeLine, freeTally } from "../src/bench/free-summary.ts";
import { TUTORIAL_LESSONS } from "../src/bench/lessons.ts";
import { legendLines } from "../src/bench/side-notes.ts";
import { useLang } from "../src/i18n/index.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

function withStorage<T>(f: (store: Map<string, string>) => T): T {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  try {
    return f(store);
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

test("D327: the instruments' tunings, in one table", () => {
  assert.deepEqual(instrumentTuning("harpsichordSampled"), { id: "werckmeister", a: 415 });
  assert.deepEqual(instrumentTuning("chamberOrgan"), { id: "werckmeister", a: 415 });
  assert.deepEqual(instrumentTuning("organSampled"), { id: "werckmeister", a: 415 });
  assert.deepEqual(instrumentTuning("pianoSampled"), { id: "equal", a: 440 });
  assert.deepEqual(instrumentTuning("soloVoices"), { id: "vallotti", a: 415 });
  assert.deepEqual(instrumentTuning("vocalSynth"), { id: "equal", a: 440 });
  // A retired id takes its stand-in's (the old harpsichord: the sampled one's).
  assert.deepEqual(instrumentTuning("harpsichord"), { id: "werckmeister", a: 415 });
  // Every console and synthesizer: equal, A = 440.
  for (const id of CONSOLES_AND_SYNTHS) assert.deepEqual(instrumentTuning(id), TUNING_FALLBACK, id);
  for (const t of Object.values(INSTRUMENT_TUNING)) assert.ok(TEMPERAMENTS.some((x) => x.id === t.id) && (t.a === 415 || t.a === 440));
  for (const p of PRESETS) assert.ok(instrumentTuning(p.id));
});

test("D327: INSTRUMENT DEFAULT or a choice for every sound; stored values sanitised; the short label", () => {
  assert.deepEqual(resolveTuning("instrument", "harpsichordSampled"), { id: "werckmeister", a: 415 });
  assert.deepEqual(resolveTuning("instrument", "chip"), { id: "equal", a: 440 });
  assert.deepEqual(resolveTuning({ id: "kirnberger", a: 440 }, "harpsichordSampled"), { id: "kirnberger", a: 440 });
  assert.equal(tuningPrefOf(null), "instrument");
  assert.equal(tuningPrefOf({ id: "nope", a: 440 }), "instrument");
  assert.equal(tuningPrefOf({ id: "equal", a: 432 }), "instrument");
  // The bench's old stored value (D219) is kept as an explicit choice.
  assert.deepEqual(tuningPrefOf({ id: "vallotti", a: 415 }), { id: "vallotti", a: 415 });
  assert.equal(tuningValue("instrument"), "instrument");
  assert.deepEqual(tuningOfValue(tuningValue({ id: "meantone", a: 415 })), { id: "meantone", a: 415 });
  assert.equal(tuningOfValue("instrument"), "instrument");
  assert.equal(tuningShort({ id: "werckmeister", a: 415 }), "WERCKMEISTER III · A415");
  assert.equal(tuningShort({ id: "lehman", a: 440 }), "LEHMAN · A440");
});

test("D327: the recorded instruments are retuned (not left at 440): A = 415 plays the harpsichord's samples slower by 415/440", () => {
  try {
    setTuning("werckmeister", 415);
    assert.ok(Math.abs(hz(69) - 415) < 1e-9, "A keeps the pitch chosen");
    const r = rateFor("harpsichord", 69, hz(69));
    assert.ok(Math.abs(r * sampleHz("harpsichord", 69) - 415) < 1e-9);
    assert.ok(Math.abs(r - (415 / 440) * 2 ** (-3.6 / 1200)) < 1e-9, "the sample's measured 3.6 cents taken off too");
    // The departures are counted from A: Werckmeister III puts C (0) 11.7 cents above A (−11.7), against equal.
    const c = hz(60) / (415 * 2 ** (-9 / 12));
    assert.ok(Math.abs(1200 * Math.log2(c) - 11.7) < 1e-6);
  } finally {
    setTuning("equal", 440);
  }
});

test("D327: DISPLAY kept per piece; D354: never chosen, no piece opens on the sheet by itself", () =>
  withStorage((store) => {
    // I/1 (four voices), I/2 (three), I/22 (five).
    assert.equal(displayFor("wtc1f01", 4, false), "default", "tutorial not passed: DEFAULT");
    assert.equal(displayFor("wtc1f01", 4, true), "default", "D354: not the sheet by itself");
    assert.equal(displayFor("wtc1f22", 5, true), "default");
    assert.equal(displayFor("wtc1f02", 3, true), "default", "three voices: as before");
    assert.equal(displayFor("wtc1p01", 4, true), "default", "a prelude is not engraved");
    saveDisplayFor("wtc1f01", "default");
    saveDisplay("default");
    assert.equal(displayFor("wtc1f01", 4, true), "default", "the player's own choice wins");
    saveDisplayFor("wtc1f02", "sheet2");
    saveDisplay("sheet2");
    assert.equal(displayFor("wtc1f02", 3, true), "sheet2");
    assert.equal(displayFor("wtc1f03", 3, true), "sheet2", "a piece never chosen for: the last choice");
    assert.equal(displayFor("wtc1f22", 5, true), "sheet2", "D354: four and five voices too: the last choice");
    assert.equal(displayFor("wtc1f01", 4, true), "default");
    assert.equal(store.get(DISPLAY_KEY), "sheet2");
    store.set(DISPLAY_BY_PIECE_KEY, JSON.stringify({ wtc1f05: "piano-roll" }));
    assert.equal(displayFor("wtc1f05", 4, false), "sheet2", "an unknown stored mode is ignored");
  }));

test("D327: the free ornaments on the score sheet, each note once, no points", () => {
  useLang("en");
  assert.deepEqual(freeTally(["mordent", "mordent", "trill", "short", "mordent", "trill"]), { mordents: 3, shorts: 1, trills: 2 });
  assert.equal(freeLine({ mordents: 3, shorts: 0, trills: 2 }), "YOU ADDED 3 MORDENTS, 2 TRILLS");
  assert.equal(freeLine({ mordents: 1, shorts: 1, trills: 0 }), "YOU ADDED 1 MORDENT, 1 SHORT TRILL");
  assert.equal(freeLine({ mordents: 0, shorts: 0, trills: 0 }), "");
  assert.equal(freeLine(undefined), "");
  useLang("pt");
  assert.equal(freeLine({ mordents: 2, shorts: 0, trills: 1 }), "VOCÊ ACRESCENTOU 2 MORDENTES, 1 TRILO");
  useLang("en");
  // The game keeps what each note's shake became (a short trill turned trill counts as one trill).
  const game = src("src/bench/proto-game.ts");
  assert.match(game, /this\.freeByNote\.set\(`\$\{h\.k\}:\$\{h\.note\}`, kind\)/);
  assert.match(game, /free: freeTally\(this\.freeByNote\.values\(\)\)/);
});

test("D327: every sound open from the start on play.html; the tuning shown where the sound is chosen", () => {
  const app = src("src/bench/BenchApp.tsx");
  assert.doesNotMatch(app, /soundUnlocked\(/);
  assert.doesNotMatch(app, /soundLocked: /);
  assert.match(app, /tuning: tuningShort\(tuning\)/);
  assert.match(app, /<TuningSelect value=\{tuningPref\}/);
  assert.match(src("src/bench/PlayPop.tsx"), /id="pop-tuning"/);
  assert.match(src("src/bench/TuningSelect.tsx"), /<option value="instrument">/);
});

test("D327: the opening's words off the first subject: on the bars, the hint and the legend in the side bars", () => {
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /layout === "bars" \? <SideHint/);
  assert.match(app, /proto\.layout === "bars" \? \{\} : \{ legendUntil/);
  useLang("en");
  assert.deepEqual(legendLines([{ join: true }, { accent: true }].map((m) => m as never)).map((l) => l.kind), ["joined", "strong"]);
  assert.deepEqual(legendLines([]), []);
});

test("D327: Herr Bach reworded: cantabile is more than legato; graces where he wrote them, the rest sparingly", () => {
  const lines = TUTORIAL_LESSONS.flatMap((l) => [...l.intro, ...l.praise, ...l.again].map((x) => x.text));
  assert.ok(!lines.some((t) => /graces are yours to give/.test(t)));
  assert.ok(!lines.some((t) => /joined, singing/.test(t)));
  const legato = TUTORIAL_LESSONS.find((l) => l.id === "t-legato")!;
  assert.match(legato.praise[0].text, /cantabile.*neither glued nor clipped/);
  const orn = TUTORIAL_LESSONS.find((l) => l.id === "t-ornament")!;
  assert.equal(orn.praise[0].text, "So. Where I wrote a sign, play it; elsewhere a grace is your choice, sparingly.");
});
