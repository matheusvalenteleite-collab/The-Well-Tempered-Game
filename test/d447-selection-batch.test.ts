/**
 * D447–D450, the selection's last batch before the friends' test: the heading names the work (D447); the
 * cards' key clear of the name (D448, checked in the browser at 844×390 and 667×375 in three languages);
 * ABOUT THIS FUGUE opened by the whole picture, with the subject inside and Busoni's words, verbatim, on
 * every one of the 48 fugues (D449); DRUMS on the right column, ON/OFF and the piece's presets (D450).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
register("./tsx-hooks.mjs", import.meta.url);
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const base = { voice: 1, singing: [0, 1, 2, 3], setVoice: () => {}, select: () => {}, play: () => {}, options: () => {}, open: () => {}, hear: () => {}, settings: () => {}, setLang: () => {}, beaten: [], current: "wtc1f02", tutorial: { done: 3, of: 12, start: () => {} } };

test("D447: the heading names the work, in three languages", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const i18n = await import("../src/i18n/index.ts");
  const { Selection } = await import("../src/bench/Selection.tsx");
  const want = { en: "J. S. BACH · THE WELL-TEMPERED CLAVIER", pt: "J. S. BACH · O CRAVO BEM TEMPERADO", es: "J. S. BACH · EL CLAVE BIEN TEMPERADO" } as const;
  try {
    for (const l of ["en", "pt", "es"] as const) {
      i18n.setLang(l);
      const html = renderToStaticMarkup(createElement(Selection, { ...base, piece: "wtc1f02" }));
      assert.match(html, new RegExp(`id="lite-work-head">${want[l]}<`), l);
    }
  } finally {
    i18n.setLang("en");
  }
});

test("D449: Busoni's words on all 48 fugues, each copied exactly from the transcriptions, with its translations", async () => {
  const { CITATIONS } = await import("../src/bench/citations.ts");
  const ids = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));
  assert.deepEqual(Object.keys(CITATIONS).sort(), ids);
  for (const id of ids) {
    const c = CITATIONS[id];
    const d = JSON.parse(src(`docs/wtc/readings/busoni/${id}-busoni.json`)) as { footnotes?: { de?: string }[]; text?: { text: string }[]; edition: { publisher: string } };
    const pool = c.kind === "footnote" ? (d.footnotes ?? []).map((f) => f.de ?? "") : (d.text ?? []).map((t) => t.text);
    for (const part of c.kind === "footnote" ? [c.original] : c.original.split(" · ")) assert.ok(pool.some((x) => x.includes(part)), `${id}: "${part}" is Busoni's, verbatim`);
    assert.ok(c.en && c.pt && c.es && c.pages.startsWith("p"), id);
    assert.equal(c.imprint.includes("Schirmer"), d.edition.publisher.includes("Schirmer"), `${id}: the volume it is printed in`);
  }
  assert.doesNotMatch(JSON.stringify(CITATIONS), /Gould|Keller/, "nobody's words that cannot be checked here");
});

test("D449: the picture opens ABOUT THIS FUGUE (the ? glowing); the subject and Busoni inside; no HEAR button left on the column", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { Selection } = await import("../src/bench/Selection.tsx");
  const { FugueAbout } = await import("../src/bench/FugueAbout.tsx");
  const html = renderToStaticMarkup(createElement(Selection, { ...base, piece: "wtc1f04" }));
  assert.match(html, /id="sel-piece-pic" role="button"/);
  assert.match(html, /class="sel-piece-pic sel-piece-pic-open"/, "D452: the whole picture glows");
  assert.doesNotMatch(html, /id="sel-about"/, "D452: no ?");
  assert.doesNotMatch(html, /id="hear-wtc1f04"/);
  const box = renderToStaticMarkup(createElement(FugueAbout, { id: "wtc1f04", close: () => {}, subject: { play: async () => 0, stop: () => {} } }));
  assert.match(box, /id="about-subject"/);
  assert.match(box, /id="about-cite"/);
  assert.match(box, /Contrasubject I sollen in ruhig-fliessender Bewegung/);
  assert.match(box, /G\. Schirmer, New York, 1894\), p/);
  assert.match(src("src/bench/HearSubject.tsx"), /useEffect\(\(\) => \(\) => stopRef\.current(\?\.)?\(\), \[\]\)/, "silenced when the box closes");
});

test("D450: DRUMS on the right column: ON/OFF; the piece's presets cycled, kept, applied, and turning the drums on", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { Selection } = await import("../src/bench/Selection.tsx");
  const D = await import("../src/bench/LiteDrums.tsx");
  store.clear();
  const none = renderToStaticMarkup(createElement(Selection, { ...base, piece: "wtc1f04", drums: { on: false, toggle: () => {}, presets: [], cycle: () => {} } }));
  assert.match(none, /id="sel-drums-on"/);
  assert.doesNotMatch(none, /id="sel-drums-preset"/, "no presets yet: ON/OFF alone");
  const applied: string[] = [];
  D.registerDrumPresets({ presetsFor: () => [{ id: "a", name: "MARCH" }, { id: "b", name: "SWING" }, { id: "c", name: "DISCO" }], apply: (p, id) => void applied.push(`${p}:${id}`) });
  assert.equal(D.drumPresetOf("wtc1f04"), "a");
  assert.equal(D.liteDrums(), false);
  assert.equal(D.cycleDrumPreset("wtc1f04"), "b");
  assert.equal(D.liteDrums(), true, "cycling turns the drums on");
  assert.equal(D.drumPresetOf("wtc1f04"), "b");
  assert.equal(D.drumPresetOf("wtc1f05"), "a", "per piece");
  D.cycleDrumPreset("wtc1f04");
  assert.equal(D.cycleDrumPreset("wtc1f04"), "a", "round");
  assert.deepEqual(applied, ["wtc1f04:b", "wtc1f04:c", "wtc1f04:a"]);
  const three = renderToStaticMarkup(createElement(Selection, { ...base, piece: "wtc1f04", drums: { on: true, toggle: () => {}, presets: D.drumPresets("wtc1f04"), preset: "b", cycle: () => {} } }));
  // D453: the style's name (no count: the round is HOME and the sound's family, MORE every style).
  assert.match(three, /id="sel-drums-preset"[^>]*>.*STYLE.*SWING ↻/s);
  assert.doesNotMatch(src("src/bench/BenchApp.tsx"), /<LiteDrumsSwitch/, "moved, not doubled");
});
