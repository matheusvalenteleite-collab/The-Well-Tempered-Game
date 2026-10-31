/**
 * D385 (WTC 1.88), THE PIANO MADE EXPRESSIVE: the panel's five recommendations built (the owner approved
 * all five) and D293's "the subject is never louder" removed. Held here: BUSONI's whole-piece readings
 * loaded beside the books' subject-only ones (the default on the piano for I/1, I/2, I/8, I/16, I/24);
 * the reading's dynamics in every voice (pp −11 … ff +6.5 dB, terraces and hairpins) and as the player's
 * line; three zones across the strip; the accent as weight on time (the judge and the texts); slur, legato
 * and phrase as separate dimensions; a palette per character word; the pianistic trill; no clamp on the
 * subject; the final slowing only where Busoni marks it, else the automatic RIT_END; fermatas held.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, inBar, beatOf } from "../src/touch/fugue.ts";
import type { Chip, Play } from "../src/touch/chip.ts";
import { bestReading, chooseReading, chosenReading, markLegend, readingsOf, wholeReadingOf, BEST_READING, type Reading } from "../src/touch/readings.ts";
import { endingOf, endSpeedOf, LEVEL_DB, RAMP, SFZ,PALETTES, paletteOfWord, phraseArchDb, PHRASE_BREATH_HOLD, slurShapeDb, wholeMarks, wholePlan } from "../src/touch/whole-reading.ts";
import { pianoTrill, PIANO_TRILL, TRILL_CHARACTERS, trillCharacter } from "../src/touch/piano-trill.ts";
import { landing, PIANO_SOFT_BELOW_DB, PIANO_SOFT_NET_DB, PIANO_ZONE_DB, pianoDb, pianoZone, STRONG_ZONE_FROM } from "../src/touch/touch-expr.ts";
import { accentWeighted } from "../src/bench/accent.ts";
import { phrase, phraseContext, RIT_END, ritard, withHolds } from "../src/touch/phrasing.ts";
import { accompaniment, subjectMarks } from "../src/touch/voice-mode.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { setPreset } from "../src/touch/sound.ts";
import { PATCHES } from "../src/touch/sound.ts";
import { trillUnit } from "../src/music/ornaments.ts";

/** D392: BUSONI for every fugue of Book I (D385 began with five: I/1, I/2, I/8, I/16, I/24). */
const BOOK_I = Array.from({ length: 24 }, (_, i) => `wtc1f${String(i + 1).padStart(2, "0")}`);
/** D394: and all 24 of Book II. */
const BOOK_II = Array.from({ length: 24 }, (_, i) => `wtc2f${String(i + 1).padStart(2, "0")}`);
const ALL = [...BOOK_I, ...BOOK_II];
const FIVE = ["wtc1f01", "wtc1f02", "wtc1f08", "wtc1f16", "wtc1f24"];
const busoni = (id: string) => readingsOf(id).find((r) => r.id === "busoni")!;
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const near = (a: number, b: number, eps = 1e-9, msg = "") => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≈ ${b}`);

/** A memory for the reading's choice (node has no localStorage). */
const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() };

function fakeChip(clock: { t: number }, log?: { midi: number; at: number; dur: number; p: Play }[]) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: (midi: number, at: number, dur: number, _v: unknown, p: Play = {}) => (log?.push({ midi, at, dur, p }), { stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
}
const ROWS: Rows = { yOf: (s) => 900 - s * 16, stepAt: (y) => Math.round((900 - y) / 16), rowH: 16, xOf: () => 400 };

// ---- The reading loader ----

test("D385, D392, D394: BUSONI loaded for all 48 fugues as a whole-piece reading beside the books' subject-only ones (kept as they were)", () => {
  for (const id of ALL) {
    const r = busoni(id);
    assert.ok(r && r.whole, id);
    assert.equal(r.author, "BUSONI");
    assert.equal(wholeReadingOf(id)?.id, "busoni");
    const first = [...fugueById(id).entries].filter((e) => !e.theme).sort((a, b) => a.on - b.on || a.voice - b.voice)[0];
    assert.equal(r.notes.length, first.notes.length, `${id}: the subject's marks derived from the first entry`);
    // Book II's volume marks less (II/8: only its entry letters and the ending's word; II/9 four marks): something to play by in each.
    if (BOOK_I.includes(id)) assert.ok(r.whole.marks.length + r.whole.slurs.length > 20 && r.whole.dyn.length >= 1, id);
    else assert.ok(r.whole.marks.length + r.whole.slurs.length + r.whole.dyn.length + r.whole.tempo.length + r.whole.rules.length > 0, id);
    if (FIVE.includes(id)) assert.ok(r.whole.marks.length > 50 && r.whole.dyn.length > 5 && r.whole.slurs.length > 30, id);
    // D392: every slur and hairpin a range inside the piece; every printed level parses (a level, a ramp, an accent).
    const f = fugueById(id);
    assert.ok(r.whole.slurs.every((x) => x.from < x.to && x.to <= f.length && f.voices[x.v]?.some((n) => n[0] === x.from)), `${id}: slurs`);
    assert.ok(r.whole.hairpins.every((x) => x.from < x.to && x.to <= f.length), `${id}: hairpins`);
    for (const d of r.whole.dyn) assert.ok(LEVEL_DB[d.mark.trim()] !== undefined || RAMP.test(d.mark) || SFZ.test(d.mark), `${id}: "${d.mark}"`);
    assert.ok(r.whole.marks.every((m) => fugueById(id).voices[m.v]?.some((n) => n[0] === m.on)), `${id}: every mark on a note of the game's`);
    // The books' readings come first, at most three, untouched (no whole).
    const books = readingsOf(id).filter((x) => !x.whole);
    assert.ok(books.length >= 1 && books.length <= 3 && readingsOf(id).at(-1)!.id === "busoni");
    // D392, D394: the edition's volume: Book I from Schirmer (1894), Book II from Breitkopf & Härtel (1915), but the
    // fugues Busoni swapped (I/7 and I/15 in his Book II volume, II/7 and II/15 in his Book I volume).
    const swapped = ["wtc1f07", "wtc1f15", "wtc2f07", "wtc2f15"].includes(id);
    const book2 = BOOK_II.includes(id) !== swapped;
    assert.match(r.work, book2 ? /Zweiter Teil \(Breitkopf & Härtel, 1915\)/ : /Erster Theil \(G\. Schirmer, 1894\)/, id);
    assert.equal(r.year, book2 ? 1915 : 1894, id);
  }
  assert.match(busoni("wtc2f07").work, /as Fuga VII$/);
  assert.match(busoni("wtc2f15").work, /as Fuga XV$/);
  // I/2: the figure C–B–C slurred (one gesture), the leaping eighths portato (detached for the judge), the syncopation's sixteenths short.
  const r2 = busoni("wtc1f02");
  assert.deepEqual(r2.slurs[0], { v: 1, from: 0, to: 2 });
  assert.equal(r2.notes[3].join, false);
  assert.equal(r2.notes[13].short, true);
  // D394: Book II's subject-only readings keep working, BUSONI after them; a fugue with no reading at all has none.
  const json = JSON.parse(src("data/touch/readings.json")) as Record<string, Reading[]>;
  const book2 = Object.keys(json).filter((k) => k.startsWith("wtc2f"));
  assert.equal(book2.length, 24);
  assert.ok(book2.every((k) => json[k].at(-1)!.whole && json[k].slice(0, -1).every((r) => !r.whole && r.notes.length > 0)), "Book II: the books' readings, then BUSONI");
  assert.equal(wholeReadingOf("bwv1080-14"), null);
  assert.equal(busoni("wtc1f07").year, 1915);
  // The tool writes it from the sources in the repository.
  assert.match(src("tools/touch/readings.ts"), /docs\/wtc\/readings\/\$\{ed\.id\}/);
  for (const id of ALL) assert.ok(src(`docs/wtc/readings/busoni/${id}-busoni.json`).includes("wtc-reading/2"));
});

test("D385, D392, D394: on the piano BUSONI is the default reading of all 48 fugues; every other sound keeps D344's; a choice still wins", () => {
  mem.clear();
  for (const id of ALL) {
    assert.equal(bestReading(id, "pianoSampled")?.id, "busoni", id);
    assert.equal(chosenReading(id, "pianoSampled")?.id, "busoni", id);
    const d344 = readingsOf(id).some((r) => r.id === BEST_READING[id]) ? BEST_READING[id] : null;
    assert.equal(bestReading(id, "harpsichordSampled")?.id ?? null, d344, id);
    assert.equal(bestReading(id)?.id ?? null, d344, id);
  }
  assert.equal(bestReading("bwv1080-14", "pianoSampled"), null, "no reading at all: none");
  chooseReading("wtc1f02", "keller");
  assert.equal(chosenReading("wtc1f02", "pianoSampled")?.id, "keller");
  mem.clear();
  // The label: the author's name in every language (a proper name).
  assert.match(src("src/bench/HearSubject.tsx"), /chosenReading\(id, preset\(\)\.id\)/);
});

// ---- 1. The reading carries the dynamics ----

test("D385: the reading's dynamics in every voice: pp −11 … ff +6.5 dB, terraced (I/2 bar 15: the alto's entry mf against the soprano's p subito), ramps and hairpins", () => {
  assert.deepEqual([LEVEL_DB.pp, LEVEL_DB.p, LEVEL_DB.mp, LEVEL_DB.mf, LEVEL_DB.f, LEVEL_DB.ff], [-11, -6.5, -3, 0, 3.5, 6.5]);
  const f = fugueById("wtc1f02");
  const p = wholePlan(f, busoni("wtc1f02"))!;
  near(p.dynAt(1, 1000), -6.5, 1e-9, "alto p, bar 1");
  // Bar 15: alto mf (the entry) over the soprano's p subito: a terrace, the entry 6.5 dB over.
  near(p.dynAt(1, 108480 + 10), 0);
  near(p.dynAt(0, 108480 + 10), -6.5);
  // A hairpin into the syncopation (bar 2): a local swell over the level, back after.
  const before = p.dynAt(1, 11520);
  const top = Math.max(...[12000, 12480, 12960].map((t) => p.dynAt(1, t)));
  assert.ok(top > before + 1, `the swell ${before} → ${top}`);
  // "poco a poco cresc." (bar 22) to the f (bar 27) and the ff coda: rising.
  assert.ok(p.dynAt(0, (25 - 1) * f.barTicks) > p.dynAt(0, (22 - 1) * f.barTicks));
  assert.ok(p.dynAt(0, (30 - 1) * f.barTicks) >= 6.5 - 1e-9);
  // Every note has its level; the plan is memoised by fugue.
  assert.equal(wholePlan(f, busoni("wtc1f02")), p);
  assert.equal(wholePlan(f, readingsOf("wtc1f02")[0]), null, "a subject-only reading has no plan");
});

test("D385: the band plays the reading's dynamics on the piano (and none on the harpsichord); the entry brought out where Busoni asks", () => {
  const f = fugueById("wtc1f02");
  const notes = accompaniment(f, 0, -1);
  const plan = wholePlan(f, busoni("wtc1f02"))!;
  const ctx = phraseContext(f, tempoOf(f.id), wholeMarks(plan), plan);
  const sh = phrase(notes, beatOf(f).ticks, (t) => inBar(f, t), subjectMarks(f).subject, "piano", ctx);
  const plain = phrase(notes, beatOf(f).ticks, (t) => inBar(f, t), subjectMarks(f).subject, "piano", phraseContext(f, tempoOf(f.id)));
  const mean = (pick: (n: (typeof notes)[number]) => boolean, s = sh) => {
    const xs = notes.map((n, i) => ({ n, d: s[i].db! })).filter((x) => pick(x.n));
    return xs.reduce((a, x) => a + x.d, 0) / xs.length;
  };
  const bar = (b: number) => [(b - 1) * f.barTicks, b * f.barTicks];
  const inB = (b: number, v: number) => (n: (typeof notes)[number]) => n.voice === v && n.on >= bar(b)[0] && n.on < bar(b)[1];
  // Bar 15: the alto's entry louder than the soprano by most of Busoni's terrace (6.5 dB), where the plain band had them alike.
  const lift = mean(inB(15, 1)) - mean(inB(15, 0));
  const was = mean(inB(15, 1), plain) - mean(inB(15, 0), plain);
  assert.ok(lift - was > 4, `the entry brought out: ${was.toFixed(1)} → ${lift.toFixed(1)} dB`);
  // pp-to-ff range in the band: the ff coda over the p exposition by more than 10 dB.
  assert.ok(mean(inB(30, 0)) - mean(inB(2, 1)) > 10);
  const hp = phrase(notes, beatOf(f).ticks, (t) => inBar(f, t), subjectMarks(f).subject, "harpsichord", ctx);
  assert.ok(hp.every((s) => s.level === 1), "the harpsichord: no levels");
});

test("D385: D293 removed: the phrasing no longer knows the subject's level (with or without the subject named, the same levels); no clamp left in the code", () => {
  for (const id of ["wtc1f02", "wtc2f16", "wtc1f24"]) {
    const f = fugueById(id);
    const notes = accompaniment(f, 0, -1);
    const a = phrase(notes, beatOf(f).ticks, (t) => inBar(f, t), subjectMarks(f).subject, "piano", phraseContext(f, tempoOf(f.id)));
    const b = phrase(notes, beatOf(f).ticks, (t) => inBar(f, t), new Set(), "piano", phraseContext(f, tempoOf(f.id)));
    a.forEach((s, i) => near(s.db!, b[i].db!, 1e-12, `${id} ${i}`));
  }
  assert.doesNotMatch(src("src/touch/phrasing.ts"), /the subject's notes brought down/);
  // Kept: loudness never tied to right or wrong (the player's note sounds by its place, never by its verdict).
  assert.match(src("src/bench/proto-game.ts"), /Never by the verdict: the place in the music, not right or wrong/);
});

test("D385: the player's line takes the reading's level on the piano (Play.lineDb), its accents and marcatos weighted in the strong zone", () => {
  setPreset("pianoSampled");
  const f = fugueById("wtc1f02");
  const clock = { t: 0 };
  const g = new ProtoGame(f, 1, 0, protoById("ladder"), { bpm: 60, legato: false, solo: true, easy: "direction", fail: false, reading: busoni("wtc1f02"), until: 16 * f.barTicks }, fakeChip(clock));
  const notes = g.tracks[0].notes;
  const i1 = notes.findIndex((n) => n.on === 960);
  assert.ok(g.lineAt(0, i1).lineDb! < -5, `alto p: ${g.lineAt(0, i1).lineDb}`);
  const i15 = notes.findIndex((n) => n.on >= 108480);
  assert.ok(g.lineAt(0, i15).lineDb! > g.lineAt(0, i1).lineDb! + 4, "bar 15: the entry mf");
  const plan = wholePlan(f, busoni("wtc1f02"))!;
  const acc = [...plan.notes].find(([k, x]) => k.startsWith("1:") && x.arts.has("accent"));
  if (acc) {
    const i = notes.findIndex((n) => `1:${n.on}` === acc[0]);
    if (i >= 0) assert.equal(g.lineAt(0, i).accentDb, 4);
  }
  // No reading: the line at the middle (no lineDb), the zones alone.
  const g0 = new ProtoGame(f, 1, 0, protoById("ladder"), { bpm: 60, legato: false, solo: true, easy: "direction", fail: false, reading: null, until: 4 * f.barTicks }, fakeChip(clock));
  assert.equal(g0.lineAt(0, 0).lineDb, undefined);
});

// ---- The three zones ----

test("D385: the piano's three zones across the strip: soft −3, normal 0, strong +3 dB about the line; the soft recording under −1.5 dB; an accent's own weight in the strong zone", () => {
  assert.deepEqual([0, 0.2, 0.33, 0.34, 0.5, 0.66, 0.67, 0.9, 1].map(pianoZone), [0, 0, 0, 1, 1, 1, 2, 2, 2]);
  near(STRONG_ZONE_FROM, 2 / 3);
  assert.deepEqual(PIANO_ZONE_DB, [-3, 0, 3]);
  near(pianoDb(0.5), 0);
  near(pianoDb(0.1, { lineDb: -6.5 }), -9.5);
  near(pianoDb(0.9, { lineDb: 3.5, accentDb: 6 }), 9.5);
  near(pianoDb(0.5, { accentDb: 6 }), 0, 1e-9, "an accent landed in the normal zone: no weight");
  // The layer by the level struck: a p line in the normal zone on the soft recording; mf strong on the firm.
  assert.equal(landing("piano", 0.5, 64, PATCHES.pianoSampled, true, { lineDb: -6.5 }).layer, "soft");
  assert.equal(landing("piano", 0.9, 64, PATCHES.pianoSampled, true, {}).layer, "firm");
  assert.ok(PIANO_SOFT_BELOW_DB === -1.5);
  // The loudness is the dB asked, the soft recording's own −2 dB made up.
  for (const [x, line] of [[0.1, -6.5], [0.5, 0], [0.9, 3.5]] as const) {
    const l = landing("piano", x, 64, PATCHES.pianoSampled, true, { lineDb: line });
    near(20 * Math.log10(l.level!) + (l.layer === "soft" ? PIANO_SOFT_NET_DB : 0), pianoDb(x, { lineDb: line }), 1e-9);
  }
  // Three steps only: nothing between (the ±4 dB smear gone).
  const dbs = new Set(Array.from({ length: 101 }, (_, k) => pianoDb(k / 100).toFixed(3)));
  assert.equal(dbs.size, 3);
});

// ---- 3. Accents as weight on time ----

test("D385: the accent judged as weight on time: the strong zone within the PERFECT window; late (the old lean) or soft is no accent; no zone asked off the bars", () => {
  assert.equal(accentWeighted(0, 70, 0.9), null);
  assert.equal(accentWeighted(-60, 70, 0.7), null);
  assert.equal(accentWeighted(90, 70, 0.9), "late", "a lean is not an accent any more");
  assert.equal(accentWeighted(-90, 70, 0.9), "early");
  assert.equal(accentWeighted(0, 70, 0.5), "soft");
  assert.equal(accentWeighted(0, 70, null), null, "a computer's keys: the timing alone");
  // The legend and the tutorial (en, pt, es) teach weight on time, no longer "silence then late".
  assert.match(markLegend().find((m) => m.kind === "strong")!.text, /STRONG ZONE/);
  const lesson = src("src/bench/manual/lessons.ts");
  assert.doesNotMatch(lesson, /hair late: the little silence|you make room before the note|lift the note before it a moment early/);
  assert.match(lesson, /press it harder, on time: land it in the strong zone/);
  for (const f of ["src/i18n/pt.ts", "src/i18n/es.ts", "src/i18n/course2-pt.ts", "src/i18n/course2-es.ts", "src/i18n/manual-pt.ts", "src/i18n/manual-es.ts"]) assert.doesNotMatch(src(f), /LEAN IN A HAIR LATE|land on this one a hair late|A small silence before the note/, f);
  assert.match(src("src/i18n/pt.ts"), /ACENTO: POUSE NA ZONA FORTE/);
  assert.match(src("src/i18n/es.ts"), /ACENTO: POSA EN LA ZONA FUERTE/);
});

// ---- 4. Slur and legato, phrases ----

test("D385: slur, legato and phrase are three dimensions: a slur shaped by its place in the bar, legato even, a phrase an arch with a breath", () => {
  assert.equal(slurShapeDb("first", true), 1.5);
  assert.equal(slurShapeDb("first", false), 0.5);
  assert.equal(slurShapeDb("mid", true), -2.5);
  assert.equal(slurShapeDb("last", true), -1.5);
  assert.equal(slurShapeDb("last", false), -3.75);
  // 3–4 dB between the strongest and the weakest.
  const span = slurShapeDb("first", true) - slurShapeDb("last", false);
  assert.ok(span >= 3 && span <= 5.5);
  near(phraseArchDb(0), -1.25);
  near(phraseArchDb(0.5), 2.5);
  // I/8 (Busoni's long arcs): a phrase's notes joined inside, its last let go (a breath); the arch heard in the band.
  const f = fugueById("wtc1f08");
  const plan = wholePlan(f, busoni("wtc1f08"))!;
  const notes = accompaniment(f, 0, -1);
  const sh = phrase(notes, beatOf(f).ticks, (t) => inBar(f, t), subjectMarks(f).subject, "piano", phraseContext(f, tempoOf(f.id), wholeMarks(plan), plan));
  let lasts = 0;
  notes.forEach((n, i) => {
    const g = plan.notes.get(`${n.voice}:${n.on}`);
    if (g?.phrase?.last && !g.arts.size && sh[i].art !== "plain" && sh[i].art !== "short") {
      assert.ok(sh[i].hold <= PHRASE_BREATH_HOLD + 1e-9, `${n.voice}:${n.on} breath`);
      lasts++;
    }
  });
  assert.ok(lasts > 5, `${lasts} phrase ends breathed`);
  // Legato (a join outside a slur) carries no slur shape: the same dB as with no marks there.
  const legatoOnly = notes.findIndex((n) => {
    const g = plan.notes.get(`${n.voice}:${n.on}`);
    return g?.join === true && !g.slur && !g.phrase;
  });
  if (legatoOnly >= 0) assert.equal(plan.notes.get(`${notes[legatoOnly].voice}:${notes[legatoOnly].on}`)!.slur, undefined);
});

// ---- 5. Palettes ----

test("D385: a palette per Busoni word: voicing, weight, articulation, a sparing pedal, colour; no tempo", () => {
  assert.equal(paletteOfWord("Allegretto, vivacemente."), "light");
  assert.equal(paletteOfWord("non legg."), "heavy");
  assert.equal(paletteOfWord("meno legg."), "even");
  assert.equal(paletteOfWord("(Largo.) Andante grave e solenne."), "grave");
  assert.equal(paletteOfWord("delicato / zart"), "dolce");
  assert.equal(paletteOfWord("nobilmente espressivo, un poco pesante"), "espressivo");
  assert.equal(paletteOfWord("mit Bedeutung / marcato"), "marcato");
  assert.equal(paletteOfWord("cresc."), null);
  for (const p of Object.values(PALETTES)) {
    assert.ok(p.dampMul <= 1.8 + 1e-9, `${p.name}: a sparing pedal`);
    assert.ok(!("tempo" in p) && !("nudge" in p), `${p.name}: no tempo`);
  }
  // I/2's heading (vivacemente) light; the bass's "non legg." (bar 26) heavy; I/24 grave, its dolce episodes dolce.
  const p2 = wholePlan(fugueById("wtc1f02"), busoni("wtc1f02"))!;
  assert.equal(p2.paletteAt(1, 1000).name, "light");
  assert.equal(p2.paletteAt(2, (27 - 1) * 7680).name, "heavy");
  const f24 = fugueById("wtc1f24");
  const p24 = wholePlan(f24, busoni("wtc1f24"))!;
  assert.equal(p24.paletteAt(0, 0).name, "grave");
  assert.equal(p24.paletteAt(0, (19 - 1) * f24.barTicks).name, "dolce");
  // In the band: the grave tread's half pedal and room, the light's drier, shorter notes.
  const notes = accompaniment(f24, 0, -1);
  const sh = phrase(notes, beatOf(f24).ticks, (t) => inBar(f24, t), subjectMarks(f24).subject, "piano", phraseContext(f24, tempoOf(f24.id), wholeMarks(p24), p24));
  const i = notes.findIndex((n) => n.on < f24.barTicks);
  assert.equal(sh[i].dampMul, PALETTES.grave.dampMul);
  assert.equal(sh[i].roomMul, PALETTES.grave.roomMul);
});

// ---- 2. The pianistic trill ----

const gridParts = (from: number, ticks: number, unit: number, main: number, up: number, lower?: number): [number, number, number][] => {
  const out: [number, number, number][] = [];
  for (let t = from, k = 0; t < from + ticks; t += unit, k++) out.push([t, unit, k % 2 ? main : up]);
  if (lower !== undefined) out.splice(-2, 2, [out.at(-2)![0], unit, lower], [out.at(-1)![0], unit, main]);
  return out;
};

test("D385: the pianistic trill: not snapped to the beat's grid, a lean then accelerating, uneven, lighter upper notes, overlapped with half-seated dampers", () => {
  const tps = 1920; // a crotchet a second
  const grid = gridParts(0, 2 * 1920, 120, 68, 69, 66);
  const tr = pianoTrill(grid, 68, tps, { start: "upper", nachschlag: true, character: "singing" })!;
  const ms = tr.parts.map((p) => (p[1] / tps) * 1000);
  // The first leaned, the speed rising (the middle quicker than the start), never above 14 a second.
  assert.ok(ms[0] > 1.4 * ms[3], `lean ${ms[0]} vs ${ms[3]}`);
  assert.ok(ms[2] + ms[3] > ms[10] + ms[11], "accelerating");
  assert.ok(Math.min(...ms) >= 1000 / 14 - 25, "never far above 14 a second");
  // Not on the grid: the lengths differ, and the onsets are not the grid's.
  assert.ok(new Set(ms.map((x) => x.toFixed(0))).size > 5);
  const unit = trillUnit(1, 10) * 1920;
  assert.ok(tr.parts.slice(1, -2).some((p) => Math.abs(p[0] / unit - Math.round(p[0] / unit)) > 0.05), "off the beat's grid");
  // The same every run (a hash, never random).
  assert.deepEqual(pianoTrill(grid, 68, tps, { start: "upper", nachschlag: true, character: "singing" }), tr);
  // Lighter auxiliary notes; the first leaned louder; overlap with dampers half-seated.
  const aux = tr.db.filter((_, k) => tr.aux[k] && k > 0);
  const main = tr.db.filter((_, k) => !tr.aux[k]);
  assert.ok(aux.reduce((a, b) => a + b, 0) / aux.length < main.reduce((a, b) => a + b, 0) / main.length - 1.5);
  assert.ok(tr.over.slice(0, -1).every((o) => o === PIANO_TRILL.overlap) && tr.over.at(-1) === 0);
  assert.ok(PIANO_TRILL.dampMul > 1);
  // The two pitches told apart for the recordings (the partner of each note).
  assert.ok(tr.partner.every((p, k) => p !== tr.parts[k][2] || tr.parts[k][2] === 68));
});

test("D385: the trill's terminations: the Nachschlag at cruising speed into the main note, else a settle on the main note; from the upper note or Busoni's main note; the span kept", () => {
  const tps = 1920;
  const grid = gridParts(960, 3 * 1920, 120, 68, 69, 66);
  const end = 960 + 3 * 1920;
  const n = pianoTrill(grid, 68, tps, { nachschlag: true })!;
  const last = n.parts.at(-1)!;
  assert.equal(last[2], 68);
  assert.equal(n.parts.at(-2)![2], 66, "the lower note before the last");
  near(n.parts.at(-2)![1] / tps, 1 / TRILL_CHARACTERS.singing.rate1, 1e-6, "at cruising speed");
  near(last[0] + last[1], end, 1e-6, "the span kept");
  assert.equal(n.parts[0][2], 69, "from the upper note (Bach)");
  near(n.parts[0][0], 960);
  const s = pianoTrill(gridParts(960, 3 * 1920, 120, 68, 69), 68, tps, { nachschlag: false, start: "main" })!;
  assert.equal(s.parts[0][2], 68, "from the main note (Busoni)");
  const settle = s.parts.at(-1)!;
  assert.equal(settle[2], 68);
  assert.ok(settle[1] / (3 * 1920) >= PIANO_TRILL.settle - 0.03, "settled on the main note");
  assert.ok(!s.parts.some((p) => p[2] < 68), "no lower note without the Nachschlag");
  // The character by the tempo.
  assert.equal(trillCharacter(1.4), "relaxed");
  assert.equal(trillCharacter(0.7), "singing");
  assert.equal(trillCharacter(0.4), "brilliant");
  assert.equal(pianoTrill([[0, 100, 60]], 60, tps), undefined, "no room: the realisation as it was");
});

test("D385: the band's trill on the piano is the pianist's (I/24 bar 3, Busoni's reading: from the main note); on the harpsichord the grid as before", () => {
  const f = fugueById("wtc1f24");
  const run = (preset: string) => {
    setPreset(preset);
    const clock = { t: 0 };
    const log: { midi: number; at: number; dur: number; p: Play }[] = [];
    const g = new ProtoGame(f, 3, 0, protoById("ladder"), { bpm: tempoOf(f.id), legato: false, solo: false, easy: "direction", fail: false, reading: busoni("wtc1f24"), until: 4 * f.barTicks }, fakeChip(clock, log));
    g.rows = ROWS;
    g.wall = () => clock.t * 1000;
    const t1 = g.timeAt(4 * f.barTicks);
    while (clock.t < t1) (clock.t += 0.02), g.step();
    return log.filter((x) => (x.midi === 68 || x.midi === 69) && x.at >= g.timeAt(19200) - 0.05 && x.at < g.timeAt(19200 + 7680));
  };
  const all = run("pianoSampled");
  // The trill's notes: those of the G♯ (to the next note of the alto).
  const piano = all.slice(0, Math.max(1, all.findIndex((x) => x.p.altSample === undefined)));
  assert.ok(piano.length > 8, `${piano.length} trill notes`);
  assert.equal(piano[0].midi, 68, "from the main note (Busoni)");
  assert.ok(piano.every((x) => x.p.dampMul && x.p.altSample !== undefined), "half-seated dampers, two recordings");
  const iois = piano.slice(1).map((x, k) => +(x.at - piano[k].at).toFixed(4));
  assert.ok(new Set(iois.map((x) => x.toFixed(3))).size > 4, "uneven");
  const harp = run("harpsichordSampled");
  const hi = harp.slice(1).map((x, k) => +(x.at - harp[k].at).toFixed(3));
  assert.ok(harp.every((x) => x.p.altSample === undefined), "the harpsichord as before");
  assert.ok(new Set(hi.slice(1, -3)).size <= 3, "the harpsichord on the grid");
  setPreset("pianoSampled");
});

// ---- Time: the ending and the fermatas ----

test("D385: the final slowing where Busoni marks it (his first word, his speed), else the automatic RIT_END; mid-piece tempo words not played", () => {
  near(RIT_END, 0.78);
  near(endSpeedOf("rall."), 0.78);
  near(endSpeedOf("allargando"), 0.82);
  near(endSpeedOf("poco largamente"), 1 - 0.16 / 2);
  near(endSpeedOf("pochissimo riten."), 1 - 0.22 / 4);
  const f2 = fugueById("wtc1f02");
  assert.deepEqual(endingOf(busoni("wtc1f02").whole, f2.length, f2.barTicks), { from: 215040, end: 0.78 }, "I/2: poco largamente (bar 29) and rall.: from bar 29");
  const f8 = fugueById("wtc1f08");
  assert.equal(endingOf(busoni("wtc1f08").whole, f8.length, f8.barTicks)!.from, 652800, "I/8: allargando (bar 86), not largamente (bar 60)");
  const f16 = fugueById("wtc1f16");
  assert.equal(endingOf(busoni("wtc1f16").whole, f16.length, f16.barTicks), null, "I/16: none marked");
  const f1 = fugueById("wtc1f01");
  assert.equal(endingOf(busoni("wtc1f01").whole, f1.length, f1.barTicks)!.from, 195840, "I/1: sostenuto (bar 26), not pochissimo riten. (bar 13, a tempo after)");
  // D392: I/4's largamente nine bars from the end of 115 (the last tenth), I/6's "allarg.", I/20's "Più largo"; I/22 none.
  near(endSpeedOf("allarg."), 0.82);
  near(endSpeedOf("Più largo"), 0.84);
  const f4 = fugueById("wtc1f04");
  assert.deepEqual(endingOf(busoni("wtc1f04").whole, f4.length, f4.barTicks), { from: 106 * f4.barTicks, end: 0.84 }, "I/4: largamente from bar 107");
  const f6 = fugueById("wtc1f06");
  assert.deepEqual(endingOf(busoni("wtc1f06").whole, f6.length, f6.barTicks), { from: 42 * f6.barTicks, end: 0.82 }, "I/6: allarg. from bar 43");
  const f22 = fugueById("wtc1f22");
  assert.equal(endingOf(busoni("wtc1f22").whole, f22.length, f22.barTicks), null, "I/22: none marked");
  for (const id of ["wtc1f12", "wtc1f14", "wtc1f15", "wtc1f18", "wtc1f20", "wtc1f23"]) {
    const f = fugueById(id);
    assert.ok(endingOf(busoni(id).whole, f.length, f.barTicks)!.end < 1, `${id}: an ending slowing`);
  }
  // D394: Book II. "sino al fine" runs to the end wherever it stands (II/3 five bars from the end, II/8 seven);
  // sostenendo a slowing like sostenuto; II/10's "Meno" three bars from the end; II/16 from più grave (bar 80) at allarg.'s speed.
  near(endSpeedOf("sostenendo"), 0.86);
  near(endSpeedOf("Meno"), 0.88);
  const ending = (id: string) => {
    const f = fugueById(id);
    const e = endingOf(busoni(id).whole, f.length, f.barTicks);
    return e && { bar: f.bars.filter((b) => b.on <= e.from).at(-1)!.n, end: e.end };
  };
  assert.deepEqual(ending("wtc2f03"), { bar: 31, end: 0.84 }, "II/3: più largamente sino al fine");
  assert.deepEqual(ending("wtc2f08"), { bar: 40, end: 0.86 }, "II/8: Sostenendo sino al Fine");
  assert.deepEqual(ending("wtc2f10"), { bar: 83, end: 0.88 }, "II/10: Meno");
  assert.deepEqual(ending("wtc2f16"), { bar: 80, end: 0.82 }, "II/16: più grave, allarg.");
  for (const id of ["wtc2f02", "wtc2f06", "wtc2f07", "wtc2f17", "wtc2f18", "wtc2f21"]) assert.ok(ending(id)!.end < 1, `${id}: an ending slowing`);
  for (const id of ["wtc2f01", "wtc2f22", "wtc2f24"]) assert.equal(ending(id), null, `${id}: none marked`);
  const g4 = new ProtoGame(f4, 0, 0,protoById("ladder"), { bpm: 60, legato: false, solo: true, easy: "direction", fail: false, reading: busoni("wtc1f04") }, fakeChip({ t: 0 }));
  const b4 = (bar: number) => g4.timeAt((bar - 1) * f4.barTicks + f4.tpq) - g4.timeAt((bar - 1) * f4.barTicks);
  assert.ok(Math.abs(b4(105) - b4(100)) < 1e-6 && b4(110) > b4(105) + 1e-3 && b4(115) > b4(110), "I/4 broadens from bar 107 to the end");
  // In the game: I/2 by Busoni slows from bar 29; with no reading the last two bars as before; I/16 by Busoni the automatic ritard.
  const game = (f: ReturnType<typeof fugueById>, r: Reading | null) => new ProtoGame(f, 0, 0, protoById("ladder"), { bpm: 60, legato: false, solo: true, easy: "direction", fail: false, reading: r }, fakeChip({ t: 0 }));
  const beatS = (g: ProtoGame, bar: number, f: ReturnType<typeof fugueById>) => g.timeAt((bar - 1) * f.barTicks + f.tpq) - g.timeAt((bar - 1) * f.barTicks);
  const gb = game(f2, busoni("wtc1f02"));
  const g0 = game(f2, null);
  near(beatS(gb, 28, f2), 1, 1e-6, "bar 28 steady");
  assert.ok(beatS(gb, 29, f2) > 1.005 && beatS(g0, 29, f2) < 1 + 1e-6, "Busoni's broadening from bar 29; the automatic from bar 30");
  assert.ok(beatS(g0, 31, f2) > 1.1, "the automatic ritard kept where Busoni is not played");
  const g16 = game(f16, busoni("wtc1f16"));
  const r16 = ritard(f16.length, f16.barTicks);
  const t = f16.length - f16.barTicks;
  near(g16.timeAt(t) - g16.timeAt(t - f16.barTicks), (r16.warp(t) - r16.warp(t - f16.barTicks)) / f16.tpq, 1e-6, "I/16: RIT_END");
});

test("D385: fermatas held where every voice holds (time stretched there only); the warp inverts", () => {
  const f = fugueById("wtc1f02");
  const plan = wholePlan(f, busoni("wtc1f02"))!;
  assert.deepEqual(plan.fermatas.map((x) => x.a), [234240], "the final chord");
  const base = ritard(f.length, f.barTicks, 215040, 0.78);
  const w = withHolds(base, plan.fermatas);
  for (const t of [0, 100000, 234000, 234240, 236000, 238080]) near(w.unwarp(w.warp(t)), t, 1e-3, `${t}`);
  near(w.warp(200000), base.warp(200000), 1e-9, "nothing before moves");
  near(w.warp(f.length) - base.warp(f.length), plan.fermatas[0].x, 1e-6, "the chord held 1.8 × its value");
});
