/**
 * D371 (Mario and Luigi's report, 1c): the intro's music, Contrapunctus XIV's third subject, B♭–A–C–B♮
 * (BACH, his name in notes), read from the game's own data (pieces.json `bwv1080-14`, the tenor from bar
 * 193). The picture follows the notes (Intro.tsx): each image fades in on its note.
 *
 * D406 (the C♯–D continuation), D410, D500, D507 (the line an octave up over a left-hand D–A–D): superseded by D935.
 *
 * D935 (the owner: "I want it to sound more like it does in the original piece when that subject is introduced
 * … I specially don't like the robotic way it's sounding now and the weird cadence to D A D"): Bach's own notes
 * and nothing else, at his pitch: every voice of the data from the tenor's B♭3 (bar 193, beat 3, where the
 * subject enters alone after the second section's cadence) to bar 197's downbeat, where the tenor's statement
 * closes on D4 (C♯4 → D4) and the alto's answer has sounded its own four notes (F E G F♯: G4 → F♯4), the two
 * resting on D–F♯ (INTRO_TO_BAR). No added chord. Played on the recorded grand as a pianist would: a breath
 * before the first note; the time shaped (phrasing.ts withSpeed: the first note settled into, a little forward
 * to the D, the C♯ lingered on, the last beats slowing into the close); loudness by the phrase's arch
 * (whole-reading.ts phraseArchDb), the metre's weight (PALETTES.dolce) and the subject a little over the alto,
 * the colour following the level (Play.vel); finger legato into each next note, the dampers slow and the room a
 * little larger (dolce's half pedal); the closing D–F♯ held under the pedal and left to ring, faded to nothing.
 */
import { fugueById, inBar } from "../touch/fugue.ts";
import { PATCHES, presetById, type Preset } from "../touch/sound.ts";
import { voicing, type Chip, type Play, type Sounding } from "../touch/chip.ts";
import { TOUCH, withSpeed } from "../touch/phrasing.ts";
import { metricPlace, PALETTES, phraseArchDb } from "../touch/whole-reading.ts";

/** Where the subject is in the data: the piece, its voice (the tenor) and bar. */
export const BACH_SOURCE = { piece: "bwv1080-14", voice: 2, bar: 193 } as const;
/** B♭ A C B♮ as MIDI pitches (the tenor's octave, as written). */
export const BACH_PITCHES = [58, 57, 60, 59] as const;
/** D935: the stretch ends on this bar's downbeat (its notes there the last struck, held to the end). */
export const INTRO_TO_BAR = 197;
/** D935: Bach's pitch (D507's octave up undone); a variant may move every voice together. */
export const INTRO_OCTAVE = 0;
/** D935: the tempo (quarters a minute) before the shaping. */
export const INTRO_BPM = 76;

/**
 * D935: a performance of the stretch: its octave, its tempo and tempo shape (beats from the B♭ against a speed,
 * straight lines between), the subject's and the other voice's dB, the legato's overlap (s), the dampers' and the
 * room's scale (the pedal), how long the last notes ring and the fade at its end (s), the breath before the first
 * note (s).
 */
export interface IntroPerformance {
  octave: number;
  bpm: number;
  speed: readonly (readonly [beat: number, speed: number])[];
  subjectDb: number;
  othersDb: number;
  overlapS: number;
  dampMul: number;
  roomMul: number;
  lingerS: number;
  fadeS: number;
  breathS: number;
}

/**
 * D935, the shipped performance: settled into from 0.9 of the tempo, a little forward through B-A-C-H toward the D
 * (1.03), the C♯ lingered on (0.82: D406's breath into the D), the D held at tempo while the alto answers, then the
 * last two and a half beats slowing to 0.78 (phrasing.ts RIT_END) into the close.
 */
export const INTRO_A: IntroPerformance = {
  octave: INTRO_OCTAVE,
  bpm: INTRO_BPM,
  speed: [[0, 0.9], [1.5, 1], [6, 1.03], [7.5, 0.98], [7.5, 0.82], [8, 0.82], [8, 1], [11.5, 1], [14, 0.78]],
  subjectDb: 0,
  othersDb: -2.5,
  overlapS: 0.08,
  dampMul: PALETTES.dolce.dampMul,
  roomMul: PALETTES.dolce.roomMul,
  lingerS: 4.6,
  fadeS: 2.6,
  breathS: 0.6,
};

/** The data's notes there, if the data were ever missing them (beats from the B♭, beats long, MIDI, voice). */
const FALLBACK: readonly (readonly [number, number, number, number])[] = [
  [0, 2, 58, 2], [2, 2, 57, 2], [4, 2, 60, 2], [6, 1.5, 59, 2], [7.5, 0.5, 61, 2], [8, 3.5, 62, 2], [8, 2, 65, 1], [10, 2, 64, 1],
  [11.5, 0.25, 61, 2], [11.75, 0.25, 59, 2], [12, 2, 61, 2], [12, 2, 67, 1], [14, 2, 62, 2], [14, 1.5, 66, 1],
];

/**
 * The stretch as the data has it: [onset, duration, MIDI, voice], ticks from the B♭ (every voice, onsets from the
 * B♭ to INTRO_TO_BAR's downbeat); the quarter's ticks, the downbeat's tick, and each onset's place in the metre.
 */
function stretch(): { notes: [number, number, number, number][]; tpq: number; end: number; place: (tick: number) => 0 | 1 | 2 } {
  try {
    const f = fugueById(BACH_SOURCE.piece);
    const bar = f.id === BACH_SOURCE.piece ? f.bars.find((b) => b.n === BACH_SOURCE.bar) : undefined;
    const to = f.bars.find((b) => b.n === INTRO_TO_BAR);
    const first = bar ? f.voices[BACH_SOURCE.voice].find(([on, , m]) => on >= bar.on && m === BACH_PITCHES[0]) : undefined;
    if (bar && to && first) {
      const s = first[0];
      const notes: [number, number, number, number][] = [];
      f.voices.forEach((vs, v) => {
        for (const [on, d, m] of vs) if (on >= s && on <= to.on) notes.push([on - s, d, m, v]);
      });
      notes.sort((a, b) => a[0] - b[0] || a[3] - b[3]);
      const subj = notes.filter((n) => n[3] === BACH_SOURCE.voice).slice(0, 4).map((n) => n[2]);
      if (subj.every((m, i) => m === BACH_PITCHES[i])) return { notes, tpq: f.tpq, end: to.on - s, place: (t) => metricPlace((x) => inBar(f, x), t + s, f.tpq) };
    }
  } catch {
    /* the fallback */
  }
  const tpq = 4;
  // The B♭ on the bar's third beat.
  return { notes: FALLBACK.map(([b, d, m, v]) => [b * tpq, d * tpq, m, v]), tpq, end: 14 * tpq, place: (t) => ((t + 2 * tpq) % (4 * tpq) === 0 ? 0 : t % tpq === 0 ? 1 : 2) };
}

export interface IntroNote {
  midi: number;
  /** Seconds from the first note. */
  at: number;
  len: number;
  /** The voice in the data (BACH_SOURCE.voice the subject's). */
  voice: number;
  /** dB about the intro's level (the phrase, the metre, the voice). */
  db: number;
  /** One of the last notes (struck on INTRO_TO_BAR's downbeat): held to the end, faded. */
  last: boolean;
}

/** A fixed unevenness (s), the same every run: a hash of the note, TOUCH.piano.jitter at most either way. */
const jitter = (v: number, tick: number) => {
  const h = Math.sin(v * 127.1 + tick * 0.0137) * 43758.5453;
  return (h - Math.floor(h) - 0.5) * 2 * TOUCH.piano.jitter;
};

/**
 * D935: the intro as played: every voice of the stretch, its times through the performance's tempo shape (the
 * first note at 0, the others a few ms uneven), each held a moment into its voice's next (finger legato), the last
 * ones held to the end; each note's dB the phrase's arch over the stretch, the metre's weight (dolce: downbeat,
 * beat, between) and its voice's.
 */
export function introNotes(p: IntroPerformance = INTRO_A): IntroNote[] {
  const { notes, tpq, end, place } = stretch();
  const sp = p.speed;
  const speed = (tick: number) => {
    const b = tick / tpq;
    let k = 0;
    while (k < sp.length - 1 && sp[k + 1][0] <= b) k++;
    if (k >= sp.length - 1) return sp[sp.length - 1][1];
    const [b0, s0] = sp[k];
    const [b1, s1] = sp[k + 1];
    return b1 > b0 ? s0 + ((s1 - s0) * (b - b0)) / (b1 - b0) : s1;
  };
  const w = withSpeed({ warp: (t) => t, unwarp: (t) => t }, speed, end, Math.max(1, Math.round(tpq / 16)));
  const secs = (tick: number) => (w.warp(tick) / tpq) * (60 / p.bpm);
  const total = secs(end) + p.lingerS;
  return notes.map(([on, , m, v], i) => {
    const last = on >= end;
    const at = secs(on) + (on > 0 ? jitter(v, on) : 0);
    const next = notes.find((n, j) => j > i && n[3] === v && n[0] > on);
    const len = last || !next ? total - at : secs(next[0]) - at + p.overlapS;
    const db = phraseArchDb(end ? on / end : 0) + PALETTES.dolce.weight[place(on)] + (v === BACH_SOURCE.voice ? p.subjectDb : p.othersDb);
    return { midi: m + p.octave, at, len, voice: v, db, last };
  });
}

/** D935: B, A, C, H as heard (s from the first note): the title page's four images fade in on them (Intro.tsx). */
export const introOnsets = (p: IntroPerformance = INTRO_A): number[] =>
  introNotes(p).filter((x) => x.voice === BACH_SOURCE.voice).slice(0, 4).map((x) => x.at);
/** D935: the close (the last notes struck, s from the first): the title page's cross-fade into the selection starts here. */
export const introResolve = (p: IntroPerformance = INTRO_A): number => Math.min(...introNotes(p).filter((x) => x.last).map((x) => x.at));

/** D935: the images' times (s from the first note): B, A, C, H. */
export const INTRO_ONSETS_S: readonly number[] = introOnsets();
/** D935: the close: seconds from the first note; the cross-fade to the selection starts here. */
export const INTRO_RESOLVE_S = introResolve();
/** D935: the last notes ring this long from the close (s), the last INTRO_FADE_S faded to nothing. */
export const INTRO_TAIL_S = INTRO_A.lingerS;
export const INTRO_FADE_S = INTRO_A.fadeS;
/** D935: the title page's cross-fade into the selection screen, from the close (s): gone while the D–F♯ still rings. */
export const INTRO_CROSS_S = 2.4;
/** The title page, from the first note to the selection screen (s): the close, then the cross-fade. */
export const INTRO_S = INTRO_RESOLVE_S + INTRO_CROSS_S;
/** D406: a skip fades the sound out over this long (s), not a cut. */
export const INTRO_SKIP_FADE_S = 0.35;
/** D935: the breath before the first note (s from the sound being ready). */
export const INTRO_BREATH_S = INTRO_A.breathS;

/**
 * D507: the intro's own sound: PIANO (SAMPLED) (its recordings, its music room), under its own id so the game's
 * piano touch is not applied to it.
 */
export const INTRO_PRESET: Preset = { ...presetById("pianoSampled"), id: "intro", name: "INTRO" };

/**
 * D935: the level at 0 dB, on the soft layer (Salamander's layer 7), each note's dB about it; the colour follows
 * the level (Play.vel = the note's dB: a note played softer is darker). Set by measurement to about D507's loudness
 * (scratchpad intro/NOTES.md).
 */
export const INTRO_LEVEL = 0.71;

/** Every pitch the intro plays (their recordings loaded before it starts). */
export const introPitches = (p: IntroPerformance = INTRO_A): number[] => [...new Set(introNotes(p).map((x) => x.midi))];

/** The intro waits at most this long for its recordings (ms; under Intro.tsx's 2.6 s for the picture). */
export const INTRO_LOAD_WAIT_MS = 2200;

/** D406: the intro playing: when its first note is heard (the audio clock), and its quick fade on a skip. */
export interface IntroPlaying {
  t0: number;
  /** A skip: everything faded out over INTRO_SKIP_FADE_S (no cut), then stopped. */
  fadeOut: () => void;
}

/**
 * D935: plays the intro on `ch` (its preset set to INTRO_PRESET by the caller, its recordings prepared), the first
 * note `lead` s from now (the breath): every note handed to the chip at once, on the soft layer, its level and
 * colour by its dB, the dampers and the room by the pedal; the last notes faded to nothing at the end (each note's
 * trim, so its room's send fades too). Everything through one gain, `out`, which a skip fades.
 */
export function playIntro(ch: Chip, lead = INTRO_BREATH_S, p: IntroPerformance = INTRO_A): IntroPlaying {
  const ctx = ch.ctx;
  const t0 = ctx.currentTime + lead;
  const out = ctx.createGain();
  out.connect(ch.input);
  const sounds: Sounding[] = [];
  const v = { ...voicing(0, 1, true), pan: 0, patch: PATCHES.pianoSampled };
  const notes = introNotes(p);
  const end = t0 + Math.min(...notes.filter((x) => x.last).map((x) => x.at)) + p.lingerS;
  const fadeFrom = end - p.fadeS;
  for (const x of notes) {
    const play: Play = { into: out, couple: false, layer: "soft", level: INTRO_LEVEL * 10 ** (x.db / 20), vel: x.db, dampMul: p.dampMul, roomMul: p.roomMul, ...(x.last ? { final: true } : {}) };
    const sd = ch.note(x.midi, t0 + x.at, x.len, v, play);
    if (x.last) {
      sd.trim?.(1, fadeFrom, fadeFrom + 0.001);
      sd.trim?.(0.0001, fadeFrom, end);
    }
    sounds.push(sd);
  }
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
