/**
 * A small harpsichord-like player for the lab's Well-Tempered Clavier tab: every voice of a piece,
 * scheduled at once, in a chosen tuning. Plucked tone (a bright wave through a closing filter, a
 * fast attack and a long decay), so that the voices stay distinct.
 */
import { frequency, type TuningId } from "../wtc/tunings.ts";
import { TPQ, type WtcPiece } from "../wtc/corpus.ts";

let ctx: AudioContext | null = null;
let stopAll: (() => void) | null = null;

function pluck(ac: AudioContext, out: AudioNode, hz: number, t: number, len: number, gain: number) {
  const o = ac.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = hz;
  const o2 = ac.createOscillator();
  o2.type = "square";
  o2.frequency.value = hz * 2;
  const g2 = ac.createGain();
  g2.gain.value = 0.18;
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.Q.value = 0.7;
  f.frequency.setValueAtTime(Math.min(9000, hz * 9), t);
  f.frequency.exponentialRampToValueAtTime(Math.max(400, hz * 2.2), t + Math.min(1.2, len + 0.3));
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(gain * 0.35, t + Math.max(0.05, Math.min(len, 1.5)));
  g.gain.setValueAtTime(gain * 0.35, t + len);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.09);
  o.connect(f);
  o2.connect(g2).connect(f);
  f.connect(g).connect(out);
  o.start(t);
  o2.start(t);
  o.stop(t + len + 0.12);
  o2.stop(t + len + 0.12);
  return [o, o2];
}

export interface PlayOptions {
  tuning: TuningId;
  /** Quarter notes per minute. */
  bpm: number;
  /** Start from this tick. */
  from?: number;
  /** Voices to play (all when absent). */
  voices?: boolean[];
  /** Called on every animation frame with the tick now sounding, and with -1 at the end. */
  onTick?: (tick: number) => void;
}

export function playPiece(p: WtcPiece, o: PlayOptions): void {
  stop();
  ctx ??= new AudioContext();
  const ac = ctx;
  const out = ac.createGain();
  out.gain.value = 0.32;
  const comp = ac.createDynamicsCompressor();
  out.connect(comp).connect(ac.destination);
  const secPerTick = 60 / o.bpm / TPQ;
  const from = o.from ?? 0;
  const t0 = ac.currentTime + 0.1;
  const oscs: OscillatorNode[] = [];
  p.voices.forEach((v, i) => {
    if (o.voices && !o.voices[i]) return;
    for (const [on, dur, pitch] of v) {
      if (on + dur <= from) continue;
      const start = Math.max(on, from);
      oscs.push(...pluck(ac, out, frequency(pitch, o.tuning), t0 + (start - from) * secPerTick, Math.max(0.05, (on + dur - start) * secPerTick * 0.97), 0.16));
    }
  });
  let raf = 0;
  const end = t0 + (p.length - from) * secPerTick;
  const frame = () => {
    const now = ac.currentTime;
    if (now >= end) {
      o.onTick?.(-1);
      return;
    }
    o.onTick?.(from + Math.max(0, now - t0) / secPerTick);
    raf = requestAnimationFrame(frame);
  };
  if (o.onTick) raf = requestAnimationFrame(frame);
  stopAll = () => {
    cancelAnimationFrame(raf);
    for (const x of oscs) {
      try {
        x.stop();
      } catch {
        /* already stopped */
      }
    }
    out.disconnect();
    o.onTick?.(-1);
  };
}

/** Play a short list of notes (a subject, an answer) one after another or together. */
export function playNotes(notes: { on: number; dur: number; pitch: string }[], tuning: TuningId, bpm = 80): void {
  stop();
  ctx ??= new AudioContext();
  const ac = ctx;
  const out = ac.createGain();
  out.gain.value = 0.35;
  out.connect(ac.destination);
  const secPerTick = 60 / bpm / TPQ;
  const t0 = ac.currentTime + 0.08;
  const base = Math.min(...notes.map((n) => n.on));
  const oscs = notes.flatMap((n) => pluck(ac, out, frequency(n.pitch, tuning), t0 + (n.on - base) * secPerTick, Math.max(0.05, n.dur * secPerTick * 0.97), 0.2));
  stopAll = () => {
    for (const x of oscs) {
      try {
        x.stop();
      } catch {
        /* already stopped */
      }
    }
    out.disconnect();
  };
}

export function stop(): void {
  stopAll?.();
  stopAll = null;
}
