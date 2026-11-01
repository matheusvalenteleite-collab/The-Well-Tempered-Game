/**
 * D371 (Mario and Luigi's report, 1c): the intro's music, Contrapunctus XIV's third subject, B♭–A–C–B♮
 * (BACH, his name in notes), read from the game's own data (pieces.json `bwv1080-14`, the tenor from bar
 * 193: B♭3 A3 C4 B3, half notes). The picture follows the notes (Intro.tsx): each image fades in on its note.
 *
 * D406 (the owner: "a more ethereal, discreet sound … the H a bit longer … then it rises to the
 * continuation of subject 3, C♯ to D, the D accompanied in the background by the consort completing the
 * D major chord (Picardy third), in sync with the screen going to the selection"): the subject and its
 * continuation as the data has them (the tenor goes on B3 C♯4 D4), an octave up on a soft TRAVERSO (the
 * game's baroque flute patch, breathy, quiet; the tenor's octave lies under the flute's compass), at
 * ♩ = 80: three half notes, the H held longer (a dotted half), the C♯ an eighth (a breath longer), then the
 * D; on the D the STRING CONSORT, softly, behind it (cello D3, viola A3, second violin D4, first violin
 * F♯4: D major, the third on top of the strings). The D is where the title page cross-fades into the
 * selection screen (INTRO_RESOLVE_S); the chord swells in, holds and fades to nothing over INTRO_TAIL_S
 * while the selection already shows.
 */
import { fugueById } from "../touch/fugue.ts";
import { PATCHES, preset, type Preset } from "../touch/sound.ts";
import { voicing, type Chip, type Sounding, type Voicing } from "../touch/chip.ts";

/** Where the subject is in the data: the piece, its voice (the tenor) and bar. */
export const BACH_SOURCE = { piece: "bwv1080-14", voice: 2, bar: 193 } as const;
/** B♭ A C B♮ as MIDI pitches (the tenor's octave). */
export const BACH_PITCHES = [58, 57, 60, 59] as const;
/** D406: what the tenor plays next in the data, C♯ D (the subject's continuation), the tenor's octave. */
export const BACH_CONTINUATION = [61, 62] as const;
/** D406: the flute plays the line this many semitones above the tenor (traverso: D4 to E6). */
export const INTRO_OCTAVE = 12;
/** Seconds a half note lasts (♩ = 80). */
export const INTRO_HALF_S = 1.5;
/** D406: the H held longer than the first three (a dotted half). */
export const INTRO_H_S = INTRO_HALF_S * 1.5;
/** D406: the C♯ (the data's eighth at ♩ = 80, 0.375 s, given a breath more). */
export const INTRO_CSHARP_S = 0.45;
/** D406: the D, and the consort's chord with it: seconds from the first note; the cross-fade to the selection starts here. */
export const INTRO_RESOLVE_S = 3 * INTRO_HALF_S + INTRO_H_S + INTRO_CSHARP_S;
/** D406: the chord's swell in (s). */
export const INTRO_SWELL_S = 0.6;
/** D406: the D and its chord die away over this long from the D (s), the selection already showing. */
export const INTRO_TAIL_S = 2.8;
/** D406: the title page's cross-fade into the selection screen, from the D (s). */
export const INTRO_CROSS_S = 1.4;
/** The title page, from the first note to the selection screen (s): the D, then the cross-fade. */
export const INTRO_S = INTRO_RESOLVE_S + INTRO_CROSS_S;
/** D406: a skip fades the sound out over this long (s), not a cut. */
export const INTRO_SKIP_FADE_S = 0.35;
/** D406: the flute's level (a note's own, 1 as the patch): quiet. */
export const INTRO_FLUTE_LEVEL = 0.55;
/** D406: the consort's level under the flute (its notes' trim): in the background. */
export const INTRO_CONSORT_LEVEL = 0.32;

/**
 * D406: the intro's own ensemble: the TRAVERSO on top, the STRING CONSORT's players under it (so their
 * recordings load with it), its salon for the strings and an airy share of the room for the flute.
 */
export const INTRO_PRESET: Preset = { id: "intro", name: "INTRO", slots: ["traverso", "consViolin", "consViola", "consViola", "consCello"], room: 0.3, fx: "salon" };

export interface IntroNote {
  midi: number;
  /** Seconds from the first note. */
  at: number;
  len: number;
  /** The last note (the D): faded from `at` to `at + len`. */
  fade: boolean;
}

/** D406: one of the consort's chord notes: its patch, pan and pitch. */
export interface ChordNote {
  midi: number;
  patch: "consViolin" | "consViola" | "consCello";
  pan: number;
}

/** D406: D major under the flute's D5 (D3 A3 D4 F♯4: the Picardy third in the first violin). */
export const INTRO_CHORD: readonly ChordNote[] = [
  { midi: 50, patch: "consCello", pan: 0.2 },
  { midi: 57, patch: "consViola", pan: 0.06 },
  { midi: 62, patch: "consViolin", pan: -0.08 },
  { midi: 66, patch: "consViolin", pan: -0.2 },
];

/**
 * The subject and its continuation as the intro plays them: the data's pitches from the tenor's first
 * B♭ in bar 193 (B♭ A C B♮ C♯ D; the report's and the owner's notes if the data were ever missing them),
 * an octave up; three half notes, the H longer, the C♯ short, the D held and faded with the chord.
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
  const lens = [INTRO_HALF_S, INTRO_HALF_S, INTRO_HALF_S, INTRO_H_S, INTRO_CSHARP_S, INTRO_TAIL_S];
  let at = 0;
  return pitches.map((m, i) => {
    // The C♯ held into the D (joined: the step a breath, not two attacks).
    const n = { midi: m + INTRO_OCTAVE, at, len: i < 4 ? lens[i] * 0.98 : i === 4 ? lens[i] + 0.02 : lens[i], fade: i === 5 };
    at += lens[i];
    return n;
  });
}

/** D406: the intro playing: when its first note is heard (the audio clock), and its quick fade on a skip. */
export interface IntroPlaying {
  t0: number;
  /** A skip: everything faded out over INTRO_SKIP_FADE_S (no cut), then stopped. */
  fadeOut: () => void;
}

/**
 * D406: plays the intro on `ch` (its preset set to INTRO_PRESET by the caller): the flute's six notes at
 * once (synthesized: nothing to load) through a gain of their own, which fades the D; the consort's chord
 * on the D once its recordings are in (`ready`, the chip's prepare), swelled in, held and faded with it
 * (each note's trim, so the strings' own room fades too). `ready` late: the chord joins as soon as it
 * can, never before the D. Everything through one gain, `out`, which a skip fades.
 */
export function playIntro(ch: Chip, ready: Promise<unknown>, lead = 0.12): IntroPlaying {
  const ctx = ch.ctx;
  const t0 = ctx.currentTime + lead;
  const out = ctx.createGain();
  out.connect(ch.input);
  const fl = ctx.createGain();
  fl.connect(out);
  const notes = bachNotes();
  const flute: Voicing = { ...voicing(0, 1, true), pan: 0, patch: PATCHES.traverso };
  const sounds: Sounding[] = [];
  let over = false;
  for (const [i, n] of notes.entries()) {
    // The C♯ joined into the D (no new breath).
    sounds.push(ch.note(n.midi, t0 + n.at, n.len, flute, { into: fl, level: INTRO_FLUTE_LEVEL, couple: false, ...(i === notes.length - 1 ? { legato: true, from: notes[i - 1]?.midi, final: true } : {}) }));
  }
  // The flute's D (alone on its gain by then) held through the swell, then dying away with the chord.
  const d = t0 + INTRO_RESOLVE_S;
  const end = d + INTRO_TAIL_S;
  fl.gain.setValueAtTime(1, d + INTRO_SWELL_S);
  fl.gain.linearRampToValueAtTime(0.0001, end);
  void ready.then(() => {
    // Not once the intro is over and the game's own sound is back (the chord would set its room).
    if (over || preset() !== INTRO_PRESET) return;
    const at = Math.max(d, ctx.currentTime + 0.03);
    if (end - at < 0.5) return;
    for (const c of INTRO_CHORD) {
      const sd = ch.note(c.midi, at, end - at + 0.1, { ...voicing(0, 1, true), pan: c.pan, patch: PATCHES[c.patch] }, { into: out, level: INTRO_CONSORT_LEVEL, couple: false });
      sd.trim?.(0.02, at, at + 0.001);
      sd.trim?.(1, at + 0.001, at + INTRO_SWELL_S);
      sd.trim?.(0.0001, at + INTRO_SWELL_S, end);
      sounds.push(sd);
    }
  });
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
      // Stopped once silent (the strings' room keeps only its own tail).
      for (const sd of sounds) sd.stop(now + INTRO_SKIP_FADE_S + 0.05);
    },
  };
}
