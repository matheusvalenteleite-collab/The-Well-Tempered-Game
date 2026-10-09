/**
 * The sound of the game as a small mixing desk (pure data; the engine applies it).
 *
 * Three voice channels (cantus firmus, contrapunctus, Fux), each with its own synth settings,
 * plus the versions, drums and continuo; each channel has volume, balance (pan), mute and solo.
 * Every track is configured on its own (D95: no linking). The master has its own effects.
 */
import { DEFAULT_SYNTH, GRAND_ROOM, SYNTH_PRESETS, type SynthSettings } from "./synth-settings.ts";
import { VERSION_IDS, type VersionId } from "../game/versions.ts";

export type Channel = "cantus" | "counterpoint" | "fux";
/** Strips: the three voices, the derived versions of the player's line (D47), drums, continuo. */
export type Strip = Channel | VersionId | "drums" | "continuo";
export const CHANNELS: Channel[] = ["cantus", "counterpoint", "fux"];
export const STRIPS: Strip[] = ["cantus", "counterpoint", "fux", ...VERSION_IDS, "drums", "continuo"];

export interface Mix {
  /** 0..1.5 (1 = unity). */
  volume: number;
  /** -1 (left) .. 1 (right). */
  pan: number;
  mute: boolean;
  solo: boolean;
}

/** The master's own effects (D95), after the strips and before the limiter. */
export interface MasterFx {
  reverbMode: SynthSettings["reverbMode"];
  reverbMix: number;
  delayMode: SynthSettings["delayMode"];
  delayTime: number;
  delayFeedback: number;
  delayMix: number;
}
export const DEFAULT_MASTER_FX: MasterFx = { reverbMode: "off", reverbMix: 0.2, delayMode: "off", delayTime: 0.375, delayFeedback: 0.3, delayMix: 0.18 };

export interface SoundState {
  synth: Record<Channel, SynthSettings>;
  mix: Record<Strip, Mix>;
  /** Octave transposition of Fux's line in playback, -3..3 (the score is unchanged). */
  fuxOctave: number;
  /** The same for each version of the player's line (D66); since D79 the score shows them moved too. */
  versionOctave: Record<VersionId, number>;
  /** The cantus and the written line moved by octaves (D79): heard and drawn so; the evaluation keeps the written pitches. */
  cantusOctave: number;
  counterpointOctave: number;
  /**
   * Each version's own sound (D69). While `versionFollows[id]` is true the version sounds like the
   * Contrapunctus; editing the version's sound gives it its own copy, and the Contrapunctus is untouched.
   */
  versionSynth: Record<VersionId, SynthSettings>;
  versionFollows: Record<VersionId, boolean>;
  master: MasterFx;
}

const FUX_SOUND = SYNTH_PRESETS.find((p) => p.id === "fluteOrgan")!.settings;
/** The previous default for Fux (D42); a stored state still on it moves to the new default. */
const OLD_FUX_SOUND = SYNTH_PRESETS.find((p) => p.id === "pipeOrgan")!.settings;
const mix = (pan = 0, volume = 1): Mix => ({ volume, pan, mute: false, solo: false });

export const DEFAULT_SOUND: SoundState = {
  // Owner (D95): the three voices alike by default — the recorded piano, centred, a little room.
  synth: { cantus: { ...GRAND_ROOM }, counterpoint: { ...GRAND_ROOM }, fux: { ...GRAND_ROOM } },
  mix: { cantus: mix(0), counterpoint: mix(0), fux: mix(0), inversion: mix(0), retrograde: mix(0), retroInversion: mix(0), canon: mix(0), drums: mix(0, 0.8), continuo: mix(0, 0.6) },
  fuxOctave: 0,
  versionOctave: { inversion: 0, retrograde: 0, retroInversion: 0, canon: 0 },
  cantusOctave: 0,
  counterpointOctave: 0,
  versionSynth: { inversion: { ...GRAND_ROOM }, retrograde: { ...GRAND_ROOM }, retroInversion: { ...GRAND_ROOM }, canon: { ...GRAND_ROOM } },
  // Each version has its own sound (D95); "following" the Contrapunctus is gone.
  versionFollows: { inversion: false, retrograde: false, retroInversion: false, canon: false },
  master: { ...DEFAULT_MASTER_FX },
};

/** The sound a version plays with: the Contrapunctus's while it follows it, else its own (D69). */
export const versionSettings = (s: SoundState, id: VersionId): SynthSettings => (s.versionFollows[id] ? s.synth.counterpoint : s.versionSynth[id]);

/** Edit a version's sound: it stops following the Contrapunctus, which is left as it is (D69). */
export function editVersionSynth(s: SoundState, id: VersionId, next: SynthSettings): SoundState {
  return { ...s, versionSynth: { ...s.versionSynth, [id]: { ...next } }, versionFollows: { ...s.versionFollows, [id]: false } };
}

/** Make a version follow the Contrapunctus again, or give it its own copy of the current sound. */
export function setVersionFollows(s: SoundState, id: VersionId, follows: boolean): SoundState {
  const versionSynth = follows ? s.versionSynth : { ...s.versionSynth, [id]: { ...s.synth.counterpoint } };
  return { ...s, versionSynth, versionFollows: { ...s.versionFollows, [id]: follows } };
}

/** Edit the synth of one voice (D95: each track on its own). */
export function editSynth(s: SoundState, ch: Channel, next: SynthSettings): SoundState {
  return { ...s, synth: { ...s.synth, [ch]: { ...next } } };
}

const sameSettings = (a: SynthSettings, b: SynthSettings) => (Object.keys(a) as (keyof SynthSettings)[]).every((k) => a[k] === b[k]);

export function setMix(s: SoundState, strip: Strip, change: Partial<Mix>): SoundState {
  return { ...s, mix: { ...s.mix, [strip]: { ...s.mix[strip], ...change } } };
}

/** Effective gain of a strip after mute and solo (any solo silences the strips without one). */
export function audibleGain(s: SoundState, strip: Strip): number {
  const m = s.mix[strip];
  const anySolo = STRIPS.some((x) => s.mix[x].solo);
  if (m.mute || (anySolo && !m.solo)) return 0;
  return m.volume;
}

/** Transpose a spelled pitch by whole octaves ("C#4", 2 -> "C#6"). */
export function shiftOctave(pitch: string, octaves: number): string {
  const m = /^([A-G](?:#{1,2}|b{1,2})?)(-?\d+)$/.exec(pitch);
  if (!m) throw new Error(`invalid pitch ${pitch}`);
  return `${m[1]}${Number(m[2]) + octaves}`;
}

/** Restore a stored state, falling back to defaults for anything missing or malformed. */
export function restoreSound(raw: unknown): SoundState {
  if (typeof raw !== "object" || raw === null) return structuredClone(DEFAULT_SOUND);
  const r = raw as Partial<SoundState>;
  const out = structuredClone(DEFAULT_SOUND);
  for (const c of CHANNELS) if (r.synth?.[c]) out.synth[c] = { ...DEFAULT_SYNTH, ...r.synth[c] };
  if (sameSettings(out.synth.fux, OLD_FUX_SOUND)) out.synth.fux = { ...FUX_SOUND };
  for (const x of STRIPS) if (r.mix?.[x]) out.mix[x] = { ...out.mix[x], ...r.mix[x] };
  if (typeof r.fuxOctave === "number") out.fuxOctave = Math.max(-3, Math.min(3, Math.round(r.fuxOctave)));
  if (typeof r.cantusOctave === "number") out.cantusOctave = Math.max(-3, Math.min(3, Math.round(r.cantusOctave)));
  if (typeof r.counterpointOctave === "number") out.counterpointOctave = Math.max(-3, Math.min(3, Math.round(r.counterpointOctave)));
  for (const id of VERSION_IDS) {
    if (r.versionSynth?.[id]) out.versionSynth[id] = { ...DEFAULT_SYNTH, ...r.versionSynth[id] };
    const o = r.versionOctave?.[id];
    if (typeof o === "number") out.versionOctave[id] = Math.max(-3, Math.min(3, Math.round(o)));
  }
  if (r.master && typeof r.master === "object") out.master = { ...DEFAULT_MASTER_FX, ...r.master };
  return out;
}
