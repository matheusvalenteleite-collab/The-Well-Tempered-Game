/**
 * Bach's exceptions, X4 (first version): a catalogue of Bach's harmonic licences in the 370 chorales,
 * each kind with every instance and its occasion. The owner's first ratings (X3,
 * docs/chorales/EXCEPTIONS-RATINGS.md) found the licences in the harmony: the chord, the cadence, the
 * bass, the sonority. Each category is a definition over the corpus, not a model's surprise, so that
 * its instances can be counted and their occasions described: where in the phrase, over which melody
 * degree, what comes before and after, whether Bach does it again in another setting of the tune
 * (a sign of design), in a modal chorale or not, and how surprising the chord is to the generator's
 * model trained without the tune.
 *
 * Output: docs/chorales/LICENCES.md, data/chorales/generator/licences.json, and the second rating page
 * data/chorales/generator/licences.html (examples of every category, to rate on the owner's clarified
 * scale).   Run:  node tools/chorales/licences_report.ts   (after tools/chorales/surprise_report.ts)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { BACH, melodyOf, type BachChorale, type BachEvent } from "../../src/chorale/generate/corpus.ts";
import { phraseEnds, trainModels } from "../../src/chorale/generate/index.ts";
import { STUDY } from "../../src/chorale/generate/diminution.ts";
import { midiOf } from "../../src/chorale/generate/theory.ts";
import { barAt, excerpt, thirty, writePage } from "./exceptions_lib.ts";

const LETTERS = "CDEFGAB";
const step = (p: string) => LETTERS.indexOf(p[0]) + 7 * Number(p.replace(/^[A-G][#b]*/, ""));
const acc = (n: string) => n.replace(/#/g, "♯").replace(/b/g, "♭");
const label = (c: string) => c.replace(/^b/, "♭").replace(/^#/, "♯");
const spelled = (n: BachEvent) => `${label(n.chord)} (${acc(n.root)} ${n.kind})`;
const deg = (d: string) => d.replace("#", "♯").replace("b", "♭");
const pct = (a: number, b: number) => `${b ? Math.round((100 * a) / b) : 0}%`;

/** An augmented sixth over the bass in any upper voice (a sixth spanning ten semitones). */
const augSixth = (n: BachEvent) =>
  [n.sp, n.a, n.tn].some((p) => p && ((step(p) - step(n.bp)) % 7 + 7) % 7 === 5 && (((midiOf(p) - midiOf(n.bp)) % 12) + 12) % 12 === 10);

interface Instance {
  cat: string;
  no: number;
  i: number;
  at: number;
  bar: number;
  /** In the last phrase; at a phrase end. */
  lastPhrase: boolean;
  atEnd: boolean;
  modal: string | null;
  did: string;
}

// how often each chord ends a phrase, by mode (for "remote" cadences)
const endCount = new Map<string, number>(),
  endTotal = new Map<string, number>();
for (const c of BACH)
  for (const e of phraseEnds(melodyOf(c))) {
    const k = `${c.mode}|${c.notes[e.index].chord}`;
    endCount.set(k, (endCount.get(k) ?? 0) + 1);
    endTotal.set(c.mode, (endTotal.get(c.mode) ?? 0) + 1);
  }
const remote = (c: BachChorale, chord: string) => (endCount.get(`${c.mode}|${chord}`) ?? 0) / (endTotal.get(c.mode) ?? 1) < 0.03;
// how often each diminished-seventh chord stands on its (unsounded) root, for the "remote" ones
const dimRoot = new Map<string, number>();
let dimAll = 0;
for (const c of BACH)
  for (const n of c.notes)
    if (n.kind.startsWith("dominant seventh, minor ninth")) {
      dimRoot.set(`${c.mode}|${n.chord}`, (dimRoot.get(`${c.mode}|${n.chord}`) ?? 0) + 1);
      dimAll++;
    }

const CATEGORIES: { key: string; name: string; about: string; test: (c: BachChorale, i: number, ends: Set<number>) => string | null }[] = [
  {
    key: "flat-second",
    name: "The flat second (the Neapolitan's chord)",
    about: "the major chord on the lowered second degree, in any position",
    test: (c, i) => (c.notes[i].chord === "bII" ? `${spelled(c.notes[i])}${c.notes[i].pos ? ` with ${c.notes[i].pos}` : ""}` : null),
  },
  {
    key: "mixture",
    name: "Mixture: the minor mode's chords in a major key",
    about: "♭III, ♭VI, ♭VII, iv, v or ii° in a chorale in a major key (the Mixolydian chorales left out)",
    test: (c, i) => (c.mode === "major" && c.edition_mode === "major" && ["bIII", "bVI", "bVII", "iv", "v", "II°"].includes(c.notes[i].chord) ? spelled(c.notes[i]) : null),
  },
  {
    key: "remote-diminished",
    name: "Diminished sevenths of distant keys",
    about: "the diminished seventh chord (read as a dominant with a minor ninth, its root unsounded) on a root it rarely has in the chorales (under 5% of them)",
    test: (c, i) => {
      const n = c.notes[i];
      return n.kind.startsWith("dominant seventh, minor ninth") && (dimRoot.get(`${c.mode}|${n.chord}`) ?? 0) / dimAll < 0.05 ? `the diminished seventh of ${label(n.chord)}'s key: ${acc(n.root)} rootless` : null;
    },
  },
  {
    key: "augmented-sixth",
    name: "Augmented sixths",
    about: "an upper voice an augmented sixth above the bass on an on-beat chord (in the whole corpus, every onset counted, the interval occurs three times, all off the beat as incidental notes: nos. 19, 146, 340; as a chord the augmented sixth is absent from the chorales)",
    test: (c, i) => (augSixth(c.notes[i]) ? `${spelled(c.notes[i])}, an augmented sixth over ${acc(c.notes[i].bp)}` : null),
  },
  {
    key: "chromatic-bass",
    name: "Chromatic bass lines",
    about: "three or more semitone steps in a row in the bass, the same way (the start of the run)",
    test: (c, i) => {
      const b = c.notes.map((n) => n.bm);
      if (i + 3 >= b.length) return null;
      const d = [1, 2, 3].map((k) => b[i + k] - b[i + k - 1]);
      if (!d.every((x) => Math.abs(x) === 1 && Math.sign(x) === Math.sign(d[0]))) return null;
      if (i > 0 && b[i] - b[i - 1] === d[0]) return null; // only the start of a run
      let k = i + 3;
      while (k + 1 < b.length && b[k + 1] - b[k] === d[0]) k++;
      return `the bass ${d[0] < 0 ? "falls" : "rises"} by semitones from ${acc(c.notes[i].bp)} to ${acc(c.notes[k].bp)} (${k - i} steps)`;
    },
  },
  {
    key: "remote-cadence",
    name: "Remote cadences",
    about: "a phrase that ends on a chord under 3% of Bach's phrase ends in that mode",
    test: (c, i, ends) => (ends.has(i) && remote(c, c.notes[i].chord) ? `the phrase ends on ${spelled(c.notes[i])}` : null),
  },
  {
    key: "diminished-cadence",
    name: "Phrases that end on a diminished chord",
    about: "a phrase end on a diminished triad or seventh",
    test: (c, i, ends) => (ends.has(i) && /diminished|minor ninth/.test(c.notes[i].kind) ? `the phrase ends on ${spelled(c.notes[i])}` : null),
  },
  {
    key: "dissonance-cluster",
    name: "Two incidental dissonances at once",
    about: "two or more voices incidental (suspended, passing, appoggiatura) on the same beat",
    test: (c, i) => (c.notes[i].inc.length >= 2 ? `${acc(c.notes[i].lit)} over the bass, incidental in ${[...c.notes[i].inc].map((v) => ({ S: "soprano", A: "alto", T: "tenor", B: "bass" })[v as "S"]).join(" and ")}` : null),
  },
];

const instances: Instance[] = [];
for (const c of BACH) {
  const m = melodyOf(c);
  const pe = phraseEnds(m);
  const ends = new Set(pe.map((e) => e.index));
  const lastStart = pe.length > 1 ? pe[pe.length - 2].index + 1 : 0;
  c.notes.forEach((n, i) => {
    for (const cat of CATEGORIES) {
      const did = cat.test(c, i, ends);
      if (!did) continue;
      const at = thirty(n.t);
      instances.push({ cat: cat.key, no: c.no, i, at, bar: barAt(c, at), lastPhrase: i >= lastStart, atEnd: ends.has(i), modal: m.modal !== m.mode ? m.modal : null, did });
    }
  });
}

// the generator's surprise at the chord there (X1, each tune held out), and the owner's ratings so far
const surprise = JSON.parse(readFileSync(new URL("../../data/chorales/generator/surprise.json", import.meta.url), "utf8")) as { levels: string[]; moments: [number, number, number, number, number, number | null][] };
const chordLevel = surprise.levels.indexOf("chord");
const bitsAt = new Map(surprise.moments.filter((x) => x[1] === chordLevel).map((x) => [`${x[0]}|${x[2]}`, x[4]]));
const rated = JSON.parse(readFileSync(new URL("../../data/chorales/generator/exceptions-ratings.json", import.meta.url), "utf8")) as { ratings: { no: number; bar: number; rating: string }[] };

// recurrence: another of Bach's settings of the tune, with the same melody degrees, has the category at the same note
const byTune = new Map<string, BachChorale[]>();
for (const c of BACH) byTune.set(c.tune, [...(byTune.get(c.tune) ?? []), c]);
const has = new Set(instances.map((x) => `${x.cat}|${x.no}|${x.i}`));
const recurs = (x: Instance) => {
  const c = BACH.find((y) => y.no === x.no)!;
  return byTune.get(c.tune)!.some((o) => o.no !== c.no && o.notes.length === c.notes.length && o.notes.every((n, k) => n.deg === c.notes[k].deg) && has.has(`${x.cat}|${o.no}|${x.i}`));
};
const comparable = (x: Instance) => {
  const c = BACH.find((y) => y.no === x.no)!;
  return byTune.get(c.tune)!.some((o) => o.no !== c.no && o.notes.length === c.notes.length && o.notes.every((n, k) => n.deg === c.notes[k].deg));
};

const lines: string[] = [];
const say = (s = "") => {
  lines.push(s);
  console.log(s);
};
say("# Bach's licences, X4: a first catalogue");
say();
say("Generated by `node tools/chorales/licences_report.ts`. The owner's first ratings (docs/chorales/EXCEPTIONS-RATINGS.md) found");
say("Bach's licences in the harmony. Each category below is a definition over the 370 chorales, with every instance and its");
say("occasion. *Surprise*: the chord's surprise to the generator's model trained without the tune (X1), in bits. *Again in");
say("another setting*: of the instances whose tune Bach set again with the same melody, the share where the other setting has");
say("it at the same note (a sign of design rather than chance). *Modal*: in a Dorian, Mixolydian or Phrygian chorale, or one");
say("ending off its tonic, where a modal idiom may be at work rather than a licence.");
say();
say("| category | instances | chorales | at a phrase end | in the last phrase | modal | median surprise (bits) | again in another setting |");
say("|---|---|---|---|---|---|---|---|");
const summary: Record<string, unknown>[] = [];
for (const cat of CATEGORIES) {
  const xs = instances.filter((x) => x.cat === cat.key);
  const bits = xs.map((x) => bitsAt.get(`${x.no}|${x.at}`) ?? 0).sort((a, b) => a - b);
  const comp = xs.filter(comparable);
  const again = comp.filter(recurs).length;
  const med = bits.length ? bits[Math.floor(bits.length / 2)] : 0;
  say(`| ${cat.name} | ${xs.length} | ${new Set(xs.map((x) => x.no)).size} | ${pct(xs.filter((x) => x.atEnd).length, xs.length)} | ${pct(xs.filter((x) => x.lastPhrase).length, xs.length)} | ${pct(xs.filter((x) => x.modal).length, xs.length)} | ${med.toFixed(1)} | ${comp.length ? `${again} of ${comp.length}` : "–"} |`);
  summary.push({ key: cat.key, name: cat.name, about: cat.about, instances: xs.length });
}
say();
for (const cat of CATEGORIES) {
  const xs = instances.filter((x) => x.cat === cat.key);
  say(`## ${cat.name}`);
  say();
  say(`${cat.about[0].toUpperCase()}${cat.about.slice(1)}. ${xs.length} instances in ${new Set(xs.map((x) => x.no)).size} chorales.`);
  const ctx = (f: (x: Instance) => string) => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(f(x), (m.get(f(x)) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${pct(v, xs.length)}`).join(", ");
  };
  const ev = (x: Instance, d: number) => BACH.find((c) => c.no === x.no)!.notes[x.i + d];
  if (xs.length) {
    say();
    say(`- Melody degree above it: ${ctx((x) => deg(ev(x, 0).deg))}.`);
    say(`- The chord before: ${ctx((x) => (ev(x, -1) ? label(ev(x, -1).chord) : "(start)"))}; after: ${ctx((x) => (ev(x, 1) ? label(ev(x, 1).chord) : "(end)"))}.`);
    const r = [...new Set(rated.ratings.filter((y) => xs.some((x) => x.no === y.no && x.bar === y.bar)).map((y) => `no. ${y.no} bar ${y.bar} ${y.rating}`))];
    if (r.length) say(`- In the bars rated in the first round: ${r.join("; ")}.`);
    say(`- The most surprising: ${[...xs]
      .sort((a, b) => (bitsAt.get(`${b.no}|${b.at}`) ?? 0) - (bitsAt.get(`${a.no}|${a.at}`) ?? 0))
      .slice(0, 6)
      .map((x) => `no. ${x.no} bar ${x.bar}`)
      .join(", ")}.`);
  }
  say();
}
writeFileSync(new URL("../../docs/chorales/LICENCES.md", import.meta.url), lines.join("\n") + "\n");
writeFileSync(
  new URL("../../data/chorales/generator/licences.json", import.meta.url),
  JSON.stringify({ generated_by: "tools/chorales/licences_report.ts", categories: summary, instances: instances.map((x) => [x.cat, x.no, x.at, x.bar, x.atEnd ? 1 : 0, x.modal]) }) + "\n",
);

// ---- the second rating page: four examples of each category (the most surprising, in different
// chorales, none rated before) and the chord the owner pointed out (no. 295, bar 5) ----
const study = new Map(STUDY.chorales.map((s) => [s.n, s]));
const ratedAt = new Set(rated.ratings.map((y) => `${y.no}|${y.bar}`));
const picks: Instance[] = [];
const used = new Set<number>();
for (const cat of CATEGORIES) {
  const xs = instances
    .filter((x) => x.cat === cat.key && !ratedAt.has(`${x.no}|${x.bar}`))
    .sort((a, b) => (bitsAt.get(`${b.no}|${b.at}`) ?? 0) - (bitsAt.get(`${a.no}|${a.at}`) ?? 0));
  let n = 0;
  for (const x of xs) {
    if (n >= 4) break;
    if (used.has(x.no)) continue;
    used.add(x.no);
    picks.push(x);
    n++;
  }
}
const owner = instances.find((x) => x.no === 295 && x.bar === 5 && x.at === 160) ?? null;
if (owner && !picks.includes(owner)) picks.push(owner);
const extra: Instance[] = owner ? [] : [{ cat: "owner", no: 295, i: BACH.find((c) => c.no === 295)!.notes.findIndex((n) => thirty(n.t) === 160), at: 160, bar: 5, lastPhrase: false, atEnd: false, modal: null, did: "the chord you pointed out in the first round" }];
const LEVELS = Object.fromEntries([...CATEGORIES.map((c) => [c.key, c.name]), ["owner", "Pointed out by you"], ["sonority", "Dissonant sonority (X1, new)"], ["voices", "Inner voices (X1, recalibrated)"]]);
// what the chord model (each tune held out) expected at each pick
const expectedAt = new Map<string, string>();
for (const x of [...picks, ...extra, ...(owner ? [owner] : [])]) {
  const c = BACH.find((y) => y.no === x.no)!;
  const models = trainModels(BACH.filter((y) => y.tune !== c.tune));
  const m = melodyOf(c);
  const n = c.notes[x.i];
  const d = models.harmony.model.dist({ mode: m.mode, deg: n.deg, prev: x.i ? c.notes[x.i - 1].chord : "start" });
  expectedAt.set(`${x.no}|${x.at}`, [...d].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, p]) => `${label(k)} ${Math.round(100 * p)}%`).join(", ") + " (the chord model, without this tune)");
}
const page = [...picks, ...extra].map((x) => {
  const c = BACH.find((y) => y.no === x.no)!;
  const s = study.get(x.no)!;
  const bits = bitsAt.get(`${x.no}|${x.at}`) ?? 0;
  return {
    id: `${x.no}-${x.cat}-${x.at}`,
    no: x.no,
    bar: x.bar,
    level: x.cat,
    bits: Number(bits.toFixed(1)),
    voice: null,
    did: x.did + (x.modal ? ` · in a modal chorale (${x.modal})` : ""),
    expected: expectedAt.get(`${x.no}|${x.at}`) ?? "",
    title: s.title,
    bwv: s.bwv,
    key: `${s.tonic} ${s.mode}`,
    scan: s.scan ?? null,
    ...excerpt(c, s, { at: x.at, bar: x.bar, voice: null }),
  };
});
// and, to test X1's new and recalibrated levels, its most surprising dissonant sonorities and inner
// voices (none rated before, other chorales than the examples above)
const x1 = JSON.parse(readFileSync(new URL("../../data/chorales/generator/exceptions-moments.json", import.meta.url), "utf8")) as { moments: { id: string; no: number; bar: number; level: string }[] };
const ratedIds = new Set((JSON.parse(readFileSync(new URL("../../data/chorales/generator/exceptions-ratings.json", import.meta.url), "utf8")) as { ratings: { id: string }[] }).ratings.map((y) => y.id));
const fromX1 = [
  ...x1.moments.filter((y) => y.level === "sonority" && !ratedIds.has(y.id) && !used.has(y.no)).slice(0, 5),
  ...x1.moments.filter((y) => y.level === "voices" && !ratedIds.has(y.id) && !used.has(y.no) && !ratedAt.has(`${y.no}|${y.bar}`)).slice(0, 4),
];
page.push(...(fromX1 as unknown as typeof page));
writePage(new URL("../../data/chorales/generator/licences.html", import.meta.url), page, {
  title: "Bach's Licences",
  lede: "Examples of each kind of licence in Bach's chorales, the most surprising first. All of them are beautiful in some sense: say which strike you as immediately special.",
  question: "How does it strike you?",
  choices: [
    { key: "special", label: "Immediately special", hint: "It stands out at once" },
    { key: "ordinary", label: "Beautiful, in an ordinary way", hint: "Lovely, but not remarkable" },
    { key: "unsure", label: "Not sure", hint: "Come back to it" },
  ],
  flag: true,
  levels: LEVELS,
  collection: "licences",
  storeKey: "bach-licences",
});
console.log(`\n${page.length} examples on the rating page`);
