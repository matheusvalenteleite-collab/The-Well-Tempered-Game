/**
 * The generator's chorales for the test bench (the playback session's listening room, where the owner judges
 * all generated music blind against Bach): melodies Bach set, held out from every model, each harmonised by
 * the whole generator (cadence plan, chords and bass, inner voices re-written as lines, diminution with a
 * leading voice), Bach's soprano kept. The bench plays each beside Bach's own setting of the melody
 * ("compare"), blind, in random order.
 *
 * Output: data/playback/bench/gen-chorale-<no>.json (format: the playback session's, 12 October 2026).
 * Run:  node tools/chorales/bench_report.ts [count per mode, default 4]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { BACH, melodyOf, type BachChorale } from "../../src/chorale/generate/corpus.ts";
import { diverseSettings, trainModels } from "../../src/chorale/generate/index.ts";
import { VoiceModel, writeVoices } from "../../src/chorale/generate/voices.ts";
import { settingSlots } from "../../src/chorale/generate/slots.ts";
import { DiminutionModel, STUDY, diminish } from "../../src/chorale/generate/diminution.ts";
import type { Key } from "../../src/chorale/generate/theory.ts";
import type { Note } from "../../src/chorale/level6.ts";
import { rng } from "../../src/counterpoint/choices/cantus.ts";
import { thirty } from "./exceptions_lib.ts";

const VERSION = "v1";
const NOTE =
  "Generated (chorale-generation, 12 October 2026): cadence plan, chords and bass drawn from Bach's habits; alto and tenor " +
  "re-written one at a time as whole lines (Bach's rates of held notes, runs, contrary motion, his line shapes over three " +
  "moves; the alto rising with the melody's climax); embellishment weighed by what it makes over the bass, one voice " +
  "leading for a passage. Bach's soprano.";

const tunes = [...new Set(BACH.map((c) => c.tune))].sort();
const held = new Set(tunes.filter((_, i) => i % 5 === 2));
const train = BACH.filter((c) => !held.has(c.tune));
const models = trainModels(train);
const vm = new VoiceModel(train);
const dm = new DiminutionModel(STUDY.chorales.filter((c) => !held.has(BACH.find((b) => b.no === c.n)?.tune ?? "")), { parallel: vm.parallel, augSecond: vm.augSecond });
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
  const d = diminish(dm, [line(c.notes.map((n) => n.sp)), line(iv.alto), line(iv.tenor), line(g.bass.pitches)], s.sig, rng(7000 + c.no), 1);
  const voices = [s.voices[0], d.lines[1], d.lines[2], d.lines[3]].map((l) => l.map((n) => (n[3] ? [n[0], n[1], n[2], 1] : [n[0], n[1], n[2]])));
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
console.log(`${written} pieces in data/playback/bench/`);
