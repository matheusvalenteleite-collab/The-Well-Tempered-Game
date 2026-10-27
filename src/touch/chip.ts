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
import { liveRegistration, registeredNote, LUTE_LP, SUBBASS, SUB16_LEVEL, type Registered } from "./registration.ts";
import { formantAt, holdMode, landing, messaGain, pulseRms, pulseWave, touchKind, tremRate, vibDepth, wahAt, widthOf, BLOOM_CENTS, BLOOM_DEFAULT, BLOOM_MOVE, BLOOM_STILL, LUTE_TAU, TOUCH_NEUTRAL, TOUCH_TAU, VOWEL_CLOSED, WAH_Q, type HoldMode } from "./touch-expr.ts";
import { CONSONANTS, grooveHits, grooveNow, harmonicsOf, type FxKind, isShaped, layerHits, preset, patchFor, placeFor, sampledNow, SHAPES, VOWELS, type Drum, type Kit, type Patch, type ShapedWave, type Wave } from "./sound.ts";
import { chainOf, loaded, loadedMidis, loadOne, loadPlan, nearestSample, noteInfo, planFor, rateFor, SAMPLED, setFor, setUnreachable, type Loaded, type SampledInstrument } from "./sampled.ts";
import { SmoothClock } from "./headphones.ts";

/**
 * D208, the player's voice: the same instrument as the others, at the same level (the voices of a
 * fugue are equals); it only rings while the thumb is down, so a release is never cut short.
 */
export function leadOf(pt: Patch): Patch {
  // D308: a struck sound (no sustain: the vibraphone's long ring) let go is damped within 0.1 s, as a held one is (LIFT_TAU).
  return pt.amp.s === 0 ? (pt.amp.r > 0.1 ? { ...pt, amp: { ...pt.amp, r: 0.1 } } : pt) : { ...pt, amp: { ...pt.amp, r: Math.max(0.12, pt.amp.r) } };
}

/**
 * D211: a source stopped at `at`, never throwing. A note cut short after its end was scheduled is
 * stopped a second time; the spec allows it, but older WebKit (Safari, every browser on an iPhone) threw
 * InvalidStateError there, and a throw inside the scheduler broke off the notes after it in that frame.
 */
function halt(s: AudioScheduledSourceNode, at: number) {
  try {
    s.stop(at);
  } catch {
    /* already stopped */
  }
}

/**
 * D313: how far ahead (s, at a rate of 1) a recording has run after a syllable's pitch curve (sampledNote:
 * `from` cents, a straight line to `over` in `t1` s, then back to 0 with a time constant of 45 ms)
 * against running at its pitch: a scoop from below puts it behind, a glide from above ahead.
 */
export function scoopShift(from: number, over: number, t1: number): number {
  let x = 0;
  const dt = 0.001;
  for (let s = 0; s < t1 + 0.5; s += dt) {
    const c = s < t1 ? from + ((over - from) * s) / t1 : over * Math.exp(-(s - t1) / 0.045);
    x += (2 ** (c / 1200) - 1) * dt;
  }
  return x;
}

/** D210: a phone or tablet (a touch screen): fewer notes at once (`VOICE_CAP`). */
export const isPhone = () => typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

/**
 * D210: the most notes sounding at once; past it, the oldest (not the player's own) is let go, quickly,
 * as the new one starts. A computer's is far above what a fugue asks; a phone's above what a four-voice
 * fugue with its ornaments, the riders and the rings of plucked notes usually reach.
 */
export const VOICE_CAP = { phone: 32, computer: 64, phoneSustained: 18 };
/**
 * D313, SOLO VOICES' passages (chip.ts chainOn): crossfaded over `xf` s (its gains set at `points` + 1
 * points); the best of `tries` places drawn, each within the first `spread` s of the steady stretch, so it lasts at least
 * `least` s; at most `max` of them a note.
 */
export const CHAIN = { xf: 0.3, points: 10, tries: 6, spread: 0.8, least: 1.2, max: 16 };
/**
 * D249: on a phone, a sustained recorded sound (the organ: 10-16 nodes a note, every note held on its
 * loop) has the lower cap, and ORGANO PLENO's extra pipes count against it, one each.
 */
export const sustainedSampled = () => sampledNow().some((id) => !SAMPLED[id].plucked);

/** D249: the sampled organ's swell (dyn): bounded as the harpsichord's is, at most 1.4. */
export const organSwell = (level: number) => Math.max(0.05, Math.min(1.4, level));
/** D249: ORGANO PLENO's stack (the note, the 4' at 0.45, the pedal at 0.5) brought back to about one note's level. */
export const PLENO_SCALE = 1 / 1.4;
/** D249: the output's true ceiling: a tanh soft clip (oversampled 4x) the master chain ends in. */
export const CEILING = 0.95;
/**
 * D249: the ceiling's curve, over an input pre-scaled by a half: y = CEILING · tanh(2u / CEILING), so
 * unity gain near silence, full scale (u = 0.5) softened to about 0.74, and nothing past about 0.92.
 */
export function softClipCurve(n = 2048): Float32Array<ArrayBuffer> {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = CEILING * Math.tanh((2 * ((i / (n - 1)) * 2 - 1)) / CEILING);
  return c;
}
/** D346: SOLO VOICES on a phone: about 1.7 dB lower into the limiter, and a 2.5 dB dip in the low mids. */
export const PHONE_VOICES = { sets: ["voiceS", "voiceA", "voiceT", "voiceB", "choirAah"], trim: 0.82, dipHz: 320, dipQ: 0.8, dipDb: -2.5 };
/** D249: the room's impulse, shorter on a phone (its convolver the costliest node there). */
export const ROOM_S = { phone: 0.8, computer: 1.3 };
/** D291: the phone bass a little louder still: a pulse low down is softer to the ear than one higher. */
export const PHONE_BASS_GAIN = 1.3;

/**
 * D297, SUPER 16-BIT's echo (the report §6.1, after the S-DSP's: EDL 5 = 80 ms, a positive EFB of 0.35,
 * the 8-tap FIR's usual lowpass stood in for by a 2.8 kHz lowpass and a 300 Hz high-pass in the loop).
 * Its return is 1: a voice's `send` is its echo's level (0.10-0.22: the first repeat 13-20 dB under it).
 * Not modelled: the right channel 8 ms later (a stereo nicety, R7), the 64 ms of fast fugues.
 * D302 (SUPER 16-BIT "lush", as the SNES's ensembles were: the owner rated it 4): longer and in stereo,
 * as the later soundtracks set it: 160 ms on the left, 240 ms on the right, each repeat fed to the
 * other side (0.4), through 3.2 kHz.
 */
export const SPC_ECHO = { delay: 0.16, right: 0.24, feedback: 0.4, lp: 3200, hp: 300 };
/** D302, MEGA FM's echo: short and dark (some of the console's soundtracks spent a channel on one). */
export const FM_ECHO = { delay: 0.12, right: 0.18, feedback: 0.22, lp: 3000, hp: 300 };
/** D302: the presets' echoes (Preset.fx "spc", "echo"): each side its own delay (s), the repeats crossing over. */
export const ECHOES: Record<"spc" | "echo", { delay: number; right: number; feedback: number; lp: number; hp: number }> = { spc: SPC_ECHO, echo: FM_ECHO };
/**
 * D297, the presets' own reverbs (Preset.fx): the sends pre-delayed (`predelay` s, onsets stay clean)
 * and high-passed (`hp` Hz: no bass in the tail), a generated impulse (`darkHall`: decaying to -60 dB
 * in `rt60` s, `seconds` long, shorter on a phone where the convolver costs most, darker as it decays
 * by `brightness`), the return lowpassed (`lp` Hz). `echo`: a tape echo beside it (a delay fed back
 * through a lowpass), at `level` of the send.
 */
export interface Reverb {
  predelay: number;
  hp: number;
  lp: number;
  seconds: number;
  phoneSeconds: number;
  rt60: number;
  brightness: number;
  echo?: { delay: number; feedback: number; lp: number; level: number };
}
export const REVERBS: Record<Exclude<FxKind, "spc" | "echo">, Reverb> = {
  // NOCTURNE 32-BIT's hall (§6.2: the PlayStation's half-rate reverb: dark, 5.5 kHz at most).
  hall: { predelay: 0.025, hp: 350, lp: 5500, seconds: 1.9, phoneSeconds: 1.2, rt60: 1.9, brightness: 0.3 },
  // D302, PIPE ORGAN's large church: a later first reflection (45 ms), a long and darkening tail (RT60
  // 2.8 s; on a phone 1.8 s of impulse), the highs damped (4.8 kHz): the organ's lines carried, not drowned.
  // D304: smaller (RT60 2.2 s) and a little brighter (5.5 kHz): the inner lines were muddled in it.
  cathedral: { predelay: 0.045, hp: 250, lp: 5500, seconds: 2.2, phoneSeconds: 1.5, rt60: 2.2, brightness: 0.3 },
  // D302, VOCAL SYNTH's plate: bright and short (RT60 1.5 s), the singers' consonants kept clear (D304: its highs
  // 6.5 kHz, was 8.5: no glitter in the tail).
  plate: { predelay: 0.03, hp: 300, lp: 6500, seconds: 1.5, phoneSeconds: 1.1, rt60: 1.5, brightness: 0.45 },
  // TOMITA's space: a long reverb and a tape echo (a third of a second, darkening) beside it.
  space: { predelay: 0.03, hp: 250, lp: 6500, seconds: 2.8, phoneSeconds: 1.6, rt60: 2.8, brightness: 0.45, echo: { delay: 0.33, feedback: 0.32, lp: 3000, level: 0.5 } },
  // D305, BLEEPS AND BLOOPS' small spring (an organ amplifier's tank): short (RT60 1.3 s), thin (the
  // lows out from 400 Hz) and dark (4.2 kHz), with the spring's flutter: a 37 ms echo fed back (0.35).
  spring: { predelay: 0.012, hp: 400, lp: 4200, seconds: 1.3, phoneSeconds: 1.0, rt60: 1.3, brightness: 0.4, echo: { delay: 0.037, feedback: 0.35, lp: 3500, level: 0.3 } },
};
export const HALL = REVERBS.hall;

/**
 * D294, CLASSIC CHIP less harsh (the owner: "perhaps too harsh. Maybe it's the fact that all voices have
 * no decay?"): a pulse note rises in 6 ms to its peak (`lift` above the old one), falls to `fall` of it
 * (time constant `fallTau`), and from `slowFrom` s sinks toward `floor` (`floorTau`), as a console's
 * volume envelope would (it held at 0.72 of its peak); its lowpass opens at `open` Hz at the attack and
 * closes over `closeTau` to `tameAt` the note (4.5 times its pitch, within 2.5-4.5 kHz). The triangle
 * (the bass on a computer) is as it was.
 */
export const CHIP_ENV = { lift: 1.06, fall: 0.6, fallTau: 0.08, slowFrom: 0.3, floor: 0.42, floorTau: 1.2, open: 9000, closeTau: 0.09 };
export const tameAt = (f0: number) => Math.max(2500, Math.min(4500, f0 * 4.5));

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
  /** D249: how many notes it counts as against a phone's cap (ORGANO PLENO's extra pipes, one each). */
  weight = 1;
}

/** D210: a note not yet ended: when it began, whether it is the player's, whether it was let go to make room. */
type Live = { at: number; until: number; lead: boolean; stolen: boolean; sd: Sounding; w: number };

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
  /**
   * Joined to the note before without a new attack (that note is still held). D302: on every sound: no
   * fresh attack transient (the level comes in under the note before as it goes, over 15-20 ms; no
   * filter or FM-index burst, no chiff, no scoop, no consonant); a plucked or struck note is plucked
   * anyway (a harpsichord joins by holding the note before: `tie`).
   */
  legato?: boolean;
  /**
   * D302: joined to the next note: held at its level to its end (the next note's onset and a little
   * over), let go over the last `tie` s (the crossfade into the next), not released before it as a
   * note's own release would (it left a gap or a dip of 40-120 ms between joined notes).
   */
  tie?: number;
  /** D302: joined from this pitch (MIDI): a singing voice glides from it (VOCAL SYNTH; the rest ignore it). */
  from?: number;
  /** D302: the last note before a rest (a phrase's end): a singing voice falls off it (VOCAL SYNTH). */
  final?: boolean;
  /**
   * D304: detached or staccato by a reading's mark: its gap heard on every sound (a plucked synthesized
   * note damped in 30 ms, a held recording's release done by its written end). Without it a note ends
   * as before D302 (the damper 80 ms, the release from the written end): the default playing.
   */
  apart?: boolean;
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
  /**
   * D213, the subject's colour (subject-fx.ts): a high shelf in dB (+ brighter, - duller; a timbre, not
   * a level), a crisper attack (0 to 1: a brief extra lift of the shelf, a quicker rise), a vibrato in
   * cents (a plucked note only a shimmer of 3), more room (a send to the reverb, 0 to 1), a detune in cents.
   */
  tone?: number;
  crisp?: number;
  vib?: number;
  room?: number;
  detune?: number;
  /** D223: where the note joins the sound in place of its bus (D299: no longer used by BLUETOOTH MODE). */
  into?: AudioNode;
  /** D252: false: not doubled by the coupling (the coupling's own notes). */
  couple?: boolean;
  /**
   * D311, the player's touch across its bar, as strength (0 the soft side, 1 the strong: touch-expr.ts STRONG_SIDE):
   * where it landed shapes the attack (Chip.note turns it into the fields below, by the preset's family),
   * and the note answers Sounding.shape (a sideways move while held). Unset: no expression (the band's notes).
   */
  touch?: number;
  /** D311: the piano's recording (layer 7 "soft", layer 12 "firm"), whatever the level. */
  layer?: "soft" | "firm";
  /** D311: a lowpass on the note (Hz): the harpsichord's lute stop, the organ's echo manual, a singer's closed vowel. */
  lp?: number;
  /** D311: the harpsichord's lute (buff) stop: a muted, shorter pluck. */
  lute?: boolean;
  /** D311: a pulse voice's width (0.125, 0.25, 0.5: thin, hollow, square; the SID's any between: `pwContinuous`). */
  pw?: number;
  pwContinuous?: boolean;
  /** D311: MEGA FM: the FM index scaled (the timbre throughout). */
  fmScale?: number;
  /** D311: BLEEPS AND BLOOPS: the mallet's hardness: the strike's FM burst and filter opening scaled. */
  strike?: number;
  /** D311: VOCAL SYNTH: the vowel, 0 closed (toward o or u) to 1 open (0.5 as the voice sings it). */
  open?: number;
  /** D311: how the note answers a held sideways move (set by Chip.note from `touch`). */
  hold?: HoldMode;
  /** D322: the harpsichord's registration: a second 8' choir and the 4' plucked with the note (registration.ts). */
  choirs?: Registered["choirs"];
}

/** D252, D322: notes sounding as one (the coupling's octave, the pedal's 16'): the second `shift` semitones from the first. */
function together([main, twin]: [Sounding, Sounding], shift = -12): Sounding {
  const both = [main, twin];
  return {
    stop: (t) => both.forEach((x) => x.stop(t)),
    bend: (cents) => both.forEach((x) => x.bend(cents)),
    glide: (m) => (main.glide?.(m), twin.glide?.(m + shift)),
    muffle: () => both.forEach((x) => x.muffle?.()),
    dyn: (l) => both.forEach((x) => x.dyn?.(l)),
    shape: (x) => both.forEach((y) => y.shape?.(x)),
    trim: (l, at, until) => both.forEach((x) => x.trim?.(l, at, until)),
  };
}

/** D308: the longest time constant of a player's note let go (s): -40 dB in 4.6 of them, 115 ms. */
export const LIFT_TAU = 0.025;

/** D302: VOCAL SYNTH's level against the other patches (its source normalised to its peak: measured, II/22 rendered offline). */
export const SING_GAIN = 3.4;

/** D252: the player's own notes a little brighter (a high shelf, dB) and a little louder: the player hears himself. */
export const MINE_TONE = 2.5;
export const MINE_LEVEL = 1.12;

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
  /** D311: the thumb moved sideways while holding: -1 (toward the soft side) .. 1 (toward the strong) from where it landed (touch-expr.ts holdValue); smoothed. */
  shape?: (s: number) => void;
  /** D335 (the lab's DYNAMICS, the recorded instruments): the note's level set to `level` (a factor, 1 as struck) by a linear ramp from `at` to `until` (s, the audio clock): a strike read after the onset. */
  trim?: (level: number, at: number, until: number) => void;
}

/** The part of an AudioParam rampTrim uses (a test's fake has it too). */
export interface TrimParam {
  value: number;
  setValueAtTime(v: number, t: number): unknown;
  linearRampToValueAtTime(v: number, t: number): unknown;
  cancelScheduledValues(t: number): unknown;
  cancelAndHoldAtTime?: (t: number) => unknown;
}
/** D335: a gain moved from `from` to `to` by a linear ramp over [at, until] (a step where until ≤ at), whatever was scheduled after `at` dropped: no click. */
export function rampTrim(a: TrimParam, from: number, to: number, at: number, until: number) {
  if (a.cancelAndHoldAtTime) a.cancelAndHoldAtTime(at);
  else a.cancelScheduledValues(at);
  a.setValueAtTime(from, at);
  if (until > at) a.linearRampToValueAtTime(to, until);
  else a.setValueAtTime(to, at);
}

/** D311: an automation taken from where it is now toward v, smoothly (no step, no zipper). */
function retarget(a: AudioParam, v: number, now: number, tau = TOUCH_TAU) {
  if (a.cancelAndHoldAtTime) a.cancelAndHoldAtTime(now);
  else (a.cancelScheduledValues(now), a.setValueAtTime(a.value, now));
  a.setTargetAtTime(v, now, tau);
}

export class Chip {
  readonly ctx: AudioContext;
  private master: GainNode;
  private bus: AudioNode;
  /** D213: the reverb's input, for a note's own send (Play.room). */
  private roomIn: AudioNode;
  private waves = new Map<string, PeriodicWave>();
  private keepAlive: HTMLAudioElement | null = null;
  private wet: GainNode;
  /** D297: the shared room (unwired from the master while a preset with `room: 0` plays). */
  private room: ConvolverNode;
  /** D237: the volume (0..1) over the master's own level (0.4, D181). */
  setVolume(v: number) {
    const k = Math.max(0, Math.min(1, v));
    this.master.gain.value = 0.4 * k;
    // D249: the notes' own sends to the room follow the volume too (they bypassed it).
    this.sends.gain.value = k;
  }
  /** D249: the notes' own room sends (Play.room), through the volume, into the room. */
  private sends: GainNode;
  /** D249: the drive's shaper, wired to the master only while CON FUOCO lasts. */
  private shaper: WaveShaperNode;
  private driveOn = false;
  private driveOff: ReturnType<typeof setTimeout> | null = null;
  /** D249: the true ceiling at the end of the chain (a tanh soft clip, 4x oversampled). */
  readonly ceiling: WaveShaperNode;
  private readonly phone = isPhone();
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
  /**
   * D223: the delay between drawing and what the player sees and does, in seconds, measured by tapping
   * along to a gem crossing a line (the screen's and the touch's own delay): the box and the road are
   * drawn this far ahead of the clock as heard. 0: none.
   */
  visual = 0;
  /** D210: the notes not yet ended (oldest first), and how many may sound at once. */
  private voices: Live[] = [];
  get cap(): number {
    return this.phone ? (sustainedSampled() ? VOICE_CAP.phoneSustained : VOICE_CAP.phone) : VOICE_CAP.computer;
  }
  /** D210: how many notes were let go early to keep within the cap (for the measurements); D211: how many failed to start. */
  stolen = 0;
  failed = 0;

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
    // D249: the limiter lower and slower to let go (it clipped on an iPhone: the compressors' makeup
    // gain and no true ceiling), the trim lower, and a soft clip at the very end as the ceiling.
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -10;
    limit.knee.value = 0;
    limit.ratio.value = 20;
    limit.attack.value = 0.003;
    limit.release.value = 0.25;
    const trim = ctx.createGain();
    trim.gain.value = 0.7;
    const ceilIn = ctx.createGain();
    ceilIn.gain.value = 0.5;
    const ceiling = (this.ceiling = ctx.createWaveShaper());
    ceiling.curve = softClipCurve();
    ceiling.oversample = "4x";
    this.master.connect(soften).connect(squeeze).connect(limit).connect(trim).connect(ceilIn).connect(ceiling).connect(ctx.destination);
    // The room: a second of decaying noise, a little of it under everything (more for the bands).
    const room = (this.room = ctx.createConvolver());
    room.buffer = impulse(ctx, this.phone ? ROOM_S.phone : ROOM_S.computer);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.16;
    this.master.connect(room).connect(this.wet).connect(squeeze);
    this.sends = ctx.createGain();
    this.sends.connect(room);
    this.roomIn = this.sends;
    // A warm drive beside the dry sound, silent until CON FUOCO (D249: and unwired outside it).
    const shaper = (this.shaper = ctx.createWaveShaper());
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) curve[i] = Math.tanh(((i / 1023) * 2 - 1) * 3);
    shaper.curve = curve;
    this.drive = ctx.createGain();
    this.drive.gain.value = 0;
    shaper.connect(this.drive).connect(squeeze);
    this.bus = this.master;
    // D216: the player's own notes (lead) through their own level (KIMIKO: YOUR VOICE ON / SOFT / OFF),
    // and a recording's way in, past the room and the compressor (it has its own room), into the limiter.
    this.mine = ctx.createGain();
    this.mine.connect(this.master);
    this.recIn = ctx.createGain();
    this.recIn.connect(limit);
  }

  /** D216: the player's own notes' level (1: as they are). */
  readonly mine: GainNode;
  /** D215: where a recording joins the sound (past the room and the compressor). */
  readonly recIn: GainNode;
  /** Where a note joins the sound: the player's own (lead) through their level, the others straight to the master. */
  private busOf(p: Play): AudioNode {
    return p.into ?? (p.lead ? this.mine : this.bus);
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
    return (this.smooth ? this.clock() : this.ctx.currentTime) - (this.lag ?? (this.ctx.outputLatency || this.ctx.baseLatency || 0));
  }

  /**
   * D299: `heard()` on the smoothed clock (BLUETOOTH MODE sets it for its game). `currentTime` moves in
   * steps, one per block the system takes (larger and less regular on a Bluetooth route), so a picture
   * drawn from it each frame judders and a touch's time is off by up to a block.
   */
  smooth = false;
  private readonly smoothed = new SmoothClock();
  /** D299: the audio clock read smoothly (headphones.ts SmoothClock), for drawing and for timing touches. */
  clock(nowMs = performance.now()): number {
    return this.smoothed.read(this.ctx.currentTime, nowMs, this.ctx.state === "running");
  }

  /** A note from `at` for `dur` seconds; stop() cuts it short (the thumb let go). */
  /**
   * D252, the coupling (a prelude's LIFT, arc.ts): notes from `split` up doubled an octave above at `up`
   * (a 4′), notes below it an octave below at `down` (a 16′); 0 off. Set by the game as the music grows.
   */
  coupling = { up: 0, down: 0, split: 48 };

  note(midi: number, at: number, dur: number, v: Voicing, p: Play = {}): Sounding {
    // D311: the player's touch across its bar: its landing shapes the attack, by the preset's family.
    if (p.touch !== undefined && p.hold === undefined) [p, v] = this.landed(midi, v, p);
    // D252: the player's own a touch brighter and louder.
    if (p.lead && p.couple !== false) p = { ...p, tone: (p.tone ?? 0) + MINE_TONE, level: (p.level ?? 1) * MINE_LEVEL };
    // D322: the registration (the player's voice; every voice under TUTTI), read as the note starts: a change sounds from the next note.
    const id = preset().id;
    const reg = p.couple === false ? null : registeredNote(id, liveRegistration(id), v.patch, !!p.lead, midi);
    if (reg) {
      if (reg.patch) v = { ...v, patch: reg.patch };
      if (reg.choirs) p = { ...p, choirs: reg.choirs };
      // The buff stop on every note so registered (the touch's own lute, D311, may darken it further).
      if (reg.lute) p = { ...p, lute: true, lp: Math.min(p.lp ?? LUTE_LP, LUTE_LP), hold: p.hold ?? "none" };
      if (reg.sub16) {
        const main = this.coupled(midi, at, dur, v, p);
        const sub = this.single(midi - 12, at, dur, { ...v, patch: SUBBASS }, { ...p, couple: false, touch: undefined, hold: undefined, tone: 0, level: (p.level ?? 1) * SUB16_LEVEL });
        return together([main, sub]);
      }
    }
    return this.coupled(midi, at, dur, v, p);
  }

  /** D252: a note with the coupling's octave where it is on (a prelude's LIFT). */
  private coupled(midi: number, at: number, dur: number, v: Voicing, p: Play): Sounding {
    const c = this.coupling;
    const g = p.couple === false ? 0 : midi >= c.split ? c.up : c.down;
    if (g > 0.01) {
      const main = this.single(midi, at, dur, v, p);
      const twin = this.single(midi >= c.split ? midi + 12 : midi - 12, at, dur, v, { ...p, couple: false, level: (p.level ?? 1) * g });
      return together([main, twin], midi >= c.split ? 12 : -12);
    }
    return this.single(midi, at, dur, v, p);
  }

  /**
   * D311: a landing turned into the note's attack (touch-expr.ts landing: the piano's layer and level,
   * the lute stop, the echo manual, the vowel, the pulse width, the FM index, the filter's brightness,
   * the mallet's hardness) and how it will answer a sideways move (`hold`). The brightness replaces the
   * touch's (D293 left it at the neutral dynamic's); the level and tone multiply and add.
   */
  private landed(midi: number, v: Voicing, p: Play): [Play, Voicing] {
    const kind = touchKind(preset().id);
    if (!kind) return [{ ...p, hold: "none" }, v];
    const pt = v.patch ?? null;
    const pulse = !pt && v.timbre !== "triangle";
    const l = landing(kind, p.touch ?? TOUCH_NEUTRAL, midi, pt, pulse);
    const inst = pt?.sample ? SAMPLED[pt.sample] : null;
    const plucked = inst ? inst.plucked : pt ? pt.amp.s === 0 : false;
    const q: Play = { ...p, hold: holdMode(kind, pt, plucked) };
    if (l.level !== undefined) q.level = (p.level ?? 1) * l.level;
    if (l.tone) q.tone = (p.tone ?? 0) + l.tone;
    if (l.bright !== undefined) q.bright = l.bright;
    for (const k of ["layer", "lp", "lute", "pw", "pwContinuous", "fmScale", "strike", "open"] as const) if (l[k] !== undefined) (q as Record<string, unknown>)[k] = l[k];
    // The classic chip: the pulse of that width (its level by the chip's own table: voiceNote).
    if (pulse && l.pw !== undefined) v = { ...v, timbre: pulseWave(l.pw) };
    return [q, v];
  }

  /** D311: the player's note's expression stage: the landing's lowpass, and for holding a swell (messa di voce) or a wah's peak (at rest, none). */
  private touchStage(src: AudioNode, p: Play, f0: number, bag: Bag): { out: AudioNode; messa?: GainNode; wah?: { node: BiquadFilterNode; f0: number } } {
    const ctx = this.ctx;
    let out = src;
    if (p.lp) {
      const f = bag.add(ctx.createBiquadFilter());
      f.type = "lowpass";
      f.Q.value = 0.7071;
      f.frequency.value = p.lp;
      out = out.connect(f);
    }
    let wah: { node: BiquadFilterNode; f0: number } | undefined;
    let messa: GainNode | undefined;
    if (p.hold === "wah") {
      const node = bag.add(ctx.createBiquadFilter());
      node.type = "peaking";
      node.Q.value = WAH_Q;
      node.frequency.value = wahAt(0, f0).hz;
      node.gain.value = 0;
      out = out.connect(node);
      wah = { node, f0 };
    }
    if (p.hold === "messa") {
      messa = bag.add(ctx.createGain());
      messa.gain.value = 1;
      out = out.connect(messa);
    }
    return { out, messa, wah };
  }

  /** D311: the player's vibrato (in place of the voice's own): `base` cents after `delay`, its depth then the thumb's (vibDepth). */
  private touchVibrato(params: AudioParam[], t: number, base: number, delay: number, rate: number, bag: Bag, lfos: AudioScheduledSourceNode[]): GainNode | null {
    if (!params.length) return null;
    const lfo = bag.src(this.ctx.createOscillator());
    lfos.push(lfo);
    lfo.frequency.value = rate;
    const depth = bag.add(this.ctx.createGain());
    depth.gain.setValueAtTime(0, t);
    if (base > 0) {
      depth.gain.setValueAtTime(0, t + delay);
      depth.gain.linearRampToValueAtTime(base, t + delay + 0.25);
    }
    lfo.connect(depth);
    for (const p of params) depth.connect(p);
    lfo.start(t);
    return depth;
  }

  /** D311: a held note's answer to the thumb's sideways move (Sounding.shape), from the parts it has. */
  private touchShape(parts: { messa?: GainNode; wah?: { node: BiquadFilterNode; f0: number }; vib?: { depth: GainNode; base: number }; trem?: { lfo: OscillatorNode; rate: number } }, live: () => boolean): (s: number) => void {
    const ctx = this.ctx;
    return (s: number) => {
      if (!live()) return;
      const now = ctx.currentTime;
      if (parts.messa) parts.messa.gain.setTargetAtTime(messaGain(s), now, TOUCH_TAU);
      if (parts.wah) {
        const w = wahAt(s, parts.wah.f0);
        parts.wah.node.frequency.setTargetAtTime(w.hz, now, TOUCH_TAU);
        parts.wah.node.gain.setTargetAtTime(w.db, now, TOUCH_TAU);
      }
      if (parts.vib) retarget(parts.vib.depth.gain, vibDepth(parts.vib.base, s), now);
      if (parts.trem) parts.trem.lfo.frequency.setTargetAtTime(tremRate(parts.trem.rate, s), now, TOUCH_TAU);
    };
  }

  private single(midi: number, at: number, dur: number, v: Voicing, p: Play): Sounding {
    // D210: within the cap (the oldest let go first), and every node disconnected once the note has ended.
    const t = Math.max(at, this.ctx.currentTime);
    this.makeRoom(t);
    const bag = new Bag();
    let sd: Sounding;
    try {
      this.period();
      sd = this.voiceNote(midi, at, dur, v, p, bag);
    } catch {
      // D211: one note's failure is never the others' (the scheduler goes on to the next).
      this.failed++;
      return { stop: () => {}, bend: () => {} };
    }
    if (bag.done) return sd;
    // D211: a note counts against the cap only until its written end (and a moment of its tail), not
    // until its nodes report their end: where a browser is slow to report it (or never does), the
    // count grew past the cap and every new note cut the oldest still sounding: the long notes of
    // the other voices went silent and the fugue sounded as if on one monophonic instrument.
    const entry: Live = { at: t, until: Math.max(t, at + dur) + 0.4, lead: !!p.lead, stolen: false, sd, w: bag.weight };
    this.voices.push(entry);
    bag.onDone = () => {
      const i = this.voices.indexOf(entry);
      if (i >= 0) this.voices.splice(i, 1);
    };
    const stop = sd.stop;
    sd.stop = (when?: number) => {
      entry.until = Math.min(entry.until, (when ?? this.ctx.currentTime) + 0.4);
      stop(when);
    };
    return sd;
  }

  /** D210: the notes sounding (not let go to make room, not past their end). */
  sounding(t = this.ctx.currentTime): number {
    let n = 0;
    for (const v of this.voices) if (!v.stolen && v.until > t) n += v.w;
    return n;
  }

  /**
   * D213: the subject's high shelf (Play.tone, dB) and its crisp attack (Play.crisp: the shelf lifted a
   * few dB more for the first 50 ms), one filter; none when neither is asked for.
   */
  private shelf(src: AudioNode, hzAt: number, t: number, db: number, crisp: number, bag: Bag): AudioNode {
    if (!db && !crisp) return src;
    const sh = bag.add(this.ctx.createBiquadFilter());
    sh.type = "highshelf";
    sh.frequency.value = hzAt;
    if (crisp > 0) {
      sh.gain.setValueAtTime(db + crisp * 6, t);
      sh.gain.setTargetAtTime(db, t + 0.004, 0.045);
    } else sh.gain.value = db;
    return src.connect(sh);
  }
  /** D213: a vibrato of `cents` on the pitches given, after a moment (Play.vib); two nodes, stopped with the note. */
  private vibrato(params: AudioParam[], t: number, end: number, cents: number, bag: Bag, lfos: AudioScheduledSourceNode[]) {
    if (!cents || !params.length || end - t < 0.3) return;
    const lfo = bag.src(this.ctx.createOscillator());
    lfos.push(lfo);
    lfo.frequency.value = 5.3;
    const depth = bag.add(this.ctx.createGain());
    depth.gain.setValueAtTime(0, t);
    depth.gain.setValueAtTime(0, t + 0.15);
    depth.gain.linearRampToValueAtTime(cents, t + 0.4);
    lfo.connect(depth);
    for (const p of params) depth.connect(p);
    lfo.start(t);
  }
  /** D213: a note's own send to the room (Play.room), one gain. */
  private send(from: AudioNode, amount: number | undefined, bag: Bag) {
    if (!amount) return;
    const g = bag.add(this.ctx.createGain());
    g.gain.value = amount;
    from.connect(g).connect(this.roomIn);
  }

  /** D297: a note's send to its preset's own effect (Patch.send), one gain; nothing where the preset has none. */
  private fxSend(from: AudioNode, amount: number | undefined, bag: Bag) {
    if (!amount) return;
    const into = this.fxInput();
    if (!into) return;
    const g = bag.add(this.ctx.createGain());
    g.gain.value = amount;
    from.connect(g).connect(into);
  }

  /** D297: the period presets' effect now (Preset.fx), built at its first note, its nodes (the input first, the return last). */
  private fx: { kind: FxKind; nodes: AudioNode[] } | null = null;
  /** D297: whether the shared room is off (a preset with `room: 0`). */
  private dry = false;
  /**
   * D297, at every note: the period presets' state set from the preset now. A preset with `room: 0`
   * plays without the shared room (its input unwired: the convolver idles); the effect of another
   * preset is taken down (its nodes disconnected) once a note of a preset without it is played.
   */
  private period() {
    const pr = preset();
    const dry = pr.room === 0;
    if (dry !== this.dry) {
      this.dry = dry;
      const t = this.ctx.currentTime;
      this.wet.gain.cancelScheduledValues(t);
      this.wet.gain.setValueAtTime(dry ? 0 : 0.16, t);
      if (dry) this.master.disconnect(this.room);
      else this.master.connect(this.room);
    }
    if (this.fx && this.fx.kind !== pr.fx) {
      for (const n of this.fx.nodes)
        try {
          n.disconnect();
        } catch {
          /* already */
        }
      this.fx = null;
    }
  }

  /** D297: the input of the preset's own effect (built once, kept while the preset plays), or null. */
  private fxInput(): AudioNode | null {
    const kind = preset().fx;
    if (!kind) return null;
    if (this.fx?.kind === kind) return this.fx.nodes[0];
    const ctx = this.ctx;
    const node = <T extends AudioNode>(n: T, nodes: AudioNode[]) => (nodes.push(n), n);
    const filter = (type: BiquadFilterType, f: number, q: number, nodes: AudioNode[]) => {
      const b = node(ctx.createBiquadFilter(), nodes);
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      return b;
    };
    const nodes: AudioNode[] = [];
    const input = node(ctx.createGain(), nodes);
    const ret = ctx.createGain();
    if (kind === "spc" || kind === "echo") {
      // An echo (ECHOES): e.g. the SNES's (§6.1; D302: longer and in stereo): each side its own delay,
      // its output, through the FIR's stand-in (a lowpass and a high-pass), both heard and fed back
      // into the other side's delay (each repeat darker, softer, and across the stereo field).
      const E = ECHOES[kind];
      const merge = node(ctx.createChannelMerger(2), nodes);
      const side = (time: number) => {
        const sum = node(ctx.createGain(), nodes);
        const delay = node(ctx.createDelay(0.5), nodes);
        delay.delayTime.value = time;
        const lp = filter("lowpass", E.lp, 0.5, nodes);
        const hp = filter("highpass", E.hp, 0.5, nodes);
        const fb = node(ctx.createGain(), nodes);
        fb.gain.value = E.feedback;
        input.connect(sum).connect(delay).connect(lp).connect(hp).connect(fb);
        return { sum, hp, fb };
      };
      const l = side(E.delay);
      const r = side(E.right);
      l.fb.connect(r.sum);
      r.fb.connect(l.sum);
      l.hp.connect(merge, 0, 0);
      r.hp.connect(merge, 0, 1);
      merge.connect(ret);
    } else {
      // A reverb (REVERBS): e.g. the PlayStation's hall (§6.2): the sends pre-delayed 25 ms and
      // high-passed at 350 Hz (the organ's pedal does not flood the tail), a dark generated impulse,
      // the return lowpassed at 5.5 kHz (its half-rate core).
      const r = REVERBS[kind];
      if (r.echo) {
        const e = r.echo;
        const sum = node(ctx.createGain(), nodes);
        const delay = node(ctx.createDelay(1), nodes);
        delay.delayTime.value = e.delay;
        const lp = filter("lowpass", e.lp, 0.5, nodes);
        const fb = node(ctx.createGain(), nodes);
        fb.gain.value = e.feedback;
        const lvl = node(ctx.createGain(), nodes);
        lvl.gain.value = e.level;
        input.connect(sum).connect(delay).connect(lp);
        lp.connect(fb).connect(sum);
        lp.connect(lvl).connect(ret);
      }
      const pre = node(ctx.createDelay(0.1), nodes);
      pre.delayTime.value = r.predelay;
      const hp = filter("highpass", r.hp, 0.7071, nodes);
      const conv = node(ctx.createConvolver(), nodes);
      conv.buffer = darkHall(ctx, this.phone ? r.phoneSeconds : r.seconds, r.rt60, r.brightness);
      const lp = filter("lowpass", r.lp, 0.7071, nodes);
      input.connect(pre).connect(hp).connect(conv).connect(lp).connect(ret);
    }
    // The return through the master (the volume, the limiter), not into the shared room.
    ret.connect(this.master);
    nodes.push(ret);
    this.fx = { kind, nodes };
    return input;
  }

  /** D302, MEGA FM: a modulator fed back on itself by `fb` (sin(x + fb·sin(x + fb·sin x)): the YM2612's operator feedback, nearer a sawtooth as fb grows), built once per amount. */
  private feedback(fb: number): PeriodicWave {
    const key = `fb${fb}`;
    let pw = this.waves.get(key);
    if (!pw) {
      const { real, imag } = harmonicsOf((x) => Math.sin(2 * Math.PI * x + fb * Math.sin(2 * Math.PI * x + fb * Math.sin(2 * Math.PI * x))));
      pw = this.ctx.createPeriodicWave(real, imag);
      this.waves.set(key, pw);
    }
    return pw;
  }

  /** D297: a staircase of 2^bits levels over -1..1 for a WaveShaper (Patch.bits), built once per depth. */
  private stairCurves = new Map<number, Float32Array<ArrayBuffer>>();
  private stairs(bits: number): Float32Array<ArrayBuffer> {
    let c = this.stairCurves.get(bits);
    if (!c) this.stairCurves.set(bits, (c = stairCurve(bits)));
    return c;
  }

  /** D210: at the cap, the oldest notes (never the player's own) let go at `t`, quickly. */
  private makeRoom(t: number) {
    // Entries long past their end (their end never reported) are forgotten.
    if (this.voices.length > 4 * this.cap) this.voices = this.voices.filter((v) => v.until > t - 2);
    let n = this.sounding(t);
    while (n >= this.cap) {
      let old: Live | null = null;
      for (const v of this.voices) if (!v.stolen && !v.lead && v.until > t && (!old || v.at < old.at)) old = v;
      if (!old) return;
      old.stolen = true;
      try {
        old.sd.stop(t);
      } catch {
        /* D211: never break off the new note */
      }
      this.stolen++;
      n -= old.w;
    }
  }

  private voiceNote(midi: number, at: number, dur: number, v: Voicing, p: Play, bag: Bag): Sounding {
    // D190: a recorded instrument plays its recording once loaded; until then (or where it cannot be
    // had) the patch's synthesized sound stands in, so no note is lost.
    const inst = v.patch?.sample ? SAMPLED[v.patch.sample] : null;
    // D297: an organ's manual above its pedal's compass (sampled.ts setFor).
    const main = inst ? setFor(inst, midi) : "";
    if (v.patch && inst && !setUnreachable(main)) {
      const near = nearestSample(main, midi);
      // D294: a lighter note (the phrasing's level under `below`) on the softer layer, where the
      // instrument has one; either layer stands in for the other until it has loaded.
      // D311: the player's touch chooses the piano's recording (Play.layer), whatever the level.
      const soft = inst.soft && (p.layer ? p.layer === "soft" : (p.level ?? 1) < inst.soft.below) ? inst.soft.set : null;
      let set = soft ?? main;
      let rec = near === null ? undefined : loaded(set, near);
      if (!rec && near !== null && inst.soft) {
        loadOne(this.ctx, set, near);
        set = soft ? inst.set : inst.soft.set;
        rec = loaded(set, near);
      }
      if (rec && near !== null) return this.sampledNote(midi, at, dur, v, v.patch, p, inst, set, near, rec, bag);
      if (near !== null) loadOne(this.ctx, main, near);
    }
    if (v.patch?.sing) return this.singNote(midi, at, dur, v, v.patch, p, bag);
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
    if (p.detune) o.detune.value = p.detune;
    // The triangle is quieter than the pulses at the same amplitude.
    const pulse = v.timbre !== "triangle";
    const E = CHIP_ENV;
    const peak = (v.timbre === "triangle" ? 0.36 : v.timbre === "pulse50" ? 0.15 : 0.19) * v.gain * (p.level ?? 1) * (pulse ? E.lift : 1);
    // D294: a pulse falls from its attack to a lower level and, held, sinks a little further (a console's
    // volume envelope); the triangle holds (the NES triangle has no volume control).
    const sustain = peak * (pulse ? E.fall : 0.72);
    const piano = p.envelope === "piano" || p.envelope === "dulcimer";
    const slow = pulse && !piano && end - 0.04 > t + E.slowFrom;
    /** The level the envelope has reached at `x` (after the attack). */
    const levelAt = (x: number) => {
      if (!pulse || p.legato) return sustain;
      const fell = sustain + (peak - sustain) * Math.exp(-Math.max(0, Math.min(x, t + E.slowFrom) - t - 0.01) / E.fallTau);
      return x <= t + E.slowFrom ? fell : peak * E.floor + (fell - peak * E.floor) * Math.exp(-(x - t - E.slowFrom) / E.floorTau);
    };
    g.gain.setValueAtTime(0, t);
    if (piano) {
      // Struck: at once loud, then dying away, the low notes slower.
      g.gain.linearRampToValueAtTime(peak * 1.15, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.01, (p.envelope === "dulcimer" ? 0.45 : 1.4) * 2 ** (-(midi - 60) / 24));
    } else if (p.legato) {
      // Joined: no new attack, the level of the note before.
      g.gain.linearRampToValueAtTime(sustain, t + 0.015);
    } else {
      g.gain.linearRampToValueAtTime(peak, t + (p.crisp ? 0.003 : 0.006));
      g.gain.setTargetAtTime(sustain, t + 0.01, pulse ? E.fallTau : 0.06);
      if (slow && !p.legato) g.gain.setTargetAtTime(peak * E.floor, t + E.slowFrom, E.floorTau);
    }
    if (!piano) {
      // D302: joined to the next, held to the crossfade.
      const rel = Math.max(t + 0.02, end - (p.tie ? Math.min(0.04, p.tie / 2) : 0.04));
      g.gain.setValueAtTime(levelAt(rel), rel);
      g.gain.linearRampToValueAtTime(0, end);
    }
    // A gentle vibrato on a long note, after a moment (not on a piano). D311: the player's, its depth the thumb's (held sideways).
    const lfos0: AudioScheduledSourceNode[] = [];
    const xvib = p.hold === "vibrato" && !piano ? this.touchVibrato([o.detune], t, end - t > 0.45 ? 9 : 0, 0.28, 5.4, bag, lfos0) : null;
    if (!xvib && !piano && end - t > 0.45) {
      const lfo = bag.src(ctx.createOscillator());
      const depth = bag.add(ctx.createGain());
      lfo.frequency.value = 5.4;
      depth.gain.setValueAtTime(0, t);
      depth.gain.setValueAtTime(0, t + 0.28);
      depth.gain.linearRampToValueAtTime(9, t + 0.55);
      lfo.connect(depth).connect(o.detune);
      lfo.start(t);
      halt(lfo, end + 0.05);
    }
    // D213: the subject's vibrato (a long note's own vibrato aside).
    const vibs: AudioScheduledSourceNode[] = [...lfos0];
    this.vibrato([o.detune], t, end, p.vib ?? 0, bag, vibs);
    let src: AudioNode = this.shelf(o, Math.max(1200, Math.min(3500, hz(midi) * 4)), t, p.tone ?? 0, p.crisp ?? 0, bag);
    if (pulse) {
      // D294: the pulse's top tamed once it has spoken: open at the attack (the edge that makes it
      // forward), then a gentle lowpass a few harmonics up (2.5 to 4.5 kHz), where its buzz was harsh.
      const lp = bag.add(ctx.createBiquadFilter());
      lp.type = "lowpass";
      lp.Q.value = 0.6;
      // D302: joined, no edge: the filter as the note before had it.
      lp.frequency.setValueAtTime(p.legato ? tameAt(hz(midi)) : E.open, t);
      lp.frequency.setTargetAtTime(tameAt(hz(midi)), t + 0.006, E.closeTau);
      src = src.connect(lp);
    }
    const dull = p.muffleable ? bag.add(ctx.createBiquadFilter()) : null;
    if (dull) {
      dull.type = "lowpass";
      dull.frequency.value = 12000;
      src = src.connect(dull);
    }
    let stopped = false;
    const xs = p.hold ? this.touchStage(src, p, hz(midi), bag) : null;
    if (xs) src = xs.out;
    const shape = p.hold ? this.touchShape({ ...xs, vib: xvib ? { depth: xvib, base: end - t > 0.45 ? 9 : 0 } : undefined }, () => !stopped) : undefined;
    if (pan) {
      pan.pan.value = Math.max(-1, Math.min(1, v.pan));
      src.connect(g).connect(pan).connect(this.busOf(p));
    } else src.connect(g).connect(this.busOf(p));
    this.send(pan ?? g, p.room, bag);
    o.start(t);
    halt(o, end + 0.05);
    for (const l of vibs) halt(l, end + 0.05);
    return {
      shape,
      stop: (when = ctx.currentTime) => {
        if (stopped || when >= end) return;
        stopped = true;
        const s = Math.max(when, t + 0.02);
        // Held at its level, then let go (a piano's damper takes a little longer).
        if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(s);
        else {
          g.gain.cancelScheduledValues(s);
          g.gain.setValueAtTime(piano ? peak * 0.3 : levelAt(s), s);
        }
        g.gain.linearRampToValueAtTime(0, s + (piano ? 0.07 : p.legato ? 0.02 : 0.04));
        halt(o, s + 0.1);
        for (const l of vibs) halt(l, s + 0.1);
      },
      bend: (cents: number) => {
        if (!stopped) o.detune.setTargetAtTime(cents + (p.detune ?? 0), ctx.currentTime, 0.02);
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
      return now.includes(id) ? planFor(inst, pitches, lead) : [inst.set, inst.soft?.set, inst.release, inst.low, inst.above?.set].filter((s): s is string => !!s).map((set) => ({ set, notes: [] }));
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
   * D313, SOLO VOICES (sampled.ts Bake.chain): a note longer than its recording is not looped (D305's
   * 2 s loop, heard again and again, was the owner's "copy paste") but goes on with passages of the same
   * recording from places within its steady stretch `chain` that differ each time (a hash of the note's
   * pitch and time, so a render repeats), each crossfaded into the one before over CHAIN.xf before the
   * one before runs out (its rate allowing for a bend of 150 cents). A held straight tone is nearly
   * periodic, so two passages of it are correlated by their phase (D313 measured the sine law swelling
   * and sagging a crossfade by up to ±3 dB: a slow tremolo): each passage starts where its waveform
   * best matches the outgoing one's (`align`, within one period of the place drawn), and the crossfade's
   * gains are held to constant power for the two passages' correlation measured at each of its points
   * (`rho`; the recording's own samples); the first passage's place allows for the syllable's scoop or
   * glide (`scoop`: s of the recording gained or lost by it, scoopShift). Two nodes a passage (a source and its gain), only past the
   * recording's length (in the fugues 1% of notes outlast 3 s); after CHAIN.max passages the last loops.
   */
  private chainOn(first: AudioBufferSourceNode, g0: GainNode, gain: number, r: Loaded, chain: [number, number], t: number, from: number, until: number, midi: number, fileHz: number, scoop: number, out: AudioNode, bag: Bag, add: (s: AudioBufferSourceNode) => void) {
    const ctx = this.ctx;
    const rate0 = first.playbackRate.value;
    const rate = rate0 * 2 ** (150 / 1200);
    const xf = CHAIN.xf;
    const data = typeof r.buffer.getChannelData === "function" ? r.buffer.getChannelData(0) : null;
    const sr = r.buffer.sampleRate || 44100;
    /** The normalised correlation of the recording at a and b (s) over w s (every `step`th sample). */
    const corr = (a: number, b: number, w: number, step = 2) => {
      if (!data) return 0;
      const i0 = Math.round(a * sr), j0 = Math.round(b * sr), n = Math.round(w * sr);
      if (i0 < 0 || j0 < 0 || i0 + n > data.length || j0 + n > data.length) return 0;
      let xy = 0, xx = 0, yy = 0;
      for (let i = 0; i < n; i += step) {
        const x = data[i0 + i], y = data[j0 + i];
        xy += x * y;
        xx += x * x;
        yy += y * y;
      }
      return xy / (Math.sqrt(xx * yy) + 1e-12);
    };
    const period = 1 / fileHz;
    /** The place within one period after `b` whose waveform best matches the recording at `a` (every
     * fourth sample, then the best's neighbours). */
    const align = (a: number, b: number) => {
      let best = -2, at = b;
      for (let d = 0; d < period; d += 4 / sr) {
        const c = corr(a, b + d, 0.02, 3);
        if (c > best) (best = c), (at = b + d);
      }
      const coarse = at;
      for (let d = -3; d <= 3; d++) {
        const c = corr(a, coarse + d / sr, 0.02, 1);
        if (d === -3 || c > best) (best = c), (at = coarse + d / sr);
      }
      return at;
    };
    const N = CHAIN.points;
    let src = first;
    let g = g0;
    let at = t;
    let pos = from;
    for (let k = 1; ; k++) {
      const runsOut = at + (r.onset + chain[1] - pos) / rate;
      if (runsOut >= until) return;
      const next = Math.max(at + xf, runsOut - xf);
      if (k > CHAIN.max) {
        // (A note held past every passage, e.g. the player's longest hold: the last one loops.)
        src.loop = true;
        src.loopStart = r.onset + chain[0];
        src.loopEnd = r.onset + chain[1];
        return;
      }
      const s = bag.src(ctx.createBufferSource());
      s.buffer = r.buffer;
      s.playbackRate.value = rate0;
      const spread = Math.max(0, chain[1] - chain[0] - CHAIN.least);
      const outAt = pos + (next - at) * rate0 + (k === 1 ? scoop * rate0 : 0);
      /** The two passages' correlation at each point of the crossfade, the incoming one from `b`. */
      const rhos = (b: number) =>
        Array.from({ length: N + 1 }, (_, q) => {
          const dx = ((q / N) * xf - 0.015) * rate0;
          return q === 0 || q === N ? 0 : corr(outAt + dx, b + dx, 0.03);
        });
      // Of CHAIN.tries places drawn, each aligned, the one whose waveform stays with the outgoing one
      // through the crossfade (the highest least correlation): the recording's slow wander of a few cents
      // can turn two passages aligned at its start against each other by its end.
      let best = -2;
      let rho: number[] = [];
      for (let j = 0; j < (data ? CHAIN.tries : 1); j++) {
        const h = Math.sin(midi * 78.233 + t * 12.9898 + k * 39.425 + j * 17.719) * 43758.5453;
        const b = align(outAt, r.onset + chain[0] + (h - Math.floor(h)) * Math.min(spread, CHAIN.spread));
        const rs = rhos(b);
        const score = Math.min(...rs.slice(1, N));
        if (score > best) (best = score), (pos = b), (rho = rs);
      }
      const gn = bag.add(ctx.createGain());
      for (let q = 0; q <= N; q++) {
        const x = q / N;
        const wa = Math.cos((x * Math.PI) / 2), wb = Math.sin((x * Math.PI) / 2);
        const c = 1 / Math.sqrt(wa * wa + wb * wb + 2 * wa * wb * Math.max(-0.6, Math.min(1, rho[q])));
        const when = next + x * xf;
        if (q === 0) (g.gain.setValueAtTime(gain, when), gn.gain.setValueAtTime(0, when));
        else (g.gain.linearRampToValueAtTime(gain * wa * c, when), gn.gain.linearRampToValueAtTime(gain * wb * c, when));
      }
      s.connect(gn).connect(out);
      s.start(next, pos);
      halt(src, next + xf + 0.02);
      add(s);
      src = s;
      g = gn;
      at = next;
    }
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
  private sampledNote(midi: number, at: number, dur: number, v: Voicing, pt: Patch, p: Play, inst: SampledInstrument, set: string, near: number, rec: Loaded, bag: Bag): Sounding {
    const ctx = this.ctx;
    const t = Math.max(at, ctx.currentTime);
    const end = Math.max(t + 0.05, at + dur - 0.01);
    const plucked = inst.plucked;
    const layer = inst.soft && set === inst.soft.set ? inst.soft.gain : 1;
    const peak = pt.level * v.gain * (p.level ?? 1) * 0.5 * inst.gain * layer * (plucked ? 1 + (p.accent ?? 0) * 0.19 : 1);
    const mix = bag.add(ctx.createGain());
    // D249: ORGANO PLENO's three sources brought back to about one note's level.
    if (p.pleno) mix.gain.value = PLENO_SCALE;
    const srcs: { src: AudioBufferSourceNode; set: string; m: number; mult: number }[] = [];
    let baseHz = hz(midi);
    const play = (set: string, m: number, r: Loaded, mult: number, gain: number, choir?: { delay: number; shelf: number }) => {
      const src = bag.src(ctx.createBufferSource());
      src.buffer = r.buffer;
      src.playbackRate.value = rateFor(set, m, baseHz * mult) * 2 ** ((p.detune ?? 0) / 1200);
      const loop = noteInfo(set, m)?.loop;
      const chain = plucked ? undefined : chainOf(set);
      if (loop && !plucked && !chain) {
        src.loop = true;
        src.loopStart = r.onset + loop[0];
        src.loopEnd = r.onset + loop[1];
      }
      const g = bag.add(ctx.createGain());
      g.gain.value = gain;
      // D322: another choir (the harpsichord's 8'+8' and 4'): a little brighter, plucked a little later.
      if (choir?.shelf) {
        const sh = bag.add(ctx.createBiquadFilter());
        sh.type = "highshelf";
        sh.frequency.value = 2500;
        sh.gain.value = choir.shelf;
        src.connect(g).connect(sh).connect(mix);
      } else src.connect(g).connect(mix);
      // Joined on the organ (legato): the pipe already speaking, past its attack.
      const from = r.onset + (p.legato && !plucked ? 0.25 : 0);
      src.start(t + (choir?.delay ?? 0), from);
      srcs.push({ src, set, m, mult });
      if (chain) this.chainOn(src, g, gain, r, chain, t, from, end + 0.5, midi, 440 * 2 ** ((m - 69) / 12), pt.syllable ? scoopShift(p.legato && p.from !== undefined ? (p.from - midi) * 100 : -pt.syllable.scoop, (p.legato && p.from !== undefined ? Math.sign(midi - p.from) || 1 : 1) * pt.syllable.over, p.legato ? 0.08 : 0.07) : 0, mix, bag, (s) => srcs.push({ src: s, set, m, mult }));
    };
    play(set, near, rec, 1, 1);
    if (p.choirs && plucked) {
      // D322, the harpsichord's registration: the second 8' (the neighbouring key's string retuned: another
      // string, not a copy; a few cents off, a few ms later) and the 4' (the octave above), in this note.
      const u = p.choirs.unison;
      const nb = u ? (this.nearestLoaded(set, midi + 1) ?? this.nearestLoaded(set, midi - 1) ?? { set, m: near, rec }) : null;
      if (u && nb) play(nb.set, nb.m, nb.rec, 2 ** (u.cents / 1200), u.gain, { delay: u.delay, shelf: u.shelf });
      const f = p.choirs.four;
      const up = f ? this.nearestLoaded(set, midi + 12) : null;
      if (f && up) play(up.set, up.m, up.rec, 2, f.gain, { delay: 0, shelf: f.shelf });
    }
    if (p.pleno) {
      // ORGANO PLENO (D181): the octave above (a 4'), and below (the organ's pedal where it reaches).
      const up = this.nearestLoaded(set, midi + 12);
      if (up) play(up.set, up.m, up.rec, 2, 0.45);
      const down = (inst.low ? this.nearestLoaded(inst.low, midi - 12) : null) ?? this.nearestLoaded(set, midi - 12);
      if (down) play(down.set, down.m, down.rec, 0.5, 0.5);
      // D249: on a phone a sustained note's extra pipes count against the cap.
      if (this.phone && !plucked) bag.weight = srcs.length;
    }
    let src: AudioNode = mix;
    // D346, SOLO VOICES on a phone's speaker (the owner: "too warm and distorted … just a little bit less"):
    // the singers a little lower into the limiter and its soft clip (PHONE_VOICES.trim) and the low mids a
    // little thinner (a gentle dip where the small speaker booms); a computer as before.
    if (this.phone && PHONE_VOICES.sets.includes(set)) {
      mix.gain.value *= PHONE_VOICES.trim;
      const dip = bag.add(ctx.createBiquadFilter());
      dip.type = "peaking";
      dip.frequency.value = PHONE_VOICES.dipHz;
      dip.Q.value = PHONE_VOICES.dipQ;
      dip.gain.value = PHONE_VOICES.dipDb;
      src = mix.connect(dip);
    }
    // D302, SOLO VOICES: a new syllable's consonant: the voice opening from a lowpass (CONSONANTS.open),
    // softer at first; joined, none (the vowel goes on).
    const syl = pt.syllable && !p.legato ? CONSONANTS[pt.syllable.cons] : null;
    if (syl) {
      const lp = bag.add(ctx.createBiquadFilter());
      lp.type = "lowpass";
      lp.Q.value = 0.8;
      lp.frequency.setValueAtTime(syl.open, t);
      // (D304: opening over about 50 ms, no longer a tick of highs at each onset.)
      lp.frequency.setTargetAtTime(16000, t + syl.time * 0.4, Math.max(0.018, syl.time / 2));
      const sg = bag.add(ctx.createGain());
      sg.gain.setValueAtTime(Math.max(0.3, syl.voiced), t);
      sg.gain.setTargetAtTime(1, t + syl.time * 0.4, syl.time / 3);
      src = src.connect(lp).connect(sg);
    }
    const bright = p.bright ?? 0;
    if (bright < 0) {
      const tone = bag.add(ctx.createBiquadFilter());
      tone.type = "lowpass";
      tone.frequency.value = 18000 * 2 ** (bright * 2.8);
      src = src.connect(tone);
    }
    // The touch's brightness and (D213) the subject's colour share one high shelf.
    const subj = !!(p.tone || p.crisp);
    src = this.shelf(src, subj ? Math.max(1200, Math.min(3500, baseHz * 4)) : 2500, t, Math.max(0, bright) * 5 + (p.tone ?? 0), p.crisp ?? 0, bag);
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
    // D311: the player's touch: the lute stop's or the echo manual's or a closed vowel's lowpass; a singer's swell.
    const xs = p.hold ? this.touchStage(src, p, baseHz, bag) : null;
    if (xs) src = xs.out;
    // D322: the organ's tremulant on a recorded pipe (the pedal): the level shaken (Patch.trem), as patchNote does.
    let tremLfo: OscillatorNode | null = null;
    if (pt.trem && !plucked) {
      tremLfo = bag.src(ctx.createOscillator());
      tremLfo.frequency.value = pt.trem.rate;
      const depth = bag.add(ctx.createGain());
      const tg = bag.add(ctx.createGain());
      depth.gain.value = pt.trem.depth * 0.5;
      tg.gain.value = 1 - pt.trem.depth * 0.5;
      tremLfo.connect(depth).connect(tg.gain);
      src = src.connect(tg);
      tremLfo.start(t);
    }
    const g = bag.add(ctx.createGain());
    g.gain.setValueAtTime(0, t);
    // D297: a period preset's envelope on the recording (Patch.rec): its attack, a fall to its sustain,
    // then, held, an exponential fall toward silence (the SNES's sustain that is not one); a joined
    // (legato) note comes in at the sustain. Without `rec`, the recording's own envelope, as before.
    const re = pt.rec;
    const atk = re && !(p.legato && !plucked) ? re.a + (p.soft ?? 0) * (plucked ? 0.01 : 0.08) : plucked ? 0.002 + (p.soft ?? 0) * 0.01 : p.legato ? 0.015 : 0.01 + (p.soft ?? 0) * 0.08;
    const top = re && p.legato && !plucked ? peak * re.s : peak;
    g.gain.linearRampToValueAtTime(top, t + Math.max(0.001, atk));
    /** Where the envelope is at `x` (after the attack): for a browser without cancelAndHoldAtTime. */
    let levelAt = (_x: number) => peak;
    // D311: the lute (buff) stop: the string damped by its felt, a short ring.
    if (plucked && p.lute) {
      g.gain.setTargetAtTime(0, t + 0.03, LUTE_TAU);
      levelAt = (x) => peak * Math.exp(-Math.max(0, x - t - 0.03) / LUTE_TAU);
    }
    if (re && !plucked) {
      const a = t + Math.max(0.001, atk);
      if (re.s < 1 && top > peak * re.s) g.gain.setTargetAtTime(peak * re.s, a, Math.max(0.01, re.d / 3));
      if (re.fade) g.gain.setTargetAtTime(0, a + re.d, re.fade);
      levelAt = (x) => peak * re.s * (re.fade && x > a + re.d ? Math.exp(-(x - a - re.d) / re.fade) : 1);
    }
    const dyn = bag.add(ctx.createGain());
    /** D335: the level the last trim left (Sounding.trim). */
    let trimmed = 1;
    const pan = ctx.createStereoPanner ? bag.add(ctx.createStereoPanner()) : null;
    if (pan) {
      pan.pan.value = Math.max(-1, Math.min(1, v.pan));
      src.connect(g).connect(dyn).connect(pan).connect(this.busOf(p));
    } else src.connect(g).connect(dyn).connect(this.busOf(p));
    this.send(pan ?? dyn, p.room, bag);
    // D297: the preset's own effect (the echo, the hall), from this voice's patch.
    this.fxSend(pan ?? dyn, pt.send, bag);
    // D182, a trill: the step above and back, about eight times a second (the rate's square wave).
    const lfos: AudioScheduledSourceNode[] = tremLfo ? [tremLfo] : [];
    // D305, SOLO VOICES: a long note's messa di voce (Patch.syllable.messa, dB; from its length alone);
    // joined to the next (tie), back to its level by then (no step into the next).
    const messa = pt.syllable?.messa ?? 0;
    if (messa && !p.lead && end - t >= 0.9) {
      const up = 10 ** (messa / 20);
      dyn.gain.setValueAtTime(1, t);
      dyn.gain.linearRampToValueAtTime(up, t + 0.4 * (end - t));
      dyn.gain.linearRampToValueAtTime(p.tie ? 1 : 1 / up, end);
    }
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
    // D213: the subject's vibrato (a plucked string's only a shimmer); where a recording's detune exists.
    const det = srcs.map((x) => x.src.detune).filter((d): d is AudioParam => !!d);
    this.vibrato(det, t, end, plucked ? Math.min(3, p.vib ?? 0) : (p.vib ?? 0), bag, lfos);
    // D302: TRACKER's tone portamento into a joined note (Patch.slide).
    if (pt.slide && !pt.syllable && p.legato && p.from !== undefined && p.from !== midi)
      for (const d of det) {
        d.setValueAtTime((p.from - midi) * 100, t);
        d.setTargetAtTime(0, t, pt.slide / 3);
      }
    if (pt.syllable && det.length) {
      // D302, SOLO VOICES: the pitch scooped into a new syllable, or glided from the note before when
      // joined, with a small overshoot; a phrase's end falls.
      const sy = pt.syllable;
      const from = p.legato && p.from !== undefined ? (p.from - midi) * 100 : -sy.scoop;
      const dir = p.legato && p.from !== undefined ? Math.sign(midi - p.from) || 1 : 1;
      for (const d of det) {
        d.setValueAtTime(from, t);
        d.linearRampToValueAtTime(dir * sy.over, t + (p.legato ? 0.08 : 0.07));
        d.setTargetAtTime(0, t + (p.legato ? 0.08 : 0.07), 0.045);
        if (p.final && !p.tie && sy.fall && end - t > 0.35) {
          d.setValueAtTime(0, Math.max(t + 0.25, end - 0.16));
          d.linearRampToValueAtTime(-sy.fall, end);
        }
      }
      // D304: no synthesized burst on a recorded voice (the d's, 2 ms of noise at 3.5 kHz on every new
      // note of the bass, out of a silent gap, were the "clickers" the owner heard): the consonant is
      // the voice opening from the lowpass, and its level coming in (CONSONANTS.open, voiced).
    }
    // D311: the player's held recording: its vibrato's depth the thumb's (the patch's own the base).
    const xvib = p.hold === "vibrato" && !plucked ? this.touchVibrato(det, t, pt.vib?.depth ?? 0, pt.vib?.delay ?? 0.3, pt.vib?.rate ?? 5.5, bag, lfos) : null;
    // D297: the patch's own vibrato on a held recording (its rate, depth and delay: each voice's its own, R4).
    if (!xvib && pt.vib && !plucked && det.length && end - t > pt.vib.delay + 0.1) {
      const lfo = bag.src(ctx.createOscillator());
      lfos.push(lfo);
      lfo.frequency.value = pt.vib.rate;
      const depth = bag.add(ctx.createGain());
      depth.gain.setValueAtTime(0, t);
      depth.gain.setValueAtTime(0, t + pt.vib.delay);
      depth.gain.linearRampToValueAtTime(pt.vib.depth, t + pt.vib.delay + 0.25);
      lfo.connect(depth);
      for (const d of det) depth.connect(d);
      lfo.start(t);
    }
    // The recording's own end, in the context's time (a plucked note dies away by then).
    const life = (noteInfo(set, near)?.len ?? 4) / Math.max(0.25, srcs[0].src.playbackRate.value) - rec.onset;
    let thunk: GainNode | null = null;
    /** The note's own release (time constant, s): the recording's, a damper's (the bass slower), else 30 ms. */
    const ownTau = re ? Math.max(0.005, re.r / 3) : plucked ? 0.012 + 0.02 * Math.max(0, Math.min(1, (72 - midi) / 36)) : 0.03;
    const letGo = (s: number, tie = 0, lift = false) => {
      if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(s);
      else (g.gain.cancelScheduledValues(s), g.gain.setValueAtTime(levelAt(s), s)); // flat after the attack, unless Patch.rec shapes it
      // D302: a held note joined to the next goes over the crossfade (`tie`), not its own release.
      // D308: the player's note let go (a thumb lifted): -40 dB within 120 ms, whatever the recording's
      // own release (NOCTURNE 32-BIT's violin, 53 ms a time constant, was -20 dB then: no staccato).
      const tau = tie && !plucked ? Math.max(0.004, tie / 6) : lift ? Math.min(ownTau, LIFT_TAU) : ownTau;
      g.gain.setTargetAtTime(0, s, tau);
      for (const x of srcs) halt(x.src, s + tau * 9 + 0.02);
      for (const l of lfos) halt(l, s + tau * 9 + 0.05);
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
      thunk.gain.value = peak * (inst.relGain ?? 0.9) * Math.max(0.2, Math.exp(-held / Math.max(0.5, life / 3)));
      rs.connect(thunk).connect(dyn);
      rs.start(s, r.onset);
    };
    // D184: damped at the written end (a lead note's end is its longest hold), unless it has died away first.
    if (plucked && end > t + life) {
      for (const x of srcs) halt(x.src, t + life + 0.05);
      for (const l of lfos) halt(l, t + life + 0.1);
    } else if (p.tie && !plucked) letGo(Math.max(t + 0.02, end - p.tie / 2), p.tie);
    // D302: a held note's release done by its written end, as a synthesized note's is (it began there,
    // and rang on a fifth of a second past it: a detached note's gap filled). D304: only a detached
    // note's (Play.apart: a reading's mark), plucked or held, its release -30 dB by its end, so
    // the gap the reading asks for is heard; every other note let go at its end, as before D302.
    else if (!p.lead && p.apart) letGo(Math.max(t + atk + 0.02, end - 3.5 * ownTau));
    else letGo(end);
    let stopped = false;
    let cents = 0;
    let muffled = false;
    const shape = p.hold ? this.touchShape({ ...xs, vib: xvib ? { depth: xvib, base: pt.vib?.depth ?? 0 } : undefined }, () => !stopped) : undefined;
    const retune = (tc: number) => {
      const off = 2 ** ((cents + (p.detune ?? 0) + (muffled ? -35 : 0)) / 1200);
      for (const x of srcs) x.src.playbackRate.setTargetAtTime(rateFor(x.set, x.m, baseHz * x.mult) * off, ctx.currentTime, tc);
    };
    return {
      shape,
      stop: (when = ctx.currentTime) => {
        if (stopped || when >= end) return;
        stopped = true;
        letGo(Math.max(when, t + 0.02), 0, !!p.lead);
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
          // D249: the swell bounded (unbounded, a crescendo pushed the organ past full scale).
          dyn.gain.setTargetAtTime(organSwell(level), now, 0.08);
          swell.frequency.setTargetAtTime(swellAt(organSwell(level)), now, 0.08);
        } else dyn.gain.setTargetAtTime(Math.max(0.7, Math.min(1.4, level)), now, 0.06);
      },
      trim: (level: number, at: number, until: number) => {
        if (stopped) return;
        rampTrim(dyn.gain, trimmed, level, at, until);
        trimmed = level;
      },
    };
  }

  /** An oscillator of a wave (D177): the native shapes, the NES pulses, and three of our own. */
  private osc(w: Wave): OscillatorNode {
    const o = this.ctx.createOscillator();
    if (w === "saw") o.type = "sawtooth";
    else if (w === "square" || w === "triangle" || w === "sine") o.type = w;
    else if (w === "pulse12" || w === "pulse25" || w === "pulse50") o.setPeriodicWave(this.wave(w) as PeriodicWave);
    else if (isShaped(w)) o.setPeriodicWave(this.shaped(w));
    else o.setPeriodicWave(this.custom(w));
    return o;
  }

  /** D209: a console's wave shape (the NES triangle's stair, a Game Boy wave sample, the VRC6 saw, FM), built once. */
  private shaped(w: ShapedWave): PeriodicWave {
    let pw = this.waves.get(w);
    if (!pw) {
      const { real, imag } = harmonicsOf(SHAPES[w]);
      pw = this.ctx.createPeriodicWave(real, imag);
      this.waves.set(w, pw);
    }
    return pw;
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
    // D297, the analog drift (Patch.drift): the note's tuning off by a slow sine of the clock (no nodes).
    if (pt.drift) p = { ...p, detune: (p.detune ?? 0) + pt.drift.cents * Math.sin(2 * Math.PI * pt.drift.rate * t + pt.drift.rate * 40) };
    const pluck = pt.amp.s === 0;
    const tail = pluck || p.envelope === "piano" || p.envelope === "dulcimer";
    const end = Math.max(t + 0.05, at + dur - 0.01);
    const f0 = hz(midi);
    const bright = 2 ** ((p.bright ?? 0) * 1.3);
    const peak = pt.level * v.gain * (p.level ?? 1) * 0.5;
    const mix = bag.add(ctx.createGain());
    const oscs: OscillatorNode[] = [];
    /** D297: the pulse-width sweeps (SID 64), stopped with the note. */
    const pwmLfos: OscillatorNode[] = [];
    for (const o of pt.osc) {
      // D311: a pulse voice's width from the player's touch (GAME BOY's pulses), its loudness kept (pulseRms).
      const w0 = widthOf(o.wave);
      const wave = p.pw !== undefined && !p.pwContinuous && w0 !== undefined && o.wave !== "square" ? pulseWave(p.pw) : o.wave;
      const n = bag.src(this.osc(wave));
      n.frequency.value = f0 * 2 ** (o.octave ?? 0);
      const det = (o.detune ?? 0) + (p.detune ?? 0);
      n.detune.value = det;
      if (pt.scoop && !(p.legato && !pluck)) {
        // D209: the pitch comes in from off and settles (no extra nodes: the oscillator's own detune).
        // D302: not on a joined note (it would mark a new attack).
        n.detune.setValueAtTime(det + pt.scoop.cents, t);
        n.detune.setTargetAtTime(det, t, pt.scoop.time);
      }
      const g = bag.add(ctx.createGain());
      g.gain.value = (o.gain ?? 1) * (wave !== o.wave && w0 !== undefined ? pulseRms(w0) / pulseRms(widthOf(wave) ?? w0) : 1);
      if (pt.pwm && o.wave === "saw") {
        // D297, SID 64's pulse-width modulation: the sawtooth less itself `width` of a period later is a
        // pulse of that width (halved: within ±1); the delay swung by an LFO moves the width.
        // D311: the SID's width from the player's touch (12.5% to 50%, any between), its loudness kept, its sweep within it.
        const width = p.pwContinuous && p.pw !== undefined ? p.pw : pt.pwm.width;
        const pw = { ...pt.pwm, width, depth: Math.min(pt.pwm.depth, Math.max(0, width - 0.03)) };
        if (width !== pt.pwm.width) g.gain.value *= pulseRms(pt.pwm.width) / pulseRms(width);
        const f = f0 * 2 ** (o.octave ?? 0);
        const half = bag.add(ctx.createGain());
        half.gain.value = 0.5;
        const late = bag.add(ctx.createDelay(0.05));
        late.delayTime.value = pw.width / f;
        const neg = bag.add(ctx.createGain());
        neg.gain.value = -0.5;
        n.connect(half).connect(g);
        n.connect(late).connect(neg).connect(g);
        // D305: following the clock (SWITCHED-ON's slow PWM: one free-running LFO across the notes).
        if (pw.depth && pw.rate && pw.clock) clocked(late.delayTime, t, end + pt.amp.r, (x) => (pw.width + pw.depth * Math.sin(2 * Math.PI * pw.rate * x)) / f, 0.05);
        else if (pw.depth && pw.rate) {
          const lfo = bag.src(ctx.createOscillator());
          lfo.frequency.value = pw.rate;
          const sweep = bag.add(ctx.createGain());
          sweep.gain.value = pw.depth / f;
          lfo.connect(sweep).connect(late.delayTime);
          lfo.start(t);
          pwmLfos.push(lfo);
        }
        g.connect(mix);
      } else n.connect(g).connect(mix);
      oscs.push(n);
    }
    // D297, two-operator FM (Patch.fm): a sine modulator at `ratio` times the note into every
    // oscillator's frequency, its depth (index x the modulator's frequency, Hz) from `index` to `to`
    // over `time` (a time constant of a third of it), through `rise` first where given; a second
    // modulator at a fixed index. The modulators follow the vibrato and the bends (ratios kept).
    const mods: { o: OscillatorNode; ratio: number; det: number }[] = [];
    if (pt.fm) {
      const fm = pt.fm;
      const mod = (ratio: number, det = 0) => {
        const o = bag.src(ctx.createOscillator());
        // D302: the modulator fed back on itself (the YM2612's operator 1: a brighter, saw-like wave).
        if (fm.fb) o.setPeriodicWave(this.feedback(fm.fb));
        o.frequency.value = f0 * ratio;
        o.detune.value = (p.detune ?? 0) + det;
        const depth = bag.add(ctx.createGain());
        o.connect(depth);
        for (const n of oscs) depth.connect(n.frequency);
        mods.push({ o, ratio, det });
        return depth.gain;
      };
      // D311: MEGA FM's index (the timbre throughout: fmScale) and BLEEPS' mallet (the strike's burst: strike), from the player's touch.
      const xi = p.fmScale ?? 1;
      const xs0 = p.strike ?? 1;
      const hz1 = f0 * fm.ratio * xi;
      // D302: the modulator a few cents off its ratio (the chip's DT1: a slow beating in the timbre).
      const d = mod(fm.ratio, fm.detune ?? 0);
      // D302: a joined note goes on at the body's index (no bright onset: the YM2612 legato, no key-on).
      const joinedOn = p.legato && !pluck;
      d.setValueAtTime((joinedOn ? fm.to : fm.index * xs0) * hz1, t);
      let from = t;
      if (fm.rise && !joinedOn) {
        d.linearRampToValueAtTime(fm.rise.to * xs0 * hz1, t + fm.rise.time);
        from = t + fm.rise.time;
      }
      d.setTargetAtTime(fm.to * hz1, from, fm.time / 3);
      if (fm.mod2) {
        // A second modulator: a fixed index, or (D302) its own fall (an e-piano's tine, a slap's click).
        const m2 = fm.mod2;
        const g2 = mod(m2.ratio, -(fm.detune ?? 0) / 2);
        const hz2 = f0 * m2.ratio * xi;
        if (m2.to !== undefined && m2.time) {
          g2.setValueAtTime((joinedOn ? m2.to : m2.index * xs0) * hz2, t);
          g2.setTargetAtTime(m2.to * hz2, t, m2.time / 3);
        } else g2.value = m2.index * hz2;
      }
    }
    /** Every oscillator whose pitch moves with the note (the carriers and, D297, the modulators). */
    const tuned = [...oscs, ...mods.map((m) => m.o)];
    // D302, a portamento into a joined note (Patch.slide: TOMITA's whistle, TRACKER's tone portamento).
    if (pt.slide && p.legato && p.from !== undefined && p.from !== midi) {
      for (const [i, n] of oscs.entries()) {
        const k = 2 ** (pt.osc[i].octave ?? 0);
        n.frequency.setValueAtTime(hz(p.from) * k, t);
        n.frequency.setTargetAtTime(f0 * k, t, pt.slide / 3);
      }
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
    if (pt.bits) {
      // D297: the DAC's grain: the oscillators' sum (within ±1) on 2^bits levels, before the envelope.
      const sh = bag.add(ctx.createWaveShaper());
      sh.curve = this.stairs(pt.bits);
      src = src.connect(sh);
    }
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
      // D302: joined, the filter does not open anew (no "wah" of an attack).
      // D311: BLEEPS' mallet: a harder strike opens the filter further (never under the base).
      const top = p.legato && !pluck ? base : Math.min(18000, base * Math.max(1, (pt.filter.env ?? 1) * (p.strike ?? 1)) * (1 + (p.accent ?? 0) * 0.8) * (1 + (p.crisp ?? 0) * 0.6));
      fl.frequency.setValueAtTime(top, t);
      fl.frequency.setTargetAtTime(base, t + 0.005, pt.filter.envDecay ?? 0.1);
      src = src.connect(fl);
      if (pt.filter.poles === 4) {
        // D294: a second pole pair, the same sweep (24 dB an octave, the resonance on the first alone).
        const f2 = bag.add(ctx.createBiquadFilter());
        f2.type = fl.type;
        f2.Q.value = 0.6;
        f2.frequency.setValueAtTime(top, t);
        f2.frequency.setTargetAtTime(base, t + 0.005, pt.filter.envDecay ?? 0.1);
        src = src.connect(f2);
      }
      // D302, TOMITA: the filter sweeping slowly with the clock (continuous from note to note).
      const sw = pt.filter.sweep;
      if (sw) {
        const at = (x: number) => Math.min(16000, base * 2 ** (sw.octaves * Math.sin(2 * Math.PI * sw.rate * x)));
        for (const f of [fl, ...(pt.filter.poles === 4 && src !== fl ? [src as BiquadFilterNode] : [])]) clocked(f.frequency, t + Math.max(0.12, (pt.filter.envDecay ?? 0.1) * 4), end + pt.amp.r, at);
      }
    } else if (bright !== 1) {
      const tone = bag.add(ctx.createBiquadFilter());
      tone.type = "lowpass";
      tone.frequency.value = Math.min(16000, f0 * 8 * bright);
      src = src.connect(tone);
    }
    if (pt.hp) {
      // D297: the 120 Hz floor (12 dB an octave): the bass's pitch from its harmonics, no boom.
      const hp = bag.add(ctx.createBiquadFilter());
      hp.type = "highpass";
      hp.frequency.value = pt.hp;
      hp.Q.value = 0.7071;
      src = src.connect(hp);
    }
    if (pt.phaser) {
      // D302, TOMITA's phased strings: two allpass stages swept with the clock, beside the dry sound: moving notches.
      const ph = pt.phaser;
      const wet = bag.add(ctx.createGain());
      wet.gain.value = 0.5;
      const dry = bag.add(ctx.createGain());
      dry.gain.value = 0.5;
      const sum = bag.add(ctx.createGain());
      let chain: AudioNode = src;
      for (let k = 0; k < 2; k++) {
        const ap = bag.add(ctx.createBiquadFilter());
        ap.type = "allpass";
        ap.Q.value = 0.6;
        clocked(ap.frequency, t, end + pt.amp.r, (x) => ph.lo * (ph.hi / ph.lo) ** (0.5 + 0.5 * Math.sin(2 * Math.PI * ph.rate * x + k * 0.6)));
        chain = chain.connect(ap);
      }
      chain.connect(wet).connect(sum);
      src.connect(dry).connect(sum);
      src = sum;
    }
    // D311: the player's touch: a lowpass (the echo manual, the lute stop, a closed singer), the wah's peak, a swell.
    const xs = p.hold ? this.touchStage(src, p, f0, bag) : null;
    if (xs) src = xs.out;
    src = this.shelf(src, Math.max(1200, Math.min(3500, f0 * 4)), t, p.tone ?? 0, p.crisp ?? 0, bag);
    const dull = p.muffleable ? bag.add(ctx.createBiquadFilter()) : null;
    if (dull) {
      dull.type = "lowpass";
      dull.frequency.value = 16000;
      src = src.connect(dull);
    }
    const g = bag.add(ctx.createGain());
    const a = Math.max(0.002, pt.amp.a * (1 + (p.soft ?? 0) * 4) * (1 - (p.crisp ?? 0) * 0.5));
    const st = pt.steps;
    const sus = st ? (peak * st.to) / st.from : peak * pt.amp.s;
    // D302: joined to the next: held to the crossfade, not released before it.
    const relAt = Math.max(t + a + 0.02, end - (p.tie ? Math.min(pt.amp.r, p.tie / 2) : pt.amp.r));
    g.gain.setValueAtTime(0, t);
    if (p.legato && !pluck) g.gain.linearRampToValueAtTime(sus || peak * 0.7, t + 0.02);
    else {
      g.gain.linearRampToValueAtTime(peak * (1 + (p.accent ?? 0) * 0.7), t + a);
      // D311: the lute stop (a harpsichord's stand-in before its recording): the shorter ring.
      if (pluck) g.gain.setTargetAtTime(0, t + a, p.lute ? LUTE_TAU : pt.amp.d * 2 ** (-(midi - 60) / 30));
      else if (st) {
        // D294: the Game Boy's volume envelope: a step of 1/15 every period/64 s, abrupt, down to its floor.
        for (let k = 1; k <= st.from - st.to; k++) {
          const at = t + a + (k * st.period) / 64;
          if (at >= relAt) break;
          g.gain.setValueAtTime((peak * (st.from - k)) / st.from, at);
        }
      } else g.gain.setTargetAtTime(sus, t + a, pt.amp.d / 3);
    }
    if (!tail) {
      const held = st && !p.legato ? (peak * Math.max(st.to, st.from - Math.floor(((relAt - t - a) * 64) / st.period))) / st.from : sus;
      g.gain.setValueAtTime(held, relAt);
      g.gain.linearRampToValueAtTime(0, end);
    }
    // The LFOs, stopped with the note (D184: they ran on 2 s past its end, and past an early stop).
    const lfos: AudioScheduledSourceNode[] = [...pwmLfos];
    let xtrem: { lfo: OscillatorNode; rate: number } | undefined;
    if (pt.trem) {
      const lfo = bag.src(ctx.createOscillator());
      // D311: the vibraphone's motor, its speed the thumb's (held sideways).
      if (p.hold === "trem") xtrem = { lfo, rate: pt.trem.rate };
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
    // D311: the player's vibrato, its depth the thumb's (the patch's own the base).
    const xvib = p.hold === "vibrato" ? this.touchVibrato(tuned.map((o) => o.detune), t, pt.vib?.depth ?? 0, pt.vib?.delay ?? 0.3, pt.vib?.rate ?? 5.5, bag, lfos) : null;
    if (!xvib && pt.vib && end - t > pt.vib.delay + 0.1) {
      const lfo = bag.src(ctx.createOscillator());
      lfos.push(lfo);
      const depth = bag.add(ctx.createGain());
      lfo.frequency.value = pt.vib.rate;
      depth.gain.setValueAtTime(0, t);
      depth.gain.setValueAtTime(0, t + pt.vib.delay);
      depth.gain.linearRampToValueAtTime(pt.vib.depth, t + pt.vib.delay + 0.25);
      lfo.connect(depth);
      for (const o of tuned) depth.connect(o.detune);
      lfo.start(t);
    }
    // D213: the subject's vibrato (a plucked patch only a shimmer).
    this.vibrato(tuned.map((o) => o.detune), t, end, pluck ? Math.min(3, p.vib ?? 0) : (p.vib ?? 0), bag, lfos);
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
      for (const o of tuned) (depth.connect(o.detune), centre.connect(o.detune));
      lfo.start(t + 0.06);
      centre.start(t + 0.06);
    }
    const pan = ctx.createStereoPanner ? bag.add(ctx.createStereoPanner()) : null;
    const dyn = bag.add(ctx.createGain());
    if (pan) {
      pan.pan.value = Math.max(-1, Math.min(1, v.pan));
      // D302, TOMITA's theatrical stereo: the voice wandering slowly about its place (within ±0.35, a phone's mix).
      const ap = pt.autopan;
      if (ap) clocked(pan.pan, t, end + pt.amp.r, (x) => Math.max(-0.35, Math.min(0.35, v.pan + ap.depth * Math.sin(2 * Math.PI * ap.rate * x))));
      src.connect(g).connect(dyn).connect(pan).connect(this.busOf(p));
    } else src.connect(g).connect(dyn).connect(this.busOf(p));
    this.send(pan ?? dyn, p.room, bag);
    // D297: the preset's own effect (the echo, the hall), from this voice's patch.
    this.fxSend(pan ?? dyn, pt.send, bag);
    if (pt.chiff && !p.legato) {
      // D297, CHAMBER ORGAN: the pipe's chiff: band-passed noise about the `at`th harmonic, past the
      // envelope (the pipe's slower speech), up in 3 ms and gone within `time`.
      const ch = pt.chiff;
      const nz = bag.src(this.noise());
      const bp = bag.add(ctx.createBiquadFilter());
      bp.type = "bandpass";
      bp.frequency.value = Math.min(9000, f0 * ch.at);
      bp.Q.value = 2;
      const cg = bag.add(ctx.createGain());
      cg.gain.setValueAtTime(0, t);
      cg.gain.linearRampToValueAtTime(peak * ch.level * 2, t + 0.003);
      cg.gain.setTargetAtTime(0, t + 0.003, ch.time / 3);
      nz.connect(bp).connect(cg).connect(dyn);
      nz.start(t);
      halt(nz, t + ch.time * 2 + 0.03);
    }
    // D184: a plucked or struck note is damped at its written end (it rang 6 s whatever its length:
    // fifty voices at once on a phone); a lead note's end is its hold, so it rings as it would.
    const damp = tail && end + 0.5 < t + 6;
    // D302: the damper quicker for a detached note (80 ms let a detached pluck ring into the next: no gap
    // heard); D304: only a detached note's, the rest ring as they did.
    if (damp) g.gain.setTargetAtTime(0, Math.max(t + a + 0.01, end), p.apart ? 0.03 : 0.08);
    const last = tail ? (damp ? end + 0.5 : t + 6) : end + 0.05;
    for (const l of lfos) halt(l, last + 0.1);
    for (const o of tuned) (o.start(t), halt(o, last));
    if (breath) (breath.start(t), halt(breath, last));
    let stopped = false;
    const shape = p.hold ? this.touchShape({ ...xs, vib: xvib ? { depth: xvib, base: pt.vib?.depth ?? 0 } : undefined, trem: xtrem }, () => !stopped) : undefined;
    return {
      shape,
      stop: (when = ctx.currentTime) => {
        if (stopped) return;
        stopped = true;
        const s = Math.max(when, t + 0.02);
        if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(s);
        else (g.gain.cancelScheduledValues(s), g.gain.setValueAtTime(sus || peak * 0.3, s));
        g.gain.linearRampToValueAtTime(0, s + Math.max(0.02, p.legato ? 0.02 : pt.amp.r));
        for (const o of tuned) halt(o, s + pt.amp.r + 0.1);
        if (breath) halt(breath, s + pt.amp.r + 0.1);
        for (const l of lfos) halt(l, s + pt.amp.r + 0.15);
      },
      bend: (cents: number) => {
        if (stopped) return;
        for (const [i, o] of oscs.entries()) o.detune.setTargetAtTime((pt.osc[i].detune ?? 0) + (p.detune ?? 0) + cents, ctx.currentTime, 0.02);
        for (const m of mods) m.o.detune.setTargetAtTime((p.detune ?? 0) + m.det + cents, ctx.currentTime, 0.02);
      },
      glide: (to: number) => {
        if (stopped) return;
        const f = hz(to);
        for (const [i, o] of oscs.entries()) o.frequency.setTargetAtTime(f * 2 ** (pt.osc[i].octave ?? 0), ctx.currentTime, 0.025);
        for (const m of mods) m.o.frequency.setTargetAtTime(f * m.ratio, ctx.currentTime, 0.025);
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
   * D302, VOCAL SYNTH: a sung note (Patch.sing; sound.ts Sing, VOWELS, CONSONANTS): the glottal source
   * and breath through five formant band-passes in parallel, a new syllable's consonant (the formants
   * moving from the consonant's into the vowel's, a burst or a murmur), the pitch's scoop and overshoot
   * at the onset (or, joined, its glide from the note before: the vowel goes on, no consonant), the
   * late vibrato, the fall at a phrase's end; the bright "ring" a lift at 3 kHz. About 23 nodes a
   * note (two sources and an LFO).
   */
  private singNote(midi: number, at: number, dur: number, v: Voicing, pt: Patch, p: Play, bag: Bag): Sounding {
    const ctx = this.ctx;
    const sg = pt.sing!;
    const t = Math.max(at, ctx.currentTime);
    const end = Math.max(t + 0.06, at + dur - 0.01);
    const f0 = hz(midi);
    // (SING_GAIN: the source's flat pulse train, normalised to its peak, is quieter than a sawtooth.)
    const peak = pt.level * v.gain * (p.level ?? 1) * 0.5 * SING_GAIN;
    const joined = !!p.legato;
    const det0 = p.detune ?? 0;
    // D304: each voice its own glottis (Patch.osc's first wave: glottal, glottalWarm, glottalLow).
    const o = bag.src(this.osc(pt.osc[0]?.wave ?? "glottal"));
    // The pitch: joined, from the note before (a glide of about 70 ms); else scooped up from below.
    if (joined && p.from !== undefined) {
      o.frequency.setValueAtTime(hz(p.from), t);
      o.frequency.setTargetAtTime(f0, t + 0.005, 0.025);
    } else o.frequency.value = f0;
    const dir = joined && p.from !== undefined ? Math.sign(midi - p.from) || 1 : 1;
    o.detune.setValueAtTime(det0 + (joined ? 0 : -sg.scoop), t);
    o.detune.linearRampToValueAtTime(det0 + dir * sg.over, t + (joined ? 0.09 : 0.07));
    o.detune.setTargetAtTime(det0, t + (joined ? 0.09 : 0.07), 0.045);
    // A phrase's end: the fall as the voice lets go.
    const fallAt = Math.max(t + 0.25, end - 0.16);
    if (p.final && !p.tie && sg.fall && end - t > 0.35) {
      o.detune.setValueAtTime(det0, fallAt);
      o.detune.linearRampToValueAtTime(det0 - sg.fall, end);
    }
    const voiced = bag.add(ctx.createGain());
    o.connect(voiced);
    // Breath: noise under the voice (and a consonant's burst through it).
    const nz = bag.src(this.noise());
    const air = bag.add(ctx.createGain());
    nz.connect(air);
    const src = bag.add(ctx.createGain());
    voiced.connect(src);
    air.connect(src);
    const cons = CONSONANTS[sg.cons];
    const ct = joined ? 0 : cons.time;
    voiced.gain.setValueAtTime(joined ? 1 : cons.voiced, t);
    if (!joined) {
      if (cons.voiced === 0) voiced.gain.setValueAtTime(0, t + ct * 0.4);
      voiced.gain.setTargetAtTime(1, t + ct * 0.4, ct / 3);
    }
    const breath = sg.breath * 0.35;
    air.gain.setValueAtTime(breath, t);
    if (!joined && cons.burst) {
      // D304: the burst comes in over a few ms (a step was a click on every new note).
      air.gain.linearRampToValueAtTime(cons.burst, t + ct * 0.35);
      air.gain.setTargetAtTime(breath, t + ct * 0.35 + 0.004, 0.008);
    } else if (!joined) air.gain.setTargetAtTime(breath, t, 0.02);
    // D305: an aspirated onset (Sing.aspirate): more breath as the syllable begins.
    if (!joined && sg.aspirate) {
      air.gain.setValueAtTime(breath + sg.aspirate, t + ct * 0.35 + 0.006);
      air.gain.setTargetAtTime(breath, t + ct * 0.35 + 0.01, 0.025);
    }
    // The formants, the singer's size on them; from the consonant's into the vowel's.
    const out = bag.add(ctx.createGain());
    const scale = (sg.type === "bass" || sg.type === "tenor" ? 1 : 1.12) * sg.size;
    for (const [i, [f, db, bw]] of VOWELS[sg.type][sg.vowel].entries()) {
      const bp = bag.add(ctx.createBiquadFilter());
      bp.type = "bandpass";
      // D305: the first formant tuned up to the pitch (Sing.tune), a soprano's on her high notes.
      // D311: the player's touch: the vowel closed toward the soft side, opened toward the strong (touch-expr.ts formantAt).
      const fx = p.open === undefined ? f : formantAt(f, VOWELS[sg.type][VOWEL_CLOSED[sg.vowel] ?? "o"][i]?.[0] ?? f, i, p.open);
      const tuned = (m: number) => (i === 0 && sg.tune ? Math.max(fx * sg.size, sg.tune * hz(m)) : fx * sg.size);
      const fv = Math.min(ctx.sampleRate * 0.45, tuned(midi));
      bp.Q.value = (f * sg.size) / (bw * sg.size * (sg.bw ?? 1));
      if (!joined && i < 3) {
        bp.frequency.setValueAtTime(Math.max(cons.f[i] * scale, fv - f * sg.size + cons.f[i] * scale), t);
        bp.frequency.setTargetAtTime(fv, t + ct * 0.5, ct / 2.5);
      } else if (joined && p.from !== undefined && i === 0 && sg.tune && tuned(p.from) !== tuned(midi)) {
        bp.frequency.setValueAtTime(Math.min(ctx.sampleRate * 0.45, tuned(p.from)), t);
        bp.frequency.setTargetAtTime(fv, t + 0.005, 0.03);
      } else bp.frequency.value = fv;
      const g = bag.add(ctx.createGain());
      g.gain.value = 10 ** ((db + (i >= 2 ? (sg.upper ?? 0) : 0)) / 20);
      src.connect(bp).connect(g).connect(out);
    }
    let tail: AudioNode = out;
    // D304: nothing above the singer's formants (the harmonics leaking through their skirts glittered).
    if (sg.top) {
      const lp = bag.add(ctx.createBiquadFilter());
      lp.type = "lowpass";
      lp.frequency.value = Math.min(ctx.sampleRate * 0.45, sg.top * sg.size);
      lp.Q.value = 0.6;
      tail = tail.connect(lp);
    }
    if (sg.ring) {
      const sh = bag.add(ctx.createBiquadFilter());
      sh.type = "peaking";
      sh.frequency.value = 3000;
      sh.Q.value = 0.9;
      sh.gain.value = sg.ring;
      tail = tail.connect(sh);
    }
    // D311: the player's swell (messa di voce), and a closed singer's lowpass (SOLO VOICES before its recording).
    const xs = p.hold ? this.touchStage(tail, p, f0, bag) : null;
    if (xs) tail = xs.out;
    tail = this.shelf(tail, Math.max(1200, Math.min(3500, f0 * 4)), t, p.tone ?? 0, p.crisp ?? 0, bag);
    const g = bag.add(ctx.createGain());
    const a = joined ? 0.02 : Math.max(0.006, pt.amp.a);
    const relAt = Math.max(t + a + 0.02, end - (p.tie ? Math.min(pt.amp.r, p.tie / 2) : pt.amp.r));
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, relAt);
    g.gain.linearRampToValueAtTime(0, end);
    // The vibrato: late, ramped in (Patch.vib); and the subject's own (Play.vib).
    const lfos: AudioScheduledSourceNode[] = [];
    // D311: VOCAL SYNTH, the player's note: straight while the thumb moves; held still BLOOM_STILL s, it blooms
    // into a little vibrato (the voice's own, at most BLOOM_CENTS; the bass, which has none, BLOOM_DEFAULT).
    const bloomCents = Math.min(BLOOM_CENTS, pt.vib?.depth ?? BLOOM_DEFAULT);
    const bloom = p.open !== undefined && p.hold === "messa" ? this.touchVibrato([o.detune], t, 0, 0, pt.vib?.rate ?? 5.4, bag, lfos) : null;
    if (bloom) bloom.gain.setTargetAtTime(bloomCents, t + BLOOM_STILL, 0.12);
    if (!bloom && pt.vib && end - t > pt.vib.delay + 0.1) {
      const lfo = bag.src(ctx.createOscillator());
      lfos.push(lfo);
      const depth = bag.add(ctx.createGain());
      lfo.frequency.value = pt.vib.rate;
      depth.gain.setValueAtTime(0, t);
      depth.gain.setValueAtTime(0, t + pt.vib.delay);
      depth.gain.linearRampToValueAtTime(pt.vib.depth, t + pt.vib.delay + 0.3);
      lfo.connect(depth).connect(o.detune);
      lfo.start(t);
    }
    this.vibrato([o.detune], t, end, p.vib ?? 0, bag, lfos);
    const pan = ctx.createStereoPanner ? bag.add(ctx.createStereoPanner()) : null;
    const dyn = bag.add(ctx.createGain());
    if (pan) {
      pan.pan.value = Math.max(-1, Math.min(1, v.pan));
      tail.connect(g).connect(dyn).connect(pan).connect(this.busOf(p));
    } else tail.connect(g).connect(dyn).connect(this.busOf(p));
    this.send(pan ?? dyn, p.room, bag);
    this.fxSend(pan ?? dyn, pt.send, bag);
    o.start(t);
    nz.start(t);
    halt(o, end + 0.05);
    halt(nz, end + 0.05);
    for (const l of lfos) halt(l, end + 0.05);
    let stopped = false;
    const swell = p.hold ? this.touchShape({ ...xs }, () => !stopped) : undefined;
    /** Where the thumb last moved to (a move of BLOOM_MOVE or more starts the stillness over). */
    let anchor = 0;
    const shape = swell
      ? (x: number) => {
          swell(x);
          if (!bloom || stopped || Math.abs(x - anchor) < BLOOM_MOVE) return;
          anchor = x;
          const now = ctx.currentTime;
          retarget(bloom.gain, 0, now, 0.08);
          bloom.gain.setTargetAtTime(bloomCents, now + BLOOM_STILL, 0.12);
        }
      : undefined;
    return {
      shape,
      stop: (when = ctx.currentTime) => {
        if (stopped) return;
        stopped = true;
        const s = Math.max(when, t + 0.02);
        if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(s);
        else (g.gain.cancelScheduledValues(s), g.gain.setValueAtTime(peak, s));
        const r = Math.max(0.02, p.legato ? 0.03 : pt.amp.r);
        g.gain.linearRampToValueAtTime(0, s + r);
        for (const x of [o, nz, ...lfos]) halt(x, s + r + 0.05);
      },
      bend: (cents: number) => {
        if (!stopped) o.detune.setTargetAtTime(det0 + cents, ctx.currentTime, 0.02);
      },
      glide: (to: number) => {
        if (!stopped) o.frequency.setTargetAtTime(hz(to), ctx.currentTime, 0.03);
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
    halt(o, t + 0.26);
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
    halt(n, t + 0.26);
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
      halt(b, at + 0.035);
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
      halt(n, at + len + 0.02);
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
      halt(o, at + len + 0.02);
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
            halt(n, at + k + 0.16);
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
    this.wireDrive(z === "fuoco");
    this.roomTo();
  }
  /** D249: the drive's shaper wired in for CON FUOCO, and unwired once its fade-out (about 3 s) is done. */
  private wireDrive(on: boolean) {
    if (this.driveOff) (clearTimeout(this.driveOff), (this.driveOff = null));
    if (on && !this.driveOn) {
      this.master.connect(this.shaper);
      this.driveOn = true;
    } else if (!on && this.driveOn) {
      const tm = setTimeout(() => {
        this.driveOff = null;
        if (this.zoneNow === "fuoco" || !this.driveOn) return;
        this.master.disconnect(this.shaper);
        this.driveOn = false;
      }, 3000);
      (tm as { unref?: () => void }).unref?.();
      this.driveOff = tm;
    }
  }
  /** D249: whether the drive is wired in now (for the tests). */
  get driving(): boolean {
    return this.driveOn;
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
    halt(o, at + 0.04);
  }

  /**
   * D239: the HIGHWAY's "in the lane" chime: a tiny bell over the note struck in its planned lane,
   * two octaves up (a sine and a soft inharmonic partial), about 0.18 s, well under the note.
   */
  chime(midi: number, at: number, level = 1) {
    const ctx = this.ctx;
    const f = hz(Math.min(108, midi + 24));
    const bag = new Bag();
    const g = bag.add(ctx.createGain());
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.05 * Math.max(0.4, Math.min(1, level)), at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    g.connect(this.bus);
    for (const [mul, lv] of [[1, 1], [2.76, 0.3]]) {
      const o = bag.src(ctx.createOscillator());
      const og = bag.add(ctx.createGain());
      o.type = "sine";
      o.frequency.value = f * mul;
      og.gain.value = lv;
      o.connect(og).connect(g);
      o.start(at);
      halt(o, at + 0.2);
    }
  }
}

/** The voices' timbres and places (D167): the bass a triangle, the top voice the thinnest pulse, the inner ones fuller; spread left (low) to right (high). */
export function voicing(voice: number, count: number, _played = true): Voicing {
  const fromTop = voice;
  const bass = count > 1 && fromTop === count - 1;
  // D291: a phone's speaker gives almost nothing below 500 Hz, where the triangle has nearly all its
  // sound: there the bass is a pulse (its overtones carry the pitch), the one no voice near it uses.
  const phoneBass = bass && isPhone();
  const timbre: Timbre = phoneBass ? (count > 3 ? "pulse25" : "pulse50") : bass || count === 1 ? "triangle" : fromTop === 0 ? "pulse12" : fromTop === 1 && count > 3 ? "pulse25" : count > 3 ? "pulse50" : "pulse25";
  // D297: a period preset places its voices itself (within ±0.35) and may set an inner voice a shade lighter.
  const place = placeFor(voice, count);
  const pan = place ? place.pan : count > 1 ? (0.5 - fromTop / (count - 1)) * 0.9 : 0;
  // D169: the voice played is no louder than the others; it stands out by its colour in the box.
  return { timbre, pan, gain: (phoneBass ? PHONE_BASS_GAIN : 1) * (place?.level ?? 1), patch: patchFor(voice, count) };
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

/**
 * D297, NOCTURNE 32-BIT's hall (and CHAMBER ORGAN's church): stereo noise decaying to -60 dB in `rt60` s, thin for its first
 * 12 ms (the early reflections) and darkening as it decays (a one-pole lowpass closing, as effects.ts's
 * hall with its brightness, 0.3 for the hall); `seconds` long. Seeded: the same hall every time.
 */
export function darkHall(ctx: BaseAudioContext, seconds: number, rt60 = HALL.rt60, brightness = HALL.brightness): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const b = ctx.createBuffer(2, len, sr);
  const tau = rt60 / Math.log(1000);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let seed = 4321 + c * 97;
    let lp = 0;
    for (let i = 0; i < len; i++) {
      seed = (seed * 16807) % 2147483647;
      const t = i / sr;
      const k = Math.min(0.98, (1 - brightness) * 0.6 + (t / seconds) * 0.35);
      lp = lp * k + ((seed / 2147483647) * 2 - 1) * (1 - k);
      // Sparse before 12 ms: one sample in eight.
      const early = t < 0.012 ? (i % 8 === 0 ? 2.5 : 0) : 1;
      d[i] = lp * early * Math.exp(-t / tau) * Math.min(1, (len - i) / (0.05 * sr));
    }
  }
  return b;
}

/**
 * D302: a parameter moved with the clock from `from` to `to` (s), by `at` (a function of the clock),
 * in straight lines every `step` s: a sweep that goes on from note to note (it follows the clock, not
 * the note), as a single LFO across all the notes would.
 */
export function clocked(param: AudioParam, from: number, to: number, at: (x: number) => number, step = 0.08) {
  param.setValueAtTime(at(from), from);
  for (let x = from + step; x < to + step; x += step) param.linearRampToValueAtTime(at(x), x);
}

/** D297: a WaveShaper curve quantising -1..1 to 2^bits levels (a staircase, 8 points a step). */
export function stairCurve(bits: number): Float32Array<ArrayBuffer> {
  const levels = 2 ** bits;
  const n = Math.min(65536, levels * 8);
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.max(-1, Math.min(1, Math.round((x * levels) / 2) / (levels / 2)));
  }
  return c;
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
