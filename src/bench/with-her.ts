/**
 * D216, KIMIKO: Kimiko Ishizaka's recording (The Open Well-Tempered Clavier, 2015, CC0) as the only
 * accompaniment, at full level from the start, on the chip's own audio clock, so that it and the
 * player's notes keep one time. The track is fetched (beside the page, else the Internet Archive) and
 * decoded once (one fugue at a time), kept as one mono channel (half the memory of the stereo decode:
 * I/8 is five and a half minutes), released on quitting. It starts with the game's count-in: at the
 * passage's first tick it is exactly where her map (her-clock.ts) puts that tick, so before it, from
 * a mid-piece start, the bar she plays before is the lead-in. The latency (chip.lag) needs nothing of
 * its own: she is scheduled on the audio clock as the game's notes are, and heard as late as they are.
 */
import type { Chip } from "../touch/chip.ts";
import { trackOf } from "../audio/recording.ts";
import { secAt, type HerMap } from "./her-clock.ts";
import type { ProtoGame } from "./proto-game.ts";

/** Her level, as a gain into the limiter (against the game's master at 0.4): she leads. */
export const HER_GAIN = 0.8;
/** How long she fades out: the run lost (the crowd gone), a quit, the end (her last chord rings on). */
export const HER_FADE = { fail: 1, quit: 0.3, end: 3 };

/** Where her track may be fetched, in turn (beside the page, then the Internet Archive). */
export function herUrls(m: HerMap): string[] {
  const n = /^wtc1-(\d\d)f$/.exec(m.key)?.[1];
  return n ? (trackOf(`wtc1.${n}`, false)?.urls ?? []) : [];
}

/** A decoded track folded to one channel (the channels' mean), so the stereo decode can be let go. */
export function mono(ctx: BaseAudioContext, buf: AudioBuffer): AudioBuffer {
  if (buf.numberOfChannels <= 1) return buf;
  const out = ctx.createBuffer(1, buf.length, buf.sampleRate);
  const o = out.getChannelData(0);
  const k = 1 / buf.numberOfChannels;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) o[i] += d[i] * k;
  }
  return out;
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
        const one = mono(ctx, buf);
        if (loading !== l) return null;
        l.buffer = one;
        l.state = "ready";
        return one;
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

/** Her decoded track, if ready. */
export function herBuffer(m: HerMap | null): AudioBuffer | null {
  return m && loading && loading.key === m.key ? loading.buffer : null;
}

/** Her decoded track let go (quitting): decoded again next time. */
export function releaseHer() {
  loading = null;
}

/** One game's playing of her track. */
export class Her {
  private src: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private stopped = false;
  /** When she started (the audio clock) and where in her track (s); for the measurements. */
  startedAt: { when: number; offset: number } | null = null;

  private readonly chip: Chip;
  private readonly m: HerMap;
  constructor(chip: Chip, m: HerMap) {
    this.chip = chip;
    this.m = m;
  }

  /**
   * Her track scheduled with the game's count-in: at the passage's first tick (g.entry) she is at her
   * time for it, so before it she plays her own lead-in (from the start of the piece: her silence).
   * Started late (the game already going), she starts a moment on, where the game will be then.
   */
  begin(g: ProtoGame, buf: AudioBuffer) {
    if (this.src || this.stopped) return;
    const ctx = this.chip.ctx;
    const atEntry = g.timeAt(g.entry);
    let when = Math.max(ctx.currentTime + 0.05, g.timeAt(g.start));
    let offset = when >= atEntry ? secAt(this.m, g.tickAtTime(when)) : secAt(this.m, g.entry) - (atEntry - when);
    if (offset < 0) (when -= offset), (offset = 0);
    if (offset >= buf.duration - 0.1) return;
    const gain = ctx.createGain();
    gain.gain.value = HER_GAIN;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gain).connect(this.chip.recIn);
    src.start(when, offset);
    src.onended = () => {
      src.disconnect();
      gain.disconnect();
    };
    this.src = src;
    this.gain = gain;
    this.startedAt = { when, offset };
  }

  /** Where her track is now on the audio clock (s), for the measurements; null before she starts. */
  position(): number | null {
    const s = this.startedAt;
    if (!s) return null;
    return s.offset + Math.max(0, this.chip.ctx.currentTime - s.when);
  }

  /** The end, a lost run, a quit: she fades out over `fadeS` and her node is let go. */
  stop(fadeS = HER_FADE.quit) {
    if (this.stopped) return;
    this.stopped = true;
    if (!this.src || !this.gain) return;
    const t = this.chip.ctx.currentTime;
    const g = this.gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(HER_GAIN, t);
    g.linearRampToValueAtTime(0, t + fadeS);
    try {
      this.src.stop(t + fadeS + 0.05);
    } catch {
      /* not started */
    }
  }
}
