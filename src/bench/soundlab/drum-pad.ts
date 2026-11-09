/**
 * D530, THE SOUND LAB's DRUM PAD: the whole drum library (drum-library.ts drumMenuFor) for the fugue and the sound now,
 * grouped by family (FAMILIES' order), each style marked HOME (the sound's own) and FITS (idiomatic in the fugue's
 * metre); S3's planned period styles (PLANNED_STYLES) shown in their family as COMING, not playable
 * (once S3 makes one a style, drumMenuFor lists it and it plays). One tap a style.
 *
 * The setting: `drums` 0 off, else on; `style` the style chosen (null: the sound's HOME, which follows a change of
 * sound). A link of D497/D498's day (`drums=2`, `drums=3`, no style) still reads as the menu's 2nd and 3rd entries.
 */
import { drumMenuFor, FAMILIES, homeFor, isStyle, PLANNED_STYLES, styleIds, type DrumMenuItem, type Family, type StyleId } from "../../touch/drum-library.ts";
import type { LabSettings } from "./lab-state.ts";

/** The style a setting plays (null: drums off). */
export function padStyle(s: Pick<LabSettings, "piece" | "drums" | "style">, sound: string): StyleId | null {
  if (s.drums <= 0) return null;
  if (s.style && isStyle(s.style)) return s.style;
  if (s.drums > 1) return drumMenuFor(s.piece, sound)[s.drums - 1]?.style ?? homeFor(s.piece, sound);
  return homeFor(s.piece, sound);
}
/** The id the game's setDrumStyle is given: "home" where the sound's HOME plays (so a new sound brings its own). */
export const padChoice = (s: Pick<LabSettings, "piece" | "drums" | "style">, sound: string): string => {
  const st = padStyle(s, sound);
  return !st || st === homeFor(s.piece, sound) ? "home" : st;
};

export interface PadItem extends Pick<DrumMenuItem, "style" | "name" | "family" | "home" | "fits"> {
  /** S3's planned styles: shown, not playable. */
  coming: boolean;
}
export interface PadGroup {
  family: Family;
  items: PadItem[];
}
export const FAMILY_LABEL: Record<Family, string> = { rock: "ROCK", jazz: "JAZZ", latin: "LATIN · BRAZIL", electronic: "ELECTRONIC", orchestral: "ORCHESTRAL · PERIOD" };

/** The pad: every style by family (each family's own order), HOME and FITS marked, the planned styles last as COMING. */
export function padGroups(piece: string, sound: string): PadGroup[] {
  const menu = drumMenuFor(piece, sound);
  return FAMILIES.map((family) => ({
    family,
    items: [
      ...menu
        .filter((m) => m.family === family)
        .sort((a, b) => styleIds.indexOf(a.style) - styleIds.indexOf(b.style))
        .map((m) => ({ style: m.style, name: m.name, family: m.family, home: m.home, fits: m.fits, coming: false })),
      ...PLANNED_STYLES.filter((p) => p.family === family && !isStyle(p.id)).map((p) => ({ style: p.id, name: p.label, family: p.family, home: false, fits: false, coming: true })),
    ],
  }));
}
