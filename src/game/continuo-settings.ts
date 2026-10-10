/** The continuo panel's settings, as stored in localStorage (wtg.continuoSettings), with validation. */
import type { FinalsMode, PresetId } from "../continuo/types.ts";
import { FIGURATIONS, type FigurationId } from "../continuo/figuration.ts";

/** "figured" (default, D93): the figures alone, under the lower staff; "staff": a small figured bass staff. */
export type ContinuoDisplay = "none" | "figured" | "staff" | "realization" | "both";
export const CONTINUO_DISPLAYS: ContinuoDisplay[] = ["none", "figured", "staff", "realization", "both"];
export const CONTINUO_PRESET_FAMILIES: { id: "baroque" | "ensembles" | "orchestral" | "modern"; presets: PresetId[] }[] = [
  { id: "baroque", presets: ["stileAntico", "cembalo", "hofkapelle", "theorbo"] },
  { id: "ensembles", presets: ["quartet", "bach", "mozart", "beethoven", "wagner"] },
  { id: "orchestral", presets: ["sostenuto", "staccato", "sforzando", "pizzicato", "brass"] },
  { id: "modern", presets: ["analogPads", "rockBand"] },
];
export const CONTINUO_PRESETS: PresetId[] = CONTINUO_PRESET_FAMILIES.flatMap((f) => f.presets);
export const FINALS_MODES: FinalsMode[] = ["organist", "strict"];

export interface ContinuoSettings {
  display: ContinuoDisplay;
  preset: PresetId;
  finals: FinalsMode;
  passingFill: boolean;
  /** A stylistic liberty; never applied to stile antico. */
  inegal: boolean;
  /** Fux's accidentals in the harmony (D93); off: the white-key harmony of before. */
  accidentals: boolean;
  /** D110: the right hand's figuration, and whether it is played. */
  figuration: FigurationId;
  figure: boolean;
}

export const DEFAULT_CONTINUO_SETTINGS: ContinuoSettings = { display: "figured", preset: "stileAntico", finals: "organist", passingFill: true, inegal: false, accidentals: true, figuration: "alberti", figure: false };

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
    accidentals: typeof r.accidentals === "boolean" ? r.accidentals : d.accidentals,
    figuration: pick(r.figuration, FIGURATIONS, d.figuration),
    figure: typeof r.figure === "boolean" ? r.figure : d.figure,
  };
}
