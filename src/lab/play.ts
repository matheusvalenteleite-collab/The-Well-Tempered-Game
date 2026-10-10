/** A small, self-contained player for the lab: two triangle voices, no dependency on the game's engine. */
import { parsePitch } from "../music/pitch.ts";
import { HOLD, slotLength, sounding, tiedToNext, type Slot } from "../counterpoint/layout.ts";

let ctx: AudioContext | null = null;
let stopAt: (() => void) | null = null;

const hz = (p: string) => 440 * 2 ** ((parsePitch(p).midi - 69) / 12);

function tone(ac: AudioContext, out: AudioNode, p: string, t: number, len: number, gain: number) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = "triangle";
  o.frequency.value = hz(p);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.02);
  g.gain.setValueAtTime(gain, t + Math.max(0.03, len - 0.06));
  g.gain.linearRampToValueAtTime(0, t + len);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + len + 0.02);
  return o;
}

/** Play the cantus (whole notes) and a line on its layout; `bpm` counts half notes. Returns the duration in seconds. */
export function play(cantus: string[], line: (string | null)[], layout: Slot[], bpm = 72, onSlot?: (k: number) => void): number {
  stop();
  ctx ??= new AudioContext();
  const ac = ctx;
  const out = ac.createGain();
  out.gain.value = 0.5;
  out.connect(ac.destination);
  const whole = (2 * 60) / bpm;
  const t0 = ac.currentTime + 0.08;
  const oscs: OscillatorNode[] = [];
  cantus.forEach((p, b) => oscs.push(tone(ac, out, p, t0 + b * whole, whole, 0.18)));
  const timers: number[] = [];
  let t = 0;
  layout.forEach((s, k) => {
    const len = slotLength(s) * whole;
    const p = line[k];
    const continues = k > 0 && tiedToNext(layout, line, k - 1);
    if (sounding(p ?? null) && !continues) {
      let total = len;
      for (let j = k; tiedToNext(layout, line, j); j++) total += slotLength(layout[j + 1]) * whole;
      // Fifth species: a note lasts through the HOLD slots after it (over the bar line too).
      for (let j = k + 1; j < layout.length && line[j] === HOLD; j++) total += slotLength(layout[j]) * whole;
      oscs.push(tone(ac, out, p!, t0 + t, total, 0.2));
    }
    if (onSlot) timers.push(window.setTimeout(() => onSlot(k), (t0 - ac.currentTime + t) * 1000));
    t += len;
  });
  const end = t0 + cantus.length * whole;
  if (onSlot) timers.push(window.setTimeout(() => onSlot(-1), (end - ac.currentTime) * 1000));
  stopAt = () => {
    oscs.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    });
    timers.forEach((x) => clearTimeout(x));
    out.disconnect();
    onSlot?.(-1);
  };
  return end - ac.currentTime;
}

export function stop() {
  stopAt?.();
  stopAt = null;
}

/** Play whole-note lines together (three voices, first species); `onBar` follows the bar. */
export function playLines(lines: string[][], bpm = 72, onBar?: (k: number) => void): void {
  stop();
  ctx ??= new AudioContext();
  const ac = ctx;
  const out = ac.createGain();
  out.gain.value = 0.45;
  out.connect(ac.destination);
  const whole = (2 * 60) / bpm;
  const t0 = ac.currentTime + 0.08;
  const oscs = lines.flatMap((l) => l.map((p, k) => tone(ac, out, p, t0 + k * whole, whole, 0.15)));
  const timers = onBar ? [...lines[0].map((_, k) => window.setTimeout(() => onBar(k), (t0 - ac.currentTime + k * whole) * 1000)), window.setTimeout(() => onBar(-1), (t0 - ac.currentTime + lines[0].length * whole) * 1000)] : [];
  stopAt = () => {
    oscs.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    });
    timers.forEach((x) => clearTimeout(x));
    out.disconnect();
    onBar?.(-1);
  };
}
