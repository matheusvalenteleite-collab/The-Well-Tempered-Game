/**
 * D452: the selection's last fixes and HOW TO PLAY. No iOS text inflation; the right column's picture glows
 * whole (no ?), its OPTIONS link gone; HOW TO PLAY under SETTINGS; the pistons in SETTINGS; the guide's words
 * in three languages, its examples real bars whose flags are the entries D493 gives.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
register("./tsx-hooks.mjs", import.meta.url);
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D452: no text enlarged by iOS; no OPTIONS link; HOW TO PLAY under SETTINGS; the pistons in SETTINGS", async () => {
  assert.match(src("src/touch/touch.css"), /html \{ -webkit-text-size-adjust: 100%; text-size-adjust: 100%; \}/);
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { Selection } = await import("../src/bench/Selection.tsx");
  const html = renderToStaticMarkup(createElement(Selection, { piece: "wtc1f04", current: "wtc1f04", voice: 1, singing: [0, 1, 2, 3, 4], setVoice: () => {}, select: () => {}, play: () => {}, options: () => {}, open: () => {}, hear: () => {}, settings: () => {}, howTo: () => {}, beaten: [], tutorial: { done: 3, of: 12, start: () => {} } }));
  assert.doesNotMatch(html, /id="sel-options"/);
  assert.match(html, /id="lite-settings".*id="lite-howto"/s, "HOW TO PLAY after SETTINGS");
  assert.match(src("src/bench/BenchApp.tsx"), /id="settings-pistons"/);
});

test("D452 (D920): the guide: every word in three languages; every example real bars, its flags the experts' entries", async () => {
  const { PLAY, REF } = await import("../src/bench/howto-text.ts");
  const { clipNotes } = await import("../src/bench/HowTo.tsx");
  const { fugueById, loadExtras } = await import("../src/touch/fugue.ts");
  await loadExtras();
  const ts: { en: string; pt: string; es: string }[] = [];
  const clips: { piece: string; bars: [number, number]; voices?: number[] }[] = [];
  for (const ch of PLAY) {
    ts.push(ch.title, ...(ch.intro ? [ch.intro] : []));
    for (const c of ch.cards) {
      ts.push(c.title, ...c.lead, ...(c.fine ? [c.fine] : []), ...(c.tries ?? []).map((t) => t.label));
      if (c.fig.kind === "clip") clips.push(c.fig.clip);
    }
  }
  for (const r of REF) ts.push(r.title, ...r.lines);
  for (const t of ts) for (const l of ["en", "pt", "es"] as const) assert.ok(t[l].trim().length > 0, `${t.en}: ${l}`);
  assert.ok(PLAY.length === 6 && REF.length >= 6 && clips.length >= 1);
  for (const c of clips) assert.ok(fugueById(c.piece).id === c.piece && clipNotes(fugueById(c.piece), c).notes.length > 0, `${c.piece} ${c.bars}: notes`);
  const entry = (id: string, bar: number, voice: number) => fugueById(id).entries.find((e) => e.bar === bar && e.voice === voice);
  assert.equal(entry("wtc1f08", 30, 0)?.inverted, true, "I/8 b.30 inverted");
  assert.equal(entry("wtc1f08", 62, 2)?.scale, 2, "I/8 b.62 augmented");
  assert.equal(entry("wtc2f09", 26, 0)?.scale, 0.5, "II/9 b.26 diminished");
  assert.equal(entry("wtc1f04", 35, 0)?.theme, 2, "I/4 b.35 the second subject");
  assert.equal(entry("wtc1f02", 3, 0)?.form, "answer", "I/2 b.3 the answer");
  assert.ok(entry("wtc1f01", 7, 0) && entry("wtc1f01", 7, 2), "I/1 b.7 stretto");
  assert.ok(!fugueById("wtc1f02").entries.some((e) => e.bar >= 5 && e.bar <= 6), "I/2 bb.5-6 an episode");
});
