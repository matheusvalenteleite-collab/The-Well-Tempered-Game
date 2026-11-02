/**
 * D371 (Mario and Luigi's report, 1c): the intro's music, Contrapunctus XIV's third subject, B♭–A–C–B♮
 * (BACH, his name in notes), read from the game's own data (pieces.json `bwv1080-14`, the tenor from bar
 * 193: B♭3 A3 C4 B3, half notes). The picture follows the notes (Intro.tsx): each image fades in on its note.
 *
 * D406: the subject's continuation as the data has it (the tenor goes on B3 C♯4 D4), at ♩ = 80; the C♯ a short
 * step (a breath longer than the data's eighth) into the D, where the title page cross-fades into the selection
 * screen (INTRO_RESOLVE_S). D410 (a harpsichord arpeggio), D500 (STRING CONSORT's cello, then BAROQUE BAND's
 * suspension and perfect cadence): superseded by D507.
 *
 * D507 (the owner: "I hate the suspension to perfect cadence … a simple piano rendition of the B-A-C-H subject,
 * where the last D note gets a left hand D A D chord accompaniment, softly … Soft from start to end. Meditative,
 * not rumbley. At ALTO or SOPRANO height for the subject; the accompaniment is left hand, bass or tenor height. No
 * articulations in the subject statement, just legato with slight new attack at each note … H longer than the
 * others … should not be"): the recorded grand alone. The right hand B♭4 A4 C5 B4, C♯5 D5 (the data's line an
 * octave up, at the alto's and the soprano's height), the four of B-A-C-H equal half notes (the H no longer
 * held), the C♯ the data's short step into the D; legato, each key held a moment into the next (a pianist's
 * finger legato: the next note's own hammer is its slight new attack), no other articulation; soft throughout
 * (the soft layer, a little darker, levels by measurement). Under the D the left hand's open D3–A3–D4 (tenor
 * height: no low bass to rumble), gently spread from the bottom, softer than the line, ringing on as the title
 * page gives way, then fading to nothing over the selection.
 */
import { fugueById } from "../touch/fugue.ts";
import { PATCHES, presetById, type Preset } from "../touch/sound.ts";
import { voicing, type Chip, type Play, type Sounding } from "../touch/chip.ts";

/** Where the subject is in the data: the piece, its voice (the tenor) and bar. */
export const BACH_SOURCE = { piece: "bwv1080-14", voice: 2, bar: 193 } as const;
/** B♭ A C B♮ as MIDI pitches (the tenor's octave). */
export const BACH_PITCHES = [58, 57, 60, 59] as const;
/** D406: what the tenor plays next in the data, C♯ D (the subject's continuation), the tenor's octave. */
export const BACH_CONTINUATION = [61, 62] as const;
/** D507: the right hand an octave over the data's tenor (B♭4–D5: the alto's and the soprano's height). */
export const INTRO_OCTAVE = 12;
/** Seconds a half note lasts (♩ = 80). */
export const INTRO_HALF_S = 1.5;
/** D507: the H as long as the others (D406's dotted half undone). */
export const INTRO_H_S = INTRO_HALF_S;
/** D406: the C♯ (the data's eighth at ♩ = 80, 0.375 s, given a breath more). */
export const INTRO_CSHARP_S = 0.45;
/** D406: the D, and the left hand's chord with it: seconds from the first note; the cross-fade to the selection starts here. */
export const INTRO_RESOLVE_S = 3 * INTRO_HALF_S + INTRO_H_S + INTRO_CSHARP_S;
/** D507: legato: each key held this long into the next note's strike (finger legato). */
export const INTRO_OVERLAP_S = 0.07;

/** D507: the left hand's open D–A–D under the D (MIDI: D3 A3 D4), and its spread from the bottom (s after the D). */
export const INTRO_CHORD = [50, 57, 62] as const;
export const INTRO_CHORD_SPREAD_S = [0, 0.09, 0.18] as const;
/** D507: from the D the piano rings this long (s): the D and its chord held, the last INTRO_FADE_S faded to nothing. */
export const INTRO_TAIL_S = 5.5;
export const INTRO_FADE_S = 2.2;
/** D507: the title page's cross-fade into the selection screen, from the D (s): it has given way as the chord settles, which rings on over the selection. */
export const INTRO_CROSS_S = 2.3;
/** The title page, from the first note to the selection screen (s): the D, then the cross-fade. */
export const INTRO_S = INTRO_RESOLVE_S + INTRO_CROSS_S;
/** D406: a skip fades the sound out over this long (s), not a cut. */
export const INTRO_SKIP_FADE_S = 0.35;

/**
 * D507: the intro's own sound: PIANO (SAMPLED) (its recordings, its music room), under its own id so the game's
 * piano touch is not applied to it.
 */
export const INTRO_PRESET: Preset = { ...presetById("pianoSampled"), id: "intro", name: "INTRO" };

export interface IntroNote {
  midi: number;
  /** Seconds from the first note. */
  at: number;
  len: number;
}

/**
 * D507: soft from start to end: the line on the piano's soft layer (Salamander's layer 7, its pp-p colour) at this
 * level, the left hand's chord about 2.4 dB under it. By measurement (render-harness intro, scratchpad glock2/):
 * -28.6 LUFS on a computer and -27.8 on a phone, 1-2 dB under D500's intro (-27.5, -26.2) and about 5 dB under the
 * game's sounds; through the phone model (600 Hz high-pass) -34.6 (D500's -29.1: the piano's body is under the small
 * speaker's band). The soft layer lower (0.62, darkened 3 dB: -31.4 on a phone) fell to -38.7 there, nearly lost,
 * so the level stays here and the softness is the layer's.
 */
export const INTRO_LEVEL = 0.95;
export const INTRO_CHORD_LEVEL = 0.72;
/** D507: the soft layer's colour as recorded (Play.vel 0: not brightened or darkened by the level). */
export const INTRO_VEL = 0;

/**
 * The subject and its continuation as the intro plays them: the data's pitches from the tenor's first
 * B♭ in bar 193 (B♭ A C B♮ C♯ D; the report's and the owner's notes if the data were ever missing them),
 * an octave up; four equal half notes, the C♯ short, each held a moment into the next; the D rings on.
 */
export function bachNotes(): IntroNote[] {
  const want = [...BACH_PITCHES, ...BACH_CONTINUATION];
  let pitches: number[] = want;
  try {
    const f = fugueById(BACH_SOURCE.piece);
    const bar = f.id === BACH_SOURCE.piece ? f.bars.find((b) => b.n === BACH_SOURCE.bar) : undefined;
    const line = bar ? f.voices[BACH_SOURCE.voice].filter(([on]) => on >= bar.on) : [];
    const k = line.findIndex(([, , m]) => m === BACH_PITCHES[0]);
    const read = k >= 0 ? line.slice(k, k + want.length).map(([, , m]) => m) : [];
    if (read.length === want.length && read.every((m, i) => m === want[i])) pitches = read;
  } catch {
    /* the report's and the owner's notes */
  }
  const steps = [INTRO_HALF_S, INTRO_HALF_S, INTRO_HALF_S, INTRO_H_S, INTRO_CSHARP_S];
  let at = 0;
  return pitches.map((m, i) => {
    const len = i < steps.length ? steps[i] + INTRO_OVERLAP_S : INTRO_TAIL_S;
    const note = { midi: m + INTRO_OCTAVE, at, len };
    at += steps[i] ?? 0;
    return note;
  });
}

/** D507: the left hand's chord: seconds from the first note, to the tail's end. */
export function chordNotes(): IntroNote[] {
  return INTRO_CHORD.map((midi, i) => ({ midi, at: INTRO_RESOLVE_S + INTRO_CHORD_SPREAD_S[i], len: INTRO_TAIL_S - INTRO_CHORD_SPREAD_S[i] }));
}

/** Every pitch the intro plays (their recordings loaded before it starts). */
export const introPitches = (): number[] => [...new Set([...bachNotes(), ...chordNotes()].map((x) => x.midi))];

/** The intro waits at most this long for its recordings (ms; under Intro.tsx's 2.6 s for the picture). */
export const INTRO_LOAD_WAIT_MS = 2200;

/** D406: the intro playing: when its first note is heard (the audio clock), and its quick fade on a skip. */
export interface IntroPlaying {
  t0: number;
  /** A skip: everything faded out over INTRO_SKIP_FADE_S (no cut), then stopped. */
  fadeOut: () => void;
}

/**
 * D507: plays the intro on `ch` (its preset set to INTRO_PRESET by the caller, its recordings prepared): the
 * right hand's six notes and the left hand's chord, all handed to the chip at once (nine notes), soft; the D and
 * its chord faded to nothing at the tail's end (each note's trim, so its room's send fades too). Everything
 * through one gain, `out`, which a skip fades.
 */
export function playIntro(ch: Chip, lead = 0.12): IntroPlaying {
  const ctx = ch.ctx;
  const t0 = ctx.currentTime + lead;
  const out = ctx.createGain();
  out.connect(ch.input);
  const sounds: Sounding[] = [];
  const v = { ...voicing(0, 1, true), pan: 0, patch: PATCHES.pianoSampled };
  const end = t0 + INTRO_RESOLVE_S + INTRO_TAIL_S;
  const fadeFrom = end - INTRO_FADE_S;
  const soft: Play = { into: out, couple: false, layer: "soft", vel: INTRO_VEL };
  const play = (x: IntroNote, level: number, last: boolean) => {
    const on = t0 + x.at;
    const sd = ch.note(x.midi, on, x.len, v, { ...soft, level, ...(last ? { final: true } : {}) });
    if (last) {
      sd.trim?.(1, fadeFrom, fadeFrom + 0.001);
      sd.trim?.(0.0001, fadeFrom, end);
    }
    sounds.push(sd);
  };
  const line = bachNotes();
  line.forEach((x, i) => play(x, INTRO_LEVEL, i === line.length - 1));
  for (const x of chordNotes()) play(x, INTRO_CHORD_LEVEL, true);
  let over = false;
  return {
    t0,
    fadeOut: () => {
      if (over) return;
      over = true;
      const now = ctx.currentTime;
      const g = out.gain;
      if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(now);
      else (g.cancelScheduledValues(now), g.setValueAtTime(g.value, now));
      g.linearRampToValueAtTime(0.0001, now + INTRO_SKIP_FADE_S);
      // Stopped once silent (the room keeps only its own tail).
      for (const sd of sounds) sd.stop(now + INTRO_SKIP_FADE_S + 0.05);
    },
  };
}
