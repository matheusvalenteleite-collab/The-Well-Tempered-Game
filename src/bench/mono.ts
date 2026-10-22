/**
 * The testbench's voice (D170): one monophonic 8-bit voice that sounds continuously while an
 * instrument holds it, its pitch, level and articulation steered from moment to moment, as a
 * theremin's or a bowed string's are. Pitch is a MIDI number, fractions allowed (a bend, a glide).
 */
import type { Chip, Timbre } from "../touch/chip.ts";

export class Mono {
  readonly chip: Chip;
  private osc: OscillatorNode;
  private gain: GainNode;
  private vib: GainNode;
  /** The pitch sounding (or that would sound), the level (0 to 1), and whether the voice is on. */
  pitch = 62;
  level = 0;
  on = false;

  constructor(chip: Chip, timbre: Timbre = "pulse25") {
    this.chip = chip;
    const ctx = chip.ctx;
    this.osc = ctx.createOscillator();
    const w = chip.wave(timbre);
    if (w === "triangle") this.osc.type = "triangle";
    else this.osc.setPeriodicWave(w);
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    // A vibrato the instruments can deepen (cents).
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.4;
    this.vib = ctx.createGain();
    this.vib.gain.value = 0;
    lfo.connect(this.vib).connect(this.osc.detune);
    lfo.start();
    this.osc.frequency.value = hz(this.pitch);
    this.osc.connect(this.gain).connect(chip.input);
    this.osc.start();
  }

  private get now() {
    return this.chip.ctx.currentTime;
  }

  /** Move the pitch, gliding over `glide` seconds (0: at once). */
  setPitch(midi: number, glide = 0) {
    this.pitch = midi;
    const f = this.osc.frequency;
    f.cancelScheduledValues(this.now);
    if (glide <= 0) f.setValueAtTime(hz(midi), this.now);
    else f.setTargetAtTime(hz(midi), this.now, glide / 3);
  }

  /** A new note: a quick dip and a fresh attack (an articulation), to the level given. */
  attack(level = 1) {
    const g = this.gain.gain;
    const t = this.now;
    g.cancelScheduledValues(t);
    g.setValueAtTime(this.on ? Math.min(g.value, 0.02) : 0, t);
    g.linearRampToValueAtTime(0.22 * level, t + 0.006);
    g.setTargetAtTime(0.17 * level, t + 0.012, 0.06);
    this.on = true;
    this.level = level;
  }

  /** Change the level of a sounding note without a new attack (a swell, the bow's speed). */
  setLevel(level: number, smooth = 0.03) {
    this.level = level;
    if (!this.on) return;
    const g = this.gain.gain;
    g.cancelScheduledValues(this.now);
    g.setTargetAtTime(0.17 * level, this.now, smooth);
  }

  /** A plucked note: an attack that dies away by itself. */
  pluck(level = 1) {
    this.attack(level);
    const g = this.gain.gain;
    g.setTargetAtTime(0, this.now + 0.02, 0.09);
    this.on = false;
    this.level = 0;
  }

  /** The note ends. */
  release(time = 0.05) {
    const g = this.gain.gain;
    g.cancelScheduledValues(this.now);
    g.setTargetAtTime(0, this.now, time / 3);
    this.on = false;
    this.level = 0;
  }

  /** Vibrato depth in cents. */
  vibrato(cents: number) {
    this.vib.gain.setTargetAtTime(cents, this.now, 0.05);
  }

  stop() {
    this.release(0.02);
  }
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
