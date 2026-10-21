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

  private keepAlive: HTMLAudioElement | null = null;

  /**
   * Call from a finished tap, a click or a key: browsers start audio only then. On an iPhone it also
   * starts a silent looping <audio>, which moves the page's sound to the media channel, so the ring/
   * silent switch does not mute the game (older iOS, without audioSession).
   */
  resume(): Promise<void> {
    if (!this.keepAlive && typeof Audio !== "undefined" && navigator.maxTouchPoints > 0) {
      try {
        const a = new Audio(silentWav());
        a.loop = true;
        a.setAttribute("playsinline", "");
        void a.play().catch(() => {});
        this.keepAlive = a;
      } catch {
        /* no <audio>: the switch may mute the game */
      }
    }
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

/** A tenth of a second of silence as a WAV (16-bit mono, 8 kHz), as a blob URL. */
function silentWav(): string {
  const samples = 800;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const str = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true);
  v.setUint32(28, 16000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
