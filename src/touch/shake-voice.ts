/**
 * D1040 (DRAFT, instruments-gesture3-proto; not adopted): THE SHAKE'S OWN VOICE, BY INSTRUMENT. A shake (a written ornament
 * or a free one: free-ornament.ts, ornament-play.ts) keeps realising exactly the notes it realises today, at the same
 * times; only how they sound changes, by the player's instrument:
 *   "slur": one sounding note carries the ornament, its pitch moved to each of the ornament's notes at its time (no new
 *           attack: Sounding.glide at a set time, `tau` its time constant): the guitarist's hammer-on and pull-off
 *           the brass player's lip trill (BACH BRASS), a console's pitch command (GAME BOY's pulses), a synthesizer's
 *           legato trill (SWITCHED-ON, BERLIN SCHOOL, TOMITA);
 *   "hammer": the plucked strings' hammer-on and pull-off: each ornament note after the first struck by the left hand, not
 *           plucked: HAMMER_DB softer and darker (a lowpass at HAMMER_LP Hz), the string not damped between;
 *   (the organ's trill already speaks each note anew, its pipe's chiff: chip.ts piped, D349: nothing to add.)
 * Every mode off unless SHAKE_PROTO.on (the renders turn it on).
 */
import type { Patch } from "./sound.ts";
import { BOWED_SAMPLES, GUITAR_SAMPLES, type HoldMode, type TouchKind } from "./touch-expr.ts";

export const SHAKE_PROTO = { on: false };
export type ShakeVoice = { kind: "slur"; tau: number } | { kind: "hammer"; level: number; lp: number } | null;
export const HAMMER_DB = -4;
export const HAMMER_LP = 2500;

/**
 * D1076 (the rest of the ornament slurs, same switch): the recordings of the reeds and flutes (a wind's lip, reed and breath
 * go on through a trill: one breath, the pitch moved by the fingers), the singing voices (one vowel, no new consonant), the bowed
 * strings (a violinist's trill is one bow, the left hand's fingers dropping and lifting). Each its own time constant for the
 * pitch to settle (s): fast enough that every printed note is at pitch for most of its time.
 */
export const WIND_SAMPLES: Readonly<Record<string, number>> = {
  trioOboe1: 0.006, trioOboe2: 0.006, baroqueOboe: 0.006, trialOboe: 0.006,
  bossaAltoFlute: 0.006, flute16: 0.006, trialFlute: 0.006,
  trioBassoon: 0.009, bassoon16: 0.009, trialBassoon: 0.009, trialClarinet: 0.007,
};
/** The sung voices' time constant (a trillo's pitch moves in about 40 ms). */
export const VOICE_TAU = 0.008;
/** The bowed strings' (the consorts', the SPC strings'). */
export const STRING_SAMPLES: ReadonlySet<string> = new Set([...BOWED_SAMPLES, "violin16", "strings16", "cello16"]);
export const STRING_TAU = 0.006;

/** The shake's voice on the player's instrument (null: as today, each ornament note joined, legato). */
export function shakeVoice(presetId: string, pt: Patch | null | undefined): ShakeVoice {
  if (!SHAKE_PROTO.on) return null;
  if (pt?.sample && GUITAR_SAMPLES.has(pt.sample)) return { kind: "hammer", level: 10 ** (HAMMER_DB / 20), lp: HAMMER_LP };
  if (presetId === "bachBrass") return { kind: "slur", tau: 0.007 };
  if (presetId === "gameboy" && pt && pt.osc.some((o) => o.wave === "pulse12" || o.wave === "pulse25" || o.wave === "pulse50")) return { kind: "slur", tau: 0.0005 };
  if (pt?.sing) return { kind: "slur", tau: VOICE_TAU };
  if (pt?.sample && WIND_SAMPLES[pt.sample] !== undefined) return { kind: "slur", tau: WIND_SAMPLES[pt.sample] };
  if (pt?.sample && STRING_SAMPLES.has(pt.sample)) return { kind: "slur", tau: STRING_TAU };
  // The synthesizers' trill: one voice stepping, its filter and envelope going on (a legato note re-ramps from silence in 20 ms).
  if (presetId === "analog" || presetId === "berlinSchool" || presetId === "tomita") return { kind: "slur", tau: 0.004 };
  return null;
}

/**
 * D1076, THE SWAY ONTO THE INSTRUMENT'S OWN MOTION (same switch). A held note swayed sideways answers today, on brass, with a
 * swell (loudness: +-4 dB with the layers' brightness) and, on the organ, with the swell box (loudness and tone). Proposed:
 *   "lip":       BACH BRASS: the lip vibrato, LIP_VIB.cents either way of the pitch at LIP_VIB.rate Hz, in proportion to the
 *                sway; no swell, so no level change (D508);
 *   "tremulant": PIPE ORGAN: the tremulant (registration.ts TREMULANT's rate, depth and slight pitch wobble) in proportion to
 *                the sway, the level shaken about its own and never moved (+-TREMULANT_SWAY.depth/2 at the edge: under 1 dB).
 */
export const LIP_VIB = { cents: 20, rate: 5.0 } as const;
export const TREMULANT_SWAY = { depth: 0.22, rate: 5.6, cents: 5 } as const;
export const lipVib = (s: number) => LIP_VIB.cents * Math.min(1, Math.abs(Number.isFinite(s) ? s : 0));
export const tremulantAt = (s: number) => Math.min(1, Math.abs(Number.isFinite(s) ? s : 0));
export function swayHold(kind: TouchKind | null, fallback: HoldMode): HoldMode {
  if (!SHAKE_PROTO.on) return fallback;
  if (kind === "brass" && fallback === "swell") return "lip";
  if (kind === "organ" && fallback === "messa") return "tremulant";
  return fallback;
}
