/**
 * The 8-bit sound: square-wave notes and a ticking metronome on Web Audio, scheduled on the audio
 * clock so the beat stays steady whatever the screen does.
 */
export class Chip {
  readonly ctx: AudioContext;
  private master: GainNode;

  private waves = new Map<string, PeriodicWave>();

  /**
   * The voices' timbres, as on the NES (D163): the soprano a thin pulse (12.5%), the alto a fuller one
   * (25%), the bass a triangle.
   */
  private wave(voice: number): PeriodicWave | "triangle" {
    if (voice === 2) return "triangle";
    const duty = voice === 0 ? 0.125 : 0.25;
    const key = String(duty);
    let w = this.waves.get(key);
    if (!w) {
      const N = 40;
      const real = new Float32Array(N);
      const imag = new Float32Array(N);
      for (let n = 1; n < N; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
      w = this.ctx.createPeriodicWave(real, imag);
      this.waves.set(key, w);
    }
    return w;
  }

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

  /** A note from `at` for `dur` seconds; stop() cuts it short (the thumb let go). */
  note(midi: number, at: number, dur: number, voice = 1): { stop: (at?: number) => void } {
    // The triangle is quieter than the pulses at the same amplitude.
    const gain = voice === 2 ? 0.34 : voice === 0 ? 0.2 : 0.18;
    const t = Math.max(at, this.ctx.currentTime);
    const end = Math.max(t + 0.03, at + dur - 0.012);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const w = this.wave(voice);
    if (w === "triangle") o.type = "triangle";
    else o.setPeriodicWave(w);
    o.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.004);
    g.gain.setValueAtTime(gain * 0.8, Math.max(t + 0.005, end - 0.02));
    g.gain.linearRampToValueAtTime(0, end);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(end + 0.01);
    let stopped = false;
    return {
      stop: (when = this.ctx.currentTime) => {
        if (stopped || when >= end) return;
        stopped = true;
        const s = Math.max(when, t + 0.02);
        g.gain.cancelScheduledValues(s);
        g.gain.setValueAtTime(gain * 0.8, s);
        g.gain.linearRampToValueAtTime(0, s + 0.015);
        o.stop(s + 0.03);
      },
    };
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
