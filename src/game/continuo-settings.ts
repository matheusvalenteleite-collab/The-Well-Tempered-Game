/** The continuo panel's settings, as stored in localStorage (wtg.continuoSettings), with validation. */
import type { FinalsMode, PresetId } from "../continuo/types.ts";

export type ContinuoDisplay = "none" | "figured" | "realization" | "both";
export const CONTINUO_DISPLAYS: ContinuoDisplay[] = ["none", "figured", "realization", "both"];
export const CONTINUO_PRESETS: PresetId[] = ["stileAntico", "cembalo", "hofkapelle"];
export const FINALS_MODES: FinalsMode[] = ["organist", "strict"];

export interface ContinuoSettings {
  display: ContinuoDisplay;
  preset: PresetId;
  finals: FinalsMode;
  passingFill: boolean;
  /** A stylistic liberty; never applied to stile antico. */
  inegal: boolean;
}

export const DEFAULT_CONTINUO_SETTINGS: ContinuoSettings = { display: "figured", preset: "stileAntico", finals: "organist", passingFill: true, inegal: false };

/** Each field is kept if valid, otherwise replaced by its default. */
export function validContinuoSettings(raw: unknown): ContinuoSettings {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_CONTINUO_SETTINGS;
  const pick = <T>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
  return {
    display: pick(r.display, CONTINUO_DISPLAYS, d.display),
    preset: pick(r.preset, CONTINUO_PRESETS, d.preset),
    finals: pick(r.finals, FINALS_MODES, d.finals),
    passingFill: typeof r.passingFill === "boolean" ? r.passingFill : d.passingFill,
    inegal: typeof r.inegal === "boolean" ? r.inegal : d.inegal,
  };
}
