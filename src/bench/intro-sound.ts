/**
 * D371 (Mario and Luigi's report, 1c): the intro's music, Contrapunctus XIV's third subject, B♭–A–C–B♮
 * (BACH, his name in notes), read from the game's own data (pieces.json `bwv1080-14`, the tenor from bar
 * 193: B♭3 A3 C4 B3, half notes), on the PIPE ORGAN (its Principal 8′ in its cathedral, D349/D357). About
 * nine seconds: the four half notes at ♩ = 80 (1.5 s each), the last held on and faded to nothing, the
 * church's tail after it. The picture follows the notes (Intro.tsx): each image fades in on its note,
 * everything fades out with the last one's decay.
 */
import { fugueById } from "../touch/fugue.ts";

/** Where the subject is in the data: the piece, its voice (the tenor) and bar. */
export const BACH_SOURCE = { piece: "bwv1080-14", voice: 2, bar: 193 } as const;
/** B♭ A C B♮ as MIDI pitches (the tenor's octave). */
export const BACH_PITCHES = [58, 57, 60, 59] as const;
/** Seconds a half note lasts (♩ = 80). */
export const INTRO_HALF_S = 1.5;
/** The last note: held this long, its level ramped to nothing from its start (s). */
export const INTRO_LAST_S = 3.6;
/** The whole intro, from the first note to the selection screen (s). */
export const INTRO_S = 9;

export interface IntroNote {
  midi: number;
  /** Seconds from the first note. */
  at: number;
  len: number;
  /** The last note: faded from `at` to `at + len`. */
  fade: boolean;
}

/**
 * The four notes as the intro plays them: the data's pitches from the tenor's first B♭ in bar 193 (the
 * report's notes if the data were ever missing them), each a half note, the last held and faded.
 */
export function bachNotes(): IntroNote[] {
  let pitches: number[] = [...BACH_PITCHES];
  try {
    const f = fugueById(BACH_SOURCE.piece);
    const bar = f.id === BACH_SOURCE.piece ? f.bars.find((b) => b.n === BACH_SOURCE.bar) : undefined;
    const line = bar ? f.voices[BACH_SOURCE.voice].filter(([on]) => on >= bar.on) : [];
    const k = line.findIndex(([, , m]) => m === BACH_PITCHES[0]);
    const read = k >= 0 ? line.slice(k, k + 4).map(([, , m]) => m) : [];
    if (read.length === 4 && read.every((m, i) => m === BACH_PITCHES[i])) pitches = read;
  } catch {
    /* the report's notes */
  }
  return pitches.map((midi, i) => ({ midi, at: i * INTRO_HALF_S, len: i < 3 ? INTRO_HALF_S * 0.98 : INTRO_LAST_S, fade: i === 3 }));
}
