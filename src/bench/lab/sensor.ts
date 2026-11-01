/**
 * D321, THE LAB's SENSOR test (the owner's Decision 13: dynamics, "Accelerometer test first, nothing
 * else yet"; the design note "Mechanics, rethought" §2.1): can a phone feel how hard a thumb taps? A
 * harder tap shakes the phone more: a sharper spike in its motion sensor round the moment of the touch.
 * This module records the motion sensor (DeviceMotionEvent: accelerationIncludingGravity, acceleration,
 * rotationRate, with their times and the sensor's interval) beside the touches (pointer events'
 * pressure, width, height, tilt, pointerType; TouchEvent's force and radius where given), and measures
 * each tap: the peak of the motion in a window round the touch (−10…+40 ms), when that peak was
 * available to the page, the phone's posture (lying on a table or held). A guided session (soft ×10,
 * hard ×10) says how well soft and hard taps separate (AUC, means and spreads). The SENSOR tab is gone;
 * the hub stays for DYNAMICS' strike (dynamics.ts, passage-dyn.ts, free.ts), its taps in the runs' logs.
 *
 * The pure functions (tapPeak, stats, auc, separability, posture, calibrate) are tested
 * (test/d321-drag-sensor.test.ts); MotionHub is the browser's side.
 */

import { barAcross } from "../protos.ts";

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

/** What a touch reported at its start. */
export interface TouchInfo {
  t: number;
  pointerType?: string;
  pressure?: number;
  width?: number;
  height?: number;
  tiltX?: number;
  tiltY?: number;
  /** TouchEvent (iOS: force 0 unless 3D Touch; radius where given). */
  force?: number;
  radiusX?: number;
  radiusY?: number;
  /** While held (filled in as it moves and lifts): the contact size's largest and last (px), the moves, the moves that changed only the size (no x/y change), the time held (ms). */
  sizeMax?: number;
  sizeEnd?: number;
  moves?: number;
  sizeMoves?: number;
  heldMs?: number;
  /** D335: where across the bar it landed (protos.ts barAcross: 0 by the box, 1 the phone's edge; the screen's width) and its zone (inner under 0.5). */
  across?: number;
  zone?: "inner" | "outer";
}

/**
 * The contact's size (px, a diameter): WebKit on iPhone reports UIKit's touch radius (majorRadius) as
 * Touch.radiusX/radiusY and PointerEvent.width/height (twice it). The radius's diameter where given,
 * else the pointer's mean of width and height; null where neither says anything (both 0 or 1: a mouse).
 */
export function sizeOf(t: { width?: number; height?: number; radiusX?: number; radiusY?: number }): number | null {
  const r = Math.max(t.radiusX ?? 0, t.radiusY ?? 0);
  if (r > 0.5) return 2 * r;
  const w = ((t.width ?? 0) + (t.height ?? 0)) / 2;
  return w > 1 ? w : null;
}

/** What the pressures reported say: "none", "always 0", "always 0.5" (a pointer without pressure), "varies". */
export function pressureKind(ps: readonly (number | undefined)[]): "none" | "always 0" | "always 0.5" | "varies" {
  const xs = ps.filter((p): p is number => typeof p === "number");
  if (!xs.length) return "none";
  if (xs.every((p) => p === 0)) return "always 0";
  if (xs.every((p) => p === 0.5)) return "always 0.5";
  return "varies";
}

export type TapLabel = "soft" | "hard" | "free" | "play" | "flatten";
/** What a tap's strength is read from: the motion sensor's spike, or the contact's size at landing. */
export type SenseSource = "motion" | "size";
/** A tap's value for a source: its motion peak (m/s²), or its contact size at landing (px). */
export function valueOf(x: TapRecord, src: SenseSource): number | null {
  return src === "motion" ? x.peak : sizeOf(x.touch);
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

export interface TapRecord extends TapPeak {
  /** The touch's time (ms, the page's clock). */
  t: number;
  label: TapLabel;
  touch: TouchInfo;
  posture: Posture;
  /** The sensor's interval round it (ms, measured from the samples' times). */
  intervalMs: number | null;
  /** D335: the zone of the bar it landed in (inner: by the box; outer: by the phone's edge). */
  zone?: "inner" | "outer";
}

/** The window round a touch the peak is looked for in (ms), and the baseline before it. */
export const PEAK_FROM_MS = -10;
export const PEAK_TO_MS = 40;
export const BASE_FROM_MS = -250;
export const BASE_TO_MS = -20;

const hyp = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);

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

/** The sensor's interval (ms): the median gap between the samples' times. */
export function medianInterval(samples: readonly MotionSample[]): number | null {
  const gaps: number[] = [];
  for (let i = 1; i < samples.length; i++) gaps.push(samples[i].t - samples[i - 1].t);
  return gaps.length ? median(gaps) : null;
}

export function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (!n) return NaN;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

export interface Stats {
  n: number;
  mean: number;
  sd: number;
  median: number;
  min: number;
  max: number;
}
export function stats(xs: readonly number[]): Stats {
  const n = xs.length;
  if (!n) return { n: 0, mean: NaN, sd: NaN, median: NaN, min: NaN, max: NaN };
  const mean = xs.reduce((a, x) => a + x, 0) / n;
  const sd = n > 1 ? Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1)) : 0;
  return { n, mean, sd, median: median(xs), min: Math.min(...xs), max: Math.max(...xs) };
}

/** The chance a hard tap's value is above a soft tap's (ties half): 0.5 no separation, 1 perfect (the area under the ROC curve). */
export function auc(soft: readonly number[], hard: readonly number[]): number {
  if (!soft.length || !hard.length) return NaN;
  let w = 0;
  for (const h of hard) for (const s of soft) w += h > s ? 1 : h === s ? 0.5 : 0;
  return w / (soft.length * hard.length);
}

export interface Separability {
  auc: number;
  /** The means' distance in pooled standard deviations (d′). */
  d: number;
  soft: Stats;
  hard: Stats;
  /** A plain verdict: "clear" (AUC ≥ 0.9), "usable" (≥ 0.75), "weak" (≥ 0.6), "none". */
  verdict: "clear" | "usable" | "weak" | "none" | "too few";
}
export function separability(soft: readonly number[], hard: readonly number[]): Separability {
  const s = stats(soft);
  const h = stats(hard);
  const a = auc(soft, hard);
  const pooled = Math.sqrt(((s.sd || 0) ** 2 + (h.sd || 0) ** 2) / 2);
  const d = pooled > 0 ? (h.mean - s.mean) / pooled : h.mean > s.mean ? Infinity : 0;
  const verdict = s.n < 3 || h.n < 3 ? "too few" : a >= 0.9 ? "clear" : a >= 0.75 ? "usable" : a >= 0.6 ? "weak" : "none";
  return { auc: a, d, soft: s, hard: h, verdict };
}

export type Posture = "table" | "held" | "unknown";
/**
 * Lying still on a table or held: gravity almost all on the screen's axis (|z| > 9 m/s², x and y under
 * 1.5) and almost no motion (the magnitude's spread under 0.06 m/s²) over the last second: a table.
 */
export function posture(samples: readonly MotionSample[], t: number, spanMs = 1000): Posture {
  const w = samples.filter((s) => s.t <= t && s.t >= t - spanMs);
  if (w.length < 5) return "unknown";
  const mags = w.map((s) => hyp(s.gx, s.gy, s.gz));
  const st = stats(mags);
  const z = w.reduce((a, s) => a + s.gz, 0) / w.length;
  const x = w.reduce((a, s) => a + s.gx, 0) / w.length;
  const y = w.reduce((a, s) => a + s.gy, 0) / w.length;
  return Math.abs(z) > 9 && Math.abs(x) < 1.5 && Math.abs(y) < 1.5 && st.sd < 0.06 ? "table" : "held";
}

/** A per-device scale for the peak: the soft taps' median maps to 0.25, the hard's to 0.75. */
export interface Calibration {
  soft: number;
  hard: number;
  from: "session" | "recent";
}
export function calibrate(soft: readonly number[], hard: readonly number[]): Calibration | null {
  if (soft.length < 3 || hard.length < 3) return null;
  const s = median(soft);
  const h = median(hard);
  return h > s ? { soft: s, hard: h, from: "session" } : null;
}
/** Without a session: the recent taps' 20th and 80th percentiles (at least eight taps, some spread). */
export function recentCalibration(peaks: readonly number[]): Calibration | null {
  if (peaks.length < 8) return null;
  const s = [...peaks].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
  const lo = q(0.2);
  const hi = q(0.8);
  return hi > lo * 1.15 ? { soft: lo, hard: hi, from: "recent" } : null;
}

// ---- The browser's side ----

export type Permission = "unasked" | "granted" | "denied" | "not-needed" | "unavailable";

export interface SensorExport {
  v: 1;
  kind: "wtc-lab-sensor";
  app: string;
  at: string;
  device: { ua: string; w: number; h: number; dpr: number };
  permission: Permission;
  /** Motion events seen, those with values, the measured interval (ms), the event's own `interval` as reported. */
  motion: { events: number; withValues: number; intervalMs: number | null; reportedInterval: number | null; linear: boolean; rotation: boolean };
  taps: TapRecord[];
  /** Soft against hard by the motion's peak, and by the contact's size at landing. */
  sep: Separability | null;
  sepSize: Separability | null;
  cal: Calibration | null;
  calSize: Calibration | null;
  /** The touches: what the pressure reads, the pointer moves seen while down, those that changed only the size. */
  touches: { pressure: string; moves: number; sizeOnlyMoves: number };
  /** D335: inner against outer taps (dynamics.ts zoneReport) and the zone calibration kept on the device. */
  zones?: import("./dynamics.ts").ZoneReport;
  zoneCal?: import("./dynamics.ts").ZoneCal | null;
  /** D336: the strike's one calibration kept on the device, the adaptive references at the export, adaptive on. */
  dynCal?: { stored: import("./dynamics.ts").DynCal; now: import("./dynamics.ts").DynCal | null; adaptive: boolean | null };
  /** Each tap's raw samples from −250 to +150 ms: [t − tap, rt − tap, gx, gy, gz, lx, ly, lz, ra, rb, rg] (rounded). */
  raw: number[][][];
}

/** A clock stamp: an event's own timeStamp where it is the page's clock (performance.now's), else when it was received. */
export function stampOf(eventTs: number, now: number): number {
  return Number.isFinite(eventTs) && Math.abs(now - eventTs) < 1000 ? eventTs : now;
}

const r2 = (x: number | undefined) => (x === undefined || x === null ? NaN : Math.round(x * 100) / 100);

/**
 * The motion sensor and the taps measured from it. `start()` (from a tap: iOS asks for permission
 * there) listens to devicemotion; `measure(t, label, touch)` measures a tap once the samples after it
 * have come in (`whenReady`).
 */
export class MotionHub {
  samples: MotionSample[] = [];
  taps: TapRecord[] = [];
  raw: number[][][] = [];
  permission: Permission = "unasked";
  events = 0;
  withValues = 0;
  reportedInterval: number | null = null;
  private listening = false;
  private waiters: { until: number; deadline: number; fn: () => void; timer: ReturnType<typeof setTimeout> }[] = [];
  readonly app: string;

  constructor(app: string) {
    this.app = app;
  }

  static supported(): boolean {
    return typeof window !== "undefined" && "DeviceMotionEvent" in window;
  }

  /** Asks for the sensor (iOS: DeviceMotionEvent.requestPermission, from a tap) and listens. */
  async start(): Promise<Permission> {
    if (!MotionHub.supported()) return (this.permission = "unavailable");
    const DM = (window as unknown as { DeviceMotionEvent: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
    if (typeof DM.requestPermission === "function") {
      try {
        const r = await DM.requestPermission();
        this.permission = r === "granted" ? "granted" : "denied";
      } catch {
        this.permission = "denied";
      }
    } else this.permission = "not-needed";
    if (this.permission !== "denied" && !this.listening) {
      window.addEventListener("devicemotion", this.onMotion);
      this.listening = true;
    }
    return this.permission;
  }
  stop() {
    if (this.listening) window.removeEventListener("devicemotion", this.onMotion);
    this.listening = false;
    for (const w of this.waiters) clearTimeout(w.timer);
    this.waiters = [];
  }
  get live(): boolean {
    return this.listening && this.withValues > 0;
  }

  private onMotion = (e: DeviceMotionEvent) => {
    this.events++;
    const g = e.accelerationIncludingGravity;
    if (!g || g.x === null || g.y === null || g.z === null) return;
    this.withValues++;
    const rt = performance.now();
    const a = e.acceleration;
    const r = e.rotationRate;
    const s: MotionSample = { t: stampOf(e.timeStamp, rt), rt, gx: g.x, gy: g.y, gz: g.z };
    if (a && a.x !== null && a.y !== null && a.z !== null) (s.lx = a.x), (s.ly = a.y), (s.lz = a.z);
    if (r && r.alpha !== null && r.beta !== null && r.gamma !== null) (s.ra = r.alpha), (s.rb = r.beta), (s.rg = r.gamma);
    if (typeof e.interval === "number") this.reportedInterval = e.interval;
    this.samples.push(s);
    // About three seconds kept.
    if (this.samples.length > 600) this.samples.splice(0, this.samples.length - 600);
    const now = s.t;
    const due = this.waiters.filter((w) => now >= w.until);
    if (due.length) {
      this.waiters = this.waiters.filter((w) => now < w.until);
      for (const w of due) (clearTimeout(w.timer), w.fn());
    }
  };

  /** fn once a sample at or after `until` has come in, or at `deadline` (ms, the page's clock) at the latest. */
  whenReady(until: number, deadline: number, fn: () => void) {
    if (this.samples.length && this.samples[this.samples.length - 1].t >= until) return fn();
    if (!this.live) return void setTimeout(fn, Math.max(0, deadline - performance.now()));
    const w = { until, deadline, fn, timer: setTimeout(() => ((this.waiters = this.waiters.filter((x) => x !== w)), fn()), Math.max(0, deadline - performance.now())) };
    this.waiters.push(w);
  }

  /** A tap measured over [−10, `to`] ms (its window filled, or `waitMs` on at the latest), kept and reported. */
  measure(t: number, label: TapLabel, touch: TouchInfo, done?: (r: TapRecord) => void, to = PEAK_TO_MS, waitMs = 150) {
    this.whenReady(t + to, t + waitMs, () => {
      const pk = tapPeak(this.samples, t, PEAK_FROM_MS, to);
      const near = this.samples.filter((s) => s.t >= t - 500 && s.t <= t + 100);
      const rec: TapRecord = { ...pk, t, label, touch, posture: posture(this.samples, t), intervalMs: medianInterval(near) };
      if (touch.zone) rec.zone = touch.zone;
      this.taps.push(rec);
      this.raw.push(this.samples.filter((s) => s.t >= t + BASE_FROM_MS && s.t <= t + 150).map((s) => [r2(s.t - t), r2(s.rt - t), r2(s.gx), r2(s.gy), r2(s.gz), r2(s.lx), r2(s.ly), r2(s.lz), r2(s.ra), r2(s.rb), r2(s.rg)]));
      if (this.taps.length > 400) (this.taps.splice(0, 100), this.raw.splice(0, 100));
      done?.(rec);
    });
  }

  /** The values of one measure (the motion's peak, or the contact's size at landing) of the taps with a label. */
  valuesOf(label: TapLabel, src: SenseSource = "motion"): number[] {
    return this.taps.filter((x) => x.label === label).map((x) => valueOf(x, src)).filter((v): v is number => v !== null);
  }
  separation(src: SenseSource = "motion"): Separability | null {
    const s = this.valuesOf("soft", src);
    const h = this.valuesOf("hard", src);
    return s.length && h.length ? separability(s, h) : null;
  }
  calibration(src: SenseSource = "motion"): Calibration | null {
    return calibrate(this.valuesOf("soft", src), this.valuesOf("hard", src)) ?? recentCalibration(this.taps.map((x) => valueOf(x, src)).filter((v): v is number => v !== null).slice(-30));
  }

  /**
   * The contacts down now, by pointer id (the lab listens to every pointer on the page, capture phase,
   * before the play area): their landing and current size, pressure, moves and size-only moves.
   */
  contacts = new Map<number, TouchInfo & { x: number; y: number; size0: number | null; size: number | null }>();
  /** Pointer moves seen while a contact was down, and those that changed only its size (x and y unchanged). */
  moveCount = 0;
  sizeOnlyMoves = 0;
  pressures: number[] = [];
  pointerDown(e: PointerEvent) {
    const now = performance.now();
    const info: TouchInfo = { t: stampOf(e.timeStamp, now), pointerType: e.pointerType, pressure: e.pressure, width: e.width, height: e.height, tiltX: e.tiltX, tiltY: e.tiltY, moves: 0, sizeMoves: 0 };
    // D335: where across the bar (the screen's width: the bars at its two edges) and the zone.
    const w = typeof window !== "undefined" ? window.innerWidth : 0;
    if (w > 0) {
      info.across = Math.round(barAcross(e.clientX, w) * 1000) / 1000;
      info.zone = info.across < 0.5 ? "inner" : "outer";
    }
    const size = sizeOf(info);
    info.sizeMax = size ?? undefined;
    this.contacts.set(e.pointerId, { ...info, x: e.clientX, y: e.clientY, size0: size, size });
    this.pressures.push(e.pressure);
    if (this.pressures.length > 200) this.pressures.splice(0, 100);
    return info;
  }
  pointerMove(e: PointerEvent, info?: TouchInfo) {
    const c = this.contacts.get(e.pointerId);
    if (!c) return;
    this.moveCount++;
    const size = sizeOf({ width: e.width, height: e.height });
    const sizeOnly = e.clientX === c.x && e.clientY === c.y && (e.width !== c.width || e.height !== c.height);
    if (sizeOnly) this.sizeOnlyMoves++;
    Object.assign(c, { x: e.clientX, y: e.clientY, width: e.width, height: e.height, pressure: e.pressure, size });
    for (const t of info ? [c, info] : [c]) {
      t.moves = (t.moves ?? 0) + 1;
      if (sizeOnly) t.sizeMoves = (t.sizeMoves ?? 0) + 1;
      if (size !== null) (t.sizeMax = Math.max(t.sizeMax ?? 0, size)), (t.sizeEnd = size);
    }
    this.pressures.push(e.pressure);
  }
  pointerUp(e: PointerEvent, info?: TouchInfo) {
    const c = this.contacts.get(e.pointerId);
    if (c && info) info.heldMs = Math.round(stampOf(e.timeStamp, performance.now()) - info.t);
    this.contacts.delete(e.pointerId);
  }

  export(): SensorExport {
    return {
      v: 1,
      kind: "wtc-lab-sensor",
      app: this.app,
      at: new Date().toISOString(),
      device: { ua: navigator.userAgent, w: screen.width, h: screen.height, dpr: devicePixelRatio || 1 },
      permission: this.permission,
      motion: { events: this.events, withValues: this.withValues, intervalMs: medianInterval(this.samples.slice(-200)), reportedInterval: this.reportedInterval, linear: this.samples.some((s) => s.lx !== undefined), rotation: this.samples.some((s) => s.ra !== undefined) },
      taps: this.taps,
      sep: this.separation(),
      sepSize: this.separation("size"),
      cal: this.calibration(),
      calSize: this.calibration("size"),
      touches: { pressure: pressureKind(this.pressures), moves: this.moveCount, sizeOnlyMoves: this.sizeOnlyMoves },
      raw: this.raw,
    };
  }
}
