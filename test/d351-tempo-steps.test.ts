/**
 * D351 (WTC 1.62): BWV 1059 as a reconstruction; the MORE BACH and CHORALES pictures' words; the pop-up's
 * tempo cycle (SLOW · DEFAULT · FAST, each with its sound, kept per piece); play.html's header and tabs
 * sticky at the top.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The browser the modules expect: storage.
const g0 = globalThis as unknown as Record<string, unknown>;
const store = new Map<string, string>();
g0.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };

const { CHORALES, fugueById, loadExtras, MORE_BACH } = await import("../src/touch/fugue.ts");
const { MORE_TEMPO } = await import("../src/touch/tempi.ts");
const { PIECE_SOUND } = await import("../src/touch/piece-sound.ts");
const { PATCHES, patchFor, placeFor, presetById, PRESETS, setPreset } = await import("../src/touch/sound.ts");
const { EMBLEM_W, GLYPHS, keyLabel, labelWidth } = await import("../src/bench/emblem.ts");
const { pieceWord } = await import("../src/bench/piece-word.ts");
const steps = await import("../src/bench/tempo-steps.ts");
const { MORE_SECTIONS, CHORALE_IDS } = await import("../src/bench/lite.ts");
const { setLang } = await import("../src/i18n/index.ts");

await loadExtras();
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const MORE = MORE_SECTIONS.flatMap((s) => s.ids);

test("D351: BWV 1059, verits99's reconstruction from Cantata 35: three movements, labelled a reconstruction on the card, the pop-up and the credits", () => {
  const ids = ["bwv1059-1", "bwv1059-2", "bwv1059-3"];
  assert.deepEqual(MORE_SECTIONS.find((s) => s.id === "hconcerto")!.ids.filter((id) => id.startsWith("bwv1059")), ids);
  for (const id of ids) {
    const f = fugueById(id);
    assert.equal(f.collection, "hconcerto");
    assert.match(f.short!, /^BWV 1059 · .* · RECONSTRUCTION$/, id);
    assert.match(f.title, /reconstruction from Cantata 35.*BWV 1059R/, id);
    assert.match(f.credit!, /RECONSTRUCTION FROM CANTATA 35.*VERITS99.*CC0 1\.0/, id);
    assert.equal(f.source, "https://musescore.com/user/13172/scores/853226");
    assert.match(f.reconstruction!, /RECONSTRUCTION/);
    assert.equal(PIECE_SOUND[id], "super16");
    assert.ok(MORE_TEMPO[id] && MORE_TEMPO[id].busiest <= 5.5, id);
    // The hands one note at a time, the right hand first (as every concerto, test/d348-concertos.test.ts).
    assert.deepEqual(f.playable!.slice(0, 2), [0, 1]);
  }
  // D minor (read up a step from verits99's C-sharp minor at A = 415 Hz): B-flats, no A-sharps.
  const spelled = Object.values(fugueById("bwv1059-1").spell);
  assert.ok(spelled.some((s) => /^Bb/.test(s)) && !spelled.some((s) => /^A#/.test(s)));
  assert.equal(fugueById("bwv1059-1").bars[0].n, 0, "the Sinfonia's upbeat as bar 0");
  assert.equal(fugueById("bwv1059-3").meter, "3/8");
  // The aria: the strings rest; the alto line and the organ's obbligato are the hands.
  assert.ok(fugueById("bwv1059-2").voices.slice(3, 6).every((v) => v.length === 0));
  // The pop-up's line, translated; the tab's and the site's credits.
  assert.match(src("src/bench/PlayPop.tsx"), /f\.reconstruction && [\s\S]*id="pop-reconstruction"[\s\S]*tr\(f\.reconstruction\)/);
  for (const d of ["src/i18n/pt.ts", "src/i18n/es.ts"]) assert.match(src(d), new RegExp(`"${fugueById("bwv1059-1").reconstruction}": "`));
  assert.match(src("src/bench/LiteGrid.tsx"), /BWV 1059 IS A RECONSTRUCTION/);
  assert.match(src("src/ui/Credits.tsx"), /BWV 1059 \(D351\) is a reconstruction/);
});

test("D351: the pictures' words: a fugue keeps FUGA, every other MORE BACH and CHORALES piece its own; every glyph drawn, every label discreet", () => {
  const want: Record<string, string> = {
    "bwv1080-01": "FUGA", "bwv1080-14": "FUGA", "bwv1080-c14": "CANON", "bwv1079-ric3": "RICERCAR", bwv772: "INVENTIO", bwv787: "SINFONIA",
    "bwv1043-1": "VIVACE", "bwv1043-2": "LARGO", "bwv1043-3": "ALLEGRO", "bwv1052-1": "ALLEGRO", "bwv1052-2": "ADAGIO", "bwv1053-2": "SICILIANO",
    "bwv1053-1": "ALLEGRO", "bwv1054-2": "ADAGIO", "bwv1055-2": "LARGHETTO", "bwv1055-3": "ALLEGRO", "bwv1056-3": "PRESTO", "bwv1057-2": "ANDANTE",
    "bwv1059-2": "ANDANTE", "bwv1059-3": "PRESTO", "bwv1061-3": "FUGA", "bwv1063-2": "SICILIANA", "bwv228-1": "MOTETTE", "bwv228-2": "FUGA",
    "bwv54-1": "ARIA", "bwv54-3": "ARIA", chor001: "CHORAL",
  };
  for (const [id, w] of Object.entries(want)) assert.equal(pieceWord(fugueById(id)), w, id);
  // No concerto movement but BWV 1061's fugue says FUGA.
  for (const f of MORE_BACH.filter((x) => x.collection === "hconcerto" || x.collection === "concerto")) assert.equal(pieceWord(f) === "FUGA", f.id === "bwv1061-3", f.id);
  for (const id of [...MORE, ...CHORALE_IDS]) {
    const f = fugueById(id);
    const label = keyLabel(f.key, pieceWord(f));
    for (const ch of label) assert.ok(GLYPHS[ch], `${id}: "${ch}" in the font`);
    assert.ok(labelWidth(label) * 2 < EMBLEM_W * 5 * 0.5, `${id}: ${label} under half the picture`);
  }
  // The cards: the word on the picture, a chorale's in its line (no picture); the WTC's labels as before.
  const grid = src("src/bench/LiteGrid.tsx");
  assert.match(grid, /<Emblem id=\{id\} label=\{keyLabel\(f\.key, word\)\}/);
  assert.match(grid, /compact \? ` · \$\{word\}` : ""/);
  assert.equal(keyLabel("c#", "fugue"), "c♯ · FUGA");
});

test("D351: three tempi for every MORE BACH and CHORALES piece: SLOW 0.75×, FAST 1.25× within the game's load (at least 1.12×); chorales ♩ 48 · 60 · 76", () => {
  for (const id of [...MORE, ...CHORALE_IDS]) {
    const t = steps.stepTempi(id);
    assert.ok(t, id);
    const rec = MORE_TEMPO[id] ?? { normal: t.default, busiest: 0 };
    assert.ok(t.slow < t.default && t.default < t.fast, `${id}: ${t.slow} < ${t.default} < ${t.fast}`);
    if (id.startsWith("chor")) {
      if (rec.normal === 60) assert.deepEqual(t, { slow: 48, default: 60, fast: 76 }, id);
      continue;
    }
    assert.ok(Math.abs(t.slow - 0.75 * t.default) <= 0.5, `${id}: SLOW`);
    assert.ok(t.fast <= Math.round(1.25 * t.default) && t.fast >= Math.round(1.12 * t.default), `${id}: FAST`);
    // FAST passes the 5.5 notes a second only where DEFAULT is already within 12% of it, and then by at most 12%.
    if (rec.busiest > 0) {
      const load = (rec.busiest * t.fast) / t.default;
      assert.ok(load <= 5.5 + 0.05 || t.fast === Math.round(1.12 * t.default), `${id}: ${load.toFixed(2)} notes a second at FAST`);
      assert.ok(load <= 5.5 * 1.12 * 1.13 + 0.05, `${id}: modestly`);
    }
  }
  // The quick concerto movements sit at the cap: FAST passes it by 12% (♩ 82 → 92).
  assert.deepEqual(steps.stepTempi("bwv1052-1"), { slow: 62, default: 82, fast: 92 });
  // Not for the WTC's preludes (D356: its fugues since, test/d356-wtc-tempo.test.ts).
  assert.equal(steps.stepTempi("wtc1p01"), null);
  assert.match(steps.stepBeat("bwv1053-2", 66), /^♩\. 44$/);
});

test("D351: each tempo its sound: DEFAULT the piece's own, SLOW and FAST by the kind of piece, each with a layout for the piece's voices", () => {
  assert.equal(steps.stepSound("bwv1052-1", "default"), undefined);
  const want = { chor001: ["soloVoices", "harpsichordSampled"], "bwv1080-01": ["chamberOrgan", "chip"], "bwv1052-1": ["nocturne32", "tracker"], "bwv1043-1": ["nocturne32", "tracker"], "bwv228-1": ["soloVoices", "vocalSynth"], bwv772: ["pianoSampled", "chip"], "bwv1079-ric6": ["soloVoices", "harpsichordSampled"] } as const;
  for (const [id, [slow, fast]] of Object.entries(want)) assert.deepEqual([steps.stepSound(id, "slow"), steps.stepSound(id, "fast")], [slow, fast], id);
  const ids = [...MORE, ...CHORALE_IDS];
  for (const id of ids) {
    const n = fugueById(id).voices.length;
    for (const s of ["slow", "fast"] as const) {
      const p = steps.stepSound(id, s)!;
      assert.ok(PRESETS.some((x) => x.id === p), `${id} ${s}: ${p} a player's sound`);
      // More than five voices need the preset's own layout (else voices past the fifth all fall on the bass).
      if (n > 5) assert.equal(presetById(p).by?.[n]?.length, n, `${id} ${s}: ${p} lays out ${n} voices`);
    }
  }
  // The concertos at SLOW and FAST, as SUPER 16-BIT (D348): the harpsichords on a harpsichord, never louder than a string line.
  for (const [pid, harp] of [["nocturne32", PATCHES.n32Harpsi], ["tracker", PATCHES.trkHarpsi]] as const) {
    setPreset(pid);
    for (const f of MORE_BACH.filter((x) => x.collection === "hconcerto")) {
      const n = f.voices.length;
      const level = (v: number) => (patchFor(v, n)!.level ?? 1) * placeFor(v, n)!.level;
      const strings = f.voiceNames.map((x, v) => (/Violin|Viola/.test(x) ? v : -1)).filter((v) => v >= 0);
      for (const [v, name] of f.voiceNames.entries()) {
        if (/Harpsichord/.test(name)) {
          assert.equal(patchFor(v, n), harp, `${pid} ${f.id} ${name}`);
          assert.ok(level(v) <= Math.min(...strings.map(level)) + 1e-9, `${pid} ${f.id} ${name}: never louder than the strings`);
        }
        assert.ok(Math.abs(placeFor(v, n)!.pan) <= 0.35);
      }
    }
  }
  setPreset("chip");
  // The page: a sound chosen for the piece is kept at every tempo; the card shows the sound in force.
  const app = src("src/bench/BenchApp.tsx");
  // D356: in the friends' view too (no sound chosen there), where a WTC fugue's tempo is open.
  assert.match(app, /const mine = full \? chosen : \{\};\s*const st = !mine\[id\] \? stepSound\(id, stepOf\(id\)\) : undefined;/);
  assert.match(app, /const bpm = run \? run\.bpm : tempi \? tempi\[step\] : tempoOf\(f\.id\);/);
  assert.match(app, /id="pop-tempo"/);
  assert.match(app, /<LiteGrid soundOf=\{soundAt\}/);
});

test("D351: the tempo kept for each piece on the device; the button's words in the three languages", () => {
  store.clear();
  assert.deepEqual(steps.readSteps(), {});
  steps.saveStep("bwv772", "fast");
  steps.saveStep("chor001", "slow");
  assert.deepEqual(steps.readSteps(), { bwv772: "fast", chor001: "slow" });
  steps.saveStep("bwv772", "default");
  assert.deepEqual(steps.readSteps(), { chor001: "slow" });
  store.set(steps.TEMPO_STEP_KEY, "{oops");
  assert.deepEqual(steps.readSteps(), {});
  assert.deepEqual([steps.nextStep("slow"), steps.nextStep("default"), steps.nextStep("fast")], ["default", "fast", "slow"]);
  setLang("pt");
  assert.deepEqual(steps.TEMPO_STEPS.map(steps.stepWord), ["LENTO", "PADRÃO", "RÁPIDO"]);
  setLang("es");
  assert.deepEqual(steps.TEMPO_STEPS.map(steps.stepWord), ["LENTO", "NORMAL", "RÁPIDO"]);
  setLang("en");
  assert.deepEqual(steps.TEMPO_STEPS.map(steps.stepWord), ["SLOW", "DEFAULT", "FAST"]);
  for (const d of ["src/i18n/pt.ts", "src/i18n/es.ts"]) assert.match(src(d), /^  TEMPO: "/m);
  assert.ok(CHORALES.length === 370);
});

test("D351: play.html's title bar and tab bar stay at the top while the list scrolls (opaque, safe areas, in the flow)", () => {
  const grid = src("src/bench/LiteGrid.tsx");
  assert.match(grid, /<div className="tb-lite-top" id="lite-top">\s*<header className="tb-lite-head">[\s\S]*tb-lite-tabs[\s\S]*<\/div>\s*\) : null\}\s*<\/div>/);
  const css = src("src/bench/bench.css");
  const rule = css.match(/\.tb-lite-top \{([^}]*)\}/)![1];
  assert.match(rule, /position: sticky/);
  assert.match(rule, /background: var\(--tg-bg\)/);
  assert.match(rule, /env\(safe-area-inset-top/);
  assert.match(rule, /env\(safe-area-inset-left/);
  assert.match(rule, /env\(safe-area-inset-right/);
  assert.match(css, /\.tb-lite-top \.tb-lite-tabs \{ position: static;/);
});
