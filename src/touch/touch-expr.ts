/**
 * D311, EXPRESSION UNDER THE THUMBS (the owner's Decision 12, "one design per instrument"): the bars'
 * HEIGHT stays the line's (LADDER judges the way, D296); ACROSS is the player's. Where a thumb lands
 * across its bar shapes the note's attack; moving it sideways while it holds shapes the sustain.
 * Small, smooth ranges; right or wrong never changes the sound (D293), and expression earns no points.
 *
 * The across value is normalised per bar: 0 the inner edge (by the music box) to 1 the outer edge (the
 * phone's edge), mirrored for the two bars, and read as strength (protos.ts barDynamic, by STRONG_SIDE:
 * D315, the strong side by the box). One rule for every sound: toward the soft side softer, darker, more
 * closed; toward the strong side firmer, brighter, more open. The bar's middle (0.5) is the sound as it
 * was. The harpsichord's lute stop (a muted pluck) is where the owner placed it, at the outer edge (D315: the
 * soft side). D511: and every offered sound softer to stronger by level too (TOUCH_LEVEL_DB, measured): the
 * harpsichord's strong zone a brighter pluck, the organ's swell box, the chips' thin pulse on the strong side.
 *
 * Pure numbers here (tested in test/d311-expression.test.ts); chip.ts makes them sound (Play.touch, the
 * fields `landPlay` sets, Sounding.shape).
 */
import type { Patch, Wave } from "./sound.ts";
import { SAMPLED } from "./sampled.ts";

/** The instruments' families, each with its own design. */
export type TouchKind = "piano" | "harpsichord" | "organ" | "voice" | "singers" | "chip" | "console" | "synth" | "bleeps" | "winds" | "brass" | "jazz";

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
  analog: "synth",
  tomita: "synth",
  // D433: BLEEPS AND BLOOPS ("modular", "bleeps": the mallets' hardness) retired; the kind kept for its patches.
  // D365: STRING CONSORT as the singers (a bow's pressure: darker toward the soft side, a swell held, the
  // messa di voce a string player makes too); LUTE as the harpsichord (plucked near the rose at the outer
  // edge: the lute stop's muted, darker pluck).
  stringConsort: "singers",
  // D430: BAROQUE BAND as the consort (a bow's or the breath's pressure, the messa).
  baroqueBand: "singers",
  // D504: ZELENKA TRIO a wind's: the breath's attack (the soft side a round start on the softer layer, the strong
  // side a firm, reedy one, brighter) and a held note's swell (BREATH_DB, its brightness, oboe II's vibrato).
  oboeTrio: "winds",
  // TRIALS (instruments-trials): the bands of held instruments as the consort (a bow's or the breath's pressure,
  // the messa); the jazz quartet as the piano (the touch's three zones: their dynamics).
  trialWinds: "singers",
  // D502: BACH BRASS its own: the landing its brassiness, a held sway its swell (brassLanding, holdMode "swell").
  bachBrass: "brass",
  // D503: JAZZ QUARTET, each instrument its own touch in the piano's three zones (landing "jazz"): the mallet's hardness on
  // the vibraphone, the weight on the piano, the pluck on the bass; a held vibraphone note's SWAY the motor's speed.
  jazzQuartet: "jazz",
};

export const touchKind = (presetId: string): TouchKind | null => TOUCH_KINDS[presetId] ?? null;

/**
 * D314: which side of a bar is STRONG (the firmer, brighter attack; where the reading's accent ">" is
 * played; D338: ACCENT ✓ is judged by time now, not here): "outer" (the phone's edge, as D311 laid it out) or "inner" (by the box).
 * The one switch: protos.ts barDynamic (the across value every sound and judgement reads) follows it,
 * and so does every drawing of the across axis (the soft/strong hints, the marks, the thumbs shown).
 */
// D315: the owner: "Outer edge soft": the strong side is the inner one, by the box.
export const STRONG_SIDE = "inner" as "outer" | "inner";
/** D314: a bar's place across (0 the inner edge, 1 the outer) as strength (0 soft, 1 strong); the same flip maps strength back to the place. */
export const strengthOf = (across: number): number => (STRONG_SIDE === "outer" ? across : 1 - across);

/** The across value of a touch that says nothing (the computer's keys, a MIDI note on a sound without dynamics): the bar's middle, the sound as it was. */
export const TOUCH_NEUTRAL = 0.5;
/** The smoothing of every sustain change (s, a time constant: no zipper noise). */
export const TOUCH_TAU = 0.06;

// ---- Landing: the attack ----

/**
 * PIANO: D311's soft to firm, ±4 dB, a smooth map (kept for the record and the Lab's measures). D385 (WTC
 * 1.88, the panel's report §1): a thumb lands within about ±2 mm of its aim but its aim wanders ±3–4 mm
 * from take to take, on a strip about 28 mm wide: three bands are hit almost every time (94% with the drift),
 * five are not (55%). So the piano's landing is now THREE ZONES (pianoZone): soft, normal, strong, each a
 * third of the bar, PIANO_ZONE_DB about the line's level: lighter, as written, heavier. The level itself
 * is the reading's (Play.lineDb: Busoni's pp to ff); the touch shapes inside it.
 */
export const PIANO_DB = 4;
/** D385: the piano's three zones (dB about the line's level): soft, normal, strong. */
export const PIANO_ZONE_DB: readonly [number, number, number] = [-3, 0, 3];
/** D385: the zone of a landing's strength (0 soft, 1 normal, 2 strong), each a third of the bar. */
export const pianoZone = (x: number): 0 | 1 | 2 => (clamp01(x) < 1 / 3 ? 0 : clamp01(x) < 2 / 3 ? 1 : 2);
/** D385: the strong zone: where a reading's accent (">", "^") is played (proto-game.ts: ACCENT ✓ is the strong zone on time). */
export const STRONG_ZONE_FROM = 2 / 3;
/** D385: under this level (dB about the middle) the piano's softer recording (layer 7), from it the firmer (the report: colour by level). */
export const PIANO_SOFT_BELOW_DB = -1.5;
/** Layer 7 against layer 12 at the same level (sampled.ts: 5 dB softer as recorded, raised by its gain): about -2 dB. */
export const PIANO_SOFT_NET_DB = 20 * Math.log10(SAMPLED.piano.soft?.gain ?? 1) - 5;
/**
 * HARPSICHORD (D511: the piano's three zones): the soft zone the lute (buff) stop, a lowpass from LUTE_HZ[0] (at the
 * zone's start) to LUTE_HZ[1] (at the soft edge) and a shorter ring; the middle the plain 8′; the strong zone the 8′
 * plucked nearer the nut, brighter (a high shelf rising to HARPSI_BRIGHT_DB at the strong edge). D311 put the lute at
 * the outer edge, which D315 made the soft side; D511 keeps it there by strength (whichever side is strong).
 */
export const LUTE_BELOW = 1 / 3;
export const LUTE_HZ: readonly [number, number] = [2000, 1200];
export const HARPSI_BRIGHT_DB = 4;
/** The lute stop's ring (s, a time constant after 30 ms; the plain string rings 1-4 s). */
export const LUTE_TAU = 0.22;
/**
 * PIPE ORGAN: the echo manual under this (the soft zone): quieter and flutier (D262's two keyboards; D349: the second
 * manual's soft flutes, chip.ts). D511: and the SWELL BOX across the whole strip (the player's division enclosed): its
 * shutters closed toward the soft side, open toward the strong, the level (TOUCH_LEVEL_DB) and the brightness (a high
 * shelf, ORGAN_SWELL_TONE dB at the edges) together; held, the swell pedal moved (holdMode "messa").
 */
export const ECHO_BELOW = 1 / 3;
export const ECHO_GAIN = 0.7;
export const ORGAN_SWELL_TONE: readonly [number, number] = [-2, 3];
/** The echo manual's flute-like top: a lowpass at four times the note's pitch, within these (Hz). */
export const ECHO_LP: readonly [number, number] = [1200, 4000];
/** SOLO VOICES: closed toward the soft side (a lowpass down to this at its edge), open toward the strong side (a high shelf up to this, dB). */
export const SING_CLOSED_HZ = 3000;
export const SING_OPEN_DB = 3;
/**
 * D502, BACH BRASS: the landing across the strip is BRASSINESS, continuous: 0 the soft side (mellow: the piano
 * recording, darker) to 1 the strong side (blazing: the forte recording, brighter, the brass's edge). The two layers
 * crossfaded at equal power (brassMix), a gentle presence shelf (BRASS_EDGE: -1.5 dB at the soft edge to +3 dB at the
 * strong, a high shelf at BRASS_EDGE.hz), and a little level (BRASS_LEVEL_DB: a brass player blows harder for the
 * edge): the middle is the sound as the band plays it. Busoni's printed level moves the brassiness too
 * (BRASS_DB_SPAN dB the whole range: an f brighter as well as louder), the band's notes and the player's alike.
 * Never by verdict.
 */
export const BRASS_NEUTRAL = 0.5;
export const BRASS_EDGE = { hz: 2200, soft: -1.5, strong: 3 } as const;
export const BRASS_LEVEL_DB: readonly [number, number] = [-2, 1.5];
export const BRASS_DB_SPAN = 12;
/** D502: the two layers' gains at brassiness b (equal power: the piano layer at 0, the forte at 1, both -3 dB at the middle). */
export function brassMix(b: number): { forte: number; piano: number } {
  const c = clamp01(b);
  return { forte: Math.sin((c * Math.PI) / 2), piano: Math.cos((c * Math.PI) / 2) };
}
/** D502: the presence shelf (dB) at brassiness b: BRASS_EDGE.soft at 0, nothing at the middle, BRASS_EDGE.strong at 1. */
export function brassEdgeDb(b: number): number {
  const c = clamp01(b);
  return c < 0.5 ? BRASS_EDGE.soft * (1 - 2 * c) : BRASS_EDGE.strong * (2 * c - 1);
}
/** D502: the player's landing's own level (dB) at brassiness b (linear, BRASS_LEVEL_DB edge to edge; +0 a little past the middle). */
export function brassLevelDb(b: number): number {
  const [lo, hi] = BRASS_LEVEL_DB;
  return lo + (hi - lo) * clamp01(b);
}
/** D502: a note's brassiness from a landing (`x`, strength; the band's: BRASS_NEUTRAL) moved by the reading's level (dB). */
export function brassOf(x: number, db = 0): number {
  return clamp01(clamp01(x) + (Number.isFinite(db) ? db : 0) / BRASS_DB_SPAN);
}
/**
 * D502, THE SWELL: the held thumb swayed across the strip is a messa di voce on the held note, as brass players
 * crescendo on a long note: ±BRASS_SWELL_DB of level (toward the strong side louder) with the brightness following
 * (the brassiness moved BRASS_SWELL_MOVE either way: the crossfade toward the forte as it swells, the piano as it fades).
 */
export const BRASS_SWELL_DB = 4;
export const BRASS_SWELL_MOVE = 0.35;
/** D502: the swell's gain at sustain value s (-1..1). */
export const swellGain = (s: number) => 10 ** ((BRASS_SWELL_DB * clampS(s)) / 20);
/** D502: the brassiness a held note's swell has moved it to, from its landing's `b0`. */
export const swellBrass = (b0: number, s: number) => clamp01(b0 + BRASS_SWELL_MOVE * clampS(s));

/**
 * D511, SOFT TO STRONG ON EVERY INSTRUMENT (the owner: "All instruments ought to have something in the horizontal
 * axis which makes them softer to strong (even if it's not just a volume change)"): each offered sound's landing a
 * level as well as its own colour (the family's: the lute and the brighter pluck, the swell box, the pulse's width,
 * the filter, the vowel, the bow's or the breath's pressure), so that the soft edge to the strong edge is clearly
 * heard: at least TOUCH_SPAN_MIN_DB of loudness through the phone's speaker and a computer's (measured, rendered:
 * DECISIONS D511), whatever the colour does to the loudness on its own (a closed vowel louder, a thin pulse louder,
 * a lowpass softer). The dB at the soft edge and at the strong edge about the middle (0: the sound as it was), linear
 * between; the piano and the jazz quartet's zones (and BACH BRASS's brassiness) carry their own. Never by verdict.
 */
export const TOUCH_SPAN_MIN_DB = 5;
export const TOUCH_LEVEL_DB: Readonly<Record<string, readonly [soft: number, strong: number]>> = {
  // The piano's and the jazz quartet's three zones (±3 dB and their recordings' colour) already measured 6-9 dB.
  pianoSampled: [0, 0],
  jazzQuartet: [0, 0],
  // A buff stop's softer note, a firmer pluck (with the lute's darkness and the brighter pluck's shelf).
  harpsichordSampled: [-0.5, 1.5],
  // The swell box's shutters: the level with its brightness (ORGAN_SWELL_TONE), the echo manual's under it.
  chamberOrgan: [-1.5, 2.5],
  // The chips: the pulse's width (the thin one strong), the FM index, with a level.
  chip: [-2, 2.5],
  gameboy: [-3, 1],
  sid64: [-3, 1],
  megaFm: [-3.5, 1],
  // The consoles' and the synthesizers' filter (TOMITA's patches hardly answer it: the level does).
  super16: [-5, 1],
  tracker: [-5, 1],
  analog: [-4, 3],
  tomita: [-4, 2.5],
  // The closed vowel is the louder (measured 6-8 dB over the open at the same gain): the level the other way.
  vocalSynth: [-7, 5],
  // The bow's, the breath's, the singer's pressure: the closed, darker sound softer too.
  soloVoices: [-4.5, 2.5],
  stringConsort: [-3.5, 1.5],
  baroqueBand: [-3.5, 1.5],
  oboeTrio: [-3, 2],
  // BACH BRASS's brassiness and its own level (BRASS_LEVEL_DB) a little more on the soft side.
  bachBrass: [-1, 0.5],
};
/** D511: the player's landing's level (dB) on a preset at strength x (0 soft .. 1 strong). */
export function touchLevelDb(presetId: string, x: number): number {
  const t = TOUCH_LEVEL_DB[presetId];
  if (!t) return 0;
  const c = clamp01(x);
  return c < 0.5 ? t[0] * (1 - 2 * c) : t[1] * (2 * c - 1);
}

/** SYNTH, CONSOLE and the chips without a pulse: the filter's brightness (Play.bright, -1..1) at the edges: ±span/2. */
export const BRIGHT_SPAN: Readonly<Record<"synth" | "console" | "chip", number>> = { synth: 1.2, console: 1.4, chip: 1.2 };
/** MEGA FM: the FM index scaled over this many octaves edge to edge (×0.62 to ×1.62). */
export const FM_OCTAVES = 1.4;
/** BLEEPS AND BLOOPS: the mallet's hardness: the strike's brightness (FM index burst, filter opening) over this many octaves (×0.5 to ×2). */
export const STRIKE_OCTAVES = 2;

/** VOCAL SYNTH: toward the soft side the vowel closes toward these (log-interpolated formants: "a" toward "o", the front vowels toward "u", rounded); toward the strong side it opens (the jaw: F1 up to +12%, F2 +5%). */
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
 * soft side to 1 the strong (a strength: protos.ts barDynamic, by STRONG_SIDE); `pt` the voice's patch (null: the classic chip), `pulse` whether the
 * voice (classic chip) is a pulse.
 */
export interface Landing {
  level?: number;
  tone?: number;
  bright?: number;
  layer?: "soft" | "firm" | "hard";
  lp?: number;
  lute?: boolean;
  pw?: number;
  pwContinuous?: boolean;
  fmScale?: number;
  strike?: number;
  open?: number;
  /** D349: PIPE ORGAN's echo manual: the note on the second manual's soft flutes (chip.ts). */
  echo?: boolean;
  /** D385: the piano's level as struck (dB about the middle): its colour (chip.ts Play.vel). */
  vel?: number;
  /** D504: a wind's attack softened (0 to 1: Play.soft, a slower rise: the breath starting the note, no tongue). */
  soft?: number;
  /** D502: BACH BRASS's brassiness (0 mellow .. 1 blazing: chip.ts Play.brass). */
  brass?: number;
}

/**
 * D504, THE WINDS (ZELENKA TRIO): the landing the breath's attack: toward the soft side a soft, round start (the
 * softer recording, its rise up to WIND_SOFT_S slower, its top a little rounded down to WIND_ROUND_HZ at the edge);
 * toward the strong side a firm, reedy start (the louder recording, up to WIND_REEDY_DB brighter). Held and swayed:
 * a swell, a messa di voce of ±BREATH_DB with ±BREATH_TONE_DB of brightness, and on a patch with a vibrato (oboe
 * II's: Patch.vib) up to BREATH_VIB_CENTS more of it as it swells. No level from the landing: the line's own.
 */
export const WIND_ROUND_HZ = 5000;
export const WIND_REEDY_DB = 2.5;
export const BREATH_DB = 4;
export const BREATH_TONE_DB = 2;
export const BREATH_VIB_CENTS = 7;
/** D504: the swell's gain, its brightness (dB) and its added vibrato (cents) at sustain value s. */
export const breathGain = (s: number) => 10 ** ((BREATH_DB * clampS(s)) / 20);
export const breathTone = (s: number) => BREATH_TONE_DB * clampS(s);
export const breathVib = (base: number, s: number) => Math.max(0, base + BREATH_VIB_CENTS * Math.max(0, clampS(s)));

/** D385: the line around a landing on the piano: the reading's level here (`lineDb`) and an accent's weight in the strong zone (`accentDb`). */
export interface LineAt {
  lineDb?: number;
  accentDb?: number;
  /** D426: a slid note's (the piano's hairpin slide): the level continuous across the bar (pianoHairpinDb), not the zones. */
  hairpin?: boolean;
}
/**
 * D426, THE PIANO'S HAIRPIN SLIDE: a slid note's weight from where the thumb is across the strip as it
 * sounds, continuous: the soft side to the strong side mapped smoothly (linearly in dB) over the zones'
 * own span (PIANO_ZONE_DB: −3 to +3 dB), the middle as written. Never by verdict.
 */
export function pianoHairpinDb(x: number): number {
  const [lo, , hi] = PIANO_ZONE_DB;
  return lo + (hi - lo) * clamp01(x);
}
/** D385: the piano's dB for a landing: the line's level, the zone's weight (an accent's own in the strong zone). */
export function pianoDb(x: number, line: LineAt = {}): number {
  // D426: a slid note: continuous across, about the line (no zone, no accent's weight: a slide is no strike).
  if (line.hairpin) return (line.lineDb ?? 0) + pianoHairpinDb(x);
  const z = pianoZone(x);
  const w = z === 2 && line.accentDb !== undefined ? Math.max(PIANO_ZONE_DB[2], line.accentDb) : PIANO_ZONE_DB[z];
  return (line.lineDb ?? 0) + w;
}

export function landing(kind: TouchKind, x: number, midi: number, pt: Patch | null, pulse = true, line: LineAt = {}): Landing {
  const c = clamp01(x);
  switch (kind) {
    case "piano": {
      // D385: three zones about the line's level (pianoDb); the softer recording under PIANO_SOFT_BELOW_DB, which
      // is already about 2 dB under: the level makes up the rest, so the loudness runs evenly.
      const db = pianoDb(c, line);
      const soft = db < PIANO_SOFT_BELOW_DB;
      return { layer: soft ? "soft" : "firm", level: 10 ** ((db - (soft ? PIANO_SOFT_NET_DB : 0)) / 20), vel: db };
    }
    case "jazz": {
      // D503, JAZZ QUARTET: the piano's three zones about the line (pianoDb: Busoni's level, the zone's weight, an accent's
      // own), each instrument's recording by the zone: the vibraphone's soft, middle or hard mallet (pp, mf, ff), the bass's
      // lighter or stronger pluck (mf, ff), the grand's layers as the piano's; the level the zone's, the colour (vel) with it.
      if (pt?.sample === "piano") return landing("piano", c, midi, pt, pulse, line);
      const db = pianoDb(c, line);
      const z = line.hairpin ? (db < PIANO_ZONE_DB[0] / 2 ? 0 : db > PIANO_ZONE_DB[2] / 2 ? 2 : 1) : pianoZone(c);
      return { layer: z === 0 ? "soft" : z === 2 ? "hard" : "firm", level: 10 ** (db / 20), vel: db };
    }
    case "harpsichord": {
      // D511: the soft zone the lute stop (darker toward the edge), the strong zone a brighter pluck (brighter toward the edge).
      if (c < LUTE_BELOW) {
        const k = (LUTE_BELOW - c) / LUTE_BELOW;
        return { lute: true, lp: LUTE_HZ[0] * (LUTE_HZ[1] / LUTE_HZ[0]) ** k };
      }
      return c >= STRONG_ZONE_FROM ? { tone: HARPSI_BRIGHT_DB * Math.min(1, (c - STRONG_ZONE_FROM) / (1 - STRONG_ZONE_FROM) + 0.25) } : {};
    }
    case "organ": {
      // D511: the swell box's brightness everywhere (the level is TOUCH_LEVEL_DB's), the echo manual in the soft zone.
      const tone = c < 0.5 ? ORGAN_SWELL_TONE[0] * (1 - 2 * c) : ORGAN_SWELL_TONE[1] * (2 * c - 1);
      const sw = tone ? { tone } : {};
      return c < ECHO_BELOW ? { echo: true, level: ECHO_GAIN, lp: Math.max(ECHO_LP[0], Math.min(ECHO_LP[1], 4 * 440 * 2 ** ((midi - 69) / 12))), ...sw } : sw;
    }
    case "voice":
      return { open: c };
    case "singers":
      return c < 0.5 ? { lp: 16000 * (SING_CLOSED_HZ / 16000) ** ((0.5 - c) / 0.5) } : { tone: SING_OPEN_DB * ((c - 0.5) / 0.5) };
    case "chip": {
      // D511: the pulse's width the other way about: the soft side the round square (50%), the strong side the thin,
      // bright, cutting pulse (12.5%): measured both the brighter and, at equal RMS, the louder (pulseRms keeps the
      // RMS; the ear and LUFS hear its upper harmonics), so the strong side is that on every chip.
      if (!pt) return pulse ? { pw: pulseWidth(1 - c) } : {};
      if (pt.fm) return { fmScale: 2 ** (FM_OCTAVES * (c - 0.5)) };
      if (pt.pwm) return { pw: pulseWidth(1 - c, true), pwContinuous: true };
      if (pt.osc.some((o) => o.wave === "pulse12" || o.wave === "pulse25" || o.wave === "pulse50")) return { pw: pulseWidth(1 - c) };
      return { bright: BRIGHT_SPAN.chip * (c - 0.5) };
    }
    case "console":
      return { bright: BRIGHT_SPAN.console * (c - 0.5) };
    case "synth":
      return { bright: BRIGHT_SPAN.synth * (c - 0.5) };
    case "bleeps":
      return { strike: 2 ** (STRIKE_OCTAVES * (c - 0.5)) };
    case "winds": {
      if (c < 0.5) {
        const k = (0.5 - c) / 0.5;
        return { layer: "soft", soft: k, ...(k > 0.05 ? { lp: 16000 * (WIND_ROUND_HZ / 16000) ** k } : {}) };
      }
      return { layer: "firm", tone: WIND_REEDY_DB * ((c - 0.5) / 0.5) };
    }
    case "brass": {
      // D502: the brassiness (the layers' crossfade and the presence shelf: chip.ts) from where it landed and the
      // reading's level; the landing's own little level from where it landed alone (the reading's level is the line's).
      return { brass: brassOf(c, line.lineDb ?? 0), level: 10 ** (brassLevelDb(c) / 20) };
    }
  }
}

// ---- Holding sideways: the sustain ----

/** How a held note answers a sideways move: none (a struck string, an organ's steady wind), a swell (messa di voce), the vibrato's depth, a filter sweep (wah), the tremolo's speed. */
export type HoldMode = "none" | "messa" | "vibrato" | "wah" | "trem" | "breath" | "swell";

/** A sideways travel of this share of the bar's width is the full range (half the bar). */
export const HOLD_SPAN = 0.5;
/** SINGING VOICES: the messa di voce, ±dB. */
export const MESSA_DB = 3;
/** CHIPS, CONSOLES, the combo organ: the vibrato's depth added at the most (cents; toward the soft side takes the voice's own away). */
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

/** The sustain value of a thumb `dx` (strength now less strength at landing) away: -1 (toward the soft side) .. 1 (toward the strong side: a swell). */
export const holdValue = (dx: number) => Math.max(-1, Math.min(1, dx / HOLD_SPAN));

/** How a family's voice answers a held sideways move (`plucked`: a struck or plucked note: nothing to shape once struck). */
export function holdMode(kind: TouchKind, pt: Patch | null, plucked: boolean): HoldMode {
  switch (kind) {
    case "piano":
    case "harpsichord":
      return "none";
    // D511: the organ's swell pedal moved while a key is held (the messa's ±MESSA_DB on the pipes).
    case "organ":
      return "messa";
    case "voice":
      return "messa";
    // D512: a plucked consort note (PIZZICATO, SPICCATO) has nothing to swell once played.
    case "singers":
      return plucked ? "none" : "messa";
    case "winds":
      return plucked ? "none" : "breath";
    case "brass":
      return "swell";
    case "synth":
      return "wah";
    case "jazz":
      // D503: a held vibraphone note: its motor's speed (Patch.motor); the piano and the bass, struck: nothing.
      return pt?.motor ? "trem" : "none";
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
