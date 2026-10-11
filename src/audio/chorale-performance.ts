/**
 * Chorale playback (task 3, P5): one entry point for every chorale screen and for the chorale
 * workbench to come. A chorale goes in as its voices of timed notes, in 32nds as `study.json` and
 * `level6.ts` have them ([onset, length, pitch, fermata?]); out come events for the engine's live
 * loop (`playAll`), so that tempo, voices switched on and off (channel gates), pause and volume
 * apply at once while it plays (D57, D78).
 *
 * For now the performance is strict (in time, as before). The expressive model (phrase-end
 * rallentandi, fermatas held or breathed, the final cadence, balance; docs/playback/
 * CHORALE-PERFORMANCE.md) waits for the owner's approval and will enter through `options`.
 */
import type { AudioEngine } from "./engine.ts";
import type { PlayEvent } from "../counterpoint/layout.ts";
import { restoreSound, type SoundState } from "./sound.ts";

/** A note: onset and length in 32nds from the first note, pitch, and a fermata flag. */
export type ChoraleNote = readonly [number, number, string, (0 | 1 | boolean)?];

/** The channels the four voices sound on, soprano to bass (each its own strip and gate). */
export const CHORALE_CHANNELS = ["counterpoint", "second", "third", "fux"] as const;
export type ChoraleChannel = (typeof CHORALE_CHANNELS)[number];

export interface Chorale {
  /** Soprano, alto, tenor, bass (or fewer): each voice's notes. */
  voices: readonly (readonly ChoraleNote[])[];
  /** 32nds in a bar. */
  barUnits: number;
  /** 32nds of an upbeat (0 or absent: none): the first bar is counted from where the upbeat begins in it. */
  pickup?: number;
}

/** The bar (counted as the score draws it, the upbeat bar whole) of an onset in 32nds. */
export const barOf = (c: Chorale, at: number) => Math.floor((at + (c.pickup ? c.barUnits - c.pickup : 0)) / c.barUnits);

/** The events of a chorale: each note on its voice's channel; the slot is the bar it starts in. */
export function choraleEvents(c: Chorale): PlayEvent[] {
  const events: PlayEvent[] = [];
  c.voices.forEach((notes, v) => {
    const channel = CHORALE_CHANNELS[Math.min(v, CHORALE_CHANNELS.length - 1)];
    for (const [at, dur, pitch] of notes) events.push({ slot: barOf(c, at), at: at / 32, length: dur / 32, cantus: null, counterpoint: null, extra: [{ channel, pitch }] });
  });
  return events.sort((a, b) => a.at - b.at);
}

/**
 * The chorale screens' sound (P5): every voice in the same instrument, at its own octave, all
 * channels open, nothing looping. The engine is shared, so whatever the last screen left (a line
 * switched off, Fux's octave, a loop) is reset here: a Fux screen's gated-off Contra II used to
 * silence the chorales' alto.
 */
export function choraleSound(): SoundState {
  const s = restoreSound(null);
  s.synth.second = { ...s.synth.counterpoint };
  s.synth.third = { ...s.synth.counterpoint };
  s.synth.fux = { ...s.synth.counterpoint };
  s.fuxOctave = 0;
  return s;
}

export function prepareChoraleAudio(audio: AudioEngine, heard: readonly boolean[] = [true, true, true, true]) {
  audio.setSoundState(choraleSound());
  audio.loop = false;
  audio.drums = false;
  audio.setGates(choraleGates(heard));
}

/** The voices heard as channel gates (live: switching a voice restarts nothing). */
export function choraleGates(heard: readonly boolean[]) {
  const g: Partial<Record<"cantus" | "continuo" | ChoraleChannel, boolean>> = { cantus: true, continuo: false };
  CHORALE_CHANNELS.forEach((ch, v) => (g[ch] = heard[v] !== false));
  return g;
}

/**
 * Play events through the live loop from bar `fromBar`; `onBar(b)` as bar b sounds, -1 at the end.
 * Events whose slot is not a bar may pass `barOfEvent`.
 */
export function playChoraleEvents(audio: AudioEngine, events: PlayEvent[], onBar: (bar: number) => void, fromBar = 0, barOfEvent: (e: PlayEvent) => number = (e) => e.slot): void {
  const sorted = [...events].sort((a, b) => a.at - b.at);
  audio.loop = false;
  const start = Math.max(0, sorted.findIndex((e) => barOfEvent(e) >= fromBar));
  const bars = sorted.map(barOfEvent);
  // The engine reports an event's slot as it sounds: here its index, turned into its bar.
  const indexed = sorted.map((e, k) => ({ ...e, slot: k }));
  void audio.playAll(indexed, (k) => onBar(k < 0 ? -1 : bars[k]), undefined, start);
}

/** A chorale from its voices, played from bar `fromBar` (the screens and the workbench). */
export function playChorale(audio: AudioEngine, c: Chorale, onBar: (bar: number) => void, fromBar = 0): void {
  playChoraleEvents(audio, choraleEvents(c), onBar, fromBar);
}
