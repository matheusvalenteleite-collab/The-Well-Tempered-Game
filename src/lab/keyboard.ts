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

/** A rounder, sustained tone (a flute stop) for the voice in the spotlight, so it stands apart from the plucked ones. */
function flute(ac: AudioContext, out: AudioNode, hz: number, t: number, len: number, gain: number) {
  const o = ac.createOscillator();
  o.type = "triangle";
  o.frequency.value = hz;
  const o2 = ac.createOscillator();
  o2.type = "sine";
  o2.frequency.value = hz * 2;
  const g2 = ac.createGain();
  g2.gain.value = 0.25;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.03);
  g.gain.setValueAtTime(gain, t + Math.max(0.03, len - 0.04));
  g.gain.linearRampToValueAtTime(0.0001, t + len + 0.05);
  o.connect(g);
  o2.connect(g2).connect(g);
  g.connect(out);
  o.start(t);
  o2.start(t);
  o.stop(t + len + 0.08);
  o2.stop(t + len + 0.08);
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
  /** Stop at this tick. */
  to?: number;
  /** A voice to bring forward in a distinct (sustained) tone, the others softer. */
  spotlight?: number | null;
}

export function playPiece(p: WtcPiece, o: PlayOptions): void {
  playSpans(p, [{ from: o.from ?? 0, to: o.to ?? p.length, spotlight: o.spotlight ?? null }], o);
}

export interface Span {
  from: number;
  to: number;
  spotlight: number | null;
}

/** Play several stretches of a piece one after another (a pause between), each with its own voice in the spotlight. */
export function playSpans(p: WtcPiece, spans: Span[], o: Omit<PlayOptions, "from" | "to" | "spotlight">, gapSec = 0.7): void {
  stop();
  ctx ??= new AudioContext();
  const ac = ctx;
  const out = ac.createGain();
  out.gain.value = 0.32;
  const comp = ac.createDynamicsCompressor();
  out.connect(comp).connect(ac.destination);
  const secPerTick = 60 / o.bpm / TPQ;
  const oscs: OscillatorNode[] = [];
  // Each span's start in seconds, after the ones before it.
  const starts: number[] = [];
  let at = ac.currentTime + 0.1;
  for (const sp of spans) {
    const to = Math.min(sp.to, p.length);
    starts.push(at);
    p.voices.forEach((v, i) => {
      if (o.voices && !o.voices[i]) return;
      const lit = sp.spotlight === i;
      const dim = sp.spotlight != null && !lit;
      for (const [on, dur, pitch] of v) {
        if (on + dur <= sp.from || on >= to) continue;
        const start = Math.max(on, sp.from);
        const t = at + (start - sp.from) * secPerTick;
        const len = Math.max(0.05, (Math.min(on + dur, to) - start) * secPerTick * 0.97);
        oscs.push(...(lit ? flute(ac, out, frequency(pitch, o.tuning), t, len, 0.22) : pluck(ac, out, frequency(pitch, o.tuning), t, len, dim ? 0.07 : 0.16)));
      }
    });
    at += (to - sp.from) * secPerTick + gapSec;
  }
  const end = at - gapSec;
  let raf = 0;
  const frame = () => {
    const now = ac.currentTime;
    if (now >= end) {
      o.onTick?.(-1);
      return;
    }
    let k = starts.length - 1;
    while (k > 0 && starts[k] > now) k--;
    const sp = spans[k];
    o.onTick?.(Math.min(sp.to, sp.from + Math.max(0, now - starts[k]) / secPerTick));
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
