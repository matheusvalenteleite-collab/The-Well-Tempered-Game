/**
 * What the two- and three-voice screens share: the one audio engine, and the per-viewer settings
 * kept in localStorage (the game works the same without them).
 */
import { AudioEngine, renderLevel, SYNTH_PRESETS } from "../audio/engine.ts";
import { DEFAULT_DRUMS, DRUM_PATTERNS, DrumMachine, validLoopLength, type DrumSettings } from "../audio/drums.ts";
import { loadSamples } from "../audio/voice.ts";

export const audio = new AudioEngine();
// Owner decision D15: synthesized sound only for now (the sampled piano stays in the engine, unused).
audio.sound = "chip";
// Read by the browser tests.
Object.assign(window as object, { wtgAudio: audio, wtgRenderLevel: renderLevel, wtgPresets: SYNTH_PRESETS, wtgDrumMachine: DrumMachine, wtgLoadSamples: loadSamples });

export function stored<T>(key: string, fallback: T, valid: (v: unknown) => boolean = () => true): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const v = JSON.parse(raw) as unknown;
    if (!valid(v)) return fallback;
    return typeof fallback === "object" && !Array.isArray(fallback) ? { ...fallback, ...(v as object) } : (v as T);
  } catch {
    return fallback;
  }
}

export function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* not persisted */
  }
}

export function validDrumKit(raw: unknown): DrumSettings {
  // A stored `kit` (before D100 a kit could play any pattern) is dropped: the pattern brings its kit.
  const { kit: _kit, ...given } = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<DrumSettings> & { kit?: unknown };
  const v = { ...DEFAULT_DRUMS, ...given };
  const ok =
    DRUM_PATTERNS.some((p) => p.id === v.pattern) && validLoopLength(v.length) && typeof v.level === "number" &&
    (v.swing === undefined || (typeof v.swing === "number" && v.swing >= 0.5 && v.swing <= 0.75)) &&
    (v.accent === undefined || typeof v.accent === "boolean") &&
    (v.autoFill === undefined || typeof v.autoFill === "boolean") &&
    (v.variation === undefined || v.variation === "A" || v.variation === "B" || v.variation === "AB") &&
    (v.mutes === undefined || (Array.isArray(v.mutes) && v.mutes.every((m) => typeof m === "string")));
  return ok ? v : { ...DEFAULT_DRUMS };
}
