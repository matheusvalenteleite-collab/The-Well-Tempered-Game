/**
 * Motive and imitation (the owner's note on the second ratings: "we might need to think motivically and
 * imitatively as well when considering Bach's work"). Tools to read a four-part setting as lines of
 * figures rather than as a chain of chords:
 *
 *   - a figure: a few notes of one voice, by their rhythm and their intervals counted in letters
 *     (tonal: a third is a third whether major or minor), or in semitones (real);
 *   - an imitation: a figure restated by another voice soon after (within a window), against the
 *     chance of meeting it there, measured by the same figure in another voice far away;
 *   - a pre-imitation (Vorimitation): the opening of the melody's next phrase stated first by a lower
 *     voice;
 *   - motivic unity: a setting's figures recurring in it more than figures of other settings do;
 *   - chromatic lines in any voice: runs of semitone steps one way, with a chromatic semitone in them.
 *
 * The voices are lists of notes [onset, length, pitch, fermata?] in 32nds of a whole note, as the
 * study data and level 6 write them (src/chorale/level6.ts).
 */
import type { Note } from "../level6.ts";
import { midiOf } from "./theory.ts";

const LETTERS = "CDEFGAB";
const diatonic = (p: string) => LETTERS.indexOf(p[0]) + 7 * Number(p.replace(/^[A-G][#b]*/, ""));

export interface Figure {
  voice: number;
  /** The index of the figure's first note in its voice, and its onset (32nds). */
  i: number;
  at: number;
  /** "rhythm|intervals": the lengths of all its notes but the last, and its intervals in letters. */
  tonal: string;
  /** The same with intervals in semitones. */
  real: string;
  /** The figure has a note shorter than a quarter (a figure of diminution, not the plain chord tones). */
  quick: boolean;
  /** Every interval a step or a repeat: a scale fragment, which recurs by chance more than a shaped figure. */
  plain: boolean;
}

/** Every figure of `len` notes in each voice (not across a rest or a fermata). */
export function figures(voices: Note[][], len = 4): Figure[] {
  const out: Figure[] = [];
  voices.forEach((line, v) => {
    for (let i = 0; i + len <= line.length; i++) {
      const ns = line.slice(i, i + len);
      // contiguous: each note starts where the one before ends; no fermata inside
      if (ns.some((n, k) => k > 0 && ns[k - 1][0] + ns[k - 1][1] !== n[0])) continue;
      if (ns.slice(0, -1).some((n) => n[3])) continue;
      const lens = ns.slice(0, -1).map((n) => n[1]);
      const steps = ns.slice(1).map((n, k) => diatonic(n[2]) - diatonic(ns[k][2]));
      const semis = ns.slice(1).map((n, k) => midiOf(n[2]) - midiOf(ns[k][2]));
      out.push({
        voice: v,
        i,
        at: ns[0][0],
        tonal: `${lens.join(",")}|${steps.join(",")}`,
        real: `${lens.join(",")}|${semis.join(",")}`,
        quick: lens.some((x) => x < 8),
        plain: steps.every((x) => Math.abs(x) <= 1),
      });
    }
  });
  return out;
}

export interface Imitation {
  /** The figure and its answer. */
  first: Figure;
  answer: Figure;
  /** The answer's distance (32nds) and interval (in letters: 0 the unison or octave, 4 the fifth above...). */
  lag: number;
  interval: number;
}

/** Imitations: a figure answered by another voice with the same rhythm and intervals (tonal), starting
 *  0 < lag <= window later. `filter` chooses the figures counted. */
export function imitations(voices: Note[][], window: number, len = 4, filter: (f: Figure) => boolean = (f) => !f.plain): Imitation[] {
  const fs = figures(voices, len).filter(filter);
  const by = new Map<string, Figure[]>();
  for (const f of fs) by.set(f.tonal, [...(by.get(f.tonal) ?? []), f]);
  const out: Imitation[] = [];
  for (const f of fs)
    for (const g of by.get(f.tonal)!)
      if (g.voice !== f.voice && g.at > f.at && g.at - f.at <= window) {
        const a = voices[f.voice][f.i][2],
          b = voices[g.voice][g.i][2];
        out.push({ first: f, answer: g, lag: g.at - f.at, interval: (((diatonic(b) - diatonic(a)) % 7) + 7) % 7 });
      }
  return out;
}

/** The share of figures answered by another voice within (lo, hi] after them: near (0, window] is
 *  imitation, a window as long far away the chance of meeting the figure anyway. */
export function answeredShare(voices: Note[][], lo: number, hi: number, len = 4, filter: (f: Figure) => boolean = (f) => !f.plain): { figures: number; answered: number } {
  const fs = figures(voices, len).filter(filter);
  const by = new Map<string, Figure[]>();
  for (const f of fs) by.set(f.tonal, [...(by.get(f.tonal) ?? []), f]);
  let answered = 0;
  for (const f of fs) if (by.get(f.tonal)!.some((g) => g.voice !== f.voice && g.at - f.at > lo && g.at - f.at <= hi)) answered++;
  return { figures: fs.length, answered };
}

/** Chromatic lines: runs of `min` or more semitone steps one way in a voice, at least one of them a
 *  chromatic semitone (the same letter altered: F to F#). */
export function chromaticLines(voices: Note[][], min = 3): { voice: number; at: number; end: number; steps: number; dir: number }[] {
  const out: { voice: number; at: number; end: number; steps: number; dir: number }[] = [];
  voices.forEach((line, v) => {
    let i = 0;
    while (i + 1 < line.length) {
      const d = midiOf(line[i + 1][2]) - midiOf(line[i][2]);
      if (Math.abs(d) !== 1) {
        i++;
        continue;
      }
      let k = i + 1,
        chromatic = line[i + 1][2][0] === line[i][2][0];
      while (k + 1 < line.length && midiOf(line[k + 1][2]) - midiOf(line[k][2]) === d) {
        if (line[k + 1][2][0] === line[k][2][0]) chromatic = true;
        k++;
      }
      if (k - i >= min && chromatic) out.push({ voice: v, at: line[i][0], end: line[k][0], steps: k - i, dir: d });
      i = k;
    }
  });
  return out;
}

/** The phrase openings of the melody (its first note, and each note after a fermata): index and onset. */
export function phraseStarts(soprano: Note[]): number[] {
  const out = [0];
  soprano.forEach((n, i) => {
    if (n[3] && i + 1 < soprano.length) out.push(i + 1);
  });
  return out;
}

/** Pre-imitation: the melody's phrase opening (its first `len` notes, intervals in letters, rhythm
 *  free) stated in a lower voice ending no later than the phrase starts, within `window` before it. */
export function preImitations(voices: Note[][], window: number, len = 4): { phrase: number; voice: number; at: number }[] {
  const sop = voices[0];
  const out: { phrase: number; voice: number; at: number }[] = [];
  phraseStarts(sop).forEach((s, p) => {
    if (p === 0 || s + len > sop.length) return;
    const head = sop.slice(s, s + len);
    const steps = head.slice(1).map((n, k) => diatonic(n[2]) - diatonic(head[k][2])).join(",");
    if (head.slice(1).every((n, k) => n[2] === head[k][2])) return;
    const t = head[0][0];
    for (let v = 1; v < 4; v++) {
      const line = voices[v];
      for (let i = 0; i + len <= line.length; i++) {
        const ns = line.slice(i, i + len);
        if (ns[0][0] < t - window || ns[0][0] >= t) continue;
        if (ns.slice(1).map((n, k) => diatonic(n[2]) - diatonic(ns[k][2])).join(",") === steps) {
          out.push({ phrase: p, voice: v, at: ns[0][0] });
          break;
        }
      }
    }
  });
  return out;
}
