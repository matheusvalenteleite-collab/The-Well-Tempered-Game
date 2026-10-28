/**
 * D348: MORE BACH's HARPSICHORD CONCERTOS (tools/touch/concertos.ts → data/touch/concertos.json): the
 * data's shape, the lines the player may take one note at a time, the right hand offered first, the
 * tempi under the game's load, the sound's layouts, the chunk loaded on demand, the credits, and a game
 * of each kind played through headless.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fugueById, loadExtras, MORE_BACH, MORE_INDEX } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { MORE_TEMPO, tempoOf } from "../src/touch/tempi.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { PATCHES, patchFor, placeFor, presetById, setPreset } from "../src/touch/sound.ts";
import { voicing } from "../src/touch/chip.ts";
import { startTick, voicesFrom } from "../src/touch/voice-mode.ts";
import { defaultVoice } from "../src/bench/flow.ts";
import { MORE_SECTIONS } from "../src/bench/lite.ts";
import { ProtoGame, type Contact, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { CONCERTOS, outline, untrill } from "../tools/touch/concertos.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
// D351: and BWV 1059, verits99's reconstruction (test/d351-tempo-steps.test.ts).
const BWVS = [1052, 1053, 1054, 1055, 1056, 1057, 1058, 1059, 1060, 1061, 1062, 1063, 1064, 1065];
const IDS = BWVS.flatMap((b) => [1, 2, 3].map((m) => `bwv${b}-${m}`));

test("D348: the section is known before the notes load (the index), and its notes are a chunk of their own", async () => {
  const hc = MORE_SECTIONS.find((s) => s.id === "hconcerto")!;
  assert.equal(hc.title, "HARPSICHORD CONCERTOS");
  assert.deepEqual(hc.ids, IDS);
  assert.deepEqual(MORE_INDEX.filter(([, c]) => c === "hconcerto").map(([id]) => id), IDS);
  const fugue = src("src/touch/fugue.ts");
  assert.doesNotMatch(fugue, /^import .*concertos\.json/m, "no static import of the notes");
  assert.match(fugue, /import\("\.\/concertos-data\.ts"\)/);
  assert.match(src("src/touch/concertos-data.ts"), /concertos\.json/);
  // tsc reads the 4 MB file's type from its declaration (tsconfig: allowArbitraryExtensions), not by inference.
  assert.ok(existsSync(new URL("../data/touch/concertos.d.json.ts", import.meta.url)));
  assert.equal(JSON.parse(src("tsconfig.json")).compilerOptions.allowArbitraryExtensions, true);
  await loadExtras();
  assert.equal(MORE_BACH.filter((f) => f.collection === "hconcerto").length, 42);
});

await loadExtras();
const pieces = IDS.map((id) => fugueById(id));

test("D348: 13 concertos, every movement: the voices (each harpsichord's right hand, left hand, inner notes; winds; strings; continuo last), bars as written", () => {
  const count: Record<number, number> = { 1052: 7, 1053: 7, 1054: 7, 1055: 7, 1056: 7, 1057: 9, 1058: 7, 1059: 7, 1060: 10, 1061: 10, 1062: 10, 1063: 11, 1064: 11, 1065: 13 };
  for (const f of pieces) {
    const bwv = Number(f.id.slice(3, 7));
    assert.equal(f.collection, "hconcerto");
    assert.equal(f.voices.length, count[bwv], f.id);
    assert.equal(f.voiceNames.length, f.voices.length);
    assert.equal(f.voiceNames.at(-1), "Continuo");
    assert.match(f.voiceNames[0], /^Harpsichord( I)?, right hand$/);
    assert.match(f.voiceNames[1], /^Harpsichord( I)?, left hand$/);
    assert.ok(f.voiceNames.includes("Violin I") && f.voiceNames.includes("Viola"));
    assert.ok(f.bars.length > 15 && f.bars[0].on === 0 && f.bars.every((b, i) => i === 0 || (b.n === f.bars[i - 1].n + 1 && b.on > f.bars[i - 1].on)), `${f.id}: bars`);
    for (const v of f.voices)
      for (let i = 0; i < v.length; i++) {
        const [on, dur, midi, step] = v[i];
        assert.ok(on >= 0 && dur > 0 && on + dur <= f.length && (i === 0 || v[i - 1][0] <= on), `${f.id}: note ${i}`);
        assert.ok(Math.abs(step - (28 + ((midi - 60) * 7) / 12)) <= 1.5, `${f.id}: step ${step} for MIDI ${midi}`);
      }
    assert.ok(f.entries.length === 0 && f.cadences.length > 0 && f.keys.length > 0, f.id);
  }
  const last = (id: string) => fugueById(id).bars.at(-1)!.n;
  // The bars as the editions have them (and their second editions: data/sources/bach-harpsichord-concertos/SOURCE.md).
  const bars: Record<string, number> = {
    "bwv1052-1": 190, "bwv1052-2": 87, "bwv1052-3": 286, "bwv1053-2": 37, "bwv1053-3": 395, "bwv1054-1": 174, "bwv1055-1": 105, "bwv1055-2": 39,
    "bwv1055-3": 200, "bwv1056-1": 116, "bwv1056-2": 21, "bwv1056-3": 224, "bwv1057-1": 427, "bwv1057-3": 244, "bwv1060-1": 110, "bwv1061-3": 140,
    "bwv1062-2": 50, "bwv1065-3": 123,
  };
  for (const [id, n] of Object.entries(bars)) assert.equal(last(id), n, id);
  // Upbeats as bar 0 (BWV 1062's finale, as BWV 1043's, D340).
  for (const id of ["bwv1053-1", "bwv1055-3", "bwv1058-1", "bwv1060-3", "bwv1062-3"]) assert.equal(fugueById(id).bars[0].n, 0, id);
  // The editions at A = 415 Hz read back up a semitone, spelled in the key: BWV 1055 in A major, BWV 1057 in F, BWV 1058 in G minor.
  const spelled = (id: string) => Object.values(fugueById(id).spell);
  assert.ok(spelled("bwv1055-1").some((s) => /^C#/.test(s)) && !spelled("bwv1055-1").some((s) => /^(Db|Ab)/.test(s)));
  assert.ok(spelled("bwv1057-1").some((s) => /^Bb/.test(s)) && !spelled("bwv1057-1").some((s) => /^(A#|E#)/.test(s)));
  assert.ok(spelled("bwv1058-1").some((s) => /^Bb/.test(s)) && !spelled("bwv1058-1").some((s) => /^(F##|A#)/.test(s)));
  assert.equal(CONCERTOS.length, 14);
});

test("D348: the lines the player may take: each harpsichord's right hand (offered first) and left hand, one note at a time; Violin I where it has a line of its own", () => {
  for (const f of pieces) {
    const n = f.voiceNames.filter((x) => /right hand/.test(x)).length;
    const hands = Array.from({ length: 2 * n }, (_, i) => i);
    assert.deepEqual(f.playable!.filter((v) => v < 2 * n), hands, `${f.id}: every hand offered`);
    const vi = f.voiceNames.indexOf("Violin I");
    assert.ok(f.playable!.every((v) => v < 2 * n || v === vi), f.id);
    assert.deepEqual(voicesFrom(f, 0), f.playable);
    assert.equal(defaultVoice(f, voicesFrom(f, 0)), 0, `${f.id}: the right hand first`);
    for (const v of f.playable!) {
      const line = f.voices[v];
      for (let i = 1; i < line.length; i++) assert.ok(line[i - 1][0] < line[i][0] && line[i - 1][0] + line[i - 1][1] <= line[i][0], `${f.id} ${f.voiceNames[v]}: one note at a time (note ${i})`);
    }
  }
  // Violin I accompanies in the slow movements of the double and triple concertos and BWV 1056's Largo; it rests in BWV 1061's Adagio.
  for (const id of ["bwv1056-2", "bwv1060-2", "bwv1061-2", "bwv1062-2", "bwv1063-2", "bwv1064-2", "bwv1065-2", "bwv1054-2"]) assert.ok(!fugueById(id).playable!.includes(fugueById(id).voiceNames.indexOf("Violin I")), id);
  assert.ok(fugueById("bwv1061-2").voices.slice(-4).every((v) => v.length === 0), "the strings rest in BWV 1061's Adagio");
  assert.ok(fugueById("bwv1052-1").playable!.includes(3));
});

test("D348: the outline (a line one note at a time) and a written-out trill back to its note", () => {
  const T = 1920;
  // A held top note keeps a lower one under it out; a new top note cuts the one before.
  const o = outline([[0, 4 * T, 72, 0], [0, T, 60, 0], [T, T, 62, 0], [4 * T, T, 74, 0], [4.5 * T, T, 76, 0]], true);
  assert.deepEqual(o.line.map((n) => [n[0], n[1], n[2]]), [[0, 4 * T, 72], [4 * T, 0.5 * T, 74], [4.5 * T, T, 76]]);
  assert.equal(o.rest.length, 2);
  const low = outline([[0, T, 48, 0], [0, T, 55, 0], [T, T, 50, 0]], false);
  assert.deepEqual(low.line.map((n) => n[2]), [48, 50]);
  // D-C-D-C… in demisemiquavers, then a turn: one C as long as the trill, the turn kept.
  const d = T / 8;
  const trill = [74, 72, 74, 72, 74, 72].map((m, i) => [i * d, d, m, 0] as [number, number, number, number]);
  const u = untrill([...trill, [6 * d, d, 71, 0], [7 * d, d, 72, 0]], T);
  assert.equal(u.trills, 1);
  assert.deepEqual(u.line.map((n) => [n[0], n[1], n[2]]), [[0, 6 * d, 72], [6 * d, d, 71], [7 * d, d, 72]]);
  // Semiquaver figuration is not a trill.
  assert.equal(untrill([74, 72, 74, 72].map((m, i) => [i * T / 4, T / 4, m, 0] as [number, number, number, number]), T).trills, 0);
});

test("D348: tempi: historically informed references, lowered so the busiest line offered keeps to 5.5 notes a second", () => {
  for (const f of pieces) {
    const t = MORE_TEMPO[f.id];
    assert.ok(t && t.flag === "editorial" && t.normal <= t.median && tempoOf(f.id) === t.normal, f.id);
    assert.ok(t.busiest <= 5.5, `${f.id}: ${t.busiest} notes a second`);
    assert.ok(t.normal >= 40 && t.normal <= 120, `${f.id}: ${t.normal}`);
  }
  // A slow movement at its reference; a quick one lowered for its semiquavers.
  assert.equal(tempoOf("bwv1052-2"), 46);
  assert.ok(tempoOf("bwv1052-1") >= 76 && tempoOf("bwv1052-1") <= 100);
});

test("D348: SUPER 16-BIT: a layout for each voice count: the harpsichord(s) for the hands, strings, the bassoon's continuo last; no harpsichord line louder than a string line", () => {
  setPreset("super16");
  try {
    for (const f of pieces) {
      assert.equal(PIECE_SOUND[f.id], "super16");
      const n = f.voices.length;
      assert.equal(presetById("super16").by![n]!.length, n, `${f.id}: a layout for ${n} voices`);
      const level = (v: number) => (patchFor(v, n)!.level ?? 1) * placeFor(v, n)!.level;
      const strings = f.voiceNames.map((x, v) => (/Violin|Viola/.test(x) ? v : -1)).filter((v) => v >= 0);
      for (const [v, name] of f.voiceNames.entries()) {
        const p = patchFor(v, n)!;
        if (/Harpsichord/.test(name)) assert.equal(p, PATCHES.s16Harpsi, `${f.id} ${name}`);
        else if (/Violin|Viola/.test(name)) assert.equal(p, PATCHES.s16Strings, `${f.id} ${name}`);
        else if (/Recorder/.test(name)) assert.equal(p, PATCHES.s16Flute);
        else assert.equal(p, PATCHES.s16Bassoon, `${f.id} ${name}`);
        if (/Harpsichord/.test(name)) assert.ok(level(v) <= Math.min(...strings.map(level)) + 1e-9, `${f.id} ${name}: never louder than the strings`);
        assert.ok(Math.abs(placeFor(v, n)!.pan) <= 0.35);
        assert.equal(voicing(v, n).pan, placeFor(v, n)!.pan);
      }
    }
    // BWV 1043's six-voice layout untouched (two solo violins).
    assert.deepEqual(presetById("super16").by![6]!.map(([p]) => p), ["s16Violin", "s16Violin", "s16Strings", "s16Strings", "s16Strings", "s16Bassoon"]);
  } finally {
    setPreset("chip");
  }
});

test("D348: credits: each movement's (CC0, its MuseScore page), the tab's, the site's, and SOURCE.md naming every score read", () => {
  const sourceMd = src("data/sources/bach-harpsichord-concertos/SOURCE.md");
  for (const f of pieces) {
    assert.match(f.credit!, /CC0 1\.0/);
    assert.match(f.source!, /^https:\/\/musescore\.com\/user\/\d+\/scores\/\d+$/);
    assert.ok(sourceMd.includes(f.source!.split("/").at(-1)!), `${f.id}: its score in SOURCE.md`);
  }
  for (const c of CONCERTOS) assert.ok(existsSync(new URL(`../data/sources/bach-harpsichord-concertos/musescore/${c.score}.mxl`, import.meta.url)), c.score);
  assert.match(src("src/bench/LiteGrid.tsx"), /"HARPSICHORD CONCERTOS, BWV 1052-1065: .*CC0 1\.0.*VERITS99.*RONZHIN.*BWV 1059 IS A RECONSTRUCTION/, "the tab's SOURCES & CREDITS");
  assert.match(src("src/ui/Credits.tsx"), /HARPSICHORD CONCERTOS[\s\S]*verits99[\s\S]*Ronzhin/);
  assert.match(sourceMd, /BWV 1059/);
});

// --- A game of each kind played through on LADDER, every note on time (as more-bach.test.ts's).
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

test("D348: a game of each kind runs headless to the end, every note right: a solo concerto's right hand and left hand, Violin I, BWV 1061's Adagio (the strings resting), the four-harpsichord finale", () => {
  for (const [piece, voice] of [["bwv1055-2", 0], ["bwv1056-2", 1], ["bwv1052-1", 3], ["bwv1061-2", 2], ["bwv1065-3", 6]] as const) {
    const r = playThrough(piece, voice);
    assert.ok(r.of > 20 && r.right === r.of, `${piece} v${voice}: ${r.right}/${r.of} (wrong ${r.wrong}, missed ${r.missed})`);
  }
});
