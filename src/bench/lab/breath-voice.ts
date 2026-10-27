/**
 * D323, BREATH's two wind voices, synthesised (no flute set suited: public/samples/flute is a modern
 * flute, trimmed to 4.5 s one-shots, CC BY 3.0; a breath-held note must last as long as the breath).
 * One continuous voice whose loudness, colour and (recorder) pitch follow the breath, as a wind player's
 * do; the thumbs only change the fingering (the pitch), gliding in a few ms (a slur: no new attack).
 *   - RECORDER (Blockflöte): a near-sine tone (weak 2nd and 3rd harmonics), a little breath noise round
 *     the pitch, a CHIFF at each articulation (a 25 ms noise burst a few harmonics up, the pitch starting
 *     a few cents sharp), a narrow range of loudness (about 12 dB over the pressure), brighter with
 *     pressure, and the pitch rising with pressure (recorders go sharp when blown harder; ±PITCH_RISE
 *     cents over the pressure, a switch). The number of cents is a guess: no measurement found.
 *   - TRAVERSO: darker and breathier, a soft onset with hardly any chiff, a wide range of loudness
 *     (about 26 dB) and of colour (the player shades with the lips, so no pitch change).
 * Everything joins the chip's input (its compressor, limiter and room). An analyser on the output gives
 * the mic's leak estimate its reference (outMs).
 */
import { hz } from "../../touch/tuning.ts";

export type WindKind = "recorder" | "traverso";

export interface WindSpec {
  name: string;
  /** Harmonic amplitudes of the tone (1 = the fundamental). */
  harmonics: number[];
  /** Loudness over the pressure: dB at pressure 0 (just over the gate) and 1. */
  dbLo: number;
  dbHi: number;
  /** Brightness: the low-pass (× f0) at pressure 0 and 1. */
  lpLo: number;
  lpHi: number;
  /** Breath noise round the pitch: level at pressure 0 and 1 (relative to the tone). */
  noiseLo: number;
  noiseHi: number;
  /** The chiff: its level (0 none), length (s), its pitch's start above the note (cents). */
  chiff: number;
  chiffS: number;
  chiffCents: number;
  /** How quickly the loudness follows the breath (s, setTargetAtTime). */
  tau: number;
  /** Pitch with pressure: cents at pressure 0 and 1 (relative), when the switch is on. */
  riseLo: number;
  riseHi: number;
}

/** ± cents of the recorder's pitch over the pressure (a guess: see the head). */
export const PITCH_RISE = 20;

export const WINDS: Record<WindKind, WindSpec> = {
  recorder: { name: "Recorder (Blockflöte)", harmonics: [1, 0.12, 0.07, 0.03, 0.02, 0.01], dbLo: -12, dbHi: 0, lpLo: 3, lpHi: 7, noiseLo: 0.05, noiseHi: 0.08, chiff: 0.5, chiffS: 0.025, chiffCents: 25, tau: 0.006, riseLo: -PITCH_RISE, riseHi: PITCH_RISE },
  traverso: { name: "Traverso (Baroque flute)", harmonics: [1, 0.3, 0.12, 0.05, 0.03], dbLo: -26, dbHi: 0, lpLo: 1.6, lpHi: 6, noiseLo: 0.16, noiseHi: 0.06, chiff: 0.12, chiffS: 0.04, chiffCents: 0, tau: 0.012, riseLo: 0, riseHi: 0 },
};

/** The loudness (linear) of a pressure (0..1) for a voice; 0 when the breath is off. */
export function ampOf(spec: WindSpec, pressure: number, on: boolean): number {
  if (!on) return 0;
  const p = Math.max(0, Math.min(1, pressure));
  return 10 ** ((spec.dbLo + (spec.dbHi - spec.dbLo) * p) / 20);
}
/** The pitch offset (cents) of a pressure, for the recorder's rise (0 when off). */
export function riseOf(spec: WindSpec, pressure: number, rise: boolean): number {
  if (!rise) return 0;
  const p = Math.max(0, Math.min(1, pressure));
  return spec.riseLo + (spec.riseHi - spec.riseLo) * p;
}

const LEVEL = 0.32;

export class WindVoice {
  readonly ctx: AudioContext;
  readonly spec: WindSpec;
  readonly kind: WindKind;
  rise: boolean;
  private osc: OscillatorNode;
  private lp: BiquadFilterNode;
  private amp: GainNode;
  private noiseSrc: AudioBufferSourceNode;
  private band: BiquadFilterNode;
  private noiseGain: GainNode;
  private chiffBand: BiquadFilterNode;
  private chiffGain: GainNode;
  private out: GainNode;
  private meter: AnalyserNode;
  private meterBuf: Float32Array<ArrayBuffer>;
  private midi = 72;
  private pressure = 0;
  private on = false;

  constructor(ctx: AudioContext, into: AudioNode, kind: WindKind, rise = true) {
    this.ctx = ctx;
    this.kind = kind;
    this.spec = WINDS[kind];
    this.rise = rise;
    const s = this.spec;
    const now = ctx.currentTime;
    const real = new Float32Array(s.harmonics.length + 1);
    const imag = new Float32Array(s.harmonics.length + 1);
    s.harmonics.forEach((a, i) => (imag[i + 1] = a));
    this.osc = ctx.createOscillator();
    this.osc.setPeriodicWave(ctx.createPeriodicWave(real, imag));
    this.lp = ctx.createBiquadFilter();
    this.lp.type = "lowpass";
    this.lp.Q.value = 0.4;
    this.amp = ctx.createGain();
    this.amp.gain.value = 0;
    // Breath noise: one second of white noise, looped, through a band round the pitch.
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseSrc = ctx.createBufferSource();
    this.noiseSrc.buffer = buf;
    this.noiseSrc.loop = true;
    this.band = ctx.createBiquadFilter();
    this.band.type = "bandpass";
    this.band.Q.value = 2.5;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = s.noiseLo;
    this.chiffBand = ctx.createBiquadFilter();
    this.chiffBand.type = "bandpass";
    this.chiffBand.Q.value = 1.5;
    this.chiffGain = ctx.createGain();
    this.chiffGain.gain.value = 0;
    this.out = ctx.createGain();
    this.out.gain.value = LEVEL;
    this.meter = ctx.createAnalyser();
    this.meter.fftSize = 512;
    this.meterBuf = new Float32Array(new ArrayBuffer(512 * 4));
    this.osc.connect(this.lp).connect(this.amp);
    this.noiseSrc.connect(this.band).connect(this.noiseGain).connect(this.amp);
    this.noiseSrc.connect(this.chiffBand).connect(this.chiffGain).connect(this.out);
    this.amp.connect(this.out);
    this.out.connect(into);
    this.out.connect(this.meter);
    this.setPitch(this.midi, 0);
    this.colour(0, now);
    this.osc.start(now);
    this.noiseSrc.start(now);
  }

  /** The fingering changed: the pitch glides there (s; 0 at once). */
  setPitch(midi: number, glideS = 0.006) {
    this.midi = midi;
    const now = this.ctx.currentTime;
    const f = hz(midi);
    if (glideS <= 0) {
      this.osc.frequency.setValueAtTime(f, now);
      this.band.frequency.setValueAtTime(f, now);
      this.chiffBand.frequency.setValueAtTime(f * 4, now);
    } else {
      this.osc.frequency.setTargetAtTime(f, now, glideS);
      this.band.frequency.setTargetAtTime(f, now, glideS);
      this.chiffBand.frequency.setTargetAtTime(f * 4, now, glideS);
    }
    this.colour(this.pressure, now);
  }

  private colour(p: number, at: number) {
    const s = this.spec;
    const f = hz(this.midi);
    const lp = Math.min(16000, f * (s.lpLo + (s.lpHi - s.lpLo) * p));
    this.lp.frequency.setTargetAtTime(lp, at, 0.01);
    this.noiseGain.gain.setTargetAtTime(s.noiseLo + (s.noiseHi - s.noiseLo) * p, at, 0.01);
    this.osc.detune.setTargetAtTime(riseOf(s, p, this.rise), at, 0.01);
  }

  /** The breath now: its pressure (0..1), whether the gate is open, and the fade (breath-dsp.ts fadeOf: a tongue's stop, the breath's end). */
  setBreath(pressure: number, on: boolean, fade = 1) {
    const now = this.ctx.currentTime;
    this.pressure = pressure;
    this.on = on;
    this.amp.gain.setTargetAtTime(ampOf(this.spec, pressure, on) * fade, now, on && fade > 0.5 ? this.spec.tau : 0.006);
    if (on) this.colour(pressure, now);
  }

  /** An articulation (the breath's onset or a tongue): the chiff, and the recorder's pitch starting sharp. */
  articulate() {
    const s = this.spec;
    if (!s.chiff) return;
    const now = this.ctx.currentTime;
    const g = this.chiffGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(0, now);
    g.linearRampToValueAtTime(s.chiff * (0.5 + 0.5 * this.pressure), now + 0.004);
    g.setTargetAtTime(0, now + 0.004, s.chiffS / 3);
    if (s.chiffCents) {
      const d = this.osc.detune;
      const base = riseOf(s, this.pressure, this.rise);
      d.cancelScheduledValues(now);
      d.setValueAtTime(base + s.chiffCents, now);
      d.setTargetAtTime(base, now + 0.002, 0.012);
    }
  }

  get sounding(): boolean {
    return this.on;
  }

  /** The output's mean square over its last 512 samples (the leak's reference). */
  outMs(): number {
    this.meter.getFloatTimeDomainData(this.meterBuf);
    let s = 0;
    for (const x of this.meterBuf) s += x * x;
    return s / this.meterBuf.length;
  }

  dispose() {
    const now = this.ctx.currentTime;
    this.amp.gain.setTargetAtTime(0, now, 0.01);
    try {
      this.osc.stop(now + 0.1);
      this.noiseSrc.stop(now + 0.1);
    } catch {
      /* stopped */
    }
    setTimeout(() => this.out.disconnect(), 200);
  }
}
