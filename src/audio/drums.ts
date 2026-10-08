/**
 * A small synthesized drum machine. One bar of counterpoint (a whole note) is divided into
 * eight steps: kick on 1 and 5, snare on 3 and 7, closed hi-hat on every step with an open hat
 * on the last, a crash on the very first bar, a tom fill before the final bar, and a closing hit.
 */
export type DrumVoice = "kick" | "snare" | "hat" | "openhat" | "crash" | "tomHigh" | "tomLow";

export function patternFor(bar: number, totalBars: number): DrumVoice[][] {
  const steps: DrumVoice[][] = Array.from({ length: 8 }, () => []);
  if (bar === totalBars - 1) {
    steps[0].push("kick", "crash");
    return steps;
  }
  for (let s = 0; s < 8; s++) steps[s].push(s === 7 ? "openhat" : "hat");
  steps[0].push("kick");
  steps[4].push("kick");
  steps[2].push("snare");
  steps[6].push("snare");
  if (bar === 0) steps[0].push("crash");
  if (bar === totalBars - 2) {
    steps[5].push("tomHigh");
    steps[6].push("tomHigh");
    steps[7].push("tomLow");
  }
  return steps;
}

export class DrumMachine {
  private ctx: BaseAudioContext;
  private out: GainNode;
  private noise: AudioBuffer;
  private live = new Set<AudioScheduledSourceNode>();

  constructor(ctx: BaseAudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.55;
    this.out.connect(destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  private track<T extends AudioScheduledSourceNode>(n: T): T {
    this.live.add(n);
    n.onended = () => this.live.delete(n);
    return n;
  }

  private env(t: number, peak: number, decay: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0008, t + decay);
    g.connect(this.out);
    return g;
  }

  private tone(t: number, f0: number, f1: number, decay: number, peak: number, type: OscillatorType = "sine") {
    const o = this.track(this.ctx.createOscillator());
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + decay * 0.6);
    o.connect(this.env(t, peak, decay));
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  private hiss(t: number, filter: BiquadFilterType, freq: number, decay: number, peak: number) {
    const src = this.track(this.ctx.createBufferSource());
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    src.connect(f).connect(this.env(t, peak, decay));
    src.start(t);
    src.stop(t + decay + 0.05);
  }

  hit(v: DrumVoice, t: number) {
    switch (v) {
      case "kick": return this.tone(t, 150, 42, 0.38, 1);
      case "snare": this.hiss(t, "bandpass", 1900, 0.2, 0.7); return this.tone(t, 220, 160, 0.12, 0.4, "triangle");
      case "hat": return this.hiss(t, "highpass", 7500, 0.05, 0.28);
      case "openhat": return this.hiss(t, "highpass", 7000, 0.28, 0.25);
      case "crash": return this.hiss(t, "highpass", 4500, 1.4, 0.35);
      case "tomHigh": return this.tone(t, 260, 170, 0.25, 0.7);
      case "tomLow": return this.tone(t, 170, 105, 0.3, 0.8);
    }
  }

  /** Schedule the pattern of bar `bar` starting at time `t`, a bar lasting `barSeconds`. */
  scheduleBar(t: number, barSeconds: number, bar: number, totalBars: number) {
    patternFor(bar, totalBars).forEach((voices, s) => {
      for (const v of voices) this.hit(v, t + (s * barSeconds) / 8);
    });
  }

  stop() {
    for (const n of this.live) n.stop();
    this.live.clear();
  }
}
