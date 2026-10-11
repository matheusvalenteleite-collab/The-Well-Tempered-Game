/**
 * P4: the player's choice of score for music in three voices or more (Fux in three and four voices,
 * the chorales, the WTC): one staff a voice ("open", as a choir reads it), or the compact two staves
 * (as a keyboard reads it). One choice for the whole game, kept in this browser.
 */
import { useSyncExternalStore } from "react";
import type { ClefId } from "./notation/clefs.ts";
import { store, stored } from "./shared.ts";

export type StaffLayout = "open" | "compact";
const KEY = "wtg.staffLayout";
let layout: StaffLayout = stored<StaffLayout>(KEY, "compact", (v) => v === "open" || v === "compact");
const listeners = new Set<() => void>();

export function setStaffLayout(x: StaffLayout) {
  layout = x;
  store(KEY, x);
  for (const l of listeners) l();
}

export function useStaffLayout(): StaffLayout {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => layout,
  );
}

/**
 * The clef of each voice on a staff of its own, from its average pitch (MIDI): G at or above middle
 * C, F below, as D30 has it for the two-voice staves.
 */
export const openClefs = (means: number[]): ClefId[] => means.map((m) => (m >= 60 ? "treble" : "bass"));

/**
 * The chorales' open score (owner, through the chorale session): soprano and alto in G, the tenor in
 * G with an 8 below, the bass in F. G and F clefs only (with their octave forms), never a C clef.
 */
export const CHORALE_CLEFS: ClefId[] = ["treble", "treble", "treble_8vb", "bass"];
