/**
 * A harmonic reading of a whole piece (D125): the chord of each stretch, read from the notes alone.
 * Each bar in which two notes sound together is one window (a line alone has no chord); a window is split in two when its halves fit two different chords much
 * better than the whole fits one (twice at most, never below a beat). A window's chord is the
 * triad or seventh chord (major, minor, diminished; dominant, major, minor, half-diminished,
 * diminished sevenths) whose tones carry the most of its sounding time, a missing tone costing,
 * the bass note breaking ties; the seventh is added only when it sounds. Named by root and bass
 * (C, Dm7/C) and by Roman numeral in the piece's key with figures for the inversion (ii⁴₂). The
 * cadences: a dominant (major triad or dominant seventh, root in the bass) going to a chord a
 * fifth below in root position, named by the key it confirms. Descriptive: Bach's harmony is read,
 * not judged, and a reading of the notes alone can misread passing notes as chord tones.
 */
import type { FullNote } from "./entries.ts";
import { degreeOf } from "./study.ts";

export type Quality = "maj" | "min" | "dim" | "7" | "maj7" | "m7" | "ø7" | "°7";

const TEMPLATES: { q: Quality; tones: number[] }[] = [
  { q: "maj", tones: [0, 4, 7] },
  { q: "min", tones: [0, 3, 7] },
  { q: "dim", tones: [0, 3, 6] },
  { q: "7", tones: [0, 4, 7, 10] },
  { q: "maj7", tones: [0, 4, 7, 11] },
  { q: "m7", tones: [0, 3, 7, 10] },
  { q: "ø7", tones: [0, 3, 6, 10] },
  { q: "°7", tones: [0, 3, 6, 9] },
];
const TRIAD_OF: Record<Quality, Quality> = { maj: "maj", min: "min", dim: "dim", "7": "maj", maj7: "maj", m7: "min", "ø7": "dim", "°7": "dim" };

export interface Chord {
  /** Quarters from the start of the first bar. */
  from: number;
  to: number;
  /** Pitch classes: the root and the bass. */
  root: number;
  bass: number;
  quality: Quality;
  /** The share of the window's sounding time on the chord's tones (0–1). */
  fit: number;
  /** The lowest sounding MIDI note and the chord's tones as sounding (for a block-chord reduction). */
  bassMidi: number;
}

export interface Cadence {
  /** Where the arrival chord begins. */
  at: number;
  /** The key confirmed: tonic pitch class, minor or not. */
  tonic: number;
  minor: boolean;
  /** Index of the arrival chord. */
  chord: number;
}

function profile(notes: FullNote[], from: number, to: number, cap: number) {
  const w = new Array(12).fill(0);
  let bassMidi = Infinity;
  let bassOnset = Infinity;
  for (const n of notes) {
    const a = Math.max(n.at, from);
    const b = Math.min(n.at + n.dur, to);
    if (b <= a + 1e-9) continue;
    // A held note counts no more than a beat: the arpeggio's notes are as much the chord as the bass held under them.
    // A note struck on the beat weighs more than one between beats (where passing notes are).
    const pos = (n.at / cap) % 1;
    const metric = n.at < from - 1e-6 || pos < 1e-6 || pos > 1 - 1e-6 ? 1.6 : Math.abs(pos - 0.5) < 1e-6 ? 1.2 : 1;
    w[((n.midi % 12) + 12) % 12] += Math.min(b - a, cap) * metric;
    // The bass: the lowest note sounding in the window's first half (an arpeggio's first note counts).
    if (a < from + (to - from) / 2 && n.midi < bassMidi) (bassMidi = n.midi), (bassOnset = a);
  }
  void bassOnset;
  return { w, bassMidi };
}

function best(w: number[], bassPc: number): { root: number; quality: Quality; fit: number; score: number } {
  const total = w.reduce((a, b) => a + b, 0) || 1;
  let top = { root: 0, quality: "maj" as Quality, fit: 0, score: -Infinity };
  for (let r = 0; r < 12; r++) {
    for (const { q, tones } of TEMPLATES) {
      const pcs = tones.map((x) => (r + x) % 12);
      // A seventh chord only when its seventh sounds (a tenth of the time at least).
      if (tones.length === 4 && w[pcs[3]] < 0.1 * total) continue;
      const inside = pcs.reduce((a, pc) => a + w[pc], 0);
      const missing = pcs.filter((pc) => w[pc] < 0.03 * total).length;
      const score = inside / total - (total - inside) / total - 0.25 * missing - (tones.length === 4 ? 0.04 : 0) - (q === "maj7" ? 0.06 : 0) + (r === bassPc ? 0.06 : 0) + (q === "dim" || q === "°7" ? -0.03 : 0);
      if (score > top.score + 1e-9) top = { root: r, quality: q, fit: inside / total, score };
    }
  }
  return top;
}

function read(notes: FullNote[], from: number, to: number, cap: number): Chord & { score: number } {
  const { w, bassMidi } = profile(notes, from, to, cap);
  const bassPc = Number.isFinite(bassMidi) ? ((bassMidi % 12) + 12) % 12 : 0;
  const b = best(w, bassPc);
  return { from, to, root: b.root, bass: bassPc, quality: b.quality, fit: b.fit, score: b.score, bassMidi: Number.isFinite(bassMidi) ? bassMidi : 48 };
}

/** Two notes sounding together somewhere in the window (a single line alone is given no chord). */
function polyphonic(notes: FullNote[], from: number, to: number): boolean {
  const ns = notes.filter((n) => n.at < to - 1e-6 && n.at + n.dur > from + 1e-6);
  return ns.some((a, i) => ns.some((b, j) => j > i && Math.max(a.at, b.at, from) < Math.min(a.at + a.dur, b.at + b.dur, to) - 1e-6));
}

/** The chords of a piece, window by window. `beat` is the smallest window, in quarters. */
export function readHarmony(notes: FullNote[], bar: number, beat: number): Chord[] {
  const end = Math.max(...notes.map((n) => n.at + n.dur));
  const sorted = [...notes].sort((a, b) => a.at - b.at);
  const out: Chord[] = [];
  const split = (from: number, to: number, depth: number) => {
    const whole = read(sorted, from, to, beat);
    const half = (to - from) / 2;
    if (depth < 2 && half >= beat - 1e-6 && Math.abs(half / beat - Math.round(half / beat)) < 1e-6) {
      const a = read(sorted, from, from + half, beat);
      const b = read(sorted, from + half, to, beat);
      const differ = a.root !== b.root || TRIAD_OF[a.quality] !== TRIAD_OF[b.quality];
      if (differ && (a.score + b.score) / 2 > whole.score + 0.15) {
        split(from, from + half, depth + 1);
        split(from + half, to, depth + 1);
        return;
      }
    }
    if (whole.fit > 0 && polyphonic(sorted, from, to)) out.push(whole);
  };
  for (let b0 = 0; b0 < end - 1e-6; b0 += bar) split(b0, Math.min(end, b0 + bar), 0);
  // Two windows in a row with the same chord and bass are one.
  const merged: Chord[] = [];
  for (const c of out) {
    const p = merged[merged.length - 1];
    if (p && p.root === c.root && p.quality === c.quality && p.bass === c.bass && Math.abs(p.to - c.from) < 1e-6) p.to = c.to;
    else merged.push({ from: c.from, to: c.to, root: c.root, bass: c.bass, quality: c.quality, fit: c.fit, bassMidi: c.bassMidi });
  }
  // A diminished seventh has no root of its own sound (its four tones a minor third apart): it is the
  // leading-tone chord of the chord it goes to, if one of its tones is a semitone below that chord's root.
  merged.forEach((c, k) => {
    if (c.quality !== "°7" || k + 1 >= merged.length) return;
    const target = merged[k + 1].root;
    if ([0, 3, 6, 9].some((x) => (c.root + x) % 12 === (target + 11) % 12)) c.root = (target + 11) % 12;
  });
  return merged;
}

const SHARP_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const FLAT_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
const SUFFIX: Record<Quality, string> = { maj: "", min: "m", dim: "°", "7": "7", maj7: "maj7", m7: "m7", "ø7": "ø7", "°7": "°7" };

/** The chord by letter: root, quality, the bass after a slash if not the root. */
export function chordName(c: Chord, flats: boolean): string {
  const N = flats ? FLAT_NAMES : SHARP_NAMES;
  return `${N[c.root]}${SUFFIX[c.quality]}${c.bass !== c.root ? `/${N[c.bass]}` : ""}`;
}

/** The chord's tones above the root, by quality. */
export const chordTones = (c: Chord) => TEMPLATES.find((x) => x.q === c.quality)!.tones.map((x) => (c.root + x) % 12);

/** The diatonic triads (degree in semitones above the tonic → quality), the harmonic minor's with its natural VII. */
const DIATONIC_MAJOR: Record<number, Quality> = { 0: "maj", 2: "min", 4: "min", 5: "maj", 7: "maj", 9: "min", 11: "dim" };
const DIATONIC_MINOR: Record<number, Quality> = { 0: "min", 2: "dim", 3: "maj", 5: "min", 7: "maj", 8: "maj", 10: "maj", 11: "dim" };
const lowerQ = (q: Quality) => q === "min" || q === "dim" || q === "m7" || q === "ø7" || q === "°7";

/** A plain numeral: the degree's accidental and numeral, its case the quality's, the diminished or half-diminished mark. */
function numeral(rel: number, q: Quality, minor: boolean): string {
  const m = /^([♭♯♮]?)(.*)$/.exec(degreeOf(rel, minor))!;
  // The leading tone's chord in minor is plain vii° (the raised seventh is the rule there).
  if (minor && rel === 11 && (q === "dim" || q === "°7" || q === "ø7")) m[1] = "";
  const mark = q === "dim" || q === "°7" ? "°" : q === "ø7" ? "ø" : "";
  return `${m[1]}${lowerQ(q) ? m[2].toLowerCase() : m[2]}${mark}`;
}

/**
 * The Roman numeral in the key (tonic pitch class), with the inversion's figures. A chord outside
 * the key that is the dominant (a major triad, a dominant seventh) or the leading-tone chord (a
 * diminished triad or seventh, a half-diminished seventh) of a degree of the key is named as such:
 * V⁴₂/V, vii°⁷/ii.
 */
export function romanOf(c: Chord, tonic: number, minor: boolean, last = false): string {
  const rel = (((c.root - tonic) % 12) + 12) % 12;
  const tones = chordTones(c);
  const inv = Math.max(0, tones.indexOf(c.bass));
  const fig = tones.length === 4 ? ["7", "⁶₅", "⁴₃", "⁴₂"][inv] : ["", "⁶", "⁶₄"][inv];
  const dia = minor ? DIATONIC_MINOR : DIATONIC_MAJOR;
  const diatonic = dia[rel] === TRIAD_OF[c.quality];
  const of = (target: number) => {
    const q = dia[target];
    return target !== 0 && q && q !== "dim" ? `/${numeral(target, q, minor)}` : null;
  };
  // The last chord major in minor (the Picardy third) is I, not the dominant of iv.
  if (last && minor && rel === 0 && c.quality === "maj") return `I${fig}`;
  if (c.quality === "7" && rel !== 7) {
    const t = of((rel + 5) % 12);
    if (t) return `V${fig}${t}`;
  }
  if ((c.quality === "maj" && !diatonic) || (c.quality === "maj" && rel === 2 && !minor)) {
    const t = of((rel + 5) % 12);
    if (t) return `V${fig}${t}`;
  }
  if ((c.quality === "°7" || c.quality === "dim" || c.quality === "ø7") && rel !== 11 && !(c.quality === "dim" && diatonic) && !(c.quality === "ø7" && rel === 2 && minor)) {
    const t = of((rel + 1) % 12);
    if (t) return `vii${c.quality === "ø7" ? "ø" : "°"}${fig}${t}`;
  }
  return `${numeral(rel, c.quality, minor)}${fig}`;
}

/** Authentic cadences: V (or V7) in root position to I (major or minor) in root position. */
export function findCadences(chords: Chord[]): Cadence[] {
  const out: Cadence[] = [];
  for (let k = 1; k < chords.length; k++) {
    const a = chords[k - 1];
    const b = chords[k];
    const dominant = (a.quality === "maj" || a.quality === "7") && a.bass === a.root;
    const tonic = (b.quality === "maj" || b.quality === "min") && b.bass === b.root;
    if (dominant && tonic && (a.root - b.root + 12) % 12 === 7 && b.fit >= 0.6 && k > 1) out.push({ at: b.from, tonic: b.root, minor: b.quality === "min", chord: k });
  }
  return out;
}

/** The keys in turn: each cadence that confirms a key other than the one before. */
export function keyPlan(cadences: Cadence[]): Cadence[] {
  const out: Cadence[] = [];
  for (const c of cadences) {
    const p = out[out.length - 1];
    if (!p || p.tonic !== c.tonic || p.minor !== c.minor) out.push(c);
  }
  return out;
}

/** The figuration's changes: bars whose rhythm (the onsets within the bar) differs from the bar before's, after two bars alike at least. */
export function figurationChanges(notes: FullNote[], bar: number): number[] {
  const end = Math.max(...notes.map((n) => n.at + n.dur));
  const bars = Math.ceil(end / bar - 1e-6);
  const sig: string[] = [];
  for (let b = 0; b < bars; b++) {
    const on = new Set(notes.filter((n) => n.at >= b * bar - 1e-6 && n.at < (b + 1) * bar - 1e-6).map((n) => Math.round((n.at - b * bar) * 24)));
    sig.push([...on].sort((x, y) => x - y).join(","));
  }
  const out: number[] = [];
  let run = 1;
  for (let b = 1; b < bars; b++) {
    if (sig[b] === sig[b - 1]) run++;
    else {
      if (run >= 2) out.push(b);
      run = 1;
    }
  }
  return out;
}

/**
 * The share of bars that repeat the bar before's figure (D135): the same onsets, and the same contour
 * (at each onset the highest note, rising or falling from the one before) — near 1 for a prelude made of one
 * figuration on changing harmonies (C major I), low for one of independent lines.
 */
export function figurationShare(notes: FullNote[], bar: number): number {
  const end = Math.max(...notes.map((n) => n.at + n.dur));
  const bars = Math.ceil(end / bar - 1e-6);
  const sig: string[] = [];
  for (let b = 0; b < bars; b++) {
    const ns = notes.filter((n) => n.at >= b * bar - 1e-6 && n.at < (b + 1) * bar - 1e-6).sort((x, y) => x.at - y.at || x.midi - y.midi);
    // The figure's contour: at each onset the highest note struck, and whether it rose or fell from the last.
    const tops: { at: number; midi: number }[] = [];
    for (const n of ns) {
      const t = tops[tops.length - 1];
      if (t && Math.abs(t.at - n.at) < 1e-6) t.midi = Math.max(t.midi, n.midi);
      else tops.push({ at: n.at, midi: n.midi });
    }
    sig.push(tops.map((x, k) => `${Math.round((x.at - b * bar) * 24)}${k ? Math.sign(x.midi - tops[k - 1].midi) : ""}`).join(","));
  }
  let same = 0;
  for (let b = 1; b < bars; b++) if (sig[b] === sig[b - 1]) same++;
  return bars > 1 ? same / (bars - 1) : 0;
}
