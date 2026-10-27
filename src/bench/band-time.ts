/**
 * D328, THE LAB's BAND TIME (a prototype; the game keeps FIXED): whether the band follows the player
 * in time. The panel (scratchpad report §§4, 6, 10 "Tempo leadership") split on it: the singer and the
 * pianist want the band to breathe with them, the organist fears a rubbery pulse; the mechanics essay
 * (§3) proposes a small, bounded following. The owner wants to feel it before deciding.
 *
 *   FIXED: today's clock (the written tempo, the final ritard).
 *   WAITS: the pulse is fixed, but at a wait point (the player's first note at or after a cadence
 *     fugue.ts found, the passage's last note when it ends the piece, the first note after a rest in the
 *     player's part when the player has lifted: a breath) the band waits, holding what it sounds, up to
 *     MECH.bandWaitMaxMs, until the player's note; then it goes on from there. No drift elsewhere.
 *   FOLLOWS: WAITS, and the band's tempo follows the player's onsets: each right note's lateness
 *     relative to where the band is (ms) smoothed exponentially (MECH.bandSmooth, the newest onset's
 *     weight), the tempo of each beat set at its start (never changed within a beat) to absorb it, at
 *     most ±MECH.bandBoundPct %. The feedback loop (player late → band slower → player later) is
 *     closed by a cap: the band's drift from the written time by tempo (not by waits) is pulled back
 *     toward it, so that at MECH.bandDriftMaxMs the band no longer gives way in that direction.
 *
 * The clock is kept as segments (from an audio time, at a warped tick, at a speed in ticks a second;
 * a speed of 0 is a wait), so that the engine's tickAt/timeAt are exact across every change and the
 * player is judged against where the band actually is.
 */
import { MECH } from "./mechanics.ts";

export type BandTimeMode = "fixed" | "waits" | "follows";

/** FOLLOWS: a smoothed lateness under this is the player's scatter, not a tempo (ms). */
export const FOLLOW_DEADBAND_MS = 15;
/** FOLLOWS: the share of the (smoothed) lateness a beat's tempo absorbs. */
export const FOLLOW_GAIN = 0.5;
/** A wait shorter than this (the player's scatter at a wait point) is not told or counted (ms). */
export const WAIT_TOLD_MS = 20;

/** Why the band may wait for a note. */
export type WaitKind = "cadence" | "final" | "breath";

export interface WaitPoint {
  /** The player's note's onset (tick). */
  tick: number;
  kind: WaitKind;
  /** pending: not yet reached by the scheduling horizon; armed: the band's notes from here held back; holding: the band waiting; off: no wait (a breath not taken); done. */
  state: "pending" | "armed" | "holding" | "off" | "done";
  /** Sounds held over it (stopped once it is settled). */
  held: { stop: (at?: number) => void; endW: number; extra: number }[];
}

/** What the band did, for the lab's WHAT HAPPENED. */
export type BandEvent = { what: "wait"; tick: number; ms: number; at: WaitKind; expired: boolean } | { what: "tempo"; tick: number; pct: number; driftMs: number };

interface Seg {
  /** From this audio time... */
  t: number;
  /** ...at this warped tick... */
  w: number;
  /** ...at this speed (ticks a second; 0: waiting). */
  tps: number;
}

export interface BandHost {
  warp(tick: number): number;
  unwarp(w: number): number;
  /** The beat (ticks) and the first beat of the passage (the count-in's start). */
  beat: number;
  start: number;
  /** The passage's first note (no following before it). */
  entry: number;
  /** The player's notes at this onset all still unplayed. */
  pendingAt(tick: number): boolean;
  emit(e: BandEvent): void;
}

export interface BandStats {
  waits: { tick: number; kind: WaitKind; ms: number; expired: boolean }[];
  /** The tempo of each beat set (pct), and the drift by tempo after it (ms; + behind the written time). */
  tempi: { tick: number; pct: number; driftMs: number }[];
  maxDriftMs: number;
}

export class BandTime {
  readonly mode: BandTimeMode;
  private segs: Seg[];
  private readonly baseTps: number;
  /** The newest audio time the engine asked about (a wait's provisional end). */
  private lastH = 0;
  private tps: number;
  /** FOLLOWS: the smoothed lateness (ms, + late) not yet absorbed; the drift by tempo (ms, + behind). */
  private err = 0;
  drift = 0;
  /** FOLLOWS: the next beat whose tempo is to be set (unwarped tick). */
  private nextBeat: number;
  private lastPct = 100;
  readonly stats: BandStats = { waits: [], tempi: [], maxDriftMs: 0 };

  readonly host: BandHost;
  readonly waits: WaitPoint[];

  constructor(mode: BandTimeMode, host: BandHost, waits: WaitPoint[], at: { t: number; tick: number; tps: number }) {
    this.mode = mode;
    this.host = host;
    this.waits = waits;
    this.baseTps = at.tps;
    this.tps = at.tps;
    this.segs = [{ t: at.t, w: host.warp(at.tick), tps: at.tps }];
    this.nextBeat = host.start;
  }

  get waitMaxS() {
    return Math.max(0, MECH.bandWaitMaxMs) / 1000;
  }

  /** The warped tick sounding at audio time t. */
  wAt(t: number): number {
    const s = this.segAtTime(t);
    return s.tps === 0 ? s.w : s.w + (t - s.t) * s.tps;
  }
  /** When warped tick w sounds (in a wait: as if the wait ended now). */
  tAtW(w: number): number {
    const ss = this.segs;
    let i = ss.length - 1;
    while (i > 0 && ss[i].w > w) i--;
    const s = ss[i];
    if (s.tps > 0) return s.t + (w - s.w) / s.tps;
    return Math.max(this.lastH, s.t) + (w - s.w) / this.tps;
  }
  private segAtTime(t: number): Seg {
    const ss = this.segs;
    let i = ss.length - 1;
    while (i > 0 && ss[i].t > t) i--;
    return ss[i];
  }
  private push(s: Seg) {
    const last = this.segs.at(-1)!;
    if (s.t < last.t) s.t = last.t;
    if (s.t === last.t && s.w === last.w) this.segs[this.segs.length - 1] = s;
    else this.segs.push(s);
    // Old segments dropped (a touch is never judged seconds late).
    while (this.segs.length > 3 && this.segs[1].t < this.lastH - 8) this.segs.shift();
  }

  /** D308: after a pause the clock starts again from here (waits before it done, those after it unsettled). */
  reset(t: number, tick: number) {
    this.segs = [{ t, w: this.host.warp(tick), tps: this.tps }];
    this.lastH = t;
    this.nextBeat = tick;
    for (const p of this.waits) {
      this.settle(p);
      p.state = p.tick < tick + this.host.beat ? "done" : "pending";
    }
  }

  private holding(): WaitPoint | undefined {
    return this.waits.find((p) => p.state === "holding");
  }

  /** Each frame, before the clock is read: a wait begun where the band reached an armed point, or ended at its longest. */
  frame(h: number) {
    this.lastH = Math.max(this.lastH, h);
    const hp = this.holding();
    if (hp) {
      const s = this.segs.at(-1)!;
      if (h - s.t >= this.waitMaxS) this.resume(hp, s.t + this.waitMaxS, true);
      return;
    }
    const p = this.waits.find((x) => x.state === "armed");
    if (!p) return;
    const w = this.host.warp(p.tick);
    if (!this.host.pendingAt(p.tick)) return this.done(p);
    if (this.wAt(h) < w) return;
    this.push({ t: this.tAtW(w), w, tps: 0 });
    p.state = "holding";
    if (this.waitMaxS <= 0) this.resume(p, this.segs.at(-1)!.t, true);
  }

  private resume(p: WaitPoint, t: number, expired: boolean) {
    const s = this.segs.at(-1)!;
    const at = Math.max(t, s.t);
    const ms = (at - s.t) * 1000;
    this.push({ t: at, w: s.w, tps: this.tps });
    p.state = "done";
    this.settle(p);
    if (ms >= WAIT_TOLD_MS) {
      this.stats.waits.push({ tick: p.tick, kind: p.kind, ms, expired });
      this.host.emit({ what: "wait", tick: p.tick, ms, at: p.kind, expired });
    }
  }
  private done(p: WaitPoint) {
    p.state = "done";
    this.settle(p);
  }
  /** A settled point's held sounds stopped where they end now (after the wait, if there was one). */
  private settle(p: WaitPoint) {
    for (const x of p.held) x.stop(this.tAtW(x.endW) + x.extra);
    p.held = [];
  }

  /**
   * Before the band's notes are scheduled up to `horizon` (tick): the wait points it reaches armed (a
   * breath only when the player has lifted: no thumb down) or let go; the tempo of each beat it reaches
   * set (FOLLOWS). Returns the horizon held short of an armed point.
   */
  plan(horizon: number, thumbsDown: boolean): number {
    let cap = horizon;
    for (const p of this.waits) {
      if (p.state === "done" || p.state === "off") continue;
      if (p.state === "pending") {
        if (p.tick > horizon) break;
        if (!this.host.pendingAt(p.tick)) {
          this.done(p);
          continue;
        }
        if (p.kind === "breath" && thumbsDown) {
          p.state = "off";
          this.settle(p);
          continue;
        }
        p.state = "armed";
      }
      cap = Math.min(cap, p.tick - 1);
      break;
    }
    if (this.mode === "follows" && !this.holding()) this.tempo(cap);
    return cap;
  }

  /** FOLLOWS: each beat's tempo set as the horizon reaches it (from where the band will be then). */
  private tempo(upTo: number) {
    const b = Math.max(0, MECH.bandBoundPct) / 100;
    const cap = Math.max(1, MECH.bandDriftMaxMs);
    while (this.nextBeat <= upTo) {
      const B = this.nextBeat;
      this.nextBeat += this.host.beat;
      if (B < this.host.entry) continue;
      const wB = this.host.warp(B);
      const beatMs = ((this.host.warp(B + this.host.beat) - wB) / this.baseTps) * 1000;
      const lag = Math.sign(this.err) * Math.max(0, Math.abs(this.err) - FOLLOW_DEADBAND_MS) * FOLLOW_GAIN;
      const follow = beatMs / Math.max(beatMs * 0.5, beatMs + lag);
      const pull = Math.max(-1, Math.min(1, this.drift / cap)) * b;
      let r = Math.max(1 - b, Math.min(1 + b, Math.max(1 - b, Math.min(1 + b, follow)) + pull));
      // Never past the cap in the direction it already lies.
      if (this.drift >= cap) r = Math.max(r, 1);
      if (this.drift <= -cap) r = Math.min(r, 1);
      const tps = this.baseTps * r;
      if (Math.abs(tps - this.tps) > 1e-9) {
        this.push({ t: this.tAtW(wB), w: wB, tps });
        this.tps = tps;
      }
      // The beat at this tempo: the band that much further behind the written time, the lateness absorbed.
      const delta = beatMs * (1 / r - 1);
      this.drift += delta;
      this.err -= delta;
      this.stats.maxDriftMs = Math.max(this.stats.maxDriftMs, Math.abs(this.drift));
      const pct = Math.round(r * 100);
      this.stats.tempi.push({ tick: B, pct: r * 100, driftMs: this.drift });
      if (Math.abs(pct - this.lastPct) >= 2 || (pct === 100 && this.lastPct !== 100)) {
        this.lastPct = pct;
        this.host.emit({ what: "tempo", tick: B, pct, driftMs: this.drift });
      }
    }
  }

  /**
   * A note of the player's struck at audio time `t` (right or wrong): a wait at its onset ends here; a
   * right note away from the wait points gives the follower its lateness relative to the band.
   */
  struck(tick: number, t: number, ok: boolean) {
    const p = this.waits.find((x) => x.tick === tick && (x.state === "armed" || x.state === "holding" || x.state === "pending"));
    if (p) {
      if (p.state === "holding") this.resume(p, t, false);
      else this.done(p);
      return;
    }
    if (this.waits.some((x) => x.tick === tick)) return;
    if (this.mode !== "follows" || !ok || tick < this.host.entry) return;
    const e = (t - this.tAtW(this.host.warp(tick))) * 1000;
    if (Math.abs(e) > 300) return;
    const a = Math.max(0, Math.min(1, MECH.bandSmooth));
    this.err += a * (e - this.err);
  }

  /** The wait point a sound from `on` to `end` (ticks) holds over, if one may still wait there (else -1). */
  crossing(on: number, end: number): number {
    return this.waits.findIndex((p) => on < p.tick && end >= p.tick && (p.state === "pending" || p.state === "armed"));
  }
  /** A sound held over wait point `i`, scheduled `waitMaxS` longer: stopped where it ends once the point is settled. */
  hold(i: number, sd: { stop: (at?: number) => void }, endTick: number, extra: number) {
    this.waits[i]?.held.push({ stop: (at) => sd.stop(at), endW: this.host.warp(endTick), extra });
  }
}

/**
 * The wait points of a passage: the player's first struck note at or after each cadence (within a
 * bar), the last note when the passage ends the piece, and each struck note after a rest of at least
 * half a beat in the player's part (or the passage's first note after a beat or more of rests).
 */
export function waitPoints(
  notes: readonly { on: number; dur: number; ride?: boolean }[],
  cadences: readonly { on: number }[],
  o: { from: number; until: number; beat: number; barTicks: number; endsPiece: boolean },
): WaitPoint[] {
  const struck = notes.filter((n, i) => !n.ride && !(i > 0 && notes[i - 1].on === n.on) && n.on >= o.from && n.on < o.until);
  const at = new Map<number, WaitKind>();
  const rank: Record<WaitKind, number> = { cadence: 3, final: 2, breath: 1 };
  const put = (tick: number, k: WaitKind) => {
    const was = at.get(tick);
    if (!was || rank[k] > rank[was]) at.set(tick, k);
  };
  for (const c of cadences) {
    if (c.on < o.from || c.on >= o.until) continue;
    const n = struck.find((x) => x.on >= c.on);
    if (n && n.on <= c.on + o.barTicks) put(n.on, "cadence");
  }
  if (o.endsPiece && struck.length) put(struck.at(-1)!.on, "final");
  struck.forEach((n, j) => {
    // The end of what sounds before (the chord's longest note), the rest after it.
    let end = o.from;
    for (const x of notes) if (x.on < n.on) end = Math.max(end, x.on + x.dur);
    const gap = n.on - end;
    if (j === 0 ? gap >= o.beat : gap >= o.beat / 2) put(n.on, "breath");
  });
  return [...at.entries()].sort((a, b) => a[0] - b[0]).map(([tick, kind]) => ({ tick, kind, state: "pending", held: [] }));
}
