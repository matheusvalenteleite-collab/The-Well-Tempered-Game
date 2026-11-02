/**
 * D344 (WTC 1.57): DRUMS back on play.html for the friends (the owner: "put back the DRUMS button. my
 * friends will have fun if there's a backing track available for the pieces"). Hidden with the pop-up's
 * SOUND by D343 (CLASSIC CHIP's DRUMS lived beside the sound's dropdown); now one ON/OFF switch on the
 * pop-up under YOUR VOICE, off by default, kept on the device. It plays a backing track under whatever
 * sound the piece has (sound.ts `setBacking`), never changes the judging. The unlocked page keeps
 * D303's DRUMS beside the sound's dropdown.
 */
import { useState } from "react";
import { tr } from "../i18n/index.ts";
import { setBacking, setDrums } from "../touch/sound.ts";

export const LITE_DRUMS_KEY = "tb-lite-drums";

/** Whether the friend turned DRUMS on (off by default; no storage: off). */
export function liteDrums(): boolean {
  try {
    return localStorage.getItem(LITE_DRUMS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Applies the friend's choice to the sound: the backing on or off, CLASSIC CHIP's own DRUMS switch left off (the backing plays its loop). */
export function applyLiteDrums(on: boolean = liteDrums()) {
  setDrums(false);
  setBacking(on);
}

export function setLiteDrums(on: boolean) {
  try {
    if (on) localStorage.setItem(LITE_DRUMS_KEY, "1");
    else localStorage.removeItem(LITE_DRUMS_KEY);
  } catch {
    /* this visit only */
  }
  applyLiteDrums(on);
}

/** The pop-up's switch: DRUMS OFF / DRUMS ON. */
export function LiteDrumsSwitch() {
  const [on, setOn] = useState(liteDrums);
  return (
    <div className="tb-pop-drums">
      <button
        type="button"
        id="pop-drums"
        className={`tg-toggle tb-drums-toggle${on ? " on" : ""}`}
        aria-pressed={on}
        onClick={() => {
          setLiteDrums(!on);
          setOn(!on);
        }}
      >
        {on ? tr("DRUMS ON") : tr("DRUMS OFF")}
      </button>
      <span className="tb-pop-drums-note">{tr("A BACKING TRACK · NEVER SCORED")}</span>
    </div>
  );
}

/**
 * D450 (the owner: "Move the DRUMS button to the right column of SELECTION screen … give each fugue 3 DRUM
 * presets of distinct characters that the player can cycle through"): the selection's DRUMS, ON/OFF and the
 * piece's preset. The presets are the Instruments session's (`drumPresetsFor`, `applyDrumPreset`, given here
 * by `registerDrumPresets`); until they land, a piece has none and the row is ON/OFF alone. The one chosen is kept
 * per piece on the device (the first by default).
 */
export interface DrumPreset {
  id: string;
  name: string;
}
interface PresetSource {
  presetsFor: (pieceId: string) => readonly DrumPreset[];
  apply: (pieceId: string, presetId: string) => void;
}
let source: PresetSource | null = null;
/** The Instruments session's presets, registered once at start. */
export function registerDrumPresets(s: PresetSource) {
  source = s;
}
export const drumPresets = (pieceId: string): readonly DrumPreset[] => source?.presetsFor(pieceId) ?? [];
const PRESET_KEY = (id: string) => `tb-lite-drum-preset:${id}`;
/** This visit's choices, when the device keeps nothing. */
const chosen = new Map<string, string>();
/** The piece's preset (its first unless another was chosen). */
export function drumPresetOf(pieceId: string): string | undefined {
  const all = drumPresets(pieceId);
  let kept: string | null = chosen.get(pieceId) ?? null;
  try {
    kept = localStorage.getItem(PRESET_KEY(pieceId)) ?? kept;
  } catch {
    /* this visit's only */
  }
  return all.find((p) => p.id === kept)?.id ?? all[0]?.id;
}
/** The piece's preset applied to the backing (nothing while there are none). */
export function applyDrumPreset(pieceId: string) {
  const p = drumPresetOf(pieceId);
  if (p && source) source.apply(pieceId, p);
}
/** The next preset of the piece's (round), kept and applied; the drums turned on with it. */
export function cycleDrumPreset(pieceId: string): string | undefined {
  const all = drumPresets(pieceId);
  if (!all.length) return undefined;
  const now = all.findIndex((p) => p.id === drumPresetOf(pieceId));
  const next = all[(now + 1) % all.length].id;
  chosen.set(pieceId, next);
  try {
    localStorage.setItem(PRESET_KEY(pieceId), next);
  } catch {
    /* this visit only */
  }
  applyDrumPreset(pieceId);
  if (!liteDrums()) setLiteDrums(true);
  return next;
}
