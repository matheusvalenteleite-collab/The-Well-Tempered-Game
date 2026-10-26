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

/**
 * D306: where a stored delay was tapped: the output setup then (setupKey of the latency the browser
 * reported, if it reported one) and whether it was tapped since the page loaded.
 */
export interface LagOrigin {
  setup?: string;
  fresh: boolean;
}

/**
 * D306: BLUETOOTH MODE's AUTO on the minimal page. A delay tapped once for earbuds stayed in force on the
 * phone's speaker (the owner: "the notes keep ringing in the player's voice even when they let it go"):
 * on when the latency the browser reports is over BT_AUTO_S; a stored delay over it counts only for the
 * output it was tapped with: where the browser reports a latency, the same setup (its 50 ms bucket or
 * the next); where it reports none (Safari), only until the page is loaded again (a phone cannot tell
 * earbuds from its speaker: tap again with them on).
 */
export function btAuto(lag: number | null, reported: number | undefined, origin: LagOrigin): boolean {
  if ((reported ?? 0) > BT_AUTO_S) return true;
  if (lag === null || lag <= BT_AUTO_S) return false;
  if (reported === undefined) return origin.fresh;
  if (origin.setup === undefined) return false;
  const now = setupKey(reported);
  return lagFor({ [origin.setup]: 1 }, now) !== undefined;
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

/** D299: the smoothed clock follows the audio clock with this time constant (s)… */
export const CLOCK_TAU_S = 0.5;
/** …and snaps to it where the two part by more than this (s): a stall, a resume, a seek. */
export const CLOCK_SNAP_S = 0.05;

/**
 * D299: the audio clock read smoothly. `AudioContext.currentTime` advances a block at a time (on a
 * Bluetooth route the blocks can be large and uneven), so read each frame it stands still, then jumps:
 * a picture drawn from it judders and a touch's time is off by up to a block. Here: the page's clock
 * (performance.now()) plus an offset that follows the audio clock with a time constant of CLOCK_TAU_S
 * (snapped to it past CLOCK_SNAP_S), never going back. It is the audio clock (it cannot drift from it),
 * only without the steps.
 */
export class SmoothClock {
  private off: number | null = null;
  private at = 0;
  private last = -Infinity;
  /** The smoothed audio time (s) for an audio clock reading (s) taken at a page time (ms). */
  read(audio: number, nowMs: number, running = true): number {
    const p = nowMs / 1000;
    const raw = audio - p;
    const dt = Math.max(0, p - this.at);
    this.at = p;
    if (this.off === null || !running || Math.abs(raw - this.off) > CLOCK_SNAP_S) this.off = raw;
    else this.off += (raw - this.off) * (1 - Math.exp(-dt / CLOCK_TAU_S));
    const t = Math.max(this.last, p + this.off);
    this.last = t;
    return t;
  }
}

/** D299: the least notes struck right, and the most spread (ms, middle half), for a run to retune the delay. */
export const DRIFT_MIN_NOTES = 16;
export const DRIFT_MAX_SPREAD_MS = 120;
/** D299: a steady lateness under this (ms) is left alone; the retune takes this share of it, at most DRIFT_STEP_MS. */
export const DRIFT_DEAD_MS = 15;
export const DRIFT_SHARE = 0.5;
export const DRIFT_STEP_MS = 30;

/**
 * D299: after a run in BLUETOOTH MODE, the change to the sound's delay (s) its touches suggest: the
 * median of how late (+) or early (-) the notes struck right were, as heard; nothing (0) under
 * DRIFT_MIN_NOTES notes, a middle half wider than DRIFT_MAX_SPREAD_MS, or a median within DRIFT_DEAD_MS;
 * else half of it, at most DRIFT_STEP_MS either way. A Bluetooth route's delay moves as it settles (by
 * 60 ms over the first half hour, an AirPods measurement), and every run is a calibration of its own.
 */
export function driftOf(offsetsMs: number[]): number {
  if (offsetsMs.length < DRIFT_MIN_NOTES) return 0;
  const s = [...offsetsMs].sort((a, b) => a - b);
  const q = (f: number) => s[Math.min(s.length - 1, Math.floor(f * s.length))];
  if (q(0.75) - q(0.25) > DRIFT_MAX_SPREAD_MS) return 0;
  const m = s.length % 2 ? s[s.length >> 1] : (s[(s.length >> 1) - 1] + s[s.length >> 1]) / 2;
  if (Math.abs(m) < DRIFT_DEAD_MS) return 0;
  return Math.max(-DRIFT_STEP_MS, Math.min(DRIFT_STEP_MS, m * DRIFT_SHARE)) / 1000;
}

/**
 * D299: the sounds to suggest with Bluetooth on (never chosen for the player): every voice a quick attack
 * (5 ms or less) and no echo or long reverb of their own, so each note's start is a clear mark to play
 * to. No sound makes the headphones' delay shorter (BLUETOOTH MODE takes it out); a slow attack or a
 * long echo only blurs where the beat is. Checked against the patches in test/bt-mode.test.ts.
 */
export const BT_SOUNDS = ["chip", "gameboy", "harpsichordSampled", "sid64", "tracker"] as const;

/** D299: the last Bluetooth delay tapped (s), kept on the device to offer again (never applied by itself). */
export const BT_LAG_KEY = "tb-bt-lag-v1";
