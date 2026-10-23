/**
 * D215, experiment E3, WITH ISHIZAKA: Kimiko Ishizaka's recording (The Open Well-Tempered Clavier,
 * 2015, CC0) played under the game, on the chip's own audio clock, so that it and the game's voices
 * keep one time: the track is decoded once (one fugue at a time; released on quitting), started with
 * start(when, offset) at the passage's first tick (or, decoded late, where the game is by then), and
 * faded by the run (her-clock.ts HerFade): silent below a run of eight, up to most of the sound by a
 * run of thirty-two, the game's other voices giving way to her; a slip sends her out within 150 ms
 * and for two bars. The latency (chip.lag) needs nothing of its own: she is scheduled on the audio
 * clock as the game's notes are, and heard as late as they are.
 */
import type { Chip } from "../touch/chip.ts";
import { trackOf } from "../audio/recording.ts";
import { FADE, HerFade, othersLevel, secAt, type HerMap } from "./her-clock.ts";
import type { ProtoGame } from "./proto-game.ts";

/** Her level at the peak of the fade, as a gain into the limiter (against the game's master at 0.4). */
export const HER_GAIN = 0.7;

/** Where her track may be fetched, in turn (beside the page, then the Internet Archive). */
export function herUrls(m: HerMap): string[] {
  const n = /^wtc1-(\d\d)f$/.exec(m.key)?.[1];
  return n ? (trackOf(`wtc1.${n}`, false)?.urls ?? []) : [];
}

type Loading = { key: string; ctx: BaseAudioContext; buffer: AudioBuffer | null; state: "loading" | "ready" | "failed"; done: Promise<AudioBuffer | null> };
let loading: Loading | null = null;

/** Her track decoded (once; the last asked for only), or null if it cannot be had. */
export function loadHer(m: HerMap, ctx: BaseAudioContext): Promise<AudioBuffer | null> {
  if (loading && loading.key === m.key && loading.ctx === ctx) return loading.done;
  const l: Loading = { key: m.key, ctx, buffer: null, state: "loading", done: Promise.resolve(null) };
  loading = l;
  l.done = (async () => {
    for (const url of herUrls(m)) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        if (buf.duration < 5) continue;
        l.buffer = buf;
        l.state = "ready";
        return buf;
      } catch {
        /* the next */
      }
    }
    l.state = "failed";
    return null;
  })();
  return l.done;
}

/** Where her track stands: not asked for, loading, ready, or not to be had. */
export function herState(m: HerMap | null): "none" | "loading" | "ready" | "failed" {
  if (!m || !loading || loading.key !== m.key) return "none";
  return loading.state;
}

/** Her decoded track let go (quitting): decoded again next time. */
export function releaseHer() {
  loading = null;
}

/** One game's playing of her track. */
export class Her {
  readonly fade = new HerFade();
  private src: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private stopped = false;
  private level = 0;
  /** When she started (the audio clock) and where in her track (s); for the measurements. */
  startedAt: { when: number; offset: number; tick: number } | null = null;

  private readonly chip: Chip;
  private readonly m: HerMap;
  constructor(chip: Chip, m: HerMap) {
    this.chip = chip;
    this.m = m;
  }

  /** One frame: started once the track is ready (at the passage's first tick, or where the game is), then faded by the run. */
  frame(g: ProtoGame, buf: AudioBuffer | null) {
    if (this.stopped) return;
    const ctx = this.chip.ctx;
    if (!this.src && buf) this.begin(g, buf);
    const { level, slipped } = this.fade.update({ now: g.now, combo: g.combo, slips: g.slips, hits: g.hits, barTicks: g.f.barTicks });
    if (!this.gain) return;
    if (slipped || Math.abs(level - this.level) > 0.004) {
      const down = level < this.level;
      const tc = down && slipped ? FADE.dropTc : down ? 0.25 : FADE.riseTc;
      this.gain.gain.setTargetAtTime(level * HER_GAIN, ctx.currentTime, tc);
      this.chip.others.gain.setTargetAtTime(othersLevel(level), ctx.currentTime, down ? Math.min(tc, 0.1) : tc);
      this.level = level;
    }
  }

  private begin(g: ProtoGame, buf: AudioBuffer) {
    const ctx = this.chip.ctx;
    // At the passage's first tick, or (decoded late) a moment from now, where the game will be then.
    let when = g.timeAt(g.entry);
    let tick = g.entry;
    if (when < ctx.currentTime + 0.05) {
      when = ctx.currentTime + 0.05;
      tick = g.tickAtTime(when);
    }
    const offset = secAt(this.m, tick);
    if (offset >= buf.duration - 0.1) return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gain).connect(this.chip.recIn);
    src.start(when, Math.max(0, offset));
    src.onended = () => {
      src.disconnect();
      gain.disconnect();
    };
    this.src = src;
    this.gain = gain;
    this.startedAt = { when, offset, tick };
  }

  /** Where her track is now on the audio clock (s), for the measurements; null before she starts. */
  position(): number | null {
    const s = this.startedAt;
    if (!s) return null;
    return s.offset + Math.max(0, this.chip.ctx.currentTime - s.when);
  }

  /** Out at once (the game paused, the tab hidden), back no sooner than two bars on. */
  hush(g: ProtoGame) {
    this.fade.hush(g.now, g.f.barTicks);
    const t = this.chip.ctx.currentTime;
    this.gain?.gain.setTargetAtTime(0, t, FADE.dropTc);
    this.chip.others.gain.setTargetAtTime(1, t, 0.05);
    this.level = 0;
  }

  /** The end, a quit: she fades out and her node is let go; the others back to their level. */
  stop(fadeS = 0.5) {
    if (this.stopped) return;
    this.stopped = true;
    const t = this.chip.ctx.currentTime;
    this.chip.others.gain.setTargetAtTime(1, t, 0.1);
    if (!this.src || !this.gain) return;
    this.gain.gain.setTargetAtTime(0, t, fadeS / 4);
    try {
      this.src.stop(t + fadeS + 0.1);
    } catch {
      /* not started */
    }
  }
}
