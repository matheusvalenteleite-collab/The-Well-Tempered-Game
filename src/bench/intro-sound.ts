/**
 * D371 (Mario and Luigi's report, 1c): the intro's music, Contrapunctus XIV's third subject, B♭–A–C–B♮
 * (BACH, his name in notes), read from the game's own data (pieces.json `bwv1080-14`, the tenor from bar
 * 193). The picture follows the notes (Intro.tsx): each image fades in on its note.
 *
 * D406 (the C♯–D continuation), D410, D500, D507 (the line an octave up over a left-hand D–A–D): superseded by D935.
 *
 * D935 (the owner: "more like it does in the original piece when that subject is introduced … I specially don't like
 * the robotic way it's sounding now and the weird cadence to D A D"; then, of its first version: "played faster …
 * the notes less aggressive, more soft creamy like a pianist with a good careful touch. I don't want the fugal answer
 * to the subject, only its initial entry up to completion. No other voice enters"): Bach's notes and nothing else:
 * the tenor alone, as the data has it from its B♭3 on bar 193's third beat (where the third subject enters alone
 * after the second section's cadence) to bar 197's downbeat (INTRO_TO_BAR): the subject's nine notes (B♭ A C B♮
 * C♯ D, held, C♯ B C♯: fourteen beats, the length of every one of its entries in the piece) and the tenor's own
 * next note, the D4 the last C♯ rises to, a half note before the tenor's rest: the statement closed. The alto's
 * answer (bar 195) is not played. At Bach's pitch. On the recorded grand as a careful pianist would play it: ♩ = 96
 * with a small breath at the start and a gentle easing into the D (phrasing.ts withSpeed); the softest layer, its
 * loudness shaped narrowly (the phrase's arch and the metre's weight at under half their size: nothing pokes out);
 * the attack darkened (una corda: Play.vel low and following the level only by half; a lowpass at 4.5 kHz on these
 * notes only); full finger legato, slow dampers (the soft pedal), a warmer room; and no note read from a recording
 * that dies away quickly (Play.fromSample: C4's soft recording loses 30 dB in 1.6 s, A3's 13): B3 and C4 from A3,
 * C♯4 and D4 from D♯4. The D rings on and fades. Alternatives (INTRO_VARIANTS) are kept for the renders only.
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
/** D935: the line ends on this bar's downbeat (the tenor's D4, the last note, held to the end). */
export const INTRO_TO_BAR = 197;
/** D935: Bach's pitch (D507's octave up undone). */
export const INTRO_OCTAVE = 0;

type PatchId = keyof typeof PATCHES;

/**
 * D935: a performance of the line: the instrument (a PATCHES id) and its octave, a second instrument doubling it
 * (`double`: its octave and dB), the tempo and its shape (beats from the B♭ against a speed, straight lines between),
 * the share of the phrase's arch and the metre's weight it plays (`shape`), the level (linear, set by measurement),
 * the colour (Play.vel = `velBase` + `velPerDb` × the note's dB), a lowpass, the recordings each pitch is read from
 * (`samples`), the legato (`overlapS`; `joined`: a bowed instrument's notes joined, no new stroke), the dampers' and
 * the room's scale, how long the last note rings and the fade at its end, the breath before the first note (s).
 */
export interface IntroPerformance {
  patch: PatchId;
  octave: number;
  double?: { patch: PatchId; octave: number; db: number };
  bpm: number;
  speed: readonly (readonly [beat: number, speed: number])[];
  shape: number;
  level: number;
  layer?: "soft";
  velBase: number;
  velPerDb: number;
  lp?: number;
  samples?: Readonly<Record<number, number>>;
  overlapS: number;
  joined?: boolean;
  dampMul: number;
  roomMul: number;
  lingerS: number;
  fadeS: number;
  breathS: number;
}

/** D935: the piano's recordings for the line (the written pitch → the recording read): none that die away quickly. */
export const INTRO_SAMPLES: Readonly<Record<number, number>> = { 57: 57, 58: 57, 59: 57, 60: 57, 61: 63, 62: 63 };

/**
 * D935, the shipped performance: the careful pianist. ♩ = 96, the first note settled into (0.93 → 1 over the first
 * beat and a quarter), the last two and a half beats easing to 0.88; the arch and the weight at 0.45 (the line within
 * about 2 dB); the soft layer, una corda (vel −3, half the colour of the level), a lowpass at 4.5 kHz; each note held
 * 120 ms into the next, the dampers 1.8× slower (the palettes' most), the room 1.4×.
 */
export const INTRO_A: IntroPerformance = {
  patch: "pianoSampled",
  octave: INTRO_OCTAVE,
  bpm: 96,
  speed: [[0, 0.93], [1.25, 1], [11.5, 1], [14, 0.88]],
  shape: 0.45,
  level: 0.99,
  layer: "soft",
  velBase: -3,
  velPerDb: 0.5,
  lp: 4500,
  samples: INTRO_SAMPLES,
  overlapS: 0.12,
  dampMul: 1.8,
  roomMul: 1.4,
  lingerS: 4.2,
  fadeS: 2.4,
  breathS: 0.5,
};

/**
 * D935: the alternatives the owner heard beside it (render-harness only; the game plays INTRO_A). The same line, Bach's
 * notes only; each level set by measurement to the shipped intro's loudness.
 */
export const INTRO_VARIANTS: Readonly<Record<string, IntroPerformance>> = {
  // The same pianist an octave up (D507's height): sweeter on a phone's small speaker; read from C5 and D♯5 (A4's soft recording dies quickly).
  octave: { ...INTRO_A, octave: 12, level: 1.03, samples: { 69: 72, 70: 72, 71: 72, 72: 72, 73: 72, 74: 75 } },
  // The same pianist slower (♩ = 80), side by side with the shipped ♩ = 96.
  slower: { ...INTRO_A, bpm: 80, level: 1.04 },
  // A solo cello (the consort's), as written: one bow, the notes joined, a breath before the first.
  cello: { ...INTRO_A, patch: "consCello", layer: undefined, samples: undefined, lp: undefined, velBase: 0, velPerDb: 0, shape: 0.7, level: 0.4, joined: true, overlapS: 0.06, dampMul: 1, roomMul: 1.2, lingerS: 3.2, fadeS: 2.2, breathS: 0.7, speed: [[0, 0.9], [1.5, 1], [11.5, 1], [14, 0.85]] },
  // A viola as written over a cello an octave below, a soft unison of two players.
  violaCello: { ...INTRO_A, patch: "consViola", double: { patch: "consCello", octave: -12, db: -4 }, layer: undefined, samples: undefined, lp: undefined, velBase: 0, velPerDb: 0, shape: 0.7, level: 0.41, joined: true, overlapS: 0.06, dampMul: 1, roomMul: 1.2, lingerS: 3.2, fadeS: 2.2, breathS: 0.7, speed: [[0, 0.9], [1.5, 1], [11.5, 1], [14, 0.85]] },
  // The jazz quartet's vibraphone, softest mallets, its motor's slow shimmer: a music box's glow, an octave up.
  vibes: { ...INTRO_A, patch: "jqVibes", octave: 12, layer: undefined, samples: undefined, lp: undefined, velBase: 0, velPerDb: 0, level: 0.76, roomMul: 1.3, dampMul: 1 },
};

/** The data's line there, if the data were ever missing it (beats from the B♭, beats long, MIDI). */
const FALLBACK: readonly (readonly [number, number, number])[] = [
  [0, 2, 58], [2, 2, 57], [4, 2, 60], [6, 1.5, 59], [7.5, 0.5, 61], [8, 3.5, 62], [11.5, 0.25, 61], [11.75, 0.25, 59], [12, 2, 61], [14, 2, 62],
];

/**
 * The line as the data has it: [onset, duration, MIDI], ticks from the B♭ (the tenor's onsets from the B♭ to
 * INTRO_TO_BAR's downbeat); the quarter's ticks, the downbeat's tick, each onset's place in the metre.
 */
function line(): { notes: [number, number, number][]; tpq: number; end: number; place: (tick: number) => 0 | 1 | 2 } {
  try {
    const f = fugueById(BACH_SOURCE.piece);
    const bar = f.id === BACH_SOURCE.piece ? f.bars.find((b) => b.n === BACH_SOURCE.bar) : undefined;
    const to = f.bars.find((b) => b.n === INTRO_TO_BAR);
    const first = bar ? f.voices[BACH_SOURCE.voice].find(([on, , m]) => on >= bar.on && m === BACH_PITCHES[0]) : undefined;
    if (bar && to && first) {
      const s = first[0];
      const notes = f.voices[BACH_SOURCE.voice].filter(([on]) => on >= s && on <= to.on).map(([on, d, m]): [number, number, number] => [on - s, d, m]);
      if (BACH_PITCHES.every((m, i) => notes[i]?.[2] === m)) return { notes, tpq: f.tpq, end: to.on - s, place: (t) => metricPlace((x) => inBar(f, x), t + s, f.tpq) };
    }
  } catch {
    /* the fallback */
  }
  const tpq = 4;
  // The B♭ on the bar's third beat.
  return { notes: FALLBACK.map(([b, d, m]) => [b * tpq, d * tpq, m]), tpq, end: 14 * tpq, place: (t) => ((t + 2 * tpq) % (4 * tpq) === 0 ? 0 : t % tpq === 0 ? 1 : 2) };
}

export interface IntroNote {
  midi: number;
  /** Seconds from the first note. */
  at: number;
  len: number;
  /** dB about the performance's level (the phrase and the metre). */
  db: number;
  /** The last note (INTRO_TO_BAR's downbeat): held to the end, faded. */
  last: boolean;
  /** The doubling instrument's note (`IntroPerformance.double`), not the line's. */
  double?: boolean;
}

/** A fixed unevenness (s), the same every run: a hash of the note, TOUCH.piano.jitter at most either way. */
const jitter = (tick: number) => {
  const h = Math.sin(tick * 0.0137 + 254.2) * 43758.5453;
  return (h - Math.floor(h) - 0.5) * 2 * TOUCH.piano.jitter;
};

/**
 * D935: the line as played: its times through the performance's tempo shape (the first note at 0, the others a few
 * ms uneven), each held a moment into the next (legato), the last held to the end; each note's dB the phrase's arch
 * over the line and the metre's weight (dolce: downbeat, beat, between), both scaled by `shape`. A doubling
 * instrument's notes after the line's, at the same times.
 */
export function introNotes(p: IntroPerformance = INTRO_A): IntroNote[] {
  const { notes, tpq, end, place } = line();
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
  const out = notes.map(([on, , m], i): IntroNote => {
    const last = on >= end;
    const at = secs(on) + (on > 0 ? jitter(on) : 0);
    const next = notes[i + 1];
    const len = last || !next ? total - at : secs(next[0]) + (next[0] > 0 ? jitter(next[0]) : 0) - at + p.overlapS;
    const db = p.shape * (phraseArchDb(end ? on / end : 0) + PALETTES.dolce.weight[place(on)]);
    return { midi: m + p.octave, at, len, db, last };
  });
  const d = p.double;
  return d ? [...out, ...out.map((x) => ({ ...x, midi: x.midi - p.octave + d.octave, db: x.db + d.db, double: true }))] : out;
}

/** D935: B, A, C, H as heard (s from the first note): the title page's four images fade in on them (Intro.tsx). */
export const introOnsets = (p: IntroPerformance = INTRO_A): number[] =>
  introNotes(p).filter((x) => !x.double).slice(0, 4).map((x) => x.at);
/** D935: the close (the last note struck, s from the first): the title page's cross-fade into the selection starts here. */
export const introResolve = (p: IntroPerformance = INTRO_A): number => introNotes(p).find((x) => x.last)?.at ?? 0;

/** D935: the images' times (s from the first note): B, A, C, H. */
export const INTRO_ONSETS_S: readonly number[] = introOnsets();
/** D935: the close: seconds from the first note; the cross-fade to the selection starts here. */
export const INTRO_RESOLVE_S = introResolve();
/** D935: the last note rings this long from the close (s), the last INTRO_FADE_S faded to nothing. */
export const INTRO_TAIL_S = INTRO_A.lingerS;
export const INTRO_FADE_S = INTRO_A.fadeS;
/** D935: the title page's cross-fade into the selection screen, from the close (s): gone while the D still rings. */
export const INTRO_CROSS_S = 2.2;
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

/** D935: the shipped level (INTRO_A's): set by measurement to about D507's loudness (scratchpad intro2/NOTES.md). */
export const INTRO_LEVEL = INTRO_A.level;

/** Every pitch the intro plays, and the recordings it reads them from (loaded before it starts). */
export const introPitches = (p: IntroPerformance = INTRO_A): number[] => [...new Set([...introNotes(p).map((x) => x.midi), ...Object.values(p.samples ?? {})])];

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
 * note `lead` s from now (the breath): every note handed to the chip at once, its level and colour by its dB, read
 * from its chosen recording, the dampers and the room by the pedal; the last note faded to nothing at the end (its
 * trim, so its room's send fades too). Everything through one gain, `out`, which a skip fades.
 */
export function playIntro(ch: Chip, lead = INTRO_BREATH_S, p: IntroPerformance = INTRO_A): IntroPlaying {
  const ctx = ch.ctx;
  const t0 = ctx.currentTime + lead;
  const out = ctx.createGain();
  out.connect(ch.input);
  const sounds: Sounding[] = [];
  const notes = introNotes(p);
  const end = t0 + introResolve(p) + p.lingerS;
  const fadeFrom = end - p.fadeS;
  notes.forEach((x, i) => {
    const patch = PATCHES[x.double && p.double ? p.double.patch : p.patch];
    const v = { ...voicing(0, 1, true), pan: 0, patch };
    const from = p.samples?.[x.midi];
    const joined = p.joined && i > 0 && !notes[i - 1].double === !x.double && !notes[i - 1].last;
    const play: Play = {
      into: out,
      couple: false,
      level: p.level * 10 ** (x.db / 20),
      vel: p.velBase + p.velPerDb * x.db,
      dampMul: p.dampMul,
      roomMul: p.roomMul,
      ...(p.layer ? { layer: p.layer } : {}),
      ...(p.lp ? { lp: p.lp, hold: "none" as const } : {}),
      ...(from !== undefined ? { fromSample: from } : {}),
      ...(joined ? { legato: true } : {}),
      ...(p.joined && !x.last ? { tie: p.overlapS } : {}),
      ...(x.last ? { final: true } : {}),
    };
    const sd = ch.note(x.midi, t0 + x.at, x.len, v, play);
    if (x.last) {
      sd.trim?.(1, fadeFrom, fadeFrom + 0.001);
      sd.trim?.(0.0001, fadeFrom, end);
    }
    sounds.push(sd);
  });
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
