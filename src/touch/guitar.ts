/**
 * D1061-D1065, THE GUITARIST'S HANDS AND THE AMP (Batch 2 of the instrument gestures; MECH.guitar and MECH.tilt, D1066 play.html's
 * default). The pure numbers and state; chip.ts makes them sound (Play.guitar, Play.pick, Sounding.guitar), src/bench/guitaring.ts
 * feeds them from the thumbs and the tilt. On every fretted, plucked guitar sound (touch-expr.ts GUITAR_SAMPLES: PSYCH's clean and
 * fuzz guitars first, ABBEY ROAD's, CHORINHO's, SALSA's, BOSSA NOVA's, the jazz guitar):
 *
 * - WHERE THE THUMB LANDS ACROSS ITS BAR is where the pick strikes the string (D1061): the strong (inner) edge near the bridge, bright
 *   and twangy; the soft (outer) edge near the neck, round and warm. Timbre (pickTone), the level only a little (pickLevelDb, D508).
 * - A LANDING WITH A FAST SIDEWAYS FLICK is a hard pick (D1061): a snappier attack, read in the note's first 40 ms (PickTracker, the
 *   bow's speed reading, bow.ts), never delaying the note.
 * - THE THUMB HELD AND PUSHED SIDEWAYS bends the string (D1062): the pitch rises with the push, at most a quarter tone (BEND.cents),
 *   back as the thumb comes back; pushing to and fro is the guitarist's vibrato (replacing D1014's finger vibrato). Continuous: no
 *   classifier; never another note.
 * - A JOIN (the other thumb takes the next note, the game's legato): going up a HAMMER-ON, going down a PULL-OFF, and a
 *   SET-AND-RELEASE (D334, D424) a pull-off (D1063): no new pick; the left hand's softer attack, the string's ring going on (lhOf).
 *   A tap after a gap is a fresh pick, as before.
 * - A SLIDE glides to the written pitch, smooth and quick, settling early in the note as D1018 (guitarSlide; D1064). No fret steps.
 *
 * PSYCH's guitars (clean and fuzz) and the tilt (src/touch/tilt.ts; D1065): LEAN, the phone tipped toward the amp, a held note
 * blooming into feedback (the same pitch sustaining, harmonic-rich, reaching its octave partial: bloomOf); STEER left a rotary
 * "vibe", right a fuzz (on the fuzz guitar a treble boost), a stompbox from the next note on (STOMP).
 *
 * Never judged or scored; never a note added or a written pitch changed beyond the bend's cap. Palm mute, harmonics and tremolo
 * picking left out (the owner's spec).
 */
import { SpeedEstimator, BOW_READ } from "./bow.ts";
import { GUITAR_SAMPLES, STRONG_ZONE_FROM, type Landing } from "./touch-expr.ts";

/** D1061: a guitar the techniques play (a patch's recording among GUITAR_SAMPLES). */
export const isGuitarSample = (sample: string | undefined): boolean => !!sample && GUITAR_SAMPLES.has(sample);
/** D1065: PSYCH's two guitars, the clean (rockGuitar) and the fuzz (rockGuitar2): the ones the tilt reaches. */
export const PSYCH_PRESET = "krautrock";
export const PSYCH_GUITARS: ReadonlySet<string> = new Set(["rockGuitar", "rockGuitar2"]);
export const FUZZ_GUITAR = "rockGuitar2";

// ---- D1061: the pick's place ----

/**
 * D1061: the pick's place. At the strong (bridge) edge a high shelf of +SHELF dB (2.4 kHz) and a twang (a peak of TWANG dB at
 * 1.8 kHz); at the soft (neck) edge the shelf -SHELF dB and a warmth (WARM dB at 300 Hz); the middle exactly as before (no filter
 * change). The level: LEVEL dB either way at the edges (D508: subtle), less what the filters themselves add (TRIM, measured through
 * the phone model: tools/touch/gesture/calib-guitar.cjs; DECISIONS D1061).
 */
export const PICK = { shelfHz: 2400, shelf: 4, twangHz: 1800, twang: 2, twangQ: 1, warmHz: 300, warm: 2, warmQ: 0.8, level: 1, trimBridge: -1.4, trimNeck: 0.6 } as const;
const clamp01 = (x: number) => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0.5);
/** D1061: the filters at pick place c (0 the neck, the soft edge; 1 the bridge, the strong edge). */
export function pickTone(c: number): { shelf: number; twang: number; warm: number } {
  const u = 2 * clamp01(c) - 1;
  return { shelf: PICK.shelf * u, twang: Math.max(0, PICK.twang * u), warm: Math.max(0, -PICK.warm * u) };
}
/** D1061: the pick's own level (dB) at c: ±LEVEL at the edges, the filters' loudness taken back (TRIM). */
export function pickLevelDb(c: number): number {
  const u = 2 * clamp01(c) - 1;
  return PICK.level * u + (u > 0 ? PICK.trimBridge * u : PICK.trimNeck * -u);
}

/**
 * D1061: a guitar's landing (in place of D503's three zones, ±3 dB): the pick's place `c` (strength), its level only PICK.level
 * dB at the edges about the line's (the reading's level, Play.lineDb, as before), a reading's accent still the strong zone's (D385).
 * `vel` the level struck (the recording's colour by it, SampledInstrument.velTone, as before).
 */
export function pickLanding(c: number, line: { lineDb?: number; accentDb?: number } = {}): Landing {
  const x = clamp01(c);
  const own = pickLevelDb(x);
  const db = (line.lineDb ?? 0) + (x >= STRONG_ZONE_FROM && line.accentDb !== undefined ? Math.max(own, line.accentDb) : own);
  return { level: 10 ** (db / 20), vel: db, pick: x };
}

// ---- D1061: the hard pick ----

/**
 * D1061: the hard pick: the thumb moving FLICK bar widths a second or more across its bar within ATTACK_MS of the landing (the
 * bow's flick, D1057). Its sound: a brighter front (SNAP_DB of high shelf at SNAP_HZ, falling back over SNAP_TAU) and a little more
 * attack (ACCENT_DB, falling back over ACCENT_TAU): the pick dug in.
 */
export const HARD_PICK = { attackMs: 40, flick: 1.5, snapHz: 2500, snapDb: 6, snapTau: 0.06, accentDb: 1.5, accentTau: 0.08, settleMs: 90 } as const;

// ---- D1062: the bend ----

/**
 * D1062: the bend. The thumb's sideways travel from its landing (strength, 0..1 across the bar), either way: nothing within DEAD
 * (a resting thumb's wander, 2% of the bar), then rising evenly to CENTS (a quarter tone) at SPAN (half the bar, as every sway's
 * full range, touch-expr.ts HOLD_SPAN), never more. A pitch only above the written one (a string pushed across the fret is only
 * ever sharper); back to it as the thumb comes back; on a lift the note ends where it is. TAU smooths it (s).
 */
export const BEND = { cents: 50, dead: 0.02, span: 0.5, tau: 0.015 } as const;
/** D1062: the bend (cents, 0..BEND.cents) for a travel `dx` (strength now less strength at the reference). */
export function bendCents(dx: number): number {
  const a = Number.isFinite(dx) ? Math.abs(dx) : 0;
  if (a <= BEND.dead) return 0;
  return BEND.cents * Math.min(1, (a - BEND.dead) / (BEND.span - BEND.dead));
}

/**
 * D1061, D1062: one held thumb on a guitar note. `move` takes the thumb's strength across its bar (0..1) and its px along the bar's
 * width; answers whether the landing was a hard pick (once, within the first ATTACK_MS) and the bend now. A flick's own travel is the
 * pick's stroke, not a push: the bend's reference is taken where the thumb is once the flick has passed (SETTLE_MS), so a flick
 * and a still thumb after it bend nothing.
 */
export class PickTracker {
  private sp = new SpeedEstimator({ ...BOW_READ });
  private t0: number;
  private ref: number;
  private hard = false;
  private told = false;
  private settled: boolean;
  readonly barPx: number;
  constructor(tMs: number, x: number, barPx: number) {
    this.t0 = tMs;
    this.ref = clamp01(x);
    this.barPx = Math.max(1, barPx);
    this.settled = false;
    this.sp.push(tMs, this.ref * this.barPx);
  }
  /** The thumb at `x` (strength) at tMs: `hard` true once, when the flick is read; `cents` the bend. */
  move(tMs: number, x: number): { hard: boolean; cents: number } {
    const c = clamp01(x);
    this.sp.push(tMs, c * this.barPx);
    const dt = tMs - this.t0;
    let hard = false;
    if (!this.told && dt <= HARD_PICK.attackMs && this.sp.estimate(tMs) / this.barPx >= HARD_PICK.flick) {
      this.hard = this.told = true;
      hard = true;
    }
    if (dt > HARD_PICK.attackMs) this.told = true;
    // The flick's travel is the pick's stroke: the bend counts from where it ends (or nothing until then).
    if (this.hard && !this.settled) {
      if (dt < HARD_PICK.settleMs) return { hard, cents: 0 };
      this.settled = true;
      this.ref = c;
    }
    return { hard, cents: bendCents(c - this.ref) };
  }
  get wasHard(): boolean {
    return this.hard;
  }
}

// ---- D1063: hammer-on and pull-off ----

export type LeftHand = "hammer" | "pull";
/**
 * D1063: the left hand's attack on a joined note (no pick). The new note's recording is entered past its pick (SKIP: at the time
 * the string has rung, at least MIN_SKIP and at most MAX_SKIP s in: the ring going on, never the pick's click), rising over ATTACK s:
 * a HAMMER-ON softer (DB) and rounder (its front not brightened); a PULL-OFF a small snap (the finger plucking as it leaves: SNAP_DB
 * of shelf over SNAP_TAU), a little less soft. The note given way to stops at once (one string: STOP_S), not ringing on (D376's
 * over-legato is the keyboards' and the lute's).
 */
export const LEFT_HAND = { minSkip: 0.03, maxSkip: 0.12, stopS: 0.012, hammer: { attack: 0.006, db: -0.5 }, pull: { attack: 0.0025, db: -0.3, snapDb: 4, snapTau: 0.025 } } as const;
/** D1063: the left hand's way on a join from `from` to `to` (MIDI): up a hammer-on, down a pull-off; a set-and-release always a pull-off; the same pitch a fresh pick (null). */
export function lhOf(from: number | undefined, to: number, setRelease: boolean): LeftHand | null {
  if (from === undefined || !Number.isFinite(from)) return null;
  if (setRelease) return from === to ? null : "pull";
  return to > from ? "hammer" : to < from ? "pull" : null;
}
/** D1063: where the joined note's recording is entered (s), the string having rung `rungS` since its pick. */
export const lhSkip = (rungS: number) => Math.max(LEFT_HAND.minSkip, Math.min(LEFT_HAND.maxSkip, Number.isFinite(rungS) ? rungS : 0));

// ---- D1064: the slide ----

/** D1064: a guitar's slide glided over at most this many semitones (a fifth); wider, a fresh pick (a recording retuned further changes its body). */
export const GUITAR_SLIDE_MAX = 7;
/** D1064: the glide's time constant (ms) by the interval: quick, a finger sliding along the string. */
export const GUITAR_GLIDE_MS = { half: 25, step: 30, third: 40, leap: 55 } as const;

// ---- D1065: PSYCH's amp and stompboxes ----

/**
 * D1065: LEAN's feedback. A held note at lean v (0..1, the tilt toward the amp past its dead zone: tilt.ts leanValue) blooms after
 * DELAY s held: a harmonic-rich tone at its own pitch fading in over RISE s (slower at a smaller lean) to LEVEL × v of the pluck's
 * level, the recording dying away under it: the note sustains instead of decaying; past OCTAVE_AT s and lean OCTAVE_LEAN its octave
 * partial takes over up to OCTAVE_SHARE. A note let go before DELAY never blooms. Leaning back, it fades (FALL s).
 */
export const BLOOM = { delay: 0.35, rise: 0.7, fall: 0.25, level: 0.2, ref: 0.3, octaveAt: 1.2, octaveLean: 0.6, octaveShare: 0.6, lp: 3200 } as const;
/** D1065: the feedback's level (a share of the pluck's) and its octave's share at lean v, `heldS` into the note. */
export function bloomOf(v: number, heldS: number): { level: number; octave: number } {
  const x = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
  if (x <= 0 || !(heldS >= BLOOM.delay)) return { level: 0, octave: 0 };
  const oct = x > BLOOM.octaveLean && heldS >= BLOOM.octaveAt ? (BLOOM.octaveShare * (x - BLOOM.octaveLean)) / (1 - BLOOM.octaveLean) : 0;
  return { level: BLOOM.level * x, octave: oct };
}

/**
 * D1065: STEER's stompboxes (period-true, 1966-69): left the rotary VIBE (a Uni-Vibe: four phase stages swept by a slow LFO, its
 * throb a little in the level), right the FUZZ (a Fuzz Face: a germanium clip, asymmetric, its top rolled off); on the fuzz guitar
 * already fuzzed, a TREBLE BOOST into it (a Rangemaster: more bite and drive). Each levelled to the dry note through the phone model
 * (the trims, measured: DECISIONS D1065). Read as a note starts: a stop applies from the next note (a plucked sound).
 */
export type Stomp = "vibe" | "fuzz";
export const STOMP = {
  vibe: { rate: 3.2, stages: [180, 520, 1300, 3200], depth: 0.45, wet: 0.5, throbDb: 1, trimDb: 2.5 },
  fuzz: { drive: 9, bias: 0.12, lp: 4800, trimDb: -8 },
  boost: { shelfHz: 1500, shelfDb: 6, drive: 2.2, trimDb: -14 },
} as const;
/** D1065: the steering's stop for a note: STEER left (-1) the vibe, right (+1) the fuzz, none in between. */
export const stompOf = (steer: number): Stomp | undefined => (steer < 0 ? "vibe" : steer > 0 ? "fuzz" : undefined);
/** D1065: the fuzz's curve (a germanium transistor's soft, asymmetric clip), n points over -1..1. */
export function fuzzCurve(drive: number, bias: number, n = 2048): Float32Array<ArrayBuffer> {
  const c = new Float32Array(new ArrayBuffer(n * 4));
  const off = Math.tanh(drive * bias);
  const norm = Math.max(Math.abs(Math.tanh(drive * (1 + bias)) - off), Math.abs(Math.tanh(drive * (-1 + bias)) - off));
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = (Math.tanh(drive * (x + bias)) - off) / norm;
  }
  return c;
}

// ---- What the engine is asked (chip.ts) ----

/** D1061-D1065: a player's guitar note as the hands and the amp play it (Play.guitar; unset, every guitar note as before). */
export interface GuitarPlay {
  /** D1063: joined by the left hand (no pick), its recording entered `skip` s in. */
  lh?: LeftHand;
  skip?: number;
  /** D1065: the stompbox on (PSYCH's guitars, from STEER as the note starts). */
  stomp?: Stomp;
  /** D1065: the amp's feedback answers LEAN (PSYCH's guitars with the tilt). */
  amp?: boolean;
}
/** D1061, D1065: what a guitar note is told while it sounds (Sounding.guitar): the hard pick read; the lean now. */
export type GuitarCmd = { kind: "hard" } | { kind: "lean"; v: number };
