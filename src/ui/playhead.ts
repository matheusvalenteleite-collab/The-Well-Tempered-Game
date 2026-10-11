/**
 * Where the music is, as it plays (D147): a position in quarters from the piece's start, read from
 * the clock that drives the sound (the audio context for the game's sounds, the audio element for
 * a recording), so the score, the roll and the keyboard follow the sound itself rather than timers.
 * The study sets the mapping when it starts a playback; anything drawn reads `pos()` each frame.
 */

/** A stretch of playback: clock seconds [t0, t1) sounding score quarters [q0, q1), linearly. */
export interface Stretch {
  t0: number;
  t1: number;
  q0: number;
  q1: number;
}

type Listener = (active: boolean) => void;

class Playhead {
  private clock: (() => number) | null = null;
  private stretches: Stretch[] = [];
  private custom: (() => number | null) | null = null;
  private listeners = new Set<Listener>();
  /** Quarters per second (for effects that should last a fixed time). */
  rate = 1;
  /** The notes sounding, when only some of the piece is played (a voice's entry alone); else null. */
  only: Set<number> | null = null;

  /** Follow `clock` through `stretches`. */
  start(clock: () => number, stretches: Stretch[], rate: number) {
    this.clock = clock;
    this.stretches = stretches;
    this.custom = null;
    this.rate = rate;
    this.emit(true);
  }

  /** Follow a function of its own (a recording's timings). */
  follow(f: () => number | null, rate: number) {
    this.clock = null;
    this.stretches = [];
    this.custom = f;
    this.rate = rate;
    this.emit(true);
  }

  stop() {
    const was = this.active;
    this.only = null;
    this.clock = null;
    this.custom = null;
    this.stretches = [];
    if (was) this.emit(false);
  }

  get active(): boolean {
    return !!(this.clock || this.custom);
  }

  /** The position now, in quarters, or null (stopped, or between two stretches). */
  pos(): number | null {
    if (this.custom) return this.custom();
    if (!this.clock) return null;
    const t = this.clock();
    for (const s of this.stretches) {
      if (t < s.t0) return null;
      if (t < s.t1) return s.q0 + ((t - s.t0) / (s.t1 - s.t0)) * (s.q1 - s.q0);
    }
    return null;
  }

  /** Called with true when a playback starts and false when it stops. */
  on(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit(active: boolean) {
    for (const l of this.listeners) l(active);
  }
}

export const playhead = new Playhead();

/**
 * Run `frame(pos)` on every animation frame while something plays (and once with null when it
 * stops). Returns the unsubscribe function.
 */
export function onFrames(frame: (pos: number | null) => void): () => void {
  let raf = 0;
  const loop = () => {
    frame(playhead.pos());
    raf = requestAnimationFrame(loop);
  };
  const off = playhead.on((active) => {
    cancelAnimationFrame(raf);
    if (active) raf = requestAnimationFrame(loop);
    else frame(null);
  });
  if (playhead.active) raf = requestAnimationFrame(loop);
  return () => {
    off();
    cancelAnimationFrame(raf);
  };
}
