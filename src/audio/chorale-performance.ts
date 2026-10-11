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
import { SYNTH_PRESETS, type SynthSettings } from "./synth-settings.ts";
import type { VersionId } from "../game/versions.ts";

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

/** The second channel of each voice, for an ensemble that doubles it (P7: choir and orchestra). */
export const DOUBLING_CHANNELS: VersionId[] = ["inversion", "retrograde", "retroInversion", "canon"];

/** The events of a chorale: each note on its voice's channel; the slot is the bar it starts in. */
export function choraleEvents(c: Chorale): PlayEvent[] {
  const events: PlayEvent[] = [];
  c.voices.forEach((notes, v) => {
    const channel = CHORALE_CHANNELS[Math.min(v, CHORALE_CHANNELS.length - 1)];
    for (const [at, dur, pitch] of notes) events.push({ slot: barOf(c, at), at: at / 32, length: dur / 32, cantus: null, counterpoint: null, extra: [{ channel, pitch }] });
  });
  return events.sort((a, b) => a.at - b.at);
}

/** An event's notes, each also on its voice's doubling channel (the ensemble doubles the voices). */
export function doubled(events: PlayEvent[]): PlayEvent[] {
  return events.map((e) => {
    const versions: Partial<Record<VersionId, string>> = {};
    const lengths: Record<string, number> = { ...(e.lengths ?? {}) };
    for (const x of e.extra ?? []) {
      const v = (CHORALE_CHANNELS as readonly string[]).indexOf(x.channel);
      if (v >= 0) {
        versions[DOUBLING_CHANNELS[v]] = x.pitch;
        lengths[DOUBLING_CHANNELS[v]] = e.length;
      }
    }
    return Object.keys(versions).length ? { ...e, versions: { ...(e.versions ?? {}), ...versions }, lengths } : e;
  });
}

// ---- Ensembles (P7, the owner's presets): the instrument of each voice, soprano to bass.

export const ENSEMBLES = ["choir", "soloists", "organ", "strings", "synth", "reeds", "winds", "choirOrchestra"] as const;
export type Ensemble = (typeof ENSEMBLES)[number];

const preset = (id: string) => ({ ...SYNTH_PRESETS.find((x) => x.id === id)!.settings });
const sampled = (sampleSet: SynthSettings["sampleSet"], o: Partial<SynthSettings> = {}): SynthSettings => ({ ...preset("violinSampled"), sampleSet, ...o });
/**
 * Voices by the formant synthesizer, until recorded voices are chosen (the owner asked for them;
 * the free sample libraries are being looked into). Each part its own vowel colour and vibrato.
 */
const sung = (vowel: number, vibrato: number, breath: number, tone: number, solo: boolean): SynthSettings => ({
  ...preset("choir"),
  formantVowel: vowel,
  formantBreath: breath,
  vibrato,
  tone,
  // A choir: several singers, slightly apart; one singer a part: clean, each a person.
  detune: solo ? 0 : 9,
  attack: solo ? 0.12 : 0.22,
  reverbMode: "hall",
  reverbMix: solo ? 0.18 : 0.3,
});
/** A recorded choir set, with the formant voice's settings beneath it as its fallback (P13). */
const choir = (sampleSet: SynthSettings["sampleSet"], fallback: SynthSettings): SynthSettings => ({ ...fallback, model: "sampled", sampleSet, attack: 0.09, decay: 0.05, sustain: 1, release: 0.35, tone: 12000, detune: 0 });
/** Wendy Carlos's Moog (Switched-On Bach, 1968): each voice its own patch. */
const moog = (waveform: SynthSettings["waveform"], tone: number, o: Partial<SynthSettings> = {}): SynthSettings => ({ ...preset("chip"), waveform, tone, attack: 0.02, decay: 0.2, sustain: 0.75, release: 0.12, ...o });

interface EnsembleSpec {
  /** The instrument of each voice. */
  voices: [SynthSettings, SynthSettings, SynthSettings, SynthSettings];
  /** Instruments doubling each voice (colla parte), on its second channel; and their level. */
  doubling?: [SynthSettings, SynthSettings, SynthSettings, SynthSettings];
  doublingLevel?: number;
}

export function ensembleSpec(e: Ensemble): EnsembleSpec {
  switch (e) {
    case "choir":
      // P13: recorded choirs (Sonatina's chorus for soprano, tenor and bass, FluidR3's choir for the
      // alto, whose range Sonatina's upper choir does not reach), the formant voices kept underneath
      // as the fallback where the samples cannot be loaded (the claude.ai page).
      return {
        voices: [
          choir("choirUpper", sung(0, 12, 0.18, 5200, false)),
          choir("choirAahs", sung(0.4, 11, 0.2, 4600, false)),
          choir("choirLower", sung(0.2, 10, 0.2, 4000, false)),
          choir("choirLower", sung(3.4, 9, 0.18, 3000, false)),
        ],
      };
    case "soloists":
      return { voices: [sung(0, 16, 0.08, 6500, true), sung(3.2, 13, 0.12, 5200, true), sung(1, 18, 0.1, 4800, true), sung(3.6, 11, 0.14, 3400, true)] };
    case "organ":
      return { voices: [preset("pipeOrgan"), preset("pipeOrgan"), preset("pipeOrgan"), { ...preset("pipeOrgan"), tone: 6000 }] };
    case "strings":
      return { voices: [preset("violinSampled"), preset("violinSampled"), sampled("violaSus"), preset("celloSampled")] };
    case "synth":
      return {
        voices: [
          moog("sawtooth", 2600, { vibrato: 5 }),
          moog("square", 1900),
          moog("triangle", 2400, { detune: 4 }),
          moog("sawtooth", 900, { attack: 0.01, decay: 0.3, sustain: 0.6 }),
        ],
      };
    case "reeds":
      return { voices: [sampled("oboe"), sampled("oboe"), preset("bassoonSampled"), preset("bassoonSampled")] };
    case "winds":
      return { voices: [preset("fluteSampled"), sampled("oboe"), sampled("clarinet"), preset("bassoonSampled")] };
    case "choirOrchestra": {
      const choir = ensembleSpec("choir").voices;
      return { voices: choir, doubling: [sampled("oboe"), preset("violinSampled"), sampled("violaSus"), preset("celloSampled")], doublingLevel: 0.55 };
    }
  }
}

/**
 * The chorale screens' sound (P5): every voice in the same instrument, at its own octave, all
 * channels open, nothing looping. The engine is shared, so whatever the last screen left (a line
 * switched off, Fux's octave, a loop) is reset here: a Fux screen's gated-off Contra II used to
 * silence the chorales' alto.
 */
export function choraleSound(ensemble: Ensemble | null = null): SoundState {
  const s = restoreSound(null);
  if (!ensemble) {
    s.synth.second = { ...s.synth.counterpoint };
    s.synth.third = { ...s.synth.counterpoint };
    s.synth.fux = { ...s.synth.counterpoint };
  } else {
    const spec = ensembleSpec(ensemble);
    CHORALE_CHANNELS.forEach((ch, v) => (s.synth[ch] = { ...spec.voices[v] }));
    DOUBLING_CHANNELS.forEach((id, v) => {
      s.versionSynth[id] = { ...(spec.doubling?.[v] ?? spec.voices[v]) };
      s.versionFollows[id] = false;
      s.mix[id].volume = spec.doublingLevel ?? 0.6;
    });
  }
  s.fuxOctave = 0;
  for (const k of ["cantusOctave", "counterpointOctave"] as const) if (k in s) (s as unknown as Record<string, number>)[k] = 0;
  return s;
}

/** The ensemble chosen on the chorale screens (P7), kept in this browser; null: the game's piano. */
let ensembleNow: Ensemble | null = null;
export const currentEnsemble = () => ensembleNow;

export function prepareChoraleAudio(audio: AudioEngine, heard: readonly boolean[] = [true, true, true, true], ensemble: Ensemble | null = ensembleNow) {
  ensembleNow = ensemble;
  audio.setSoundState(choraleSound(ensemble));
  audio.loop = false;
  audio.drums = false;
  audio.setGates(choraleGates(heard, ensemble));
}

/** The voices heard as channel gates (live: switching a voice restarts nothing); a doubling follows its voice. */
export function choraleGates(heard: readonly boolean[], ensemble: Ensemble | null = ensembleNow) {
  const g: Partial<Record<"cantus" | "continuo" | ChoraleChannel | VersionId, boolean>> = { cantus: true, continuo: false };
  const doubles = ensemble !== null && !!ensembleSpec(ensemble).doubling;
  CHORALE_CHANNELS.forEach((ch, v) => {
    g[ch] = heard[v] !== false;
    g[DOUBLING_CHANNELS[v]] = doubles && heard[v] !== false;
  });
  return g;
}

/**
 * Play events through the live loop from bar `fromBar`; `onBar(b)` as bar b sounds, -1 at the end.
 * Events whose slot is not a bar may pass `barOfEvent`.
 */
export function playChoraleEvents(audio: AudioEngine, events: PlayEvent[], onBar: (bar: number) => void, fromBar = 0, barOfEvent: (e: PlayEvent) => number = (e) => e.slot): void {
  // Every note also on its doubling channel; the gates decide whether the doubling is heard (P7).
  const sorted = doubled([...events].sort((a, b) => a.at - b.at));
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
