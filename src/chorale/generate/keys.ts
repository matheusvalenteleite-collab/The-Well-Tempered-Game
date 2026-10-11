/**
 * Local keys: the key each of Bach's chords is heard in, where the chorale's home key no longer
 * governs (a phrase in the dominant, a tonicised degree). The owner's second ratings
 * (docs/chorales/LICENCES-RATINGS.md) showed why it matters: a B♭ chord just after a cadence in
 * D minor was read as the flat second of A minor (it is VI of D minor), and the Phrygian second as
 * a Neapolitan.
 *
 * The reading is a hidden Markov chain over the 24 keys, decoded by Viterbi, one state per on-beat
 * event. What a key is told by:
 *   - the pitches sounding (four voices) against the key's profile (Temperley's, from the
 *     Kostka-Payne corpus);
 *   - whether the chord belongs to the key (its diatonic chords; in minor, the melodic minor's too);
 *   - a dominant going to its tonic (V or V7, or the diminished seventh read as V with a minor ninth,
 *     then the chord a fifth below): evidence for that tonic's key at both chords;
 *   - a phrase end on the key's tonic (a full or a Phrygian close), or on its dominant (a half close);
 *   - the last chord in the home key;
 * against a cost for changing key and for keys far from home (by the circle of fifths). The chain
 * starts in the home key. The weights are set by hand and checked against what can be checked:
 * phrase ends on the local tonic or dominant, the number of key changes, the chorales' last chords,
 * and the owner's two flagged readings (tools/chorales/keys_report.ts, docs/chorales/KEYS.md).
 */
import type { BachChorale, BachEvent } from "./corpus.ts";
import { midiOf } from "./theory.ts";

export type KeyMode = "major" | "minor";

export interface LocalKey {
  /** The local tonic, spelled ("F#"), its pitch class, the mode. */
  tonic: string;
  pc: number;
  mode: KeyMode;
  /** The chord as a degree of the local key ("V", "bII", "vii" is written VII°, as everywhere). */
  chord: string;
  /** The chord belongs to the local key (major: its diatonic triads; minor: the natural, harmonic and
   *  melodic minor's). */
  diatonic: boolean;
  /** Outside the key, a dominant (a major triad, a dominant seventh, a diminished seventh read as a
   *  dominant with a minor ninth) or a leading-tone chord (diminished) of a degree of the key, going to
   *  it: the degree it tonicises ("ii" for V/ii in major). Otherwise absent. */
  applied?: string;
}

const mod = (x: number, m: number) => ((x % m) + m) % m;
const LETTERS = "CDEFGAB";
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const ROMAN = ["I", "bII", "II", "bIII", "III", "IV", "#IV", "V", "bVI", "VI", "bVII", "VII"];
/** The letter step of each Roman numeral above (for spelling a local tonic from the home key). */
const ROMAN_STEP = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];

// Temperley's key profiles (Music and Probability, 2007: the Kostka-Payne corpus), as log probabilities
const PROFILE: Record<KeyMode, number[]> = {
  major: [0.748, 0.06, 0.488, 0.082, 0.67, 0.46, 0.096, 0.715, 0.104, 0.366, 0.057, 0.4],
  minor: [0.712, 0.084, 0.474, 0.618, 0.049, 0.46, 0.105, 0.747, 0.404, 0.067, 0.133, 0.33],
};
const LOGP: Record<KeyMode, number[]> = {
  major: PROFILE.major.map((p, _, a) => Math.log2(p / a.reduce((x, y) => x + y))),
  minor: PROFILE.minor.map((p, _, a) => Math.log2(p / a.reduce((x, y) => x + y))),
};

/** The diatonic chords of a key, by root over the tonic and quality ("M", "m", "d"). */
const DIATONIC: Record<KeyMode, Set<string>> = {
  major: new Set(["0M", "2m", "4m", "5M", "7M", "9m", "11d"]),
  minor: new Set(["0m", "2d", "2m", "3M", "5m", "5M", "7m", "7M", "8M", "9d", "10M", "11d"]),
};

export const WEIGHTS = {
  /** Each sounding pitch's log probability under the key's profile. */
  pitch: 1,
  /** The chord belongs to the key, or does not. */
  inKey: 2,
  outKey: -4,
  /** A dominant going to its tonic, at both chords. */
  dominant: 4,
  /** A phrase end on the key's tonic, on its dominant. */
  tonicEnd: 6,
  /** More for a full close: the tonic at a phrase end reached from its dominant establishes the key
   *  (Kirnberger, Kunst I, pp. 95-96), a V/V-V close in the home key being a close in the dominant's. */
  fullClose: 12,
  dominantEnd: 2,
  /** Changing key; each step of the circle of fifths between the local and the home key, per chord. */
  change: 9,
  distance: 0.6,
  /** The last chord in the home key (a Mixolydian chorale's last chord is its tonic, not a dominant;
   *  a chorale ending on the dominant ends with a half or a Phrygian close, not in the dominant's key). */
  last: 30,
};

/** The chord's root (pitch class) and quality: "M", "m", "d", or "o" where the third does not sound. */
function rootQuality(n: BachEvent): { root: number; q: string } {
  const root = mod(midiOf(`${n.root}4`), 12);
  const q = /third not sounding/.test(n.kind)
    ? "o"
    : /^(major|dominant)/.test(n.kind)
      ? "M"
      : /^minor/.test(n.kind)
        ? "m"
        : "d";
  return { root, q };
}

const isDominant = (n: BachEvent) => /^(major$|dominant)/.test(n.kind) || n.kind === "seventh chord, third not sounding (minor seventh)";

const inKey = (root: number, q: string, tonic: number, mode: KeyMode) => {
  const r = mod(root - tonic, 12);
  return q === "o" ? DIATONIC[mode].has(`${r}M`) || DIATONIC[mode].has(`${r}m`) : DIATONIC[mode].has(`${r}${q}`);
};

/** The position of a key's signature on the circle of fifths (a minor key at its relative major's). */
const fifths = (pc: number, mode: KeyMode) => {
  const major = mode === "major" ? pc : mod(pc + 3, 12);
  const f = mod(major * 7, 12);
  return f > 6 ? f - 12 : f;
};
const distance = (a: number, b: number) => Math.min(Math.abs(a - b), 12 - Math.abs(a - b));

const STATES: { pc: number; mode: KeyMode }[] = [];
for (const mode of ["major", "minor"] as KeyMode[]) for (let pc = 0; pc < 12; pc++) STATES.push({ pc, mode });

/** The chord as a degree of a key whose tonic is `tonic` (the Roman numeral convention of
 *  tools/chorales/cadence_plans.py: minor lower case, diminished upper case with °). */
export function chordIn(n: BachEvent, tonic: number): string {
  const { root, q } = rootQuality(n);
  const r = ROMAN[mod(root - tonic, 12)];
  return q === "m" ? r.toLowerCase() : q === "d" ? `${r}°` : r;
}

/** Spell a local tonic as a degree of the home key ("V" of G is D, "#IV" of G is C#). */
function spellTonic(homeTonic: string, pc: number): string {
  const home = mod(midiOf(`${homeTonic}4`), 12);
  const off = mod(pc - home, 12);
  const letter = LETTERS[(LETTERS.indexOf(homeTonic[0]) + ROMAN_STEP[off]) % 7];
  const a = mod(pc - NATURAL[LETTERS.indexOf(letter)] + 6, 12) - 6;
  return letter + (a > 0 ? "#".repeat(a) : "b".repeat(-a));
}

const cache = new WeakMap<BachChorale, LocalKey[]>();

/** The local key of every event of a chorale (Viterbi over the 24 keys). */
export function localKeys(c: BachChorale, w = WEIGHTS): LocalKey[] {
  if (w === WEIGHTS && cache.has(c)) return cache.get(c)!;
  const home = mod(midiOf(`${c.tonic}4`), 12);
  const homeIndex = STATES.findIndex((s) => s.pc === home && s.mode === c.mode);
  const homeFifths = fifths(home, c.mode);
  const N = c.notes.length,
    S = STATES.length;
  const rq = c.notes.map(rootQuality);
  // the keys a region may be in: the home key, and the keys the phrase's own close and the close
  // before it confirm (the key whose tonic or dominant the phrase ends on)
  const closes: number[][] = [];
  for (let i = 0; i < N; i++)
    if (c.notes[i].end || i === N - 1) {
      const { root, q } = rq[i];
      const ks: number[] = [];
      for (let s = 0; s < STATES.length; s++) {
        const { pc, mode } = STATES[s];
        if (pc === root && (q === "o" || q === (mode === "major" ? "M" : "m"))) ks.push(s);
        else if (mod(root - pc, 12) === 7 && q !== "m" && q !== "d") ks.push(s);
      }
      closes.push(ks);
    }
  const phraseOf: number[] = [];
  for (let i = 0, p = 0; i < N; i++) {
    phraseOf.push(p);
    if (c.notes[i].end) p = Math.min(p + 1, closes.length - 1);
  }
  const allowed = (i: number, s: number) => s === homeIndex || closes[phraseOf[i]].includes(s) || (phraseOf[i] > 0 && closes[phraseOf[i] - 1].includes(s));
  // evidence for each key at each event
  const score = (i: number, s: number) => {
    if (!allowed(i, s)) return -Infinity;
    const n = c.notes[i];
    const { pc, mode } = STATES[s];
    let x = 0;
    for (const p of [n.sp, n.a, n.tn, n.bp]) if (p) x += w.pitch * LOGP[mode][mod(midiOf(p) - pc, 12)];
    x += inKey(rq[i].root, rq[i].q, pc, mode) ? w.inKey : w.outKey;
    // a dominant and its tonic: this chord the dominant of the key, the next its tonic (or the reverse)
    const domTo = (j: number) => j + 1 < N && isDominant(c.notes[j]) && mod(rq[j].root - pc, 12) === 7 && rq[j + 1].root === pc && rq[j + 1].q !== "d";
    if (domTo(i) || (i > 0 && domTo(i - 1))) {
      const t = domTo(i) ? rq[i + 1] : rq[i];
      if (t.q === "o" || (t.q === "M") === (mode === "major") || i === N - 1) x += w.dominant;
    }
    if (n.end) {
      const r = mod(rq[i].root - pc, 12);
      // the chord before the close: the last on-beat chord of another root, where the export has it
      const pre = n.pr && n.pk ? { root: mod(midiOf(`${n.pr}4`), 12), dom: /^(major$|dominant)/.test(n.pk) || n.pk === "seventh chord, third not sounding (minor seventh)" } : i > 0 ? { root: rq[i - 1].root, dom: isDominant(c.notes[i - 1]) } : null;
      const fromDominant = !!pre && pre.dom && mod(pre.root - rq[i].root, 12) === 7;
      if (r === 0 && (rq[i].q === "o" || rq[i].q === (mode === "major" ? "M" : "m") || (mode === "minor" && rq[i].q === "M" && i === N - 1))) x += w.tonicEnd + (fromDominant ? w.fullClose : 0);
      // a half close on the key's dominant, unless that dominant is reached from its own dominant: then
      // the phrase closes in the dominant's key (Kirnberger, Kunst I, pp. 95-96), not on its dominant
      else if (r === 7 && rq[i].q !== "m" && !fromDominant) x += w.dominantEnd;
    }
    if (i === N - 1) {
      // the last chord is read in the home key, always
      if (pc !== home || mode !== c.mode) return -Infinity;
      x += w.last;
    }
    x -= w.distance * distance(fifths(pc, mode), homeFifths);
    return x;
  };
  let v = new Float64Array(S).fill(-Infinity);
  const back: Int16Array[] = [];
  for (let s = 0; s < S; s++) v[s] = score(0, s) - (s === homeIndex ? 0 : w.change);
  for (let i = 1; i < N; i++) {
    let best = 0;
    for (let s = 1; s < S; s++) if (v[s] > v[best]) best = s;
    const nv = new Float64Array(S),
      bk = new Int16Array(S);
    for (let s = 0; s < S; s++) {
      const stay = v[s],
        move = v[best] - w.change;
      nv[s] = (stay >= move ? stay : move) + score(i, s);
      bk[s] = stay >= move ? s : best;
    }
    back.push(bk);
    v = nv;
  }
  let s = 0;
  for (let k = 1; k < S; k++) if (v[k] > v[s]) s = k;
  const path = new Array<number>(N);
  path[N - 1] = s;
  for (let i = N - 1; i > 0; i--) path[i - 1] = back[i - 1][path[i]];
  const out = path.map((st, i) => {
    const { pc, mode } = STATES[st];
    const k: LocalKey = { tonic: spellTonic(c.tonic, pc), pc, mode, chord: chordIn(c.notes[i], pc), diatonic: inKey(rq[i].root, rq[i].q, pc, mode) };
    // the Picardy third: a minor key's tonic as a major chord at a phrase end
    if (!k.diatonic && mode === "minor" && rq[i].root === pc && rq[i].q === "M" && (c.notes[i].end || i === N - 1)) k.diatonic = true;
    // a dominant or a leading-tone chord going to a degree of the key
    const lead = rq[i].q === "d";
    if (!k.diatonic && (isDominant(c.notes[i]) || lead) && i + 1 < N) {
      const target = mod(rq[i].root + (lead ? 1 : 5), 12);
      if (rq[i + 1].root !== target) return k;
      const q = ["M", "m"].find((x) => DIATONIC[mode].has(`${mod(target - pc, 12)}${x}`) && !(mode === "minor" && x === "M" && mod(target - pc, 12) === 5));
      if (q && mod(target - pc, 12) !== 0) {
        const r = ROMAN[mod(target - pc, 12)];
        k.applied = q === "m" ? r.toLowerCase() : r;
      }
    }
    return k;
  });
  if (w === WEIGHTS) cache.set(c, out);
  return out;
}

/** A local key as a degree of the home key ("V", "vi", "I"): lower case for minor. */
export function keyDegree(c: BachChorale, k: { pc: number; mode: KeyMode }): string {
  const r = ROMAN[mod(k.pc - mod(midiOf(`${c.tonic}4`), 12), 12)];
  return k.mode === "minor" ? r.toLowerCase() : r;
}
