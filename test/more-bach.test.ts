/**
 * D340 (WTC 1.54): the MORE BACH and CHORALES tabs: the importers' pieces (counts, voices, bars), their
 * tempi, sounds and credits, the tabs' sections, and one game of each kind played through headless.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { beatOf, CHORALES, fugueById, loadExtras, MORE_BACH } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { MORE_TEMPO, standardTempo, tempoOf } from "../src/touch/tempi.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { characterOf } from "../src/touch/character.ts";
import { ProtoGame, type Contact, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { startTick, voicesFrom } from "../src/touch/voice-mode.ts";
import { defaultVoice } from "../src/bench/flow.ts";
import { CHORALE_IDS, LITE_TABS, liteExtra, liteLevel, liteNextOrder, liteTabOf, MORE_SECTIONS } from "../src/bench/lite.ts";
import { waitPoints } from "../src/bench/band-time.ts";

// D343: the notes load on demand (a chunk of their own on play.html).
await loadExtras();

const count = (c: string) => MORE_BACH.filter((f) => f.collection === c).length;
const lastBar = (id: string) => fugueById(id).bars.at(-1)!.n;

test("D340: MORE BACH: the Art of Fugue (11 contrapuncti, 2 mirror fugues each rectus and inversus, 4 canons), 2 ricercars, 15 inventions, 15 sinfonias, 3 concerto movements", () => {
  // D341: and the motet BWV 228 (two sections) and the cantata BWV 54 (movements 1 and 3), from IMSLP.
  // D348: and the harpsichord concertos, 39 movements (test/d348-concertos.test.ts); D351: 42 with BWV 1059R.
  assert.equal(MORE_BACH.length, 58 + 42);
  assert.deepEqual([count("aof"), count("mo"), count("inv"), count("sin"), count("concerto"), count("motet"), count("cantata"), count("hconcerto")], [19, 2, 15, 15, 3, 2, 2, 42]);
  assert.equal(new Set(MORE_BACH.map((f) => f.id)).size, 58 + 42);
  for (const f of MORE_BACH) {
    assert.equal(fugueById(f.id), f);
    assert.equal(f.voices.length, f.voiceNames.length, f.id);
    // (BWV 228's second section: choir II sings only its last six bars. D348: a concerto's band may rest a movement, or nearly: the strings in BWV 1061's Adagio, a harpsichord's inner notes; the voices offered sound.)
    if (f.collection === "hconcerto") assert.ok(f.playable!.every((v) => f.voices[v].length > 20), `${f.id}: every voice offered sounds`);
    else assert.ok(f.voices.every((v) => v.length > (f.id === "bwv228-2" ? 15 : 20)), `${f.id}: every voice sounds`);
    assert.ok(f.bars.length > 10 && f.length > 0 && f.credit && (f.source?.includes("mutopiaproject.org") || f.source?.includes("imslp.org") || f.source?.includes("musescore.com")), f.id);
    // The notes sorted, inside the piece, on staff steps that agree with their pitch (C4 = 28).
    for (const v of f.voices) for (let i = 0; i < v.length; i++) {
      const [on, dur, midi, step] = v[i];
      assert.ok(on >= 0 && dur > 0 && on + dur <= f.length && (i === 0 || v[i - 1][0] <= on), `${f.id}: note ${i}`);
      assert.ok(Math.abs(step - (28 + ((midi - 60) * 7) / 12)) <= 1.5, `${f.id}: step ${step} for MIDI ${midi}`);
    }
  }
});

test("D340: MORE BACH's voices and bars, as the editions have them (and the second sources: data/sources/*/SOURCE.md)", () => {
  const voices = (id: string) => fugueById(id).voices.length;
  for (const n of ["01", "02", "03", "04", "05", "06", "07", "09", "10", "11", "12r", "12i"]) assert.equal(voices(`bwv1080-${n}`), 4, n);
  for (const n of ["08", "13r", "13i"]) assert.equal(voices(`bwv1080-${n}`), 3, n);
  for (const n of ["c14", "c15", "c16", "c17"]) assert.equal(voices(`bwv1080-${n}`), 2, n);
  assert.equal(voices("bwv1079-ric3"), 3);
  assert.equal(voices("bwv1079-ric6"), 6);
  for (let b = 772; b <= 786; b++) assert.equal(voices(`bwv${b}`), 2, String(b));
  for (let b = 787; b <= 801; b++) assert.equal(voices(`bwv${b}`), 3, String(b));
  for (let m = 1; m <= 3; m++) assert.deepEqual(fugueById(`bwv1043-${m}`).voiceNames, ["Solo Violin I", "Solo Violin II", "Violin I", "Violin II", "Viola", "Continuo"]);
  const bars: Record<string, number> = {
    "bwv1080-01": 78, "bwv1080-02": 84, "bwv1080-03": 72, "bwv1080-04": 138, "bwv1080-08": 188, "bwv1080-11": 184,
    "bwv1080-12r": 56, "bwv1080-13i": 71, "bwv1080-c14": 109, "bwv1080-c15": 103, "bwv1080-c16": 82, "bwv1080-c17": 78,
    "bwv1079-ric3": 185, "bwv1079-ric6": 206, bwv772: 22, bwv777: 62, bwv787: 21, bwv797: 72, bwv801: 39,
    "bwv1043-1": 88, "bwv1043-2": 50, "bwv1043-3": 154, "bwv228-1": 77, "bwv228-2": 154, "bwv54-1": 55, "bwv54-3": 72,
  };
  for (const [id, n] of Object.entries(bars)) assert.equal(lastBar(id), n, id);
  assert.equal(fugueById("bwv1043-3").bars[0].n, 0, "the finale's upbeat is bar 0");
});

test("D340: what the pipeline computes for the WTC: entries in the fugues, inventions and sinfonias (none in the canons and the concerto), cadences, keys, tempi, sounds, characters", () => {
  for (const f of MORE_BACH) {
    const fugal = !["concerto", "hconcerto"].includes(f.collection!) && !f.id.startsWith("bwv1080-c") && !["bwv228-1", "bwv54-1"].includes(f.id);
    if (fugal) assert.ok(f.entries.length >= 2, `${f.id}: ${f.entries.length} entries`);
    else assert.equal(f.entries.length, 0, f.id);
    for (const e of f.entries) assert.ok(f.voices[e.voice].some((n) => n[0] === e.on), `${f.id}: entry at ${e.on} on a note`);
    assert.ok(f.keys.length > 0 && f.keys.every((k, i) => i === 0 || f.keys[i - 1].on <= k.on), `${f.id}: keys`);
    assert.ok(f.cadences.every((c) => c.on >= 0 && c.on <= f.length), f.id);
    const t = MORE_TEMPO[f.id];
    assert.ok(t && t.normal >= 40 && t.normal <= 120 && tempoOf(f.id) === t.normal && standardTempo(f.id) === t.median, `${f.id}: tempo`);
    assert.ok(PIECE_SOUND[f.id], `${f.id}: sound`);
    assert.ok(["antico", "neutral", "lively"].includes(characterOf(f.id)));
  }
  // The fugues of more than two voices close with cadences, as the WTC's.
  for (const f of MORE_BACH.filter((x) => x.collection === "aof" && x.voices.length > 2)) assert.ok(f.cadences.length > 0, f.id);
  // Contrapunctus 1: its subject enters in every voice in the exposition.
  assert.deepEqual([...new Set(fugueById("bwv1080-01").entries.slice(0, 4).map((e) => e.voice))].sort(), [0, 1, 2, 3]);
  // Moderate tempi for the concerto (period bands, a little under), strings for it, the organ for the chorales.
  assert.ok(tempoOf("bwv1043-1") >= 76 && tempoOf("bwv1043-1") <= 100);
  assert.ok(tempoOf("bwv1043-2") <= 66);
  assert.ok(tempoOf("bwv1043-3") >= 84 && tempoOf("bwv1043-3") <= 126);
  assert.equal(PIECE_SOUND["bwv1043-1"], "super16");
  assert.equal(PIECE_SOUND.chor001, "chamberOrgan");
  // D355: the Art of Fugue each its own sound (Contrapunctus 5, the counter-fugue, on SUPER 16-BIT), Contrapunctus 14 still the harpsichord.
  assert.equal(PIECE_SOUND["bwv1080-05"], "super16");
  assert.equal(PIECE_SOUND["bwv1080-14"], "harpsichordSampled");
});

test("D340: the concerto offers the two solo violins only; a chorale its soprano first", () => {
  const c = fugueById("bwv1043-1");
  assert.deepEqual(voicesFrom(c, 0), [0, 1]);
  assert.ok([0, 1].includes(defaultVoice(c, voicesFrom(c, 0))));
  const ch = fugueById("chor001");
  assert.deepEqual(voicesFrom(ch, 0), [0, 1, 2, 3]);
  assert.equal(defaultVoice(ch, voicesFrom(ch, 0)), 0);
});

test("D340: CHORALES: Sapp's 370, four voices each, every fermata held a beat longer than written, the band waiting after it", () => {
  assert.equal(CHORALES.length, 370);
  assert.ok(!CHORALES.some((f) => f.id === "chor150"), "no. 150 is not four-part (omitted upstream)");
  for (const f of CHORALES) {
    assert.equal(f.voices.length, 4, f.id);
    assert.ok(f.voices.every((v) => v.length > 5), f.id);
    assert.ok(f.fermatas && f.fermatas.length >= 2 && f.bandTime === "waits", `${f.id}: fermatas`);
    assert.ok(MORE_TEMPO[f.id] && tempoOf(f.id) >= 50 && tempoOf(f.id) <= 90, `${f.id}: tempo`);
    assert.ok(f.credit?.includes("CC BY-NC-SA 4.0"));
  }
  // No. 1 (BWV 269, 3/4): six fermatas; after the first (the half note A4 of bar 4, written at 5/2 whole notes) the music resumes a beat late.
  const f = fugueById("chor001");
  const beat = beatOf(f).ticks;
  assert.equal(f.fermatas!.length, 6);
  const sop = f.voices[0];
  const ferm = sop.find((n) => n[0] === 10 * f.tpq)!;
  assert.equal(ferm[2], 69);
  assert.equal(ferm[1], 2 * f.tpq + beat, "the fermata's half note held a beat more");
  assert.equal(f.fermatas![0], 12 * f.tpq + beat);
  assert.ok(sop.some((n) => n[0] === f.fermatas![0]), "the next note where the music goes on");
  // The band's wait points (D328's WAITS) fall on the player's first note after each fermata.
  const waits = waitPoints(sop.map((n) => ({ on: n[0] })) as never, f.fermatas!.map((on) => ({ on })), { from: 0, until: f.length, beat, barTicks: f.barTicks, endsPiece: true });
  for (const t of f.fermatas!.filter((t) => t < f.length)) assert.ok(waits.some((w) => w.tick === t), `a wait at ${t}`);
});

test("D340: the tabs: BOOK I, BOOK II, MORE BACH (its five sections, Contrapunctus 14 closing the Art of Fugue), CHORALES", () => {
  assert.deepEqual(LITE_TABS.map(([t]) => t), ["I", "II", "MORE", "CHORALES"]);
  assert.deepEqual(MORE_SECTIONS.map((s) => s.title), ["ART OF FUGUE", "MUSICAL OFFERING", "INVENTIONS", "SINFONIAS", "CONCERTO", "HARPSICHORD CONCERTOS", "MOTET", "CANTATA"]);
  assert.deepEqual(MORE_SECTIONS.map((s) => s.ids.length), [20, 2, 15, 15, 3, 42, 2, 2]);
  assert.equal(MORE_SECTIONS[0].ids.at(-1), "bwv1080-14");
  assert.equal(CHORALE_IDS.length, 370);
  assert.equal(liteTabOf("bwv1080-14"), "MORE");
  assert.equal(liteTabOf("chor001"), "CHORALES");
  assert.equal(liteTabOf("wtc2f03"), "II");
  assert.ok(liteExtra("bwv772") && !liteExtra("wtc1f01"));
  assert.equal(liteNextOrder("bwv772")[liteNextOrder("bwv772").indexOf("bwv772") + 1], "bwv773");
  for (const id of ["bwv1080-05", "bwv772", "chor001"]) assert.ok(["EASY", "NORMAL", "HARD"].includes(liteLevel(id).label));
});

// --- One game of each kind, played through on LADDER, every note on time (as bench-protos' playThrough).
const [W, H] = [800, 400];
const ROWS: Rows = { yOf: (s) => 900 - s * 16, stepAt: (y) => Math.round((900 - y) / 16), rowH: 16, xOf: () => W / 2 };
function fakeChip(clock: { t: number }) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
}
function playThrough(piece: string, voice: number) {
  const f = fugueById(piece);
  const clock = { t: 0 };
  const g = new ProtoGame(f, [voice], startTick(f, 0), protoById("ladder"), { bpm: tempoOf(piece), legato: false }, fakeChip(clock));
  g.rows = ROWS;
  const runTo = (t: number) => {
    while (clock.t < t - 0.05) (clock.t += 0.05), g.step();
    clock.t = Math.max(clock.t, t);
  };
  const tr = g.tracks[0];
  const heads = tr.notes.map((n, i) => (n.ride || (i > 0 && tr.notes[i - 1].on === n.on) ? -1 : i)).filter((i) => i >= 0);
  let id = 0;
  for (const i of heads) {
    const n = tr.notes[i];
    const t0 = g.timeAt(n.on);
    runTo(t0);
    g.step();
    const top = Math.max(...tr.notes.filter((x) => x.on === n.on).map((x) => x.step));
    const c: Contact = { side: "left", x: W * 0.1, y: ROWS.yOf(top), w: W, h: H };
    g.down(++id, c, performance.now());
    runTo(t0 + 0.02);
    g.up(id, performance.now());
  }
  runTo(g.timeAt(g.end + 1));
  g.step();
  return g.results();
}

test("D340: a game of each kind runs headless to the end, every note right: a contrapunctus, a canon, a mirror fugue, a ricercar, an invention, a sinfonia, the concerto (Solo Violin II), a chorale (the band waiting after its fermatas)", () => {
  for (const [piece, voice] of [["bwv1080-03", 1], ["bwv1080-c17", 0], ["bwv1080-13i", 2], ["bwv1079-ric3", 0], ["bwv772", 0], ["bwv787", 2], ["bwv1043-2", 1], ["bwv228-2", 1], ["bwv54-3", 2], ["chor001", 0], ["chor002", 3]] as const) {
    const r = playThrough(piece, voice);
    assert.ok(r.of > 20 && r.right === r.of, `${piece} v${voice}: ${r.right}/${r.of} (wrong ${r.wrong}, missed ${r.missed})`);
  }
});

test("D341: BWV 228 in two sections (eight voices, then the fugue and chorale of choir I, choir II's last bars the band's) and BWV 54's arias, their non-commercial licences credited", () => {
  const a = fugueById("bwv228-1");
  const b = fugueById("bwv228-2");
  assert.deepEqual([a.voices.length, a.bars[0].n, a.bars.at(-1)!.n], [8, 1, 77]);
  assert.deepEqual([b.bars[0].n, b.bars.at(-1)!.n, b.bars[0].on], [78, 154, 0]);
  assert.deepEqual(voicesFrom(b, 0), [0, 1, 2, 3]);
  assert.equal(defaultVoice(b, voicesFrom(b, 0)), 1);
  // Choir II is silent from bar 78 to 148.
  const b149 = b.bars.find((x) => x.n === 149)!.on;
  assert.ok(b.voices.slice(4).every((v) => v.every((n) => n[0] >= b149)));
  assert.ok(b.entries.some((e) => e.voice >= 1 && e.voice <= 3), "the fugue's entries in alto, tenor, bass");
  assert.equal(PIECE_SOUND["bwv228-1"], "soloVoices");
  for (const id of ["bwv228-1", "bwv228-2"]) assert.match(fugueById(id).credit!, /CC BY-NC 3\.0/);
  const c = fugueById("bwv54-3");
  assert.deepEqual(c.voiceNames, ["Violins", "Violas", "Alto", "Continuo"]);
  assert.equal(defaultVoice(c, voicesFrom(c, 0)), 2);
  assert.equal(defaultVoice(fugueById("bwv54-1"), voicesFrom(fugueById("bwv54-1"), 0)), 4);
  for (const id of ["bwv54-1", "bwv54-3"]) assert.match(fugueById(id).credit!, /CC BY-NC-SA 4\.0/);
});
