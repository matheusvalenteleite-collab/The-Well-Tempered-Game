/**
 * A real recording in place of the game's sounds (D128): Kimiko Ishizaka's Open Well-Tempered
 * Clavier, Book I (2015, CC0 1.0), one track a piece: beside the page where it is published with
 * them (the claude.ai artifact, under recordings/ishizaka/), else streamed from the Internet Archive,
 * which holds the same 48 tracks (archive.org/details/bach-well-tempered-clavier-book-1); never in
 * the repository. Each track's bar lines are timed (tools/align-recording.py:
 * the score's chroma matched to the recording's by dynamic time warping), so a span of the score,
 * in quarters, plays as the matching stretch of the recording, and the bar being played is known.
 */
import timing from "../../data/recordings/ishizaka-book1.json" with { type: "json" };

const DATA = timing as unknown as { archive: string; files: Record<string, string>; bars: Record<string, number[]> };
const BARS = DATA.bars;

export interface Track {
  /** Where to fetch it, in turn: beside the page, then the Internet Archive. */
  urls: string[];
  /** Seconds of each bar line, the first bar's start to the last bar's end. */
  bars: number[];
}

/** The recording of a piece ("wtc1.05", prelude or fugue), if there is one (Book I only). */
export function trackOf(id: string, prelude: boolean): Track | null {
  const key = `${id.replace(".", "-")}${prelude ? "p" : "f"}`;
  const bars = BARS[key];
  return bars ? { urls: [new URL(`recordings/ishizaka/${key}.mp3`, document.baseURI).href, DATA.archive + encodeURIComponent(DATA.files[key])], bars } : null;
}

/** Quarters from the first bar → seconds in the recording (linear within a bar). */
export function secondsAt(t: Track, q: number, barQ: number): number {
  const b = Math.max(0, Math.min(t.bars.length - 2, Math.floor(q / barQ + 1e-9)));
  const f = Math.max(0, Math.min(1, q / barQ - b));
  return t.bars[b] + f * (t.bars[b + 1] - t.bars[b]);
}

/** Seconds in the recording → quarters from the first bar (linear within a bar). */
export function quartersAt(t: Track, s: number, barQ: number): number {
  const b = barAt(t, s);
  const len = t.bars[b + 1] - t.bars[b];
  return (b + Math.max(0, Math.min(1, len > 0 ? (s - t.bars[b]) / len : 0))) * barQ;
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

  /** The time in the track while it plays, else null. */
  time(): number | null {
    return this.el && !this.el.paused ? this.el.currentTime : null;
  }

  stop() {
    this.token++;
    cancelAnimationFrame(this.raf);
    this.el?.pause();
  }

  /** The first of `urls` that loads (remembered for the next call). */
  private async open(urls: string[], token: number): Promise<HTMLAudioElement | null> {
    if (!this.el) this.el = new Audio();
    const el = this.el;
    if (urls.includes(el.src) && el.readyState >= 1 && !el.error) return el;
    for (const url of urls) {
      if (token !== this.token) return null;
      const ok = await new Promise<boolean>((done) => {
        const fin = (v: boolean) => (el.removeEventListener("loadedmetadata", yes), el.removeEventListener("error", no), done(v));
        const yes = () => fin(true);
        const no = () => fin(false);
        el.addEventListener("loadedmetadata", yes);
        el.addEventListener("error", no);
        el.preload = "auto";
        el.src = url;
        el.load();
      });
      if (ok) return el;
    }
    return null;
  }

  /** Play [from, to) seconds of each stretch in turn; `onTime` gets the time while it plays, `onEnd` once at the end (or never, if stopped). */
  /** The speed (1 = as recorded), the pitch kept; changes at once while it plays. */
  setRate(rate: number) {
    this.rate = Math.max(0.25, Math.min(2, rate));
    if (this.el) this.el.playbackRate = this.rate;
  }
  private rate = 1;

  async play(urls: string[], stretches: [number, number][], onTime: (s: number) => void, onEnd: () => void, volume = 1) {
    this.stop();
    const token = this.token;
    const el = await this.open(urls, token);
    if (!el) {
      if (token === this.token) onEnd();
      return;
    }
    el.volume = Math.max(0, Math.min(1, volume));
    el.preservesPitch = true;
    el.playbackRate = this.rate;
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
