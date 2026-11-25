/**
 * D1061-D1065, THE GUITARIST'S HANDS AND THE AMP FROM THE THUMBS AND THE TILT (MECH.guitar, MECH.tilt): the glue between a held
 * thumb and its guitar notes, for the game (proto-game.ts; play.html's default since D1066, the developer view's GUITAR & TILT
 * switch turns it off). As bowing.ts is the bow's: each held thumb on a guitar has a GuitarHand (its pick's flick, its bend, the
 * lean sent on to the note), the note's Play.guitar is made here (guitarPlay: the stompbox from STEER as the note starts, the
 * amp's feedback for PSYCH's guitars), a join's left hand decided (lhOf) and a slide's glide timed (guitarSlide). Nothing is judged
 * or scored by it; every other sound, and both flags off, exactly as before. The Lab never sets the flags (MECH_DEFAULTS: off).
 */
import { GUITAR_GLIDE_MS, GUITAR_SLIDE_MAX, isGuitarSample, PickTracker, PSYCH_GUITARS, PSYCH_PRESET, stompOf, type GuitarPlay } from "../touch/guitar.ts";
import type { Sounding } from "../touch/chip.ts";
import { preset, type Patch } from "../touch/sound.ts";
import { tiltNow, tiltSensor, TiltSensor } from "../touch/tilt.ts";
import { MECH } from "./mechanics.ts";
import { intervalClass, settleTau, type Gesture } from "./slide-sound.ts";

/** D1061: the player's notes on `patch` are the guitarist's (MECH.guitar on, a fretted, plucked guitar). */
export const guitarNow = (patch: Patch | null | undefined): boolean => MECH.guitar && isGuitarSample(patch?.sample);
/** D1065: the amp and the stompboxes reach this guitar (MECH.tilt on, PSYCH's clean or fuzz guitar). */
export const ampNow = (patch: Patch | null | undefined): boolean => MECH.tilt && preset().id === PSYCH_PRESET && !!patch?.sample && PSYCH_GUITARS.has(patch.sample);

/** D1061-D1065: a guitar note's Play.guitar as it starts: PSYCH's stompbox read from STEER now (from the next note on), the amp's feedback wanted. */
export function guitarPlay(patch: Patch | null | undefined, own: GuitarPlay = {}): GuitarPlay {
  if (!ampNow(patch)) return { ...own };
  const st = stompOf(tiltNow().steer);
  return { amp: true, ...(st ? { stomp: st } : {}), ...own };
}

/**
 * D1065: the tilt asked for from a tap the player makes anyway (the PLAY tap that starts a piece), only where it is used: MECH.tilt
 * on and the piece's sound PSYCH. iOS asks the player once (DeviceMotionEvent.requestPermission); elsewhere it simply listens. Its
 * neutral taken again (the piece starts). Refused or no sensor: nothing, silently.
 */
export function askTilt(presetId: string): void {
  if (!MECH.tilt || presetId !== PSYCH_PRESET || typeof window === "undefined") return;
  const s = tiltSensor();
  s.ask();
  s.retakeNeutral();
}
export { TiltSensor };

/** D1064: a guitar's slide: a quick glide to the written pitch, settled early in the note (D1018's settleTau), up to a fifth; wider, a fresh pick. */
export function guitarSlide(from: number, to: number, noteMs: number): Gesture {
  if (Math.abs(to - from) > GUITAR_SLIDE_MAX) return { kind: "notes", name: "pick", notes: [], eachS: 0 };
  const ms = GUITAR_GLIDE_MS[intervalClass(from, to)];
  const tau = Math.max(0.008, Math.min(ms, 0.25 * noteMs)) / 1000;
  return { kind: "glide", name: "slide", tau: Math.min(tau, settleTau(from, to, noteMs)) };
}

/** D1061, D1062, D1065: one held thumb's hands on the guitar notes it sounds. */
export class GuitarHand {
  readonly tr: PickTracker;
  private cents = 0;
  private lean = 0;
  private leanMs = -1e9;
  constructor(tMs: number, x: number, barPx: number) {
    this.tr = new PickTracker(tMs, x, barPx);
  }
  /** The thumb at strength `x` (0..1 across its bar): the hard pick told once, the bend sent (Sounding.bend). */
  move(tMs: number, x: number, sounds: readonly Sounding[]) {
    const r = this.tr.move(tMs, x);
    if (r.hard) for (const s of sounds) s.guitar?.({ kind: "hard" });
    if (Math.abs(r.cents - this.cents) >= 0.5 || (r.cents === 0 && this.cents !== 0)) {
      this.cents = r.cents;
      for (const s of sounds) if (s.guitar) s.bend(r.cents);
    }
  }
  /** Each frame: the lean sent on to the held note (D1065: its feedback), when it changes or every 150 ms while it leans. */
  tick(tMs: number, sounds: readonly Sounding[]) {
    if (!MECH.tilt || !sounds.some((s) => s.guitar)) return;
    const v = tiltNow().lean;
    if (v <= 0 && this.lean <= 0) return;
    if (Math.abs(v - this.lean) < 0.02 && tMs - this.leanMs < 150) return;
    this.lean = v;
    this.leanMs = tMs;
    for (const s of sounds) s.guitar?.({ kind: "lean", v });
  }
  /** D1062: lifted: the string let back to its pitch as it is let go. */
  lift(sounds: readonly Sounding[]) {
    if (this.cents) for (const s of sounds) if (s.guitar) s.bend(0);
    this.cents = 0;
  }
}
