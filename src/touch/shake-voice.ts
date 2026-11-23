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
import { GUITAR_SAMPLES } from "./touch-expr.ts";

export const SHAKE_PROTO = { on: false };
export type ShakeVoice = { kind: "slur"; tau: number } | { kind: "hammer"; level: number; lp: number } | null;
export const HAMMER_DB = -4;
export const HAMMER_LP = 2500;

/** The shake's voice on the player's instrument (null: as today, each ornament note joined, legato). */
export function shakeVoice(presetId: string, pt: Patch | null | undefined): ShakeVoice {
  if (!SHAKE_PROTO.on) return null;
  if (pt?.sample && GUITAR_SAMPLES.has(pt.sample)) return { kind: "hammer", level: 10 ** (HAMMER_DB / 20), lp: HAMMER_LP };
  if (presetId === "bachBrass") return { kind: "slur", tau: 0.007 };
  if (presetId === "gameboy" && pt && pt.osc.some((o) => o.wave === "pulse12" || o.wave === "pulse25" || o.wave === "pulse50")) return { kind: "slur", tau: 0.0005 };
  // The synthesizers' trill: one voice stepping, its filter and envelope going on (a legato note re-ramps from silence in 20 ms).
  if (presetId === "analog" || presetId === "berlinSchool" || presetId === "tomita") return { kind: "slur", tau: 0.004 };
  return null;
}
