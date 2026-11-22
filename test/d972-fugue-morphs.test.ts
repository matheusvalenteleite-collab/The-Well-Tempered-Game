/**
 * D972 (canons session; the owner on the fugue morph gallery: "All looks good"; the board: build it): a fugue's
 * transformed entries (inverted, augmented, diminished) morph in play: from the plain entry before it when that entry is
 * on screen as the morph begins, else from the subject's emblem; at most one in 8 bars, the first of each form always;
 * the morph replaces the subject effect on the entry it builds; drawing only; the ⚙ CANONS & FUGUES setting.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras, PIECES, type TouchEntry } from "../src/touch/fugue.ts";
import { CANONS } from "../src/touch/canon-echo.ts";
import { fugueMorphs, fromNeighbour, morphedKeys } from "../src/touch/fugue-morph.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const formKey = (e: TouchEntry) => `${e.theme ?? 1}:${!!e.inverted}:${e.scale ?? 1}`;

test("every morph builds a transformed entry; the first of each form always; otherwise at least 8 bars apart", async () => {
  await loadExtras();
  let n = 0;
  for (const p of PIECES) {
    if (CANONS[p.id]) continue;
    const f = fugueById(p.id), ms = fugueMorphs(f);
    if (!f.entries.some((e) => e.inverted || (e.scale ?? 1) !== 1)) continue;
    n += ms.length;
    // D973: the other kinds build plain entries (an answer, a stretto's entry); a transformed entry is always "form"
    for (const m of ms) assert.equal(m.kind === "form", !!m.entry.inverted || (m.entry.scale ?? 1) !== 1, `${p.id} ${m.key}`);
    const firsts = new Map<string, TouchEntry>();
    for (const e of [...f.entries].sort((a, b) => a.on - b.on || a.voice - b.voice)) if ((e.inverted || (e.scale ?? 1) !== 1) && !firsts.has(formKey(e))) firsts.set(formKey(e), e);
    for (const e of firsts.values()) {
      if (e === f.entries.find((x) => (x.theme ?? 1) === (e.theme ?? 1))) continue;
      const t = ms.find((m) => m.entry === e);
      if (t) continue;
      // a first form left out only if too short to morph (fewer than two notes found)
      assert.ok(e.notes.length < 2, `${p.id}: the first ${formKey(e)} at bar ${e.bar} not morphed`);
    }
    let last = -Infinity;
    const seen = new Set<string>();
    for (const m of ms) {
      // D973: one cap for every kind (the first of each transformed form excepted)
      const first = m.kind === "form" && !seen.has(formKey(m.entry));
      if (m.kind === "form") seen.add(formKey(m.entry));
      assert.ok(first || m.entry.on >= last + 8 * f.barTicks, `${p.id}: bar ${m.entry.bar} within 8 bars of the last`);
      last = m.entry.on;
    }
  }
  assert.ok(n >= 40, String(n));
});

test("every note of the entry is carried (no thinning), each landing before its first note sounds", async () => {
  await loadExtras();
  const f = fugueById("wtc1f08");
  for (const m of fugueMorphs(f)) {
    assert.equal(m.T.length, Math.min(m.entry.notes.length, m.S.length, m.src ? m.A.length : Infinity));
    assert.ok(m.T.length >= 0.8 * Math.min(m.entry.notes.length, m.S.length), `${m.key}: ${m.T.length}`);
    assert.ok(m.n.landed < m.tB0 && m.e.start < m.n.start && m.n.start < m.n.fly);
  }
});

test("the rule: from the plain entry before it while that is on screen, else from the subject's emblem", async () => {
  await loadExtras();
  // WTC I/8, bar 30: the alto's entry from bar 27 is its model
  const i8 = fugueMorphs(fugueById("wtc1f08")).find((m) => m.kind === "form")!;
  assert.equal(i8.entry.bar, 30);
  assert.equal(i8.src?.bar, 27);
  assert.ok(i8.inv);
  // a view showing 3 bars behind the playhead sees it; one showing 1 bar does not
  const B = fugueById("wtc1f08").barTicks;
  assert.ok(fromNeighbour(i8, { now: i8.n.start, t0: i8.n.start - 3 * B }));
  assert.ok(!fromNeighbour(i8, { now: i8.n.start, t0: i8.n.start - B }));
  // WTC II/22, bar 42: the last plain entry began nine bars before: never on screen, the emblem
  const ii22 = fugueMorphs(fugueById("wtc2f22")).find((m) => m.kind === "form")!;
  assert.equal(ii22.entry.bar, 42);
  assert.ok(!fromNeighbour(ii22, { now: ii22.n.start, t0: ii22.n.start - 4 * fugueById("wtc2f22").barTicks }));
  // the augmentation and the diminution
  assert.equal(fugueMorphs(fugueById("wtc2f02")).find((m) => m.kind === "form")!.ratio, 2);
  assert.equal(fugueMorphs(fugueById("wtc2f09")).find((m) => m.kind === "form")!.ratio, 0.5);
});

test("the morph replaces the subject effect on the entry it builds; in the box's two passes; drawing only, no blur", async () => {
  await loadExtras();
  const keys = morphedKeys(fugueById("wtc1f08"));
  for (const m of fugueMorphs(fugueById("wtc1f08"))) assert.ok(keys.has(m.key));
  const m = src("src/touch/MusicBox.tsx");
  assert.match(m, /const fxSpans = spans && fr\.piece && !fr\.floor \? unmorphed\(spans, morphedKeys\(fugueById\(fr\.piece\)\)\) : spans;/);
  assert.match(m, /subjectFx\(fx, fxSpans, playedVoices, false/);
  assert.match(m, /subjectFx\(fx, fxSpans!, playedVoices, true/);
  assert.match(m, /else paintFugueMorphs\(g, fugueById\(fr\.piece\), canonGeo, pass\);/);
  const e = src("src/touch/fugue-morph.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.ok(!/shadowBlur|filter\s*=/.test(e));
  assert.ok(!/score|grade|"hit"|"miss"/.test(e));
  assert.match(e, /if \(canonsMode\(\) === "off"\) return;/);
  // ⚙ CANONS & FUGUES
  assert.match(src("src/bench/BenchApp.tsx"), /<Choice id="canons" label="CANONS & FUGUES"/);
  for (const l of ["pt", "es"]) for (const k of ["CANONS & FUGUES"]) assert.ok(src(`src/i18n/${l}.ts`).includes(`"${k}": "`), `${l} ${k}`);
});

test("step 1: on the subject card a form chosen is first shown made from the subject, then heard; the setting OFF skips it", () => {
  const h = src("src/bench/HearSubject.tsx");
  assert.match(h, /onClick=\{\(\) => \(i === fi \? hear\(\) : choose\(i\)\)\}/);
  assert.match(h, /morph\.current = i > 0 && canonsMode\(\) !== "off" && to\.entry !== from\.entry \?/);
  assert.match(h, /if \(c && e && morph\.current\) paintFormMorph\(c, morph\.current,/);
  assert.match(h, /const id2 = setTimeout\(hear, FORM_MORPH_S \* 1000\);/);
  const body = h.slice(h.indexOf("function paintFormMorph"));
  // the turn, the colour in step with the motion, no blur
  assert.match(body, /h = Math\.max\(bh \* 0\.4, bh \* Math\.abs\(cos\)\);/);
  assert.match(body, /const col = mix\(m\.fromInk, m\.toInk, u\);/);
  assert.ok(!/shadowBlur/.test(body));
});

test("no words in play (the owner: \"We don't need tags … They're just cluttering\"): neither the fugues' morphs nor the canons' ribbon draws text; the emblem under the tabs", () => {
  for (const f of ["src/touch/fugue-morph.ts", "src/touch/canon-ribbon.ts"]) {
    const e = src(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.ok(!/k\.text\(|fillText|strokeText|\btr\(/.test(e), f);
  }
  assert.match(src("src/touch/fugue-morph.ts"), /k\.tabsBelow \? k\.tabsBelow\(/);
  assert.equal((src("src/touch/box-fx.ts").match(/c\.tabs\?\.push\(/g) ?? []).length, 2);
  for (const l of ["pt", "es"]) for (const k of ["UPSIDE DOWN", "TWICE AS SLOW", "TWICE AS FAST", "FROM BAR {n}"]) assert.ok(!src(`src/i18n/${l}.ts`).includes(`"${k}": "`), `${l} ${k}`);
});
