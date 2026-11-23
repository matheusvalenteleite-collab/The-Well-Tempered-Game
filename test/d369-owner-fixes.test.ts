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
  // D471: back at the bars' feet (D469's move undone), each name fitting inside its piston.
  assert.match(css, /\.tb-stops-side \{ position: absolute; z-index: 12; bottom: calc\(env\(safe-area-inset-bottom, 0px\) \+ 2px\); display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.tb-stops-side \.tg-piston \{ height: 58px;/);
  assert.match(css, /\.tb-stops-side \.tg-piston-name \{ font-size: 5px;[^}]*white-space: normal;[^}]*text-overflow: clip;/);
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

test("D369 (7), as D454 left it: the voice offered first is the fugue's easiest, finished or not; the voice last played wins", async () => {
  const { fugueById } = await import("../src/touch/fugue.ts");
  const { voicesFrom } = await import("../src/touch/voice-mode.ts");
  const { defaultVoice } = await import("../src/bench/flow.ts");
  const { liteVoice, saveLastVoice } = await import("../src/bench/lite.ts");
  const { VOICE_SCORES } = await import("../src/bench/voice-ease.ts");
  store.clear();
  for (const id of ["wtc1f01", "wtc1f02", "wtc1f16", "wtc2f09"]) {
    const f = fugueById(id);
    const s = voicesFrom(f, 0);
    const easiest = defaultVoice(f, s);
    assert.equal(VOICE_SCORES[id][easiest], Math.min(...VOICE_SCORES[id]), id);
    assert.equal(liteVoice(f, s, false), easiest, `${id}: unfinished, nothing kept: the easiest`);
    assert.equal(liteVoice(f, s, true), easiest, `${id}: finished, nothing kept: the easiest`);
    const other = s.find((v) => v !== easiest)!;
    saveLastVoice(id, other);
    assert.equal(liteVoice(f, s, true), other, `${id}: finished: the last played`);
    assert.equal(liteVoice(f, s, false), other, `${id}: unfinished: the last played too (D454)`);
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
