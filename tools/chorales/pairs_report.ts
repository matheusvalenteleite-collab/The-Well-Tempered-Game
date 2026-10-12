/**
 * A/B listening: the same melody and the same harmony, set twice in a row, once by the earlier inner
 * voices and diminution and once by the later, in random order; the page asks which is better. For
 * small improvements, which the four-way blind page ("Could It Be Bach?") cannot measure.
 *
 * This round (12 October 2026): before, the joint search over alto and tenor with the line cost (round 2
 * of the blind page) and the diminution blind to the bass; after, each line re-written against the rest
 * with its shape two moves at a time (voices.ts refineLines) and the embellishments weighed by what they
 * make over the bass (diminution.ts). Melodies held out from the models, others than the blind pages'.
 *
 * Output: data/chorales/generator/pairs.html and pairs-key.json (which statement is which).
 * Run:  node tools/chorales/pairs_report.ts
 */
import { writeFileSync } from "node:fs";
import { BACH, melodyOf, type BachChorale } from "../../src/chorale/generate/corpus.ts";
import { diverseSettings, trainModels, type Setting } from "../../src/chorale/generate/index.ts";
import { LINE, VoiceModel, innerVoices, writeVoices } from "../../src/chorale/generate/voices.ts";
import { settingSlots } from "../../src/chorale/generate/slots.ts";
import { DiminutionModel, RESTRAINT, STUDY, diminish, type StudyChorale } from "../../src/chorale/generate/diminution.ts";
import type { Key } from "../../src/chorale/generate/theory.ts";
import type { Note } from "../../src/chorale/level6.ts";
import { rng } from "../../src/counterpoint/choices/cantus.ts";
import { excerpt, thirty, writePage } from "./exceptions_lib.ts";

const tunes = [...new Set(BACH.map((c) => c.tune))].sort();
const held = new Set(tunes.filter((_, i) => i % 5 === 2));
const train = BACH.filter((c) => !held.has(c.tune));
const models = trainModels(train);
const vm = new VoiceModel(train);
const dm = new DiminutionModel(STUDY.chorales.filter((c) => !held.has(BACH.find((b) => b.no === c.n)?.tune ?? "")), { parallel: vm.parallel, augSecond: vm.augSecond });
const study = new Map(STUDY.chorales.map((s) => [s.n, s]));

function four(c: BachChorale, s: StudyChorale, g: Setting, k: Key, after: boolean): Note[][] | null {
  const slots = settingSlots(g, k, c.notes.map((n) => ({ pitch: n.sp, offset: n.t })), `${s.length}/32`);
  const iv = after ? writeVoices(vm, slots) : innerVoices(vm, slots, undefined, 1, { habits: 1, line: LINE });
  if (!iv) return null;
  const times = c.notes.map((n) => thirty(n.t));
  const dur = (i: number) => (times[i + 1] ?? s.length) - times[i];
  const line = (ps: string[]): Note[] => ps.map((p, i) => (c.notes[i].end || i === ps.length - 1 ? [times[i], dur(i), p, 1] : [times[i], dur(i), p]));
  const grid = [line(c.notes.map((n) => n.sp)), line(iv.alto), line(iv.tenor), line(g.bass.pitches)];
  const d = diminish(dm, grid, s.sig, rng(7000 + c.no), 1, [true, true, true], RESTRAINT, after);
  return [s.voices[0], d.lines[1], d.lines[2], d.lines[3]];
}

// held-out melodies, not modal, no upbeat, of moderate length, other than the blind pages' (which take
// the first six of each mode)
const pool = BACH.filter((c) => held.has(c.tune) && c.edition_mode === c.mode && c.notes.length >= 28 && c.notes.length <= 44 && study.has(c.no) && thirty(c.notes[0].t) === 0);
const pick = [...pool.filter((c) => c.mode === "major").slice(6, 10), ...pool.filter((c) => c.mode === "minor").slice(6, 10)];

const moments: Record<string, unknown>[] = [];
const key: Record<string, { no: number; first: string; second: string }> = {};
pick.forEach((c, mi) => {
  const s = study.get(c.no)!;
  const k: Key = { tonic: c.tonic, mode: c.mode };
  const g = diverseSettings(models, melodyOf(c), k, 2, rng(800 + c.no), { pool: 60 })[1];
  const before = four(c, s, g, k, false),
    after = four(c, s, g, k, true);
  if (!before || !after) return;
  const swap = rng(950 + c.no)() < 0.5;
  const [x, y] = swap ? [after, before] : [before, after];
  const L = s.length;
  const voices = x.map((line, v) => [...line, ...y[v].map((n) => [n[0] + L, ...n.slice(1)] as Note)]);
  // the chorale's events twice over, the second time shifted by its length, for the bar lines
  const bars = Math.max(...c.notes.map((n) => n.m)) - Math.min(...c.notes.map((n) => n.m)) + 1;
  const twice: BachChorale = { ...c, notes: [...c.notes, ...c.notes.map((n) => ({ ...n, t: `${thirty(n.t) + L}/32`, m: n.m + bars }))] };
  const id = `p${mi + 1}`;
  key[id] = { no: c.no, first: swap ? "after" : "before", second: swap ? "before" : "after" };
  const ex = excerpt(twice, { ...s, voices, length: 2 * L }, { at: L, bar: c.notes[0].m, voice: null }, true);
  moments.push({ id, name: `Melody ${mi + 1}: first and second setting`, level: "pairs", key: `${s.tonic} ${s.mode}`, voice: null, title: "", bwv: "", scan: null, did: "", expected: "", ...ex, mark: L });
});
writePage(new URL("../../data/chorales/generator/pairs.html", import.meta.url), moments, {
  title: "Which Is Better?",
  lede: "Each melody is harmonised twice in a row, the same chords both times; only the inner voices and their embellishments differ. Listen to both and say which is better.",
  question: "Which setting is better?",
  choices: [
    { key: "first", label: "The first", hint: "Up to the ▼" },
    { key: "second", label: "The second", hint: "From the ▼ on" },
    { key: "same", label: "No difference", hint: "Or none worth naming" },
  ],
  blind: true,
  item: "Melody",
  items: "melodies",
  levels: { pairs: "Pairs" },
  collection: "pairs",
  storeKey: "bach-pairs",
});
writeFileSync(new URL("../../data/chorales/generator/pairs-key.json", import.meta.url), JSON.stringify({ generated_by: "tools/chorales/pairs_report.ts", key }, null, 1) + "\n");
console.log(`${moments.length} pairs`, JSON.stringify(key));
