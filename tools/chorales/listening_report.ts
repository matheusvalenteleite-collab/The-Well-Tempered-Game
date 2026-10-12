/**
 * X6, blind listening: does daring cost Bach-likeness? Six of Bach's melodies that the models have not
 * seen (the daring report's held-out tunes), each in four versions, shuffled: Bach's own setting, and
 * the generator's at daring 0 (the plain generator), 1 (Bach's rate of licences) and 3 (three times
 * it), each in four parts (the bass and chords of steps 1-3 under daring, the inner voices of step 4,
 * the diminution of step 5, with Bach's soprano). The page asks of each: could it be Bach's?
 *
 * Output: data/chorales/generator/listening.html (the page; versions labelled A-D only) and
 * data/chorales/generator/listening-key.json (which version is which; not on the page).
 * Run:  node tools/chorales/listening_report.ts [round]   (1: the first page; 2, the default: new melodies)
 */
import { writeFileSync } from "node:fs";
import { BACH, melodyOf, type BachChorale } from "../../src/chorale/generate/corpus.ts";
import { Daring, DARING_LEVELS, diverseSettings, trainModels, type Setting } from "../../src/chorale/generate/index.ts";
import { LINE, VoiceModel, innerVoices } from "../../src/chorale/generate/voices.ts";
import { settingSlots } from "../../src/chorale/generate/slots.ts";
import { DiminutionModel, STUDY, diminish, type StudyChorale } from "../../src/chorale/generate/diminution.ts";
import { licencesOf, settingAsChorale as asChorale } from "../../src/chorale/generate/licences.ts";
import type { Key } from "../../src/chorale/generate/theory.ts";
import type { Note } from "../../src/chorale/level6.ts";
import { rng } from "../../src/counterpoint/choices/cantus.ts";
import { excerpt, thirty, writePage } from "./exceptions_lib.ts";

const tunes = [...new Set(BACH.map((c) => c.tune))].sort();
const held = new Set(tunes.filter((_, i) => i % 5 === 2));
const train = BACH.filter((c) => !held.has(c.tune));
const models = trainModels(train);
const lex = new Daring(train);
const vm = new VoiceModel(train);
const dm = new DiminutionModel(STUDY.chorales.filter((c) => !held.has(BACH.find((b) => b.no === c.n)?.tune ?? "")), { parallel: vm.parallel, augSecond: vm.augSecond });
const study = new Map(STUDY.chorales.map((s) => [s.n, s]));

/** A generated setting in four parts, as a study chorale's voices: Bach's soprano, the generated
 *  alto, tenor and bass embellished. Null where the inner voices cannot be found. */
function fourParts(c: BachChorale, s: StudyChorale, k: Key, g: Setting): Note[][] | null {
  const notes = c.notes.map((n) => ({ pitch: n.sp, offset: n.t }));
  const slots = settingSlots(g, k, notes, `${s.length}/32`);
  const iv = innerVoices(vm, slots, undefined, 1, { habits: 1, line: LINE });
  if (!iv) return null;
  const times = c.notes.map((n) => thirty(n.t));
  const dur = (i: number) => (times[i + 1] ?? s.length) - times[i];
  const line = (ps: string[]): Note[] => ps.map((p, i) => (c.notes[i].end || i === ps.length - 1 ? [times[i], dur(i), p, 1] : [times[i], dur(i), p]));
  const grid = [line(c.notes.map((n) => n.sp)), line(iv.alto), line(iv.tenor), line(g.bass.pitches)];
  const d = diminish(dm, grid, s.sig, rng(7000 + c.no), 1);
  return [s.voices[0], d.lines[1], d.lines[2], d.lines[3]];
}

// six held-out chorales: three major, three minor, not modal, of a moderate length, set by Bach once
const byTune = new Map<string, number>();
for (const c of BACH) byTune.set(c.tune, (byTune.get(c.tune) ?? 0) + 1);
const pool = BACH.filter((c) => held.has(c.tune) && c.edition_mode === c.mode && c.notes.length >= 28 && c.notes.length <= 44 && study.has(c.no) && thirty(c.notes[0].t) === 0);
// round 1 (rated 12 October 2026: docs/chorales/LISTENING-RATINGS.md) the first three of each mode;
// round 2, after the line model, the next three: new melodies
const ROUND = Number(process.argv[2] ?? 2);
const suffix = ROUND === 1 ? "" : String(ROUND);
const pick = [...pool.filter((c) => c.mode === "major").slice(3 * (ROUND - 1), 3 * ROUND), ...pool.filter((c) => c.mode === "minor").slice(3 * (ROUND - 1), 3 * ROUND)];

const VERSIONS = ["Bach", "0", "1", "3"];
const moments: Record<string, unknown>[] = [];
const key: Record<string, { no: number; version: string; licences: number }> = {};
pick.forEach((c, mi) => {
  const s = study.get(c.no)!;
  const k: Key = { tonic: c.tonic, mode: c.mode };
  const m = melodyOf(c);
  const versions: { version: string; voices: Note[][]; licences: number }[] = [];
  for (const v of VERSIONS) {
    if (v === "Bach") {
      versions.push({ version: v, voices: s.voices as Note[][], licences: licencesOf(c).flat().length });
      continue;
    }
    // a drawn setting (the second of two diverse ones), not the single most likely: the argmax path
    // collapses into tonic and dominant in turn (the first round's lesson)
    const g = diverseSettings(models, m, k, 2, rng(800 + c.no), { pool: 60, daring: v === "0" ? undefined : { weights: DARING_LEVELS[v], lex } })[1];
    const four = fourParts(c, s, k, g);
    if (four) versions.push({ version: v, voices: four, licences: licencesOf(asChorale(c, k, g)).flat().length });
  }
  // shuffled, the same way every time
  const r = rng(900 + c.no);
  const order = versions.map((x) => ({ x, u: r() })).sort((a, b) => a.u - b.u).map((y) => y.x);
  order.forEach((x, j) => {
    const label = "ABCD"[j];
    const id = `m${mi + 1}-${label}`;
    key[id] = { no: c.no, version: x.version, licences: x.licences };
    const ex = excerpt(c, { ...s, voices: x.voices }, { at: -1, bar: c.notes[0].m, voice: null }, true);
    moments.push({ id, name: `Melody ${mi + 1}, version ${label}`, level: `melody${mi + 1}`, key: `${s.tonic} ${s.mode}`, voice: null, title: "", bwv: "", scan: null, did: "", expected: "", ...ex, mark: 0 });
  });
});
const levels = Object.fromEntries(pick.map((c, mi) => [`melody${mi + 1}`, `Melody ${mi + 1}`]));
writePage(new URL(`../../data/chorales/generator/listening${suffix}.html`, import.meta.url), moments, {
  title: ROUND === 1 ? "Could It Be Bach?" : `Could It Be Bach? Round ${ROUND}`,
  lede: "Six chorale melodies, each harmonised four ways: some by Bach, some by the generator at different degrees of daring. Listen, and say whether each could be Bach's.",
  question: "Could this be Bach's?",
  choices: [
    { key: "bach", label: "It could be Bach", hint: "Nothing gives it away" },
    { key: "not", label: "Something is off", hint: "Say where in the note" },
    { key: "unsure", label: "Not sure", hint: "Come back to it" },
  ],
  blind: true,
  item: "Version",
  items: "versions",
  levels,
  collection: `listening${suffix}`,
  storeKey: `bach-listening${suffix}`,
});
writeFileSync(new URL(`../../data/chorales/generator/listening${suffix}-key.json`, import.meta.url), JSON.stringify({ generated_by: "tools/chorales/listening_report.ts", chorales: pick.map((c) => c.no), key }, null, 1) + "\n");
console.log(`${moments.length} versions of ${pick.length} melodies`, Object.entries(key).map(([id, x]) => `${id}=${x.version}(${x.licences})`).join(" "));
