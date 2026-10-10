/**
 * Real recordings in place of the game's sounds (D128, D131), streamed, never in the repository:
 *   - Book I: Kimiko Ishizaka, The Open Well-Tempered Clavier (2015, CC0 1.0), one track a piece:
 *     beside the page where it is published with them (the claude.ai artifact, under
 *     recordings/ishizaka/), else from the Internet Archive (bach-well-tempered-clavier-book-1);
 *   - Book II: Arthur Loesser (1964, Internet Archive, CC BY-NC-ND 3.0, streamed unaltered), one
 *     track a prelude and its fugue.
 * Each bar line is timed in the order played (tools/align-recording*.py: the score's chroma matched
 * to the recording's by dynamic time warping; a repeated section appears twice), so a span of the
 * score, in quarters, plays as the matching stretch of the recording, and the bar playing is known.
 */
import ishizaka from "../../data/recordings/ishizaka-book1.json" with { type: "json" };
import loesser from "../../data/recordings/loesser-book2.json" with { type: "json" };

type Timing = number[] | { t: number[]; b: number[] };
interface Source {
  performer: string;
  licence: string;
  archive: string;
  files: Record<string, string>;
  bars: Record<string, Timing>;
  /** Where the tracks may also lie beside the page. */
  local?: string;
}
const SOURCES: Source[] = [
  { ...(ishizaka as unknown as Source), local: "recordings/ishizaka/" },
  loesser as unknown as Source,
];

export interface Track {
  performer: string;
  licence: string;
  /** Where to fetch it, in turn. */
  urls: string[];
  /** The bar lines in the order played (seconds), and the bar each begins (0-based). */
  t: number[];
  b: number[];
}

/** The recording of a piece ("wtc1.05", prelude or fugue), if there is one. */
export function trackOf(id: string, prelude: boolean): Track | null {
  const key = `${id.replace(".", "-")}${prelude ? "p" : "f"}`;
  for (const s of SOURCES) {
    const tm = s.bars[key];
    if (!tm) continue;
    const t = Array.isArray(tm) ? tm : tm.t;
    const b = Array.isArray(tm) ? tm.slice(0, -1).map((_, i) => i) : tm.b;
    const urls = [...(s.local ? [new URL(`${s.local}${key}.mp3`, typeof document === "undefined" ? "http://localhost/" : document.baseURI).href] : []), s.archive + encodeURIComponent(s.files[key])];
    return { performer: s.performer, licence: s.licence, urls, t, b };
  }
  return null;
}

/** Quarters from the first bar → seconds in the recording (the bar's first time through; linear within it). The piece's end is the last bar line played. */
export function secondsAt(tr: Track, q: number, barQ: number, end = Infinity): number {
  if (q >= end - 1e-6) return tr.t[tr.t.length - 1];
  const bar = Math.floor(q / barQ + 1e-9);
  let k = tr.b.indexOf(bar);
  if (k < 0) k = bar < tr.b[0] ? 0 : tr.b.length - 1;
  const f = Math.max(0, Math.min(1, q / barQ - tr.b[k]));
  return tr.t[k] + f * (tr.t[k + 1] - tr.t[k]);
}

/** Seconds in the recording → the bar (0-based) being played. */
export function barAt(tr: Track, s: number): number {
  let k = 0;
  while (k + 1 < tr.b.length && tr.t[k + 1] <= s) k++;
  return tr.b[k];
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
  async play(urls: string[], stretches: [number, number][], onTime: (s: number) => void, onEnd: () => void, volume = 1) {
    this.stop();
    const token = this.token;
    const el = await this.open(urls, token);
    if (!el) {
      if (token === this.token) onEnd();
      return;
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
