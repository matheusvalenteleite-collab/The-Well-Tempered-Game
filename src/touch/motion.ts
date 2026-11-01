/**
 * D425, THE MOTION SENSOR FOR THE GAME (moved from the Lab's sensor.ts, D321/D335, so the game and the Lab
 * share one reader): the phone's DeviceMotion samples kept for about three seconds, and each touchdown's
 * peak read from them: the motion's largest change from its rest in a short window after the touch
 * (D335: the owner's logs, the peak available 3-36 ms after touchdown). A harder tap shakes the phone more.
 *
 * Permission: iOS asks (DeviceMotionEvent.requestPermission) and only from a user gesture; the game asks
 * on the PLAY tap, once per visit, and remembers the answer on the device (MOTION_KEY): a "denied" is
 * never asked again (the calibration screen can ask once more, on the player's own tap). Android and
 * others need no permission: the reader starts with the run. Without a sensor (a computer, denied, no
 * samples coming) nothing waits on it: every read answers null by its deadline and the game plays on.
 *
 * The pure functions (tapPeak, baseline, median, stampOf, windowEnd) are tested (test/d321-drag-sensor,
 * test/d425-hard-tap); MotionReader is the browser's side (the Lab's MotionHub extends it).
 */

/** One motion sample. t: its time (ms, the page's clock, performance.now's); rt: when the page received it. */
export interface MotionSample {
  t: number;
  rt: number;
  /** accelerationIncludingGravity (m/s²). */
  gx: number;
  gy: number;
  gz: number;
  /** acceleration without gravity (m/s²), where the device gives it. */
  lx?: number;
  ly?: number;
  lz?: number;
  /** rotationRate (deg/s). */
  ra?: number;
  rb?: number;
  rg?: number;
}

export interface TapPeak {
  /** The largest change of the motion from its rest (|a − baseline|, gravity included: every device gives it) in the window (m/s²); null: no samples there. */
  peak: number | null;
  /** When it was (ms from the touch). */
  peakAt: number | null;
  /** The largest |acceleration| (gravity removed by the device) in the window, where given. */
  linPeak: number | null;
  /** The largest |rotationRate| in the window (deg/s), where given. */
  rotPeak: number | null;
  /** Samples in the window. */
  n: number;
  /** When the page had the peak's sample (ms from the touch): the earliest the strength could be used. */
  availMs: number | null;
}

/** The window round a touch the peak is looked for in (ms), and the baseline before it. */
export const PEAK_FROM_MS = -10;
export const PEAK_TO_MS = 40;
export const BASE_FROM_MS = -250;
export const BASE_TO_MS = -20;

const hyp = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);

export function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (!n) return NaN;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

/** The resting motion before a touch: the mean of the samples in [BASE_FROM_MS, BASE_TO_MS] (or the last before the window). */
export function baseline(samples: readonly MotionSample[], t0: number): { gx: number; gy: number; gz: number } | null {
  const pre = samples.filter((s) => s.t >= t0 + BASE_FROM_MS && s.t <= t0 + BASE_TO_MS);
  const use = pre.length ? pre : samples.filter((s) => s.t < t0 + PEAK_FROM_MS).slice(-1);
  if (!use.length) return null;
  const m = (k: "gx" | "gy" | "gz") => use.reduce((a, s) => a + s[k], 0) / use.length;
  return { gx: m("gx"), gy: m("gy"), gz: m("gz") };
}

/** A tap's peak: the motion's largest change from rest in [t0 + from, t0 + to]. */
export function tapPeak(samples: readonly MotionSample[], t0: number, from = PEAK_FROM_MS, to = PEAK_TO_MS): TapPeak {
  const win = samples.filter((s) => s.t >= t0 + from && s.t <= t0 + to);
  const base = baseline(samples, t0) ?? (win[0] ? { gx: win[0].gx, gy: win[0].gy, gz: win[0].gz } : null);
  if (!win.length || !base) return { peak: null, peakAt: null, linPeak: null, rotPeak: null, n: 0, availMs: null };
  let peak = -1;
  let at: MotionSample = win[0];
  let lin: number | null = null;
  let rot: number | null = null;
  for (const s of win) {
    const d = hyp(s.gx - base.gx, s.gy - base.gy, s.gz - base.gz);
    if (d > peak) (peak = d), (at = s);
    if (s.lx !== undefined && s.ly !== undefined && s.lz !== undefined) lin = Math.max(lin ?? 0, hyp(s.lx, s.ly, s.lz));
    if (s.ra !== undefined && s.rb !== undefined && s.rg !== undefined) rot = Math.max(rot ?? 0, hyp(s.ra, s.rb, s.rg));
  }
  return { peak, peakAt: at.t - t0, linPeak: lin, rotPeak: rot, n: win.length, availMs: at.rt - t0 };
}

/** A clock stamp: an event's own timeStamp where it is the page's clock (performance.now's), else when it was received. */
export function stampOf(eventTs: number, now: number): number {
  return Number.isFinite(eventTs) && Math.abs(now - eventTs) < 1000 ? eventTs : now;
}

/**
 * D425: a touch's window ends `to` ms after it, or a few ms (ATTRIBUTE_MS) after the next touchdown if that
 * comes sooner: two thumbs landing close together each keep their own shake (the later one's peak is not
 * the earlier's).
 */
export const ATTRIBUTE_MS = 4;
export function windowEnd(t0: number, to: number, downs: readonly number[]): number {
  let end = t0 + to;
  for (const d of downs) if (d > t0 && d + ATTRIBUTE_MS < end) end = d + ATTRIBUTE_MS;
  return end;
}

// ---- The browser's side ----

export type Permission = "unasked" | "granted" | "denied" | "not-needed" | "unavailable";

/** D425: the answer to the motion sensor's question kept on this device ("granted" or "denied"). */
export const MOTION_KEY = "wtc.motion.answer";
export function motionAnswer(store: Pick<Storage, "getItem"> | null = safeStore()): "granted" | "denied" | null {
  try {
    const v = store?.getItem(MOTION_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}
function keepAnswer(v: "granted" | "denied") {
  try {
    safeStore()?.setItem(MOTION_KEY, v);
  } catch {
    /* this visit only */
  }
}
function safeStore(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

type DMClass = { requestPermission?: () => Promise<string> };
const dmClass = (): DMClass | null => (typeof window !== "undefined" && "DeviceMotionEvent" in window ? (window as unknown as { DeviceMotionEvent: DMClass }).DeviceMotionEvent : null);

/**
 * The motion sensor's samples. `start()` (from a tap where iOS asks) listens to devicemotion; `peakAfter`
 * answers a touch's peak once the samples after it have come in (or null by its deadline).
 */
export class MotionReader {
  samples: MotionSample[] = [];
  permission: Permission = "unasked";
  events = 0;
  withValues = 0;
  reportedInterval: number | null = null;
  protected listening = false;
  /** D425: the last question failed without the player answering (asked outside a gesture). */
  unanswered = false;
  /** When it began listening (ms, the page's clock). */
  private listenAt = 0;
  private waiters: { until: number; deadline: number; fn: () => void; timer: ReturnType<typeof setTimeout> }[] = [];
  /** D425: the recent touchdowns read (their times), for each one's window (windowEnd). */
  private downs: number[] = [];
  /** Called on changes (a tab's redraw). */
  onChange?: () => void;

  static supported(): boolean {
    return dmClass() !== null;
  }
  /** iOS: the sensor needs DeviceMotionEvent.requestPermission, from a user gesture. */
  static needsPermission(): boolean {
    return typeof dmClass()?.requestPermission === "function";
  }

  /** Asks for the sensor (iOS: DeviceMotionEvent.requestPermission, from a tap) and listens. */
  async start(): Promise<Permission> {
    const DM = dmClass();
    if (!DM) return (this.permission = "unavailable");
    if (typeof DM.requestPermission === "function") {
      try {
        const r = await DM.requestPermission();
        this.permission = r === "granted" ? "granted" : "denied";
      } catch {
        // Asked outside a gesture (iOS refuses so, without asking the player): no answer of the player's.
        this.permission = "denied";
        this.unanswered = true;
      }
    } else this.permission = "not-needed";
    this.listen();
    this.onChange?.();
    return this.permission;
  }
  /** Listens where no permission is asked (or it was given); nothing where it was refused. */
  listen() {
    if (this.permission === "denied" || this.listening || typeof window === "undefined") return;
    window.addEventListener("devicemotion", this.onMotion);
    this.listening = true;
    this.listenAt = performance.now();
  }
  /** D425: listening for two seconds with no sample (no sensor in this device, or the browser gives none). */
  get silent(): boolean {
    return this.listening && this.withValues === 0 && performance.now() - this.listenAt > 2000;
  }
  stop() {
    if (this.listening && typeof window !== "undefined") window.removeEventListener("devicemotion", this.onMotion);
    this.listening = false;
    for (const w of this.waiters) clearTimeout(w.timer);
    this.waiters = [];
  }
  get live(): boolean {
    return this.listening && this.withValues > 0;
  }

  protected onMotion = (e: DeviceMotionEvent) => {
    this.events++;
    const g = e.accelerationIncludingGravity;
    if (!g || g.x === null || g.y === null || g.z === null) return;
    const rt = performance.now();
    const a = e.acceleration;
    const r = e.rotationRate;
    const s: MotionSample = { t: stampOf(e.timeStamp, rt), rt, gx: g.x, gy: g.y, gz: g.z };
    if (a && a.x !== null && a.y !== null && a.z !== null) (s.lx = a.x), (s.ly = a.y), (s.lz = a.z);
    if (r && r.alpha !== null && r.beta !== null && r.gamma !== null) (s.ra = r.alpha), (s.rb = r.beta), (s.rg = r.gamma);
    if (typeof e.interval === "number") this.reportedInterval = e.interval;
    this.add(s);
  };

  /** A sample in (the browser's listener; a test's). */
  add(s: MotionSample) {
    this.withValues++;
    this.samples.push(s);
    // About three seconds kept.
    if (this.samples.length > 600) this.samples.splice(0, this.samples.length - 600);
    const now = s.t;
    const due = this.waiters.filter((w) => now >= w.until);
    if (due.length) {
      this.waiters = this.waiters.filter((w) => now < w.until);
      for (const w of due) (clearTimeout(w.timer), w.fn());
    }
  }

  /** fn once a sample at or after `until` has come in, or at `deadline` (ms, the page's clock) at the latest. */
  whenReady(until: number, deadline: number, fn: () => void) {
    if (this.samples.length && this.samples[this.samples.length - 1].t >= until) return fn();
    const wait = Math.max(0, deadline - performance.now());
    if (!this.live) return void setTimeout(fn, wait);
    const w = { until, deadline, fn, timer: setTimeout(() => ((this.waiters = this.waiters.filter((x) => x !== w)), fn()), wait) };
    this.waiters.push(w);
  }

  /**
   * D425: a touchdown's peak (m/s²; null: no samples) over [t0 − 10, t0 + `to`] ms (ended early by the next
   * touchdown: windowEnd), answered once that window has filled, or `waitMs` after the touch at the latest.
   */
  peakAfter(t0: number, to: number, waitMs: number, done: (pk: TapPeak) => void) {
    this.downs.push(t0);
    if (this.downs.length > 16) this.downs.splice(0, this.downs.length - 16);
    this.whenReady(t0 + to, t0 + waitMs, () => done(tapPeak(this.samples, t0, PEAK_FROM_MS, windowEnd(t0, to, this.downs) - t0)));
  }
}

/** D425: the game's one reader, kept for the visit (the calibration screen reads it too). */
let shared: MotionReader | null = null;
export function gameMotion(): MotionReader {
  return (shared ??= new MotionReader());
}
let asked: Promise<Permission> | null = null;

/**
 * D425: the PLAY tap's question (a user gesture: iOS asks only from one). Once per visit; a refusal kept on
 * the device is never asked again unless `again` (the calibration screen's own button). Never blocks: the
 * answer comes later; where no permission is needed the reader listens at once.
 */
export function askMotion(again = false): Promise<Permission> {
  const r = gameMotion();
  if (!MotionReader.supported()) return Promise.resolve((r.permission = "unavailable"));
  if (!MotionReader.needsPermission()) {
    r.permission = "not-needed";
    r.listen();
    return Promise.resolve(r.permission);
  }
  if (!again && motionAnswer() === "denied") return Promise.resolve((r.permission = "denied"));
  if (asked && !again) return asked;
  r.unanswered = false;
  asked = r.start().then((p) => {
    if (r.unanswered) {
      // Not the player's answer: asked again on the next PLAY tap.
      asked = null;
      r.permission = "unasked";
      return p;
    }
    if (p === "granted" || p === "denied") keepAnswer(p);
    return p;
  });
  return asked;
}

/** D425: a touch device that may feel a tap's strength (a motion sensor, not refused); a computer never. */
export function hardTapDevice(): boolean {
  if (typeof navigator === "undefined" || !(navigator.maxTouchPoints > 0) || !MotionReader.supported()) return false;
  const r = gameMotion();
  if (r.permission === "denied" || r.permission === "unavailable" || r.silent) return false;
  return motionAnswer() !== "denied";
}
