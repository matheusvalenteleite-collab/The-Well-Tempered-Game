/**
 * The sync (D163): the player taps along with a few clicks; the median difference between their taps
 * and the clicks they heard is their lag, which the game then takes off every event. Touchscreens,
 * Bluetooth headphones and hands all add their own.
 */
export const SYNC_BEATS = 12;
export const SYNC_BPM = 90;

/** The lag in ms (late positive), rounded to 5 ms, from clicks and taps in seconds; null with too few taps. */
export function lagFrom(clicks: number[], taps: number[]): number | null {
  const half = 30 / SYNC_BPM;
  const diffs = taps
    .map((t) => clicks.reduce((best, c) => (Math.abs(t - c) < Math.abs(best) ? t - c : best), Infinity))
    .filter((d) => Math.abs(d) < half)
    .sort((a, b) => a - b);
  if (diffs.length < 5) return null;
  const mid = diffs.length % 2 ? diffs[(diffs.length - 1) / 2] : (diffs[diffs.length / 2 - 1] + diffs[diffs.length / 2]) / 2;
  return Math.max(-200, Math.min(200, Math.round((mid * 1000) / 5) * 5));
}
