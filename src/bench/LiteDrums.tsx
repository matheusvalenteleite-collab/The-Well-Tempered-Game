/**
 * D344 (WTC 1.56): DRUMS back on play.html for the friends (the owner: "put back the DRUMS button. my
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
