/**
 * D1055-D1058, THE BOW (MECH.bow: THE NEW LAB, and the developer view's NEW MECHANICS; off everywhere else). The thumb's sideways
 * motion while it holds a bowed note (STRING CONSORT's violin, viola and cello) is the bow, read continuously:
 *
 * - its SPEED (smoothed) sets the sound's COLOUR, not its loudness (D1056: the pp, mf and ff recordings crossfaded, each levelled to
 *   the mf through the phone model within ±0.75 dB, D508): no sway, today's sound exactly; faster, fuller (toward the ff); slower than
 *   an ordinary bow, lighter and airier (toward the pp). Still again, it eases back to today's, never dies (colourOf, colourStep).
 * - its START (D1057, the one decision: made in the first ATTACK_MS, never delaying the note): a still landing today's attack; a
 *   landing already moving fast (a flick) a biting attack (a brief ff front) that settles; a flick and a lift within SPICC_LIFT_MS a
 *   spiccato (the note ends on the consort's spiccato recording); a gentle acceleration after a still landing a soft start that
 *   swells in (the colour rising from the light end more slowly).
 * - its DIRECTION along each thumb's own bar (the bars are mirrored: + is toward the strong side, touch-expr.ts strengthOf) (D1058):
 *   one thumb reversing on a held note is a BOW CHANGE on that note (no new note), as audible as the bow stalled at the turn
 *   (turnAudibility: a quick turn nearly seamless, a stall a small fresh attack, today's join); a join (the other thumb takes the
 *   next note) carries the bow on (a slur) when it goes on the same way, a bow change when the other way (joinOf).
 *
 * Always safe: no bow length; a note held under MIN_HOLD_S gets the normal stroke; never scored or judged; never a note added or a
 * pitch changed; the vibrato automatic, the tremolo a stop only. The speed reading is bow test 2's (prototypes/bow-test2/bowcore.js,
 * a throwaway: its logic copied here): an adaptive-window speed estimate behind a backlash filter. Pure numbers and state
 * (test/d1055-bow.test.ts); chip.ts makes them sound (Play.bow, Sounding.bow), src/bench/bowing.ts feeds them from the thumbs.
 */
import { STRING_BOW_CHANGE } from "./sound.ts";

/** The estimator's and the filter's settings (bow test 2's defaults; px of the screen, ms). */
export const BOW_READ = { jitterPx: 0.4, minWin: 30, maxWin: 600, minTravel: 1.5, resPx: 0.6 } as const;

/**
 * D1056: the bow's speeds, in bar widths a second (a bar is 22% of the screen's width: about 205 px at 932, 147 at 667): under
 * STILL the bow is still (today's colour); at SLOW and under it the lightest; NORMAL an ordinary bow (today's again); FULL and over
 * the fullest. The colour follows a faster bow over RISE_TAU and eases back over EASE_TAU (s).
 */
export const BOW = { still: 0.06, slow: 0.15, normal: 0.5, full: 2.5, riseTau: 0.05, easeTau: 0.25, softTau: 0.18 } as const;
/** D1057: the attack read in the first ATTACK_MS: a flick at FLICK bar widths a second or more; a flick lifted within SPICC_LIFT_MS a spiccato; SOFT_MS the swell's reach. */
export const BOW_ATTACK = { attackMs: 40, flick: 1.5, biteS: 0.09, biteTau: 0.05, spiccLiftMs: 180, softMs: 300, softConfirmMs: 60 } as const;
/** D1055: a note held less than this (s) is not bowed: the normal stroke (no colour, no bow change). */
export const MIN_HOLD_S = 0.08;
/**
 * D1058: a turn's stall (ms the bow was nearly still around it): QUICK_MS or less nearly seamless, STALL_MS or more a small fresh
 * attack (STRING_BOW_CHANGE, today's join). A join's bow decided within JOIN_DECIDE_MS of the landing; the bow giving way counts as
 * moving if it moved within MOVING_MS.
 */
export const BOW_TURN = { quickMs: 40, stallMs: 220, joinDecideMs: 45, movingMs: 120, joinTravelPx: 3 } as const;

/**
 * Backlash ("play") filter (bowcore.js): the output follows the finger but ignores wobbles smaller than h px. It adds h px of lag,
 * never a dead zone in speed. A reversal is reported only after the finger comes back by more than 2h.
 */
export class Backlash {
  y: number | null = null;
  dir: -1 | 0 | 1 = 0;
  h: number;
  constructor(h: number) {
    this.h = h;
  }
  reset() {
    this.y = null;
    this.dir = 0;
  }
  push(raw: number): { y: number; prev?: number; moved: boolean; reversed: boolean } {
    if (this.y === null) {
      this.y = raw;
      return { y: raw, moved: false, reversed: false };
    }
    const d = raw - this.y;
    if (Math.abs(d) <= this.h) return { y: this.y, moved: false, reversed: false };
    const nd = Math.sign(d) as -1 | 1;
    const prev = this.y;
    const reversed = this.dir !== 0 && nd !== this.dir;
    this.dir = nd;
    this.y = raw - this.h * nd;
    return { y: this.y, prev, moved: true, reversed };
  }
}

/**
 * Adaptive-window speed estimate (bowcore.js): the window reaches back from the newest sample until it is at least minWin ms long
 * AND the finger has travelled at least minTravel px, but never beyond maxWin ms. When samples stop arriving the estimate is capped
 * by how far it could have gone unseen (resPx over the idle time), so a stopped bow decays to still.
 */
export class SpeedEstimator {
  s: { t: number; y: number }[] = [];
  evInt = 16;
  o: { minWin: number; maxWin: number; minTravel: number; resPx: number };
  constructor(o: { minWin: number; maxWin: number; minTravel: number; resPx: number } = { ...BOW_READ }) {
    this.o = o;
  }
  reset() {
    this.s = [];
    this.evInt = 16;
  }
  push(t: number, y: number) {
    const s = this.s;
    if (s.length) {
      const dt = t - s[s.length - 1].t;
      if (dt > 0) this.evInt += (Math.min(200, Math.max(4, dt)) - this.evInt) * 0.2;
    }
    s.push({ t, y });
    while (s.length > 2 && t - s[1].t > this.o.maxWin) s.shift();
    if (s.length > 400) s.shift();
  }
  /** px/s at `now` (ms). */
  estimate(now: number): number {
    const s = this.s;
    const n = s.length;
    if (n < 2) return 0;
    const last = s[n - 1];
    let ref: { t: number; y: number } | null = null;
    for (let i = n - 2; i >= 0; i--) {
      const c = s[i];
      const dt = last.t - c.t;
      if (dt > this.o.maxWin) break;
      ref = c;
      if (dt >= this.o.minWin && Math.abs(last.y - c.y) >= this.o.minTravel) break;
    }
    if (!ref || last.t <= ref.t) return 0;
    let v = Math.abs(last.y - ref.y) / ((last.t - ref.t) / 1000);
    const extra = now - last.t - 1.5 * this.evInt;
    if (extra > 0) v = Math.min(v, this.o.resPx / (extra / 1000));
    if (now - last.t > 1500) v = 0;
    return v;
  }
}

/** D1056: the colour a bow speed (bar widths a second) asks for: -1 the lightest (pp), 0 today's (mf), 1 the fullest (ff). */
export function colourOf(speed: number): number {
  if (!(speed > BOW.still)) return 0;
  if (speed < BOW.slow) return -(speed - BOW.still) / (BOW.slow - BOW.still);
  const lg = Math.log;
  if (speed < BOW.normal) return -1 + (lg(speed) - lg(BOW.slow)) / (lg(BOW.normal) - lg(BOW.slow));
  return Math.min(1, (lg(speed) - lg(BOW.normal)) / (lg(BOW.full) - lg(BOW.normal)));
}

/** D1056: the three recordings' gains at colour c (equal power: the level held; c 0 the mf alone, exactly today's). */
export function layerMix(c: number): { pp: number; mf: number; ff: number } {
  const x = Number.isFinite(c) ? Math.max(-1, Math.min(1, c)) : 0;
  const a = (Math.abs(x) * Math.PI) / 2;
  const mf = x === 0 ? 1 : Math.cos(a);
  const side = x === 0 ? 0 : Math.sin(a);
  return { pp: x < 0 ? side : 0, mf, ff: x > 0 ? side : 0 };
}

/** D1056: one step of the colour's smoothing over dt s toward `target`: a fuller or lighter colour over `rise`, back toward today's over EASE_TAU. */
export function colourStep(c: number, target: number, dt: number, rise: number = BOW.riseTau): number {
  const away = Math.abs(target) > Math.abs(c) && Math.sign(target || c) === Math.sign(c || target);
  const tau = away ? rise : BOW.easeTau;
  return target + (c - target) * Math.exp(-Math.max(0, dt) / tau);
}

/** D1058: how audible a bow change is (0 nearly seamless .. 1 a small fresh attack) for a stall of `ms` around the turn. */
export function turnAudibility(ms: number): number {
  if (!(ms > BOW_TURN.quickMs)) return 0;
  return Math.min(1, (ms - BOW_TURN.quickMs) / (BOW_TURN.stallMs - BOW_TURN.quickMs));
}

/**
 * D1058: a bow change's shape on the note (chip.ts Sounding.bow "change"): the level falls to `floor` (over 3 ms), holds `still` s,
 * rises over `a` s to an accent of `accentDb` that falls back over about `accentS` s. Audibility 1 is today's join (STRING_BOW_CHANGE,
 * D427); 0 a dip of under 1 dB, nothing held, no accent.
 */
export function bowChangeShape(aud: number): { floor: number; still: number; a: number; accentDb: number; accentS: number } {
  const k = Math.max(0, Math.min(1, aud));
  const c = STRING_BOW_CHANGE;
  return { floor: 0.9 - k * (0.9 - c.floor), still: k * c.still, a: 0.006 + k * (c.a - 0.006), accentDb: k * c.accentDb, accentS: c.accentS };
}

/** What the bow on a held note asks of its sound. */
export type BowEvent = { kind: "bite" } | { kind: "soft" } | { kind: "change"; aud: number; stallMs: number };
/** D1057: how the note started. */
export type BowAttack = "pending" | "still" | "bite" | "soft";

/**
 * One thumb's bow on one held note: positions along its own bar in px (strength × the bar's width: + toward the strong side, so
 * the two mirrored bars read alike), times in ms. move() returns what the sound must do now; colour(t) the colour to sound.
 */
export class BowTracker {
  readonly t0: number;
  private pos0: number;
  private pos: number;
  private filt = new Backlash(BOW_READ.jitterPx);
  private est = new SpeedEstimator();
  /** Smoothed colour, and when it was last stepped. */
  private c = 0;
  private cT: number;
  private lastMoveT: number;
  private fastT: number;
  attack: BowAttack = "pending";
  private softFrom: number | null = null;
  /** Bow changes made on this note. */
  changes = 0;
  /** The fastest the bow went (bar widths a second): the Lab's line. */
  top = 0;
  barPx: number;
  constructor(t0: number, pos: number, barPx: number) {
    this.barPx = barPx;
    this.t0 = t0;
    this.pos0 = this.pos = pos;
    this.cT = t0;
    this.lastMoveT = t0;
    this.fastT = -Infinity;
    this.filt.push(pos);
    this.est.push(t0, pos);
  }
  /** The bow's direction along its bar: +1 toward the strong side, -1 toward the soft, 0 not yet moved. */
  get dir(): -1 | 0 | 1 {
    return this.filt.dir;
  }
  /** The bow's speed now, bar widths a second. */
  speed(t: number): number {
    return this.est.estimate(t) / Math.max(1, this.barPx);
  }
  /** Whether the bow is moving (it moved faster than STILL within MOVING_MS). */
  moving(t: number): boolean {
    return t - this.fastT <= BOW_TURN.movingMs;
  }
  /** How long the bow has been nearly still (ms; 0 while it moves). */
  stillMs(t: number): number {
    return Math.max(0, t - this.fastT);
  }
  private held(t: number) {
    return (t - this.t0) / 1000 >= MIN_HOLD_S;
  }
  /** D1058: the way the bow has gone since the landing, once it has gone JOIN_TRAVEL_PX (a landing's settle is no direction). */
  get away(): -1 | 0 | 1 {
    const d = this.pos - this.pos0;
    return Math.abs(d) >= BOW_TURN.joinTravelPx ? (Math.sign(d) as -1 | 1) : 0;
  }
  move(t: number, pos: number): BowEvent[] {
    this.pos = pos;
    const out: BowEvent[] = [];
    const r = this.filt.push(pos);
    if (r.moved) {
      if (r.reversed) {
        // (bowcore.js: the window must not span the turn, or the two directions cancel out)
        const stall = t - this.lastMoveT;
        const lastT = this.est.s.length ? this.est.s[this.est.s.length - 1].t : t;
        this.est.reset();
        this.est.push(lastT, r.prev ?? r.y);
        this.est.push(t, r.y);
        if (this.held(t)) {
          this.changes++;
          out.push({ kind: "change", aud: turnAudibility(stall), stallMs: Math.round(stall) });
        }
      } else this.est.push(t, r.y);
      this.lastMoveT = t;
    }
    out.push(...this.read(t));
    return out;
  }
  /** The attack's reading and the speed's bookkeeping (also from tick: a thumb that stops sends no moves). */
  private read(t: number): BowEvent[] {
    const v = this.speed(t);
    if (v > BOW.still) this.fastT = t;
    this.top = Math.max(this.top, v);
    const since = t - this.t0;
    if (this.attack === "pending") {
      if (since <= BOW_ATTACK.attackMs && v >= BOW_ATTACK.flick) {
        this.attack = "bite";
        return [{ kind: "bite" }];
      }
      if (since > BOW_ATTACK.attackMs) this.attack = "still";
    }
    // A gentle start: the bow past SLOW within SOFT_MS of a still landing, and still under FLICK SOFT_CONFIRM_MS later (a fast
    // stroke begun after the landing passes SLOW on its way up: an ordinary start).
    if (this.attack === "still" && since <= BOW_ATTACK.softMs && v >= BOW.slow && this.softFrom === null) this.softFrom = t;
    if (this.softFrom !== null && this.attack === "still") {
      if (v >= BOW_ATTACK.flick) this.softFrom = Infinity;
      else if (t - this.softFrom >= BOW_ATTACK.softConfirmMs) {
        this.attack = "soft";
        return [{ kind: "soft" }];
      }
    }
    return [];
  }
  /** Each frame: the attack window closed, the colour stepped (a thumb gone still eases back with no move to say so). */
  tick(t: number): BowEvent[] {
    return this.read(t);
  }
  /** D1056: the colour to sound at t (ms): 0 for a note held under MIN_HOLD_S (the normal stroke). */
  colour(t: number): number {
    const target = this.held(t) ? colourOf(this.speed(t)) : 0;
    this.c = colourStep(this.c, target, (t - this.cT) / 1000, this.attack === "soft" ? BOW.softTau : BOW.riseTau);
    this.cT = t;
    return Math.abs(this.c) < 1e-3 ? 0 : this.c;
  }
  /** D1057: at the lift: a flicked note lifted within SPICC_LIFT_MS ends as a spiccato. */
  lift(t: number): "spicc" | null {
    return this.attack === "bite" && t - this.t0 <= BOW_ATTACK.spiccLiftMs ? "spicc" : null;
  }
}

/** The bow giving way at a join: whether it moves, its direction along its own bar, how long it has been still (ms). */
export interface OutBow {
  moving: boolean;
  dir: -1 | 0 | 1;
  stillMs: number;
  colour: number;
}
/** The bow giving way, read from its tracker at the landing (none: no bow there, today's join). */
export const outBowOf = (b: BowTracker | undefined, t: number): OutBow | null => (b ? { moving: b.moving(t), dir: b.dir, stillMs: b.stillMs(t), colour: b.colour(t) } : null);

/**
 * D1058, A JOIN'S BOW. At the landing: the bow giving way still (or none), "today" (today's join, D427's bow change, decided at
 * once); moving, "pending": the new note enters under the old as a slur (no bite) and is decided once the new thumb's bow has a
 * direction, or JOIN_DECIDE_MS has passed: the same way along its own bar, "carry" (the slur: nothing more); the other way, a bow
 * change as audible as the stall around the turn (the old bow's still time and the new one's time to move); no move by then, a
 * stall's change (a small fresh attack, as today's join).
 */
export function joinOf(out: OutBow | null, inDir: -1 | 0 | 1, sinceMs: number): { kind: "today" } | { kind: "pending" } | { kind: "carry" } | { kind: "change"; aud: number } {
  if (!out || !out.moving || out.dir === 0) return { kind: "today" };
  if (inDir === 0) return sinceMs >= BOW_TURN.joinDecideMs ? { kind: "change", aud: 1 } : { kind: "pending" };
  if (inDir === out.dir) return { kind: "carry" };
  return { kind: "change", aud: turnAudibility(out.stillMs + sinceMs) };
}
