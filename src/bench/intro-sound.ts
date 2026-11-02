/**
 * D371 (Mario and Luigi's report, 1c): the intro's music, Contrapunctus XIV's third subject, B♭–A–C–B♮
 * (BACH, his name in notes), read from the game's own data (pieces.json `bwv1080-14`, the tenor from bar
 * 193: B♭3 A3 C4 B3, half notes). The picture follows the notes (Intro.tsx): each image fades in on its note.
 *
 * D406 (the owner: "a more ethereal, discreet sound … the H a bit longer … then it rises to the
 * continuation of subject 3, C♯ to D, the D accompanied in the background by the consort completing the
 * D major chord (Picardy third), in sync with the screen going to the selection"): the subject and its
 * continuation as the data has them (the tenor goes on B3 C♯4 D4), at ♩ = 80: three half notes, the H
 * held longer (a dotted half), the C♯ an eighth (a breath longer), then the D. The D is where the title
 * page cross-fades into the selection screen (INTRO_RESOLVE_S).
 *
 * D410 (a harpsichord arpeggio on the D, two slurs on the traverso): superseded by D500.
 *
 * D500 (the owner: "change the intro B-A-C-H sound to this string consort bass sound, and eliminate the
 * slurs i had added to it, devise your own more conservative articulations for it, and the d major chord is
 * done by the whole baroque band basso continuo, but improve what it does, it's not just an arpeggio, it's a
 * suspension to perfect cadence, harmonize it beautifully"): the line on STRING CONSORT's recorded cello in
 * the data's own octave (B♭3 A3 C4 B3 C♯4 D4: the cello's D and A strings), each note its own bow, a little
 * apart (the bow's stop, then D427's bite on the next: non legato), the H the longest; then BAROQUE BAND with
 * its continuo harpsichord closes it: on the cello's D the tonic minor (the suspension's preparation), the
 * dominant under the oboe's D held over (4–3), the violin's seventh, and the perfect cadence into D major,
 * the violin's F♮ of the first chord become F♯ (the Picardy third) as the title page gives way.
 */
import { fugueById } from "../touch/fugue.ts";
import { PATCHES, preset, type PatchId, type Preset } from "../touch/sound.ts";
import { voicing, type Chip, type Play, type Sounding } from "../touch/chip.ts";

/** Where the subject is in the data: the piece, its voice (the tenor) and bar. */
export const BACH_SOURCE = { piece: "bwv1080-14", voice: 2, bar: 193 } as const;
/** B♭ A C B♮ as MIDI pitches (the tenor's octave). */
export const BACH_PITCHES = [58, 57, 60, 59] as const;
/** D406: what the tenor plays next in the data, C♯ D (the subject's continuation), the tenor's octave. */
export const BACH_CONTINUATION = [61, 62] as const;
/** D500: the cello plays the tenor's own octave (B♭3–D4: its D and A strings). */
export const INTRO_OCTAVE = 0;
/** Seconds a half note lasts (♩ = 80). */
export const INTRO_HALF_S = 1.5;
/** D406: the H held longer than the first three (a dotted half). */
export const INTRO_H_S = INTRO_HALF_S * 1.5;
/** D406: the C♯ (the data's eighth at ♩ = 80, 0.375 s, given a breath more). */
export const INTRO_CSHARP_S = 0.45;
/** D406: the D, and the band's entry with it: seconds from the first note; the cross-fade to the selection starts here. */
export const INTRO_RESOLVE_S = 3 * INTRO_HALF_S + INTRO_H_S + INTRO_CSHARP_S;

/**
 * D500, the cadence, in seconds from the D: the tonic minor (the suspension prepared), the dominant with the
 * oboe's D held over it (the 4th struck), its resolution to C♯ (the 3rd), the violin's seventh, the tonic.
 */
export const CAD_DOMINANT_S = 0.7;
export const CAD_RESOLVE_S = 1.4;
export const CAD_SEVENTH_S = 1.7;
export const CAD_TONIC_S = 2.0;
/** D500: the band's last chord dies away over this long at the end of the tail (s). */
export const INTRO_FADE_S = 1.6;
/** D406, D500: from the D the band's close sounds this long (s): the cadence, the tonic held, then faded to nothing over the selection. */
export const INTRO_TAIL_S = 5.0;
/**
 * D406, D500: the title page's cross-fade into the selection screen, from the D (s): it has given way as the
 * tonic lands (a moment after, the tonic handed to the chip while the intro's own sound still plays).
 */
export const INTRO_CROSS_S = CAD_TONIC_S + 0.3;
/** The title page, from the first note to the selection screen (s): the D, then the cross-fade. */
export const INTRO_S = INTRO_RESOLVE_S + INTRO_CROSS_S;
/** D406: a skip fades the sound out over this long (s), not a cut. */
export const INTRO_SKIP_FADE_S = 0.35;

/** D500: the cello's notes a little apart (s before the next bow): non legato, each note its own bow. */
export const INTRO_BOW_GAP_S = 0.05;
/** D500: the C♯ leaning a little closer into the D. */
export const INTRO_LEAD_GAP_S = 0.04;
/** D500: the cello's D, sounding with the band's first chord until the band's bass moves to the dominant (s). */
export const INTRO_CELLO_D_S = CAD_DOMINANT_S - 0.04;

/**
 * D500: the intro's own ensemble: STRING CONSORT's cello for the subject, BAROQUE BAND's players for the close
 * (so all their recordings load with it), in the band's music room (REVERBS.band, every player's send there).
 */
export const INTRO_PRESET: Preset = { id: "intro", name: "INTRO", slots: ["consCello", "bandViolin", "bandOboe", "bandViola", "bandCello"], also: ["harpsiSampled"], room: 0, fx: "band" };

export interface IntroNote {
  midi: number;
  /** Seconds from the first note. */
  at: number;
  len: number;
}

/** D500: the band's parts: violin, oboe, viola, the cello (the continuo harpsichord's left hand on its notes, Patch.double), the harpsichord's right hand (two voices). */
export type BandPart = "violin" | "oboe" | "viola" | "cello" | "rhUpper" | "rhLower";
/** D500: one note of the close: its part, pitch, onset from the D (s) and length (s; the last chord's to the tail's end). */
export interface BandNote {
  part: BandPart;
  midi: number;
  at: number;
  len: number;
}

/** D500: each part's patch, seat (BAROQUE BAND's seats, D430) and level (the band's measured levels). */
export const BAND_SEATS: Record<BandPart, { patch: PatchId; pan: number; level: number }> = {
  violin: { patch: "bandViolin", pan: -0.2, level: 1.11 },
  oboe: { patch: "bandOboe", pan: -0.06, level: 0.85 },
  viola: { patch: "bandViola", pan: 0.12, level: 1.32 },
  cello: { patch: "bandCello", pan: 0.04, level: 1 },
  // The right hand behind the cello, centre-left (CONTINUO's seat), under the band.
  rhUpper: { patch: "harpsiSampled", pan: -0.1, level: 0.45 },
  rhLower: { patch: "harpsiSampled", pan: -0.04, level: 0.45 },
};

/** D500: the right hand's chord gently spread after the left hand's bass (s from the harmony): its lower note, then its upper. */
export const RH_SPREAD_S = [0.06, 0.12] as const;
/** D500: the last chord spread a little slower. */
export const RH_SPREAD_LAST_S = [0.09, 0.19] as const;

const T = INTRO_TAIL_S;
const [DOM, RES, SEV, TON] = [CAD_DOMINANT_S, CAD_RESOLVE_S, CAD_SEVENTH_S, CAD_TONIC_S];
const n = (part: BandPart, midi: number, at: number, until: number): BandNote => ({ part, midi, at, len: until - at });
/**
 * D500, the close (MIDI; seconds from the D), D minor → A (4–3, then its 7th) → D major:
 *   violin  F5 ─ E5 ─── G5 ─ F♯5   the tonic's minor third, the dominant's fifth, its seventh, the Picardy third
 *   oboe    D5 ════ C♯5 ── D5      D prepared on the tonic, held over the dominant (the 4th), resolved to C♯
 *   viola   A4 ─────────── A4      the common tone, bowed again on the tonic
 *   rh      D4  E4  E4  D4         the harpsichord's right hand, over A3 throughout, between bass and viola
 *   cello   D3 ─ A2 ─────── D3     the roots (the harpsichord's left hand on them, Patch.double)
 * The cello's D4 (the subject's goal) sounds with the first chord.
 */
export const INTRO_BAND: readonly BandNote[] = [
  n("violin", 77, 0, DOM), n("violin", 76, DOM, SEV), n("violin", 79, SEV, TON), n("violin", 78, TON, T),
  n("oboe", 74, 0, RES), n("oboe", 73, RES, TON), n("oboe", 74, TON, T),
  n("viola", 69, 0, TON), n("viola", 69, TON, T),
  n("rhUpper", 62, 0, DOM), n("rhUpper", 64, DOM, RES), n("rhUpper", 64, RES, TON), n("rhUpper", 62, TON, T),
  n("rhLower", 57, 0, DOM), n("rhLower", 57, DOM, RES), n("rhLower", 57, RES, TON), n("rhLower", 57, TON, T),
  n("cello", 50, 0, DOM), n("cello", 45, DOM, TON), n("cello", 50, TON, T),
];

/** D500: the cello's (the subject's) level, and the band's, both by measurement (the old intro's loudness). */
export const INTRO_CELLO_LEVEL = 0.54;
export const INTRO_BAND_LEVEL = 0.35;

/**
 * The subject and its continuation as the intro plays them: the data's pitches from the tenor's first
 * B♭ in bar 193 (B♭ A C B♮ C♯ D; the report's and the owner's notes if the data were ever missing them);
 * three half notes, the H longer, the C♯ short, each a little apart (D500), the D with the band's first chord.
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
    // D500: no slurs: each note stops before the next bow (the C♯ leaning closer into the D).
    const len = i < steps.length ? steps[i] - (i === 4 ? INTRO_LEAD_GAP_S : INTRO_BOW_GAP_S) : INTRO_CELLO_D_S;
    const note = { midi: m + INTRO_OCTAVE, at, len };
    at += steps[i] ?? 0;
    return note;
  });
}

/** D500: every pitch the intro plays (their recordings loaded before it starts). */
export const introPitches = (): number[] => [...new Set([...bachNotes().map((x) => x.midi), ...INTRO_BAND.map((x) => x.midi)])];

/** D500: the intro waits at most this long for its recordings (ms; under Intro.tsx's 2.6 s for the picture). */
export const INTRO_LOAD_WAIT_MS = 2200;

/** D406: the intro playing: when its first note is heard (the audio clock), and its quick fade on a skip. */
export interface IntroPlaying {
  t0: number;
  /** A skip: everything faded out over INTRO_SKIP_FADE_S (no cut), then stopped. */
  fadeOut: () => void;
}

/** D500: a band note joined into the next of its part as a resolution of the 4th or the 7th (slurred from the dissonance). */
const resolution = (a: BandNote, b: BandNote) => a.midi - b.midi > 0 && a.midi - b.midi <= 2 && ((a.part === "oboe" && b.at === RES) || (a.part === "violin" && b.at === TON));

/** D500: each harmony of the close handed to the chip this long before it sounds (s). */
export const INTRO_LOOKAHEAD_S = 0.35;
/** D500: runs `fn` `s` seconds from now, returning its cancel (a test runs it at once). */
export type Later = (fn: () => void, s: number) => () => void;
const later: Later = (fn, s) => {
  const id = setTimeout(fn, Math.max(0, s * 1000));
  return () => clearTimeout(id);
};

/**
 * D500: plays the intro on `ch` (its preset set to INTRO_PRESET by the caller, its recordings prepared): the
 * cello's six notes at once, each its own bow (the last one stopped, then a new stroke's bite: D427); the
 * band's close from the D, each harmony handed to the chip INTRO_LOOKAHEAD_S before it sounds (all at once,
 * the chip's cap counted the close's later notes as sounding already, and on a phone, 18 notes, it let the
 * cello's last notes go to make room), the last while the title page still shows (the game's own sound back
 * after it); the last chord faded to nothing at the tail's end (each note's trim, so its room's send fades
 * too). Everything through one gain, `out`, which a skip fades.
 */
export function playIntro(ch: Chip, lead = 0.12, when: Later = later): IntroPlaying {
  const ctx = ch.ctx;
  const t0 = ctx.currentTime + lead;
  const out = ctx.createGain();
  out.connect(ch.input);
  const sounds: Sounding[] = [];
  const cello = { ...voicing(0, 1, true), pan: 0, patch: PATCHES.consCello };
  const notes = bachNotes();
  for (const [i, x] of notes.entries()) {
    const art: Play = { ...(i > 0 ? { legato: true, bowChange: true, from: notes[i - 1].midi } : {}), ...(i < notes.length - 1 ? { give: "bow" as const } : { final: true }) };
    sounds.push(ch.note(x.midi, t0 + x.at, x.len, cello, { into: out, level: INTRO_CELLO_LEVEL, couple: false, ...art }));
  }
  const d = t0 + INTRO_RESOLVE_S;
  const end = d + INTRO_TAIL_S;
  const fadeFrom = end - INTRO_FADE_S;
  const lastOn = Math.max(...INTRO_BAND.map((x) => x.at));
  let over = false;
  const play = (i: number) => {
    const x = INTRO_BAND[i];
    const seat = BAND_SEATS[x.part];
    const prev = INTRO_BAND[i - 1]?.part === x.part ? INTRO_BAND[i - 1] : undefined;
    const next = INTRO_BAND[i + 1]?.part === x.part ? INTRO_BAND[i + 1] : undefined;
    const keys = seat.patch === "harpsiSampled";
    const spread = x.at === lastOn ? RH_SPREAD_LAST_S : RH_SPREAD_S;
    const late = x.part === "rhLower" ? spread[0] : x.part === "rhUpper" ? spread[1] : 0;
    const on = d + x.at + late;
    // The strings and the oboe joined within the cadence (a new bow, the oboe's tongue), the 4th's and the
    // 7th's resolutions slurred from the dissonance (the same bow, the same breath); the keys plucked.
    const joinIn: Play = keys || !prev ? {} : { legato: true, from: prev.midi, ...(resolution(prev, x) ? { slur: true } : { bowChange: true }) };
    const joinOut: Play = keys || !next ? {} : { tie: 0.04, give: resolution(x, next) ? "slur" : "bow" };
    const len = x.len - late + (keys ? 0 : next ? 0.04 : 0.1);
    const sd = ch.note(x.midi, on, len, { ...voicing(0, 1, true), pan: seat.pan, patch: PATCHES[seat.patch] }, { into: out, level: INTRO_BAND_LEVEL * seat.level, couple: false, ...joinIn, ...joinOut, ...(next ? {} : { final: true }) });
    if (!next) {
      const f = Math.max(on, fadeFrom);
      sd.trim?.(1, f, f + 0.001);
      sd.trim?.(0.0001, Math.max(on + 0.01, f), end);
    }
    sounds.push(sd);
  };
  const cancels = [...new Set(INTRO_BAND.map((x) => x.at))].sort((a, b) => a - b).map((at) =>
    when(() => {
      // Not after a skip, nor once the game's own sound is back (its room is not the band's).
      if (over || preset() !== INTRO_PRESET) return;
      INTRO_BAND.forEach((x, i) => x.at === at && play(i));
    }, d + at - INTRO_LOOKAHEAD_S - ctx.currentTime),
  );
  return {
    t0,
    fadeOut: () => {
      if (over) return;
      over = true;
      cancels.forEach((c) => c());
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
