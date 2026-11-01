/**
 * A small harpsichord-like player for the lab's Well-Tempered Clavier tab: every voice of a piece,
 * scheduled at once, in a chosen tuning. Plucked tone (a bright wave through a closing filter, a
 * fast attack and a long decay), so that the voices stay distinct.
 */
import { frequency, type TuningId } from "../wtc/tunings.ts";
import { TPQ, type WtcPiece } from "../wtc/corpus.ts";
import { keySteps, mordentUnit, ornamentUnit, realise, trillUnit } from "../music/ornaments.ts";
import { parsePitch } from "../music/pitch.ts";
import ornamentsData from "../../data/wtc/ornaments.json" with { type: "json" };

// P23: the ornaments of the encodings (data/wtc/ornaments.json: voice, onset in ticks, pitch, kern
// signs, grace notes), played as the game's WTC study plays them (Bach's Explication; ORNAMENTS.md).
type OrnRow = [number, number, string, string, string[]?];
const ORN = ornamentsData as unknown as Record<string, OrnRow[]>;
const SHARPS = "FCGDAEB";
const MAJOR_SIG: Record<string, number> = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7 };
const MINOR_SIG: Record<string, number> = { A: 0, E: 1, B: 2, "F#": 3, "C#": 4, "G#": 5, "D#": 6, "A#": 7, D: -1, G: -2, C: -3, F: -4, Bb: -5, Eb: -6, Ab: -7 };
/** The key signature of a piece, as alterations by letter. */
function signatureOf(p: WtcPiece): Record<string, number> {
  const n = (p.mode === "minor" ? MINOR_SIG : MAJOR_SIG)[p.key] ?? 0;
  const sig: Record<string, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  for (let i = 0; i < Math.abs(n); i++) sig[n > 0 ? SHARPS[i] : SHARPS[6 - i]] = n > 0 ? 1 : -1;
  return sig;
}
/** A note as it sounds: itself, or its ornament realised at the tempo (bpm in quarters a minute). */
function sounding(p: WtcPiece, voice: number, k: number, bpm: number, steps: ReturnType<typeof keySteps>): [number, number, string][] {
  const [on, dur, pitch] = p.voices[voice][k];
  const row = (ORN[p.id] ?? []).find((r) => r[0] === voice && r[1] === on && r[2] === pitch);
  if (!row) return [[on, dur, pitch]];
  const prev = k > 0 ? parsePitch(p.voices[voice][k - 1][2]).midi : undefined;
  const graces = (row[4] ?? []).map((g) => ({ kind: g[0] as "q" | "Q", midi: parsePitch(g.slice(1)).midi }));
  const notes = realise({ midi: parsePitch(pitch).midi, at: on / TPQ, dur: dur / TPQ }, row[3], graces, { unit: ornamentUnit(bpm / 2), quick: mordentUnit(60 / bpm), trillUnit: trillUnit(60 / bpm), prevMidi: prev, ...steps });
  const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return notes.map((x) => [Math.round(x.at * TPQ), Math.max(1, Math.round(x.dur * TPQ)), `${NAMES[((x.midi % 12) + 12) % 12]}${Math.floor(x.midi / 12) - 1}`]);
}

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
  /** P23: the encoded ornaments played (default); false: the notes as written. */
  ornaments?: boolean;
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
      const steps = keySteps(signatureOf(p));
      const notes = o.ornaments === false ? v : v.flatMap((_, k) => sounding(p, i, k, o.bpm, steps));
      for (const [on, dur, pitch] of notes) {
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
