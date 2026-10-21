/**
 * The 8-bit sound: square-wave notes and a ticking metronome on Web Audio, scheduled on the audio
 * clock so the beat stays steady whatever the screen does.
 */
export class Chip {
  readonly ctx: AudioContext;
  private master: GainNode;

  constructor() {
    // iOS: play through the silent switch (Safari 16.4+), as a game should.
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    try {
      if (nav.audioSession) nav.audioSession.type = "playback";
    } catch {
      /* not supported */
    }
    this.ctx = new AudioContext({ latencyHint: "interactive" });
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  /** Call from a touch: browsers start audio only after the player has touched the page. */
  resume(): Promise<void> {
    return this.ctx.state === "running" ? Promise.resolve() : this.ctx.resume();
  }

  /** The audio clock as the ear hears it (the output's latency taken off), for drawing in sync. */
  heard(): number {
    return this.ctx.currentTime - (this.ctx.outputLatency || this.ctx.baseLatency || 0);
  }

  note(midi: number, at: number, dur: number, gain = 0.22) {
    const t = Math.max(at, this.ctx.currentTime);
    const end = Math.max(t + 0.03, at + dur - 0.012);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square";
    o.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.004);
    g.gain.setValueAtTime(gain * 0.8, Math.max(t + 0.005, end - 0.02));
    g.gain.linearRampToValueAtTime(0, end);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(end + 0.01);
  }

  /** A metronome tick: higher on the bar's first beat. */
  tick(at: number, accent: boolean, gain = 0.12) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "triangle";
    o.frequency.value = accent ? 1760 : 1175;
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    o.connect(g).connect(this.master);
    o.start(at);
    o.stop(at + 0.06);
  }
}
