// D189: the analysis the bench draws (tools/touch/analysis.ts, written into data/touch/pieces.json):
// the entries' keys and forms, augmentations, diminutions and inversions, Contrapunctus XIV's three
// subjects, the cadences and the countersubjects, checked against what the literature says.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FUGUES, PIECES, cadenceName, cadencesIn, countersubjectOf, entryShape, fugueById, keyName, type TouchFugue } from "../src/touch/fugue.ts";

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pcOf = (key: string) => {
  let p = PC[key[0].toUpperCase()];
  for (const c of key.slice(1)) p += c === "#" ? 1 : c === "b" ? -1 : 0;
  return ((p % 12) + 12) % 12;
};
const entryAt = (f: TouchFugue, bar: number, voice: number) => f.entries.find((e) => e.bar === bar && e.voice === voice);

test("every piece carries cadences and countersubjects (empty where none); the types' helpers name them", () => {
  for (const f of PIECES) {
    assert.ok(Array.isArray(f.cadences), f.id);
    assert.ok(Array.isArray(f.countersubject), f.id);
    for (const c of f.cadences) {
      assert.ok(["perfect", "imperfect", "deceptive", "half", "phrygian"].includes(c.kind), `${f.id} ${c.kind}`);
      assert.ok(c.on >= 0 && c.on <= f.length, f.id);
      assert.equal(c.key.length > 0, true);
    }
    // In time order, a bar apart at least.
    for (let i = 1; i < f.cadences.length; i++) assert.ok(f.cadences[i].on - f.cadences[i - 1].on >= f.barTicks, `${f.id} b.${f.cadences[i].bar}`);
  }
  assert.equal(cadenceName({ on: 0, bar: 1, key: "g", kind: "perfect" }), "PERFECT CADENCE · G MINOR");
  assert.equal(cadenceName({ on: 0, bar: 1, key: "Eb", kind: "phrygian" }), `PHRYGIAN CADENCE · ${keyName("Eb")}`);
  const f = fugueById("wtc1f16");
  assert.deepEqual(
    cadencesIn(f, 0, f.length).map((c) => c.bar),
    f.cadences.map((c) => c.bar),
  );
});

// Ledbetter, Bach's Well-tempered Clavier: The 48 Preludes and Fugues (Yale, 2002), Part Two, as
// digested in data/wtc/ledbetter-claims.txt: where he names a cadence in a fugue, and in what key.
test("cadences: most of those Ledbetter (2002) names are found, in their bar (or the next or last) and key", () => {
  const claims = readFileSync(new URL("../data/wtc/ledbetter-claims.txt", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => /^wtc\df\d\d cadence/.test(l) && !/early version|\[check\]/.test(l));
  assert.ok(claims.length >= 30);
  let found = 0;
  const missed: string[] = [];
  for (const c of claims) {
    const [, id, bar, key] = /^(\S+) cadence b\.(\d+) (\S+)/.exec(c)!;
    const f = fugueById(id);
    const home = pcOf(f.key);
    // His "i"/"I" is the home key, "V" its dominant.
    const want = key === "i" || key === "I" ? home : key === "V" ? (home + 7) % 12 : pcOf(key);
    if (f.cadences.some((x) => Math.abs(x.bar - Number(bar)) <= 1 && pcOf(x.key) === want)) found++;
    else missed.push(c);
  }
  // 25 of 34 when written (D189); the misses include Book II no. 11, b. 56, which Ledbetter calls
  // "interrupted" (V7 to a diminished seventh, not to vi: no deceptive cadence by this reading).
  assert.ok(found / claims.length >= 0.7, `found ${found} of ${claims.length}; missed:\n${missed.join("\n")}`);
});

test("cadences: some Ledbetter names, each in its bar and key", () => {
  const at = (id: string, bar: number) => fugueById(id).cadences.find((c) => c.bar === bar);
  // Ledbetter (2002): I/16, b. 12 B♭ major, bb. 24 and 34 the tonic; I/11, b. 46 D minor; I/22, b. 25 D♭ major;
  // II/9, b. 16 C♯ minor, b. 23 F♯ minor, b. 35 G♯ minor; II/14, b. 20 A major.
  assert.equal(at("wtc1f16", 12)?.key, "Bb");
  assert.equal(at("wtc1f16", 24)?.key, "g");
  assert.equal(at("wtc1f16", 34)?.key, "g");
  assert.equal(at("wtc1f11", 46)?.key, "d");
  assert.equal(at("wtc1f22", 25)?.key, "Db");
  assert.equal(at("wtc2f09", 16)?.key, "c#");
  assert.equal(at("wtc2f09", 23)?.key, "f#");
  assert.equal(at("wtc2f09", 35)?.key, "g#");
  assert.equal(at("wtc2f14", 20)?.key, "A");
  // The cadence in A minor at b. 14 of the C major fugue, that closes its stretto section (Ledbetter's section b. 7-14).
  assert.equal(at("wtc1f01", 14)?.key, "a");
  assert.equal(at("wtc1f01", 14)?.kind, "perfect");
});

test("cadences: the 48 fugues close in their own key (all but two, read in their last two bars)", () => {
  const wtc = FUGUES.filter((f) => f.book);
  assert.equal(wtc.length, 48);
  const closing = wtc.filter((f) => {
    const last = f.cadences.at(-1);
    return last && last.bar >= f.bars.at(-1)!.n - 1 && pcOf(last.key) === pcOf(f.key) && (last.kind === "perfect" || last.kind === "imperfect");
  });
  // Not read: Book I no. 4 (its last cadence, b. 112, three bars before the end, over the tonic
  // pedal) and no. 10 (two voices: no cadence reads as such).
  assert.ok(closing.length >= 46, `${closing.length} of 48`);
  // A minor fugue ending on a major chord (the Picardy third) closes in the minor key: Book I no. 2.
  assert.equal(fugueById("wtc1f02").cadences.at(-1)?.key, "c");
  // Contrapunctus XIV breaks off: its last chord is not read as a close (the final-close rule is not
  // applied); the V–i of b. 239's downbeat, a few beats before the break, is in the notes and is read.
  const cp = fugueById("bwv1080-14");
  assert.ok(cp.cadences.length > 0);
  assert.ok(cp.cadences.every((c) => c.on < cp.bars.at(-1)!.on + cp.tpq));
});

test("entry keys: an entry is named by its own notes and the music with it, not by its first note", () => {
  const f = fugueById("wtc1f01");
  // Music audit (22 October 2026, item 5): b. 12, tenor, E F♯ G♯ A …, leads to A minor (shown as E major before);
  // b. 17, tenor, A B C♯ D … C F, D minor (A major before); b. 21, tenor, B C D E F …, a diatonic form in C (B♭ major before).
  assert.equal(entryAt(f, 12, 2)?.key, "a");
  assert.equal(entryAt(f, 17, 2)?.key, "d");
  assert.equal(entryAt(f, 21, 2)?.key, "C");
  // The C minor fugue's keys as read by hand (D159) are kept; the reading agrees with them all.
  assert.deepEqual(
    fugueById("wtc1f02").entries.map((e) => e.key),
    ["c", "g", "c", "Eb", "g", "c", "c", "c"],
  );
  // Spelled as the score spells: Book II no. 3 (C♯ major) has an E♯ minor entry, no F.
  const keys = fugueById("wtc2f03").entries.map((e) => e.key);
  assert.ok(keys.includes("e#"));
  assert.ok(!keys.some((k) => k === "f" || k === "F"));
});

test("subject and answer are told by key: the answer stands at the dominant", () => {
  // Book II no. 22's exposition: alto (b. 1, B♭ minor) subject, soprano (b. 5, F minor) answer, bass
  // (b. 11, B♭ minor) subject, tenor (b. 17, F minor) answer (the audit found these swapped, item 6).
  const f = fugueById("wtc2f22");
  assert.deepEqual(
    f.entries.slice(0, 4).map((e) => [e.bar, e.voice, e.form, e.key]),
    [
      [1, 1, "subject", "bb"],
      [5, 0, "answer", "f"],
      [11, 3, "subject", "bb"],
      [17, 2, "answer", "f"],
    ],
  );
  // A real answer is an answer too: Book I no. 1, the soprano at b. 2 on G.
  assert.equal(entryAt(fugueById("wtc1f01"), 2, 0)?.form, "answer");
  for (const g of FUGUES) for (const e of g.entries) assert.equal(e.form === "answer", pcOf(e.key) === (pcOf(g.key) + 7) % 12, `${g.id} b.${e.bar}`);
});

test("augmentation, diminution and inversion are marked; an inverted entry is not every note varied", () => {
  // Book I no. 8: the subject augmented in the bass at b. 62, the alto at b. 67, the soprano at b. 77
  // (the audit, item 6; Ledbetter's stretto at b. 77, "normal, semi-augmented, augmented").
  const i8 = fugueById("wtc1f08");
  assert.deepEqual(
    i8.entries.filter((e) => e.scale === 2).map((e) => [e.bar, e.voice]),
    [
      [62, 2],
      [67, 1],
      [77, 0],
    ],
  );
  for (const e of i8.entries.filter((x) => x.scale === 2)) assert.ok(e.end - e.on > 2 * (i8.entries[0].end - i8.entries[0].on) - i8.tpq, "twice as long");
  // Book II no. 9: the diminished subject in stretto, bb. 23-40 (Ledbetter's section b. 23-34, "low stretti";
  // his stretto at b. 27, "diminution and inversion"): ten statements, one inverted (b. 32).
  const ii9 = fugueById("wtc2f09").entries.filter((e) => e.scale === 0.5);
  assert.equal(ii9.length, 10);
  assert.ok(ii9.every((e) => e.bar >= 23 && e.bar <= 40));
  assert.equal(ii9.filter((e) => e.inverted).length, 1);
  // Book II no. 22: the inverted entries from b. 42 (Ledbetter's inverted-subject exposition, b. 42-63) keep the inverted shape.
  const inv = fugueById("wtc2f22").entries.filter((e) => e.inverted && e.bar >= 42 && e.bar < 64);
  assert.equal(inv.length, 4);
  for (const e of inv) assert.ok(e.notes.filter((n) => n[3]).length <= 2, `b.${e.bar}`);
  assert.equal(entryShape(inv[0]), "INVERSION");
  assert.equal(entryShape(i8.entries.find((e) => e.scale === 2)!), "AUGMENTATION");
  assert.equal(entryShape(ii9.find((e) => e.inverted)!), "DIMINISHED INVERSION");
  assert.equal(entryShape(fugueById("wtc1f02").entries[0]), "");
});

test("the two false entries of Book I no. 8 are gone (b. 17 bass, b. 33 alto)", () => {
  const f = fugueById("wtc1f08");
  assert.equal(entryAt(f, 17, 2), undefined);
  assert.equal(entryAt(f, 33, 1), undefined);
});

test("Contrapunctus XIV: the three subjects and their entries", () => {
  const f = fugueById("bwv1080-14");
  const first = (theme?: number) => f.entries.find((e) => e.theme === theme)!;
  // The first subject: the bass, b. 1, D A G F G A D; the exposition bass, tenor, alto, soprano every five bars, answered (tonal: A D).
  assert.deepEqual(
    f.entries.slice(0, 4).map((e) => [e.bar, e.voice, e.form, e.key]),
    [
      [1, 3, "subject", "d"],
      [6, 2, "answer", "a"],
      [11, 1, "subject", "d"],
      [16, 0, "answer", "a"],
    ],
  );
  assert.deepEqual(
    f.entries[0].notes.map((n) => n[2] % 12),
    [2, 9, 7, 5, 7, 9, 2],
  );
  assert.ok(f.entries.some((e) => !e.theme && e.inverted), "the first subject inverted");
  // The second, b. 114, alto; the third, b. 193, tenor: B-A-C-H.
  assert.deepEqual([first(2).bar, first(2).voice], [114, 1]);
  assert.deepEqual([first(3).bar, first(3).voice], [193, 2]);
  assert.deepEqual(
    first(3).notes.slice(0, 4).map((n) => n[2] % 12),
    [10, 9, 0, 11],
  );
  // Each later subject has its exposition in all four voices.
  for (const theme of [2, 3]) assert.equal(new Set(f.entries.filter((e) => e.theme === theme).map((e) => e.voice)).size, 4);
  // All three together near the end where the fugue breaks off (bb. 233-235).
  const late = f.entries.filter((e) => e.bar >= 233);
  assert.deepEqual(new Set(late.map((e) => e.theme ?? 1)), new Set([1, 2, 3]));
  assert.equal(new Set(late.map((e) => e.voice)).size, 3);
});

test("the later subjects of the WTC's double and triple fugues, where Ledbetter has them enter (D197)", () => {
  // Ledbetter, Bach's Well-tempered Clavier (Yale, 2002), Part Two (data/wtc/later-subjects.json,
  // data/wtc/ledbetter-claims.txt): the bar each later subject first enters; the voice from the notes
  // (where he names it: Book II no. 4's in the soprano, no. 18's second section opening in the soprano).
  const firstOf = (id: string, theme: number) => fugueById(id).entries.find((e) => e.theme === theme)!;
  const at = (id: string, theme: number) => [firstOf(id, theme).bar, firstOf(id, theme).voice];
  // Book I no. 4: the second subject (running quavers) at b. 35, his bar counting its crotchet
  // head; the figure the notes give begins on the quaver run, b. 36, in the first soprano.
  assert.ok([35, 36].includes(firstOf("wtc1f04", 2).bar));
  assert.equal(firstOf("wtc1f04", 2).voice, 0);
  assert.deepEqual(at("wtc1f04", 3), [49, 2]); // the third (repeated crotchets), alto
  assert.deepEqual(at("wtc2f04", 2), [35, 0]); // the chromatic second subject, soprano
  assert.deepEqual(at("wtc2f14", 2), [20, 2]); // its own exposition, bass first
  assert.deepEqual(at("wtc2f14", 3), [36, 1]); // its own exposition, alto first
  assert.deepEqual(at("wtc2f18", 2), [61, 0]);
  assert.deepEqual(at("wtc2f23", 2), [28, 0]);
  // Book II no. 9: Ledbetter's "two new subjects" of bb. 16-22 are not carried (a doubtful reading).
  assert.ok(!fugueById("wtc2f09").entries.some((e) => e.theme));
  // Every voice has every later subject, so the SUBJECTS seal can be earned in any voice; none is inverted or scaled.
  for (const [id, themes] of [["wtc1f04", [2, 3]], ["wtc2f04", [2]], ["wtc2f14", [2, 3]], ["wtc2f18", [2]], ["wtc2f23", [2]]] as const) {
    const f = fugueById(id);
    for (const t of themes) assert.equal(new Set(f.entries.filter((e) => e.theme === t).map((e) => e.voice)).size, f.voices.length, `${id} ${t}`);
    assert.ok(f.entries.filter((e) => e.theme).every((e) => !e.inverted && !e.scale), id);
  }
  const overlap = (f: TouchFugue, a: TouchFugue["entries"][number]) => f.entries.filter((b) => b !== a && b.voice !== a.voice && b.on < a.end && a.on < b.end);
  // Book II no. 18: from b. 97 the two subjects together, five times (Ledbetter's first-subject entries at bb. 97, 103, 111, 125, 135).
  const g = fugueById("wtc2f18");
  const combined = g.entries.filter((e) => e.theme === 2 && e.bar >= 97);
  assert.deepEqual(combined.map((e) => e.bar), [97, 103, 111, 125, 135]);
  for (const e of combined) assert.ok(overlap(g, e).some((x) => !x.theme), `b. ${e.bar}`);
  assert.ok(g.entries.filter((e) => e.theme === 2 && e.bar < 97).every((e) => overlap(g, e).every((x) => x.theme)), "the second section on the second subject alone");
  // All three subjects sound together: Book I no. 4 at the third's entry (b. 49), Book II no. 14 at bb. 60-61.
  for (const [id, bar] of [["wtc1f04", 49], ["wtc2f14", 61]] as const) {
    const f = fugueById(id);
    const e = f.entries.find((x) => x.theme === 3 && x.bar === bar)!;
    assert.deepEqual(new Set([3, ...overlap(f, e).map((x) => x.theme ?? 1)]), new Set([1, 2, 3]), id);
  }
  // Book II no. 23: the second subject with the first at Ledbetter's entries of the first, bb. 42, 48, 53.
  const h = fugueById("wtc2f23");
  for (const bar of [42, 48, 53]) assert.ok(h.entries.some((e) => !e.theme && e.bar === bar && overlap(h, e).some((x) => x.theme === 2)), `b. ${bar}`);
  // Book II no. 14's second subject returns in the last section (bb. 56, 61, 68), bent at its end:
  // found by the subject finder where the recurring-figure search (the whole figure exact) misses it.
  assert.deepEqual(fugueById("wtc2f14").entries.filter((e) => e.theme === 2 && e.bar > 40).map((e) => e.bar), [56, 61, 68]);
  // No countersubject is read against a later subject's statements (none of these fugues has a regular one).
  for (const id of ["wtc1f04", "wtc2f04", "wtc2f14", "wtc2f18", "wtc2f23"]) assert.equal(fugueById(id).countersubject.length, 0, id);
});

test("countersubjects: where a fugue has a regular one, it is marked against its entries, in another voice", () => {
  // Regular in docs/wtc/countersubject-study.md (the study's own reading): among them Book I nos. 2, 3, 12 and Book II no. 8.
  for (const id of ["wtc1f02", "wtc1f03", "wtc1f12", "wtc2f08"]) assert.ok(fugueById(id).countersubject.length >= 3, id);
  // Free in the study (no countersubject comes back): Book I no. 1, Book II no. 2.
  for (const id of ["wtc1f01", "wtc2f02"]) assert.equal(fugueById(id).countersubject.length, 0, id);
  for (const f of FUGUES)
    for (const c of f.countersubject) {
      const e = f.entries[c.entry];
      assert.ok(e, f.id);
      assert.notEqual(c.voice, e.voice, `${f.id} b.${e.bar}`);
      // It sounds with the entry.
      assert.ok(c.on < e.end && c.end > e.on && c.end > c.on, `${f.id} b.${e.bar}`);
    }
  // Book I no. 2: first against the answer (soprano, b. 3), in the alto that stated the subject.
  const c2 = fugueById("wtc1f02");
  const cs = countersubjectOf(c2, 1)!;
  assert.equal(c2.entries[1].bar, 3);
  assert.equal(cs.voice, 1);
  assert.equal(countersubjectOf(c2, 0), undefined);
});

test("the sections still open with the exposition", () => {
  for (const f of FUGUES.filter((x) => x.book)) assert.equal(f.sections[0].name, "Exposition", f.id);
});
