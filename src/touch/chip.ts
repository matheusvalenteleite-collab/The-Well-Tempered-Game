/**
 * The 8-bit sound: pulse- and triangle-wave notes and a ticking metronome on Web Audio, scheduled on
 * the audio clock so the beat stays steady whatever the screen does.
 * D167, a little warmer: each note has an attack, a short fall to its sustain and a release; long notes
 * take a gentle vibrato after a moment; the player can bend a held note (engine.ts); the voices stand
 * apart left to right; a soft filter takes the edge off and a small room (a generated reverb) carries
 * them; the metronome is a quiet tick.
 */
export type Timbre = "pulse12" | "pulse25" | "pulse50" | "triangle";

import { hz } from "./tuning.ts";
import { grooveHits, grooveNow, layerHits, preset, patchFor, sampledNow, type Drum, type Kit, type Patch, type Wave } from "./sound.ts";
import { loaded, loadedMidis, loadOne, loadPlan, nearestSample, noteInfo, planFor, rateFor, SAMPLED, setUnreachable, type Loaded, type SampledInstrument } from "./sampled.ts";

/**
 * D208, the player's voice: the same instrument as the others, at the same level (the voices of a
 * fugue are equals); it only rings while the thumb is down, so a release is never cut short.
 */
export function leadOf(pt: Patch): Patch {
  return pt.amp.s === 0 ? pt : { ...pt, amp: { ...pt.amp, r: Math.max(0.12, pt.amp.r) } };
}

/** D210: a phone or tablet (a touch screen): fewer notes at once (`VOICE_CAP`). */
export const isPhone = () => typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

/**
 * D210: the most notes sounding at once; past it, the oldest (not the player's own) is let go, quickly,
 * as the new one starts. A computer's is far above what a fugue asks; a phone's above what a four-voice
 * fugue with its ornaments, the riders and the rings of plucked notes usually reach.
 */
export const VOICE_CAP = { phone: 24, computer: 64 };

/**
 * D210: one sound's nodes, all disconnected once the last of its sources has ended. Nothing in chip.ts
 * was ever disconnected: Safari keeps a finished note's gains, filters and panner wired to the mix until
 * its garbage collector happens to run, and its audio thread goes on pulling them all (tens of thousands
 * over a fugue), until the sound breaks up into hiss and the page is killed.
 */
export class Bag {
  private nodes: AudioNode[] = [];
  private live = 0;
  done = false;
  onDone: (() => void) | null = null;
  add<T extends AudioNode>(n: T): T {
    this.nodes.push(n);
    return n;
  }
  /** A source of the sound: register it before starting it. */
  src<T extends AudioScheduledSourceNode>(s: T): T {
    this.add(s);
    this.live++;
    s.onended = () => {
      if (--this.live <= 0) this.free();
    };
    return s;
  }
  private free() {
    if (this.done) return;
    this.done = true;
    for (const n of this.nodes)
      try {
        n.disconnect();
      } catch {
        /* already */
      }
    this.nodes = [];
    this.onDone?.();
  }
}

/** D210: a note not yet ended: when it began, whether it is the player's, whether it was let go to make room. */
type Live = { at: number; lead: boolean; stolen: boolean; sd: Sounding };

export interface Voicing {
  timbre: Timbre;
  /** D177: the voice's instrument in the ensemble chosen (none: the classic chip sound). */
  patch?: Patch | null;
  /** -1 (left) to 1 (right). */
  pan: number;
  /** The voice's level (1 for every voice since D169). */
  gain: number;
}

/** How the player's own note sounds (D171): the Synth holds steady while the thumb stays down; the Piano dies away as it is held and is damped when let go. */
export type Envelope = "synth" | "piano" | "dulcimer";

export interface Play {
  envelope?: Envelope;
  /** Joined to the note before without a new attack (that note is still held). */
  legato?: boolean;
  /** A level for this note alone (1: as the voice). */
  level?: number;
  /** The note can be muffled after it starts (the testbench, D175: a gesture judged wrong). */
  muffleable?: boolean;
  /** D177, the touch's expression: brightness (-1 dark to 1 bright), softness of the attack (0 to 1), an accent (0 to 1). */
  bright?: number;
  soft?: number;
  accent?: number;
  /** D179: the player's own voice: it never dies away quickly, stands a little forward, has a touch of chorus and vibrato. */
  lead?: boolean;
  /** D181, ORGANO PLENO: the note doubled an octave above and below, as on an organ's full stops. */
  pleno?: boolean;
  /** D182: a trill: the note alternating with the step above, about eight times a second. */
  trill?: boolean;
}

export interface Sounding {
  stop: (at?: number) => void;
  /** Bend the note by some cents (the thumb's sideways wobble). */
  bend: (cents: number) => void;
  /** Glide to another pitch without a new attack (a held thumb slid on: glissando). */
  glide?: (midi: number) => void;
  /** Darken and soften it (a wrong gesture: Bach's note, but muffled). */
  muffle?: () => void;
  /** D179: the note's dynamic now (1 as struck), changed smoothly while it sounds (a swell, a diminuendo). */
  dyn?: (level: number) => void;
}

export class Chip {
  readonly ctx: AudioContext;
  private master: GainNode;
  private bus: AudioNode;
  private waves = new Map<string, PeriodicWave>();
  private keepAlive: HTMLAudioElement | null = null;
  private wet: GainNode;
  /** D186: the master's brightness and its drive (the zones). */
  private soften: BiquadFilterNode;
  private drive: GainNode;
  private zoneNow: "pleno" | "fuoco" | null = null;
  /**
   * The delay between the audio clock and what the player hears and does, in seconds, measured by
   * tapping along (D173: Bluetooth headphones add a fifth of a second or more, which the system often
   * does not report). Null: the system's own figure.
   */
  lag: number | null = null;
  /** D210: the notes not yet ended (oldest first), and how many may sound at once. */
  private voices: Live[] = [];
  readonly cap = isPhone() ? VOICE_CAP.phone : VOICE_CAP.computer;
  /** D210: how many notes were let go early to keep within the cap (for the measurements). */
  stolen = 0;

  constructor() {
    // iOS: play through the silent switch (Safari 16.4+), as a game should.
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    try {
      if (nav.audioSession) nav.audioSession.type = "playback";
    } catch {
      /* not supported */
    }
    this.ctx = new AudioContext({ latencyHint: "interactive" });
    const ctx = this.ctx;
    this.master = ctx.createGain();
    // D181: lower, and a limiter at the end, so many voices, a band and the room never clip (as they
    // did on an iPhone: the ensembles' voices and the drums add up past full scale).
    this.master.gain.value = 0.4;
    const soften = (this.soften = ctx.createBiquadFilter());
    soften.type = "lowpass";
    soften.frequency.value = 6500;
    soften.Q.value = 0.5;
    const squeeze = ctx.createDynamicsCompressor();
    squeeze.threshold.value = -18;
    squeeze.ratio.value = 4;
    squeeze.attack.value = 0.005;
    squeeze.release.value = 0.2;
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -4;
    limit.knee.value = 0;
    limit.ratio.value = 20;
    limit.attack.value = 0.001;
    limit.release.value = 0.08;
    const trim = ctx.createGain();
    trim.gain.value = 0.85;
    this.master.connect(soften).connect(squeeze).connect(limit).connect(trim).connect(ctx.destination);
    // The room: a second of decaying noise, a little of it under everything (more for the bands).
    const room = ctx.createConvolver();
    room.buffer = impulse(ctx, 1.3);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.16;
    this.master.connect(room).connect(this.wet).connect(squeeze);
    // A warm drive beside the dry sound, silent until CON FUOCO.
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) curve[i] = Math.tanh(((i / 1023) * 2 - 1) * 3);
    shaper.curve = curve;
    this.drive = ctx.createGain();
    this.drive.gain.value = 0;
    this.master.connect(shaper).connect(this.drive).connect(squeeze);
    this.bus = this.master;
  }

  /** Where a voice of one's own joins the sound (the testbench's instruments, D170). */
  get input(): AudioNode {
    return this.bus;
  }

  /** A pulse of the given duty (as on the NES), built once. */
  wave(timbre: Timbre): PeriodicWave | "triangle" {
    if (timbre === "triangle") return "triangle";
    let w = this.waves.get(timbre);
    if (!w) {
      const duty = timbre === "pulse12" ? 0.125 : timbre === "pulse25" ? 0.25 : 0.5;
      const N = 48;
      const real = new Float32Array(N);
      const imag = new Float32Array(N);
      for (let n = 1; n < N; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
      w = this.ctx.createPeriodicWave(real, imag);
      this.waves.set(timbre, w);
    }
    return w;
  }

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
    } else if (this.keepAlive?.paused) {
      // D191: iOS pauses it at an interruption (a call, Siri, the app in the background); played
      // again from the next gesture, or the switch would mute the game from then on.
      void this.keepAlive.play().catch(() => {});
    }
    return this.ctx.state === "running" ? Promise.resolve() : this.ctx.resume();
  }

  /** The audio clock as the ear hears it (the output's latency taken off), for drawing in sync. */
  heard(): number {
    return this.ctx.currentTime - (this.lag ?? (this.ctx.outputLatency || this.ctx.baseLatency || 0));
  }

  /** A note from `at` for `dur` seconds; stop() cuts it short (the thumb let go). */
  note(midi: number, at: number, dur: number, v: Voicing, p: Play = {}): Sounding {
    // D210: within the cap (the oldest let go first), and every node disconnected once the note has ended.
    const t = Math.max(at, this.ctx.currentTime);
    this.makeRoom(t);
    const bag = new Bag();
    const sd = this.voiceNote(midi, at, dur, v, p, bag);
    if (bag.done) return sd;
    const entry: Live = { at: t, lead: !!p.lead, stolen: false, sd };
    this.voices.push(entry);
    bag.onDone = () => {
      const i = this.voices.indexOf(entry);
      if (i >= 0) this.voices.splice(i, 1);
    };
    return sd;
  }

  /** D210: the notes sounding (not let go to make room). */
  sounding(): number {
    let n = 0;
    for (const v of this.voices) if (!v.stolen) n++;
    return n;
  }

  /** D210: at the cap, the oldest notes (never the player's own) let go at `t`, quickly. */
  private makeRoom(t: number) {
    let n = this.sounding();
    while (n >= this.cap) {
      let old: Live | null = null;
      for (const v of this.voices) if (!v.stolen && !v.lead && (!old || v.at < old.at)) old = v;
      if (!old) return;
      old.stolen = true;
      old.sd.stop(t);
      this.stolen++;
      n--;
    }
  }

  private voiceNote(midi: number, at: number, dur: number, v: Voicing, p: Play, bag: Bag): Sounding {
    // D190: a recorded instrument plays its recording once loaded; until then (or where it cannot be
    // had) the patch's synthesized sound stands in, so no note is lost.
    const inst = v.patch?.sample ? SAMPLED[v.patch.sample] : null;
    if (v.patch && inst && !setUnreachable(inst.set)) {
      const near = nearestSample(inst.set, midi);
      const rec = near === null ? undefined : loaded(inst.set, near);
      if (rec && near !== null) return this.sampledNote(midi, at, dur, v, v.patch, p, inst, near, rec, bag);
      if (near !== null) loadOne(this.ctx, inst.set, near);
    }
    if (v.patch) return this.patchNote(midi, at, dur, v, p.lead ? leadOf(v.patch) : v.patch, p, bag);
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    const end = Math.max(t + 0.04, at + dur - 0.01);
    const o = bag.src(ctx.createOscillator());
    const g = bag.add(ctx.createGain());
    const pan = ctx.createStereoPanner ? bag.add(ctx.createStereoPanner()) : null;
    const w = this.wave(v.timbre);
    if (w === "triangle") o.type = "triangle";
    else o.setPeriodicWave(w);
    o.frequency.value = hz(midi);
    // The triangle is quieter than the pulses at the same amplitude.
    const peak = (v.timbre === "triangle" ? 0.36 : v.timbre === "pulse50" ? 0.15 : 0.19) * v.gain * (p.level ?? 1);
    const sustain = peak * 0.72;
    const piano = p.envelope === "piano" || p.envelope === "dulcimer";
    g.gain.setValueAtTime(0, t);
    if (piano) {
      // Struck: at once loud, then dying away, the low notes slower.
      g.gain.linearRampToValueAtTime(peak * 1.15, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.01, (p.envelope === "dulcimer" ? 0.45 : 1.4) * 2 ** (-(midi - 60) / 24));
    } else if (p.legato) {
      // Joined: no new attack, the level of the note before.
      g.gain.linearRampToValueAtTime(sustain, t + 0.015);
    } else {
      g.gain.linearRampToValueAtTime(peak, t + 0.006);
      g.gain.setTargetAtTime(sustain, t + 0.01, 0.06);
    }
    if (!piano) {
      g.gain.setValueAtTime(sustain, Math.max(t + 0.02, end - 0.04));
      g.gain.linearRampToValueAtTime(0, end);
    }
    // A gentle vibrato on a long note, after a moment (not on a piano).
    if (!piano && end - t > 0.45) {
      const lfo = bag.src(ctx.createOscillator());
      const depth = bag.add(ctx.createGain());
      lfo.frequency.value = 5.4;
      depth.gain.setValueAtTime(0, t);
      depth.gain.setValueAtTime(0, t + 0.28);
      depth.gain.linearRampToValueAtTime(9, t + 0.55);
      lfo.connect(depth).connect(o.detune);
      lfo.start(t);
      lfo.stop(end + 0.05);
    }
    let src: AudioNode = o;
    const dull = p.muffleable ? bag.add(ctx.createBiquadFilter()) : null;
    if (dull) {
      dull.type = "lowpass";
      dull.frequency.value = 12000;
      src = o.connect(dull);
    }
    if (pan) {
      pan.pan.value = Math.max(-1, Math.min(1, v.pan));
      src.connect(g).connect(pan).connect(this.bus);
    } else src.connect(g).connect(this.bus);
    o.start(t);
    o.stop(end + 0.05);
    let stopped = false;
    return {
      stop: (when = ctx.currentTime) => {
        if (stopped || when >= end) return;
        stopped = true;
        const s = Math.max(when, t + 0.02);
        // Held at its level, then let go (a piano's damper takes a little longer).
        if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(s);
        else {
          g.gain.cancelScheduledValues(s);
          g.gain.setValueAtTime(piano ? peak * 0.3 : sustain, s);
        }
        g.gain.linearRampToValueAtTime(0, s + (piano ? 0.07 : p.legato ? 0.02 : 0.04));
        o.stop(s + 0.1);
      },
      bend: (cents: number) => {
        if (!stopped) o.detune.setTargetAtTime(cents, ctx.currentTime, 0.02);
      },
      glide: (to: number) => {
        if (!stopped) o.frequency.setTargetAtTime(hz(to), ctx.currentTime, 0.025);
      },
      muffle: () => {
        if (stopped || !dull) return;
        dull.frequency.setTargetAtTime(600, ctx.currentTime, 0.01);
        o.detune.setTargetAtTime(-35, ctx.currentTime, 0.02);
      },
    };
  }

  /**
   * D190: load the recordings the ensemble needs for a piece: every voice's pitches, and the player's
   * own an octave either side (ORGANO PLENO). A phone keeps less (sampled.ts BUDGET). Notes played
   * before their recording arrives are synthesized.
   */
  prepare(pitches: number[], lead: number[] = []): Promise<void> {
    const phone = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
    const now = sampledNow();
    // An instrument the ensemble no longer plays lets all its recordings go.
    const plans = (Object.keys(SAMPLED) as (keyof typeof SAMPLED)[]).map((id) => {
      const inst = SAMPLED[id];
      return now.includes(id) ? planFor(inst, pitches, lead) : [inst.set, inst.release, inst.low].filter((s): s is string => !!s).map((set) => ({ set, notes: [] }));
    });
    return Promise.all(plans.map((plan) => loadPlan(this.ctx, plan, phone))).then(() => {});
  }

  /** The recording to play for pitch `m` of a set: its own if loaded (else asked for), or the nearest loaded within an octave, retuned. */
  private nearestLoaded(set: string, m: number): { set: string; m: number; rec: Loaded } | null {
    const own = nearestSample(set, m);
    if (own === null || Math.abs(own - m) > 2) return null;
    const rec = loaded(set, own);
    if (rec) return { set, m: own, rec };
    loadOne(this.ctx, set, own);
    const alt = nearestSample(set, m, (x) => loadedMidis(set).includes(x) && Math.abs(x - m) <= 12);
    const altRec = alt === null ? undefined : loaded(set, alt);
    return alt !== null && altRec ? { set, m: alt, rec: altRec } : null;
  }

  /**
   * D190: a note on a recorded instrument: the nearest recording, retuned by its playback rate to the
   * tuning's pitch (hz(): every temperament, A = 415), through brightness, the muffle, the envelope and
   * the dynamic. A harpsichord's note dies away by itself; at the written end (or when let go) its
   * damper stops it over 50-150 ms (the bass slower) and the key-up noise sounds, softer the longer
   * the note was held; a note that has died away makes none. An organ's note is held on its loop and
   * stops in 30 ms (the room is the recording's and the reverb's). The harpsichord has no loudness of
   * touch: an accent is 1.5 dB and nothing else, and dyn() moves it at most 3 dB either way; the organ's
   * dyn() is a swell box (level and a lowpass from about 2 to 18 kHz).
   */
  private sampledNote(midi: number, at: number, dur: number, v: Voicing, pt: Patch, p: Play, inst: SampledInstrument, near: number, rec: Loaded, bag: Bag): Sounding {
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    const end = Math.max(t + 0.05, at + dur - 0.01);
    const plucked = inst.plucked;
    const peak = pt.level * v.gain * (p.level ?? 1) * 0.5 * inst.gain * (plucked ? 1 + (p.accent ?? 0) * 0.19 : 1);
    const mix = bag.add(ctx.createGain());
    const srcs: { src: AudioBufferSourceNode; set: string; m: number; mult: number }[] = [];
    let baseHz = hz(midi);
    const play = (set: string, m: number, r: Loaded, mult: number, gain: number) => {
      const src = bag.src(ctx.createBufferSource());
      src.buffer = r.buffer;
      src.playbackRate.value = rateFor(set, m, baseHz * mult);
      const loop = noteInfo(set, m)?.loop;
      if (loop && !plucked) {
        src.loop = true;
        src.loopStart = r.onset + loop[0];
        src.loopEnd = r.onset + loop[1];
      }
      const g = bag.add(ctx.createGain());
      g.gain.value = gain;
      src.connect(g).connect(mix);
      // Joined on the organ (legato): the pipe already speaking, past its attack.
      src.start(t, r.onset + (p.legato && !plucked ? 0.25 : 0));
      srcs.push({ src, set, m, mult });
    };
    play(inst.set, near, rec, 1, 1);
    if (p.pleno) {
      // ORGANO PLENO (D181): the octave above (a 4'), and below (the organ's pedal where it reaches).
      const up = this.nearestLoaded(inst.set, midi + 12);
      if (up) play(up.set, up.m, up.rec, 2, 0.45);
      const down = (inst.low ? this.nearestLoaded(inst.low, midi - 12) : null) ?? this.nearestLoaded(inst.set, midi - 12);
      if (down) play(down.set, down.m, down.rec, 0.5, 0.5);
    }
    let src: AudioNode = mix;
    const bright = p.bright ?? 0;
    if (bright < 0) {
      const tone = bag.add(ctx.createBiquadFilter());
      tone.type = "lowpass";
      tone.frequency.value = 18000 * 2 ** (bright * 2.8);
      src = src.connect(tone);
    } else if (bright > 0) {
      const tone = bag.add(ctx.createBiquadFilter());
      tone.type = "highshelf";
      tone.frequency.value = 2500;
      tone.gain.value = bright * 5;
      src = src.connect(tone);
    }
    const dull = p.muffleable ? bag.add(ctx.createBiquadFilter()) : null;
    if (dull) {
      dull.type = "lowpass";
      dull.frequency.value = 16000;
      src = src.connect(dull);
    }
    const swellAt = (level: number) => Math.min(18000, 2000 * 2 ** ((level - 0.25) * 3.4));
    const swell = plucked ? null : bag.add(ctx.createBiquadFilter());
    if (swell) {
      swell.type = "lowpass";
      swell.frequency.value = swellAt(1);
      src = src.connect(swell);
    }
    const g = bag.add(ctx.createGain());
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + (plucked ? 0.002 + (p.soft ?? 0) * 0.01 : p.legato ? 0.015 : 0.01 + (p.soft ?? 0) * 0.08));
    const dyn = bag.add(ctx.createGain());
    const pan = ctx.createStereoPanner ? bag.add(ctx.createStereoPanner()) : null;
    if (pan) {
      pan.pan.value = Math.max(-1, Math.min(1, v.pan));
      src.connect(g).connect(dyn).connect(pan).connect(this.bus);
    } else src.connect(g).connect(dyn).connect(this.bus);
    // D182, a trill: the step above and back, about eight times a second (the rate's square wave).
    const lfos: AudioScheduledSourceNode[] = [];
    if (p.trill && ctx.createConstantSource) {
      const lfo = bag.src(ctx.createOscillator());
      lfo.type = "square";
      lfo.frequency.value = 7.5;
      const centre = bag.src(ctx.createConstantSource());
      lfos.push(lfo, centre);
      for (const x of srcs) {
        const half = (x.src.playbackRate.value * (2 ** (200 / 1200) - 1)) / 2;
        const depth = bag.add(ctx.createGain());
        depth.gain.value = half;
        const mid = bag.add(ctx.createGain());
        mid.gain.value = half;
        lfo.connect(depth).connect(x.src.playbackRate);
        centre.connect(mid).connect(x.src.playbackRate);
      }
      lfo.start(t + 0.06);
      centre.start(t + 0.06);
    }
    // The recording's own end, in the context's time (a plucked note dies away by then).
    const life = (noteInfo(inst.set, near)?.len ?? 4) / Math.max(0.25, srcs[0].src.playbackRate.value) - rec.onset;
    let thunk: GainNode | null = null;
    const letGo = (s: number) => {
      if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(s);
      else (g.gain.cancelScheduledValues(s), g.gain.setValueAtTime(peak, s)); // the envelope is flat after the attack
      const tau = plucked ? 0.012 + 0.02 * Math.max(0, Math.min(1, (72 - midi) / 36)) : 0.03;
      g.gain.setTargetAtTime(0, s, tau);
      for (const x of srcs) x.src.stop(s + tau * 9 + 0.02);
      for (const l of lfos) l.stop(s + tau * 9 + 0.05);
      if (thunk) (thunk.disconnect(), (thunk = null));
      const held = s - t;
      const r = inst.release ? loaded(inst.release, near) : undefined;
      // (D210: a note already ended and disconnected makes no key-up noise.)
      if (!r || held > life - 0.3 || bag.done) return;
      // The jacks falling back and the dampers: softer the longer the string has rung.
      const rs = bag.src(ctx.createBufferSource());
      rs.buffer = r.buffer;
      rs.playbackRate.value = srcs[0].src.playbackRate.value;
      thunk = bag.add(ctx.createGain());
      thunk.gain.value = peak * 0.9 * Math.max(0.2, Math.exp(-held / Math.max(0.5, life / 3)));
      rs.connect(thunk).connect(dyn);
      rs.start(s, r.onset);
    };
    // D184: damped at the written end (a lead note's end is its longest hold), unless it has died away first.
    if (plucked && end > t + life) {
      for (const x of srcs) x.src.stop(t + life + 0.05);
      for (const l of lfos) l.stop(t + life + 0.1);
    } else letGo(end);
    let stopped = false;
    let cents = 0;
    let muffled = false;
    const retune = (tc: number) => {
      const off = 2 ** ((cents + (muffled ? -35 : 0)) / 1200);
      for (const x of srcs) x.src.playbackRate.setTargetAtTime(rateFor(x.set, x.m, baseHz * x.mult) * off, ctx.currentTime, tc);
    };
    return {
      stop: (when = ctx.currentTime) => {
        if (stopped || when >= end) return;
        stopped = true;
        letGo(Math.max(when, t + 0.02));
      },
      bend: (c: number) => {
        if (stopped) return;
        cents = c;
        retune(0.02);
      },
      glide: (to: number) => {
        if (stopped) return;
        baseHz = hz(to);
        retune(0.025);
      },
      muffle: () => {
        if (stopped || !dull) return;
        dull.frequency.setTargetAtTime(500, ctx.currentTime, 0.01);
        muffled = true;
        retune(0.02);
      },
      dyn: (level: number) => {
        if (stopped) return;
        const now = ctx.currentTime;
        if (swell) {
          dyn.gain.setTargetAtTime(Math.max(0.05, level), now, 0.08);
          swell.frequency.setTargetAtTime(swellAt(level), now, 0.08);
        } else dyn.gain.setTargetAtTime(Math.max(0.7, Math.min(1.4, level)), now, 0.06);
      },
    };
  }

  /** An oscillator of a wave (D177): the native shapes, the NES pulses, and three of our own. */
  private osc(w: Wave): OscillatorNode {
    const o = this.ctx.createOscillator();
    if (w === "saw") o.type = "sawtooth";
    else if (w === "square" || w === "triangle" || w === "sine") o.type = w;
    else if (w === "pulse12" || w === "pulse25" || w === "pulse50") o.setPeriodicWave(this.wave(w) as PeriodicWave);
    else o.setPeriodicWave(this.custom(w));
    return o;
  }

  /** The organ (drawbars 8', 4', 2 2/3', 2'), the reed (strong odd and some even partials, nasal), the bell (inharmonic-ish upper partials). */
  private custom(w: "organ" | "reed" | "bell"): PeriodicWave {
    let pw = this.waves.get(w);
    if (pw) return pw;
    const amps: Record<string, number[]> = {
      organ: [0, 1, 0.8, 0.6, 0.5, 0, 0.3, 0, 0.25],
      reed: [0, 1, 0.35, 0.8, 0.3, 0.6, 0.25, 0.45, 0.2, 0.3, 0.15, 0.2],
      bell: [0, 1, 0, 0, 0.5, 0, 0, 0.35, 0, 0, 0.2, 0, 0.15],
    };
    const a = amps[w];
    const real = new Float32Array(a.length);
    const imag = new Float32Array(a);
    pw = this.ctx.createPeriodicWave(real, imag);
    this.waves.set(w, pw);
    return pw;
  }

  private noiseBuf: AudioBuffer | null = null;
  private noise(): AudioBufferSourceNode {
    if (!this.noiseBuf) {
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      let seed = 99;
      for (let i = 0; i < len; i++) d[i] = (((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1);
    }
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    n.loop = true;
    return n;
  }

  /**
   * A note on an instrument of the ensemble (D177): its oscillators, breath, drive, filter (or vowel),
   * envelope, vibrato and tremolo; shaped by the touch (brightness, a soft or accented attack, level).
   */
  private patchNote(midi: number, at: number, dur: number, v: Voicing, pt: Patch, p: Play, bag: Bag): Sounding {
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    const pluck = pt.amp.s === 0;
    const tail = pluck || p.envelope === "piano" || p.envelope === "dulcimer";
    const end = Math.max(t + 0.05, at + dur - 0.01);
    const f0 = hz(midi);
    const bright = 2 ** ((p.bright ?? 0) * 1.3);
    const peak = pt.level * v.gain * (p.level ?? 1) * 0.5;
    const mix = bag.add(ctx.createGain());
    const oscs: OscillatorNode[] = [];
    for (const o of pt.osc) {
      const n = bag.src(this.osc(o.wave));
      n.frequency.value = f0 * 2 ** (o.octave ?? 0);
      n.detune.value = o.detune ?? 0;
      const g = bag.add(ctx.createGain());
      g.gain.value = o.gain ?? 1;
      n.connect(g).connect(mix);
      oscs.push(n);
    }
    let breath: AudioBufferSourceNode | null = null;
    if (pt.breath) {
      breath = bag.src(this.noise());
      const bp = bag.add(ctx.createBiquadFilter());
      bp.type = "bandpass";
      bp.frequency.value = Math.min(9000, f0 * 2);
      bp.Q.value = 2;
      const bg = bag.add(ctx.createGain());
      bg.gain.value = pt.breath * 2;
      breath.connect(bp).connect(bg).connect(mix);
    }
    let src: AudioNode = mix;
    if (pt.drive) {
      const sh = bag.add(ctx.createWaveShaper());
      const k = pt.drive * 6;
      const curve = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        const x = (i / 511) * 2 - 1;
        curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
      }
      sh.curve = curve;
      src = src.connect(sh);
    }
    if (pt.vowel) {
      // Two formants in parallel: a sung vowel.
      const out = bag.add(ctx.createGain());
      for (const [i, f] of pt.vowel.entries()) {
        const bp = bag.add(ctx.createBiquadFilter());
        bp.type = "bandpass";
        bp.frequency.value = f * (1 + ((p.bright ?? 0) * 0.15));
        bp.Q.value = 6;
        const g = bag.add(ctx.createGain());
        g.gain.value = i ? 0.7 : 1.4;
        src.connect(bp).connect(g).connect(out);
      }
      src = out;
    }
    const fl = pt.filter ? bag.add(ctx.createBiquadFilter()) : null;
    if (fl && pt.filter) {
      fl.type = pt.filter.type ?? "lowpass";
      fl.Q.value = pt.filter.q ?? 0.7;
      const base = Math.min(16000, (pt.filter.hz ? pt.filter.freq : f0 * pt.filter.freq) * bright);
      const top = Math.min(18000, base * (pt.filter.env ?? 1) * (1 + (p.accent ?? 0) * 0.8));
      fl.frequency.setValueAtTime(top, t);
      fl.frequency.setTargetAtTime(base, t + 0.005, pt.filter.envDecay ?? 0.1);
      src = src.connect(fl);
    } else if (bright !== 1) {
      const tone = bag.add(ctx.createBiquadFilter());
      tone.type = "lowpass";
      tone.frequency.value = Math.min(16000, f0 * 8 * bright);
      src = src.connect(tone);
    }
    const dull = p.muffleable ? bag.add(ctx.createBiquadFilter()) : null;
    if (dull) {
      dull.type = "lowpass";
      dull.frequency.value = 16000;
      src = src.connect(dull);
    }
    const g = bag.add(ctx.createGain());
    const a = Math.max(0.002, pt.amp.a * (1 + (p.soft ?? 0) * 4));
    const sus = peak * pt.amp.s;
    g.gain.setValueAtTime(0, t);
    if (p.legato && !pluck) g.gain.linearRampToValueAtTime(sus || peak * 0.7, t + 0.02);
    else {
      g.gain.linearRampToValueAtTime(peak * (1 + (p.accent ?? 0) * 0.7), t + a);
      if (pluck) g.gain.setTargetAtTime(0, t + a, pt.amp.d * 2 ** (-(midi - 60) / 30));
      else g.gain.setTargetAtTime(sus, t + a, pt.amp.d / 3);
    }
    if (!tail) {
      g.gain.setValueAtTime(sus, Math.max(t + a + 0.02, end - pt.amp.r));
      g.gain.linearRampToValueAtTime(0, end);
    }
    // The LFOs, stopped with the note (D184: they ran on 2 s past its end, and past an early stop).
    const lfos: AudioScheduledSourceNode[] = [];
    if (pt.trem) {
      const lfo = bag.src(ctx.createOscillator());
      lfos.push(lfo);
      const depth = bag.add(ctx.createGain());
      const tg = bag.add(ctx.createGain());
      lfo.frequency.value = pt.trem.rate;
      depth.gain.value = pt.trem.depth * 0.5;
      tg.gain.value = 1 - pt.trem.depth * 0.5;
      lfo.connect(depth).connect(tg.gain);
      src = src.connect(tg);
      lfo.start(t);
    }
    if (pt.vib && end - t > pt.vib.delay + 0.1) {
      const lfo = bag.src(ctx.createOscillator());
      lfos.push(lfo);
      const depth = bag.add(ctx.createGain());
      lfo.frequency.value = pt.vib.rate;
      depth.gain.setValueAtTime(0, t);
      depth.gain.setValueAtTime(0, t + pt.vib.delay);
      depth.gain.linearRampToValueAtTime(pt.vib.depth, t + pt.vib.delay + 0.25);
      lfo.connect(depth);
      for (const o of oscs) depth.connect(o.detune);
      lfo.start(t);
    }
    if (p.trill && ctx.createConstantSource) {
      // A whole tone above and back: a square wave of 0 or 200 cents.
      const lfo = bag.src(ctx.createOscillator());
      lfo.type = "square";
      lfo.frequency.value = 7.5;
      const depth = bag.add(ctx.createGain());
      depth.gain.value = 100;
      const centre = bag.src(ctx.createConstantSource());
      lfos.push(lfo, centre);
      centre.offset.value = 100;
      lfo.connect(depth);
      for (const o of oscs) (depth.connect(o.detune), centre.connect(o.detune));
      lfo.start(t + 0.06);
      centre.start(t + 0.06);
    }
    const pan = ctx.createStereoPanner ? bag.add(ctx.createStereoPanner()) : null;
    const dyn = bag.add(ctx.createGain());
    if (pan) {
      pan.pan.value = Math.max(-1, Math.min(1, v.pan));
      src.connect(g).connect(dyn).connect(pan).connect(this.bus);
    } else src.connect(g).connect(dyn).connect(this.bus);
    // D184: a plucked or struck note is damped at its written end (it rang 6 s whatever its length:
    // fifty voices at once on a phone); a lead note's end is its hold, so it rings as it would.
    const damp = tail && end + 0.5 < t + 6;
    if (damp) g.gain.setTargetAtTime(0, Math.max(t + a + 0.01, end), 0.08);
    const last = tail ? (damp ? end + 0.5 : t + 6) : end + 0.05;
    for (const l of lfos) l.stop(last + 0.1);
    for (const o of oscs) (o.start(t), o.stop(last));
    if (breath) (breath.start(t), breath.stop(last));
    let stopped = false;
    return {
      stop: (when = ctx.currentTime) => {
        if (stopped) return;
        stopped = true;
        const s = Math.max(when, t + 0.02);
        if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(s);
        else (g.gain.cancelScheduledValues(s), g.gain.setValueAtTime(sus || peak * 0.3, s));
        g.gain.linearRampToValueAtTime(0, s + Math.max(0.02, p.legato ? 0.02 : pt.amp.r));
        for (const o of oscs) o.stop(s + pt.amp.r + 0.1);
        if (breath) breath.stop(s + pt.amp.r + 0.1);
        for (const l of lfos) l.stop(s + pt.amp.r + 0.15);
      },
      bend: (cents: number) => {
        if (!stopped) for (const [i, o] of oscs.entries()) o.detune.setTargetAtTime((pt.osc[i].detune ?? 0) + cents, ctx.currentTime, 0.02);
      },
      glide: (to: number) => {
        if (stopped) return;
        const f = hz(to);
        for (const [i, o] of oscs.entries()) o.frequency.setTargetAtTime(f * 2 ** (pt.osc[i].octave ?? 0), ctx.currentTime, 0.025);
      },
      muffle: () => {
        if (stopped || !dull) return;
        dull.frequency.setTargetAtTime(500, ctx.currentTime, 0.01);
      },
      dyn: (level: number) => {
        if (!stopped) dyn.gain.setTargetAtTime(Math.max(0.05, level), ctx.currentTime, 0.06);
      },
    };
  }

  /**
   * D179, the swoosh: a note flicked upwards as it is let go flies up (its pitch an octave higher, a
   * filter opening, a breath of air) and comes down bouncing, quicker and quicker, softer and softer,
   * like a ping-pong ball settling, but faster.
   */
  swoosh(midi: number, v: Voicing, level = 1) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const f0 = hz(midi);
    const bag = new Bag();
    const out = bag.add(ctx.createGain());
    out.gain.value = 0.22 * level;
    const pan = ctx.createStereoPanner ? bag.add(ctx.createStereoPanner()) : null;
    if (pan) (pan.pan.value = Math.max(-1, Math.min(1, v.pan)), out.connect(pan).connect(this.bus));
    else out.connect(this.bus);
    // The flight: a sawtooth gliding up an octave through an opening filter, and a whoosh of air.
    const o = bag.src(ctx.createOscillator());
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 2, t + 0.18);
    const fl = bag.add(ctx.createBiquadFilter());
    fl.type = "lowpass";
    fl.Q.value = 6;
    fl.frequency.setValueAtTime(400, t);
    fl.frequency.exponentialRampToValueAtTime(7000, t + 0.18);
    const og = bag.add(ctx.createGain());
    og.gain.setValueAtTime(0.9, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.connect(fl).connect(og).connect(out);
    o.start(t);
    o.stop(t + 0.26);
    const n = bag.src(this.noise());
    const nf = bag.add(ctx.createBiquadFilter());
    nf.type = "bandpass";
    nf.Q.value = 3;
    nf.frequency.setValueAtTime(800, t);
    nf.frequency.exponentialRampToValueAtTime(6000, t + 0.2);
    const ng = bag.add(ctx.createGain());
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.5, t + 0.06);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    n.connect(nf).connect(ng).connect(out);
    n.start(t);
    n.stop(t + 0.26);
    // The bounces: ever shorter gaps, ever softer.
    let at = t + 0.24;
    let gap = 0.11;
    let gain = 0.7;
    for (let k = 0; k < 9; k++) {
      const b = bag.src(ctx.createOscillator());
      b.type = "triangle";
      b.frequency.value = f0 * 2 * (1 + k * 0.01);
      const bg = bag.add(ctx.createGain());
      bg.gain.setValueAtTime(gain, at);
      bg.gain.exponentialRampToValueAtTime(0.001, at + 0.03);
      b.connect(bg).connect(out);
      b.start(at);
      b.stop(at + 0.035);
      at += gap;
      gap *= 0.72;
      gain *= 0.7;
    }
  }

  /** The rhythm section (D177; D181): a synthesized kit (a band's, a console's, an analog machine's), quiet under the music. */
  drum(d: Drum, at: number, vel: number, kit: Kit = "acoustic") {
    const ctx = this.ctx;
    const bag = new Bag();
    const g = bag.add(ctx.createGain());
    g.connect(this.master);
    const lvl = 0.22 * vel;
    const noise = (type: BiquadFilterType, f: number, q: number, len: number, attack = 0.001) => {
      const n = bag.src(this.noise());
      const fl = bag.add(ctx.createBiquadFilter());
      fl.type = type;
      fl.frequency.value = f;
      fl.Q.value = q;
      const ng = bag.add(ctx.createGain());
      ng.gain.setValueAtTime(0, at);
      ng.gain.linearRampToValueAtTime(lvl, at + attack);
      ng.gain.exponentialRampToValueAtTime(0.0001, at + len);
      n.connect(fl).connect(ng).connect(g);
      n.start(at, Math.random() * 0.5);
      n.stop(at + len + 0.02);
    };
    const tone = (type: OscillatorType, f0: number, f1: number, len: number, level = lvl) => {
      const o = bag.src(ctx.createOscillator());
      o.type = type;
      o.frequency.setValueAtTime(f0, at);
      o.frequency.exponentialRampToValueAtTime(f1, at + len * 0.6);
      const og = bag.add(ctx.createGain());
      og.gain.setValueAtTime(level, at);
      og.gain.exponentialRampToValueAtTime(0.0001, at + len);
      o.connect(og).connect(g);
      o.start(at);
      o.stop(at + len + 0.02);
    };
    if (kit === "chip") {
      // A console's noise channel and a pulse dropping in pitch.
      switch (d) {
        case "kick":
          return tone("square", 180, 50, 0.1, lvl * 0.9);
        case "snare":
        case "clap":
          return noise("highpass", 1200, 0.5, 0.09);
        case "hat":
        case "shaker":
        case "ride":
        case "brush":
          return noise("highpass", 9000, 0.5, 0.025);
        case "rim":
          return tone("square", 1200, 1150, 0.025, lvl * 0.5);
      }
    }
    if (kit === "analog") {
      // An analog drum machine: a booming sine kick, a snappy snare, metallic hats, a clap.
      switch (d) {
        case "kick":
          return tone("sine", 95, 42, 0.55, lvl * 2.4);
        case "snare":
          noise("bandpass", 2200, 0.6, 0.18);
          return tone("triangle", 190, 170, 0.1, lvl * 0.9);
        case "clap":
          for (const k of [0, 0.011, 0.022]) {
            const n = bag.src(this.noise());
            const fl = bag.add(ctx.createBiquadFilter());
            fl.type = "bandpass";
            fl.frequency.value = 1200;
            const ng = bag.add(ctx.createGain());
            ng.gain.setValueAtTime(lvl, at + k);
            ng.gain.exponentialRampToValueAtTime(0.0001, at + k + (k === 0.022 ? 0.14 : 0.012));
            n.connect(fl).connect(ng).connect(g);
            n.start(at + k);
            n.stop(at + k + 0.16);
          }
          return;
        case "hat":
        case "ride":
          noise("highpass", 8000, 1.2, d === "ride" ? 0.3 : 0.04);
          return tone("square", 540, 540, 0.04, lvl * 0.08);
        case "rim":
          return tone("triangle", 820, 800, 0.03, lvl * 0.8);
        case "shaker":
        case "brush":
          return noise("highpass", 6500, 0.8, 0.05, 0.008);
      }
    }
    switch (d) {
      case "clap":
        return noise("bandpass", 1300, 0.7, 0.12);
      case "kick":
        return tone("sine", 140, 45, 0.3, lvl * 2.2);
      case "snare":
        noise("bandpass", 1900, 0.8, 0.16);
        return tone("triangle", 220, 160, 0.08, lvl * 0.8);
      case "hat":
        return noise("highpass", 7500, 0.7, 0.05);
      case "ride":
        noise("bandpass", 6000, 1.5, 0.45);
        return tone("square", 820, 800, 0.3, lvl * 0.12);
      case "rim":
        return tone("square", 1700, 1600, 0.03, lvl * 0.7);
      case "brush":
        return noise("lowpass", 3500, 0.5, 0.22, 0.05);
      case "shaker":
        return noise("highpass", 6000, 0.8, 0.07, 0.01);
    }
  }

  /** The rhythm section's hits for one beat (the ensemble's groove), scheduled at `at`, a beat lasting `beatS` seconds. */
  groove(at: number, beatS: number, b: number, bar: number, per: number, compound: boolean, extra = 0) {
    this.roomTo();
    const gr = grooveNow();
    // D186: the band grows with the player's run: layers over the groove (or over the click).
    for (const h of layerHits(extra, b, per, compound)) this.drum(h.drum, at + h.at * beatS, h.vel, gr?.kit ?? "analog");
    if (!gr) return false;
    for (const h of grooveHits(gr.groove, b, bar, per, compound)) this.drum(h.drum, at + h.at * beatS, h.vel, gr.kit);
    return true;
  }

  /**
   * D186, the zones: ORGANO PLENO opens the room (more of it, brighter), CON FUOCO brighter still,
   * with a warm drive; out of them, back to the preset's own.
   */
  zone(z: "pleno" | "fuoco" | null) {
    if (z === this.zoneNow) return;
    this.zoneNow = z;
    const t = this.ctx.currentTime;
    this.soften.frequency.setTargetAtTime(z === "fuoco" ? 11000 : z === "pleno" ? 9000 : 6500, t, z ? 0.4 : 0.8);
    this.drive.gain.setTargetAtTime(z === "fuoco" ? 0.18 : 0, t, 0.5);
    this.roomTo();
  }
  private roomTo() {
    const base = preset().room ?? 0.16;
    const room = this.zoneNow === "pleno" ? Math.min(0.45, base * 2.2) : this.zoneNow === "fuoco" ? Math.min(0.4, base * 1.6) : base;
    this.wet.gain.setTargetAtTime(room, this.ctx.currentTime, 0.4);
  }

  /** A metronome tick: a short, soft click, brighter on the bar's first beat. */
  tick(at: number, accent: boolean, gain = 0.1) {
    const ctx = this.ctx;
    const bag = new Bag();
    const o = bag.src(ctx.createOscillator());
    const g = bag.add(ctx.createGain());
    o.type = "square";
    o.frequency.value = accent ? 2093 : 1568;
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
    o.connect(g).connect(this.master);
    o.start(at);
    o.stop(at + 0.04);
  }
}

/** The voices' timbres and places (D167): the bass a triangle, the top voice the thinnest pulse, the inner ones fuller; spread left (low) to right (high). */
export function voicing(voice: number, count: number, _played = true): Voicing {
  const fromTop = voice;
  const timbre: Timbre = fromTop === count - 1 ? "triangle" : fromTop === 0 ? "pulse12" : fromTop === 1 && count > 3 ? "pulse25" : count > 3 ? "pulse50" : "pulse25";
  const pan = count > 1 ? (0.5 - fromTop / (count - 1)) * 0.9 : 0;
  // D169: the voice played is no louder than the others; it stands out by its colour in the box.
  return { timbre, pan, gain: 1, patch: patchFor(voice, count) };
}

/** A decaying stereo noise, for the room. */
function impulse(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let seed = 1234 + c * 77;
    for (let i = 0; i < len; i++) {
      seed = (seed * 16807) % 2147483647;
      d[i] = ((seed / 2147483647) * 2 - 1) * Math.pow(1 - i / len, 3);
    }
  }
  return b;
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
