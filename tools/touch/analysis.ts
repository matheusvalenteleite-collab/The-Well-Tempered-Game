/**
 * D189: the readings the bench draws that the touch pieces did not carry, computed from the notes
 * when data/touch/pieces.json is written (tools/touch/extract.ts):
 *   - the entries as kept (buildEntries): augmented, diminished, inverted, later subjects marked; the
 *     key of each read from its own notes and all the voices while it sounds (Krumhansl and
 *     Kessler's key profiles, 1982), the level its transposition implies kept unless its notes
 *     contradict it, spelled as the score spells (E♯ minor in C♯ major, not F minor); subject or
 *     answer by that key;
 *   - the cadences: authentic (perfect, imperfect), deceptive, half and Phrygian half, by a
 *     conservative reading of the bass and the harmony around each strong beat (below);
 *   - the countersubject against each entry, where a fugue has a regular one (src/wtc/countersubject.ts,
 *     the study's reading, docs/wtc/countersubject-study.md), found again against the touch entries.
 * Computed readings, not Bach's word: tests check them against Ledbetter (2002) where he names a
 * cadence, and the report in docs/DECISIONS.md (D189) gives how often they agree.
 */
import type { WtcPiece } from "../../src/wtc/corpus.ts";
import { countersubjectCandidate, likeness, within } from "../../src/wtc/countersubject.ts";
import { line, subjectAndAnswer } from "../../src/wtc/fugue.ts";

export type Note = [on: number, dur: number, midi: number, step: number];

export interface Piece {
  tpq: number;
  meter: string;
  bars: { n: number; on: number }[];
  length: number;
  voices: Note[][];
  /** The home key, minor in lower case ("c", "Eb"). */
  key: string;
}

export type CadenceKind = "perfect" | "imperfect" | "deceptive" | "half" | "phrygian";

export interface Cadence {
  /** The tick where the arrival chord begins (a strong beat). */
  on: number;
  bar: number;
  /** The key the cadence is in, minor in lower case. */
  key: string;
  kind: CadenceKind;
}

const pcOf = (m: number) => ((m % 12) + 12) % 12;
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** A key's tonic pitch class and mode ("Eb" → 3, major; "f#" → 6, minor). */
export function keyPc(key: string): { pc: number; minor: boolean } {
  const minor = key[0] === key[0].toLowerCase();
  let pc = PC[key[0].toUpperCase()];
  for (const ch of key.slice(1)) pc += ch === "#" ? 1 : ch === "b" ? -1 : 0;
  return { pc: pcOf(pc), minor };
}

/** The beat (as src/touch/fugue.ts's beatOf): its ticks and how many to the bar. */
export function beatOf(p: Pick<Piece, "meter" | "tpq">): { ticks: number; perBar: number } {
  const [num, den] = p.meter.split("/").map(Number);
  const unit = (p.tpq * 4) / den;
  return num % 3 === 0 && num > 3 ? { ticks: unit * 3, perBar: num / 3 } : { ticks: unit, perBar: num };
}

export const barAt = (p: Pick<Piece, "bars">, tick: number) => p.bars.filter((b) => b.on <= tick).at(-1)?.n ?? p.bars[0]?.n ?? 1;

/**
 * How a piece spells its keys: each pitch class as the score spells it most often ("E#" in C♯
 * major, "F" in F minor), from the spelled notes ("E#4", "Bb3").
 */
export function keySpeller(spelled: string[]): (pc: number, minor: boolean) => string {
  const counts = new Map<number, Map<string, number>>();
  for (const s of spelled) {
    const name = s.replace(/-?\d+$/, "");
    const pc = keyPc(name).pc;
    if (!counts.has(pc)) counts.set(pc, new Map());
    const m = counts.get(pc)!;
    m.set(name, (m.get(name) ?? 0) + 1);
  }
  const FALLBACK = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  return (pc, minor) => {
    const m = counts.get(pcOf(pc));
    const name = m ? [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0] : FALLBACK[pcOf(pc)];
    return minor ? name[0].toLowerCase() + name.slice(1) : name;
  };
}

// --- Keys -------------------------------------------------------------------------------------

// Krumhansl & Kessler (1982) probe-tone profiles, as used by Krumhansl's key-finding algorithm (1990).
const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/** The pitch classes' sounding time in [from, to), all voices. */
export function pcWeights(p: Piece, from: number, to: number): number[] {
  const w = new Array(12).fill(0);
  for (const v of p.voices)
    for (const [on, dur, midi] of v) {
      const a = Math.max(on, from);
      const b = Math.min(on + dur, to);
      if (b > a) w[pcOf(midi)] += b - a;
    }
  return w;
}

function correlation(x: number[], y: number[]): number {
  const mx = x.reduce((a, b) => a + b, 0) / x.length;
  const my = y.reduce((a, b) => a + b, 0) / y.length;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

/** The 24 keys' fit to a profile of pitch-class weights, best first. */
export function keyScores(w: number[]): { pc: number; minor: boolean; r: number }[] {
  const out: { pc: number; minor: boolean; r: number }[] = [];
  for (let pc = 0; pc < 12; pc++)
    for (const minor of [false, true]) {
      const prof = minor ? KK_MINOR : KK_MAJOR;
      out.push({ pc, minor, r: correlation(w, w.map((_, i) => prof[pcOf(i - pc)])) });
    }
  return out.sort((a, b) => b.r - a.r);
}

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
// The minor scale with both its sixths and sevenths (natural, harmonic, melodic).
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 9, 10, 11];

/** How many of the notes (MIDI) lie outside a key's scale. */
export function clashes(midis: number[], pc: number, minor: boolean): number {
  const scale = minor ? MINOR_SCALE : MAJOR_SCALE;
  return midis.filter((m) => !scale.includes(pcOf(m - pc))).length;
}

/**
 * The key of an entry, conservatively, from its own notes (those that keep the theme's shape) and
 * the music sounding with it. The keys whose scale holds the entry's notes best (no note outside
 * it, or as few as any key allows) are the candidates, ranked by how well the music sounding with
 * the entry fits them (Krumhansl and Kessler's profiles over every voice while it sounds, its first
 * half counted twice: an entry may modulate on its way to the next). The level its transposition
 * implies (the subject's tonic moved by it) is kept if its scale holds the notes as well (but for
 * one, a chromatic inflection, where the entry is a real transposition, not a diatonic one): only
 * an entry whose own notes contradict that key is named otherwise. Then the key a fifth below that
 * level, if its scale holds them as well as any (the entry standing on the dominant: an answer in
 * that key, Book I no. 1, b. 12, E F♯ G♯ A … in A minor; b. 17, A B C♯ D … C F in D minor); else
 * the best candidate (a diatonic transposition: Book I no. 1, b. 21, B C D E F … over the dominant
 * pedal, in C major). A chromatic theme (no key holds it but for two notes or more: Book I no. 24)
 * keeps its level, in the theme's mode.
 */
export function entryKey(p: Piece, on: number, end: number, implied: number[], own: number[], tolerance = 0, minor?: boolean): { pc: number; minor: boolean } {
  const w = pcWeights(p, on, end);
  const w1 = pcWeights(p, on, on + (end - on) / 2);
  const all = keyScores(w.map((x, i) => x + w1[i])).map((k) => ({ ...k, clash: clashes(own, k.pc, k.minor) }));
  const least = Math.min(...all.map((k) => k.clash));
  // A chromatic theme (no key's scale holds it but for two notes or more) says little of its key: its level is kept.
  if (least >= 2 && implied.length) return all.find((k) => k.pc === implied[0] && (minor === undefined || k.minor === minor))!;
  // The implied level, when the entry is a real transposition, may keep a note outside its scale (a chromatic inflection of the theme).
  for (const [i, pc] of implied.entries()) {
    const s = all.filter((k) => k.pc === pc && k.clash <= least + (i === 0 ? tolerance : 0)).sort((a, b) => a.clash - b.clash)[0];
    if (s) return s;
  }
  const scores = all.filter((k) => k.clash === least);
  return scores[0];
}

// --- Cadences ---------------------------------------------------------------------------------

interface Flat {
  on: number;
  end: number;
  midi: number;
  voice: number;
}

/**
 * The cadences of a piece. At each strong beat (the downbeat; in a bar of two or four beats, the
 * middle of the bar too) the bass that arrives there and the bass just before it are read, with the sounding time of
 * every pitch class in the beat before (the approach) and the beat after (the arrival):
 *   authentic: the bass falls a fifth (or rises a fourth) from ^5 to ^1, the approach a dominant
 *     (its root, its major third, the leading tone, sounding; at least 55% of its time on V or V7's
 *     tones; at least half a beat), the arrival a tonic triad (60%), its third fixing the mode. The
 *     top voice on ^1: perfect; on ^3: imperfect; on ^5 not counted. A suspension or appoggiatura
 *     in the top voice is read at its resolution (within half a beat). An arrival that at once takes
 *     a minor seventh (a dominant of the next chord) is a link of a sequence, not a cadence; so is
 *     each but the last of a chain of such arrivals a bar or less apart, each on the dominant of the
 *     next.
 *   deceptive: the same approach for a whole beat, the bass rising a step from ^5 to ^6, the
 *     arrival vi (VI in minor) with the tonic in it, the leading tone rising to it in its voice.
 *   half: the bass arriving on ^5 from ^1, ^4 or ^6 and held two beats under a major triad (no
 *     seventh); Phrygian: from ♭^6 a semitone above, over iv⁶, in minor.
 *   A deceptive or half cadence only in a key the music around it is in (among the three keys that
 *     fit the two bars before best): a major triad held is the dominant of many keys.
 * The final close is read without the bass's fifth (it often comes over a tonic pedal): the last
 * chord, the tonic in the bass, the leading tone sounding in the beat before it (not in a piece
 * left unfinished).
 * Cadences less than a bar apart: the stronger kept (perfect, deceptive, imperfect, Phrygian, half).
 */
export function findCadences(p: Piece, speller: (pc: number, minor: boolean) => string, finished = true): Cadence[] {
  const { ticks: beat, perBar } = beatOf(p);
  const flat: Flat[] = p.voices.flatMap((v, voice) => v.map(([on, dur, midi]) => ({ on, end: on + dur, midi, voice })));
  flat.sort((a, b) => a.on - b.on);
  const sounding = (t: number) => flat.filter((n) => n.on <= t && n.end > t);
  const lowest = (t: number) => sounding(t).reduce<Flat | null>((lo, n) => (!lo || n.midi < lo.midi ? n : lo), null);
  const highest = (t: number) => sounding(t).reduce<Flat | null>((hi, n) => (!hi || n.midi > hi.midi ? n : hi), null);
  const weights = (from: number, to: number) => pcWeights(p, from, to);
  const share = (w: number[], pcs: number[]) => {
    const total = w.reduce((a, b) => a + b, 0);
    return total ? pcs.reduce((a, pc) => a + w[pcOf(pc)], 0) / total : 0;
  };
  const home = keyPc(p.key);
  const lastBar = p.bars.at(-1)!;
  const barTicks = (p.tpq * 4 * Number(p.meter.split("/")[0])) / Number(p.meter.split("/")[1]);

  // The strong beats.
  const strong: number[] = [];
  for (let i = 0; i < p.bars.length; i++) {
    const b = p.bars[i];
    const next = p.bars[i + 1]?.on ?? p.length;
    strong.push(b.on);
    if (perBar % 2 === 0 && next - b.on >= perBar * beat) strong.push(b.on + (perBar / 2) * beat);
  }

  /** The bass's run on one pitch class back from t (an octave leap kept), up to a beat: its start. */
  const approach = (t: number, pc: number) => {
    let s = t;
    while (s > t - beat) {
      const lo = lowest(s - 1);
      if (!lo || pcOf(lo.midi) !== pc) break;
      s = Math.max(lo.on, t - beat);
    }
    return s;
  };
  /** The mode in the window: the major or minor third over the tonic, the longer. */
  const modeIn = (w: number[], tonic: number): boolean | null => {
    const maj = w[pcOf(tonic + 4)];
    const min = w[pcOf(tonic + 3)];
    if (maj === 0 && min === 0) return null;
    return min > maj;
  };
  /** The mode from the music before t (a key profile limited to the two modes on that tonic). */
  const modeBefore = (t: number, tonic: number): boolean => {
    const s = keyScores(weights(Math.max(0, t - 2 * barTicks), t)).filter((k) => k.pc === tonic);
    return s[0].minor;
  };
  /** A key the music around t is in: the tonic among the three that fit best (either mode) the two bars before and the beat after. */
  const inContext = (t: number, tonic: number) =>
    [...new Set(keyScores(weights(Math.max(0, t - 2 * barTicks), Math.min(p.length, t + beat))).map((k) => k.pc))].slice(0, 3).includes(tonic);
  /** The top voice's degree at the arrival, a non-chord tone read at its resolution. */
  const topDegree = (t: number, tonic: number, third: number) => {
    const hi = highest(t);
    if (!hi) return -1;
    const chord = [0, third, 7];
    let pc = pcOf(hi.midi - tonic);
    if (!chord.includes(pc)) {
      const next = flat.find((n) => n.voice === hi.voice && n.on >= hi.end && n.on <= t + beat / 2);
      if (next) pc = pcOf(next.midi - tonic);
    }
    return pc;
  };

  const found: (Cadence & { dom?: number; tonic?: number })[] = [];
  for (const t of strong) {
    if (t <= 0) continue;
    const arr = lowest(t);
    const before = lowest(t - 1);
    if (!arr || !before || arr.on !== t) continue;
    const b1 = pcOf(arr.midi);
    const b0 = pcOf(before.midi);
    const s = approach(t, b0);
    const W = weights(s, t);
    const A = weights(t, Math.min(t + beat, p.length));
    const dominantOk = (root: number) =>
      t - s >= beat / 2 && W[pcOf(root + 4)] > 0 && W[pcOf(root + 4)] >= W[pcOf(root + 3)] && share(W, [root, root + 4, root + 7, root + 10]) >= 0.55;
    const nearEnd = finished && t >= lastBar.on - barTicks;

    // Authentic: ^5 to ^1 in the bass.
    if (pcOf(b0 - b1) === 7 && dominantOk(b0)) {
      let minor = modeIn(A, b1);
      if (minor === null) minor = W[pcOf(b1 + 8)] > W[pcOf(b1 + 9)] ? true : W[pcOf(b1 + 9)] > 0 ? false : modeBefore(t, b1);
      // The last chord of a minor piece in major (the Picardy third) closes in the minor key.
      if (!minor && nearEnd && home.minor && b1 === home.pc) minor = true;
      const third = modeIn(A, b1) === false ? 4 : modeIn(A, b1) === true ? 3 : minor ? 3 : 4;
      const tonicShare = share(A, [b1, b1 + third, b1 + 7]);
      const seventh = A[pcOf(b1 + 10)] / (A.reduce((a, x) => a + x, 0) || 1);
      if (tonicShare >= 0.6 && !(seventh >= 0.15 && !nearEnd)) {
        const deg = topDegree(t, b1, third);
        const kind = deg === 0 ? "perfect" : deg === 3 || deg === 4 ? "imperfect" : null;
        if (kind) found.push({ on: t, bar: barAt(p, t), key: speller(b1, minor), kind, dom: b0, tonic: b1 });
      }
      continue;
    }
    // Deceptive: ^5 up a step to ^6.
    const step = pcOf(b1 - b0);
    if ((step === 1 || step === 2) && dominantOk(b0)) {
      const tonic = pcOf(b0 + 5);
      const minor = step === 1;
      const chord = minor ? [b1, b1 + 4, b1 + 7] : [b1, b1 + 3, b1 + 7];
      // The leading tone, sounding to the last in an upper voice, rises to the tonic there; the approach a whole beat.
      const lt = flat.find((n) => n.on < t && n.end >= t && n.voice !== before.voice && pcOf(n.midi) === pcOf(b0 + 4));
      const resolves = lt && flat.some((n) => n.voice === lt.voice && n.on === lt.end && n.on <= t + beat / 2 && n.midi === lt.midi + 1);
      if (t - approach(t, b0) >= beat && resolves && share(A, chord) >= 0.6 && A[tonic] > 0 && inContext(t, tonic))
        found.push({ on: t, bar: barAt(p, t), key: speller(tonic, minor), kind: "deceptive" });
      continue;
    }
    // Half: arriving on ^5, held two beats under a major triad.
    const held = Math.min(t + 2 * beat, p.length);
    if (held - t < 2 * beat) continue;
    let steady = true;
    for (let u = t; u < held; u += beat / 4) if (pcOf(lowest(u)?.midi ?? -1) !== b1) steady = false;
    if (!steady) continue;
    const H = weights(t, held);
    const triad = share(H, [b1, b1 + 4, b1 + 7]) >= 0.65 && H[pcOf(b1 + 4)] > 0 && H[pcOf(b1 + 3)] === 0 && H[pcOf(b1 + 10)] / (H.reduce((a, x) => a + x, 0) || 1) < 0.1;
    if (!triad) continue;
    const tonic = pcOf(b1 + 5);
    const from = pcOf(b0 - b1);
    const P = weights(Math.max(0, t - beat), t);
    if (!inContext(t, tonic)) continue;
    if (from === 1 && share(P, [b0, tonic, b0 + 9]) >= 0.5) {
      // iv⁶ (♭^6 in the bass, ^1 and ^4 above it) to V: the Phrygian half cadence, in minor.
      found.push({ on: t, bar: barAt(p, t), key: speller(tonic, true), kind: "phrygian" });
    } else if (from === 5 || from === 10 || from === 2) {
      const minor = modeBefore(t, tonic);
      found.push({ on: t, bar: barAt(p, t), key: speller(tonic, minor), kind: "half" });
    }
  }

  // The final close: the last chord, struck over the tonic in the bass (held as a pedal, or struck),
  // the leading tone sounding in the beat before it in an upper voice: perfect or imperfect by its top note.
  const lastOn = Math.max(...flat.filter((n) => n.end >= p.length - 1).map((n) => n.on));
  const fin = lowest(lastOn);
  if (finished && fin && pcOf(fin.midi) === home.pc && !found.some((c) => c.on >= lastOn - beat)) {
    const W = weights(Math.max(0, lastOn - beat), lastOn);
    const third = home.minor ? 3 : 4;
    if (W[pcOf(home.pc + 11)] > 0) {
      const deg = topDegree(lastOn, home.pc, third);
      const kind = deg === 0 ? "perfect" : deg === 3 || deg === 4 ? "imperfect" : null;
      if (kind) found.push({ on: lastOn, bar: barAt(p, lastOn), key: speller(home.pc, home.minor), kind });
    }
  }

  // A chain of arrivals each on the dominant of the next, a bar or less apart, is a sequence: only its last may close.
  const authentic = found.filter((c) => c.dom !== undefined);
  for (let i = authentic.length - 2; i >= 0; i--) {
    const a = authentic[i];
    const b = authentic[i + 1];
    if (b.on - a.on <= barTicks && b.dom === a.tonic) found.splice(found.indexOf(a), 1);
  }
  const RANK: Record<CadenceKind, number> = { perfect: 5, deceptive: 4, imperfect: 3, phrygian: 2, half: 1 };
  const kept: Cadence[] = [];
  for (const c of found) {
    const prev = kept.at(-1);
    const clean: Cadence = { on: c.on, bar: c.bar, key: c.key, kind: c.kind };
    if (prev && c.on - prev.on < barTicks) {
      if (RANK[c.kind] >= RANK[prev.kind]) kept[kept.length - 1] = clean;
    } else kept.push(clean);
  }
  return kept;
}

// --- Countersubjects --------------------------------------------------------------------------

export interface CsUse {
  /** The entry it accompanies (an index into the piece's entries). */
  entry: number;
  voice: number;
  on: number;
  end: number;
  /** The share of the countersubject's intervals (by letter) and onsets it keeps (0.6 to 1). */
  likeness: number;
}

/**
 * The countersubject against each entry (D189), where the fugue has a regular one: the study's
 * candidate (what the subject's voice plays while the answer sounds, src/wtc/countersubject.ts)
 * sought against every later plain entry, in every other voice, from the same distance after the
 * entry's start, by its intervals by letter and its rhythm (so at any octave: above the entry or
 * below it, invertible counterpoint). Regular: it comes back (60% of it kept) against two later
 * entries at least and a quarter of them (docs/wtc/countersubject-study.md asks a third of the
 * entries its own finder gives; the touch entries are the library's, more of them, so a quarter).
 * Entries in inversion, augmentation or diminution are not sought.
 */
export function countersubjects(p: WtcPiece, entries: { voice: number; on: number; plain: boolean }[], min = 0.6): CsUse[] {
  if (entries.length < 2) return [];
  const { answer, first, second } = subjectAndAnswer(p);
  const cs = countersubjectCandidate(p, first, answer);
  if (cs.length < 3) return [];
  const answerEntry = entries.findIndex((e) => e.voice === second && Math.abs(e.on - answer[0].on) <= p.voices.length);
  if (answerEntry < 0) return [];
  const off = cs[0].on - answer[0].on;
  const span = cs[cs.length - 1].on + cs[cs.length - 1].dur - cs[0].on;
  const lines = p.voices.map(line);
  const out: CsUse[] = [{ entry: answerEntry, voice: first, on: cs[0].on, end: cs[0].on + span, likeness: 1 }];
  entries.forEach((e, k) => {
    if (k <= answerEntry || !e.plain) return;
    let best: CsUse | null = null;
    lines.forEach((l, voice) => {
      if (voice === e.voice) return;
      const from = e.on + off;
      const seg = within(l, from, from + span).filter((n) => n.on >= from);
      if (!seg.length) return;
      const lk = likeness(cs, seg);
      const last = seg[seg.length - 1];
      if (!best || lk > best.likeness) best = { entry: k, voice, on: seg[0].on, end: Math.min(from + span, last.on + last.dur), likeness: Math.round(lk * 100) / 100 };
    });
    if (best && (best as CsUse).likeness >= min) out.push(best);
  });
  const later = entries.filter((e, k) => k > answerEntry && e.plain).length;
  const uses = out.length - 1;
  return uses >= 2 && uses >= later / 4 ? out : [];
}

// --- Entries ----------------------------------------------------------------------------------

export interface RawEntry {
  voice: number;
  on: number;
  /** The entry's length in ticks (the subject's, scaled). */
  len: number;
  /** Semitones from the theme's first statement (an inversion's: from its mirror). */
  shift: number;
  inverted: boolean;
  /** 1; 2 in augmentation, 0.5 in diminution. */
  scale: number;
  /** 1 for the (first) subject; 2, 3 for a later subject of a double or triple fugue. */
  theme: number;
}

export interface BuiltEntry {
  voice: number;
  form: "subject" | "answer";
  key: string;
  bar: number;
  on: number;
  end: number;
  notes: [number, number, number, 0 | 1][];
  inverted?: true;
  scale?: 2 | 0.5;
  theme?: 2 | 3;
}

/**
 * The entries as the touch game keeps them: each in its voice for the subject's whole length; its
 * key (entryKey above); the answer where that key is the dominant's (the subject's level and the
 * answer's are told apart by key, not by shape: a real answer has the subject's shape, and an
 * entry bent at its end is not an answer for that, Book II no. 22, b. 11); a note marked varied
 * where it leaves the theme's shape (by letter, from the entry's first note, at the theme's rhythm;
 * mirrored when inverted, scaled when augmented or diminished; against the subject's shape or the
 * answer's, whichever the entry follows more closely).
 */
export function buildEntries(p: Piece, raw: RawEntry[], speller: (pc: number, minor: boolean) => string, handKeys?: string[]): BuiltEntry[] {
  const home = keyPc(p.key);
  const dominant = pcOf(home.pc + 7);
  const notesOf = (r: RawEntry) => p.voices[r.voice].filter((n) => n[0] >= r.on && n[0] < r.on + r.len);
  const sorted = [...raw].sort((a, b) => a.on - b.on || a.voice - b.voice);
  // Each theme's tonic: the home key's for the first; a later one's read from its first statement.
  const themeTonic = new Map<number, number>([[1, home.pc]]);
  const themeMinor = new Map<number, boolean>([[1, home.minor]]);
  // Each theme's shapes: its first plain statement (the subject) and its second (the answer).
  // (Each: the letter steps and the pitches at each onset from its start, and its level, in semitones, against the subject's.)
  type Shape = { steps: Map<number, number>; midis: Map<number, number>; level: number };
  const shapes = new Map<number, Shape[]>();
  for (const r of sorted) {
    if (r.inverted || r.scale !== 1) continue;
    const ns = notesOf(r);
    if (!ns.length) continue;
    if (!themeTonic.has(r.theme)) {
      const k = entryKey(p, r.on, r.on + r.len, [], ns.map((n) => n[2]));
      themeTonic.set(r.theme, pcOf(k.pc - r.shift));
      themeMinor.set(r.theme, k.minor);
    }
    const list = shapes.get(r.theme) ?? [];
    if (list.length < 2) list.push({ steps: new Map(ns.map((n) => [n[0] - r.on, n[3] - ns[0][3]])), midis: new Map(ns.map((n) => [n[0] - r.on, n[2]])), level: list.length ? r.shift : 0 });
    shapes.set(r.theme, list);
  }
  // Each theme's exposition: its plain statements until every voice has had one.
  const expo = new Set<RawEntry>();
  for (const theme of themeTonic.keys()) {
    const voices = new Set<number>();
    for (const r of sorted) {
      if (r.theme !== theme || r.inverted || r.scale !== 1 || voices.size === p.voices.length) continue;
      if (!voices.has(r.voice)) expo.add(r);
      voices.add(r.voice);
    }
  }
  let plainIndex = 0;
  return sorted
    .map((r) => ({ r, ns: notesOf(r) }))
    .filter(({ ns }) => ns.length)
    .map(({ r, ns }) => {
      const tonic = themeTonic.get(r.theme) ?? home.pc;
      // The notes that keep the theme's shape: by letter, at the theme's rhythm (scaled), mirrored if
      // inverted, against the subject's shape or the answer's, at the level most of them keep (so that
      // a varied first note does not mark every note after it). The entry's level (semitones from the
      // subject, as the subject's tonic moves) is read from those notes.
      const sign = r.inverted ? -1 : 1;
      const fitting = (shape: Shape, delta: number) => {
        const rel = (n: Note) => (n[0] - r.on) / r.scale + delta;
        const tally = new Map<number, number>();
        for (const n of ns) {
          const want = shape.steps.get(rel(n));
          if (want !== undefined) tally.set(sign * n[3] - want, (tally.get(sign * n[3] - want) ?? 0) + 1);
        }
        const [base] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0] ?? [NaN];
        const kept = ns.filter((n) => shape.steps.get(rel(n)) === sign * n[3] - base);
        // The level: the commonest distance of the kept notes from the shape's (mirrored about the shape's first note if inverted).
        const first = shape.midis.get(0) ?? 0;
        const dist = new Map<number, number>();
        for (const n of kept) {
          const m = shape.midis.get(rel(n))!;
          const d = pcOf(n[2] - (r.inverted ? 2 * first - m : m) + shape.level);
          dist.set(d, (dist.get(d) ?? 0) + 1);
        }
        const [level, count] = [...dist.entries()].sort((a, b) => b[1] - a[1])[0] ?? [r.shift, 0];
        // Exact: the kept notes (three in four at least) all at one distance, a real transposition, not a diatonic one.
        return { kept: new Set(kept), level, exact: count >= 0.75 * kept.length };
      };
      // The entry as found may begin a note early or late (a varied head): the shape is laid from
      // each of the entry's first three notes onto each of its own first three.
      const tries: { kept: Set<Note>; level: number; exact: boolean }[] = [];
      for (const shape of shapes.get(r.theme) ?? []) {
        const offs = [...shape.steps.keys()].sort((a, b) => a - b).slice(0, 3);
        const deltas = new Set(offs.flatMap((o) => ns.slice(0, 3).map((n) => o - (n[0] - r.on) / r.scale)));
        for (const d of deltas) tries.push(fitting(shape, d));
      }
      const fit = tries.sort((a, b) => b.kept.size - a.kept.size)[0] ?? { kept: new Set<Note>(), level: r.shift, exact: false };
      const kept = fit.kept;
      const sure = kept.size >= Math.max(3, ns.length / 2);
      const own = (sure ? ns.filter((n) => kept.has(n)) : ns).map((n) => n[2]);
      const shift = sure ? fit.level : r.shift;
      const implied = [pcOf(tonic + shift), pcOf(tonic + shift + 5)];
      const level = pcOf(shift);
      // In the theme's exposition, the subject's level is the theme's key, the answer's the dominant (in the theme's mode).
      const k =
        expo.has(r) && !r.inverted && r.scale === 1 && (level === 0 || level === 7)
          ? { pc: pcOf(tonic + (level ? 7 : 0)), minor: themeMinor.get(r.theme) ?? home.minor }
          : entryKey(p, r.on, r.on + r.len, r.inverted ? [implied[1], implied[0]] : implied, own, sure && fit.exact ? 1 : 0, themeMinor.get(r.theme));
      const hand = r.theme === 1 && r.scale === 1 && !r.inverted ? handKeys?.[plainIndex++] : undefined;
      const key = hand ?? speller(k.pc, k.minor);
      const form: "subject" | "answer" = keyPc(key).pc === dominant ? "answer" : "subject";
      const e: BuiltEntry = {
        voice: r.voice,
        form,
        key,
        bar: barAt(p, r.on),
        on: r.on,
        end: r.on + r.len,
        notes: ns.map((n) => [n[0], n[1], n[2], kept.has(n) ? 0 : 1]),
      };
      if (r.inverted) e.inverted = true;
      if (r.scale === 2 || r.scale === 0.5) e.scale = r.scale;
      if (r.theme === 2 || r.theme === 3) e.theme = r.theme;
      return e;
    });
}

/**
 * D243: the colours come home. A piece's keys (its entries' or its cadences') leave out its return:
 * the last one read is often a turn to the subdominant over the closing pedal (Prelude 1 coloured F
 * from b. 21 to the end), or a key left long before the end with no cadence read after it. The home
 * key now holds from where the music is home for good, read in the bass, beat by beat (the lowest
 * note sounding in each beat): the closing run of the tonic in the bass and, just before it, of the
 * dominant (a dominant pedal, or the final cadence's V), or the tonic's alone after a plagal close.
 * Keys read after that point are dropped (the subdominant over a tonic pedal is not a modulation).
 * A minor piece ending on the major chord (a Picardy third) is in its minor to that chord, the major on it.
 * (D340: moved here from extract.ts, for tools/touch/more-bach.ts too.)
 */
export function homeward(f: { key: string; length: number; tpq: number; voices: Note[][]; keys: { on: number; key: string }[] }) {
  const tonic = keyPc(f.key).pc;
  const dominant = (tonic + 7) % 12;
  const beat = f.tpq;
  const notes = f.voices.flat();
  const bassPc = (t: number) => {
    let low = Infinity;
    for (const n of notes) if (n[0] < t + beat && n[0] + n[1] > t && n[2] < low) low = n[2];
    return low === Infinity ? -1 : low % 12;
  };
  let t = Math.floor((f.length - 1) / beat) * beat;
  while (t >= 0 && bassPc(t) === tonic) t -= beat;
  const tonicFrom = t + beat;
  while (t >= 0 && bassPc(t) === dominant) t -= beat;
  const home = Math.min(tonicFrom, t + beat);
  const lastOn = Math.max(...notes.map((n) => n[0]));
  const last = new Set(notes.filter((n) => n[0] + n[1] > lastOn).map((n) => n[2] % 12));
  const picardy = keyPc(f.key).minor && last.has((tonic + 4) % 12) && !last.has((tonic + 3) % 12);
  const kept = f.keys.filter((k) => k.on < home);
  if ((kept.at(-1)?.key ?? f.key) !== f.key) kept.push({ on: home, key: f.key });
  if (picardy) kept.push({ on: Math.max(home, Math.min(...notes.filter((n) => n[0] + n[1] > lastOn).map((n) => n[0]))), key: f.key[0].toUpperCase() + f.key.slice(1) });
  f.keys = kept;
}
