/**
 * Editing a line of events (the composer's melody editor): a cursor on an event, or past the last
 * one (where a new event is appended); pitches by letter (with the key signature, the octave
 * nearest the note before), by step, by accidental; lengths from a palette of values, dotted or
 * not; rests; insertion and deletion. Pure functions over `Ev[]`, so that the screen only maps
 * keys and buttons to them.
 */
import { parsePitch, type Step } from "../../music/pitch.ts";
import { keySignature } from "../fugues.ts";
import { EPS, type Ev } from "./model.ts";

/** The values of the palette, in quarters: sixteenth, eighth, quarter, half, whole (keys 1-5). */
export const VALUES = [0.25, 0.5, 1, 2, 4];
const STEPS: Step[] = ["C", "D", "E", "F", "G", "A", "B"];

const acc = (a: number) => (a > 0 ? "#".repeat(a) : "b".repeat(-a));

/** The pitch for a letter in a key, in the octave nearest `near`. */
export function letterPitch(step: Step, key: string, near: string): string {
  const n = parsePitch(near);
  const a = keySignature(key)[step];
  const options = [n.octave - 1, n.octave, n.octave + 1].map((o) => `${step}${acc(a)}${o}`);
  return options.reduce((x, y) => (Math.abs(parsePitch(y).midi - n.midi) < Math.abs(parsePitch(x).midi - n.midi) ? y : x));
}

/** A diatonic step up or down with the key signature, or an octave (±7). */
export function stepPitch(p: string, delta: number, key: string): string {
  const x = parsePitch(p);
  if (Math.abs(delta) === 7) return `${p.replace(/-?\d+$/, "")}${x.octave + Math.sign(delta)}`;
  const d = x.diatonic + delta;
  const step = STEPS[((d % 7) + 7) % 7];
  return `${step}${acc(keySignature(key)[step])}${Math.floor(d / 7)}`;
}

/** The same letter sharpened (+1), flattened (-1) or made natural (0). */
export function alterPitch(p: string, how: number): string {
  const x = parsePitch(p);
  const a = how === 0 ? 0 : Math.max(-2, Math.min(2, x.alter + how));
  return `${x.step}${acc(a)}${x.octave}`;
}

/** The pitch nearest before event i (for placing a letter), else a default for the voice. */
export function nearBefore(evs: Ev[], i: number, fallback: string): string {
  for (let k = Math.min(i, evs.length) - 1; k >= 0; k--) if (evs[k].pitch) return evs[k].pitch!;
  return fallback;
}

/** Event i given a pitch (null: a rest); past the end, a new event of length `dur` appended. */
export function setPitch(evs: Ev[], i: number, pitch: string | null, dur: number): Ev[] {
  if (i >= evs.length) return [...evs, { pitch, dur }];
  return evs.map((e, k) => (k === i ? { ...e, pitch } : e));
}

export function setDur(evs: Ev[], i: number, dur: number): Ev[] {
  return i < evs.length ? evs.map((e, k) => (k === i ? { ...e, dur } : e)) : evs;
}

/** Whether a length is a dotted value of the palette. */
export const isDotted = (dur: number) => VALUES.some((v) => Math.abs(v * 1.5 - dur) < EPS);

/** Dot the event (half again as long), or take its dot away. */
export function toggleDot(evs: Ev[], i: number): Ev[] {
  if (i >= evs.length) return evs;
  const d = evs[i].dur;
  return setDur(evs, i, isDotted(d) ? d / 1.5 : d * 1.5);
}

export const remove = (evs: Ev[], i: number) => evs.filter((_, k) => k !== i);
/** A copy of event i inserted before it. */
export const insert = (evs: Ev[], i: number) => (i < evs.length ? [...evs.slice(0, i), { ...evs[i] }, ...evs.slice(i)] : evs);

/** Onset of event i (quarters from the line's start). */
export const onsetOf = (evs: Ev[], i: number) => evs.slice(0, i).reduce((a, e) => a + e.dur, 0);

/** Pitches written in letters with the key's accidentals spelled out ("Eb4" -> "E♭4"). */
export const pretty = (p: string) => p.replace("##", "𝄪").replace("#", "♯").replace("bb", "𝄫").replace(/(?<=[A-G])b/, "♭");
