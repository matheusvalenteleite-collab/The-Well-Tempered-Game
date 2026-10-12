/**
 * The generator's chorales for the test bench (the playback session's listening room, where the owner judges
 * all generated music blind against Bach): melodies Bach set, held out from every model, each harmonised by
 * the whole generator (cadence plan, chords and bass, inner voices re-written as lines, diminution with a
 * leading voice), Bach's soprano kept. The bench plays each beside Bach's own setting of the melody
 * ("compare"), blind, in random order.
 *
 * Output: data/playback/bench/gen-chorale-<no>.json (format: the playback session's, 12 October 2026).
 * Also the inner voices alone between Bach's outer voices (part "inner", his voices "given").
 * Run:  node tools/chorales/bench_report.ts [whole settings per mode, default 4] [inner-voice pieces, default 6]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { BACH, melodyOf, type BachChorale } from "../../src/chorale/generate/corpus.ts";
import { diverseSettings, trainModels } from "../../src/chorale/generate/index.ts";
import { VoiceModel, writeVoices } from "../../src/chorale/generate/voices.ts";
import { bachSlots, settingSlots } from "../../src/chorale/generate/slots.ts";
import { STUDY } from "../../src/chorale/generate/diminution.ts";
import { FigureModel, figurate, studyPairs } from "../../src/chorale/generate/figures.ts";
import { chordTones, midiOf } from "../../src/chorale/generate/theory.ts";
import type { Key } from "../../src/chorale/generate/theory.ts";
import type { Note } from "../../src/chorale/level6.ts";
import { rng } from "../../src/counterpoint/choices/cantus.ts";
import { thirty } from "./exceptions_lib.ts";

const VERSION = "v2";
const NOTE =
  "v2 (chorale-generation, 12 October 2026): as v1 (cadence plan, chords and bass from Bach's habits; alto and tenor re-written " +
  "as whole lines), but the lower voices' surface is now Bach's own figures beat by beat (figures.ts): every note he writes " +
  "between two chord tones, chord tones in quavers (the bass's octaves and walking, the inner voices moving within the " +
  "chord), passing and neighbour notes, suspensions; drawn as often as he writes them, bass first, each voice against those " +
  "already written. Short notes: alto 32%, tenor 36%, bass 45% (Bach 36%, 40%, 43%; v1 11-14%). Bach's soprano.";

const tunes = [...new Set(BACH.map((c) => c.tune))].sort();
const held = new Set(tunes.filter((_, i) => i % 5 === 2));
const train = BACH.filter((c) => !held.has(c.tune));
const models = trainModels(train);
const vm = new VoiceModel(train);
const fm = new FigureModel(studyPairs(train));
const pcOf = (l: string) => (((midiOf(`${l}4`) % 12) + 12) % 12);
const study = new Map(STUDY.chorales.map((s) => [s.n, s]));

// held-out melodies Bach set, not modal, of moderate length, none used on the earlier listening pages
// (those took the first ten of each mode from the same pool)
const per = Number(process.argv[2] ?? 4);
const pool = BACH.filter((c) => held.has(c.tune) && c.edition_mode === c.mode && c.notes.length >= 28 && c.notes.length <= 48 && study.has(c.no));
const pick: BachChorale[] = [...pool.filter((c) => c.mode === "major").slice(10, 10 + per), ...pool.filter((c) => c.mode === "minor").slice(10, 10 + per)];

const dir = new URL("../../data/playback/bench/", import.meta.url);
mkdirSync(dir, { recursive: true });
let written = 0;
for (const c of pick) {
  const s = study.get(c.no)!;
  const k: Key = { tonic: c.tonic, mode: c.mode };
  const g = diverseSettings(models, melodyOf(c), k, 2, rng(800 + c.no), { pool: 60 })[1];
  const iv = writeVoices(vm, settingSlots(g, k, c.notes.map((n) => ({ pitch: n.sp, offset: n.t })), `${s.length}/32`));
  if (!iv) continue;
  const times = c.notes.map((n) => thirty(n.t));
  const dur = (i: number) => (times[i + 1] ?? s.length) - times[i];
  const line = (ps: string[]): Note[] => ps.map((p, i) => (c.notes[i].end || i === ps.length - 1 ? [times[i], dur(i), p, 1] : [times[i], dur(i), p]));
  const tones = g.chords.map((ch, i) => {
    const t = chordTones(g.bass.positions[i], g.bass.degrees[i], ch, k);
    return new Set([t.root, ...t.above.map(([l]) => l), g.bass.pitches[i].replace(/-?\d+$/, "")].map(pcOf));
  });
  const d = figurate(fm, [line(c.notes.map((n) => n.sp)), line(iv.alto), line(iv.tenor), line(g.bass.pitches)], s.voices[0] as Note[], tones, rng(7000 + c.no));
  const voices = [s.voices[0], d[1], d[2], d[3]].map((l) => l.map((n) => (n[3] ? [n[0], n[1], n[2], 1] : [n[0], n[1], n[2]])));
  const piece = {
    id: `gen-chorale-${c.no}-${VERSION}`,
    title: s.title,
    kind: "chorale",
    by: "chorale-generation",
    tonic: s.tonic,
    mode: s.mode,
    sig: s.sig,
    meter: s.meter,
    pickup: s.pickup,
    voices,
    compare: c.no,
    note: NOTE,
  };
  writeFileSync(new URL(`gen-chorale-${c.no}-${VERSION}.json`, dir), JSON.stringify(piece) + "\n");
  written++;
  console.log(`gen-chorale-${c.no}-${VERSION}: ${s.title} (${s.tonic} ${s.mode}), against Bach's no. ${c.no}`);
}
// ---- the inner voices alone: alto and tenor written between Bach's soprano and bass, over his chords
// (Kirnberger's reading of them), embellished with his bass as it stands; the bench draws his voices in grey
// ("given") and compares with his own alto and tenor. Melodies drawn at random among the held-out ones. ----
const r = rng(4242);
const rest = BACH.filter((c) => held.has(c.tune) && study.has(c.no) && !pick.includes(c) && c.notes.every((n) => n.a && n.tn));
const inner: BachChorale[] = [];
while (inner.length < Number(process.argv[3] ?? 6) && rest.length) inner.push(rest.splice(Math.floor(r() * rest.length), 1)[0]);
for (const c of inner) {
  const s = study.get(c.no)!;
  const slots = bachSlots(c);
  const iv = slots && writeVoices(vm, slots);
  if (!iv) continue;
  const times = c.notes.map((n) => thirty(n.t));
  const dur = (i: number) => (times[i + 1] ?? s.length) - times[i];
  const line = (ps: string[]): Note[] => ps.map((p, i) => (c.notes[i].end || i === ps.length - 1 ? [times[i], dur(i), p, 1] : [times[i], dur(i), p]));
  const tones = slots.map((sl) => new Set([sl.root, ...sl.above.map(([l]) => l), sl.bass.replace(/-?\d+$/, "")].map(pcOf)));
  const d = figurate(fm, [line(c.notes.map((n) => n.sp)), line(iv.alto), line(iv.tenor), line(c.notes.map((n) => n.bp))], s.voices[0] as Note[], tones, rng(7100 + c.no), {}, [true, true, false], [null, null, null, s.voices[3] as Note[]]);
  const voices = [s.voices[0], d[1], d[2], s.voices[3]].map((l) => l.map((n) => (n[3] ? [n[0], n[1], n[2], 1] : [n[0], n[1], n[2]])));
  const id = `gen-chorale-inner-${c.no}-${VERSION}`;
  writeFileSync(
    new URL(`${id}.json`, dir),
    JSON.stringify({ id, title: s.title, kind: "chorale", by: "chorale-generation", part: "inner", given: [0, 3], tonic: s.tonic, mode: s.mode, sig: s.sig, meter: s.meter, pickup: s.pickup, voices, compare: c.no, note: "v2: inner voices only (alto and tenor) between Bach's soprano and bass over his chords: lines re-written whole, then figured beat by beat with Bach's own figures (quavers within the chord, passing and neighbour notes, suspensions), drawn as often as he writes them, against his outer voices as written. Short notes alto 32%, tenor 31% (Bach 36%, 40%)." }) + "\n",
  );
  written++;
  console.log(`${id}: ${s.title}, inner voices between Bach's outer voices (no. ${c.no})`);
}
console.log(`${written} pieces in data/playback/bench/`);
