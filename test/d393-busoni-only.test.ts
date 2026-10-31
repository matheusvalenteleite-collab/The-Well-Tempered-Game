/**
 * D393 (WTC 1.90), ONLY BUSONI: play.html offers BUSONI's whole-piece reading and no other; it is on by
 * default for every fugue of Book I and every instrument; Settings' BUSONI'S MARKINGS (ON / OFF, persisted)
 * is the one switch, off meaning no reading at all; the Lab keeps every reading.
 * D394 (WTC 1.91): Book II has BUSONI too: the default for all 48; a fugue with no whole reading plays with none.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
/** D394: both books. */
const ALL = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));

test("D393, D394: BUSONI on by default for all 48 fugues on every instrument; the switch turns it off everywhere; a fugue with no whole reading none", async () => {
  const { busoniOn, setBusoniOn, playReading, readingsOf, wholeReadingOf, OFFER_READINGS } = await import("../src/touch/readings.ts");
  const { FUGUES } = await import("../src/touch/fugue.ts");
  store.clear();
  assert.equal(OFFER_READINGS, false, "only BUSONI offered");
  assert.equal(busoniOn(), true, "on by default");
  for (const id of ALL) {
    const r = playReading(id);
    assert.equal(r?.id, "busoni", id);
    assert.ok(r?.whole, id);
    // The books' readings are kept (data and code), only not offered.
    assert.ok(readingsOf(id).some((x) => !x.whole), `${id}: the books' readings kept`);
  }
  // D394: a fugue with no whole-piece reading at all plays with none.
  const bare = FUGUES.filter((x) => !wholeReadingOf(x.id));
  assert.ok(bare.length > 0 && bare.every((x) => !ALL.includes(x.id)), "every fugue of the 48 has BUSONI");
  for (const f of bare) assert.equal(playReading(f.id), null, `${f.id}: no reading`);
  // The play page takes the reading by playReading, not by the sound (every instrument alike).
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /OFFER_READINGS \? chosenReading\(f\.id, presetById\(soundNow\)\.id\) : busoni \? playReading\(f\.id\) : null/);
  setBusoniOn(false);
  assert.equal(busoniOn(), false);
  assert.equal(store.get("tb-busoni-v1"), "off", "persisted");
  for (const id of ALL) assert.equal(playReading(id), null, `${id}: off, no reading`);
  setBusoniOn(true);
  assert.equal(playReading("wtc1f04")?.id, "busoni");
  assert.equal(playReading("wtc2f22")?.id, "busoni");
  store.clear();
});

test("D393: the one switch is in play.html's Settings (en, pt, es); no other toggle; HEAR THE SUBJECT shows BUSONI and no chooser", async () => {
  const app = src("src/bench/BenchApp.tsx");
  assert.equal(app.match(/setBusoniOn\(/g)?.length, 1, "one switch");
  const settings = app.slice(app.indexOf('<Panel title="SETTINGS" close={back} className="tb-lite-settings">'), app.indexOf("UNLOCKED ON THIS DEVICE"));
  assert.match(settings, /<Choice id="busoni" label="BUSONI'S MARKINGS"/, "in Settings, before the owner's items");
  assert.match(src("src/i18n/pt.ts"), /"BUSONI'S MARKINGS": "MARCAÇÕES DE BUSONI"/);
  assert.match(src("src/i18n/es.ts"), /"BUSONI'S MARKINGS": "INDICACIONES DE BUSONI"/);
  assert.doesNotMatch(src("src/bench/HearSubject.tsx"), /setBusoniOn/);
  register("./tsx-hooks.mjs", import.meta.url);
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { HearSubject } = await import("../src/bench/HearSubject.tsx");
  const { setBusoniOn } = await import("../src/touch/readings.ts");
  store.clear();
  const html = renderToStaticMarkup(React.createElement(HearSubject, { id: "wtc1f03", play: async () => 0, close: () => {} }));
  assert.match(html, /id="reading-one"[^>]*>[^<]*BUSONI/);
  for (const other of ["none", "keller", "bodky", "riemann", "busoni"]) assert.doesNotMatch(html, new RegExp(`id="reading-${other}"`), other);
  setBusoniOn(false);
  const off = renderToStaticMarkup(React.createElement(HearSubject, { id: "wtc1f03", play: async () => 0, close: () => {} }));
  assert.doesNotMatch(off, /id="reading-one"/);
  assert.match(off, /BUSONI&#x27;S MARKINGS ARE OFF|BUSONI'S MARKINGS ARE OFF/);
  store.clear();
  // D394: Book II shows BUSONI (its own year); a fugue with no whole reading shows none.
  const b2 = renderToStaticMarkup(React.createElement(HearSubject, { id: "wtc2f02", play: async () => 0, close: () => {} }));
  assert.match(b2, /id="reading-one"[^>]*>[^<]*BUSONI 1915/);
  const { FUGUES } = await import("../src/touch/fugue.ts");
  const { wholeReadingOf } = await import("../src/touch/readings.ts");
  const bare = FUGUES.find((x) => !wholeReadingOf(x.id))!;
  const none = renderToStaticMarkup(React.createElement(HearSubject, { id: bare.id, play: async () => 0, close: () => {} }));
  assert.doesNotMatch(none, /id="reading-/);
});

test("D393: BUSONI on the harpsichord and the organ: articulation, the box and the ending, no piano levels; the Lab keeps every reading", async () => {
  const { fugueById, inBar, beatOf } = await import("../src/touch/fugue.ts");
  const { playReading } = await import("../src/touch/readings.ts");
  const { wholePlan, wholeMarks } = await import("../src/touch/whole-reading.ts");
  const { wholeBox } = await import("../src/touch/whole-marks.ts");
  const { phrase, phraseContext } = await import("../src/touch/phrasing.ts");
  const { accompaniment, subjectMarks } = await import("../src/touch/voice-mode.ts");
  const { tempoOf } = await import("../src/touch/tempi.ts");
  store.clear();
  for (const id of ["wtc1f04", "wtc1f22", "wtc2f15", "wtc2f22"]) {
    const f = fugueById(id);
    const r = playReading(id)!;
    const plan = wholePlan(f, r)!;
    assert.ok(wholeBox(f, r, [0])!.marks.size > 0, `${id}: the box`);
    const notes = accompaniment(f, 0, -1);
    const ctx = phraseContext(f, tempoOf(f.id), wholeMarks(plan), plan);
    for (const style of ["harpsichord", "organ"] as const) {
      const sh = phrase(notes, beatOf(f).ticks, (t) => inBar(f, t), subjectMarks(f).subject, style, ctx);
      assert.equal(sh.length, notes.length);
      assert.ok(sh.every((s) => s.level === 1), `${id} ${style}: no piano levels`);
      assert.ok(sh.every((s) => Number.isFinite(s.hold ?? 1)), `${id} ${style}: articulation`);
    }
  }
  // The Lab's own reading picker unchanged: every reading the fugue has.
  const lab = src("src/bench/lab/LabApp.tsx");
  assert.match(lab, /id="lab-reading"/);
  assert.match(lab, /readingsOf\(/);
});
