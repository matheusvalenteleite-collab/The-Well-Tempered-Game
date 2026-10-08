/**
 * Audio: sampled church organ (smplr Soundfont, MusyngKite kit, loaded over the network).
 * Created lazily on a user gesture (browser autoplay policy). If the samples cannot be
 * loaded the game stays usable and reports the failure; it never substitutes a synthetic sound silently.
 */
import { Soundfont } from "smplr";

export type AudioStatus = "idle" | "loading" | "ready" | "failed";

export interface PlaybackColumn {
  cantus: string;
  counterpoint: string | null;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private organ: Soundfont | null = null;
  private loading: Promise<void> | null = null;
  private timers: number[] = [];
  status: AudioStatus = "idle";
  error: string | null = null;
  onStatus: (s: AudioStatus) => void = () => {};

  /** Must be called from a user gesture. */
  init(): Promise<void> {
    if (this.loading) return this.loading;
    this.setStatus("loading");
    this.ctx = new AudioContext();
    this.organ = new Soundfont(this.ctx, { instrument: "church_organ", kit: "MusyngKite" });
    this.loading = this.organ.load.then(
      () => this.setStatus("ready"),
      (e: unknown) => {
        this.error = String(e);
        this.setStatus("failed");
      },
    );
    return this.loading;
  }

  private setStatus(s: AudioStatus) {
    this.status = s;
    this.onStatus(s);
  }

  /** Sound one vertical sonority. */
  async playColumn(col: PlaybackColumn, seconds = 1.4): Promise<void> {
    await this.init();
    if (this.status !== "ready" || !this.ctx || !this.organ) return;
    if (this.ctx.state === "suspended") await this.ctx.resume();
    const t = this.ctx.currentTime + 0.01;
    for (const note of [col.cantus, col.counterpoint]) if (note) this.organ.start({ note, time: t, duration: seconds, velocity: 80 });
  }

  /**
   * Play all columns in time. `halfNoteBpm` is the alla-breve pulse; each column is a whole note.
   * `onColumn(k)` fires as column k sounds (and with -1 at the end).
   */
  async playAll(cols: PlaybackColumn[], halfNoteBpm: number, onColumn: (k: number) => void): Promise<void> {
    await this.init();
    this.stop();
    if (this.status !== "ready" || !this.ctx || !this.organ) return;
    if (this.ctx.state === "suspended") await this.ctx.resume();
    const whole = (2 * 60) / halfNoteBpm;
    const t0 = this.ctx.currentTime + 0.1;
    cols.forEach((c, k) => {
      for (const note of [c.cantus, c.counterpoint]) if (note) this.organ!.start({ note, time: t0 + k * whole, duration: whole * 0.97, velocity: 80 });
      this.timers.push(window.setTimeout(() => onColumn(k), (0.1 + k * whole) * 1000));
    });
    this.timers.push(window.setTimeout(() => onColumn(-1), (0.1 + cols.length * whole) * 1000));
  }

  stop(): void {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    this.organ?.stop();
  }
}
