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
 *   (Trillo und Mordant) it closes below and back (… U N L N);
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
  /** The note before in the same voice (for the snapped trill), if any. */
  prevMidi?: number;
  /** The key's step above and below a note (in semitones), for signs that do not say (S, $, O, W). */
  stepAbove(midi: number): number;
  stepBelow(midi: number): number;
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
  const u = Math.min(ctx.unit, dur / 4);
  /** The ornament's notes, each `u` long, the last held to the end of the note. */
  const seq = (pitches: number[]) =>
    pitches.forEach((midi, k) => {
      const s = at + k * u;
      out.push({ midi, at: s, dur: k === pitches.length - 1 ? n.at + n.dur - s : u });
    });
  const has = (c: string) => signs.includes(c);
  const trillUp = has("T") ? 2 : has("t") ? 1 : ctx.stepAbove(N);
  if (has("T") || has("t") || has("O")) {
    const U = N + trillUp;
    // Alternate for most of the note (the Explication's Trillo: five notes then the main note held on
    // a crotchet), an even count so that it lands on the main note; with R, close below and back.
    const span = dur * (dur <= 1 ? 0.7 : 0.8);
    let k = Math.max(4, Math.floor(span / u));
    if (k % 2) k--;
    const notes: number[] = [];
    for (let j = 0; j < k; j++) notes.push(j % 2 === 0 ? U : N);
    if (has("R")) notes.splice(notes.length - 2, 2, N - ctx.stepBelow(N), N);
    seq([...notes, N]);
  } else if (has("M") || has("m")) {
    seq([N, N - (has("M") ? 2 : 1), N]);
  } else if (has("W") || has("w")) {
    const up = has("W") ? 2 : 1;
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
