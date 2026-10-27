/**
 * D311, EXPRESSION UNDER THE THUMBS (the owner's Decision 12, "one design per instrument"): the bars'
 * HEIGHT stays the line's (LADDER judges the way, D296); ACROSS is the player's. Where a thumb lands
 * across its bar shapes the note's attack; moving it sideways while it holds shapes the sustain.
 * Small, smooth ranges; right or wrong never changes the sound (D293), and expression earns no points.
 *
 * The across value is normalised per bar: 0 the inner edge (by the music box) to 1 the outer edge (the
 * phone's edge), mirrored for the two bars (protos.ts barDynamic). One rule for every sound: toward
 * the box is softer, darker, more closed; toward the edge firmer, brighter, more open. The bar's middle
 * (0.5) is the sound as it was. The harpsichord is the one exception the owner placed himself: its
 * edge is the lute stop (a muted pluck), its inner part the plain 8'.
 *
 * Pure numbers here (tested in test/d311-expression.test.ts); chip.ts makes them sound (Play.touch, the
 * fields `landPlay` sets, Sounding.shape).
 */
import type { Patch, Wave } from "./sound.ts";
import { SAMPLED } from "./sampled.ts";

/** The instruments' families, each with its own design. */
export type TouchKind = "piano" | "harpsichord" | "organ" | "voice" | "singers" | "chip" | "console" | "synth" | "bleeps";

/** Each preset's family (by its id; presets not named here, as TRAVERSO with KIMIKO, take no expression). */
export const TOUCH_KINDS: Readonly<Record<string, TouchKind>> = {
  pianoSampled: "piano",
  harpsichordSampled: "harpsichord",
  chamberOrgan: "organ",
  vocalSynth: "voice",
  soloVoices: "singers",
  chip: "chip",
  gameboy: "chip",
  sid64: "chip",
  megaFm: "chip",
  tracker: "console",
  super16: "console",
  nocturne32: "console",
  analog: "synth",
  tomita: "synth",
  modular: "bleeps",
};

export const touchKind = (presetId: string): TouchKind | null => TOUCH_KINDS[presetId] ?? null;

/** The across value of a touch that says nothing (the computer's keys, a MIDI note on a sound without dynamics): the bar's middle, the sound as it was. */
export const TOUCH_NEUTRAL = 0.5;
/** The smoothing of every sustain change (s, a time constant: no zipper noise). */
export const TOUCH_TAU = 0.06;

// ---- Landing: the attack ----

/** PIANO: soft to firm, ±4 dB, on the softer recording (layer 7) under the middle and the firmer (layer 12) from it. */
export const PIANO_DB = 4;
/** Layer 7 against layer 12 at the same level (sampled.ts: 5 dB softer as recorded, raised by its gain): about -2 dB. */
export const PIANO_SOFT_NET_DB = 20 * Math.log10(SAMPLED.piano.soft?.gain ?? 1) - 5;
/** HARPSICHORD: the lute (buff) stop from here out: a lowpass from LUTE_HZ[0] (at its start) to LUTE_HZ[1] (at the edge), and a shorter ring. */
export const LUTE_FROM = 0.75;
export const LUTE_HZ: readonly [number, number] = [2000, 1200];
/** The lute stop's ring (s, a time constant after 30 ms; the plain string rings 1-4 s). */
export const LUTE_TAU = 0.22;
/** PIPE ORGAN: the echo manual under this (toward the box): quieter and flutier (D262's two keyboards). */
export const ECHO_BELOW = 0.35;
export const ECHO_GAIN = 0.6;
/** The echo manual's flute-like top: a lowpass at four times the note's pitch, within these (Hz). */
export const ECHO_LP: readonly [number, number] = [1200, 4000];
/** SOLO VOICES: closed toward the box (a lowpass down to this at the inner edge), open toward the edge (a high shelf up to this, dB). */
export const SING_CLOSED_HZ = 3000;
export const SING_OPEN_DB = 3;
/** SYNTH, CONSOLE and the chips without a pulse: the filter's brightness (Play.bright, -1..1) at the edges: ±span/2. */
export const BRIGHT_SPAN: Readonly<Record<"synth" | "console" | "chip", number>> = { synth: 1.2, console: 1.4, chip: 1.2 };
/** MEGA FM: the FM index scaled over this many octaves edge to edge (×0.62 to ×1.62). */
export const FM_OCTAVES = 1.4;
/** BLEEPS AND BLOOPS: the mallet's hardness: the strike's brightness (FM index burst, filter opening) over this many octaves (×0.5 to ×2). */
export const STRIKE_OCTAVES = 2;

/** VOCAL SYNTH: toward the box the vowel closes toward these (log-interpolated formants: "a" toward "o", the front vowels toward "u", rounded); toward the edge it opens (the jaw: F1 up to +12%, F2 +5%). */
export const VOWEL_CLOSED: Readonly<Record<string, "o" | "u">> = { a: "o", e: "u", i: "u", o: "u", u: "u" };
export const OPEN_F1 = 0.12;
export const OPEN_F2 = 0.05;
/** VOCAL SYNTH: a formant's frequency (Hz) for openness `open` (0..1), from the vowel's own (`f`) and its closed target's (`fc`); i the formant (0 F1). */
export function formantAt(f: number, fc: number, i: number, open: number): number {
  const c = clamp01(open);
  if (c < 0.5) return i < 3 ? f * (fc / f) ** ((0.5 - c) / 0.5) : f;
  const k = (c - 0.5) / 0.5;
  return f * (1 + (i === 0 ? OPEN_F1 : i === 1 ? OPEN_F2 : 0) * k);
}

/** The pulse width (12.5%, 25%, 50%: thin, hollow, square) a landing gives a pulse voice: a chip's three widths by thirds; the SID's continuous. */
export function pulseWidth(x: number, continuous = false): number {
  const c = clamp01(x);
  if (continuous) return 0.125 * 4 ** c;
  return c < 1 / 3 ? 0.125 : c < 2 / 3 ? 0.25 : 0.5;
}
/** The chip wave of a pulse width. */
export const pulseWave = (pw: number): "pulse12" | "pulse25" | "pulse50" => (pw < 0.19 ? "pulse12" : pw < 0.37 ? "pulse25" : "pulse50");
/** A pulse's loudness (RMS, its mean removed) at width d, against a 25% pulse: kept equal when the width changes. */
export const pulseRms = (d: number) => Math.sqrt(d * (1 - d)) / Math.sqrt(0.25 * 0.75);
const PULSE_WIDTH: Partial<Record<Wave, number>> = { pulse12: 0.125, pulse25: 0.25, pulse50: 0.5, square: 0.5 };
/** The width of a pulse wave (none for other waves). */
export const widthOf = (w: Wave): number | undefined => PULSE_WIDTH[w];

/**
 * What a landing does to a note (Play's fields; `level` here a factor on the note's own). `x` 0 the
 * inner edge to 1 the outer; `pt` the voice's patch (null: the classic chip), `pulse` whether the
 * voice (classic chip) is a pulse.
 */
export interface Landing {
  level?: number;
  tone?: number;
  bright?: number;
  layer?: "soft" | "firm";
  lp?: number;
  lute?: boolean;
  pw?: number;
  pwContinuous?: boolean;
  fmScale?: number;
  strike?: number;
  open?: number;
}

export function landing(kind: TouchKind, x: number, midi: number, pt: Patch | null, pulse = true): Landing {
  const c = clamp01(x);
  switch (kind) {
    case "piano": {
      const db = PIANO_DB * (2 * c - 1);
      const soft = c < 0.5;
      // The softer recording is already about 2 dB under: the level makes up the rest, so the loudness runs evenly over ±4 dB.
      return { layer: soft ? "soft" : "firm", level: 10 ** ((db - (soft ? PIANO_SOFT_NET_DB : 0)) / 20) };
    }
    case "harpsichord": {
      if (c < LUTE_FROM) return {};
      const k = (c - LUTE_FROM) / (1 - LUTE_FROM);
      return { lute: true, lp: LUTE_HZ[0] * (LUTE_HZ[1] / LUTE_HZ[0]) ** k };
    }
    case "organ":
      return c < ECHO_BELOW ? { level: ECHO_GAIN, lp: Math.max(ECHO_LP[0], Math.min(ECHO_LP[1], 4 * 440 * 2 ** ((midi - 69) / 12))) } : {};
    case "voice":
      return { open: c };
    case "singers":
      return c < 0.5 ? { lp: 16000 * (SING_CLOSED_HZ / 16000) ** ((0.5 - c) / 0.5) } : { tone: SING_OPEN_DB * ((c - 0.5) / 0.5) };
    case "chip": {
      if (!pt) return pulse ? { pw: pulseWidth(c) } : {};
      if (pt.fm) return { fmScale: 2 ** (FM_OCTAVES * (c - 0.5)) };
      if (pt.pwm) return { pw: pulseWidth(c, true), pwContinuous: true };
      if (pt.osc.some((o) => o.wave === "pulse12" || o.wave === "pulse25" || o.wave === "pulse50")) return { pw: pulseWidth(c) };
      return { bright: BRIGHT_SPAN.chip * (c - 0.5) };
    }
    case "console":
      return { bright: BRIGHT_SPAN.console * (c - 0.5) };
    case "synth":
      return { bright: BRIGHT_SPAN.synth * (c - 0.5) };
    case "bleeps":
      return { strike: 2 ** (STRIKE_OCTAVES * (c - 0.5)) };
  }
}

// ---- Holding sideways: the sustain ----

/** How a held note answers a sideways move: none (a struck string, an organ's steady wind), a swell (messa di voce), the vibrato's depth, a filter sweep (wah), the tremolo's speed. */
export type HoldMode = "none" | "messa" | "vibrato" | "wah" | "trem";

/** A sideways travel of this share of the bar's width is the full range (half the bar). */
export const HOLD_SPAN = 0.5;
/** SINGING VOICES: the messa di voce, ±dB. */
export const MESSA_DB = 3;
/** CHIPS, CONSOLES, the combo organ: the vibrato's depth added at the most (cents; inward takes the voice's own away). */
export const VIB_CENTS = 16;
/**
 * SYNTH: the wah: a resonant peak of up to WAH_DB, its centre at WAH_MULT times the note swept WAH_OCTAVES
 * either way (1.7 to 9.2 times the note: over the harmonics, never on the fundamental); nothing at rest.
 * Measured (a sawtooth, with and without the patch's lowpass, E2 to E6): the loudness at most +1.2 dB.
 */
export const WAH_DB = 6;
export const WAH_MULT = 4;
export const WAH_OCTAVES = 1.2;
export const WAH_Q = 3;
/** BLEEPS AND BLOOPS: the vibraphone's motor: its tremolo's speed over this many octaves either way. */
export const TREM_OCTAVES = 1.2;
/** VOCAL SYNTH: a note held still this long (s) blooms into a little vibrato (at most BLOOM_CENTS, or the voice's own if less). */
export const BLOOM_STILL = 0.5;
export const BLOOM_CENTS = 16;
export const BLOOM_DEFAULT = 10;
/** VOCAL SYNTH: a sideways move of this much sustain value (3% of the bar's width: more than a resting thumb's wander) breaks the stillness. */
export const BLOOM_MOVE = 0.06;

/** The sustain value of a thumb `dx` (across now less across at landing) away: -1 (inward) .. 1 (outward). */
export const holdValue = (dx: number) => Math.max(-1, Math.min(1, dx / HOLD_SPAN));

/** How a family's voice answers a held sideways move (`plucked`: a struck or plucked note: nothing to shape once struck). */
export function holdMode(kind: TouchKind, pt: Patch | null, plucked: boolean): HoldMode {
  switch (kind) {
    case "piano":
    case "harpsichord":
    case "organ":
      return "none";
    case "voice":
    case "singers":
      return "messa";
    case "synth":
      return "wah";
    case "bleeps":
      if (pt?.trem) return "trem";
      return plucked ? "none" : "vibrato";
    case "chip":
    case "console":
      return plucked ? "none" : "vibrato";
  }
}

/** The messa di voce's gain at sustain value s. */
export const messaGain = (s: number) => 10 ** ((MESSA_DB * clampS(s)) / 20);
/** The vibrato's depth (cents) at s, over the voice's own `base`. */
export const vibDepth = (base: number, s: number) => Math.max(0, base + VIB_CENTS * clampS(s));
/** The wah's peak for a note of f0 Hz: centre (Hz) and gain (dB) at s. */
export const wahAt = (s: number, f0: number) => ({ hz: Math.min(12000, WAH_MULT * f0 * 2 ** (WAH_OCTAVES * clampS(s))), db: WAH_DB * Math.abs(clampS(s)) });
/** The tremolo's speed at s, from the voice's own `rate`. */
export const tremRate = (rate: number, s: number) => rate * 2 ** (TREM_OCTAVES * clampS(s));

function clamp01(x: number) {
  return Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : TOUCH_NEUTRAL;
}
function clampS(s: number) {
  return Number.isFinite(s) ? Math.max(-1, Math.min(1, s)) : 0;
}
