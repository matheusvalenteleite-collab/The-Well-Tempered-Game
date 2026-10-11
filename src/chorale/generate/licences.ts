/**
 * Bach's licences (X4, docs/chorales/LICENCES.md): the catalogue's categories as tests over a chorale's
 * events, every chord read in its local key (keys.ts). Shared by the catalogue
 * (tools/chorales/licences_report.ts) and the generator's daring control (daring.ts), which raises
 * these choices where Bach makes them.
 */
import type { BachChorale, BachEvent } from "./corpus.ts";
import type { Setting } from "./index.ts";
import { chordTones, type Key } from "./theory.ts";
import { keyDegree, localKeys } from "./keys.ts";

const acc = (n: string) => n.replace(/#/g, "♯").replace(/b/g, "♭");
const label = (c: string) => c.replace(/^b/, "♭").replace(/^#/, "♯");
const spelled = (n: BachEvent) => `${acc(n.root)} ${n.kind}`;
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
export const near = (c: BachChorale, degree: string) => (NEAR[c.edition_mode] ?? NEAR[c.mode]).has(degree);
const isDominantKind = (n: BachEvent) => /^(major$|dominant)/.test(n.kind) || n.kind === "seventh chord, third not sounding (minor seventh)";

/** Each category is read in the local key (src/chorale/generate/keys.ts): the second ratings found the
 *  licences chromatic, and two readings wrong where the home key was taken for the local one. */
export const LICENCES: { key: string; name: string; about: string; test: (c: BachChorale, i: number, ends: Set<number>) => string | null }[] = [
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


/** The phrase ends of a chorale's events (its fermatas and its last event). */
export function endsOf(c: BachChorale): Set<number> {
  const s = new Set(c.notes.flatMap((n, i) => (n.end ? [i] : [])));
  s.add(c.notes.length - 1);
  return s;
}

/** The licences at every event of a chorale: the categories whose test holds there. A chromatic bass
 *  line counts at every chord of its run, not only at its start. */
export function licencesOf(c: BachChorale): string[][] {
  const ends = endsOf(c);
  const out: string[][] = c.notes.map(() => []);
  c.notes.forEach((_, i) => {
    for (const cat of LICENCES) {
      if (!cat.test(c, i, ends)) continue;
      if (cat.key !== "chromatic-bass") out[i].push(cat.key);
      else {
        const d = c.notes[i + 1].bm - c.notes[i].bm;
        for (let k = i; k < c.notes.length && (k === i || c.notes[k].bm - c.notes[k - 1].bm === d); k++) if (!out[k].includes(cat.key)) out[k].push(cat.key);
      }
    }
  });
  return out;
}

const LETTERS = "CDEFGAB";
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const mod = (x: number, m: number) => ((x % m) + m) % m;
const pcOf = (n: string) => mod(NATURAL[LETTERS.indexOf(n[0])] + [...n.slice(1)].reduce((a, ch) => a + (ch === "#" ? 1 : ch === "b" ? -1 : 0), 0), 12);
/** A letter name two letters and a major third below (the dominant under a diminished seventh). */
function thirdBelow(n: string) {
  const letter = LETTERS[mod(LETTERS.indexOf(n[0]) - 2, 7)];
  const a = mod(pcOf(n) - 4 - NATURAL[LETTERS.indexOf(letter)] + 6, 12) - 6;
  return letter + (a > 0 ? "#".repeat(a) : "b".repeat(-a));
}

/** A generated setting of a Bach melody read as one of Bach's chorales: soprano from the melody, the
 *  bass, the chord's root and kind (the diminished seventh as a dominant with a minor ninth). */
export function settingAsChorale(c: BachChorale, k: Key, s: Setting): BachChorale {
  const notes: BachEvent[] = c.notes.map((n, i) => {
    const t = chordTones(s.bass.positions[i], s.bass.degrees[i], s.chords[i], k);
    const dim7 = t.kind === "diminished seventh";
    return {
      ...n,
      chord: s.chords[i],
      bass: s.bass.degrees[i],
      bm: s.bass.midi[i],
      bp: s.bass.pitches[i],
      a: null,
      tn: null,
      root: dim7 ? thirdBelow(t.root) : t.root,
      kind: dim7 ? "dominant seventh, minor ninth for the root" : t.kind,
      pos: s.bass.positions[i],
      inc: "",
    };
  });
  return { ...c, no: -c.no, notes };
}
