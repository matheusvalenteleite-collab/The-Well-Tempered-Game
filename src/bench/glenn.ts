/**
 * D376, THE EXPRESSION LAB: Glenn's "More Expression from Two Thumbs" (28 October 2026, WTC 1.81),
 * built behind one switch, MECH.glenn. D378 (WTC 1.83): the game's own, everywhere (play.html, the
 * tutorial, the Lab); the old mechanics only in the Lab, MECHANICS: CLASSIC (lab.html?glenn=0, preset A,
 * or the switch off); a take keeps the mechanics it was recorded with (asRecorded: none named, off). The
 * engine (proto-game.ts, free-ornament.ts, accent.ts, chip.ts) reads the rules from here:
 *
 *   OVER-LEGATO: on harpsichord, lute and piano the note given way to rings until its thumb lifts, at
 *     least 30 ms (the old join), at most 400 ms (the piano 250 ms), never past the next note but one.
 *   A SLIDE ON A KEYBOARD BEGINS A SLUR: no pitch bend on the sampled harpsichord, lute or piano (nor the
 *     organ); the next note struck as the slide arrives. The slur runs from the note slid from through
 *     the joins that follow and ends at a detach, at the next strong beat (which it includes: the bar's
 *     first beat, and its middle in 4/4, 4/2 and 12/8), or after eight notes. Inside it the harpsichord
 *     lets each note ring 110 ms into the next (the lute 150), the piano tapers −1.5, −2.5, −3.5, at most
 *     −4 dB (only lower: the subject never louder; by place, never by verdict).
 *   SLIDE AGAINST SHAKE: a shake's legs alternate (a same-way move after a pause continues its leg: the
 *     pause read as a trill fixed; D378: no cap on a leg's length); a slide travels at least max(10 px,
 *     0.6 × the drawn distance) and arrives within 0.15 row (or stops within half a row for 40 ms); one
 *     begun late in its note (after 35% of the time to the next, or within 250 ms of it) sounds as it
 *     arrives, no confirmation (D378: unless a shake's leg was counted on the note; and the shake is read
 *     all the same); else it is confirmed after 40 ms and judged then (where it sounds); one arriving
 *     early waits for its note (D378: not when a shake was read; confirmed if one is under way).
 *   JUDGED BY EAR: joined is a gap of 25 ms or less (the 90 ms window kept for a touch iOS took back); a
 *     real gap re-attacks on sustaining sounds; an accent is the silence before it and the lean, no hold
 *     rule; a slide that makes a slur counts as joined.
 *   STRINGS, WINDS, VOICES: two thumbs give a new bow (the string's own re-bow), a soft new tongue or
 *     syllable; a slide glides, its time constant a quarter of the slide's (10–90 ms); chips and synths
 *     keep the slide's portamento, timed the same way.
 *   D424: on strings, voices and synths a SET-AND-RELEASE is the slur and a slide's portamento follows the
 *     thumb (touchFamily, joinedSound, slidePitch below); a two-thumb join on a synth retriggers.
 */
import { MECH } from "./mechanics.ts";
import type { TouchFugue } from "../touch/fugue.ts";

export const GLENN = {
  /** The old join: the note given way to stops this long after the new strike (s). */
  minRingS: 0.03,
  /** Over-legato's cap (s): plucked (harpsichord, lute) and piano. */
  overHoldS: { plucked: 0.4, piano: 0.25 },
  /** Inside a slide's slur, the note given way to rings at least this long (s). */
  slurRingS: { harpsichordSampled: 0.11, lute: 0.15, pianoSampled: 0.035, other: 0.015 } as Record<string, number>,
  /** The piano's taper inside a slide's slur (dB by place: 0 the note slid from). */
  slurTaperDb: [0, -1.5, -2.5, -3.5, -4] as readonly number[],
  /** A slur ends after this many notes. */
  slurMaxNotes: 8,
  /** Joined: a gap no longer than this (ms). */
  joinGapMs: 25,
  /** A slide arrives within this many rows of its note's drawn height... */
  slideReachRows: 0.15,
  /** ...or stops within this many rows... */
  slideStopRows: 0.5,
  /** ...making no progress for this long (ms). */
  slideStopMs: 40,
  /** A slide travels at least this share of the drawn distance to its note. */
  slideMinShare: 0.6,
  /** In the slide phase: begun after this share of the time to the next note... */
  slidePhaseShare: 0.35,
  /** ...or within this long of it (ms). */
  slidePhaseMs: 250,
  /** Outside the slide phase, a slide is confirmed after this long (ms). */
  slideConfirmMs: 40,
  /** A glide's time constant: a quarter of the slide's time, kept within these (ms). */
  glideTauMinMs: 10,
  glideTauMaxMs: 90,
  /** On a voice or a wind, two thumbs: a soft new attack (Play.soft at least this). */
  rearticSoft: 0.35,
} as const;

/** Whether Glenn's mechanics are on (MECH.glenn). */
export const glennOn = (): boolean => MECH.glenn;

/** How each sound answers the gestures (by preset id). */
export type ExprFamily = "plucked" | "piano" | "organ" | "bowed" | "sung" | "synth";
export function exprFamily(presetId: string): ExprFamily {
  if (presetId === "harpsichordSampled" || presetId === "lute") return "plucked";
  if (presetId === "pianoSampled") return "piano";
  if (presetId === "chamberOrgan" || presetId === "organSampled") return "organ";
  if (presetId === "stringConsort" || presetId === "trialBaroque" || presetId === "trialWinds" || presetId === "trialBrass") return "bowed";
  // TRIALS: the struck and plucked bands as the plucked keyboards (one player's over-legato); the organ trio the organ.
  if (presetId === "trialJazz" || presetId === "trialClavichord") return "plucked";
  if (presetId === "trialOrganTrio") return "organ";
  if (presetId === "vocalSynth" || presetId === "soloVoices" || presetId === "traverso") return "sung";
  return "synth";
}
/** A keyboard: a slide strikes the next note (no bend) and begins a slur. */
export const isKeyboard = (presetId: string): boolean => ["plucked", "piano", "organ"].includes(exprFamily(presetId));

/** Over-legato's cap for a sound (s; 0: none, the old join). */
export function overHoldS(presetId: string): number {
  const f = exprFamily(presetId);
  return f === "plucked" ? GLENN.overHoldS.plucked : f === "piano" ? GLENN.overHoldS.piano : 0;
}
/** Inside a slide's slur: how long the note given way to rings at least (s). */
export const slurRingS = (presetId: string): number => GLENN.slurRingS[presetId] ?? GLENN.slurRingS.other;
/** The piano's level inside a slide's slur at place `pos` (0 the note slid from), dB: only lower. */
export const slurTaperDb = (pos: number): number => (pos <= 0 ? 0 : GLENN.slurTaperDb[Math.min(GLENN.slurTaperDb.length - 1, pos)]);

/** A slide's glide time constant (s) from the slide's own time (ms): a quarter of it, 10–90 ms. */
export function slideGlideTau(slideMs: number): number {
  const ms = Math.max(GLENN.glideTauMinMs, Math.min(GLENN.glideTauMaxMs, (Number.isFinite(slideMs) ? slideMs : 0) / 4));
  return ms / 1000;
}

/** Joined, as heard: a gap of 25 ms or less; a touch iOS took back keeps the old window (`iosMs`). */
export const joinedByEar = (gapMs: number, cancelled: boolean, iosMs: number): boolean => gapMs <= (cancelled ? Math.max(iosMs, GLENN.joinGapMs) : GLENN.joinGapMs);

/**
 * The slide phase: a move begun after 35% of the time from its note's onset to the next note's, or
 * within 250 ms of the next (ms times on one clock). Ornaments begin near the note's start; slides
 * travel toward the next note near its time.
 */
export function slidePhase(startMs: number, noteOnMs: number, nextOnMs: number): boolean {
  return startMs >= noteOnMs + GLENN.slidePhaseShare * (nextOnMs - noteOnMs) || nextOnMs - startMs <= GLENN.slidePhaseMs;
}

/** The strong beats' meters with a second strong beat mid-bar. */
const HALF_STRONG = new Set(["4/4", "C", "4/2", "12/8"]);
/** The first strong beat strictly after `tick`: a bar's start, or its middle in 4/4, 4/2 and 12/8. */
export function nextStrongBeat(f: Pick<TouchFugue, "bars" | "barTicks" | "meter" | "length">, tick: number): number {
  const half = HALF_STRONG.has(f.meter);
  for (let j = 0; j < f.bars.length; j++) {
    const on = f.bars[j].on;
    const end = f.bars[j + 1]?.on ?? on + f.barTicks;
    if (on > tick) return on;
    // A full bar's middle (a pickup bar has none).
    if (half && end - on >= f.barTicks) {
      const mid = on + f.barTicks / 2;
      if (mid > tick && mid < end) return mid;
    }
  }
  return Math.max(tick + 1, f.length);
}

/**
 * A slide's slur on one voice. `slide(fromOn, toOn)` opens one at the note slid from (place 0; the
 * note slid to place 1); `next(on, joined)` places each note after it: its place (≥ 2), or 0 where the
 * slur has ended (a detach, past the strong beat, eight notes). The note on the strong beat is its last.
 */
export class SlideSlur {
  private s: { until: number; pos: number } | null = null;
  private readonly strongAfter: (tick: number) => number;
  constructor(strongAfter: (tick: number) => number) {
    this.strongAfter = strongAfter;
  }
  get open(): boolean {
    return this.s !== null;
  }
  slide(fromOn: number, toOn: number): number {
    const until = this.strongAfter(fromOn);
    this.s = toOn >= until ? null : { until, pos: 1 };
    return 1;
  }
  next(on: number, joined: boolean): number {
    const s = this.s;
    if (!s) return 0;
    if (!joined || on > s.until || s.pos + 1 >= GLENN.slurMaxNotes) {
      this.s = null;
      return 0;
    }
    s.pos++;
    if (on >= s.until || s.pos + 1 >= GLENN.slurMaxNotes) this.s = null;
    return s.pos;
  }
  end() {
    this.s = null;
  }
}

/**
 * Over-legato's ringing notes: the sounds of a note given way to, kept until their thumb lifts (at
 * least `min`, at most `max`, on the audio clock), and never past the next strike but one on their voice.
 */
export interface Ringing {
  k: number;
  holder: object;
  stops: { stop(at?: number): void }[];
  min: number;
  max: number;
}
export class RingList {
  items: Ringing[] = [];
  add(r: Ringing) {
    this.items.push(r);
  }
  /** A new strike on voice k: the notes given way to before the last ring no further. */
  strike(k: number, now: number) {
    this.items = this.items.filter((r) => {
      if (r.k !== k) return true;
      for (const s of r.stops) s.stop(Math.max(now, r.min));
      return false;
    });
  }
  /** Its thumb lifted: stopped now (or at its least). */
  lifted(holder: object, now: number) {
    this.items = this.items.filter((r) => {
      if (r.holder !== holder) return true;
      for (const s of r.stops) s.stop(Math.max(now, r.min));
      return false;
    });
  }
  /** Each frame: those past their cap stop there. */
  frame(now: number) {
    this.items = this.items.filter((r) => {
      if (now < r.max) return true;
      for (const s of r.stops) s.stop(r.max);
      return false;
    });
  }
  clear() {
    for (const r of this.items) for (const s of r.stops) s.stop();
    this.items = [];
  }
}

/** The flag from a page's address: `?glenn=1` (or `glenn=on`, `glenn=true`). */
export function glennParam(search: string): boolean {
  return labPlayParam(search) === "glenn";
}
/**
 * D378: the Lab's play page from its address: `?glenn=1` the game's mechanics (Glenn's), `?glenn=0` (or
 * off, false) MECHANICS: CLASSIC, the mechanics before WTC 1.83; null: the Lab itself.
 */
export function labPlayParam(search: string): "glenn" | "classic" | null {
  try {
    const v = new URLSearchParams(search).get("glenn");
    return v === "1" || v === "on" || v === "true" ? "glenn" : v === "0" || v === "off" || v === "false" ? "classic" : null;
  } catch {
    return null;
  }
}

/**
 * D424, THE OWNER'S TOUCHES, EACH ITS OWN SOUND (on sustaining sounds; under MECH.glenn). The owner named
 * them: TAP (one thumb, note after note: always a gap); HANDOFF, JOIN, OVERLAP (the thumbs take turns: a
 * small gap, no audible gap (≤ 25 ms), the next landing before the first lifts); SET-AND-RELEASE (the
 * game's PREPARED + PULL-OFF, D334: the next thumb rests silently on the next note, which sounds as the
 * other lifts; and HOLD-OVER, D364, its appoggiatura); SLIDE (one thumb moves to the next note without
 * lifting). The rule: a slide does only what continuous contact can do; two thumbs cover joining; on a
 * sustaining sound SET-AND-RELEASE is the slur (deliberate, so it carries its own sound and an accidental
 * overlap is never punished by it).
 *
 *   STRINGS (STRING CONSORT): a TAP a separate bow with space; a JOIN a new bow, joined (Patch.bow);
 *     SET-AND-RELEASE a SLUR: the same bow, no bite (Play.slur: the recording's slur path), the left hand
 *     changes the note; a SLIDE a portamento inside the slur, the pitch following the thumb.
 *   VOICES (SOLO VOICES, VOCAL SYNTH): a TAP a separate syllable; a JOIN a soft new syllable (D376);
 *     SET-AND-RELEASE a slur on one vowel (no consonant, no new onset); a SLIDE a portamento in the vowel.
 *   SYNTHS (the chips, consoles and synthesizer records): a JOIN retriggered (a new attack); SET-AND-
 *     RELEASE the mono-synth legato (Play.legato: no retrigger, the pitch changed under the held
 *     envelope); a SLIDE the tracker's pitch slide (3xx), the pitch following the thumb.
 *
 * Keyboards (harpsichord, piano, organ), the lute and TRAVERSO: unchanged (null here).
 */
export type TouchFamily = "strings" | "voices" | "synths";
const TOUCH_FAMILIES: Readonly<Record<string, TouchFamily>> = {
  stringConsort: "strings",
  // TRIALS: the winds and brass as the strings (Patch.bow as a tongue, sound.ts WIND_TONGUE): a JOIN a soft new tongue, SET-AND-RELEASE the legato (slur).
  trialBaroque: "strings",
  trialWinds: "strings",
  trialBrass: "strings",
  soloVoices: "voices",
  vocalSynth: "voices",
  chip: "synths",
  gameboy: "synths",
  super16: "synths",
  nocturne32: "synths",
  megaFm: "synths",
  sid64: "synths",
  tracker: "synths",
  analog: "synths",
  modular: "synths",
  tomita: "synths",
};
/** D424: a preset's family for the touches' sounds (null: a keyboard, the lute, any other: unchanged). */
export const touchFamily = (presetId: string): TouchFamily | null => TOUCH_FAMILIES[presetId] ?? null;

/** How a joined note was joined, for its sound (D424): two thumbs taking turns, a set thumb released, or a slide. */
export type JoinTouch = "join" | "set-release" | "slide";
/**
 * D424: whether a note sounds legato (no new attack, bow, consonant or retrigger) and whether it is a
 * slur (Play.slur: a bowed string's same bow), by family and touch. `joined` false: a separate note (a
 * TAP). A null family: the old rule (joined is legato: D302; D358's new bow on a string).
 */
export function joinedSound(fam: TouchFamily | null, joined: boolean, how: JoinTouch): { legato: boolean; slur: boolean } {
  if (!joined) return { legato: false, slur: false };
  if (!fam) return { legato: true, slur: false };
  if (how === "set-release" || how === "slide") return { legato: true, slur: true };
  // A JOIN, HANDOFF or OVERLAP: strings a new bow (legato, Patch.bow), voices a soft new syllable (proto-game.ts), synths retriggered.
  return { legato: fam !== "synths", slur: false };
}

/** D424: the portamento's smoothing while it follows the thumb (s, a time constant). */
export const SLIDE_TRACK_TAU = 0.02;
/**
 * D424: a slide's pitch from the thumb's height (fretless): from the departure row `y0` (the note held,
 * `from`) toward the arrival row `yTo` (the next note, `to`), linear in semitones; nothing within `deadPx`
 * of the departure (a resting thumb's wander) or the other way; the whole step once within `reachPx` of
 * the arrival (the slide's own arrival, D376), never past it.
 */
export function slidePitch(from: number, to: number, y0: number, yTo: number, y: number, deadPx: number, reachPx: number): number {
  const dist = Math.abs(yTo - y0);
  if (!(dist > 0) || from === to) return from;
  const travel = (y - y0) * Math.sign(yTo - y0);
  if (travel <= deadPx) return from;
  const span = Math.max(1, dist - reachPx - deadPx);
  return from + (to - from) * Math.min(1, (travel - deadPx) / span);
}

/**
 * D426, THE KEYBOARDS' AND THE LUTE'S SLIDES (the rest of D424's touches; under MECH.glenn). The owner's
 * rule: "the slide will not do the same thing as something one can do with two thumbs alternating or
 * intersecting": two thumbs cover every grade of joining, so a slide does only what continuous contact can.
 *
 *   PIANO, THE HAIRPIN: each slid note's loudness from where the thumb is across the strip as it sounds,
 *     continuous (touch-expr.ts pianoHairpinDb: soft side to strong side over the zones' ±3 dB, about the
 *     line's level): drifting across while sliding a crescendo or diminuendo over the group. It replaces
 *     D376's taper inside a slide's slur; the slide's first note, a landing, keeps its zone.
 *   HARPSICHORD, ORGAN, THE COULÉ: a slide over a third or more fills in the scale steps between
 *     (couleFill), played quickly just before the arrival so the arrival stays on time (couleTiming); a
 *     slide over a step stays the plain join (D376: struck on arrival).
 *   LUTE, THE LEFT-HAND SLUR: the next note without a new pluck: the sounding course retuned (a quick
 *     hammer, about 10 ms), about 3 dB under; over a fourth or more a glissando along the string, the pitch
 *     following the thumb (slidePitch, as D424's portamento), and no pluck (luteSlur).
 */
export type KeyboardSlide = "hairpin" | "coule" | "slur";
/** D426: what a slide does on a sound (null: D424's families, TRAVERSO, any other: as before). */
export function keyboardSlide(presetId: string): KeyboardSlide | null {
  if (presetId === "pianoSampled") return "hairpin";
  if (presetId === "harpsichordSampled" || presetId === "chamberOrgan" || presetId === "organSampled" || presetId === "trialOrganTrio" || presetId === "trialClavichord") return "coule";
  if (presetId === "lute") return "slur";
  return null;
}

const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];
/** A staff step's natural pitch (protos.ts stepPitch's numbering). */
const naturalOf = (s: number): number => NATURAL_PC[((s % 7) + 7) % 7] + 12 * (Math.floor(s / 7) + 1);
/**
 * D426, THE COULÉ's notes: the scale steps strictly between two notes a third or more apart (by staff
 * step), in the order the slide travels; each its letter's pitch as `alter` gives it (the accidentals in
 * force at the arrival, else the key signature: semitones, by letter 0 C … 6 B). A step, a repeat: none.
 * A pitch that would not lie strictly between the two (a strange spelling) is left out.
 */
export function couleFill(from: { step: number; midi: number }, to: { step: number; midi: number }, alter: (letter: number) => number): number[] {
  const d = to.step - from.step;
  if (Math.abs(d) < 2) return [];
  const dir = Math.sign(d);
  // The step numbering's octave offset (the two notes' own alteration is within ±2 semitones).
  const off = 12 * Math.round((from.midi - naturalOf(from.step)) / 12);
  const lo = Math.min(from.midi, to.midi);
  const hi = Math.max(from.midi, to.midi);
  const out: number[] = [];
  for (let s = from.step + dir; s !== to.step; s += dir) {
    const m = naturalOf(s) + off + alter(((s % 7) + 7) % 7);
    if (m > lo && m < hi && !out.includes(m)) out.push(m);
  }
  return out;
}

/** D426: a coulé's note no shorter than this (s): under it, there is no time and no fill. */
export const COULE_MIN_S = 0.025;
/**
 * D426, THE COULÉ's timing (s on one clock): `n` notes ending at the arrival note's time (`arriveOn`: the
 * arrival stays on time), each the time of the thumb's travel shared out, but no longer than the piece's
 * ornament unit (`unit`: Quantz's, as ornament-play.ts uses), none before `now` (the slide seen) nor before
 * the departure note's half (from its onset `departOn` to the arrival). Their starts, or null: no time
 * (each under COULE_MIN_S), no fill.
 */
export function couleTiming(n: number, o: { now: number; departOn: number; arriveOn: number; unit: number }): number[] | null {
  if (n <= 0) return null;
  const start = Math.max(o.now, o.departOn + (o.arriveOn - o.departOn) / 2, o.arriveOn - n * o.unit);
  const each = (o.arriveOn - start) / n;
  if (!(each >= COULE_MIN_S)) return null;
  return Array.from({ length: n }, (_, k) => start + k * each);
}

/** D426: the lute's left-hand slur: about 3 dB under a pluck, a hammer of about 10 ms, a glissando from a fourth (5 semitones) up. */
export const LUTE_SLUR = { db: -3, hammerS: 0.01, glissFrom: 5 } as const;
/**
 * D426: the lute's slide from `from` to `to` (MIDI): never a new pluck; its level (a factor on the
 * sounding course, Sounding.dyn) and the pitch's time constant (a third of the hammer: 95% there in
 * 10 ms); over a fourth or more a glissando (the pitch has followed the thumb: slidePitch).
 */
export function luteSlur(from: number, to: number): { pluck: false; gliss: boolean; level: number; tau: number } {
  return { pluck: false, gliss: Math.abs(to - from) >= LUTE_SLUR.glissFrom, level: 10 ** (LUTE_SLUR.db / 20), tau: LUTE_SLUR.hammerS / 3 };
}
