/**
 * D369: the owner's fixes for WTC 1.77 (the lock phrase, sideways only, the tutorial's fixes, the stops in
 * the side panels, the voice legend, the subject's readings back, the first plays' voice, runs a little
 * stricter).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { register } from "node:module";

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
  const { anyLessonById: lessonById } = await import("../src/bench/manual/lessons.ts");
  const { gameFor, ROWS } = await import("./d342-sim.ts");
  // D373: Inventions 4, 8 and 12 are MORE BACH's chunk.
  await (await import("../src/touch/fugue.ts")).loadExtras();
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

test("D369 (3h): a lesson sounds only what is struck: a settling roll of a few px reads no grace of its own (D373: Parts 1–3, III, IV)", async () => {
  // Before: a 6 px roll each way, 70 ms, read as a mordent on every note of I.1's drill and I.4's first stage (D373: the new parts' PLAYs).
  for (const [id, k] of [["1.2", 2], ["1.4", 2], ["2.1", 2], ["3.1", 2], ["III.2", 0], ["4.2", 2], ["6.4", 2]] as const) {
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

test("D369 (3a–3e), as D373 keeps them: 0.1 and 0.2 withdrawn; Parts 1–2 on the piano; Invention 1 slower; the metronome in the takes; novice-friendly timing", async () => {
  const { MANUAL, lessonById, runOf, LESSON_CLICK, bpmOf, toldTiming, ZERO_LENS, NOVICE_MEAN_MS } = await import("../src/bench/manual/lessons.ts");
  const { tempoOf } = await import("../src/touch/tempi.ts");
  const { existsSync } = await import("node:fs");
  assert.ok(!lessonById("0.1") && !lessonById("0.2"), "no 0.1, no 0.2 (D373: the sound's delay in SETTINGS)");
  assert.ok(!existsSync(new URL("../src/bench/manual/placement.ts", import.meta.url)));
  assert.doesNotMatch(src("src/bench/BenchApp.tsx"), /AskScreen|PlacementScreen|PLACEMENT|GripScreen/);
  assert.match(src("src/bench/BenchApp.tsx"), /<LagSetting lag=\{lag\} setLag=\{setLag\}/);
  // (b) the piano in Parts 1–2.
  for (const l of MANUAL.filter((x) => ["1", "2"].includes(x.part))) {
    assert.equal(l.sound, "piano", l.id);
    for (const st of l.stages) assert.ok(!st.m.sound || st.m.sound === "piano", `${l.id}: ${st.m.label}`);
  }
  // (c) Invention 1 slower than the game's in the tutorial: at most 75% in Parts 1–3 (♩ = 30 to 43), at most 80% after.
  const game = tempoOf("inv01");
  for (const l of MANUAL)
    for (const st of l.stages)
      if (st.m.piece === "inv01") {
        const share = bpmOf(st.m) / game;
        assert.ok(share <= (["1", "2", "3"].includes(l.part) ? 0.75 : 0.8) + 1e-9, `${l.id}: ${st.m.label} at ${Math.round(share * 100)}%`);
      }
  // (d) a soft click on every beat of a take (not under his demonstration).
  const take = runOf(lessonById("1.2")!.stages[2].m);
  assert.deepEqual(take.click, LESSON_CLICK);
  assert.ok(LESSON_CLICK.gain < 0.12 && LESSON_CLICK.full > 1e9);
  assert.equal(runOf(lessonById("1.2")!.stages[0].m, "plain", undefined, false, false).click, undefined);
  assert.match(src("src/bench/proto-game.ts"), /const ckGain = ck\?\.gain \?\? 0\.12;/);
  // (e) the owner's take: 55 ms early: praised first, only a suggestion.
  const x = { ...ZERO_LENS, of: 24, right: 23, accuracy: 23 / 24, timing: { n: 23, mean: -55, sd: 60, perfect: 9 } };
  assert.match(toldTiming(x)!.text, /^Good\. A shade early .*you may/);
  assert.equal(NOVICE_MEAN_MS, 90);
});

test("D369 (3f, 3g), as D373 keeps them: a lesson begins at once; one left midway is taken up where it stopped (the tile's chips, CONTINUE)", async () => {
  register("./tsx-hooks.mjs", import.meta.url);
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { TutorialSelect } = await import("../src/bench/manual/ManualMap.tsx");
  const { finishStep, reachStage, reachedOf, readManual, resumeAt } = await import("../src/bench/manual/store.ts");
  store.clear();
  reachStage("1.2", 2);
  reachStage("1.2", 1);
  assert.equal(reachedOf(readManual(), "1.2"), 2, "the furthest kept");
  finishStep("1.2", 0);
  finishStep("1.2", 1);
  assert.equal(resumeAt(readManual(), "1.2"), 2, "CONTINUE: the PLAY");
  const html = renderToStaticMarkup(createElement(TutorialSelect, { begin: () => {}, close: () => {}, focus: "1.2" }));
  assert.doesNotMatch(html, /tb-manual-card|STRAIGHT TO PLAY/);
  assert.match(html, /YOU STOPPED AT: PLAY/);
  assert.match(html, /id="chip-1\.2-0" class="tb-tut-chip watch fin"/);
  assert.match(html, /id="chip-1\.2-2" class="tb-tut-chip play"/);
  assert.doesNotMatch(html, /id="chip-1\.2-2"[^>]*disabled/);
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /reachStage\(l\.id, k\);/);
  assert.match(app, /if \(isCourse\(l\)\) return courseStep\(l, o\.stage \?\? 0, 0, !o\.stage\);/);
  store.clear();
});

test("D369 (4): on the two bars the stops leave the title bar for the bars' feet, large targets, the box's rows ending above them (D420: the three pistons on each foot)", async () => {
  register("./tsx-hooks.mjs", import.meta.url);
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { RegistrationStops } = await import("../src/touch/RegistrationStops.tsx");
  const { PATCHES } = await import("../src/touch/sound.ts");
  const err = console.error;
  console.error = (...a: unknown[]) => void (String(a[0]).includes("useLayoutEffect") || err(...a));
  const html = renderToStaticMarkup(React.createElement(RegistrationStops, { presetId: "chamberOrgan", patch: PATCHES.orgPrincipal, piece: "wtc1f02", sides: true }));
  console.error = err;
  const left = html.slice(html.indexOf('id="stops-left"'), html.indexOf('id="stops-right"'));
  const right = html.slice(html.indexOf('id="stops-right"'));
  // D420: the pistons replace the single stops; whichever thumb is free reaches all three.
  assert.deepEqual([...left.matchAll(/id="piston-left-([IV]+)"/g)].map((m) => m[1]), ["I", "II", "III"]);
  assert.deepEqual([...right.matchAll(/id="piston-right-([IV]+)"/g)].map((m) => m[1]), ["I", "II", "III"]);
  assert.doesNotMatch(html, /id="stop-/);
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /\{stopsOn && layout === "bars" && playing && <RegistrationStops sides /);
  const css = src("src/bench/bench.css");
  assert.match(css, /\.tb-stops-side \.tg-piston \{ height: 58px; \}/);
  assert.match(css, /\.tb-has-side-stops\.tb-bars \.tg-legend \{ min-height: 62px;/);
});

test("D369 (5): the voice legend: the player's voice a chip of its own (VOCÊ: MÃO ESQUERDA), the others after it, dimmer; accents kept", async () => {
  register("./tsx-hooks.mjs", import.meta.url);
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const i18n = await import("../src/i18n/index.ts");
  const { VoiceLegend } = await import("../src/bench/BenchApp.tsx");
  i18n.setLang("pt");
  const html = renderToStaticMarkup(React.createElement(VoiceLegend, { names: ["Right hand", "Left hand"], played: [1], ink: (i: number) => (i ? "#0f0" : "#00f") }));
  i18n.setLang("en");
  // D371: the chip filled with the voice's colour, "VOCÊ · …" inside (the report's 8 A).
  assert.match(html, /id="legend-you" style="background:#0f0[^"]*"[^>]*>.*VOCÊ · MÃO ESQUERDA/);
  assert.ok(html.indexOf("VOCÊ · MÃO ESQUERDA") < html.indexOf("MÃO DIREITA"), "the player's voice first");
  assert.match(html, /class="tb-legend-other"[^>]*>■ MÃO DIREITA/);
  assert.doesNotMatch(html, /\bMAO\b|DIREITO/);
  const { PT } = await import("../src/i18n/pt.ts");
  const { ES } = await import("../src/i18n/es.ts");
  assert.equal(PT["YOU: {voice}"], "VOCÊ: {voice}");
  assert.equal(ES["YOU: {voice}"], "TÚ: {voice}");
  // No Portuguese or Spanish word left without its diacritics (the ones the owner named, and their kin).
  for (const [d, bad] of [[PT, /\b(MAO|MAOS|NAO|VOCE|VOCES|ORGAO|LICAO|LICOES|PECA|PECAS|MUSICA|PROXIMO|ULTIMO|TAMBEM)\b/i], [ES, /\b(CANCION|LECCION|MUSICA|ORGANO DE|ULTIMO|PROXIMO|TAMBIEN|DESPUES)\b/i]] as const)
    for (const [k, v] of Object.entries(d)) assert.doesNotMatch(v, bad, `${k} → ${v}`);
});

test("D369 (6): HEAR THE SUBJECT's readings back for everyone; D344's reading the default until one is chosen", async () => {
  const { chosenReading, chooseReading, bestReading, BEST_READING, NO_READING, readingsOf } = await import("../src/touch/readings.ts");
  store.clear();
  // D392: every Book I fugue now has BUSONI's whole-piece reading, the piano's default (d385-piano.test.ts); with no
  // sound named and on every other sound D344's reading is the default until one is chosen.
  const id = Object.keys(BEST_READING).find((k) => BEST_READING[k] !== NO_READING && readingsOf(k).filter((r) => !r.whole).length > 1)!;
  assert.equal(chosenReading(id)?.id, bestReading(id)?.id, "nothing chosen: D344's");
  assert.equal(chosenReading(id)?.id, BEST_READING[id]);
  assert.equal(chosenReading(id, "harpsichordSampled")?.id, BEST_READING[id], "another sound: D344's");
  const other = readingsOf(id).find((r) => r.id !== BEST_READING[id])!;
  chooseReading(id, other.id);
  assert.equal(chosenReading(id)?.id, other.id);
  chooseReading(id, NO_READING);
  assert.equal(chosenReading(id), null, "NONE chosen");
  store.clear();
  const app = src("src/bench/BenchApp.tsx");
  assert.doesNotMatch(app, /single=\{!full\}/);
  // D393 (WTC 1.90): the chooser kept behind OFFER_READINGS (off: only BUSONI offered, d393-busoni-only.test.ts);
  // with it on, every reading and NONE are offered again, D344's (or the sound's) the one checked.
  assert.match(app, /OFFER_READINGS \? chosenReading\(f\.id, presetById\(soundNow\)\.id\)/);
  const hs = src("src/bench/HearSubject.tsx");
  assert.match(hs, /\{offered && readings\.length > 0 && \(/);
  assert.match(hs, /id="reading-none"/);
  assert.match(hs, /chosenReading\(id, preset\(\)\.id\)/);
});

test("D369 (7): a fugue not yet finished offers the second voice to enter; once finished, the voice last played", async () => {
  const { fugueById } = await import("../src/touch/fugue.ts");
  const { voicesFrom } = await import("../src/touch/voice-mode.ts");
  const { defaultVoice } = await import("../src/bench/flow.ts");
  const { liteVoice, saveLastVoice } = await import("../src/bench/lite.ts");
  store.clear();
  for (const id of ["wtc1f01", "wtc1f02", "wtc1f16", "wtc2f09"]) {
    const f = fugueById(id);
    const order = [...new Set([...f.entries].sort((a, b) => a.on - b.on).map((e) => e.voice))];
    const s = voicesFrom(f, 0);
    assert.equal(liteVoice(f, s, false), order[1], `${id}: the second to enter (${f.voiceNames[order[1]]})`);
    assert.equal(defaultVoice(f, s), order[0], `${id}: elsewhere the first, as before`);
    assert.equal(liteVoice(f, s, true), order[0], `${id}: finished, nothing kept yet: the first`);
    saveLastVoice(id, order.at(-1)!);
    assert.equal(liteVoice(f, s, true), order.at(-1), `${id}: finished: the last played`);
    assert.equal(liteVoice(f, s, false), order[1], `${id}: unfinished: still the second`);
  }
  store.clear();
  assert.match(src("src/bench/BenchApp.tsx"), /APP\.lite \? liteVoice\(f, singing, readLite\(\)\.beaten\.includes\(f\.id\)\)/);
});

test("D369 (8): fast runs a little stricter (own rule share, own thumb only), in the Lab; the owner's logs: run notes wrong 8.4% → 12.9% (strict 16.8%)", async () => {
  const { MECH_DEFAULTS, MECH_SPEC, asRecorded } = await import("../src/bench/mechanics.ts");
  assert.equal(MECH_DEFAULTS.runs, "lenient", "not a revert to strict");
  assert.equal(MECH_DEFAULTS.runOwnShare, 0.85);
  assert.equal(MECH_DEFAULTS.runOtherThumb, false);
  for (const k of ["runOwnShare", "runOtherThumb"]) assert.ok(MECH_SPEC.some((s) => s.key === k), `${k} in the Lab`);
  // A log made before D369 is replayed as it was played (D332's rule).
  const old = asRecorded({ runs: "lenient", stepLeewayRows: 1 });
  assert.equal(old.runOwnShare, 0);
  assert.equal(old.runOtherThumb, true);
  // Measured on the owner's logs of 27 October (one lab log here, the rest in the report): stricter, not strict.
  const { gunzipSync } = await import("node:zlib");
  const { parseLog } = await import("../src/bench/lab/log.ts");
  const { replay } = await import("../src/bench/lab/replay.ts");
  const log = parseLog(gunzipSync(readFileSync(new URL("./fixtures/owner-2026-10-27/wtc-lab-wtc2f07-2026-10-27T17-29-19-756Z.json.gz", import.meta.url))).toString("utf8"));
  const wrongIn = (m: Record<string, unknown>) => {
    const r = replay(log, { ...MECH_DEFAULTS, ...m });
    const out = new Map<string, { run: boolean; ok: boolean }>();
    for (const e of r.events) {
      if (e.kind === "note") out.set(`${e.track}:${e.i}`, { run: !!e.ladder?.run, ok: e.ok });
      else if (e.kind === "revoked" && out.has(`${e.track}:${e.i}`)) out.get(`${e.track}:${e.i}`)!.ok = false;
    }
    return [...out.values()].filter((o) => !o.ok).length;
  };
  const before = wrongIn({ runOwnShare: 0, runOtherThumb: true });
  const now = wrongIn({});
  const strict = wrongIn({ runs: "strict" });
  assert.ok(before <= now && now <= strict, `D332 ${before} ≤ now ${now} ≤ strict ${strict}`);
});
