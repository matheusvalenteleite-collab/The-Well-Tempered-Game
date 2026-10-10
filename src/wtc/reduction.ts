/**
 * A harmonic reduction of a piece: each segment (a bar, or half a bar) collapsed to the chord its
 * notes sound, the lowest as the bass, with figures and a Roman numeral against the home key
 * (sevenths and their inversions included; chordLabel below). Meant for the figurative preludes (Book I's C major
 * above all: a progression realized as one broken-chord figure), where it shows the progression
 * the figure decorates. Where a segment's notes do not stack in thirds, the chord they best fit
 * (passing and neighbour notes outside it) is read instead, and marked as guessed.
 */
import { parsePitch } from "../music/pitch.ts";
import { TPQ, type WtcPiece } from "./corpus.ts";
import { line } from "./fugue.ts";
import { harmonies } from "./trio.ts";

export interface Segment {
  on: number;
  dur: number;
  /** The chord as voiced for playback: the bass, then the other pitch classes upwards in close position. */
  chord: string[];
  figures: string[];
  roman: string;
  guessed: boolean;
}

const midi = (p: string) => parsePitch(p).midi;
const pcName = (p: string) => p.replace(/-?\d+$/, "");

export function reduce(p: WtcPiece, segment: number = barLength(p)): Segment[] {
  const out: Segment[] = [];
  const all = p.voices.flat();
  // Where the segment's notes do not stack in thirds (passing and neighbour notes among them), the
  // chord its notes best fit, weighted by duration and accent (src/wtc/trio.ts), with the notes outside it left out.
  const fit = harmonies(p.voices.map(line), p.meter, p.length, segment);
  for (let t = 0; t < p.length; t += segment) {
    const notes = all.filter((n) => n[0] < t + segment && n[0] + n[1] > t);
    if (!notes.length) continue;
    // The bass: the lowest note sounding in the segment.
    const bass = notes.reduce((a, b) => (midi(b[2]) < midi(a[2]) ? b : a))[2];
    const pcs: string[] = [];
    for (const n of [...notes].sort((a, b) => midi(a[2]) - midi(b[2]))) {
      const name = pcName(n[2]);
      if (name !== pcName(bass) && !pcs.includes(name)) pcs.push(name);
    }
    // Close position above the bass, in the octave above it.
    let last = midi(bass);
    const chord = [bass];
    for (const name of pcs) {
      let octave = parsePitch(bass).octave;
      let q = `${name}${octave}`;
      while (midi(q) <= last) q = `${name}${++octave}`;
      chord.push(q);
      last = midi(q);
    }
    let h = chordLabel(chord, p.key, p.mode);
    const f = fit[Math.round(t / segment)];
    if (h.roman === "?" && f?.pcs.length) {
      const pcOf = (q: string) => ((midi(q) % 12) + 12) % 12;
      const inChord = [...notes].map((n) => n[2]).filter((q) => f.pcs.includes(pcOf(q)));
      if (inChord.length) {
        const lowest = inChord.reduce((a, b) => (midi(b) < midi(a) ? b : a));
        const kept = [lowest, ...[...new Set(inChord.map(pcName))].filter((x) => x !== pcName(lowest)).map((x) => chord.find((c) => pcName(c) === x) ?? `${x}4`)];
        const g = chordLabel(kept, p.key, p.mode);
        if (g.roman !== "?") {
          h = { ...g, guessed: true };
          chord.splice(0, chord.length, ...kept);
        }
      }
    }
    out.push({ on: t, dur: Math.min(segment, p.length - t), chord, figures: h.figures, roman: h.roman, guessed: h.guessed });
  }
  return out;
}

export function barLength(p: WtcPiece): number {
  const [num, den] = p.meter.split("/").map(Number);
  return (num * 4 * TPQ) / den;
}

const LETTERS = "CDEFGAB";
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const letter = (p: string) => LETTERS.indexOf(p[0]);

/**
 * Figures and a Roman numeral for a chord of any size, sevenths included: the root is the letter
 * from which the chord's letters stack in thirds (root, third, fifth, seventh), preferring a root
 * whose third sounds; inversions figured as thoroughbass does (6, 6/4; 7, 6/5, 4/3, 4/2).
 */
export function chordLabel(chord: string[], tonic: string, mode: "major" | "minor"): { figures: string[]; roman: string; guessed: boolean } {
  const sorted = [...chord].sort((a, b) => midi(a) - midi(b));
  const bass = sorted[0];
  const letters = [...new Set(sorted.map(letter))];
  let best: { root: number; score: number } | null = null;
  for (const r of letters) {
    const rel = letters.map((l) => (l - r + 7) % 7);
    if (!rel.every((d) => [0, 2, 4, 6].includes(d))) continue;
    const score = (rel.includes(2) ? 4 : 0) + (rel.includes(4) ? 2 : 0) + (rel.includes(6) ? 1 : 0) - (rel.includes(6) && !rel.includes(2) ? 2 : 0);
    if (!best || score > best.score) best = { root: r, score };
  }
  const figures = sorted.slice(1).map((q) => String(((letter(q) - letter(bass) + 7) % 7) + 1)).map((f) => (f === "1" ? "8" : f));
  const uniqFig = [...new Set(figures)].sort((a, b) => Number(b) - Number(a));
  if (!best) return { figures: uniqFig, roman: "?", guessed: true };
  const root = best.root;
  const pitchOf = (d: number) => sorted.find((q) => (letter(q) - root + 7) % 7 === d);
  const rootP = pitchOf(0)!;
  const pc = (q: string) => ((midi(q) % 12) + 12) % 12;
  const iv = (q: string | undefined) => (q ? (pc(q) - pc(rootP) + 12) % 12 : null);
  const third = iv(pitchOf(2));
  const fifth = iv(pitchOf(4));
  const seventh = iv(pitchOf(6));
  const home = parsePitch(`${tonic}4`);
  const degree = (root - LETTERS.indexOf(home.step) + 7) % 7;
  const scale = mode === "major" ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
  const expected = (home.midi + scale[degree]) % 12;
  const alterBy = ((pc(rootP) - expected + 18) % 12) - 6;
  const alter = alterBy > 0 ? "♯" : alterBy < 0 ? "♭" : "";
  let numeral = ROMAN[degree];
  const minor = third === 3;
  const dim = fifth === 6;
  if (minor || dim) numeral = numeral.toLowerCase();
  let quality = dim ? (seventh === 9 ? "°" : seventh === 10 ? "ø" : "°") : "";
  if (!dim && seventh === 11 && third === 4) quality = "M";
  const inversion = (letter(bass) - root + 7) % 7;
  const hasSeventh = seventh !== null;
  const inv = hasSeventh ? ["7", "", "6/5", "", "4/3", "", "4/2"][inversion] : ["", "", "6", "", "6/4", "", ""][inversion];
  return { figures: uniqFig, roman: `${alter}${numeral}${quality}${inv}`, guessed: third === null };
}
