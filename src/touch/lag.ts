/**
 * The sound's delay, by tapping along (D173): clicks on the audio clock, the player taps on each as
 * heard; how late the taps fall after the clicks (the median, past the first few) is the delay between
 * the clock and the ear and hand, Bluetooth and all. The game then draws and judges by it.
 */
/** How many clicks, how far apart (s); the first few are for settling in. */
export const CLICKS = 20;
export const PERIOD = 0.75;
export const SKIP = 3;

/** Tapping along to clicks: the median of how late the taps fall after the clicks is the delay. */
export function lagOf(offsets: number[]): { lag: number; spread: number } | null {
  if (offsets.length < 6) return null;
  const s = [...offsets].sort((a, b) => a - b);
  const q = (f: number) => s[Math.min(s.length - 1, Math.floor(f * s.length))];
  return { lag: Math.max(0, q(0.5)), spread: q(0.75) - q(0.25) };
}

/** A tap's offset from the click it answers: from 0.15 s early to most of a period late (D223: the period and how early, for the quick calibration). */
export function offsetOf(tap: number, t0: number, period = PERIOD, early = 0.15): { click: number; off: number } | null {
  const k = tap - t0;
  if (k < -early) return null;
  const off = ((((k + early) % period) + period) % period) - early;
  return { click: Math.round((k - off) / period), off };
}
