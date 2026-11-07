/**
 * D486, THE SLIDE'S OWN SOUND, BY INSTRUMENT. The owner: "In the harpsichord, the slide does some kind of
 * ornamental feature … the Schleifer … and a slide of a small leap (a step or half step) does a quick
 * trill to the note. This is the kind of customized use of the slide that I want. Similar things ought to
 * be thought out for the remaining instruments."
 *
 * A slide sounds its note the moment it arrives (judged there, proto-game.ts slideTo); its gesture is the
 * colour of that arrival, never the judged pitch or time: a glide on a sound that bends, or a few quick
 * notes into the written note that end within GESTURE.maxMs and a third of the note (the written note
 * then held). Only on a note long enough (GESTURE.minNoteMs): in a fast run each slide is a plain legato
 * (a re-struck key, a short portamento), as a player's fingers would make it. Never louder or softer
 * than the note itself (loudness is the place's, never the gesture's or the verdict's).
 *
 *  family    · half step            · step                      · third                    · fourth or more
 *  plucked   · Pralltriller (N U N) · Pralltriller (N U N)      · coulé; up: Schleifer     · up: Schleifer; down: plain
 *  piano     · plain legato         · acciaccatura (crushed     · acciaccatura (the        · quick turn into the note
 *            ·                      ·  semitone, approach side) ·  passing note, crushed)  ·  (U N L N)
 *  organ     · plain legato         · plain legato              · coulé (passing note)     · mordent on arrival (N L N)
 *  bowed     · shift glide 25 ms    · shift glide 25 ms         · shift glide 45 ms        · audible shift 70 ms (down 85)
 *  brass     · lip slur 18 ms       · lip slur 18 ms            · lip slur 30 ms           · up: rip 45 ms; down: lip slur 35 ms
 *  voice     · portamento 35 ms     · portamento 35 ms          · portamento 55 ms         · portamento 80 ms
 *  flute     · slur (8 ms)          · slur (8 ms)               · appoggiatura (approach   · appoggiatura (approach
 *            ·                      ·                           ·  side: below rising)     ·  side)
 *  chip      · pitch slide 20 ms    · pitch slide 20 ms         · arpeggio sweep           · arpeggio sweep
 *  slide8    · pitch slide 20 ms    · pitch slide 30 ms         · pitch slide 45 ms        · pitch slide 60 ms
 *  fm        · bend 30 ms           · bend 30 ms                · bend 45 ms               · bend 60 ms
 *  synth     · portamento 40 ms     · portamento 40 ms          · portamento 65 ms         · portamento 95 ms
 *
 * (N the written note, U the scale step above, L below; plucked: harpsichord (D510: the lute and the clavichord withdrawn); organ: pipe and
 * sampled; bowed: string consort; brass: BACH BRASS (D502: the lip slur, a rising leap the rip, a quick smear up into the note); voice: vocal synth, solo voices; flute: traverso; chip: classic chip,
 * SID 64, super 16-bit; slide8: Game Boy, tracker (their pitch-slide effect); fm: Mega FM;
 * synth: Switched-On, Tomita, bleeps and bloops.) A glide's time is its time constant (an exponential
 * approach, Sounding.glide): about two thirds of the way there in that time.
 *
 * D488, THE SLIDE-IN (a slide from a silent landing in a rest): the same table, from the pitch where the
 * thumb is when it has come halfway (proto-game.ts slideInFire): a glide enters there, never from the
 * landing; the grace notes take the side of the approach (from below or above), the first a fresh attack.
 */
import { passingNote, stepBelow } from "./drag.ts";
import type { Patch } from "../touch/sound.ts";

/**
 * D438, THE TWO SLIDE SOUNDS. "d486": each instrument's slide gesture above (proto-game.ts slideColour).
 * "instruments": the instruments session's slide sounds instead (D424's portamento following the thumb,
 * proto-game.ts slideTrack; D426's coulé fill on the harpsichord and organ, couleTrack; the lute's left-hand
 * slur and glissando, glenn.ts luteSlur); never both on one note. The detection is D486's in either
 * (slide-rule.ts), and the piano's hairpin (D426, a level) plays in both. D488's slide-in keeps its own
 * gesture (slideColour) in every mode.
 *
 * D501 (the owner: "Just implement it all"; the instruments session chose by family): "auto", the default,
 * picks the sound by the player's instrument (`slideSoundFor`): the bowed strings (STRING CONSORT, BAROQUE
 * BAND) and the voices (SOLO VOICES, VOCAL SYNTH) "instruments" (D424's portamento that follows the thumb:
 * a string player's or a singer's slide is the hand's own, as slow as the hand); the LUTE "instruments"
 * (D426's left-hand slur: no new pluck); the harpsichord, the clavichord, the organ, the piano (with its
 * hairpin, as in both), the chips, consoles and synths "d486" (the gesture at arrival: a keyboard's slide
 * is an ornament, a chip's an effect command). "d486" and "instruments" force that sound on every
 * instrument: `setSlideSound`, `withSlideSound` for the tests, `?slide=d486` or `?slide=instruments`.
 */
export type SlideSoundMode = "d486" | "instruments";
export type SlideSoundSetting = "auto" | SlideSoundMode;
export let SLIDE_SOUND: SlideSoundSetting = slideSoundParam(typeof location !== "undefined" ? location.search : "");
export function setSlideSound(mode: SlideSoundSetting): void {
  SLIDE_SOUND = mode;
}
/** D438: `f` run under `mode`, the mode then restored (the tests render both designs). */
export function withSlideSound<T>(mode: SlideSoundSetting, f: () => T): T {
  const was = SLIDE_SOUND;
  SLIDE_SOUND = mode;
  try {
    return f();
  } finally {
    SLIDE_SOUND = was;
  }
}
/** D438, D501: the setting from a page's address (`?slide=d486`, `?slide=instruments`); else "auto". */
export function slideSoundParam(search: string): SlideSoundSetting {
  try {
    const v = new URLSearchParams(search).get("slide");
    return v === "instruments" || v === "d486" ? v : "auto";
  } catch {
    return "auto";
  }
}
/** D501: the slide sound on the player's instrument `presetId` (the setting, or under "auto" the family's own). */
export function slideSoundFor(presetId: string): SlideSoundMode {
  if (SLIDE_SOUND !== "auto") return SLIDE_SOUND;
  const fam = slideFamily(presetId);
  return fam === "bowed" || fam === "voice" ? "instruments" : "d486";
}

export type SlideFamily = "plucked" | "piano" | "organ" | "bowed" | "brass" | "voice" | "flute" | "reed" | "chip" | "slide8" | "fm" | "synth" | "mallet" | "bass";
export type IntervalClass = "half" | "step" | "third" | "leap";

export const GESTURE = {
  /** No gesture on a note shorter than this (ms): a plain legato. */
  minNoteMs: 200,
  /** A gesture's notes end within this long (ms)… */
  maxMs: 130,
  /** …and within this share of the note. */
  maxShare: 0.33,
  /** Each of its notes this long (ms), at most (a harpsichordist's quick ornament)… */
  eachMs: 42,
  /** …and at least (quicker: no gesture). */
  minEachMs: 22,
} as const;

/**
 * D503: JAZZ QUARTET's slide is the player's instrument's own (`patch`, the voice's): on the vibraphone a quick grace
 * ("mallet": a crushed grace note from the side it comes from, a vibist's ornament), on the bass a slide ("bass": the
 * finger sliding up or down the string), on the piano the piano's.
 */
export function slideFamily(presetId: string, patch?: Patch | null): SlideFamily {
  if (presetId === "jazzQuartet") return patch?.motor ? "mallet" : patch?.sample === "jazzBass" ? "bass" : "piano";
  // D523: ABBEY ROAD's piano the piano's, the guitars and the bass a finger sliding along the string.
  if (presetId === "abbeyRoad") return patch?.sample === "piano" ? "piano" : "bass";
  switch (presetId) {
    case "harpsichordSampled":
      return "plucked";
    case "pianoSampled":
      return "piano";
    case "chamberOrgan":
    case "organSampled":
      return "organ";
    case "stringConsort":
    case "baroqueBand": // D438: the instruments session's BAROQUE BAND, a string band (glenn.ts touchFamily "strings")
      return "bowed";
    case "bachBrass": // D502
      return "brass";
    case "vocalSynth":
    case "soloVoices":
      return "voice";
    case "traverso":
      return "flute";
    case "oboeTrio": // D504: ZELENKA TRIO's reeds (glenn.ts touchFamily "strings": Patch.bow as a tongue)
      return "reed";
    case "gameboy":
    case "tracker":
      return "slide8";
    case "megaFm":
      return "fm";
    case "analog":
    case "tomita":
    case "modular":
      return "synth";
    default:
      return "chip";
  }
}

export function intervalClass(from: number, to: number): IntervalClass {
  const d = Math.abs(to - from);
  return d <= 1 ? "half" : d === 2 ? "step" : d <= 4 ? "third" : "leap";
}

/** The scale step above a note (the nearest in-key pitch 1 or 2 semitones over it). */
export function stepAbove(m: number, scale: ReadonlySet<number>): number {
  const pc = (x: number) => ((x % 12) + 12) % 12;
  if (scale.has(pc(m + 2)) && !scale.has(pc(m + 1))) return m + 2;
  if (scale.has(pc(m + 1)) && !scale.has(pc(m + 2))) return m + 1;
  return m + 2;
}

/** What a slide sounds: a glide (its time constant, s), or quick notes before the written note (MIDI, each `eachS`), or a plain legato. */
export type Gesture = { kind: "glide"; name: string; tau: number } | { kind: "notes"; name: string; notes: number[]; eachS: number } | { kind: "plain"; name: string };

const GLIDE_MS: Record<"bowed" | "brass" | "voice" | "slide8" | "fm" | "synth" | "bass", Record<IntervalClass, number>> = {
  // D503: the bassist's slide along the string (a little slower than a violinist's shift: a longer string).
  bass: { half: 30, step: 35, third: 55, leap: 80 },
  bowed: { half: 25, step: 25, third: 45, leap: 70 },
  // D502: a brass player's lip slur (quicker than a string's shift: the lips find the next partial), a rising leap's rip.
  brass: { half: 18, step: 18, third: 30, leap: 45 },
  voice: { half: 35, step: 35, third: 55, leap: 80 },
  slide8: { half: 20, step: 30, third: 45, leap: 60 },
  fm: { half: 30, step: 30, third: 45, leap: 60 },
  synth: { half: 40, step: 40, third: 65, leap: 95 },
};
/** D504: a reed's short portamento into a semitone and a tone (ms, its time constant). */
export const REED_GLIDE_MS = { half: 22, step: 28 } as const;
/**
 * D510: the bassist's slide only along a semitone or a tone (the finger sliding up the string); a third or a leap a new
 * pluck (the next note struck afresh), never a glide (nor "plain": proto-game.ts then glides as before): across I/8's octaves the pizzicato's ringing recording was
 * retuned an octave, a whoop and a read far from any recording.
 */
export const BASS_SLIDE_MAX = 2;
/** In a quick passage a glide no longer than this share of the note (a portamento that never smears the next). */
const GLIDE_SHARE = 0.25;

/**
 * The gesture of a slide from `from` to `to` (MIDI) on `presetId`, the arriving note `noteMs` long, in a key
 * of `scale` (pitch classes). `upThird` is the Lab's MECH.upThird (the harpsichord's rising third).
 */
export function slideGesture(presetId: string, from: number, to: number, noteMs: number, scale: ReadonlySet<number>, upThird: "coule" | "schleifer" = "schleifer", patch?: Patch | null): Gesture {
  const fam = slideFamily(presetId, patch);
  const ic = intervalClass(from, to);
  const up = to > from;
  const quick = noteMs < GESTURE.minNoteMs;
  // (A gesture of no grace notes: proto-game.ts slideColour plucks the written note afresh, the note slid from let go 20 ms on.)
  if (fam === "bass" && Math.abs(to - from) > BASS_SLIDE_MAX) return { kind: "notes", name: "pluck", notes: [], eachS: 0 };
  if (fam === "bowed" || fam === "brass" || fam === "voice" || fam === "slide8" || fam === "fm" || fam === "synth" || fam === "bass" || (fam === "chip" && (ic === "half" || ic === "step" || quick))) {
    const ms = fam === "chip" ? 20 : GLIDE_MS[fam][ic] * (fam === "bowed" && ic === "leap" && !up ? 85 / 70 : fam === "brass" && ic === "leap" && !up ? 35 / 45 : 1);
    const names = { bowed: "shift", brass: ic === "leap" && up ? "rip" : "lip slur", voice: "portamento", slide8: "pitch slide", fm: "bend", synth: "portamento", chip: "pitch slide", bass: "slide" } as const;
    return { kind: "glide", name: names[fam], tau: Math.max(0.008, Math.min(ms, GLIDE_SHARE * noteMs)) / 1000 };
  }
  if (fam === "reed") {
    // D504: a reed's slide: into a step a short portamento (the fingers sliding off the hole, the lip easing the
    // pitch: REED_GLIDE_MS); into a third or a leap a quick grace from the side it comes from (an appoggiatura, as
    // the flute's); in a quick passage the plain slur.
    if (quick) return { kind: "glide", name: "slur", tau: 0.008 };
    if (ic === "half" || ic === "step") return { kind: "glide", name: "portamento", tau: Math.min(REED_GLIDE_MS[ic], GLIDE_SHARE * noteMs) / 1000 };
    return fit("grace", [up ? stepBelow(to, scale) : stepAbove(to, scale)], noteMs);
  }
  if (fam === "flute") {
    if (ic === "half" || ic === "step" || quick) return { kind: "glide", name: "slur", tau: 0.008 };
    // D488: the appoggiatura from the side it comes from (rising: the step below; falling: above).
    return fit("appoggiatura", [up ? stepBelow(to, scale) : stepAbove(to, scale)], noteMs);
  }
  if (quick || to === from) return { kind: "plain", name: "legato" };
  const upper = stepAbove(to, scale);
  const lower = stepBelow(to, scale);
  const schleifer = () => fit("Schleifer", [stepBelow(lower, scale), lower], noteMs);
  switch (fam) {
    case "mallet":
      // D503: the vibist's quick grace: a crushed note a semitone from the side it comes from (a half step: plain).
      if (ic === "half") return { kind: "plain", name: "legato" };
      return fit("grace", [up ? to - 1 : to + 1], noteMs, 0.6);
    case "plucked":
      // The quick trill into the note: on a falling second the Pralltriller proper (Versuch I.2.3 §31); rising, the same.
      if (ic === "half" || ic === "step") return fit("Pralltriller", [to, up ? upper : from], noteMs);
      if (ic === "third") return up && upThird === "schleifer" ? schleifer() : fit("coulé", [passingNote(from, to, scale)], noteMs);
      return up ? schleifer() : { kind: "plain", name: "legato" };
    case "piano":
      if (ic === "half") return { kind: "plain", name: "legato" };
      // D488: crushed from the side it comes from (rising: the semitone below; falling: above).
      if (ic === "step") return fit("acciaccatura", [up ? to - 1 : to + 1], noteMs, 0.6);
      if (ic === "third") return fit("acciaccatura", [passingNote(from, to, scale)], noteMs, 0.6);
      return fit("turn", [upper, to, lower], noteMs);
    case "organ":
      if (ic === "half" || ic === "step") return { kind: "plain", name: "legato" };
      if (ic === "third") return fit("coulé", [passingNote(from, to, scale)], noteMs);
      return fit("mordent", [to, lower], noteMs);
    default:
      // chip: the arpeggio sweep through the scale between (a third: its passing note; a leap: every other step).
      return fit("arpeggio", sweep(from, to, scale), noteMs, 0.7);
  }
}

/** The scale's notes strictly between two, every other one for a leap (at most four). */
function sweep(from: number, to: number, scale: ReadonlySet<number>): number[] {
  const dir = Math.sign(to - from);
  const out: number[] = [];
  for (let m = from + dir; m !== to; m += dir) if (scale.has(((m % 12) + 12) % 12)) out.push(m);
  const pick = out.length > 2 ? out.filter((_, k) => k % 2 === out.length % 2) : out;
  return pick.slice(-4);
}

/** Quick notes into the written note, each at most GESTURE.eachMs × `speed`, all within the note's share; too quick to sound: plain. */
function fit(name: string, notes: number[], noteMs: number, speed = 1): Gesture {
  const each = Math.min(GESTURE.eachMs * speed, GESTURE.maxMs / notes.length, (GESTURE.maxShare * noteMs) / notes.length);
  if (each < GESTURE.minEachMs * Math.min(1, speed)) return { kind: "plain", name: "legato" };
  return { kind: "notes", name, notes, eachS: each / 1000 };
}
