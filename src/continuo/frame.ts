/**
 * A1 (the frame of a bar) and A2 (the chord over it).
 *
 * The chord is read from the sung voices, never from the scale degree: the generic interval of
 * the upper voice over the bass decides between 5/3 and 6/3, with three exceptions that turn a
 * 5/3 into a 6/3 (a B-natural bass, a bass rising "mi to fa", a sharped bass). The pitch material
 * is the white keys, except for letters that a sung voice of the same bar inflects (ficta).
 */
import type { ModalFinal } from "../music/fux/types.ts";
import type { SpelledPitch, Step } from "../music/pitch.ts";
import { harmonic, isConsonant } from "../counterpoint/interval.ts";
import type { FinalsMode, SpelledPc, SungNote } from "./types.ts";

export const STEPS: Step[] = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PC: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export const mod = (x: number, m: number) => ((x % m) + m) % m;
export const pcOf = (p: SpelledPc) => mod(NATURAL_PC[p.step] + p.alter, 12);
export const pcName = (p: SpelledPc) => p.step + (p.alter > 0 ? "#".repeat(p.alter) : "b".repeat(-p.alter));
/** Scientific pitch name of a spelled pitch class placed at `midi`. */
export const spellAt = (p: SpelledPc, midi: number) => `${pcName(p)}${Math.round((midi - NATURAL_PC[p.step] - p.alter) / 12) - 1}`;
export const toPc = (p: SpelledPitch): SpelledPc => ({ step: p.step, alter: p.alter });
/** Smallest distance between two pitch classes (0..6). */
export const pcDistance = (a: number, b: number) => Math.min(mod(a - b, 12), mod(b - a, 12));
/** Unison/octave, second or seventh between two pitches (by pitch class). */
export const clashes = (a: number, b: number) => pcDistance(a, b) <= 2;

export interface Frame {
  time: number;
  /** Lowest sounding sung note. */
  bass: SungNote;
  /** The other sounding sung notes, low to high. */
  uppers: SungNote[];
  sounding: SungNote[];
}

/** A1: the sung notes sounding at time t, the lowest as the bass (it may switch voices). */
export function frameAt(notes: SungNote[], t: number): Frame | null {
  const sounding = notes
    .filter((n) => n.start <= t && t < n.end)
    .sort((a, b) => a.pitch.midi - b.pitch.midi || a.pitch.diatonic - b.pitch.diatonic || (a.voice < b.voice ? -1 : 1));
  if (sounding.length === 0) return null;
  return { time: t, bass: sounding[0], uppers: sounding.slice(1), sounding };
}

/**
 * The form of each letter in a bar: the one a sung voice gives it (downbeat notes first),
 * natural otherwise.
 */
export function letterForms(notes: SungNote[], from: number, to: number): Map<Step, number> {
  const inBar = notes.filter((n) => n.start < to && n.end > from).sort((a, b) => Number(b.start <= from) - Number(a.start <= from) || a.start - b.start);
  const forms = new Map<Step, number>();
  for (const n of inBar) if (!forms.has(n.pitch.step)) forms.set(n.pitch.step, n.pitch.alter);
  return forms;
}

/** The letter k-1 steps above `from` (k = generic interval), in its form for this bar. */
function above(from: SpelledPc, k: number, forms: Map<Step, number>): SpelledPc {
  const step = STEPS[(STEPS.indexOf(from.step) + k - 1) % 7];
  return { step, alter: forms.get(step) ?? 0 };
}

/** Generic interval (1..7) of letter b above letter a. */
const genericAbove = (a: SpelledPc, b: SpelledPc) => mod(STEPS.indexOf(b.step) - STEPS.indexOf(a.step), 7) + 1;

const ACC = (alter: number) => (alter > 0 ? "♯".repeat(alter) : alter < 0 ? "♭".repeat(-alter) : "");

export type ChordShape = "53" | "63" | "other";

export interface Chord {
  /** Bass first, then the upper tones by generic interval above it. */
  tones: SpelledPc[];
  pcs: number[];
  shape: ChordShape;
  figure: string;
  /** Short figure for "5 6"-style labels. */
  short: string;
  /** Sharped tones: never doubled. */
  sharpPcs: number[];
  /** Unsharped leading tones (a bass rising mi to fa): doubling costs COSTS.doubledLeadingTone. */
  miPcs: number[];
  /** Contains every sung pitch class of the frame. */
  valid: boolean;
  notes: string[];
}

/** Build a chord from its tones (the first is the bass), with its figure. */
export function makeChord(tones: SpelledPc[], frame: Frame | null, extra: { octave?: boolean; notes?: string[]; miPcs?: number[] } = {}): Chord {
  const bass = tones[0];
  const uniq: SpelledPc[] = [];
  for (const t of tones) if (!uniq.some((u) => pcOf(u) === pcOf(t))) uniq.push(t);
  const [b, ...rest] = uniq;
  rest.sort((x, y) => genericAbove(b, x) - genericAbove(b, y));
  const ordered = [b, ...rest];
  const ivs = rest.map((t) => genericAbove(bass, t));
  const shape: ChordShape = ivs.join() === "3,5" ? "53" : ivs.join() === "3,6" ? "63" : "other";
  const nums = rest.map((t) => `${ACC(t.alter)}${genericAbove(bass, t)}`).reverse();
  if (extra.octave) nums.unshift("8");
  const figure = nums.join("/") || "8";
  const pcs = [...new Set(ordered.map(pcOf))].sort((x, y) => x - y);
  const sung = frame ? frame.sounding.map((n) => mod(n.pitch.midi, 12)) : [];
  return {
    tones: ordered,
    pcs,
    shape,
    figure,
    short: nums[0] ?? "8",
    sharpPcs: ordered.filter((t) => t.alter > 0).map(pcOf),
    miPcs: extra.miPcs ?? [],
    valid: sung.every((p) => pcs.includes(p)),
    notes: extra.notes ?? [],
  };
}

/** Diatonic semitone up ("mi to fa"): the next letter, one semitone higher. */
export const risesBySemitone = (a: SpelledPitch, b: SpelledPitch | null) => b !== null && b.diatonic - a.diatonic === 1 && b.midi - a.midi === 1;

export interface ChordRequest {
  frame: Frame;
  /** Bass at the next downbeat (rule b), or null at the end. */
  nextBass: SpelledPitch | null;
  forms: Map<Step, number>;
  /** Present for the final bar. */
  final?: { mode: FinalsMode; modalFinal: ModalFinal; majorThirdInsteadOfFifth?: boolean };
}

function triad(bass: SpelledPc, shape: "53" | "63" | "64", forms: Map<Step, number>): SpelledPc[] {
  const ks = shape === "53" ? [3, 5] : shape === "63" ? [3, 6] : [4, 6];
  return [bass, ...ks.map((k) => above(bass, k, forms))];
}

/** The 5/3, 6/3 and 6/4 on the bass that contain every sung pitch class (for colla parte). */
export function consistentTriads(frame: Frame, forms: Map<Step, number>): Chord[] {
  const bass = toPc(frame.bass.pitch);
  return (["53", "63", "64"] as const)
    .map((s) => makeChord(triad(bass, s, forms), frame))
    .filter((c) => c.valid && !(c.shape === "53" && mod(pcOf(c.tones[2]) - pcOf(bass), 12) === 6));
}

/** A2: the chord for a frame. */
export function chooseChord(req: ChordRequest): Chord {
  const { frame, forms, nextBass, final } = req;
  const bassP = frame.bass.pitch;
  const bass = toPc(bassP);
  const sungPcs = [...new Set(frame.sounding.map((n) => mod(n.pitch.midi, 12)))];
  const mi = risesBySemitone(bassP, nextBass);
  const miPcs = mi && bass.alter <= 0 ? [pcOf(bass)] : [];

  if (final) {
    const root: SpelledPc = { step: final.modalFinal, alter: forms.get(final.modalFinal) ?? 0 };
    const thirdStep = above(root, 3, new Map()).step;
    const sungThird = forms.get(thirdStep);
    const major = mod(4 - mod(NATURAL_PC[thirdStep] - pcOf(root), 12), 12);
    const third: SpelledPc = { step: thirdStep, alter: sungThird ?? (major > 6 ? major - 12 : major) };
    const fifth = above(root, 5, forms);
    const notes: string[] = [];
    if (sungThird !== undefined && mod(pcOf(third) - pcOf(root), 12) !== 4) notes.push("final: the sung minor third is kept (no Picardy third)");
    let tones: SpelledPc[];
    let octave = false;
    if (final.mode === "organist") tones = [root, third, fifth];
    else if (final.majorThirdInsteadOfFifth) {
      tones = [root, third];
      octave = true;
      notes.push("strict final: major third instead of the fifth, to avoid consecutive fifths");
    } else {
      tones = sungThird !== undefined ? [root, third, fifth] : [root, fifth];
      octave = true;
    }
    const triadPcs = [root, third, fifth].map(pcOf);
    const foreign = frame.sounding.filter((n) => !triadPcs.includes(mod(n.pitch.midi, 12)));
    // A sung tone outside the strict octave-and-fifth (a sung third) joins the chord.
    for (const n of frame.sounding) if (!tones.some((t) => pcOf(t) === mod(n.pitch.midi, 12))) tones.push(toPc(n.pitch));
    const bassFirst = [bass, ...tones.filter((t) => pcOf(t) !== pcOf(bass))];
    const c = makeChord(bassFirst, frame, { octave: octave && pcOf(bass) === pcOf(root), notes, miPcs });
    if (foreign.length > 0) return { ...c, valid: false, notes: [...c.notes, "final: the sung notes do not fit the final triad"] };
    return c;
  }

  // Three or more voices with three distinct pitch classes: the chord is their set.
  if (sungPcs.length >= 3) {
    const tones = [bass];
    for (const n of frame.sounding) if (!tones.some((t) => pcOf(t) === mod(n.pitch.midi, 12))) tones.push(toPc(n.pitch));
    return makeChord(tones, frame, { miPcs, notes: ["chord = the sung pitch classes"] });
  }

  const upper = frame.uppers.find((n) => mod(n.pitch.midi, 12) !== pcOf(bass));
  const k = upper ? harmonic(bassP, upper.pitch).simple : 1;
  const notes: string[] = [];
  let shape: "53" | "63" = "53";
  if (k === 6) shape = "63";
  else if (k === 5) shape = "53";
  else if (k === 3 || k === 1) {
    if (bass.step === "B" && bass.alter === 0) {
      shape = "63";
      notes.push("(a) B-natural bass: 6/3");
    } else if (mi) {
      shape = "63";
      notes.push("(b) bass rises mi to fa: 6/3");
    } else if (bass.alter > 0) {
      shape = "63";
      notes.push("(c) sharped bass: 6/3");
    } else {
      const fifth = above(bass, 5, forms);
      if (mod(pcOf(fifth) - pcOf(bass), 12) === 6) {
        shape = "63";
        notes.push("diminished fifth above the bass: 6/3");
      }
    }
  } else {
    notes.push(`the upper voice is a ${k === 4 ? "fourth" : k === 2 ? "second" : "seventh"} above the bass`);
  }
  return makeChord(triad(bass, shape, forms), frame, { miPcs, notes });
}

/** Is every sung note of the frame consonant with the bass, and free of seconds with the others? */
export function frameConsonant(frame: Frame): boolean {
  if (!frame.uppers.every((u) => isConsonant(harmonic(frame.bass.pitch, u.pitch)))) return false;
  for (let i = 0; i < frame.uppers.length; i++)
    for (let j = i + 1; j < frame.uppers.length; j++) {
      const d = pcDistance(frame.uppers[i].pitch.midi, frame.uppers[j].pitch.midi);
      if (d === 1 || d === 2) return false;
    }
  return true;
}
