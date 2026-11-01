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
 *            ·                      ·  chromatic lower note)    ·  passing note, crushed)  ·  (U N L N)
 *  organ     · plain legato         · plain legato              · coulé (passing note)     · mordent on arrival (N L N)
 *  bowed     · shift glide 25 ms    · shift glide 25 ms         · shift glide 45 ms        · audible shift 70 ms (down 85)
 *  voice     · portamento 35 ms     · portamento 35 ms          · portamento 55 ms         · portamento 80 ms
 *  flute     · slur (8 ms)          · slur (8 ms)               · appoggiatura from above  · appoggiatura from above
 *  chip      · pitch slide 20 ms    · pitch slide 20 ms         · arpeggio sweep           · arpeggio sweep
 *  slide8    · pitch slide 20 ms    · pitch slide 30 ms         · pitch slide 45 ms        · pitch slide 60 ms
 *  fm        · bend 30 ms           · bend 30 ms                · bend 45 ms               · bend 60 ms
 *  synth     · portamento 40 ms     · portamento 40 ms          · portamento 65 ms         · portamento 95 ms
 *
 * (N the written note, U the scale step above, L below; plucked: harpsichord, lute; organ: pipe and
 * sampled; bowed: string consort; voice: vocal synth, solo voices; flute: traverso; chip: classic chip,
 * SID 64, super 16-bit, nocturne 32-bit; slide8: Game Boy, tracker (their pitch-slide effect); fm: Mega FM;
 * synth: Switched-On, Tomita, bleeps and bloops.) A glide's time is its time constant (an exponential
 * approach, Sounding.glide): about two thirds of the way there in that time.
 */
import { passingNote, stepBelow } from "./drag.ts";

/**
 * D438, THE TWO SLIDE SOUNDS, PENDING THE OWNER'S EAR. "d486" (the default): each instrument's slide gesture
 * above (proto-game.ts slideColour). "instruments": the instruments session's slide sounds instead (D424's
 * portamento following the thumb, proto-game.ts slideTrack; D426's coulé fill on the harpsichord and organ,
 * couleTrack; the lute's left-hand slur and glissando, glenn.ts luteSlur); never both. The detection is
 * D486's in either (slide-rule.ts), and the piano's hairpin (D426, a level) plays in both. Set it with
 * `setSlideSound`, or from the page's address: `?slide=instruments`.
 */
export type SlideSoundMode = "d486" | "instruments";
export let SLIDE_SOUND: SlideSoundMode = slideSoundParam(typeof location !== "undefined" ? location.search : "");
export function setSlideSound(mode: SlideSoundMode): void {
  SLIDE_SOUND = mode;
}
/** D438: `f` run under `mode`, the mode then restored (the tests render both designs). */
export function withSlideSound<T>(mode: SlideSoundMode, f: () => T): T {
  const was = SLIDE_SOUND;
  SLIDE_SOUND = mode;
  try {
    return f();
  } finally {
    SLIDE_SOUND = was;
  }
}
/** D438: the mode from a page's address (`?slide=instruments`); else "d486". */
export function slideSoundParam(search: string): SlideSoundMode {
  try {
    return new URLSearchParams(search).get("slide") === "instruments" ? "instruments" : "d486";
  } catch {
    return "d486";
  }
}

export type SlideFamily = "plucked" | "piano" | "organ" | "bowed" | "voice" | "flute" | "chip" | "slide8" | "fm" | "synth";
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

export function slideFamily(presetId: string): SlideFamily {
  switch (presetId) {
    case "harpsichordSampled":
    case "lute":
      return "plucked";
    case "pianoSampled":
      return "piano";
    case "chamberOrgan":
    case "organSampled":
      return "organ";
    case "stringConsort":
    case "baroqueBand": // D438: the instruments session's BAROQUE BAND, a string band (glenn.ts touchFamily "strings")
      return "bowed";
    case "vocalSynth":
    case "soloVoices":
      return "voice";
    case "traverso":
      return "flute";
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

const GLIDE_MS: Record<"bowed" | "voice" | "slide8" | "fm" | "synth", Record<IntervalClass, number>> = {
  bowed: { half: 25, step: 25, third: 45, leap: 70 },
  voice: { half: 35, step: 35, third: 55, leap: 80 },
  slide8: { half: 20, step: 30, third: 45, leap: 60 },
  fm: { half: 30, step: 30, third: 45, leap: 60 },
  synth: { half: 40, step: 40, third: 65, leap: 95 },
};
/** In a quick passage a glide no longer than this share of the note (a portamento that never smears the next). */
const GLIDE_SHARE = 0.25;

/**
 * The gesture of a slide from `from` to `to` (MIDI) on `presetId`, the arriving note `noteMs` long, in a key
 * of `scale` (pitch classes). `upThird` is the Lab's MECH.upThird (the harpsichord's rising third).
 */
export function slideGesture(presetId: string, from: number, to: number, noteMs: number, scale: ReadonlySet<number>, upThird: "coule" | "schleifer" = "schleifer"): Gesture {
  const fam = slideFamily(presetId);
  const ic = intervalClass(from, to);
  const up = to > from;
  const quick = noteMs < GESTURE.minNoteMs;
  if (fam === "bowed" || fam === "voice" || fam === "slide8" || fam === "fm" || fam === "synth" || (fam === "chip" && (ic === "half" || ic === "step" || quick))) {
    const ms = fam === "chip" ? 20 : GLIDE_MS[fam][ic] * (fam === "bowed" && ic === "leap" && !up ? 85 / 70 : 1);
    const names = { bowed: "shift", voice: "portamento", slide8: "pitch slide", fm: "bend", synth: "portamento", chip: "pitch slide" } as const;
    return { kind: "glide", name: names[fam], tau: Math.max(0.008, Math.min(ms, GLIDE_SHARE * noteMs)) / 1000 };
  }
  if (fam === "flute") {
    if (ic === "half" || ic === "step" || quick) return { kind: "glide", name: "slur", tau: 0.008 };
    return fit("appoggiatura", [stepAbove(to, scale)], noteMs);
  }
  if (quick || to === from) return { kind: "plain", name: "legato" };
  const upper = stepAbove(to, scale);
  const lower = stepBelow(to, scale);
  const schleifer = () => fit("Schleifer", [stepBelow(lower, scale), lower], noteMs);
  switch (fam) {
    case "plucked":
      // The quick trill into the note: on a falling second the Pralltriller proper (Versuch I.2.3 §31); rising, the same.
      if (ic === "half" || ic === "step") return fit("Pralltriller", [to, up ? upper : from], noteMs);
      if (ic === "third") return up && upThird === "schleifer" ? schleifer() : fit("coulé", [passingNote(from, to, scale)], noteMs);
      return up ? schleifer() : { kind: "plain", name: "legato" };
    case "piano":
      if (ic === "half") return { kind: "plain", name: "legato" };
      if (ic === "step") return fit("acciaccatura", [to - 1], noteMs, 0.6);
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
