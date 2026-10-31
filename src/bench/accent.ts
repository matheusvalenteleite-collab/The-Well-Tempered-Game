/**
 * D338, THE READING'S ACCENT (>) JUDGED BY TIME, NOT LOUDNESS. On the harpsichord and the organ, the
 * instruments Bach wrote these fugues for, a note cannot be struck louder; an accent is made with time:
 * the note before it lifted a little early (a small silence of articulation) and the accented note
 * leaned on, a hair late and held its whole value (Couperin's "suspension" and "aspiration", L'art de
 * toucher le clavecin and the Pièces de clavecin's prefaces; C. P. E. Bach's and Türk's long notes on
 * the good beat). So ACCENT ✓ asks three things, and never how hard the thumb landed:
 *   1. ON TIME OR LEANED: struck no earlier than the PERFECT window allows and no later than
 *      MECH.accentLateBeats of a beat (15%: an agogic lean, not a late note), or the PERFECT window
 *      where that is wider;
 *   2. NOT JOINED FROM THE NOTE BEFORE: that note let go at least MECH.accentGapMs before the strike
 *      (a note before that was not struck, or a rest, leaves nothing to separate);
 *   3. HELD: let go no earlier than MECH.accentHoldShare of its written length (from its written onset;
 *      where the reading also dots it short, the dot decides its length and this is not asked).
 */
import { MECH, type Mech } from "./mechanics.ts";
import { STRONG_ZONE_FROM } from "../touch/touch-expr.ts";

/**
 * D385 (WTC 1.88, the panel's report §2; the owner: "accents and marcato as weight on time, not a delay"):
 * on the piano an accent is pressed harder, on the beat; the harpsichordist's lean and silence was the wrong
 * tool borrowed for every instrument. ACCENT ✓ now asks two things: struck WITHIN THE PERFECT WINDOW (no
 * late lean credited) and landed in the STRONG ZONE of the bar (touch-expr.ts: the third by the box), read
 * at touch-down, so it costs no latency. On the piano that zone is the accent's weight (+4 dB for ">", +6 for
 * "^", firm and bright: whole-reading.ts PLAYER_ACCENT_DB); on the harpsichord and the organ, which cannot
 * strike louder, the same gesture is asked and the note sounds its plain stop. Where no bar is touched (a
 * computer's keys) only the timing is asked. Nothing about the note before or the hold is asked; a wrong
 * note sounds as a right one (loudness never tied to right or wrong). D338's three rules below stay for the
 * Lab's CLASSIC mechanics (MECH.glenn off).
 */
export type AccentWhy = "early" | "late" | "joined" | "short" | "soft";
/** D385: the accent's verdict: on time (offMs within ±onTimeMs, the PERFECT window) and strong (strength 0..1, null: not asked). */
export function accentWeighted(offMs: number, onTimeMs: number, strength: number | null): AccentWhy | null {
  if (offMs < -onTimeMs) return "early";
  if (offMs > onTimeMs) return "late";
  if (strength !== null && strength < STRONG_ZONE_FROM) return "soft";
  return null;
}

/** 1: struck on time or leaned (offMs: + late; onTimeMs: the PERFECT window; beatMs: one beat of the metre). */
export function accentTimely(offMs: number, onTimeMs: number, beatMs: number, m: Mech = MECH): AccentWhy | null {
  if (offMs < -onTimeMs) return "early";
  if (offMs > Math.max(onTimeMs, m.accentLateBeats * beatMs)) return "late";
  return null;
}

/** 2: the note before let go this long before the strike (ms; null: nothing to separate from; negative or "held": still down). */
export function accentSeparated(gapMs: number | null | "held", m: Mech = MECH): AccentWhy | null {
  if (gapMs === null) return null;
  if (gapMs === "held" || gapMs < m.accentGapMs) return "joined";
  return null;
}

/** 3: held its value (heldMs from the written onset to the lift; riders: its end is not the player's; short: the reading dots it). */
export function accentHeld(heldMs: number, lenMs: number, o: { riders?: boolean; short?: boolean } = {}, m: Mech = MECH): AccentWhy | null {
  if (o.riders || o.short) return null;
  // D376 (MECH.glenn): an accent is the silence before it and the lean; how long it is held is the player's.
  if (m.glenn) return null;
  return heldMs >= lenMs * m.accentHoldShare ? null : "short";
}

/** The whole verdict: met, or the first thing missed. */
export function accentVerdict(a: { offMs: number; onTimeMs: number; beatMs: number; gapMs: number | null | "held"; heldMs: number; lenMs: number; riders?: boolean; short?: boolean }, m: Mech = MECH): { met: boolean; why: AccentWhy | null } {
  const why = accentTimely(a.offMs, a.onTimeMs, a.beatMs, m) ?? accentSeparated(a.gapMs, m) ?? accentHeld(a.heldMs, a.lenMs, a, m);
  return { met: why === null, why };
}
