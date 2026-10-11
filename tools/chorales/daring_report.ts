/**
 * X5 and X6: the generator's daring (src/chorale/generate/daring.ts), calibrated and measured against
 * Bach's profile. The weights of each daring level are calibrated on the melodies of one fifth of the
 * tunes (data/chorales/generator/daring-weights.json); the melodies of another fifth are held out for
 * the measure, the models and the daring lexicon learning from the other chorales. Each held-out melody is set four times at each daring, and every setting is
 * read as Bach's are (local keys, the licence catalogue: src/chorale/generate/licences.ts). What is
 * compared: licences per 100 chords, by category, against Bach's own settings of the same melodies;
 * and the cost in Bach-likeness (log2 probability per note under the plain models, and the share of
 * chord successions Bach uses).
 *
 * Output: docs/chorales/DARING.md, data/chorales/generator/daring.json and daring-weights.json.
 * Run:  node tools/chorales/daring_report.ts   (--eval: measure the calibrated weights without calibrating again)
 */
import { writeFileSync } from "node:fs";
import { BACH, melodyOf, type BachChorale } from "../../src/chorale/generate/corpus.ts";
import { Daring, diverseSettings, trainModels, type Models } from "../../src/chorale/generate/index.ts";
import { GROUPS, GROUP_NAMES, LEVELS, type DaringOption, type Weights } from "../../src/chorale/generate/daring.ts";
import { LICENCES, licencesOf, settingAsChorale as asChorale } from "../../src/chorale/generate/licences.ts";
import type { Key } from "../../src/chorale/generate/theory.ts";
import { rng } from "../../src/counterpoint/choices/cantus.ts";

const tunes = [...new Set(BACH.map((c) => c.tune))].sort();
const fold = (k: number) => new Set(tunes.filter((_, i) => i % 5 === k));
const held = fold(2),
  calibTunes = fold(0);
const test = BACH.filter((c) => held.has(c.tune));
const train = BACH.filter((c) => !held.has(c.tune));
const CATS = LICENCES.map((l) => l.key);
const groupOf = new Map(Object.entries(GROUPS).flatMap(([g, cs]) => cs.map((c) => [c, g] as [string, string])));

/** Licences by category in a set of settings (a chromatic bass line once per run, as in the catalogue). */
const count = (cs: BachChorale[]) => {
  const per: Record<string, number> = Object.fromEntries(CATS.map((k) => [k, 0]));
  let chords = 0;
  for (const c of cs) {
    const lic = licencesOf(c);
    lic.forEach((l, i) => {
      chords++;
      for (const k of l) if (k !== "chromatic-bass" || !lic[i - 1]?.includes("chromatic-bass")) per[k]++;
    });
  }
  return { per, chords };
};
const groupRates = (x: { per: Record<string, number>; chords: number }) => {
  const g: Record<string, number> = Object.fromEntries(GROUP_NAMES.map((k) => [k, 0]));
  for (const [k, v] of Object.entries(x.per)) g[groupOf.get(k)!] += (100 * v) / x.chords;
  return g;
};

/** Set every melody n times; return the settings read as chorales, and the mean score and attestation. */
function setAll(models: Models, cs: BachChorale[], n: number, pool: number, daring: DaringOption | undefined, pairs?: Set<string>) {
  const sets: BachChorale[] = [];
  let score = 0,
    att = 0,
    nc = 0,
    ns = 0;
  for (const c of cs) {
    const m = melodyOf(c);
    const k: Key = { tonic: c.tonic, mode: c.mode };
    for (const s of diverseSettings(models, m, k, n, rng(500 + c.no), { pool, daring })) {
      sets.push(asChorale(c, k, s));
      score += s.score;
      ns++;
      s.chords.forEach((ch, i) => {
        nc++;
        if (pairs?.has(`${c.mode}|${i ? s.chords[i - 1] : "start"}|${ch}`)) att++;
      });
    }
  }
  return { sets, score: score / ns, attested: att / nc };
}

// ---- calibration: the weights of each level, on the melodies of another fifth of the tunes, with
// models and lexicon that have seen neither those nor the test melodies ----
const calib = BACH.filter((c) => calibTunes.has(c.tune));
const calibTrain = BACH.filter((c) => !calibTunes.has(c.tune) && !held.has(c.tune));
const cModels = trainModels(calibTrain);
const cLex = new Daring(calibTrain);
const target1 = groupRates(count(BACH));
// with --eval, the weights already calibrated (data/chorales/generator/daring-weights.json) are measured
const EVAL = process.argv.includes("--eval");
const levels: Record<string, Weights> = EVAL ? { ...LEVELS } : {};
const log: string[] = [];
const EPS = 0.05;
let w: Weights = Object.fromEntries(GROUP_NAMES.map((g) => [g, 0]));
for (const level of EVAL ? [] : [1, 2, 3]) {
  const target = Object.fromEntries(GROUP_NAMES.map((g) => [g, level * target1[g]]));
  let best: { w: Weights; err: number } | null = null;
  for (let it = 0; it < 8; it++) {
    const r = groupRates(count(setAll(cModels, calib, 2, 30, { weights: w, lex: cLex }).sets));
    const err = GROUP_NAMES.reduce((a, g) => a + Math.abs(Math.log2((target[g] + EPS) / (r[g] + EPS))), 0);
    const msg = `level ${level} iteration ${it}: error ${err.toFixed(2)}; ${GROUP_NAMES.map((g) => `${g} ${r[g].toFixed(2)}/${target[g].toFixed(2)} (λ ${w[g].toFixed(1)})`).join(", ")}`;
    console.log(msg);
    log.push(msg);
    if (!best || err < best.err) best = { w: { ...w }, err };
    w = Object.fromEntries(GROUP_NAMES.map((g) => [g, Math.max(-10, Math.min(14, w[g] + Math.log2((target[g] + EPS) / (r[g] + EPS))))]));
  }
  levels[String(level)] = Object.fromEntries(Object.entries(best!.w).map(([g, v]) => [g, Number(v.toFixed(2))]));
  w = { ...best!.w };
}
if (!EVAL) writeFileSync(new URL("../../data/chorales/generator/daring-weights.json", import.meta.url), JSON.stringify({ generated_by: "tools/chorales/daring_report.ts", target_per_100_chords_level_1: target1, levels, log }, null, 1) + "\n");

// ---- evaluation on the test melodies ----
const models = trainModels(train);
const lex = new Daring(train);
const pairs = new Set<string>();
for (const c of train) c.notes.forEach((n, i) => pairs.add(`${c.mode}|${i ? c.notes[i - 1].chord : "start"}|${n.chord}`));
type Row = { level: string; chords: number; per: Record<string, number>; score: number; attested: number };
const rows: Row[] = [];
const bach = count(test);
rows.push({ level: "Bach", ...bach, score: NaN, attested: NaN });
for (const level of ["0", "1", "2", "3"]) {
  const r = setAll(models, test, 4, 60, level === "0" ? undefined : { weights: levels[level], lex }, pairs);
  rows.push({ level, ...count(r.sets), score: r.score, attested: r.attested });
  console.log(`level ${level} done`);
}

const per100 = (r: { per: Record<string, number>; chords: number }, ks?: string[]) => (100 * (ks ?? CATS).reduce((a, k) => a + r.per[k], 0)) / r.chords;
const lines: string[] = [];
const say = (s = "") => {
  lines.push(s);
  console.log(s);
};
const name = Object.fromEntries(LICENCES.map((l) => [l.key, l.name]));
const gen = rows.filter((r) => r.level !== "Bach");
const B = rows[0];
say("# Daring: Bach's licences in the generator (X5, X6)");
say();
say("Generated by `node tools/chorales/daring_report.ts`. The daring control (`src/chorale/generate/daring.ts`) raises a choice by");
say("2^(λ × share), the share being how often Bach's own use of that choice in that context is a licence of the catalogue");
say("(docs/chorales/LICENCES.md), λ the weight of the licence's group: a chord after the chord before over the melody's degree, a");
say("bass and its position under the chord (the diminished seventh chord is now a position the generator can choose), a bass");
say("move, a cadence chord for the melody's close. Rarity alone is never raised. The tilt is applied to whole settings (the joint");
say("chain draws each setting in proportion to its probability times the tilt of all its choices), and the draws are ranked by");
say("both.");
say();
say("## Calibration");
say();
say(`The weights are set so that **level 1 writes each group of licences at Bach's own rate** in the 370 chorales, **level 2 at`);
say(`twice it, level 3 at three times**; level 0 is the plain generator. They are found by iteration (each weight moved by the`);
say(`log ratio of the target rate to the rate written) on the melodies of a fifth of the tunes (${calib.length} chorales, each set twice),`);
say(`with models and a lexicon that have seen neither those melodies nor the test ones.`);
say();
say(`| group | Bach's rate per 100 chords | λ level 1 | λ level 2 | λ level 3 |`);
say(`|---|---|---|---|---|`);
for (const g of GROUP_NAMES) say(`| ${g} (${GROUPS[g].map((k) => name[k]).join("; ")}) | ${target1[g].toFixed(2)} | ${levels["1"][g]} | ${levels["2"][g]} | ${levels["3"][g]} |`);
say();
say("## Measured on unseen melodies (X6)");
say();
say(`Held out: the melodies of ${held.size} tunes (${test.length} chorales, ${B.chords} chords); models and lexicon learn from the other`);
say(`${train.length}. Each melody set 4 times at each level. Every setting is read as Bach's are: local keys (docs/chorales/KEYS.md)`);
say("and the catalogue's tests (the inner voices are not yet there, so the reading rests on the melody, the bass and the chords;");
say("Bach's settings read the same way, without their inner voices, give the same rates within 0.1 per 100 chords).");
say();
say(`| per 100 chords | ${gen.map((r) => `level ${r.level}`).join(" | ")} | Bach, same melodies |`);
say(`|---|${gen.map(() => "---").join("|")}|---|`);
say(`| **all licences** | ${gen.map((r) => per100(r).toFixed(1)).join(" | ")} | ${per100(B).toFixed(1)} |`);
for (const k of CATS) say(`| ${name[k]} | ${gen.map((r) => per100(r, [k]).toFixed(2)).join(" | ")} | ${per100(B, [k]).toFixed(2)} |`);
say(`| bits per note under the plain models | ${gen.map((r) => r.score.toFixed(2)).join(" | ")} | |`);
say(`| chord successions Bach uses | ${gen.map((r) => `${(100 * r.attested).toFixed(1)}%`).join(" | ")} | 100% |`);
say();
writeFileSync(new URL("../../docs/chorales/DARING.md", import.meta.url), lines.join("\n") + "\n");
writeFileSync(new URL("../../data/chorales/generator/daring.json", import.meta.url), JSON.stringify({ generated_by: "tools/chorales/daring_report.ts", held: test.map((c) => c.no), rows }, null, 1) + "\n");
