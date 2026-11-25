/**
 * D1065, THE TILT READER (shared; first used by PSYCH's guitar). The phone held sideways, two axes measured from how it is held
 * when the piece starts (the NEUTRAL, taken again at each start):
 *
 * - LEAN: the top edge tipped away from the player or toward them (the screen's angle to the horizontal). Continuous, with a dead
 *   zone (leanValue: nothing within DEAD_DEG of neutral, all of it FULL_DEG away). One way only is used (LEAN_AMP_SIGN: away from the
 *   player, the guitar turned toward the amp); the other way is nothing.
 * - STEER: turned like a steering wheel (about the screen's own axis, so the same whichever way round the phone is held sideways).
 *   ON/OFF STOPS with hysteresis (SteerStop): a stop engages only past ON_DEG from neutral and lets go only once back within
 *   OFF_DEG; never flickering in between. Conservative (the owner: "directly to main game": untested thresholds reach players).
 *
 * The reading (ported from the bench test, prototypes/bow-test2/touchgest.js TiltReader, not imported): the gravity direction
 * carried forward by the gyroscope (fast, no jolts) and pulled slowly toward the accelerometer's (no drift), a complementary
 * filter; the gyroscope's axis labelling (the standard's, or WebKit's, which names them otherwise), sign and units are not assumed:
 * eight candidate trackers run side by side and the one that best predicts the accelerometer is used; a LOOK_MS look-ahead by the
 * rotation's speed cancels the sensor's own delay. No gyroscope: the accelerometer alone, low-passed (GRAVITY_TAU_MS).
 *
 * Tilt never touches judging, scoring or timing: it is read by the sound alone. No sensor, or access refused: nothing (every reading
 * neutral), everything else as ever. TiltCore and SteerStop are pure (test/d1061-guitar.test.ts); TiltSensor is the browser's side.
 */

export const TILT = { lookMs: 20, gyroCorrS: 0.8, gravityTauMs: 120, deadDeg: 6, fullDeg: 30, onDeg: 30, offDeg: 10 } as const;
/** D1065: the LEAN that counts: +1, the top edge away from the player (flatter than neutral); -1 would be toward them. */
export const LEAN_AMP_SIGN = 1;
/** D1065: which way of STEER is "left": +1, the phone turned anticlockwise as the player sees it (the roll angle rising). */
export const STEER_LEFT_SIGN = 1;

type V3 = [number, number, number];
export interface RotationRate {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}
type Cand = { map: "swapped" | "standard"; sg: number; k: number; g: V3; err: number };
const CANDS: [Cand["map"], number, number][] = [];
for (const map of ["swapped", "standard"] as const) for (const sg of [1, -1]) for (const k of [Math.PI / 180, 1]) CANDS.push([map, sg, k]);
/** The rotation about the device's x, y and z axes (rad/s) by a candidate's labelling. */
const wOf = (c: Cand, r: RotationRate): V3 => {
  const f = c.sg * c.k;
  return c.map === "standard" ? [(r.beta ?? 0) * f, (r.gamma ?? 0) * f, (r.alpha ?? 0) * f] : [(r.alpha ?? 0) * f, (r.beta ?? 0) * f, (r.gamma ?? 0) * f];
};
const cross = (w: V3, g: V3): V3 => [w[1] * g[2] - w[2] * g[1], w[2] * g[0] - w[0] * g[2], w[0] * g[1] - w[1] * g[0]];
const wrap = (d: number) => ((((d + 540) % 360) + 360) % 360) - 180;

/** D1065: the reading: gravity in (accelerationIncludingGravity, the rotation rate), the angles from neutral out. */
export class TiltCore {
  g: V3 | null = null;
  private gl: V3 | null = null;
  private lastT = 0;
  private cands: Cand[] | null = null;
  private best = 0;
  private rot: RotationRate | null = null;
  source: "fused" | "gravity" = "gravity";
  private ref: { s: number; ux: number; uy: number } | null = null;
  private zero: { lean: number; roll: number } | null = null;
  private wantNeutral = true;
  /** Degrees from neutral: lean (+ away from the player: flatter), roll (+ anticlockwise as the player sees it). */
  lean = 0;
  roll = 0;
  /** Whether a neutral has been taken (no reading before it). */
  get ready(): boolean {
    return this.zero !== null;
  }
  /** D1065: the neutral taken again at the next reading (the piece's start). */
  retakeNeutral() {
    this.wantNeutral = true;
    this.zero = null;
    this.lean = 0;
    this.roll = 0;
  }
  private fuse(dt: number, gm: V3, rot: RotationRate | null): boolean {
    if (!rot || rot.alpha == null || rot.beta == null || rot.gamma == null) return false;
    if (!this.cands) this.cands = CANDS.map(([map, sg, k]) => ({ map, sg, k, g: [...gm] as V3, err: 0 }));
    const corr = Math.min(1, dt / Math.max(0.05, TILT.gyroCorrS));
    for (const c of this.cands) {
      const cr = cross(wOf(c, rot), c.g);
      const pred: V3 = [c.g[0] - cr[0] * dt, c.g[1] - cr[1] * dt, c.g[2] - cr[2] * dt];
      const cos = (pred[0] * gm[0] + pred[1] * gm[1] + pred[2] * gm[2]) / (Math.hypot(...pred) * Math.hypot(...gm) || 1);
      c.err += (Math.acos(Math.max(-1, Math.min(1, cos))) - c.err) * Math.min(1, dt / 1);
      c.g = pred.map((v, i) => v + (gm[i] - v) * corr) as V3;
    }
    const cur = this.cands[this.best];
    this.cands.forEach((c, i) => {
      if (c.err < cur.err * 0.7 - 1e-4) this.best = i;
    });
    this.g = this.cands[this.best].g;
    this.rot = rot;
    return true;
  }
  private leanOf(g: V3): number {
    const r = this.ref!;
    const m = Math.hypot(g[0], g[1]);
    const dot = g[0] * r.ux + g[1] * r.uy;
    return (Math.atan2(Math.sign(dot || 1) * m, r.s * g[2]) * 180) / Math.PI;
  }
  /** A sample at t (ms): gravity (m/s², the browser's signs whatever they are) and the rotation rate (or null). */
  feed(t: number, gx: number, gy: number, gz: number, rot: RotationRate | null = null) {
    if (![gx, gy, gz].every(Number.isFinite)) return;
    const first = !this.g;
    const dtMs = first ? 0 : Math.max(0, Math.min(100, t - this.lastT));
    this.lastT = t;
    const gm: V3 = [gx, gy, gz];
    const a = this.gl ? 1 - Math.exp(-dtMs / TILT.gravityTauMs) : 1;
    this.gl = this.gl ? (this.gl.map((v, i) => v + (gm[i] - v) * a) as V3) : [...gm];
    if (!first && this.fuse(dtMs / 1000, gm, rot)) this.source = "fused";
    else {
      this.g = [...this.gl];
      this.source = "gravity";
    }
    const g = this.g!;
    if (!this.ref) {
      const m = Math.hypot(g[0], g[1]);
      if (m < 1) return; // lying flat: wait for a held reading
      this.ref = { s: Math.sign(g[2]) || 1, ux: g[0] / m, uy: g[1] / m };
    }
    // The look-ahead: the rotation's speed carries the estimate LOOK_MS on (the fused reading only).
    let gNow = g;
    if (this.source === "fused" && this.rot && this.cands) {
      const cr = cross(wOf(this.cands[this.best], this.rot), g);
      const la = TILT.lookMs / 1000;
      gNow = [g[0] - cr[0] * la, g[1] - cr[1] * la, g[2] - cr[2] * la];
    }
    const lean = this.leanOf(gNow);
    const roll = (Math.atan2(gNow[0], gNow[1]) * 180) / Math.PI;
    if (this.wantNeutral || !this.zero) {
      this.zero = { lean, roll };
      this.wantNeutral = false;
    }
    // (leanOf grows toward upright: away from the player is flatter, the lean falling.)
    this.lean = this.zero.lean - lean;
    this.roll = wrap(roll - this.zero.roll);
  }
}

/** D1065: LEAN as a continuous value 0..1 in the amp's direction (LEAN_AMP_SIGN): nothing within DEAD_DEG, all of it at FULL_DEG. */
export function leanValue(leanDeg: number): number {
  const d = (Number.isFinite(leanDeg) ? leanDeg : 0) * LEAN_AMP_SIGN;
  if (d <= TILT.deadDeg) return 0;
  return Math.min(1, (d - TILT.deadDeg) / (TILT.fullDeg - TILT.deadDeg));
}

/** D1065: STEER's on/off stops: -1 left, +1 right, 0 none; engaged past ON_DEG, let go only back within OFF_DEG (hysteresis). */
export class SteerStop {
  state: -1 | 0 | 1 = 0;
  feed(rollDeg: number): -1 | 0 | 1 {
    const r = Number.isFinite(rollDeg) ? rollDeg * STEER_LEFT_SIGN : 0;
    if (this.state === 0) {
      if (r >= TILT.onDeg) this.state = -1;
      else if (r <= -TILT.onDeg) this.state = 1;
    } else if (Math.abs(r) < TILT.offDeg || Math.sign(r) === this.state) this.state = 0;
    return this.state;
  }
  reset() {
    this.state = 0;
  }
}

/** What the sound reads: the lean (0..1 toward the amp) and the steering's stop. Neutral where nothing is read. */
export interface TiltNow {
  live: boolean;
  lean: number;
  steer: -1 | 0 | 1;
}
export const TILT_NONE: TiltNow = { live: false, lean: 0, steer: 0 };

type DMClass = { requestPermission?: () => Promise<string> };
const dmClass = (): DMClass | null => (typeof window !== "undefined" && "DeviceMotionEvent" in window ? (window as unknown as { DeviceMotionEvent: DMClass }).DeviceMotionEvent : null);

/** D1065: the browser's side: devicemotion in, TiltNow out. One per page (tiltSensor). */
export class TiltSensor {
  readonly core = new TiltCore();
  readonly steer = new SteerStop();
  permission: "unasked" | "granted" | "denied" | "not-needed" | "unavailable" = "unasked";
  private listening = false;
  private samples = 0;
  private lastRt = 0;
  /** iOS: DeviceMotionEvent.requestPermission, which must be called from a tap. */
  static needsPermission(): boolean {
    return typeof dmClass()?.requestPermission === "function";
  }
  /** Asked from a tap (iOS asks the player once; afterwards it answers at once); elsewhere it simply listens. Never throws. */
  ask(): void {
    const DM = dmClass();
    if (!DM) {
      this.permission = "unavailable";
      return;
    }
    if (this.permission === "denied") return;
    if (typeof DM.requestPermission === "function") {
      if (this.permission === "granted") return this.listen();
      try {
        DM.requestPermission()
          .then((r) => {
            this.permission = r === "granted" ? "granted" : "denied";
            this.listen();
          })
          .catch(() => {
            // Asked outside a gesture: not the player's answer; asked again from the next start.
            this.permission = "unasked";
          });
      } catch {
        this.permission = "unasked";
      }
    } else {
      this.permission = "not-needed";
      this.listen();
    }
  }
  private listen() {
    if (this.listening || this.permission === "denied" || typeof window === "undefined") return;
    window.addEventListener("devicemotion", this.onMotion);
    this.listening = true;
  }
  stop() {
    if (this.listening && typeof window !== "undefined") window.removeEventListener("devicemotion", this.onMotion);
    this.listening = false;
  }
  /** D1065: the piece starts: the neutral taken again, every stop off. */
  retakeNeutral() {
    this.core.retakeNeutral();
    this.steer.reset();
  }
  private onMotion = (e: DeviceMotionEvent) => {
    const g = e.accelerationIncludingGravity;
    if (!g || g.x === null || g.y === null || g.z === null) return;
    const r = e.rotationRate;
    const rt = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.core.feed(rt, g.x, g.y, g.z, r && r.alpha !== null && r.beta !== null && r.gamma !== null ? { alpha: r.alpha, beta: r.beta, gamma: r.gamma } : null);
    if (this.core.ready) this.steer.feed(this.core.roll);
    this.samples++;
    this.lastRt = rt;
  };
  /** The reading now: neutral unless samples are coming (within the last half second). */
  now(): TiltNow {
    const rt = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!this.listening || !this.samples || !this.core.ready || rt - this.lastRt > 500) return TILT_NONE;
    return { live: true, lean: leanValue(this.core.lean), steer: this.steer.state };
  }
}
let sensor: TiltSensor | null = null;
/** The page's tilt sensor (made when first asked for). */
export function tiltSensor(): TiltSensor {
  return (sensor ??= new TiltSensor());
}
/** The reading now, without making the sensor (TILT_NONE where none was asked for). */
export function tiltNow(): TiltNow {
  return sensor ? sensor.now() : TILT_NONE;
}
