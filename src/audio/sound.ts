/**
 * The sound of the game as a small mixing desk (pure data; the engine applies it).
 *
 * Three voice channels (cantus firmus, contrapunctus, Fux), each with its own synth settings,
 * plus a drum channel; each channel has volume, balance (pan), mute and solo. Neighbouring voices
 * can be linked: linked voices share one synth configuration (editing one edits all of them).
 * Linking two voices that differ gives them the Contrapunctus settings, after a confirmation in
 * the UI (decision D40). Fux's line may also be transposed by octaves, for listening only.
 */
import { DEFAULT_SYNTH, SYNTH_PRESETS, type SynthSettings } from "./synth-settings.ts";
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

export type Link = "cantusCounterpoint" | "counterpointFux";

export interface SoundState {
  synth: Record<Channel, SynthSettings>;
  links: Record<Link, boolean>;
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
}

const FUX_SOUND = SYNTH_PRESETS.find((p) => p.id === "fluteOrgan")!.settings;
/** The previous default for Fux (D42); a stored state still on it moves to the new default. */
const OLD_FUX_SOUND = SYNTH_PRESETS.find((p) => p.id === "pipeOrgan")!.settings;
const mix = (pan = 0, volume = 1): Mix => ({ volume, pan, mute: false, solo: false });

export const DEFAULT_SOUND: SoundState = {
  synth: { cantus: { ...DEFAULT_SYNTH }, counterpoint: { ...DEFAULT_SYNTH }, fux: { ...FUX_SOUND } },
  links: { cantusCounterpoint: true, counterpointFux: false },
  mix: { cantus: mix(0), counterpoint: mix(-0.3), fux: mix(0.3), inversion: mix(0.3), retrograde: mix(0.3), retroInversion: mix(0.3), canon: mix(0.3), drums: mix(0, 0.8), continuo: mix(0, 0.6) },
  fuxOctave: 0,
  versionOctave: { inversion: 0, retrograde: 0, retroInversion: 0, canon: 0 },
  cantusOctave: 0,
  counterpointOctave: 0,
  versionSynth: { inversion: { ...DEFAULT_SYNTH }, retrograde: { ...DEFAULT_SYNTH }, retroInversion: { ...DEFAULT_SYNTH }, canon: { ...DEFAULT_SYNTH } },
  versionFollows: { inversion: true, retrograde: true, retroInversion: true, canon: true },
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

/** The voices that share a configuration with `ch` (always including `ch`). */
export function linkedGroup(s: SoundState, ch: Channel): Channel[] {
  const a = s.links.cantusCounterpoint;
  const b = s.links.counterpointFux;
  if (ch === "cantus") return a ? (b ? ["cantus", "counterpoint", "fux"] : ["cantus", "counterpoint"]) : ["cantus"];
  if (ch === "fux") return b ? (a ? ["cantus", "counterpoint", "fux"] : ["counterpoint", "fux"]) : ["fux"];
  return ["counterpoint", ...(a ? (["cantus"] as Channel[]) : []), ...(b ? (["fux"] as Channel[]) : [])];
}

/** Edit the synth of `ch` and of every voice linked to it. */
export function editSynth(s: SoundState, ch: Channel, next: SynthSettings): SoundState {
  const synth = { ...s.synth };
  for (const c of linkedGroup(s, ch)) synth[c] = { ...next };
  return { ...s, synth };
}

const sameSettings = (a: SynthSettings, b: SynthSettings) => (Object.keys(a) as (keyof SynthSettings)[]).every((k) => a[k] === b[k]);

/** The two voices a link joins (the Contrapunctus is always one of them). */
export const linkEnds = (l: Link): [Channel, Channel] => (l === "cantusCounterpoint" ? ["cantus", "counterpoint"] : ["counterpoint", "fux"]);

/** Would linking `l` overwrite a different configuration (so the UI must ask first)? */
export function linkNeedsConfirm(s: SoundState, l: Link): boolean {
  const [x, y] = linkEnds(l);
  return !s.links[l] && !sameSettings(s.synth[x], s.synth[y]);
}

/** Link or unlink. Linking gives the other voice (and anything linked to it) the Contrapunctus settings. */
export function setLink(s: SoundState, l: Link, on: boolean): SoundState {
  const links = { ...s.links, [l]: on };
  if (!on) return { ...s, links };
  const next = { ...s, links };
  return editSynth(next, "counterpoint", s.synth.counterpoint);
}

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
  for (const l of Object.keys(out.links) as Link[]) if (typeof r.links?.[l] === "boolean") out.links[l] = r.links[l];
  for (const x of STRIPS) if (r.mix?.[x]) out.mix[x] = { ...out.mix[x], ...r.mix[x] };
  if (typeof r.fuxOctave === "number") out.fuxOctave = Math.max(-3, Math.min(3, Math.round(r.fuxOctave)));
  if (typeof r.cantusOctave === "number") out.cantusOctave = Math.max(-3, Math.min(3, Math.round(r.cantusOctave)));
  if (typeof r.counterpointOctave === "number") out.counterpointOctave = Math.max(-3, Math.min(3, Math.round(r.counterpointOctave)));
  for (const id of VERSION_IDS) {
    if (r.versionSynth?.[id]) out.versionSynth[id] = { ...DEFAULT_SYNTH, ...r.versionSynth[id] };
    if (typeof r.versionFollows?.[id] === "boolean") out.versionFollows[id] = r.versionFollows[id];
    const o = r.versionOctave?.[id];
    if (typeof o === "number") out.versionOctave[id] = Math.max(-3, Math.min(3, Math.round(o)));
  }
  return out;
}
