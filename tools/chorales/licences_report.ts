/**
 * Bach's exceptions, X4 (second version): a catalogue of Bach's licences in the 370 chorales, each
 * kind with every instance and its occasion. The owner's first ratings (X3,
 * docs/chorales/EXCEPTIONS-RATINGS.md) found the licences in the harmony; the second
 * (docs/chorales/LICENCES-RATINGS.md) found them chromatic, and two readings wrong where the chorale's
 * home key was taken for the local key or the mode. So every chord is read in its local key
 * (src/chorale/generate/keys.ts), and the catalogue keeps the chromatic licences: chromatic bass
 * lines, the Neapolitan, mixture, diminished sevenths of another degree, applied dominants that go
 * elsewhere, closes in distant keys, phrases ending on a dissonant chord. (Left out: two incidental
 * dissonances at once and dissonant sonorities found once, rated ordinary; the augmented sixth, absent
 * from the chorales as a chord.) Each category is a definition over the corpus, not a model's
 * surprise, so that its instances can be counted and their occasions described: where in the phrase,
 * over which melody degree, what comes before and after, whether Bach does it again in another
 * setting of the tune (a sign of design), in a modal chorale or not, and how surprising the chord is
 * to the generator's model trained without the tune.
 *
 * Output: docs/chorales/LICENCES.md, data/chorales/generator/licences.json.
 * Run:  node tools/chorales/licences_report.ts   (after tools/chorales/surprise_report.ts)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { BACH, melodyOf, type BachChorale, type BachEvent } from "../../src/chorale/generate/corpus.ts";
import { phraseEnds } from "../../src/chorale/generate/index.ts";
import { keyDegree, localKeys } from "../../src/chorale/generate/keys.ts";
import { barAt, thirty } from "./exceptions_lib.ts";

const acc = (n: string) => n.replace(/#/g, "♯").replace(/b/g, "♭");
const label = (c: string) => c.replace(/^b/, "♭").replace(/^#/, "♯");
const spelled = (n: BachEvent) => `${acc(n.root)} ${n.kind}`;
const deg = (d: string) => d.replace("#", "♯").replace("b", "♭");
const pct = (a: number, b: number) => `${b ? Math.round((100 * a) / b) : 0}%`;

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

const kindOf = (n: BachEvent) => (/minor ninth/.test(n.kind) ? "diminished seventh" : n.kind);
const inLocal = (c: BachChorale, i: number) => {
  const k = localKeys(c)[i];
  return `${label(k.chord)} of ${acc(k.tonic)} ${k.mode}`;
};
/** The keys closely related to home, as degrees of it: the keys of the home scale's major and minor
 *  triads, by the edition's mode (a Mixolydian chorale's v and ♭VII are near), and in minor the major
 *  dominant and subdominant too. A region in any other key is distant. */
const NEAR: Record<string, Set<string>> = {
  major: new Set(["I", "ii", "iii", "IV", "V", "vi"]),
  minor: new Set(["i", "bIII", "iv", "v", "bVI", "bVII", "V", "IV"]),
  mixolydian: new Set(["I", "ii", "IV", "v", "vi", "bVII"]),
  dorian: new Set(["i", "ii", "bIII", "IV", "v", "bVII", "V", "iv"]),
  phrygian: new Set(["i", "bII", "bIII", "iv", "bVI", "bvii", "V"]),
};
const near = (c: BachChorale, degree: string) => (NEAR[c.edition_mode] ?? NEAR[c.mode]).has(degree);
const isDominantKind = (n: BachEvent) => /^(major$|dominant)/.test(n.kind) || n.kind === "seventh chord, third not sounding (minor seventh)";

/** Each category is read in the local key (src/chorale/generate/keys.ts): the second ratings found the
 *  licences chromatic, and two readings wrong where the home key was taken for the local one. */
const CATEGORIES: { key: string; name: string; about: string; test: (c: BachChorale, i: number, ends: Set<number>) => string | null }[] = [
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
    key: "neapolitan",
    name: "The Neapolitan: the flat second in its local key",
    about: "the major chord on the lowered second degree of the local key (not the Phrygian second: a Phrygian chorale's own second degree in its home region)",
    test: (c, i) => {
      const k = localKeys(c)[i];
      if (k.chord !== "bII") return null;
      if (c.edition_mode === "phrygian" && k.tonic === c.tonic) return null;
      return `${spelled(c.notes[i])}${c.notes[i].pos ? ` with ${c.notes[i].pos}` : ""}, ${inLocal(c, i)}`;
    },
  },
  {
    key: "mixture",
    name: "Mixture: the minor mode's chords in a major region",
    about: "♭III, ♭VI, ♭VII, i, iv, v or ii° in a region in a major key, the chord outside the key and not applied to a degree",
    test: (c, i) => {
      const k = localKeys(c)[i];
      return k.mode === "major" && !k.diatonic && !k.applied && ["bIII", "bVI", "bVII", "i", "iv", "v", "II°"].includes(k.chord) ? `${spelled(c.notes[i])}, ${inLocal(c, i)}` : null;
    },
  },
  {
    key: "diminished-seventh",
    name: "Diminished sevenths of another degree",
    about: "the diminished seventh chord (read as a dominant with a minor ninth, its root unsounded) other than the local key's own, or the own of a region distant from home",
    test: (c, i) => {
      const n = c.notes[i];
      const k = localKeys(c)[i];
      if (!/minor ninth/.test(n.kind) || (k.chord === "V" && near(c, keyDegree(c, k)))) return null;
      const where = k.chord === "V" ? `of ${acc(k.tonic)} ${k.mode}, ${label(keyDegree(c, k))} of the home key` : k.applied ? `applied to ${label(k.applied)} of ${acc(k.tonic)} ${k.mode}` : `outside ${acc(k.tonic)} ${k.mode}`;
      return `the diminished seventh on ${acc(n.root)} (rootless), ${where}`;
    },
  },
  {
    key: "evaded-dominant",
    name: "Applied dominants that go elsewhere",
    about: "a dominant of a degree (major, dominant seventh, diminished seventh) outside the local key that does not go to the degree it points to",
    test: (c, i) => {
      const k = localKeys(c)[i];
      const n = c.notes[i];
      if (k.diatonic || k.applied || !isDominantKind(n) || k.chord === "bII" || ["bIII", "bVI", "bVII"].includes(k.chord) || i + 1 >= c.notes.length) return null;
      return `${spelled(n)}, ${inLocal(c, i)}, then ${label(localKeys(c)[i + 1].chord)}`;
    },
  },
  {
    key: "distant-close",
    name: "Closes in distant keys",
    about: "a phrase that closes on the tonic of a region not closely related to home (near: the keys of the home scale's triads, by the edition's mode, and in minor the major dominant and subdominant)",
    test: (c, i, ends) => {
      if (!ends.has(i)) return null;
      const k = localKeys(c)[i];
      const d = keyDegree(c, k);
      return /^(I|i)$/.test(k.chord) && !near(c, d) ? `the phrase closes in ${acc(k.tonic)} ${k.mode} (${label(d)} of the home key)` : null;
    },
  },
  {
    key: "open-close",
    name: "Phrases that end on a dissonant chord",
    about: "a phrase end (not the last) on a dominant seventh, a diminished seventh, or a diminished or half-diminished chord",
    test: (c, i, ends) => {
      const n = c.notes[i];
      if (!ends.has(i) || i === c.notes.length - 1 || !/seventh|diminished|minor ninth/.test(n.kind) || n.kind.startsWith("major seventh")) return null;
      return `the phrase ends on ${kindOf(n)} ${acc(n.root)}, ${inLocal(c, i)}`;
    },
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
say("# Bach's licences, X4: the catalogue read in local keys");
say();
say("Generated by `node tools/chorales/licences_report.ts`. The owner's ratings found Bach's licences in the harmony (first");
say("round, docs/chorales/EXCEPTIONS-RATINGS.md) and chromatic (second round, docs/chorales/LICENCES-RATINGS.md), and two");
say("readings wrong where the home key was taken for the local key. Every chord is now read in its local key (docs/chorales/KEYS.md),");
say("and the catalogue keeps the chromatic licences. Each category below is a definition over the 370 chorales, with every");
say("instance and its occasion; degrees are of the local key. *Surprise*: the chord's surprise to the generator's model trained without the tune (X1), in bits. *Again in");
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
    const local = (x: Instance, d: number) => {
      const c = BACH.find((y) => y.no === x.no)!;
      const k = localKeys(c)[x.i + d];
      return k ? label(k.chord) : d < 0 ? "(start)" : "(end)";
    };
    say(`- The chord before (in the local key): ${ctx((x) => local(x, -1))}; after: ${ctx((x) => local(x, 1))}.`);
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
writeFileSync(
  new URL("../../data/chorales/generator/licences.json", import.meta.url),
  JSON.stringify({ generated_by: "tools/chorales/licences_report.ts", categories: summary, instances: instances.map((x) => [x.cat, x.no, x.at, x.bar, x.atEnd ? 1 : 0, x.modal]) }) + "\n",
);

// The second rating page (round 2, rated 11 October 2026: docs/chorales/LICENCES-RATINGS.md) stays as
// published, data/chorales/generator/licences.html; its examples were chosen from the first catalogue.
// How the narrowed catalogue sorts them:
const r2 = JSON.parse(readFileSync(new URL("../../data/chorales/generator/licences-ratings.json", import.meta.url), "utf8")) as { ratings: { id: string; no: number; bar: number; rating: string | null; flag: boolean }[] };
const tally = new Map<string, number>();
const sorted: string[] = [];
for (const y of r2.ratings) {
  const at = Number(y.id.split("-").pop());
  const inNew = instances.filter((x) => x.no === y.no && x.at === at).map((x) => x.cat);
  const r = y.flag ? "flagged" : (y.rating ?? "unrated");
  const k = `${r}|${inNew.length ? "kept" : "left out"}`;
  tally.set(k, (tally.get(k) ?? 0) + 1);
  sorted.push(`| no. ${y.no} bar ${y.bar} | ${y.id.replace(/^\d+-/, "").replace(/-\d+(-c)?$/, "")} | ${r} | ${inNew.length ? inNew.join(", ") : "–"} |`);
}
const t = (r: string, k: string) => tally.get(`${r}|${k}`) ?? 0;
const tail = [
  "## The second round's examples in the narrowed catalogue",
  "",
  `The owner rated 34 examples of the first catalogue (docs/chorales/LICENCES-RATINGS.md). In the narrowed one: of the ${t("special", "kept") + t("special", "left out")} rated special, ${t("special", "kept")} are kept; of the ${t("ordinary", "kept") + t("ordinary", "left out")} rated ordinary, ${t("ordinary", "left out")} are left out; the ${t("flagged", "kept") + t("flagged", "left out")} flagged readings, ${t("flagged", "left out")} left out. (The examples were chosen from the first catalogue, so this is a check of the definitions against the ear, in sample.)`,
  "",
  "| example | first catalogue | rated | narrowed catalogue |",
  "|---|---|---|---|",
  ...sorted,
  "",
];
for (const l of tail) say(l);
writeFileSync(new URL("../../docs/chorales/LICENCES.md", import.meta.url), lines.join("\n") + "\n");
