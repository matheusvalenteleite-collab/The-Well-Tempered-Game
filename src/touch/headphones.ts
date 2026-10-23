/**
 * D223, headphones: the sound's delay per listening setup, a change of setup noticed, the quick
 * calibration's arithmetic, and when BLUETOOTH MODE is on. Bluetooth headphones add 120-300 ms (AirPods
 * about 125-180, older or cheaper ones more, drifting by tens of ms); no web API lowers it, and
 * `AudioContext.outputLatency` (where a browser has it) is only an estimate: here it is taken as a hint
 * that the output changed, never as the delay itself. The delay is the one the player taps (lag.ts).
 */

/** A jump in the reported output latency (s) that suggests other headphones. */
export const JUMP_S = 0.05;
/** How often the output latency is read (ms) while the app is open. */
export const POLL_MS = 2000;
/** BLUETOOTH MODE's AUTO: on when the sound's delay is over this (s). */
export const BT_AUTO_S = 0.08;
/** The verdict's line between a wired-like delay and a Bluetooth one (s). */
export const WIRED_MAX_S = 0.08;

/** The reported output latency now (s), if the browser reports one. */
export function latencyOf(ctx: { outputLatency?: number; baseLatency?: number }): number | undefined {
  const l = ctx.outputLatency;
  return typeof l === "number" && Number.isFinite(l) && l > 0 ? l : undefined;
}

/**
 * Watches the reported output latency: true when it jumps by more than JUMP_S from the setup it last
 * settled on (the first reading only settles). A reading of nothing (unsupported) changes nothing.
 */
export class OutputWatch {
  base: number | null = null;
  sample(lat: number | undefined): boolean {
    if (lat === undefined) return false;
    if (this.base === null) {
      this.base = lat;
      return false;
    }
    if (Math.abs(lat - this.base) > JUMP_S) {
      this.base = lat;
      return true;
    }
    return false;
  }
}

/**
 * A setup's key: the output device's name where the browser gives it, else the reported latency in
 * 50 ms buckets, else one key for all ("default").
 */
export function setupKey(lat: number | undefined, label?: string): string {
  if (label) return `dev:${label}`;
  if (lat !== undefined) return `lat:${Math.round(lat / 0.05)}`;
  return "default";
}

export type LagBook = Record<string, number>;

/** The delay stored for a setup: its own key, else (a latency bucket) the bucket either side. */
export function lagFor(book: LagBook, key: string): number | undefined {
  if (key in book) return book[key];
  const m = /^lat:(-?\d+)$/.exec(key);
  if (!m) return undefined;
  const b = Number(m[1]);
  return book[`lat:${b - 1}`] ?? book[`lat:${b + 1}`];
}

/** The book with a setup's delay set (null: forgotten). */
export function withLag(book: LagBook, key: string, lag: number | null): LagBook {
  const next = { ...book };
  if (lag === null) delete next[key];
  else next[key] = Math.round(lag * 1000) / 1000;
  return next;
}

export type BtMode = "auto" | "on" | "off";

/** BLUETOOTH MODE: ON, OFF, or AUTO (on when the delay, tapped or else reported, is over BT_AUTO_S). */
export function btOn(mode: BtMode, lag: number | null, reported = 0): boolean {
  if (mode === "on") return true;
  if (mode === "off") return false;
  return (lag ?? reported) > BT_AUTO_S;
}

export function verdictOf(lag: number): "WIRED-LIKE" | "BLUETOOTH" {
  return lag <= WIRED_MAX_S ? "WIRED-LIKE" : "BLUETOOTH";
}

/** The quick calibration: this many taps counted (after SKIP_QUICK clicks to settle in). */
export const QUICK_TAPS = 8;
export const SKIP_QUICK = 3;
export const QUICK_CLICKS = SKIP_QUICK + QUICK_TAPS + 1;
export const QUICK_PERIOD = 0.6;
/** A tap may fall this early (s); up to the rest of the period late (0.5 s: the slowest Bluetooth). */
export const QUICK_EARLY = 0.1;

/**
 * The quick calibration's result: the median offset, with the taps far from it left out (more than
 * 40 ms or three median deviations, whichever is wider); null if fewer than five are left or the
 * rest spread over 80 ms (the middle half).
 */
export function quickLag(offsets: number[]): { lag: number; spread: number; kept: number } | null {
  if (offsets.length < 5) return null;
  const med = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const m0 = med(offsets);
  const mad = med(offsets.map((x) => Math.abs(x - m0)));
  const kept = offsets.filter((x) => Math.abs(x - m0) <= Math.max(0.04, 3 * mad));
  if (kept.length < 5) return null;
  const s = [...kept].sort((a, b) => a - b);
  const q = (f: number) => s[Math.min(s.length - 1, Math.floor(f * s.length))];
  const spread = q(0.75) - q(0.25);
  if (spread > 0.08) return null;
  return { lag: Math.max(0, med(kept)), spread, kept: kept.length };
}
