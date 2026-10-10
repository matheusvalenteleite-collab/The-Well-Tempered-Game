/**
 * A real recording in place of the game's sounds (D128): Kimiko Ishizaka's Open Well-Tempered
 * Clavier, Book I (2015, CC0 1.0), one track a piece, published beside the page (not in the
 * repository) under recordings/ishizaka/. Each track's bar lines are timed (tools/align-recording.py:
 * the score's chroma matched to the recording's by dynamic time warping), so a span of the score,
 * in quarters, plays as the matching stretch of the recording, and the bar being played is known.
 */
import timing from "../../data/recordings/ishizaka-book1.json" with { type: "json" };

const BARS = (timing as unknown as { bars: Record<string, number[]> }).bars;

export interface Track {
  url: string;
  /** Seconds of each bar line, the first bar's start to the last bar's end. */
  bars: number[];
}

/** The recording of a piece ("wtc1.05", prelude or fugue), if there is one (Book I only). */
export function trackOf(id: string, prelude: boolean): Track | null {
  const key = `${id.replace(".", "-")}${prelude ? "p" : "f"}`;
  const bars = BARS[key];
  return bars ? { url: new URL(`recordings/ishizaka/${key}.mp3`, document.baseURI).href, bars } : null;
}

/** Quarters from the first bar → seconds in the recording (linear within a bar). */
export function secondsAt(t: Track, q: number, barQ: number): number {
  const b = Math.max(0, Math.min(t.bars.length - 2, Math.floor(q / barQ + 1e-9)));
  const f = Math.max(0, Math.min(1, q / barQ - b));
  return t.bars[b] + f * (t.bars[b + 1] - t.bars[b]);
}

/** Seconds in the recording → the bar (0-based) being played. */
export function barAt(t: Track, s: number): number {
  let b = 0;
  while (b + 1 < t.bars.length - 1 && t.bars[b + 1] <= s) b++;
  return b;
}

/** One audio element for the page: plays stretches of a track, one after another, with a breath between. */
class Player {
  private el: HTMLAudioElement | null = null;
  private raf = 0;
  private token = 0;

  stop() {
    this.token++;
    cancelAnimationFrame(this.raf);
    this.el?.pause();
  }

  /** Play [from, to) seconds of each stretch in turn; `onTime` gets the time while it plays, `onEnd` once at the end (or never, if stopped). */
  async play(url: string, stretches: [number, number][], onTime: (s: number) => void, onEnd: () => void, volume = 1) {
    this.stop();
    const token = this.token;
    if (!this.el) this.el = new Audio();
    const el = this.el;
    if (el.src !== url) {
      el.src = url;
      el.preload = "auto";
    }
    el.volume = Math.max(0, Math.min(1, volume));
    for (const [from, to] of stretches) {
      if (token !== this.token) return;
      el.currentTime = from;
      try {
        await el.play();
      } catch {
        if (token === this.token) onEnd();
        return;
      }
      await new Promise<void>((done) => {
        const tick = () => {
          if (token !== this.token) return done();
          onTime(el.currentTime);
          if (el.currentTime >= to || el.ended) {
            el.pause();
            return done();
          }
          this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
      });
      if (token !== this.token) return;
      await new Promise((r) => setTimeout(r, 400));
    }
    if (token === this.token) onEnd();
  }
}

export const recording = new Player();
