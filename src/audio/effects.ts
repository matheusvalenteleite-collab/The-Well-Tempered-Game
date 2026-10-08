/**
 * Per-voice effects: a delay with five characters and a convolution reverb whose impulse
 * responses are generated (no downloaded files).
 *
 * input ─┬─ dry ─────────────────────────────┐
 *        ├─ delay send ─ delay network ──────┼─▶ destination
 *        └─ reverb send ─ convolver ─────────┘
 */
import type { DelayMode, ReverbMode, SynthSettings } from "./synth-settings.ts";

interface IrShape {
  seconds: number;
  /** Time constant of the decay. */
  decay: number;
  /** 0 dark .. 1 bright. */
  brightness: number;
  predelay: number;
  /** Add the "boing" of a spring tank. */
  spring?: boolean;
}

const IR: Record<Exclude<ReverbMode, "off">, IrShape> = {
  room: { seconds: 0.8, decay: 0.25, brightness: 0.7, predelay: 0.004 },
  hall: { seconds: 2.6, decay: 0.8, brightness: 0.5, predelay: 0.02 },
  cathedral: { seconds: 6, decay: 2.1, brightness: 0.32, predelay: 0.045 },
  plate: { seconds: 2.2, decay: 0.65, brightness: 0.95, predelay: 0 },
  spring: { seconds: 1.8, decay: 0.55, brightness: 0.6, predelay: 0.008, spring: true },
};

const irCache = new WeakMap<BaseAudioContext, Map<ReverbMode, AudioBuffer>>();

function impulse(ctx: BaseAudioContext, mode: Exclude<ReverbMode, "off">): AudioBuffer {
  let byMode = irCache.get(ctx);
  if (!byMode) irCache.set(ctx, (byMode = new Map()));
  const hit = byMode.get(mode);
  if (hit) return hit;
  const shape = IR[mode];
  const sr = ctx.sampleRate;
  const len = Math.ceil(shape.seconds * sr);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    let energy = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      if (t < shape.predelay) continue;
      const env = Math.exp(-(t - shape.predelay) / shape.decay);
      // Later reflections are darker: the low-pass closes as the tail decays.
      const k = Math.min(0.98, (1 - shape.brightness) * 0.6 + (t / shape.seconds) * 0.35);
      lp = lp * k + (Math.random() * 2 - 1) * (1 - k);
      let x = lp * env;
      if (shape.spring) x *= 1 + 0.7 * Math.sin(2 * Math.PI * (35 + 400 * Math.exp(-t * 6)) * t);
      d[i] = x;
    }
    if (shape.spring) {
      const lag = Math.round(0.031 * sr); // the tank's flutter echo
      for (let i = lag; i < len; i++) d[i] += 0.45 * d[i - lag];
    }
    for (let i = 0; i < len; i++) energy += d[i] * d[i];
    const norm = 1 / Math.sqrt(energy / sr + 1e-9);
    for (let i = 0; i < len; i++) d[i] *= norm * 0.35;
  }
  byMode.set(mode, buf);
  return buf;
}

export class FxChain {
  readonly input: GainNode;
  private ctx: BaseAudioContext;
  private delaySend: GainNode;
  private reverbSend: GainNode;
  private convolver: ConvolverNode;
  private delayOut: GainNode;
  private delayParts: AudioNode[] = [];
  private delayTimes: AudioParam[] = [];
  private feedbacks: AudioParam[] = [];
  private lfos: OscillatorNode[] = [];
  private delayMode: DelayMode | null = null;
  private reverbMode: ReverbMode | null = null;

  constructor(ctx: BaseAudioContext, destination: AudioNode, s: SynthSettings) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.input.connect(destination); // dry
    this.delaySend = ctx.createGain();
    this.reverbSend = ctx.createGain();
    this.convolver = ctx.createConvolver();
    this.delayOut = ctx.createGain();
    this.input.connect(this.delaySend);
    this.input.connect(this.reverbSend).connect(this.convolver).connect(destination);
    this.delayOut.connect(destination);
    this.delayOut.connect(this.reverbSend); // echoes are reverberated too
    this.update(s);
  }

  update(s: SynthSettings) {
    const now = this.ctx.currentTime;
    if (s.reverbMode !== this.reverbMode) {
      this.reverbMode = s.reverbMode;
      this.convolver.buffer = s.reverbMode === "off" ? null : impulse(this.ctx, s.reverbMode);
    }
    this.reverbSend.gain.setTargetAtTime(s.reverbMode === "off" ? 0 : s.reverbMix, now, 0.02);
    if (s.delayMode !== this.delayMode) this.buildDelay(s.delayMode);
    this.delaySend.gain.setTargetAtTime(s.delayMode === "off" ? 0 : s.delayMix, now, 0.02);
    const time = s.delayMode === "slapback" ? Math.min(0.18, Math.max(0.06, s.delayTime)) : s.delayTime;
    for (const p of this.delayTimes) p.setTargetAtTime(time, now, 0.05);
    const fb = s.delayMode === "slapback" ? 0 : Math.min(0.92, s.delayFeedback);
    for (const p of this.feedbacks) p.setTargetAtTime(fb, now, 0.02);
  }

  private buildDelay(mode: DelayMode) {
    for (const n of this.delayParts) n.disconnect();
    for (const o of this.lfos) o.stop();
    this.delayParts = [];
    this.delayTimes = [];
    this.feedbacks = [];
    this.lfos = [];
    this.delaySend.disconnect();
    this.delayMode = mode;
    if (mode === "off") return;
    const c = this.ctx;
    const keep = <T extends AudioNode>(n: T) => (this.delayParts.push(n), n);
    const delay = () => {
      const d = keep(c.createDelay(2));
      this.delayTimes.push(d.delayTime);
      return d;
    };
    const feedback = () => {
      const g = keep(c.createGain());
      this.feedbacks.push(g.gain);
      return g;
    };
    const wobble = (target: AudioParam, rate: number, depth: number) => {
      const lfo = c.createOscillator();
      const g = keep(c.createGain());
      lfo.frequency.value = rate;
      g.gain.value = depth;
      lfo.connect(g).connect(target);
      lfo.start();
      this.lfos.push(lfo);
    };
    if (mode === "pingpong") {
      const l = delay();
      const r = delay();
      const fl = feedback();
      const fr = feedback();
      const pl = keep(c.createStereoPanner());
      const pr = keep(c.createStereoPanner());
      pl.pan.value = -0.9;
      pr.pan.value = 0.9;
      this.delaySend.connect(l);
      l.connect(pl).connect(this.delayOut);
      l.connect(fl).connect(r);
      r.connect(pr).connect(this.delayOut);
      r.connect(fr).connect(l);
      return;
    }
    const d = delay();
    this.delaySend.connect(d);
    if (mode === "slapback") {
      d.connect(this.delayOut);
      return;
    }
    const fb = feedback();
    if (mode === "digital") {
      d.connect(this.delayOut);
      d.connect(fb).connect(d);
      return;
    }
    // analog and tape: the repeats darken; tape also saturates and wobbles more.
    const lp = keep(c.createBiquadFilter());
    lp.type = "lowpass";
    lp.frequency.value = mode === "analog" ? 2200 : 3200;
    d.connect(lp);
    lp.connect(this.delayOut);
    if (mode === "tape") {
      const sat = keep(c.createWaveShaper());
      const curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / (curve.length - 1)) * 2 - 1) * 1.8);
      sat.curve = curve;
      lp.connect(sat).connect(fb).connect(d);
      wobble(d.delayTime, 0.55, 0.004); // wow
      wobble(d.delayTime, 6.5, 0.0006); // flutter
    } else {
      lp.connect(fb).connect(d);
      wobble(d.delayTime, 0.35, 0.0022); // the slight drift of a bucket-brigade delay
    }
  }

  /** Remove this chain from the graph (voice replaced). */
  dispose() {
    for (const o of this.lfos) o.stop();
    this.input.disconnect();
    this.delayOut.disconnect();
    this.convolver.disconnect();
  }
}
