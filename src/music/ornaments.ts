/**
 * P8: ornaments played (the owner: "Bach's Explication is a good start/default"; C. P. E. Bach's
 * Versuch beside it). Signs as the Humdrum kern encoding writes them (humdrum.org/rep/kern): T t
 * trill (whole / half step above), M m mordent (whole / half step below), W w the short wavy sign,
 * S turn, $ inverted turn, R a trill's closing turn, O an ornament of unspecified kind; grace notes
 * (q short, Q long). Sources and the choices made: docs/playback/ORNAMENTS.md.
 *
 * Defaults, after J. S. Bach's "Explication unterschiedlicher Zeichen" (Clavier-Büchlein vor W. F.
 * Bach, 1720):
 * - trill (Trillo): from the note above, on the beat, alternating, then the main note held; with R
 *   (Trillo und Mordant) it closes below and back (… U N L N). D319: the alternation lasts the note
 *   (the owner: "trills are not lasting for as long as they ought"; C. P. E. Bach, Versuch I.2.3 §21:
 *   beaten for the note's whole value), the main note settling only at the end of a long note (about
 *   its last 15%), at about ten notes a second on the beat's grid (trillUnit, trillPitches);
 * - mordent (Mordant): main, below, main held;
 * - turn (Cadence): above, main, below, main;
 * - the short wavy sign: a snapped trill (C. P. E. Bach's Pralltriller: main, above, main) on a note
 *   reached by a falling step, as he says it only occurs there (Versuch I, ch. 2, sect. 3, §34);
 *   elsewhere Bach's short Trillo (above, main, above, main, then main);
 * - grace notes: a short one on the beat, very short, taken from the main note (CPE §13); a long one
 *   (Q) takes half the main note, two thirds of a dotted one (CPE §11).
 * The notes of an ornament move at about eleven a second (Quantz IX §6: about eight to a pulse of
 * about 80 a minute), never slower than the note allows.
 */
export interface Sounding {
  midi: number;
  /** Onset and length, in quarters. */
  at: number;
  dur: number;
}

export interface OrnamentContext {
  /** The ornament notes' length, in quarters (from the tempo: `ornamentUnit`). */
  unit: number;
  /** D319: a trill's notes' length, in quarters (`trillUnit`: on the beat's grid); `unit` when not given. */
  trillUnit?: number;
  /** D319: the share of a long note its trill's main note settles for (TRILL_SETTLE when not given). */
  settle?: number;
  /** The note before in the same voice (for the snapped trill), if any. */
  prevMidi?: number;
  /** The key's step above and below a note (in semitones), for signs that do not say (S, $, O, W). */
  stepAbove(midi: number): number;
  stepBelow(midi: number): number;
  /**
   * P24: whose practice: "explication" (the default: Bach's Explication, the main note held after the
   * alternation) or "cpe" (C. P. E. Bach, Versuch I, ch. 2, sect. 3: every trill but the Pralltriller
   * beaten for the note's whole value, §21; a trill on a somewhat long note always closing with a
   * Nachschlag, the step below and the note, §13).
   */
  style?: OrnamentStyle;
  /**
   * D353, the game's TRILL ENDING "rule" (MECH.trillEnding; ornament-play.ts nachschlagAt): this trill
   * closes with C. P. E. Bach's Nachschlag (… U N L N, beaten to the end, I.2.3 §13), decided by the
   * music; false: as `style` says.
   */
  nachschlag?: boolean;
  /**
   * D281: the neighbours from the music, not from the sign's case: the step above and below as given
   * (the next letter, with the accidental in force), for every sign. The encodings' case (T a whole
   * step, t a half) proved unreliable (II/13: a whole-step T on B sharp, a W on A sharp in F sharp
   * major: trills on D and C naturals).
   */
  diatonic?: boolean;
}

export const ORNAMENT_STYLES = ["explication", "cpe"] as const;
export type OrnamentStyle = (typeof ORNAMENT_STYLES)[number];
/** P24: "somewhat long" (C. P. E. Bach §13), taken as a crotchet or longer (a design choice). */
const LONG_FOR_NACHSCHLAG = 1;

/** D319: a long trill's main note settles for about this share of the note at its end (the Explication's main note held, kept brief). */
export const TRILL_SETTLE = 0.15;
/** D319: a trill settles only on a note of this many trill notes or more (shorter: the alternation to the end). */
export const TRILL_SETTLE_FROM = 8;
/** D319: the trill's speed by default, notes a second (8 to 12 in practice: Quantz IX §6's "not much more than four alternations to a pulse"). */
export const TRILL_PER_SECOND = 10;

/**
 * D319: a trill note's length in quarters at a tempo (`quarterSec`: a quarter's length in seconds): a
 * subdivision of the beat (a quarter by 2, 3, 4, 6, 8, 12, 16, 24 or 32) nearest `perSecond` notes a
 * second, so that the alternation falls on the beat's own grid.
 */
export function trillUnit(quarterSec: number, perSecond = TRILL_PER_SECOND): number {
  let best = 4;
  for (const d of [2, 3, 4, 6, 8, 12, 16, 24, 32]) if (Math.abs(d / quarterSec - perSecond) < Math.abs(best / quarterSec - perSecond)) best = d;
  return 1 / best;
}

/**
 * D319: a trill's notes over a note of `dur` quarters, its notes `g` long: from the upper note U,
 * alternating with the main note N, then N held to the end; the alternation fills the note but for a
 * settle of about `settle` of it on a note of TRILL_SETTLE_FROM trill notes or more (the alternation's
 * length the nearest that ends on U before the main note); with `closing` (a written R, or C. P. E.
 * Bach's Nachschlag) it ends … U N L N. A note too short for four trill notes: four notes in its
 * length (U N U N, Bach's short Trillo), as before.
 */
export function trillPitches(N: number, U: number, L: number, dur: number, g: number, closing: boolean, settle = TRILL_SETTLE): number[] {
  const S = Math.floor(dur / g + 1e-9);
  if (S < 4) return closing ? [U, N, L, N] : [U, N, U, N];
  const tail = closing ? 1 : 0;
  const want = S * (1 - (S >= TRILL_SETTLE_FROM ? settle : 0)) - tail;
  // U N U … U before the main note (odd); U N … U N before the step below (even).
  const parity = closing ? 0 : 1;
  let k = Math.floor(want + 1e-9);
  if (k % 2 !== parity) k--;
  if (k + 2 - want < want - k) k += 2;
  const max = S - 1 - tail;
  if (k > max) k = max % 2 === parity ? max : max - 1;
  k = Math.max(parity ? 1 : 2, k);
  const out: number[] = [];
  for (let j = 0; j < k; j++) out.push(j % 2 === 0 ? U : N);
  return [...out, ...(closing ? [L] : []), N];
}

/** D319: the length of each of a trill's `count` notes: its grid, or a short note shared out (fewer than four grid notes). */
export function trillStep(dur: number, g: number, count: number): number {
  return Math.floor(dur / g + 1e-9) >= 4 ? g : dur / count;
}

/** The ornament notes' length in quarters at a tempo (`tempo`: the engine's half notes a minute). */
export function ornamentUnit(tempo: number, perSecond = 11): number {
  const quarter = 30 / tempo; // seconds
  return Math.max(1 / 32, Math.min(0.25, 1 / perSecond / quarter));
}

/** A note with its ornament and grace notes, as the notes that sound. */
export function realise(n: Sounding, signs: string, graces: { kind: "q" | "Q"; midi: number }[] = [], ctx: OrnamentContext): Sounding[] {
  const out: Sounding[] = [];
  let at = n.at;
  let dur = n.dur;
  // Grace notes first, on the beat, taken from the main note.
  for (const { kind, midi } of graces) {
    const len = kind === "Q" ? (isDotted(n.dur) ? (n.dur * 2) / 3 : n.dur / 2) : Math.min(ctx.unit, dur / 3);
    out.push({ midi, at, dur: len });
    at += len;
    dur -= len;
  }
  const N = n.midi;
  /** The ornament's notes, each `u` long (a trill's: its grid, `trillStep`), the last held to the end of the note. */
  const seq = (pitches: number[], trill = false) => {
    const u = trill ? trillStep(dur, ctx.trillUnit ?? ctx.unit, pitches.length) : Math.min(ctx.unit, dur / 4);
    pitches.forEach((midi, k) => {
      const s = at + k * u;
      out.push({ midi, at: s, dur: k === pitches.length - 1 ? n.at + n.dur - s : u });
    });
  };
  const has = (c: string) => signs.includes(c);
  const trillUp = ctx.diatonic ? ctx.stepAbove(N) : has("T") ? 2 : has("t") ? 1 : ctx.stepAbove(N);
  if (has("T") || has("t") || has("O")) {
    // D319: the trill lasts the note (trillPitches): from the note above, alternating on the tempo's
    // grid, the main note settling only for the last ~15% of a long note (C. P. E. Bach: through the
    // whole note, §21, no settle). The closing turn: written (R), or C. P. E. Bach's Nachschlag on a
    // somewhat long note (§13): the alternation ends on the main note, then the step below, then the
    // main note held (… U N L N).
    const cpe = ctx.style === "cpe";
    const closing = has("R") || (cpe && n.dur >= LONG_FOR_NACHSCHLAG) || !!ctx.nachschlag;
    seq(trillPitches(N, N + trillUp, N - ctx.stepBelow(N), dur, ctx.trillUnit ?? ctx.unit, closing, cpe || ctx.nachschlag ? 0 : (ctx.settle ?? TRILL_SETTLE)), true);
  } else if (has("M") || has("m")) {
    seq([N, N - (ctx.diatonic ? ctx.stepBelow(N) : has("M") ? 2 : 1), N]);
  } else if (has("W") || has("w")) {
    const up = ctx.diatonic ? ctx.stepAbove(N) : has("W") ? 2 : 1;
    const fromAbove = ctx.prevMidi !== undefined && ctx.prevMidi - N > 0 && ctx.prevMidi - N <= 2;
    seq(fromAbove ? [N, N + up, N] : [N + up, N, N + up, N]);
  } else if (has("S")) {
    seq([N + ctx.stepAbove(N), N, N - ctx.stepBelow(N), N]);
  } else if (has("$")) {
    seq([N - ctx.stepBelow(N), N, N + ctx.stepAbove(N), N]);
  } else {
    out.push({ midi: N, at, dur });
  }
  return out.filter((x) => x.dur > 1e-9);
}

/** A dotted value: three times a power of two of a small unit (in quarters). */
function isDotted(q: number): boolean {
  for (let d = 1 / 64; d <= 8; d *= 2) if (Math.abs(q - 3 * d) < 1e-9) return true;
  return false;
}

/** The step above and below a note in a key (semitones), from the key signature's alterations. */
export function keySteps(signature: Record<string, number>): { stepAbove(midi: number): number; stepBelow(midi: number): number } {
  const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
  const NATURAL = [0, 2, 4, 5, 7, 9, 11];
  const scale = LETTERS.map((l, i) => (((NATURAL[i] + (signature[l] ?? 0)) % 12) + 12) % 12);
  const nearest = (pc: number) => {
    let best = 0;
    for (let i = 0; i < 7; i++) if (Math.abs(((scale[i] - pc + 18) % 12) - 6) < Math.abs(((scale[best] - pc + 18) % 12) - 6)) best = i;
    return best;
  };
  return {
    stepAbove: (m) => {
      const i = nearest(((m % 12) + 12) % 12);
      return ((scale[(i + 1) % 7] - (m % 12) + 24) % 12) || 2;
    },
    stepBelow: (m) => {
      const i = nearest(((m % 12) + 12) % 12);
      return (((m % 12) - scale[(i + 6) % 7] + 24) % 12) || 2;
    },
  };
}
