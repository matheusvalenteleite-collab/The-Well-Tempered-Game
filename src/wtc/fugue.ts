/**
 * Fugue analysis over the Well-Tempered Clavier: the subject, the answer (real or tonal), every
 * entry of the subject in the fugue (the fugue's map), and the rule that predicts an answer from
 * its subject. Pure functions over the corpus data (corpus.ts); no UI.
 *
 * Lines are the main line of a voice (sub-spine 0): a split for a chord or a divisi is left out.
 */
import { parsePitch } from "../music/pitch.ts";
import { TPQ, type WtcNote, type WtcPiece } from "./corpus.ts";

export interface Note {
  on: number;
  dur: number;
  pitch: string;
}

const STEPS = "CDEFGAB";
const STEP_PC = [0, 2, 4, 5, 7, 9, 11];
const midi = (p: string) => parsePitch(p).midi;
const diatonic = (p: string) => parsePitch(p).diatonic;

/** The voice's main line. */
export const line = (v: WtcNote[]): Note[] => v.filter((n) => n[3] === 0).map(([on, dur, pitch]) => ({ on, dur, pitch }));

/** A spelled pitch moved by `steps` letters and `semis` semitones (P5 up: 4, 7). */
export function transpose(p: string, steps: number, semis: number): string {
  const sp = parsePitch(p);
  const d = sp.diatonic + steps;
  const octave = Math.floor(d / 7);
  const step = STEPS[((d % 7) + 7) % 7];
  const natural = 12 * (octave + 1) + STEP_PC[STEPS.indexOf(step)];
  const alter = sp.midi + semis - natural;
  if (Math.abs(alter) > 2) throw new Error(`cannot spell ${p} moved by ${steps}/${semis}`);
  return `${step}${alter > 0 ? "#".repeat(alter) : "b".repeat(-alter)}${octave}`;
}

/** Scale degree of a pitch in a key, by letter (1-7), with its chromatic alteration against the key's scale. */
export function degree(p: string, tonic: string, mode: "major" | "minor"): { deg: number; alter: number } {
  const t = parsePitch(`${tonic}4`);
  const sp = parsePitch(p);
  const deg = (((sp.diatonic - t.diatonic) % 7) + 7) % 7;
  const scale = mode === "major" ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
  const pcs = (((sp.midi - t.midi) % 12) + 12) % 12;
  let alter = pcs - scale[deg];
  if (alter > 6) alter -= 12;
  if (alter < -6) alter += 12;
  return { deg: deg + 1, alter };
}

/** The order in which the voices enter: [voice, onset of its first note]. */
export function entryOrder(p: WtcPiece): [number, number][] {
  return p.voices
    .map((v, i) => [i, line(v)[0]?.on ?? Infinity] as [number, number])
    .sort((a, b) => a[1] - b[1]);
}

/**
 * The subject: the first voice's opening, as long as the second voice's opening follows it in rhythm
 * and (but for a tonal mutation near the head or the tail) in its intervals. The answer: the second
 * voice's opening, as long as the subject.
 */
export function subjectAndAnswer(p: WtcPiece): { subject: Note[]; answer: Note[]; first: number; second: number } {
  const order = entryOrder(p);
  const [[v1], [v2]] = order;
  const a = line(p.voices[v1]);
  const b = line(p.voices[v2]);
  // The answer is over by the time the third voice enters (with the next entry, the exposition
  // moves on); in a two-voice fugue, by twice the second voice's delay after its entry.
  const third = order[2]?.[1] ?? Infinity;
  // In a stretto exposition the third voice may enter before the answer ends: the answer may in
  // any case last as long as the subject did alone, and a beat more.
  const alone = b[0].on - a[0].on;
  const limit = Math.max(Number.isFinite(third) ? third : b[0].on + 2 * alone + 4 * TPQ, b[0].on + alone + TPQ);
  const ioi = (l: Note[], i: number) => l[i + 1].on - l[i].on;
  let n = 1;
  let misses = 0;
  for (let i = 0; i + 1 < Math.min(a.length, b.length); i++) {
    if (b[i + 1].on >= limit) break;
    const rhythm = ioi(a, i) === ioi(b, i);
    const generic = diatonic(a[i + 1].pitch) - diatonic(a[i].pitch) === diatonic(b[i + 1].pitch) - diatonic(b[i].pitch);
    if (rhythm && (generic || i < 4)) {
      n = i + 2;
      misses = 0;
    } else if (rhythm && misses < 1) {
      misses++;
    } else break;
  }
  return { subject: a.slice(0, n), answer: b.slice(0, n), first: v1, second: v2 };
}

export type AnswerRule = "real" | "tonal-first-five" | "tonal-head" | "tonal-head-and-tail" | "bach";

/**
 * An answer predicted from the subject, by rule:
 * - real: the subject a fifth higher, every interval kept;
 * - tonal-first-five: the first dominant note of the subject (if in its head) answered by the tonic;
 * - tonal-head: every dominant note of the head answered by the tonic (the head: the subject up to
 *   its first note outside the tonic and dominant degrees and their neighbours ^7 and ^2... here,
 *   up to the first note on degree 3, 4 or 6, or the end of the first bar of the subject);
 * - tonal-head-and-tail: as tonal-head, and if the subject ends in the dominant key (its last note
 *   on ^5, or a raised ^4 in its second half), the tail answered a fourth up (back to the tonic).
 * The answer is placed in the octave of `start`'s pitch (Bach's first answer note), so that only
 * the pitch classes and their spelling are compared.
 */
export function predictAnswer(subject: Note[], tonic: string, mode: "major" | "minor", rule: AnswerRule): string[] {
  const degs = subject.map((n) => degree(n.pitch, tonic, mode));
  const barLen = 4 * TPQ;
  const t0 = subject[0].on;
  let head = subject.length;
  for (let i = 0; i < subject.length; i++) {
    const d = degs[i].deg;
    if (i > 0 && ([3, 4, 6].includes(d) || subject[i].on - t0 >= barLen)) {
      head = i;
      break;
    }
  }
  let tailFrom = subject.length;
  if (rule === "tonal-head-and-tail") {
    const last = degs[degs.length - 1];
    const sharp4 = degs.findIndex((d, i) => i >= subject.length / 2 && d.deg === 4 && d.alter > 0);
    if (sharp4 >= 0) tailFrom = sharp4;
    else if (last.deg === 5 && last.alter === 0) tailFrom = subject.length - 1;
  }
  if (rule === "bach") return bachAnswer(subject, degs);
  let firstFiveDone = false;
  return subject.map((n, i) => {
    const d = degs[i];
    let fourth = false;
    if (rule !== "real" && d.deg === 5 && d.alter === 0 && i < head) {
      if (rule === "tonal-first-five") {
        if (!firstFiveDone) fourth = true;
        firstFiveDone = true;
      } else fourth = true;
    }
    if (i >= tailFrom) fourth = true;
    return fourth ? transpose(n.pitch, 3, 5) : transpose(n.pitch, 4, 7);
  });
}

/** Pitch-class names of a line (spelling kept, octave dropped). */
export const names = (ps: string[]) => ps.map((p) => p.replace(/-?\d+$/, ""));

export interface Entry {
  voice: number;
  on: number;
  /** Index of the first note in the voice's main line. */
  at: number;
  length: number;
  /** The first note, its degree in the home key. */
  pitch: string;
  degree: { deg: number; alter: number };
  /** How the entry relates to the subject. */
  form: "subject" | "inversion";
  /** Notes whose interval departs from the subject's (0 for an exact transposition). */
  changed: number;
}

/**
 * Every entry of the subject in the fugue: in each voice, a run of notes with the subject's rhythm
 * and its intervals (by letter), allowing two changed intervals among the first five (tonal answers)
 * and one more elsewhere, the last two intervals free (for a subject of eight notes or fewer: one
 * change, the last interval free); also inverted (intervals mirrored, exactly).
 */
export function findEntries(p: WtcPiece, subject: Note[]): Entry[] {
  const n = subject.length;
  const sInt = subject.slice(1).map((x, i) => diatonic(x.pitch) - diatonic(subject[i].pitch));
  const sIoi = subject.slice(1, -1).map((x, i) => subject[i + 2].on - x.on);
  const out: Entry[] = [];
  p.voices.forEach((v, voice) => {
    const l = line(v);
    for (let s = 0; s + n <= l.length; s++) {
      for (const form of ["subject", "inversion"] as const) {
        let changed = 0;
        let head = 0;
        let rest = 0;
        let ok = true;
        // The last two intervals are free (entries are often bent at their end into what follows).
        // Short subjects (eight notes or fewer): only the last interval free, one change allowed.
        const short = n <= 8;
        const counted = short ? n - 2 : n - 3;
        for (let i = 0; i < n - 1 && ok; i++) {
          const iv = diatonic(l[s + i + 1].pitch) - diatonic(l[s + i].pitch);
          const want = form === "subject" ? sInt[i] : -sInt[i];
          if (iv !== want && i < counted) {
            changed++;
            if (i < 5) head++;
            else rest++;
            if (head > (short ? 1 : 2) || rest > 1) ok = false;
          }
          if (ok && i < Math.min(n - 2, counted) && l[s + i + 2].on - l[s + i + 1].on !== sIoi[i]) ok = false;
        }
        if (ok && (form === "subject" || changed === 0)) {
          out.push({ voice, on: l[s].on, at: s, length: n, pitch: l[s].pitch, degree: degree(l[s].pitch, p.key, p.mode), form, changed });
        }
      }
    }
  });
  // An entry found as both subject and inversion (a symmetric subject) counts once.
  return out.sort((a, b) => a.on - b.on || a.voice - b.voice).filter((e, i, a) => !a.slice(0, i).some((x) => x.voice === e.voice && x.at === e.at));
}

export { TPQ };

/**
 * The answer as Bach makes it in the 48 (docs/wtc/answer-study.md), stated as a rule:
 * 1. a subject beginning on ^5 is answered from ^1;
 * 2. a ^5 among the first four notes, reached by a leap from ^1, is answered by ^1 (reached by step,
 *    or from ^2, it stays real);
 * 3. a subject that ends in the dominant key (a raised ^4 rising to ^5 in its last third, or ending
 *    on ^5 reached from ^4 or ^6) has its tail, from that raised ^4 (or the last note), answered a
 *    fourth up, back to the tonic;
 * every other note a fifth up (real).
 */
function bachAnswer(subject: Note[], degs: { deg: number; alter: number }[]): string[] {
  const n = subject.length;
  const fourth = new Array(n).fill(false);
  if (degs[0].deg === 5 && degs[0].alter === 0) fourth[0] = true;
  for (let i = 1; i < Math.min(4, n); i++) {
    if (degs[i].deg === 5 && degs[i].alter === 0 && degs[i - 1].deg === 1 && Math.abs(diatonic(subject[i].pitch) - diatonic(subject[i - 1].pitch)) >= 3) {
      fourth[i] = true;
      break;
    }
  }
  const from = Math.floor((2 * n) / 3);
  let tail = -1;
  for (let i = from; i + 1 < n; i++) if (degs[i].deg === 4 && degs[i].alter > 0 && degs[i + 1].deg === 5) tail = tail < 0 ? i : tail;
  const last = degs[n - 1];
  if (tail < 0 && last.deg === 5 && last.alter === 0 && n >= 2 && [4, 6].includes(degs[n - 2].deg)) tail = n - 1;
  if (tail >= 0) for (let i = tail; i < n; i++) fourth[i] = true;
  return subject.map((x, i) => (fourth[i] ? transpose(x.pitch, 3, 5) : transpose(x.pitch, 4, 7)));
}

/**
 * Entries found with the subject's head where later entries vary its tail: the subject is
 * shortened a note at a time (down to half its length, and never below eight notes) as long as the
 * number of entries found does not jump (more than half again, plus two, at a step; or beyond two
 * and a half times the full subject's count, plus four), which would mean the head has become a
 * commonplace figure (a scale) rather than the subject; never finding fewer than the full subject.
 */
export function findEntriesByHead(p: WtcPiece, subject: Note[]): { entries: Entry[]; head: number } {
  const n = subject.length;
  const full = findEntries(p, subject);
  const cap = 2.5 * full.length + 4;
  let best = { entries: full, head: n };
  let prev = full.length;
  for (let len = n - 1; len >= Math.max(8, Math.ceil(n / 2)); len--) {
    const e = findEntries(p, subject.slice(0, len));
    if (e.length > prev * 1.5 + 2 || e.length > cap) break;
    if (e.length >= best.entries.length) best = { entries: e, head: len };
    prev = e.length;
  }
  return best;
}
