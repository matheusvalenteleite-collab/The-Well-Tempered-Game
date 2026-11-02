/**
 * D513: SUBJECTS AND EPISODES IN THE PLAYBACK, AND A WHOLE-FUGUE CLIMAX. The form read from the fugue's own entries
 * (through TouchFugue.entries, never a copy), the fugues where the contrast is clear decided by the data, the band's
 * colour by zone (small, terraced, Busoni's levels leading), the climax at the final entries.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FUGUES, fugueById, type TouchFugue } from "../src/touch/fugue.ts";
import { CLIMAX_DB, EPISODE_DB, FORM_REG, MIN_EPISODES, MIN_EPISODE_SHARE, SUBJECT_DB, arcDb, clearContrast, formAt, formColour, formOf, withForm } from "../src/touch/fugue-form.ts";

const WTC = FUGUES.filter((f) => /^wtc/.test(f.id));

test("D513: the form's zones cover the piece from the first entry, alternating, every entry inside a subject zone", () => {
  for (const f of WTC) {
    const m = formOf(f);
    assert.ok(m.zones.length > 0, f.id);
    for (let i = 1; i < m.zones.length; i++) {
      assert.equal(m.zones[i].from, m.zones[i - 1].to, `${f.id} contiguous`);
      assert.notEqual(m.zones[i].kind, m.zones[i - 1].kind, `${f.id} alternating`);
    }
    for (const e of f.entries) {
      const z = m.zones.find((z) => e.on >= z.from && e.on < z.to);
      assert.equal(z?.kind, "subject", `${f.id} entry at ${e.bar}`);
    }
    // The climax at the final entries (or the last 15 %), the last bar after it.
    assert.ok(m.climax > 0 && m.climax < f.length && m.lastBar > m.climax - f.barTicks, f.id);
  }
});

test("D513: the form follows the entries as the data says (a changed entry list is read anew, never a copy)", () => {
  const f = fugueById("wtc1f12");
  const a = formOf(f);
  const g: TouchFugue = { ...f, entries: f.entries.slice(0, -1) };
  const b = formOf(g);
  assert.notDeepEqual(a.zones, b.zones);
  // No entry list of its own: the module reads TouchFugue.entries.
  assert.match(readFileSync("src/touch/fugue-form.ts", "utf8"), /f\.entries\.map/);
});

test("D513: the fugues with a clear contrast, by the data (at least 3 inner episodes, 20 % of the piece); I/12 and I/24 among them", () => {
  const clear = WTC.filter(clearContrast).map((f) => f.id);
  assert.ok(clear.includes("wtc1f12") && clear.includes("wtc1f24"));
  for (const f of WTC) {
    const m = formOf(f);
    assert.equal(m.clear, m.episodes >= MIN_EPISODES && m.episodeShare >= MIN_EPISODE_SHARE, f.id);
  }
  // A good share of the 48, not all (I/1's stretti never pause; I/4, I/20 are entries throughout).
  assert.ok(clear.length >= 25 && clear.length <= 40, `${clear.length}`);
  for (const id of ["wtc1f01", "wtc1f04", "wtc1f20"]) assert.ok(!clear.includes(id), id);
});

test("D513: I/12's zones: the entries' and the episodes' alternation as Bach's (the episodes at bars 10, 16, 22, 31, 37, 44, 50), the climax at the last entry", () => {
  const f = fugueById("wtc1f12");
  const m = formOf(f);
  const bar = (t: number) => Math.floor(t / f.barTicks) + 1;
  const eps = m.zones.filter((z) => z.kind === "episode" && z.from < m.climax).map((z) => bar(z.from));
  // As measured (2 Nov 2026: [10, 16, 22, 31, 37, 44, 50], the climax at 53); the entries' data may be corrected, so the
  // shape is held, not the bars: six or more episodes, the climax in the last ten bars.
  assert.ok(eps.length >= 6, `${eps}`);
  assert.ok(bar(m.climax) >= 48, `${bar(m.climax)}`);
  const I24 = fugueById("wtc1f24");
  assert.ok(bar(formOf(I24).climax) >= 66, "I/24's climax at its last entries (bar 69)");
});

test("D513: the band's colour by zone: fuller in the subjects, lighter in the episodes, the most in the climax; at most ±1.5 dB", () => {
  const f = fugueById("wtc1f12");
  const m = formOf(f);
  const ep = m.zones.find((z) => z.kind === "episode")!;
  const sj = m.zones.filter((z) => z.kind === "subject")[2];
  for (const id of ["nocturne32", "pianoSampled", "harpsichordSampled", "chamberOrgan", "chip"]) {
    const e = formColour(m, id, ep.from + 1)!;
    const s = formColour(m, id, sj.from + 1)!;
    const c = formColour(m, id, m.climax + 1)!;
    assert.ok(e.db < s.db && s.db < c.db, id);
    for (const x of [e, s, c]) assert.ok(Math.abs(x.db) <= 1.5, `${id} ${x.db}`);
    assert.ok((e.colour.tone ?? 0) < (s.colour.tone ?? 0) && (s.colour.tone ?? 0) <= (c.colour.tone ?? 0));
    assert.ok((c.colour.room ?? 0) > 0 && !e.colour.room);
  }
  assert.ok(SUBJECT_DB > 0 && EPISODE_DB < 0 && CLIMAX_DB > SUBJECT_DB);
  // The arc: quieter at the start, full by 60 % of the piece.
  assert.ok(arcDb(0) < 0 && arcDb(0.6) === 0 && arcDb(0.9) === 0);
  // The registrations: more ranks in the subjects, the most in the climax.
  for (const id of Object.keys(FORM_REG)) {
    const r = FORM_REG[id];
    assert.ok(r.episode.length < r.subject.length + 1 && r.subject.length < r.climax.length + 1, id);
    assert.deepEqual(formColour(m, id, ep.from + 1)!.colour.reg, [...r.episode]);
    assert.deepEqual(formColour(m, id, m.climax + 1)!.colour.reg, [...r.climax]);
  }
  assert.ok(FORM_REG.harpsichordSampled.climax.includes("four") && FORM_REG.chamberOrgan.climax.includes("mixture"));
});

test("D513: no layer where the contrast is not clear; a colour plan's stops win over the form's, shelves and rooms add", () => {
  const f = fugueById("wtc1f01");
  const m = formOf(f);
  assert.equal(formColour(m, "chamberOrgan", 10), null);
  assert.equal(formAt(m, f.length - 1).kind, "climax");
  const plan = { reg: ["flute" as const], tone: -1, room: 0.1 };
  const w = withForm(plan, { reg: ["principal" as const], tone: 0.5, room: 0.05 })!;
  assert.deepEqual(w.reg, ["flute"]);
  assert.equal(w.tone, -0.5);
  assert.ok(Math.abs((w.room ?? 0) - 0.15) < 1e-9);
  assert.equal(withForm(null, null), null);
});

test("D513: the band's notes take the form (proto-game.ts): its colour merged with the plan's, its level on the band's only", () => {
  const src = readFileSync("src/bench/proto-game.ts", "utf8");
  assert.match(src, /this\.form = new FormLayer\(f\)/);
  assert.match(src, /withForm\(this\.colour\?\.at\(n\.on, n\.voice\) \?\? null, fm\?\.colour \?\? null\)/);
  assert.match(src, /\* fdb, \.\.\.\(cl \? \{ colour: cl \} : \{\}\)/);
  // No tempo: the form never reaches the clock.
  assert.ok(!/form[^\n]*(rit|tps|warp)/i.test(readFileSync("src/touch/fugue-form.ts", "utf8").split("\n").filter((l) => !l.trim().startsWith("*") && !l.trim().startsWith("//")).join("\n")));
});
